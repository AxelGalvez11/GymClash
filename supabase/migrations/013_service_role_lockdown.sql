-- Migration 013: Lock down service-role-only functions from migration 012
-- These functions should only be callable by the service_role (edge functions),
-- not by authenticated users directly.

-- Revoke public access to coin manipulation
REVOKE EXECUTE ON FUNCTION update_gym_coins(uuid, integer) FROM public;
REVOKE EXECUTE ON FUNCTION update_gym_coins(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION update_gym_coins(uuid, integer) FROM anon;

-- Revoke public access to workout counter manipulation
REVOKE EXECUTE ON FUNCTION increment_workout_counter(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION increment_workout_counter(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION increment_workout_counter(uuid, text) FROM anon;

-- Ensure only service_role can call these
GRANT EXECUTE ON FUNCTION update_gym_coins(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION increment_workout_counter(uuid, text) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION update_gym_coins(uuid, integer) IS 'Service-role only: Awards/deducts gym coins. Called by validate-workout edge function.';
COMMENT ON FUNCTION increment_workout_counter(uuid, text) IS 'Service-role only: Increments strength/scout workout counts. Called by validate-workout edge function.';
