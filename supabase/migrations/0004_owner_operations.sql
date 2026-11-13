-- Preview only. Reviewed production tables; no archived Worker code or records imported.
alter table public.fuel_receipts add column organization_label text not null default '';
alter table public.dat_records add column driver_id uuid references auth.users(id),add column due_on date;
create function public.owner_clinical_allowed(p_driver uuid) returns boolean language sql stable security definer set search_path='' as $$select public.owner_authorized() or (public.owner_account_enabled() and p_driver=auth.uid())$$;
revoke all on function public.owner_clinical_allowed(uuid) from public,anon;grant execute on function public.owner_clinical_allowed(uuid) to authenticated,service_role;
create policy owner_clinical_privacy on public.dat_records as restrictive for all to authenticated using(public.owner_clinical_allowed(driver_id)) with check(public.owner_authorized());
create function public.owner_sensitive_file_allowed(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.owner_authorized() or (
 not exists(select 1 from public.dat_records where file_path=p_path)
 and not exists(select 1 from public.documents d join public.document_types t on t.id=d.type_id where d.file_path=p_path and t.category='Drug & alcohol')
 ) or exists(select 1 from public.dat_records where file_path=p_path and driver_id=auth.uid() and public.owner_account_enabled())
$$;
revoke all on function public.owner_sensitive_file_allowed(text) from public,anon;grant execute on function public.owner_sensitive_file_allowed(text) to authenticated,service_role;
create policy owner_clinical_document on public.documents as restrictive for select to authenticated using(public.owner_sensitive_file_allowed(file_path));
create policy owner_clinical_storage on storage.objects as restrictive for select to authenticated using(bucket_id<>'carrier-files' or public.owner_sensitive_file_allowed(name));
create function public.owner_guard_clinical() returns trigger language plpgsql security definer set search_path='' as $$begin
 if auth.role()='authenticated' and not public.owner_authorized() then raise exception 'Verified owner required for compliance changes' using errcode='42501';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger owner_clinical_writes before insert or update or delete on public.dat_records for each row execute function public.owner_guard_clinical();
do $$ declare t text;begin foreach t in array array['fuel_receipts','mileage_entries','dat_records'] loop execute format('create trigger owner_operations_audit after insert or update or delete on public.%I for each row execute function public.owner_audit_management()',t);end loop;end $$;

create function public.owner_operations_command(p_action text,p_id uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid;target_entity text;rid uuid;before_row jsonb;result jsonb;rev integer;
begin
 if not public.owner_authorized() then raise exception 'Verified owner required' using errcode='42501';end if;
 if pg_column_size(p_payload)>16000 then raise exception 'Request too large';end if;
 target_entity=case p_action when 'fuel-save' then 'fuel_receipts' when 'mileage-save' then 'mileage_entries' when 'compliance-save' then 'dat_records' end;
 if target_entity is null then raise exception 'Unknown operations command';end if;c=(p_payload->>'carrier_id')::uuid;
 if not exists(select 1 from public.carriers where id=c) then raise exception 'Company required';end if;
 if p_id is not null then
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',target_entity) into before_row using p_id;
  if before_row is null or (before_row->>'carrier_id')::uuid<>c then raise exception 'Existing company record required';end if;
  perform pg_advisory_xact_lock(hashtext(target_entity),hashtext(p_id::text));select revision into rev from public.owner_record_versions where owner_record_versions.entity=target_entity and record_id=p_id;
  if coalesce(rev,0)<>coalesce((p_payload->>'revision')::integer,-1) then raise exception 'Record changed. Refresh before saving';end if;
 end if;
 if p_action='mileage-save' then
  if p_payload->>'state'!~'^[A-Z]{2}$' or coalesce((p_payload->>'miles')::numeric,-1)<0 or (p_payload->>'miles')::numeric>1000000 or nullif(p_payload->>'date','') is null then raise exception 'Valid date, jurisdiction and mileage required';end if;
  if p_id is null then insert into public.mileage_entries(carrier_id,date,state,miles,truck_unit,trip_note) values(c,(p_payload->>'date')::date,p_payload->>'state',(p_payload->>'miles')::numeric,p_payload->>'truck_unit',p_payload->>'trip_note') returning to_jsonb(mileage_entries.*) into result;
  else update public.mileage_entries set date=(p_payload->>'date')::date,state=p_payload->>'state',miles=(p_payload->>'miles')::numeric,truck_unit=p_payload->>'truck_unit',trip_note=p_payload->>'trip_note' where id=p_id returning to_jsonb(mileage_entries.*) into result;end if;
 elsif p_action='fuel-save' then
  if p_payload->>'state'!~'^[A-Z]{2}$' or coalesce((p_payload->>'gallons')::numeric,-1)<=0 or (p_payload->>'gallons')::numeric>1000000 or coalesce((p_payload->>'total')::numeric,-1)<0 or nullif(p_payload->>'date','') is null then raise exception 'Valid receipt date, state, gallons and total required';end if;
  if p_id is null then
   if p_payload->>'image_path' not like c::text||'/fuel/%' then raise exception 'Verified company receipt upload required';end if;
   insert into public.fuel_receipts(carrier_id,image_path,date,station,city,state,gallons,total,organization_label) values(c,p_payload->>'image_path',(p_payload->>'date')::date,p_payload->>'station',p_payload->>'city',p_payload->>'state',(p_payload->>'gallons')::numeric,(p_payload->>'total')::numeric,p_payload->>'organization_label') returning to_jsonb(fuel_receipts.*) into result;
  else update public.fuel_receipts set date=(p_payload->>'date')::date,station=p_payload->>'station',city=p_payload->>'city',state=p_payload->>'state',gallons=(p_payload->>'gallons')::numeric,total=(p_payload->>'total')::numeric,organization_label=p_payload->>'organization_label' where id=p_id returning to_jsonb(fuel_receipts.*) into result;end if;
 else
  if p_payload->>'test_type' not in ('enrollment','pre_employment','random','post_accident','reasonable_suspicion','return_to_duty','follow_up','clearinghouse_pre_employment','clearinghouse_annual') or p_payload->>'test_type' is null then raise exception 'Supported record type required';end if;
  if nullif(p_payload->>'driver_id','') is not null and not exists(select 1 from public.profiles where id=(p_payload->>'driver_id')::uuid and carrier_id=c and role='driver') then raise exception 'Driver must belong to this company';end if;
  if p_id is null then insert into public.dat_records(carrier_id,driver_id,test_type,date,due_on,result,consortium,notes) values(c,nullif(p_payload->>'driver_id','')::uuid,p_payload->>'test_type',nullif(p_payload->>'date','')::date,nullif(p_payload->>'due_on','')::date,p_payload->>'result',p_payload->>'consortium',p_payload->>'notes') returning to_jsonb(dat_records.*) into result;
  else update public.dat_records set driver_id=nullif(p_payload->>'driver_id','')::uuid,test_type=p_payload->>'test_type',date=nullif(p_payload->>'date','')::date,due_on=nullif(p_payload->>'due_on','')::date,result=p_payload->>'result',consortium=p_payload->>'consortium',notes=p_payload->>'notes' where id=p_id returning to_jsonb(dat_records.*) into result;end if;
 end if;return result;
end $$;
revoke all on function public.owner_operations_command(text,uuid,jsonb) from public,anon;grant execute on function public.owner_operations_command(text,uuid,jsonb) to authenticated;
create function public.owner_ifta_summary(p_company uuid,p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if not public.owner_authorized() then raise exception 'Verified owner required' using errcode='42501';end if;if p_from>p_to or p_to-p_from>366 or p_from is null or p_to is null then raise exception 'Select up to one year';end if;
 with miles as(select state,sum(miles) miles from public.mileage_entries where carrier_id=p_company and date between p_from and p_to group by state),fuel as(select state,sum(gallons) gallons,sum(total) cost from public.fuel_receipts where carrier_id=p_company and date between p_from and p_to group by state)
 select coalesce(jsonb_agg(jsonb_build_object('state',coalesce(m.state,f.state),'miles',coalesce(m.miles,0),'gallons',coalesce(f.gallons,0),'fuel_cost',coalesce(f.cost,0)) order by coalesce(m.state,f.state)),'[]') into result from miles m full join fuel f on f.state=m.state;
 return result;
end $$;
revoke all on function public.owner_ifta_summary(uuid,date,date) from public,anon;grant execute on function public.owner_ifta_summary(uuid,date,date) to authenticated;
