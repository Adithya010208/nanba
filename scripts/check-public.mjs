import fs from 'node:fs'
import {createClient} from '@supabase/supabase-js'
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{const at=line.indexOf('=');return[line.slice(0,at),line.slice(at+1).replace(/^"|"$/g,'')]}))
const sb=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const results=[]
for(const table of ['profiles','messages','calls','shared_notes','saved_links']){const{data,error}=await sb.from(table).select('*').limit(1);results.push({check:`anonymous ${table} access`,pass:Boolean(error)||data?.length===0})}
const response=await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:env.VITE_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(10000)})
const settings=await response.json()
results.push({check:'public signup disabled',pass:settings.disable_signup===true})
const fn=await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/turn-credentials`,{method:'POST',headers:{apikey:env.VITE_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)})
results.push({check:'anonymous relay credential request rejected',pass:fn.status===401||fn.status===403})
console.log(JSON.stringify(results,null,2))
if(results.some(result=>!result.pass))process.exitCode=1
