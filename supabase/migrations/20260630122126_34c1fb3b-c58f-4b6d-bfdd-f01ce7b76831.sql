
REVOKE EXECUTE ON FUNCTION public.settle_mining(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_mining(uuid) TO service_role;
