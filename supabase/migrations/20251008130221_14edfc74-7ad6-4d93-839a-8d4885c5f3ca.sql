-- Move any existing deals from 'proposal' to 'negotiation'
UPDATE sales_deals 
SET stage = 'negotiation' 
WHERE stage = 'proposal';

-- Drop the default temporarily
ALTER TABLE sales_deals 
  ALTER COLUMN stage DROP DEFAULT;

-- Create new enum without 'proposal'
CREATE TYPE sales_stage_new AS ENUM ('lead', 'qualified', 'negotiation', 'won', 'lost');

-- Update the table to use the new enum
ALTER TABLE sales_deals 
  ALTER COLUMN stage TYPE sales_stage_new 
  USING stage::text::sales_stage_new;

-- Drop the old enum
DROP TYPE sales_stage;

-- Rename the new enum to the original name
ALTER TYPE sales_stage_new RENAME TO sales_stage;

-- Re-add the default
ALTER TABLE sales_deals 
  ALTER COLUMN stage SET DEFAULT 'lead'::sales_stage;