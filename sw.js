/* App files only. Never opens, clears or migrates the game's IndexedDB. */
const ASSETS=[{"path":"icons/apple-touch-icon.png","sha256":"b30f196ffdbb969242bd88e449c54df000470b15f8949c9839bbcf2027bf699b","bytes":741},{"path":"icons/icon-192.png","sha256":"be5e04194a0714e2d712295a7bd5c4bfc96cbffcb414e6fffde04644067829df","bytes":761},{"path":"icons/icon-512.png","sha256":"00935a508a6d3cf8400fd7f29019859dfd45489c744e1582cd1163252d9b81bc","bytes":2209},{"path":"index.html","sha256":"7d639894a4e757ffb2392590d9e1582dd1b99b2ec880021328ed97dea224e59f","bytes":8680},{"path":"manifest.webmanifest","sha256":"e1fe05260ad0e208931da789a2852611c3ab268502372cf42756fc1844474212","bytes":574},{"path":"releases/e8b188f735fa8be1/game.audio.position.worklet.js","sha256":"be33985bc7160d6bf9646f259cd86b259cd67b02ccb297ee5c44f8ac84327bc8","bytes":2973},{"path":"releases/e8b188f735fa8be1/game.audio.worklet.js","sha256":"5b476a9c9ce642c0ee4256436d1bc31d9c38f868aca0f9a8e2a57c18d2dec2a3","bytes":7298},{"path":"releases/e8b188f735fa8be1/game.js","sha256":"33c94cb3175f3333b82e2a3be5e8e86f77986f0aa2042b1631f6367a4e5bb6ba","bytes":279815},{"path":"releases/e8b188f735fa8be1/game.pck","sha256":"88b1442337e73b591338ba017987cbed23036547aacc540aedfa35629b949266","bytes":1533000},{"path":"releases/e8b188f735fa8be1/game.png","sha256":"3cb4495c0b98dfbe4b663cbf2b6836473572339beb66d902367893162a70be0e","bytes":21443},{"path":"releases/e8b188f735fa8be1/game.wasm","sha256":"fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0","bytes":39514754}];
const PREFIX='waldpfad:'+new URL(self.registration.scope).pathname+':';
const CACHE=PREFIX+"0.2-e422aed4875ff3a4";
const absolute=path=>new URL(path,self.registration.scope).href;
const known=new Map(ASSETS.map(file=>[absolute(file.path),file]));
async function checked(file){
 const response=await fetch(absolute(file.path),{cache:'no-store',credentials:'same-origin'});
 if(!response.ok)throw Error('Download fehlgeschlagen: '+file.path);
 const bytes=await response.arrayBuffer();
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(digest!==file.sha256)throw Error('Unvollständiges Update: '+file.path);
 const headers=new Headers(response.headers);
 // fetch() has already decoded transport compression; do not label raw bytes gzip/br.
 headers.delete('Content-Encoding');headers.delete('Content-Length');headers.delete('Transfer-Encoding');
 return new Response(bytes,{status:200,headers});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{for(const file of ASSETS)await cache.put(absolute(file.path),await checked(file))}
 catch(error){await caches.delete(CACHE);throw error}
 // No skipWaiting: a running version keeps its matching files until all windows close.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data!=='prepare-offline'||!event.ports[0])return;
 event.waitUntil((async()=>{
  try{
   const cache=await caches.open(CACHE);
   for(const file of ASSETS)if(!await cache.match(absolute(file.path)))await cache.put(absolute(file.path),await checked(file));
   event.ports[0].postMessage({ready:true,version:CACHE});
  }catch(error){event.ports[0].postMessage({ready:false,error:'Offline-Dateien fehlen. Bitte einmal online vollständig laden.'})}
 })());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==new URL(self.registration.scope).origin)return;
 let key=url.href;
 if(event.request.mode==='navigate'&&(url.pathname===new URL(self.registration.scope).pathname||url.pathname.endsWith('/index.html')))key=absolute('index.html');
 const file=known.get(key);if(!file)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),hit=await cache.match(key);if(hit)return hit;
  try{const response=await checked(file);await cache.put(key,response.clone());return response}
  catch(error){return new Response('Offline-Dateien fehlen. Bitte diese Web-App einmal online vollständig laden.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}
 })());
});
