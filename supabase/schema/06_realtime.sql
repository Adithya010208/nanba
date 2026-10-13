create policy nanba_realtime_receive on realtime.messages for select to authenticated using (
  extension in ('broadcast','presence') and exists(select 1 from public.conversation_members where user_id=auth.uid() and 'nanba:'||conversation_id::text=realtime.topic())
);
create policy nanba_realtime_send on realtime.messages for insert to authenticated with check (
  extension in ('broadcast','presence') and exists(select 1 from public.conversation_members where user_id=auth.uid() and 'nanba:'||conversation_id::text=realtime.topic())
);
