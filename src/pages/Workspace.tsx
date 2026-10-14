import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowUpRight, ChevronRight, FileText, Image, Info, LockKeyhole, LogOut, MessageCircle, Paperclip, Phone, Pin, Search, Send, Settings, ShieldCheck, Smile, Star, Video, X } from 'lucide-react'
import { Brand } from '../components/Brand'
import type { Profile } from '../App'
import type { Message,SendMessage } from '../types/chat'
import { useConversation } from '../features/chat/useConversation'
import { useMessageActions } from '../features/chat/useMessageActions'
import { uploadMedia,validateFile } from '../features/media/media'

import { ChatThread } from '../components/chat/ChatThread'
import { AttachmentPreview } from '../components/media/AttachmentPreview'
import { VoiceRecorder } from '../components/media/VoiceRecorder'
import { MediaViewer } from '../components/media/MediaViewer'
import { Dialog } from '../components/ui/Dialog'
import {ProfileAvatar} from '../components/ui/ProfileAvatar'
import {InstallApp} from '../components/navigation/InstallApp'
import { useCalling } from '../features/calls/useCalling'
import { CallOverlay } from '../components/calls/CallOverlay'
import { CollectionPage } from './CollectionPage'
import { SettingsPanel } from './SettingsPanel'
import { SearchResults } from '../components/chat/SearchResults'

type Tab = 'chat' | 'media' | 'files' | 'calls' | 'saved' | 'notes' | 'settings'
const navigation: { id: Tab; title: string; icon: typeof MessageCircle }[] = [{ id: 'chat', title: 'Conversation', icon: MessageCircle }, { id: 'media', title: 'Photos & videos', icon: Image }, { id: 'files', title: 'Shared files', icon: FileText }, { id: 'calls', title: 'Calls', icon: Phone }, { id: 'saved', title: 'Saved', icon: Star }]
const sections: Record<Exclude<Tab, 'chat' | 'settings'>, { title: string; subtitle: string; empty: string; description: string; icon: typeof Image }> = {
  media: { title: 'Photos & videos', subtitle: 'Little moments, all in one place.', empty: 'The moments start here.', description: 'Photos and videos you share will find a home here.', icon: Image },
  files: { title: 'Shared files', subtitle: 'Everything you’ve sent, easy to find.', empty: 'A place for the useful things.', description: 'Documents, audio and other shared files will appear here.', icon: FileText },
  calls: { title: 'Calls', subtitle: 'Sometimes, it’s better to hear a voice.', empty: 'A familiar voice is a tap away.', description: 'Your voice and video call history will appear here.', icon: Phone },
  saved: { title: 'Saved', subtitle: 'Keep the things you want to come back to.', empty: 'Keep a little something.', description: 'Star a message or save a shared link to find it here.', icon: Star },
  notes: { title: 'Our notes', subtitle: 'A little room for plans, lists and ideas.', empty: 'Put your heads together.', description: 'Shared notes will live here, ready for either of you to edit.', icon: FileText },
}

function IconButton({ label, children, onClick, active = false, disabled = false }: { label: string; children: ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean }) {
  return <button type="button" className={`icon-button ${active ? 'active' : ''}`} aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>
}

export function Workspace({ profile, preview, onLogout }: { profile: Profile | null; preview: boolean; onLogout: () => Promise<void> }) {
  const [tab, setTab] = useState<Tab>(()=>window.location.pathname==='/settings'?'settings':'chat')
  const [details, setDetails] = useState(false)
  const [search, setSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [draft, setDraft] = useState('')
  const [emoji, setEmoji] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [notification, setNotification] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('nanba-theme') || 'light')
  const [settingSection, setSettingSection] = useState('Appearance')

  const fileInput = useRef<HTMLInputElement>(null)
  const chat = useConversation(profile)
  const calling=useCalling(profile,chat.peer,chat.conversationId)
  const actions = useMessageActions(profile?.id,chat.conversationId,chat.messages.map(message=>message.id).join(','))
  const [reply,setReply] = useState<Message|null>(null)
  const [editing,setEditing] = useState<Message|null>(null)
  const [editText,setEditText] = useState('')
  const [deleting,setDeleting] = useState<Message|null>(null)
  const [viewer,setViewer] = useState<Message|null>(null)
  const [sending,setSending] = useState(false)
  const [progress,setProgress] = useState<number|null>(null)
  const [voice,setVoice] = useState(false)
  const uploadAbort = useRef<AbortController|null>(null)
  const {setViewing}=chat
  useEffect(()=>{setViewing(tab==='chat'&&!calling.call&&!viewer&&!editing&&!deleting&&!search);return()=>setViewing(false)},[tab,setViewing,calling.call,viewer,editing,deleting,search])
  useEffect(()=>()=>uploadAbort.current?.abort(),[])
  useEffect(()=>{const handler=(event:Event)=>setNotification((event as CustomEvent<string>).detail);window.addEventListener('nanba-error',handler);return()=>window.removeEventListener('nanba-error',handler)},[])
  async function sendDraft(){
    if(!profile||!chat.conversationId||sending)return
    if(!draft.trim()&&!attachment)return
    setSending(true)
    try{
      let values:SendMessage={message_type:'text',text_content:draft.trim(),reply_to_message_id:reply?.id||null}
      if(attachment){const controller=new AbortController();uploadAbort.current=controller;setProgress(0);const uploaded=await uploadMedia(attachment,chat.conversationId,profile.id,setProgress,controller.signal,voice);values={...values,...uploaded}}
      await chat.send(values);setDraft('');setAttachment(null);setReply(null);setVoice(false);chat.broadcastTyping(false)
    }catch(caught){setNotification(caught instanceof Error?caught.message:'Unable to send. Please retry.')}
    finally{setSending(false);setProgress(null);uploadAbort.current=null}
  }
  async function handleMessageAction(action:string,message:Message){try{
    if(action==='reply')setReply(message)
    if(action==='copy'){await navigator.clipboard.writeText(message.text_content||message.media_name||'');setNotification('Copied.')}
    if(action==='star')await actions.star(message.id)
    if(action==='pin')await actions.pinMessage(message.id)
    if(action==='link'){await actions.saveLink(message);setNotification('Link saved.')}
    if(action==='hide')await chat.hideMessage(message.id)
    if(action==='edit'){setEditing(message);setEditText(message.text_content||'')}
    if(action==='delete')setDeleting(message)
    if(action==='retry')await chat.send({message_type:message.message_type,text_content:message.text_content,reply_to_message_id:message.reply_to_message_id,media_path:message.media_path,media_name:message.media_name,media_size:message.media_size,media_mime_type:message.media_mime_type},message.id)
  }catch(caught){setNotification(caught instanceof Error?caught.message:'This action failed.')}}
  function handleReact(reaction:string,message:Message){void actions.react(message.id,reaction).catch(caught=>setNotification(caught.message))}
  const activePeerName=chat.peer?.display_name||'Your nanba'

  function startCall(type:'voice'|'video'){void calling.start(type).catch(caught=>setNotification(caught.message))}
  const displayName = profile?.display_name || 'Your account'

  function selectTab(next: Tab) { setTab(next); setSearch(false); setDetails(false) }
  useEffect(() => { const media = window.matchMedia('(prefers-color-scheme: dark)'); const apply = () => document.documentElement.setAttribute('data-theme', theme === 'dark' || (theme === 'system' && media.matches) ? 'dark' : 'light'); apply(); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply) }, [theme])
  function updateTheme(next: string) { setTheme(next); localStorage.setItem('nanba-theme', next) }

  return <main className="workspace">
    <aside className="sidebar"><Brand small /><div className="space-label"><span className="small-dot" /> YOUR PRIVATE SPACE</div><nav aria-label="Main navigation">{navigation.map(item => <button key={item.id} className={`nav-item ${tab === item.id ? 'selected' : ''}`} onClick={() => selectTab(item.id)}><item.icon size={20} strokeWidth={1.6} /><span>{item.title}</span>{tab === item.id && <span className="nav-active-dot" />}</button>)}</nav><div className="sidebar-divider" /><button className={`nav-item ${tab === 'notes' ? 'selected' : ''}`} onClick={() => selectTab('notes')}><FileText size={20} strokeWidth={1.6} /><span>Our notes</span><ArrowUpRight size={15} className="muted-icon" /></button><div className="sidebar-note"><span className="note-spark">✳</span><p>A little space.<br />A lot to talk about.</p><span>JUST THE TWO OF YOU</span></div><div className="sidebar-bottom"><InstallApp/><button className={`nav-item ${tab === 'settings' ? 'selected' : ''}`} onClick={() => selectTab('settings')}><Settings size={20} strokeWidth={1.6} /><span>Settings</span></button><div className="account"><ProfileAvatar path={profile?.avatar_path} name={displayName} className="self-avatar"/><div><strong>{displayName}</strong><span>{profile ? `@${profile.username}` : 'Design preview'}</span></div><IconButton label="Sign out" onClick={() => { void onLogout().catch(() => setNotification('Couldn’t sign out. Check your connection and try again.')) }}><LogOut size={18} /></IconButton></div></div></aside>
    <section className="main-workspace">{preview && <div className="preview-banner"><span>Design preview · No sample messages or simulated connections</span><span>Setup pending</span></div>}
      {tab === 'chat' ? <><header className="conversation-header"><div className="peer-heading"><ProfileAvatar path={chat.peer?.avatar_path} name={activePeerName} className="peer-avatar"/><div><h1>{activePeerName}<span className="name-detail">One conversation. Just us.</span></h1><span className="peer-status"><span className={`status-dot ${chat.online?'online':''}`} /> {chat.typing?'typing…':chat.online?'Online':chat.peer?.last_seen&&chat.peer.preferences?.last_seen!==false?`Last seen ${new Date(chat.peer.last_seen).toLocaleString('en',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`:preview?'Design preview':chat.connection}</span></div></div><div className="header-actions"><IconButton label="Search conversation" onClick={() => setSearch(!search)} active={search}><Search size={20} /></IconButton><span className="action-divider" /><IconButton label="Voice call" onClick={()=>startCall('voice')} disabled={!chat.peer||Boolean(calling.call)}><Phone size={20} /></IconButton><IconButton label="Video call" onClick={()=>startCall('video')} disabled={!chat.peer||Boolean(calling.call)}><Video size={22} /></IconButton><IconButton label="Conversation details" onClick={() => setDetails(!details)} active={details}><Info size={20} /></IconButton></div></header>{search && <div className="search-bar"><Search size={18} /><input autoFocus placeholder="Search this conversation" aria-label="Search this conversation" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} /><span>{searchTerm ? 'Search results below' : 'Messages, files and links'}</span><IconButton label="Close search" onClick={() => setSearch(false)}><X size={18} /></IconButton></div>}{search&&searchTerm&&<SearchResults query={searchTerm} conversationId={chat.conversationId} hidden={chat.hidden} onError={setNotification}/>}<div className="conversation-content"><div className="chat-canvas"><div className="conversation-top-note"><LockKeyhole size={13} /><span>A private conversation, only for the two of you.</span></div>{chat.error&&<div className="connection-error" role="alert">{chat.error}</div>}{chat.messages.length>0?<ChatThread messages={chat.messages} quotes={chat.quotes} userId={profile!.id} reactions={actions.reactions} stars={actions.stars} pin={actions.pin} typing={chat.typing} peerName={activePeerName} hasOlder={chat.hasOlder} loadingOlder={chat.loadingOlder} onOlder={chat.loadOlder} onAction={(action,message)=>{void handleMessageAction(action,message)}} onReact={handleReact} onOpen={setViewer} onError={setNotification}/>:<div className="empty-chat"><div className="empty-illustration" aria-hidden="true"><span className="bubble-outline bubble-left"><i /><i /><i /></span><span className="bubble-outline bubble-right"><i /><i /><i /></span><span className="empty-spark">✳</span></div><span className="eyebrow">THIS IS YOUR SPACE</span><h2>Every good conversation<br />starts with a hello.</h2><p>For the small updates, the late-night thoughts,<br />and everything in between.</p><span className="empty-hello">Make yourself at home <span>↙</span></span></div>}<div className="composer-wrap">{reply&&<div className="reply-draft"><span>Replying to: {reply.text_content||reply.media_name}</span><IconButton label="Cancel reply" onClick={()=>setReply(null)}><X size={16}/></IconButton></div>}{attachment&&<AttachmentPreview file={attachment} voice={voice} onRemove={()=>{setAttachment(null);setVoice(false)}}/>}{progress!==null&&<div className="upload-progress"><progress value={progress} max={100}/><span>{progress}%</span><button onClick={()=>uploadAbort.current?.abort()}>Cancel upload</button></div>}{emoji && <div className="emoji-picker" aria-label="Emoji picker">{['😊', '❤️', '👍', '😂', '🔥', '😮', '🙌', '✨'].map(value => <button key={value} onClick={() => { setDraft(draft + value); setEmoji(false) }}>{value}</button>)}</div>}<div className="composer"><IconButton label="Add emoji" onClick={() => setEmoji(!emoji)} active={emoji}><Smile size={21} /></IconButton><IconButton label="Attach a file" onClick={() => fileInput.current?.click()}><Paperclip size={20} /></IconButton><input ref={fileInput} type="file" className="visually-hidden" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" onChange={event => { const selected = event.target.files?.[0]; if (selected) { try{validateFile(selected);setAttachment(selected);setVoice(false)}catch(caught){setNotification(caught instanceof Error?caught.message:'Invalid file.')}  }; event.target.value = '' }} /><textarea value={draft} onChange={event => {setDraft(event.target.value);chat.broadcastTyping(Boolean(event.target.value))}} onBlur={()=>chat.broadcastTyping(false)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void sendDraft()}}} aria-label="Message" placeholder="Write a little something…" rows={1} maxLength={10000} /><VoiceRecorder disabled={!chat.conversationId||sending} onRecorded={file=>{setAttachment(file);setVoice(true)}} onError={setNotification}/><button className="send-button" aria-label="Send message" disabled={!chat.conversationId||sending||(!draft.trim()&&!attachment)} onClick={()=>{void sendDraft()}}><Send size={18} /></button></div><div className="composer-footer"><span><span className="small-dot" /> {preview ? 'Preview · Messages aren’t sent' : chat.connection}</span><span>Your words, your space.</span></div></div></div>{details && <aside className="details-panel"><div className="panel-heading"><h2>Our space</h2><IconButton label="Close details" onClick={() => setDetails(false)}><X size={19} /></IconButton></div><ProfileAvatar path={chat.peer?.avatar_path} name={activePeerName} className="detail-avatar"/><h3>{activePeerName}</h3><p>One friend. One conversation.</p><div className="details-line" /><button className="detail-link" onClick={() => selectTab('media')}><Image size={18} />Photos & videos<ChevronRight size={17} /></button><button className="detail-link" onClick={() => selectTab('files')}><FileText size={18} />Shared files<ChevronRight size={17} /></button><button className="detail-link" onClick={() => selectTab('saved')}><Pin size={18} />Pinned & saved<ChevronRight size={17} /></button><button className="detail-link" onClick={() => selectTab('notes')}><FileText size={18} />Our notes<ChevronRight size={17} /></button><div className="detail-privacy"><ShieldCheck size={24} /><strong>Only for the two of you</strong><span>Access is limited to your two approved accounts.</span></div></aside>}</div></> : tab === 'settings' ? <><header className="page-header"><div><span className="eyebrow">MAKE YOURSELF AT HOME</span><h1>Settings</h1><p>The little details that make it yours.</p></div></header><div className="settings-layout"><nav className="settings-nav" aria-label="Settings sections">{['Profile', 'Appearance', 'Notifications', 'Privacy', 'Security', 'Storage'].map(value => <button key={value} className={settingSection === value ? 'selected' : ''} onClick={() => setSettingSection(value)}>{value}<ChevronRight size={15} /></button>)}</nav><SettingsPanel section={settingSection} profile={profile} conversationId={chat.conversationId} theme={theme} onTheme={updateTheme} onError={setNotification}/></div></> : <><header className="page-header"><div><span className="eyebrow">YOUR PRIVATE SPACE</span><h1>{sections[tab].title}</h1><p>{sections[tab].subtitle}</p></div><IconButton label="Back to conversation" onClick={() => selectTab('chat')}><ArrowLeft size={21} /></IconButton></header><CollectionPage key={tab} tab={tab} conversationId={chat.conversationId} userId={profile?.id} hidden={chat.hidden} onBack={()=>selectTab('chat')} onCall={startCall} onError={setNotification}/></>}
    </section><nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(item => <button key={item.id} aria-label={item.title} className={tab === item.id ? 'selected' : ''} onClick={() => selectTab(item.id)}><item.icon size={21} /><span>{item.id === 'chat' ? 'Chat' : item.id === 'media' ? 'Media' : item.id === 'files' ? 'Files' : item.title}</span></button>)}<button aria-label="Settings" className={tab === 'settings' ? 'selected' : ''} onClick={() => selectTab('settings')}><Settings size={21} /><span>Settings</span></button></nav>{notification && <div className="toast" role="status"><Info size={18} /><span>{notification}</span><IconButton label="Dismiss notification" onClick={() => setNotification('')}><X size={17} /></IconButton></div>}
  {calling.call&&<CallOverlay calling={calling} userId={profile!.id} peerName={activePeerName} onError={setNotification}/>} {calling.error&&<div className="call-error-toast" role="alert">{calling.error}</div>}{viewer&&<MediaViewer message={viewer} items={chat.messages.filter(message=>['image','video'].includes(message.message_type)&&!message.deleted_for_everyone_at)} onSelect={setViewer} onClose={()=>setViewer(null)} onError={setNotification}/>}{editing&&<Dialog title="Edit message" onClose={()=>setEditing(null)}><textarea className="edit-message-input" value={editText} onChange={event=>setEditText(event.target.value)} maxLength={10000}/><button className="primary" disabled={!editText.trim()} onClick={()=>{void actions.edit(editing,editText).then(()=>setEditing(null)).catch(caught=>setNotification(caught.message))}}>Save changes</button></Dialog>}{deleting&&<Dialog title="Delete for everyone?" onClose={()=>setDeleting(null)}><p className="modal-copy">This message will be removed from your conversation for both of you.</p><button className="danger-button" onClick={()=>{void actions.remove(deleting).then(()=>setDeleting(null)).catch(caught=>setNotification(caught.message))}}>Delete message</button></Dialog>}</main>
}
