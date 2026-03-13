if (location.hostname === 'www.amrelharony.com') { location.replace(location.href.replace('://www.', '://')); }

// ═══ GLOBAL SUSPEND / REVIVE SYSTEM ═══
(function() {
  'use strict';
  window._suspended = false;
  const _loops = new Map();
  let _visTimer = null;
  const VIS_GRACE_MS = 5000;

  window._registerLoop = function(name, startFn) {
    _loops.set(name, { start: startFn, running: true });
    if (!window._suspended) startFn();
  };

  window._unregisterLoop = function(name) {
    _loops.delete(name);
  };

  window._killSwitch = function() {
    if (window._suspended) return;
    window._suspended = true;
    document.documentElement.style.setProperty('--glow', 'transparent');
    document.querySelectorAll('.mesh div').forEach(function(d) { d.style.opacity = '0.02'; });
    for (var entry of _loops.values()) entry.running = false;
    if (window._pWorker) try { window._pWorker.postMessage({ type: 'pause' }); } catch(_) {}
    document.querySelectorAll('video').forEach(function(v) { try { v.pause(); } catch(_) {} });
    window.dispatchEvent(new CustomEvent('AmrOS:Suspended'));
  };

  window._reviveSwitch = function() {
    if (!window._suspended) return;
    window._suspended = false;
    var theme = localStorage.getItem('theme'), hr = new Date().getHours();
    var light = (theme || (hr >= 6 && hr < 18 ? 'light' : 'dark')) === 'light';
    if (!light) document.documentElement.style.setProperty('--glow', '');
    document.querySelectorAll('.mesh div').forEach(function(d) { d.style.opacity = ''; });
    for (var entry of _loops.values()) { entry.running = true; entry.start(); }
    if (window._pWorker) try { window._pWorker.postMessage({ type: 'resume' }); } catch(_) {}
    window.dispatchEvent(new CustomEvent('AmrOS:Revived'));
  };

  document.addEventListener('visibilitychange', function() {
    if (_visTimer) { clearTimeout(_visTimer); _visTimer = null; }
    if (document.visibilityState === 'hidden') {
      _visTimer = setTimeout(function() { window._killSwitch(); }, VIS_GRACE_MS);
    } else {
      if (window._suspended) window._reviveSwitch();
    }
  });

  if (navigator.getBattery) {
    navigator.getBattery().then(function(b) {
      function check() {
        if (b.level < 0.2 && !b.charging) window._killSwitch();
        else if (window._suspended && (b.level >= 0.2 || b.charging)) window._reviveSwitch();
      }
      b.addEventListener('levelchange', check);
      b.addEventListener('chargingchange', check);
      check();
    }).catch(function() {});
  }
})();

const _SB_URL = 'https://ninughddcomniliqimlu.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbnVnaGRkY29tbmlsaXFpbWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjI5MzEsImV4cCI6MjA4NzM5ODkzMX0.50OkvD0C7AtQBhbUVd-RItVDpegUcDLyGT0kFIPhNyE';
const _sb = window.supabase ? window.supabase.createClient(_SB_URL, _SB_KEY) : null;
window._sb = _sb;
window._SB_URL = _SB_URL;

function _fetchT(url,opts,ms){ms=ms||8000;var c=new AbortController();var t=setTimeout(function(){c.abort();},ms);opts=opts||{};opts.signal=c.signal;return fetch(url,opts).finally(function(){clearTimeout(t);});}
window._fetchT=_fetchT;

let _timeOffset = 0;
window.getTrueTime = () => Date.now() + _timeOffset;
if (_sb) {
  _fetchT(_SB_URL + '/rest/v1/', { method: 'HEAD', headers: { apikey: _SB_KEY } }, 5000)
    .then(r => {
      const serverDate = r.headers.get('Date');
      if (serverDate) {
        _timeOffset = new Date(serverDate).getTime() - Date.now();
        if (Math.abs(_timeOffset) > 5000) console.warn('[Time] Clock skew detected: %dms', _timeOffset);
      }
    }).catch(() => {});
}

(()=>{
'use strict';

// Focus trap for modal overlays (a11y)
const _focusTraps=new Map();
function _trapFocus(overlayId){
    const el=document.getElementById(overlayId);if(!el)return;
    const prev=document.activeElement;
    _focusTraps.set(overlayId,{prev:prev,handler:function(e){
        if(e.key!=='Tab')return;
        const focusable=el.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
        if(!focusable.length)return;
        const first=focusable[0],last=focusable[focusable.length-1];
        if(e.shiftKey){if(document.activeElement===first){e.preventDefault();last.focus();}}
        else{if(document.activeElement===last){e.preventDefault();first.focus();}}
    }});
    el.addEventListener('keydown',_focusTraps.get(overlayId).handler);
    setTimeout(function(){var f=el.querySelector('button,a[href],input');if(f)f.focus();},100);
}
function _releaseFocus(overlayId){
    var trap=_focusTraps.get(overlayId);if(!trap)return;
    var el=document.getElementById(overlayId);
    if(el)el.removeEventListener('keydown',trap.handler);
    if(trap.prev&&trap.prev.focus)try{trap.prev.focus();}catch(_){}
    _focusTraps.delete(overlayId);
}
window._trapFocus=_trapFocus;
window._releaseFocus=_releaseFocus;

const _yrEl=document.getElementById('yr');if(_yrEl)_yrEl.textContent=new Date().getFullYear();
const D=window.matchMedia('(pointer:fine)').matches;
const reducedMotion=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
window._reducedMotion=reducedMotion;
const isRepeatVisit=!!localStorage.getItem('visited');localStorage.setItem('visited','1');
const isMobile=window.matchMedia('(pointer:coarse)').matches;
const params=new URLSearchParams(location.search);

// Auto-dismiss overlays after inactivity
const AUTO_DISMISS_MS = 60000;
const _autoDismissTimers = {};
const _autoDismissCleanup = {};
function autoDismiss(id, closeFn) {
    clearTimeout(_autoDismissTimers[id]);
    if (_autoDismissCleanup[id]) _autoDismissCleanup[id]();
    const el = document.getElementById(id);
    if (!el) return;
    function reset() { clearTimeout(_autoDismissTimers[id]); _autoDismissTimers[id] = setTimeout(() => closeFn(), AUTO_DISMISS_MS); }
    reset();
    const overlayEvents = ['mousemove','touchstart','click','scroll'];
    const docEvents = ['mousemove','touchstart'];
    const docKeyEvents = ['keydown'];
    overlayEvents.forEach(evt => el.addEventListener(evt, reset, {passive:true}));
    docEvents.forEach(evt => document.addEventListener(evt, reset, {passive:true}));
    docKeyEvents.forEach(evt => document.addEventListener(evt, reset));
    _autoDismissCleanup[id] = () => {
        overlayEvents.forEach(evt => el.removeEventListener(evt, reset));
        docEvents.forEach(evt => document.removeEventListener(evt, reset));
        docKeyEvents.forEach(evt => document.removeEventListener(evt, reset));
    };
}
function cancelAutoDismiss(id) { clearTimeout(_autoDismissTimers[id]); if (_autoDismissCleanup[id]) { _autoDismissCleanup[id](); delete _autoDismissCleanup[id]; } }
function autoDismiss3D(id, closeFn) {
    clearTimeout(_autoDismissTimers[id]);
    if (_autoDismissCleanup[id]) _autoDismissCleanup[id]();
    const el = document.getElementById(id);
    if (!el) return;
    const V3D_MS = AUTO_DISMISS_MS * 3;
    function reset() { clearTimeout(_autoDismissTimers[id]); _autoDismissTimers[id] = setTimeout(() => closeFn(), V3D_MS); }
    reset();
    const overlayEvents = ['mousemove','touchstart','click','scroll'];
    const docEvents = ['mousemove','touchstart'];
    const docKeyEvents = ['keydown'];
    overlayEvents.forEach(evt => el.addEventListener(evt, reset, {passive:true}));
    docEvents.forEach(evt => document.addEventListener(evt, reset, {passive:true}));
    docKeyEvents.forEach(evt => document.addEventListener(evt, reset));
    _autoDismissCleanup[id] = () => {
        overlayEvents.forEach(evt => el.removeEventListener(evt, reset));
        docEvents.forEach(evt => document.removeEventListener(evt, reset));
        docKeyEvents.forEach(evt => document.removeEventListener(evt, reset));
    };
}
window.autoDismiss = autoDismiss;
window.autoDismiss3D = autoDismiss3D;
window.cancelAutoDismiss = cancelAutoDismiss;

// ═══ SOCIAL PROOF TICKER ═══
const quotes=[
    {q:"A strategic catalyst for change... masterfully leverages technology to engineer fundamental shifts in systems and culture",a:"Ayman Hassan Soliman",r:"Senior Deputy GM"},
    {q:"Amr gets things done... delivering outstanding results on even the most complex and ambitious projects",a:"Omar Mohey",r:"Senior Data Steward"},
    {q:"Outstanding Scrum Master... organized, supportive, and excellent at guiding the team to achieve sprint goals",a:"Esmail Eldally",r:"Data Analyst"},
    {q:"The rare talent who sees the future of our data landscape, and then challenges, coaches, and leads his team to drive that change",a:"Alaa Ghaly",r:"Assistant Manager"},
    {q:"Wide knowledge in multidisciplinary topics, almost like a Wikipedia moving on Earth!",a:"Mohamed Abaza",r:"Lead Data Scientist"},
    {q:"Demonstrates remarkable courage in challenging the status quo... catalyzing fundamental shifts in both systems and attitude",a:"Romany Youssef",r:"GTB MIS Manager"},
    {q:"Provided exceptional motivation and problem-solving strategies... guidance that exceeds expectations",a:"Ahmed Shewail",r:"Senior Banker"},
    {q:"EQ is off the charts... a knack for improving morale and productivity just by being himself",a:"Walid Gafeer",r:"Senior RM"},
    {q:"Working with him was transformative. His deep tech expertise and talent for fintech set him apart",a:"Eslam Youssef",r:"Senior Data Analyst"},
    {q:"The complete package — a blend of business acumen and technology skills every organization needs",a:"Dina Tony",r:"Senior Corporate RM"}
];
function buildTicker(){
    const t=document.getElementById('ticker');
    if(!t)return;
    const html=quotes.map(q=>`<div class="tq">"${q.q}" — <strong>${q.a}</strong>, ${q.r}</div>`).join('');
    t.innerHTML=html+html;
}
buildTicker();

// ═══ PARTICLES ═══
const cv=document.getElementById('bgC');
let W,H,pts=[],mouse={x:-9999,y:-9999},gy={x:0,y:0};
const PC=D?90:45,CD=140,MR=200;let pC={r:0,g:225,b:255};
let cx=null;
let _pWorker=null,_pData=null,_pUsingWorker=false,_pOffscreen=false;
if(cv&&!reducedMotion&&typeof Worker!=='undefined'&&typeof cv.transferControlToOffscreen==='function'){
try{_pWorker=new Worker('Js/particle-worker.js');_pUsingWorker=true;_pOffscreen=true;
const offscreen=cv.transferControlToOffscreen();
_pWorker.postMessage({type:'init',canvas:offscreen,W:innerWidth,H:innerHeight,count:PC,CD:CD,MR:MR,color:pC},[offscreen]);
_pWorker.onerror=function(){_pUsingWorker=false;_pOffscreen=false;_pWorker=null;};}catch(e){_pUsingWorker=false;_pOffscreen=false;_pWorker=null;}}
if(!_pOffscreen){cx=cv?cv.getContext('2d'):null;
if(cv&&cx&&!reducedMotion&&typeof Worker!=='undefined'&&!_pUsingWorker){
try{_pWorker=new Worker('Js/particle-worker.js');_pUsingWorker=true;
_pWorker.onmessage=function(e){_pData=e.data;};
_pWorker.onerror=function(){_pUsingWorker=false;_pWorker=null;_fallbackParticles();};}catch(e){_pUsingWorker=false;}}}
function _workerDraw(){if(window._suspended)return;if(!_pData){requestAnimationFrame(_workerDraw);return;}
cx.clearRect(0,0,W,H);const{r,g,b}=pC;const pos=_pData.positions,conn=_pData.connections;
const n=pos.length/3;
for(let i=0;i<n;i++){const x=pos[i*3],y=pos[i*3+1],cr=pos[i*3+2];
cx.beginPath();cx.arc(x,y,cr,0,6.28);cx.fillStyle=`rgba(${r},${g},${b},.4)`;cx.fill();
cx.beginPath();cx.arc(x,y,cr*3,0,6.28);cx.fillStyle=`rgba(${r},${g},${b},.04)`;cx.fill();}
cx.lineWidth=.5;
for(let i=0;i<conn.length;i+=3){const ai=conn[i],bi=conn[i+1],al=conn[i+2]*.12;
cx.beginPath();cx.strokeStyle=`rgba(${r},${g},${b},${al})`;
cx.moveTo(pos[ai*3],pos[ai*3+1]);cx.lineTo(pos[bi*3],pos[bi*3+1]);cx.stroke();}
_pWorker.postMessage({type:'input',mouse:mouse,gy:gy});
_pWorker.postMessage({type:'tick'});
requestAnimationFrame(_workerDraw);}
function _pInputRelay(){if(!_pWorker){return;}_pWorker.postMessage({type:'input',mouse:mouse,gy:gy});requestAnimationFrame(_pInputRelay);}
// Fallback: inline particles when Worker unavailable
class Pt{constructor(){this.x=Math.random()*W;this.y=Math.random()*H;this.vx=(Math.random()-.5)*.4;this.vy=(Math.random()-.5)*.4;this.r=Math.random()*1.2+.4;this.ph=Math.random()*6.28;}
update(){this.ph+=.015;this.cr=this.r+Math.sin(this.ph)*.25;this.x+=this.vx+gy.x*.04;this.y+=this.vy+gy.y*.04;if(this.x<-10)this.x=W+10;if(this.x>W+10)this.x=-10;if(this.y<-10)this.y=H+10;if(this.y>H+10)this.y=-10;const dx=mouse.x-this.x,dy=mouse.y-this.y,d=Math.sqrt(dx*dx+dy*dy);if(d<MR&&d>0){const f=(MR-d)/MR;this.x-=(dx/d)*f*2.5;this.y-=(dy/d)*f*2.5;}}
draw(){const{r,g,b}=pC;cx.beginPath();cx.arc(this.x,this.y,this.cr,0,6.28);cx.fillStyle=`rgba(${r},${g},${b},.4)`;cx.fill();cx.beginPath();cx.arc(this.x,this.y,this.cr*3,0,6.28);cx.fillStyle=`rgba(${r},${g},${b},.04)`;cx.fill();}}
function initP(){pts=[];for(let i=0;i<PC;i++)pts.push(new Pt());}
function drawP(){if(window._suspended)return;cx.clearRect(0,0,W,H);const{r,g,b}=pC;for(let i=0;i<pts.length;i++){const a=pts[i];a.update();a.draw();for(let j=i+1;j<pts.length;j++){const bb=pts[j],dx=a.x-bb.x,dy=a.y-bb.y,dd=dx*dx+dy*dy;if(dd<CD*CD){const al=(1-Math.sqrt(dd)/CD)*.12;cx.beginPath();cx.strokeStyle=`rgba(${r},${g},${b},${al})`;cx.lineWidth=.5;cx.moveTo(a.x,a.y);cx.lineTo(bb.x,bb.y);cx.stroke();}}}requestAnimationFrame(drawP);}
function _fallbackParticles(){if(pts.length)return;initP();drawP();}
function rsz(){if(!cv)return;W=innerWidth;H=innerHeight;if(!_pOffscreen){cv.width=W;cv.height=H;}
if(_pUsingWorker&&_pWorker){_pWorker.postMessage({type:'resize',W:W,H:H});}
else if(!pts.length&&!_pUsingWorker&&!reducedMotion){initP();}}
addEventListener('resize',rsz);rsz();
if(!cv||reducedMotion){/* skip particles */}
else if(_pOffscreen){window._pWorker=_pWorker;requestAnimationFrame(_pInputRelay);}
else if(_pUsingWorker){window._pWorker=_pWorker;_pWorker.postMessage({type:'init',W:W,H:H,count:PC,CD:CD,MR:MR});_pWorker.postMessage({type:'tick'});window._registerLoop('particles',_workerDraw);}
else if('requestIdleCallback' in window){requestIdleCallback(()=>{initP();window._registerLoop('particles-fb',drawP);});}
else{setTimeout(()=>{initP();window._registerLoop('particles-fb',drawP);},100);}

loadLake().then(()=>{if(window._lake&&window._lake.waitReady){window._lake.waitReady().then(()=>{const s=localStorage.getItem('streak'),l=localStorage.getItem('lastVisit');if(s)window._lake.put('meta','streak',s);if(l)window._lake.put('meta','lastVisit',l);}).catch(()=>{});}}).catch(()=>{});
setTimeout(()=>{loadPrefetch().catch(()=>{});},5000);
loadPressure().catch(()=>{});
loadBiometric().catch(()=>{});
loadSonification().catch(()=>{});
loadCrossWindow().catch(()=>{});
addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;},{passive:true});
addEventListener('touchmove',e=>{if(e.touches[0]){mouse.x=e.touches[0].clientX;mouse.y=e.touches[0].clientY;}},{passive:true});
addEventListener('touchend',()=>{mouse.x=-9999;mouse.y=-9999;});
if(typeof DeviceOrientationEvent!=='undefined'){if(typeof DeviceOrientationEvent.requestPermission==='function'){document.body.addEventListener('touchstart',function g(){DeviceOrientationEvent.requestPermission().then(r=>{if(r==='granted')addEventListener('deviceorientation',oG);}).catch(()=>{});document.body.removeEventListener('touchstart',g);},{once:true});}else addEventListener('deviceorientation',oG);}
function oG(e){if(e.gamma!=null)gy.x=e.gamma;if(e.beta!=null)gy.y=e.beta;}

// ═══ CURSOR ═══
if(D&&!reducedMotion){const dot=document.getElementById('cdd'),glo=document.getElementById('cg');if(dot&&glo){let gx=0,gy2=0;
document.addEventListener('mousemove',e=>{dot.style.left=e.clientX+'px';dot.style.top=e.clientY+'px';glo.classList.add('on');});
(function ag(){requestAnimationFrame(ag);if(window._suspended||document.hidden)return;gx+=(mouse.x-gx)*.08;gy2+=(mouse.y-gy2)*.08;glo.style.left=gx+'px';glo.style.top=gy2+'px';})();
const hs='a,button,.pf,.lk,.nl';document.addEventListener('mouseover',e=>{if(e.target.closest(hs))dot.classList.add('hov');});document.addEventListener('mouseout',e=>{if(e.target.closest(hs))dot.classList.remove('hov');});
document.querySelectorAll('.lk').forEach(card=>{const sp=card.querySelector('.ls');let cxx=0,cyy=0,tx=0,ty=0;
card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(sp)sp.style.background=`radial-gradient(250px circle at ${x}px ${y}px,var(--glow),transparent 70%)`;tx=((y-r.height/2)/(r.height/2))*-6;ty=((x-r.width/2)/(r.width/2))*6;});
card.addEventListener('mouseleave',()=>{tx=0;ty=0;});(function spr(){requestAnimationFrame(spr);if(window._suspended||document.hidden)return;cxx+=(tx-cxx)*.12;cyy+=(ty-cyy)*.12;if(Math.abs(tx-cxx)>.01||Math.abs(ty-cyy)>.01||tx!==0)card.style.transform=`perspective(800px) rotateX(${cxx}deg) rotateY(${cyy}deg) scale3d(1.01,1.01,1.01)`;else card.style.transform='';})();});}}

// ═══ TOOLBAR TOGGLE ═══
(function(){
    const tb=document.getElementById('topBtns');
    const tog=document.getElementById('tbToggle');
    if(!tb||!tog)return;
    let expanded=false,collapseTimer=null;
    function collapse(){expanded=false;tb.classList.remove('expanded');tog.textContent='⋮';collapseTimer=null;}
    function resetTimer(){clearTimeout(collapseTimer);if(expanded)collapseTimer=setTimeout(collapse,10000);}
    tog.addEventListener('click',function(e){
        e.stopPropagation();
        expanded=!expanded;
        tb.classList.toggle('expanded',expanded);
        tog.textContent=expanded?'✕':'⋮';
        clearTimeout(collapseTimer);
        if(expanded)collapseTimer=setTimeout(collapse,10000);
        if(window._haptic)window._haptic[expanded?'menuOpen':'menuClose']();
    });
    tb.addEventListener('mouseenter',function(){clearTimeout(collapseTimer);});
    tb.addEventListener('mouseleave',function(){if(expanded)collapseTimer=setTimeout(collapse,10000);});
    tb.addEventListener('click',function(){resetTimer();});
    document.addEventListener('click',function(e){
        if(expanded&&!tb.contains(e.target)){clearTimeout(collapseTimer);collapse();}
    });
})();

// ═══ USER INTERACTION GATE (for vibrate API) ═══
window._userHasInteracted=false;
['click','touchstart','keydown'].forEach(evt=>document.addEventListener(evt,function(){window._userHasInteracted=true;},{once:true,passive:true}));

function _lakePref(k,v){if(window._lake&&window._lake.isReady)window._lake.put('prefs',k,v);}

// ═══ THEME ═══
function applyTheme(m){const i=document.getElementById('ticon'),l=m==='light';document.body.classList.toggle('light-mode',l);i.className=l?'fa-solid fa-moon':'fa-solid fa-sun';pC=l?{r:15,g:23,b:42}:{r:0,g:225,b:255};if(_pOffscreen&&_pWorker)_pWorker.postMessage({type:'color',color:pC});const q=document.getElementById('qri');if(q){const fg=l?'0066ff':'00e1ff',bg=l?'f4f6fb':'06080f';q.src=`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://amrelharony.com&color=${fg}&bgcolor=${bg}`;}const tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.setAttribute('content',l?'#f4f6fb':'#06080f');}
window._applyTheme=applyTheme;
const sv=localStorage.getItem('theme'),hr=new Date().getHours();applyTheme(sv||(hr>=6&&hr<18?'light':'dark'));
document.getElementById('tbtn').addEventListener('click',()=>{const n=document.body.classList.contains('light-mode')?'dark':'light';localStorage.setItem('theme',n);_lakePref('theme',n);applyTheme(n);if(window._haptic)window._haptic.toggle();});

// ═══ FLIP ═══
window.toggleFlip=()=>{document.getElementById('fc').classList.toggle('flipped');if(window._haptic)window._haptic.cardFlip();if(window.VDna){window.VDna.get()._flippedCard=true;window.VDna.save();}};

// ═══ STATUS, HOLIDAYS, WEATHER → moved to ui-peripherals.js ═══

// ═══ TEXT SCRAMBLE ═══
class Scr{constructor(el){this.el=el;this.ch='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';}
run(text){if(reducedMotion){this.el.innerHTML=`<span class="ng">${text}</span>`;return;}const q=[];for(let i=0;i<text.length;i++)q.push({to:text[i],start:Math.floor(Math.random()*15),end:Math.floor(Math.random()*15)+15+i*2,c:null});let f=0;const u=()=>{if(window._suspended){this.el.innerHTML=`<span class="ng">${text}</span>`;return;}let o='',done=0;for(let i=0;i<q.length;i++){const x=q[i];if(f>=x.end){o+=x.to;done++;}else if(f>=x.start){if(!x.c||Math.random()<.3)x.c=this.ch[Math.floor(Math.random()*this.ch.length)];o+=`<span class="sg">${x.c}</span>`;}else o+='';}this.el.innerHTML=o;if(done<q.length){f++;requestAnimationFrame(u);}else this.el.innerHTML=`<span class="ng">${text}</span>`;};u();}}

// ═══ PRELOADER ═══
const stages=['RESOLVING DNS','ESTABLISHING TLS','LOADING MODULES','DECRYPTING PAYLOAD','RENDERING INTERFACE','READY'];
const SPEED=isRepeatVisit?8:4;
let _siteReady=false;
if(window._blogDirect){const pre=document.getElementById('preloader');if(pre)pre.style.display='none';const io=document.getElementById('introOverlay');if(io)io.style.display='none';document.body.style.overflow='auto';document.body.style.overflowX='hidden';_siteReady=true;setTimeout(launch,0);}else{
gsap.to('#preLine',{opacity:1,duration:.3,delay:.1});gsap.to('#preCtr',{opacity:1,duration:.3,delay:.2});gsap.to('#preBar',{opacity:1,duration:.3,delay:.3});gsap.to('#preStg',{opacity:1,duration:.3,delay:.35});
let prog=0;const _preCtr=document.getElementById('preCtr'),_preFill=document.getElementById('preFill'),_preStg=document.getElementById('preStg');const li=setInterval(()=>{prog=Math.min(100,prog+Math.random()*SPEED+1.5);const p=Math.round(prog);if(_preCtr)_preCtr.textContent=p;if(_preFill)_preFill.style.width=p+'%';if(_preStg)_preStg.textContent=stages[Math.min(stages.length-1,Math.floor(p/100*stages.length))];if(p>=100){clearInterval(li);setTimeout(_preloaderDone,isRepeatVisit?100:300);}},isRepeatVisit?20:30);
}
function _preloaderDone(){const pre=document.getElementById('preloader');gsap.to('#preCtr',{scale:1.3,opacity:0,duration:.3,ease:'power2.in'});gsap.to(['#preLine','#preBar','#preStg'],{opacity:0,duration:.2});pre.style.clipPath='inset(0 0 0% 0)';gsap.to(pre,{clipPath:'inset(0 0 100% 0)',duration:.7,delay:.2,ease:'power4.inOut',onComplete:()=>{pre.style.display='none';}});if(!reducedMotion&&window._dataIntro){var _dcLaunched=false;var _dcLaunch=function(){if(_dcLaunched)return;_dcLaunched=true;launch();};setTimeout(()=>{try{window._dataIntro.init(window._weatherData,_dcLaunch);}catch(e){console.warn('[DataCinema] init failed:',e);_dcLaunch();}},600);setTimeout(_dcLaunch,6000);}else{setTimeout(launch,500);}}

function done(el){
el.classList.remove('rv');el.style.opacity='';el.style.transform='';gsap.set(el,{clearProps:'all'});el.style.opacity='1';el.style.transform='none';
}
window._isSiteReady=()=>_siteReady;
window._launch=launch;
function launch(){
    const app=document.getElementById('app');
    document.body.style.overflow='auto';document.body.style.overflowX='hidden';_siteReady=true;
    gsap.to(app,{opacity:1,duration:.5,delay:.1});setTimeout(function(){if(window._updStatus)window._updStatus();_showPeripherals();},1000);
    document.querySelectorAll('.rv').forEach((el,i)=>{gsap.to(el,{opacity:1,y:0,duration:.9,delay:.8+i*.08,ease:'power3.out',onComplete:()=>done(el)});});
    setTimeout(()=>{const _hn=document.getElementById('hname');if(_hn)new Scr(_hn).run('Amr Elharony');},1400);
    document.querySelectorAll('.rt').forEach((t,i)=>{gsap.from(t,{scale:.7,opacity:0,y:10,duration:.5,delay:1.1+i*.1,ease:'back.out(2)',onComplete:()=>{gsap.set(t,{clearProps:'all'});t.style.opacity='1';}});});
    document.querySelectorAll('.lk').forEach((c,i)=>{gsap.fromTo(c,{opacity:0,y:50,scale:.92,rotateX:10,filter:'blur(6px)'},{opacity:1,y:0,scale:1,rotateX:0,filter:'blur(0px)',duration:.8,delay:1.4+i*.12,ease:'power3.out',onComplete:()=>done(c)});});
    document.querySelectorAll('.nl').forEach((c,i)=>{gsap.fromTo(c,{opacity:0,x:-20},{opacity:1,x:0,duration:.6,delay:2+i*.1,ease:'power2.out',onComplete:()=>done(c)});});

    // Timeline stagger
    document.querySelectorAll('.tl-item').forEach((t,i)=>{gsap.fromTo(t,{opacity:0,x:-15},{opacity:1,x:0,duration:.5,delay:2.2+i*.12,ease:'power2.out'});});
    window.dispatchEvent(new CustomEvent('AmrOS:Launched'));
}

function _showPeripherals(){
    window._peripheralsShown=true;
    var st=document.getElementById('statusBadge');
    if(st)st.classList.add('show');
    var w=document.getElementById('weatherWidget');
    if(w)w.classList.add('show');
    var tb=document.getElementById('topBtns');
    if(tb)tb.classList.add('show');
    var ch=document.querySelector('.challenge-hud');
    if(ch)ch.classList.add('show');
    var fab=document.getElementById('askFab');
    if(fab)fab.classList.add('show');
    window.dispatchEvent(new CustomEvent('AmrOS:PeripheralsReady'));
}
window._showPeripherals=_showPeripherals;

// ═══ FIRST-LOAD SHORTCUTS OVERLAY (Desktop) ═══
if (D && !localStorage.getItem('shortcuts_seen')) {
    const GROUPS = [
        { title: '📍 Navigate Sections', shortcuts: [
            { key: '1', icon: '👤', label: 'Profile & Intro' },
            { key: '2', icon: '🚀', label: 'The Journey' },
            { key: '3', icon: '📜', label: 'Certifications' },
            { key: '4', icon: '⭐', label: 'Testimonials' },
            { key: '5', icon: '📧', label: 'Contact & Links' },
            { key: '6', icon: '📝', label: 'Newsletters' },
        ]},
        { title: '✨ Features', shortcuts: [
            { key: 'S', icon: '🔊', label: 'Sound On/Off' },
            { key: 'G', icon: '🌍', label: 'Guestbook' },
            { key: 'A', icon: '🕹️', label: 'Arcade' },
            { key: 'T', icon: '🏆', label: 'Trophy Case' },
            { key: 'V', icon: '🎙️', label: 'Voice Nav' },
            { key: '/', icon: '💬', label: 'Cursor Chat' },
        ]},
        { title: '🎨 Vibes', shortcuts: [
            { key: 'D', icon: '🌗', label: 'Dark / Light' },
            { key: 'C', icon: '🔓', label: 'Reveal Contacts' },
            { key: 'Z', icon: '🧘', label: 'Zen Mode' },
            { key: 'M', icon: '💚', label: 'Matrix Rain' },
        ]},
        { title: '🛠️ Tools', shortcuts: [
            { key: '`', icon: '💻', label: 'Terminal' },
            { key: '⌘K', icon: '🔍', label: 'Search' },
            { key: '?', icon: '⌨️', label: 'All Shortcuts' },
            { key: 'Esc', icon: '✕', label: 'Close Overlay' },
        ]},
    ];
    const overlay = document.createElement('div');
    overlay.id = 'shortcutsWelcome';
    overlay.innerHTML = `<div class="sw-panel">
        <div class="sw-header">
            <div class="sw-title">⌨️ Keyboard Shortcuts</div>
            <div class="sw-sub">This site is fully keyboard-navigable. Here are your keys.</div>
        </div>
        <div class="sw-groups">${GROUPS.map(g => `
            <div class="sw-group">
                <div class="sw-group-title">${g.title}</div>
                <div class="sw-grid">${g.shortcuts.map(s =>
                    `<div class="sw-item"><span class="sw-kbd">${s.key}</span><span class="sw-label">${s.icon} ${s.label}</span></div>`
                ).join('')}</div>
            </div>`).join('')}
        </div>
        <button class="sw-dismiss" id="swDismiss">Got it — Let's go</button>
    </div>`;
    document.body.appendChild(overlay);

    function dismissWelcome() {
        localStorage.setItem('shortcuts_seen', '1'); _lakePref('shortcuts_seen','1');
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    }

    function showWelcome(){
        if(!_siteReady){setTimeout(showWelcome,500);return;}
        setTimeout(()=>{
            overlay.classList.add('visible');
            document.getElementById('swDismiss').addEventListener('click', dismissWelcome);
            overlay.addEventListener('click', e => { if (e.target === overlay) dismissWelcome(); });
            document.addEventListener('keydown', function esc(e) {
                if (e.key === 'Escape') { dismissWelcome(); document.removeEventListener('keydown', esc); }
            });
        },800);
    }
    setTimeout(showWelcome, 2500);
}

// ═══ PROXIMITY-GATED CONTACT ═══
let contactRevealed=false,isNearby=false;
function revealContact(){
    if(contactRevealed)return;contactRevealed=true;
    const secret=document.getElementById('contactSecret'),hint=document.getElementById('shakeHint'),deskHint=document.getElementById('deskHint'),bar=document.getElementById('shakeBar');
    if(!secret)return;
    if(window._spatialAudio&&window._spatialAudio.playContactUnlock)window._spatialAudio.playContactUnlock();
    secret.classList.add('revealed');if(hint){hint.classList.remove('shaking');hint.classList.add('unlocked');hint.innerHTML='<i class="fa-solid fa-lock-open" style="margin-right:4px;"></i> UNLOCKED';}if(bar)bar.classList.remove('active');
    secret.querySelectorAll('.si').forEach(el=>{const c=el.dataset.c;el.addEventListener('mouseenter',()=>el.style.color=c);el.addEventListener('mouseleave',()=>el.style.color='');});
    secret.querySelectorAll('.si').forEach((s,i)=>{gsap.from(s,{scale:0,rotation:90,duration:.5,delay:i*.08,ease:'back.out(3)',onComplete:()=>{gsap.set(s,{clearProps:'all'});s.style.opacity='1';}});});
    if(D&&!reducedMotion){secret.querySelectorAll('.si').forEach(el=>{el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-(r.left+r.width/2))*.35}px,${(e.clientY-(r.top+r.height/2))*.35}px)`;});el.addEventListener('mouseleave',()=>{el.style.transition='transform .5s cubic-bezier(.16,1,.3,1),color .3s';el.style.transform='';setTimeout(()=>el.style.transition='color .3s,transform .3s cubic-bezier(.16,1,.3,1)',.5e3);});});}
    setTimeout(()=>{[hint,deskHint].forEach(h=>{if(h){h.style.opacity='0';setTimeout(()=>h.style.display='none',400);}});},3000);
}
function enableNearbyHints(){isNearby=true;if(isMobile){const sh=document.getElementById('shakeHint');if(sh)sh.style.display='block';initShake();}}
if(!isMobile){const dh=document.getElementById('deskHint');if(dh)dh.style.display='block';}
if(params.has('s')){setTimeout(()=>revealContact(),3500);}else{
    const CAIRO_LAT=30.0444,CAIRO_LNG=31.2357,RADIUS_KM=25;
    function haversineKm(lat1,lon1,lat2,lon2){const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
    if(location.protocol==='https:'){_fetchT('https://ipapi.co/json/',null,6000).then(r=>{if(!r.ok)throw 0;return r.json();}).then(data=>{if(data.latitude){window._visitorLoc={lat:data.latitude,lng:data.longitude,city:data.city||'',country:data.country_name||'',continent:data.continent_code||''};const dist=haversineKm(data.latitude,data.longitude,CAIRO_LAT,CAIRO_LNG);if(dist<=RADIUS_KM)enableNearbyHints();}_recordSiteVisit(data);}).catch(()=>{_recordSiteVisit(null);});}else{_recordSiteVisit(null);}
}

// ═══ SITE VISIT RECORDER (Supabase) ═══
function _recordSiteVisit(geoData) {
  if (sessionStorage.getItem('_sv_recorded')) return;
  if (!window._sb) return;
  sessionStorage.setItem('_sv_recorded', '1');
  const sid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  window._visitSessionId = sid;
  const ua = navigator.userAgent || '';
  let browser = 'Unknown', os = 'Unknown', device = 'Desktop';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  if (/Tablet|iPad/i.test(ua)) device = 'Tablet';
  else if (/Mobi|Android|iPhone/i.test(ua)) device = 'Mobile';
  const row = {
    session_id: sid,
    lat: geoData?.latitude ?? null,
    lng: geoData?.longitude ?? null,
    city: geoData?.city ?? null,
    country: geoData?.country_name ?? null,
    continent: geoData?.continent_code ?? null,
    device, browser, os,
    screen_w: screen.width, screen_h: screen.height,
    referrer: document.referrer || null,
    page_url: location.href,
    is_mobile: /Mobi|Android/i.test(ua)
  };
  window._sb.from('site_visits').insert(row).then(() => {}).catch(() => {});
}

function initShake() {
    const REQUIRED_SHAKES = 2;
    const SHAKE_WINDOW = 3000;
    const hint = document.getElementById('shakeHint');
    const bar = document.getElementById('shakeBar');
    const fill = document.getElementById('shakeFill');
    let shakeCount = 0;
    let lastShakeTime = 0;
    let lastX = null, lastY = null, lastZ = null;
    let lastSample = 0;

    function onShakeDetected() {
        const now = Date.now();
        if (now - lastShakeTime > SHAKE_WINDOW) shakeCount = 0;
        lastShakeTime = now;
        shakeCount++;

        if(bar)bar.classList.add('active');
        if(hint)hint.classList.add('shaking');
        if(fill)fill.style.width = (shakeCount / REQUIRED_SHAKES * 100) + '%';

        if (shakeCount >= REQUIRED_SHAKES) {
            window.removeEventListener('devicemotion', handleMotion);
            revealContact();
            return;
        }

        hint.innerHTML = '<i class="fa-solid fa-mobile-screen-button" aria-hidden="true" style="margin-right:4px;"></i> ' +
            shakeCount + '/' + REQUIRED_SHAKES + ' — shake again!';
    }

    function handleMotion(e) {
        if (contactRevealed) return;

        const now = Date.now();
        if (now - lastSample < 80) return;
        lastSample = now;

        const acc = e.acceleration && (e.acceleration.x !== null) ? e.acceleration : null;
        const accG = e.accelerationIncludingGravity;

        if (acc) {
            const delta = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
            if (delta > 25) onShakeDetected();
        } else if (accG) {
            if (lastX === null) { lastX = accG.x; lastY = accG.y; lastZ = accG.z; return; }
            const dx = Math.abs(accG.x - lastX);
            const dy = Math.abs(accG.y - lastY);
            const dz = Math.abs(accG.z - lastZ);
            lastX = accG.x; lastY = accG.y; lastZ = accG.z;
            if (dx + dy + dz > 30) onShakeDetected();
        }
    }

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        document.body.addEventListener('touchstart', function rp() {
            DeviceMotionEvent.requestPermission().then(r => {
                if (r === 'granted') window.addEventListener('devicemotion', handleMotion);
            }).catch(() => {});
            document.body.removeEventListener('touchstart', rp);
        }, { once: true });
    } else if (typeof DeviceMotionEvent !== 'undefined') {
        window.addEventListener('devicemotion', handleMotion);
    }
}
function flashSection(){}
document.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA')return;
    const k = e.key;
    const sectionMap = {
        '1':'#pfw','2':'#secJourney','3':'#secCerts',
        '4':'#secTestimonials','5':'.sr','6':'#secNewsletters'
    };
    if(sectionMap[k]){
        const el=document.querySelector(sectionMap[k]);
        if(el){el.scrollIntoView({behavior:'smooth',block:'start'});flashSection(el);}
    }
});

// ═══ VCARD ═══
window.downloadVCard=function(){const vcard=['BEGIN:VCARD','VERSION:3.0','N:Elharony;Amr;;;','FN:Amr Elharony','TITLE:Delivery Lead | Mentor | Fintech Author & Speaker','ORG:Banque Misr','TEL;TYPE=CELL:+201114260806','EMAIL;TYPE=INTERNET:a.elharony@gmail.com','URL:https://amrelharony.com','URL:https://bilingualexecutive.amrelharony.com/','URL:https://www.linkedin.com/in/amrmelharony','X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/amrmelharony','X-SOCIALPROFILE;TYPE=telegram:https://t.me/Amrmelharony','NOTE:Scrum Master at Banque Misr. Author of The Bilingual Executive. DBA in Digital Transformation.','END:VCARD'].join('\r\n');
const blob=new Blob([vcard],{type:'text/vcard;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Amr_Elharony.vcf';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
const btn=document.getElementById('vcBtn'),txt=document.getElementById('vcTxt');if(btn&&txt){const icon=btn.querySelector('i');btn.classList.add('vcb-done');if(icon)icon.className='fa-solid fa-check';txt.textContent='SAVED!';if(window._haptic)window._haptic.success();setTimeout(()=>{btn.classList.remove('vcb-done');if(icon)icon.className='fa-solid fa-address-card';txt.textContent='Save Contact';},2500);}};

// ═══ EASTER EGG (Konami Code + Double-tap logo) ═══
const konami=[38,38,40,40];let kIdx=0;
document.addEventListener('keydown',e=>{if(e.keyCode===konami[kIdx]){kIdx++;if(kIdx===konami.length){kIdx=0;showEgg();}}else{kIdx=0;}});
let lastTap=0;const _pfwEl=document.getElementById('pfw');if(_pfwEl){_pfwEl.addEventListener('touchend',e=>{const now=Date.now();if(now-lastTap<300){e.preventDefault();showEgg();}lastTap=now;});
_pfwEl.addEventListener('dblclick',e=>{e.preventDefault();showEgg();});}
let _eggTimer=null;
function showEgg(){const el=document.getElementById('easterEgg');if(!el)return;el.classList.add('show');if(window._haptic)window._haptic.levelUp();clearTimeout(_eggTimer);_eggTimer=setTimeout(closeEgg,8000);}
window.closeEgg=function(){const el=document.getElementById('easterEgg');if(el)el.classList.remove('show');clearTimeout(_eggTimer);_eggTimer=null;};
// Escape handled by unified handler below


// ═══ VISITOR COUNTER → moved to ui-peripherals.js ═══

// ═══ PRESENCE ENGINE v2 (lazy-loaded) ═══
var presenceLoaded=false,presenceLoadPromise=null;
function loadPresenceEngine(){
  if(presenceLoaded)return Promise.resolve();
  if(presenceLoadPromise)return presenceLoadPromise;
  if(!_sb)return Promise.reject();
  presenceLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/presence-engine.js';
    s.onload=()=>{presenceLoaded=true;resolve();};
    s.onerror=()=>{presenceLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return presenceLoadPromise;
}
loadPresenceEngine().catch(()=>{ console.warn('[Presence] Failed to load presence engine — _sb may be null or script failed.'); });

/* OLD MULTIPLAYER IIFE REMOVED — now in presence-engine.js */

// ═══ SHARE CARD ═══
window.openShare=function(){
    const c=document.getElementById('shareCanvas');if(!c)return;
    const ctx=c.getContext('2d');
    const l=document.body.classList.contains('light-mode');
    const W=600,H=340;
    c.width=W;c.height=H;

    // Background with gradient mesh
    ctx.fillStyle=l?'#f4f6fb':'#06080f';ctx.fillRect(0,0,W,H);
    // Mesh blobs
    const drawBlob=(x,y,r,color,alpha)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color.replace(')',`,${alpha})`).replace('rgb','rgba'));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);};
    drawBlob(80,60,180,l?'rgb(0,102,255)':'rgb(0,225,255)',l?0.06:0.08);
    drawBlob(500,280,160,l?'rgb(79,70,229)':'rgb(99,102,241)',l?0.05:0.06);
    drawBlob(350,100,120,l?'rgb(147,51,234)':'rgb(168,85,247)',l?0.03:0.04);

    // Top accent bar gradient
    const grd=ctx.createLinearGradient(0,0,W,0);
    grd.addColorStop(0,l?'#0066ff':'#00e1ff');grd.addColorStop(0.5,l?'#4f46e5':'#6366f1');grd.addColorStop(1,l?'#9333ea':'#a855f7');
    ctx.fillStyle=grd;ctx.fillRect(0,0,W,4);

    // Name
    ctx.font='bold 34px Inter,sans-serif';ctx.fillStyle=l?'#0a0f1a':'#f0f2f5';
    ctx.fillText('Amr Elharony',40,72);

    // Title with accent
    ctx.font='13px JetBrains Mono,monospace';
    const titleGrd=ctx.createLinearGradient(40,0,400,0);
    titleGrd.addColorStop(0,l?'#0066ff':'#00e1ff');titleGrd.addColorStop(1,l?'#4f46e5':'#6366f1');
    ctx.fillStyle=titleGrd;
    ctx.fillText('Delivery Lead · Mentor · Fintech Author & Speaker',40,100);

    // Divider line
    ctx.strokeStyle=l?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.06)';
    ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40,120);ctx.lineTo(W-40,120);ctx.stroke();

    // Stats row
    const stats=[
        {val:'20+',label:'CERTIFICATIONS',icon:'🎓'},
        {val:'80+',label:'RECOMMENDATIONS',icon:'⭐'},
        {val:'2,300+',label:'MENTORING MINS',icon:'🗣️'},
        {val:'12+',label:'YEARS IN BANKING',icon:'🏦'}
    ];
    const statW=130;
    stats.forEach((s,i)=>{
        const x=40+i*statW;
        ctx.font='18px serif';ctx.fillText(s.icon,x,164);
        ctx.font='bold 22px JetBrains Mono,monospace';
        ctx.fillStyle=l?'#0066ff':'#00e1ff';ctx.fillText(s.val,x+24,166);
        ctx.font='7px JetBrains Mono,monospace';
        ctx.fillStyle=l?'#5a6578':'#4a5568';ctx.fillText(s.label,x,182);
        ctx.fillStyle=l?'#0a0f1a':'#f0f2f5';
    });

    // Testimonial snippet
    ctx.font='italic 11px Inter,sans-serif';
    ctx.fillStyle=l?'#5a6578':'#6b7a90';
    ctx.fillText('"A strategic catalyst for change... masterfully leverages technology"',40,220);
    ctx.font='9px JetBrains Mono,monospace';
    ctx.fillStyle=l?'#8a94a6':'#4a5568';
    ctx.fillText('— Ayman Hassan Soliman, Senior Deputy GM, Banque Misr',40,238);

    // Footer
    ctx.fillStyle=l?'rgba(0,0,0,0.03)':'rgba(255,255,255,0.02)';
    ctx.fillRect(0,H-50,W,50);
    ctx.strokeStyle=l?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.04)';
    ctx.beginPath();ctx.moveTo(0,H-50);ctx.lineTo(W,H-50);ctx.stroke();

    ctx.font='11px JetBrains Mono,monospace';
    ctx.fillStyle=l?'#0066ff':'#00e1ff';ctx.fillText('amrelharony.com',40,H-20);

    ctx.font='9px JetBrains Mono,monospace';
    ctx.fillStyle=l?'#8a94a6':'#4a5568';
    ctx.fillText('linkedin.com/in/amrmelharony',W-220,H-20);

    const _shareOv=document.getElementById('shareOverlay');if(_shareOv)_shareOv.classList.add('show');
    if(window._haptic)window._haptic.menuOpen();
    _trapFocus('shareOverlay');
    autoDismiss('shareOverlay',closeShare);
};

window.closeShare=function(){const el=document.getElementById('shareOverlay');if(el)el.classList.remove('show');if(window._haptic)window._haptic.menuClose();_releaseFocus('shareOverlay');cancelAutoDismiss('shareOverlay');};

// QR code now uses external API image — no canvas generation needed

// Tab switching
document.querySelectorAll('.share-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
        document.querySelectorAll('.share-tab').forEach(t=>t.classList.remove('active'));
        document.querySelectorAll('.share-tab-content').forEach(c=>{c.classList.remove('active');c.style.display='none';});
        tab.classList.add('active');
        const content=document.querySelector(`.share-tab-content[data-content="${tab.dataset.tab}"]`);
        if(content){content.classList.add('active');content.style.display=tab.dataset.tab==='platforms'?'block':tab.dataset.tab==='qr'?'block':'block';}
        if(window._haptic)window._haptic.tap();
    });
});

// Platform sharing
const SHARE_URL='https://amrelharony.com';
const SHARE_TITLE='Amr Elharony — Delivery Lead · Mentor · Fintech Author';
const SHARE_TEXT='Check out Amr Elharony\'s portfolio — Delivery Lead, Mentor, and FinTech Author with 20+ certifications and 80+ recommendations.';

document.querySelectorAll('.share-plat').forEach(btn=>{
    btn.addEventListener('click',()=>{
        const p=btn.dataset.platform;
        const urls={
            linkedin:`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
            twitter:`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`,
            whatsapp:`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT+' '+SHARE_URL)}`,
            telegram:`https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`,
            email:`mailto:?subject=${encodeURIComponent(SHARE_TITLE)}&body=${encodeURIComponent(SHARE_TEXT+'\n\n'+SHARE_URL)}`,
            facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`
        };
        if(p==='copy'){
            navigator.clipboard.writeText(SHARE_URL).then(()=>{showCopied();if(window._haptic)window._haptic.success();}).catch(()=>{});
        } else if(p==='native'){
            if(navigator.share)navigator.share({title:SHARE_TITLE,text:SHARE_TEXT,url:SHARE_URL}).catch(()=>{});
            else{navigator.clipboard.writeText(SHARE_URL).then(()=>{showCopied();});}
        } else if(urls[p]){
            window.open(urls[p],'_blank','noopener,width=600,height=500');
        }
        if(window.VDna){VDna.addXp(5);VDna.get()._shared=true;VDna.save();}
    });
});

function showCopied(){
    const el=document.getElementById('shareCopied');
    if(!el)return;
    el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1500);
}

window.downloadShareCard=function(){
    const c=document.getElementById('shareCanvas');if(!c)return;
    const a=document.createElement('a');a.download='Amr_Elharony_Card.png';
    a.href=c.toDataURL('image/png');a.click();
};

window.copyShareImage=function(){
    const c=document.getElementById('shareCanvas');if(!c)return;
    c.toBlob(blob=>{
        if(blob&&navigator.clipboard&&navigator.clipboard.write){
            navigator.clipboard.write([new ClipboardItem({'image/png':blob})]).then(()=>showCopied()).catch(()=>{showCopied();});
        } else {showCopied();}
    },'image/png');
};
// Escape handled by unified handler

// ═══ STREAK ═══
(function(){const today=new Date().toDateString(),last=localStorage.getItem('lastVisit');let streak=parseInt(localStorage.getItem('streak')||'0');if(last!==today){const yd=new Date();yd.setDate(yd.getDate()-1);streak=(last===yd.toDateString())?streak+1:1;}localStorage.setItem('streak',streak.toString());localStorage.setItem('lastVisit',today);if(window._lake&&window._lake.isReady){window._lake.put('meta','streak',streak.toString());window._lake.put('meta','lastVisit',today);}if(streak>1){const sc=document.getElementById('streakCount');if(sc)sc.textContent=`🔥 ${streak}-day visit streak`;}})();


// ═════════════════════════════════════════════════
// SYSTEM 1: VISITOR INTELLIGENCE ENGINE
// ═════════════════════════════════════════════════
const VDna=(function(){
    const k='v_dna';let p;try{p=JSON.parse(localStorage.getItem(k)||'{}');}catch(e){p={};localStorage.removeItem(k);}
    p.visits=(p.visits||0)+1;
    p.firstVisit=p.firstVisit||(window.getTrueTime?window.getTrueTime():Date.now());
    p.lastVisit=window.getTrueTime?window.getTrueTime():Date.now();
    p.device=D?'desktop':'mobile';
    p.os=navigator.userAgent.match(/Windows/)?"Windows":navigator.userAgent.match(/Mac/)?"Mac":navigator.userAgent.match(/Android/)?"Android":navigator.userAgent.match(/iPhone|iPad/)?"iOS":"Other";
    p.browser=navigator.userAgent.match(/Chrome/)?"Chrome":navigator.userAgent.match(/Firefox/)?"Firefox":navigator.userAgent.match(/Safari/)?"Safari":"Other";
    p.screen=`${screen.width}x${screen.height}`;
    p.lang=navigator.language;
    p.tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
    p.ref=params.get('ref')||document.referrer||'direct';
    p.scrollMax=p.scrollMax||0;
    p.clickedLinks=p.clickedLinks||[];
    p.sectionsViewed=p.sectionsViewed||[];
    p.unlocked=p.unlocked||{};
    p.utmSources=p.utmSources||[];
    p.xp=p.xp||0;
    p.level=p.level||1;
    p.challengeDate=p.challengeDate||'';
    p.challengeDone=p.challengeDone||false;
    p.lastScrollY=p.lastScrollY||0;
    p.smartCtaDismissed=p.smartCtaDismissed||false;
    p.sessionClicks=0;
    p.sessionStart=Date.now();
    function save(){
        try{localStorage.setItem(k,JSON.stringify(p));}catch(e){if(p.clickedLinks.length>100)p.clickedLinks=p.clickedLinks.slice(-50);if(p.sectionsViewed.length>50)p.sectionsViewed=p.sectionsViewed.slice(-25);try{localStorage.setItem(k,JSON.stringify(p));}catch(e2){}}
        if(window._lake&&window._lake.isReady){
            for(const[field,val]of Object.entries(p)){
                window._lake.put('profile',field,typeof val==='object'?JSON.stringify(val):String(val));
            }
        }
    }
    function lakeSyncField(field,val){
        if(window._lake&&window._lake.isReady) window._lake.put('profile',field,typeof val==='object'?JSON.stringify(val):String(val));
    }
    async function syncToCloud(){
        if(!window._sb||!window.AuthManager||!window.AuthManager.hasSession())return;
        try{
            const uid=await window.AuthManager.getUid();
            if(!uid)return;
            const arcade=JSON.parse(localStorage.getItem('arcade_state')||'{}');
            const hs=arcade.highScores||{};
            let totalArcade=0;Object.values(hs).forEach(function(v){totalArcade+=v;});
            const unlockedCount=Object.keys(p.unlocked||{}).length;
            await window._sb.from('visitor_profiles').upsert({
                id:uid,
                xp:p.xp||0,
                level:p.level||1,
                prestige:p.prestige||0,
                unlocked:p.unlocked||{},
                trophies_count:unlockedCount,
                total_arcade_score:totalArcade,
                daily_streak:(p._challengeState&&p._challengeState.dailyStreak)||0,
                player_name:localStorage.getItem('arcade_player_name')||null,
                device:p.device||null,
                visits:p.visits||0,
                is_anonymous:window.AuthManager.isAnonymous(),
                updated_at:new Date().toISOString()
            },{onConflict:'id'});
        }catch(e){console.warn('[VDna] Cloud sync failed:',e);}
    }
    save();
    return{get:()=>p,save,syncToCloud,addXp(n){if(window._game){window._game.addXp(n);return;}const mult=typeof window._mpXpMultiplier==='function'?window._mpXpMultiplier():1;p.xp+=Math.round(n*mult);save();updateXpUI();if(window._haptic&&n>=5)window._haptic.xp();window.dispatchEvent(new CustomEvent('AmrOS:XPChanged',{detail:{xp:p.xp,level:p.level}}));},addClick(id){if(!p.clickedLinks.includes(id)){p.clickedLinks.push(id);save();}p.sessionClicks++;if(window._lake)window._lake.logEvent('click',id);},addSection(id){if(!p.sectionsViewed.includes(id)){p.sectionsViewed.push(id);save();}if(window._lake)window._lake.logEvent('section',id);},setScroll:(function(){let _scrollThrottle=0;return function(pct){const now=Date.now();if(now-_scrollThrottle<500)return;_scrollThrottle=now;let changed=false;if(pct>p.scrollMax){p.scrollMax=pct;changed=true;}p.lastScrollY=window.scrollY;try{localStorage.setItem(k,JSON.stringify(p));}catch(e){}if(changed)lakeSyncField('scrollMax',pct);lakeSyncField('lastScrollY',p.lastScrollY);};})()};
})();
window.VDna = VDna;
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&window.VDna&&window.VDna.syncToCloud)window.VDna.syncToCloud();});

// 1b. Device/Network Adaptation (battery handled by global _killSwitch)
(function(){
    const conn=navigator.connection||navigator.mozConnection;
    if(conn&&(conn.effectiveType==='2g'||conn.effectiveType==='slow-2g')){
        document.querySelectorAll('.mesh div').forEach(d=>d.style.display='none');
        const _bgC=document.getElementById('bgC');if(_bgC)_bgC.style.display='none';
    }
    if(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2){
        window._lowEnd=true;
    }
})();

// 1d. Ambient Light Sensor — Auto Theme Adaptation
(function initAmbientLight() {
    if (!('AmbientLightSensor' in window)) return;
    let enabled = localStorage.getItem('ambient_theme') !== '0';
    let lastApplied = null;
    let debounce = null;
    const HYSTERESIS = 2500;

    function luxToTheme(lux) {
        if (lux < 50) return 'dark';
        return 'light';
    }

    function applyFromLux(lux) {
        if (!enabled) return;
        const target = luxToTheme(lux);
        if (target === lastApplied) return;
        lastApplied = target;
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
            const isLt = document.body.classList.contains('light-mode');
            const current = isLt ? 'light' : 'dark';
            if (current === target) return;

                applyTheme(target); localStorage.setItem('theme', target); _lakePref('theme',target);

            const labels = { dark: '🌙 Dark', light: '☀️ Light' };
            if (window.UniToast) window.UniToast(`${labels[target]} Mode · ${Math.round(lux)} lux`);
        }, HYSTERESIS);
    }

    try {
        const sensor = new AmbientLightSensor();
        sensor.addEventListener('reading', () => applyFromLux(sensor.illuminance));
        sensor.addEventListener('error', () => {});
        sensor.start();
    } catch (e) {}

    window._toggleAmbientTheme = function() {
        enabled = !enabled;
        localStorage.setItem('ambient_theme', enabled ? '1' : '0'); _lakePref('ambient_theme',enabled?'1':'0');
        lastApplied = null;
        return enabled;
    };
    window._isAmbientEnabled = () => enabled;
})();

// 1c. Time-Aware Content Morphing
(function(){
    const h=parseInt(new Date().toLocaleString("en-US",{timeZone:"Africa/Cairo",hour:"numeric",hour12:false}));
    const vpEl=document.getElementById('vpText');
    const p=VDna.get();
    if(p.visits>2){
        // Returning visitor: skip generic intro
    } else if(h>=6&&h<12){
        // Morning: productivity
    } else if(h>=22||h<6){
        // Night owl: special accent
        document.documentElement.style.setProperty('--accent','#ff6b9d');
        document.documentElement.style.setProperty('--accent2','#f472b6');
        document.documentElement.style.setProperty('--accent3','#c084fc');
        document.documentElement.style.setProperty('--glowS','rgba(255,107,157,0.4)');
        document.documentElement.style.setProperty('--glow','rgba(255,107,157,0.15)');
    }
})();

// 1d. Return Visitor Memory
(function(){
    const p=VDna.get();
    if(p.visits>1&&p.lastScrollY>200){
        setTimeout(()=>{if(document.body.style.overflow==='auto')window.scrollTo({top:Math.min(p.lastScrollY,document.body.scrollHeight-window.innerHeight),behavior:'smooth'});},4500);
    }
})();

// ═════════════════════════════════════════════════
// SYSTEM 2: ENGAGEMENT ANALYTICS
// ═════════════════════════════════════════════════

// 2a. Scroll Depth Tracker
const scrollMilestones={25:false,50:false,75:false,100:false};
function trackScroll(){
    const denom=document.documentElement.scrollHeight-innerHeight;
    const pct=denom>0?Math.round(scrollY/denom*100):0;
    VDna.setScroll(pct);
    [25,50,75,100].forEach(m=>{if(pct>=m&&!scrollMilestones[m]){scrollMilestones[m]=true;VDna.addXp(1);if(m===100&&window._game)window._game.unlock('explorer');}});
}

// 2b. Section Dwell Time (Intersection Observer) + Scroll Haptics
const sectionTimes={};
const sectionObs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
        const id=e.target.dataset.section||e.target.id||'unknown';
        if(e.isIntersecting){
            sectionTimes[id]=Date.now();VDna.addSection(id);
        }
        else if(sectionTimes[id]){const dwell=Date.now()-sectionTimes[id];delete sectionTimes[id];}
    });
},{threshold:0.3});
setTimeout(()=>{document.querySelectorAll('.rv,[data-section]').forEach((el,idx)=>{if(!el.dataset.section){el.dataset.section=el.className.split(' ')[0]||el.tagName.toLowerCase()+'-'+idx;}sectionObs.observe(el);});},4000);

// 2c. Click Attribution
document.addEventListener('click',e=>{
    const link=e.target.closest('a[href],button[onclick],.qp,.lk,.nl,.vcb');
    if(link){
        const id=link.href||link.textContent.trim().slice(0,30);
        VDna.addClick(id);
        VDna.addXp(5);
        if(window._game)window._game.unlock('connector');
        const href=link.href||'';
        if(href.includes('newsletter')||href.includes('levelup')){
            const p=VDna.get();
            const nlClicks=p.clickedLinks.filter(l=>l.includes('newsletter')||l.includes('levelup'));
            if(nlClicks.length>=3&&window._game)window._game.unlock('scholar');
        }
        if(window._game)window._game.checkChallengeProgress();
    }
});

// 2d. Engagement Score
function getEngagementScore(){
    const p=VDna.get();
    const scrollScore=Math.min((p.scrollMax||0)/100*30,30);
    const timeScore=Math.min((Date.now()-(p.sessionStart||Date.now()))/120000*20,20);
    const sectionScore=Math.min((p.sectionsViewed||[]).length/8*20,20);
    const clickScore=Math.min((p.sessionClicks||0)/3*15,15);
    const returnScore=Math.min((p.visits||1)/3*15,15);
    return Math.round(scrollScore+timeScore+sectionScore+clickScore+returnScore);
}

// 2e. Smart CTA Escalation
let smartCtaShown=false;
function checkSmartCta(){
    const p=VDna.get();
    if(p.smartCtaDismissed||smartCtaShown)return;
    const score=getEngagementScore();
    if(score>=65){
        showSmartCta('high');smartCtaShown=true;
    } else if(score<25&&(Date.now()-p.sessionStart)>15000){
        showSmartCta('low');smartCtaShown=true;
    }
}
function showSmartCta(type){
    var href, iconCls;
    if(type==='high'){
        href='https://calendly.com/amrmelharony/30min';
        iconCls='fa-calendar-check';
    } else {
        href='https://www.linkedin.com/newsletters/levelup-your-leadership-6872921030353031168';
        iconCls='fa-envelope-open-text';
    }
    if(typeof window._blogToolbarCta==='function'){
        window._blogToolbarCta(type,href,iconCls);
        VDna.addXp(2);
        return;
    }
    const cta=document.getElementById('smartCta'),link=document.getElementById('smartCtaLink'),title=document.getElementById('smartCtaTitle'),sub=document.getElementById('smartCtaSub'),icon=document.getElementById('smartCtaIcon');
    if(!cta||!link||!title||!sub||!icon)return;
    link.href=href;
    icon.innerHTML='<i class="fa-solid '+iconCls+'"></i>';
    if(type==='high'){
        title.textContent="You seem interested — let's connect";
        sub.textContent='Book a free 30-min strategy call';
    } else {
        title.textContent="Grab a free insight before you go";
        sub.textContent='Join 500+ leaders reading LevelUp';
    }
    cta.classList.add('show');
    VDna.addXp(2);
    let ctaTimer = setTimeout(dismissSmartCta, AUTO_DISMISS_MS);
    cta.onmouseenter = () => { clearTimeout(ctaTimer); ctaTimer = setTimeout(dismissSmartCta, AUTO_DISMISS_MS); };
    cta.ontouchstart = () => { clearTimeout(ctaTimer); ctaTimer = setTimeout(dismissSmartCta, AUTO_DISMISS_MS); };
}
window.dismissSmartCta=function(){
    const el=document.getElementById('smartCta');
    if(el)el.classList.remove('show');
    try{const p=VDna.get();p.smartCtaDismissed=true;VDna.save();}catch(e){}
};

// ═════════════════════════════════════════════════
// SYSTEM 3: DYNAMIC CONTENT ENGINE
// ═════════════════════════════════════════════════

// 3a. Contextual Hero (referrer-based)
(function(){
    const p=VDna.get();
    const vpEl=document.getElementById('vpText');
    if(p.visits>2&&vpEl){
        // Returning visitor: more personal
    }
    // Referrer-based adjustments handled by existing refMap
})();

// 3b. Personalized Recommendations
function showRecommendation(){
    const p=VDna.get();
    const container=document.getElementById('recContainer');
    if(!container)return;
    const clicked=(p.clickedLinks||[]).join(' ').toLowerCase();
    let rec=null;
    if(clicked.includes('calendly')||clicked.includes('calendar')){
    rec={icon:'fa-book',label:'While you wait for our call...',title:'Read The Bilingual Executive',href:'https://bilingualexecutive.amrelharony.com/'};
} else if(clicked.includes('bilingual')||clicked.includes('book')){
    rec={icon:'fa-users',label:'Loved the book?',title:'Join Fintech Bilinguals Community',href:'https://www.linkedin.com/company/fintech-bilinguals'};
} else if(clicked.includes('fintech')){
    rec={icon:'fa-calendar-check',label:'Want to go deeper?',title:'Book a Free Strategy Call',href:'https://calendly.com/amrmelharony/30min'};
} else if(p.visits>1){
    rec={icon:'fa-calendar-check',label:'Ready to connect?',title:'Book a 30-Min Call with Amr',href:'https://calendly.com/amrmelharony/30min'};
}
    if(rec){
        container.innerHTML=`<a href="${rec.href}" target="_blank" rel="noopener" class="rec-card"><div class="rec-icon"><i class="fa-solid ${rec.icon}"></i></div><div class="rec-meta"><div class="rec-label">${rec.label}</div><div class="rec-title">${rec.title}</div></div><div style="color:var(--sub);opacity:.4"><i class="fa-solid fa-arrow-right"></i></div></a>`;
    }
}
setTimeout(showRecommendation,5000);

// 3c. Live Typing Console
const consoleMessages=[
    ()=>`Amr is currently in Cairo · ${new Date().toLocaleString("en-US",{timeZone:"Africa/Cairo",hour:"numeric",minute:"numeric",hour12:true})}`,
    ()=>`${VDna.get().visits===1?'Welcome, new visitor':'Welcome back'} · Visit #${VDna.get().visits}`,
    ()=>'2,300+ mentoring minutes and counting...',    ()=>`Engagement score: ${getEngagementScore()}/100`,
    ()=>`Your device: ${VDna.get().device} · ${VDna.get().os} · ${VDna.get().browser}`,
    ()=>`${Object.keys(VDna.get().unlocked||{}).length} achievements unlocked`,
    ()=>`Running on ${navigator.hardwareConcurrency||'?'} cores · ${VDna.get().screen}`,
    ()=>'System status: all modules operational ✓',
];
let consoleIdx=0;
let _consoleIv=null;
function typeConsole(){
    const el=document.getElementById('liveConsole');if(!el)return;
    if(_consoleIv){clearInterval(_consoleIv);_consoleIv=null;}
    const msg=consoleMessages[consoleIdx%consoleMessages.length]();
    consoleIdx++;
    let i=0;el.textContent='';
    _consoleIv=setInterval(()=>{if(i<msg.length){el.textContent=msg.slice(0,i+1);i++;}else{el.textContent=msg;const blink=document.createElement('span');blink.className='cursor-blink';blink.textContent=' ▊';el.appendChild(blink);clearInterval(_consoleIv);_consoleIv=null;}},30);
}
let _consoleRepeat=null;
setTimeout(()=>{typeConsole();_consoleRepeat=setInterval(typeConsole,8000);},5000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(_consoleRepeat){clearInterval(_consoleRepeat);_consoleRepeat=null;}if(_consoleIv){clearInterval(_consoleIv);_consoleIv=null;}}else if(!_consoleRepeat){typeConsole();_consoleRepeat=setInterval(typeConsole,8000);}});

// ═════════════════════════════════════════════════
// SYSTEM 4: GAMIFICATION (delegated to gamification.js)
// ═════════════════════════════════════════════════

// XP UI is now driven by gamification.js via _game.updateXpUI()
function updateXpUI(){ if(window._game) window._game.updateXpUI(); }

// Trophy/achievement button wire-up
setTimeout(()=>{const btn=document.getElementById('trophyBtn');if(btn){btn.style.display='flex';btn.addEventListener('click',function(){if(window._game)window._game.openCase('achievements');else if(window.openTrophy)window.openTrophy();});}const gb=document.getElementById('gameBtn');if(gb)gb.style.display='flex';const pkBtn=document.getElementById('pkLockBtn');if(pkBtn&&window._passkey){window._passkey.isPlatformAvailable().then(a=>{if(a)pkBtn.style.display='flex';});}},4000);

// Hook easter egg achievement
const origShowEgg=showEgg;
showEgg=function(){origShowEgg();if(window._game)window._game.unlock('secret');};
// Hook shake contact achievement
const origReveal=revealContact;
revealContact=function(){origReveal();if(window._game)window._game.unlock('shaker');};
window.revealContact=revealContact;

// Engagement check interval — clears itself once CTA shown or dismissed
const _smartCtaIv=setInterval(()=>{checkSmartCta();const p=VDna.get();if(smartCtaShown||p.smartCtaDismissed)clearInterval(_smartCtaIv);},5000);

// ═════════════════════════════════════════════════
// LONG-PRESS ADMIN GESTURE (mobile entry point)
// Hold hero name for 800ms to show admin menu
// ═════════════════════════════════════════════════
(function(){
  var hname=document.getElementById('hname');
  if(!hname)return;
  var _lpTimer=null;

  function openAdminDirect(){
    if(window._haptic)window._haptic.levelUp();
    if(window.openBlogAdmin)window.openBlogAdmin();
  }

  var _lastTapTime=0;
  hname.addEventListener('touchstart',function(e){
    _lpTimer=setTimeout(function(){
      _lpTimer=null;
      openAdminDirect();
    },800);
  },{passive:true});
  hname.addEventListener('touchend',function(e){
    if(_lpTimer){clearTimeout(_lpTimer);_lpTimer=null;}
    var now=Date.now();
    if(now-_lastTapTime<350){
      e.preventDefault();
      openAdminDirect();
    }
    _lastTapTime=now;
  });
  hname.addEventListener('touchcancel',function(){if(_lpTimer){clearTimeout(_lpTimer);_lpTimer=null;}});
  hname.addEventListener('touchmove',function(e){
    if(_lpTimer){clearTimeout(_lpTimer);_lpTimer=null;}
  },{passive:true});
  hname.addEventListener('contextmenu',function(e){e.preventDefault();});
  hname.addEventListener('dblclick',function(e){
    e.preventDefault();
    openAdminDirect();
  });
})();

// ═════════════════════════════════════════════════
// CONTENT HUB — Tabbed Feed Switching + CSS
// ═════════════════════════════════════════════════
(function ContentHubTabs() {
  // content-hub-css: styles moved to Css/content-hub.css

  document.querySelectorAll('.ch-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.ch-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      document.querySelectorAll('.ch-feed').forEach(function(f) { f.classList.remove('active'); f.style.display = ''; });
      var target = document.querySelector('[data-chtab-content="' + tab.dataset.chtab + '"]');
      if (target) { target.classList.add('active'); target.style.display = ''; }
      var btnThoughts = document.getElementById('chBtnThoughts');
      var btnArticles = document.getElementById('chBtnArticles');
      if (btnThoughts) btnThoughts.style.display = tab.dataset.chtab === 'thoughts' ? 'flex' : 'none';
      if (btnArticles) btnArticles.style.display = tab.dataset.chtab === 'articles' ? 'flex' : 'none';
    });
  });
})();

// ═══ TERMINAL → moved to terminal-commands.js + terminal-core.js ═══
/* TermCmds + terminal UI removed — see terminal-commands.js & terminal-core.js */
// ═════════════════════════════════════════════════
// ARCADE LAZY-LOADER (Trader + Arcade Hub in arcade.js)
// ═════════════════════════════════════════════════
let arcadeLoaded=false,arcadeLoadPromise=null;
function loadArcade(){
  if(window._prefetch)window._prefetch.recordHit('Js/arcade.js');
  if(arcadeLoaded)return Promise.resolve();
  if(arcadeLoadPromise)return arcadeLoadPromise;
  arcadeLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/arcade.js';
    s.onload=()=>{arcadeLoaded=true;resolve();};
    s.onerror=()=>{arcadeLoadPromise=null;if(window.UniToast)window.UniToast('Failed to load Arcade — retrying...');reject();};
    document.head.appendChild(s);
  });
  return arcadeLoadPromise;
}
const _stubOpenGame=function(){loadArcade().then(()=>{if(window.openGame!==_stubOpenGame)window.openGame();}).catch(_noop);};
window.openGame=_stubOpenGame;
const _stubCloseGame=function(){if(arcadeLoaded&&window.closeGame!==_stubCloseGame)window.closeGame();};
window.closeGame=_stubCloseGame;
const _stubRestartSnake=function(){loadArcade().then(()=>{if(window.restartSnake!==_stubRestartSnake)window.restartSnake();}).catch(_noop);};
window.restartSnake=_stubRestartSnake;

// ═════════════════════════════════════════════════
// FEATURE: KEYBOARD SHORTCUTS
// ═════════════════════════════════════════════════
window.openShortcuts=function(){const el=document.getElementById('shortcutOverlay');if(!el)return;el.classList.add('show');if(window._haptic)window._haptic.menuOpen();_trapFocus('shortcutOverlay');autoDismiss('shortcutOverlay',closeShortcuts);};
window.closeShortcuts=function(){const el=document.getElementById('shortcutOverlay');if(el)el.classList.remove('show');if(window._haptic)window._haptic.menuClose();_releaseFocus('shortcutOverlay');cancelAutoDismiss('shortcutOverlay');};

// Old cursor-particle trail removed — superseded by Phase 1 emoji cursor

// ═════════════════════════════════════════════════
// UNIFIED KEYBOARD HANDLER (enhanced)
// ═════════════════════════════════════════════════
// Remove old keydown handler first — we'll replace with unified
(function(){
    const unifiedKeys=e=>{
        if(e.key==='Escape'){const _escPairs=[['passkeyOverlay','_closePasskey'],['easterEgg','closeEgg'],['shareOverlay','closeShare'],['trophyOverlay','closeTrophy'],['termOverlay','closeTerm'],['gameOverlay','closeGame'],['shortcutOverlay','closeShortcuts'],['arcadeOverlay','_closeArcade'],['miniGameOverlay','_closeMG'],['guestbookOverlay','_closeGuestbook'],['gameCaseOverlay','_closeAdmin'],['ai3dOverlay','_close3D'],['ttsReaderOverlay','_closeTTSReader'],['cmdPaletteOverlay','_closePalette'],['nftMatOverlay','_closeNftModal']];let closed=false;for(const[id,fn]of _escPairs){const el=document.getElementById(id);if(el&&(el.classList.contains('show')||el.classList.contains('visible'))&&typeof window[fn]==='function'){window[fn]();closed=true;break;}}if(!closed)dismissSmartCta();document.activeElement.blur();return;}
        const tag=document.activeElement.tagName;
        if(tag==='INPUT'||tag==='TEXTAREA')return;
        const k=(e.key||'').toLowerCase();
        const code=e.code||'';
        const isKey=(char, codeName)=>k===char||code===codeName;
        if(isKey('c','KeyC')&&!e.ctrlKey)revealContact();
        if(isKey('s','KeyS')){if(window._spatialAudio){const on=window._spatialAudio.toggle();if(window._syncAudioBtn)window._syncAudioBtn(on);}}
        if(isKey('m','KeyM')&&window.TermCmds?.matrix)window.TermCmds.matrix();
        if(isKey('t','KeyT')&&!e.ctrlKey&&!e.metaKey){if(window.openTrophy)window.openTrophy();}
        if(e.key==='?'||(code==='Slash'&&e.shiftKey))openShortcuts();
        if(e.key==='`'||code==='Backquote'){openTerm();}
        if(isKey('b','KeyB')&&!e.ctrlKey&&!e.metaKey){if(window._blogNav)window._blogNav({blog:'feed'});}
        if(isKey('g','KeyG')&&!e.ctrlKey){if(window.openGuestbook)window.openGuestbook();}
        if(isKey('a','KeyA')&&!e.ctrlKey){if(window._openArcade)window._openArcade();}
        if(isKey('p','KeyP')&&!e.ctrlKey&&!e.metaKey){if(window._openPasskey)window._openPasskey();}
    };
    // Remove previous listeners (they're anonymous so can't remove — but our new unified one will work alongside)
    document.addEventListener('keydown',unifiedKeys);
})();


// ═══ SCROLL & PARALLAX ═══

const _sbarEl=document.getElementById('sbar');
const _meshDivs=document.querySelectorAll('.mesh div');
addEventListener('scroll',()=>{
    const t=scrollY,h=document.documentElement.scrollHeight-innerHeight;
    if(_sbarEl)_sbarEl.style.width=(h>0?t/h*100:0)+'%';
    trackScroll();
   if(!reducedMotion&&_meshDivs.length){_meshDivs.forEach((b,i)=>{b.style.transform=`translateY(${t*(i+1)*.06}px)`;});}
},{passive:true});

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('vis');
            scrollObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.sa').forEach(el => scrollObserver.observe(el));

window._loadArcade = loadArcade;
window._arcadeLoaded = function(){ return arcadeLoaded; };
window._lakePref = _lakePref;
window._coreReady = true;
window.dispatchEvent(new CustomEvent('AmrOS:CoreReady'));

})(); // ← THIS closes the (()=>{ at the very top of the script
var _lakePref = window._lakePref;
var _termEsc = window._termEsc;
var _termAppend = window._termAppend;

// ═══ TEARDOWN REGISTRY ═══
window._teardownRegistry = [];
window._registerTeardown = function(fn) { window._teardownRegistry.push(fn); };
window.addEventListener('beforeunload', function() {
  window._teardownRegistry.forEach(function(fn) { try { fn(); } catch(e) {} });
});

// ═══ BUG BASH (always loaded, independent of arcade lazy-load) ═══
(function initBugBash() {
  if (window._bugBashReady) return;
  window._bugBashReady = true;
  const clickTracker = {};
  let bugsSquashed = 0;

  document.addEventListener('click', e => {
    const target = e.target;
    const cn = typeof target.className === 'string' ? target.className : (target.className && target.className.baseVal) || '';
    const key = target.tagName + cn.slice(0, 20);
    if (!clickTracker[key]) clickTracker[key] = { count: 0, time: 0 };
    const t = clickTracker[key];
    const now = Date.now();
    if (now - t.time > 2000) t.count = 0;
    t.count++;
    t.time = now;

    if (t.count >= 5) {
      t.count = 0;
      spawnBug(e.clientX, e.clientY);
    }
  });

  function spawnBug(startX, startY) {
    const bug = document.createElement('span');
    bug.className = 'bug-sprite';
    bug.textContent = '\u{1F41E}';
    bug.style.left = startX + 'px';
    bug.style.top = startY + 'px';
    const bx = (Math.random() - 0.5) * 300;
    const by = (Math.random() - 0.5) * 300;
    const br = (Math.random() - 0.5) * 360;
    bug.style.setProperty('--bx', bx + 'px');
    bug.style.setProperty('--by', by + 'px');
    bug.style.setProperty('--br', br + 'deg');

    bug.addEventListener('click', e => {
      e.stopPropagation();
      bugsSquashed++;
      const splat = document.createElement('span');
      splat.className = 'bug-splat';
      splat.textContent = '\u{1F4A5}';
      splat.style.left = e.clientX - 14 + 'px';
      splat.style.top = e.clientY - 14 + 'px';
      document.body.appendChild(splat);
      setTimeout(() => splat.remove(), 600);
      bug.remove();
      if (window.VDna) window.VDna.addXp(50);
      if (window._haptic) window._haptic.hit();
      if (window._game) window._game.unlock('qa_tester');
      if (bugsSquashed === 1) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.cssText = 'border-color:#ef4444;box-shadow:0 8px 32px rgba(239,68,68,.25)';
        toast.innerHTML = '<div class="toast-shimmer"></div><div class="toast-emoji">\u{1F41E}</div><div class="toast-body"><div class="toast-title" style="color:#ef4444">Bug Bash!</div><div class="toast-desc">QA Tester \u2014 squashed a rage-click bug</div><div class="toast-xp">+50 XP</div></div>';
        const tc = document.getElementById('toastContainer');
        if (tc) { tc.appendChild(toast); setTimeout(() => toast.classList.add('show'), 50); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 4200); }
      }
    });

    document.body.appendChild(bug);
    setTimeout(() => bug.remove(), 4500);
  }
})();

// â•â•â• PHASE 3: ARCADE (lazy-loaded from arcade.js) â•â•â•
// Arcade hub, 5 games, gamepad manager, leaderboard, share cards
// Loaded on first interaction via loadArcade()
function _noop(){}
const _stubOpenArcade = function(){ window._loadArcade().then(()=>{ if(window._openArcade!==_stubOpenArcade) window._openArcade(); }).catch(_noop); };
window._openArcade = _stubOpenArcade;
const _stubCloseArcade = function(){ if(window._arcadeLoaded && window._arcadeLoaded() && window._closeArcade!==_stubCloseArcade) window._closeArcade(); };
window._closeArcade = _stubCloseArcade;
const _stubCloseMG = function(){ if(window._arcadeLoaded && window._arcadeLoaded() && window._closeMG!==_stubCloseMG) window._closeMG(); };
window._closeMG = _stubCloseMG;
const _stubLaunchGame = function(id){ window._loadArcade().then(()=>{ if(window._launchGame!==_stubLaunchGame) window._launchGame(id); }).catch(_noop); };
window._launchGame = _stubLaunchGame;
// _termAppend + arcade TermCmds stubs → moved to terminal-commands.js

// === PHASE 4: AI + 3D (per-feature lazy-loading) ===
var _ai3dCoreLoaded=false,_ai3dCorePromise=null;
function _loadScript(src){return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
function loadAI3DCore(){
  if(_ai3dCoreLoaded)return Promise.resolve();
  if(_ai3dCorePromise)return _ai3dCorePromise;
  _ai3dCorePromise=_loadScript('Js/ai3d-core.js').then(function(){_ai3dCoreLoaded=true;}).catch(function(){_ai3dCorePromise=null;throw new Error('ai3d-core load failed');});
  return _ai3dCorePromise;
}
var _chatbotLoaded=false,_chatbotPromise=null;
function loadChatbot(){
  if(window._prefetch)window._prefetch.recordHit('Js/chatbot-llm.js');
  if(_chatbotLoaded)return Promise.resolve();
  if(_chatbotPromise)return _chatbotPromise;
  _chatbotPromise=loadAI3DCore().then(function(){return _loadScript('Js/kb-docs.js').catch(_noop);}).then(function(){return _loadScript('Js/chatbot-llm.js');}).then(function(){_chatbotLoaded=true;}).catch(function(){_chatbotPromise=null;if(window.UniToast)window.UniToast('Failed to load AI chatbot');});
  return _chatbotPromise;
}
var _book3dLoaded=false,_book3dPromise=null;
function loadBook3D(){
  if(window._prefetch)window._prefetch.recordHit('Js/book-ar-viewer.js');
  if(_book3dLoaded)return Promise.resolve();
  if(_book3dPromise)return _book3dPromise;
  _book3dPromise=loadAI3DCore().then(function(){return _loadScript('Js/book-ar-viewer.js');}).then(function(){_book3dLoaded=true;}).catch(function(){_book3dPromise=null;if(window.UniToast)window.UniToast('Failed to load 3D viewer');});
  return _book3dPromise;
}
var _dataMeshLoaded=false,_dataMeshPromise=null;
function loadDataMesh(){
  if(window._prefetch)window._prefetch.recordHit('Js/visualizer-data-mesh.js');
  if(_dataMeshLoaded)return Promise.resolve();
  if(_dataMeshPromise)return _dataMeshPromise;
  _dataMeshPromise=loadAI3DCore().then(function(){return _loadScript('Js/visualizer-data-mesh.js');}).then(function(){_dataMeshLoaded=true;}).catch(function(){_dataMeshPromise=null;if(window.UniToast)window.UniToast('Failed to load visualizer');});
  return _dataMeshPromise;
}
var _globeLoaded=false,_globePromise=null;
function loadGlobe(){
  if(window._prefetch)window._prefetch.recordHit('Js/visualizer-globe.js');
  if(_globeLoaded)return Promise.resolve();
  if(_globePromise)return _globePromise;
  _globePromise=loadAI3DCore().then(function(){return _loadScript('Js/visualizer-globe.js');}).then(function(){_globeLoaded=true;}).catch(function(){_globePromise=null;if(window.UniToast)window.UniToast('Failed to load globe');});
  return _globePromise;
}
function loadAI3D(){return Promise.all([loadChatbot(),loadBook3D(),loadDataMesh(),loadGlobe()]);}
window._close3D=function(){};
// AI/3D TermCmds stubs → moved to terminal-commands.js

// === PHASE 5: SPATIAL VOIP (lazy-loaded from voip.js) ===
var voipLoaded=false,voipLoadPromise=null;
function loadVoIP(){
  if(voipLoaded)return Promise.resolve();
  if(voipLoadPromise)return voipLoadPromise;
  voipLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/voip.js';
    s.onload=()=>{voipLoaded=true;resolve();};
    s.onerror=()=>{voipLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return voipLoadPromise;
}
window._loadVoIP=loadVoIP;
// VoIP TermCmds stubs → moved to terminal-commands.js

// === PHASE 5: SPATIAL NAV (hybrid — loads spatial-controller.js) ===
var spatialLoaded=false,spatialLoadPromise=null;
function loadSpatial(){
  if(window._prefetch)window._prefetch.recordHit('Js/spatial-controller.js');
  if(spatialLoaded)return Promise.resolve();
  if(spatialLoadPromise)return spatialLoadPromise;
  spatialLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/spatial-controller.js';
    s.onload=()=>{spatialLoaded=true;resolve();};
    s.onerror=()=>{spatialLoadPromise=null;if(window.UniToast)window.UniToast('Failed to load Spatial Nav module');reject();};
    document.head.appendChild(s);
  });
  return spatialLoadPromise;
}
// Spatial + intro TermCmds → moved to terminal-commands.js

// === PHASE 5b: EMOTION ENGINE (lazy, auto-starts with spatial) ===
var emotionLoaded=!!window._emotionEngine,emotionLoadPromise=null;
function loadEmotion(){
  if(window._prefetch)window._prefetch.recordHit('Js/emotion-engine.js');
  if(emotionLoaded||window._emotionEngine)return Promise.resolve();
  if(emotionLoadPromise)return emotionLoadPromise;
  emotionLoadPromise=new Promise(function(resolve,reject){
    var s=document.createElement('script');s.src='Js/emotion-engine.js';
    s.onload=function(){emotionLoaded=true;resolve();};
    s.onerror=function(){emotionLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return emotionLoadPromise;
}
window._loadEmotion=loadEmotion;
if(window._pendingWeatherCode!==undefined&&window._setWeatherMood){window._setWeatherMood(window._pendingWeatherCode,window._pendingWeatherIsDay);}
else{loadEmotion().then(function(){
  if(window._pendingWeatherCode!==undefined&&window._setWeatherMood)window._setWeatherMood(window._pendingWeatherCode,window._pendingWeatherIsDay);
}).catch(function(){});}

// Mood TermCmd → moved to terminal-commands.js

var meshLoaded=false,meshLoadPromise=null;
function loadMesh(){
  if(meshLoaded)return Promise.resolve();
  if(meshLoadPromise)return meshLoadPromise;
  meshLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/mesh.js';
    s.onload=()=>{meshLoaded=true;resolve();};
    s.onerror=()=>{meshLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return meshLoadPromise;
}


var prefetchLoaded=false,prefetchLoadPromise=null;
function loadPrefetch(){
  if(prefetchLoaded)return Promise.resolve();
  if(prefetchLoadPromise)return prefetchLoadPromise;
  prefetchLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/prefetch.js';
    s.onload=()=>{prefetchLoaded=true;resolve();};
    s.onerror=()=>{prefetchLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return prefetchLoadPromise;
}

var pressureLoaded=false,pressureLoadPromise=null;
function loadPressure(){
  if(pressureLoaded)return Promise.resolve();
  if(pressureLoadPromise)return pressureLoadPromise;
  pressureLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/compute-pressure.js';
    s.onload=()=>{pressureLoaded=true;resolve();};
    s.onerror=()=>{pressureLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return pressureLoadPromise;
}

var biometricLoaded=false,biometricLoadPromise=null;
function loadBiometric(){
  if(biometricLoaded)return Promise.resolve();
  if(biometricLoadPromise)return biometricLoadPromise;
  biometricLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/biometric-risk.js';
    s.onload=()=>{biometricLoaded=true;resolve();};
    s.onerror=()=>{biometricLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return biometricLoadPromise;
}

var sonoLoaded=!!window._sono,sonoLoadPromise=null;
function loadSonification(){
  if(sonoLoaded||window._sono)return Promise.resolve();
  if(sonoLoadPromise)return sonoLoadPromise;
  sonoLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/sonification.js';
    s.onload=()=>{sonoLoaded=true;resolve();};
    s.onerror=()=>{sonoLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return sonoLoadPromise;
}

var cwLoaded=false,cwLoadPromise=null;
function loadCrossWindow(){
  if(cwLoaded)return Promise.resolve();
  if(cwLoadPromise)return cwLoadPromise;
  cwLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/crosswindow.js';
    s.onload=()=>{cwLoaded=true;resolve();};
    s.onerror=()=>{cwLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return cwLoadPromise;
}

var lakeLoaded=false,lakeLoadPromise=null;
function loadLake(){
  if(lakeLoaded)return Promise.resolve();
  if(lakeLoadPromise)return lakeLoadPromise;
  lakeLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='Js/datalake.js';
    s.onload=()=>{lakeLoaded=true;resolve();};
    s.onerror=()=>{lakeLoadPromise=null;reject();};
    document.head.appendChild(s);
  });
  return lakeLoadPromise;
}

// Eager 3D Preview badge on book card (loads ai3d.js on click)
(function(){
  var sels=['a.lk[href*="bilingual"]','a[href*="bilingual"]','a[href*="book"]'],card=null;
  for(var i=0;i<sels.length;i++){card=document.querySelector(sels[i]);if(card)break;}
  if(!card)return;
  var b=document.createElement('span');
  b.style.cssText='font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;padding:4px 8px;border-radius:100px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);color:#6366f1;margin-top:8px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;position:relative;z-index:10;';
  b.id='badge3dPreview';b.innerHTML='📦 3D PREVIEW';
  b.addEventListener('mouseenter',function(){b.style.background='rgba(99,102,241,.2)';b.style.color='#fff';});
  b.addEventListener('mouseleave',function(){b.style.background='rgba(99,102,241,.1)';b.style.color='#6366f1';});
  b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();loadBook3D().then(function(){if(window.TermCmds.book3d)window.TermCmds.book3d();}).catch(_noop);});
  var sub=card.querySelector('.lsu');
  if(sub){sub.style.display='flex';sub.style.flexDirection='column';sub.style.alignItems='flex-start';sub.appendChild(b);}
  else{card.style.display='flex';card.style.flexDirection='column';card.appendChild(b);}
})();



(function() {
    'use strict';

    // 1. Initialize Container
    const Container = document.createElement('div');
    Container.id = 'uni-toast-container';
    document.body.appendChild(Container);

    // 2. Logic Manager
    const UniToast = {
        queue: [],
        active: false,
        
        add(title, meta, icon, type = 'default') {
            // Avoid duplicate stacks
            if(this.queue.length > 0 && this.queue[this.queue.length-1].title === title) return;
            this.queue.push({ title, meta, icon, type });
            this.process();
        },

        process() {
            if(!window._isSiteReady || !window._isSiteReady()){setTimeout(()=>this.process(),500);return;}
            if(this.active || this.queue.length === 0) return;
            this.active = true;
            this.render(this.queue.shift());
        },

        render({ title, meta, icon, type }) {
            if(window._haptic)window._haptic.notify();
            const el = document.createElement('div');
            el.className = 'uni-toast';
            el.dataset.type = type;
            const _e=s=>{const d=document.createElement('div');d.textContent=s;return d.innerHTML;};
            el.innerHTML = `
                <div class="uni-toast-icon">${_e(icon)}</div>
                <div class="uni-toast-content">
                    <div class="uni-toast-title">${_e(title)}</div>
                    ${meta ? `<div class="uni-toast-meta">${_e(meta)}</div>` : ''}
                </div>
            `;
            Container.appendChild(el);

            // Animate
            requestAnimationFrame(() => el.classList.add('show'));

            // Dismiss
            setTimeout(() => {
                el.classList.remove('show');
                setTimeout(() => {
                    el.remove();
                    this.active = false;
                    setTimeout(() => this.process(), 100);
                }, 400);
            }, 3000);
        }
    };

    // 3. The Interceptor (MutationObserver)
    // Scoped: childList on body (direct children only) for toast interception
    const ChildInterceptor = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;

                if (node.classList.contains('toast')) {
                    const icon = node.querySelector('.toast-emoji')?.textContent || '🏆';
                    const title = node.querySelector('.toast-title')?.textContent || 'Achievement';
                    let meta = node.querySelector('.toast-desc')?.textContent || '';
                    const xp = node.querySelector('.toast-xp')?.textContent;
                    if (xp) meta += ` · ${xp}`;

                    let type = 'default';
                    if (node.classList.contains('legendary') || node.classList.contains('toast-levelup')) type = 'legendary';
                    else if (node.classList.contains('epic')) type = 'rare';
                    else if (node.classList.contains('rare')) type = 'accent';

                    node.remove();
                    UniToast.add(title, meta, icon, type);
                }

                if (node.classList.contains('trophy-toast')) {
                    const icon = node.querySelector('.trophy-toast-icon')?.textContent || '✨';
                    const title = node.querySelector('strong')?.textContent || 'Unlocked';
                    const meta = node.querySelector('span')?.textContent || '';
                    node.remove();
                    UniToast.add(title, meta, icon, 'accent');
                }
            }
        }
    });
    ChildInterceptor.observe(document.body, { childList: true });
    const _toastContainer = document.getElementById('toastContainer');
    if (_toastContainer) ChildInterceptor.observe(_toastContainer, { childList: true });

    // Targeted attribute observers for specific elements (no subtree scanning)
    const shareCopied = document.getElementById('shareCopied');
    if (shareCopied) {
        const attrObs = new MutationObserver(() => {
            if (shareCopied.classList.contains('show')) {
                shareCopied.classList.remove('show');
                UniToast.add('Copied to clipboard', '', '✓', 'success');
            }
        });
        attrObs.observe(shareCopied, { attributes: true, attributeFilter: ['class'] });
    }

    const surpriseToast = document.querySelector('.surprise-toast');
    if (surpriseToast) {
        const surpriseObs = new MutationObserver(() => {
            if (surpriseToast.classList.contains('show')) {
                const text = surpriseToast.textContent;
                surpriseToast.classList.remove('show');
                UniToast.add(text, 'Jumped to section', '🚀', 'accent');
            }
        });
        surpriseObs.observe(surpriseToast, { attributes: true, attributeFilter: ['class'] });
    }

    window.UniToast = (msg) => UniToast.add(msg, '', '📡', 'default');
    window.UniToast.add = (title, meta, icon, type) => UniToast.add(title, meta, icon, type);
    console.log('%c✅ Toast System%c Interceptor Active','background:#22c55e;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold;','color:#8a95a8;padding-left:6px;');

// Add 'D' key listener for Dark/Light Mode
document.addEventListener('keydown', e => {
  // 1. Ignore if typing in an input field
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  
  // 2. Check for 'D' key
  if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // 3. Trigger the existing button click
      const themeBtn = document.getElementById('tbtn');
      if (themeBtn) themeBtn.click();
  }
});

})();

// ═══ OFFLINE / ONLINE RESILIENCE ═══
(function(){
  'use strict';
  var _wasOffline=false;
  window.addEventListener('offline',function(){
    _wasOffline=true;
    if(window.UniToast)window.UniToast.add('You\'re offline','Some features may be limited','📡','default');
  });
  window.addEventListener('online',function(){
    if(_wasOffline){
      _wasOffline=false;
      if(window.UniToast)window.UniToast.add('Back online','Connection restored','✅','success');
    }
  });
})();

// ═══ MOBILE SCREENSHOT GUARD ═══
(function() {
  'use strict';
  if (!window.matchMedia('(pointer:coarse)').matches) return;

  const guard = document.createElement('div');
  guard.className = 'ss-guard';
  document.body.appendChild(guard);

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) guard.classList.add('active');
    else setTimeout(function() { guard.classList.remove('active'); }, 300);
  });

  window.addEventListener('blur', function() { guard.classList.add('active'); });
  window.addEventListener('focus', function() { setTimeout(function() { guard.classList.remove('active'); }, 300); });
})();

setTimeout(function(){
  var n=performance.now();
  console.log(
    '\n%c ■ BOOT COMPLETE %c '+Math.round(n)+'ms %c\n\n'+
    '%c   Built with curiosity. No frameworks. Pure craft.%c\n'+
    '%c   Every pixel, every interaction — intentional.%c\n\n'+
    '%c   Interested in the stack? Type  stack  in terminal.%c\n'+
    '%c   Want to collaborate?  a.elharony@gmail.com%c\n\n',
    'background:#00e1ff;color:#06080f;padding:3px 8px;border-radius:3px;font-weight:bold;font-family:monospace;',
    'background:#1a2332;color:#00e1ff;padding:3px 8px;border-radius:0 3px 3px 0;font-family:monospace;',
    '',
    'color:#64748b;font-size:11px;font-family:monospace;font-style:italic;','',
    'color:#64748b;font-size:11px;font-family:monospace;font-style:italic;','',
    'color:#6366f1;font-size:11px;font-family:monospace;','',
    'color:#6366f1;font-size:11px;font-family:monospace;',''
  );
},4000);
