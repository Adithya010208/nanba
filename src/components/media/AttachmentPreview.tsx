import {useEffect,useRef} from 'react'
import {FileText,X} from 'lucide-react'
import {formatBytes} from '../../features/media/media'
export function AttachmentPreview({file,voice,onRemove}:{file:File;voice:boolean;onRemove:()=>void}){
  const root=useRef<HTMLDivElement>(null)
  useEffect(()=>{const value=URL.createObjectURL(file);root.current?.querySelectorAll('[data-preview]').forEach(node=>node.setAttribute('src',value));return()=>URL.revokeObjectURL(value)},[file])
  return <div className="attachment-draft" ref={root}>{file.type.startsWith('image/')?<img className="draft-image" data-preview alt="Attachment preview"/>:file.type.startsWith('video/')?<video className="draft-video" data-preview controls preload="metadata"/>:<FileText size={20}/>}<div><strong>{voice?'Voice note':file.name}</strong><span>{formatBytes(file.size)} · Ready to send</span>{file.type.startsWith('audio/')&&<audio data-preview controls/>}</div><button className="icon-button" aria-label="Remove attachment" onClick={onRemove}><X size={17}/></button></div>
}
