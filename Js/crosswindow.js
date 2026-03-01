// ═══════════════════════════════════════════════════════════════
// crosswindow.js — Cross-Window DOM Teleportation Engine
//
// Tears off Terminal & Live Visualizer into separate browser
// windows. Glowing particles flow between windows via
// screen-space coordinate math and BroadcastChannel sync.
// ═══════════════════════════════════════════════════════════════
(function() {
  'use strict';

  if (typeof BroadcastChannel === 'undefined') return;

  // ─── Constants & State ─────────────────────────────
  var CH  = 'amr-cw-v1';
  var ID  = 'p_' + Math.random().toString(36).slice(2, 8);
  var STALE = 3000;
  var BP_N  = 40;

  var bc = new BroadcastChannel(CH);
  var geo = { x: 0, y: 0, w: 0, h: 0 };
  var peers    = {};
  var children = {};
  var pcvs, pctx;
  var bps = [];
  var lastT = 0;

  // ─── Geometry ──────────────────────────────────────
  function syncGeo() {
    geo.x = window.screenX || window.screenLeft || 0;
    geo.y = window.screenY || window.screenTop  || 0;
    geo.w = window.innerWidth;
    geo.h = window.innerHeight;
  }

  function vec(a, b) {
    var dx = (b.x + b.w / 2) - (a.x + a.w / 2);
    var dy = (b.y + b.h / 2) - (a.y + a.h / 2);
    var d  = Math.sqrt(dx * dx + dy * dy) || 1;
    return { dx: dx, dy: dy, d: d, nx: dx / d, ny: dy / d };
  }

  // ─── Broadcast Channel ─────────────────────────────
  function send(o) { o.from = ID; try { bc.postMessage(o); } catch (_) {} }

  bc.onmessage = function(e) {
    var m = e.data;
    if (m.from === ID) return;
    if (m.type === 'geo')   { peers[m.from] = { geo: m.geo, seen: Date.now(), tearoff: m.tearoff }; ensureLoop(); return; }
    if (m.type === 'cmd')   { processCmd(m); return; }
    if (m.type === 'close') { delete peers[m.from]; }
  };

  // ─── Child Command Processing ──────────────────────
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  function processCmd(m) {
    if (m.parentId && m.parentId !== ID) return;
    var T = window.TermCmds;
    if (!T) return;
    var parts = m.cmd.split(/\s+/);
    var c = parts[0].toLowerCase();
    var a = parts.slice(1).join(' ');
    var r = '';
    try {
      r = T[c] ? (T[c](a) || '') : '<span class="term-red">command not found: ' + esc(c) + '</span>';
    } catch (e) {
      r = '<span class="term-red">Error: ' + esc(e.message) + '</span>';
    }
    if (r === '__CLEAR__') { send({ type: 'clear-term' }); }
    else                   { send({ type: 'result', html: r }); }
  }

  // ─── Portal Canvas ────────────────────────────────
  function ensureCanvas() {
    if (pcvs) return;
    pcvs = document.createElement('canvas');
    pcvs.id = 'cwPortal';
    pcvs.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;';
    document.body.appendChild(pcvs);
    pctx = pcvs.getContext('2d');
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    for (var i = 0; i < BP_N; i++) bps.push({ on: false });
  }

  function sizeCanvas() {
    if (pcvs) { pcvs.width = window.innerWidth; pcvs.height = window.innerHeight; }
  }

  // ─── Bridge Particles ─────────────────────────────
  function spawnBP(pg) {
    var p = null;
    for (var i = 0; i < bps.length; i++) { if (!bps[i].on) { p = bps[i]; break; } }
    if (!p) return;
    var v  = vec(geo, pg);
    var hz = Math.abs(v.nx) > Math.abs(v.ny);
    p.on = true;
    p.x  = hz ? (v.nx > 0 ? geo.w + 4 : -4) : geo.w * (0.1 + Math.random() * 0.8);
    p.y  = hz ? geo.h * (0.1 + Math.random() * 0.8) : (v.ny > 0 ? geo.h + 4 : -4);
    var sp = 35 + Math.random() * 85;
    p.vx = -v.nx * sp + (Math.random() - 0.5) * 22;
    p.vy = -v.ny * sp + (Math.random() - 0.5) * 22;
    p.ml   = 2 + Math.random() * 3.5;
    p.life = p.ml;
    p.sz   = 1 + Math.random() * 2.5;
    p.hue  = 175 + Math.random() * 35;
  }

  function tickBP(dt, pg) {
    if (Math.random() < 0.3) spawnBP(pg);
    for (var i = 0; i < bps.length; i++) {
      var p = bps[i];
      if (!p.on) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.x < -30 || p.x > geo.w + 30 || p.y < -30 || p.y > geo.h + 30) p.on = false;
    }
  }

  function drawBP() {
    for (var i = 0; i < bps.length; i++) {
      var p = bps[i];
      if (!p.on) continue;
      var a = Math.min(1, p.life / p.ml * 2) * 0.6;
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.sz, 0, 6.2832);
      pctx.fillStyle   = 'hsla(' + p.hue + ',100%,70%,' + a + ')';
      pctx.shadowColor  = 'hsla(' + p.hue + ',100%,60%,' + (a * 0.5) + ')';
      pctx.shadowBlur   = p.sz * 5;
      pctx.fill();
    }
    pctx.shadowBlur = 0;
  }

  function drawGlow(pg) {
    var v     = vec(geo, pg);
    var pulse = 0.2 + Math.sin(Date.now() * 0.0012) * 0.12;
    var gw    = 50;
    var hz    = Math.abs(v.nx) > Math.abs(v.ny);
    pctx.save();
    var grad;
    if (hz) {
      var ex = v.nx > 0 ? geo.w : 0;
      grad = pctx.createLinearGradient(ex, 0, ex + (v.nx > 0 ? -gw : gw), 0);
    } else {
      var ey = v.ny > 0 ? geo.h : 0;
      grad = pctx.createLinearGradient(0, ey, 0, ey + (v.ny > 0 ? -gw : gw));
    }
    grad.addColorStop(0, 'rgba(0,225,255,' + pulse + ')');
    grad.addColorStop(1, 'rgba(0,225,255,0)');
    pctx.fillStyle = grad;
    if (hz) pctx.fillRect(v.nx > 0 ? geo.w - gw : 0, 0, gw, geo.h);
    else    pctx.fillRect(0, v.ny > 0 ? geo.h - gw : 0, geo.w, gw);
    pctx.restore();
  }

  // ─── Tearoff Functions ─────────────────────────────
  function tearTerminal() {
    if (children.terminal && !children.terminal.closed) { children.terminal.focus(); return; }
    var left = Math.max(0, (screen.width || 1200) - 660);
    var w = window.open('', 'cw_term', 'width=620,height=460,left=' + left + ',top=120');
    if (!w) { if (window.UniToast) window.UniToast('Pop-up blocked \u2014 allow pop-ups for cross-window mode'); return; }
    children.terminal = w;
    w.document.write(termHTML());
    w.document.close();
    pollChild('terminal');
    if (window.UniToast) window.UniToast('Terminal torn off \u2014 drag windows to see the particle bridge');
  }

  function tearChart() {
    if (children.chart && !children.chart.closed) { children.chart.focus(); return; }
    var left = Math.max(0, (screen.width || 1200) - 760);
    var w = window.open('', 'cw_chart', 'width=720,height=480,left=' + left + ',top=160');
    if (!w) { if (window.UniToast) window.UniToast('Pop-up blocked \u2014 allow pop-ups for cross-window mode'); return; }
    children.chart = w;
    w.document.write(chartHTML());
    w.document.close();
    pollChild('chart');
    if (window.UniToast) window.UniToast('Chart torn off \u2014 live Binance feed in a separate window');
  }

  var _childPollers = [];
  function pollChild(k) {
    var iv = setInterval(function() {
      if (!children[k] || children[k].closed) { delete children[k]; clearInterval(iv); var idx = _childPollers.indexOf(iv); if (idx >= 0) _childPollers.splice(idx, 1); }
    }, 600);
    _childPollers.push(iv);
  }
  window.addEventListener('beforeunload', function() { _childPollers.forEach(clearInterval); _childPollers.length = 0; });

  // ─── Shared Child Bridge Script ────────────────────
  function bridgeScript() {
    return [
      'var _bC=document.getElementById("cwP"),_bX=_bC.getContext("2d"),_bp=[];',
      'function _bR(){_bC.width=innerWidth;_bC.height=innerHeight}_bR();',
      'addEventListener("resize",_bR);',
      'for(var _i=0;_i<25;_i++)_bp.push({a:0});',
      '',
      'function _bF(dt){',
      '  _bX.clearRect(0,0,_bC.width,_bC.height);',
      '  if(!parentGeo)return;',
      '  var dx=(parentGeo.x+parentGeo.w/2)-(geo.x+geo.w/2),',
      '      dy=(parentGeo.y+parentGeo.h/2)-(geo.y+geo.h/2),',
      '      d=Math.sqrt(dx*dx+dy*dy)||1,',
      '      nx=dx/d,ny=dy/d,hz=Math.abs(nx)>Math.abs(ny);',
      '  if(Math.random()<.25){',
      '    for(var i=0;i<_bp.length;i++){',
      '      if(_bp[i].a)continue;var p=_bp[i];p.a=1;',
      '      p.x=hz?(nx>0?innerWidth+3:-3):(Math.random()*innerWidth);',
      '      p.y=hz?(Math.random()*innerHeight):(ny>0?innerHeight+3:-3);',
      '      var sp=35+Math.random()*80;',
      '      p.vx=-nx*sp+(Math.random()-.5)*20;',
      '      p.vy=-ny*sp+(Math.random()-.5)*20;',
      '      p.m=2+Math.random()*3;p.l=p.m;',
      '      p.s=1+Math.random()*2;p.h=175+Math.random()*35;break;',
      '    }',
      '  }',
      '  var pulse=.18+Math.sin(Date.now()*.0012)*.1,gw=40;',
      '  _bX.save();var gr;',
      '  if(hz){var e=nx>0?innerWidth:0;gr=_bX.createLinearGradient(e,0,e+(nx>0?-gw:gw),0);}',
      '  else{var e2=ny>0?innerHeight:0;gr=_bX.createLinearGradient(0,e2,0,e2+(ny>0?-gw:gw));}',
      '  gr.addColorStop(0,"rgba(0,225,255,"+pulse+")");gr.addColorStop(1,"rgba(0,225,255,0)");',
      '  _bX.fillStyle=gr;',
      '  if(hz)_bX.fillRect(nx>0?innerWidth-gw:0,0,gw,innerHeight);',
      '  else _bX.fillRect(0,ny>0?innerHeight-gw:0,innerWidth,gw);',
      '  _bX.restore();',
      '  for(var i=0;i<_bp.length;i++){',
      '    var p=_bp[i];if(!p.a)continue;',
      '    p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt;',
      '    if(p.l<=0||p.x<-30||p.x>innerWidth+30||p.y<-30||p.y>innerHeight+30){p.a=0;continue;}',
      '    var al=Math.min(1,p.l/p.m*2)*.55;',
      '    _bX.beginPath();_bX.arc(p.x,p.y,p.s,0,6.28);',
      '    _bX.fillStyle="hsla("+p.h+",100%,70%,"+al+")";',
      '    _bX.shadowColor="hsla("+p.h+",100%,60%,"+(al*.4)+")";',
      '    _bX.shadowBlur=p.s*4;_bX.fill();',
      '  }',
      '  _bX.shadowBlur=0;',
      '}',
    ].join('\n');
  }

  // ─── Terminal Child HTML ───────────────────────────
  function termHTML() {
    var css = [
      '*{margin:0;padding:0;box-sizing:border-box}',
      'html,body{height:100%}',
      'body{background:#0d1117;color:#c9d1d9;font-family:"JetBrains Mono",monospace;display:flex;flex-direction:column;overflow:hidden}',
      '.cw-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#161b22;border-bottom:1px solid #30363d;user-select:none}',
      '.cw-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.6);animation:pulse 2s infinite}',
      '.cw-title{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#6f7b8f;flex:1}',
      '.cw-st{font-size:9px;color:#00e1ff}',
      '.cw-body{flex:1;overflow-y:auto;padding:14px;font-size:11px;line-height:1.7}',
      '.cw-il{display:flex;align-items:center;gap:6px;padding:10px 14px;border-top:1px solid #30363d;background:#0d1117}',
      '.cw-p{color:#22c55e;font-weight:bold}',
      '.cw-in{flex:1;background:transparent;border:none;outline:none;color:#c9d1d9;font-family:"JetBrains Mono",monospace;font-size:11px;caret-color:#58a6ff}',
      '.term-line{margin-bottom:2px}',
      '.term-green{color:#22c55e}.term-cyan{color:#00e1ff}.term-red{color:#ef4444}',
      '.term-gray{color:#6f7b8f}.term-white{color:#e6edf3}.term-accent{color:#ff6ec7}.term-warn{color:#f59e0b}',
      'canvas#cwP{position:fixed;inset:0;pointer-events:none;z-index:10}',
      '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}',
      '::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#30363d;border-radius:4px}',
      '::selection{background:rgba(0,225,255,.15)}',
    ].join('\n');

    var body = [
      '<div class="cw-bar">',
      '  <span class="cw-dot"></span>',
      '  <span class="cw-title">Torn-Off Terminal</span>',
      '  <span class="cw-st" id="cwSt">\ud83d\udd17 Connected</span>',
      '</div>',
      '<div class="cw-body" id="cwBody">',
      '  <div class="term-line"><span class="term-gray">// Terminal teleported from amrelharony.com</span></div>',
      '  <div class="term-line"><span class="term-gray">// Commands execute on the main page</span></div>',
      '  <div class="term-line"><span class="term-gray">// Type <span class="term-cyan">help</span> to get started</span></div>',
      '  <div class="term-line">&nbsp;</div>',
      '</div>',
      '<div class="cw-il">',
      '  <span class="cw-p">\u276f</span>',
      '  <input class="cw-in" id="cwIn" type="text" autofocus autocomplete="off" spellcheck="false" placeholder="type a command...">',
      '</div>',
      '<canvas id="cwP"></canvas>',
    ].join('\n');

    var js = termScript();

    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<title>Terminal \u2014 amrelharony.com</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">' +
      '<style>' + css + '</style></head><body>' + body +
      '<script>' + js + '<\/script></body></html>';
  }

  function termScript() {
    return [
      'var CH="' + CH + '",ID="c_"+Math.random().toString(36).slice(2,8);',
      'var PARENT_ID="' + ID + '";',
      'var bc=new BroadcastChannel(CH);',
      'var geo={x:0,y:0,w:0,h:0},parentGeo=null;',
      'var body=document.getElementById("cwBody");',
      'var inp=document.getElementById("cwIn");',
      'var st=document.getElementById("cwSt");',
      '',
      'function syncGeo(){',
      '  geo.x=window.screenX||window.screenLeft||0;',
      '  geo.y=window.screenY||window.screenTop||0;',
      '  geo.w=window.innerWidth;geo.h=window.innerHeight;',
      '}',
      '',
      'bc.onmessage=function(e){',
      '  var m=e.data;if(m.from===ID)return;',
      '  if(m.type==="geo"&&m.from===PARENT_ID)parentGeo=m.geo;',
      '  if(m.type==="result"&&m.from===PARENT_ID){',
      '    var d=document.createElement("div");d.className="term-line";',
      '    d.innerHTML=m.html;body.appendChild(d);body.scrollTop=body.scrollHeight;',
      '  }',
      '  if(m.type==="clear-term"&&m.from===PARENT_ID)body.innerHTML="";',
      '  if(m.type==="close"&&m.from===PARENT_ID){st.textContent="\\u274c Disconnected";st.style.color="#ef4444";}',
      '};',
      '',
      'function esc(s){return String(s).replace(/&/g,"&amp;").replace(/\\x3c/g,"&lt;").replace(/>/g,"&gt;");}',
      '',
      'inp.addEventListener("keydown",function(e){',
      '  if(e.key!=="Enter")return;',
      '  var cmd=inp.value.trim();if(!cmd)return;',
      '  if(cmd==="exit"||cmd==="quit"||cmd==="close"){window.close();return;}',
      '  var d=document.createElement("div");d.className="term-line";',
      '  d.innerHTML=\'<span class="cw-p">\\u276f</span> \'+esc(cmd);',
      '  body.appendChild(d);body.scrollTop=body.scrollHeight;',
      '  bc.postMessage({type:"cmd",from:ID,cmd:cmd,parentId:PARENT_ID});',
      '  inp.value="";',
      '});',
      '',
      'document.addEventListener("keydown",function(e){if(e.key==="Escape")window.close();});',
      '',
      bridgeScript(),
      '',
      'var lastT=0;',
      'function frame(now){',
      '  var dt=Math.min((now-lastT)/1000,0.1);lastT=now;',
      '  syncGeo();',
      '  bc.postMessage({type:"geo",from:ID,geo:geo,tearoff:"terminal"});',
      '  _bF(dt);',
      '  requestAnimationFrame(frame);',
      '}',
      'requestAnimationFrame(frame);',
      '',
      'window.addEventListener("beforeunload",function(){',
      '  bc.postMessage({type:"close",from:ID});bc.close();',
      '});',
    ].join('\n');
  }

  // ─── Chart Child HTML ─────────────────────────────
  function chartHTML() {
    var css = [
      '*{margin:0;padding:0;box-sizing:border-box}',
      'html,body{height:100%}',
      'body{background:#060910;overflow:hidden;font-family:"JetBrains Mono",monospace}',
      '#tc{display:block}',
      '.hud{position:fixed;top:12px;left:14px;z-index:5;pointer-events:none}',
      '.hr{font-size:10px;letter-spacing:1px;color:#6f7b8f;margin-bottom:4px}',
      '.hb{font-size:18px;color:#00e1ff;font-weight:bold}',
      '#cwSt{position:fixed;top:12px;right:14px;font-size:9px;color:#00e1ff;z-index:5}',
      'canvas#cwP{position:fixed;inset:0;pointer-events:none;z-index:10}',
    ].join('\n');

    var body = [
      '<canvas id="tc"></canvas>',
      '<div class="hud">',
      '  <div class="hr hb" id="hP">---</div>',
      '  <div class="hr"><span style="color:#00e1ff">BUY</span> \u2502 <span style="color:#ff6ec7">SELL</span></div>',
      '  <div class="hr" id="hT">0 trades/s</div>',
      '  <div class="hr" id="hA">BTC \u00b7 ETH \u00b7 SOL</div>',
      '</div>',
      '<span id="cwSt">\ud83d\udd17 Connecting...</span>',
      '<canvas id="cwP"></canvas>',
    ].join('\n');

    var js = chartScript();

    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<title>Live Trades \u2014 amrelharony.com</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">' +
      '<style>' + css + '</style></head><body>' + body +
      '<script>' + js + '<\/script></body></html>';
  }

  function chartScript() {
    return [
      'var CH="' + CH + '",ID="c_"+Math.random().toString(36).slice(2,8);',
      'var PARENT_ID="' + ID + '";',
      'var bc=new BroadcastChannel(CH);',
      'var geo={x:0,y:0,w:0,h:0},parentGeo=null;',
      'var st=document.getElementById("cwSt");',
      '',
      'function syncGeo(){',
      '  geo.x=window.screenX||window.screenLeft||0;',
      '  geo.y=window.screenY||window.screenTop||0;',
      '  geo.w=window.innerWidth;geo.h=window.innerHeight;',
      '}',
      '',
      'bc.onmessage=function(e){',
      '  var m=e.data;if(m.from===ID)return;',
      '  if(m.type==="geo"&&m.from===PARENT_ID)parentGeo=m.geo;',
      '  if(m.type==="close"&&m.from===PARENT_ID){st.textContent="\\u274c Parent closed";st.style.color="#ef4444";}',
      '};',
      '',
      'var tc=document.getElementById("tc"),ctx=tc.getContext("2d");',
      'function resize(){tc.width=innerWidth;tc.height=innerHeight}resize();',
      'addEventListener("resize",resize);',
      'var trades=[],BAR_W=3,tps=0,tpsC=0;',
      'setInterval(function(){tps=tpsC;tpsC=0;document.getElementById("hT").textContent=tps+" trades/s";},1000);',
      '',
      'var wsUrl="wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade";',
      'var ws;',
      'function connectWS(){',
      '  ws=new WebSocket(wsUrl);',
      '  ws.onmessage=function(e){',
      '    try{',
      '      var d=JSON.parse(e.data).data;',
      '      var qty=parseFloat(d.q),price=parseFloat(d.p);',
      '      var vol=qty*price,dir=d.m?"sell":"buy";',
      '      var asset=d.s.replace("USDT","");',
      '      trades.push({v:Math.log10(vol+1),d:dir,a:asset});',
      '      var max=Math.ceil(tc.width/BAR_W);',
      '      while(trades.length>max)trades.shift();',
      '      tpsC++;',
      '      if(asset==="BTC")document.getElementById("hP").textContent="$"+price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});',
      '    }catch(err){}',
      '  };',
      '  ws.onopen=function(){st.textContent="\\ud83d\\udd17 Live";st.style.color="#00e1ff";};',
      '  ws.onclose=function(){st.textContent="\\ud83d\\udd04 Reconnecting...";st.style.color="#f59e0b";setTimeout(connectWS,3000);};',
      '  ws.onerror=function(){ws.close();};',
      '}',
      'connectWS();',
      '',
      'function drawTrades(){',
      '  ctx.fillStyle="#060910";ctx.fillRect(0,0,tc.width,tc.height);',
      '  ctx.strokeStyle="rgba(255,255,255,.03)";ctx.lineWidth=1;',
      '  for(var y=0;y<tc.height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(tc.width,y);ctx.stroke();}',
      '  var mid=tc.height/2,maxH=mid-30,maxV=6;',
      '  for(var i=0;i<trades.length;i++){',
      '    var t=trades[i],x=tc.width-(trades.length-i)*BAR_W;',
      '    var h=Math.min(maxH,(t.v/maxV)*maxH);',
      '    var al=.2+(i/(trades.length||1))*.8;',
      '    if(t.d==="buy"){',
      '      ctx.fillStyle="rgba(0,225,255,"+al+")";ctx.fillRect(x,mid-h,BAR_W-1,h);',
      '      if(t.v>4.5){ctx.shadowColor="rgba(0,225,255,.3)";ctx.shadowBlur=8;ctx.fillRect(x,mid-h,BAR_W-1,h);ctx.shadowBlur=0;}',
      '    }else{',
      '      ctx.fillStyle="rgba(255,110,199,"+al+")";ctx.fillRect(x,mid,BAR_W-1,h);',
      '      if(t.v>4.5){ctx.shadowColor="rgba(255,110,199,.3)";ctx.shadowBlur=8;ctx.fillRect(x,mid,BAR_W-1,h);ctx.shadowBlur=0;}',
      '    }',
      '  }',
      '  ctx.strokeStyle="rgba(255,255,255,.08)";',
      '  ctx.beginPath();ctx.moveTo(0,mid);ctx.lineTo(tc.width,mid);ctx.stroke();',
      '  ctx.fillStyle="rgba(255,255,255,.12)";ctx.font="8px JetBrains Mono";',
      '  ctx.fillText("BUY \\u2191",tc.width-50,mid-10);',
      '  ctx.fillText("SELL \\u2193",tc.width-50,mid+16);',
      '}',
      '',
      'document.addEventListener("keydown",function(e){if(e.key==="Escape")window.close();});',
      '',
      bridgeScript(),
      '',
      'var lastT=0;',
      'function frame(now){',
      '  var dt=Math.min((now-lastT)/1000,0.1);lastT=now;',
      '  syncGeo();',
      '  bc.postMessage({type:"geo",from:ID,geo:geo,tearoff:"chart"});',
      '  drawTrades();',
      '  _bF(dt);',
      '  requestAnimationFrame(frame);',
      '}',
      'requestAnimationFrame(frame);',
      '',
      'window.addEventListener("beforeunload",function(){',
      '  bc.postMessage({type:"close",from:ID});bc.close();',
      '  if(ws){ws.onclose=null;ws.close();}',
      '});',
    ].join('\n');
  }

  // ─── Main Animation Loop ──────────────────────────
  var _lastGeoSend = 0;
  function frame(now) {
    var dt = Math.min((now - lastT) / 1000, 0.1);
    lastT = now;

    syncGeo();
    if (now - _lastGeoSend > 100) { send({ type: 'geo', geo: geo }); _lastGeoSend = now; }

    var cutoff = Date.now() - STALE;
    for (var id in peers) {
      if (peers[id].seen < cutoff) delete peers[id];
    }

    var keys = Object.keys(peers);
    if (keys.length > 0) {
      ensureCanvas();
      pctx.clearRect(0, 0, pcvs.width, pcvs.height);
      var pg = peers[keys[0]].geo;
      var serious = document.body.classList.contains('perf-serious');
      drawGlow(pg);
      if (!serious) { tickBP(dt, pg); drawBP(); }
    } else if (pctx) {
      pctx.clearRect(0, 0, pcvs.width, pcvs.height);
    }

    if (Object.keys(peers).length > 0 || _cwRafRunning) requestAnimationFrame(frame);
    else _cwRafRunning = false;
  }
  var _cwRafRunning = false;
  function ensureLoop() { if (!_cwRafRunning) { _cwRafRunning = true; lastT = performance.now(); requestAnimationFrame(frame); } }

  // ─── Lifecycle ─────────────────────────────────────
  window.addEventListener('beforeunload', function() {
    send({ type: 'close' });
    bc.close();
  });

  syncGeo();
  ensureLoop();

  // ─── API ───────────────────────────────────────────
  window._crossWindow = {
    tearTerminal: tearTerminal,
    tearChart: tearChart,
    status: function() {
      var active = [];
      if (children.terminal && !children.terminal.closed) active.push('terminal');
      if (children.chart   && !children.chart.closed)     active.push('chart');
      return {
        id: ID,
        peers: Object.keys(peers).length,
        active: active,
        geo: geo
      };
    },
    closeAll: function() {
      for (var k in children) {
        if (children[k] && !children[k].closed) children[k].close();
      }
      children = {};
    }
  };

})();
