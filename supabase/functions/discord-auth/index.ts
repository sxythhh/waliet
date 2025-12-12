import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const DISCORD_CLIENT_ID = Deno.env.get('DISCORD_CLIENT_ID');
    const DISCORD_CLIENT_SECRET = Deno.env.get('DISCORD_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Action: redirect - initiate OAuth flow
    if (action === 'redirect') {
      const redirectUri = url.searchParams.get('redirect_uri') || 'https://virality.gg/discord/callback';
      const state = url.searchParams.get('state') || '';
      
      const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
      discordAuthUrl.searchParams.set('client_id', DISCORD_CLIENT_ID!);
      discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
      discordAuthUrl.searchParams.set('response_type', 'code');
      discordAuthUrl.searchParams.set('scope', 'identify email');
      discordAuthUrl.searchParams.set('state', state);

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': discordAuthUrl.toString(),
        },
      });
    }

    // Action: callback - handle OAuth callback and sign in/up user
    if (req.method === 'POST') {
      const { code, redirectUri } = await req.json();

      if (!code) {
        throw new Error('Authorization code is required');
      }

      const callbackUri = redirectUri || 'https://virality.gg/discord/callback';

      // Exchange code for access token
      console.log('Exchanging code for token...');
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID!,
          client_secret: DISCORD_CLIENT_SECRET!,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: callbackUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Discord token exchange failed:', errorData);
        throw new Error('Failed to exchange authorization code');
      }

      const { access_token, refresh_token, expires_in } = await tokenResponse.json();
      console.log('Token received successfully');

      // Fetch user data from Discord
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch Discord user data');
      }

      const discordUser = await userResponse.json();
      console.log('Discord user fetched:', discordUser.username);

      if (!discordUser.email) {
        throw new Error('Email not provided by Discord. Please ensure your Discord account has a verified email.');
      }

      const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Check if user exists with this email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === discordUser.email);

      let session;
      let user;

      if (existingUser) {
        // User exists - sign them in by creating a session
        console.log('Existing user found, signing in...');
        
        // Generate a magic link token and use it to sign in
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: discordUser.email,
          options: {
            redirectTo: 'https://virality.gg/dashboard'
          }
        });

        if (signInError) {
          console.error('Error generating magic link:', signInError);
          throw signInError;
        }

        user = existingUser;
        
        // Update profile with Discord data
        const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
        await supabaseAdmin
          .from('profiles')
          .update({
            discord_id: discordUser.id,
            discord_username: discordUser.username,
            discord_discriminator: discordUser.discriminator || null,
            discord_avatar: discordUser.avatar 
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : null,
            discord_email: discordUser.email,
            discord_connected_at: new Date().toISOString(),
            discord_access_token: access_token,
            discord_refresh_token: refresh_token,
            discord_token_expires_at: expiresAt
          })
          .eq('id', existingUser.id);

        // Return the magic link for the frontend to use
        return new Response(
          JSON.stringify({ 
            success: true,
            action: 'signin',
            actionLink: signInData.properties.action_link,
            user: {
              id: existingUser.id,
              email: discordUser.email,
            },
            discord: {
              username: discordUser.username,
              avatar: discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                : null
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // New user - create account
        console.log('Creating new user...');
        
        // Generate a random password for the user
        const randomPassword = crypto.randomUUID() + crypto.randomUUID();
        
        const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: discordUser.email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            full_name: discordUser.global_name || discordUser.username,
            avatar_url: discordUser.avatar 
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : null,
          }
        });

        if (signUpError) {
          console.error('Error creating user:', signUpError);
          throw signUpError;
        }

        user = signUpData.user;
        console.log('User created:', user.id);

        // Update profile with Discord data
        const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
        await supabaseAdmin
          .from('profiles')
          .update({
            full_name: discordUser.global_name || discordUser.username,
            avatar_url: discordUser.avatar 
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : null,
            discord_id: discordUser.id,
            discord_username: discordUser.username,
            discord_discriminator: discordUser.discriminator || null,
            discord_avatar: discordUser.avatar 
              ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
              : null,
            discord_email: discordUser.email,
            discord_connected_at: new Date().toISOString(),
            discord_access_token: access_token,
            discord_refresh_token: refresh_token,
            discord_token_expires_at: expiresAt
          })
          .eq('id', user.id);

        // Generate magic link for new user to sign in
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: discordUser.email,
          options: {
            redirectTo: 'https://virality.gg/dashboard'
          }
        });

        if (signInError) {
          console.error('Error generating magic link:', signInError);
          throw signInError;
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            action: 'signup',
            actionLink: signInData.properties.action_link,
            user: {
              id: user.id,
              email: discordUser.email,
            },
            discord: {
              username: discordUser.username,
              avatar: discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                : null
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in discord-auth function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
