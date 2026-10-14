/* Cache public app resources only. Never cache Supabase responses, private media, or messages. */
const CACHE='nanba-shell-v1'
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/favicon.svg','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'])))})
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nanba-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))})
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url)
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));return}
 if(url.pathname.startsWith('/assets/')||url.pathname.startsWith('/icons/'))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response})))
})
