import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3'
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers})
 if(req.method!=='POST')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers})
 const authorization=req.headers.get('Authorization')
 if(!authorization)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers})
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}})
 const{data:{user},error}=await sb.auth.getUser()
 if(error||!user)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers})
 const{data:profile,error:profileError}=await sb.from('profiles').select('id').eq('id',user.id).maybeSingle()
 if(profileError||!profile)return new Response(JSON.stringify({error:'Unapproved account'}),{status:403,headers})
 const apiKey=Deno.env.get('TURN_API_KEY'),endpoint=Deno.env.get('TURN_API_URL')
 if(!apiKey||!endpoint)return new Response(JSON.stringify({configured:false,iceServers:[{urls:'stun:stun.l.google.com:19302'}]}),{headers})
 try{
  const url=new URL(endpoint)
  if(url.protocol!=='https:'||!url.hostname.endsWith('.metered.live')||url.pathname!=='/api/v1/turn/credentials')throw new Error('Invalid relay configuration')
  url.searchParams.set('apiKey',apiKey)
  const response=await fetch(url,{signal:AbortSignal.timeout(8000)})
  if(!response.ok)throw new Error('Relay unavailable')
  const servers=await response.json()
  if(!Array.isArray(servers)||!servers.some((value:{urls?:string|string[]})=>[value.urls].flat().some(url=>typeof url==='string'&&/^turns?:/.test(url))))throw new Error('Relay credentials unavailable')
  return new Response(JSON.stringify({configured:true,iceServers:servers}),{headers})
 }catch{return new Response(JSON.stringify({error:'Unable to obtain relay credentials. Please check relay configuration.'}),{status:503,headers})}
})
