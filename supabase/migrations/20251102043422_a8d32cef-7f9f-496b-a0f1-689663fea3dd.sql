-- Allow public read access to brands table for iframe embedding
CREATE POLICY "Allow public read access to brands"
ON public.brands
FOR SELECT
USING (true);

-- Note: Frontend queries should avoid selecting sensitive fields like shortimize_api_key
-- when not authenticated