-- Add tax-related fields to profiles table
-- These fields track creator tax residency and cumulative payouts for W-9 threshold tracking

-- Add tax country field (ISO 3166-1 alpha-2 code)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tax_country TEXT;

-- Add tax classification for withholding purposes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tax_classification TEXT
  CHECK (tax_classification IS NULL OR tax_classification IN ('us_citizen', 'us_resident', 'non_resident_alien', 'foreign_entity'));

-- Add cumulative payouts tracking for W-9 threshold ($600)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cumulative_payouts_ytd DECIMAL(12,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cumulative_payouts_year INTEGER;

-- Create indexes for tax queries
CREATE INDEX IF NOT EXISTS idx_profiles_tax_country ON profiles(tax_country);
CREATE INDEX IF NOT EXISTS idx_profiles_tax_classification ON profiles(tax_classification);

-- Add comments for documentation
COMMENT ON COLUMN profiles.tax_country IS 'Country of tax residence (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN profiles.tax_classification IS 'US tax classification for withholding purposes';
COMMENT ON COLUMN profiles.cumulative_payouts_ytd IS 'Total payouts in current calendar year for W-9 threshold tracking';
COMMENT ON COLUMN profiles.cumulative_payouts_year IS 'Year for cumulative_payouts_ytd tracking';

-- Function to reset cumulative payouts at year start
CREATE OR REPLACE FUNCTION reset_cumulative_payouts_if_new_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cumulative_payouts_year IS NULL OR NEW.cumulative_payouts_year < EXTRACT(YEAR FROM NOW())::INTEGER THEN
    NEW.cumulative_payouts_ytd := 0;
    NEW.cumulative_payouts_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-reset cumulative payouts on year change
DROP TRIGGER IF EXISTS check_year_on_profile_update ON profiles;
CREATE TRIGGER check_year_on_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.cumulative_payouts_ytd IS DISTINCT FROM OLD.cumulative_payouts_ytd)
  EXECUTE FUNCTION reset_cumulative_payouts_if_new_year();
