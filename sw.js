// Bíblia Comparada — interface e textos em caches separados.
const SHELL_CACHE='biblia-comparada-shell-v25';
const BIBLE_CACHE='biblia-comparada-bibles-v25';
const SHELL=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 // Migra traduções já armazenadas por versões anteriores antes de excluir caches antigos.
 const bible=await caches.open(BIBLE_CACHE);
 for(const key of keys.filter(k=>k.startsWith('biblia-comparada-')&&k!==SHELL_CACHE&&k!==BIBLE_CACHE)){
  const old=await caches.open(key);
  for(const req of await old.keys()){if(/\/data\/[^/]+\.json$/i.test(new URL(req.url).pathname)&&!(await bible.match(req))) {const res=await old.match(req);if(res)await bible.put(req,res);}}
 }
 await Promise.all(keys.filter(k=>k.startsWith('biblia-comparada-')&&k!==SHELL_CACHE&&k!==BIBLE_CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==location.origin)return;
 if(/\/data\/[^/]+\.json$/i.test(url.pathname)){
  event.respondWith((async()=>{
   const cached=await caches.match(req,{ignoreSearch:true});
   if(cached)return cached;
   // Apenas ARC é armazenada automaticamente; demais traduções somente após download explícito no aplicativo.
   const response=await fetch(req);
   if(response.ok&&/\/data\/ARC\.json$/i.test(url.pathname))await (await caches.open(BIBLE_CACHE)).put(req,response.clone());
   return response;
  })());return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(SHELL_CACHE);
  try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;}
  catch(e){return await cache.match(req,{ignoreSearch:true})||await cache.match('./index.html')||Response.error();}
 })());
});
