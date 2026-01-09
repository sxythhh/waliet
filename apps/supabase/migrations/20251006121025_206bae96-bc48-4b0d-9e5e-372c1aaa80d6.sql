-- Update the match_analytics_to_users function to use the junction table
CREATE OR REPLACE FUNCTION public.match_analytics_to_users(p_campaign_id uuid)
RETURNS TABLE(matched_count integer, unmatched_count integer, total_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_matched integer := 0;
  v_total integer := 0;
BEGIN
  -- Count total analytics records for this campaign
  SELECT COUNT(*) INTO v_total
  FROM campaign_account_analytics
  WHERE campaign_id = p_campaign_id;
  
  -- Update analytics with user_id by matching username and platform through junction table
  WITH matched_accounts AS (
    UPDATE campaign_account_analytics caa
    SET user_id = sa.user_id
    FROM social_accounts sa
    INNER JOIN social_account_campaigns sac ON sac.social_account_id = sa.id
    WHERE caa.campaign_id = p_campaign_id
      AND sac.campaign_id = p_campaign_id
      AND LOWER(TRIM(caa.account_username)) = LOWER(TRIM(sa.username))
      AND LOWER(caa.platform) = LOWER(sa.platform)
    RETURNING caa.id
  )
  SELECT COUNT(*) INTO v_matched FROM matched_accounts;
  
  RETURN QUERY SELECT v_matched, v_total - v_matched, v_total;
END;
$$;