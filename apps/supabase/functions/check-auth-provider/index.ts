import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckAuthResponse {
  exists: boolean;
  providers: string[];
  canUseEmailOTP: boolean;
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists with this email
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      throw error;
    }

    // Find user with matching email
    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // User doesn't exist - they can use email OTP to sign up
      const response: CheckAuthResponse = {
        exists: false,
        providers: [],
        canUseEmailOTP: true,
      };
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User exists - check their identities
    const identities = user.identities || [];
    const providers = identities.map(i => i.provider);

    // Check if they have an email identity (signed up with email/password or email OTP)
    const hasEmailIdentity = providers.includes('email');

    // Get OAuth providers they've used
    const oauthProviders = providers.filter(p => p !== 'email');

    const response: CheckAuthResponse = {
      exists: true,
      providers: providers,
      canUseEmailOTP: hasEmailIdentity,
    };

    if (!hasEmailIdentity && oauthProviders.length > 0) {
      // User signed up with OAuth only - can't use email OTP
      const providerNames = oauthProviders.map(p => {
        switch (p) {
          case 'google': return 'Google';
          case 'discord': return 'Discord';
          case 'twitter': return 'X (Twitter)';
          default: return p.charAt(0).toUpperCase() + p.slice(1);
        }
      });

      response.message = `This account was created with ${providerNames.join(' or ')}. Please use that method to sign in.`;
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking auth provider:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
