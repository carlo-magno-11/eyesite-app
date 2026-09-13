-- EYESITE 4 — realtime para auditoría administrativa.
do $$ begin
  begin alter publication supabase_realtime add table public.admin_activity_log; exception when duplicate_object then null; end;
end $$;
notify pgrst,'reload schema';
