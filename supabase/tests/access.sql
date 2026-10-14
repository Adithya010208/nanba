-- Transactional tests: no test messages or calls remain after ROLLBACK.
begin;
select set_config('nanba.test.sender',(select id::text from public.profiles where slot=1),true);
select set_config('nanba.test.recipient',(select id::text from public.profiles where slot=2),true);
select set_config('nanba.test.conversation',(select id::text from public.conversations),true);
select set_config('nanba.test.message',gen_random_uuid()::text,true);
select set_config('nanba.test.call',gen_random_uuid()::text,true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('nanba.test.sender'),true);
do $$begin
 if (select count(*) from public.profiles)<>2 then raise exception 'FAIL: approved profiles not readable';end if;
 insert into public.messages(id,conversation_id,sender_id,message_type,text_content) values(current_setting('nanba.test.message')::uuid,current_setting('nanba.test.conversation')::uuid,auth.uid(),'text','transactional test');
 begin
  insert into public.messages(conversation_id,sender_id,message_type,text_content)values(current_setting('nanba.test.conversation')::uuid,current_setting('nanba.test.recipient')::uuid,'text','impersonation');
  raise exception 'FAIL: sender impersonation accepted';
 exception when insufficient_privilege then null;end;
 begin
  update public.messages set read_at=now(),delivered_at=now() where id=current_setting('nanba.test.message')::uuid;
  raise exception 'FAIL: sender could fake receipt';
 exception when raise_exception then if sqlerrm not like 'Only recipient%' then raise;end if;end;
 begin
  insert into public.profiles(id,slot,username,display_name)values(auth.uid(),3,'third','Third');
  raise exception 'FAIL: client could approve a profile';
 exception when insufficient_privilege then null;end;
 insert into public.calls(id,conversation_id,caller_id,receiver_id,call_type)values(current_setting('nanba.test.call')::uuid,current_setting('nanba.test.conversation')::uuid,auth.uid(),current_setting('nanba.test.recipient')::uuid,'voice');
 begin
  update public.calls set status='accepted' where id=current_setting('nanba.test.call')::uuid;
  raise exception 'FAIL: caller could accept own call';
 exception when raise_exception then if sqlerrm not like 'Only receiver%' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('nanba.test.recipient'),true);
do $$begin
 begin
  update public.messages set text_content='recipient edit' where id=current_setting('nanba.test.message')::uuid;
  raise exception 'FAIL: recipient could edit';
 exception when raise_exception then if sqlerrm not like 'Only sender%' then raise;end if;end;
 update public.messages set delivered_at=now(),read_at=now() where id=current_setting('nanba.test.message')::uuid;
 if not exists(select 1 from public.messages where id=current_setting('nanba.test.message')::uuid and delivered_at is not null and read_at is not null)then raise exception 'FAIL: real receipt not recorded';end if;
 update public.calls set status='accepted' where id=current_setting('nanba.test.call')::uuid;
 update public.calls set status='connected' where id=current_setting('nanba.test.call')::uuid;
end$$;
select set_config('request.jwt.claim.sub',current_setting('nanba.test.sender'),true);
do $$begin
 update public.messages set deleted_for_everyone_at=now() where id=current_setting('nanba.test.message')::uuid;
 if exists(select 1 from public.messages where id=current_setting('nanba.test.message')::uuid and text_content is not null)then raise exception 'FAIL: soft deletion exposed text';end if;
 update public.calls set status='ended' where id=current_setting('nanba.test.call')::uuid;
 if not exists(select 1 from public.calls where id=current_setting('nanba.test.call')::uuid and ended_at is not null and duration_seconds is not null)then raise exception 'FAIL: call end not persisted';end if;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$declare table_name text;visible bigint;begin
 foreach table_name in array array['profiles','conversations','conversation_members','messages','message_reactions','starred_messages','hidden_messages','pinned_messages','calls','shared_notes','saved_links'] loop
  execute format('select count(*) from public.%I',table_name) into visible;
  if visible<>0 then raise exception 'FAIL: unapproved account sees %',table_name;end if;
 end loop;
 begin
  insert into public.message_reactions(message_id,user_id,reaction)values(current_setting('nanba.test.message')::uuid,current_setting('nanba.test.sender')::uuid,'👍');
  raise exception 'FAIL: unapproved reaction allowed';
 exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 begin
  insert into public.profiles(id,slot,username,display_name)values(gen_random_uuid(),3,'third','Third');
  raise exception 'FAIL: third profile slot allowed';
 exception when check_violation then null;end;
end$$;
rollback;
select 'PASS: approval, RLS isolation, impersonation, receipts, editing, redaction and call transitions' as result;
