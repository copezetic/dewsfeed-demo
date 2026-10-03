/* Design pass (2026-10-03) — loaded after desk.js.
   Adds: page meta in the kicker row (position + data age), one ticker strip,
   a rebuilt Markets page (labelled charts, yield curve, session bar), 7-day
   range bars with rain chance, a Daylight page and an On the Horizon page.
   Everything here wraps existing functions; nothing upstream is rewritten. */

// Dates for the ON THE HORIZON page come from CFG.countdowns, which is set in the
// office index.html only. The next FOMC decision is added automatically.
CFG.countdowns = CFG.countdowns || [];

/* ───────── helpers ───────── */
const dzET=()=>new Date(new Date().toLocaleString('en-US',{timeZone:'America/New_York'}));
const dzTime=d=>d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'});
const dzNum=v=>v.toLocaleString('en-US',{maximumFractionDigits:0});
const dzAgo=ms=>{const m=Math.round(ms/60000);return m<1?'JUST NOW':m<90?m+' MIN AGO':m<2880?Math.round(m/60)+' H AGO':Math.round(m/1440)+' D AGO';};

/* ───────── one ticker strip: DATA and NEWS share a row ───────── */
(function(){
  const data=$('databar'),news=$('newsbar');if(!data||!news)return;
  const row=document.createElement('div');row.id='deskTickers';
  data.before(row);row.append(data,news);
  window.dispatchEvent(new Event('resize'));          // desk.js re-measures both tickers
})();

/* ───────── kicker meta: position in the rotation + age of this page's data ───────── */
$('spotKicker').insertAdjacentHTML('beforeend','<span id="deskMeta" aria-live="off"></span>');
// [page pattern, S keys that feed it, minutes before the stamp turns to a warning]
const DZ_SOURCES=[
  [/^MARKETS$|SITUATION OVERVIEW/,['spx','pnbk','btc','rates'],45],[/RATE DESK/,['curve','mort'],2880],
  [/TOP STORIES/,['natNews'],45],[/TECH TERMINAL/,['hn','techNews'],60],[/SPORTS WIRE/,['sportsNews'],60],
  [/BANKING/,['bankNews'],60],[/RIA/,['riaNews'],60],[/M&A/,['maNews'],60],[/SCIENCE/,['sciNews'],60],
  [/GREENWICH LOCAL/,['locNews'],60],[/WEATHER TODAY/,['hourly'],120],[/7-DAY/,['forecast'],240],
  [/EARTHQUAKE/,['quakes'],120],[/GLOBAL SITREP/,['sitrep','iss'],120],[/STANDINGS/,['alEast','afcEast'],360],
  [/LONG ISLAND SOUND/,['buoy','tides'],120],[/DRIVE TIMES/,['traffic'],60],[/PAINTING/,['art'],2880],
  [/NASA/,['apod'],2880],[/PREDICTION/,['predict'],120],[/SPACE OPS/,['launches','issPasses'],720],
  [/AURORA/,['kp'],120],[/WHOOP/,['whoop'],720],[/TO-DO/,['tasks'],30],[/FLIGHTS|AIRSPACE/,['flights'],40],
];
function dzPageAge(key){
  if(/METRO-NORTH/.test(key))return (typeof railData==='object'&&railData?.timestamp)?{age:Date.now()-railData.timestamp*1000,limit:5}:null;
  const row=DZ_SOURCES.find(r=>r[0].test(key));if(!row)return null;
  const stamps=row[1].map(k=>S_AT[k]).filter(Boolean);if(!stamps.length)return null;
  return {age:Date.now()-Math.min(...stamps),limit:row[2]};
}
function dzMetaPaint(){
  const el=$('deskMeta');if(!el)return;
  const key=deskState.current,at=spots.findIndex(s=>s.k===key);
  const pos=at>=0?`<b>${String(at+1).padStart(2,'0')}</b> / ${String(spots.length).padStart(2,'0')}`:'';
  const a=dzPageAge(key);
  const age=a?(a.age>a.limit*60000?`<span class="stale">STALE · LAST UPDATE ${dzAgo(a.age)}</span>`:`<span>UPDATED ${dzAgo(a.age)}</span>`):'';
  el.innerHTML=[age,pos].filter(Boolean).join('<i>·</i>');
}
const dzShowOriginal=showSpot;
showSpot=function(){dzShowOriginal();dzMetaPaint();};
setInterval(dzMetaPaint,30000);

/* ───────── charts ───────── */
// Sparkline with a dashed reference at the first value, HI/LO in a right gutter,
// and a dot on the last print. Labels are HTML so they never stretch.
function dzSpark(pts,fmt,baseLabel){
  if(!pts||pts.length<2)return '<div class="dz-chart dz-nochart">CHART PENDING</div>';
  const mn=Math.min(...pts),mx=Math.max(...pts),rg=(mx-mn)||1;
  const y=v=>8+(1-(v-mn)/rg)*84,x=i=>i*100/(pts.length-1);
  const line=pts.map((v,i)=>x(i).toFixed(2)+','+y(v).toFixed(2)).join(' ');
  const first=pts[0],last=pts.at(-1),yb=y(first);
  // the reference label shares the gutter with HI/LO; it is dropped when it would collide
  const refClear=Math.abs(yb-y(mx))>=12&&Math.abs(yb-y(mn))>=12;
  return `<div class="dz-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <polygon class="area" points="0,100 ${line} 100,100"/>
    <line class="base" x1="0" x2="100" y1="${yb.toFixed(2)}" y2="${yb.toFixed(2)}"/>
    <polyline class="line" points="${line}"/></svg>
    <i class="dot" style="top:${y(last).toFixed(2)}%"></i>
    ${refClear?`<span class="lab ref" style="top:${yb.toFixed(2)}%">${baseLabel} ${fmt(first)}</span>`:''}
    <span class="lab" style="top:${y(mx).toFixed(2)}%">HI ${fmt(mx)}</span>
    <span class="lab" style="top:${y(mn).toFixed(2)}%">LO ${fmt(mn)}</span></div>`;
}
function dzCurveHTML(){
  const c=S.curve;if(!c||c.length<4)return '';
  const W=600,H=170,L=30,R=30,T=34,B=34,vals=c.map(p=>p.v),lo=Math.min(...vals),hi=Math.max(...vals),rg=(hi-lo)||1;
  const x=i=>L+i*(W-L-R)/(c.length-1),y=v=>T+(1-(v-lo)/rg)*(H-T-B);
  const inverted=c[0].v>c.at(-1).v;
  return `<article class="dz-panel dz-curve"><header><span>TREASURY CURVE</span><em>${inverted?'INVERTED · FRONT ABOVE LONG END':'UPWARD SLOPING'}</em></header>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Treasury yield curve">
    <polyline class="line" points="${c.map((p,i)=>x(i).toFixed(1)+','+y(p.v).toFixed(1)).join(' ')}"/>
    ${c.map((p,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4"/><text class="v" x="${x(i).toFixed(1)}" y="${(y(p.v)-12).toFixed(1)}">${p.v.toFixed(2)}</text><text class="t" x="${x(i).toFixed(1)}" y="${H-8}">${esc(p.lbl)}</text>`).join('')}
    </svg></article>`;
}
// NYSE regular session on weekdays; exchange holidays are not tracked.
function dzSessionHTML(wide){
  const n=dzET(),dow=n.getDay(),mins=n.getHours()*60+n.getMinutes(),OPEN=570,CLOSE=960,A=240,Z=1200;
  const weekday=dow>=1&&dow<=5,open=weekday&&mins>=OPEN&&mins<CLOSE;
  const dur=m=>(m>=60?Math.floor(m/60)+'H ':'')+(m%60)+'M';
  let status,detail;
  if(open){status='OPEN';detail='CLOSES IN '+dur(CLOSE-mins);}
  else{
    let days=0,d=dow;
    if(!(weekday&&mins<OPEN)){do{days++;d=(d+1)%7;}while(d===0||d===6);}
    const names=['SUN','MON','TUE','WED','THU','FRI','SAT'];
    status=weekday&&mins>=A&&mins<OPEN?'PRE-MARKET':weekday&&mins>=CLOSE&&mins<Z?'AFTER HOURS':'CLOSED';
    detail=days===0?'OPENS IN '+dur(OPEN-mins):'OPENS '+(days===1?'TOMORROW':names[d])+' 9:30 AM ET';
  }
  const pct=m=>((Math.max(A,Math.min(Z,m))-A)/(Z-A)*100).toFixed(2);
  const marker=weekday&&mins>=A&&mins<=Z?`<i class="now" style="left:${pct(mins)}%"></i>`:'';
  return `<article class="dz-panel dz-session ${open?'open':''}${wide?' wide':''}"><header><span>NEW YORK SESSION</span><em>WEEKDAYS · HOLIDAYS NOT TRACKED</em></header>
    <div class="dz-session-state"><b>${status}</b><span>${detail}</span></div>
    <div class="dz-session-bar"><span class="reg" style="left:${pct(OPEN)}%;width:${(pct(CLOSE)-pct(OPEN)).toFixed(2)}%"></span>${marker}</div>
    <div class="dz-session-ticks"><span style="left:0">4 AM</span><span style="left:${pct(OPEN)}%">9:30</span><span style="left:${pct(CLOSE)}%">4 PM</span><span style="left:100%">8 PM</span></div></article>`;
}
function dzMarketsHTML(){
  const quote=(title,q,key,price)=>{
    if(!q)return '';
    const up=q.chg>=0,fmt=price?v=>'$'+v.toFixed(2):dzNum,kind=S.sparkKind[key]||'5-DAY';
    return `<article class="dz-panel dz-quote ${up?'up':'down'}"><header><span>${title}</span><em>${esc(kind)}</em></header>
      <div class="dz-quote-row"><b>${fmt(q.cur)}</b><i>${up?'▲':'▼'} ${Math.abs(q.chg).toFixed(2)}%</i></div>${dzSpark(S.sparks[key],fmt,/TODAY/.test(kind)?'OPEN':'START')}</article>`;
  };
  const tile=(label,value,note,cls)=>`<article class="dz-panel dz-tile"><header><span>${label}</span></header><b>${value}</b><small class="${cls||''}">${note}</small></article>`;
  const fng=S.fng,fngLbl=fng==null?'':fng>=75?'EXTREME GREED':fng>=55?'GREED':fng>=45?'NEUTRAL':fng>=25?'FEAR':'EXTREME FEAR';
  const tiles=[
    S.btc?tile('BITCOIN','$'+S.btc.usd.toLocaleString('en-US',{maximumFractionDigits:0}),Number.isFinite(S.btc.chg)?(S.btc.chg>=0?'▲ ':'▼ ')+Math.abs(S.btc.chg).toFixed(2)+'% · 24H':'24H',S.btc.chg>=0?'up':'down'):'',
    S.rates.sofr?tile('SOFR',S.rates.sofr,'OVERNIGHT · NY FED'):'',
    S.rates.t10?tile('10-YEAR',S.rates.t10,'TREASURY · CONSTANT MATURITY'):'',
    fng!=null?`<article class="dz-panel dz-tile"><header><span>FEAR &amp; GREED</span></header><b>${fng}</b><div class="dz-gauge"><i style="left:${fng}%"></i></div><small>${fngLbl}</small></article>`:'',
  ].filter(Boolean);
  const curve=dzCurveHTML();
  return `<div class="dz-markets" style="--tiles:${Math.max(1,tiles.length)}">
    <div class="dz-row dz-quotes">${quote('S&amp;P 500',S.spx,'spx',false)}${quote('PNBK · PATRIOT BANK',S.pnbk,'pnbk',true)}</div>
    ${tiles.length?`<div class="dz-row dz-tiles">${tiles.join('')}</div>`:''}
    <div class="dz-row dz-context">${curve}${dzSessionHTML(!curve)}</div></div>`;
}

/* ───────── 7-day: temperature range bars + rain chance ───────── */
function dzWeekHTML(){
  const f=S.forecast,lo=Math.min(...f.map(d=>d.lo)),hi=Math.max(...f.map(d=>d.hi)),rg=(hi-lo)||1;
  return `<div class="dz-week">${f.map((d,i)=>`<article class="dz-panel dz-day${i===0?' today':''}">
    <header>${esc(d.day)}</header><div class="e">${d.emoji}</div><b>${d.hi}°</b>
    <div class="dz-range"><i style="top:${((hi-d.hi)/rg*100).toFixed(1)}%;bottom:${((d.lo-lo)/rg*100).toFixed(1)}%"></i></div>
    <span class="lo">${d.lo}°</span>
    <small class="${d.pp>=40?'wet':''}">${d.pp==null?'&nbsp;':'RAIN '+d.pp+'%'}</small></article>`).join('')}</div>`;
}

/* ───────── daylight: sunrise, sunset and where the sun is now ───────── */
// NOAA solar position equations. z = zenith angle of the event in degrees.
function dzSolar(dayUTC,lat,lon){
  const rad=Math.PI/180,T=((dayUTC+43200000-lon*240000)/86400000+2440587.5-2451545)/36525;
  const L0=(280.46646+T*(36000.76983+T*0.0003032))%360,M=357.52911+T*(35999.05029-0.0001537*T);
  const e=0.016708634-T*(0.000042037+0.0000001267*T);
  const C=Math.sin(M*rad)*(1.914602-T*(0.004817+0.000014*T))+Math.sin(2*M*rad)*(0.019993-0.000101*T)+Math.sin(3*M*rad)*0.000289;
  const om=125.04-1934.136*T,lam=L0+C-0.00569-0.00478*Math.sin(om*rad);
  const eps=23+(26+(21.448-T*(46.815+T*(0.00059-T*0.001813)))/60)/60+0.00256*Math.cos(om*rad);
  const decl=Math.asin(Math.sin(eps*rad)*Math.sin(lam*rad)),yy=Math.tan(eps/2*rad)**2;
  const eq=4/rad*(yy*Math.sin(2*L0*rad)-2*e*Math.sin(M*rad)+4*e*yy*Math.sin(M*rad)*Math.cos(2*L0*rad)-0.5*yy*yy*Math.sin(4*L0*rad)-1.25*e*e*Math.sin(2*M*rad));
  const noon=dayUTC+(720-4*lon-eq)*60000;
  const at=(z,sign)=>{const c=Math.cos(z*rad)/(Math.cos(lat*rad)*Math.cos(decl))-Math.tan(lat*rad)*Math.tan(decl);return Math.abs(c)>1?null:new Date(noon+sign*Math.acos(c)/rad*4*60000);};
  return {noon:new Date(noon),rise:at(90.833,-1),set:at(90.833,1),dawn:at(96,-1),dusk:at(96,1),golden:at(84,1)};
}
function dzDaylightHTML(){
  const now=new Date(),[Y,Mo,D]=now.toLocaleDateString('en-CA',{timeZone:'America/New_York'}).split('-').map(Number);
  const day=Date.UTC(Y,Mo-1,D),s=dzSolar(day,CFG.office.lat,CFG.office.lon),prev=dzSolar(day-86400000,CFG.office.lat,CFG.office.lon),next=dzSolar(day+86400000,CFG.office.lat,CFG.office.lon);
  if(!s.rise||!s.set)return '<div class="desk-empty"><h2>No sunrise or sunset today.</h2></div>';
  const len=s.set-s.rise,delta=Math.round((len-(prev.set-prev.rise))/1000),up=now>=s.rise&&now<=s.set;
  const hm=ms=>{const m=Math.round(ms/60000);return Math.floor(m/60)+'H '+String(m%60).padStart(2,'0')+'M';};
  const X0=90,X1=710,HZ=290,RY=215;
  let t,sx,sy;
  if(up){t=(now-s.rise)/len;sx=X0+(X1-X0)*t;sy=HZ-RY*Math.sin(Math.PI*t);}
  else{const a=now<s.rise?prev.set:s.set,b=now<s.rise?s.rise:next.rise;t=(now-a)/(b-a);sx=X1-(X1-X0)*t;sy=HZ+70*Math.sin(Math.PI*t);}
  const state=up?(now>=s.golden?'GOLDEN HOUR':'SUN IS UP'):(now<s.rise?(now>=s.dawn?'FIRST LIGHT':'BEFORE DAWN'):(now<=s.dusk?'DUSK':'AFTER DARK'));
  const nextEvent=now<s.rise?['SUNRISE',s.rise]:now<s.set?['SUNSET',s.set]:['SUNRISE',next.rise];
  const rows=[['FIRST LIGHT',s.dawn],['SUNRISE',s.rise],['SOLAR NOON',s.noon],['GOLDEN HOUR',s.golden],['SUNSET',s.set],['LAST LIGHT',s.dusk]];
  const cur=rows.reduce((a,r,i)=>r[1]&&now>=r[1]?i:a,-1);
  return `<div class="dz-daylight"><section class="dz-panel dz-sun">
    <svg viewBox="0 0 800 400" role="img" aria-label="Path of the sun over Greenwich today">
      <path class="night" d="M${X0} ${HZ} A${(X1-X0)/2} 70 0 0 0 ${X1} ${HZ}"/>
      <path class="arc" d="M${X0} ${HZ} A${(X1-X0)/2} ${RY} 0 0 1 ${X1} ${HZ}"/>
      ${up?`<path class="done" d="M${X0} ${HZ} A${(X1-X0)/2} ${RY} 0 0 1 ${X1} ${HZ}" pathLength="1" stroke-dasharray="${t.toFixed(4)} 1"/>`:''}
      <line class="hz" x1="30" x2="770" y1="${HZ}" y2="${HZ}"/>
      <circle class="halo ${up?'':'down'}" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="26"/><circle class="sun ${up?'':'down'}" cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="11"/>
      <text class="t" x="${X0}" y="${HZ+34}" text-anchor="middle">${dzTime(s.rise)}</text><text class="l" x="${X0}" y="${HZ+56}" text-anchor="middle">SUNRISE</text>
      <text class="t" x="${X1}" y="${HZ+34}" text-anchor="middle">${dzTime(s.set)}</text><text class="l" x="${X1}" y="${HZ+56}" text-anchor="middle">SUNSET</text>
      <text class="l" x="400" y="${HZ-RY-16}" text-anchor="middle">SOLAR NOON ${dzTime(s.noon)}</text>
    </svg>
    <div class="dz-sun-state"><b>${state}</b><span>${nextEvent[0]} IN ${hm(nextEvent[1]-now)}</span></div></section>
    <section class="dz-panel dz-sun-facts"><div class="dz-daylen"><b>${hm(len)}</b><span>OF DAYLIGHT</span>
      <small>${delta===0?'SAME AS YESTERDAY':Math.floor(Math.abs(delta)/60)+' MIN '+String(Math.abs(delta)%60).padStart(2,'0')+' SEC '+(delta>0?'LONGER':'SHORTER')+' THAN YESTERDAY'}</small></div>
      <dl>${rows.map((r,i)=>`<div class="${i===cur?'cur':i<cur?'past':''}"><dt>${r[0]}</dt><dd>${r[1]?dzTime(r[1]):'—'}</dd></div>`).join('')}</dl></section></div>`;
}

/* ───────── on the horizon: countdowns ───────── */
function dzHorizonItems(){
  const today=dzET();today.setHours(0,0,0,0);
  const items=(CFG.countdowns||[]).map(c=>{const [y,m,d]=c.date.split('-').map(Number);return {...c,when:new Date(y,m-1,d)};});
  const fomc=(typeof FOMC_2026!=='undefined'?FOMC_2026:[]).map(([m,d])=>new Date(2026,m-1,d)).find(d=>d>=today);
  if(fomc)items.push({label:'FOMC DECISION',when:fomc,note:'2:00 PM ET'});
  return items.map(i=>({...i,days:Math.round((i.when-today)/86400000)})).filter(i=>i.days>=0).sort((a,b)=>a.days-b.days).slice(0,4);
}
function dzHorizonHTML(){
  const mo=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],dn=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  return `<div class="dz-horizon" style="--n:${dzHorizonItems().length}">${dzHorizonItems().map(i=>`<article class="dz-panel"><header>${esc(i.label)}</header>
    <b>${i.days===0?'TODAY':i.days}</b><span>${i.days===0?'':i.days===1?'DAY':'DAYS'}</span>
    <em>${dn[i.when.getDay()]} · ${mo[i.when.getMonth()]} ${i.when.getDate()}${i.when.getFullYear()!==dzET().getFullYear()?' · '+i.when.getFullYear():''}</em>
    <small>${esc(i.note||'')}</small></article>`).join('')}</div>`;
}

/* ───────── wire the pages into the rotation ───────── */
deskGroups.weather=/WEATHER|RADAR|7-DAY|DAYLIGHT/;
deskGroups.life=/CONCERT SHORTLIST|HEADING HOME|ON THE HORIZON/;
const dzSceneOriginal=deskSceneFor;
deskSceneFor=key=>/DAYLIGHT/.test(key)?'weather':/ON THE HORIZON/.test(key)?'culture':dzSceneOriginal(key);
const dzNewsOriginal=newsPageHTML;
newsPageHTML=(items,extra,wm)=>dzNewsOriginal(items,Math.max(extra,4),wm);   // fill the right-hand column
const dzBuildOriginal=buildSpots;
buildSpots=function(){
  dzBuildOriginal();
  const group=deskState.group,all=group==='all'||group==='overview',wants=k=>all||deskGroups[group]?.test(k);
  for(const s of spots){
    if(s.k==='MARKETS'&&(S.spx||S.pnbk)){s.body=dzMarketsHTML();s.sub='';s.dur=20000;}
    if(s.k==='GREENWICH · 7-DAY'&&S.forecast.length)s.body=dzWeekHTML();
  }
  const extra=[];
  if(wants('DAYLIGHT'))extra.push([{k:'DAYLIGHT',acc:'var(--amber)',html:true,dur:16000,body:dzDaylightHTML(),sub:''},/7-DAY|WEATHER TODAY/]);
  if(wants('ON THE HORIZON')&&dzHorizonItems().length)extra.push([{k:'ON THE HORIZON',acc:'var(--amber)',html:true,dur:14000,body:dzHorizonHTML(),sub:''},/FED WATCH|HEADING HOME/]);
  for(const [page,after] of extra){
    if(spots.length===1&&spots[0].k===group.toUpperCase())spots.length=0;        // replace the "awaiting sources" placeholder
    let at=-1;spots.forEach((s,i)=>{if(after.test(s.k))at=i;});
    spots.splice(at<0?spots.length:at+1,0,page);
  }
  const menu=$('deskPages');
  for(const k of ['DAYLIGHT','ON THE HORIZON'])if(menu&&![...menu.options].some(o=>o.value===k))menu.insertAdjacentHTML('beforeend',`<option value="${k}">${k}</option>`);
};
