import { useCallback,useEffect,useState } from 'react'
import type {Message,Reaction} from '../../types/chat'
import {check,client} from '../../lib/supabase'

export function useMessageActions(userId:string|undefined,conversationId:string|null,messageIds:string) {
  const [reactions,setReactions]=useState<Reaction[]>([])
  const [stars,setStars]=useState<Set<string>>(new Set())
  const [pin,setPin]=useState<string|null>(null)
  const [error,setError]=useState('')
  const refresh=useCallback(async()=>{
    if(!userId||!conversationId)return
    const ids=messageIds?messageIds.split(','):[]
    const [reactResult,starResult,pinResult]=await Promise.all([ids.length?client().from('message_reactions').select('message_id,user_id,reaction').in('message_id',ids):Promise.resolve({data:[],error:null}),client().from('starred_messages').select('message_id').eq('user_id',userId).limit(1000),client().from('pinned_messages').select('message_id').eq('conversation_id',conversationId).maybeSingle()]);check(reactResult.error);check(starResult.error);check(pinResult.error)
    setReactions((reactResult.data||[])as Reaction[]);setStars(new Set((starResult.data||[]).map(row=>row.message_id as string)));setPin(pinResult.data?.message_id||null)
  },[userId,conversationId,messageIds])
  useEffect(()=>{if(!userId||!conversationId)return;let alive=true;const load=()=>{void refresh().catch(caught=>{if(alive)setError(caught.message)})};load();const sb=client();const channel=sb.channel(`actions:${conversationId}`).on('postgres_changes',{event:'*',schema:'public',table:'message_reactions'},load).on('postgres_changes',{event:'*',schema:'public',table:'pinned_messages'},load).subscribe();return()=>{alive=false;void sb.removeChannel(channel)}},[userId,conversationId,refresh])
  async function star(id:string){if(!userId)return;const{error:saveError}=stars.has(id)?await client().from('starred_messages').delete().eq('user_id',userId).eq('message_id',id):await client().from('starred_messages').insert({user_id:userId,message_id:id});check(saveError);await refresh()}
  async function react(id:string,reaction:string){if(!userId)return;const exists=reactions.some(value=>value.message_id===id&&value.user_id===userId&&value.reaction===reaction);const{error:reactError}=exists?await client().from('message_reactions').delete().eq('user_id',userId).eq('message_id',id).eq('reaction',reaction):await client().from('message_reactions').insert({message_id:id,user_id:userId,reaction});check(reactError);await refresh()}
  async function pinMessage(id:string){if(!userId||!conversationId)return;const{error:pinError}=pin===id?await client().from('pinned_messages').delete().eq('conversation_id',conversationId):await client().from('pinned_messages').upsert({conversation_id:conversationId,message_id:id,pinned_by:userId});check(pinError);await refresh()}
  async function edit(message:Message,text:string){const{error:editError}=await client().from('messages').update({text_content:text.trim(),edited_at:new Date().toISOString()}).eq('id',message.id).eq('sender_id',userId!);check(editError)}
  async function remove(message:Message){const{error:deleteError}=await client().from('messages').update({deleted_for_everyone_at:new Date().toISOString()}).eq('id',message.id).eq('sender_id',userId!);check(deleteError)}
  return{reactions,stars,pin,error,star,react,pinMessage,edit,remove}
}
