-- Add unique constraints to discord_ticket_config
ALTER TABLE public.discord_ticket_config ADD CONSTRAINT discord_ticket_config_brand_id_key UNIQUE (brand_id);
ALTER TABLE public.discord_ticket_config ADD CONSTRAINT discord_ticket_config_guild_id_key UNIQUE (guild_id);