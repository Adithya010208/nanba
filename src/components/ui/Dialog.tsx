import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
export function Dialog({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close()},[])
  return <dialog ref={dialog} className={`modal ${wide?'wide':''}`} aria-label={title} onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose()}}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19}/></button></div>{children}</dialog>
}
