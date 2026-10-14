import {useEffect,useState} from 'react'
import {check,client} from '../../lib/supabase'
import type {Message} from '../../types/chat'
import {validateFileSignature} from './validateSignature'
const extensionTypes:Record<string,string[]>={jpg:['image/jpeg'],jpeg:['image/jpeg'],png:['image/png'],webp:['image/webp'],gif:['image/gif'],mp4:['video/mp4'],webm:['video/webm','audio/webm'],mov:['video/quicktime'],mp3:['audio/mpeg'],wav:['audio/wav','audio/x-wav'],ogg:['audio/ogg'],m4a:['audio/mp4','audio/x-m4a'],pdf:['application/pdf'],txt:['text/plain'],zip:['application/zip','application/x-zip-compressed'],doc:['application/msword'],docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],ppt:['application/vnd.ms-powerpoint'],pptx:['application/vnd.openxmlformats-officedocument.presentationml.presentation'],xls:['application/vnd.ms-excel'],xlsx:['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']}
export function validateFile(file:File,voice=false):Message['message_type']{
  const ext=file.name.split('.').at(-1)?.toLowerCase()||''
  const mime=file.type.split(';')[0]
  if(!extensionTypes[ext]?.includes(mime))throw new Error('This file type isn’t supported, or its extension and format don’t match.')
  if(!file.size)throw new Error('This file is empty.')
  const type=voice?'voice':mime.startsWith('image/')?'image':mime.startsWith('video/')?'video':mime.startsWith('audio/')?'audio':'document'
  const max=type==='image'?20:50
  if(file.size>max*1024*1024)throw new Error(`${type==='image'?'Images':type==='video'?'Videos':'Files'} must be smaller than ${max} MB.`)
  return type
}
export async function uploadMedia(file:File,conversationId:string,userId:string,onProgress:(value:number)=>void,signal:AbortSignal,voice=false){
  const type=validateFile(file,voice)
  await validateFileSignature(file)
  const folder=type==='voice'?'voice-notes':`${type}s`
  const path=`${conversationId}/${userId}/${folder}/${crypto.randomUUID()}.${file.name.split('.').at(-1)?.toLowerCase()}`
  const{data,error}=await client().auth.getSession();check(error);if(!data.session)throw new Error('Please sign in again.')
  await new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();const abort=()=>xhr.abort();signal.addEventListener('abort',abort,{once:true});xhr.open('POST',`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/chat-media/${path}`);xhr.setRequestHeader('Authorization',`Bearer ${data.session!.access_token}`);xhr.setRequestHeader('apikey',import.meta.env.VITE_SUPABASE_ANON_KEY);xhr.setRequestHeader('Content-Type',file.type.split(';')[0]);xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.round(event.loaded/event.total*100))};xhr.onload=()=>{signal.removeEventListener('abort',abort);if(xhr.status>=200&&xhr.status<300)resolve();else reject(new Error(xhr.status===413?'The file is too large.':'Upload failed. Please retry.'))};xhr.onerror=()=>{signal.removeEventListener('abort',abort);reject(new Error('Upload interrupted. Check your connection and retry.'))};xhr.onabort=()=>{signal.removeEventListener('abort',abort);reject(new DOMException('Upload cancelled','AbortError'))};if(signal.aborted){reject(new DOMException('Upload cancelled','AbortError'));return}xhr.send(file)})
  return{message_type:type,media_path:path,media_name:file.name,media_size:file.size,media_mime_type:file.type.split(';')[0]}
}
export function useMediaUrl(path:string|null,autoRefresh=true){
  const[url,setUrl]=useState('');const[error,setError]=useState('');const[revision,setRevision]=useState(0)
  useEffect(()=>{if(!path)return;let alive=true;async function load(){const{data,error:signedError}=await client().storage.from('chat-media').createSignedUrl(path!,autoRefresh?120:3600);if(!alive)return;if(signedError){setError('This attachment is unavailable.');return}setUrl(data.signedUrl);setError('')};void load();const timer=autoRefresh?setInterval(()=>{void load()},90000):undefined;return()=>{alive=false;if(timer)clearInterval(timer)}},[path,autoRefresh,revision]);return{url,error,renew:()=>setRevision(value=>value+1)}
}
export async function downloadMedia(message:Message){if(!message.media_path)return;const{data,error}=await client().storage.from('chat-media').download(message.media_path);check(error);const url=URL.createObjectURL(data!);const anchor=document.createElement('a');anchor.href=url;anchor.download=message.media_name||'attachment';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function formatBytes(value:number|null){if(!value)return'0 B';if(value<1024)return`${value} B`;if(value<1024*1024)return`${(value/1024).toFixed(1)} KB`;return`${(value/1024/1024).toFixed(1)} MB`}
