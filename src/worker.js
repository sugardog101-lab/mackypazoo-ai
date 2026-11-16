import html from './index.html';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const xmlText=(s,tag)=>{const m=s.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'):''};
const validId=s=>/^[\w-]{11}$/.test(s||'');
async function videos(env){
 const handle=(env.YOUTUBE_HANDLE||'MACKYPAZOO').replace(/^@/,'');
 let channelId=env.YOUTUBE_CHANNEL_ID||'';
 if(!channelId){const p=await fetch(`https://www.youtube.com/@${encodeURIComponent(handle)}/videos`,{headers:{'user-agent':'Mozilla/5.0 (compatible; MACKYPAZOOFeed/1.0)'}});const t=await p.text();channelId=t.match(/"channelId":"(UC[\w-]{22})"/)?.[1]||t.match(/"externalId":"(UC[\w-]{22})"/)?.[1]||t.match(/https:\/\/www.youtube.com\/feeds\/videos.xml\?channel_id=(UC[\w-]{22})/)?.[1]||'';}
 if(!/^UC[\w-]{22}$/.test(channelId))throw new Error('チャンネルIDを取得できません。wrangler.toml に YOUTUBE_CHANNEL_ID を設定してください。');
 const r=await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);if(!r.ok)throw new Error('YouTubeフィードを取得できません（'+r.status+'）');const xml=await r.text();const entries=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(x=>{const s=x[1];return {id:xmlText(s,'yt:videoId'),title:xmlText(s,'title'),published:xmlText(s,'published'),thumbnail:''}}).filter(x=>validId(x.id));return {videos:entries,channelId};
}
export default {async fetch(req,env,ctx){
 const url=new URL(req.url);if(url.pathname==='/'||url.pathname==='/index.html')return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff'}});
 if(url.pathname==='/api/videos'&&req.method==='GET'){
 try{const key=new Request('https://cache.internal.local/videos');const cache=caches.default;const old=await cache.match(key);if(old)return old;const result=json(await videos(env));const resp=new Response(result.body,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=600'}});ctx.waitUntil(cache.put(key,resp.clone()));return resp;}catch(e){return json({error:String(e.message)},502)} }
 return json({error:'Not found'},404);
 }};
