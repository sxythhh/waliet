-- Set default trust score to 100 for new profiles
ALTER TABLE profiles 
ALTER COLUMN trust_score SET DEFAULT 100;

-- Update all existing creators with trust_score of 0 to 100
UPDATE profiles 
SET trust_score = 100 
WHERE account_type = 'creator' AND trust_score = 0;