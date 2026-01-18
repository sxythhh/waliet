-- Update brand-assets bucket file size limit to 300MB

UPDATE storage.buckets
SET file_size_limit = 314572800  -- 300MB in bytes
WHERE id = 'brand-assets';
