import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

interface AuthRequest {
  action: 'get_auth_url' | 'exchange_code' | 'check_connection' | 'disconnect';
  code?: string;
  redirect_uri?: string;
  state?: string;
}

interface NotionTokenResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_id: string;
  workspace_name?: string;
  workspace_icon?: string;
  owner?: {
    type: string;
    user?: {
      id: string;
      name: string;
      avatar_url?: string;
    };
  };
}

interface StoredToken {
  access_token: string;
  workspace_id: string | null;
  workspace_name: string | null;
}

// Type guard for validating RPC response
function isValidTokenArray(data: unknown): data is StoredToken[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'access_token' in item &&
      typeof (item as { access_token: unknown }).access_token === 'string'
  );
}

const NOTION_OAUTH_URL = 'https://api.notion.com/v1/oauth/authorize';
const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

// Allowed redirect URIs to prevent open redirect attacks
const ALLOWED_REDIRECT_URIS = [
  'https://virality.gg/notion/callback',
  'https://www.virality.gg/notion/callback',
  'https://app.virality.gg/notion/callback',
  'http://localhost:5173/notion/callback',
  'http://localhost:3000/notion/callback',
];

function isAllowedRedirectUri(uri: string): boolean {
  // Check exact match first
  if (ALLOWED_REDIRECT_URIS.includes(uri)) return true;
  // Allow Vercel preview deployments only from our project
  try {
    const url = new URL(uri);
    // Only allow virality-nexus Vercel deployments (matches virality-nexus-*.vercel.app)
    if (
      url.hostname.match(/^virality-nexus(-[a-z0-9]+)?\.vercel\.app$/) &&
      url.pathname === '/notion/callback'
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Validate environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body first to check the action
    let body: AuthRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { action, code, redirect_uri, state } = body;

    // Validate user authorization
    const authHeader = req.headers.get('Authorization');

    // For check_connection, allow unauthenticated requests and return connected: false
    if (!authHeader) {
      if (action === 'check_connection') {
        return new Response(JSON.stringify({
          success: true,
          connected: false,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Wrap getUser in try/catch as it can throw exceptions
    let user: { id: string } | null = null;
    try {
      const { data, error: authError } = await supabase.auth.getUser(token);
      if (authError || !data?.user) {
        console.log('Auth validation failed:', authError?.message || 'No user data');
        if (action === 'check_connection') {
          return new Response(JSON.stringify({
            success: true,
            connected: false,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = data.user;
    } catch (authException) {
      console.error('Exception during auth validation:', authException);
      if (action === 'check_connection') {
        return new Response(JSON.stringify({
          success: true,
          connected: false,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Safety check - user should never be null here
    if (!user) {
      console.error('User is null after auth validation - this should not happen');
      return new Response(JSON.stringify({ error: 'Authentication error' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('notion-auth: action =', action, 'user =', user.id);

    // Check if user has a valid connection (doesn't need Notion credentials)
    if (action === 'check_connection') {
      try {
        const { data: hasConnection, error: rpcError } = await supabase.rpc('check_notion_connection', {
          p_user_id: user.id,
        });

        if (rpcError) {
          console.error('RPC error checking connection:', rpcError);
          // Return connected: false on RPC errors instead of 500
          return new Response(JSON.stringify({
            success: true,
            connected: false,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // If connected, also return workspace info
        if (hasConnection) {
          const { data: tokens } = await supabase.rpc('get_notion_tokens', {
            p_user_id: user.id,
          });

          const workspaceInfo = tokens?.[0] ? {
            workspace_name: tokens[0].workspace_name,
            workspace_icon: tokens[0].workspace_icon,
          } : {};

          return new Response(JSON.stringify({
            success: true,
            connected: true,
            ...workspaceInfo,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          connected: false,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (rpcCatchError) {
        console.error('Exception in check_connection:', rpcCatchError);
        return new Response(JSON.stringify({
          success: true,
          connected: false,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // All other actions require Notion OAuth credentials
    const NOTION_CLIENT_ID = Deno.env.get('NOTION_CLIENT_ID');
    const NOTION_CLIENT_SECRET = Deno.env.get('NOTION_CLIENT_SECRET');

    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
      console.error('Missing Notion OAuth credentials');
      return new Response(JSON.stringify({ error: 'Notion OAuth not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Disconnect (delete tokens)
    if (action === 'disconnect') {
      // Delete tokens from database
      await supabase.rpc('delete_notion_tokens', {
        p_user_id: user.id,
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Notion disconnected successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate OAuth URL
    if (action === 'get_auth_url') {
      // Determine and validate redirect_uri
      const finalRedirectUri = redirect_uri || `${Deno.env.get('PUBLIC_SITE_URL') || 'https://virality.gg'}/notion/callback`;
      if (!isAllowedRedirectUri(finalRedirectUri)) {
        console.error('Invalid redirect_uri attempted:', finalRedirectUri);
        return new Response(JSON.stringify({ error: 'Invalid redirect_uri' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate a secure state parameter for CSRF protection
      const stateData = JSON.stringify({
        user_id: user.id,
        nonce: crypto.randomUUID(),
        timestamp: Date.now(),
      });
      const encodedState = btoa(stateData);

      // Build the OAuth URL
      const params = new URLSearchParams({
        client_id: NOTION_CLIENT_ID,
        redirect_uri: finalRedirectUri,
        response_type: 'code',
        owner: 'user', // Request user-level access
        state: encodedState,
      });

      const authUrl = `${NOTION_OAUTH_URL}?${params.toString()}`;

      return new Response(JSON.stringify({
        success: true,
        auth_url: authUrl,
        state: encodedState,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange authorization code for tokens
    if (action === 'exchange_code') {
      if (!code) {
        return new Response(JSON.stringify({ error: 'Authorization code is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!redirect_uri) {
        return new Response(JSON.stringify({ error: 'redirect_uri is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate redirect_uri against allowlist
      if (!isAllowedRedirectUri(redirect_uri)) {
        console.error('Invalid redirect_uri in exchange_code:', redirect_uri);
        return new Response(JSON.stringify({ error: 'Invalid redirect_uri' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate state parameter for CSRF protection
      if (!state) {
        console.error('Missing state parameter - potential CSRF attack');
        return new Response(JSON.stringify({ error: 'Missing state parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const stateData = JSON.parse(atob(state));

        // Validate required fields
        if (!stateData.user_id || !stateData.nonce || !stateData.timestamp) {
          throw new Error('Missing required state fields');
        }

        // Verify user matches the authenticated user
        if (stateData.user_id !== user.id) {
          console.error('User ID mismatch in state parameter - potential CSRF attack');
          return new Response(JSON.stringify({ error: 'Invalid state parameter' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check timestamp (3 minute expiry)
        if (Date.now() - stateData.timestamp > 3 * 60 * 1000) {
          return new Response(JSON.stringify({ error: 'State parameter expired' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (parseError) {
        console.error('Failed to parse state parameter:', parseError);
        return new Response(JSON.stringify({ error: 'Invalid state parameter format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Exchange authorization code for tokens
      // Notion uses Basic Auth with client_id:client_secret
      const authString = btoa(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`);

      const tokenResponse = await fetch(NOTION_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Notion token exchange failed:', errorData);
        return new Response(JSON.stringify({ error: 'Failed to exchange authorization code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokens: NotionTokenResponse = await tokenResponse.json();

      console.log('Token exchange successful, storing encrypted tokens...');

      // Store tokens using the secure RPC function (handles encryption)
      const { error: tokenStoreError } = await supabase.rpc('upsert_notion_tokens', {
        p_user_id: user.id,
        p_access_token: tokens.access_token,
        p_workspace_id: tokens.workspace_id,
        p_workspace_name: tokens.workspace_name || null,
        p_workspace_icon: tokens.workspace_icon || null,
        p_bot_id: tokens.bot_id,
      });

      if (tokenStoreError) {
        console.error('Failed to store tokens:', tokenStoreError);
        return new Response(JSON.stringify({ error: 'Failed to store tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Notion connected successfully for user:', user.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Notion connected successfully',
        workspace_name: tokens.workspace_name,
        workspace_icon: tokens.workspace_icon,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in notion-auth:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
