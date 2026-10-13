-- First create your real admin in Supabase > Authentication > Users > Add user.
-- Replace ONLY the placeholder below with that user's email, then run this file.
do $$
declare
  v_email text := 'GANTI_DENGAN_EMAIL_ADMIN';
  v_auth auth.users;
begin
  select * into v_auth from auth.users where lower(email)=lower(v_email) limit 1;
  if v_auth.id is null then raise exception 'Create the admin Auth user first and replace GANTI_DENGAN_EMAIL_ADMIN'; end if;
  insert into public.user_accounts(email,full_name,auth_id,role,groups,status,employment_status)
  values(lower(v_auth.email),coalesce(nullif(v_auth.raw_user_meta_data->>'full_name',''),v_auth.email),v_auth.id,'Super Admin',array['admin','hr','hrd','employee-data'],'Active','Active')
  on conflict(email) do update set auth_id=excluded.auth_id,role=excluded.role,groups=excluded.groups,status='Active',employment_status='Active',updated_at=now();
end;
$$;
