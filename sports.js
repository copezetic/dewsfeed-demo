/* Public ESPN feeds, independently refreshed. A failed request keeps last-good data. */
const sportsFeeds = {};
const sportsPages = { football:0, tennis:0, news:0 };
const sportsAPI = 'https://site.api.espn.com/apis/site/v2/sports/';
const sportText = v => typeof v === 'object' ? (v?.displayValue ?? v?.value ?? '—') : (v ?? '—');
const sportDate = (d, time=false) => {
 const date=new Date(d); return Number.isFinite(+date) ? date.toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',...(time?{hour:'numeric',minute:'2-digit'}:{})}) : 'Time TBA';
};
function sportStatus(c,e) { return c?.status?.type || e?.status?.type || {}; }
function footballRows(j) {
 if(!Array.isArray(j.events))throw Error('Invalid scoreboard');
 return j.events.flatMap(e=>{const c=e.competitions?.[0];if(!c)return [];
  const teams=[...(c.competitors||[])].sort((a,b)=>(a.homeAway==='away'?-1:1));
  return [{name:e.name,date:e.date,state:sportStatus(c,e).state,status:sportStatus(c,e).shortDetail,
   teams:teams.map(t=>({name:t.team?.shortDisplayName||t.team?.displayName||'TBA',score:sportText(t.score),rank:t.curatedRank?.current})),
   network:c.broadcasts?.flatMap(b=>b.names||[]).join(' · ')||'',week:j.week?.number}];
 }).sort((a,b)=>({in:0,pre:1,post:2}[a.state]??3)-({in:0,pre:1,post:2}[b.state]??3)||
   ((a.state==='in'?0:Math.min(...a.teams.map(t=>t.rank||99)))-(b.state==='in'?0:Math.min(...b.teams.map(t=>t.rank||99))))||new Date(a.date)-new Date(b.date));
}
function golfRows(j) {
 if(!Array.isArray(j.events))throw Error('Invalid golf feed');
 return j.events.map(e=>{const c=e.competitions?.[0];return {name:e.name,date:e.date,end:e.endDate,state:sportStatus(c,e).state,status:sportStatus(c,e).shortDetail||sportStatus(c,e).description,
  players:[...(c?.competitors||[])].sort((a,b)=>(a.order??999)-(b.order??999)).slice(0,6).map((p,i,all)=>{const score=sportText(p.score),valid=/^[+-]?\d+$|^E$/.test(String(score)),first=all.findIndex(a=>sportText(a.score)===score),tied=valid&&all.filter(a=>sportText(a.score)===score).length>1;return {name:p.athlete?.displayName||p.athlete?.fullName||'Player',score,rank:valid?(tied?'T':'')+(first+1):'—'};})};});
}
function tennisRows(j) {
 if(!Array.isArray(j.events))throw Error('Invalid tennis feed');
 return j.events.flatMap(e=>(e.groupings||[{grouping:{displayName:'Tennis'},competitions:e.competitions||[]}]).filter(g=>!/double/i.test(g.grouping?.displayName||'')).flatMap(g=>(g.competitions||[]).map(c=>({
  name:e.name,date:c.date||e.date,state:sportStatus(c,e).state,status:sportStatus(c,e).shortDetail,round:c.round?.displayName||'',
  players:(c.competitors||[]).map(p=>({name:p.athlete?.displayName||p.athlete?.fullName||p.team?.displayName||'TBA',winner:p.winner,
   sets:(p.linescores||[]).map(s=>sportText(s.displayValue??s.value)).join('  ')}))
 })))).filter(r=>r.state==='in'||(r.state==='post'?new Date(r.date)>Date.now()-2*86400000:new Date(r.date)>Date.now()-86400000)).sort((a,b)=>({in:0,pre:1,post:2}[a.state]??3)-({in:0,pre:1,post:2}[b.state]??3)||(a.state==='post'?new Date(b.date)-new Date(a.date):new Date(a.date)-new Date(b.date)));
}
function sportNews(j) {
 if(!Array.isArray(j.articles))throw Error('Invalid news feed');
 return j.articles.filter(a=>a.headline).map(a=>({title:a.headline,date:a.published})).slice(0,6);
}
async function fetchSportsDesk() {
 const specs=[['football','football/college-football/scoreboard?groups=80&limit=100',footballRows],['pga','golf/pga/scoreboard',golfRows],['lpga','golf/lpga/scoreboard',golfRows],['atp','tennis/atp/scoreboard',tennisRows],['wta','tennis/wta/scoreboard',tennisRows],['newsFootball','football/college-football/news',sportNews],['newsGolf','golf/pga/news',sportNews],['newsTennis','tennis/atp/news',sportNews],['newsNFL','football/nfl/news',sportNews]];
 // Three requests at a time keeps the Pi proxy responsive to other slides.
 for(let i=0;i<specs.length;i+=3)await Promise.allSettled(specs.slice(i,i+3).map(async([key,path,parse])=>{
  const feed=sportsFeeds[key] ||= {rows:null,updated:0,error:false};
  try {const url=sportsAPI+path;const r=await fetch(PROXY_OK?viaProxy(url):url,{signal:AbortSignal.timeout(14000)});
   if(!r.ok)throw Error(r.status);const rows=parse(await r.json());feed.rows=rows;feed.updated=Date.now();feed.error=false;
  }catch(e){feed.error=true;}
 }));
}
function sportStamp(key) {
 const f=sportsFeeds[key];if(!f?.updated)return f?.error?'Feed unavailable · retrying':'Connecting to ESPN';
 const mins=Math.max(0,Math.floor((Date.now()-f.updated)/60000));
 return `${f.error?'Last good update':mins>10?'Older update':'Updated'} ${mins<1?'just now':mins+'m ago'}`;
}
function sportEmpty(key) {return `<p class="sports-empty">${sportsFeeds[key]?.rows?'No events returned by this feed. The next refresh may include the next event.':sportsFeeds[key]?.error?'This source is temporarily unavailable. We’ll retry automatically.':'Fetching the latest schedule and results…'}</p>`;}
function sportSlice(rows,key,n) {const pages=Math.max(1,Math.ceil(rows.length/n)),p=sportsPages[key]%pages;return {rows:rows.slice(p*n,p*n+n),label:`${p+1} / ${pages}`};}
function sportBadge(r){return r.state==='in'?`<b class="sports-live">LIVE · ${esc(r.status||'In progress')}</b>`:r.state==='post'?'<b>FINAL</b>':`<b>${esc(sportDate(r.date,true))} ET</b>`;}
function sportsArt(kind) {
 const field=kind==='football'?`<rect x="70" y="55" width="620" height="330" rx="8"/>${Array.from({length:11},(_,i)=>`<path d="M${90+i*58} 55v330"/>`).join('')}<path d="M70 220h620"/><ellipse cx="380" cy="220" rx="55" ry="31"/><path d="M350 220h60m-45-10v20m15-20v20m15-20v20"/>`:kind==='tennis'?'<rect x="70" y="55" width="620" height="330"/><path d="M70 90h620M70 350h620M380 55v330M225 90v260M535 90v260M225 220h310"/><circle cx="590" cy="160" r="21"/>':'<path d="M100 385Q10 235 180 180T310 65Q550-45 650 150T490 375Z"/><path d="M295 305q-80-35-35-100t125-120q115 5 120 90t-90 140Z"/><path d="M405 160V62l70 23-70 23"/><ellipse cx="405" cy="163" rx="15" ry="5"/>';
 return `<svg class="sports-art" viewBox="0 0 760 440" aria-hidden="true">${kind==='news'?'<circle cx="380" cy="220" r="160"/><ellipse cx="380" cy="220" rx="90" ry="160"/><path d="M220 220h320M245 140h270M245 300h270M380 60v320"/>':field}</svg>`;
}
function sportsShell(kind,title,subtitle,body,foot) {return `<section class="sports-desk sports-${kind}"><header><div><p>THE DEWS SPORTS DESK</p><h2>${title}</h2><span>${esc(subtitle)}</span></div>${sportsArt(kind)}</header><div class="sports-content">${body}</div><footer>ESPN · TIMES EASTERN <span>${esc(foot)}</span></footer></section>`;}
function footballHTML(){const f=sportsFeeds.football,view=sportSlice(f?.rows||[],'football',6);return sportsShell('football','Saturday, all week.',`COLLEGE FOOTBALL · FBS${f?.rows?.[0]?.week?' · WEEK '+f.rows[0].week:''} · LIVE & RANKED FIRST`,view.rows.length?`<div class="sports-games">${view.rows.map(r=>`<article><div class="sports-meta">${sportBadge(r)}<span>${esc(r.network)}</span></div>${r.teams.map(t=>`<div class="sports-team"><span>${t.rank&&t.rank<=25?`<small>${t.rank}</small>`:''}${esc(t.name)}</span><strong>${r.state==='pre'?'—':esc(t.score)}</strong></div>`).join('')}</article>`).join('')}</div>`:sportEmpty('football'),`${sportStamp('football')} · BOARD ${view.label} · More games next rotation`);}
function golfHTML(){return sportsShell('golf','Inside the ropes.','PGA TOUR + LPGA · LEADERS, RESULTS & NEXT EVENTS',`<div class="sports-columns">${['pga','lpga'].map(key=>{const r=sportsFeeds[key]?.rows?.[0];return `<article><div class="sports-meta"><b>${key.toUpperCase()}</b><span>${esc(sportStamp(key))}</span></div>${r?`<h3>${esc(r.name)}</h3><p class="sports-date">${esc(sportDate(r.date))} — ${esc(sportDate(r.end||r.date))} · ${esc(r.state==='pre'?'UPCOMING':r.status||'Tournament')}</p>${r.players.length?r.players.map(p=>`<div class="sports-player"><small>${esc(p.rank)}</small><span>${esc(p.name)}</span><strong>${esc(p.score)}</strong></div>`).join(''):'<p class="sports-empty">Field / tee times have not been published by this feed.</p>'}`:sportEmpty(key)}</article>`;}).join('')}</div>`,'Scores relative to par · Final results remain until the next event');}
function tennisHTML(){return sportsShell('tennis','On the court.','ATP + WTA · TOUR SINGLES · LIVE, UPCOMING & RECENT RESULTS',`<div class="sports-columns">${['atp','wta'].map(key=>{const view=sportSlice(sportsFeeds[key]?.rows||[],'tennis',3);return `<article><div class="sports-meta"><b>${key.toUpperCase()} · BOARD ${view.label}</b><span>${esc(sportStamp(key))}</span></div>${view.rows.length?view.rows.map(r=>`<div class="sports-match"><div class="sports-meta">${sportBadge(r)}</div><p>${esc(r.name)} · ${esc(r.round)}${r.state==='post'?' · '+esc(sportDate(r.date)):''}</p>${r.players.map(p=>`<div class="sports-team ${p.winner?'sports-winner':''}"><span>${esc(p.name)}</span><strong>${esc(p.sets||'—')}</strong></div>`).join('')}</div>`).join(''):sportEmpty(key)}</article>`;}).join('')}</div>`,'Set scores shown when available · More matches next rotation');}
function newsHTML(){const keys=['newsFootball','newsGolf','newsTennis','newsNFL'],labels=['COLLEGE FOOTBALL','GOLF','TENNIS','NFL'];let rows=[];
 for(let i=0;i<6;i++)keys.forEach((key,n)=>{const a=sportsFeeds[key]?.rows?.[i];if(a)rows.push({...a,key,label:labels[n]});});
 rows=rows.filter((r,i)=>rows.findIndex(a=>a.title===r.title)===i);const view=sportSlice(rows,'news',4);
 return sportsShell('news','Beyond the score.','SPORTS WIRE · FOOTBALL, GOLF & TENNIS',view.rows.length?`<div class="sports-news">${view.rows.map((r,i)=>`<article><small>0${i+1}</small><div><div class="sports-meta"><b>${r.label}</b><span>${esc(sportDate(r.date))} · ${esc(sportStamp(r.key))}</span></div><h3>${esc(r.title)}</h3></div></article>`).join('')}</div>`:sportEmpty('newsFootball'),`WIRE ${view.label} · Different headlines next rotation`);
}
const sportsBuildOriginal=buildSpots;
buildSpots=function(){sportsBuildOriginal();const pages=[['COLLEGE FOOTBALL',footballHTML,'football'],['GOLF CLUBHOUSE',golfHTML],['TENNIS TOUR',tennisHTML,'tennis'],['SPORTS WIRE',newsHTML,'news']].map(([k,render,key])=>({k,html:true,acc:'var(--amber)',dur:18000,body:render(),sub:'',after:()=>{if(key)sportsPages[key]++;}}));const at=spots.findIndex(s=>s.k==='SPORTS DESK');spots.splice(at<0?Math.min(4,spots.length):at+1,0,...pages);};
