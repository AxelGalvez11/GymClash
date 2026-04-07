-- Migration 016: Provision storage for workout video form-check uploads
-- The mobile app and analysis backend both assume a public `workout-videos`
-- bucket exists. Without it, uploads fail with "Bucket not found".

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'workout-videos',
  'workout-videos',
  true,
  209715200,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'application/json']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS workout_videos_public_read ON storage.objects;
CREATE POLICY workout_videos_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'workout-videos');

DROP POLICY IF EXISTS workout_videos_authenticated_upload ON storage.objects;
CREATE POLICY workout_videos_authenticated_upload
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout-videos'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS workout_videos_authenticated_update ON storage.objects;
CREATE POLICY workout_videos_authenticated_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'workout-videos' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'workout-videos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS workout_videos_authenticated_delete ON storage.objects;
CREATE POLICY workout_videos_authenticated_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'workout-videos' AND auth.uid() IS NOT NULL);
