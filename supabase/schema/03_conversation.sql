create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check(singleton),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_id uuid,
  last_message_at timestamptz
);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create function nanba_private.member(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.conversation_members m join public.profiles p on p.id=m.user_id where m.conversation_id=cid and m.user_id=auth.uid());
$$;
revoke all on function nanba_private.member(uuid) from public;
grant execute on function nanba_private.member(uuid) to authenticated;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
create policy conversation_read on public.conversations for select to authenticated using(nanba_private.member(id));
create policy members_read on public.conversation_members for select to authenticated using(nanba_private.member(conversation_id));
revoke all on public.conversations,public.conversation_members from anon,authenticated;
grant select on public.conversations,public.conversation_members to authenticated;
insert into public.conversations default values;
insert into public.conversation_members(conversation_id,user_id) select c.id,p.id from public.conversations c cross join public.profiles p;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id),
  sender_id uuid not null references public.profiles(id),
  message_type text not null check(message_type in ('text','image','video','audio','document','voice')),
  text_content text check(char_length(text_content)<=10000),
  media_path text,
  media_name text check(char_length(media_name)<=255),
  media_size bigint check(media_size>0 and media_size<=104857600),
  media_mime_type text,
  thumbnail_path text,
  reply_to_message_id uuid references public.messages(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  edited_at timestamptz,
  deleted_for_everyone_at timestamptz,
  check((message_type='text' and length(trim(text_content))>0 and media_path is null) or (message_type<>'text' and media_path is not null and media_name is not null and media_size is not null and media_mime_type is not null)),
  check(media_path is null or media_path like conversation_id::text||'/'||sender_id::text||'/%'),
  check(message_type<>'image' or media_size<=20971520),
  check(message_type not in ('document','audio','voice') or media_size<=52428800),
  check(read_at is null or delivered_at is not null)
);
create index messages_cursor on public.messages(conversation_id,created_at desc,id desc);
create index messages_sender on public.messages(sender_id);
create index messages_reply on public.messages(reply_to_message_id);
create index messages_search on public.messages using gin(to_tsvector('simple',coalesce(text_content,'')||' '||coalesce(media_name,'')));
alter table public.messages enable row level security;
create policy messages_read on public.messages for select to authenticated using(nanba_private.member(conversation_id));
create policy messages_send on public.messages for insert to authenticated with check(sender_id=auth.uid() and nanba_private.member(conversation_id) and delivered_at is null and read_at is null and edited_at is null and deleted_for_everyone_at is null);
create policy messages_update on public.messages for update to authenticated using(nanba_private.member(conversation_id)) with check(nanba_private.member(conversation_id));
revoke all on public.messages from anon,authenticated;
grant select,insert on public.messages to authenticated;
grant update(text_content,edited_at,deleted_for_everyone_at,delivered_at,read_at) on public.messages to authenticated;

create function nanba_private.guard_message() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then
    new.created_at=now();new.updated_at=now();
    if new.reply_to_message_id is not null and not exists(select 1 from public.messages r where r.id=new.reply_to_message_id and r.conversation_id=new.conversation_id) then raise exception 'Invalid reply';end if;
    if new.media_path is not null and not exists(select 1 from storage.objects where bucket_id='chat-media' and name=new.media_path) then raise exception 'Upload does not exist';end if;
    return new;
  end if;
  if new.sender_id is distinct from old.sender_id or new.conversation_id is distinct from old.conversation_id or new.id is distinct from old.id or new.created_at is distinct from old.created_at or new.media_path is distinct from old.media_path or new.message_type is distinct from old.message_type or new.reply_to_message_id is distinct from old.reply_to_message_id then raise exception 'Message identity is immutable';end if;
  if auth.uid()=old.sender_id then
    if new.delivered_at is distinct from old.delivered_at or new.read_at is distinct from old.read_at then raise exception 'Only recipient may acknowledge';end if;
    if old.deleted_for_everyone_at is not null then raise exception 'Deleted message cannot be edited';end if;
    if new.text_content is distinct from old.text_content then new.edited_at=now();end if;
    if new.deleted_for_everyone_at is not null then new.deleted_for_everyone_at=now();end if;
  else
    if new.text_content is distinct from old.text_content or new.edited_at is distinct from old.edited_at or new.deleted_for_everyone_at is distinct from old.deleted_for_everyone_at then raise exception 'Only sender may edit';end if;
    new.delivered_at=coalesce(old.delivered_at,case when new.delivered_at is not null or new.read_at is not null then now() end);
    if coalesce((select preferences->>'read_receipts' from public.profiles where id=auth.uid()),'true')='true' then new.read_at=coalesce(old.read_at,case when new.read_at is not null then now() end);else new.read_at=old.read_at;end if;
  end if;
  new.updated_at=now();return new;
end $$;
create trigger guard_message before insert or update on public.messages for each row execute function nanba_private.guard_message();

create function nanba_private.message_access(mid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.messages where id=mid and nanba_private.member(conversation_id));
$$;
revoke all on function nanba_private.message_access(uuid) from public;
grant execute on function nanba_private.message_access(uuid) to authenticated;

alter publication supabase_realtime add table public.messages;
