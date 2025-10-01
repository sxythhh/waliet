-- Add show_account_tab column to brands table
ALTER TABLE public.brands 
ADD COLUMN show_account_tab boolean DEFAULT true NOT NULL;

-- Add comment
COMMENT ON COLUMN public.brands.show_account_tab IS 'Controls whether the Account tab is visible in the sidebar';
