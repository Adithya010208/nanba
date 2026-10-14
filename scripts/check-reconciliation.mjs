import assert from 'node:assert/strict'
import {mergeMessages} from '../src/lib/messages.ts'
const initial={id:'test-message',conversation_id:'test-conversation',sender_id:'test-sender',message_type:'text',text_content:'test fixture',media_path:null,media_name:null,media_size:null,media_mime_type:null,thumbnail_path:null,reply_to_message_id:null,created_at:'2026-01-01T00:00:00.000Z',updated_at:'2026-01-01T00:00:00.000Z',delivered_at:null,read_at:null,edited_at:null,deleted_for_everyone_at:null}
const read={...initial,updated_at:'2026-01-01T00:00:01.000Z',delivered_at:'2026-01-01T00:00:01.000Z',read_at:'2026-01-01T00:00:01.000Z'}
assert.equal(mergeMessages([read],[initial])[0].read_at,read.read_at,'A late insert response must not erase a real read receipt.')
assert.equal(mergeMessages([{...initial,local_state:'sending',updated_at:'2030-01-01T00:00:00.000Z'}],[read])[0].local_state,undefined,'Server confirmation must replace optimistic data despite clock skew.')
const deleted={...read,updated_at:'2026-01-01T00:00:02.000Z',text_content:null,deleted_for_everyone_at:'2026-01-01T00:00:02.000Z'}
assert.equal(mergeMessages([deleted],[initial])[0].text_content,null,'A stale snapshot must not resurrect deleted text.')
assert.equal(mergeMessages([initial],[initial,read]).length,1,'Realtime and request responses must reconcile to one message.')
console.log('PASS: real receipts, optimistic reconciliation, deletion protection and duplicate prevention.')
