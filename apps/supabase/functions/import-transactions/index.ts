import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionRow {
  username: string;
  amount: number;
  date: string;
}

interface ImportResult {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    username: string;
    error: string;
  }>;
  details: Array<{
    username: string;
    amount: number;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      throw new Error('Unauthorized');
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Authorization check failed:', roleError);
      throw new Error('Unauthorized - Admin access required');
    }

    // Parse the request body
    const { csvContent } = await req.json();
    if (!csvContent) {
      throw new Error('No CSV content provided');
    }

    console.log('Processing CSV content...');

    // Parse CSV content
    const lines = csvContent.trim().split('\n');
    const transactions: TransactionRow[] = [];

    // Skip header if present
    const startIndex = lines[0].toLowerCase().includes('username') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(';').map((part: string) => part.trim());
      
      if (parts.length < 2) {
        console.warn(`Skipping invalid line ${i + 1}: ${line}`);
        continue;
      }

      const username = parts[0];
      const amount = parseFloat(parts[1]);
      const date = parts[2] || new Date().toISOString();

      if (!username || isNaN(amount)) {
        console.warn(`Skipping invalid data on line ${i + 1}: ${line}`);
        continue;
      }

      transactions.push({ username, amount, date });
    }

    console.log(`Parsed ${transactions.length} transactions`);

    const result: ImportResult = {
      success: true,
      processed: transactions.length,
      successful: 0,
      failed: 0,
      errors: [],
      details: [],
    };

    // Process each transaction
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      
      try {
        // Find user by social account username
        const { data: socialAccount, error: socialError } = await supabase
          .from('social_accounts')
          .select('id, username, user_id, platform')
          .eq('username', transaction.username)
          .maybeSingle();

        if (socialError) {
          throw new Error(`Database error: ${socialError.message}`);
        }

        if (!socialAccount) {
          throw new Error(`Social account username not found: ${transaction.username}`);
        }

        // Get the user's profile info for logging
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', socialAccount.user_id)
          .maybeSingle();

        console.log(`Processing transaction for social account ${socialAccount.username} (@${socialAccount.platform}) - User: ${profile?.username || socialAccount.user_id}`);

        // Get current wallet
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance, total_earned')
          .eq('user_id', socialAccount.user_id)
          .maybeSingle();

        if (walletError) {
          throw new Error(`Failed to fetch wallet: ${walletError.message}`);
        }

        const currentBalance = wallet?.balance || 0;
        const currentEarned = wallet?.total_earned || 0;

        // Update wallet balance
        const { error: updateError } = await supabase
          .from('wallets')
          .update({
            balance: currentBalance + transaction.amount,
            total_earned: currentEarned + transaction.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', socialAccount.user_id);

        if (updateError) {
          throw new Error(`Failed to update wallet: ${updateError.message}`);
        }

        // Create transaction record
        const { error: transactionError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: socialAccount.user_id,
            amount: transaction.amount,
            type: 'earning',
            status: 'completed',
            description: `CSV Import - Payment for ${transaction.date}`,
            created_by: user.id,
            metadata: {
              import_date: new Date().toISOString(),
              original_date: transaction.date,
              imported_by: user.id,
              source: 'csv_import',
              social_account_username: socialAccount.username,
              social_account_platform: socialAccount.platform
            }
          });

        if (transactionError) {
          throw new Error(`Failed to create transaction: ${transactionError.message}`);
        }

        // Log to audit
        await supabase.from('security_audit_log').insert({
          user_id: user.id,
          action: 'CSV_IMPORT_TRANSACTION',
          table_name: 'wallet_transactions',
          record_id: socialAccount.user_id,
          new_data: {
            social_account_username: transaction.username,
            platform: socialAccount.platform,
            virality_username: profile?.username,
            amount: transaction.amount,
            date: transaction.date,
          },
        });


        result.successful++;
        result.details.push({
          username: `${transaction.username} (@${socialAccount.platform})`,
          amount: transaction.amount,
          status: 'success',
        });

        console.log(`✓ Successfully processed transaction for ${socialAccount.username} (@${socialAccount.platform})`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`✗ Failed to process transaction for ${transaction.username}:`, errorMessage);
        
        result.failed++;
        result.errors.push({
          row: i + 1,
          username: transaction.username,
          error: errorMessage,
        });
        result.details.push({
          username: transaction.username,
          amount: transaction.amount,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    console.log(`Import complete: ${result.successful} successful, ${result.failed} failed`);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in import-transactions function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
