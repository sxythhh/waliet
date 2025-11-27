-- Update existing campaigns to populate brand_logo_url from their associated brands
UPDATE campaigns
SET brand_logo_url = brands.logo_url
FROM brands
WHERE campaigns.brand_id = brands.id
  AND campaigns.brand_logo_url IS NULL;