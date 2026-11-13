-- Reuse the existing prospects, applications, checkout, fulfillment and notification systems.
alter table public.sales_applications alter column rep_id drop not null,add column owner_origin boolean not null default false;
alter table public.sales_applications add constraint sales_application_identity check(rep_id is not null or owner_origin);
alter table public.sales_checkout_attempts alter column rep_id drop not null;
create table public.sales_enrollment_quotes(id uuid primary key default gen_random_uuid(),application_id uuid not null references public.sales_applications(id),application_revision integer not null,lines jsonb not null,amount_cents integer not null,monthly_cents integer not null,status text not null default 'pending' check(status in ('pending','approved','rejected')),owner_notes text not null default '',approved_by uuid references auth.users(id),approved_at timestamptz,created_at timestamptz not null default now(),unique(application_id,application_revision));
alter table public.sales_enrollment_quotes enable row level security;
revoke all on public.sales_enrollment_quotes from anon,authenticated;grant select on public.sales_enrollment_quotes to authenticated;grant all on public.sales_enrollment_quotes to service_role;
create policy sales_quotes_read on public.sales_enrollment_quotes for select to authenticated using(public.owner_account_enabled() and (public.sales_is_owner() or public.sales_owns_application(application_id)));
create trigger owner_quote_audit after insert or update on public.sales_enrollment_quotes for each row execute function public.owner_audit_management();
alter table public.sales_checkout_attempts add column quote_id uuid references public.sales_enrollment_quotes(id),add column monthly_cents integer;
update public.sales_checkout_attempts set monthly_cents=amount_cents;alter table public.sales_checkout_attempts alter column monthly_cents set not null;
do $$declare c record;n integer=0;begin for c in select conname from pg_constraint where conrelid='public.sales_checkout_attempts'::regclass and contype='c' and pg_get_constraintdef(oid) like '%CASE%plan_key%' loop execute format('alter table public.sales_checkout_attempts drop constraint %I',c.conname);n=n+1;end loop;if n<>1 then raise exception 'Approved-price constraint could not be identified safely';end if;end $$;
alter table public.sales_checkout_attempts add constraint sales_quoted_amount check(monthly_cents=case plan_key when 'Basic' then 4999 when 'Pro' then 6999 when 'Premium' then 9999 when 'Ultimate' then 19900 end and amount_cents>=monthly_cents and amount_cents<=10000000 and (quote_id is not null or amount_cents=monthly_cents));

alter function public.sales_command(text,uuid,jsonb) rename to sales_command_v2;
revoke all on function public.sales_command_v2(text,uuid,jsonb) from public,anon,authenticated;
create function public.sales_command(p_action text,p_id uuid default null,p_payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare app public.sales_applications;pr public.sales_prospects;q public.sales_enrollment_quotes;a public.sales_checkout_attempts;r public.sales_representatives;d jsonb;resolved_lines jsonb;line jsonb;resolution jsonb;service text;price integer;quantity integer;total integer;monthly integer;rid uuid;plan text;
begin
 if not public.owner_account_enabled() or not(public.sales_is_owner() or public.sales_is_active()) then raise exception 'Active salesperson or owner required' using errcode='42501';end if;
 if p_action='owner-enrollment' then
  if not public.sales_is_owner() then raise exception 'Owner required' using errcode='42501';end if;d=p_payload->'details';plan=p_payload->>'plan_key';
  if plan not in ('Basic','Pro','Premium','Ultimate') or plan is null or jsonb_typeof(d)<>'object' or length(d::text)>20000 or length(coalesce(d->>'legal_name',''))<2 then raise exception 'Valid business application required';end if;
  if coalesce((p_payload->>'complete')::boolean,false) and (coalesce(d->>'email','')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(coalesce(d->>'contact_name',''))<2 or length(coalesce(d->>'phone',''))<7 or length(coalesce(d->>'address',''))<5 or length(coalesce(d->>'equipment_type',''))<2 or coalesce(d->>'drivers','')!~'^[0-9]{1,5}$' or jsonb_array_length(d->'services')<1) then raise exception 'Complete company, contact, equipment and services first';end if;
  if p_id is null then
   if nullif(d->>'usdot','') is not null and exists(select 1 from public.sales_prospects where usdot=d->>'usdot') then raise exception 'Existing prospect found. Resume its existing application';end if;
   insert into public.sales_prospects(company_name,contact_name,usdot,phone,email,notes) values(d->>'legal_name',d->>'contact_name',nullif(d->>'usdot',''),d->>'phone',d->>'email','Owner-assisted inbound enrollment') returning * into pr;
  else select * into pr from public.sales_prospects where id=p_id for update;if pr.id is null then raise exception 'Prospect required';end if;end if;
  select * into app from public.sales_applications where prospect_id=pr.id for update;
  if app.id is not null and (not app.owner_origin or app.status in ('paid','refunded','payment_pending') or app.revision<>coalesce((p_payload->>'revision')::integer,-1)) then raise exception 'Application is changed or locked';end if;
  if app.id is not null and exists(select 1 from public.sales_checkout_attempts where application_id=app.id and status='preparing') then raise exception 'Checkout is preparing; application is locked';end if;
  insert into public.sales_applications(prospect_id,rep_id,owner_origin,details,plan_key,status,completed_at) values(pr.id,null,true,d,plan,case when (p_payload->>'complete')::boolean then 'submitted' else 'draft' end,case when (p_payload->>'complete')::boolean then now() end) on conflict(prospect_id) do update set details=excluded.details,plan_key=excluded.plan_key,status=excluded.status,completed_at=excluded.completed_at,revision=sales_applications.revision+1 returning * into app;
  insert into public.sales_activity(actor_id,prospect_id,application_id,action) values(auth.uid(),pr.id,app.id,'owner.application-saved');return to_jsonb(app);
 elsif p_action in ('quote-create','quote-approve','quote-reject','checkout-reserve') then
  if p_action='checkout-reserve' then select * into pr from public.sales_prospects where id=p_id for update;select * into app from public.sales_applications where prospect_id=p_id for update;
  else select * into app from public.sales_applications where id=p_id for update;select * into pr from public.sales_prospects where id=app.prospect_id for update;end if;
  if app.id is null or not(public.sales_is_owner() or (public.sales_is_active() and pr.assigned_to=auth.uid())) then raise exception 'Assigned application required' using errcode='42501';end if;
  if pr.disposition='Do Not Contact' or exists(select 1 from public.sales_internal_dnc where phone=public.sales_normalize_phone(pr.phone)) then raise exception 'Customer opted out. Owner review required';end if;
  if app.status not in ('submitted','payment_pending') then raise exception 'Submit the completed application first';end if;
  select * into q from public.sales_enrollment_quotes where application_id=app.id and application_revision=app.revision for update;
  monthly=case app.plan_key when 'Basic' then 4999 when 'Pro' then 6999 when 'Premium' then 9999 when 'Ultimate' then 19900 end;
  if p_action='quote-create' then
   if q.id is not null then return to_jsonb(q);end if;resolved_lines=jsonb_build_array(jsonb_build_object('key','membership','description',app.plan_key||' monthly membership','kind','membership','quantity',1,'unit_cents',monthly,'source','Existing approved membership price'));
   rid=app.id;total=monthly;quantity=0;
   for service in select jsonb_array_elements_text(app.details->'services') loop
    quantity=quantity+1;if quantity>20 then raise exception 'Too many requested services';end if;price=case when service='Driver qualification files' then 9999 when service='USDOT registration assistance' then case when app.details->'services' ? 'Startup bundle' then 0 else 2500 end when service in ('UCR filing assistance','IFTA setup assistance') then 0 when service='Startup bundle' then 125000 else null end;
    if service='Driver qualification files' and (app.details->>'drivers')::integer<1 then raise exception 'Record the driver quantity before quoting DQF preparation';end if;
    resolved_lines=resolved_lines||jsonb_build_array(jsonb_build_object('key','service-'||quantity,'description',service,'kind','service','quantity',case when price=9999 then greatest(1,(app.details->>'drivers')::integer) else 1 end,'unit_cents',price,'source',case when price=9999 then 'Existing DQF preparation price, per driver' when price is not null then 'Existing production service fee; scope and outside fees require owner review' else 'Owner scope and fee confirmation required' end));
    total=total+coalesce(price*case when price=9999 then greatest(1,(app.details->>'drivers')::integer) else 1 end,0);
   end loop;
   resolved_lines=resolved_lines||jsonb_build_array(jsonb_build_object('key','outside-fees','description','Government / third-party fees: verify applicability','kind','outside','quantity',1,'unit_cents',null,'source','Pending verification; not assumed zero'));
   insert into public.sales_enrollment_quotes(application_id,application_revision,lines,amount_cents,monthly_cents) values(app.id,app.revision,resolved_lines,total,monthly) returning * into q;
   insert into public.sales_activity(actor_id,application_id,action,details) values(auth.uid(),app.id,'quote.created',jsonb_build_object('quote_id',q.id));return to_jsonb(q);
  elsif p_action in ('quote-approve','quote-reject') then
   if not public.sales_is_owner() then raise exception 'Owner required' using errcode='42501';end if;if q.id is null then raise exception 'Generate the current quote first';end if;
   if app.status='payment_pending' or exists(select 1 from public.sales_checkout_attempts where application_id=app.id and status in ('preparing','pending')) then raise exception 'Checkout locks the quote';end if;
   if q.status<>'pending' then raise exception 'Reviewed quotes are immutable. Save a new application revision to requote';end if;
   if length(trim(coalesce(p_payload->>'notes','')))<3 then raise exception 'Owner review notes required';end if;
   if p_action='quote-reject' then update public.sales_enrollment_quotes set status='rejected',owner_notes=p_payload->>'notes',approved_by=auth.uid(),approved_at=now() where id=q.id returning * into q;return to_jsonb(q);end if;
   resolved_lines='[]';total=0;for line in select jsonb_array_elements(q.lines) loop
    if line->>'unit_cents' is null then resolution=p_payload->'resolutions'->(line->>'key');price=(resolution->>'cents')::integer;if price is null or price<0 or price>10000000 then raise exception 'Resolve every unpriced service and outside fee';end if;
     if line->>'kind'='outside' and price>0 and (coalesce(resolution->>'source','')!~'^https://' or coalesce(resolution->>'verified_on','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then raise exception 'Outside fees need a verified source and date';end if;
     if line->>'kind'='outside' and price>0 and (resolution->>'verified_on')::date>current_date then raise exception 'Outside fee verification cannot be in the future';end if;
     line=jsonb_set(line,'{unit_cents}',to_jsonb(price))||jsonb_build_object('source',coalesce(resolution->>'source','Owner confirmed scope / no applicable outside fee'),'verified_on',resolution->>'verified_on');
    end if;total=total+(line->>'unit_cents')::integer*(line->>'quantity')::integer;resolved_lines=resolved_lines||jsonb_build_array(line);
   end loop;if total>10000000 then raise exception 'Quote exceeds checkout limit';end if;
   if (select count(*) from jsonb_array_elements(resolved_lines) l where l->>'kind'<>'membership' and (l->>'unit_cents')::integer>0)>20 then raise exception 'Stripe supports at most 20 one-time quote lines';end if;
   update public.sales_enrollment_quotes set lines=resolved_lines,amount_cents=total,status='approved',owner_notes=p_payload->>'notes',approved_by=auth.uid(),approved_at=now() where id=q.id returning * into q;
   insert into public.sales_activity(actor_id,application_id,action,details) values(auth.uid(),app.id,'quote.approved',jsonb_build_object('quote_id',q.id,'amount_cents',total));return to_jsonb(q);
  else
   if q.id is null or q.status<>'approved' then raise exception 'Owner-approved itemized quote required before payment';end if;
   select * into a from public.sales_checkout_attempts where application_id=app.id and status in ('preparing','pending') for update;
   if a.id is null then
    if pr.assigned_to is not null then select * into r from public.sales_representatives where user_id=pr.assigned_to and status='active' for share;if r.user_id is null then raise exception 'Active assigned representative required';end if;update public.sales_applications set rep_id=r.user_id where id=app.id;app.rep_id=r.user_id;end if;
    insert into public.sales_checkout_attempts(application_id,rep_id,plan_key,amount_cents,monthly_cents,quote_id,customer_email,application_revision,commission_mode,commission_value) values(app.id,app.rep_id,app.plan_key,q.amount_cents,q.monthly_cents,q.id,lower(app.details->>'email'),app.revision,coalesce(r.commission_mode,'none'),coalesce(r.commission_value,0)) returning * into a;
   end if;return to_jsonb(a)||jsonb_build_object('quote_lines',q.lines);
  end if;
 end if;return public.sales_command_v2(p_action,p_id,p_payload);
end $$;
revoke all on function public.sales_command(text,uuid,jsonb) from public,anon;grant execute on function public.sales_command(text,uuid,jsonb) to authenticated;

-- Preserve the established verified fulfillment/refund implementations; use only
-- membership revenue for percentage commissions when a quote includes outside fees.
do $$declare definition text;begin
 definition=pg_get_functiondef('public.sales_fulfill(text,text,uuid,text,uuid,text,integer,text,text,text)'::regprocedure);
 if position('round(p_amount::numeric*a.commission_value/10000)' in definition)=0 then raise exception 'Fulfillment commission logic changed; review required';end if;
 execute replace(definition,'round(p_amount::numeric*a.commission_value/10000)','round(a.monthly_cents::numeric*a.commission_value/10000)');
 definition=pg_get_functiondef('public.sales_refund(text,text,integer)'::regprocedure);
 if position('round(net::numeric*a.commission_value/10000)' in definition)=0 then raise exception 'Refund commission logic changed; review required';end if;
 execute replace(definition,'round(net::numeric*a.commission_value/10000)','round(net::numeric*a.monthly_cents/a.amount_cents*a.commission_value/10000)');
end $$;
