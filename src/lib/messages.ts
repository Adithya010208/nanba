import type {Message} from '../types/chat'
export function mergeMessages(current:Message[],incoming:Message[]){
 const byId=new Map(current.map(message=>[message.id,message]))
 for(const message of incoming){
  const previous=byId.get(message.id)
  if(previous&&!previous.local_state){
   if(message.local_state)continue
   if(previous.deleted_for_everyone_at&&!message.deleted_for_everyone_at)continue
   if(Date.parse(previous.updated_at)>Date.parse(message.updated_at))continue
   if(previous.read_at&&!message.read_at)continue
   if(previous.delivered_at&&!message.delivered_at)continue
  }
  byId.set(message.id,message)
 }
 return [...byId.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))
}
