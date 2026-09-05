/* Shared situation-desk presentation. Source adapters remain in index.html. */
const DESK_PUBLIC = document.documentElement.dataset.edition === 'public';
const deskState={paused:false,group:'all',current:'',generation:0,preloads:new Map(),lastSuccess:0,requests:0,peakRequests:0};
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
 return `<div class="desk-overview"><section class="desk-editorial"><div class="desk-photo"><img src="desk-harbor.webp" alt="Illustrative coastal harbor at blue hour" width="1920" height="768" fetchpriority="high" decoding="async"><small>ILLUSTRATIVE VIEW</small></div><h1>A wider view.</h1><p>Markets, weather and the world outside.</p></section><section class="desk-watch"><h2>WATCH DESK</h2><dl>${rows.map(([i,k,v])=>`<div><dt>${deskIcon(i)}${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p>${hasData?'Latest available readings · source timing varies':'Awaiting source updates'}</p></section></div>`;
}
vestaboardHTML=function(q,plain=false){return `<section class="desk-quote"><span class="desk-quote-rule"></span><blockquote>${esc(q.q)}</blockquote><p>${plain?'':'— '}${esc(q.a)}</p></section>`;};
animateVestaboard=function(){stopVestaboard();};
const deskBuildOriginal=buildSpots;
buildSpots=function(){
 deskBuildOriginal();
 const substantive=spots.filter(s=>!['UP NEXT','SIGNAL ACQUIRED'].includes(s.k));
 spots.splice(0,spots.length,{k:'SITUATION OVERVIEW',acc:'var(--amber)',html:true,dur:25000,body:deskOverview(),sub:''},...substantive);
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
 for(const img of $('spotBody').querySelectorAll('img')){
  img.decoding='async';img.addEventListener('load',deskFit,{once:true});
  const fallback=()=>{if(!img.isConnected)return;const note=document.createElement('div');note.className='desk-media-error';note.textContent=(img.alt||'Image')+' temporarily unavailable';img.replaceWith(note);};
  // Remove legacy handlers that silently hide broken images.
  img.removeAttribute('onerror');img.addEventListener('error',fallback,{once:true});
  if(img.complete&&!img.naturalWidth)fallback();
 }
}
function deskSchedule(ms){clearTimeout(spotTimer);if(!deskState.paused&&!document.hidden)spotTimer=setTimeout(showSpot,ms);}
function deskFit(){
 const frame=$('deskStage');if(!frame)return;
 frame.style.transform='none';frame.style.width='100%';
 if(innerWidth<760&&innerHeight>innerWidth)return;
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
 $('pageBg').className='';$('spotSub').textContent=s.sub||'';
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
$('deskPause').addEventListener('click',()=>{deskState.paused=!deskState.paused;$('deskPause').textContent=deskState.paused?'▶ RESUME':'Ⅱ PAUSE';$('deskPause').setAttribute('aria-pressed',String(deskState.paused));document.body.classList.toggle('desk-paused',deskState.paused);if(deskState.paused)clearTimeout(spotTimer);else deskSchedule(CFG.spotSeconds*1000);});
document.addEventListener('keydown',e=>{if(/SELECT|INPUT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(e.key==='ArrowRight')$('deskNext').click();else if(e.key==='ArrowLeft')$('deskPrevious').click();else if(e.code==='Space'){e.preventDefault();$('deskPause').click();}});
document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('desk-hidden',document.hidden);if(document.hidden){clearTimeout(spotTimer);stopVestaboard();stopWorldClock();for(const v of document.querySelectorAll('video'))v.pause();}else {if(deskState.current==='WORLD CLOCK')startWorldClock();if(deskState.current==='GET IT DONE'){buildSpots();spotIdx=Math.max(0,spots.findIndex(s=>s.k===deskState.current));showSpot();}deskSchedule(CFG.spotSeconds*1000);}});
window.addEventListener('resize',deskFit);
const deskSolarOriginal=solarHTML;
solarHTML=()=>deskSolarOriginal().replace(/animation-duration:/g,'--orbit-period:').replace(/animation-delay:/g,'--orbit-phase:');
AMBIENT.find(scene=>scene.k==='SOLAR SYSTEM').b=solarHTML;
const deskAmbientOriginal=showAmbient;
showAmbient=function(){const shown=deskAmbientOriginal();if(shown){deskState.current=$('spotKickerTxt').textContent;$('deskPosition').textContent='NIGHT / '+deskState.current;$('deskPages').value='';deskMedia();if(deskState.paused||document.hidden)clearTimeout(spotTimer);}return shown;};
// Refresh the watch values without replacing its photograph or restarting motion.
setInterval(()=>{if(document.hidden||deskState.current!=='SITUATION OVERVIEW')return;const t=document.createElement('template');t.innerHTML=deskOverview();const current=document.querySelector('.desk-watch');if(current&&current.innerHTML!==t.content.querySelector('.desk-watch').innerHTML)current.innerHTML=t.content.querySelector('.desk-watch').innerHTML;},5000);
// Seamless, compositor-driven tickers. Do not rebuild unchanged data.
function deskTicker(el,markup){
 if(el.dataset.content===markup)return;el.dataset.content=markup;el.classList.remove('desk-scroll');el.innerHTML=`<span class="desk-ticker-copy">${markup}</span>`;
 requestAnimationFrame(()=>{const copy=el.firstElementChild;if(!copy)return;const width=copy.getBoundingClientRect().width;
  if(width>el.parentElement.clientWidth){const twin=copy.cloneNode(true);twin.setAttribute('aria-hidden','true');el.append(twin);el.style.setProperty('--ticker-time',`${Math.max(25,width/45)}s`);el.classList.add('desk-scroll');}});
}
const deskDataOriginal=buildDataTicker,deskNewsOriginal=buildNewsTicker;
for(const [id,fn] of [['dataInner',deskDataOriginal],['newsInner',deskNewsOriginal]]){
 const wrapper=()=>{const el=$(id),before=el.innerHTML;fn();const result=el.innerHTML;if(result===before)return;if(el.dataset.content===result){el.innerHTML=before;return;}deskTicker(el,result);};
 if(id==='dataInner')buildDataTicker=wrapper;else buildNewsTicker=wrapper;
}
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
