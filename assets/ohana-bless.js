/* ohana-bless.js — small accessible tip CTA.
   Reads /x402-bless.json (does not invent payTo or asset). Labelled as a tip only. */
(function () {
  if (window.__ohanaBless) return;
  window.__ohanaBless = 1;

  var SRC = '/x402-bless.json';
  var ENS = 'shaka.osoartist.eth';

  var css = document.createElement('style');
  css.textContent = [
    '.bless-box{margin-top:12px;padding:14px 14px 12px;border:1px solid rgba(255,200,130,.22);border-radius:14px;background:rgba(0,0,0,.28);text-align:left}',
    '.bless-box h3{margin:0 0 6px;font-size:1rem;color:#f5ead8}',
    '.bless-box p,.bless-box .bless-meta{margin:0 0 8px;color:#c8bda8;font-size:13.5px;line-height:1.55}',
    '.bless-box a{color:#4fc3f7}',
    '.bless-box .bless-addr{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;word-break:break-all;color:#f5ead8;background:rgba(0,0,0,.35);border:1px solid rgba(255,200,130,.16);border-radius:10px;padding:8px 10px;margin:0 0 10px}',
    '.bless-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
    '.bless-actions button,.bless-actions a.bless-btn{border:0;border-radius:12px;padding:10px 14px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;background:#ffb443;color:#241203;text-decoration:none;display:inline-block}',
    '.bless-actions button.secondary,.bless-actions a.bless-btn.secondary{background:transparent;color:#f5ead8;border:1px solid rgba(255,200,130,.35)}',
    '.bless-actions button:disabled{opacity:.55;cursor:default}',
    '.bless-status{margin-top:10px;font-size:13px;color:#c8bda8;line-height:1.5;min-height:1.2em}',
    '.bless-status[data-kind="ok"]{color:#7ef0b2}',
    '.bless-status[data-kind="err"]{color:#ffb0a0}',
    '.bless-status a{color:#4fc3f7}'
  ].join('\n');
  document.head.appendChild(css);

  function say(el, msg, kind) {
    el.innerHTML = msg;
    if (kind) el.setAttribute('data-kind', kind);
    else el.removeAttribute('data-kind');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render(mount, data) {
    var acc = (data && data.accepts && data.accepts[0]) || {};
    var payTo = acc.payTo || '';
    var network = acc.network || '';
    var asset = acc.asset || '';
    var facilitator = data.facilitator || '';
    var desc = acc.description || data.note || '';
    var resource = acc.resource || SRC;

    mount.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'bless-box';
    box.innerHTML =
      '<h3>Bless / tip ' + esc(ENS) + '</h3>' +
      '<p>This is a <strong>tip</strong> of USDC on Base, not a token sale and not a purchase. Amounts are optional. The recipient name is ' + esc(ENS) + '; the payout address below is read from <a href="' + esc(SRC) + '">/x402-bless.json</a>.</p>' +
      (desc ? '<p>' + esc(desc) + '</p>' : '') +
      '<div class="bless-meta">Network: <b>' + esc(network || 'unknown') + '</b>' +
        (asset ? ' · asset <code>' + esc(asset) + '</code>' : '') + '</div>' +
      '<div class="bless-addr" id="bless-addr">' + esc(payTo || 'address unavailable') + '</div>' +
      '<div class="bless-actions">' +
        '<button type="button" class="secondary" id="bless-copy"' + (payTo ? '' : ' disabled') + '>Copy payout address</button>' +
        (payTo && facilitator && asset && network === 'base'
          ? '<button type="button" id="bless-send">Send a tip with MetaMask</button>'
          : '') +
        '<a class="bless-btn secondary" href="' + esc(SRC) + '">View x402 JSON</a>' +
      '</div>' +
      '<div class="bless-status" id="bless-status" role="status" aria-live="polite"></div>';
    mount.appendChild(box);

    var status = box.querySelector('#bless-status');
    var copyBtn = box.querySelector('#bless-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        if (!payTo) return;
        function ok() { say(status, 'Payout address copied.', 'ok'); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payTo).then(ok).catch(function () {
            say(status, 'Could not copy automatically — select the address above.', 'err');
          });
        } else {
          say(status, 'Could not copy automatically — select the address above.', 'err');
        }
      });
    }

    var sendBtn = box.querySelector('#bless-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        sendTip(status, sendBtn, {
          payTo: payTo,
          asset: asset,
          facilitator: facilitator,
          resource: resource,
          description: desc
        });
      });
    }
  }

  function loadEthers() {
    if (window.ethers) return Promise.resolve(window.ethers);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js';
      s.onload = function () { resolve(window.ethers); };
      s.onerror = function () { reject(new Error('Could not load the ethers library')); };
      document.head.appendChild(s);
    });
  }

  async function sendTip(status, btn, cfg) {
    /* Default tip is 0.01 USDC, matching maxAmountRequired 10000 (6 decimals) on the live JSON. */
    var amt = 0.01;
    btn.disabled = true;
    try {
      if (!window.ethereum) {
        say(status, 'No injected wallet found. Copy the payout address and send USDC on Base by hand, or install MetaMask.', 'err');
        btn.disabled = false;
        return;
      }
      var ethers = await loadEthers();
      say(status, 'Connecting to MetaMask…');
      var provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
      } catch (e) {
        if (e && e.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        } else if (e && e.code === 4001) {
          throw e;
        } else {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        }
        provider = new ethers.BrowserProvider(window.ethereum);
      }
      var signer = await provider.getSigner();
      var from = await signer.getAddress();
      var value = BigInt(Math.round(amt * 1e6));
      var now = Math.floor(Date.now() / 1000);
      var nonce = ethers.hexlify(ethers.randomBytes(32));
      var auth = { from: from, to: cfg.payTo, value: value, validAfter: 0, validBefore: now + 300, nonce: nonce };
      say(status, 'Sign the tip (EIP-3009 — the wallet should not spend gas for this signature)…');
      var sig = await signer.signTypedData(
        { name: 'USD Coin', version: '2', chainId: 8453, verifyingContract: cfg.asset },
        { TransferWithAuthorization: [
          { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }
        ] },
        auth
      );
      var payload = {
        x402Version: 1, scheme: 'exact', network: 'base',
        payload: {
          signature: sig,
          authorization: {
            from: auth.from, to: auth.to, value: auth.value.toString(),
            validAfter: String(auth.validAfter), validBefore: String(auth.validBefore), nonce: auth.nonce
          }
        }
      };
      var req = {
        scheme: 'exact', network: 'base', maxAmountRequired: value.toString(),
        resource: cfg.resource, description: cfg.description || 'tip',
        mimeType: 'application/json', payTo: cfg.payTo, maxTimeoutSeconds: 300,
        asset: cfg.asset, extra: { name: 'USD Coin', version: '2' }
      };
      say(status, 'Verifying the tip with the facilitator…');
      var vr = await fetch(cfg.facilitator.replace(/\/$/, '') + '/verify', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ x402Version: 1, paymentPayload: payload, paymentRequirements: req })
      });
      var vj = await vr.json();
      if (!vj.isValid) {
        say(status, 'The facilitator did not accept the tip: ' + esc(vj.invalidReason || 'unknown') + '. Nothing was taken from the wallet.', 'err');
        btn.disabled = false;
        return;
      }
      say(status, 'Settling on Base…');
      var sr = await fetch(cfg.facilitator.replace(/\/$/, '') + '/settle', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ x402Version: 1, paymentPayload: payload, paymentRequirements: req })
      });
      var sj = await sr.json();
      if (sj.success) {
        var tx = sj.transaction
          ? ' <a href="https://basescan.org/tx/' + encodeURIComponent(sj.transaction) + '" rel="noopener">View on Basescan</a>'
          : '';
        say(status, 'Tip sent. Mahalo.' + tx, 'ok');
      } else {
        say(status, 'Settlement did not complete: ' + esc(sj.error || sj.errorReason || 'unknown') + '. Nothing should have left the wallet without success.', 'err');
      }
    } catch (e) {
      if (e && e.code === 4001) say(status, 'The signature was declined. No tip was sent.', 'err');
      else if (/insufficient/i.test(String(e && e.message || e))) say(status, 'Not enough USDC on Base in this wallet.', 'err');
      else say(status, 'Could not send the tip: ' + esc((e && e.message) || e), 'err');
    }
    btn.disabled = false;
  }

  function fail(mount, msg) {
    mount.innerHTML = '<div class="bless-box"><h3>Bless / tip ' + esc(ENS) + '</h3><p class="bless-status" data-kind="err">' + esc(msg) + '</p></div>';
  }

  function boot() {
    var mounts = [].slice.call(document.querySelectorAll('#bless-tip, [data-bless-tip]'));
    if (!mounts.length) return;
    fetch(SRC, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Could not load ' + SRC + ' (HTTP ' + r.status + ')');
      return r.json();
    }).then(function (data) {
      mounts.forEach(function (m) { render(m, data); });
    }).catch(function (e) {
      mounts.forEach(function (m) { fail(m, e && e.message ? e.message : 'Could not load the tip details.'); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
