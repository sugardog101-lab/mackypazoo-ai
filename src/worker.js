import html from './index.html';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const xmlText=(s,tag)=>{const m=s.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'):''};
const validId=s=>/^[\w-]{11}$/.test(s||'');
async function channelIdFor(env){
 let id=env.YOUTUBE_CHANNEL_ID||'';
 if(!id){const handle=(env.YOUTUBE_HANDLE||'MACKYPAZOO').replace(/^@/,'');const p=await fetch(`https://www.youtube.com/@${encodeURIComponent(handle)}/videos`,{headers:{'user-agent':'Mozilla/5.0 (compatible; MACKYPAZOOFeed/1.0)'}});const t=await p.text();id=t.match(/"channelId":"(UC[\w-]{22})"/)?.[1]||t.match(/"externalId":"(UC[\w-]{22})"/)?.[1]||'';}
 if(!/^UC[\w-]{22}$/.test(id))throw new Error('チャンネルIDが不明です。YOUTUBE_CHANNEL_ID を設定してください。');return id;
}
async function videos(env,pageToken=''){
 const id=await channelIdFor(env);const apiKey=env.YOUTUBE_API_KEY;
 if(apiKey){
  // Search API は100 quota units/回。uploads playlist は1 unit/回で全件ページング可能。
  const chUrl=new URL('https://www.googleapis.com/youtube/v3/channels');chUrl.search=new URLSearchParams({part:'contentDetails',id,key:apiKey}).toString();
  const ch=await fetch(chUrl);const cd=await ch.json();if(!ch.ok)throw new Error(cd.error?.message||'YouTube API チャンネル取得エラー');
  const playlist=cd.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;if(!playlist)throw new Error('アップロード動画一覧を取得できません');
  const p=new URL('https://www.googleapis.com/youtube/v3/playlistItems');p.search=new URLSearchParams({part:'snippet,contentDetails',playlistId:playlist,maxResults:'50',key:apiKey,...(pageToken?{pageToken}:{})}).toString();
  const r=await fetch(p);const data=await r.json();if(!r.ok)throw new Error(data.error?.message||'YouTube API 動画取得エラー');
  const list=(data.items||[]).map(x=>({id:x.contentDetails?.videoId||x.snippet?.resourceId?.videoId,title:x.snippet?.title||'',published:x.contentDetails?.videoPublishedAt||x.snippet?.publishedAt})).filter(x=>validId(x.id)&&x.title!=='Private video'&&x.title!=='Deleted video');
  return {videos:list,nextPageToken:data.nextPageToken||'',mode:'api',channelId:id};
 }
 if(pageToken) return {videos:[],nextPageToken:'',mode:'rss',channelId:id};
 const r=await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);if(!r.ok)throw new Error('YouTubeフィード取得エラー '+r.status);const xml=await r.text();
 const list=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(x=>({id:xmlText(x[1],'yt:videoId'),title:xmlText(x[1],'title'),published:xmlText(x[1],'published')})).filter(x=>validId(x.id));return {videos:list,nextPageToken:'',mode:'rss',channelId:id};
}
export default {async fetch(req,env,ctx){const url=new URL(req.url);
 if(url.pathname==='/'||url.pathname==='/index.html')return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff'}});
 if(url.pathname==='/api/videos'&&req.method==='GET'){
  try{const pageToken=url.searchParams.get('pageToken')||'';if(pageToken&&!/^[\w-]{1,200}$/.test(pageToken))return json({error:'invalid page token'},400);
   const cache=caches.default;const key=new Request('https://cache.internal.local/videos?token='+encodeURIComponent(pageToken));const old=await cache.match(key);if(old)return old;
   const result=json(await videos(env,pageToken));const resp=new Response(result.body,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=600'}});ctx.waitUntil(cache.put(key,resp.clone()));return resp;
  }catch(e){return json({error:String(e.message)},502)}
 }return json({error:'Not found'},404);
}};
