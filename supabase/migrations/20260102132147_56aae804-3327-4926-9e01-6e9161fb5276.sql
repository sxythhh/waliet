-- Make brand_id nullable in discord_ticket_config
-- This allows the main Virality server to use the ticket system without a brand
ALTER TABLE discord_ticket_config
  ALTER COLUMN brand_id DROP NOT NULL;

-- Drop existing constraints if they exist
ALTER TABLE discord_ticket_config
  DROP CONSTRAINT IF EXISTS discord_ticket_config_brand_id_guild_id_key;

ALTER TABLE discord_ticket_config
  DROP CONSTRAINT IF EXISTS discord_ticket_config_brand_id_key;

-- Ensure unique constraint on just guild_id exists
-- (we already added this in the previous migration, but making sure)
ALTER TABLE discord_ticket_config
  DROP CONSTRAINT IF EXISTS discord_ticket_config_guild_id_key;

ALTER TABLE discord_ticket_config
  ADD CONSTRAINT discord_ticket_config_guild_id_key UNIQUE (guild_id);