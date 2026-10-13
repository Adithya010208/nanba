create table public.calls(
 id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.conversations(id),
 caller_id uuid not null references public.profiles(id),receiver_id uuid not null references public.profiles(id),
 call_type text not null check(call_type in ('voice','video')),
 status text not null default 'calling' check(status in ('calling','ringing','accepted','connected','rejected','missed','ended','failed')),
 started_at timestamptz not null default now(),answered_at timestamptz,connected_at timestamptz,ended_at timestamptz,duration_seconds integer check(duration_seconds>=0),check(caller_id<>receiver_id)
);
create unique index one_active_call on public.calls(conversation_id) where status in ('calling','ringing','accepted','connected');
create index calls_caller on public.calls(caller_id);
create index calls_receiver on public.calls(receiver_id);
create index calls_history on public.calls(conversation_id,started_at desc);
alter table public.calls enable row level security;
create policy calls_read on public.calls for select to authenticated using(nanba_private.member(conversation_id));
create policy calls_insert on public.calls for insert to authenticated with check(caller_id=auth.uid() and nanba_private.member(conversation_id) and status='calling' and exists(select 1 from public.conversation_members where user_id=receiver_id and conversation_id=calls.conversation_id));
create policy calls_update on public.calls for update to authenticated using(nanba_private.member(conversation_id) and auth.uid() in(caller_id,receiver_id)) with check(nanba_private.member(conversation_id) and auth.uid() in(caller_id,receiver_id));
revoke all on public.calls from anon,authenticated;
grant select,insert on public.calls to authenticated;
grant update(status) on public.calls to authenticated;
create function nanba_private.guard_call() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then new.started_at=now();new.answered_at=null;new.connected_at=null;new.ended_at=null;new.duration_seconds=null;return new;end if;
 if new.id is distinct from old.id or new.caller_id is distinct from old.caller_id or new.receiver_id is distinct from old.receiver_id or new.conversation_id is distinct from old.conversation_id or new.call_type is distinct from old.call_type then raise exception 'Call identity cannot change';end if;
 if new.status=old.status then return new;end if;
 if old.status in('ended','rejected','missed','failed') then raise exception 'Call has ended';end if;
 if new.status='ringing' and (auth.uid()<>old.receiver_id or old.status<>'calling') then raise exception 'Invalid ringing transition';end if;
 if new.status='accepted' and (auth.uid()<>old.receiver_id or old.status not in('calling','ringing')) then raise exception 'Only receiver may accept';end if;
 if new.status='rejected' and (auth.uid()<>old.receiver_id or old.status not in('calling','ringing')) then raise exception 'Only receiver may reject';end if;
 if new.status='connected' and old.status not in('accepted','connected') then raise exception 'Call is not accepted';end if;
 if new.status='calling' then raise exception 'Cannot restart call';end if;
 if new.status='accepted' then new.answered_at=now();end if;
 if new.status='connected' then new.connected_at=coalesce(old.connected_at,now());end if;
 if new.status in('ended','rejected','missed','failed') then new.ended_at=now();new.duration_seconds=case when old.connected_at is not null then greatest(0,floor(extract(epoch from(now()-old.connected_at)))::integer) else 0 end;end if;
 return new;
end $$;
create trigger guard_call before insert or update on public.calls for each row execute function nanba_private.guard_call();
alter publication supabase_realtime add table public.calls;
drop policy nanba_realtime_receive on realtime.messages;
drop policy nanba_realtime_send on realtime.messages;
create policy nanba_realtime_receive on realtime.messages for select to authenticated using(extension in('broadcast','presence') and exists(select 1 from public.conversation_members where user_id=auth.uid() and realtime.topic() in('nanba:'||conversation_id::text,'nanba:'||conversation_id::text||':calls')));
create policy nanba_realtime_send on realtime.messages for insert to authenticated with check(extension in('broadcast','presence') and exists(select 1 from public.conversation_members where user_id=auth.uid() and realtime.topic() in('nanba:'||conversation_id::text,'nanba:'||conversation_id::text||':calls')));
