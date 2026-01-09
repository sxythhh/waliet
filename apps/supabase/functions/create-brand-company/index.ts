import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whopApiKey = Deno.env.get('WHOP_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { brand_id, return_url, refresh_url } = await req.json();

    if (!brand_id) {
      return new Response(JSON.stringify({ error: 'brand_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin of this brand
    const { data: memberData, error: memberError } = await supabase
      .from('brand_members')
      .select('role')
      .eq('brand_id', brand_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData || !['owner', 'admin'].includes(memberData.role)) {
      return new Response(JSON.stringify({ error: 'Not authorized for this brand' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get brand details
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, slug, whop_company_id')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return new Response(JSON.stringify({ error: 'Brand not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If brand already has a Whop company, return onboarding link for that company
    if (brand.whop_company_id) {
      console.log(`Brand ${brand_id} already has Whop company: ${brand.whop_company_id}`);
      
      // Create an account link for the existing company
      const linkResponse = await fetch('https://api.whop.com/api/v1/account_links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whopApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: brand.whop_company_id,
          use_case: 'account_onboarding',
          return_url: return_url || `${supabaseUrl.replace('.supabase.co', '')}/brand/${brand.slug}/account`,
          refresh_url: refresh_url || `${supabaseUrl.replace('.supabase.co', '')}/brand/${brand.slug}/account`,
        }),
      });

      if (!linkResponse.ok) {
        const errorText = await linkResponse.text();
        console.error('Whop account link error:', errorText);
        return new Response(JSON.stringify({ 
          company_id: brand.whop_company_id,
          already_exists: true,
          error: 'Could not create onboarding link'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const linkData = await linkResponse.json();
      return new Response(JSON.stringify({ 
        company_id: brand.whop_company_id,
        already_exists: true,
        onboarding_url: linkData.url,
        expires_at: linkData.expires_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For new brands without a Whop company, we need to:
    // 1. First create a Company via the companies API
    // 2. Then create an account_link for onboarding
    console.log(`Creating Whop company for brand: ${brand.name}`);
    
    const parentCompanyId = Deno.env.get('WHOP_PARENT_COMPANY_ID');
    if (!parentCompanyId) {
      return new Response(JSON.stringify({ error: 'WHOP_PARENT_COMPANY_ID not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get user email for the account
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email;

    // Step 1: Create a Company for this connected account
    const companyResponse = await fetch('https://api.whop.com/api/v1/companies', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        parent_company_id: parentCompanyId,
        title: brand.name,
        metadata: {
          brand_id: brand_id,
          brand_slug: brand.slug
        }
      }),
    });

    const companyResponseText = await companyResponse.text();
    console.log('Whop create company response status:', companyResponse.status);
    console.log('Whop create company response:', companyResponseText);

    if (!companyResponse.ok) {
      console.error('Whop create company error:', companyResponseText);
      return new Response(JSON.stringify({ 
        error: 'Failed to create Whop company', 
        details: companyResponseText,
        status: companyResponse.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyData = JSON.parse(companyResponseText);
    const newCompanyId = companyData.id;
    console.log('Whop company created:', newCompanyId);

    // Save the company ID to the brand
    const { error: updateError } = await supabase
      .from('brands')
      .update({ whop_company_id: newCompanyId })
      .eq('id', brand_id);

    if (updateError) {
      console.error('Error updating brand with company_id:', updateError);
    }

    // Step 2: Create an account_link for onboarding
    const accountLinkResponse = await fetch('https://api.whop.com/api/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whopApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company_id: newCompanyId,
        use_case: 'account_onboarding',
        return_url: return_url || `https://virality.gg/brand/${brand.slug}/account?onboarding=complete`,
        refresh_url: refresh_url || `https://virality.gg/brand/${brand.slug}/account?onboarding=refresh`,
      }),
    });

    const linkResponseText = await accountLinkResponse.text();
    console.log('Whop account_links response status:', accountLinkResponse.status);
    console.log('Whop account_links response:', linkResponseText);

    if (!accountLinkResponse.ok) {
      console.error('Whop account_links error:', linkResponseText);
      return new Response(JSON.stringify({ 
        error: 'Failed to create onboarding link', 
        details: linkResponseText,
        status: accountLinkResponse.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountLinkData = JSON.parse(linkResponseText);
    console.log('Whop account link created:', accountLinkData);

    return new Response(JSON.stringify({ 
      onboarding_url: accountLinkData.url,
      company_id: newCompanyId,
      expires_at: accountLinkData.expires_at,
      already_exists: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in create-brand-company:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
