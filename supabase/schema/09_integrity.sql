alter table public.messages drop constraint messages_check;
alter table public.messages add constraint messages_content_valid check(
  (deleted_for_everyone_at is not null and text_content is null and media_path is null)
  or (message_type='text' and text_content is not null and length(trim(text_content))>0 and media_path is null)
  or (message_type<>'text' and media_path is not null and media_name is not null and media_size is not null and media_mime_type is not null)
);
create function nanba_private.redact_and_validate() returns trigger language plpgsql set search_path='' as $$
declare object_metadata jsonb;
begin
  if tg_op='UPDATE' and new.text_content is not distinct from old.text_content then new.edited_at=old.edited_at;end if;
  if tg_op='UPDATE' and new.deleted_for_everyone_at is not null then
    new.text_content=null;new.media_path=null;new.media_name=null;new.media_size=null;new.media_mime_type=null;new.thumbnail_path=null;
  end if;
  if tg_op='INSERT' and new.media_path is not null then
    select metadata into object_metadata from storage.objects where bucket_id='chat-media' and name=new.media_path;
    if object_metadata is null or (object_metadata->>'size')::bigint<>new.media_size or object_metadata->>'mimetype'<>new.media_mime_type then raise exception 'Attachment metadata mismatch';end if;
    if (new.message_type='image' and new.media_mime_type not like 'image/%') or (new.message_type='video' and new.media_mime_type not like 'video/%') or (new.message_type in ('audio','voice') and new.media_mime_type not like 'audio/%') then raise exception 'Invalid attachment type';end if;
  end if;
  return new;
end $$;
-- PostgreSQL executes same-kind triggers alphabetically: guard_message precedes this.
create trigger redact_and_validate before insert or update on public.messages for each row execute function nanba_private.redact_and_validate();
