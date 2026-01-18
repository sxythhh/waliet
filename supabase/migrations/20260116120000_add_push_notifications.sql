-- Push notification tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT, -- Optional device identifier for managing multiple devices
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Index for looking up tokens by user
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- RLS policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own push tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Function to send push notification via Edge Function
CREATE OR REPLACE FUNCTION notify_wallet_transaction()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  amount_formatted TEXT;
BEGIN
  -- Only send notifications for completed earnings (positive amounts)
  IF NEW.status = 'completed' AND NEW.amount > 0 AND NEW.type IN ('earning', 'bonus', 'transfer_received', 'team_earning', 'affiliate_earning') THEN
    -- Format amount
    amount_formatted := '$' || TRIM(TO_CHAR(NEW.amount, '999,999.99'));

    -- Set notification content based on type
    CASE NEW.type
      WHEN 'earning' THEN
        notification_title := 'Payment Received';
        notification_body := 'You earned ' || amount_formatted || ' from your video!';
      WHEN 'bonus' THEN
        notification_title := 'Bonus Received';
        notification_body := 'You received a ' || amount_formatted || ' bonus!';
      WHEN 'transfer_received' THEN
        notification_title := 'Transfer Received';
        notification_body := 'You received a ' || amount_formatted || ' transfer!';
      WHEN 'team_earning' THEN
        notification_title := 'Team Earning';
        notification_body := 'You earned ' || amount_formatted || ' from your team!';
      WHEN 'affiliate_earning' THEN
        notification_title := 'Referral Bonus';
        notification_body := 'You earned ' || amount_formatted || ' from a referral!';
      ELSE
        notification_title := 'Payment Received';
        notification_body := 'You received ' || amount_formatted;
    END CASE;

    -- Call Edge Function to send push notification (async via pg_net if available)
    -- For now, we'll use a simpler approach with a notification queue table
    INSERT INTO notification_queue (user_id, title, body, data, created_at)
    VALUES (
      NEW.user_id,
      notification_title,
      notification_body,
      jsonb_build_object(
        'type', 'wallet_transaction',
        'transaction_id', NEW.id,
        'amount', NEW.amount,
        'transaction_type', NEW.type
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notification queue table for async processing
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Index for processing pending notifications
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending
  ON notification_queue(status, created_at)
  WHERE status = 'pending';

-- RLS for notification queue (service role only)
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Create trigger on wallet_transactions
DROP TRIGGER IF EXISTS wallet_transaction_notification ON wallet_transactions;
CREATE TRIGGER wallet_transaction_notification
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_wallet_transaction();

-- Grant access to service role for Edge Functions
GRANT ALL ON push_tokens TO service_role;
GRANT ALL ON notification_queue TO service_role;
