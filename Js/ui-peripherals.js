// ui-peripherals.js — Cairo Weather, Holidays, Visitor Counter, Testimonial Carousel
// Standalone UI widgets extracted from site.js.

// ═══ STATUS (with smart greeting) ═══
function _updStatus(){
    var reducedMotion = window._reducedMotion;
    var now=new Date();
    var cairoOpts={timeZone:'Africa/Cairo'};
    var h=parseInt(now.toLocaleString('en-US',Object.assign({},cairoOpts,{hour:'numeric',hour12:false})));
    var dayName=now.toLocaleString('en-US',Object.assign({},cairoOpts,{weekday:'long'}));
    var dot=document.getElementById('sdot'),txt=document.getElementById('stxt');
    var msg,col;

    var isWeekend=(dayName==='Friday'||dayName==='Saturday');

    var isHoliday=window._cairoHolidayToday||false;
    var holidayName=window._cairoHolidayName||'';

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

    if(dot)dot.style.background=col;
    if(!txt)return;
    if(reducedMotion){txt.textContent=msg;return;}
    txt.textContent='';var i=0;(function t(){if(i<msg.length){txt.textContent+=msg[i];i++;setTimeout(t,35);}})();
}
window._updStatus = _updStatus;

// ═══ EGYPT HOLIDAYS (via Nager.Date free API) ═══
(async function(){
    try{
        var yr=new Date().getFullYear();
        var res=await window._fetchT('https://date.nager.at/api/v3/PublicHolidays/'+yr+'/EG',null,6000);
        if(res.ok){
            var holidays=await res.json();
            var today=new Date().toLocaleString('en-CA',{timeZone:'Africa/Cairo'}).split(',')[0];
            var match=holidays.find(function(h){return h.date===today;});
            if(match){
                window._cairoHolidayToday=true;
                window._cairoHolidayName=match.localName||match.name;
                _updStatus();
            }
        }
    }catch(e){}
})();

// ═══ CAIRO WEATHER (Open-Meteo free API, no key) ═══
(async function(){
    var CACHE_KEY='cairoWeather';var TTL=3600000;
    var _wUrl='https://api.open-meteo.com/v1/forecast?latitude=30.0444&longitude=31.2357&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Africa%2FCairo';

    function getWeatherIcon(code,isDay){
        var c=Number(code)||0;
        if(c<=1)  return isDay?'fa-sun':'fa-moon';
        if(c===2) return isDay?'fa-cloud-sun':'fa-cloud-moon';
        if(c===3) return 'fa-cloud';
        if(c<=48) return 'fa-smog';
        if(c<=55) return 'fa-cloud-rain';
        if(c<=57) return 'fa-snowflake';
        if(c<=65) return 'fa-cloud-showers-heavy';
        if(c<=67) return 'fa-snowflake';
        if(c<=77) return 'fa-snowflake';
        if(c<=82) return 'fa-cloud-showers-heavy';
        if(c<=86) return 'fa-snowflake';
        return 'fa-cloud-bolt';
    }

    function getWeatherColor(code,temp,isDay){
        var c=Number(code)||0;
        var t=typeof temp==='number'?temp:25;
        if(c<=1){
            if(!isDay) return t<10?'#93c5fd':t<25?'#a5b4fc':'#fde68a';
            if(t<5)  return '#94b8db';
            if(t<15) return '#60a5fa';
            if(t<25) return '#fbbf24';
            if(t<35) return '#f59e0b';
            return '#ef4444';
        }
        if(c<=3)  return '#94a3b8';
        if(c<=48) return '#9ca3af';
        if(c<=55) return '#60a5fa';
        if(c<=57) return '#38bdf8';
        if(c<=65) return '#3b82f6';
        if(c<=67) return '#38bdf8';
        if(c<=77) return '#bfdbfe';
        if(c<=82) return '#3b82f6';
        if(c<=86) return '#bfdbfe';
        return '#a855f7';
    }

    function getTempColor(temp){
        if(temp<5)  return '#60a5fa';
        if(temp<15) return '#38bdf8';
        if(temp<25) return 'var(--text)';
        if(temp<35) return '#f59e0b';
        return '#ef4444';
    }

    function render(data){
        var w=document.getElementById('weatherWidget');
        var ico=document.getElementById('weatherIcon');
        var tmp=document.getElementById('weatherTemp');
        if(!w||!ico||!tmp)return;
        var faIcon=getWeatherIcon(data.code,data.isDay);
        var iconColor=getWeatherColor(data.code,data.temp,data.isDay);
        ico.innerHTML='<i class="fa-solid '+faIcon+'" style="color:'+iconColor+'"></i>';
        tmp.textContent=Math.round(data.temp)+'°C';
        tmp.style.color=getTempColor(data.temp);
        if(window._peripheralsShown)w.classList.add('show');
        window._pendingWeatherCode=data.code;
        window._pendingWeatherIsDay=data.isDay;
        window._weatherData=data;
        if(window._setWeatherMood)window._setWeatherMood(data.code,data.isDay);
    }

    function getCached(){
        try{var raw=localStorage.getItem(CACHE_KEY);if(!raw)return null;var parsed=JSON.parse(raw);if(Date.now()-parsed.ts<TTL)return parsed.data;return null;}catch(e){return null;}
    }
    function parseRes(json){return{temp:json.current.temperature_2m,code:json.current.weather_code,isDay:!!json.current.is_day,wind:json.current.wind_speed_10m||0};}

    try{
        var cached=getCached();
        if(cached){render(cached);}
        else{
            var res=await window._fetchT(_wUrl,null,6000);
            if(res.ok){
                var data=parseRes(await res.json());
                localStorage.setItem(CACHE_KEY,JSON.stringify({data:data,ts:Date.now()}));
                render(data);
            }
        }
    }catch(e){}

    setInterval(async function(){
        if(document.hidden)return;
        try{
            var res=await window._fetchT(_wUrl,null,6000);
            if(res.ok){var data=parseRes(await res.json());localStorage.setItem(CACHE_KEY,JSON.stringify({data:data,ts:Date.now()}));render(data);}
        }catch(e){}
    },3600000);
})();

// ═══ VISITOR COUNTER ═══
(function(){
    var count=parseInt(localStorage.getItem('vc')||'0')+1;
    var base=4200+Math.floor(count*1.3);
    localStorage.setItem('vc',count.toString());
    var vcEl = document.getElementById('visitorCount');
    if(vcEl) vcEl.textContent='Visitor #'+base.toLocaleString();
})();

// ═════════════════════════════════════════════════
// FEATURE: TESTIMONIAL CAROUSEL (80+ recommendations)
// ═════════════════════════════════════════════════
(function(){
var TC=[
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

var CATS={
    all:{label:'All',icon:'✦',color:'var(--accent)'},
    strategy:{label:'Strategy',icon:'🏛️',color:'#6366f1'},
    tech:{label:'Tech',icon:'🚀',color:'#00e1ff'},
    mentor:{label:'Mentoring',icon:'🎓',color:'#22c55e'},
    agile:{label:'Agile',icon:'⚡',color:'#f97316'},
    results:{label:'Results',icon:'🛠️',color:'#ef4444'},
    team:{label:'Culture',icon:'🤝',color:'#a855f7'}
};

var AVATAR_COLORS=['#6366f1','#00e1ff','#22c55e','#f97316','#ef4444','#a855f7','#3b82f6','#ec4899','#14b8a6','#eab308'];

var currentCat='all',currentIdx=0,filtered=[],autoTimer=null,autoFill=null;

function getFiltered(cat){return cat==='all'?[].concat(TC):TC.filter(function(t){return t.c===cat;});}

function shuffle(arr){for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;}return arr;}

function getInitials(name){var parts=name.split(' ');return parts.length>1?(parts[0][0]+parts[parts.length-1][0]).toUpperCase():name.substring(0,2).toUpperCase();}

function getAvatarColor(name){var h=0;for(var i=0;i<name.length;i++)h=name.charCodeAt(i)+((h<<5)-h);return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length];}

function buildCats(){
    var el=document.getElementById('tcCats');
    el.innerHTML=Object.keys(CATS).map(function(k){
        var cat=CATS[k];
        var count=k==='all'?TC.length:TC.filter(function(t){return t.c===k;}).length;
        return '<button class="tc-cat'+(k===currentCat?' active':'')+'" data-cat="'+k+'">'+cat.icon+' '+cat.label+'<span class="tc-cat-count">'+count+'</span></button>';
    }).join('');
    el.querySelectorAll('.tc-cat').forEach(function(btn){
        btn.addEventListener('click',function(){
            if(window._haptic)window._haptic.tap();
            currentCat=btn.dataset.cat;currentIdx=0;
            el.querySelectorAll('.tc-cat').forEach(function(b){b.classList.remove('active');});
            btn.classList.add('active');
            filtered=shuffle(getFiltered(currentCat));
            render();startAuto();
        });
    });
}

function buildSlide(t){
    var cat=CATS[t.c];
    var initials=getInitials(t.n);
    var bgColor=getAvatarColor(t.n);
    return '<div class="tc-slide"><div class="tc-card"><div class="tc-quote">'+t.q+'</div><div class="tc-author"><div class="tc-avatar" style="background:'+bgColor+'">'+initials+'</div><div class="tc-info"><div class="tc-name">'+t.n+'</div><div class="tc-role">'+t.r+'</div></div><span class="tc-cat-badge" style="color:'+cat.color+';background:'+cat.color+'15">'+cat.icon+' '+cat.label+'</span></div></div></div>';
}

function updateUI(){
    var track=document.getElementById('tcTrack');
    if(!track)return;
    track.style.transform='translateX(-'+currentIdx*100+'%)';
    var dots=document.getElementById('tcDots');
    var maxDots=Math.min(filtered.length,7);
    var startDot=Math.max(0,Math.min(currentIdx-3,filtered.length-maxDots));
    var dotsHtml='';
    for(var i=startDot;i<startDot+maxDots&&i<filtered.length;i++){
        dotsHtml+='<div class="tc-dot'+(i===currentIdx?' active':'')+'" data-idx="'+i+'"></div>';
    }
    dots.innerHTML=dotsHtml;
    dots.querySelectorAll('.tc-dot').forEach(function(d){d.addEventListener('click',function(){currentIdx=parseInt(d.dataset.idx);updateUI();startAuto();if(window._haptic)window._haptic.tap();});});
    document.getElementById('tcCounter').textContent=(currentIdx+1)+' / '+filtered.length;
    var fill=document.getElementById('tcAutoFill');
    if(fill){
        fill.classList.remove('running');
        fill.style.width=(filtered.length>1?((currentIdx/(filtered.length-1))*100):0)+'%';
    }
}

function render(){
    var track=document.getElementById('tcTrack');
    if(!track)return;
    track.innerHTML=filtered.map(buildSlide).join('');
    track.style.transition='none';
    track.style.transform='translateX(-'+currentIdx*100+'%)';
    void track.offsetWidth;
    track.style.transition='';
    updateUI();
}

function next(){currentIdx=(currentIdx+1)%filtered.length;updateUI();}
function prev(){currentIdx=(currentIdx-1+filtered.length)%filtered.length;updateUI();}

function startAuto(){
    stopAuto();
    autoTimer=setTimeout(function(){next();startAuto();},6000);
}
function stopAuto(){if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}}

filtered=shuffle(getFiltered('all'));

window._rerenderTestimonials = function() { currentIdx = 0; filtered=shuffle(getFiltered('all')); render(); startAuto(); };

try {
buildCats();render();

document.getElementById('tcPrev').addEventListener('click',function(){prev();startAuto();if(window._haptic)window._haptic.swipe();});
document.getElementById('tcNext').addEventListener('click',function(){next();startAuto();if(window._haptic)window._haptic.swipe();});

var tcAutoBar=document.querySelector('.tc-auto-bar');
if(tcAutoBar){tcAutoBar.addEventListener('click',function(e){
    var rect=tcAutoBar.getBoundingClientRect();
    var pct=(e.clientX-rect.left)/rect.width;
    currentIdx=Math.round(pct*(filtered.length-1));
    updateUI();startAuto();if(window._haptic)window._haptic.tap();
});}

var stx=0;var vp=document.getElementById('tcViewport');
vp.addEventListener('touchstart',function(e){stx=e.touches[0].clientX;stopAuto();},{passive:true});
vp.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-stx;if(Math.abs(dx)>40){dx<0?next():prev();}startAuto();},{passive:true});

vp.addEventListener('mouseenter',stopAuto);
vp.addEventListener('mouseleave',startAuto);

setTimeout(startAuto,5000);
} catch(_tcErr) {
console.error('[TC] init error:', _tcErr);
}
})();
