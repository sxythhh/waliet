-- Make verification-screenshots bucket public so images/videos can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'verification-screenshots';