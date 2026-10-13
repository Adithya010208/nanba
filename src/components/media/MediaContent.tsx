import {Download,FileText,Maximize2} from 'lucide-react'
import type {Message} from '../../types/chat'
import {downloadMedia,formatBytes,useMediaUrl} from '../../features/media/media'
export function MediaContent({message,onOpen,onError}:{message:Message;onOpen?:(message:Message)=>void;onError:(error:string)=>void}){
  const{url,error}=useMediaUrl(message.media_path)
  if(error)return<p className="attachment-error">{error}</p>
  if(!url)return<span className="media-loading">Loading attachment…</span>
  if(message.message_type==='image')return<button className="image-message" onClick={()=>onOpen?.(message)} aria-label={`Open ${message.media_name}`}><img src={url} alt={message.text_content||message.media_name||'Shared image'} loading="lazy"/></button>
  if(message.message_type==='video')return<div className="video-message"><video src={url} controls preload="metadata" playsInline/><button className="icon-button" aria-label="Open video viewer" onClick={()=>onOpen?.(message)}><Maximize2 size={16}/></button></div>
  if(message.message_type==='audio'||message.message_type==='voice')return<div className="audio-message"><span>{message.message_type==='voice'?'Voice note':message.media_name}</span><audio src={url} controls preload="metadata"/></div>
  return<div className="document-message"><FileText size={28}/><div><strong>{message.media_name}</strong><span>{formatBytes(message.media_size)}</span></div><button className="icon-button" aria-label={`Download ${message.media_name}`} onClick={()=>{void downloadMedia(message).catch(caught=>onError(caught.message))}}><Download size={18}/></button></div>
}
