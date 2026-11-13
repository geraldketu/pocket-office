-- ADDITIVE PREVIEW MIGRATION. Apply only after preview approval and a database backup.
-- Existing profiles, carrier/member policies, prices, and owner permissions are unchanged.
create table public.sales_representatives (
 user_id uuid primary key references auth.users(id),
 name text not null check(length(name) between 2 and 120),
 rep_code text not null unique check(rep_code ~ '^[A-Za-z0-9_-]{2,32}$'),
 email text not null unique,
 status text not null default 'invited' check(status in ('invited','active','suspended','inactive')),
 commission_mode text not null default 'none' check(commission_mode in ('none','percent','flat')),
 commission_value integer not null default 0 check(commission_value between 0 and 1000000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(commission_mode <> 'percent' or commission_value <= 10000)
);
create table public.sales_prospects (
 id uuid primary key default gen_random_uuid(), company_name text not null,
 contact_name text not null default '', usdot text unique, phone text not null default '', email text not null default '',
 city text not null default '', state text not null default '', registration_date date, fleet_size integer check(fleet_size >= 0),
 assigned_to uuid references public.sales_representatives(user_id), assigned_at timestamptz,
 disposition text not null default 'Not Called' check(disposition in ('Not Called','No Answer','Interested','Call Back','Application Sent','Payment Pending','Closed Sale','Not Interested','Do Not Contact')),
 follow_up_at timestamptz, notes text not null default '', revision integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index sales_prospects_assignee on public.sales_prospects(assigned_to,follow_up_at);
create table public.sales_applications (
 id uuid primary key default gen_random_uuid(), prospect_id uuid not null unique references public.sales_prospects(id),
 rep_id uuid not null references public.sales_representatives(user_id),
 details jsonb not null default '{}', plan_key text check(plan_key in ('Basic','Pro','Premium','Ultimate')),
 status text not null default 'draft' check(status in ('draft','submitted','payment_pending','paid','failed','refunded')),
 revision integer not null default 1, completed_at timestamptz, paid_at timestamptz,
 carrier_id uuid references public.carriers(id), customer_user_id uuid references auth.users(id),
 stripe_subscription_id text unique, subscription_status text, initial_revenue_cents integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.sales_checkout_attempts (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.sales_applications(id),
 rep_id uuid not null references public.sales_representatives(user_id),
 plan_key text not null check(plan_key in ('Basic','Pro','Premium','Ultimate')), amount_cents integer not null,
 customer_email text not null, application_revision integer not null,
 commission_mode text not null, commission_value integer not null,
 stripe_session_id text unique, checkout_url text, stripe_price_id text, initial_invoice_id text unique,
 refunded_cents integer not null default 0 check(refunded_cents>=0 and refunded_cents<=amount_cents),
 status text not null default 'preparing' check(status in ('preparing','pending','paid','failed','expired','refunded')),
 created_at timestamptz not null default now(),
 check(amount_cents=case plan_key when 'Basic' then 4999 when 'Pro' then 6999 when 'Premium' then 9999 when 'Ultimate' then 19900 end)
);
create unique index sales_one_open_checkout on public.sales_checkout_attempts(application_id) where status in ('preparing','pending');
create unique index sales_customer_one_membership on public.sales_checkout_attempts(lower(customer_email)) where status in ('preparing','pending','paid');
create table public.sales_commissions (
 id uuid primary key default gen_random_uuid(), application_id uuid not null unique references public.sales_applications(id),
 rep_id uuid not null references public.sales_representatives(user_id), amount_cents integer not null check(amount_cents>=0),
 status text not null default 'earned' check(status in ('earned','approved','voided')),
 approved_by uuid references auth.users(id), approved_at timestamptz, created_at timestamptz not null default now()
);
create table public.sales_resources (
 slug text primary key, title text not null, body text not null check(length(body)<=20000),
 revision integer not null default 0, updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table public.sales_activity (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), prospect_id uuid references public.sales_prospects(id),
 application_id uuid references public.sales_applications(id), action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index sales_activity_actor on public.sales_activity(actor_id,created_at);
create table public.sales_payment_events (
 event_id text primary key, application_id uuid references public.sales_applications(id), event_type text not null, created_at timestamptz not null default now()
);
create table public.sales_outbox (
 id uuid primary key default gen_random_uuid(), dedupe_key text not null unique, application_id uuid references public.sales_applications(id),
 kind text not null check(kind in ('customer-welcome','owner-sale','owner-refund','representative-invite')),
 recipient text not null, status text not null default 'pending' check(status in ('pending','processing','sent','failed','cancelled')),
 attempts integer not null default 0, lease_until timestamptz, sent_at timestamptz, last_error text,
 encrypted_link text, link_created_at timestamptz, created_at timestamptz not null default now()
);
-- The existing designated owner's identity is fixed by the retained owner portal.
-- This predicate grants no new administrator; it mirrors that already audited identity.
create function public.sales_is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid()='d5f443af-ac3a-42b2-8294-6fbf51f73beb'::uuid and exists(
  select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=auth.uid()
  and p.role='admin' and p.carrier_id is null and lower(p.email)='felicialvrg@gmail.com'
  and lower(u.email)=lower(p.email) and u.email_confirmed_at is not null
 );
$$;
create function public.sales_is_active() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sales_representatives r join public.profiles p on p.id=r.user_id
  join auth.users u on u.id=r.user_id where r.user_id=auth.uid() and r.status='active'
  and p.role='carrier' and p.carrier_id is null and lower(r.email)=lower(u.email) and u.email_confirmed_at is not null);
$$;
create function public.sales_owns_prospect(prospect uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.sales_is_active() and exists(select 1 from public.sales_prospects p where p.id=prospect and p.assigned_to=auth.uid());
$$;
create function public.sales_owns_application(application uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sales_applications a where a.id=application and public.sales_owns_prospect(a.prospect_id));
$$;
do $$ declare t text; begin
 foreach t in array array['sales_representatives','sales_prospects','sales_applications','sales_checkout_attempts','sales_commissions','sales_resources','sales_activity','sales_payment_events','sales_outbox'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create policy sales_representatives_read on public.sales_representatives for select using(public.sales_is_owner() or user_id=auth.uid());
create policy sales_prospects_read on public.sales_prospects for select using(public.sales_is_owner() or public.sales_owns_prospect(id));
create policy sales_applications_read on public.sales_applications for select using(public.sales_is_owner() or public.sales_owns_prospect(prospect_id));
create policy sales_checkouts_read on public.sales_checkout_attempts for select using(public.sales_is_owner() or public.sales_owns_application(application_id));
create policy sales_commissions_read on public.sales_commissions for select using(public.sales_is_owner() or (public.sales_is_active() and rep_id=auth.uid()));
create policy sales_resources_read on public.sales_resources for select using(public.sales_is_owner() or public.sales_is_active());
create policy sales_activity_read on public.sales_activity for select using(public.sales_is_owner() or (public.sales_is_active() and actor_id=auth.uid() and (prospect_id is null or public.sales_owns_prospect(prospect_id))));
create policy sales_events_owner on public.sales_payment_events for select using(public.sales_is_owner());
create policy sales_outbox_owner on public.sales_outbox for select using(public.sales_is_owner());
revoke select on public.sales_outbox from authenticated;
grant select(id,application_id,kind,recipient,status,attempts,lease_until,sent_at,last_error,created_at) on public.sales_outbox to authenticated;

create function public.sales_command(p_action text,p_id uuid default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 owner boolean:=public.sales_is_owner(); actor uuid:=auth.uid(); pr public.sales_prospects; app public.sales_applications;
 rep public.sales_representatives; attempt public.sales_checkout_attempts; item jsonb; result jsonb; n integer:=0; did integer:=0;
 plan text; amount integer; d jsonb;
begin
 if actor is null or (not owner and not public.sales_is_active()) then raise exception 'Sales access denied' using errcode='42501'; end if;
 if not owner then
  perform 1 from public.sales_representatives where user_id=actor for share;
  if not public.sales_is_active() then raise exception 'Sales access denied' using errcode='42501';end if;
 end if;
 if octet_length(p_payload::text)>2000000 then raise exception 'Request too large'; end if;
 if p_action='register-rep' then
  if not owner then raise exception 'Owner required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_id and p.role='carrier' and p.carrier_id is null and lower(u.email)=lower(p_payload->>'email')) then raise exception 'Existing account has conflicting permissions'; end if;
  insert into public.sales_representatives(user_id,name,rep_code,email) values(p_id,p_payload->>'name',p_payload->>'rep_code',lower(p_payload->>'email')) returning to_jsonb(sales_representatives.*) into result;
  insert into public.sales_outbox(dedupe_key,kind,recipient) values('rep-invite:'||p_id,'representative-invite',lower(p_payload->>'email'));
 elsif p_action='rep-update' then
  if not owner then raise exception 'Owner required' using errcode='42501'; end if;
  update public.sales_representatives set status=p_payload->>'status',commission_mode=p_payload->>'commission_mode',commission_value=(p_payload->>'commission_value')::integer,updated_at=now() where user_id=p_id returning to_jsonb(sales_representatives.*) into result;
  if result is null then raise exception 'Representative not found'; end if;
 elsif p_action='import' then
  if not owner then raise exception 'Owner required' using errcode='42501'; end if;
  if jsonb_typeof(p_payload->'rows')<>'array' or jsonb_array_length(p_payload->'rows')>1000 then raise exception 'Import up to 1000 prospects per batch'; end if;
  for item in select * from jsonb_array_elements(p_payload->'rows') loop
   if length(item->>'company_name') not between 1 and 200 or coalesce(item->>'usdot','') !~ '^[0-9]{1,8}$' then raise exception 'Company and valid USDOT required'; end if;
   insert into public.sales_prospects(company_name,contact_name,usdot,phone,email,city,state,registration_date,fleet_size,notes)
   values(item->>'company_name',left(coalesce(item->>'contact_name',''),120),item->>'usdot',left(coalesce(item->>'phone',''),50),lower(left(coalesce(item->>'email',''),254)),left(coalesce(item->>'city',''),100),left(coalesce(item->>'state',''),2),nullif(item->>'registration_date','')::date,nullif(item->>'fleet_size','')::integer,left(coalesce(item->>'notes',''),4000)) on conflict(usdot) do nothing;
   get diagnostics did=row_count; n:=n+did;
  end loop;
  result:=jsonb_build_object('imported',n,'duplicates',jsonb_array_length(p_payload->'rows')-n);
 elsif p_action='assign' then
  if not owner then raise exception 'Owner required' using errcode='42501'; end if;
  if p_payload->>'rep_id' is not null and not exists(select 1 from public.sales_representatives where user_id=(p_payload->>'rep_id')::uuid and status='active') then raise exception 'Assign an active representative'; end if;
  update public.sales_prospects set assigned_to=(p_payload->>'rep_id')::uuid,assigned_at=now(),revision=revision+1,updated_at=now() where id=p_id returning * into pr;
  if pr.id is null then raise exception 'Prospect not found'; end if; result:=to_jsonb(pr);
 elsif p_action in ('call','save-application','checkout-reserve','checkout-email') then
  select * into pr from public.sales_prospects where id=p_id for update;
  if pr.id is null or (not owner and pr.assigned_to<>actor) or (not owner and pr.assigned_to is null) then raise exception 'Assigned prospect required' using errcode='42501'; end if;
  if pr.disposition='Do Not Contact' then raise exception 'Do Not Contact: outbound activity and enrollment are blocked'; end if;
  if p_action='checkout-email' then
   if not exists(select 1 from public.sales_applications a join public.sales_checkout_attempts c on c.application_id=a.id where a.prospect_id=pr.id and c.status='pending') then raise exception 'Pending checkout required'; end if;
   if exists(select 1 from public.sales_activity where actor_id=actor and prospect_id=pr.id and action='checkout-email' and created_at>now()-interval '1 minute') then raise exception 'Wait a minute before resending this payment email';end if;
   result:=jsonb_build_object('approved',true);
  elsif p_action='call' then
   if p_payload->>'revision' is null or pr.revision<>(p_payload->>'revision')::integer then raise exception 'This prospect changed; reload before saving'; end if;
   if p_payload->>'disposition'='Call Back' and nullif(p_payload->>'follow_up_at','') is null then raise exception 'Callback requires a follow-up date';end if;
   if p_payload->>'disposition'='Closed Sale' and not exists(select 1 from public.sales_applications where prospect_id=pr.id and status='paid') then raise exception 'Only verified payment can close a sale'; end if;
   if p_payload->>'disposition'='Payment Pending' and not exists(select 1 from public.sales_applications where prospect_id=pr.id and status='payment_pending') then raise exception 'Generate a secure checkout before marking payment pending'; end if;
   if length(coalesce(p_payload->>'notes',''))>4000 then raise exception 'Notes too long'; end if;
   update public.sales_prospects set disposition=p_payload->>'disposition',notes=coalesce(p_payload->>'notes',''),follow_up_at=(p_payload->>'follow_up_at')::timestamptz,revision=revision+1,updated_at=now() where id=pr.id returning to_jsonb(sales_prospects.*) into result;
  else
   if pr.assigned_to is null then raise exception 'Assign an active representative first'; end if;
   select * into rep from public.sales_representatives where user_id=pr.assigned_to and status='active' for share; if rep.user_id is null then raise exception 'Representative is not active'; end if;
   select * into app from public.sales_applications where prospect_id=pr.id for update;
   if p_action='save-application' then
    if app.status in ('paid','refunded','payment_pending') or exists(select 1 from public.sales_checkout_attempts where application_id=app.id and status='preparing') then raise exception 'Application is locked by its checkout or completed sale'; end if;
    if app.id is not null and app.revision<>coalesce((p_payload->>'revision')::integer,0) then raise exception 'Application changed; reload before saving'; end if;
    d:=p_payload->'details';plan:=p_payload->>'plan_key';
    if jsonb_typeof(d)<>'object' or length(d::text)>20000 or plan is null or plan not in ('Basic','Pro','Premium','Ultimate') then raise exception 'Invalid application'; end if;
    if (nullif(d->>'usdot','') is not null and d->>'usdot' !~ '^[0-9]{1,8}$') or (nullif(d->>'mc','') is not null and d->>'mc' !~ '^[0-9]{1,12}$') then raise exception 'Invalid USDOT or MC number';end if;
    if (p_payload->>'complete')::boolean and (length(coalesce(d->>'legal_name',''))<2 or coalesce(d->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(coalesce(d->>'contact_name',''))<2 or length(coalesce(d->>'phone',''))<7 or length(coalesce(d->>'address',''))<5 or length(coalesce(d->>'equipment_type',''))<2 or coalesce(d->>'drivers','') !~ '^[0-9]{1,5}$' or jsonb_typeof(d->'services')<>'array' or jsonb_array_length(d->'services')=0) then raise exception 'Complete customer contact, address, equipment, drivers and services first'; end if;
    insert into public.sales_applications(prospect_id,rep_id,details,plan_key,status,completed_at) values(pr.id,pr.assigned_to,d,plan,case when (p_payload->>'complete')::boolean then 'submitted' else 'draft' end,case when (p_payload->>'complete')::boolean then now() end)
    on conflict(prospect_id) do update set details=excluded.details,plan_key=excluded.plan_key,rep_id=excluded.rep_id,status=excluded.status,completed_at=excluded.completed_at,revision=sales_applications.revision+1,updated_at=now() returning * into app;
    if app.status='submitted' then update public.sales_prospects set disposition='Application Sent',revision=revision+1 where id=pr.id; end if;
    result:=to_jsonb(app);
   else
    if app.id is null or app.status not in ('submitted','payment_pending') then raise exception 'Complete the application before requesting payment'; end if;
    select * into attempt from public.sales_checkout_attempts where application_id=app.id and status in ('preparing','pending') for update;
    if attempt.id is null then
     amount:=case app.plan_key when 'Basic' then 4999 when 'Pro' then 6999 when 'Premium' then 9999 when 'Ultimate' then 19900 end;
     insert into public.sales_checkout_attempts(application_id,rep_id,plan_key,amount_cents,customer_email,application_revision,commission_mode,commission_value)
     values(app.id,pr.assigned_to,app.plan_key,amount,lower(app.details->>'email'),app.revision,rep.commission_mode,rep.commission_value) returning * into attempt;
    end if;result:=to_jsonb(attempt);
   end if;
  end if;
 elsif p_action='resource-save' then
  if not owner then raise exception 'Owner required' using errcode='42501'; end if;
  update public.sales_resources set title=left(p_payload->>'title',150),body=p_payload->>'body',revision=revision+1,updated_by=actor,updated_at=now() where slug=p_payload->>'slug' and revision=(p_payload->>'revision')::integer returning to_jsonb(sales_resources.*) into result;
  if result is null then raise exception 'Resource changed; reload before saving'; end if;
 elsif p_action='commission-approve' then
  if not owner then raise exception 'Owner required' using errcode='42501'; end if;
  update public.sales_commissions set status='approved',approved_by=actor,approved_at=now() where id=p_id and status='earned' returning to_jsonb(sales_commissions.*) into result;
  if result is null then raise exception 'Only an earned commission can be approved'; end if;
 else raise exception 'Unknown sales action'; end if;
 insert into public.sales_activity(actor_id,prospect_id,application_id,action,details) values(actor,pr.id,app.id,p_action,
  case when p_action='import' then result
   when p_action='call' then jsonb_build_object('disposition',p_payload->>'disposition','notes',p_payload->>'notes','follow_up_at',p_payload->>'follow_up_at')
   when p_action='save-application' then jsonb_build_object('revision',app.revision,'status',app.status,'plan',app.plan_key,'changed_fields',(select jsonb_agg(k) from jsonb_object_keys(d) k))
   when p_action='assign' then jsonb_build_object('record_id',p_id,'assigned_to',pr.assigned_to,'revision',pr.revision)
   when p_action='rep-update' then jsonb_build_object('record_id',p_id,'status',result->>'status','commission_mode',result->>'commission_mode','commission_value',result->'commission_value')
   when p_action='resource-save' then jsonb_build_object('slug',p_payload->>'slug','revision',result->'revision')
   when p_action='checkout-reserve' then jsonb_build_object('attempt_id',result->>'id')
   else jsonb_build_object('record_id',p_id) end);
 return result;
end $$;
revoke all on function public.sales_command(text,uuid,jsonb) from public,anon;
grant execute on function public.sales_command(text,uuid,jsonb) to authenticated;

create function public.sales_record_checkout(p_attempt uuid,p_session text,p_url text,p_price text,p_failed boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare a public.sales_checkout_attempts;
begin
 if auth.role()<>'service_role' then raise exception 'Service required' using errcode='42501'; end if;
 select * into a from public.sales_checkout_attempts where id=p_attempt for update;
 if a.id is null or a.status not in ('preparing','pending') then raise exception 'Checkout reservation unavailable'; end if;
 if p_failed then update public.sales_checkout_attempts set status='failed' where id=a.id;return;end if;
 if p_session !~ '^cs_[A-Za-z0-9_]+' or p_url !~ '^https://checkout\.stripe\.com/' or p_price !~ '^price_' or (a.stripe_session_id is not null and a.stripe_session_id<>p_session) then raise exception 'Invalid Stripe checkout'; end if;
 update public.sales_checkout_attempts set stripe_session_id=p_session,checkout_url=p_url,stripe_price_id=p_price,status='pending' where id=a.id;
 update public.sales_applications set status='payment_pending',updated_at=now() where id=a.application_id;
 update public.sales_prospects set disposition='Payment Pending',revision=revision+1 where id=(select prospect_id from public.sales_applications where id=a.application_id);
 insert into public.sales_activity(application_id,action,details) values(a.application_id,'checkout.created',jsonb_build_object('attempt_id',a.id));
end $$;

create function public.sales_fulfill(p_event text,p_type text,p_attempt uuid,p_session text,p_user uuid,p_email text,p_amount integer,p_currency text,p_subscription text,p_invoice text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.sales_checkout_attempts;app public.sales_applications;pr public.sales_prospects;prof public.profiles;carrier uuid;earned integer;
begin
 if auth.role()<>'service_role' then raise exception 'Service required' using errcode='42501'; end if;
 select * into a from public.sales_checkout_attempts where id=p_attempt for update;
 if a.id is null or a.stripe_session_id<>p_session or a.amount_cents<>p_amount or p_currency<>'usd' or a.customer_email<>lower(p_email) or p_subscription !~ '^sub_' then raise exception 'Payment does not match reserved checkout'; end if;
 select * into app from public.sales_applications where id=a.application_id for update;
 if app.status='paid' then return app.carrier_id;end if;
 if a.status<>'pending' or app.revision<>a.application_revision or app.status<>'payment_pending' then raise exception 'Stale payment; owner review required'; end if;
 select * into pr from public.sales_prospects where id=app.prospect_id for update;
 select * into prof from public.profiles where id=p_user for update;
 perform pg_advisory_xact_lock(hashtextextended('sales-company:'||coalesce(nullif(app.details->>'usdot',''),lower(app.details->>'legal_name')),0));
 if prof.id is null or prof.role<>'carrier' or lower(prof.email)<>lower(p_email) then raise exception 'Conflicting customer identity'; end if;
 if prof.carrier_id is not null then
  if not exists(select 1 from public.carriers c where c.id=prof.carrier_id and ((nullif(app.details->>'usdot','') is not null and c.usdot=app.details->>'usdot') or (nullif(app.details->>'usdot','') is null and lower(c.legal_name)=lower(app.details->>'legal_name')))) then raise exception 'Account belongs to another company';end if;carrier:=prof.carrier_id;
 else
  if nullif(app.details->>'usdot','') is not null and exists(select 1 from public.carriers where usdot=app.details->>'usdot') then raise exception 'Existing company requires owner account-link review'; end if;
  insert into public.carriers(legal_name,dba,usdot,mc,phone,email,address,tier,status)
  values(app.details->>'legal_name',nullif(app.details->>'dba',''),nullif(app.details->>'usdot',''),nullif(app.details->>'mc',''),app.details->>'phone',lower(p_email),app.details->>'address',a.plan_key,'active') returning id into carrier;
  update public.profiles set carrier_id=carrier where id=p_user and carrier_id is null;
 end if;
 update public.carriers set tier=a.plan_key,status='active' where id=carrier;
 update public.sales_applications set status='paid',carrier_id=carrier,customer_user_id=p_user,stripe_subscription_id=p_subscription,subscription_status='active',initial_revenue_cents=p_amount,paid_at=now(),updated_at=now() where id=app.id;
 update public.sales_checkout_attempts set status='paid',initial_invoice_id=p_invoice where id=a.id;
 update public.sales_prospects set disposition=case when disposition='Do Not Contact' then disposition else 'Closed Sale' end,revision=revision+1 where id=app.prospect_id;
 insert into public.payments(carrier_id,amount,tier,description,stripe_id) values(carrier,p_amount/100.0,a.plan_key,'Sales-assisted initial membership payment',p_session);
 earned:=case a.commission_mode when 'percent' then round(p_amount::numeric*a.commission_value/10000)::integer when 'flat' then a.commission_value else 0 end;
 if a.commission_mode<>'none' then insert into public.sales_commissions(application_id,rep_id,amount_cents) values(app.id,a.rep_id,earned);end if;
 insert into public.sales_payment_events(event_id,application_id,event_type) values(p_event,app.id,p_type) on conflict do nothing;
 insert into public.sales_outbox(dedupe_key,application_id,kind,recipient) values('welcome:'||app.id,app.id,'customer-welcome',lower(p_email)),('owner-sale:'||app.id,app.id,'owner-sale','felicialvrg@gmail.com') on conflict do nothing;
 insert into public.sales_activity(application_id,prospect_id,action,details) values(app.id,app.prospect_id,'payment.verified',jsonb_build_object('amount_cents',p_amount,'rep_id',a.rep_id));
 return carrier;
end $$;

create function public.sales_payment_state(p_event text,p_type text,p_session text,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare a public.sales_checkout_attempts;
begin
 if auth.role()<>'service_role' then raise exception 'Service required' using errcode='42501';end if;
 select * into a from public.sales_checkout_attempts where stripe_session_id=p_session for update;
 if a.id is null or a.status in ('paid','refunded') then return;end if;
 if p_status not in ('expired','failed') then raise exception 'Invalid state';end if;
 update public.sales_checkout_attempts set status=p_status where id=a.id;
 update public.sales_applications set status=case when p_status='expired' then 'submitted' else 'failed' end where id=a.application_id and status<>'paid';
 insert into public.sales_payment_events(event_id,application_id,event_type) values(p_event,a.application_id,p_type) on conflict do nothing;
 insert into public.sales_activity(application_id,action,details) values(a.application_id,'payment.'||p_status,'{}');
end $$;
create function public.sales_claim_outbox(p_limit integer default 10) returns setof public.sales_outbox language plpgsql security definer set search_path='' as $$
begin
 if auth.role()<>'service_role' then raise exception 'Service required' using errcode='42501';end if;
 return query with candidates as(select id from public.sales_outbox where status in ('pending','failed','processing') and (lease_until is null or lease_until<now()) and attempts<10 order by created_at for update skip locked limit least(greatest(p_limit,1),20))
 update public.sales_outbox o set status='processing',attempts=attempts+1,lease_until=now()+interval '10 minutes' from candidates c where o.id=c.id returning o.*;
end $$;
do $$ declare sig text; begin
 foreach sig in array array['sales_record_checkout(uuid,text,text,text,boolean)','sales_fulfill(text,text,uuid,text,uuid,text,integer,text,text,text)','sales_payment_state(text,text,text,text)','sales_claim_outbox(integer)'] loop
  execute 'revoke all on function public.'||sig||' from public,anon,authenticated';
  execute 'grant execute on function public.'||sig||' to service_role';
 end loop;
end $$;
create function public.sales_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_day timestamptz:=date_trunc('day',now() at time zone 'America/New_York') at time zone 'America/New_York';u uuid:=auth.uid();
begin
 if not public.sales_is_active() then raise exception 'Active representative required' using errcode='42501';end if;
 return jsonb_build_object(
 'callsToday',(select count(*) from public.sales_activity where actor_id=u and action='call' and created_at>=start_day),
 'assignedToday',(select count(*) from public.sales_prospects where assigned_to=u and assigned_at>=start_day),
 'followUpsDue',(select count(*) from public.sales_prospects where assigned_to=u and follow_up_at<=now() and disposition not in ('Do Not Contact','Closed Sale','Not Interested')),
 'applicationsCompleted',(select count(*) from public.sales_applications where rep_id=u and completed_at is not null),
 'pendingPayments',(select count(*) from public.sales_applications where rep_id=u and status='payment_pending'),
 'completedSales',(select count(*) from public.sales_applications where rep_id=u and status='paid'),
 'revenueCents',(select coalesce(sum(initial_revenue_cents),0) from public.sales_applications where rep_id=u and status='paid'),
 'commissionCents',(select coalesce(sum(amount_cents),0) from public.sales_commissions where rep_id=u and status in ('earned','approved')),
 'commissionConfigured',(select commission_mode<>'none' from public.sales_representatives where user_id=u)
 );
end $$;
revoke all on function public.sales_metrics() from public,anon;grant execute on function public.sales_metrics() to authenticated;

insert into public.sales_resources(slug,title,body) values
 ('introduction','OliverFe 360 introduction','Hello, my name is [name] with OliverFe 360, Your Office in Your Pocket. Is this a good time to ask about your business administrative needs? If not, ask permission for a follow-up. Honor Do Not Contact requests immediately.'),
 ('benefits','Benefits and membership','Discuss business organization, compliance support, document management, financial tracking, resources and networking at a general level. Confirm the scope with the office. Use only the approved prices shown in Sales Resources. Never promise a government approval or invent plan inclusions.'),
 ('new-carrier','New carrier onboarding','Ask about the legal business name, contact details, USDOT/MC status, business address, equipment, drivers and requested services. Save unfinished applications. Explain that government and third-party fees are separate from monthly membership.'),
 ('objections','Common objections','I need to think: Ask what information would help and agree on a follow-up time. I have an office: Ask where additional administrative support might be useful. Too expensive: Review the approved plan prices without discounts or guarantees. Not interested: Thank the prospect and respect their decision.'),
 ('closing','Closing script','Confirm the selected monthly membership and customer email. Explain recurring billing and the selected plan amount. Send a Stripe-hosted payment link so the customer enters their own card information. Never ask for card numbers or mark a sale paid yourself.'),
 ('follow-up','Follow-up email templates','Subject: Your OliverFe 360 membership conversation\nHello [contact], thank you for speaking with [representative]. We discussed [approved plan/services]. Please reply with questions, or use the secure Stripe link you requested. Monthly membership and government/third-party fees are separate. If you prefer no further contact, let us know.');

create function public.sales_management_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.sales_is_owner() then raise exception 'Owner required' using errcode='42501';end if;
 return jsonb_build_object('completedSales',(select count(*) from public.sales_applications where status='paid'),
 'revenueCents',(select coalesce(sum(initial_revenue_cents),0) from public.sales_applications where status='paid'),
 'pendingPayments',(select count(*) from public.sales_applications where status='payment_pending'),
 'applicationsCompleted',(select count(*) from public.sales_applications where completed_at is not null),
 'commissionCents',(select coalesce(sum(amount_cents),0) from public.sales_commissions where status in ('earned','approved')),
 'followUpsDue',(select count(*) from public.sales_prospects where follow_up_at<=now() and disposition not in ('Do Not Contact','Closed Sale','Not Interested')),
 'callsToday',(select count(*) from public.sales_activity where action='call' and created_at>=date_trunc('day',now() at time zone 'America/New_York') at time zone 'America/New_York'),
 'assignedToday',(select count(*) from public.sales_prospects where assigned_at>=date_trunc('day',now() at time zone 'America/New_York') at time zone 'America/New_York'));
end $$;
revoke all on function public.sales_management_metrics() from public,anon;grant execute on function public.sales_management_metrics() to authenticated;

create function public.sales_refund(p_event text,p_invoice text,p_refunded_total integer) returns void language plpgsql security definer set search_path='' as $$
declare a public.sales_checkout_attempts;app public.sales_applications;delta integer;net integer;earned integer;
begin
 if auth.role()<>'service_role' then raise exception 'Service required' using errcode='42501';end if;
 select * into a from public.sales_checkout_attempts where initial_invoice_id=p_invoice for update;
 if a.id is null then return;end if;
 if p_refunded_total<0 or p_refunded_total>a.amount_cents then raise exception 'Refund amount does not match the initial invoice';end if;
 if p_refunded_total<=a.refunded_cents then return;end if;
 select * into app from public.sales_applications where id=a.application_id for update;
 delta:=p_refunded_total-a.refunded_cents;net:=a.amount_cents-p_refunded_total;
 update public.sales_checkout_attempts set refunded_cents=p_refunded_total,status=case when net=0 then 'refunded' else 'paid' end where id=a.id;
 update public.sales_applications set initial_revenue_cents=net,status=case when net=0 then 'refunded' else 'paid' end,updated_at=now() where id=app.id;
 insert into public.payments(carrier_id,amount,tier,description,stripe_id) values(app.carrier_id,-delta/100.0,a.plan_key,'Verified sales membership refund',p_event);
 earned:=case when net=0 then 0 when a.commission_mode='percent' then round(net::numeric*a.commission_value/10000)::integer when a.commission_mode='flat' then a.commission_value else 0 end;
 update public.sales_commissions set amount_cents=earned,status=case when net=0 then 'voided' else 'earned' end,approved_by=null,approved_at=null where application_id=app.id;
 if net=0 then
  update public.carriers set status='paused' where id=app.carrier_id and not exists(select 1 from public.sales_applications where carrier_id=app.carrier_id and id<>app.id and status='paid' and subscription_status='active');
  update public.sales_outbox set status='cancelled',lease_until=null where application_id=app.id and kind='customer-welcome' and status<>'sent';
 end if;
 insert into public.sales_payment_events(event_id,application_id,event_type) values(p_event,app.id,'charge.refunded') on conflict do nothing;
 insert into public.sales_activity(application_id,prospect_id,action,details) values(app.id,app.prospect_id,'payment.refunded',jsonb_build_object('refunded_total_cents',p_refunded_total,'net_initial_revenue_cents',net));
 insert into public.sales_outbox(dedupe_key,application_id,kind,recipient) values('refund:'||p_event,app.id,'owner-refund','felicialvrg@gmail.com') on conflict do nothing;
end $$;
create function public.sales_subscription_state(p_event text,p_subscription text,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare app public.sales_applications;
begin
 if auth.role()<>'service_role' then raise exception 'Service required' using errcode='42501';end if;
 select * into app from public.sales_applications where stripe_subscription_id=p_subscription for update;if app.id is null then return;end if;
 if exists(select 1 from public.sales_payment_events where event_id=p_event) then return;end if;
 if p_status not in ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused') then raise exception 'Unknown subscription status';end if;
 update public.sales_applications set subscription_status=p_status where id=app.id;
 if app.status='paid' then update public.carriers set status=case when p_status='active' then 'active' else 'paused' end where id=app.carrier_id;end if;
 insert into public.sales_payment_events(event_id,application_id,event_type) values(p_event,app.id,'subscription.'||p_status) on conflict do nothing;
 insert into public.sales_activity(application_id,action,details) values(app.id,'subscription.verified',jsonb_build_object('status',p_status));
end $$;
revoke all on function public.sales_refund(text,text,integer),public.sales_subscription_state(text,text,text) from public,anon,authenticated;
grant execute on function public.sales_refund(text,text,integer),public.sales_subscription_state(text,text,text) to service_role;
