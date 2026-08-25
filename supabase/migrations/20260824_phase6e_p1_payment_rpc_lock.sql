-- ==============================================================================
-- PHASE 6E P1: LOCK record_verified_payment RPC TO SERVICE ROLE ONLY
-- Ensures only authenticated server-side / Edge Functions can execute payment verification
-- ==============================================================================

-- 1. Revoke public, authenticated, and anonymous direct PostgREST RPC invocation
REVOKE EXECUTE ON FUNCTION public.record_verified_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_verified_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_verified_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM anon;

-- 2. Explicitly grant execution ONLY to the trusted service_role
GRANT EXECUTE ON FUNCTION public.record_verified_payment(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB) TO service_role;
