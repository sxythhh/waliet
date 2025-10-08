-- Move any existing deals from 'lost' to 'lead'
UPDATE sales_deals 
SET stage = 'lead' 
WHERE stage = 'lost';

-- Drop the default temporarily
ALTER TABLE sales_deals 
  ALTER COLUMN stage DROP DEFAULT;

-- Create new enum without 'lost'
CREATE TYPE sales_stage_new AS ENUM ('lead', 'qualified', 'negotiation', 'won');

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