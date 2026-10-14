alter table public.profiles add constraint preferences_valid check(jsonb_typeof(preferences)='object' and jsonb_typeof(preferences->'read_receipts')='boolean' and jsonb_typeof(preferences->'last_seen')='boolean' and jsonb_typeof(preferences->'notifications')='boolean' and jsonb_typeof(preferences->'notification_preview')='boolean' and preferences ?& array['read_receipts','last_seen','notifications','notification_preview']);
create function nanba_private.validate_profile_media() returns trigger language plpgsql set search_path='' as $$begin
 if new.avatar_path is distinct from old.avatar_path and new.avatar_path is not null then
  if not exists(select 1 from public.conversation_members where user_id=auth.uid() and new.avatar_path like conversation_id::text||'/'||auth.uid()::text||'/%') or not exists(select 1 from storage.objects where bucket_id='chat-media' and name=new.avatar_path and metadata->>'mimetype' like 'image/%' and (metadata->>'size')::bigint<=5242880)then raise exception 'Invalid profile image';end if;
 end if;
 if new.last_seen is distinct from old.last_seen then new.last_seen=now();end if;
 return new;
end$$;
create trigger validate_profile_media before update on public.profiles for each row execute function nanba_private.validate_profile_media();
