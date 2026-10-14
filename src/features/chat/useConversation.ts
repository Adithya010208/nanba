import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Profile } from '../../App'
import type { Message,SendMessage } from '../../types/chat'
import { check, client } from '../../lib/supabase'
import {toProfile} from '../../lib/profile'
import type {Tables} from '../../types/database'
import {mergeMessages} from '../../lib/messages'

export function useConversation(profile: Profile | null) {
  const userId=profile?.id
  const preferencesRef=useRef(profile?.preferences)
  useEffect(()=>{preferencesRef.current=profile?.preferences},[profile?.preferences])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [peer, setPeer] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [quotes,setQuotes]=useState<Map<string,Message>>(new Map())
  const loadQuotes=useCallback(async(incoming:Message[])=>{const ids=[...new Set(incoming.map(message=>message.reply_to_message_id).filter((id):id is string=>Boolean(id)))];if(!ids.length)return;const{data,error}=await client().from('messages').select('*').in('id',ids);check(error);setQuotes(current=>{const next=new Map(current);for(const message of (data||[])as Message[])next.set(message.id,message);return next})},[])
  const [connection, setConnection] = useState('Connecting')
  const [error, setError] = useState('')
  const [hasOlder, setHasOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [online, setOnline] = useState(false)
  const [typing, setTyping] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const channel = useRef<RealtimeChannel | null>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTyping = useRef(0)
  const visible = useRef(false)
  const mounted = useRef(false)
  const acknowledge = useCallback(async (incoming: Message[]) => {
    if (!userId) return
    const candidates = incoming.filter(message => message.sender_id !== userId && !message.local_state)
    const delivered = candidates.filter(message => !message.delivered_at).map(message => message.id)
    const read = preferencesRef.current?.read_receipts!==false && visible.current && document.visibilityState === 'visible' && document.hasFocus() ? candidates.filter(message => !message.read_at).map(message => message.id) : []
    try {
      if (delivered.length) { const { error: ackError } = await client().from('messages').update({ delivered_at: new Date().toISOString() }).in('id', delivered).is('delivered_at', null); check(ackError) }
      if (read.length) { const { error: readError } = await client().from('messages').update({ read_at: new Date().toISOString(), delivered_at: new Date().toISOString() }).in('id',read).is('read_at',null); check(readError) }
    } catch (caught) { if (mounted.current) setError(caught instanceof Error ? caught.message : 'Receipt acknowledgement failed.') }
  }, [userId])
  const refresh = useCallback(async (cid: string) => {
    const { data, error: fetchError } = await client().from('messages').select('*').eq('conversation_id',cid).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50)
    check(fetchError)
    if (mounted.current) { setMessages(current => mergeMessages(current.filter(message=>message.local_state), (data || []) as Message[])); setHasOlder((data || []).length === 50); await loadQuotes((data||[])as Message[]); await acknowledge((data || []) as Message[]) }
  }, [acknowledge,loadQuotes])
  useEffect(() => {
    if (!userId) return
    mounted.current = true
    let disposed = false
    let activeId: string | null = null
    const sb = client()
    async function initialize() {
      try {
        const { data: membership, error: membershipError } = await sb.from('conversation_members').select('conversation_id').eq('user_id',userId!).single(); check(membershipError)
        const cid = membership!.conversation_id as string
        activeId = cid
        const { data: peerData, error: peerError } = await sb.from('profiles').select('*').neq('id',userId!).single(); check(peerError)
        if (disposed) return
        setConversationId(cid); setPeer(toProfile(peerData!))
        await sb.realtime.setAuth()
        const room = sb.channel(`nanba:${cid}`,{config:{private:true,presence:{key:userId!},broadcast:{self:false}}})
        channel.current = room
        room.on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`conversation_id=eq.${cid}`}, payload => {
          const incoming = payload.new as Message
          if (!incoming.id) return
          setMessages(current => payload.eventType==='INSERT'||current.some(message=>message.id===incoming.id)?mergeMessages(current,[incoming]):current);setQuotes(current=>{if(!current.has(incoming.id))return current;const next=new Map(current);next.set(incoming.id,incoming);return next});if(payload.eventType==='INSERT'){void acknowledge([incoming]);void loadQuotes([incoming]).catch(caught=>setError(caught.message))}
          if (payload.eventType === 'INSERT' && incoming.sender_id !== userId! && document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted' && preferencesRef.current?.notifications !== false) {
            new Notification(peerData!.display_name as string,{body:preferencesRef.current?.notification_preview !== false ? incoming.text_content || 'Sent an attachment' : 'New message',icon:'/favicon.svg',tag:incoming.id})
          }
        }).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:`id=eq.${peerData!.id}`},payload=>setPeer(toProfile(payload.new as Tables<'profiles'>))).on('postgres_changes',{event:'*',schema:'public',table:'hidden_messages',filter:`user_id=eq.${userId}`},()=>{void sb.from('hidden_messages').select('message_id').eq('user_id',userId!).then(({data,error:hiddenError})=>{if(hiddenError)setError(hiddenError.message);else setHidden(new Set((data||[]).map(value=>value.message_id as string)))})}).on('presence',{event:'sync'},()=>setOnline(Object.keys(room.presenceState()).includes(peerData!.id as string)))
          .on('broadcast',{event:'typing'},({payload})=> { if (payload.user_id === peerData!.id) { setTyping(Boolean(payload.typing)); if(typingTimeout.current)clearTimeout(typingTimeout.current); typingTimeout.current=setTimeout(()=>setTyping(false),3500) } })
          .subscribe(status=> {
            if(disposed)return
            setConnection(status==='SUBSCRIBED'?'Connected':navigator.onLine?'Reconnecting':'Offline')
            if(status==='SUBSCRIBED') { void room.track({user_id:userId!}); void refresh(cid).catch(caught=>setError(String(caught.message))) }
          })
        const {data:hiddenData,error:hiddenError}=await sb.from('hidden_messages').select('message_id').eq('user_id',userId!); check(hiddenError)
        if(!disposed)setHidden(new Set((hiddenData||[]).map(row=>row.message_id as string)))
        await refresh(cid)
      } catch(caught) { if(!disposed) { setError(caught instanceof Error?caught.message:'Unable to open conversation.');setConnection('Unavailable') } }
    }
    void initialize()
    const offline = () => setConnection('Offline')
    const reconnect = () => { setConnection('Reconnecting'); if(channel.current) void channel.current.track({user_id:userId}); if(activeId) void refresh(activeId).catch(caught=>setError(String(caught.message))) }
    const persistSeen = () => { void sb.from('profiles').update({last_seen:new Date().toISOString()}).eq('id',userId).then(({error:seenError})=>{if(seenError&&!disposed)setError('Could not update last seen.')}) }
    window.addEventListener('offline',offline);window.addEventListener('online',reconnect);window.addEventListener('pagehide',persistSeen)
    return()=> { disposed=true;mounted.current=false;window.removeEventListener('offline',offline);window.removeEventListener('online',reconnect);window.removeEventListener('pagehide',persistSeen);if(typingTimeout.current)clearTimeout(typingTimeout.current);if(channel.current){void sb.removeChannel(channel.current);channel.current=null} }
    // A session is stable for the lifetime of this conversation; reconnects refresh through channel subscription.
  }, [userId,refresh,acknowledge,loadQuotes])
  const messagesRef=useRef(messages)
  useEffect(()=>{messagesRef.current=messages},[messages])
  const setViewing=useCallback((viewing:boolean)=>{visible.current=viewing;if(viewing)void acknowledge(messagesRef.current)},[acknowledge])
  useEffect(()=> { const onFocus=()=>{if(visible.current)void acknowledge(messagesRef.current)};window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onFocus);return()=>{window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus)} },[acknowledge])
  async function send(values: SendMessage, retryId?:string) {
    if(!userId||!conversationId)throw new Error('Conversation is not ready.')
    const id=retryId||crypto.randomUUID()
    const optimistic={id,conversation_id:conversationId,sender_id:userId,text_content:values.text_content?.trim()||null,media_path:null,media_name:null,media_size:null,media_mime_type:null,thumbnail_path:null,reply_to_message_id:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),delivered_at:null,read_at:null,edited_at:null,deleted_for_everyone_at:null,...values,local_state:'sending' as const}
    setMessages(current=>mergeMessages(current,[optimistic]))
    try{
      const {data,error:sendError}=await client().from('messages').upsert({id,conversation_id:conversationId,sender_id:userId,...values},{onConflict:'id',ignoreDuplicates:true}).select().maybeSingle()
      check(sendError)
      if(data)setMessages(current=>mergeMessages(current,[data as Message]))
      else{const{data:existing,error:existingError}=await client().from('messages').select('*').eq('id',id).single();check(existingError);setMessages(current=>mergeMessages(current,[existing as Message]))}
    }catch(caught){
      const observed=messagesRef.current.find(message=>message.id===id)
      if(observed&&!observed.local_state)return id
      setMessages(current=>current.map(message=>message.id===id&&message.local_state?{...message,local_state:'failed'}:message))
      throw caught
    }
    return id
  }
  async function loadOlder() {
    if(!conversationId||loadingOlder||!hasOlder)return
    const oldest=messages.find(message=>!message.local_state);if(!oldest)return
    setLoadingOlder(true)
    try {const {data,error:olderError}=await client().from('messages').select('*').eq('conversation_id',conversationId).or(`created_at.lt.${oldest.created_at},and(created_at.eq.${oldest.created_at},id.lt.${oldest.id})`).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(50);check(olderError);setMessages(current=>mergeMessages(current,(data||[])as Message[]));setHasOlder((data||[]).length===50);await loadQuotes((data||[])as Message[]);await acknowledge((data||[])as Message[])}finally{setLoadingOlder(false)}
  }
  function broadcastTyping(active:boolean){if(!userId||!channel.current)return;if(active&&Date.now()-lastTyping.current<1200)return;lastTyping.current=Date.now();void channel.current.send({type:'broadcast',event:'typing',payload:{user_id:userId,typing:active}})}
  async function hideMessage(id:string){if(!userId)return;const{error:hideError}=await client().from('hidden_messages').upsert({user_id:userId,message_id:id},{ignoreDuplicates:true});check(hideError);setHidden(current=>new Set([...current,id]))}
  return {conversationId,peer,hidden,quotes,messages:messages.filter(message=>!hidden.has(message.id)),connection,error,online,typing,channel,send,loadOlder,hasOlder,loadingOlder,broadcastTyping,setViewing,hideMessage,refresh}
}
