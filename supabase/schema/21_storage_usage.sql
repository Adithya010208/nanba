create function public.storage_usage() returns table(message_type text,bytes bigint,count bigint) language sql stable security invoker set search_path='' as $$select m.message_type,coalesce(sum(m.media_size),0)::bigint,count(*)::bigint from public.messages m where m.deleted_for_everyone_at is null and m.media_path is not null group by m.message_type$$;
revoke all on function public.storage_usage() from public;
grant execute on function public.storage_usage() to authenticated;
alter publication supabase_realtime add table public.profiles;
