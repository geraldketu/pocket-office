-- Four-person roster and fail-closed DNC controls. No external provider is enabled here.
create table public.sales_team_slots(slot integer primary key check(slot between 1 and 4),rep_id uuid unique references public.sales_representatives(user_id));
insert into public.sales_team_slots(slot) values(1),(2),(3),(4);
create table public.sales_internal_dnc(phone text primary key check(phone ~ '^\+1[0-9]{10}$'),reason text not null default '',recorded_by uuid references auth.users(id),created_at timestamptz not null default now());
create table public.sales_dnc_providers(id text primary key,authorization_ref text not null,enabled boolean not null default false,updated_at timestamptz not null default now());
create table public.sales_dnc_checks(id uuid primary key default gen_random_uuid(),phone text not null,state text not null,provider_id text not null references public.sales_dnc_providers(id),federal_result text not null check(federal_result in ('clear','restricted','unknown')),state_result text not null check(state_result in ('clear','restricted','unknown')),reference text not null,coverage jsonb not null,verified_at timestamptz not null,valid_until timestamptz not null,check(valid_until>verified_at and valid_until<=verified_at+interval '30 days'));
create index sales_dnc_phone_state on public.sales_dnc_checks(phone,state,verified_at desc);
alter table public.sales_resources add column title_es text not null default '',add column body_es text not null default '';
create function public.sales_normalize_phone(p_phone text) returns text language sql immutable set search_path='' as $$ select case when length(digits)=10 then '+1'||digits when length(digits)=11 and left(digits,1)='1' then '+'||digits else null end from(select regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') digits) n $$;
revoke all on function public.sales_normalize_phone(text) from public,anon;grant execute on function public.sales_normalize_phone(text) to authenticated,service_role;
do $$ declare t text;begin foreach t in array array['sales_team_slots','sales_internal_dnc','sales_dnc_providers','sales_dnc_checks'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);execute format('grant all on public.%I to service_role',t);
end loop;end $$;
create policy sales_slots_owner on public.sales_team_slots for select to authenticated using(public.sales_is_owner() or (public.sales_is_active() and rep_id=auth.uid()));
create policy sales_internal_dnc_read on public.sales_internal_dnc for select to authenticated using(public.sales_is_owner() or (public.sales_is_active() and exists(select 1 from public.sales_prospects where assigned_to=auth.uid() and public.sales_normalize_phone(phone)=sales_internal_dnc.phone)));
create policy sales_dnc_provider_owner on public.sales_dnc_providers for select to authenticated using(public.sales_is_owner());
create policy sales_dnc_check_owner on public.sales_dnc_checks for select to authenticated using(public.sales_is_owner());

create function public.sales_call_permission(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pr public.sales_prospects;phone_number text;verification public.sales_dnc_checks;
begin
 select * into pr from public.sales_prospects where id=p_id;
 if pr.id is null or not public.owner_account_enabled() or not(public.sales_is_owner() or (public.sales_is_active() and pr.assigned_to=auth.uid())) then raise exception 'Assigned prospect or owner required' using errcode='42501';end if;
 phone_number=public.sales_normalize_phone(pr.phone);
 if phone_number is null then return jsonb_build_object('id',p_id,'allowed',false,'status','invalid','verified_at',null);end if;
 if pr.disposition='Do Not Contact' or exists(select 1 from public.sales_internal_dnc where phone=phone_number) then return jsonb_build_object('id',p_id,'allowed',false,'status','internal-dnc','verified_at',null);end if;
 select c.* into verification from public.sales_dnc_checks c join public.sales_dnc_providers p on p.id=c.provider_id and p.enabled where c.phone=phone_number and c.state=upper(pr.state) order by c.verified_at desc,c.id desc limit 1;
 if verification.id is null then return jsonb_build_object('id',p_id,'allowed',false,'status','unscreened','verified_at',null);end if;
 if verification.federal_result='restricted' or verification.state_result='restricted' then return jsonb_build_object('id',p_id,'allowed',false,'status','restricted','verified_at',verification.verified_at);end if;
 if verification.valid_until<=now() or verification.verified_at<now()-interval '30 days' then return jsonb_build_object('id',p_id,'allowed',false,'status','expired','verified_at',verification.verified_at);end if;
 if verification.federal_result<>'clear' or verification.state_result<>'clear' then return jsonb_build_object('id',p_id,'allowed',false,'status','unscreened','verified_at',verification.verified_at);end if;
 return jsonb_build_object('id',p_id,'allowed',true,'status','screened-clear','verified_at',verification.verified_at,'valid_until',verification.valid_until,'phone',phone_number);
end $$;
revoke all on function public.sales_call_permission(uuid) from public,anon;grant execute on function public.sales_call_permission(uuid) to authenticated;
create function public.sales_call_permissions(p_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb='[]';id uuid;begin
 if coalesce(array_length(p_ids,1),0)>100 then raise exception 'Too many prospects';end if;foreach id in array p_ids loop result=result||jsonb_build_array(public.sales_call_permission(id));end loop;return result;
end $$;
revoke all on function public.sales_call_permissions(uuid[]) from public,anon;grant execute on function public.sales_call_permissions(uuid[]) to authenticated;

create function public.sales_record_dnc_check(p_provider text,p_authorization text,p_phone text,p_state text,p_federal text,p_state_result text,p_reference text,p_verified timestamptz,p_until timestamptz,p_coverage jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$ begin
 if auth.role()<>'service_role' then raise exception 'Service required' using errcode='42501';end if;
 if public.sales_normalize_phone(p_phone) is null or p_state!~'^[A-Z]{2}$' or length(coalesce(p_provider,'')) not between 2 and 100 or length(coalesce(p_authorization,'')) not between 2 and 200 or length(coalesce(p_reference,'')) not between 1 and 200 or p_verified>now()+interval '1 minute' or p_verified<now()-interval '30 days' or p_verified is null or p_until<=now() or p_until>p_verified+interval '30 days' or p_until is null then raise exception 'Verified authorized screening evidence required';end if;
 if p_coverage->>'country' is distinct from 'US' or jsonb_typeof(p_coverage->'applicable_states') is distinct from 'array' or jsonb_array_length(p_coverage->'applicable_states')<1 or jsonb_typeof(p_coverage->'state_results') is distinct from 'object' or length(coalesce(p_coverage->>'jurisdiction_basis',''))<8 then raise exception 'Verified applicable jurisdiction coverage required';end if;
 if exists(select 1 from jsonb_array_elements_text(p_coverage->'applicable_states') s where s!~'^[A-Z]{2}$' or coalesce(p_coverage->'state_results'->>s,'missing') not in ('clear','restricted','unknown')) then raise exception 'Incomplete state screening coverage';end if;
 if p_state_result is distinct from (case when exists(select 1 from jsonb_array_elements_text(p_coverage->'applicable_states') s where p_coverage->'state_results'->>s='restricted') then 'restricted' when exists(select 1 from jsonb_array_elements_text(p_coverage->'applicable_states') s where p_coverage->'state_results'->>s='unknown') then 'unknown' else 'clear' end) then raise exception 'State result does not match coverage';end if;
 insert into public.sales_dnc_providers(id,authorization_ref,enabled) values(p_provider,p_authorization,true) on conflict(id) do update set authorization_ref=excluded.authorization_ref,enabled=true,updated_at=now();
 insert into public.sales_dnc_checks(phone,state,provider_id,federal_result,state_result,reference,coverage,verified_at,valid_until) values(public.sales_normalize_phone(p_phone),p_state,p_provider,p_federal,p_state_result,p_reference,p_coverage,p_verified,p_until);
 insert into public.sales_activity(action,details) values('dnc.screened',jsonb_build_object('provider',p_provider,'state',p_state,'federal',p_federal,'state_result',p_state_result,'reference',p_reference));
end $$;
revoke all on function public.sales_record_dnc_check(text,text,text,text,text,text,text,timestamptz,timestamptz,jsonb) from public,anon,authenticated;grant execute on function public.sales_record_dnc_check(text,text,text,text,text,text,text,timestamptz,timestamptz,jsonb) to service_role;

-- The original command remains intact behind a constrained wrapper.
alter function public.sales_command(text,uuid,jsonb) rename to sales_command_v1;
revoke all on function public.sales_command_v1(text,uuid,jsonb) from public,anon,authenticated;
create function public.sales_command(p_action text,p_id uuid default null,p_payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare pr public.sales_prospects;number text;permission jsonb;direction text;
begin
 if not public.owner_account_enabled() or not(public.sales_is_owner() or public.sales_is_active()) then raise exception 'Active salesperson or owner required' using errcode='42501';end if;
 if p_action='resource-save-bilingual' then
  if not public.sales_is_owner() then raise exception 'Owner required' using errcode='42501';end if;
  update public.sales_resources set title=left(p_payload->>'title',150),body=left(p_payload->>'body',20000),title_es=left(coalesce(p_payload->>'title_es',''),150),body_es=left(coalesce(p_payload->>'body_es',''),20000),revision=revision+1,updated_by=auth.uid(),updated_at=now() where slug=p_payload->>'slug' and revision=(p_payload->>'revision')::integer;
  if not found then raise exception 'Resource changed. Refresh first';end if;insert into public.sales_activity(actor_id,action,details) values(auth.uid(),'resource.bilingual',jsonb_build_object('slug',p_payload->>'slug'));return jsonb_build_object('saved',true);
 elsif p_action='team-slot' then
  if not public.sales_is_owner() then raise exception 'Owner required' using errcode='42501';end if;
  if (p_payload->>'slot')::integer not between 1 and 4 then raise exception 'Select one of four team positions';end if;
  update public.sales_team_slots set rep_id=nullif(p_payload->>'rep_id','')::uuid where slot=(p_payload->>'slot')::integer;
  insert into public.sales_activity(actor_id,action,details) values(auth.uid(),'team-slot',p_payload);return jsonb_build_object('saved',true);
 elsif p_action='dnc-provider-disable' then
  if not public.sales_is_owner() then raise exception 'Owner required' using errcode='42501';end if;update public.sales_dnc_providers set enabled=false,updated_at=now() where id=p_payload->>'provider';insert into public.sales_activity(actor_id,action,details) values(auth.uid(),'dnc.provider-disabled',jsonb_build_object('provider',p_payload->>'provider'));return jsonb_build_object('disabled',true);
 elsif p_action in ('call','dnc-optout','call-authorize','prospect-notes') then
  select * into pr from public.sales_prospects where id=p_id;if pr.id is null or not(public.sales_is_owner() or pr.assigned_to=auth.uid()) then raise exception 'Assigned prospect required' using errcode='42501';end if;
  number=public.sales_normalize_phone(pr.phone);if number is not null then perform pg_advisory_xact_lock(hashtext('internal-dnc'),hashtext(number));end if;
  select * into pr from public.sales_prospects where id=p_id for update;if not(public.sales_is_owner() or pr.assigned_to=auth.uid()) then raise exception 'Assigned prospect required' using errcode='42501';end if;
  if p_action='dnc-optout' or (p_action='call' and p_payload->>'disposition'='Do Not Contact') then
   if number is not null then insert into public.sales_internal_dnc(phone,reason,recorded_by) values(number,left(coalesce(p_payload->>'reason',p_payload->>'notes','Customer opt-out'),500),auth.uid()) on conflict(phone) do nothing;end if;
   update public.sales_prospects set disposition='Do Not Contact',follow_up_at=null,revision=revision+1,updated_at=now() where id=p_id or (number is not null and public.sales_normalize_phone(phone)=number);
   insert into public.sales_activity(actor_id,prospect_id,action,details) values(auth.uid(),p_id,'dnc.opt-out',jsonb_build_object('reason',left(coalesce(p_payload->>'reason','Customer opt-out'),500)));return jsonb_build_object('optOutRecorded',true);
  elsif p_action='prospect-notes' then
   if pr.revision<>coalesce((p_payload->>'revision')::integer,-1) then raise exception 'Prospect changed. Refresh first';end if;
   update public.sales_prospects set notes=left(coalesce(p_payload->>'notes',''),4000),follow_up_at=case when disposition='Do Not Contact' then null else nullif(p_payload->>'follow_up_at','')::timestamptz end,revision=revision+1 where id=p_id;
   insert into public.sales_activity(actor_id,prospect_id,action) values(auth.uid(),p_id,'notes');return jsonb_build_object('saved',true);
  end if;
  direction=coalesce(p_payload->>'direction','outbound');if direction not in ('inbound','outbound') then raise exception 'Call direction required';end if;
  if p_action='call-authorize' or direction='outbound' then permission=public.sales_call_permission(p_id);if not coalesce((permission->>'allowed')::boolean,false) then raise exception 'Calling blocked: %',permission->>'status';end if;end if;
  if p_action='call-authorize' then return jsonb_build_object('uri','tel:'||(permission->>'phone'));end if;
  insert into public.sales_activity(actor_id,prospect_id,action,details) values(auth.uid(),p_id,'call-context',jsonb_build_object('direction',direction,'method','personal-cellphone-manual'));
 end if;
 return public.sales_command_v1(p_action,p_id,p_payload);
end $$;
revoke all on function public.sales_command(text,uuid,jsonb) from public,anon;grant execute on function public.sales_command(text,uuid,jsonb) to authenticated;

create function public.sales_team_performance() returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if not public.sales_is_owner() then raise exception 'Owner required' using errcode='42501';end if;
 select jsonb_agg(jsonb_build_object('slot',s.slot,'rep_id',s.rep_id,'name',r.name,'rep_code',r.rep_code,'status',r.status,
 'calls_today',(select count(*) from public.sales_activity a where a.actor_id=s.rep_id and a.action='call' and a.created_at>=date_trunc('day',now() at time zone 'America/New_York') at time zone 'America/New_York'),
 'assigned_leads',(select count(*) from public.sales_prospects p where p.assigned_to=s.rep_id),
 'followups_due',(select count(*) from public.sales_prospects p where p.assigned_to=s.rep_id and p.follow_up_at<=now() and p.disposition not in ('Do Not Contact','Closed Sale','Not Interested')),
 'applications_submitted',(select count(*) from public.sales_applications a where a.rep_id=s.rep_id and a.status in ('submitted','payment_pending','paid','refunded')),
 'verified_sales',(select count(*) from public.sales_applications a where a.rep_id=s.rep_id and a.status='paid'),
 'revenue_cents',(select coalesce(sum(initial_revenue_cents),0) from public.sales_applications a where a.rep_id=s.rep_id and a.status='paid'),
 'commission_cents',(select coalesce(sum(amount_cents),0) from public.sales_commissions c where c.rep_id=s.rep_id and c.status in ('earned','approved'))
 ) order by s.slot) into result from public.sales_team_slots s left join public.sales_representatives r on r.user_id=s.rep_id;return coalesce(result,'[]');
end $$;
revoke all on function public.sales_team_performance() from public,anon;grant execute on function public.sales_team_performance() to authenticated;
