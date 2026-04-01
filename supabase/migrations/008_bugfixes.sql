-- Migration 008: Critical bug fixes
-- B1: Active recovery workouts fail workout_data_check constraint
-- B2: finalize-wars doesn't award clan war trophies to members
-- B3: (Client-side fix, no SQL needed)

-- ─── B1: Fix workout_data_check to allow active_recovery ─────────────
-- Active recovery workouts have NULL sets and NULL route_data.
-- The existing CHECK only allows NULL data for 'draft' status,
-- so submitted active_recovery workouts fail the constraint.

ALTER TABLE workouts DROP CONSTRAINT workout_data_check;

ALTER TABLE workouts ADD CONSTRAINT workout_data_check CHECK (
  (type = 'strength' AND sets IS NOT NULL) OR
  (type = 'scout' AND route_data IS NOT NULL) OR
  (type = 'active_recovery') OR
  status = 'draft'
);
