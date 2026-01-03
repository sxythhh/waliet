-- Make brand_id nullable in discord_ticket_config
-- This allows the main Virality server to use the ticket system without a brand

ALTER TABLE discord_ticket_config
  ALTER COLUMN brand_id DROP NOT NULL;

-- Update the unique constraint to just use guild_id (one config per server)
ALTER TABLE discord_ticket_config
  DROP CONSTRAINT IF EXISTS discord_ticket_config_brand_id_guild_id_key;

-- Add unique constraint on just guild_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'discord_ticket_config_guild_id_key'
  ) THEN
    ALTER TABLE discord_ticket_config
      ADD CONSTRAINT discord_ticket_config_guild_id_key UNIQUE (guild_id);
  END IF;
END $$;
