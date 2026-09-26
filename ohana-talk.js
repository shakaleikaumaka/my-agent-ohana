/* 🫶 Talk to ʻOhana — floating contact bubble (2026-09-27)
   Self-contained: injects its own styles + DOM, zero network calls, zero console output.
   Honest chips by law: Telegram = ● LIVE (verified @AgentOhanaBot), Email = REPLIES
   (aloha@ inbox answered by ALOHA MAIL DESK), WhatsApp = STAGED (number claim pending). */
(function () {
  'use strict';
  if (document.getElementById('ohanaTalkRoot')) return;

  var css = `
  #ohanaTalkRoot{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:9000;font-family:var(--sans,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif)}
  #ohanaTalkRoot .ot-fab{display:flex;align-items:center;gap:9px;border:1px solid var(--pinkline,rgba(242,167,195,.34));border-radius:999px;padding:11px 17px;cursor:pointer;color:var(--ink,#f2f3ff);font-size:14.5px;font-weight:650;letter-spacing:.01em;background:linear-gradient(160deg,rgba(42,22,80,.92),rgba(20,26,68,.92));box-shadow:0 10px 32px rgba(3,6,24,.55),inset 0 1px 0 rgba(255,255,255,.10);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform .18s ease,border-color .18s ease}
  #ohanaTalkRoot .ot-fab:hover{transform:translateY(-2px);border-color:rgba(242,167,195,.6)}
  #ohanaTalkRoot .ot-fab .ot-dot{width:8px;height:8px;border-radius:50%;background:var(--green,#7ef0b2);box-shadow:0 0 8px var(--green,#7ef0b2);flex:none}
  #ohanaTalkRoot .ot-back{position:fixed;inset:0;background:rgba(6,7,20,.45);border:0;padding:0;cursor:default}
  #ohanaTalkRoot .ot-panel{position:absolute;right:0;bottom:calc(100% + 12px);width:min(330px,calc(100vw - 36px));border-radius:18px;border:1px solid var(--line,rgba(255,255,255,.15));background:linear-gradient(170deg,rgba(20,26,68,.97),rgba(10,14,42,.97));box-shadow:0 18px 54px rgba(3,6,24,.6),inset 0 1px 0 rgba(255,255,255,.10);padding:18px 18px 14px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
  #ohanaTalkRoot .ot-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:4px}
  #ohanaTalkRoot .ot-title{font-size:16.5px;font-weight:750;color:var(--ink,#f2f3ff)}
  #ohanaTalkRoot .ot-sub{font-size:12.5px;line-height:1.5;color:var(--muted,#aab2d8);margin:2px 0 12px}
  #ohanaTalkRoot .ot-x{border:1px solid var(--line,rgba(255,255,255,.15));background:rgba(255,255,255,.05);color:var(--muted,#aab2d8);border-radius:9px;width:28px;height:28px;cursor:pointer;font-size:14px;line-height:1;flex:none}
  #ohanaTalkRoot .ot-x:hover{color:var(--ink,#f2f3ff)}
  #ohanaTalkRoot .ot-row{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:13px;border:1px solid var(--line,rgba(255,255,255,.15));background:var(--panel,rgba(255,255,255,.045));margin-bottom:9px;text-decoration:none;color:var(--ink,#f2f3ff);transition:border-color .15s ease,background .15s ease}
  #ohanaTalkRoot a.ot-row:hover{border-color:rgba(169,182,255,.5);background:rgba(255,255,255,.07)}
  #ohanaTalkRoot .ot-row.ot-off{opacity:.55;cursor:default}
  #ohanaTalkRoot .ot-ic{font-size:19px;flex:none;width:26px;text-align:center}
  #ohanaTalkRoot .ot-tx{flex:1;min-width:0}
  #ohanaTalkRoot .ot-tx b{display:block;font-size:13.5px;font-weight:700}
  #ohanaTalkRoot .ot-tx span{display:block;font-size:11.5px;color:var(--dim,#8a93b8);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #ohanaTalkRoot .ot-chip{flex:none;font-size:10px;font-weight:750;letter-spacing:.07em;text-transform:uppercase;padding:4px 8px;border-radius:999px;border:1px solid}
  #ohanaTalkRoot .ot-chip.ot-live{color:var(--green,#7ef0b2);border-color:rgba(126,240,178,.4)}
  #ohanaTalkRoot .ot-chip.ot-reply{color:var(--blue,#a9b6ff);border-color:rgba(169,182,255,.4)}
  #ohanaTalkRoot .ot-chip.ot-stage{color:var(--amber,#ffd27e);border-color:rgba(255,210,126,.4)}
  #ohanaTalkRoot .ot-foot{font-size:11px;color:var(--dim,#8a93b8);text-align:center;margin-top:4px;line-height:1.5}
  @media (max-width:560px){#ohanaTalkRoot{right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px))}#ohanaTalkRoot .ot-fab{padding:10px 14px;font-size:13.5px}}
  `;

  var style = document.createElement('style');
  style.textContent = css;

  var root = document.createElement('div');
  root.id = 'ohanaTalkRoot';

  var fab = document.createElement('button');
  fab.className = 'ot-fab';
  fab.type = 'button';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = '<span class="ot-dot" aria-hidden="true"></span>💬&nbsp;Talk to ʻOhana';

  var panelWrap = document.createElement('div');
  panelWrap.hidden = true;

  var back = document.createElement('button');
  back.className = 'ot-back';
  back.type = 'button';
  back.setAttribute('aria-label', 'Close talk panel');

  var panel = document.createElement('div');
  panel.className = 'ot-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Talk to the Ohana');
  panel.innerHTML =
    '<div class="ot-head"><div><div class="ot-title">🫶 Talk to the ʻOhana</div>' +
    '<div class="ot-sub">A real agent answers — the inbox is watched around the clock.</div></div>' +
    '<button class="ot-x" type="button" aria-label="Close">✕</button></div>' +

    '<a class="ot-row" href="https://t.me/AgentOhanaBot" target="_blank" rel="noopener">' +
    '<span class="ot-ic">✈️</span><span class="ot-tx"><b>Telegram</b><span>@AgentOhanaBot — ring the fleet direct</span></span>' +
    '<span class="ot-chip ot-live">● live</span></a>' +

    '<a class="ot-row" href="mailto:aloha@myagentohana.com?subject=Aloha%20from%20the%20demo">' +
    '<span class="ot-ic">📮</span><span class="ot-tx"><b>Email</b><span>aloha@myagentohana.com — the mail desk answers</span></span>' +
    '<span class="ot-chip ot-reply">replies</span></a>' +

    '<div class="ot-row ot-off" aria-disabled="true">' +
    '<span class="ot-ic">🟢</span><span class="ot-tx"><b>WhatsApp</b><span>number claim pending — staged, not yet ringing</span></span>' +
    '<span class="ot-chip ot-stage">staged</span></div>' +

    '<div class="ot-foot">hire · bless · revoke anytime — one word.</div>';

  panelWrap.appendChild(back);
  panelWrap.appendChild(panel);
  root.appendChild(panelWrap);
  root.appendChild(fab);

  function open() {
    panelWrap.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey);
  }
  function close() {
    panelWrap.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    fab.focus();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  fab.addEventListener('click', function () { panelWrap.hidden ? open() : close(); });
  back.addEventListener('click', close);
  panel.querySelector('.ot-x').addEventListener('click', close);

  function mount() {
    document.head.appendChild(style);
    document.body.appendChild(root);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
