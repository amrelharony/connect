const _SB_URL = 'https://ninughddcomniliqimlu.supabase.co';
const _SB_KEY = 'sb_publishable_YaSfemHxR3HcrzpFW0QvZA_qoOj5SG7';
const _sb = window.supabase ? window.supabase.createClient(_SB_URL, _SB_KEY) : null;
window._sb = _sb;

(()=>{
'use strict';
document.getElementById('yr').textContent=new Date().getFullYear();
const D=window.matchMedia('(pointer:fine)').matches;
const reducedMotion=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
const isRepeatVisit=!!localStorage.getItem('visited');localStorage.setItem('visited','1');
const isMobile=window.matchMedia('(pointer:coarse)').matches;
const params=new URLSearchParams(location.search);

// Auto-dismiss overlays after inactivity
const AUTO_DISMISS_MS = 8000;
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
window.autoDismiss = autoDismiss;
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
    const html=quotes.map(q=>`<div class="tq">"${q.q}" — <strong>${q.a}</strong>, ${q.r}</div>`).join('');
    t.innerHTML=html+html; // duplicate for seamless loop
}
buildTicker();

// ═══ PARTICLES ═══
const cv=document.getElementById('bgC'),cx=cv.getContext('2d');
let W,H,pts=[],mouse={x:-9999,y:-9999},gy={x:0,y:0};
const PC=D?90:45,CD=140,MR=200;let pC={r:0,g:225,b:255};
let _pWorker=null,_pData=null,_pUsingWorker=false;
if(!reducedMotion&&typeof Worker!=='undefined'){
try{_pWorker=new Worker('particle-worker.js');_pUsingWorker=true;
_pWorker.onmessage=function(e){_pData=e.data;};
_pWorker.onerror=function(){_pUsingWorker=false;_pWorker=null;_fallbackParticles();};}catch(e){_pUsingWorker=false;}}
function _workerDraw(){if(!_pData){requestAnimationFrame(_workerDraw);return;}
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
// Fallback: inline particles when Worker unavailable
class Pt{constructor(){this.x=Math.random()*W;this.y=Math.random()*H;this.vx=(Math.random()-.5)*.4;this.vy=(Math.random()-.5)*.4;this.r=Math.random()*1.2+.4;this.ph=Math.random()*6.28;}
update(){this.ph+=.015;this.cr=this.r+Math.sin(this.ph)*.25;this.x+=this.vx+gy.x*.04;this.y+=this.vy+gy.y*.04;if(this.x<-10)this.x=W+10;if(this.x>W+10)this.x=-10;if(this.y<-10)this.y=H+10;if(this.y>H+10)this.y=-10;const dx=mouse.x-this.x,dy=mouse.y-this.y,d=Math.sqrt(dx*dx+dy*dy);if(d<MR&&d>0){const f=(MR-d)/MR;this.x-=(dx/d)*f*2.5;this.y-=(dy/d)*f*2.5;}}
draw(){const{r,g,b}=pC;cx.beginPath();cx.arc(this.x,this.y,this.cr,0,6.28);cx.fillStyle=`rgba(${r},${g},${b},.4)`;cx.fill();cx.beginPath();cx.arc(this.x,this.y,this.cr*3,0,6.28);cx.fillStyle=`rgba(${r},${g},${b},.04)`;cx.fill();}}
function initP(){pts=[];for(let i=0;i<PC;i++)pts.push(new Pt());}
function drawP(){cx.clearRect(0,0,W,H);const{r,g,b}=pC;for(let i=0;i<pts.length;i++){const a=pts[i];a.update();a.draw();for(let j=i+1;j<pts.length;j++){const bb=pts[j],dx=a.x-bb.x,dy=a.y-bb.y,dd=dx*dx+dy*dy;if(dd<CD*CD){const al=(1-Math.sqrt(dd)/CD)*.12;cx.beginPath();cx.strokeStyle=`rgba(${r},${g},${b},${al})`;cx.lineWidth=.5;cx.moveTo(a.x,a.y);cx.lineTo(bb.x,bb.y);cx.stroke();}}}requestAnimationFrame(drawP);}
function _fallbackParticles(){if(pts.length)return;initP();drawP();}
function rsz(){W=cv.width=innerWidth;H=cv.height=innerHeight;
if(_pUsingWorker&&_pWorker){_pWorker.postMessage({type:'resize',W:W,H:H});}
else if(!pts.length&&!_pUsingWorker&&!reducedMotion){initP();}}
addEventListener('resize',rsz);rsz();
if(reducedMotion){/* skip particles */}
else if(_pUsingWorker){_pWorker.postMessage({type:'init',W:W,H:H,count:PC,CD:CD,MR:MR});_pWorker.postMessage({type:'tick'});_workerDraw();}
else if('requestIdleCallback' in window){requestIdleCallback(()=>{initP();drawP();});}
else{setTimeout(()=>{initP();drawP();},100);}
addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;});
addEventListener('touchmove',e=>{if(e.touches[0]){mouse.x=e.touches[0].clientX;mouse.y=e.touches[0].clientY;}},{passive:true});
addEventListener('touchend',()=>{mouse.x=-9999;mouse.y=-9999;});
if(typeof DeviceOrientationEvent!=='undefined'){if(typeof DeviceOrientationEvent.requestPermission==='function'){document.body.addEventListener('touchstart',function g(){DeviceOrientationEvent.requestPermission().then(r=>{if(r==='granted')addEventListener('deviceorientation',oG);}).catch(()=>{});document.body.removeEventListener('touchstart',g);},{once:true});}else addEventListener('deviceorientation',oG);}
function oG(e){if(e.gamma!=null)gy.x=e.gamma;if(e.beta!=null)gy.y=e.beta;}

// ═══ CURSOR ═══
if(D&&!reducedMotion){const dot=document.getElementById('cdd'),glo=document.getElementById('cg');let gx=0,gy2=0;
document.addEventListener('mousemove',e=>{dot.style.left=e.clientX+'px';dot.style.top=e.clientY+'px';glo.classList.add('on');});
(function ag(){gx+=(mouse.x-gx)*.08;gy2+=(mouse.y-gy2)*.08;glo.style.left=gx+'px';glo.style.top=gy2+'px';requestAnimationFrame(ag);})();
const hs='a,button,.pf,.lk,.nl';document.addEventListener('mouseover',e=>{if(e.target.closest(hs))dot.classList.add('hov');});document.addEventListener('mouseout',e=>{if(e.target.closest(hs))dot.classList.remove('hov');});
document.querySelectorAll('.lk').forEach(card=>{const sp=card.querySelector('.ls');let cxx=0,cyy=0,tx=0,ty=0;
card.addEventListener('mousemove',e=>{const r=card.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(sp)sp.style.background=`radial-gradient(250px circle at ${x}px ${y}px,var(--glow),transparent 70%)`;tx=((y-r.height/2)/(r.height/2))*-6;ty=((x-r.width/2)/(r.width/2))*6;});
card.addEventListener('mouseleave',()=>{tx=0;ty=0;});(function spr(){cxx+=(tx-cxx)*.12;cyy+=(ty-cyy)*.12;if(Math.abs(tx-cxx)>.01||Math.abs(ty-cyy)>.01||tx!==0)card.style.transform=`perspective(800px) rotateX(${cxx}deg) rotateY(${cyy}deg) scale3d(1.01,1.01,1.01)`;else card.style.transform='';requestAnimationFrame(spr);})();});}

// ═══ MOBILE TOOLBAR TOGGLE ═══
(function(){
    const tb=document.getElementById('topBtns');
    const tog=document.getElementById('tbToggle');
    if(!tb||!tog)return;
    let expanded=false;
    tog.addEventListener('click',function(e){
        e.stopPropagation();
        expanded=!expanded;
        tb.classList.toggle('expanded',expanded);
        tog.textContent=expanded?'✕':'⋮';
    });
    document.addEventListener('click',function(e){
        if(expanded&&!tb.contains(e.target)){
            expanded=false;tb.classList.remove('expanded');tog.textContent='⋮';
        }
    });
})();

// ═══ THEME ═══
function applyTheme(m){const i=document.getElementById('ticon'),l=m==='light';document.body.classList.toggle('light-mode',l);i.className=l?'fa-solid fa-moon':'fa-solid fa-sun';pC=l?{r:15,g:23,b:42}:{r:0,g:225,b:255};const q=document.getElementById('qri');if(q){const fg=l?'0066ff':'00e1ff',bg=l?'f4f6fb':'06080f';q.src=`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://amrelharony.com&color=${fg}&bgcolor=${bg}`;}}
const sv=localStorage.getItem('theme'),hr=new Date().getHours();applyTheme(sv||(hr>=6&&hr<18?'light':'dark'));
document.getElementById('tbtn').addEventListener('click',()=>{const n=document.body.classList.contains('light-mode')?'dark':'light';localStorage.setItem('theme',n);applyTheme(n);});

// ═══ FLIP ═══
window.toggleFlip=()=>document.getElementById('fc').classList.toggle('flipped');

// ═══ STATUS (with smart greeting) ═══
function updStatus(){
    const now=new Date();
    const cairoOpts={timeZone:'Africa/Cairo'};
    const h=parseInt(now.toLocaleString('en-US',{...cairoOpts,hour:'numeric',hour12:false}));
    const dayName=now.toLocaleString('en-US',{...cairoOpts,weekday:'long'});
    const dot=document.getElementById('sdot'),txt=document.getElementById('stxt');
    let msg,col;

    // Check weekend (Egypt: Friday & Saturday)
    const isWeekend=(dayName==='Friday'||dayName==='Saturday');

    // Check if today is a holiday (loaded async, defaults to false)
    const isHoliday=window._cairoHolidayToday||false;
    const holidayName=window._cairoHolidayName||'';

    if(isHoliday){
        msg='CAIRO · 🎉 '+holidayName.toUpperCase();col='#eab308';
    } else if(isWeekend){
        msg=dayName==='Friday'?'CAIRO · 🕌 FRIDAY REST':'CAIRO · WEEKEND MODE';col='#f97316';
    } else if(h>=9&&h<17){
        msg='CAIRO · BUILDING FINTECH';col='#22c55e';
    } else if(h>=17&&h<23){
        msg='CAIRO · MENTORING';col='#a855f7';
    } else {
        msg='CAIRO · OFFLINE';col='#f97316';
    }

    dot.style.background=col;
    if(reducedMotion){txt.textContent=msg;return;}
    txt.textContent='';let i=0;(function t(){if(i<msg.length){txt.textContent+=msg[i];i++;setTimeout(t,35);}})();
}

// ═══ EGYPT HOLIDAYS (via Nager.Date free API) ═══
(async function(){
    try{
        const yr=new Date().getFullYear();
        const res=await fetch('https://date.nager.at/api/v3/PublicHolidays/'+yr+'/EG');
        if(res.ok){
            const holidays=await res.json();
            const today=new Date().toLocaleString('en-CA',{timeZone:'Africa/Cairo'}).split(',')[0];// YYYY-MM-DD
            const match=holidays.find(h=>h.date===today);
            if(match){
                window._cairoHolidayToday=true;
                window._cairoHolidayName=match.localName||match.name;
                updStatus();// Re-render with holiday
            }
        }
    }catch(e){}
})();

// ═══ CAIRO WEATHER (Open-Meteo free API, no key) ═══
(async function(){
    const CACHE_KEY='cairoWeather';const TTL=3600000;// 1 hour
    const weatherIcons={'0':'☀️','1':'🌤️','2':'⛅','3':'☁️','45':'🌫️','48':'🌫️','51':'🌦️','53':'🌧️','55':'🌧️','56':'🌨️','57':'🌨️','61':'🌧️','63':'🌧️','65':'🌧️','66':'🌨️','67':'🌨️','71':'🌨️','73':'🌨️','75':'❄️','77':'❄️','80':'🌦️','81':'🌧️','82':'⛈️','85':'🌨️','86':'🌨️','95':'⛈️','96':'⛈️','99':'⛈️'};

    function render(data){
        const w=document.getElementById('weatherWidget');
        const ico=document.getElementById('weatherIcon');
        const tmp=document.getElementById('weatherTemp');
        if(!w||!ico||!tmp)return;
        ico.textContent=weatherIcons[String(data.code)]||'🌡️';
        tmp.textContent=Math.round(data.temp)+'°C';
        w.classList.add('show');
    }

    function getCached(){
        try{const raw=localStorage.getItem(CACHE_KEY);if(!raw)return null;const{data,ts}=JSON.parse(raw);if(Date.now()-ts<TTL)return data;return null;}catch(e){return null;}
    }

    try{
        const cached=getCached();
        if(cached){render(cached);return;}
        // Cairo: 30.0444°N, 31.2357°E
        const res=await fetch('https://api.open-meteo.com/v1/forecast?latitude=30.0444&longitude=31.2357&current=temperature_2m,weather_code&timezone=Africa%2FCairo');
        if(res.ok){
            const json=await res.json();
            const data={temp:json.current.temperature_2m,code:json.current.weather_code};
            localStorage.setItem(CACHE_KEY,JSON.stringify({data,ts:Date.now()}));
            render(data);
        }
    }catch(e){}

    // Refresh every hour
    setInterval(async()=>{
        try{
            localStorage.removeItem(CACHE_KEY);
            const res=await fetch('https://api.open-meteo.com/v1/forecast?latitude=30.0444&longitude=31.2357&current=temperature_2m,weather_code&timezone=Africa%2FCairo');
            if(res.ok){const json=await res.json();const data={temp:json.current.temperature_2m,code:json.current.weather_code};localStorage.setItem(CACHE_KEY,JSON.stringify({data,ts:Date.now()}));render(data);}
        }catch(e){}
    },3600000);
})();


// ═══ TEXT SCRAMBLE ═══
class Scr{constructor(el){this.el=el;this.ch='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';}
run(text){if(reducedMotion){this.el.innerHTML=`<span class="ng">${text}</span>`;return;}const q=[];for(let i=0;i<text.length;i++)q.push({to:text[i],start:Math.floor(Math.random()*15),end:Math.floor(Math.random()*15)+15+i*2,c:null});let f=0;const u=()=>{let o='',done=0;for(let i=0;i<q.length;i++){const x=q[i];if(f>=x.end){o+=x.to;done++;}else if(f>=x.start){if(!x.c||Math.random()<.3)x.c=this.ch[Math.floor(Math.random()*this.ch.length)];o+=`<span class="sg">${x.c}</span>`;}else o+='';}this.el.innerHTML=o;if(done<q.length){f++;requestAnimationFrame(u);}else this.el.innerHTML=`<span class="ng">${text}</span>`;};u();}}

// ═══ PRELOADER ═══
const stages=['RESOLVING DNS','ESTABLISHING TLS','LOADING MODULES','DECRYPTING PAYLOAD','RENDERING INTERFACE','READY'];
const SPEED=isRepeatVisit?8:4;
gsap.to('#preLine',{opacity:1,duration:.3,delay:.1});gsap.to('#preCtr',{opacity:1,duration:.3,delay:.2});gsap.to('#preBar',{opacity:1,duration:.3,delay:.3});gsap.to('#preStg',{opacity:1,duration:.3,delay:.35});
let prog=0;const li=setInterval(()=>{prog=Math.min(100,prog+Math.random()*SPEED+1.5);const p=Math.round(prog);document.getElementById('preCtr').textContent=p;document.getElementById('preFill').style.width=p+'%';document.getElementById('preStg').textContent=stages[Math.min(stages.length-1,Math.floor(p/100*stages.length))];if(p>=100){clearInterval(li);setTimeout(launch,isRepeatVisit?100:300);}},isRepeatVisit?20:30);

function done(el){el.classList.remove('rv');el.style.opacity='';el.style.transform='';gsap.set(el,{clearProps:'all'});el.style.opacity='1';el.style.transform='none';}
function launch(){
    const pre=document.getElementById('preloader'),app=document.getElementById('app');
    gsap.to('#preCtr',{scale:1.3,opacity:0,duration:.3,ease:'power2.in'});gsap.to(['#preLine','#preBar','#preStg'],{opacity:0,duration:.2});
    pre.style.clipPath='inset(0 0 0% 0)';gsap.to(pre,{clipPath:'inset(0 0 100% 0)',duration:.9,delay:.3,ease:'power4.inOut',onComplete:()=>{pre.style.display='none';document.body.style.overflow='auto';document.body.style.overflowX='hidden';}});
    gsap.to(app,{opacity:1,duration:.5,delay:.6});setTimeout(updStatus,800);
    document.querySelectorAll('.rv').forEach((el,i)=>{gsap.to(el,{opacity:1,y:0,duration:.9,delay:.8+i*.08,ease:'power3.out',onComplete:()=>done(el)});});
    setTimeout(()=>new Scr(document.getElementById('hname')).run('Amr Elharony'),1400);
    document.querySelectorAll('.rt').forEach((t,i)=>{gsap.from(t,{scale:.7,opacity:0,y:10,duration:.5,delay:1.1+i*.1,ease:'back.out(2)',onComplete:()=>{gsap.set(t,{clearProps:'all'});t.style.opacity='1';}});});
    document.querySelectorAll('.lk').forEach((c,i)=>{gsap.fromTo(c,{opacity:0,y:50,scale:.92,rotateX:10,filter:'blur(6px)'},{opacity:1,y:0,scale:1,rotateX:0,filter:'blur(0px)',duration:.8,delay:1.4+i*.12,ease:'power3.out',onComplete:()=>done(c)});});
    document.querySelectorAll('.nl').forEach((c,i)=>{gsap.fromTo(c,{opacity:0,x:-20},{opacity:1,x:0,duration:.6,delay:2+i*.1,ease:'power2.out',onComplete:()=>done(c)});});

    // Timeline stagger
    document.querySelectorAll('.tl-item').forEach((t,i)=>{gsap.fromTo(t,{opacity:0,x:-15},{opacity:1,x:0,duration:.5,delay:2.2+i*.12,ease:'power2.out'});});
}

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
            { key: 'S', icon: '🔓', label: 'Reveal Contacts' },
            { key: 'G', icon: '🌍', label: 'Guestbook' },
            { key: 'A', icon: '🕹️', label: 'Arcade' },
            { key: 'T', icon: '🏆', label: 'Trophy Case' },
            { key: 'V', icon: '🎙️', label: 'Voice Nav' },
        ]},
        { title: '🎨 Vibes', shortcuts: [
            { key: 'D', icon: '🌗', label: 'Dark / Light' },
            { key: 'C', icon: '🌆', label: 'Cyberpunk' },
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
        localStorage.setItem('shortcuts_seen', '1');
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    }

    setTimeout(() => {
        overlay.classList.add('visible');
        document.getElementById('swDismiss').addEventListener('click', dismissWelcome);
        overlay.addEventListener('click', e => { if (e.target === overlay) dismissWelcome(); });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape' || e.key) { dismissWelcome(); document.removeEventListener('keydown', esc); }
        });
    }, 2500);
}

// ═══ PROXIMITY-GATED CONTACT ═══
let contactRevealed=false,isNearby=false;
function revealContact(){
    if(contactRevealed)return;contactRevealed=true;
    const secret=document.getElementById('contactSecret'),hint=document.getElementById('shakeHint'),deskHint=document.getElementById('deskHint'),bar=document.getElementById('shakeBar');
    secret.classList.add('revealed');if(hint){hint.classList.remove('shaking');hint.classList.add('unlocked');hint.innerHTML='<i class="fa-solid fa-lock-open" style="margin-right:4px;"></i> UNLOCKED';}if(bar)bar.classList.remove('active');
    secret.querySelectorAll('.si').forEach(el=>{const c=el.dataset.c;el.addEventListener('mouseenter',()=>el.style.color=c);el.addEventListener('mouseleave',()=>el.style.color='');});
    secret.querySelectorAll('.si').forEach((s,i)=>{gsap.from(s,{scale:0,rotation:90,duration:.5,delay:i*.08,ease:'back.out(3)',onComplete:()=>{gsap.set(s,{clearProps:'all'});s.style.opacity='1';}});});
    if(D&&!reducedMotion){secret.querySelectorAll('.si').forEach(el=>{el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-(r.left+r.width/2))*.35}px,${(e.clientY-(r.top+r.height/2))*.35}px)`;});el.addEventListener('mouseleave',()=>{el.style.transition='transform .5s cubic-bezier(.16,1,.3,1),color .3s';el.style.transform='';setTimeout(()=>el.style.transition='color .3s,transform .3s cubic-bezier(.16,1,.3,1)',.5e3);});});}
    setTimeout(()=>{[hint,deskHint].forEach(h=>{if(h){h.style.opacity='0';setTimeout(()=>h.style.display='none',400);}});},3000);
}
function enableNearbyHints(){isNearby=true;if(isMobile){document.getElementById('shakeHint').style.display='block';initShake();}}
if(!isMobile){document.getElementById('deskHint').style.display='block';}
if(params.has('s')){setTimeout(()=>revealContact(),3500);}else{
    const CAIRO_LAT=30.0444,CAIRO_LNG=31.2357,RADIUS_KM=25;
    function haversineKm(lat1,lon1,lat2,lon2){const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
    fetch('https://ipapi.co/json/',{mode:'cors'}).then(r=>r.json()).then(data=>{if(data.latitude){const dist=haversineKm(data.latitude,data.longitude,CAIRO_LAT,CAIRO_LNG);if(dist<=RADIUS_KM)enableNearbyHints();}}).catch(()=>{});
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

        bar.classList.add('active');
        hint.classList.add('shaking');
        fill.style.width = (shakeCount / REQUIRED_SHAKES * 100) + '%';

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
function flashSection(el){}
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
const btn=document.getElementById('vcBtn'),txt=document.getElementById('vcTxt'),icon=btn.querySelector('i');btn.classList.add('vcb-done');icon.className='fa-solid fa-check';txt.textContent='SAVED!';setTimeout(()=>{btn.classList.remove('vcb-done');icon.className='fa-solid fa-address-card';txt.textContent='Save Contact';},2500);};

// ═══ EASTER EGG (Konami Code + Double-tap logo) ═══
const konami=[38,38,40,40];let kIdx=0;
document.addEventListener('keydown',e=>{if(e.keyCode===konami[kIdx]){kIdx++;if(kIdx===konami.length){kIdx=0;showEgg();}}else{kIdx=0;}});
let lastTap=0;document.getElementById('pfw').addEventListener('touchend',e=>{const now=Date.now();if(now-lastTap<300){e.preventDefault();showEgg();}lastTap=now;});
function showEgg(){const el=document.getElementById('easterEgg');if(!el)return;el.classList.add('show');if(navigator.vibrate)navigator.vibrate([50,30,50,30,100]);autoDismiss('easterEgg',closeEgg);}
window.closeEgg=function(){const el=document.getElementById('easterEgg');if(el)el.classList.remove('show');cancelAutoDismiss('easterEgg');};
// Escape handled by unified handler below


// ═══ VISITOR COUNTER + ADVANCED MULTIPLAYER PRESENCE ═══
(function(){
    let count=parseInt(localStorage.getItem('vc')||'0')+1;
    const base=4200+Math.floor(count*1.3);
    localStorage.setItem('vc',count.toString());
    const vcEl = document.getElementById('visitorCount');
    vcEl.textContent=`Visitor #${base.toLocaleString()}`;

    if (!_sb) return;

    const AVATARS = ['1F680','1F525','1F4A1','1F30E','1F3AF','1F4BB','1F916','1F9E0','1F3AE','1F4CA','26A1','1F48E','1F6E1','1F52E','1F3C6','2728','1F9D1','1F47E','1F4AB','1F5A5'];
    const myId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const myAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const myNickname = localStorage.getItem('arcade_player_name') || ('User-' + myId.slice(0, 4));

    const SECTION_MAP = {
      '.tl-wrap': 'timeline', '#certGrid': 'certs', '.tc-section': 'testimonials',
      '.conf-strip': 'conferences', '#linkedinFeed': 'articles', '.imp': 'impact'
    };

    const channel = _sb.channel('site-presence', { config: { presence: { key: myId } } });
    const evChannel = _sb.channel('site-events');

    let peers = {};
    let liveCount = 0;
    let trophyAwarded = false;
    let criticalMassActive = false;
    let mySection = null;
    let myScrollPct = 0;
    let myGameState = null;
    let lastTrackTime = 0;
    let xpMultiplier = 1;
    let xpMultiplierEnd = 0;
    window._mpXpMultiplier = () => xpMultiplier;

    let myX = 0.5, myY = 0.5;
    let lastMouseTime = 0;
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMouseTime < 50) return;
      lastMouseTime = now;
      myX = e.clientX / window.innerWidth;
      myY = e.clientY / window.innerHeight;
    }, { passive: true });
    window._mpGetMyPos = () => ({ x: myX, y: myY });

    // High-five state
    let pendingHighFives = {};
    // Whisper state
    let whisperTarget = null;
    let sameSecTimers = {};
    // Co-op lock state
    let coopLocks = {};
    // Smart contract state
    let smartContractInterval = null;
    let activeToken = null;
    // Spectator state
    let spectatingUser = null;
    // Broadcast rate limit
    let lastBroadcastTime = 0;
    let lastTipTime = 0;

    function emojiFromCode(hex) { return String.fromCodePoint(parseInt(hex, 16)); }

    // ── PRESENCE BAR UI ──
    const barWrap = document.createElement('div');
    barWrap.id = 'mpBar';
    barWrap.className = 'mp-bar';
    barWrap.innerHTML = `<div class="mp-avatars" id="mpAvatars"></div><div class="mp-status" id="mpStatus"></div>`;
    vcEl.insertAdjacentElement('afterend', barWrap);

    const audioInd = document.createElement('span');
    audioInd.id = 'mpAudioInd';
    audioInd.className = 'mp-audio-ind' + (localStorage.getItem('audio_enabled') === '1' ? ' active' : '');
    audioInd.title = 'Toggle spatial audio';
    const audioOn = localStorage.getItem('audio_enabled') === '1';
    audioInd.innerHTML = `<span class="mp-audio-ind-icon">${audioOn ? '🔊' : '🔇'}</span><span class="mp-audio-ind-bars"><span class="mp-audio-ind-bar"></span><span class="mp-audio-ind-bar"></span><span class="mp-audio-ind-bar"></span></span>`;
    audioInd.addEventListener('click', () => {
      if (window._spatialAudio) {
        const on = window._spatialAudio.toggle();
        audioInd.classList.toggle('active', on);
        audioInd.querySelector('.mp-audio-ind-icon').textContent = on ? '🔊' : '🔇';
      }
    });
    barWrap.appendChild(audioInd);

    const ctxMenu = document.createElement('div');
    ctxMenu.id = 'mpCtx';
    ctxMenu.className = 'mp-ctx';
    ctxMenu.style.display = 'none';
    document.body.appendChild(ctxMenu);

    // Whisper bubble
    const whisperEl = document.createElement('div');
    whisperEl.id = 'mpWhisper';
    whisperEl.className = 'mp-whisper';
    whisperEl.style.display = 'none';
    whisperEl.innerHTML = `<input type="text" class="mp-whisper-input" id="mpWhisperInput" maxlength="80" placeholder="Say hello..."><span class="mp-whisper-close" id="mpWhisperClose">&times;</span>`;
    document.body.appendChild(whisperEl);

    // Spectator banner
    const specBanner = document.createElement('div');
    specBanner.id = 'mpSpecBanner';
    specBanner.className = 'mp-spec-banner';
    specBanner.style.display = 'none';
    document.body.appendChild(specBanner);

    // Smart contract token container
    const tokenEl = document.createElement('div');
    tokenEl.id = 'mpToken';
    tokenEl.className = 'mp-token';
    tokenEl.style.display = 'none';
    tokenEl.innerHTML = '<span class="mp-token-icon">📜</span><span class="mp-token-label">Smart Contract</span>';
    document.body.appendChild(tokenEl);

    function closeCtx() { ctxMenu.style.display = 'none'; }
    document.addEventListener('click', (e) => { if (!e.target.closest('#mpCtx, .mp-avatar')) closeCtx(); });

    // ── SECTION DETECTION ──
    function detectSection() {
      const vh = window.innerHeight;
      for (const [sel, name] of Object.entries(SECTION_MAP)) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.6 && r.bottom > vh * 0.4) return name;
      }
      return 'hero';
    }

    function getScrollPct() { return Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100) || 0; }

    // ── THROTTLED PRESENCE TRACK ──
    function trackMeta() {
      const now = Date.now();
      if (now - lastTrackTime < 2000) return;
      lastTrackTime = now;
      mySection = detectSection();
      myScrollPct = getScrollPct();
      channel.track({
        nickname: myNickname, avatar: myAvatar, section: mySection,
        scrollPct: myScrollPct, gameState: myGameState,
        x: myX, y: myY, online_at: new Date().toISOString()
      });
    }
    window.addEventListener('scroll', () => requestAnimationFrame(trackMeta), { passive: true });
    setInterval(trackMeta, 3000);

    // Expose for arcade games to set their state
    window._mpSetGame = (state) => { myGameState = state; trackMeta(); };
    window._mpClearGame = () => { myGameState = null; trackMeta(); };
    window._mpGetPeers = () => peers;
    window._mpMyId = myId;

    // ── RENDER PRESENCE BAR ──
    function renderBar() {
      const avatarBox = document.getElementById('mpAvatars');
      const statusBox = document.getElementById('mpStatus');
      const peerList = Object.entries(peers).filter(([k]) => k !== myId);
      liveCount = peerList.length + 1;
      const others = peerList.length;

      // Status text
      if (others > 0) {
        statusBox.innerHTML = `<span class="live-dot"></span> ${others} other${others > 1 ? ' professionals' : ' professional'} viewing now`;
        statusBox.classList.add('visible');
        if (!trophyAwarded) { trophyAwarded = true; if (typeof checkTrophy === 'function' && checkTrophy('networking_event') && typeof showTrophyToast === 'function') showTrophyToast('networking_event'); }
      } else {
        statusBox.classList.remove('visible');
        statusBox.innerHTML = '';
      }

      // Avatar bubbles
      let html = `<div class="mp-avatar mp-avatar-me" title="You (${myNickname})" data-id="${myId}">${emojiFromCode(myAvatar)}</div>`;
      for (const [pid, pArr] of peerList) {
        const p = pArr[0] || {};
        const status = p.gameState ? `Playing ${p.gameState.game}` : (p.section || 'browsing');
        html += `<div class="mp-avatar" title="${p.nickname || 'Anonymous'}: ${status}" data-id="${pid}" data-nick="${p.nickname||'Anon'}">${emojiFromCode(p.avatar || '1F47E')}</div>`;
      }
      avatarBox.innerHTML = html;

      // Attach click handlers
      avatarBox.querySelectorAll('.mp-avatar:not(.mp-avatar-me)').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const pid = el.dataset.id;
          const pData = (peers[pid] || [{}])[0];
          showCtx(el, pid, pData);
        });
      });

      // Swarm: attention glowing
      checkAttentionGlow();
      // Bio: critical mass
      checkCriticalMass();
      // Whisper: proximity check
      checkProximityWhisper();
      // VS mode check
      checkVSMode();
    }

    // ── CONTEXT MENU ──
    function showCtx(anchorEl, pid, pData) {
      const nick = pData.nickname || 'Anon';
      const isPlaying = pData.gameState && pData.gameState.status;
      const isBoss = pData.gameState && pData.gameState.status === 'boss';
      const sameSection = pData.section && pData.section === mySection;

      let items = `<div class="mp-ctx-title">${nick}</div>`;
      items += `<div class="mp-ctx-item" data-action="highfive" data-pid="${pid}">✋ High-Five</div>`;
      if (sameSection) items += `<div class="mp-ctx-item" data-action="whisper" data-pid="${pid}">💬 Whisper</div>`;
      items += `<div class="mp-ctx-item" data-action="tip" data-pid="${pid}">🪙 Tip 5 XP</div>`;
      items += `<div class="mp-ctx-item" data-action="spectate" data-pid="${pid}">👁 Spectate</div>`;
      if (isPlaying && pData.gameState.game === 'defender' && isBoss) {
        items += `<div class="mp-ctx-item" data-action="invest" data-pid="${pid}">🛡 Invest (Power-Up)</div>`;
      }
      ctxMenu.innerHTML = items;
      const rect = anchorEl.getBoundingClientRect();
      ctxMenu.style.left = rect.left + 'px';
      ctxMenu.style.top = (rect.bottom + 4) + 'px';
      ctxMenu.style.display = 'block';

      ctxMenu.querySelectorAll('.mp-ctx-item').forEach(it => {
        it.addEventListener('click', () => {
          const action = it.dataset.action;
          const targetId = it.dataset.pid;
          handleCtxAction(action, targetId);
          closeCtx();
        });
      });
    }

    // ── CONTEXT ACTIONS ──
    function handleCtxAction(action, targetId) {
      switch (action) {
        case 'highfive': sendHighFive(targetId); break;
        case 'whisper': openWhisper(targetId); break;
        case 'tip': sendTip(targetId); break;
        case 'spectate': startSpectate(targetId); break;
        case 'invest': sendInvest(targetId); break;
      }
    }

    // ── SYSTEM 1a: HIGH-FIVE ──
    function sendHighFive(targetId) {
      evChannel.send({ type: 'broadcast', event: 'mp_event', payload: { type: 'high_five', from: myId, to: targetId, fromNick: myNickname } });
      pendingHighFives[targetId] = Date.now();
      if (window.UniToast) window.UniToast('✋ High-five sent! Waiting for them to high-five back...');
    }

    function receiveHighFive(from, fromNick) {
      if (window._presenceAudio) window._presenceAudio.onHighFive();
      if (pendingHighFives[from] && Date.now() - pendingHighFives[from] < 10000) {
        delete pendingHighFives[from];
        spawnParticleBurst();
        if (typeof checkTrophy === 'function' && checkTrophy('team_player') && typeof showTrophyToast === 'function') showTrophyToast('team_player');
        if (window.UniToast) window.UniToast('🎉 DOUBLE HIGH-FIVE with ' + fromNick + '! +25 XP!');
      } else {
        pendingHighFives[from] = Date.now();
        evChannel.send({ type: 'broadcast', event: 'mp_event', payload: { type: 'high_five', from: myId, to: from, fromNick: myNickname } });
        if (window.UniToast) window.UniToast('✋ ' + fromNick + ' wants to high-five! High-fiving back...');
        setTimeout(() => {
          spawnParticleBurst();
          if (typeof checkTrophy === 'function' && checkTrophy('team_player') && typeof showTrophyToast === 'function') showTrophyToast('team_player');
        }, 300);
      }
    }

    function spawnParticleBurst() {
      const burst = document.createElement('div');
      burst.className = 'mp-particle-burst';
      for (let i = 0; i < 20; i++) {
        const p = document.createElement('span');
        p.className = 'mp-particle';
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 80;
        p.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
        p.style.setProperty('--dy', (Math.sin(angle) * dist) + 'px');
        p.style.setProperty('--delay', (Math.random() * 0.2) + 's');
        p.textContent = ['✋','⭐','🎉','💥','✨'][Math.floor(Math.random()*5)];
        burst.appendChild(p);
      }
      document.body.appendChild(burst);
      setTimeout(() => burst.remove(), 1500);
    }

    // ── SYSTEM 1b: PROXIMITY WHISPERS ──
    function checkProximityWhisper() {
      const peerList = Object.entries(peers).filter(([k]) => k !== myId);
      for (const [pid, pArr] of peerList) {
        const p = pArr[0] || {};
        if (p.section && p.section === mySection && mySection !== 'hero') {
          if (!sameSecTimers[pid]) sameSecTimers[pid] = Date.now();
          else if (Date.now() - sameSecTimers[pid] > 3000) {
            const nick = p.nickname || 'Anon';
            if (window.UniToast) window.UniToast(`💬 ${nick} is also viewing ${mySection} — click their avatar to whisper`);
            sameSecTimers[pid] = Date.now() + 30000;
          }
        } else {
          delete sameSecTimers[pid];
        }
      }
    }

    function openWhisper(targetId) {
      whisperTarget = targetId;
      const pData = (peers[targetId] || [{}])[0];
      whisperEl.style.display = 'flex';
      const inp = document.getElementById('mpWhisperInput');
      inp.placeholder = `Whisper to ${pData.nickname || 'Anon'}...`;
      inp.focus();
    }

    document.getElementById('mpWhisperClose').addEventListener('click', () => {
      whisperEl.style.display = 'none';
      whisperTarget = null;
    });

    document.getElementById('mpWhisperInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && whisperTarget) {
        const msg = e.target.value.trim().substring(0, 80);
        if (!msg) return;
        evChannel.send({ type: 'broadcast', event: 'mp_event', payload: { type: 'whisper', from: myId, to: whisperTarget, fromNick: myNickname, text: msg } });
        e.target.value = '';
        if (window.UniToast) window.UniToast('💬 Whisper sent');
        whisperEl.style.display = 'none';
        whisperTarget = null;
      }
    });

    function receiveWhisper(fromNick, text) {
      if (window._presenceAudio) window._presenceAudio.onWhisper();
      if (window.UniToast) window.UniToast(`💬 ${fromNick}: ${text}`);
    }

    // ── SYSTEM 2: ARCADE SPECTATOR ──
    let vsPanel = null;
    function checkVSMode() {
      if (!myGameState) { if (vsPanel) { vsPanel.remove(); vsPanel = null; } return; }
      const rival = Object.entries(peers).find(([k, pArr]) => {
        if (k === myId) return false;
        const p = pArr[0] || {};
        return p.gameState && p.gameState.game === myGameState.game;
      });
      if (rival) {
        const [rid, rArr] = rival;
        const r = rArr[0];
        if (!vsPanel) {
          vsPanel = document.createElement('div');
          vsPanel.className = 'mp-vs-panel';
          document.body.appendChild(vsPanel);
        }
        vsPanel.innerHTML = `<div class="mp-vs-label">VS</div><div class="mp-vs-nick">${r.nickname || 'Anon'}</div><div class="mp-vs-score">${r.gameState.score || 0}</div>`;
        vsPanel.style.display = 'flex';
        // Ghost line
        window._mpGhostScore = r.gameState.score || 0;
      } else {
        if (vsPanel) { vsPanel.style.display = 'none'; }
        window._mpGhostScore = null;
      }
    }

    // ── SYSTEM 2c: ANGEL INVESTOR ──
    function sendInvest(targetId) {
      evChannel.send({ type: 'broadcast', event: 'mp_event', payload: { type: 'power_up', from: myId, to: targetId, fromNick: myNickname, kind: 'shield' } });
      if (typeof checkTrophy === 'function' && checkTrophy('angel_investor') && typeof showTrophyToast === 'function') showTrophyToast('angel_investor');
      if (window.VDna) window.VDna.addXp(10);
      if (window.UniToast) window.UniToast('🛡 Power-up sent! +10 XP');
    }

    function receivePowerUp(fromNick) {
      if (window._presenceAudio) window._presenceAudio.onPowerUp();
      if (window._gamePowerUp) window._gamePowerUp('shield');
      if (window.VDna) window.VDna.addXp(10);
      if (window.UniToast) window.UniToast('🛡 ' + fromNick + ' invested in you! Shield activated! +10 XP');
    }

    // ── SYSTEM 3a: BROADCAST TERMINAL ──
    function termBroadcast(text) {
      const now = Date.now();
      if (now - lastBroadcastTime < 10000) return '<span class="term-red">Rate limited. Wait 10s between broadcasts.</span>';
      if (!text || !text.trim()) return '<span class="term-gray">Usage: broadcast &lt;message&gt;</span>';
      lastBroadcastTime = now;
      const msg = text.trim().substring(0, 200);
      evChannel.send({ type: 'broadcast', event: 'mp_event', payload: { type: 'broadcast_msg', from: myId, fromNick: myNickname, text: msg } });
      return `<span class="term-green">📡 Broadcast sent: "${msg}"</span>`;
    }

    function escText(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function receiveBroadcast(fromNick, text) {
      if (window._presenceAudio) window._presenceAudio.onBroadcast();
      const body = document.getElementById('termBody');
      if (body) {
        body.innerHTML += `<div class="term-line"><span style="color:#a855f7">[broadcast]</span> <span style="color:#22c55e">${escText(fromNick)}</span>: ${escText(text)}</div>`;
        body.scrollTop = body.scrollHeight;
      }
      if (window.UniToast) window.UniToast('📡 ' + escText(fromNick) + ': ' + escText(text));
    }

    // ── SYSTEM 3b: CO-OP LOCKS ──
    function termEngage(args) {
      const match = (args || '').match(/(\d)/);
      const num = match ? parseInt(match[1]) : NaN;
      if (num !== 1 && num !== 2) return '<span class="term-gray">Usage: engage lock 1 or engage lock 2</span>';
      evChannel.send({ type: 'broadcast', event: 'mp_event', payload: { type: 'co_op_lock', from: myId, fromNick: myNickname, lockNum: num } });
      coopLocks['self_' + num] = Date.now();
      checkCoopUnlock();
      return `<span class="term-cyan">🔒 Lock ${num} engaged. Waiting for partner...</span>`;
    }

    function receiveCoopLock(from, fromNick, lockNum) {
      coopLocks['peer_' + lockNum] = { time: Date.now(), from, fromNick };
      checkCoopUnlock();
    }

    function checkCoopUnlock() {
      const s1 = coopLocks['self_1'], s2 = coopLocks['self_2'];
      const p1 = coopLocks['peer_1'], p2 = coopLocks['peer_2'];
      const now = Date.now();
      const W = 5000;
      const hasBoth = (
        ((s1 && p2 && p2.time && now - s1 < W && now - p2.time < W) ||
         (s2 && p1 && p1.time && now - s2 < W && now - p1.time < W))
      );
      if (hasBoth) {
        coopLocks = {};
        if (typeof checkTrophy === 'function' && checkTrophy('hacker_coop') && typeof showTrophyToast === 'function') showTrophyToast('hacker_coop');
        const body = document.getElementById('termBody');
        if (body) {
          body.innerHTML += `<div class="term-line"><span style="color:#22c55e;text-shadow:0 0 8px #22c55e">
╔══════════════════════════════════════╗
║  🔓 DUAL-LOCK SEQUENCE COMPLETE!    ║
║  Co-op hack successful.             ║
║  Hacker trophy unlocked! +30 XP     ║
╚══════════════════════════════════════╝</span></div>`;
          body.scrollTop = body.scrollHeight;
        }
        if (window.UniToast) window.UniToast('🔓 Hacker trophy unlocked! Co-op with another user!');
      }
    }

    // ── SYSTEM 4a: ATTENTION GLOWING ──
    function checkAttentionGlow() {
      const sectionCounts = {};
      const allPeers = Object.entries(peers);
      for (const [, pArr] of allPeers) {
        const p = pArr[0] || {};
        if (p.section) sectionCounts[p.section] = (sectionCounts[p.section] || 0) + 1;
      }

      const selMap = { timeline: '.tl-wrap', certs: '#certGrid', testimonials: '.tc-section', conferences: '.conf-strip', articles: '#linkedinFeed', impact: '.imp' };
      for (const [secName, sel] of Object.entries(selMap)) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const cnt = sectionCounts[secName] || 0;
        let badge = el.querySelector('.mp-attn-badge');
        if (cnt >= 3) {
          el.classList.add('attention-glow');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'mp-attn-badge';
            el.style.position = el.style.position || 'relative';
            el.appendChild(badge);
          }
          badge.textContent = cnt + ' viewing now';
        } else {
          el.classList.remove('attention-glow');
          if (badge) badge.remove();
        }
      }
    }

    // ── SYSTEM 4b: SPECTATOR MODE ──
    function startSpectate(targetId) {
      spectatingUser = targetId;
      const pData = (peers[targetId] || [{}])[0];
      specBanner.innerHTML = `👁 Spectating <strong>${pData.nickname || 'Anon'}</strong> <span class="mp-spec-exit" id="mpSpecExit">✕ Exit</span>`;
      specBanner.style.display = 'flex';
      document.getElementById('mpSpecExit').addEventListener('click', stopSpectate);
      doSpectateScroll();
    }

    function stopSpectate() {
      spectatingUser = null;
      specBanner.style.display = 'none';
    }

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && spectatingUser) stopSpectate(); });
    document.addEventListener('click', (e) => { if (spectatingUser && !e.target.closest('#mpSpecBanner, .mp-avatar, #mpCtx')) stopSpectate(); });

    function doSpectateScroll() {
      if (!spectatingUser) return;
      const pData = (peers[spectatingUser] || [{}])[0];
      if (!pData || pData.scrollPct === undefined) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const targetY = (pData.scrollPct / 100) * maxScroll;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }

    // ── SYSTEM 5a: XP TIPPING ──
    function sendTip(targetId) {
      const now = Date.now();
      if (now - lastTipTime < 30000) { if (window.UniToast) window.UniToast('⏳ Wait 30s between tips'); return; }
      const vdna = window.VDna ? window.VDna.get() : {};
      if ((vdna.xp || 0) < 10) { if (window.UniToast) window.UniToast('❌ Need at least 10 XP to tip'); return; }
      lastTipTime = now;
      if (window.VDna) { window.VDna.get().xp -= 5; window.VDna.save(); }
      evChannel.send({ type: 'broadcast', event: 'mp_event', payload: { type: 'xp_tip', from: myId, to: targetId, fromNick: myNickname, amount: 5 } });
      spawnCoinAnimation();
      if (window.UniToast) window.UniToast('🪙 Sent 5 XP tip!');
    }

    function receiveTip(fromNick, amount) {
      if (window._presenceAudio) window._presenceAudio.onTip();
      if (window.VDna) window.VDna.addXp(amount);
      spawnCoinAnimation();
      if (window.UniToast) window.UniToast('🪙 ' + fromNick + ' tipped you ' + amount + ' XP!');
    }

    function spawnCoinAnimation() {
      const coin = document.createElement('div');
      coin.className = 'mp-coin';
      coin.textContent = '🪙';
      document.body.appendChild(coin);
      setTimeout(() => coin.remove(), 1200);
    }

    // ── SYSTEM 5b: SMART CONTRACTS ──
    function spawnSmartContract() {
      if (liveCount < 2 || activeToken) return;
      const tid = Math.random().toString(36).slice(2, 8);
      activeToken = tid;
      tokenEl.style.left = (20 + Math.random() * 60) + 'vw';
      tokenEl.style.top = (20 + Math.random() * 50) + 'vh';
      tokenEl.style.display = 'flex';
      tokenEl.onclick = () => claimContract(tid);
      setTimeout(() => { if (activeToken === tid) { activeToken = null; tokenEl.style.display = 'none'; } }, 15000);
    }

    function claimContract(tid) {
      if (activeToken !== tid) return;
      activeToken = null;
      tokenEl.style.display = 'none';
      if (window._presenceAudio) window._presenceAudio.onContract();
      evChannel.send({ type: 'broadcast', event: 'mp_event', payload: { type: 'smart_contract', from: myId, fromNick: myNickname, tokenId: tid } });
      xpMultiplier = 2;
      xpMultiplierEnd = Date.now() + 60000;
      if (typeof checkTrophy === 'function' && checkTrophy('smart_trader') && typeof showTrophyToast === 'function') showTrophyToast('smart_trader');
      if (window.UniToast) window.UniToast('📜 Smart Contract executed! 2x XP for 60s!');
      setTimeout(() => { xpMultiplier = 1; }, 60000);
    }

    function receiveSmartContract(fromNick) {
      if (window._presenceAudio) window._presenceAudio.onContract();
      if (activeToken) { activeToken = null; tokenEl.style.display = 'none'; }
      xpMultiplier = 2;
      xpMultiplierEnd = Date.now() + 60000;
      if (window.UniToast) window.UniToast('📜 ' + fromNick + ' executed a Smart Contract! You get 2x XP for 60s!');
      setTimeout(() => { xpMultiplier = 1; }, 60000);
    }

    // ── SYSTEM 6: CRITICAL MASS ──
    function checkCriticalMass() {
      if (liveCount >= 5 && !criticalMassActive) {
        criticalMassActive = true;
        if (!document.body.classList.contains('cyberpunk-mode') && window._toggleCyberpunk) window._toggleCyberpunk(true);
        if (typeof checkTrophy === 'function' && checkTrophy('critical_mass') && typeof showTrophyToast === 'function') showTrophyToast('critical_mass');
        if (window.UniToast) window.UniToast('⚡ Critical mass reached. Mainframe overloaded.');
      } else if (liveCount < 5 && criticalMassActive) {
        criticalMassActive = false;
        if (document.body.classList.contains('cyberpunk-mode') && window._toggleCyberpunk) window._toggleCyberpunk(true);
      }
    }

    // ── EVENT DISPATCHER ──
    function handleBroadcastEvent(payload) {
      if (!payload || !payload.type) return;
      switch (payload.type) {
        case 'high_five':
          if (payload.to === myId) receiveHighFive(payload.from, payload.fromNick);
          break;
        case 'whisper':
          if (payload.to === myId) receiveWhisper(payload.fromNick, payload.text);
          break;
        case 'power_up':
          if (payload.to === myId) receivePowerUp(payload.fromNick);
          break;
        case 'broadcast_msg':
          if (payload.from !== myId) receiveBroadcast(payload.fromNick, payload.text);
          break;
        case 'co_op_lock':
          if (payload.from !== myId) receiveCoopLock(payload.from, payload.fromNick, payload.lockNum);
          break;
        case 'xp_tip':
          if (payload.to === myId) receiveTip(payload.fromNick, payload.amount);
          break;
        case 'smart_contract':
          if (payload.from !== myId) receiveSmartContract(payload.fromNick);
          break;
      }
    }

    // ── PRESENCE SYNC HANDLER ──
    function onPresenceSync() {
      const state = channel.presenceState();
      peers = state;
      renderBar();
      if (spectatingUser) doSpectateScroll();
      if (window._presenceAudio) window._presenceAudio.onPresenceSync(peers);
    }

    // ── SUBSCRIBE ──
    channel
      .on('presence', { event: 'sync' }, onPresenceSync)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            nickname: myNickname, avatar: myAvatar, section: detectSection(),
            scrollPct: getScrollPct(), gameState: null,
            x: myX, y: myY, online_at: new Date().toISOString()
          });
        }
      });

    evChannel
      .on('broadcast', { event: 'mp_event' }, ({ payload }) => handleBroadcastEvent(payload))
      .subscribe();

    // Smart contract spawner
    smartContractInterval = setInterval(spawnSmartContract, 60000);
    setTimeout(spawnSmartContract, 10000);

    window.addEventListener('beforeunload', () => {
      channel.untrack();
      channel.unsubscribe();
      evChannel.unsubscribe();
      if (smartContractInterval) clearInterval(smartContractInterval);
    });

    // ── TERMINAL COMMANDS ──
    window.TermCmds = window.TermCmds || {};
    window.TermCmds.broadcast = (args) => termBroadcast(args);
    window.TermCmds.engage = (args) => termEngage(args);
})();

    
// ═══ SHARE CARD ═══
window.openShare=function(){
    const c=document.getElementById('shareCanvas'),ctx=c.getContext('2d');
    const l=document.body.classList.contains('light-mode');
    const W=600,H=340;
    c.width=W;c.height=H;

    // Background with gradient mesh
    ctx.fillStyle=l?'#f4f6fb':'#06080f';ctx.fillRect(0,0,W,H);
    // Mesh blobs
    const drawBlob=(x,y,r,color,alpha)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color.replace(')',`,${alpha})`).replace('rgb','rgba'));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);};
    drawBlob(80,60,180,'rgb(0,225,255)',0.08);
    drawBlob(500,280,160,'rgb(99,102,241)',0.06);
    drawBlob(350,100,120,'rgb(168,85,247)',0.04);

    // Top accent bar gradient
    const grd=ctx.createLinearGradient(0,0,W,0);
    grd.addColorStop(0,'#00e1ff');grd.addColorStop(0.5,'#6366f1');grd.addColorStop(1,'#a855f7');
    ctx.fillStyle=grd;ctx.fillRect(0,0,W,4);

    // Name
    ctx.font='bold 34px Inter,sans-serif';ctx.fillStyle=l?'#0a0f1a':'#f0f2f5';
    ctx.fillText('Amr Elharony',40,72);

    // Title with accent
    ctx.font='13px JetBrains Mono,monospace';
    const titleGrd=ctx.createLinearGradient(40,0,400,0);
    titleGrd.addColorStop(0,'#00e1ff');titleGrd.addColorStop(1,'#6366f1');
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
        ctx.fillStyle='#00e1ff';ctx.fillText(s.val,x+24,166);
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
    ctx.fillStyle='#00e1ff';ctx.fillText('amrelharony.com',40,H-20);

    ctx.font='9px JetBrains Mono,monospace';
    ctx.fillStyle=l?'#8a94a6':'#4a5568';
    ctx.fillText('linkedin.com/in/amrmelharony',W-220,H-20);

    document.getElementById('shareOverlay').classList.add('show');
    autoDismiss('shareOverlay',closeShare);
};

window.closeShare=function(){const el=document.getElementById('shareOverlay');if(el)el.classList.remove('show');cancelAutoDismiss('shareOverlay');};

// QR code now uses external API image — no canvas generation needed

// Tab switching
document.querySelectorAll('.share-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
        document.querySelectorAll('.share-tab').forEach(t=>t.classList.remove('active'));
        document.querySelectorAll('.share-tab-content').forEach(c=>{c.classList.remove('active');c.style.display='none';});
        tab.classList.add('active');
        const content=document.querySelector(`.share-tab-content[data-content="${tab.dataset.tab}"]`);
        if(content){content.classList.add('active');content.style.display=tab.dataset.tab==='platforms'?'block':tab.dataset.tab==='qr'?'block':'block';}
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
            navigator.clipboard.writeText(SHARE_URL).then(()=>{showCopied();});
        } else if(p==='native'){
            if(navigator.share)navigator.share({title:SHARE_TITLE,text:SHARE_TEXT,url:SHARE_URL}).catch(()=>{});
            else{navigator.clipboard.writeText(SHARE_URL).then(()=>{showCopied();});}
        } else if(urls[p]){
            window.open(urls[p],'_blank','noopener,width=600,height=500');
        }
        VDna.addXp(5);
    });
});

function showCopied(){
    const el=document.getElementById('shareCopied');
    el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1500);
}

window.downloadShareCard=function(){
    const a=document.createElement('a');a.download='Amr_Elharony_Card.png';
    a.href=document.getElementById('shareCanvas').toDataURL('image/png');a.click();
};

window.copyShareImage=function(){
    document.getElementById('shareCanvas').toBlob(blob=>{
        if(blob&&navigator.clipboard&&navigator.clipboard.write){
            navigator.clipboard.write([new ClipboardItem({'image/png':blob})]).then(()=>showCopied()).catch(()=>{showCopied();});
        } else {showCopied();}
    },'image/png');
};
// Escape handled by unified handler

// ═══ STREAK ═══
(function(){const today=new Date().toDateString(),last=localStorage.getItem('lastVisit');let streak=parseInt(localStorage.getItem('streak')||'0');if(last!==today){const yd=new Date();yd.setDate(yd.getDate()-1);streak=(last===yd.toDateString())?streak+1:1;}localStorage.setItem('streak',streak.toString());localStorage.setItem('lastVisit',today);if(streak>1)document.getElementById('streakCount').textContent=`🔥 ${streak}-day visit streak`;})();


// ═════════════════════════════════════════════════
// SYSTEM 1: VISITOR INTELLIGENCE ENGINE
// ═════════════════════════════════════════════════
const VDna=(function(){
    const k='v_dna';let p=JSON.parse(localStorage.getItem(k)||'{}');
    // Build DNA on every visit
    p.visits=(p.visits||0)+1;
    p.firstVisit=p.firstVisit||Date.now();
    p.lastVisit=Date.now();
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
    p.achievements=p.achievements||[];
    p.xp=p.xp||0;
    p.level=p.level||1;
    p.challengeDate=p.challengeDate||'';
    p.challengeDone=p.challengeDone||false;
    p.lastScrollY=p.lastScrollY||0;
    p.smartCtaDismissed=p.smartCtaDismissed||false;
    p.sessionClicks=0;
    p.sessionStart=Date.now();
    function save(){localStorage.setItem(k,JSON.stringify(p));}
    save();
    return{get:()=>p,save,addXp(n){const mult=typeof window._mpXpMultiplier==='function'?window._mpXpMultiplier():1;p.xp+=Math.round(n*mult);const lvls=[0,50,150,300,500,800,1200];const nl=lvls.findIndex(t=>p.xp<t);p.level=nl===-1?lvls.length:nl;save();updateXpUI();},addClick(id){if(!p.clickedLinks.includes(id)){p.clickedLinks.push(id);save();}p.sessionClicks++;},addSection(id){if(!p.sectionsViewed.includes(id)){p.sectionsViewed.push(id);save();}},setScroll(pct){if(pct>p.scrollMax){p.scrollMax=pct;save();}p.lastScrollY=window.scrollY;save();}};
})();
window.VDna = VDna;

// 1b. Device/Battery/Network Adaptation
(function(){
    const p=VDna.get();
    // Battery: reduce animations if low
    if(navigator.getBattery){navigator.getBattery().then(b=>{if(b.level<0.2&&!b.charging){document.documentElement.style.setProperty('--glow','transparent');document.querySelectorAll('.mesh div').forEach(d=>d.style.opacity='0.02');}});}
    // Network: degrade on slow connections
    const conn=navigator.connection||navigator.mozConnection;
    if(conn&&(conn.effectiveType==='2g'||conn.effectiveType==='slow-2g')){
        document.querySelectorAll('.mesh div').forEach(d=>d.style.display='none');
        document.getElementById('bgC').style.display='none';
    }
    // Performance: reduce particles on low-end
    if(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2){
        window._lowEnd=true;
    }
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
    const pct=Math.round(scrollY/(document.documentElement.scrollHeight-innerHeight)*100);
    VDna.setScroll(pct);
    [25,50,75,100].forEach(m=>{if(pct>=m&&!scrollMilestones[m]){scrollMilestones[m]=true;VDna.addXp(1);if(m===100)Achieve.check('explorer');}});
}

// 2b. Section Dwell Time (Intersection Observer)
const sectionTimes={};
const sectionObs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
        const id=e.target.dataset.section||e.target.id||'unknown';
        if(e.isIntersecting){sectionTimes[id]=Date.now();VDna.addSection(id);}
        else if(sectionTimes[id]){const dwell=Date.now()-sectionTimes[id];delete sectionTimes[id];}
    });
},{threshold:0.3});
setTimeout(()=>{document.querySelectorAll('.rv,[data-section]').forEach(el=>{if(!el.dataset.section){el.dataset.section=el.className.split(' ')[0]||'sec-'+Math.random().toString(36).slice(2,6);}sectionObs.observe(el);});},4000);

// 2c. Click Attribution
document.addEventListener('click',e=>{
    const link=e.target.closest('a[href],button[onclick],.qp,.lk,.nl,.vcb');
    if(link){
        const id=link.href||link.textContent.trim().slice(0,30);
        VDna.addClick(id);
        VDna.addXp(5);
        Achieve.check('connector');
        // Check newsletter clicks for scholar
        const href=link.href||'';
        if(href.includes('newsletter')||href.includes('levelup')){
            const p=VDna.get();
            const nlClicks=p.clickedLinks.filter(l=>l.includes('newsletter')||l.includes('levelup'));
            if(nlClicks.length>=3)Achieve.check('scholar');
        }
        ChallengeSystem.checkProgress();
    }
});

// 2d. Engagement Score
function getEngagementScore(){
    const p=VDna.get();
    const scrollScore=Math.min(p.scrollMax/100*30,30);
    const timeScore=Math.min((Date.now()-p.sessionStart)/120000*20,20);
    const sectionScore=Math.min(p.sectionsViewed.length/8*20,20);
    const clickScore=Math.min(p.sessionClicks/3*15,15);
    const returnScore=Math.min(p.visits/3*15,15);
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
    const cta=document.getElementById('smartCta'),link=document.getElementById('smartCtaLink'),title=document.getElementById('smartCtaTitle'),sub=document.getElementById('smartCtaSub'),icon=document.getElementById('smartCtaIcon');
    if(type==='high'){
        link.href='https://calendly.com/amrmelharony/30min';
        title.textContent="You seem interested — let's connect";
        sub.textContent='Book a free 30-min strategy call';
        icon.innerHTML='<i class="fa-solid fa-calendar-check"></i>';
    } else {
        link.href='https://www.linkedin.com/newsletters/levelup-your-leadership-6872921030353031168';
        title.textContent="Grab a free insight before you go";
        sub.textContent='Join 500+ leaders reading LevelUp';
        icon.innerHTML='<i class="fa-solid fa-envelope-open-text"></i>';
    }
    cta.classList.add('show');
    VDna.addXp(2);
    // Auto-dismiss after inactivity
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
    const clicked=p.clickedLinks.join(' ').toLowerCase();
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
    ()=>`${VDna.get().achievements.length}/${14} achievements unlocked`,
    ()=>`Running on ${navigator.hardwareConcurrency||'?'} cores · ${VDna.get().screen}`,
    ()=>'System status: all modules operational ✓',
];
let consoleIdx=0;
function typeConsole(){
    const el=document.getElementById('liveConsole');if(!el)return;
    const msg=consoleMessages[consoleIdx%consoleMessages.length]();
    consoleIdx++;
    let i=0;el.textContent='';
    const iv=setInterval(()=>{if(i<msg.length){el.textContent=msg.slice(0,i+1);i++;}else{el.innerHTML=msg+'<span class="cursor-blink"> ▊</span>';clearInterval(iv);}},30);
}
setTimeout(()=>{typeConsole();setInterval(typeConsole,8000);},5000);

// ═════════════════════════════════════════════════
// SYSTEM 4: GAMIFICATION LAYER (ADVANCED)
// ═════════════════════════════════════════════════

const BADGES=[
    {id:'explorer',emoji:'🔍',name:'Explorer',desc:'Scrolled to 100%',rarity:'common',xp:25},
    {id:'regular',emoji:'🔄',name:'Regular',desc:'Visited 3+ times',rarity:'common',xp:25},
    {id:'connector',emoji:'🤝',name:'Connector',desc:'Clicked a link',rarity:'common',xp:20},
    {id:'scholar',emoji:'📖',name:'Scholar',desc:'Read all 3 newsletters',rarity:'rare',xp:40},
    {id:'nightowl',emoji:'🌙',name:'Night Owl',desc:'Visited midnight–5AM',rarity:'rare',xp:40},
    {id:'secret',emoji:'🤫',name:'Secret Agent',desc:'Found the easter egg',rarity:'epic',xp:60},
    {id:'shaker',emoji:'📱',name:'Shaker',desc:'Unlocked contact section',rarity:'rare',xp:35},
    {id:'streak5',emoji:'🔥',name:'Streak Master',desc:'5+ day visit streak',rarity:'epic',xp:60},
    {id:'globe',emoji:'🌍',name:'Globetrotter',desc:'Visited from outside Egypt',rarity:'rare',xp:35},
    {id:'speed',emoji:'⚡',name:'Speed Reader',desc:'Reached bottom in <30s',rarity:'epic',xp:50},
    {id:'deep',emoji:'🧠',name:'Deep Diver',desc:'Spent 3+ minutes exploring',rarity:'common',xp:25},
    {id:'social',emoji:'🔗',name:'Networker',desc:'Clicked 5+ different links',rarity:'rare',xp:40},
    {id:'collector',emoji:'🏆',name:'Collector',desc:'Unlocked 8 badges',rarity:'legendary',xp:100},
    {id:'certified',emoji:'📜',name:'Cert Inspector',desc:'Visited 3+ certifications',rarity:'rare',xp:35},
];

const LEVEL_NAMES=['Visitor','Curious','Explorer','Engaged','Fan','Superfan','Legend'];
const LEVEL_COLORS=['var(--sub)','var(--accent)','#3b82f6','#a855f7','#f97316','#ef4444','#fbbf24'];
const RARITY_ORDER={common:0,rare:1,epic:2,legendary:3};

// Combo System
const Combo=(function(){
    let count=0,timer=null;
    function hit(){
        count++;if(timer)clearTimeout(timer);
        timer=setTimeout(()=>{count=0;document.getElementById('comboIndicator').classList.remove('show');},8000);
        if(count>=2){
            const el=document.getElementById('comboIndicator');
            document.getElementById('comboCount').textContent='×'+count;
            document.getElementById('comboMult').textContent=Math.min(count,5)+'× XP';
            el.classList.add('show');
        }
        return Math.min(count,5);// Max 5x multiplier
    }
    return{hit,get:()=>count};
})();

const Achieve=(function(){
    const shown={};
    const queue=[];
    let toastActive=false;
    let prevLevel=VDna.get().level;
    function processQueue(){
        if(queue.length===0){toastActive=false;return;}
        toastActive=true;
        const item=queue.shift();
        if(item._levelUp)showLevelUpToast(item);
        else showToast(item);
        setTimeout(processQueue,4800);
    }
    function check(id){
        if(shown[id])return;
        const p=VDna.get();
        if(p.achievements.includes(id))return;
        shown[id]=true;
        const badge=BADGES.find(b=>b.id===id);
        if(!badge)return;
        // Timestamp the unlock
        if(!p.achieveTimes)p.achieveTimes={};
        p.achieveTimes[id]=Date.now();
        p.achievements.push(id);VDna.save();
        // XP with combo multiplier
        const mult=Combo.hit();
        const xp=badge.xp*(mult>=2?mult:1);
        VDna.addXp(xp);
        badge._earnedXp=xp;badge._combo=mult;
        queue.push(badge);
        // Check for level up
        const newLevel=VDna.get().level;
        if(newLevel>prevLevel){queue.push({_levelUp:true,level:newLevel});prevLevel=newLevel;}
        // Check collector badge
        if(p.achievements.length>=8)check('collector');
        // Trophy button notification dot
        const dot=document.getElementById('trophyDot');if(dot)dot.style.display='block';
        if(!toastActive)processQueue();
    }
    return{check};
})();
window.Achieve = Achieve;

// Enhanced Toast System
function showToast(badge){
    const container=document.getElementById('toastContainer');
    const toast=document.createElement('div');
    const rarityClass=badge.rarity||'common';
    toast.className='toast '+rarityClass;
    const rarityLabel={common:'Common',rare:'✦ Rare',epic:'✦✦ Epic',legendary:'★ Legendary'}[rarityClass];
    const rarityColor={common:'#6b7a90',rare:'#3b82f6',epic:'#a855f7',legendary:'#fbbf24'}[rarityClass];
    toast.innerHTML=`<div class="toast-shimmer"></div><div class="toast-emoji">${badge.emoji}</div><div class="toast-body"><div class="toast-title">Achievement Unlocked!</div><div class="toast-desc">${badge.name} — ${badge.desc}</div><div class="toast-xp">+${badge._earnedXp||badge.xp} XP${badge._combo>=2?' (×'+badge._combo+' combo!)':''}</div><div class="toast-rarity" style="color:${rarityColor}">${rarityLabel}</div></div>`;
    container.appendChild(toast);
    setTimeout(()=>toast.classList.add('show'),50);
    setTimeout(()=>{toast.classList.remove('show');setTimeout(()=>toast.remove(),500);},4200);
    if(navigator.vibrate){
        const patterns={common:[80,40,80],rare:[80,40,80,40,120],epic:[60,30,60,30,60,30,200],legendary:[100,50,100,50,100,50,300]};
        navigator.vibrate(patterns[rarityClass]||[80]);
    }
}

function showLevelUpToast(item){
    const container=document.getElementById('toastContainer');
    const toast=document.createElement('div');
    toast.className='toast toast-levelup';
    const name=LEVEL_NAMES[item.level-1]||'Legend';
    toast.innerHTML=`<div class="toast-shimmer"></div><div class="toast-emoji">🎉</div><div class="toast-body"><div class="toast-title">Level Up!</div><div class="toast-desc">You reached Level ${item.level}: ${name}</div><div class="toast-xp">Keep exploring to unlock more badges</div></div>`;
    container.appendChild(toast);
    setTimeout(()=>toast.classList.add('show'),50);
    setTimeout(()=>{toast.classList.remove('show');setTimeout(()=>toast.remove(),500);},4200);
    if(navigator.vibrate)navigator.vibrate([100,80,100,80,100,80,300]);
}

// Enhanced XP UI
function updateXpUI(){
    const p=VDna.get();
    const lvls=[0,50,150,300,500,800,1200];
    const currLvlXp=lvls[p.level-1]||0;
    const nextLvlXp=lvls[p.level]||lvls[lvls.length-1];
    const pct=Math.min(((p.xp-currLvlXp)/(nextLvlXp-currLvlXp))*100,100);
    const xpText=document.getElementById('xpText');
    const xpFill=document.getElementById('xpBarFill');
    const xpLvl=document.getElementById('xpLevel');
    if(xpText)xpText.textContent=p.xp+' XP';
    if(xpFill)xpFill.style.width=pct+'%';
    if(xpLvl){
        const name=LEVEL_NAMES[p.level-1]||'Legend';
        const color=LEVEL_COLORS[p.level-1]||'#fbbf24';
        xpLvl.textContent='LVL '+p.level+' · '+name;
        xpLvl.style.color=color;
        xpLvl.style.background=color.replace(')',',0.1)').replace('var(','rgba(').replace('--sub','107,122,144').replace('--accent','0,225,255');
    }
}
setTimeout(updateXpUI,3000);

// Enhanced Trophy Case
function openTrophy(){
    const p=VDna.get();
    const unlockedCount=p.achievements.length;
    const totalCount=BADGES.length;
    const pct=Math.round((unlockedCount/totalCount)*100);
    // Progress ring
    const circ=276.5;
    const ring=document.getElementById('trophyRing');
    setTimeout(()=>{ring.style.strokeDashoffset=circ-(circ*pct/100);},100);
    document.getElementById('trophyPct').textContent=pct+'%';
    // Stats
    document.getElementById('trophySBadges').textContent=unlockedCount+'/'+totalCount;
    document.getElementById('trophySXp').textContent=p.xp;
    document.getElementById('trophySLevel').textContent=p.level;
    // XP bar
    const lvls=[0,50,150,300,500,800,1200];
    const currLvlXp=lvls[p.level-1]||0;
    const nextLvlXp=lvls[p.level]||lvls[lvls.length-1];
    const xpPct=Math.min(((p.xp-currLvlXp)/(nextLvlXp-currLvlXp))*100,100);
    document.getElementById('trophyXpFill').style.width=xpPct+'%';
    const name=LEVEL_NAMES[p.level-1]||'Legend';
    document.getElementById('trophyLevel').textContent=`${name} · ${nextLvlXp-p.xp} XP to Level ${p.level+1}`;
    // Build grid grouped by rarity
    const grid=document.getElementById('trophyGrid');
    let html='';
    ['legendary','epic','rare','common'].forEach(tier=>{
        const badges=BADGES.filter(b=>b.rarity===tier);
        if(badges.length===0)return;
        const tierLabel={legendary:'★ Legendary',epic:'✦ Epic',rare:'✦ Rare',common:'Common'}[tier];
        html+=`<div class="trophy-tier-label" style="grid-column:1/-1">${tierLabel}</div>`;
        badges.forEach(b=>{
            const unlocked=p.achievements.includes(b.id);
            const time=p.achieveTimes&&p.achieveTimes[b.id]?new Date(p.achieveTimes[b.id]).toLocaleDateString():'';
            html+=`<div class="trophy-badge ${unlocked?'unlocked':' locked'} ${tier}"><div class="trophy-badge-emoji">${unlocked?b.emoji:'🔒'}</div><div class="trophy-badge-name">${b.name}</div><div class="trophy-badge-desc">${b.desc}</div><span class="trophy-badge-rarity ${tier}">${b.xp} XP</span>${unlocked&&time?'<div class="trophy-badge-time">'+time+'</div>':''}</div>`;
        });
    });
    grid.innerHTML=html;
    // Hide notification dot
    const dot=document.getElementById('trophyDot');if(dot)dot.style.display='none';
    const tO=document.getElementById('trophyOverlay'); if(!tO)return;
    tO.classList.add('show');
    autoDismiss('trophyOverlay',closeTrophy);
}
window.closeTrophy=function(){const el=document.getElementById('trophyOverlay');if(el)el.classList.remove('show');cancelAutoDismiss('trophyOverlay');};
// Share progress
window.shareTrophy=function(){
    const p=VDna.get();
    const name=LEVEL_NAMES[p.level-1]||'Legend';
    const text=`🏆 I'm Level ${p.level} (${name}) on amrelharony.com!\n${p.achievements.length}/${BADGES.length} badges · ${p.xp} XP\nCan you beat my score?`;
    if(navigator.share){navigator.share({title:'My Trophy Progress',text,url:'https://amrelharony.com'}).catch(()=>{});}
    else{navigator.clipboard.writeText(text).then(()=>{const btn=document.querySelector('.trophy-share-btn');btn.textContent='✓ Copied!';setTimeout(()=>{btn.innerHTML='<i class="fa-solid fa-share" style="margin-right:4px"></i>Share Progress';},2000);});}
};
setTimeout(()=>{const btn=document.getElementById('trophyBtn');btn.style.display='flex';btn.addEventListener('click',openTrophy);document.getElementById('termBtn').style.display='flex';document.getElementById('gameBtn').style.display='flex';},4000);

// Auto-check achievements on load
(function(){
    const p=VDna.get();
    if(p.visits>=3)Achieve.check('regular');
    const cairoH=parseInt(new Date().toLocaleString("en-US",{timeZone:"Africa/Cairo",hour:"numeric",hour12:false}));
    if(cairoH>=0&&cairoH<5)Achieve.check('nightowl');
    const streak=parseInt(localStorage.getItem('streak')||'0');
    if(streak>=5)Achieve.check('streak5');
    // Speed Reader
    const loadTime=Date.now();
    let speedDone=false;
    const speedCheck=()=>{if(speedDone)return;const pct=scrollY/(document.documentElement.scrollHeight-innerHeight);if(pct>0.95&&(Date.now()-loadTime)<30000){speedDone=true;Achieve.check('speed');removeEventListener('scroll',speedCheck);}};
    addEventListener('scroll',speedCheck,{passive:true});
    setTimeout(()=>{speedDone=true;removeEventListener('scroll',speedCheck);},35000);
    // Globetrotter
    if(p.tz&&!p.tz.includes('Cairo')&&!p.tz.includes('Africa'))Achieve.check('globe');
    // Deep Diver: 3 min timer
    setTimeout(()=>Achieve.check('deep'),180000);
    // Social Networker: check existing clicks
    if(p.clickedLinks.length>=5)Achieve.check('social');
    // Cert Inspector: check cert clicks
    const certClicks=p.clickedLinks.filter(l=>l.includes('credly')||l.includes('certmetrics')||l.includes('cdmp')||l.includes('datacamp'));
    if(certClicks.length>=3)Achieve.check('certified');
})();

// Hook easter egg achievement
const origShowEgg=showEgg;
showEgg=function(){origShowEgg();Achieve.check('secret');};
// Hook shake contact achievement
const origReveal=revealContact;
revealContact=function(){origReveal();Achieve.check('shaker');};

// Track social networker on clicks
document.addEventListener('click',e=>{
    const p=VDna.get();
    if(p.clickedLinks.length>=5)Achieve.check('social');
    // Cert inspector
    const certClicks=p.clickedLinks.filter(l=>l.includes('credly')||l.includes('certmetrics')||l.includes('cdmp')||l.includes('datacamp'));
    if(certClicks.length>=3)Achieve.check('certified');
},{passive:true});

const ChallengeSystem={checkProgress(){}};

// Engagement check interval
setInterval(checkSmartCta,5000);

// ═════════════════════════════════════════════════
// FEATURE: TYPING TERMINAL v4.0 (AmrOS Kernel)
// ═════════════════════════════════════════════════
const TermCmds = {
    fs: {
        '~': {
            'projects': {
                'book.txt': 'The Bilingual Executive: Bridging business & tech. Published 2026.',
                'community.txt': 'Fintech Bilinguals: 500+ members bridging the gap.',
                'data_mesh.log': 'Architecture impl at Banque Misr: SUCCESS.'
            },
            'certs': {
                'pmp.crt': 'PMP® Certified (Project Management Professional)',
                'cdmp.crt': 'DAMA Certified Data Management Professional',
                'safe.crt': 'SAFe® 6 Agilist'
            },
            'about.md': 'Delivery Lead & Scrum Master with 12+ years experience.',
            'contact.json': '{"email": "a.elharony@gmail.com", "linkedin": "/in/amrmelharony"}'
        }
    },
    path: ['~'],
    history: JSON.parse(localStorage.getItem('amros_history') || '[]'),
    histIdx: -1,

    getDir: function() {
        let d = this.fs['~'];
        for (let i = 1; i < this.path.length; i++) d = d[this.path[i]];
        return d;
    },

    ls: function() {
        const dir = this.getDir();
        return Object.keys(dir).map(k => {
            const isDir = typeof dir[k] === 'object';
            const color = isDir ? '#00e1ff' : '#e2e8f0';
            return `<span style="color:${color}; font-weight:${isDir?'bold':'normal'}">${isDir?'📁':'📄'} ${k}</span>`;
        }).join('&nbsp;&nbsp;&nbsp;');
    },

    cd: function(args) {
        const t = (args || '').trim();
        if (!t || t === '~') { this.path = ['~']; return ''; }
        if (t === '..') { if (this.path.length > 1) this.path.pop(); return ''; }
        const dir = this.getDir();
        if (dir[t] && typeof dir[t] === 'object') { this.path.push(t); return ''; }
        return `<span style="color:#ef4444">cd: ${t}: No such directory</span>`;
    },

    cat: function(args) {
        const t = (args || '').trim();
        const dir = this.getDir();
        if (dir[t] && typeof dir[t] === 'string') return `<span style="color:#fff">${dir[t]}</span>`;
        return `<span style="color:#ef4444">cat: ${t}: Cannot open file</span>`;
    },

    neofetch: () => `
<span style="color:#00e1ff">       /\\       </span>  <span style="color:#22c55e">amr@v4</span>
<span style="color:#00e1ff">      /  \\      </span>  -------------
<span style="color:#00e1ff">     / /\\ \\     </span>  <span style="color:#00e1ff">OS</span>: AmrOS v4.0 (Singularity)
<span style="color:#00e1ff">    / /  \\ \\    </span>  <span style="color:#00e1ff">Uptime</span>: ${Math.floor(performance.now()/60000)}m
<span style="color:#00e1ff"> /_/        \\_\\ </span>  <span style="color:#00e1ff">Status</span>: Operational`,

    help: () => `
<span style="color:#22c55e;font-weight:bold">═══ AmrOS v4.0 ═══</span>
<span style="color:#00e1ff">SYSTEM</span>   ls, cd, cat, clear, neofetch
<span style="color:#00e1ff">APPS</span>     arcade, wall, trophies, search
<span style="color:#00e1ff">TOOLS</span>    audio, voice, visualizer, cyberpunk
<span style="color:#00e1ff">SOCIAL</span>   broadcast, engage, ask
<span style="color:#00e1ff">INFO</span>     weather, theme, timeline, book3d`,

    clear: () => '__CLEAR__',
    arcade: () => { if(window._openArcade) window._openArcade(); return '🕹️ Launching...'; },
    wall: () => { if(window.openGuestbook) window.openGuestbook(); return '🌍 Opening...'; },
    search: () => { if(window._openPalette) window._openPalette(); return '⌨️ Opening...'; },
    weather: () => {
        const w = JSON.parse(localStorage.getItem('cairoWeather') || '{}');
        return `<span style="color:#00e1ff">📍 Cairo</span> · Temp: ${w.data ? Math.round(w.data.temp) : '--'}°C`;
    },
    theme: () => {
        const n = document.body.classList.contains('light-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', n);
        applyTheme(n);
        return n === 'light'
          ? '<span class="term-green">☀️ Switched to light mode</span>'
          : '<span class="term-green">🌙 Switched to dark mode</span>';
    },
    exit: () => { window.closeTerm(); return ''; }
};

window.TermCmds = TermCmds;

// Unified Terminal UI Logic
window.openTerm = function() {
    const tEl=document.getElementById('termOverlay'); if(!tEl)return;
    tEl.classList.add('show');
    const b = document.getElementById('termBody');
    if (b.innerHTML.trim() === "" || b.innerHTML.includes('v2.0')) {
        // Updated innerHTML to include the help command hint
        b.innerHTML = `
            <div class="term-line"><span style="color:#22c55e">✔ AmrOS v4.0 Singularity Kernel Loaded.</span></div>
            <div class="term-line"><span style="color:#8b949e">Type <span style="color:#00e1ff">help</span> for available commands</span></div>
        `;
    }
    setTimeout(() => document.getElementById('termInput').focus(), 300);
    autoDismiss('termOverlay',closeTerm);
};

window.closeTerm = function() { const el=document.getElementById('termOverlay');if(el)el.classList.remove('show'); cancelAutoDismiss('termOverlay'); };

// Input Handler (Single listener to prevent page hanging)
const inputField = document.getElementById('termInput');
function _termEsc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
inputField.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const input = e.target;
        const raw = input.value.trim();
        const parts = raw.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        input.value = '';

        const body = document.getElementById('termBody');
        const pathStr = TermCmds.path.length === 1 ? '~' : '~/' + TermCmds.path.slice(1).join('/');
        body.innerHTML += `<div class="term-line"><span style="color:#22c55e">amr@v4</span>:<span style="color:#00e1ff">${pathStr}</span>❯ ${_termEsc(raw)}</div>`;

        if (typeof TermCmds[cmd] === 'function') {
            const out = TermCmds[cmd](args);
            if (out === '__CLEAR__') body.innerHTML = '';
            else if (out) body.innerHTML += `<div class="term-line">${out.replace(/\n/g, '<br>')}</div>`;
        } else if (TermCmds[cmd] !== undefined) {
            // TermCmds property exists but isn't a function (e.g. 'fs', 'path', 'history')
        } else if (raw) {
            body.innerHTML += `<div class="term-line"><span style="color:#ef4444">bash: ${_termEsc(cmd)}: command not found</span></div>`;
        }
        body.scrollTop = body.scrollHeight;
    }
});
// ═════════════════════════════════════════════════
// FEATURE: TESTIMONIAL CAROUSEL (80+ recommendations)
// ═════════════════════════════════════════════════
(function(){
const TC=[
{c:'strategy',n:'Ayman Hassan Soliman',r:'Senior Deputy GM',q:'A strategic catalyst for change... masterfully leverages technology to engineer fundamental shifts in systems and culture.'},
{c:'strategy',n:'Alaa Ghaly',r:'Assistant Manager',q:'Rare talent who sees the future of our data landscape... and leads his team to drive that change.'},
{c:'strategy',n:'Romany Youssef',r:'GTB MIS Manager',q:'Demonstrates remarkable courage in challenging the status quo... catalyzing shifts in both systems and attitude.'},
{c:'strategy',n:'Ayman El Menawy',r:'Senior Deputy GM',q:'Has a sharp strategic mindset, always seeing the big picture while mastering the details.'},
{c:'strategy',n:'Ahmed Arafat, MBA',r:'Deputy GM',q:'Transparent and forward-thinking... leads with clarity, empathy, and a relentless focus on driving value.'},
{c:'strategy',n:'Karima Othman',r:'Project Manager',q:'Expertise in leveraging technology to bring about transformative change... a valuable addition to any bank.'},
{c:'strategy',n:'Sameh Elebiary',r:'Corporate Credit Analyst',q:'The rare talent who has the ability to challenge, teach, and lead to drive change.'},
{c:'strategy',n:'Mohamed Taha',r:'Data Steward',q:'A strategic thinker who connects dots across different lines of businesses... You will be mesmerized!'},
{c:'strategy',n:'Mohamed Badr',r:'Core Banking Support',q:'A creative big thinker whose enthusiasm for financial technology is impressive.'},
{c:'strategy',n:'Sayed Hamed',r:'Corporate Relationship Manager',q:'He wants to drive positive change... gets the big picture and how to tactically achieve it.'},
{c:'strategy',n:'Marwa Rashed',r:'ARM Large Corporate',q:'Always looking ahead and thinking about how technology can improve businesses.'},
{c:'tech',n:'Mohamed Abaza',r:'Lead Data Scientist',q:'Wide knowledge in multidisciplinary topics, almost like a Wikipedia moving on Earth!'},
{c:'tech',n:'Eslam Youssef',r:'Senior Data Analyst',q:'Working with him was transformative. His deep tech expertise and talent for fintech set him apart.'},
{c:'tech',n:'Abdelrhman Mabrouk',r:'Corporate Credit Certified',q:'His technical expertise in data analysis was a huge asset... significantly boosted our problem-solving.'},
{c:'tech',n:'Youssef Saeed',r:'Data Analytics Engineer',q:'Exceptional skills in technology combined with outstanding interpersonal abilities.'},
{c:'tech',n:'Haitham Adel',r:'Deputy GM',q:'A tech-savvy professional... his passion for technology and innovative problem-solving are valuable assets.'},
{c:'tech',n:'Ahmed Mostafa',r:'Deputy GM',q:'Excels at solving problems... assimilates the newest concepts in technology & data analytics.'},
{c:'tech',n:'George Hishmat',r:'Deputy GM',q:'Resourceful, creative problem solver... his ability to explain technical concepts is outstanding.'},
{c:'tech',n:'Omar Nabhan',r:'DGM',q:'Wide knowledge in all technology aspects related to banking systems... provides outstanding performance.'},
{c:'tech',n:'Ahmed Refaat',r:'Business Analyst',q:'A hard worker and ambitious person... multi-skilled specially with anything related to technology.'},
{c:'tech',n:'Amr Refaat',r:'Large Corporate Dept Head',q:'One of the smartest partners I have worked with... multi-skilled especially in technology.'},
{c:'tech',n:'John Talaat',r:'Assistant Relationship Manager',q:'The Tech guy of our department... keep raising the bar high as always.'},
{c:'tech',n:'Essam Arsanious',r:'Team Leader',q:'Gifted in the field of technology... strong critical thinking ability to see through complex problems.'},
{c:'tech',n:'Emam M. SAAD',r:'Treasury & Capital Markets',q:'Highly recommend him as a digitalization and fintech expert... amazing at his job!'},
{c:'tech',n:'Dina Tony',r:'Senior Corporate RM',q:'The complete package... blend of business acumen and technology skills.'},
{c:'mentor',n:'ADPList Mentee',r:'Jan 2026',q:'Guided me through complex topics with clarity and efficiency... exceeded my expectations.'},
{c:'mentor',n:'Ahmed Shewail',r:'Senior Banker',q:'Provided exceptional motivation and problem-solving strategies, which truly helped me tackle my challenges.'},
{c:'mentor',n:'Hossam Elden Abdelhamed',r:'Data Architect',q:'Very supportive and explained everything clearly... helped me understand my career direction.'},
{c:'mentor',n:'Alaa Elnakeeb',r:'AI & Data Analytics',q:'Discussed a potential roadmap for becoming a data science engineer... a truly helpful session.'},
{c:'mentor',n:'Omar Ayoub',r:'Engineering Student',q:'Helped me organize everything step by step and clarified the actions I should take moving forward.'},
{c:'mentor',n:'Hazem Amr',r:'Data Analyst',q:'Before the session, I felt lost... throughout our discussion, everything became clear.'},
{c:'mentor',n:'Laila Sami',r:'Student, UOWD',q:'Invaluable guidance on navigating the Egyptian job market and effectively tailoring my CV.'},
{c:'mentor',n:'Abdelrhman Afify',r:'Data Engineer',q:'Explained things clearly... feeling much more confident and excited to take the next steps.'},
{c:'mentor',n:'Rabab El Gendy',r:'CS Representative',q:'Walked away with useful knowledge... His sincere willingness to support others stood out.'},
{c:'mentor',n:'Mohamed Sror',r:'Microfinance Specialist',q:'Exceeded my expectations... helped me organize my thoughts and recognize my next steps.'},
{c:'mentor',n:'Eman Gahallah',r:'Engineer',q:'Genuinely wants to help others and is generous with his knowledge.'},
{c:'mentor',n:'Amr Elsharkawy',r:'Student',q:'Clear and practical advice on improving my CV and portfolio.'},
{c:'mentor',n:'Mazen Hatem',r:'Student',q:'Provided me with numerous resources to help me stay on track in the data field.'},
{c:'mentor',n:'Malak Soula',r:'Data Scientist',q:'Outstanding and so helpful to guide me to what I should do as a next step.'},
{c:'mentor',n:'AbdAlrahman Hassan',r:'Student',q:'Shared a lot of information... made me know what I can do to start in data analysis.'},
{c:'agile',n:'Esmail Eldally',r:'Data Analyst',q:'Outstanding Scrum Master... organized, supportive, and excellent at guiding the team to achieve sprint goals.'},
{c:'agile',n:'Kareem Amr Khedr',r:'Corporate Credit Analyst',q:'Deep expertise in people management... ability to deal with difficult people is invaluable.'},
{c:'agile',n:'Mahmoud Saied',r:'ETL Specialist',q:'A mentor and guide who empowers those around him to achieve their full potential.'},
{c:'agile',n:'Noureldeen Saad',r:'Relationship Manager',q:'Sets an example for everyone... empowers and supports his team and encourages their growth.'},
{c:'agile',n:'Maha Mohamed',r:'Officer-Account Planning',q:'A true visionary... looks out for each member of his team by empowering them.'},
{c:'agile',n:'Samar Gaber',r:'Scrum Master',q:'Trustworthy and values-driven... his collaborative approach fosters a positive work environment.'},
{c:'agile',n:'Amr Hussien',r:'Deputy GM',q:'His coaching mastery comes naturally... full of hope and radiates energy.'},
{c:'agile',n:'Ahmed Omar',r:'Digital Transformation Office',q:'Does a wonderful job balancing high-stakes responsibilities with a positive attitude.'},
{c:'agile',n:'Mahmoud Ghazy',r:'Senior Data Governance',q:'Excels at managing challenging situations... consistently brings out the best in people.'},
{c:'agile',n:'Dr. Haythm EL Hawary',r:'Lead Auditor',q:'The best of employees we have in Banque Misr... smart and patient man.'},
{c:'results',n:'Omar Mohey',r:'Senior Data Steward',q:'Amr gets things done... delivering outstanding results on even the most complex projects.'},
{c:'results',n:'Ibrahim Zidan',r:'PMO Manager',q:'Master of solving complex business challenges... turns ideas into impactful solutions.'},
{c:'results',n:'Mahmoud Tag ElDien',r:'SME Credit Analyst',q:'Combines deep business knowledge with data-driven insights to create measurable impact.'},
{c:'results',n:'Ola Abdelrahman',r:'Relationship Manager',q:'Amr is always to be trusted to do what he says he will do.'},
{c:'results',n:'Abd El Rahman Harby',r:'Assistant GM',q:'Consistently went the extra mile... tackled tasks with enthusiasm and professionalism.'},
{c:'results',n:'Mohamed Magdy',r:'ATM Switch Team Leader',q:'Hyper-analytical and hardworking... Amr has excellent product sense! Simply the best.'},
{c:'results',n:'Amr Tarek',r:'Relationship Manager',q:'Consistently goes above and beyond to get the job done. Creative thinker and hard worker.'},
{c:'results',n:'Moataz Hamed',r:'Risk Manager',q:'Hard-working... always motivated and knows what it takes to do the job well.'},
{c:'results',n:'Tamer Afifi',r:'Head of Emerging Corporate',q:'Approaches every challenge with clarity, creativity, and a solution-oriented mindset.'},
{c:'results',n:'Ahmed Gomaa',r:'Data Modeling',q:'Excellent, dedicated, and reliable working partner with an outstanding way of thinking.'},
{c:'team',n:'Walid Gafeer',r:'Senior RM',q:'EQ is off the charts... a knack for improving morale just by being himself.'},
{c:'team',n:'Amr ELHossiny',r:'Digital Platforms Manager',q:'A game-changer in my life... stepping up as a mentor when I least expected it.'},
{c:'team',n:'Yehia Sharaf',r:'Relationship Manager',q:'Down to earth and approachable... great at building long lasting connections.'},
{c:'team',n:'Mohamed Elabasy',r:'Corporate Banking Team Leader',q:'Friendly and easy to talk to... great at connecting with people.'},
{c:'team',n:'Mahmoud Saeed',r:'Structured Finance Manager',q:'In a word, delightful... unique personal traits and always willing to help.'},
{c:'team',n:'Mahmoud Hamdy',r:'Assistant RM',q:'Undeniable charisma... one of the best colleagues I have ever known.'},
{c:'team',n:'Amr Said',r:'Senior RM',q:'Full of energy and passion... his positive vibe rubs off on everyone around him.'},
{c:'team',n:'Mohamed Fathy',r:'Relationship Manager',q:'Always professional... loves learning and sharing what he knows to help others.'},
{c:'team',n:'Abdelrahman Badoa Ayad',r:'Data Quality Specialist',q:'Infectious enthusiasm... fosters a cohesive team dynamic.'},
{c:'team',n:'Ismail Shaaban',r:'Senior Project Manager',q:'Outstanding in professional and personal life... always made sure everyone had support.'},
{c:'team',n:'Ahmed Dahi',r:'Software Engineer',q:'Knows how to make things happen with a blend of being nice and assertive.'},
{c:'team',n:'Wael Kammar',r:'Senior RM',q:'So easy to work with. His unique style and humor enhance the effectiveness of his team.'},
{c:'team',n:'Assem Gamal',r:'Software Developer',q:'Exceptionally motivated... possesses a rare combination of visionary thinking and practicality.'},
{c:'team',n:'Nada Abdelaziz',r:'Assistant GM',q:'Inspirational and motivating partner... highest degrees of professionalism and integrity.'},
{c:'team',n:'Mahmoud Ahmed Morsy',r:'Senior RM',q:'Candid, transparent and collaborative... focused on helping others around him.'},
{c:'team',n:'Ahmed M. Ali',r:'Application Support',q:'Always available to extend help... a very friendly and supportive person.'},
{c:'team',n:'Mohamed kamal',r:'Corporate RM',q:'Super understanding... great at lifting up everyone around him.'},
{c:'team',n:'Mohamed abdelmegeid',r:'RM Large Corporate',q:'Brings a ton of positive energy... makes everything feel fresh and exciting.'},
{c:'team',n:'Mohamed Hassan',r:'Senior Ops Officer',q:'An awesome teammate... always on the hunt for new ways to innovate.'},
{c:'team',n:'Eslam Maher',r:'Large Corporate RM',q:'A Rock Star... his work ethic and ability to solve problems have made a real impact.'},
{c:'team',n:'Ibrahim Shaaban',r:'Senior Corporate RM',q:'Active, fast learning, and open minded... the personality you need to build a successful team.'},
{c:'team',n:'Yassmin Qurtam',r:'Senior Credit Analyst',q:'Working with Amr is delightful... very professional and efficient.'},
{c:'team',n:'Hossam Aref',r:'Deputy GM',q:'Excellent participator in discussions, always adding value and helping you think broadly.'},
{c:'team',n:'Hesham Kamal El Mahdy',r:'Senior RM',q:'A very decent and helpful guy who always takes initiative.'},
{c:'team',n:'Ahmed hassan',r:'Senior RM',q:'Highly recommend him for his positive attitude and willingness to assist others.'},
{c:'team',n:'Saladin Gomaa',r:'Team Leader',q:'Great appetite for learning... a pleasure to have him as a colleague.'},
{c:'team',n:'Mohamed Abd El-Wahab',r:'Corporate Credit Analyst',q:'Rare to find someone who is both talented and modest at the same time.'},
{c:'team',n:'Mahmoud Hosny',r:'Corporate Credit Analyst',q:'Positivity, passion, and commitment to teamwork make him a joy to work with.'},
{c:'team',n:'Amr Awad',r:'Machine Learning Engineer',q:'A man of integrity.'},
];

const CATS={
    all:{label:'All',icon:'✦',color:'var(--accent)'},
    strategy:{label:'Strategy',icon:'🏛️',color:'#6366f1'},
    tech:{label:'Tech',icon:'🚀',color:'#00e1ff'},
    mentor:{label:'Mentoring',icon:'🎓',color:'#22c55e'},
    agile:{label:'Agile',icon:'⚡',color:'#f97316'},
    results:{label:'Results',icon:'🛠️',color:'#ef4444'},
    team:{label:'Culture',icon:'🤝',color:'#a855f7'}
};

const AVATAR_COLORS=['#6366f1','#00e1ff','#22c55e','#f97316','#ef4444','#a855f7','#3b82f6','#ec4899','#14b8a6','#eab308'];

let currentCat='all',currentIdx=0,filtered=[],autoTimer=null,autoFill=null;

function getFiltered(cat){return cat==='all'?[...TC]:TC.filter(t=>t.c===cat);}

function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

function getInitials(name){const parts=name.split(' ');return parts.length>1?(parts[0][0]+parts[parts.length-1][0]).toUpperCase():name.substring(0,2).toUpperCase();}

function getAvatarColor(name){let h=0;for(let i=0;i<name.length;i++)h=name.charCodeAt(i)+((h<<5)-h);return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length];}

function buildCats(){
    const el=document.getElementById('tcCats');
    el.innerHTML=Object.keys(CATS).map(k=>{
        const cat=CATS[k];
        const count=k==='all'?TC.length:TC.filter(t=>t.c===k).length;
        return `<button class="tc-cat${k===currentCat?' active':''}" data-cat="${k}">${cat.icon} ${cat.label}<span class="tc-cat-count">${count}</span></button>`;
    }).join('');
    el.querySelectorAll('.tc-cat').forEach(btn=>{
        btn.addEventListener('click',()=>{
            currentCat=btn.dataset.cat;currentIdx=0;
            el.querySelectorAll('.tc-cat').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            filtered=shuffle(getFiltered(currentCat));
            render();startAuto();
        });
    });
}

function buildSlide(t){
    const cat=CATS[t.c];
    const initials=getInitials(t.n);
    const bgColor=getAvatarColor(t.n);
    return `<div class="tc-slide"><div class="tc-card"><div class="tc-quote">${t.q}</div><div class="tc-author"><div class="tc-avatar" style="background:${bgColor}">${initials}</div><div class="tc-info"><div class="tc-name">${t.n}</div><div class="tc-role">${t.r}</div></div><span class="tc-cat-badge" style="color:${cat.color};background:${cat.color}15">${cat.icon} ${cat.label}</span></div></div></div>`;
}

function render(){
    const track=document.getElementById('tcTrack');
    track.innerHTML=filtered.map(buildSlide).join('');
    track.style.transform=`translateX(-${currentIdx*100}%)`;
    // Dots — show max 7
    const dots=document.getElementById('tcDots');
    const maxDots=Math.min(filtered.length,7);
    const startDot=Math.max(0,Math.min(currentIdx-3,filtered.length-maxDots));
    let dotsHtml='';
    for(let i=startDot;i<startDot+maxDots&&i<filtered.length;i++){
        dotsHtml+=`<div class="tc-dot${i===currentIdx?' active':''}" data-idx="${i}"></div>`;
    }
    dots.innerHTML=dotsHtml;
    dots.querySelectorAll('.tc-dot').forEach(d=>{d.addEventListener('click',()=>{currentIdx=parseInt(d.dataset.idx);goTo();startAuto();});});
    document.getElementById('tcCounter').textContent=`${currentIdx+1} / ${filtered.length}`;
}

function goTo(){
    document.getElementById('tcTrack').style.transform=`translateX(-${currentIdx*100}%)`;
    render();
}

function next(){currentIdx=(currentIdx+1)%filtered.length;goTo();}
function prev(){currentIdx=(currentIdx-1+filtered.length)%filtered.length;goTo();}

function startAuto(){
    stopAuto();
    const fill=document.getElementById('tcAutoFill');
    fill.classList.remove('running');fill.style.width='0%';
    void fill.offsetWidth;// Force reflow
    fill.classList.add('running');
    autoTimer=setTimeout(()=>{next();startAuto();},6000);
}
function stopAuto(){if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}document.getElementById('tcAutoFill').classList.remove('running');}

// Init
filtered=shuffle(getFiltered('all'));
buildCats();render();

// Nav buttons
document.getElementById('tcPrev').addEventListener('click',()=>{prev();startAuto();});
document.getElementById('tcNext').addEventListener('click',()=>{next();startAuto();});

// Swipe support
let stx=0;const vp=document.getElementById('tcViewport');
vp.addEventListener('touchstart',e=>{stx=e.touches[0].clientX;stopAuto();},{passive:true});
vp.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-stx;if(Math.abs(dx)>40){dx<0?next():prev();}startAuto();},{passive:true});

// Pause auto on hover (desktop)
vp.addEventListener('mouseenter',stopAuto);
vp.addEventListener('mouseleave',startAuto);

// Start auto-play after delay
setTimeout(startAuto,5000);
})();

// ═════════════════════════════════════════════════
// ARCADE LAZY-LOADER (Trader + Arcade Hub in arcade.js)
// ═════════════════════════════════════════════════
let arcadeLoaded=false,arcadeLoadPromise=null;
function loadArcade(){
  if(arcadeLoaded)return Promise.resolve();
  if(arcadeLoadPromise)return arcadeLoadPromise;
  arcadeLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='arcade.js';
    s.onload=()=>{arcadeLoaded=true;resolve();};
    s.onerror=()=>{arcadeLoadPromise=null;if(window.UniToast)window.UniToast('Failed to load Arcade — retrying...');reject();};
    document.head.appendChild(s);
  });
  return arcadeLoadPromise;
}
window.openGame=function(){loadArcade().then(()=>{if(window.openGame)window.openGame();}).catch(_noop);};
window.closeGame=function(){if(arcadeLoaded&&window.closeGame)window.closeGame();};
window.restartSnake=function(){loadArcade().then(()=>{if(window.restartSnake)window.restartSnake();}).catch(_noop);};

// ═════════════════════════════════════════════════
// FEATURE: KEYBOARD SHORTCUTS
// ═════════════════════════════════════════════════
window.openShortcuts=function(){const el=document.getElementById('shortcutOverlay');if(!el)return;el.classList.add('show');autoDismiss('shortcutOverlay',closeShortcuts);};
window.closeShortcuts=function(){const el=document.getElementById('shortcutOverlay');if(el)el.classList.remove('show');cancelAutoDismiss('shortcutOverlay');};

// Old cursor-particle trail removed — superseded by Phase 1 emoji cursor

// ═════════════════════════════════════════════════
// UNIFIED KEYBOARD HANDLER (enhanced)
// ═════════════════════════════════════════════════
// Remove old keydown handler first — we'll replace with unified
(function(){
    const unifiedKeys=e=>{
        if(e.key==='Escape'){if(window.closeEgg)window.closeEgg();if(window.closeShare)window.closeShare();if(window.closeTrophy)window.closeTrophy();if(window.closeTerm)window.closeTerm();if(window.closeGame)window.closeGame();if(window.closeShortcuts)window.closeShortcuts();if(window._closeArcade)window._closeArcade();if(window._closeMG)window._closeMG();if(window._closeGuestbook)window._closeGuestbook();if(window._closeAdmin)window._closeAdmin();if(window._close3D)window._close3D();if(window._closePalette)window._closePalette();dismissSmartCta();document.activeElement.blur();return;}
        const tag=document.activeElement.tagName;
        if(tag==='INPUT'||tag==='TEXTAREA')return;
        const k=(e.key||'').toLowerCase();
        const code=e.code||'';
        const isKey=(char, codeName)=>k===char||code===codeName;
        if(isKey('s','KeyS'))revealContact();
        if(isKey('m','KeyM')&&window.TermCmds?.matrix)window.TermCmds.matrix();
        if(isKey('t','KeyT')&&!e.ctrlKey&&!e.metaKey)openTrophy();
        if(e.key==='?'||(code==='Slash'&&e.shiftKey))openShortcuts();
        if(e.key==='`'||code==='Backquote')openTerm();
        if(isKey('g','KeyG')&&!e.ctrlKey){if(window.openGuestbook)window.openGuestbook();}
        if(isKey('a','KeyA')&&!e.ctrlKey){if(window._openArcade)window._openArcade();}
    };
    // Remove previous listeners (they're anonymous so can't remove — but our new unified one will work alongside)
    document.addEventListener('keydown',unifiedKeys);
})();


// ═══ SCROLL & PARALLAX ═══

addEventListener('scroll',()=>{
    const t=scrollY,h=document.documentElement.scrollHeight-innerHeight;
    document.getElementById('sbar').style.width=(h>0?t/h*100:0)+'%';
    trackScroll();
   if(!reducedMotion){document.querySelectorAll('.mesh div').forEach((b,i)=>{b.style.transform=`translateY(${t*(i+1)*.06}px)`;});}
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

})(); // ← THIS closes the (()=>{ at the very top of the script// ═══════════════════════════════════════════════════════════════
// PHASE 1 FEATURES MODULE — amrelharony.com
// Drop-in script: <script src="phase1-features.js" defer></script>
//
// Features:
//   1. Zen Mode (Z key / button) — distraction-free corporate view
//   2. Download PDF Resume (Ctrl+P enhanced / button)
//   3. Surprise Me (R key / floating button) — random section jump
//   4. Section-Aware Emoji Cursor Trail (desktop only)
//
// Zero dependencies — works alongside existing site JS
// ═══════════════════════════════════════════════════════════════
(function PhaseOneFeatures() {
  'use strict';

  // ───────────────────────────────────────────
  // CONSTANTS
  // ───────────────────────────────────────────
  const IS_DESKTOP = window.matchMedia('(pointer:fine)').matches;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ───────────────────────────────────────────
  // INJECT ALL CSS
  // ───────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'phase1-css';
  style.textContent = `

/* ═══════════════════════════════════════════
   1. ZEN MODE
   ═══════════════════════════════════════════ */

/* Kill all visual noise */
body.zen-mode #bgC,
body.zen-mode .mesh,
body.zen-mode .noise,
body.zen-mode .cg,
body.zen-mode .cd,
body.zen-mode .cursor-particle,
body.zen-mode .emoji-particle,
body.zen-mode .sbar,
body.zen-mode .combo-indicator,
body.zen-mode .live-console,
body.zen-mode .xp-footer,
body.zen-mode .streak,
body.zen-mode .toast-container,
body.zen-mode .smart-cta,
body.zen-mode .shake-hint,
body.zen-mode .shake-bar,
body.zen-mode .desk-hint,
body.zen-mode .weather-widget,
body.zen-mode .visitor-count,
body.zen-mode .live-presence,
body.zen-mode .mp-bar,
body.zen-mode .rec-card,
body.zen-mode #recContainer { display: none !important; }

/* Freeze all decorative animations */
body.zen-mode .ng { animation: none !important; }
body.zen-mode .sd::after { animation: none !important; }
body.zen-mode .pf svg circle { animation: none !important; }
body.zen-mode .tc-auto-fill { animation: none !important; transition: none !important; }
body.zen-mode .pre-fill { box-shadow: none !important; }
body.zen-mode .ticker { animation: tickScroll 120s linear infinite !important; }

/* Remove hover transforms for clean feel */
body.zen-mode .lk:hover,
body.zen-mode .lk:focus-visible { transform: none !important; box-shadow: none !important; }
body.zen-mode .lk .ls,
body.zen-mode .lk .lm { display: none !important; }
body.zen-mode .conf-badge:hover,
body.zen-mode .rt:hover,
body.zen-mode .vcb:hover,
body.zen-mode .si:hover,
body.zen-mode .cert-card:hover,
body.zen-mode .nl:hover,
body.zen-mode .insight-card:hover,
body.zen-mode .trophy-badge:hover .trophy-badge-emoji { transform: none !important; }

/* Keep links interactive but subtle */
body.zen-mode .lk:hover { background: var(--cardH) !important; }
body.zen-mode .nl:hover { background: var(--cardH) !important; color: var(--text) !important; }

/* Zen Banner */
.zen-banner {
  display: none;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--accent);
  opacity: .5;
  padding: 6px 16px;
  margin-bottom: 12px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  transition: opacity .3s;
}
.zen-banner:hover { opacity: .8; }
body.zen-mode .zen-banner { display: flex; align-items: center; justify-content: center; gap: 6px; }

/* Zen transition overlay */
.zen-flash {
  position: fixed; inset: 0; z-index: 9999;
  background: var(--bg);
  opacity: 0;
  pointer-events: none;
  transition: opacity .4s ease;
}
.zen-flash.active { opacity: 1; }


/* ═══════════════════════════════════════════
   2. PDF RESUME
   ═══════════════════════════════════════════ */

.pdf-resume-btn .pdf-icon { transition: transform .3s cubic-bezier(.16,1,.3,1); }
.pdf-resume-btn:hover .pdf-icon { transform: translateY(2px); }

/* Enhanced print stylesheet */
@media print {
  /* Hide everything non-essential */
  .zen-banner, .surprise-btn, #zenBtn, .pdf-resume-btn,
  #preloader, .noise, .sbar, .cg, .cd, .mesh, #bgC,
  .top-btns, .weather-widget, .toast-container, .combo-indicator,
  .smart-cta, .xp-footer, .live-console, .visitor-count, .streak,
  .foot, #trophyOverlay, #shortcutOverlay, #termOverlay,
  #gameOverlay, #shareOverlay, #easterEgg, canvas,
  .vcb, .rec-card, #recContainer, .surprise-btn,
  #contactSecret, .shake-hint, .desk-hint, .shake-bar,
  .ticker-wrap, .ph, .qb, #linkedinFeed,
  .tc-nav, .tc-counter, .tc-auto-bar, .tc-cats,
  .cursor-particle, .emoji-particle, .conf-strip,
  #greetBar { display: none !important; }

  /* Reset transforms and visibility */
  body { background: #fff !important; color: #000 !important;
         overflow: visible !important; font-size: 11pt !important; }
  .rv, .sa { opacity: 1 !important; transform: none !important; }
  #app { opacity: 1 !important; max-width: 700px; margin: 0 auto; padding: 16px 24px; }
  .print-only { display: block !important; }

  /* Typography reset */
  * { color: #111 !important; border-color: #ddd !important;
      text-shadow: none !important; box-shadow: none !important; }
  .ng { background: none !important; -webkit-background-clip: unset !important;
        color: #111 !important; -webkit-text-fill-color: #111 !important; }
  .hn { font-size: 24pt !important; }
  .vp, .vp strong { color: #333 !important; font-size: 10pt !important; }
  .rt { border-color: #ccc !important; color: #555 !important;
        background: #f5f5f5 !important; font-size: 7pt !important; }
  .st { border-color: #ccc !important; background: #f9f9f9 !important; }
  .imp-num { color: #000 !important; }
  .imp-label { color: #666 !important; }

  /* Profile image smaller */
  .pf { width: 72px !important; height: 72px !important; margin: 12px auto 4px !important; }
  .pf svg { display: none !important; }
  .fb { display: none !important; }

  /* Links as clean cards */
  .lk { border-color: #ddd !important; background: #fafafa !important;
        padding: 10px !important; break-inside: avoid; }
  .lk .ls, .lk .lm { display: none !important; }
  .la { display: none !important; }
  .li { border-color: #ddd !important; background: #f5f5f5 !important; }
  .lt { font-size: 10pt !important; }
  .lsu { font-size: 7pt !important; }

  /* Timeline */
  .tl-item { page-break-inside: avoid; break-inside: avoid; }
  .tl-line { background: #999 !important; }
  .tl-dot { border-color: #999 !important; }
  .tl-yr { color: #000 !important; font-weight: 700; }
  .nd { opacity: 1 !important; }
  .ndt { color: #000 !important; }
  .ndl { background: #999 !important; }

  /* Certs grid — compact 4-column */
  .cert-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 4px !important; }
  .cert-card { padding: 6px 4px !important; break-inside: avoid; page-break-inside: avoid;
               border-color: #ddd !important; background: #fafafa !important; }
  .cert-icon { font-size: 16px !important; }
  .cert-name { font-size: 6pt !important; }
  .cert-name strong { font-size: 7pt !important; }
  .cert-org { font-size: 5pt !important; color: #666 !important; }
  .cert-verify { display: none !important; }

  /* Testimonials — show first 4 in grid */
  .tc-section { page-break-before: always; }
  .tc-viewport { min-height: auto !important; overflow: visible !important; }
  .tc-track { flex-wrap: wrap !important; transform: none !important; gap: 6px !important; }
  .tc-slide { min-width: 47% !important; flex: 0 0 47% !important; }
  .tc-slide:nth-child(n+5) { display: none !important; }
  .tc-card { min-height: auto !important; padding: 8px !important;
             border-color: #ddd !important; background: #fafafa !important; }
  .tc-quote { font-size: 8pt !important; }
  .tc-name { font-size: 8pt !important; }
  .tc-role { font-size: 6pt !important; }
  .tc-avatar { width: 20px !important; height: 20px !important; font-size: 9px !important; }
  .tc-cat-badge { font-size: 5pt !important; }

  /* URLs visible */
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 7pt; color: #888 !important; word-break: break-all; }
  a.lk::after, a.cert-card::after, a.nl::after { display: none !important; }

  /* Page setup */
  @page { margin: 1.5cm 1.8cm; size: A4; }
  h1 { page-break-after: avoid; }
}


/* ═══════════════════════════════════════════
   3. SURPRISE ME BUTTON
   ═══════════════════════════════════════════ */

.surprise-btn {
  position: fixed;
  bottom: 24px;
  right: 16px;
  z-index: 99;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--sub);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .3s cubic-bezier(.16,1,.3,1);
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  -webkit-tap-highlight-color: transparent;
}
.surprise-btn:hover,
.surprise-btn:focus-visible {
  border-color: var(--accent);
  color: var(--accent);
  transform: scale(1.1) rotate(15deg);
  box-shadow: 0 4px 20px var(--glow);
  outline: none;
}
.surprise-btn:active { transform: scale(.95); }
.surprise-btn.spinning i {
  animation: surpriseSpin .5s cubic-bezier(.16,1,.3,1);
}
@keyframes surpriseSpin {
  0%   { transform: rotate(0) scale(1); }
  40%  { transform: rotate(200deg) scale(1.3); }
  100% { transform: rotate(360deg) scale(1); }
}

/* Surprise highlight pulse */
.surprise-highlight {
  outline: 2px solid var(--accent) !important;
  outline-offset: 8px !important;
  border-radius: 12px;
  animation: surprisePulse 1.5s ease-out forwards;
}
@keyframes surprisePulse {
  0%   { outline-color: var(--accent); outline-offset: 8px; }
  50%  { outline-color: var(--accent2); outline-offset: 12px; }
  100% { outline-color: transparent; outline-offset: 20px; }
}

/* Tooltip that shows section name */
.surprise-toast {
  position: fixed;
  bottom: 78px;
  right: 16px;
  z-index: 99;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
  opacity: 0;
  transform: translateY(8px);
  transition: all .3s cubic-bezier(.16,1,.3,1);
  pointer-events: none;
  white-space: nowrap;
  backdrop-filter: blur(12px);
}
.surprise-toast.show {
  opacity: 1;
  transform: translateY(0);
}

body.zen-mode .surprise-btn { box-shadow: none; }
body.zen-mode .surprise-btn:hover { transform: scale(1.05); }

@media(max-width:600px) {
  .surprise-btn {
    bottom: 14px; right: 12px;
    width: 38px; height: 38px; font-size: 14px;
  }
  .surprise-toast { bottom: 60px; right: 12px; }
}


/* ═══════════════════════════════════════════
   4. EMOJI CURSOR TRAIL
   ═══════════════════════════════════════════ */

/* Replace original dot particles with emojis */
body:not(.zen-mode) .cursor-particle { display: none !important; }

.emoji-particle {
  position: fixed;
  pointer-events: none;
  z-index: 9990;
  user-select: none;
  line-height: 1;
  opacity: 0;
}
`;
  document.head.appendChild(style);


  // ═══════════════════════════════════════════════════
  // FEATURE 1: ZEN MODE
  // ═══════════════════════════════════════════════════

  function initZenMode() {
    const topBtns = document.getElementById('topBtns');
    const themeBtn = document.getElementById('tbtn');
    if (!topBtns || !themeBtn) return;

    const gbBtn = document.createElement('button');
    gbBtn.className = 'tbtn';
    gbBtn.id = 'guestbookBtn';
    gbBtn.setAttribute('aria-label', 'Open Guestbook');
    gbBtn.title = 'Guestbook (G)';
    gbBtn.innerHTML = '<i class="fa-solid fa-book"></i>';
    themeBtn.insertAdjacentElement('afterend', gbBtn);
    gbBtn.addEventListener('click', () => { if (typeof openGuestbook === 'function') openGuestbook(); });

    const zenBtn = document.createElement('button');
    zenBtn.className = 'tbtn';
    zenBtn.id = 'zenBtn';
    zenBtn.setAttribute('aria-label', 'Toggle Zen Mode');
    zenBtn.title = 'Zen Mode (Z)';
    zenBtn.innerHTML = '<i class="fa-solid fa-eye" id="zenIcon"></i>';
    gbBtn.insertAdjacentElement('afterend', zenBtn);

    // Create zen banner inside #app
    const app = document.getElementById('app');
    if (app) {
      const banner = document.createElement('div');
      banner.className = 'zen-banner';
      banner.id = 'zenBanner';
      banner.innerHTML =
        '<i class="fa-solid fa-eye-slash" style="font-size:10px"></i>' +
        '<span>ZEN MODE — Clean reading view · Press <strong style="color:var(--text)">Z</strong> to exit</span>';
      app.insertBefore(banner, app.firstChild);
    }

    // Create flash overlay for smooth transition
    const flash = document.createElement('div');
    flash.className = 'zen-flash';
    flash.id = 'zenFlash';
    document.body.appendChild(flash);

    // Apply / remove zen mode
    function applyZen(active, animate) {
      
      // 1. EXCLUSIVE: If Zen is turning ON, force Cyberpunk OFF
      if (active) {
        document.body.classList.remove('cyberpunk-mode');
        localStorage.setItem('cyberpunkMode', '0');
      }

      const icon = document.getElementById('zenIcon');
      
      if (animate && !REDUCED_MOTION) {
        // Flash transition
        flash.classList.add('active');
        setTimeout(() => {
          document.body.classList.toggle('zen-mode', active);
          if (icon) icon.className = active ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
          setTimeout(() => flash.classList.remove('active'), 100);
        }, 200);
      } else {
        document.body.classList.toggle('zen-mode', active);
        if (icon) icon.className = active ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      }
      localStorage.setItem('zenMode', active ? '1' : '0');

      // Log to console system if available
      const console_el = document.getElementById('liveConsole');
      if (console_el && active) {
        console_el.textContent = '🧘 Zen mode activated — clean reading experience';
      }
    }

    // Restore saved state (no animation on load)
    if (localStorage.getItem('zenMode') === '1') {
      applyZen(true, false);
    }

    // Toggle handler
    zenBtn.addEventListener('click', () => {
      const willActivate = !document.body.classList.contains('zen-mode');
      applyZen(willActivate, true);
      // Award XP
      if (window.VDna) window.VDna.addXp(3);
    });

    // Keyboard: Z
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'z' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        zenBtn.click();
      }
    });
  }






  // ═══════════════════════════════════════════════════
  // FEATURE 4: SECTION-AWARE EMOJI CURSOR TRAIL
  // ═══════════════════════════════════════════════════

  function initEmojiCursor() {
    if (!IS_DESKTOP || REDUCED_MOTION) return;

    // Section → emoji mapping
    const EMOJI_MAP = {
      default:      ['✨', '⚡', '💫', '·'],
      book:         ['📘', '✍️', '📖', '💡'],
      mentor:       ['🎓', '🧠', '💡', '🌱'],
      community:    ['🤝', '🌍', '💬', '🔗'],
      timeline:     ['🚀', '📅', '⏳', '🎯'],
      certs:        ['🎯', '📜', '🏆', '✅'],
      testimonials: ['⭐', '💬', '❤️', '🙌'],
      contact:      ['📧', '🔗', '📱', '💌'],
      articles:     ['📝', '🗞️', '💡', '📰'],
      impact:       ['📊', '🔢', '📈', '💪'],
      conferences:  ['🎤', '🎪', '🌐', '🗣️'],
    };

    // Section detection rules (checked in order, first match wins)
    const SECTION_RULES = [
      { sel: '.lk[href*="bilingual"]',          section: 'book' },
      { sel: '.lk[href*="adplist"]',             section: 'mentor' },
      { sel: '.lk[href*="fintech-bilinguals"]',  section: 'community' },
      { sel: '.tl-wrap, .tl-item',               section: 'timeline' },
      { sel: '#certGrid, .cert-card, .cert-grid',section: 'certs' },
      { sel: '.tc-section, .tc-card',            section: 'testimonials' },
      { sel: '#contactSecret, .sr',              section: 'contact' },
      { sel: '#linkedinFeed, .nl',               section: 'articles' },
      { sel: '.imp, .imp-item',                  section: 'impact' },
      { sel: '.conf-strip, .conf-badge',         section: 'conferences' },
    ];

    let currentSection = 'default';
    let lastEmit = 0;
    const EMIT_INTERVAL = 70; // ms between particles
    const POOL_SIZE = 30;     // reuse DOM elements
    const pool = [];
    let poolIdx = 0;

    // Pre-create particle pool for performance
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('span');
      el.className = 'emoji-particle';
      el.style.willChange = 'transform, opacity';
      document.body.appendChild(el);
      pool.push(el);
    }

    // Track which section the mouse is over
    document.addEventListener('mouseover', (e) => {
      for (const rule of SECTION_RULES) {
        if (e.target.closest(rule.sel)) {
          currentSection = rule.section;
          return;
        }
      }
      currentSection = 'default';
    }, { passive: true });

    // Spawn emoji particles
    document.addEventListener('mousemove', (e) => {
      // Skip in zen mode
      if (document.body.classList.contains('zen-mode')) return;

      const now = Date.now();
      if (now - lastEmit < EMIT_INTERVAL) return;
      lastEmit = now;

      const emojis = EMOJI_MAP[currentSection] || EMOJI_MAP.default;
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];

      // Get particle from pool
      const p = pool[poolIdx % POOL_SIZE];
      poolIdx++;

      // Reset
      p.style.transition = 'none';
      p.textContent = emoji;
      p.style.left = e.clientX + 'px';
      p.style.top = e.clientY + 'px';
      p.style.fontSize = (10 + Math.random() * 6) + 'px';
      p.style.opacity = '0.7';
      p.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';

      // Force reflow
      p.offsetHeight; // eslint-disable-line no-unused-expressions

      // Animate out
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 25; // float upward bias
      const rot = (Math.random() - 0.5) * 80;

      requestAnimationFrame(() => {
        p.style.transition = 'all .65s cubic-bezier(.16,1,.3,1)';
        p.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0.2)`;
        p.style.opacity = '0';
      });
    }, { passive: true });
  }


  // ═══════════════════════════════════════════════════
  function updateShortcutsPanel() {}


  // ═══════════════════════════════════════════════════
  // INITIALIZE ALL FEATURES
  // ═══════════════════════════════════════════════════

  function init() {
    initZenMode();
    initEmojiCursor();
    updateShortcutsPanel();

    console.log(
      '%c✨ Phase 1 Features Loaded %c Zen Mode · PDF Resume · Surprise Me · Emoji Cursor',
      'background:#00e1ff;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#00e1ff;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  // Wait for DOM + existing scripts to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    // DOM already ready, but wait a tick for the main script's IIFE
    setTimeout(init, 100);
  }

})();
// ═══════════════════════════════════════════════════════════════
// PHASE 2 FEATURES MODULE — amrelharony.com
// Drop-in script: <script src="phase2-features.js" defer></script>
//
// Features:
//   1. ADPList Inline Widget — expandable booking widget
//   2. Live Mentorship Stats — real-time counter + slot indicator
//   3. Contextual UTM Magic — referrer-aware hero morphing
//
// Zero dependencies — works alongside existing site JS + Phase 1
// ═══════════════════════════════════════════════════════════════
(function PhaseTwoFeatures() {
  'use strict';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const params = new URLSearchParams(location.search);

  // ───────────────────────────────────────────
  // INJECT ALL CSS
  // ───────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'phase2-css';
  style.textContent = `

/* ═══════════════════════════════════════════
   1. ADPLIST INLINE WIDGET
   ═══════════════════════════════════════════ */

.adp-widget-wrap {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height .6s cubic-bezier(.16,1,.3,1),
              opacity .5s ease,
              margin .4s ease;
  margin: 0;
  border-radius: 16px;
}
.adp-widget-wrap.expanded {
  max-height: 560px;
  opacity: 1;
  margin: 12px 0 4px;
}
.adp-widget-inner {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px -8px rgba(0,0,0,.2);
  position: relative;
}
.adp-widget-inner iframe {
  display: block;
  width: 100%;
  height: 496px;
  border: 0;
  border-radius: 16px;
  background: var(--bg2);
}
/* Loading skeleton while iframe loads */
.adp-widget-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--bg2);
  border-radius: 16px;
  z-index: 2;
  transition: opacity .4s ease;
  pointer-events: none;
}
.adp-widget-loading.loaded { opacity: 0; }
.adp-widget-loading-icon {
  font-size: 28px;
  animation: adpPulse 1.5s ease-in-out infinite;
}
@keyframes adpPulse {
  0%, 100% { transform: scale(1); opacity: .6; }
  50% { transform: scale(1.1); opacity: 1; }
}
.adp-widget-loading-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--sub);
}

/* Toggle button inside the existing card */
.adp-toggle-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 100px;
  background: rgba(0,225,255,.08);
  border: 1px solid rgba(0,225,255,.15);
  color: var(--accent);
  margin-left: 8px;
  transition: all .3s;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.adp-toggle-badge:hover {
  background: rgba(0,225,255,.15);
  border-color: var(--accent);
}
.adp-toggle-badge i {
  font-size: 6px;
  transition: transform .3s;
}
.adp-toggle-badge.open i {
  transform: rotate(180deg);
}
.light-mode .adp-toggle-badge {
  background: rgba(0,102,255,.06);
  border-color: rgba(0,102,255,.12);
}

/* Collapse button below widget */
.adp-collapse-btn {
  display: block;
  width: 100%;
  padding: 8px;
  margin: 0;
  border: none;
  background: transparent;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--sub);
  cursor: pointer;
  opacity: .4;
  transition: all .3s;
  -webkit-tap-highlight-color: transparent;
}
.adp-collapse-btn:hover {
  opacity: .8;
  color: var(--accent);
}

@media print { .adp-widget-wrap, .adp-toggle-badge { display: none !important; } }


/* ═══════════════════════════════════════════
   2. MENTORSHIP INLINE BADGE
   ═══════════════════════════════════════════ */

.mentor-inline-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 100px;
  background: rgba(34,197,94,.06);
  border: 1px solid rgba(34,197,94,.15);
  color: #22c55e;
  margin-left: 8px;
  white-space: nowrap;
}
.mentor-inline-badge .live-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #22c55e;
  display: inline-block;
  flex-shrink: 0;
  animation: livePulse 2s ease-in-out infinite;
}
@keyframes livePulse {
  0%, 100% { opacity: .4; }
  50% { opacity: 1; }
}

@media print {
  .mentor-inline-badge { display: none !important; }
}


/* ═══════════════════════════════════════════
   3. CONTEXTUAL UTM HERO MORPHING
   ═══════════════════════════════════════════ */

/* UTM greeting banner */
.utm-greeting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(0,225,255,.12);
  background: linear-gradient(135deg, rgba(0,225,255,.04), rgba(99,102,241,.04));
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: .5px;
  color: var(--accent);
  margin-bottom: 12px;
  text-align: center;
  animation: utmFadeIn .8s ease both;
  animation-delay: 1.5s;
}
@keyframes utmFadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.utm-greeting-emoji {
  font-size: 16px;
  animation: utmWave 1.5s ease-in-out 2;
  animation-delay: 2s;
}
@keyframes utmWave {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(20deg); }
  40% { transform: rotate(-10deg); }
  60% { transform: rotate(15deg); }
  80% { transform: rotate(-5deg); }
}
.utm-greeting-dismiss {
  margin-left: 4px;
  cursor: pointer;
  opacity: .4;
  font-size: 10px;
  transition: opacity .3s;
}
.utm-greeting-dismiss:hover { opacity: 1; }

/* UTM priority highlight glow */
.utm-priority-card {
  animation: utmGlow 2s ease-in-out;
}
@keyframes utmGlow {
  0% { box-shadow: 0 0 0 0 rgba(0,225,255,.3); }
  50% { box-shadow: 0 0 20px 4px rgba(0,225,255,.15); }
  100% { box-shadow: none; }
}

/* UTM pinned audio player (for book referrals) */
.utm-audio-pin {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(99,102,241,.06), rgba(168,85,247,.04));
  border: 1px solid rgba(99,102,241,.12);
  margin: 8px 0 4px;
  animation: utmFadeIn .6s ease both;
  animation-delay: 2s;
}
.utm-audio-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent2), var(--accent3));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  flex-shrink: 0;
}
.utm-audio-meta {
  flex: 1;
  min-width: 0;
}
.utm-audio-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 7px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--accent2);
  margin-bottom: 2px;
}
.utm-audio-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.utm-audio-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--accent2);
  background: transparent;
  color: var(--accent2);
  cursor: pointer;
  transition: all .3s;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.utm-audio-link:hover {
  background: rgba(99,102,241,.1);
}

/* UTM event badge unlock */
.utm-event-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 100px;
  border: 1px solid rgba(251,191,36,.2);
  background: rgba(251,191,36,.04);
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #fbbf24;
  margin: 4px 0;
  animation: utmFadeIn .6s ease both;
  animation-delay: 3s;
}
.utm-event-badge i {
  font-size: 10px;
}

@media print {
  .utm-greeting, .utm-audio-pin, .utm-event-badge { display: none !important; }
}
`;
  document.head.appendChild(style);




  // ═══════════════════════════════════════════════════
  // FEATURE 2: LIVE MENTORSHIP STATS
  // ═══════════════════════════════════════════════════

  function initMentorshipStats() {
    // Inject a compact stats badge into the existing ADPList card (no separate card)
    const adpCard = document.querySelector('a.lk[href*="adplist.org"]');
    if (!adpCard) return;

    const subtitle = adpCard.querySelector('.lsu');
    if (!subtitle) return;

    // Static mentoring minutes (update manually when needed)
    const TOTAL_MINS = 2400;

    // Create inline stats badge
    const statsBadge = document.createElement('span');
    statsBadge.className = 'mentor-inline-badge';
    statsBadge.id = 'mentorInlineBadge';
    statsBadge.innerHTML = `<span class="live-dot"></span> ${TOTAL_MINS.toLocaleString()}+ mins`;
    subtitle.appendChild(statsBadge);
  }

  function animateValue(elId, target, duration) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (REDUCED_MOTION) {
      el.textContent = target.toLocaleString() + '+';
      return;
    }
    let current = 0;
    const step = Math.ceil(target / 60);
    const interval = duration / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString() + '+';
      if (current >= target) clearInterval(timer);
    }, interval);
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 3: CONTEXTUAL UTM MAGIC
  // ═══════════════════════════════════════════════════

  function initUTMMagic() {
    const ref = getRefSource();
    if (!ref) return;

    // Delay application to let the main site's preloader finish
    setTimeout(() => applyUTMContext(ref), 3200);
  }

  function getRefSource() {
    // Priority 1: Explicit ?ref= parameter (existing system)
    const refParam = params.get('ref');

    // Priority 2: utm_source
    const utmSource = params.get('utm_source');

    // Priority 3: utm_campaign
    const utmCampaign = params.get('utm_campaign');

    // Priority 4: document.referrer
    const referrer = document.referrer.toLowerCase();

    // Normalize into a known source key
    const raw = (refParam || utmSource || utmCampaign || '').toLowerCase();

    // Explicit ref map
    const KNOWN_REFS = {
      // ADPList referrals
      adplist:     'adplist',
      mentor:      'adplist',
      mentoring:   'adplist',

      // LinkedIn — book focused
      book:        'book',
      bilingual:   'book',
      author:      'book',
      linkedin_book: 'book',

      // LinkedIn — general
      linkedin:    'linkedin',

      // Events
      seamless:    'event_seamless',
      devopsdays:  'event_devopsdays',
      techne:      'event_techne',
      afff:        'event_afff',
      ai_everything: 'event_ai_everything',
      aime:        'event_ai_everything',
      career180:   'event_career',
      career:      'event_career',
      banking_summit: 'event_banking',

      // Calendly
      calendly:    'calendly',
    };

    // Try explicit param
    if (raw && KNOWN_REFS[raw]) return KNOWN_REFS[raw];

    // Try partial match in campaign/source
    for (const [key, val] of Object.entries(KNOWN_REFS)) {
      if (raw.includes(key)) return val;
    }

    // Try referrer URL
    if (referrer.includes('adplist.org')) return 'adplist';
    if (referrer.includes('linkedin.com')) return 'linkedin';
    if (referrer.includes('calendly.com')) return 'calendly';
    if (referrer.includes('twitter.com') || referrer.includes('x.com')) return 'twitter';
    if (referrer.includes('facebook.com')) return 'facebook';

    return null;
  }

  function applyUTMContext(source) {
    const app = document.getElementById('app');
    if (!app) return;

    // Shared helper: insert greeting at top of app
    function insertGreeting(emoji, text) {
      // Don't duplicate if existing greetBar is showing same info
      const existing = document.getElementById('utmGreeting');
      if (existing) return;

      const greet = document.createElement('div');
      greet.className = 'utm-greeting';
      greet.id = 'utmGreeting';
      greet.innerHTML = `
        <span class="utm-greeting-emoji">${emoji}</span>
        <span>${text}</span>
        <span class="utm-greeting-dismiss" onclick="this.parentElement.style.display='none'">&times;</span>
      `;

      // Insert after the status bar
      const statusDiv = app.querySelector('.rv');
      if (statusDiv) {
        statusDiv.insertAdjacentElement('afterend', greet);
      }
    }

    // Shared helper: highlight & reorder a card
    function prioritizeCard(selector) {
      const card = document.querySelector(selector);
      if (card) {
        card.classList.add('utm-priority-card');
        // Move card to top of its container
        const parent = card.parentElement;
        if (parent && parent.firstElementChild !== card) {
          parent.insertBefore(card, parent.firstElementChild);
        }
      }
    }

    // Route-specific adaptations
    switch (source) {

      // ── ADPList Referrals ──
      case 'adplist': {
        insertGreeting('🎓', 'Welcome from ADPList! Book a session below');

        // Highlight mentoring card
        prioritizeCard('a.lk[href*="adplist"]');

        // Update hero text
        const vpEl = document.getElementById('vpText');
        if (vpEl) {
          vpEl.innerHTML =
            '<strong>3,240+ mentoring minutes</strong> and counting. ' +
            'I help professionals navigate <strong>agile, data, and fintech careers</strong> ' +
            'through free 1:1 coaching sessions.';
        }

        // Auto-expand ADPList widget after delay
        setTimeout(() => {
          if (window._adpToggleWidget) window._adpToggleWidget();
        }, 4000);

        // Boost impact number visibility
        const impNum2 = document.getElementById('impNum2');
        if (impNum2) impNum2.style.color = '#22c55e';

        break;
      }

      // ── Book / Author Referrals ──
      case 'book': {
        insertGreeting('📘', 'Thanks for your interest in The Bilingual Executive!');

        // Highlight book card
        prioritizeCard('a.lk[href*="bilingual"]');

        // Update hero
        const vpEl = document.getElementById('vpText');
        if (vpEl) {
          vpEl.innerHTML =
            'Author of <strong>"The Bilingual Executive"</strong> — the definitive guide to ' +
            '<strong>bridging business and technology leadership</strong>. ' +
            'Available in print, ebook, and AI-narrated audiobook.';
        }

        // Add audio pin card
        const bookCard = document.querySelector('a.lk[href*="bilingual"]');
        if (bookCard) {
          const audioPin = document.createElement('div');
          audioPin.className = 'utm-audio-pin';
          audioPin.innerHTML = `
            <div class="utm-audio-icon">🎧</div>
            <div class="utm-audio-meta">
              <div class="utm-audio-label">Now available as audiobook</div>
              <div class="utm-audio-title">The Bilingual Executive — AI Narrated Edition</div>
            </div>
            <a href="https://bilingualexecutive.amrelharony.com/"
               target="_blank" rel="noopener"
               class="utm-audio-link">
              Listen
            </a>
          `;
          bookCard.insertAdjacentElement('afterend', audioPin);
        }

        break;
      }

      // ── LinkedIn General ──
      case 'linkedin': {
        // Subtle greeting — don't override hero for general LinkedIn
        insertGreeting('👋', 'Welcome from LinkedIn!');
        break;
      }

      // ── Calendly ──
      case 'calendly': {
        insertGreeting('📅', 'Excited for our upcoming call!');

        const vpEl = document.getElementById('vpText');
        if (vpEl) {
          vpEl.innerHTML =
            "Looking forward to connecting! Here's a quick overview of my background in " +
            '<strong>agile delivery, data analytics, and fintech</strong> so we can make ' +
            'the most of our time together.';
        }
        break;
      }

      // ── Events ──
      default: {
        if (source.startsWith('event_')) {
          const EVENT_MAP = {
            event_seamless:       { name: 'Seamless North Africa',   emoji: '🌍' },
            event_devopsdays:     { name: 'DevOpsDays Cairo',        emoji: '⚙️' },
            event_techne:         { name: 'Techne Summit',           emoji: '🚀' },
            event_afff:           { name: 'Africa FinTech Forum',    emoji: '🏦' },
            event_ai_everything:  { name: 'AI Everything MEA',       emoji: '🤖' },
            event_career:         { name: 'Egypt Career Summit',     emoji: '💼' },
            event_banking:        { name: 'Banking & Fintech Summit', emoji: '🏛️' },
          };

          const event = EVENT_MAP[source] || { name: 'the event', emoji: '🎪' };

          insertGreeting(event.emoji, `Great connecting at ${event.name}!`);

          // Add event badge
          const tagContainer = document.getElementById('rtags');
          if (tagContainer) {
            const badge = document.createElement('span');
            badge.className = 'utm-event-badge';
            badge.innerHTML = `<i class="fa-solid fa-ticket"></i> Met at ${event.name}`;
            tagContainer.insertAdjacentElement('afterend', badge);
          }

          // Auto-unlock contact section for event visitors
          setTimeout(() => {
            if (typeof window.revealContact === 'function') {
              window.revealContact();
            } else {
              // Fallback: try triggering via existing ?s param logic
              const secret = document.getElementById('contactSecret');
              if (secret && !secret.classList.contains('revealed')) {
                secret.classList.add('revealed');
              }
            }
          }, 4500);

          // Award special event networking badge
          if (window.Achieve) {
            // Create dynamic event badge if not already in system
            setTimeout(() => {
              if (window.VDna) window.VDna.addXp(15);
            }, 5000);
          }
        }
        break;
      }
    }

    // Track UTM source in visitor DNA
    if (window.VDna) {
      const p = window.VDna.get();
      if (!p.utmSources) p.utmSources = [];
      if (!p.utmSources.includes(source)) {
        p.utmSources.push(source);
      }
      p.lastUtmSource = source;
      window.VDna.save();
    }
  }


  // ═══════════════════════════════════════════════════
  // INITIALIZE ALL FEATURES
  // ═══════════════════════════════════════════════════

  function init() {
    initMentorshipStats();
    initUTMMagic();

    console.log(
      '%c🔗 Phase 2 Features Loaded %c Mentorship Stats · UTM Magic',
      'background:#22c55e;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#22c55e;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  // Wait for DOM + existing scripts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
  } else {
    setTimeout(init, 200);
  }

})();
// â•â•â• PHASE 3: ARCADE (lazy-loaded from arcade.js) â•â•â•
// Arcade hub, 5 games, gamepad manager, leaderboard, share cards
// Loaded on first interaction via loadArcade()
function _noop(){}
window._openArcade = function(){ loadArcade().then(()=>{ if(window._openArcade) window._openArcade(); }).catch(_noop); };
window._closeArcade = function(){ if(arcadeLoaded && window._closeArcade) window._closeArcade(); };
window._closeMG = function(){ if(arcadeLoaded && window._closeMG) window._closeMG(); };
window._launchGame = function(id){ loadArcade().then(()=>{ if(window._launchGame) window._launchGame(id); }).catch(_noop); };
function _termAppend(html){var b=document.getElementById('termBody');if(b&&html)b.innerHTML+='<div class="term-line">'+html.replace(/\n/g,'<br>')+'</div>';}
window.TermCmds = window.TermCmds || {};
window.TermCmds.play = function(arg){ loadArcade().then(()=>{ if(window.TermCmds.play){var o=window.TermCmds.play(arg);_termAppend(o);} }).catch(_noop); return '<span class="term-green">Loading Arcade...</span>'; };
window.TermCmds.arcade = window.TermCmds.play;

// === PHASE 4: AI + 3D (lazy-loaded from ai3d.js) ===
let ai3dLoaded=false,ai3dLoadPromise=null;
function loadAI3D(){
  if(ai3dLoaded)return Promise.resolve();
  if(ai3dLoadPromise)return ai3dLoadPromise;
  ai3dLoadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='ai3d.js';
    s.onload=()=>{ai3dLoaded=true;resolve();};
    s.onerror=()=>{ai3dLoadPromise=null;if(window.UniToast)window.UniToast('Failed to load AI/3D module — retrying...');reject();};
    document.head.appendChild(s);
  });
  return ai3dLoadPromise;
}
window._close3D=function(){};
window.TermCmds=window.TermCmds||{};
window.TermCmds.ask=function(args){loadAI3D().then(()=>{if(window.TermCmds.ask){var o=window.TermCmds.ask(args);_termAppend(o);}}).catch(_noop);return '<span class="term-green">Loading AI...</span>';};
window.TermCmds.amr=function(args){loadAI3D().then(()=>{if(window.TermCmds.amr){var o=window.TermCmds.amr(args);_termAppend(o);}}).catch(_noop);return '<span class="term-green">Loading AI...</span>';};
window.TermCmds.book3d=function(){loadAI3D().then(()=>{if(window.TermCmds.book3d)window.TermCmds.book3d();}).catch(_noop);return '<span class="term-green">Loading 3D...</span>';};
window.TermCmds.visualizer=function(){loadAI3D().then(()=>{if(window.TermCmds.visualizer)window.TermCmds.visualizer();}).catch(_noop);return '<span class="term-green">Loading Visualizer...</span>';};
window.TermCmds.datamesh=window.TermCmds.visualizer;

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
  b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();loadAI3D().then(function(){if(window.TermCmds.book3d)window.TermCmds.book3d();}).catch(_noop);});
  var sub=card.querySelector('.lsu');
  if(sub){sub.style.display='flex';sub.style.flexDirection='column';sub.style.alignItems='flex-start';sub.appendChild(b);}
  else{card.style.display='flex';card.style.flexDirection='column';card.appendChild(b);}
})();

// ═══════════════════════════════════════════════════════════════
// PHASE 5: EXPERIMENTAL "WOW FACTOR" — amrelharony.com (v2)
// Drop-in: <script src="phase5-experimental.js" defer></script>
//
// Features:
//   1. Cyberpunk Theme Override (terminal `> cyberpunk`)
//   2. Bio-Rhythm Animation (sunrise/sunset palette + speed)
//   3. Live Digital Twin Status (simulated real-time activity)
//
// Audio removed. All on-device, no external APIs, privacy-first
// ═══════════════════════════════════════════════════════════════
(function PhaseFiveExperimental() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  const CAIRO_LAT = 30.0444;
  const CAIRO_LNG = 31.2357;

  // ───────────────────────────────────────
  // INJECT CSS
  // ───────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'phase5-css';
  css.textContent = `

/* ═══════════════════════════════════════════
   1. CYBERPUNK THEME
   ═══════════════════════════════════════════ */

body.cyberpunk-mode {
  --bg: #050505;           /* Pure neutral black (no green tint) */
  --bg2: #111111;          /* Dark grey for contrast */
  --card: rgba(20, 20, 20, 0.8); /* Neutral cards */
  --cardH: rgba(40, 40, 40, 0.9);
  --border: rgba(0, 255, 65, 0.15); /* Subtle green borders remain */
  --text: #eeeeee;         /* Crisp White text (easier to read) */
  --sub: #9ca3af;          /* Cool Grey subtext */
  --accent: #00ff41;       /* The Matrix Green (only for buttons/links) */
  --accent2: #ffffff;      /* White secondary accent */
  --accent3: #333333;      /* Dark grey tertiary */
  --glow: rgba(0, 255, 65, 0.05); /* Very faint glow */
  --glowS: rgba(0, 255, 65, 0.15);
}

body.cyberpunk-mode::before {
  content: '';
  position: fixed; inset: 0; z-index: -1;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,102,.015) 2px, rgba(255,0,102,.015) 4px);
  pointer-events: none;
  animation: cpScanlines 8s linear infinite;
}
@keyframes cpScanlines { 0% { transform: translateY(0); } 100% { transform: translateY(4px); } }

body.cyberpunk-mode::after {
  content: '';
  position: fixed; inset: 0; z-index: -1;
  background: radial-gradient(ellipse at 20% 50%, rgba(255,0,102,.06), transparent 60%),
              radial-gradient(ellipse at 80% 30%, rgba(0,255,204,.04), transparent 50%);
  pointer-events: none;
}

body.cyberpunk-mode .ng {
  background: linear-gradient(135deg, #ff0066, #ff6600, #ffcc00, #00ffcc) !important;
  -webkit-background-clip: text !important; background-clip: text !important;
  color: transparent !important; -webkit-text-fill-color: transparent !important;
  filter: drop-shadow(0 0 8px rgba(255,0,102,.4));
}
body.cyberpunk-mode .hn { text-shadow: 0 0 20px rgba(255,0,102,.5), 0 0 40px rgba(255,0,102,.2); }

body.cyberpunk-mode .lk,
body.cyberpunk-mode .cert-card,
body.cyberpunk-mode .tc-card,
body.cyberpunk-mode .insight-card {
  border-color: rgba(255,0,102,.12) !important;
  box-shadow: inset 0 0 20px rgba(255,0,102,.03);
}
body.cyberpunk-mode .lk:hover,
body.cyberpunk-mode .cert-card:hover {
  border-color: rgba(255,0,102,.3) !important;
  box-shadow: 0 0 20px rgba(255,0,102,.1), inset 0 0 20px rgba(255,0,102,.05) !important;
}

body.cyberpunk-mode .rt {
  border-color: rgba(0,255,204,.2) !important;
  color: #00ffcc !important;
  text-shadow: 0 0 6px rgba(0,255,204,.3);
}
body.cyberpunk-mode .imp-num {
  color: #ffcc00 !important;
  text-shadow: 0 0 12px rgba(255,204,0,.4);
}
body.cyberpunk-mode .tl-line {
  background: linear-gradient(180deg, #ff0066, #00ffcc, #ffcc00) !important;
  box-shadow: 0 0 8px rgba(255,0,102,.3);
}
body.cyberpunk-mode .tl-dot {
  border-color: #ff0066 !important;
  box-shadow: 0 0 8px rgba(255,0,102,.5);
}
body.cyberpunk-mode .pf svg circle {
  stroke: #ff0066 !important;
  filter: drop-shadow(0 0 6px rgba(255,0,102,.5));
}
body.cyberpunk-mode .xp-footer {
  border-color: rgba(255,0,102,.15) !important;
  background: rgba(10,0,16,.95) !important;
}
body.cyberpunk-mode::-webkit-scrollbar-thumb {
  background: rgba(255,0,102,.3) !important;
}

.cp-flash {
  position: fixed; inset: 0; z-index: 99999; pointer-events: none; opacity: 0;
}
.cp-flash.active { animation: cpFlash .6s ease-out; }
@keyframes cpFlash {
  0% { opacity: 0; background: #ff0066; }
  15% { opacity: .8; background: #ff0066; }
  30% { opacity: 0; }
  45% { opacity: .4; background: #00ffcc; }
  60% { opacity: 0; }
  75% { opacity: .2; background: #ffcc00; }
  100% { opacity: 0; }
}

.cp-indicator {
  position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 100;
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  letter-spacing: 2px; text-transform: uppercase; color: #ff0066;
  text-shadow: 0 0 8px rgba(255,0,102,.5);
  opacity: 0; transition: opacity .5s; pointer-events: none;
}
body.cyberpunk-mode .cp-indicator { opacity: .5; }
body.cyberpunk-mode .cp-indicator:hover { opacity: 1; }


/* ═══════════════════════════════════════════
   2. BIO-RHYTHM
   ═══════════════════════════════════════════ */

.bio-glow {
  position: fixed; inset: 0; z-index: -2;
  pointer-events: none; opacity: 0; transition: opacity 2s ease;
}
.bio-glow.active { opacity: 1; }
body.zen-mode .bio-glow { display: none; }
body.cyberpunk-mode .bio-glow { display: none; }


/* ═══════════════════════════════════════════
   3. DIGITAL TWIN STATUS
   ═══════════════════════════════════════════ */

.twin-status {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(255,255,255,.02); border: 1px solid var(--border);
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  color: var(--sub); letter-spacing: .5px; margin-top: 6px;
  transition: all .4s; cursor: default; overflow: hidden;
}
.twin-status:hover { border-color: rgba(0,225,255,.1); background: rgba(255,255,255,.03); }
.twin-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; transition: background .5s;
}
.twin-dot.online { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.4); animation: livePulse 2s ease-in-out infinite; }
.twin-dot.busy { background: #f97316; box-shadow: 0 0 6px rgba(249,115,22,.3); }
.twin-dot.away { background: #6b7280; }
.twin-dot.sleeping { background: #3b82f6; box-shadow: 0 0 6px rgba(59,130,246,.2); animation: sleepPulse 4s ease-in-out infinite; }
@keyframes sleepPulse { 0%, 100% { opacity: .3; } 50% { opacity: .8; } }
.twin-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.twin-activity { color: var(--text); font-weight: 500; }
.twin-time { color: var(--sub); opacity: .5; font-size: 7px; flex-shrink: 0; }
.twin-typing { display: inline-flex; gap: 2px; margin-left: 4px; }
.twin-typing-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--accent); animation: typeDot 1.4s ease-in-out infinite;
}
.twin-typing-dot:nth-child(2) { animation-delay: .2s; }
.twin-typing-dot:nth-child(3) { animation-delay: .4s; }
@keyframes typeDot { 0%, 100% { opacity: .2; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }

@media print { .twin-status { display: none !important; } }
`;
  document.head.appendChild(css);


  // ═══════════════════════════════════════════════════
  // FEATURE 1: CYBERPUNK THEME OVERRIDE
  // ═══════════════════════════════════════════════════

  function initCyberpunk() {
    const flash = document.createElement('div');
    flash.className = 'cp-flash'; flash.id = 'cpFlash';
    document.body.appendChild(flash);

    const indicator = document.createElement('div');
    indicator.className = 'cp-indicator';
    indicator.textContent = '◆ CYBERPUNK MODE ◆';
    document.body.appendChild(indicator);

    if (localStorage.getItem('cyberpunkMode') === '1') {
      document.body.classList.add('cyberpunk-mode');
    }

    window._toggleCyberpunk = function(animate) {
      
      // 1. EXCLUSIVE: If we are turning Cyberpunk ON, kill Zen Mode first
      if (!document.body.classList.contains('cyberpunk-mode')) {
          document.body.classList.remove('zen-mode');
          localStorage.setItem('zenMode', '0');
          // Update Zen icon if it exists
          const zenIcon = document.getElementById('zenIcon');
          if (zenIcon) zenIcon.className = 'fa-solid fa-eye';
      }

      // 2. Now proceed with normal Cyberpunk toggle
      const active = document.body.classList.toggle('cyberpunk-mode');
      localStorage.setItem('cyberpunkMode', active ? '1' : '0');
      if (animate && !RM) {
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 700);
      }
      const consoleEl = document.getElementById('liveConsole');
      if (consoleEl) {
        consoleEl.textContent = active
          ? '🌆 Cyberpunk mode engaged — welcome to Night City'
          : '☀️ Cyberpunk mode deactivated — back to default';
      }
      if (window.VDna) window.VDna.addXp(active ? 10 : 0);
      return active;
    };

    window.TermCmds = window.TermCmds || {};
    window.TermCmds.cyberpunk = () => {
      const active = window._toggleCyberpunk(true);
      return active
        ? '<span style="color:#ff0066;text-shadow:0 0 8px rgba(255,0,102,.5)">◆ CYBERPUNK MODE ACTIVATED ◆</span><br><span style="color:#8a5ca0">Neon dreams loading... Welcome to Night City, choom.</span>'
        : '<span style="color:#00e1ff">Cyberpunk mode deactivated. Reality restored.</span>';
    };
    window.TermCmds.neon = window.TermCmds.cyberpunk;
    window.TermCmds.nightcity = window.TermCmds.cyberpunk;
    // Add 'C' key listener for Cyberpunk Mode
    document.addEventListener('keydown', e => {
      // Ignore if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Toggle if 'c' or 'C' is pressed (without modifiers like Ctrl/Alt)
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (window._toggleCyberpunk) window._toggleCyberpunk(true);
      }
  });
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 2: BIO-RHYTHM ANIMATION
  // ═══════════════════════════════════════════════════

  function initBioRhythm() {
    if (RM) return;
    const sun = calcSunTimes(new Date(), CAIRO_LAT, CAIRO_LNG);
    const cairoNow = getCairoDate(new Date());
    const phase = getSunPhase(cairoNow, sun);

    const glow = document.createElement('div');
    glow.className = 'bio-glow'; glow.id = 'bioGlow';
    document.body.appendChild(glow);

    const PALETTES = {
      dawn:     { bg: 'radial-gradient(ellipse at 50% 80%, rgba(255,140,50,.04), transparent 70%)', speed: 1.2 },
      morning:  { bg: 'radial-gradient(ellipse at 30% 40%, rgba(255,200,50,.03), transparent 60%)', speed: 1.0 },
      midday:   { bg: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,200,.02), transparent 50%)', speed: 0.8 },
      afternoon:{ bg: 'radial-gradient(ellipse at 70% 50%, rgba(255,160,50,.03), transparent 60%)', speed: 0.9 },
      dusk:     { bg: 'radial-gradient(ellipse at 50% 70%, rgba(255,80,50,.04), rgba(100,0,200,.02) 60%, transparent 80%)', speed: 1.1 },
      evening:  { bg: 'radial-gradient(ellipse at 40% 60%, rgba(60,0,120,.04), transparent 60%)', speed: 1.3 },
      night:    { bg: 'radial-gradient(ellipse at 50% 50%, rgba(0,20,60,.04), transparent 50%)', speed: 1.5 },
    };

    const palette = PALETTES[phase] || PALETTES.night;
    glow.style.background = palette.bg;
    document.documentElement.style.setProperty('--bio-speed', palette.speed);
    setTimeout(() => glow.classList.add('active'), 2000);

    window._bioPhase = phase;
    window._bioSpeed = palette.speed;
  }

  // Minimal SunCalc
  function calcSunTimes(date, lat, lng) {
    const rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545;
    function toJulian(d) { return d.valueOf() / dayMs - 0.5 + J1970; }
    function fromJulian(j) { return new Date((j + 0.5 - J1970) * dayMs); }
    function toDays(d) { return toJulian(d) - J2000; }
    const e = rad * 23.4397;
    function declination(l, b) { return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)); }
    function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
    function eclipticLongitude(M) {
      const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2*M) + 0.0003 * Math.sin(3*M));
      return M + C + rad * 102.9372 + Math.PI;
    }
    function julianCycle(d, lw) { return Math.round(d - 0.0009 - lw / (2 * Math.PI)); }
    function approxTransit(Ht, lw, n) { return 0.0009 + (Ht + lw) / (2 * Math.PI) + n; }
    function solarTransitJ(ds, M, L) { return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2*L); }
    function hourAngle(h, phi, d) {
      const cosH = (Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d));
      return Math.acos(Math.max(-1, Math.min(1, cosH)));
    }
    function getSetJ(h, lw, phi, dec, n, M, L) {
      const w = hourAngle(h, phi, dec);
      return solarTransitJ(approxTransit(w, lw, n), M, L);
    }
    const lw = rad * -lng, phi = rad * lat, d = toDays(date);
    const n = julianCycle(d, lw), ds = approxTransit(0, lw, n);
    const M = solarMeanAnomaly(ds), L = eclipticLongitude(M), dec = declination(L, 0);
    const Jset = getSetJ(rad * -0.833, lw, phi, dec, n, M, L);
    const Jnoon = solarTransitJ(ds, M, L);
    return { sunrise: fromJulian(Jnoon - (Jset - Jnoon)), sunset: fromJulian(Jset), noon: fromJulian(Jnoon) };
  }

  function getCairoDate(d) { return new Date(d.toLocaleString('en-US', { timeZone: 'Africa/Cairo' })); }

  function getSunPhase(now, sun) {
    const mins = now.getHours() * 60 + now.getMinutes();
    const riseMins = sun.sunrise.getHours() * 60 + sun.sunrise.getMinutes();
    const setMins = sun.sunset.getHours() * 60 + sun.sunset.getMinutes();
    if (mins < riseMins - 30) return 'night';
    if (mins < riseMins + 30) return 'dawn';
    if (mins < 720) return 'morning';
    if (mins < riseMins + (setMins - riseMins) * 0.6) return 'midday';
    if (mins < setMins - 60) return 'afternoon';
    if (mins < setMins + 30) return 'dusk';
    if (mins < setMins + 120) return 'evening';
    return 'night';
  }




  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  function init() {
    initBioRhythm();
    initCyberpunk();

    console.log(
      '%c✦ Phase 5 Loaded %c Cyberpunk · Bio-Rhythm',
      'background:#ff0066;color:#fff;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#0a0010;color:#ff0066;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 400));
  } else {
    setTimeout(init, 400);
  }

})();

// ═══════════════════════════════════════════════════════════════
// SPATIAL UI AUDIO — Web Audio API synthesized sounds
// Muted by default. Toggle via terminal: > audio on / audio off
// ═══════════════════════════════════════════════════════════════
(function SpatialAudioModule() {
  'use strict';

  let ctx = null;
  let enabled = localStorage.getItem('audio_enabled') === '1';

  function getCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, duration, panVal, type, vol) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const pan = c.createStereoPanner();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(vol || 0.06, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal || 0)), c.currentTime);
    osc.connect(gain).connect(pan).connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  function sweep(startFreq, endFreq, duration, panVal) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const pan = c.createStereoPanner();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + duration);
    gain.gain.setValueAtTime(0.05, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal || 0)), c.currentTime);
    osc.connect(gain).connect(pan).connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  const INTERACTIVE = 'button,.tbtn,.lk,.mg-btn,.arcade-card:not(.locked),.always-cta,.gb-emoji-btn,.gb-submit,.swipe-opt,.trophy-btn,.vcb,.term-chat-topic,.sc-row';

  document.body.addEventListener('mouseenter', (e) => {
    if (!enabled) return;
    const el = e.target.closest(INTERACTIVE);
    if (!el) return;
    const panVal = (e.clientX / window.innerWidth) * 2 - 1;
    const freqBase = 2200 + (1 - e.clientY / window.innerHeight) * 1800;
    blip(freqBase, 0.035, panVal, 'sine', 0.05);
  }, true);

  document.body.addEventListener('click', (e) => {
    if (!enabled) return;
    const el = e.target.closest(INTERACTIVE);
    if (!el) return;
    const panVal = (e.clientX / window.innerWidth) * 2 - 1;
    blip(1400, 0.02, panVal, 'square', 0.03);
    setTimeout(() => blip(1800, 0.02, panVal, 'square', 0.03), 25);
  }, true);

  const overlayIds = ['arcadeOverlay','miniGameOverlay','guestbookOverlay','shortcutOverlay','termOverlay','gameOverlay','shareOverlay','viewer3dOverlay','easterEgg'];
  const overlayObs = new MutationObserver((mutations) => {
    if (!enabled) return;
    for (const m of mutations) {
      if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
      const el = m.target;
      if (!overlayIds.includes(el.id)) continue;
      if (el.classList.contains('show')) sweep(400, 1200, 0.15, 0);
      else sweep(1200, 400, 0.1, 0);
    }
  });
  overlayIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) overlayObs.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
  setTimeout(() => {
    overlayIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el._audioObserved) { el._audioObserved = true; overlayObs.observe(el, { attributes: true, attributeFilter: ['class'] }); }
    });
  }, 5000);

  window._spatialAudio = {
    isEnabled: () => enabled,
    getCtx: getCtx,
    toggle: (on) => {
      enabled = typeof on === 'boolean' ? on : !enabled;
      localStorage.setItem('audio_enabled', enabled ? '1' : '0');
      if (enabled) blip(800, 0.05, 0, 'sine', 0.06);
      return enabled;
    }
  };

  function syncAudioIndicator(on) {
    const ind = document.getElementById('mpAudioInd');
    if (!ind) return;
    ind.classList.toggle('active', on);
    const icon = ind.querySelector('.mp-audio-ind-icon');
    if (icon) icon.textContent = on ? '🔊' : '🔇';
  }

  window.TermCmds = window.TermCmds || {};
  window.TermCmds.audio = (args) => {
    const arg = (args || '').trim().toLowerCase();
    if (arg === 'on') {
      window._spatialAudio.toggle(true);
      syncAudioIndicator(true);
      return '<span class="term-green">🔊 Spatial audio enabled — hover over buttons to hear it</span>';
    }
    if (arg === 'off') {
      window._spatialAudio.toggle(false);
      syncAudioIndicator(false);
      return '<span class="term-gray">🔇 Spatial audio disabled</span>';
    }
    const state = window._spatialAudio.toggle();
    syncAudioIndicator(state);
    return state
      ? '<span class="term-green">🔊 Spatial audio enabled — hover over buttons to hear it</span>'
      : '<span class="term-gray">🔇 Spatial audio disabled</span>';
  };
  window.TermCmds.sound = window.TermCmds.audio;
})();

// ═══ PRESENCE AUDIO ENGINE — Collaborative Soundscape ═══
(function PresenceAudioEngine() {
  'use strict';

  function getCtx() {
    if (window._spatialAudio && window._spatialAudio.getCtx) return window._spatialAudio.getCtx();
    return null;
  }

  function isEnabled() { return window._spatialAudio && window._spatialAudio.isEnabled(); }
  function clampPan(v) { return Math.max(-1, Math.min(1, v)); }

  const MAX_VOICES = 5;
  const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0];
  const TIMBRES = ['sine', 'triangle', 'sawtooth'];
  const SECTION_ORDER = ['hero', 'timeline', 'certs', 'testimonials', 'conferences', 'articles', 'impact'];

  let prevPeerPositions = {};
  let prevPeerGameStates = {};
  let prevPeerCount = 0;
  let heartbeatInterval = null;

  function hashId(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function sectionDist(a, b) {
    const ia = SECTION_ORDER.indexOf(a), ib = SECTION_ORDER.indexOf(b);
    if (ia < 0 || ib < 0) return 3;
    return Math.abs(ia - ib);
  }

  function getClosestPeers(peers, myId) {
    const myPos = window._mpGetMyPos ? window._mpGetMyPos() : { x: 0.5, y: 0.5 };
    const myData = peers[myId] ? (peers[myId][0] || {}) : {};
    const mySection = myData.section || 'hero';
    const peerList = [];
    for (const [pid, pArr] of Object.entries(peers)) {
      if (pid === myId) continue;
      const p = pArr[0] || {};
      const dx = (p.x || 0.5) - myPos.x;
      const dy = (p.y || 0.5) - myPos.y;
      const posDist = Math.sqrt(dx * dx + dy * dy);
      const secDist = sectionDist(mySection, p.section || 'hero');
      peerList.push({ pid, data: p, dist: posDist + secDist * 0.3 });
    }
    peerList.sort((a, b) => a.dist - b.dist);
    return peerList.slice(0, MAX_VOICES);
  }

  function makeNoise(duration, freq, bandwidth, vol) {
    const c = getCtx();
    if (!c) return;
    const bufSize = Math.floor(c.sampleRate * duration);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, c.currentTime);
    filter.Q.setValueAtTime(bandwidth || 1, c.currentTime);
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol || 0.02, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(c.currentTime);
    src.stop(c.currentTime + duration);
  }

  function playTone(freq, duration, pan, type, vol, delay) {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    const panner = c.createStereoPanner();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    panner.pan.setValueAtTime(clampPan(pan || 0), t);
    osc.connect(gain).connect(panner).connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  function playSweep(startF, endF, duration, vol, type, delay) {
    const c = getCtx();
    if (!c) return;
    const t = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(endF, t + duration);
    gain.gain.setValueAtTime(vol || 0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  // ── SYSTEM 1: SPATIAL & PHYSICS-BASED CURSORS ──

  function updateSpatialCursors(closest, peers) {
    for (const { pid, data, dist } of closest) {
      const px = data.x || 0.5;
      const pan = px * 2 - 1;
      const proxVol = Math.max(0.005, 0.04 - dist * 0.015);
      const freq = 180 + hashId(pid) % 120;
      playTone(freq, 0.4, pan, 'sine', proxVol);

      const prev = prevPeerPositions[pid];
      if (prev) {
        const dx = (data.x || 0.5) - prev.x;
        const dy = (data.y || 0.5) - prev.y;
        const vel = Math.sqrt(dx * dx + dy * dy);
        if (vel > 0.15) {
          const whooshVol = Math.min(0.03, vel * 0.04);
          makeNoise(0.15, 800 + vel * 2000, 0.5, whooshVol);
        }
      }
      prevPeerPositions[pid] = { x: data.x || 0.5, y: data.y || 0.5 };
    }

    for (const pid of Object.keys(prevPeerPositions)) {
      if (!peers[pid]) delete prevPeerPositions[pid];
    }
  }

  // ── SYSTEM 2: PENTATONIC SWARM ──

  function onSwarmSync(peers, closest) {
    const peerCount = Object.keys(peers).length - 1;

    if (peerCount !== prevPeerCount) {
      if (peerCount > prevPeerCount) {
        playJoinArpeggio();
        playJoinTone();
      } else if (peerCount < prevPeerCount) {
        playLeaveArpeggio();
        playLeaveTone();
      }
      prevPeerCount = peerCount;
    }

    closest.forEach(({ pid, data }, i) => {
      const h = hashId(pid);
      const noteIdx = h % PENTATONIC.length;
      const timbreIdx = h % TIMBRES.length;
      const freq = PENTATONIC[noteIdx];
      const timbre = TIMBRES[timbreIdx];
      const pan = (data.x || 0.5) * 2 - 1;
      const dur = 0.15 + (h % 15) * 0.01;
      playTone(freq, dur, pan, timbre, 0.015, i * 0.2);
    });
  }

  function playJoinArpeggio() {
    for (let i = 0; i < 3; i++) {
      playTone(PENTATONIC[i], 0.12, 0, 'sine', 0.02, i * 0.08);
    }
  }

  function playLeaveArpeggio() {
    for (let i = 2; i >= 0; i--) {
      playTone(PENTATONIC[i], 0.12, 0, 'sine', 0.02, (2 - i) * 0.08);
    }
  }

  // ── SYSTEM 3: TACTILE MULTIPLAYER EVENTS ──

  function playHighFiveChord() {
    if (!isEnabled()) return;
    const C = 523.25, E = 659.25, G = 783.99;
    playTone(C, 0.3, 0, 'triangle', 0.04);
    playTone(E, 0.3, 0, 'triangle', 0.04);
    playTone(G, 0.3, 0, 'triangle', 0.04);
  }

  function playTipCoin() {
    if (!isEnabled()) return;
    playTone(783.99, 0.06, 0, 'square', 0.025, 0);
    playTone(659.25, 0.06, 0, 'square', 0.025, 0.07);
    playTone(523.25, 0.06, 0, 'square', 0.025, 0.14);
  }

  function playJoinTone() {
    if (!isEnabled()) return;
    playTone(261.63, 0.1, 0, 'sine', 0.025, 0);
    playTone(329.63, 0.1, 0, 'sine', 0.025, 0.08);
  }

  function playLeaveTone() {
    if (!isEnabled()) return;
    playTone(329.63, 0.1, 0, 'sine', 0.025, 0);
    playTone(261.63, 0.1, 0, 'sine', 0.025, 0.08);
  }

  function playWhisperBreath() {
    if (!isEnabled()) return;
    makeNoise(0.1, 2000, 2, 0.02);
  }

  function playContractBass() {
    if (!isEnabled()) return;
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65.41, c.currentTime);
    gain.gain.setValueAtTime(0.001, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, c.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
    osc.connect(gain).connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.5);
  }

  function playPowerUpSweep() {
    if (!isEnabled()) return;
    playSweep(200, 1200, 0.3, 0.03, 'sawtooth');
  }

  // ── SYSTEM 4: GHOST TYPING ──

  function playGhostTyping() {
    if (!isEnabled()) return;
    const clicks = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < clicks; i++) {
      setTimeout(() => makeNoise(0.012, 4000 + Math.random() * 1000, 3, 0.008 + Math.random() * 0.004), i * 50);
    }
  }

  function playRadarPing() {
    if (!isEnabled()) return;
    const c = getCtx();
    if (!c) return;
    const osc1 = c.createOscillator();
    const g1 = c.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1500, c.currentTime);
    g1.gain.setValueAtTime(0.03, c.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.2);
    osc1.connect(g1).connect(c.destination);
    osc1.start(c.currentTime);
    osc1.stop(c.currentTime + 0.2);

    const delay = c.createDelay(0.3);
    delay.delayTime.setValueAtTime(0.1, c.currentTime);
    const osc2 = c.createOscillator();
    const g2 = c.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1500, c.currentTime);
    g2.gain.setValueAtTime(0.015, c.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
    osc2.connect(g2).connect(delay).connect(c.destination);
    osc2.start(c.currentTime);
    osc2.stop(c.currentTime + 0.3);
  }

  // ── SYSTEM 5: ARCADE SPECTATOR ACOUSTICS ──

  function playSeatTake() {
    if (!isEnabled()) return;
    makeNoise(0.1, 200, 0.5, 0.02);
    playTone(120, 0.2, 0, 'sine', 0.015, 0.08);
  }

  function playDigitalApplause() {
    if (!isEnabled()) return;
    makeNoise(0.2, 2000, 0.8, 0.03);
    playTone(523.25, 0.03, 0, 'square', 0.025, 0.05);
    playTone(659.25, 0.03, 0, 'square', 0.025, 0.09);
    playTone(783.99, 0.03, 0, 'square', 0.025, 0.13);
  }

  function startHeartbeat() {
    if (heartbeatInterval) return;
    heartbeatInterval = setInterval(() => {
      if (!isEnabled()) return;
      playTone(60, 0.05, 0, 'sine', 0.015);
    }, 1000);
  }

  function stopHeartbeat() {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  }

  function checkArcadeTransitions(peers) {
    if (!isEnabled()) return;
    const myId = window._mpMyId;
    for (const [pid, pArr] of Object.entries(peers)) {
      if (pid === myId) continue;
      const p = pArr[0] || {};
      const prev = prevPeerGameStates[pid];
      const cur = p.gameState;

      if (!prev && cur && cur.status === 'playing') {
        playSeatTake();
      }

      if (cur && cur.status === 'finished' && (!prev || prev.status !== 'finished')) {
        if (cur.score > 100) playDigitalApplause();
      }

      prevPeerGameStates[pid] = cur ? { ...cur } : null;
    }

    for (const pid of Object.keys(prevPeerGameStates)) {
      if (!peers[pid]) delete prevPeerGameStates[pid];
    }

    const hasRival = Object.entries(peers).some(([k, pArr]) => {
      if (k === myId) return false;
      const p = pArr[0] || {};
      const myGS = peers[myId] ? (peers[myId][0] || {}).gameState : null;
      return myGS && p.gameState && p.gameState.game === myGS.game;
    });

    if (hasRival) startHeartbeat();
    else stopHeartbeat();
  }

  function onPresenceSync(peers) {
    if (!isEnabled()) return;
    const myId = window._mpMyId;
    const closest = getClosestPeers(peers, myId);
    updateSpatialCursors(closest, peers);
    onSwarmSync(peers, closest);
    checkArcadeTransitions(peers);
  }

  window._presenceAudio = {
    onHighFive: playHighFiveChord,
    onTip: playTipCoin,
    onJoin: playJoinTone,
    onLeave: playLeaveTone,
    onWhisper: playWhisperBreath,
    onContract: playContractBass,
    onPowerUp: playPowerUpSweep,
    onBroadcast: playRadarPing,
    onGuestbookEntry: playGhostTyping,
    onPresenceSync: onPresenceSync
  };
})();

// ═══════════════════════════════════════════════════════════════
// PHASE 6.1: INTELLIGENCE LAYER — amrelharony.com
// Drop-in: <script src="phase6-intelligence.js" defer></script>
//
// Features:
//   0. Always-visible CTA buttons (LinkedIn + Get Mentored)
//   1. Command Palette (Cmd+K) — fuzzy search, MRU, descriptions, Tab categories
//   2. Trophy Case & Progress Tracker — 24 achievements, exploration tracking
//   3. Interactive Timeline — minimal scroll-line, clean cards, filters
//   4. Live Guestbook (emoji wall)
//   5. Voice Navigation — 30+ routes, compound commands, confidence display
//   6. Advanced Terminal — 35+ commands, easter eggs, neofetch
//   7. ADPList widget cleanup (CSS + DOM) + direct redirect
//   8. Trophy triggers wired into: scroll, guestbook, palette, terminal, voice
//
// 1,957 lines · Syntax validated · RTL/mobile/print/zen safe
// ═══════════════════════════════════════════════════════════════
(function PhaseSixIntelligence() {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = window.matchMedia('(pointer:coarse)').matches;

  // ───────────────────────────────────────
  // INJECT CSS
  // ───────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'phase6-css';
  css.textContent = `

/* ═══════════════════════════════════════════
   1. COMMAND PALETTE
   ═══════════════════════════════════════════ */

#cmdPaletteOverlay {
  position: fixed; inset: 0; z-index: 99999;
  background: transparent; backdrop-filter: blur(6px);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 18vh;
  opacity: 0; visibility: hidden; transition: opacity .2s, visibility .2s; pointer-events: none;
}
#cmdPaletteOverlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.cmd-palette {
  width: 94%; max-width: 460px; border-radius: 16px;
  background: rgba(13,20,32,.98); border: 1px solid #1a2332;
  box-shadow: 0 20px 60px rgba(0,0,0,.6); overflow: hidden;
  transform: scale(.95) translateY(-10px);
  transition: transform .25s cubic-bezier(.16,1,.3,1);
}
#cmdPaletteOverlay.show .cmd-palette { transform: scale(1) translateY(0); }
.cmd-input-wrap {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 1px solid #1a2332;
}
.cmd-input-icon { color: #4a5568; font-size: 14px; flex-shrink: 0; }
.cmd-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
  color: #e2e8f0; caret-color: #00e1ff;
}
.cmd-input::placeholder { color: #3a4a5c; }
.cmd-input-hint { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #2d3748; letter-spacing: 1px; flex-shrink: 0; }
.cmd-results { max-height: 320px; overflow-y: auto; padding: 6px; }
.cmd-results::-webkit-scrollbar { width: 3px; }
.cmd-results::-webkit-scrollbar-thumb { background: #1a2332; border-radius: 3px; }
.cmd-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  transition: background .15s; -webkit-tap-highlight-color: transparent;
}
.cmd-item:hover, .cmd-item.active { background: rgba(0,225,255,.06); }
.cmd-item-icon { font-size: 16px; width: 24px; text-align: center; flex-shrink: 0; }
.cmd-item-text { flex: 1; min-width: 0; }
.cmd-item-name { font-size: 12px; color: #c9d1d9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cmd-item-name mark { background: none; color: #00e1ff; font-weight: 600; }
.cmd-item-badge {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(255,255,255,.04); color: #4a5568;
  letter-spacing: .5px; text-transform: uppercase; flex-shrink: 0;
}
.cmd-empty { text-align: center; padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #3a4a5c; }
.cmd-footer {
  display: flex; justify-content: center; gap: 12px;
  padding: 8px; border-top: 1px solid #111827;
  font-family: 'JetBrains Mono', monospace; font-size: 7px; color: #2d3748; letter-spacing: 1px;
}
@media print { #cmdPaletteOverlay { display: none !important; } }


/* ═══════════════════════════════════════════
   2. ADMIN DASHBOARD
   ═══════════════════════════════════════════ */

#adminOverlay {
  position: fixed; inset: 0; z-index: 99999;
  background: transparent; display: flex; align-items: center; justify-content: center;
  opacity: 0; visibility: hidden; transition: opacity .3s, visibility .3s;
  pointer-events: none; backdrop-filter: blur(6px);
}
#adminOverlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.admin-panel {
  width: 96%; max-width: 520px; max-height: 85vh; overflow-y: auto;
  padding: 20px; border-radius: 16px;
  background: #080c14; border: 1px solid #1a2332;
  transform: scale(.9); transition: transform .4s cubic-bezier(.16,1,.3,1);
}
#adminOverlay.show .admin-panel { transform: scale(1); }
.admin-panel::-webkit-scrollbar { width: 3px; }
.admin-panel::-webkit-scrollbar-thumb { background: #1a2332; border-radius: 3px; }
.admin-title { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #ef4444; text-align: center; margin-bottom: 14px; }
.admin-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.admin-stat { padding: 12px; border-radius: 10px; background: rgba(255,255,255,.02); border: 1px solid #1a2332; text-align: center; }
.admin-stat-val { font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: #00e1ff; line-height: 1; }
.admin-stat-label { font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 1.5px; text-transform: uppercase; color: #4a5568; margin-top: 4px; }
.admin-section { margin-top: 14px; padding-top: 14px; border-top: 1px solid #111827; }
.admin-section-title { font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
.admin-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 11px; }
.admin-row-label { color: #8b949e; }
.admin-row-val { font-family: 'JetBrains Mono', monospace; color: #e2e8f0; font-weight: 600; }
.admin-bar-wrap { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.admin-bar-label { font-size: 10px; color: #6b7280; width: 80px; flex-shrink: 0; }
.admin-bar-track { flex: 1; height: 6px; border-radius: 3px; background: #111827; overflow: hidden; }
.admin-bar-fill { height: 100%; border-radius: 3px; transition: width .8s cubic-bezier(.16,1,.3,1); }
.admin-bar-val { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #4a5568; width: 30px; text-align: right; }
.admin-close { text-align: center; margin-top: 14px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #4a5568; cursor: pointer; opacity: .4; }
.admin-close:hover { opacity: 1; color: #ef4444; }
@media print { #adminOverlay { display: none !important; } }

/* Command Palette enhancements */
.cmd-cat-header {
  font-family: 'JetBrains Mono', monospace; font-size: 7px; letter-spacing: 1.5px;
  text-transform: uppercase; color: #3a4a5c; padding: 8px 10px 3px; margin-top: 2px;
}
.cmd-item-desc { font-size: 9px; color: #4a5568; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cmd-item-key {
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  padding: 1px 5px; border-radius: 3px; border: 1px solid #1a2332;
  color: #4a5568; flex-shrink: 0; letter-spacing: .5px;
}

/* Trophy Toast — subtle notification */
.trophy-toast {
  position: fixed; bottom: 20px; right: 16px; z-index: 99999;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 8px;
  background: rgba(13,20,32,.88); border: 1px solid rgba(255,255,255,.06);
  box-shadow: 0 4px 20px rgba(0,0,0,.3);
  backdrop-filter: blur(8px);
  transform: translateY(12px); opacity: 0;
  transition: transform .35s cubic-bezier(.16,1,.3,1), opacity .25s;
  font-size: 10px; color: #8b949e;
  pointer-events: none;
}
.trophy-toast.show { transform: translateY(0); opacity: 1; }
.trophy-toast-icon { font-size: 16px; }
.trophy-toast strong { color: #e2e8f0; display: block; font-size: 9px; letter-spacing: .3px; font-weight: 500; }
.trophy-toast span { color: #6b7280; font-size: 9px; }

/* Trophy Grid in Admin Panel */
.trophy-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 0;
  border-bottom: 1px solid rgba(255,255,255,.02);
  transition: opacity .3s;
}
.trophy-item.locked { opacity: .3; }
.trophy-item.locked:hover { opacity: .5; }
.trophy-item.unlocked { opacity: 1; }
.trophy-icon { font-size: 18px; width: 28px; text-align: center; flex-shrink: 0; }
.trophy-meta { flex: 1; min-width: 0; }
.trophy-name { font-size: 11px; color: #e2e8f0; font-weight: 600; }
.trophy-desc { font-size: 9px; color: #6b7280; margin-top: 1px; }
.trophy-xp {
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  padding: 2px 5px; border-radius: 4px;
  background: rgba(34,197,94,.1); color: #22c55e; flex-shrink: 0;
}
@media(max-width:600px) { .trophy-toast { bottom: 10px; right: 10px; left: auto; max-width: 200px; } }

/* Timeline expand card enhancements */
.tl-expand-date {
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  color: #4a5568; margin-left: 6px; letter-spacing: .3px;
}
.tl-expand-content p {
  margin: 6px 0; font-size: 10px; line-height: 1.55; color: #8b949e;
}
.tl-expand-chips {
  display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;
}
.tl-expand-skills {
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  color: #3a4a5c; margin-top: 6px; padding-top: 6px;
  border-top: 1px solid rgba(255,255,255,.03);
}



/* ═══════════════════════════════════════════
   ALWAYS-VISIBLE CTA BUTTONS
   ═══════════════════════════════════════════ */
.always-cta-row {
  display: flex; gap: 8px; margin: 14px 0 4px;
}
.always-cta {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 12px; border-radius: 10px;
  font-family: 'JetBrains Mono', monospace; font-size: 9px;
  font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
  text-decoration: none; transition: transform .25s ease, box-shadow .25s ease;
  -webkit-tap-highlight-color: transparent;
}
.always-cta-linkedin {
  background: #0077b5; color: #fff; border: 1px solid rgba(0,119,181,.3);
}
.always-cta-linkedin:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,119,181,.2); color: #fff; }
.always-cta-mentor {
  background: rgba(0,225,255,.1); color: var(--accent);
  border: 1px solid rgba(0,225,255,.15);
}
.always-cta-mentor:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,225,255,.1); color: var(--accent); }
.always-cta i { font-size: 12px; }
@media print { .always-cta-row { display: none !important; } }


/* ═══════════════════════════════════════════
   3. INTERACTIVE TIMELINE — MINIMAL ENGINE
   ═══════════════════════════════════════════ */

/* --- Filter pills --- */
.tl-filters {
  display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;
  margin: 0 0 10px; padding: 0;
}
.tl-filter-btn {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  letter-spacing: 1px; text-transform: uppercase;
  padding: 4px 10px; border-radius: 100px;
  border: 1px solid var(--border); background: transparent; color: var(--sub);
  cursor: pointer; transition: color .25s, border-color .25s, background .25s;
  -webkit-tap-highlight-color: transparent;
}
.tl-filter-btn:hover { border-color: rgba(255,255,255,.12); color: var(--text); }
.tl-filter-btn.active {
  border-color: var(--accent); color: var(--accent);
  background: rgba(0,225,255,.05);
}

/* --- Scroll-progress line --- */
.tl-scroll-line {
  position: absolute; left: 5px; top: 0; width: 1.5px; height: 100%;
  z-index: 1; pointer-events: none; overflow: hidden;
  background: var(--border); border-radius: 1px;
}
.tl-scroll-line-fill {
  width: 100%; height: 0%; border-radius: 1px;
  background: var(--accent); opacity: .45;
  transition: height .08s linear;
}

/* --- Enhanced items --- */
.tl-item.tl-enhanced {
  cursor: pointer; flex-wrap: wrap; position: relative;
  transition: opacity .4s ease, transform .4s ease !important;
}

/* Entrance: simple fade up */
.tl-item.tl-hidden {
  opacity: 0 !important;
  transform: translateY(10px) !important;
}
.tl-item.tl-visible {
  opacity: 1 !important; transform: none !important;
  transition: opacity .5s ease, transform .5s ease !important;
}

/* Filter out */
.tl-item.filtered-out {
  opacity: .06 !important; transform: scale(.97) !important;
  pointer-events: none;
  transition: opacity .35s ease, transform .35s ease !important;
}

/* --- Dot: clean, no orbits --- */
.tl-item.tl-enhanced .tl-dot {
  transition: background .3s, border-color .3s, transform .3s;
  z-index: 3;
}

/* Active dot — subtle scale + accent */
.tl-item.tl-active .tl-dot {
  background: var(--accent) !important;
  border-color: var(--accent) !important;
  transform: scale(1.25);
}

/* Active item — faint left accent */
.tl-item.tl-active {
  border-radius: 6px;
  background: rgba(0,225,255,.02);
}

/* --- Era headers: clean styling --- */
.tl-item.tl-era.tl-visible .tl-txt strong {
  color: var(--text);
}
.tl-item.tl-era.tl-visible::after {
  content: ''; position: absolute; bottom: -1px;
  left: 36px; right: 0; height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,.06), transparent);
}

/* --- Year label on active --- */
.tl-item.tl-active .tl-yr {
  color: var(--accent) !important;
  transition: color .3s !important;
}
.tl-item:hover .tl-yr { color: var(--accent); }

/* --- Expand card: clean, flat --- */
.tl-item-expand {
  max-height: 0; overflow: hidden; opacity: 0;
  transition: max-height .45s ease, opacity .3s .05s, margin .25s;
  margin: 0; flex-basis: 100%; width: 100%; order: 99;
}
.tl-item-expand.open { max-height: 320px; opacity: 1; margin: 8px 0 0; }
.tl-expand-content {
  padding: 12px 14px; border-radius: 10px;
  background: rgba(255,255,255,.02);
  border: 1px solid rgba(255,255,255,.04);
  font-size: 10px; line-height: 1.7; color: var(--sub);
}
.tl-expand-content strong { color: var(--text); }
.tl-expand-metric {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: 'JetBrains Mono', monospace; font-size: 8px;
  padding: 3px 8px; border-radius: 5px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05);
  color: var(--sub); margin: 6px 4px 0 0;
}

/* --- Progress counter (above timeline) --- */
.tl-progress-bar {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 10px; opacity: 0; transition: opacity .4s;
}
.tl-progress-bar.show { opacity: 1; }
.tl-progress-track {
  flex: 1; height: 1.5px; border-radius: 1px; background: var(--border);
  overflow: hidden;
}
.tl-progress-fill {
  height: 100%; border-radius: 1px; width: 0%;
  background: var(--accent); opacity: .5;
  transition: width .12s linear;
}
.tl-progress-label {
  font-family: 'JetBrains Mono', monospace; font-size: 7px;
  color: var(--sub); letter-spacing: 1px; flex-shrink: 0; min-width: 28px;
  text-align: right;
}

/* --- Zen / RTL / Print --- */
body.zen-mode .tl-filters,
body.zen-mode .tl-item-expand, body.zen-mode .tl-scroll-line,
body.zen-mode .tl-progress-bar { display: none !important; }
[dir="rtl"] .tl-scroll-line { left: auto; right: 5px; }
@media print {
  .tl-filters, .tl-item-expand,
  .tl-scroll-line, .tl-progress-bar { display: none !important; }
}


/* ═══════════════════════════════════════════
   4. GUESTBOOK
   ═══════════════════════════════════════════ */

#guestbookOverlay {
  position: fixed; inset: 0; z-index: 99999;
  background: transparent; display: flex; align-items: center; justify-content: center;
  opacity: 0; visibility: hidden; transition: opacity .3s, visibility .3s;
  pointer-events: none; backdrop-filter: blur(6px);
}
#guestbookOverlay.show { opacity: 1; visibility: visible; pointer-events: auto; }
.gb-panel {
  width: 94%; max-width: 400px; max-height: 80vh;
  padding: 20px; border-radius: 16px;
  background: #080c14; border: 1px solid #1a2332; overflow-y: auto;
  transform: scale(.9); transition: transform .4s cubic-bezier(.16,1,.3,1);
}
#guestbookOverlay.show .gb-panel { transform: scale(1); }
.gb-title { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #00e1ff; text-align: center; margin-bottom: 4px; }
.gb-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #4a5568; text-align: center; letter-spacing: 1px; margin-bottom: 14px; }
.gb-form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.gb-emoji-row { display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; }
.gb-emoji-btn {
  width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid #1a2332; background: transparent; font-size: 18px;
  cursor: pointer; transition: all .2s;
  display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
.gb-emoji-btn:hover { border-color: rgba(0,225,255,.2); transform: scale(1.1); }
.gb-emoji-btn.selected { border-color: #00e1ff; background: rgba(0,225,255,.08); transform: scale(1.15); }
.gb-name-input, .gb-msg-input {
  border: 1px solid #1a2332; border-radius: 8px;
  background: rgba(255,255,255,.02); color: #e2e8f0;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  padding: 8px 10px; outline: none; transition: border-color .2s;
}
.gb-name-input:focus, .gb-msg-input:focus { border-color: rgba(0,225,255,.3); }
.gb-name-input::placeholder, .gb-msg-input::placeholder { color: #2d3748; }
.gb-submit {
  font-family: 'JetBrains Mono', monospace; font-size: 9px;
  letter-spacing: 1px; text-transform: uppercase;
  padding: 8px 16px; border-radius: 8px;
  border: 1px solid #00e1ff; background: rgba(0,225,255,.06);
  color: #00e1ff; cursor: pointer; transition: all .2s; align-self: center;
}
.gb-submit:hover { background: rgba(0,225,255,.15); }
.gb-submit:disabled { opacity: .3; cursor: default; }
.gb-entries { display: flex; flex-direction: column; gap: 6px; }
.gb-entry {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px; border-radius: 10px;
  background: rgba(255,255,255,.02); border: 1px solid #111827;
  animation: gbFadeIn .3s ease;
}
@keyframes gbFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.gb-entry-emoji { font-size: 20px; flex-shrink: 0; }
.gb-entry-meta { flex: 1; min-width: 0; }
.gb-entry-name { font-size: 11px; font-weight: 600; color: #c9d1d9; }
.gb-entry-msg { font-size: 10px; color: #6b7280; margin-top: 2px; }
.gb-entry-time { font-family: 'JetBrains Mono', monospace; font-size: 7px; color: #2d3748; margin-top: 3px; }
.gb-empty { text-align: center; padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #2d3748; }
.gb-close { text-align: center; margin-top: 12px; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #4a5568; cursor: pointer; opacity: .4; }
.gb-close:hover { opacity: 1; color: #00e1ff; }
.gb-bubble {
  position: fixed; pointer-events: none; z-index: 98; font-size: 20px; opacity: 0;
  animation: gbBubble 6s ease-out forwards;
}
@keyframes gbBubble {
  0% { opacity: 0; transform: translateY(0) scale(.5); }
  10% { opacity: .6; transform: translateY(-20px) scale(1); }
  90% { opacity: .3; transform: translateY(-120px) scale(.8); }
  100% { opacity: 0; transform: translateY(-150px) scale(.6); }
}
@media print { #guestbookOverlay, .gb-bubble { display: none !important; } }


/* ═══════════════════════════════════════════
   5. VOICE NAVIGATION
   ═══════════════════════════════════════════ */

.voice-btn {
  position: fixed; bottom: 24px; left: 16px; z-index: 99;
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--border); background: var(--card);
  backdrop-filter: blur(20px); color: var(--sub);
  font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .3s cubic-bezier(.16,1,.3,1);
  box-shadow: 0 4px 16px rgba(0,0,0,.12);
  opacity: .5; -webkit-tap-highlight-color: transparent;
}
.voice-btn:hover { opacity: 1; border-color: var(--accent); color: var(--accent); transform: scale(1.08); }
.voice-btn.listening {
  opacity: 1; border-color: #ef4444; color: #ef4444;
  animation: voicePulse 1.5s ease-in-out infinite;
}
@keyframes voicePulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.3); }
  50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
}
.voice-transcript {
  position: fixed; bottom: 68px; left: 16px; z-index: 99;
  max-width: 260px; padding: 8px 12px; border-radius: 10px;
  background: rgba(13,20,32,.95); border: 1px solid #1a2332;
  backdrop-filter: blur(12px);
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  color: #8b949e; opacity: 0; transform: translateY(6px);
  transition: all .3s; pointer-events: none;
}
.voice-transcript.show { opacity: 1; transform: translateY(0); }
.voice-transcript .heard { color: #00e1ff; }
.voice-transcript .action { color: #22c55e; font-weight: 600; }
body.zen-mode .voice-btn, body.zen-mode .voice-transcript { display: none !important; }
@media(max-width:600px) {
  .voice-btn { bottom: 14px; left: 12px; width: 32px; height: 32px; font-size: 11px; }
  .voice-transcript { bottom: 52px; left: 12px; }
}
@media print { .voice-btn, .voice-transcript { display: none !important; } }
`;
  document.head.appendChild(css);


  // ═══════════════════════════════════════════════════
  // FEATURE 1: COMMAND PALETTE — ADVANCED ENGINE
  // ═══════════════════════════════════════════════════
  // Fuzzy search · MRU tracking · Category headers · Descriptions · Shortcut hints

  function initCommandPalette() {
    const MRU_KEY = 'cmd_mru';
    function getMRU() { try { return JSON.parse(localStorage.getItem(MRU_KEY)||'[]'); } catch(e) { return []; } }
    function addMRU(name) { const mru=getMRU().filter(n=>n!==name); mru.unshift(name); localStorage.setItem(MRU_KEY,JSON.stringify(mru.slice(0,8))); }

    const REGISTRY = [
      // Sections
      { name:'Impact Numbers',         icon:'📊', action:()=>scrollTo('.imp'),              cat:'Section', desc:'Scroll to key metrics', keys:'' },
      { name:'Journey / Timeline',     icon:'🚀', action:()=>scrollTo('.tl-wrap'),          cat:'Section', desc:'Interactive career timeline', keys:'' },
      { name:'Certifications',         icon:'📜', action:()=>scrollTo('#certGrid'),          cat:'Section', desc:'20+ professional badges', keys:'' },
      { name:'Testimonials',           icon:'⭐', action:()=>scrollTo('.tc-section'),        cat:'Section', desc:'Colleague recommendations', keys:'' },
      { name:'Conferences',            icon:'🎤', action:()=>scrollTo('.conf-strip'),        cat:'Section', desc:'Speaking engagements', keys:'' },
      { name:'LinkedIn Articles',      icon:'📝', action:()=>scrollTo('#linkedinFeed'),      cat:'Section', desc:'Published articles feed', keys:'' },
      { name:'Contact Info',           icon:'📧', action:()=>{ const s=document.getElementById('contactSecret'); if(s) s.classList.add('revealed'); scrollTo('.sr'); }, cat:'Section', desc:'Reveal contact details', keys:'' },
      // Links
      { name:'The Bilingual Executive',icon:'📘', action:()=>clickLink('bilingual'),  cat:'Link', desc:'The book on Amazon', keys:'' },
      { name:'ADPList Mentoring',      icon:'🎓', action:()=>window.open('https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session','_blank'),    cat:'Link', desc:'Book a mentoring session', keys:'' },
      { name:'Fintech Bilinguals',     icon:'🤝', action:()=>clickLink('fintech-bilinguals'), cat:'Link', desc:'Community hub', keys:'' },
      { name:'LinkedIn Profile',       icon:'💼', action:()=>window.open('https://linkedin.com/in/amrmelharony','_blank'), cat:'Link', desc:'Connect on LinkedIn', keys:'' },
      { name:'Book My Calendar',       icon:'📅', action:()=>window.open('https://calendly.com/amrmelharony/30min','_blank'), cat:'Link', desc:'Schedule a 30-min call', keys:'' },
      // Games
      { name:'Open Arcade',            icon:'🕹️', action:()=>{ if(window._openArcade)window._openArcade(); }, cat:'Game', desc:'All 5 mini-games', keys:'A' },
      { name:'Sprint Stacker',         icon:'🧱', action:()=>{ if(window._launchGame)window._launchGame('stacker'); else if(window.TermCmds?.play)window.TermCmds.play('stacker'); }, cat:'Game', desc:'Stack agile sprint blocks', keys:'' },
      { name:'Data Mesh Router',       icon:'🔀', action:()=>{ if(window._launchGame)window._launchGame('router'); else if(window.TermCmds?.play)window.TermCmds.play('router'); },  cat:'Game', desc:'Route data to correct domains', keys:'' },
      { name:'FinTech Trader',         icon:'📈', action:()=>{ if(window._launchGame)window._launchGame('trader'); else if(window.openGame)window.openGame(); },  cat:'Game', desc:'Real-time stock trading sim', keys:'' },
      { name:'Bilingual Swipe',        icon:'🌐', action:()=>{ if(window._launchGame)window._launchGame('bilingual'); else if(window.TermCmds?.play)window.TermCmds.play('bilingual'); }, cat:'Game', desc:'Swipe-match bilingual terms', keys:'' },
      { name:'Scope Defender',         icon:'🛡️', action:()=>{ if(window._launchGame)window._launchGame('defender'); else if(window.TermCmds?.play)window.TermCmds.play('defender'); }, cat:'Game', desc:'Defend sprint from scope creep', keys:'' },
      { name:'Snake Game',             icon:'🐍', action:()=>{ if(window.openGame)window.openGame(); },                cat:'Game', desc:'Classic snake with data theme', keys:'' },
      // Features
      { name:'Zen Mode',               icon:'🧘', action:()=>{ const b=document.getElementById('zenBtn'); if(b) b.click(); }, cat:'Feature', desc:'Toggle minimal reading mode', keys:'Z' },
      { name:'Cyberpunk Theme',        icon:'🌆', action:()=>{ if(window._toggleCyberpunk)window._toggleCyberpunk(true); }, cat:'Feature', desc:'Neon city theme overlay', keys:'C' },
      { name:'3D Book Viewer',         icon:'📦', action:()=>launchCmd('book3d'),            cat:'Feature', desc:'Interactive 3D book model', keys:'' },
      { name:'Data Mesh 3D',           icon:'🔀', action:()=>launchCmd('datamesh'),          cat:'Feature', desc:'3D data mesh visualization', keys:'' },
      { name:'Guestbook',              icon:'🌍', action:()=>openGuestbook(),                cat:'Feature', desc:'Sign the visitor wall', keys:'G' },
      { name:'Voice Navigation',       icon:'🎙️', action:()=>toggleVoice(),                  cat:'Feature', desc:'Speak commands hands-free', keys:'V' },
      // System
      { name:'Open Terminal',           icon:'💻', action:()=>{ if(window.openTerm) window.openTerm(); }, cat:'System', desc:'Full terminal interface', keys:'T' },
      { name:'Ask Amr (AI Chat)',       icon:'🤖', action:()=>{ if(window.openTerm) window.openTerm(); }, cat:'System', desc:'Chat with AI assistant', keys:'' },
      { name:'Keyboard Shortcuts',      icon:'⌨️', action:()=>{ const o=document.getElementById('shortcutOverlay'); if(o) o.classList.add('show'); }, cat:'System', desc:'View all shortcuts', keys:'?' },
      { name:'Trophy Case',             icon:'🏆', action:()=>{ if(window._openTrophies) window._openTrophies(); }, cat:'System', desc:'View achievements & progress', keys:'' },
      { name:'Visitor Insights',        icon:'📊', action:()=>{ if(window.TermCmds?.admin) window.TermCmds.admin(); }, cat:'System', desc:'Analytics dashboard', keys:'' },
      // Certs (searchable)
      { name:'PMP Certification',       icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Project Management Professional', keys:'' },
      { name:'SAFe 6 Scrum Master',     icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Scaled Agile Framework', keys:'' },
      { name:'PSM II',                  icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Professional Scrum Master II', keys:'' },
      { name:'PSPO II',                 icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Professional Scrum Product Owner II', keys:'' },
      { name:'PMI-ACP',                 icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Agile Certified Practitioner', keys:'' },
      { name:'CDMP Data Management',    icon:'🎯', action:()=>scrollTo('#certGrid'), cat:'Cert', desc:'Certified Data Management Professional', keys:'' },
      // Timeline filters (quick access)
      { name:'Filter: Banking',         icon:'🏦', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('banking'); }, cat:'Filter', desc:'Timeline → Banking items', keys:'' },
      { name:'Filter: Agile',           icon:'⚡', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('agile'); }, cat:'Filter', desc:'Timeline → Agile items', keys:'' },
      { name:'Filter: Data',            icon:'📊', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('data'); }, cat:'Filter', desc:'Timeline → Data items', keys:'' },
      { name:'Filter: Speaking',        icon:'🎤', action:()=>{ if(window.TermCmds?.timeline) window.TermCmds.timeline('speaking'); }, cat:'Filter', desc:'Timeline → Speaking items', keys:'' },
    ];

    function scrollTo(sel) { const el = document.querySelector(sel); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
    function clickLink(partial) { const lk = document.querySelector(`a.lk[href*="${partial}"]`); if(lk) lk.click(); }
    function launchCmd(cmd) { if(window.TermCmds) { const parts=cmd.split(' '); const fn=window.TermCmds[parts[0]]; if(fn) fn(parts.slice(1).join(' ')); } }

    // Fuzzy match scoring
    function fuzzyScore(query, text) {
      const q = query.toLowerCase(), t = text.toLowerCase();
      if (t === q) return 100;
      if (t.startsWith(q)) return 80;
      if (t.includes(q)) return 60;
      // Fuzzy: all chars present in order
      let qi = 0, score = 0;
      for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) { score += (ti === 0 || t[ti-1] === ' ' ? 15 : 5); qi++; }
      }
      return qi === q.length ? score : 0;
    }

    const overlay = document.createElement('div');
    overlay.id = 'cmdPaletteOverlay';
    overlay.addEventListener('click', e => { if(e.target === overlay) closePalette(); });
    overlay.innerHTML = `
      <div class="cmd-palette">
        <div class="cmd-input-wrap">
          <span class="cmd-input-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
          <input class="cmd-input" id="cmdInput" placeholder="Type to search sections, games, features, certs..." autocomplete="off" spellcheck="false">
          <span class="cmd-input-hint">ESC</span>
        </div>
        <div class="cmd-results" id="cmdResults"></div>
        <div class="cmd-footer"><span>↑↓ navigate</span><span>↵ select</span><span>tab category</span><span>esc close</span></div>
      </div>`;
    document.body.appendChild(overlay);

    const input = document.getElementById('cmdInput');
    const resultsEl = document.getElementById('cmdResults');
    let activeIdx = 0, filtered = [], catFilter = null;

    function getFiltered(q) {
      let list = REGISTRY;
      if (catFilter) list = list.filter(i => i.cat === catFilter);
      if (!q) {
        // Show MRU first, then all grouped by category
        const mru = getMRU();
        const mruItems = mru.map(n => list.find(i => i.name === n)).filter(Boolean);
        const rest = list.filter(i => !mru.includes(i.name));
        return [...mruItems, ...rest];
      }
      return list
        .map(i => ({ item: i, score: Math.max(fuzzyScore(q, i.name), fuzzyScore(q, i.desc||''), fuzzyScore(q, i.cat)) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(r => r.item);
    }

    function openPalette() { overlay.classList.add('show'); input.value=''; activeIdx=0; catFilter=null; filtered=getFiltered(''); render(); setTimeout(()=>input.focus(),80); autoDismiss('cmdPaletteOverlay',closePalette); }
    function closePalette() { overlay.classList.remove('show'); input.blur(); cancelAutoDismiss('cmdPaletteOverlay'); }

    function render() {
      if (!filtered.length) { resultsEl.innerHTML = '<div class="cmd-empty">No results found — try different keywords</div>'; return; }
      const q = input.value.toLowerCase();
      let lastCat = '';
      let html = '';
      filtered.forEach((item, i) => {
        // Category header
        if (item.cat !== lastCat && !q) {
          lastCat = item.cat;
          const isFirst = i === 0 && getMRU().includes(item.name);
          html += `<div class="cmd-cat-header">${isFirst ? '⏱ Recent' : item.cat}</div>`;
        }
        const name = q ? item.name.replace(new RegExp(`(${escRegex(q)})`, 'gi'), '<mark>$1</mark>') : item.name;
        html += `<div class="cmd-item ${i===activeIdx?'active':''}" data-idx="${i}">
          <span class="cmd-item-icon">${item.icon}</span>
          <div class="cmd-item-text">
            <div class="cmd-item-name">${name}</div>
            ${item.desc ? `<div class="cmd-item-desc">${item.desc}</div>` : ''}
          </div>
          ${item.keys ? `<span class="cmd-item-key">${item.keys}</span>` : ''}
          <span class="cmd-item-badge">${item.cat}</span>
        </div>`;
      });
      resultsEl.innerHTML = html;
      resultsEl.querySelectorAll('.cmd-item').forEach(el => el.addEventListener('click', ()=>select(parseInt(el.dataset.idx))));
      const ae = resultsEl.querySelector('.cmd-item.active'); if(ae) ae.scrollIntoView({block:'nearest'});
    }

    function select(idx) {
      const item=filtered[idx]; if(!item)return;
      addMRU(item.name);
      closePalette();
      setTimeout(()=>item.action(),120);
      if(window.VDna) window.VDna.addXp(2);
      if(typeof checkTrophy==='function') checkTrophy('palette_used');
    }

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      filtered = getFiltered(q);
      activeIdx = 0; render();
    });
    input.addEventListener('keydown', e => {
      if(e.key==='ArrowDown'){e.preventDefault();activeIdx=Math.min(activeIdx+1,filtered.length-1);render();}
      else if(e.key==='ArrowUp'){e.preventDefault();activeIdx=Math.max(activeIdx-1,0);render();}
      else if(e.key==='Enter'){e.preventDefault();select(activeIdx);}
      else if(e.key==='Escape'){closePalette();}
      else if(e.key==='Tab'){
        e.preventDefault();
        const cats = [...new Set(REGISTRY.map(i=>i.cat))];
        const curIdx = catFilter ? cats.indexOf(catFilter) : -1;
        catFilter = cats[(curIdx+1) % cats.length] || null;
        if (curIdx + 1 >= cats.length) catFilter = null; // cycle back to all
        filtered = getFiltered(input.value.toLowerCase().trim());
        activeIdx = 0; render();
      }
    });

    document.addEventListener('keydown', e => { if((e.metaKey||e.ctrlKey)&&(String(e.key).toLowerCase()==='k'||e.code==='KeyK')){e.preventDefault();overlay.classList.contains('show')?closePalette():openPalette();} });

    window.TermCmds = window.TermCmds || {};
    window.TermCmds.search=()=>{setTimeout(openPalette,200);return'<span class="term-green">Opening command palette...</span>';};
    window.TermCmds.find=window.TermCmds.search;
    window._openPalette = openPalette;
    window._closePalette = closePalette;
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 2: TROPHY CASE & PROGRESS TRACKER
  // ═══════════════════════════════════════════════════
  // 24 achievements · site exploration progress · arcade integration · engagement score

  const TROPHIES = [
    // Exploration (auto-tracked via scroll)
    { id:'explorer_timeline',   icon:'🗺️', name:'Timeline Explorer',      desc:'Scrolled through the full career timeline', cat:'Explore', xp:5 },
    { id:'explorer_certs',      icon:'📜', name:'Cert Collector',          desc:'Viewed the certifications grid', cat:'Explore', xp:5 },
    { id:'explorer_testimonials',icon:'⭐', name:'Social Proof',           desc:'Read the testimonials section', cat:'Explore', xp:5 },
    { id:'explorer_conferences', icon:'🎤', name:'Conference Goer',        desc:'Discovered the conferences section', cat:'Explore', xp:5 },
    { id:'explorer_articles',   icon:'📝', name:'Article Reader',          desc:'Scrolled to LinkedIn articles', cat:'Explore', xp:5 },
    { id:'explorer_impact',     icon:'📊', name:'Numbers Person',          desc:'Viewed impact numbers section', cat:'Explore', xp:5 },
    { id:'explorer_contact',    icon:'📧', name:'Connector',               desc:'Revealed contact information', cat:'Explore', xp:10 },
    { id:'explorer_full',       icon:'🌟', name:'Full Site Explorer',      desc:'Visited every major section', cat:'Explore', xp:25 },
    // Arcade
    { id:'arcade_first',        icon:'🕹️', name:'First Play',             desc:'Played your first arcade game', cat:'Arcade', xp:10 },
    { id:'arcade_5plays',       icon:'🎮', name:'Arcade Regular',          desc:'Played 5+ arcade games', cat:'Arcade', xp:15 },
    { id:'arcade_highscore',    icon:'🏅', name:'High Scorer',             desc:'Set a high score in any game', cat:'Arcade', xp:15 },
    { id:'arcade_allgames',     icon:'👑', name:'Game Master',             desc:'Played every arcade game at least once', cat:'Arcade', xp:25 },
    { id:'arcade_boss',         icon:'⚔️', name:'Boss Defeated',           desc:'Beat the final boss', cat:'Arcade', xp:30 },
    // Engagement
    { id:'guestbook_signed',    icon:'✍️', name:'Wall Signer',            desc:'Left a mark in the guestbook', cat:'Social', xp:10 },
    { id:'voice_used',          icon:'🎙️', name:'Voice Commander',        desc:'Used voice navigation', cat:'Social', xp:10 },
    { id:'palette_used',        icon:'⌨️', name:'Power User',             desc:'Used the command palette', cat:'Social', xp:5 },
    { id:'terminal_used',       icon:'💻', name:'Terminal Hacker',         desc:'Opened the terminal', cat:'Social', xp:5 },
    { id:'theme_cyberpunk',     icon:'🌆', name:'Cyberpunk Activated',    desc:'Enabled the cyberpunk theme', cat:'Social', xp:5 },
    { id:'theme_zen',           icon:'🧘', name:'Zen Master',             desc:'Toggled Zen Mode', cat:'Social', xp:5 },
    { id:'networking_event',    icon:'👥', name:'Networking Event',        desc:'Was on the site at the same time as another visitor', cat:'Social', xp:15 },
    { id:'team_player',        icon:'✋', name:'Team Player',             desc:'Mutual high-five with another user', cat:'Social', xp:25 },
    { id:'hacker_coop',        icon:'🔓', name:'Hacker',                 desc:'Co-op unlocked the dual-lock sequence with another user', cat:'Social', xp:30 },
    { id:'angel_investor',     icon:'🛡️', name:'Angel Investor',         desc:'Sent a power-up to another player', cat:'Social', xp:10 },
    { id:'critical_mass',      icon:'⚡', name:'Mainframe Overload',     desc:'5+ users online simultaneously', cat:'Social', xp:20 },
    { id:'smart_trader',       icon:'📜', name:'Smart Trader',           desc:'Executed a Smart Contract token', cat:'Social', xp:15 },
    // Milestones
    { id:'visit_3',             icon:'🔄', name:'Returning Visitor',       desc:'Came back 3+ times', cat:'Milestone', xp:10 },
    { id:'visit_10',            icon:'💎', name:'Loyal Visitor',           desc:'Visited 10+ times', cat:'Milestone', xp:20 },
    { id:'xp_50',               icon:'⚡', name:'XP Collector',           desc:'Earned 50+ XP', cat:'Milestone', xp:10 },
    { id:'xp_200',              icon:'🔥', name:'XP Hoarder',             desc:'Earned 200+ XP', cat:'Milestone', xp:20 },
    { id:'completionist',       icon:'🏆', name:'Completionist',          desc:'Unlocked 20+ trophies', cat:'Milestone', xp:50 },
  ];

  // Exploration tracking
  const SECTIONS = {
    explorer_timeline:    '.tl-wrap',
    explorer_certs:       '#certGrid',
    explorer_testimonials:'.tc-section',
    explorer_conferences: '.conf-strip',
    explorer_articles:    '#linkedinFeed',
    explorer_impact:      '.imp',
  };

  function checkTrophy(id) {
    const vdna = window.VDna ? window.VDna.get() : {};
    const unlocked = vdna.unlocked || {};
    if (unlocked[id]) return false;
    if (window.VDna) {
      if (!window.VDna.get().unlocked) window.VDna.get().unlocked = {};
      window.VDna.get().unlocked[id] = Date.now();
      const trophy = TROPHIES.find(t => t.id === id);
      if (trophy) window.VDna.addXp(trophy.xp);
      window.VDna.save();
    }
    return true;
  }
  window.checkTrophy = checkTrophy;

  function initTrophySystem() {
    // Scroll-based exploration tracker
    let exploredSections = new Set();
    function checkExploration() {
      const viewH = window.innerHeight;
      for (const [trophyId, selector] of Object.entries(SECTIONS)) {
        if (exploredSections.has(trophyId)) continue;
        const el = document.querySelector(selector);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < viewH * 0.7 && r.bottom > viewH * 0.3) {
          exploredSections.add(trophyId);
          if (checkTrophy(trophyId)) showTrophyToast(trophyId);
          // Check full explorer
          if (exploredSections.size >= Object.keys(SECTIONS).length) {
            if (checkTrophy('explorer_full')) showTrophyToast('explorer_full');
          }
        }
      }
    }
    window.addEventListener('scroll', () => requestAnimationFrame(checkExploration), { passive: true });
    setTimeout(checkExploration, 6000);

    // Visit milestone tracking
    const vdna = window.VDna ? window.VDna.get() : {};
    const visits = vdna.visits || 1;
    if (visits >= 3) checkTrophy('visit_3');
    if (visits >= 10) checkTrophy('visit_10');
    const xp = vdna.xp || 0;
    if (xp >= 50) checkTrophy('xp_50');
    if (xp >= 200) checkTrophy('xp_200');

    // Arcade tracking
    const arcade = JSON.parse(localStorage.getItem('arcade_state')||'{}');
    if ((arcade.totalPlays||0) >= 1) checkTrophy('arcade_first');
    if ((arcade.totalPlays||0) >= 5) checkTrophy('arcade_5plays');
    if (arcade.bossBeaten) checkTrophy('arcade_boss');
    const hs = arcade.highScores || {};
    if (Object.keys(hs).length > 0) checkTrophy('arcade_highscore');
    if (Object.keys(hs).length >= 4) checkTrophy('arcade_allgames');

    // Completionist check
    const unlocked = vdna.unlocked || {};
    if (Object.keys(unlocked).length >= 20) checkTrophy('completionist');
  }

  function showTrophyToast(id) {
    const trophy = TROPHIES.find(t => t.id === id);
    if (!trophy) return;
    // Only show toast for non-exploration trophies (exploration is too frequent/noisy)
    const silentTrophies = ['explorer_timeline','explorer_certs','explorer_testimonials','explorer_conferences','explorer_articles','explorer_impact'];
    if (silentTrophies.includes(id)) return;
    const toast = document.createElement('div');
    toast.className = 'trophy-toast';
    toast.innerHTML = `<span class="trophy-toast-icon">${trophy.icon}</span><div><strong>${trophy.name}</strong><br><span>${trophy.desc}</span></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 2500);
  }
  window.showTrophyToast = showTrophyToast;

  function initAdminDashboard() {
    const overlay = document.createElement('div');
    overlay.id = 'adminOverlay';
    overlay.addEventListener('click', e => { if(e.target===overlay) closeAdmin(); });
    overlay.innerHTML = `<div class="admin-panel" id="adminPanel"></div>`;
    document.body.appendChild(overlay);

    function openAdmin() { renderAdmin(); overlay.classList.add('show'); autoDismiss(overlay.id,closeAdmin); }
    function closeAdmin() { overlay.classList.remove('show'); cancelAutoDismiss(overlay.id); }
    window._closeAdmin = closeAdmin;
    window._openTrophies = openAdmin;

    async function renderAdmin() {
      const panel=document.getElementById('adminPanel');
      const vdna=window.VDna?window.VDna.get():{};
      const arcade=JSON.parse(localStorage.getItem('arcade_state')||'{}');
      let gbCount = 0;
      try { if (_sb) { const { count } = await _sb.from('guestbook_entries').select('*', { count: 'exact', head: true }); gbCount = count || 0; } } catch(e) {}
      const xp=vdna.xp||0, level=vdna.level||1, visits=vdna.visits||1;
      const unlocked=vdna.unlocked||{};
      const unlockedCount=Object.keys(unlocked).length;
      const totalTrophies=TROPHIES.length;
      const totalPlays=arcade.totalPlays||0;
      const highScores=arcade.highScores||{};

      // Engagement score (weighted)
      const exploredCount = Object.keys(SECTIONS).filter(id => unlocked[id]).length;
      const exploredPct = Math.round((exploredCount / Object.keys(SECTIONS).length) * 100);
      const arcadePct = Math.min(100, Math.round(totalPlays * 10));
      const socialPct = Math.min(100, (gbCount > 0 ? 25 : 0) + (unlocked.voice_used ? 25 : 0) + (unlocked.palette_used ? 25 : 0) + (unlocked.terminal_used ? 25 : 0));
      const overallPct = Math.round((exploredPct * 0.4) + (arcadePct * 0.3) + (socialPct * 0.3));

      // Trophy grid by category
      const cats = ['Explore','Arcade','Social','Milestone'];
      const trophyGrid = cats.map(cat => {
        const trophies = TROPHIES.filter(t => t.cat === cat);
        const rows = trophies.map(t => {
          const isUnlocked = !!unlocked[t.id];
          return `<div class="trophy-item ${isUnlocked ? 'unlocked' : 'locked'}">
            <span class="trophy-icon">${isUnlocked ? t.icon : '🔒'}</span>
            <div class="trophy-meta">
              <div class="trophy-name">${t.name}</div>
              <div class="trophy-desc">${isUnlocked ? t.desc : '???'}</div>
            </div>
            ${isUnlocked ? `<span class="trophy-xp">+${t.xp}xp</span>` : ''}
          </div>`;
        }).join('');
        return `<div class="admin-section">
          <div class="admin-section-title">${cat} (${trophies.filter(t=>unlocked[t.id]).length}/${trophies.length})</div>
          ${rows}
        </div>`;
      }).join('');

      // Game scores
      const gameNames = { stacker:'Sprint Stacker', router:'Data Mesh Router', trader:'FinTech Trader', bilingual:'Bilingual Swipe', snake:'Snake' };
      const gameRows = Object.entries(highScores).map(([id,score]) =>
        `<div class="admin-row"><span class="admin-row-label">${gameNames[id]||id}</span><span class="admin-row-val">${score}</span></div>`
      ).join('') || '<div class="admin-row"><span class="admin-row-label" style="opacity:.4">No games played yet</span></div>';

      panel.innerHTML = `
        <div class="admin-title">🏆 Trophy Case & Progress</div>
        <div class="admin-grid">
          <div class="admin-stat"><div class="admin-stat-val">${xp}</div><div class="admin-stat-label">Total XP</div></div>
          <div class="admin-stat"><div class="admin-stat-val">LVL ${level}</div><div class="admin-stat-label">Level</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${unlockedCount}/${totalTrophies}</div><div class="admin-stat-label">Trophies</div></div>
          <div class="admin-stat"><div class="admin-stat-val">${visits}</div><div class="admin-stat-label">Visits</div></div>
        </div>
        <div class="admin-section">
          <div class="admin-section-title">Site Progress</div>
          <div class="admin-bar-wrap"><span class="admin-bar-label">Explored</span><div class="admin-bar-track"><div class="admin-bar-fill" style="width:${exploredPct}%;background:linear-gradient(90deg,#22c55e,#00e1ff)"></div></div><span class="admin-bar-val">${exploredPct}%</span></div>
          <div class="admin-bar-wrap"><span class="admin-bar-label">Arcade</span><div class="admin-bar-track"><div class="admin-bar-fill" style="width:${arcadePct}%;background:linear-gradient(90deg,#f59e0b,#ef4444)"></div></div><span class="admin-bar-val">${arcadePct}%</span></div>
          <div class="admin-bar-wrap"><span class="admin-bar-label">Social</span><div class="admin-bar-track"><div class="admin-bar-fill" style="width:${socialPct}%;background:linear-gradient(90deg,#8b5cf6,#ec4899)"></div></div><span class="admin-bar-val">${socialPct}%</span></div>
          <div class="admin-bar-wrap"><span class="admin-bar-label"><strong>Overall</strong></span><div class="admin-bar-track"><div class="admin-bar-fill" style="width:${overallPct}%;background:linear-gradient(90deg,#00e1ff,#6366f1,#a855f7)"></div></div><span class="admin-bar-val"><strong>${overallPct}%</strong></span></div>
        </div>
        <div class="admin-section">
          <div class="admin-section-title">Arcade Scores</div>
          ${gameRows}
          <div class="admin-row"><span class="admin-row-label">Total Plays</span><span class="admin-row-val">${totalPlays}</span></div>
          <div class="admin-row"><span class="admin-row-label">Boss Defeated</span><span class="admin-row-val">${arcade.bossBeaten?'Yes ✅':'Not yet'}</span></div>
        </div>
        ${trophyGrid}
        <div class="admin-close" onclick="window._closeAdmin()">[ ESC or tap to close ]</div>`;
    }

    window.TermCmds = window.TermCmds || {};
    window.TermCmds.admin=()=>{setTimeout(openAdmin,200);return'<span style="color:#ef4444">🔒 Opening Trophy Case & Progress...</span>';};
    window.TermCmds.stats=window.TermCmds.admin;
    window.TermCmds.insights=window.TermCmds.admin;
    window.TermCmds.trophies=window.TermCmds.admin;
    window.TermCmds.trophy=window.TermCmds.admin;
    window.TermCmds.progress=window.TermCmds.admin;
    window.TermCmds.achievements=window.TermCmds.admin;
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 0: ALWAYS-VISIBLE CTA BUTTONS
  // ═══════════════════════════════════════════════════

  function initAlwaysCTA() {
    // Smart insertion: try multiple strategies to find the right spot
    // 1) After the last .lk (link card) row
    // 2) After .bio or description area
    // 3) Before .imp (impact numbers)
    // 4) After #app > div first child flex container
    let anchor = null;
    let position = 'afterend';

    // Strategy 1: Find last link card container
    const allLinks = document.querySelectorAll('a.lk');
    if (allLinks.length) {
      const lastLk = allLinks[allLinks.length - 1];
      // Walk up to the flex row containing link cards
      anchor = lastLk.closest('div[style*="flex"]') || lastLk.closest('.rv') || lastLk.parentElement;
    }

    // Strategy 2: Find the value proposition / bio area
    if (!anchor) {
      anchor = document.querySelector('.vp') || document.querySelector('#vpText') || document.querySelector('.imp');
    }

    // Strategy 3: Insert before impact numbers section
    if (!anchor) {
      const imp = document.querySelector('.imp');
      if (imp) { anchor = imp; position = 'beforebegin'; }
    }

    // Strategy 4: After the main profile container
    if (!anchor) {
      anchor = document.querySelector('#app > div > div') || document.querySelector('#app > div');
      if (anchor) {
        // Find a reasonable child element after the header
        const children = anchor.children;
        if (children.length > 3) { anchor = children[3]; position = 'afterend'; }
      }
    }

    if (!anchor) return;

    // Check we haven't already injected
    if (document.querySelector('.always-cta-row')) return;

    const row = document.createElement('div');
    row.className = 'always-cta-row rv';
    row.innerHTML = `
      <a href="https://www.linkedin.com/in/amrmelharony" target="_blank" rel="noopener"
         class="always-cta always-cta-linkedin">
        <i class="fa-brands fa-linkedin"></i> LinkedIn
      </a>
      <a href="https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session" target="_blank" rel="noopener"
         class="always-cta always-cta-mentor">
        <img src="Adplist.png" alt="ADPList" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;"> Get Mentored
      </a>`;

    anchor.insertAdjacentElement(position, row);

    // Animate in with GSAP if available
    if (window.gsap) {
      gsap.fromTo(row, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, delay: 2.2, ease: 'power3.out' });
    } else {
      row.style.opacity = '0'; row.style.transform = 'translateY(20px)';
      row.style.transition = 'opacity .6s ease, transform .6s ease';
      setTimeout(() => { row.style.opacity = '1'; row.style.transform = 'none'; }, 2200);
    }
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 3: INTERACTIVE TIMELINE — MINIMAL ENGINE
  // ═══════════════════════════════════════════════════

  function initInteractiveTimeline() {
    const tlWrap = document.querySelector('.tl-wrap');
    if (!tlWrap) return;
    const items = Array.from(tlWrap.querySelectorAll('.tl-item'));
    if (!items.length) return;

    tlWrap.style.position = 'relative';

    // ─── TAG CLASSIFICATION ───
    const TAGS = {
      banking:  ['bank','banque','misr','operations','financial','treasury','officer','credit','sme','business banking','corporate','lending'],
      agile:    ['scrum','agile','kanban','safe','sprint','delivery','pmp','lead','hybrid','standup','retrospective','backlog'],
      data:     ['data','analytics','cdmp','warehouse','pipeline','governance','mesh','analyst','bi','dashboard','report','datacamp'],
      speaking: ['speak','conference','seamless','devopsdays','keynote','panel','summit','techne','forum','moderator','career summit','techup'],
      learning: ['cert','degree','doctorate','dba','learn','study','university','award','earned','mba','frankfurt','helwan','bachelor','best learner','toastmasters'],
      author:   ['book','bilingual','executive','author','publish','write','community','founded','launched','fintech bilinguals'],
      mentor:   ['mentor','adplist','coaching','mentee','session','guidance','1000 min'],
      military: ['armed forces','military','army','officer','security','defense','technology officer'],
      fintech:  ['fintech','efa','egyptian fintech','startup','consultant','pro bono','association','ecosystem'],
      intern:   ['intern','nissan','central bank','exchange','mcdr','clearing','reinsurance','jazira'],
    };

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const tags = [];
      for (const [tag, keywords] of Object.entries(TAGS)) {
        if (keywords.some(kw => text.includes(kw))) tags.push(tag);
      }
      if (!tags.length) tags.push('general');
      item.dataset.tags = tags.join(',');
    });

    // ─── ROLE-SPECIFIC DETAILS (matched by keywords in timeline items) ───
    const ROLE_MAP = [
      {
        match: ['scrum master', '2025', 'scrum/kanban', 'flow metrics'],
        html: `<strong>Scrum Master — Banque Misr</strong> <span class="tl-expand-date">May 2025 – Present</span>
          <p>Championed a hybrid Scrum/Kanban framework for the data analytics team, using flow metrics to identify and eliminate systemic bottlenecks and improve delivery predictability.</p>
          <p>Serves as the key leadership bridge between technical data teams and business stakeholders, translating strategic goals into actionable work.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">⚡ Hybrid Scrum/Kanban</span><span class="tl-expand-metric">📈 Flow Metrics</span><span class="tl-expand-metric">🎯 PMP® + PSM II + ICP-ATF</span></div>
          <div class="tl-expand-skills">Agile Methodologies · Servant Leadership · Flow Metrics & Predictability</div>`
      },
      {
        match: ['corporate banking data analyst', 'data analyst', 'bi report', 'dashboard'],
        html: `<strong>Corporate Banking Data Analyst — Banque Misr</strong> <span class="tl-expand-date">Jun 2021 – May 2025 · 4 yrs</span>
          <p>Strategic pivot from project management into a hands-on data role to master the bank's core data assets — bridging the gap between project goals and data realities.</p>
          <p>Designed and delivered critical BI reports and dashboards for senior leadership, directly influencing corporate banking strategy. Skills validated by DataCamp Professional certification.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">📊 BI Dashboards</span><span class="tl-expand-metric">🏦 Corporate Banking Strategy</span><span class="tl-expand-metric">💾 DataCamp Certified</span></div>
          <div class="tl-expand-skills">Stakeholder Management · Business Intelligence (BI)</div>`
      },
      {
        match: ['project management professional', 'pmp', 'cross-functional', 'scope, schedule'],
        html: `<strong>Project Management Professional — Banque Misr</strong> <span class="tl-expand-date">Feb 2020 – Jun 2021 · 1 yr 5 mos</span>
          <p>Applied a disciplined, PMP®-certified approach to lead end-to-end delivery of complex, cross-functional banking projects — rigorously managing scope, schedule, and budget in a regulated enterprise environment.</p>
          <p>Identified data integrity as the primary success factor for key initiatives — the critical insight that motivated specialization in data analytics.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎯 PMP® Certified</span><span class="tl-expand-metric">🏗️ Cross-Functional Delivery</span><span class="tl-expand-metric">🔍 Data Integrity Focus</span></div>
          <div class="tl-expand-skills">Risk Management · Scope Management · Regulated Environment</div>`
      },
      {
        match: ['sme', 'credit analyst', 'lending', 'portfolio risk'],
        html: `<strong>SMEs Credit Analyst — Banque Misr</strong> <span class="tl-expand-date">Nov 2017 – Feb 2020 · 2 yrs 4 mos</span>
          <p>Assessed financial health of corporate clients, managed portfolio risk, and made informed lending recommendations. This role was foundational for developing deep commercial acumen.</p>
          <p>Understanding core business drivers of clients became vital context for later work in technology delivery.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">💰 Credit Risk Analysis</span><span class="tl-expand-metric">📑 Financial Statements</span><span class="tl-expand-metric">🤝 Client Portfolio</span></div>
          <div class="tl-expand-skills">Credit Risk Analysis · Financial Statement Analysis · Commercial Acumen</div>`
      },
      {
        match: ['business banking officer', 'financial advisor', 'small business'],
        html: `<strong>Business Banking Officer — Banque Misr</strong> <span class="tl-expand-date">Nov 2016 – Nov 2017 · 1 yr 1 mo</span>
          <p>Served as a trusted financial advisor and Accredited Small Business Consultant for a diverse portfolio of business clients, helping them achieve commercial goals.</p>
          <p>This client-facing role was foundational for developing deep customer empathy — an invaluable understanding of user needs that drives modern FinTech product development.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">👤 Client Advisory</span><span class="tl-expand-metric">🏢 SME Portfolio</span><span class="tl-expand-metric">💡 Customer Empathy</span></div>
          <div class="tl-expand-skills">Relationship Management · Commercial Acumen · Client Needs Analysis</div>`
      },
      {
        match: ['armed forces', 'military', 'technology officer', 'digital security'],
        html: `<strong>Technology Officer | IT & Digital Security — Egyptian Armed Forces</strong> <span class="tl-expand-date">Jan 2015 – Mar 2016 · 1 yr 3 mos</span>
          <p>Commanded IT and digital security operations for a mission-critical unit, ensuring 100% uptime and integrity of vital systems in a high-stakes, zero-failure environment.</p>
          <p>Developed foundational expertise in IT infrastructure, network security, and disciplined operational management — a security-first mindset that now informs building resilient financial technology.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🛡️ 100% Uptime</span><span class="tl-expand-metric">🔐 Digital Security</span><span class="tl-expand-metric">⭐ Leadership Commendation</span></div>
          <div class="tl-expand-skills">Cybersecurity · Leadership Under Pressure · IT Infrastructure</div>`
      },
      {
        match: ['intern', 'nissan', 'central bank', 'exchange', 'mcdr', 'clearing'],
        html: `<strong>Finance & Banking Internships</strong> <span class="tl-expand-date">Jul 2011 – Jul 2014 · 3 yrs</span>
          <p>Built a robust and diverse foundation through competitive internships at Egypt's leading institutions — hands-on exposure to corporate finance, capital markets, and regulatory supervision.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏭 Nissan Motor Corp</span><span class="tl-expand-metric">🏛️ Central Bank of Egypt</span><span class="tl-expand-metric">📈 Egyptian Exchange</span><span class="tl-expand-metric">🔄 MCDR</span></div>
          <div class="tl-expand-skills">Corporate Finance · Capital Markets · Investment Analysis</div>`
      },
      {
        match: ['adplist', 'mentor', '1000 min', 'top 50'],
        html: `<strong>Leadership & Technology Mentor — ADPList</strong> <span class="tl-expand-date">Oct 2023 – Present · 2 yrs+</span>
          <p>Globally recognized as a Top 50 Mentor in Project Management on the ADPList platform. Dedicated 1,000+ minutes to coaching rising professionals in FinTech, data, and digital transformation.</p>
          <p>Empowers mentees to navigate complex career pivots, develop strategic skills, and accelerate into leadership roles.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏅 Top 50 PM Mentor</span><span class="tl-expand-metric">⏱️ 1,000+ Minutes</span><span class="tl-expand-metric">🌍 Global Remote</span></div>`
      },
      {
        match: ['fintech bilinguals', 'founder', 'community'],
        html: `<strong>Founder — Fintech Bilinguals</strong> <span class="tl-expand-date">Feb 2026 – Present</span>
          <p>Founded a community bridging the gap between Arabic-speaking finance professionals and global fintech knowledge — making cutting-edge concepts accessible across language barriers.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🤝 Community Builder</span><span class="tl-expand-metric">🌐 Bilingual</span></div>`
      },
      {
        match: ['egyptian fintech association', 'efa', 'pro bono', 'management consultant'],
        html: `<strong>FinTech Management Consultant (Pro Bono) — EFA</strong> <span class="tl-expand-date">Oct 2019 – Present · 6 yrs+</span>
          <p>Strategic advisor to Egyptian FinTech startups — providing pro bono consulting on go-to-market strategy, business model validation, and regulatory compliance.</p>
          <p>Facilitates industry roundtables and contributes to the national FinTech ecosystem, bridging startups, incumbents, and investors.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🚀 Startup Advisory</span><span class="tl-expand-metric">🏛️ Ecosystem Building</span><span class="tl-expand-metric">💼 6+ Years Pro Bono</span></div>`
      },
      {
        match: ['doctorate', 'dba', 'digital transformation', 'e-hrm'],
        html: `<strong>DBA — Digital Transformation · Helwan University</strong> <span class="tl-expand-date">Completed Dec 2023</span>
          <p>Doctoral research on banking innovation, FinTech, and AI-driven transformation. Thesis: "The Relationship Between E-HRM Systems and Employee Satisfaction in Banking."</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎓 Doctorate</span><span class="tl-expand-metric">🤖 AI & Banking</span><span class="tl-expand-metric">📖 Published Research</span></div>`
      },
      {
        match: ['mba', 'entrepreneurship', 'startup strategy'],
        html: `<strong>MBA — Entrepreneurship · Helwan University</strong> <span class="tl-expand-date">Completed May 2019</span>
          <p>Specialized in startup strategy, product development, and digital finance. Developed a comprehensive business model for FinTech startup growth in the MENA region.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">📈 Startup Strategy</span><span class="tl-expand-metric">💡 Product Dev</span><span class="tl-expand-metric">🌍 MENA Focus</span></div>`
      },
      {
        match: ['bachelor', 'ba,', 'international economics'],
        html: `<strong>BA — International Economics · Helwan University</strong> <span class="tl-expand-date">Completed May 2014</span>
          <p>Strong analytical foundation in global finance, macroeconomics, and international trade — essential context for a career at the intersection of banking and technology.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🌐 Global Finance</span><span class="tl-expand-metric">📊 Economics</span></div>`
      },
      {
        match: ['frankfurt', 'digital finance', 'executive program'],
        html: `<strong>Certified Expert in Digital Finance — Frankfurt School</strong> <span class="tl-expand-date">Aug 2019</span>
          <p>Rigorous executive program at one of Europe's top business schools. Deep expertise in AI-driven finance, platform economics, and digital banking strategy.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🇩🇪 Frankfurt School</span><span class="tl-expand-metric">🤖 AI Finance</span><span class="tl-expand-metric">🏦 Digital Banking</span></div>`
      },
      {
        match: ['best learner', 'continuous professional', 'growth mindset'],
        html: `<strong>Best Learner Award — Banque Misr</strong> <span class="tl-expand-date">Dec 2023</span>
          <p>Recognized by bank leadership for outstanding commitment to continuous professional development and proactively acquiring high-value skills in digital transformation and agile methodologies.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏆 Bank Recognition</span><span class="tl-expand-metric">📚 Growth Mindset</span></div>`
      },
      {
        match: ['seamless', 'north africa', 'keynote interview'],
        html: `<strong>Panel Moderator — Seamless North Africa</strong> <span class="tl-expand-date">Sep 2024</span>
          <p>Moderated 4 panels + 1 keynote interview at the region's premier FinTech conference. Led discussions on digital banking, open innovation, and APIs with leaders from N26, Deutsche Bank, BNP Paribas, Mashreq, and Citi Bank.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎤 4 Panels + Keynote</span><span class="tl-expand-metric">🏦 Global Bank Leaders</span><span class="tl-expand-metric">🌍 MENA Premier</span></div>`
      },
      {
        match: ['devopsdays', 'ai & devops', 'ai-driven automation'],
        html: `<strong>Speaker — DevOpsDays Cairo 2025</strong> <span class="tl-expand-date">Sep 2025</span>
          <p>"AI & DevOps — Powering the Next Wave of Egyptian Fintech": exploring how AI-driven automation and DevOps practices are shaping the future of financial technology in Egypt.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🤖 AI + DevOps</span><span class="tl-expand-metric">🇪🇬 Egyptian FinTech</span></div>`
      },
      {
        match: ['africa fintech forum', '$100 billion', 'digital payments'],
        html: `<strong>Panel Moderator — Africa FinTech Forum</strong> <span class="tl-expand-date">Jul 2025</span>
          <p>Moderated a powerhouse panel mapping the road to Egypt's $100 billion digital payments industry. Guided conversation on instant payments and AI-driven security with Banque Misr's Chief Consumer Banking Officer and the CEO of Sahl.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">💰 $100B Payments</span><span class="tl-expand-metric">🤖 AI Security</span><span class="tl-expand-metric">🇪🇬 Egypt Vision</span></div>`
      },
      {
        match: ['techne summit', 'virtual cards', 'swipe smarter'],
        html: `<strong>Panel Moderator — Techne Summit Alexandria</strong> <span class="tl-expand-date">Oct 2025</span>
          <p>"Swipe Smarter: Why Virtual Cards Are the Future of Business Payments" — led discussion on how virtual cards redefine business spending, security, and payments with Money Fellows and Paysky leaders.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">💳 Virtual Cards</span><span class="tl-expand-metric">🔒 Payment Security</span></div>`
      },
      {
        match: ['banking & fintech summit', 'traditional vs. digital', 'future of banking'],
        html: `<strong>Panel Moderator — Banking & Fintech Summit</strong> <span class="tl-expand-date">Oct 2025</span>
          <p>"Future of Banking in Egypt: Traditional vs. Digital" — moderated alongside leaders from KFH Bank, EFG Holding, and Emirates NBD.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🏦 Banking Future</span><span class="tl-expand-metric">📱 Digital vs Traditional</span></div>`
      },
      {
        match: ['career summit', 'career 180', 'banking economy'],
        html: `<strong>Panel Moderator — Egypt Career Summit</strong> <span class="tl-expand-date">May 2025</span>
          <p>"Beyond Transactions: Banking's Role in Shaping the Future Economy" — shared stage with COO of Emirates NBD and Chief Dealer of QNB Egypt.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🌍 Future Economy</span><span class="tl-expand-metric">👥 Next-Gen Leaders</span></div>`
      },
      {
        match: ['techup women', 'data over intuition', 'never go with your gut'],
        html: `<strong>Expert Mentor — TechUp Women Summit</strong> <span class="tl-expand-date">Oct 2024</span>
          <p>"Data Over Intuition: Never Go With Your Gut" — deep dive into data-driven decision-making for career growth and leadership effectiveness. Selected as expert mentor for aspiring technology leaders.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">👩‍💻 Women in Tech</span><span class="tl-expand-metric">📊 Data-Driven</span></div>`
      },
      {
        match: ['toastmasters', 'public speaking', 'maadi'],
        html: `<strong>Leadership & Public Speaking — Maadi Toastmasters</strong>
          <p>Actively honed public speaking, impromptu communication, and leadership skills within the Toastmasters International framework. Instrumental for developing stage presence for professional speaking engagements.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">🎤 Stage Presence</span><span class="tl-expand-metric">💬 Impromptu</span></div>`
      },
      {
        match: ['bilingual executive', 'book', 'launched', 'published', 'amazon'],
        html: `<strong>The Bilingual Executive — Published Author</strong>
          <p>Published "The Bilingual Executive," a practical guide bridging Arabic-speaking professionals with global business and technology leadership concepts.</p>
          <div class="tl-expand-chips"><span class="tl-expand-metric">📘 Published Book</span><span class="tl-expand-metric">🌐 Bilingual Bridge</span><span class="tl-expand-metric">📦 Amazon</span></div>`
      },
    ];

    // Fallback by tag category (used when no role-specific match found)
    const DETAILS = {
      banking:  '<strong>Banking Career</strong> — 9+ years at Banque Misr spanning business banking, credit analysis, project management, data analytics, and agile delivery. <span class="tl-expand-metric">🏦 Banque Misr</span>',
      agile:    '<strong>Agile Delivery</strong> — Hybrid Scrum/Kanban framework, flow metrics, delivery predictability. Certified PMP®, PSM II, PSPO II, PMI-ACP, ICP-ATF. <span class="tl-expand-metric">⚡ 6+ Agile Certs</span>',
      data:     '<strong>Data & Analytics</strong> — BI dashboards, data governance, analytics platforms. DataCamp certified, CDMP qualified. <span class="tl-expand-metric">📊 BI Leadership</span>',
      speaking: '<strong>Conference Speaker</strong> — 10+ stages including Seamless North Africa (4 panels), DevOpsDays Cairo, Africa FinTech Forum, Techne Summit, TechUp Women. <span class="tl-expand-metric">🎤 10+ Stages</span>',
      learning: '<strong>Continuous Learning</strong> — DBA, MBA, BA from Helwan University. Frankfurt School Digital Finance. 20+ certifications. Best Learner Award. <span class="tl-expand-metric">🏆 Best Learner</span>',
      author:   '<strong>Thought Leadership</strong> — Published "The Bilingual Executive", founded Fintech Bilinguals community, 1,000+ mentoring minutes on ADPList. <span class="tl-expand-metric">📚 Author</span>',
      mentor:   '<strong>Mentorship</strong> — Top 50 ADPList Mentor in Project Management. 1,000+ minutes coaching FinTech, data, and digital transformation professionals. <span class="tl-expand-metric">🏅 Top 50</span>',
      military: '<strong>Military Service</strong> — Technology Officer at Egyptian Armed Forces. 100% uptime for mission-critical systems. Leadership commendation. <span class="tl-expand-metric">🛡️ 100% Uptime</span>',
      fintech:  '<strong>FinTech Ecosystem</strong> — 6+ years pro bono consulting for Egyptian FinTech Association. Startup advisory, ecosystem development. <span class="tl-expand-metric">🚀 6+ Years</span>',
      intern:   '<strong>Foundation Years</strong> — Internships at Nissan, Central Bank of Egypt, Egyptian Exchange, MCDR. Corporate finance, capital markets, regulatory exposure. <span class="tl-expand-metric">🏛️ 4 Institutions</span>',
    };

    // ─── 1. HIDE EXISTING STATIC LINE ───
    const staticLine = tlWrap.querySelector('.tl-line');
    if (staticLine) staticLine.style.display = 'none';

    // ─── 2. SCROLL-PROGRESS LINE (simple div) ───
    const scrollLine = document.createElement('div');
    scrollLine.className = 'tl-scroll-line';
    scrollLine.innerHTML = '<div class="tl-scroll-line-fill" id="tlScrollFill"></div>';
    tlWrap.appendChild(scrollLine);
    const scrollFill = document.getElementById('tlScrollFill');

    // ─── 4. FILTER PILLS ───
    const filters = document.createElement('div');
    filters.className = 'tl-filters'; filters.id = 'tlFilters';
    const filterIcons = { all: '✦', banking: '🏦', agile: '⚡', data: '📊', speaking: '🎤', learning: '🎓', author: '📚', mentor: '🎓', military: '🛡️', fintech: '🚀', intern: '🏛️' };
    ['all', ...Object.keys(TAGS)].forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tl-filter-btn' + (tag === 'all' ? ' active' : '');
      btn.innerHTML = (filterIcons[tag] || '') + ' ' + tag;
      btn.dataset.filter = tag;
      btn.addEventListener('click', () => filterTimeline(tag));
      filters.appendChild(btn);
    });
    tlWrap.parentNode.insertBefore(filters, tlWrap);

    // ─── 5. PROGRESS BAR ───
    const progressBar = document.createElement('div');
    progressBar.className = 'tl-progress-bar'; progressBar.id = 'tlProgressBar';
    progressBar.innerHTML = `
      <div class="tl-progress-track"><div class="tl-progress-fill" id="tlProgressFill"></div></div>
      <span class="tl-progress-label" id="tlProgressLabel">0%</span>`;
    tlWrap.parentNode.insertBefore(progressBar, tlWrap);
    const progressFill = document.getElementById('tlProgressFill');
    const progressLabel = document.getElementById('tlProgressLabel');

    // ─── 6. EXPAND CARDS + MARK ITEMS ───
    items.forEach((item, idx) => {
      const tags = item.dataset.tags.split(',');
      const primaryTag = tags[0];
      const itemText = item.textContent.toLowerCase();

      // Try role-specific match first
      let detail = null;
      for (const role of ROLE_MAP) {
        if (role.match.some(kw => itemText.includes(kw.toLowerCase()))) {
          detail = role.html;
          break;
        }
      }
      // Fallback to tag-based detail
      if (!detail) detail = DETAILS[primaryTag] || DETAILS.banking;

      const expandDiv = document.createElement('div');
      expandDiv.className = 'tl-item-expand';
      expandDiv.innerHTML = `<div class="tl-expand-content">${detail}</div>`;
      item.appendChild(expandDiv);

      item.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const isOpen = expandDiv.classList.contains('open');
        tlWrap.querySelectorAll('.tl-item-expand.open').forEach(d => d.classList.remove('open'));
        if (!isOpen) expandDiv.classList.add('open');
      });

      item.classList.add('tl-enhanced');
    });

    // ─── 7. ENTRANCE ANIMATION ───
    if (!RM) {
      setTimeout(() => {
        const viewH = window.innerHeight;
        items.forEach((item, idx) => {
          const r = item.getBoundingClientRect();
          if (r.top > viewH) {
            item.classList.add('tl-hidden');
            item.style.transitionDelay = (idx % 5) * 0.05 + 's';
          } else {
            item.classList.add('tl-visible');
          }
        });
      }, 2000);
    }

    // ─── 8. MASTER SCROLL ENGINE ───
    let rafId = null;
    let lastProgress = -1;

    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const wrapRect = tlWrap.getBoundingClientRect();
        const viewH = window.innerHeight;
        const inView = wrapRect.top < viewH && wrapRect.bottom > 0;

        // Progress bar visibility
        progressBar.classList.toggle('show', inView);

        if (!inView) return;

        // ── Scroll line fill ──
        const rawProgress = Math.max(0, Math.min(1,
          (viewH * 0.5 - wrapRect.top) / wrapRect.height
        ));
        if (Math.abs(rawProgress - lastProgress) > 0.002) {
          lastProgress = rawProgress;
          scrollFill.style.height = (rawProgress * 100) + '%';
          const pct = Math.round(rawProgress * 100);
          progressFill.style.width = pct + '%';
          progressLabel.textContent = pct + '%';
        }

        // ── Per-item checks ──
        items.forEach(item => {
          const r = item.getBoundingClientRect();
          const visible = r.top < viewH * 0.88 && r.bottom > viewH * 0.12;
          const centered = r.top < viewH * 0.6 && r.bottom > viewH * 0.35;

          // Entrance reveal
          if (visible && item.classList.contains('tl-hidden')) {
            item.classList.remove('tl-hidden');
            item.classList.add('tl-visible');
          }

          // Active highlight
          item.classList.toggle('tl-active', centered && !item.classList.contains('filtered-out'));
        });
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    setTimeout(onScroll, 2500);

    // ─── 9. FILTER SYSTEM ───
    function filterTimeline(tag) {
      document.querySelectorAll('.tl-filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === tag)
      );
      items.forEach(item => {
        const isEra = item.classList.contains('tl-era');
        if (tag === 'all' || isEra) {
          item.classList.remove('filtered-out');
        } else {
          const match = item.dataset.tags.split(',').includes(tag);
          item.classList.toggle('filtered-out', !match);
        }
      });
      // Re-trigger entrance for newly visible items
      setTimeout(onScroll, 100);
    }

    // ─── 10. TERMINAL INTEGRATION ───
    window.TermCmds = window.TermCmds || {};
    window.TermCmds.timeline = (args) => {
      const tag = (args || '').trim().toLowerCase();
      if (tag && Object.keys(TAGS).includes(tag)) {
        filterTimeline(tag);
        setTimeout(() => scrollTo('.tl-wrap'), 200);
        return `<span class="term-green">Filtered timeline to: ${tag}</span>`;
      }
      return `<span class="term-gray">Usage: timeline [banking|agile|data|speaking|learning|author]</span>`;
    };

    function scrollTo(sel) { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 4: LIVE GUESTBOOK
  // ═══════════════════════════════════════════════════

  const GB_EMOJIS = ['👋','⭐','🔥','💡','🚀','❤️','🎉','🤝','👏','💪'];

  async function fetchGBEntries() {
    if (!_sb) return [];
    try {
      const { data, error } = await _sb
        .from('guestbook_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    } catch (e) { console.warn('Supabase guestbook fetch failed:', e); return []; }
  }

  async function insertGBEntry(entry) {
    if (!_sb) return false;
    try {
      const { error } = await _sb.from('guestbook_entries').insert(entry);
      if (error) throw error;
      return true;
    } catch (e) { console.warn('Supabase guestbook insert failed:', e); return false; }
  }

  function renderGBRows(entries) {
    const container = document.getElementById('gbEntries');
    if (!container) return;
    if (entries.length === 0) {
      container.innerHTML = '<div class="gb-empty">No entries yet — be the first! ✨</div>';
      return;
    }
    container.innerHTML = entries.map(e => {
      const ts = e.created_at ? new Date(e.created_at).getTime() : (e.time || Date.now());
      return `<div class="gb-entry">
        <span class="gb-entry-emoji">${escHtml(e.emoji)}</span>
        <div class="gb-entry-meta">
          <div class="gb-entry-name">${escHtml(e.name)}</div>
          ${e.msg ? `<div class="gb-entry-msg">${escHtml(e.msg)}</div>` : ''}
          <div class="gb-entry-time">${timeAgo(ts)}</div>
        </div>
      </div>`;
    }).join('');
  }

  async function renderGBEntriesFromSupabase() {
    const container = document.getElementById('gbEntries');
    if (!container) return;
    container.innerHTML = '<div class="gb-empty" style="opacity:.5">Loading entries...</div>';
    const entries = await fetchGBEntries();
    renderGBRows(entries);
  }

  function initGuestbook() {
    const overlay = document.createElement('div');
    overlay.id = 'guestbookOverlay';
    overlay.addEventListener('click', e => { if(e.target===overlay) closeGuestbook(); });
    overlay.innerHTML = `
      <div class="gb-panel">
        <div class="gb-title">🌍 Visitor Wall</div>
        <div class="gb-subtitle">Leave your mark — say hi!</div>
        <div class="gb-form" id="gbForm">
          <div class="gb-emoji-row" id="gbEmojiRow"></div>
          <input class="gb-name-input" id="gbName" placeholder="Your name" maxlength="30">
          <input class="gb-msg-input" id="gbMsg" placeholder="Quick message (optional)" maxlength="100">
          <button class="gb-submit" id="gbSubmit" disabled>Sign the Wall</button>
        </div>
        <div class="gb-entries" id="gbEntries"></div>
        <div class="gb-close" onclick="window._closeGuestbook()">[ ESC or tap to close ]</div>
      </div>`;
    document.body.appendChild(overlay);

    const emojiRow = document.getElementById('gbEmojiRow');
    let selectedEmoji = null;
    GB_EMOJIS.forEach(e => {
      const btn = document.createElement('button');
      btn.className = 'gb-emoji-btn'; btn.textContent = e;
      btn.addEventListener('click', () => {
        emojiRow.querySelectorAll('.gb-emoji-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected'); selectedEmoji = e; updateSubmit();
      });
      emojiRow.appendChild(btn);
    });

    const nameInput=document.getElementById('gbName'), submitBtn=document.getElementById('gbSubmit');
    function updateSubmit() { submitBtn.disabled = !selectedEmoji || !nameInput.value.trim(); }
    nameInput.addEventListener('input', updateSubmit);

    submitBtn.addEventListener('click', async () => {
      if (!selectedEmoji || !nameInput.value.trim()) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing...';
      const entry = { emoji: selectedEmoji, name: nameInput.value.trim(), msg: document.getElementById('gbMsg').value.trim() || null };
      const success = await insertGBEntry(entry);
      if (success) {
        nameInput.value = ''; document.getElementById('gbMsg').value = ''; selectedEmoji = null;
        emojiRow.querySelectorAll('.gb-emoji-btn').forEach(b => b.classList.remove('selected'));
        submitBtn.textContent = 'Sign the Wall';
        await renderGBEntriesFromSupabase();
        spawnBubble(entry.emoji);
        if (window._presenceAudio) window._presenceAudio.onGuestbookEntry();
        if (window.VDna) window.VDna.addXp(10);
        if (navigator.vibrate) navigator.vibrate(30);
        if (typeof checkTrophy === 'function') checkTrophy('guestbook_signed');
      } else {
        submitBtn.textContent = 'Sign the Wall';
      }
      updateSubmit();
    });

    window.TermCmds = window.TermCmds || {};
    window.TermCmds.guestbook=()=>{setTimeout(openGuestbook,200);return'<span class="term-green">🌍 Opening guestbook...</span>';};
    window.TermCmds.wall=window.TermCmds.guestbook;
    window._closeGuestbook = closeGuestbook;
  }

  window.openGuestbook = openGuestbook;
  function openGuestbook() {
    const el=document.getElementById('guestbookOverlay'); if(!el)return;
    el.classList.add('show');
    autoDismiss('guestbookOverlay',closeGuestbook);
    renderGBEntriesFromSupabase();
  }
  function closeGuestbook() { document.getElementById('guestbookOverlay')?.classList.remove('show'); cancelAutoDismiss('guestbookOverlay'); }
  function spawnBubble(emoji) {
    const el=document.createElement('span'); el.className='gb-bubble'; el.textContent=emoji;
    el.style.left=(15+Math.random()*70)+'vw'; el.style.bottom='10px';
    document.body.appendChild(el); setTimeout(()=>el.remove(),6500);
  }


  // ═══════════════════════════════════════════════════
  // FEATURE 5: VOICE NAVIGATION — ADVANCED ENGINE
  // ═══════════════════════════════════════════════════
  // 25+ routes · continuous mode · trophy triggers · compound commands · confidence display

  let voiceActive = false, recognition = null;

  function initVoiceNav() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    const btn = document.createElement('button');
    btn.className = 'voice-btn'; btn.id = 'voiceBtn';
    btn.setAttribute('aria-label','Voice Navigation'); btn.title = 'Voice Command (V)';
    btn.innerHTML = '<i class="fa-solid fa-microphone-slash" id="voiceIcon"></i>';
    document.body.appendChild(btn);

    const transcript = document.createElement('div');
    transcript.className = 'voice-transcript'; transcript.id = 'voiceTranscript';
    document.body.appendChild(transcript);

    // Route helpers
    function scrollTo(sel){const el=document.querySelector(sel);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
    function clickLink(partial){const lk=document.querySelector(`a.lk[href*="${partial}"]`);if(lk)lk.click();}

    const ROUTES = [
      // Navigation
      { match:/open\s*arcade|play\s*game|games|arcade/i,    action:()=>{if(window._openArcade)window._openArcade();return'🕹️ Opening Arcade';} },
      { match:/play\s*stacker|sprint\s*stacker/i,           action:()=>{if(window.TermCmds?.play)window.TermCmds.play('stacker');return'🧱 Launching Sprint Stacker';} },
      { match:/play\s*router|data\s*mesh\s*router/i,        action:()=>{if(window.TermCmds?.play)window.TermCmds.play('router');return'🔀 Launching Data Mesh Router';} },
      { match:/play\s*trader|fintech\s*trader|stock/i,      action:()=>{if(window.openGame)window.openGame();return'📈 Launching FinTech Trader';} },
      { match:/play\s*snake/i,                               action:()=>{if(window.TermCmds?.play)window.TermCmds.play('snake');return'🐍 Launching Snake';} },
      { match:/play\s*bilingual|bilingual\s*swipe/i,         action:()=>{if(window.TermCmds?.play)window.TermCmds.play('bilingual');return'🌐 Launching Bilingual Swipe';} },
      { match:/certif|certs|badges|credential/i,             action:()=>{scrollTo('#certGrid');return'📜 Scrolling to Certifications';} },
      { match:/testimon|recommend|reviews|endorse/i,         action:()=>{scrollTo('.tc-section');return'⭐ Scrolling to Testimonials';} },
      { match:/timeline|journey|experience|career|history/i, action:()=>{scrollTo('.tl-wrap');return'🚀 Scrolling to Timeline';} },
      { match:/contact|email|phone|reach\s*out|connect/i,    action:()=>{const s=document.getElementById('contactSecret');if(s)s.classList.add('revealed');scrollTo('.sr');if(typeof checkTrophy==='function')checkTrophy('explorer_contact');return'📧 Revealing Contact Info';} },
      { match:/book|bilingual\s*exec|author|amazon/i,        action:()=>{clickLink('bilingual');return'📘 Opening Book Link';} },
      { match:/mentor|adplist|coaching|session/i,             action:()=>{window.open('https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session','_blank');return'🎓 Opening ADPList';} },
      { match:/conference|speak|talks|panel|keynote/i,        action:()=>{scrollTo('.conf-strip');return'🎤 Scrolling to Conferences';} },
      { match:/article|linkedin.*post|blog|writing/i,         action:()=>{scrollTo('#linkedinFeed');return'📝 Scrolling to Articles';} },
      { match:/impact|numbers|metrics|data\s*point/i,         action:()=>{scrollTo('.imp');return'📊 Scrolling to Impact Numbers';} },
      // Features
      { match:/zen\s*mode|clean|focus|minimal/i,              action:()=>{const b=document.getElementById('zenBtn');if(b)b.click();if(typeof checkTrophy==='function')checkTrophy('theme_zen');return'🧘 Toggling Zen Mode';} },
      { match:/cyberpunk|neon|night\s*city|theme/i,           action:()=>{if(window._toggleCyberpunk)window._toggleCyberpunk(true);if(typeof checkTrophy==='function')checkTrophy('theme_cyberpunk');return'🌆 Toggling Cyberpunk';} },
      { match:/search|find|command|palette|look\s*for/i,      action:()=>{if(window._openPalette)window._openPalette();return'⌨️ Opening Command Palette';} },
      { match:/guest\s*book|wall|sign|visitor/i,              action:()=>{openGuestbook();return'🌍 Opening Guestbook';} },
      { match:/terminal|console|hack|shell/i,                 action:()=>{if(window.openTerm)window.openTerm();return'💻 Opening Terminal';} },
      { match:/trophy|trophies|achievement|progress|badge/i,  action:()=>{if(window._openTrophies)window._openTrophies();return'🏆 Opening Trophy Case';} },
      { match:/calendar|schedule|book.*call|meeting/i,        action:()=>{window.open('https://calendly.com/amrmelharony/30min','_blank');return'📅 Opening Calendar';} },
      { match:/linkedin\s*profile|connect.*linkedin/i,        action:()=>{window.open('https://linkedin.com/in/amrmelharony','_blank');return'💼 Opening LinkedIn';} },
      { match:/three\s*d.*book|3d.*book|book.*viewer/i,       action:()=>{if(window.TermCmds?.book3d)window.TermCmds.book3d();return'📦 Opening 3D Book';} },
      { match:/data\s*mesh|mesh.*visual|visualizer|fintech.*visual/i, action:()=>{if(window.TermCmds?.datamesh)window.TermCmds.datamesh();return'📊 Opening Live FinTech Visualizer';} },
      // Scroll
      { match:/scroll\s*down|next|continue/i,                 action:()=>{window.scrollBy({top:window.innerHeight*0.7,behavior:'smooth'});return'⬇️ Scrolling down';} },
      { match:/scroll\s*up|back|previous/i,                   action:()=>{window.scrollBy({top:-window.innerHeight*0.7,behavior:'smooth'});return'⬆️ Scrolling up';} },
      { match:/top|home|start|beginning/i,                    action:()=>{window.scrollTo({top:0,behavior:'smooth'});return'⏫ Scrolling to Top';} },
      { match:/bottom|end|footer/i,                           action:()=>{window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});return'⏬ Scrolling to Bottom';} },
      // Meta
      { match:/help|what can|commands|options/i,              action:()=>{showVoiceHelp(transcript);return'📋 Showing available commands';} },
      { match:/stop|cancel|close|never\s*mind/i,             action:()=>{return'👋 Stopped listening';} },
    ];

    function showVoiceHelp(el) {
      el.innerHTML = `<div style="font-size:9px;line-height:1.6;color:#8b949e">
        <strong style="color:#00e1ff">Voice Commands:</strong><br>
        "certifications" · "timeline" · "contact" · "arcade"<br>
        "play stacker" · "trophy case" · "zen mode"<br>
        "scroll down" · "go to top" · "open terminal"<br>
        "book a call" · "linkedin" · "guestbook"<br>
        "help" · "stop"
      </div>`;
      el.classList.add('show');
    }

    let hideTimer = null, commandCount = 0;
    recognition.onresult = (event) => {
      let text=''; for(let i=event.resultIndex;i<event.results.length;i++) text+=event.results[i][0].transcript;
      const isFinal=event.results[event.results.length-1].isFinal;
      const confidence = event.results[event.results.length-1][0].confidence;
      const confPct = Math.round((confidence||0) * 100);

      transcript.innerHTML=`<span class="heard">"${text}"</span> <span style="color:#2d3748;font-size:8px">${confPct}%</span>`;
      transcript.classList.add('show');
      if(hideTimer)clearTimeout(hideTimer);

      if(isFinal){
        let matched=false;
        for(const route of ROUTES){
          if(route.match.test(text)){
            const result=route.action();
            transcript.innerHTML=`<span class="heard">"${text}"</span> → <span class="action">${result}</span>`;
            matched=true;
            commandCount++;
            if(window.VDna) window.VDna.addXp(3);
            // Trophy: first voice command
            if(typeof checkTrophy==='function') checkTrophy('voice_used');
            break;
          }
        }
        if(!matched) {
          transcript.innerHTML=`<span class="heard">"${text}"</span> → <span style="color:#6b7280">Say "help" for available commands</span>`;
        }
        hideTimer=setTimeout(()=>transcript.classList.remove('show'), matched ? 3000 : 4500);
        stopVoice();
      }
    };
    recognition.onerror=(e)=>{ if(e.error!=='aborted') stopVoice(); };
    recognition.onend=()=>{if(voiceActive)stopVoice();};

    function startVoice(){
      voiceActive=true; btn.classList.add('listening');
      document.getElementById('voiceIcon').className='fa-solid fa-microphone';
      transcript.innerHTML='<span style="color:#ef4444;font-size:10px">🎙️ Listening... say a command</span>';
      transcript.classList.add('show');
      try{recognition.start();}catch(e){}
      if(navigator.vibrate)navigator.vibrate(50);
    }
    function stopVoice(){voiceActive=false;btn.classList.remove('listening');document.getElementById('voiceIcon').className='fa-solid fa-microphone-slash';try{recognition.stop();}catch(e){}}
    function toggleVoice(){voiceActive?stopVoice():startVoice();}
    window._toggleVoice=toggleVoice;

    btn.addEventListener('click',toggleVoice);
    document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;if(e.key==='v'&&!e.ctrlKey&&!e.metaKey&&!e.altKey)toggleVoice();});

    window.TermCmds = window.TermCmds || {};
    window.TermCmds.voice=()=>{setTimeout(toggleVoice,200);return voiceActive?'<span class="term-gray">🔇 Voice stopped</span>':'<span class="term-green">🎤 Listening... say "help" for commands</span>';};
    window.TermCmds['voice-help']=()=>{
      return `<span class="term-green">🎙️ Voice Commands:</span>
<span class="term-gray">Navigation:</span> certifications, timeline, testimonials, contact, impact, conferences, articles
<span class="term-gray">Arcade:</span> arcade, play stacker, play router, play trader, play snake, play bilingual
<span class="term-gray">Features:</span> zen mode, cyberpunk, terminal, guestbook, trophy case, search
<span class="term-gray">Links:</span> linkedin, book a call, mentor, book
<span class="term-gray">Scroll:</span> scroll down, scroll up, go to top, bottom
<span class="term-gray">Meta:</span> help, stop`;
    };
  }






  // ═══════════════════════════════════════════════════
  // ADVANCED TERMINAL COMMANDS
  // ═══════════════════════════════════════════════════
  function wireAdvancedTerminal() {
    window.TermCmds = window.TermCmds || {};
    const T = window.TermCmds;

    // ── Help system ──────────────────────────────
    T.help = () => {
      return `<span class="term-green">═══ Phase 6 Terminal Commands ═══</span>

<span class="term-cyan">Navigation:</span>
  <span class="term-white">goto &lt;section&gt;</span>    Scroll to section (timeline, certs, impact, testimonials, conferences, articles, contact)
  <span class="term-white">top</span>               Scroll to top
  <span class="term-white">bottom</span>            Scroll to bottom

<span class="term-cyan">Arcade:</span>
  <span class="term-white">play &lt;game&gt;</span>       Launch a game (stacker, router, trader, bilingual, snake)
  <span class="term-white">arcade</span>            Open the Arcade panel
  <span class="term-white">scores</span>            Show high scores

<span class="term-cyan">Features:</span>
  <span class="term-white">search / find</span>     Open Command Palette (⌘K)
  <span class="term-white">voice</span>             Toggle voice navigation
  <span class="term-white">voice-help</span>        Show voice commands
  <span class="term-white">guestbook / wall</span>  Open guestbook
  <span class="term-white">trophies</span>          Open Trophy Case & Progress
  <span class="term-white">progress</span>          Show site exploration progress
  <span class="term-white">achievements</span>      Same as trophies

<span class="term-cyan">Themes & Audio:</span>
  <span class="term-white">zen</span>               Toggle Zen Mode
  <span class="term-white">cyberpunk</span>         Toggle Cyberpunk theme
  <span class="term-white">matrix</span>            Matrix rain effect
  <span class="term-white">audio</span>             Toggle spatial UI sounds (on/off)
  <span class="term-white">visualizer</span>        Live FinTech trade visualizer (Binance)

<span class="term-cyan">Timeline:</span>
  <span class="term-white">timeline</span>          Scroll to timeline
  <span class="term-white">timeline &lt;tag&gt;</span>   Filter (banking, agile, data, speaking, learning, author)

<span class="term-cyan">Links:</span>
  <span class="term-white">linkedin</span>          Open LinkedIn profile
  <span class="term-white">calendar</span>          Book a meeting
  <span class="term-white">book</span>              Open The Bilingual Executive
  <span class="term-white">mentor</span>            Book a mentoring session
  <span class="term-white">community</span>         Open Fintech Bilinguals

<span class="term-cyan">Multiplayer:</span>
  <span class="term-white">broadcast &lt;msg&gt;</span>  Send a message to all online users
  <span class="term-white">engage lock 1|2</span>  Co-op dual-lock puzzle (needs 2 users)

<span class="term-cyan">System:</span>
  <span class="term-white">admin / stats</span>     Visitor insights dashboard
  <span class="term-white">clear</span>             Clear terminal
  <span class="term-white">whoami</span>            About Amr
  <span class="term-white">resume</span>            Quick resume summary
  <span class="term-white">stack</span>             Tech stack
  <span class="term-white">uptime</span>            Session uptime
  <span class="term-white">xp</span>                Show XP and level
  <span class="term-white">export</span>            Export session data
  <span class="term-white">reset</span>             Reset all progress
  <span class="term-white">easter</span>            Find hidden commands 😉`;
    };

    // ── Navigation ──────────────────────────────
    const NAV_MAP = {
      timeline: '.tl-wrap', certs: '#certGrid', certifications: '#certGrid',
      impact: '.imp', numbers: '.imp', testimonials: '.tc-section',
      conferences: '.conf-strip', articles: '#linkedinFeed', contact: '.sr',
    };
    T.goto = (args) => {
      const target = (args || '').trim().toLowerCase();
      if (!target) return '<span class="term-gray">Usage: goto &lt;section&gt; — try: timeline, certs, impact, testimonials, conferences, articles, contact</span>';
      const sel = NAV_MAP[target];
      if (!sel) return `<span class="term-red">Unknown section "${escHtml(target)}".</span> Try: ${Object.keys(NAV_MAP).join(', ')}`;
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (target === 'contact') { const s = document.getElementById('contactSecret'); if (s) s.classList.add('revealed'); }
      }
      return `<span class="term-green">📍 Navigating to ${target}...</span>`;
    };
    T.top = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); return '<span class="term-green">⏫ Scrolling to top</span>'; };
    T.bottom = () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return '<span class="term-green">⏬ Scrolling to bottom</span>'; };

    // ── Arcade ──────────────────────────────
    T.arcade = () => { if (window._openArcade) { setTimeout(() => window._openArcade(), 200); } return '<span class="term-green">🕹️ Opening Arcade...</span>'; };
    T.scores = () => {
      const arcade = JSON.parse(localStorage.getItem('arcade_state') || '{}');
      const hs = arcade.highScores || {};
      const names = { stacker:'Sprint Stacker', router:'Data Mesh Router', trader:'FinTech Trader', bilingual:'Bilingual Swipe', snake:'Snake' };
      if (!Object.keys(hs).length) return '<span class="term-gray">No high scores yet. Play some games first!</span>';
      const rows = Object.entries(hs).map(([id, score]) => `  <span class="term-white">${names[id] || id}</span>: <span class="term-green">${score}</span>`).join('\n');
      return `<span class="term-cyan">🏅 High Scores:</span>\n${rows}\n  <span class="term-gray">Total plays: ${arcade.totalPlays || 0} | Boss: ${arcade.bossBeaten ? '✅ Defeated' : '❌ Not yet'}</span>`;
    };

    // ── Themes ──────────────────────────────
    T.zen = () => { const b = document.getElementById('zenBtn'); if (b) b.click(); if (typeof checkTrophy === 'function') checkTrophy('theme_zen'); return '<span class="term-green">🧘 Toggling Zen Mode</span>'; };
    T.cyberpunk = () => { if (window._toggleCyberpunk) window._toggleCyberpunk(true); if (typeof checkTrophy === 'function') checkTrophy('theme_cyberpunk'); return '<span class="term-green">🌆 Toggling Cyberpunk</span>'; };
    T.matrix = () => {
      const canvas = document.createElement('canvas');
      canvas.id = 'matrixCanvas';
      canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:9998;pointer-events:none;';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const chars = '01AMRELHARONYDATAAGILEFINTECH٢٠٢٦';
      const fontSize = 14;
      const cols = Math.floor(canvas.width / fontSize);
      let lastFrame = 0;
      const FRAME_INTERVAL = 80;

      if (typeof Worker !== 'undefined') {
        try {
          const mw = new Worker('matrix-worker.js');
          mw.postMessage({ type: 'init', columns: cols, canvasHeight: canvas.height, fontSize: fontSize });
          let mData = null;
          mw.onmessage = function(e) { mData = e.data; };
          function drawW(ts) {
            if (!document.getElementById('matrixCanvas')) { mw.terminate(); return; }
            if (ts - lastFrame < FRAME_INTERVAL) { requestAnimationFrame(drawW); return; }
            lastFrame = ts;
            if (mData) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#0F0'; ctx.font = fontSize + 'px monospace';
              const hc = mData.headChars, hy = mData.headY, tr = mData.trails;
              for (let i = 0; i < hc.length; i++) { ctx.globalAlpha = 0.9; ctx.fillText(String.fromCharCode(hc[i]), i * fontSize, hy[i]); }
              for (let j = 0; j < tr.length; j += 4) { ctx.globalAlpha = tr[j + 2]; ctx.fillText(String.fromCharCode(tr[j + 3]), tr[j] * fontSize, tr[j + 1]); }
              ctx.globalAlpha = 1;
            }
            mw.postMessage({ type: 'tick' });
            requestAnimationFrame(drawW);
          }
          mw.postMessage({ type: 'tick' });
          requestAnimationFrame(drawW);
          setTimeout(() => { canvas.style.transition = 'opacity 2s'; canvas.style.opacity = '0'; setTimeout(() => { canvas.remove(); mw.terminate(); }, 2000); }, 30000);
        } catch (e) { _matrixFallback(canvas, ctx, chars, fontSize, cols); }
      } else {
        _matrixFallback(canvas, ctx, chars, fontSize, cols);
      }
      return '<span class="term-green">Wake up, Neo... (Simulation Active)</span>';
    };
    function _matrixFallback(canvas, ctx, chars, fontSize, cols) {
      const drops = Array(cols).fill(1);
      let lastFrame = 0;
      function draw(ts) {
        if (!document.getElementById('matrixCanvas')) return;
        if (ts - lastFrame < 80) { requestAnimationFrame(draw); return; }
        lastFrame = ts;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < drops.length; i++) {
          const text = chars.charAt(Math.floor(Math.random() * chars.length));
          const y = drops[i] * fontSize;
          ctx.globalAlpha = 0.9; ctx.fillStyle = '#0F0'; ctx.font = fontSize + 'px monospace';
          ctx.fillText(text, i * fontSize, y);
          for (let t = 1; t <= 12; t++) { const ty = y - t * fontSize; if (ty < 0) break; ctx.globalAlpha = (1 - t / 12) * 0.4; ctx.fillText(chars.charAt(Math.floor(Math.random() * chars.length)), i * fontSize, ty); }
          ctx.globalAlpha = 1;
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
      setTimeout(() => { canvas.style.transition = 'opacity 2s'; canvas.style.opacity = '0'; setTimeout(() => canvas.remove(), 2000); }, 30000);
    }

    // ── Links ──────────────────────────────
    T.linkedin = () => { window.open('https://linkedin.com/in/amrmelharony', '_blank'); return '<span class="term-green">💼 Opening LinkedIn profile...</span>'; };
    T.calendar = () => { window.open('https://calendly.com/amrmelharony/30min', '_blank'); return '<span class="term-green">📅 Opening calendar booking...</span>'; };
    T.book = () => { const lk = document.querySelector('a.lk[href*="bilingual"]'); if (lk) lk.click(); return '<span class="term-green">📘 Opening The Bilingual Executive...</span>'; };
    T.mentor = () => { window.open('https://adplist.org/mentors/amr-elharony?session=46534-mentorship-session', '_blank'); return '<span class="term-green">🎓 Opening ADPList mentoring...</span>'; };
    T.community = () => { const lk = document.querySelector('a.lk[href*="fintech-bilinguals"]'); if (lk) lk.click(); return '<span class="term-green">🤝 Opening Fintech Bilinguals...</span>'; };

    // ── System / Info ──────────────────────────────
    T.whoami = () => {
      return `<span class="term-cyan">═══ Amr El Harony ═══</span>
<span class="term-white">Scrum Master</span> @ Banque Misr — Data & Analytics Division (9+ yrs at BM)
<span class="term-gray">Career path: Business Banking → Credit Analysis → PMP → Data Analytics → Scrum Master</span>
<span class="term-gray">DBA in Digital Transformation · MBA in Entrepreneurship · BA in International Economics</span>
<span class="term-gray">Certified Expert in Digital Finance (Frankfurt School)</span>
<span class="term-gray">20+ certifications: PMP®, SAFe 6, PSM II, PSPO II, PMI-ACP, ICP-ATF, PSK, CDMP</span>
<span class="term-gray">Author of "The Bilingual Executive" · Founder of Fintech Bilinguals</span>
<span class="term-gray">Top 50 ADPList Mentor (PM) · 1,000+ mentoring minutes</span>
<span class="term-gray">10+ conference stages: Seamless NA, DevOpsDays, Africa FinTech Forum, Techne Summit</span>
<span class="term-gray">6+ years pro bono FinTech consulting (Egyptian FinTech Association)</span>
<span class="term-gray">Technology Officer veteran (Egyptian Armed Forces · IT & Digital Security)</span>`;
    };

    T.resume = () => {
      return `<span class="term-cyan">═══ Career Timeline ═══</span>
<span class="term-white">2025–Now:</span>  Scrum Master — Banque Misr (Data & Analytics) · Hybrid Scrum/Kanban
<span class="term-white">2021–2025:</span> Corporate Banking Data Analyst — BI dashboards, DataCamp certified
<span class="term-white">2020–2021:</span> Project Management Professional — PMP®, cross-functional delivery
<span class="term-white">2017–2020:</span> SMEs Credit Analyst — Portfolio risk, lending, financial analysis
<span class="term-white">2016–2017:</span> Business Banking Officer — Client advisory, SME consulting
<span class="term-white">2015–2016:</span> Technology Officer — Egyptian Armed Forces (IT & Digital Security)
<span class="term-white">2011–2014:</span> Finance Internships — Nissan, Central Bank, Exchange, MCDR

<span class="term-cyan">═══ Education ═══</span>
<span class="term-white">2023:</span> DBA Digital Transformation — Helwan University
<span class="term-white">2019:</span> Certified Expert in Digital Finance — Frankfurt School
<span class="term-white">2019:</span> MBA Entrepreneurship — Helwan University
<span class="term-white">2014:</span> BA International Economics — Helwan University

<span class="term-cyan">═══ Speaking (10+ stages) ═══</span>
<span class="term-white">2025:</span> Banking & FinTech Summit · Techne Summit · DevOpsDays Cairo
<span class="term-white">2025:</span> Africa FinTech Forum · Egypt Career Summit
<span class="term-white">2024:</span> Seamless North Africa (4 panels + keynote) · TechUp Women

<span class="term-cyan">═══ Other Roles ═══</span>
<span class="term-white">2026–Now:</span>  Founder — Fintech Bilinguals community
<span class="term-white">2023–Now:</span>  Top 50 ADPList Mentor (1,000+ minutes)
<span class="term-white">2019–Now:</span>  FinTech Consultant (Pro Bono) — Egyptian FinTech Association
<span class="term-white">Author:</span>    "The Bilingual Executive" (Published)`;
    };

    T.stack = () => {
      return `<span class="term-cyan">═══ Site Tech Stack ═══</span>
<span class="term-white">Frontend:</span>  HTML5 · CSS3 · Vanilla JS (6,300+ lines)
<span class="term-white">Animation:</span> GSAP · CSS Animations · Canvas API · SVG
<span class="term-white">Features:</span>  Command Palette · Voice Nav · Terminal · Guestbook
<span class="term-white">Games:</span>    5 mini-games (Canvas) + Boss Fight
<span class="term-white">3D:</span>       Three.js book viewer · Data Mesh visualization
<span class="term-white">Gamify:</span>   XP system · 24 trophies · progress tracking
<span class="term-white">Themes:</span>   Zen Mode · Cyberpunk · RTL support
<span class="term-white">Data:</span>     localStorage · Visitor DNA system · engagement scoring`;
    };

    T.uptime = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const sessionStart = vdna.sessionStart || Date.now();
      const diff = Date.now() - sessionStart;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      return `<span class="term-green">⏱ Session: ${mins}m ${secs}s</span> | <span class="term-gray">Visits: ${vdna.visits || 1}</span>`;
    };

    T.xp = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const xp = vdna.xp || 0, level = vdna.level || 1;
      const unlocked = vdna.unlocked ? Object.keys(vdna.unlocked).length : 0;
      const nextLvl = level * 50;
      const bar = '█'.repeat(Math.min(20, Math.round((xp % nextLvl) / nextLvl * 20))) + '░'.repeat(20 - Math.min(20, Math.round((xp % nextLvl) / nextLvl * 20)));
      return `<span class="term-cyan">Level ${level}</span> — <span class="term-green">${xp} XP</span>
<span class="term-gray">[${bar}] ${xp % nextLvl}/${nextLvl} to next level</span>
<span class="term-gray">Trophies: ${unlocked}/24</span>`;
    };

    T.export = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const arcade = JSON.parse(localStorage.getItem('arcade_state') || '{}');
      const data = { vdna, arcade, exported: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'amrelharony-session.json'; a.click();
      URL.revokeObjectURL(url);
      return '<span class="term-green">📦 Session data exported!</span>';
    };

    T.reset = () => {
      localStorage.removeItem('arcade_state');
      localStorage.removeItem('guestbook_entries');
      localStorage.removeItem('cmd_mru');
      if (window.VDna) {
        const v = window.VDna.get();
        v.xp = 0; v.level = 1; v.unlocked = {};
        window.VDna.save();
      }
      return '<span class="term-red">⚠️ All progress reset. Refresh to see changes.</span>';
    };

    // ── Easter eggs ──────────────────────────────
    T.easter = () => {
      return `<span class="term-green">🥚 Hidden commands exist...</span>
<span class="term-gray">Try: matrix, cowsay, fortune, neofetch, sudo</span>`;
    };
    T.cowsay = (args) => {
      const msg = args || 'Hire Amr!';
      return `<span class="term-white"> ${'_'.repeat(msg.length + 2)}
&lt; ${msg} &gt;
 ${'-'.repeat(msg.length + 2)}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||</span>`;
    };
    T.fortune = () => {
      const fortunes = [
        'The best way to predict the future is to build it.',
        'Data is the new oil, but insight is the new gold.',
        'Agility is not about going fast, it is about going smart.',
        'The bridge between banking and tech is built one sprint at a time.',
        'A good mentor plants trees they may never sit under.',
        'Digital transformation starts with people, not technology.',
        'Ship fast, learn faster, iterate always.',
      ];
      return `<span class="term-green">🔮 ${fortunes[Math.floor(Math.random() * fortunes.length)]}</span>`;
    };
    T.neofetch = () => {
      const vdna = window.VDna ? window.VDna.get() : {};
      const ua = navigator.userAgent;
      const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Other';
      const device = /Mobile|Android/i.test(ua) ? 'Mobile' : 'Desktop';
      return `<span class="term-cyan">        ___
       /   \\      </span><span class="term-white">amrelharony.com</span><span class="term-cyan">
      | A E |     </span><span class="term-gray">───────────────</span><span class="term-cyan">
      |  H  |     </span><span class="term-white">OS:</span><span class="term-gray"> Portfolio v6.0</span><span class="term-cyan">
       \\___/      </span><span class="term-white">Shell:</span><span class="term-gray"> Phase6 Terminal</span>
                  <span class="term-white">Browser:</span><span class="term-gray"> ${browser}</span>
                  <span class="term-white">Device:</span><span class="term-gray"> ${device}</span>
                  <span class="term-white">XP:</span><span class="term-gray"> ${vdna.xp || 0}</span>
                  <span class="term-white">Level:</span><span class="term-gray"> ${vdna.level || 1}</span>
                  <span class="term-white">Visits:</span><span class="term-gray"> ${vdna.visits || 1}</span>
                  <span class="term-white">Uptime:</span><span class="term-gray"> ${Math.floor((Date.now() - (vdna.sessionStart || Date.now())) / 60000)}m</span>`;
    };
    T.sudo = () => '<span class="term-red">Nice try 😎 — you don\'t have root access to this portfolio!</span>';
    T.hack = () => '<span class="term-green">Initializing hack sequence... just kidding. Try "help" instead.</span>';

    // ── Wire trophy trigger for terminal use ──────
    if (typeof checkTrophy === 'function') checkTrophy('terminal_used');
  }


  // ═══════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════
  function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function timeAgo(ts) {
    const diff = Date.now() - ts, mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  function init() {
    initAlwaysCTA();
    initCommandPalette();
    initAdminDashboard();
    initInteractiveTimeline();
    initGuestbook();
    initVoiceNav();
    wireAdvancedTerminal();
    initTrophySystem();
    console.log(
      '%c⚡ Phase 6.1 Loaded %c Palette+ · Trophies · Timeline · Guestbook · Voice+ · Terminal+',
      'background:#fbbf24;color:#06080f;padding:4px 8px;border-radius:4px 0 0 4px;font-weight:bold;',
      'background:#1a2332;color:#fbbf24;padding:4px 8px;border-radius:0 4px 4px 0;'
    );
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else { setTimeout(init, 500); }

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
            if(this.active || this.queue.length === 0) return;
            this.active = true;
            this.render(this.queue.shift());
        },

        render({ title, meta, icon, type }) {
            const el = document.createElement('div');
            el.className = 'uni-toast';
            el.dataset.type = type;
            el.innerHTML = `
                <div class="uni-toast-icon">${icon}</div>
                <div class="uni-toast-content">
                    <div class="uni-toast-title">${title}</div>
                    ${meta ? `<div class="uni-toast-meta">${meta}</div>` : ''}
                </div>
            `;
            Container.appendChild(el);

            // Animate
            requestAnimationFrame(() => el.classList.add('show'));
            if (navigator.vibrate) navigator.vibrate(15);

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
    console.log('✅ Unified Toast System: Interceptor Active');

// Add 'D' key listener for Dark/Light Mode
document.addEventListener('keydown', e => {
  // 1. Ignore if typing in an input field
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  // 2. Check for 'D' key
  if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // 3. Trigger the existing button click
      const themeBtn = document.getElementById('tbtn');
      if (themeBtn) themeBtn.click();
  }
});

})();
