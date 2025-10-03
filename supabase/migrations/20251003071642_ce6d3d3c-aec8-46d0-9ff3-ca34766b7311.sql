-- Add user_id column to campaign_account_analytics to link analytics to users
ALTER TABLE campaign_account_analytics 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_campaign_account_analytics_user_id ON campaign_account_analytics(user_id);

-- Create a function to automatically match and link accounts to users based on social_accounts
CREATE OR REPLACE FUNCTION public.match_analytics_to_users(p_campaign_id uuid)
RETURNS TABLE(
  matched_count integer,
  unmatched_count integer,
  total_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matched integer := 0;
  v_total integer := 0;
BEGIN
  -- Count total analytics records for this campaign
  SELECT COUNT(*) INTO v_total
  FROM campaign_account_analytics
  WHERE campaign_id = p_campaign_id;
  
  -- Update analytics with user_id by matching username and platform
  WITH matched_accounts AS (
    UPDATE campaign_account_analytics caa
    SET user_id = sa.user_id
    FROM social_accounts sa
    WHERE caa.campaign_id = p_campaign_id
      AND sa.campaign_id = p_campaign_id
      AND LOWER(TRIM(caa.account_username)) = LOWER(TRIM(sa.username))
      AND LOWER(caa.platform) = LOWER(sa.platform)
    RETURNING caa.id
  )
  SELECT COUNT(*) INTO v_matched FROM matched_accounts;
  
  RETURN QUERY SELECT v_matched, v_total - v_matched, v_total;
END;
$$;