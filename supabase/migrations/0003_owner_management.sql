-- Phase 1 preview only. Additive tables and guarded management commands.
-- Apply only after owner approval and a fresh encrypted database backup.
create table public.owner_user_access(user_id uuid primary key references auth.users(id),active boolean not null default true,updated_at timestamptz not null default now());
create table public.owner_company_reviews(carrier_id uuid primary key references public.carriers(id),status text not null check(status in ('pending','approved','rejected','suspended')),notes text not null default '',reviewed_by uuid references auth.users(id),reviewed_at timestamptz not null default now());
create table public.owner_document_reviews(document_id uuid primary key references public.documents(id),status text not null check(status in ('pending','approved','rejected')),notes text not null default '',reviewed_by uuid references auth.users(id),reviewed_at timestamptz not null default now());
create table public.owner_lead_workflow(lead_id uuid primary key references public.leads(id),follow_up_at timestamptz,qualified boolean not null default false,carrier_id uuid references public.carriers(id));
create table public.owner_record_versions(entity text not null,record_id uuid not null,revision integer not null default 1,primary key(entity,record_id));
create table public.owner_management_audit(id uuid primary key default gen_random_uuid(),actor_id uuid,actor_role text,entity text not null,record_id uuid not null,operation text not null,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());
create table public.owner_invitation_requests(id uuid primary key default gen_random_uuid(),email text not null,full_name text not null,role text not null check(role in ('carrier','driver')),carrier_id uuid not null references public.carriers(id),created_by uuid not null references auth.users(id),user_id uuid references auth.users(id),status text not null default 'pending' check(status in ('pending','ready','cancelled')),created_at timestamptz not null default now());
create unique index owner_one_pending_invitation on public.owner_invitation_requests(lower(email)) where status='pending';
create table public.owner_management_outbox(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('invitation','document-reminder')),invitation_id uuid unique references public.owner_invitation_requests(id),document_id uuid references public.documents(id),recipient text not null,status text not null default 'pending' check(status in ('pending','processing','sent','failed','cancelled')),attempts integer not null default 0,lease_until timestamptz,encrypted_link text,link_created_at timestamptz,sent_at timestamptz,last_error text,created_at timestamptz not null default now());

create function public.owner_authorized() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid()='d5f443af-ac3a-42b2-8294-6fbf51f73beb'::uuid and lower(auth.jwt()->>'email')='felicialvrg@gmail.com'
 and exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=auth.uid() and lower(u.email)='felicialvrg@gmail.com' and u.email_confirmed_at is not null and p.role='admin' and p.carrier_id is null)
$$;
create function public.owner_account_enabled() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and not exists(select 1 from public.owner_user_access where user_id=auth.uid() and not active) $$;
revoke all on function public.owner_authorized(),public.owner_account_enabled() from public,anon;
grant execute on function public.owner_authorized(),public.owner_account_enabled() to authenticated,service_role;

do $$ declare t text;begin
 foreach t in array array['owner_user_access','owner_company_reviews','owner_document_reviews','owner_lead_workflow','owner_record_versions','owner_management_audit','owner_invitation_requests','owner_management_outbox'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  if t<>'owner_management_outbox' then execute format('grant select on public.%I to authenticated',t);end if;
  execute format('create policy owner_management_read on public.%I for select to authenticated using(public.owner_authorized())',t);
 end loop;
 -- Existing reads and roles are retained. Deactivation denies existing sessions too.
 foreach t in array array['profiles','carriers','leads','documents','document_types','payments','fuel_receipts','mileage_entries','dat_records','sales_representatives','sales_prospects','sales_applications','sales_checkout_attempts','sales_commissions','sales_activity','sales_resources','sales_outbox','sales_payment_events'] loop
  execute format('create policy owner_disabled_account on public.%I as restrictive for all to authenticated using(public.owner_account_enabled()) with check(public.owner_account_enabled())',t);
 end loop;
end $$;
grant select(id,kind,invitation_id,document_id,recipient,status,attempts,sent_at,last_error,created_at) on public.owner_management_outbox to authenticated;
create policy owner_disabled_storage on storage.objects as restrictive for all to authenticated using(public.owner_account_enabled()) with check(public.owner_account_enabled());
create function public.owner_company_available(p_company uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.is_admin() or exists(select 1 from public.carriers where id=p_company and status not in ('paused','cancelled')) $$;
revoke all on function public.owner_company_available(uuid) from public,anon;
grant execute on function public.owner_company_available(uuid) to authenticated,service_role;
do $$ declare t text;begin foreach t in array array['documents','fuel_receipts','mileage_entries','dat_records'] loop
 execute format('create policy owner_suspended_company on public.%I as restrictive for all to authenticated using(public.owner_company_available(carrier_id)) with check(public.owner_company_available(carrier_id))',t);
end loop;end $$;
create policy owner_suspended_company_storage on storage.objects as restrictive for all to authenticated using(bucket_id<>'carrier-files' or public.is_admin() or (storage.foldername(name))[1] in(select id::text from public.carriers where status not in ('paused','cancelled'))) with check(bucket_id<>'carrier-files' or public.is_admin() or (storage.foldername(name))[1] in(select id::text from public.carriers where status not in ('paused','cancelled')));

-- Preserve legacy admin identities/read access, but sensitive direct writes also need the owner.
create function public.owner_guard_management() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if auth.role()='authenticated' then
  if tg_table_name in ('carriers','leads') then
   if not public.owner_authorized() then raise exception 'Verified owner authorization required' using errcode='42501';end if;
  elsif tg_table_name='profiles' then
   if old.role is distinct from new.role or old.carrier_id is distinct from new.carrier_id or old.email is distinct from new.email then
    if not public.owner_authorized() then raise exception 'Verified owner authorization required' using errcode='42501';end if;
   end if;
  elsif tg_table_name='documents' then
   if (new.status='rejected' or old.status='rejected') and old.status is distinct from new.status and not public.owner_authorized() then raise exception 'Verified owner document review required' using errcode='42501';end if;
  end if;
 end if;
 if tg_table_name='profiles' then
  if old.id='d5f443af-ac3a-42b2-8294-6fbf51f73beb'::uuid and (new.role<>'admin' or new.carrier_id is not null or lower(new.email)<>'felicialvrg@gmail.com') then raise exception 'Existing owner identity is protected';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger owner_guard_profiles before update on public.profiles for each row execute function public.owner_guard_management();
create trigger owner_guard_carriers before insert or update or delete on public.carriers for each row execute function public.owner_guard_management();
create trigger owner_guard_leads before insert or update or delete on public.leads for each row execute function public.owner_guard_management();
create trigger owner_guard_documents before update on public.documents for each row execute function public.owner_guard_management();

create function public.owner_audit_management() returns trigger language plpgsql security definer set search_path='' as $$ declare old_value jsonb;new_value jsonb;rid uuid;begin
 if tg_op<>'INSERT' then old_value=to_jsonb(old);end if;if tg_op<>'DELETE' then new_value=to_jsonb(new);end if;
 if tg_table_name='owner_lead_workflow' then rid=coalesce(new_value->>'lead_id',old_value->>'lead_id')::uuid;else rid=coalesce(new_value->>'id',new_value->>'user_id',new_value->>'carrier_id',new_value->>'document_id',new_value->>'lead_id',old_value->>'id',old_value->>'user_id',old_value->>'carrier_id',old_value->>'document_id')::uuid;end if;
 insert into public.owner_management_audit(actor_id,actor_role,entity,record_id,operation,before_data,after_data) values(auth.uid(),auth.role(),tg_table_name,rid,tg_op,old_value,new_value);
 insert into public.owner_record_versions(entity,record_id,revision) values(tg_table_name,rid,1) on conflict(entity,record_id) do update set revision=owner_record_versions.revision+1;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
do $$ declare t text;begin foreach t in array array['profiles','carriers','documents','leads','owner_user_access','owner_company_reviews','owner_document_reviews','owner_lead_workflow','owner_invitation_requests','sales_representatives'] loop
 execute format('create trigger owner_change_audit after insert or update or delete on public.%I for each row execute function public.owner_audit_management()',t);
end loop;end $$;

create function public.owner_management_command(p_action text,p_id uuid default null,p_payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;v public.profiles;company public.carriers;lead public.leads;doc public.documents;invitation public.owner_invitation_requests;rid uuid;target_entity text;rev integer;target_role text;target_company uuid;enabled boolean;plan text;row_email text;
begin
 if not public.owner_authorized() then raise exception 'Verified owner required' using errcode='42501';end if;
 if pg_column_size(p_payload)>20000 then raise exception 'Request too large';end if;
 target_entity=case when p_action in ('user-save','user-status') then 'profiles' when p_action in ('company-save','company-review') then 'carriers' when p_action in ('document-review','document-reminder') then 'documents' when p_action in ('lead-save','lead-convert') then 'leads' when p_action in ('invite-reserve','invitation-resend') then 'owner_invitation_requests' else null end;
 if target_entity is null then raise exception 'Unknown owner action';end if;
 if p_id is not null then
  perform pg_advisory_xact_lock(hashtext(target_entity),hashtext(p_id::text));
  select revision into rev from public.owner_record_versions where owner_record_versions.entity=target_entity and record_id=p_id;
  if p_action<>'invitation-resend' and coalesce((p_payload->>'revision')::integer,-1)<>coalesce(rev,0) then raise exception 'Record changed. Refresh before saving';end if;
 end if;
 if p_action='user-save' or p_action='user-status' then
  select * into v from public.profiles where id=p_id for update;if v.id is null then raise exception 'Existing user required';end if;
  if v.id='d5f443af-ac3a-42b2-8294-6fbf51f73beb'::uuid then raise exception 'Owner account cannot be modified here';end if;
  if v.role='admin' or p_payload->>'role'='admin' then if p_payload->>'confirm_email'<>v.email or p_payload->>'confirm_email' is null then raise exception 'Confirm the admin email explicitly';end if;end if;
  if p_action='user-save' then
   target_role=p_payload->>'role';target_company=nullif(p_payload->>'carrier_id','')::uuid;
   if target_role not in ('admin','carrier','driver') or target_role is null then raise exception 'Invalid role';end if;
   if target_role='admin' and target_company is not null then raise exception 'Admin company association is not supported';end if;
   if target_role='driver' and target_company is null then raise exception 'Driver company required';end if;
   if target_company is not null and not exists(select 1 from public.carriers where id=target_company) then raise exception 'Company not found';end if;
   if length(coalesce(p_payload->>'full_name',''))>120 then raise exception 'Name too long';end if;
   if exists(select 1 from public.sales_representatives where user_id=p_id and status='active') and (target_role<>'carrier' or target_company is not null) then raise exception 'Suspend sales access before changing representative company or role';end if;
   update public.profiles set full_name=p_payload->>'full_name',role=target_role,carrier_id=target_company where id=p_id returning to_jsonb(profiles.*) into result;
  else
   enabled=(p_payload->>'active')::boolean;if enabled is null then raise exception 'Access status required';end if;
   insert into public.owner_user_access(user_id,active) values(p_id,enabled) on conflict(user_id) do update set active=excluded.active,updated_at=now();
   if not enabled then update public.sales_representatives set status='suspended',updated_at=now() where user_id=p_id and status='active';end if;
   -- Revision includes access-only changes as well as profile edits.
   update public.profiles set full_name=full_name where id=p_id;
   result=jsonb_build_object('id',p_id,'active',enabled);
  end if;
 elsif p_action='company-save' then
  if length(trim(coalesce(p_payload->>'legal_name','')))<2 or length(p_payload->>'legal_name')>200 then raise exception 'Legal name required';end if;
  plan=nullif(p_payload->>'tier','');if plan is not null and plan not in ('Basic','Pro','Premium','Ultimate') then raise exception 'Approved plan required';end if;
  perform pg_advisory_xact_lock(hashtext('owner-company-identity'));
  perform pg_advisory_xact_lock(hashtextextended('sales-company:'||coalesce(nullif(p_payload->>'usdot',''),lower(trim(p_payload->>'legal_name'))),0));
  if exists(select 1 from public.carriers where id is distinct from p_id and (lower(legal_name)=lower(trim(p_payload->>'legal_name')) or (nullif(p_payload->>'usdot','') is not null and usdot=p_payload->>'usdot'))) then raise exception 'Company already exists. Use its existing record';end if;
  if p_id is null then
   perform pg_advisory_xact_lock(hashtext('owner-company'),hashtext(lower(trim(p_payload->>'legal_name'))));
   if exists(select 1 from public.carriers where lower(legal_name)=lower(trim(p_payload->>'legal_name')) or (nullif(p_payload->>'usdot','') is not null and usdot=p_payload->>'usdot')) then raise exception 'Company already exists. Use its existing record';end if;
   insert into public.carriers(legal_name,dba,usdot,mc,phone,email,address,tier,status) values(trim(p_payload->>'legal_name'),p_payload->>'dba',nullif(p_payload->>'usdot',''),p_payload->>'mc',p_payload->>'phone',lower(p_payload->>'email'),p_payload->>'address',plan,'onboarding') returning to_jsonb(carriers.*) into result;
  else
   select * into company from public.carriers where id=p_id for update;if company.id is null then raise exception 'Company not found';end if;
   if plan is distinct from company.tier and exists(select 1 from public.sales_applications where carrier_id=p_id and status='paid' and subscription_status='active') then raise exception 'Paid plan changes require the verified Stripe subscription workflow';end if;
   update public.carriers set legal_name=trim(p_payload->>'legal_name'),dba=p_payload->>'dba',usdot=nullif(p_payload->>'usdot',''),mc=p_payload->>'mc',phone=p_payload->>'phone',email=lower(p_payload->>'email'),address=p_payload->>'address',tier=plan where id=p_id returning to_jsonb(carriers.*) into result;
  end if;
 elsif p_action='company-review' then
  select * into company from public.carriers where id=p_id for update;if company.id is null then raise exception 'Company not found';end if;
  if p_payload->>'status' not in ('pending','approved','rejected','suspended','resume') or p_payload->>'status' is null then raise exception 'Review status required';end if;
  if p_payload->>'status'='suspended' then update public.carriers set status='paused' where id=p_id;
  elsif p_payload->>'status'='resume' then update public.carriers set status=case when exists(select 1 from public.sales_applications where carrier_id=p_id and status='paid' and subscription_status='active') then 'active' else 'onboarding' end where id=p_id;
  else update public.carriers set legal_name=legal_name where id=p_id;end if;
  insert into public.owner_company_reviews(carrier_id,status,notes,reviewed_by) values(p_id,case when p_payload->>'status'='resume' then 'pending' else p_payload->>'status' end,coalesce(p_payload->>'notes',''),auth.uid()) on conflict(carrier_id) do update set status=excluded.status,notes=excluded.notes,reviewed_by=auth.uid(),reviewed_at=now();
  result=jsonb_build_object('id',p_id,'review',p_payload->>'status');
 elsif p_action='document-reminder' then
  select * into doc from public.documents where id=p_id for update;if doc.id is null then raise exception 'Document not found';end if;
  select email into row_email from public.carriers where id=doc.carrier_id and status not in ('paused','cancelled');
  if coalesce(row_email,'')='' then raise exception 'Available company with contact email required';end if;
  if exists(select 1 from public.owner_management_outbox where document_id=p_id and created_at>now()-interval '24 hours' and status<>'cancelled') then raise exception 'A reminder was already queued within 24 hours';end if;
  insert into public.owner_management_outbox(kind,document_id,recipient) values('document-reminder',p_id,row_email);
  insert into public.owner_management_audit(actor_id,actor_role,entity,record_id,operation,after_data) values(auth.uid(),auth.role(),'documents',p_id,'REMINDER_QUEUED',jsonb_build_object('recipient',row_email));
  result=jsonb_build_object('queued',true);
 elsif p_action='document-review' then
  select * into doc from public.documents where id=p_id for update;if doc.id is null then raise exception 'Document not found';end if;
  if p_payload->>'status' not in ('pending','approved','rejected') or p_payload->>'status' is null then raise exception 'Review status required';end if;
  if p_payload->>'status'='rejected' and length(trim(coalesce(p_payload->>'notes','')))<3 then raise exception 'Rejection reason required';end if;
  if nullif(p_payload->>'issued_on','')::date>nullif(p_payload->>'expires_on','')::date then raise exception 'Expiration precedes issue date';end if;
  insert into public.owner_document_reviews(document_id,status,notes,reviewed_by) values(p_id,p_payload->>'status',coalesce(p_payload->>'notes',''),auth.uid()) on conflict(document_id) do update set status=excluded.status,notes=excluded.notes,reviewed_by=auth.uid(),reviewed_at=now();
  update public.documents set issued_on=nullif(p_payload->>'issued_on','')::date,expires_on=nullif(p_payload->>'expires_on','')::date,status=case when p_payload->>'status'='rejected' then 'rejected' when status='rejected' then 'active' else status end where id=p_id returning to_jsonb(documents.*) into result;
 elsif p_action='lead-save' then
  if length(trim(coalesce(p_payload->>'name','')))<2 then raise exception 'Contact name required';end if;
  if p_payload->>'status' not in ('new','called','quoted','lost') or p_payload->>'status' is null then raise exception 'Paid status requires verified payment';end if;
  if p_id is null then
   insert into public.leads(name,company,usdot,phone,email,status,notes,source) values(p_payload->>'name',p_payload->>'company',p_payload->>'usdot',p_payload->>'phone',lower(p_payload->>'email'),p_payload->>'status',p_payload->>'notes','owner-center') returning id into rid;
  else
   select * into lead from public.leads where id=p_id for update;if lead.id is null then raise exception 'Lead not found';end if;if lead.status in ('paid','active') then raise exception 'Paid lead details are managed with its customer account';end if;
   rid=p_id;update public.leads set name=p_payload->>'name',company=p_payload->>'company',usdot=p_payload->>'usdot',phone=p_payload->>'phone',email=lower(p_payload->>'email'),status=p_payload->>'status',notes=p_payload->>'notes' where id=rid;
  end if;
  insert into public.owner_lead_workflow(lead_id,follow_up_at,qualified) values(rid,nullif(p_payload->>'follow_up_at','')::timestamptz,coalesce((p_payload->>'qualified')::boolean,false)) on conflict(lead_id) do update set follow_up_at=excluded.follow_up_at,qualified=excluded.qualified;
  result=jsonb_build_object('id',rid);
 elsif p_action='lead-convert' then
  select * into lead from public.leads where id=p_id for update;
  if lead.id is null or lead.status<>'quoted' or length(coalesce(lead.company,''))<2 or coalesce(lead.email,'')='' or not exists(select 1 from public.owner_lead_workflow where lead_id=p_id and qualified) then raise exception 'Qualified quoted lead with company and email required';end if;
  select carrier_id into rid from public.owner_lead_workflow where lead_id=p_id;
  if rid is null then
   perform pg_advisory_xact_lock(hashtext('owner-company-identity'));
   perform pg_advisory_xact_lock(hashtextextended('sales-company:'||coalesce(nullif(lead.usdot,''),lower(trim(lead.company))),0));
   select id into rid from public.carriers where (nullif(lead.usdot,'') is not null and usdot=lead.usdot) or lower(legal_name)=lower(trim(lead.company)) order by created_at limit 1;
   if rid is null then insert into public.carriers(legal_name,usdot,phone,email,status) values(lead.company,nullif(lead.usdot,''),lead.phone,lead.email,'onboarding') returning id into rid;end if;
   update public.owner_lead_workflow set carrier_id=rid where lead_id=p_id;
   update public.leads set notes=notes where id=p_id;
  end if;
  result=jsonb_build_object('carrier_id',rid,'membership_active',false);
 elsif p_action='invitation-resend' then
  select * into invitation from public.owner_invitation_requests where id=p_id and status='ready' for update;if invitation.id is null then raise exception 'Ready invitation required';end if;
  if not exists(select 1 from public.profiles where id=invitation.user_id and role in ('carrier','driver') and lower(email)=invitation.email) or exists(select 1 from public.owner_user_access where user_id=invitation.user_id and not active) then raise exception 'Invitation account access requires review';end if;
  if exists(select 1 from public.owner_management_outbox where invitation_id=p_id and (lease_until>now() or sent_at>now()-interval '1 minute')) then raise exception 'Invitation delivery is pending or was just accepted';end if;
  update public.owner_management_outbox set status='pending',encrypted_link=null,link_created_at=null,lease_until=null,last_error=null where invitation_id=p_id;
  insert into public.owner_management_audit(actor_id,actor_role,entity,record_id,operation) values(auth.uid(),auth.role(),'owner_invitation_requests',p_id,'INVITATION_RESEND_REQUESTED');result=jsonb_build_object('queued',true);
 elsif p_action='invite-reserve' then
  row_email=lower(trim(p_payload->>'email'));target_company=(p_payload->>'carrier_id')::uuid;target_role=p_payload->>'role';
  if row_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or target_role not in ('carrier','driver') or target_role is null or length(trim(coalesce(p_payload->>'full_name','')))<2 then raise exception 'Valid invitation details required';end if;
  if not exists(select 1 from public.carriers where id=target_company and status not in ('paused','cancelled')) then raise exception 'Available company required';end if;
  if exists(select 1 from auth.users where lower(email)=row_email) then raise exception 'Account already exists. Edit or resend using the existing user record';end if;
  insert into public.owner_invitation_requests(email,full_name,role,carrier_id,created_by) values(row_email,p_payload->>'full_name',target_role,target_company,auth.uid()) returning to_jsonb(owner_invitation_requests.*) into result;
 end if;
 return result;
end $$;
revoke all on function public.owner_management_command(text,uuid,jsonb) from public,anon;
grant execute on function public.owner_management_command(text,uuid,jsonb) to authenticated;

create function public.owner_complete_invitation(p_request uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$ declare r public.owner_invitation_requests;u auth.users;begin
 if auth.role()<>'service_role' then raise exception 'Service required' using errcode='42501';end if;
 select * into r from public.owner_invitation_requests where id=p_request for update;if r.id is null or r.status='cancelled' then raise exception 'Pending owner invitation required';end if;if r.status='ready' then if r.user_id=p_user then return;else raise exception 'Invitation identity mismatch';end if;end if;
 select * into u from auth.users where id=p_user;
 if lower(u.email)<>r.email or u.id is null or u.created_at<r.created_at-interval '5 seconds' then raise exception 'New invitation identity mismatch';end if;
 if not exists(select 1 from public.profiles where id=p_user and role='carrier' and carrier_id is null) then raise exception 'Existing account cannot be overwritten';end if;
 update public.profiles set role=r.role,carrier_id=r.carrier_id,full_name=r.full_name where id=p_user;
 update public.owner_invitation_requests set user_id=p_user,status='ready' where id=p_request;
 insert into public.owner_management_outbox(kind,invitation_id,recipient) values('invitation',p_request,r.email) on conflict(invitation_id) do nothing;
end $$;
revoke all on function public.owner_complete_invitation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.owner_complete_invitation(uuid,uuid) to service_role;

create function public.owner_claim_notifications() returns setof public.owner_management_outbox language plpgsql security definer set search_path='' as $$ begin
 if auth.role()<>'service_role' then raise exception 'Service required' using errcode='42501';end if;
 return query update public.owner_management_outbox set status='processing',attempts=attempts+1,lease_until=now()+interval '3 minutes' where id in(select id from public.owner_management_outbox where status in ('pending','failed','processing') and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 2) returning *;
end $$;
revoke all on function public.owner_claim_notifications() from public,anon,authenticated;
grant execute on function public.owner_claim_notifications() to service_role;
