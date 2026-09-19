const CACHE="tku-timetable-v6-share-cache";
const SHARE_CACHE="tku-timetable-v6-share-inbox";
const ASSETS=["./","./index.html","./style.css","./app.js","./manifest.json","./capture.html","./share.html"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>![CACHE,SHARE_CACHE].includes(k)).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

async function storeShareRequest(request){
  const form=await request.formData();
  const title=form.get("title");
  const text=form.get("text");
  const url=form.get("url");
  let file=null;
  for(const [key,value] of form.entries()){
    if(value instanceof File && value.size>0){
      file={field:key,name:value.name,type:value.type,size:value.size,text:await value.text()};
      break;
    }
  }
  const payload={
    type:"TKU_TIMETABLE_SHARE",
    version:1,
    receivedAt:new Date().toISOString(),
    title:typeof title==="string"?title:"",
    text:typeof text==="string"?text:"",
    url:typeof url==="string"?url:"",
    file
  };
  const cache=await caches.open(SHARE_CACHE);
  await cache.put(new Request("__share_inbox__"),new Response(JSON.stringify(payload),{headers:{"Content-Type":"application/json"}}));
  return Response.redirect(new URL("./share.html?received=1",self.location.href).href,303);
}

self.addEventListener("fetch",event=>{
  const u=new URL(event.request.url);
  if(u.origin!==self.location.origin)return;

  const sharePath=new URL("./share.html",self.location.href).pathname;
  if(event.request.method==="POST" && u.pathname===sharePath){
    event.respondWith(storeShareRequest(event.request));
    return;
  }

  if(event.request.method==="GET" && u.pathname.endsWith("/__share_inbox__")){
    event.respondWith((async()=>{
      const cache=await caches.open(SHARE_CACHE);
      return (await cache.match(new Request("__share_inbox__"))) || new Response("",{status:204});
    })());
    return;
  }

  if(event.request.method!=="GET")return;
  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(resp=>{
      const copy=resp.clone();
      caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});
      return resp;
    }).catch(()=>cached))
  );
});
