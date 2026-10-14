import {useRef} from 'react'
import type {SyntheticEvent} from 'react'
import {Download,FileText,Maximize2} from 'lucide-react'
import type {Message} from '../../types/chat'
import {downloadMedia,formatBytes,useMediaUrl} from '../../features/media/media'
export function MediaContent({message,onOpen,onError}:{message:Message;onOpen?:(message:Message)=>void;onError:(error:string)=>void}){
  const{url,error,renew}=useMediaUrl(message.media_path,!['video','audio','voice'].includes(message.message_type))
  const resume=useRef({time:0,playing:false,lastRetry:0})
  function retry(event:SyntheticEvent<HTMLMediaElement>){if(Date.now()-resume.current.lastRetry<5000){onError('This media format cannot be played by your browser. You can still download the file.');return}resume.current={time:event.currentTarget.currentTime,playing:!event.currentTarget.paused,lastRetry:Date.now()};renew()}
  function restore(event:SyntheticEvent<HTMLMediaElement>){if(resume.current.time>0)event.currentTarget.currentTime=resume.current.time;if(resume.current.playing)void event.currentTarget.play().catch(()=>onError('Tap play to resume the attachment.'))}
  if(error)return<p className="attachment-error">{error}</p>
  if(!url)return<span className="media-loading">Loading attachment…</span>
  if(message.message_type==='image')return<button className="image-message" onClick={()=>onOpen?.(message)} aria-label={`Open ${message.media_name}`}><img src={url} alt={message.text_content||message.media_name||'Shared image'} loading="lazy"/></button>
  if(message.message_type==='video')return<div className="video-message"><video src={url} controls preload="metadata" playsInline onError={retry} onLoadedMetadata={restore}/><button className="icon-button" aria-label="Open video viewer" onClick={()=>onOpen?.(message)}><Maximize2 size={16}/></button></div>
  if(message.message_type==='audio'||message.message_type==='voice')return<div className="audio-message"><span>{message.message_type==='voice'?'Voice note':message.media_name}</span><audio src={url} controls preload="metadata" onError={retry} onLoadedMetadata={restore}/><button className="icon-button" aria-label="Download audio" onClick={()=>{void downloadMedia(message).catch(caught=>onError(caught.message))}}><Download size={15}/></button></div>
  return<div className="document-message"><FileText size={28}/><div><strong>{message.media_name}</strong><span>{formatBytes(message.media_size)}</span></div><button className="icon-button" aria-label={`Download ${message.media_name}`} onClick={()=>{void downloadMedia(message).catch(caught=>onError(caught.message))}}><Download size={18}/></button></div>
}
