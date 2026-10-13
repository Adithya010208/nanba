import {ChevronLeft,ChevronRight,Download} from 'lucide-react'
import type {Message} from '../../types/chat'
import {Dialog} from '../ui/Dialog'
import {MediaContent} from './MediaContent'
import {downloadMedia} from '../../features/media/media'
export function MediaViewer({message,items,onSelect,onClose,onError}:{message:Message;items:Message[];onSelect:(message:Message)=>void;onClose:()=>void;onError:(message:string)=>void}){
  const index=items.findIndex(value=>value.id===message.id)
  return <Dialog title={message.media_name||'Shared media'} onClose={onClose} wide><div className="viewer-content"><MediaContent key={message.id} message={message} onError={onError}/></div><div className="viewer-actions"><button className="icon-button" disabled={index<=0} aria-label="Previous media" onClick={()=>onSelect(items[index-1])}><ChevronLeft size={20}/></button><span>{index+1} / {items.length}</span><button className="icon-button" disabled={index<0||index>=items.length-1} aria-label="Next media" onClick={()=>onSelect(items[index+1])}><ChevronRight size={20}/></button><button className="secondary" onClick={()=>{void downloadMedia(message).catch(caught=>onError(caught.message))}}><Download size={16}/>Download</button></div>{message.text_content&&<p className="viewer-caption">{message.text_content}</p>}</Dialog>
}
