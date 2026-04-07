-- Migration 014: Video analysis persistence
-- Stores structured results from the workout video analysis service.
-- Linked to workouts table, with RLS for user-scoped access.

-- New evidence type for video
DO $$ BEGIN
  ALTER TYPE evidence_type ADD VALUE IF NOT EXISTS 'video';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS workout_video_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_id uuid REFERENCES workout_evidence(id) ON DELETE SET NULL,

  -- Exercise analysis type (within the video domain, not the app-wide workout type)
  exercise_type text NOT NULL,

  -- Summary fields for direct querying
  rep_count integer NOT NULL DEFAULT 0,
  valid_rep_count integer NOT NULL DEFAULT 0,
  form_score numeric(5,2) NOT NULL DEFAULT 0,
  analysis_confidence numeric(3,2) NOT NULL DEFAULT 0,
  verification_status text NOT NULL DEFAULT 'needs_review'
    CHECK (verification_status IN ('verified', 'needs_review', 'rejected')),
  camera_angle text NOT NULL DEFAULT 'unknown',

  -- Structured JSONB for detailed data
  cheat_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  aggregate_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  reps jsonb NOT NULL DEFAULT '[]'::jsonb,
  debug_info jsonb,

  -- Video metadata
  video_url text,
  video_duration_ms integer,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching by workout
CREATE INDEX IF NOT EXISTS idx_video_analyses_workout ON workout_video_analyses(workout_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_user ON workout_video_analyses(user_id);

-- Only one analysis per workout (can be re-run by deleting and re-inserting)
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_analyses_unique_workout
  ON workout_video_analyses(workout_id);

-- RLS: users can only read their own analyses
ALTER TABLE workout_video_analyses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY video_analyses_select_own ON workout_video_analyses
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert allowed for authenticated users (the Python service uses service_role)
DO $$ BEGIN
  CREATE POLICY video_analyses_insert_service ON workout_video_analyses
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_video_analysis_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_analysis_updated_at ON workout_video_analyses;
CREATE TRIGGER video_analysis_updated_at
  BEFORE UPDATE ON workout_video_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_video_analysis_updated_at();
