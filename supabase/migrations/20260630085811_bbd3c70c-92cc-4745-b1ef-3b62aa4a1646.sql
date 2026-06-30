DROP POLICY IF EXISTS "Admin select all mining" ON public.mining_state;
DROP POLICY IF EXISTS "Admin select all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin select all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admin select all withdrawals" ON public.withdrawals;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;