/* Shared situation-desk presentation. Source adapters remain in index.html. */
const DESK_PUBLIC = document.documentElement.dataset.edition === 'public';
const deskState={paused:false,group:'all',current:'',generation:0,preloads:new Map(),lastSuccess:0,requests:0,peakRequests:0,remaining:18000,deadline:0,progress:null};
const deskGroups={markets:/MARKET|RATE DESK|FED WATCH|BANKING|RIA|M&A/,weather:/WEATHER|RADAR|7-DAY|AURORA WATCH/,world:/GLOBAL|EARTHQUAKE|SPACE OPS|SCIENCE|FLIGHTS|WORLD CLOCK/};
const deskIcon=(kind)=>{
 const paths={market:'<path d="M3 3v18h18M5 16l5-6 4 3 6-9m-5 0h5v5"/>',bitcoin:'<path d="M9 3v18m5-18v3m0 12v3M6 6h9a3 3 0 0 1 0 6H8m0 0h8a3 3 0 0 1 0 6H6"/>',bank:'<path d="M3 9h18L12 3 3 9zm2 3v7m5-7v7m4-7v7m5-7v7M3 22h18"/>',bond:'<path d="M5 2h10l4 4v16H5zm10 0v5h4M8 11h8m-8 4h8m-8 4h6"/>',flight:'<path d="m3 11 7 2 7 8 2-1-4-9 6-6c2-3 0-4-2-2l-7 6-9-4-2 2 7 6-3 4-2-1-1 1 3 3 2-1-1-2 4-3"/>'};
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
};
const deskArrow=(right)=>`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${right?'M5 2l6 6-6 6':'M11 2L5 8l6 6'}"/></svg>`;
$('wordmark').insertAdjacentHTML('afterend','<div id="deskBrand">DEWS <b>FEED</b><small>OFFICE DESK</small></div>');
$('topbar').insertAdjacentHTML('afterend',`<nav id="deskNav" aria-label="Desk pages"><button data-desk-group="overview" aria-pressed="true">OVERVIEW</button><button data-desk-group="markets" aria-pressed="false">MARKETS</button><button data-desk-group="weather" aria-pressed="false">WEATHER</button><button data-desk-group="world" aria-pressed="false">WORLD</button><select id="deskPages" aria-label="All pages"><option value="">ALL PAGES</option></select><div id="deskTransport"><button id="deskPrevious" aria-label="Previous page">${deskArrow(false)} PREVIOUS</button><button id="deskPause" aria-pressed="false">Ⅱ PAUSE</button><button id="deskNext" aria-label="Next page">NEXT ${deskArrow(true)}</button></div></nav>`);
$('databar').insertAdjacentHTML('beforebegin','<div id="deskStatus"><span id="deskPosition"><b>01</b> / OVERVIEW</span><span id="deskMode"></span></div>');
$('deskMode').textContent=DESK_PUBLIC?'PUBLIC PREVIEW':'OFFICE DISPLAY';
$('dataInner').textContent='Waiting for market data';$('newsInner').textContent='Headlines appear when sources are available';
function deskOverview(){
 const number=x=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:0}):'—';
 const rows=[['market','S&P 500',number(S.spx?.cur)],['bitcoin','BITCOIN',S.btc?'$'+number(S.btc.usd):'—'],['bank','SOFR',S.rates.sofr||'—'],['bond','US 10-YEAR',S.rates.t10||'—'],['flight','FLIGHTS',flightsFresh()?String(S.flights.length):'—']];
 const hasData=rows.some(r=>r[2]!=='—');
 return `<div class="desk-overview"><section class="desk-editorial"><div class="desk-photo"><img src="desk-waterfront.webp" alt="Boats and reflections at Greenwich Harbor, Connecticut, photographed by Carol M. Highsmith in 2011" width="1920" height="1280" fetchpriority="high" decoding="async"><small>GREENWICH HARBOR · ARCHIVE · <a href="image-credits.html" target="_blank" rel="noopener">PHOTO CREDIT</a></small></div><h1>SITUATION<br>OVERVIEW</h1><p>MARKETS <span>·</span> WEATHER <span>·</span> WORLD</p></section><section class="desk-watch"><h2>WATCH DESK</h2><dl>${rows.map(([i,k,v])=>`<div><dt>${deskIcon(i)}${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p>${hasData?'Latest available readings · source timing varies':'Awaiting source updates'}</p></section></div>`;
}
vestaboardHTML=function(q,plain=false){return `<section class="desk-quote"><span class="desk-quote-rule"></span><blockquote>${esc(q.q)}</blockquote><p>${plain?'':'— '}${esc(q.a)}</p></section>`;};
animateVestaboard=function(){stopVestaboard();};
const deskBuildOriginal=buildSpots;
buildSpots=function(){
 deskBuildOriginal();
 const substantive=spots.filter(s=>!['UP NEXT','SIGNAL ACQUIRED'].includes(s.k)).map(s=>({...s,dur:Math.min(s.dur||15000,18000)}));
 spots.splice(0,spots.length,{k:'SITUATION OVERVIEW',acc:'var(--amber)',html:true,dur:18000,body:deskOverview(),sub:''},...substantive);
 const menu=$('deskPages'),key=spots.map(s=>s.k).join('|');
 if(menu.dataset.options!==key){menu.dataset.options=key;menu.innerHTML='<option value="">ALL PAGES</option>'+spots.map(s=>`<option value="${esc(s.k)}">${esc(s.k)}</option>`).join('');}
 if(deskState.group!=='all'&&deskState.group!=='overview'){
  const matching=spots.filter(s=>deskGroups[deskState.group]?.test(s.k));
  spots.splice(0,spots.length,...matching);
  if(!spots.length)spots.push({k:deskState.group.toUpperCase(),html:true,body:`<div class="desk-empty"><h2>Awaiting ${esc(deskState.group)} sources.</h2><p>This desk fills as its feeds arrive. Available readings are retained through refreshes.</p></div>`,sub:'',dur:20000});
 }
};
decodeKicker=function(txt){clearInterval(decTimer);$('spotKickerTxt').textContent=txt;};
function deskPreload(page){
 if(!page?.html)return;
 const t=document.createElement('template');t.innerHTML=page.body;
 for(const el of [...t.content.querySelectorAll('img[src]')].slice(0,4)){
  const src=el.getAttribute('src');if(deskState.preloads.has(src))continue;
  const image=new Image();image.decoding='async';image.src=src;deskState.preloads.set(src,image);
  if(deskState.preloads.size>24)deskState.preloads.delete(deskState.preloads.keys().next().value);
 }
}
function deskMedia(){
 // Large editorial images get a consistent frame; small team/airline logos
 // remain transparent rather than inheriting the photographic border.
 for(const img of $('spotBody').querySelectorAll('.ap-img,.art-img')){
  if(!img.closest('.desk-picture')){const frame=document.createElement('figure');frame.className='desk-picture';img.before(frame);frame.append(img);}
  if(!img.alt)img.alt=img.closest('.ap-wrap,.art-wrap')?.querySelector('.ap-title,.art-info .t')?.textContent||'Featured image';
 }
 for(const img of $('spotBody').querySelectorAll('img')){
  if(!img.matches('.ap-img,.art-img,.fl-photo,.radar-img,.usr-img')&&!img.closest('.desk-photo')){
   const rect=img.getBoundingClientRect();if(rect.width<=160&&rect.height<=160)img.classList.add('desk-logo');
  }
 }

 for(const img of $('spotBody').querySelectorAll('img')){
  img.decoding='async';img.addEventListener('load',deskFit,{once:true});
  const fallback=()=>{if(!img.isConnected)return;const note=document.createElement('div');note.className='desk-media-error';note.textContent=(img.alt||'Image')+' temporarily unavailable';img.replaceWith(note);};
  // Remove legacy handlers that silently hide broken images.
  img.removeAttribute('onerror');img.addEventListener('error',fallback,{once:true});
  if(img.complete&&!img.naturalWidth)fallback();
 }
}
function deskSchedule(ms,keepProgress=false){
 clearTimeout(spotTimer);deskState.remaining=ms;
 if(!keepProgress){
  deskState.progress?.cancel();
  const bar=$('deskProgress').firstElementChild;
  deskState.progress=matchMedia('(prefers-reduced-motion: reduce)').matches?null:bar.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:ms,fill:'forwards'});
 }
 if(deskState.paused||document.hidden){deskState.progress?.pause();return;}
 deskState.deadline=performance.now()+ms;deskState.progress?.play();spotTimer=setTimeout(showSpot,ms);
}
function deskSuspend(){
 if(spotTimer)deskState.remaining=Math.max(1,deskState.deadline-performance.now());
 clearTimeout(spotTimer);spotTimer=null;deskState.progress?.pause();
}
function deskFit(){
 const frame=$('deskStage');if(!frame)return;
 frame.style.transform='none';frame.style.width='100%';
 const box=$('spotBody');const scale=Math.min(1,box.clientHeight/Math.max(frame.scrollHeight,1),box.clientWidth/Math.max(frame.scrollWidth,1));
 if(scale<.99)frame.style.transform=`scale(${scale})`;
}
showSpot=function(){
 clearTimeout(spotTimer);if(ambPending&&deskState.group==='all'&&!deskState.paused){ambPending=false;ambCycles=0;if(showAmbient())return;}buildSpots();if(!spots.length)return;
 stopVestaboard();stopWorldClock();clearInterval(decTimer);transPending=false;
 spotIdx=((spotIdx%spots.length)+spots.length)%spots.length;
 const index=spotIdx,s=spots[index],body=$('spotBody');deskState.current=s.k;deskState.generation++;
 body.classList.remove('spotOut','fadein');body.dataset.shown='1';
 $('spotKicker').style.setProperty('--acc',s.acc||'var(--amber)');decodeKicker(s.k);
 $('pageBg').className='';$('spotSub').textContent=s.sub||'';$('spot').dataset.theme=/MARKET|RATE|FED|BANK|BITCOIN|RIA|M&A/.test(s.k)?'markets':/WEATHER|RADAR|TIDE|BUOY|LAKE|7-DAY/.test(s.k)?'weather':/ART|QUOTE|HISTORY|WORD/.test(s.k)?'culture':'world';$('spot').dataset.screen=s.k==='SITUATION OVERVIEW'?'overview':'detail';
 if(s.k==='SITUATION OVERVIEW')body.innerHTML=s.body;
 else {const stage=document.createElement('div');stage.id='deskStage';stage.style.transformOrigin='top left';if(s.html)stage.innerHTML=s.body;else stage.textContent=s.body.replace(/&amp;/g,'&');body.replaceChildren(stage);}
 $('deskPosition').innerHTML=`<b>${String(index+1).padStart(2,'0')}</b> / ${esc(s.k==='SITUATION OVERVIEW'?'OVERVIEW':s.k)}`;
 $('deskPages').value='';
 for(const b of document.querySelectorAll('[data-desk-group]'))b.setAttribute('aria-pressed',String(b.dataset.deskGroup==='overview'?s.k==='SITUATION OVERVIEW':deskState.group===b.dataset.deskGroup));
 if(s.after)s.after();deskMedia();deskFit();
 const generation=deskState.generation;requestAnimationFrame(()=>{if(generation===deskState.generation)body.classList.add('fadein');});
 spotIdx=(index+1)%spots.length;if(spotIdx===0&&deskState.group==='all'){ambCycles++;if(isAmbientHours()&&ambCycles>=CFG.ambientEveryCycles)ambPending=true;}deskPreload(spots[spotIdx]);deskSchedule(s.dur||CFG.spotSeconds*1000);
};
function deskJump(group,key){ambPending=false;deskState.group=group==='overview'?'all':group;buildSpots();spotIdx=key?Math.max(0,spots.findIndex(s=>s.k===key)):0;showSpot();}
for(const b of document.querySelectorAll('[data-desk-group]'))b.addEventListener('click',()=>deskJump(b.dataset.deskGroup));
$('deskPages').addEventListener('change',e=>deskJump('all',e.target.value));
$('deskPrevious').addEventListener('click',()=>{buildSpots();const at=spots.findIndex(s=>s.k===deskState.current);spotIdx=(at-1+spots.length)%spots.length;showSpot();});
$('deskNext').addEventListener('click',()=>showSpot());
$('deskPause').addEventListener('click',()=>{deskState.paused=!deskState.paused;$('deskPause').textContent=deskState.paused?'▶ RESUME':'Ⅱ PAUSE';$('deskPause').setAttribute('aria-pressed',String(deskState.paused));document.body.classList.toggle('desk-paused',deskState.paused);if(deskState.paused)deskSuspend();else deskSchedule(deskState.remaining,true);});
document.addEventListener('keydown',e=>{if(/SELECT|INPUT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(e.key==='ArrowRight')$('deskNext').click();else if(e.key==='ArrowLeft')$('deskPrevious').click();else if(e.code==='Space'){e.preventDefault();$('deskPause').click();}});
document.addEventListener('visibilitychange',()=>{
 document.body.classList.toggle('desk-hidden',document.hidden);
 if(document.hidden){deskSuspend();stopVestaboard();stopWorldClock();for(const v of document.querySelectorAll('video'))v.pause();}
 else {if(deskState.current==='WORLD CLOCK')startWorldClock();for(const v of document.querySelectorAll('video'))if(!deskState.paused)v.play().catch(()=>{});deskSchedule(deskState.remaining,true);}
});
window.addEventListener('resize',deskFit);
const deskSolarOriginal=solarHTML;
solarHTML=()=>deskSolarOriginal().replace(/animation-duration:/g,'--orbit-period:').replace(/animation-delay:/g,'--orbit-phase:');
AMBIENT.find(scene=>scene.k==='SOLAR SYSTEM').b=solarHTML;
const deskAmbientOriginal=showAmbient;
showAmbient=function(){const shown=deskAmbientOriginal();if(shown){deskState.current=$('spotKickerTxt').textContent;$('deskPosition').textContent='NIGHT / '+deskState.current;$('spot').dataset.screen='detail';$('spot').dataset.theme='world';const scene=AMBIENT.find(s=>s.k===deskState.current);deskSchedule(scene?.dur||150000);$('deskPages').value='';deskMedia();if(deskState.paused||document.hidden)clearTimeout(spotTimer);}return shown;};
// Update changed readings without replacing the image, table or animation state.
setInterval(()=>{
 if(document.hidden||deskState.current!=='SITUATION OVERVIEW')return;
 const t=document.createElement('template');t.innerHTML=deskOverview();
 const current=document.querySelector('.desk-watch');if(!current)return;
 const next=t.content.querySelector('.desk-watch');let changed=false;
 [...current.querySelectorAll('dd')].forEach((cell,i)=>{const value=next.querySelectorAll('dd')[i].textContent;if(cell.textContent!==value){changed=true;cell.textContent=value;cell.classList.remove('desk-value-change');requestAnimationFrame(()=>cell.classList.add('desk-value-change'));}});
 current.querySelector('p').textContent=next.querySelector('p').textContent;if(changed)buildDataTicker();
},5000);
// Both tickers always span the screen. Apply new data at a loop boundary so
// a background refresh cannot snap the visible text back to the beginning.
function deskTicker(el,markup,force=false){
 if(!force&&el.dataset.content===markup){delete el.dataset.pending;return;}
 if(!force&&el.classList.contains('desk-scroll')&&el.dataset.seed!=='1'){
  el.dataset.pending=markup;return;
 }
 delete el.dataset.seed;delete el.dataset.pending;el.dataset.content=markup;
 el.classList.remove('desk-scroll');
 const generation=String((Number(el.dataset.generation)||0)+1);el.dataset.generation=generation;
 const unit=document.createElement('span');unit.className='desk-ticker-unit';unit.innerHTML=markup;el.replaceChildren(unit);
 requestAnimationFrame(()=>{
  if(el.dataset.generation!==generation)return;
  const width=Math.max(1,unit.getBoundingClientRect().width),viewport=el.parentElement.clientWidth;
  const copies=Math.max(1,Math.ceil((viewport+64)/width));
  const group=document.createElement('span');group.className='desk-ticker-copy';
  for(let i=0;i<copies;i++){const item=unit.cloneNode(true);if(i)item.setAttribute('aria-hidden','true');group.append(item);}
  const twin=group.cloneNode(true);twin.setAttribute('aria-hidden','true');el.replaceChildren(group,twin);
  const distance=group.getBoundingClientRect().width;
  const speed=Math.max(38,Math.min(el.id==='newsInner'?70:85,innerWidth*.046));
  el.style.setProperty('--ticker-time',`${distance/speed}s`);el.classList.add('desk-scroll');
 });
}
for(const id of ['dataInner','newsInner']){
 const el=$(id);deskTicker(el,el.innerHTML,true);el.dataset.seed='1';
 el.addEventListener('animationiteration',e=>{if(e.target===el&&el.dataset.pending)deskTicker(el,el.dataset.pending,true);});
}
let deskResizeTimer;
window.addEventListener('resize',()=>{clearTimeout(deskResizeTimer);deskResizeTimer=setTimeout(()=>{for(const id of ['dataInner','newsInner']){const el=$(id),seed=el.dataset.seed;deskTicker(el,el.dataset.pending||el.dataset.content||el.textContent,true);if(seed)el.dataset.seed=seed;}},160);});
// Controls overlay the broadcast instead of consuming its display area.
$('deskMode').insertAdjacentHTML('beforebegin','<span id="deskProgress" aria-hidden="true"><i></i></span>');
$('deskTransport').insertAdjacentHTML('beforeend','<button id="deskFullscreen" aria-label="Enter fullscreen" title="Enter fullscreen"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 6V1h5m4 0h5v5M1 10v5h5m4 0h5v-5"/></svg> FULLSCREEN</button>');
let deskControlsTimer;
function deskReveal(){document.body.classList.add('desk-controls-visible');clearTimeout(deskControlsTimer);deskControlsTimer=setTimeout(()=>document.body.classList.remove('desk-controls-visible'),3500);}
for(const event of ['pointermove','pointerdown','keydown'])document.addEventListener(event,deskReveal,{passive:true});
$('deskNav').addEventListener('click',e=>{if(e.detail&&e.target.closest('button'))e.target.closest('button').blur();});
$('deskFullscreen').addEventListener('click',async()=>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
 catch(e){$('deskFullscreen').title='Fullscreen is unavailable in this browser frame. Open the feed directly to enter fullscreen.';}
});
document.addEventListener('fullscreenchange',()=>{$('deskFullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');$('deskFullscreen').lastChild.textContent=document.fullscreenElement?' EXIT FULLSCREEN':' FULLSCREEN';deskFit();});
deskReveal();
// Bounded transport prevents hung endpoints from exhausting the Pi's connections.
const deskQueue=[];let deskActive=0;
function deskRequest(url,type){return new Promise((resolve,reject)=>{deskQueue.push({url,type,resolve,reject});deskDrain();});}
function deskDrain(){
 while(deskActive<4&&deskQueue.length){const job=deskQueue.shift();deskActive++;deskState.requests=deskActive;deskState.peakRequests=Math.max(deskState.peakRequests,deskActive);
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  (async()=>{try{const r=await fetch(job.url,{signal:controller.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);const data=await r[job.type]();deskState.lastSuccess=Date.now();job.resolve(data);}catch(e){job.reject(e);}finally{clearTimeout(timeout);deskActive--;deskState.requests=deskActive;deskDrain();}})();
 }
}
jget=u=>deskRequest(u,'json');tget=u=>deskRequest(u,'text');
// An opt-in visible diagnostic samples actual rendering, never reports a target as measured FPS.
if(new URLSearchParams(location.search).has('diagnostics')){
 let frames=0,start=performance.now(),last=start,maxGap=0;
 const meter=document.createElement('span');meter.id='deskDiagnostics';$('deskStatus').append(meter);
 const sample=now=>{if(!document.hidden){frames++;maxGap=Math.max(maxGap,now-last);if(now-start>=2000){meter.textContent=`${Math.round(frames*1000/(now-start))} FPS · max ${Math.round(maxGap)}ms · requests ${deskActive}/4`;frames=0;start=now;maxGap=0;}}else{frames=0;start=now;maxGap=0;}last=now;requestAnimationFrame(sample);};requestAnimationFrame(sample);
}

// Local, licensed collection keeps the gallery available when the museum image
// host is blocked. Only the selected work is loaded; the full set is not decoded.
let deskArtCollection=null;
const deskFetchArtOriginal=fetchArt;
fetchArt=async function(){
 try{
  const collection=deskArtCollection||(deskArtCollection=await jget('desk-art/collection.json'));
  if(!collection.length)throw new Error('Empty art collection');
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/New_York'});
  const day=Math.floor(Date.parse(today+'T00:00:00Z')/86400000);
  const work=collection[((day%collection.length)+collection.length)%collection.length];
  S.art={...work,date:today,desc:String(work.desc||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()};
 }catch(e){await deskFetchArtOriginal();}
};
