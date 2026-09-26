/* 🫶 Talk to ʻOhana — LIVE agent chat, bottom-right (2026-09-27)
   Not a contact card anymore: a real bell-waked agent (OHANA DESK 🫶) answers on the
   ohana-chat hub, same lane as Terri/Spector/Globy doors. Self-contained: injects its
   own styles + DOM, zero console output.
   Cursor law (shaka-home scar 2026-09-27): NEVER advance `after` on send — the hub seq
   is global and an interleaved reply can carry a lower seq; the poll loop consumes
   everything and a seen-set dedupes our own echo. Catch-up renders full history on open. */
(function () {
  'use strict';
  if (document.getElementById('ohanaTalkRoot')) return;
  var HUB = 'https://ohana-chat.shakaverse.workers.dev';

  var css = `
  #ohanaTalkRoot{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:9000;font-family:var(--sans,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif)}
  #ohanaTalkRoot .ot-fab{display:flex;align-items:center;gap:9px;border:1px solid var(--pinkline,rgba(242,167,195,.34));border-radius:999px;padding:11px 17px;cursor:pointer;color:var(--ink,#f2f3ff);font-size:14.5px;font-weight:650;letter-spacing:.01em;background:linear-gradient(160deg,rgba(42,22,80,.92),rgba(20,26,68,.92));box-shadow:0 10px 32px rgba(3,6,24,.55),inset 0 1px 0 rgba(255,255,255,.10);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform .18s ease,border-color .18s ease}
  #ohanaTalkRoot .ot-fab:hover{transform:translateY(-2px);border-color:rgba(242,167,195,.6)}
  #ohanaTalkRoot .ot-fab .ot-dot{width:8px;height:8px;border-radius:50%;background:var(--green,#7ef0b2);box-shadow:0 0 8px var(--green,#7ef0b2);flex:none;animation:otPulse 2.2s infinite}
  @keyframes otPulse{0%{box-shadow:0 0 0 0 rgba(126,240,178,.55)}70%{box-shadow:0 0 0 7px rgba(126,240,178,0)}100%{box-shadow:0 0 0 0 rgba(126,240,178,0)}}
  #ohanaTalkRoot .ot-back{position:fixed;inset:0;background:rgba(6,7,20,.45);border:0;padding:0;cursor:default}
  #ohanaTalkRoot .ot-panel{position:absolute;right:0;bottom:calc(100% + 12px);width:min(360px,calc(100vw - 36px));height:min(520px,calc(100vh - 120px));display:flex;flex-direction:column;border-radius:18px;border:1px solid var(--line,rgba(255,255,255,.15));background:linear-gradient(170deg,rgba(20,26,68,.97),rgba(10,14,42,.97));box-shadow:0 18px 54px rgba(3,6,24,.6),inset 0 1px 0 rgba(255,255,255,.10);overflow:hidden;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
  #ohanaTalkRoot .ot-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:15px 16px 10px;border-bottom:1px solid var(--line,rgba(255,255,255,.12));flex:none}
  #ohanaTalkRoot .ot-title{font-size:16px;font-weight:750;color:var(--ink,#f2f3ff)}
  #ohanaTalkRoot .ot-sub{font-size:12px;line-height:1.45;color:var(--muted,#aab2d8);margin-top:2px}
  #ohanaTalkRoot .ot-sub .ot-live{color:var(--green,#7ef0b2);font-weight:700}
  #ohanaTalkRoot .ot-x{border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(255,255,255,.05);color:var(--muted,#aab2d8);border-radius:9px;width:28px;height:28px;cursor:pointer;font-size:14px;line-height:1;flex:none}
  #ohanaTalkRoot .ot-x:hover{color:var(--ink,#f2f3ff)}
  #ohanaTalkRoot .ot-log{flex:1;overflow-y:auto;padding:13px 14px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
  #ohanaTalkRoot .ot-m{max-width:86%;padding:9px 12px;border-radius:13px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;color:var(--ink,#f2f3ff)}
  #ohanaTalkRoot .ot-m.ot-v{align-self:flex-end;background:linear-gradient(135deg,rgba(242,167,195,.9),rgba(199,146,255,.9));color:#1b1030;border-bottom-right-radius:4px}
  #ohanaTalkRoot .ot-m.ot-a{align-self:flex-start;background:rgba(255,255,255,.055);border:1px solid var(--line,rgba(255,255,255,.13));border-bottom-left-radius:4px}
  #ohanaTalkRoot .ot-m.ot-a .ot-who{font-size:11px;color:var(--pink,#f2a7c3);font-weight:750;margin-bottom:3px}
  #ohanaTalkRoot .ot-note{align-self:center;font-size:11px;color:var(--muted,#8a93b8);text-align:center;max-width:94%;line-height:1.45}
  #ohanaTalkRoot .ot-m a,#ohanaTalkRoot .ot-note a{color:var(--pink,#f2a7c3);text-decoration:underline;word-break:break-all}
  #ohanaTalkRoot .ot-m.ot-v a{color:#1b1030}
  #ohanaTalkRoot .ot-typing{display:none;padding:2px 16px 6px;color:var(--muted,#aab2d8);font-size:13px;flex:none}
  #ohanaTalkRoot .ot-typing.on{display:block}
  #ohanaTalkRoot .ot-typing span{display:inline-block;animation:otB 1.2s infinite}
  #ohanaTalkRoot .ot-typing span:nth-child(2){animation-delay:.2s}
  #ohanaTalkRoot .ot-typing span:nth-child(3){animation-delay:.4s}
  @keyframes otB{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}
  #ohanaTalkRoot .ot-form{display:flex;gap:8px;padding:11px 12px;border-top:1px solid var(--line,rgba(255,255,255,.12));flex:none}
  #ohanaTalkRoot .ot-in{flex:1;background:rgba(6,8,26,.7);border:1px solid var(--line,rgba(255,255,255,.16));border-radius:10px;color:var(--ink,#f2f3ff);padding:10px 12px;font-size:14px;font-family:inherit;resize:none;height:42px}
  #ohanaTalkRoot .ot-in:focus{outline:none;border-color:var(--pink,#f2a7c3)}
  #ohanaTalkRoot .ot-send{background:linear-gradient(135deg,var(--pink,#f2a7c3),#c792ff);color:#1b1030;border:none;border-radius:10px;padding:0 15px;font-weight:800;font-size:13.5px;cursor:pointer}
  #ohanaTalkRoot .ot-foot{flex:none;text-align:center;font-size:10.5px;color:var(--muted,#7f88ae);padding:0 12px 9px}
  #ohanaTalkRoot .ot-foot a{color:var(--muted,#9aa3c8);text-decoration:underline}
  @media(max-width:560px){
    #ohanaTalkRoot .ot-panel{position:fixed;right:0;left:0;bottom:0;width:100vw;height:100dvh;max-height:100dvh;border-radius:0;border:none;border-top:1px solid var(--line,rgba(255,255,255,.18))}
    #ohanaTalkRoot .ot-in{font-size:16px}
    #ohanaTalkRoot .ot-form{padding-bottom:calc(11px + env(safe-area-inset-bottom))}
  }`;

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var root = document.createElement('div');
  root.id = 'ohanaTalkRoot';
  root.innerHTML =
    '<button type="button" class="ot-fab" aria-label="Talk to the ʻOhana — live agent chat">' +
      '<span class="ot-dot"></span><span>💬 Talk to ʻOhana</span></button>' +
    '<div class="ot-panel" role="dialog" aria-label="ʻOhana live chat" hidden>' +
      '<div class="ot-head"><div><div class="ot-title">🫶 Talk to the ʻOhana</div>' +
        '<div class="ot-sub"><span class="ot-live">● live</span> — a real agent answers, usually within a minute or two.</div></div>' +
        '<button type="button" class="ot-x" aria-label="Close chat">✕</button></div>' +
      '<div class="ot-log" aria-live="polite"></div>' +
      '<div class="ot-typing"><span>●</span><span>●</span><span>●</span></div>' +
      '<form class="ot-form"><textarea class="ot-in" rows="1" placeholder="Ask the family anything — hiring, blessing, the agents, the build…"></textarea>' +
        '<button type="submit" class="ot-send">Send</button></form>' +
      '<div class="ot-foot">prefer another door? <a href="https://t.me/AgentOhanaBot" target="_blank" rel="noopener">Telegram</a> · <a href="mailto:aloha@myagentohana.com">aloha@myagentohana.com</a></div>' +
    '</div>';
  document.body.appendChild(root);

  var $ = function (s) { return root.querySelector(s); };
  var fab = $('.ot-fab'), panel = $('.ot-panel'), log = $('.ot-log'),
      typing = $('.ot-typing'), form = $('.ot-form'), input = $('.ot-in');

  var sess = null;
  try { sess = localStorage.getItem('oh_talk_sess'); } catch (e) {}
  if (!sess) {
    sess = (window.crypto && crypto.randomUUID ? crypto.randomUUID()
           : Date.now() + '-' + Math.random().toString(36).slice(2)).slice(0, 36);
    try { localStorage.setItem('oh_talk_sess', sess); } catch (e) {}
  }

  var after = 0, seen = {}, open = false, polling = false, caughtUp = false;

  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function anchor(url, txt) {
    url = url.replace(/"/g, '%22');
    var label = txt || (url.length > 42 ? url.slice(0, 40) + '…' : url).replace(/^https?:\/\//, '');
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
  }
  function rich(s) {
    var h = esc(s);
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, t, u) { return anchor(u, t); });
    h = h.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, function (m, pre, u) {
      var trail = ''; var mm = u.match(/[.,!?;:)\]]+$/);
      if (mm) { trail = mm[0]; u = u.slice(0, u.length - trail.length); }
      return pre + anchor(u) + trail;
    });
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    return h;
  }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function add(role, text, name) {
    var m = document.createElement('div');
    m.className = 'ot-m ' + (role === 'visitor' ? 'ot-v' : 'ot-a');
    m.innerHTML = (role === 'visitor' ? '' : '<div class="ot-who">' + esc(name || 'ʻOHANA 🫶') + '</div>') + rich(text);
    log.appendChild(m); scroll();
  }
  function note(t) {
    var n = document.createElement('div'); n.className = 'ot-note'; n.innerHTML = rich(t);
    log.appendChild(n); scroll();
  }
  function render(m) {
    // advance the cursor for EVERY delivered message (incl. our own echo) so the
    // long-poll never spins; interleaved replies arrive in the same batch, in order.
    if (m.seq > after) after = m.seq;
    if (seen[m.seq]) return;
    seen[m.seq] = 1;
    if (m.role === 'visitor') add('visitor', m.text);
    else if (m.role === 'system') note(m.text);
    else add('agent', m.text, m.name);
  }
  function greet() {
    if (log.children.length) return;
    note('Live line to the ʻohana — a real agent answers. Conversations may be reviewed with aloha.');
    add('agent', '🫶 Aloha, e komo mai! You’ve reached the ʻohana’s front desk — ask about hiring an agent, blessing one with your World ID, revoking, or anything about how this family is built. What brings you by?');
  }
  function catchUp() {
    // full-history render once per page load — any stuck client self-heals on open
    return fetch(HUB + '/poll?session=' + encodeURIComponent(sess) + '&after=0')
      .then(function (r) { return r.json(); })
      .then(function (d) { (d.messages || []).forEach(render); caughtUp = true; greet(); })
      .catch(function () { caughtUp = true; greet(); });
  }
  function poll() {
    if (polling) return; polling = true;
    (function loop() {
      if (!open) { polling = false; return; }
      fetch(HUB + '/poll?session=' + encodeURIComponent(sess) + '&after=' + after + '&wait=25')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          (d.messages || []).forEach(render);
          typing.className = 'ot-typing' + (d.typing ? ' on' : '');
          if (d.typing) scroll();
          loop();
        })
        .catch(function () { setTimeout(loop, 4000); });
    })();
  }

  function openPanel() {
    open = true; panel.hidden = false; fab.style.display = 'none';
    (caughtUp ? Promise.resolve(greet()) : catchUp()).then(function () { poll(); });
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);
  }
  function closePanel() { open = false; panel.hidden = true; fab.style.display = ''; }

  fab.addEventListener('click', openPanel);
  $('.ot-x').addEventListener('click', closePanel);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value.trim();
    if (!t) return;
    input.value = '';
    add('visitor', t);
    fetch(HUB + '/send', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: sess, text: t, name: 'guest' })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        // cursor law: mark our echo seen, but NEVER advance `after` here —
        // the poll loop owns the cursor (interleaved replies stay visible).
        if (d && d.seq) seen[d.seq] = 1;
        if (d && d.error) note(d.error);
      })
      .catch(function () { note('connection hiccup — that message may not have sent; try again 🫶'); });
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.dispatchEvent(new Event('submit', { cancelable: true })); }
  });
})();
