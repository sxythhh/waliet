-- Create trigger function to auto-end campaigns when budget is fully used
CREATE OR REPLACE FUNCTION public.auto_end_campaign_on_budget_exhausted()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if budget_used has reached or exceeded budget
  -- Only update if campaign is currently active and not infinite budget
  IF NEW.budget_used >= NEW.budget 
     AND NEW.budget > 0 
     AND (NEW.is_infinite_budget IS NULL OR NEW.is_infinite_budget = false)
     AND NEW.status = 'active' THEN
    NEW.status := 'ended';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on campaigns table
DROP TRIGGER IF EXISTS trigger_auto_end_campaign_on_budget ON public.campaigns;
CREATE TRIGGER trigger_auto_end_campaign_on_budget
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_end_campaign_on_budget_exhausted();