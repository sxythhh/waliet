-- Create a view that aliases businesses as brands for backwards compatibility
-- This allows existing frontend code that references "brands" table to work
-- with the new "businesses" table without code changes.

CREATE OR REPLACE VIEW brands AS
SELECT * FROM businesses;

-- Grant same permissions as businesses table
GRANT SELECT, INSERT, UPDATE, DELETE ON brands TO authenticated;
GRANT SELECT ON brands TO anon;

-- Note: RLS policies on the underlying businesses table will be inherited
-- through the view since it's a simple SELECT * view.

COMMENT ON VIEW brands IS 'Backwards compatibility alias for businesses table';
