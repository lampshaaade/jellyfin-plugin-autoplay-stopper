/**
 * Jellyfin AutoPlay Stopper — Client Script
 * Servi dynamiquement par le serveur Jellyfin via /AutoplayStopper/clientscript
 *
 * __DEFAULT_TO_STOPPED__ est remplacé côté serveur selon la configuration admin.
 */

(function () {
  'use strict';

  // ─── Config injectée par le serveur ───────────────────────────────────────
  var DEFAULT_TO_STOPPED = __DEFAULT_TO_STOPPED__;

  // ─── État session ─────────────────────────────────────────────────────────
  var SESSION_KEY = 'jfAutoplayStopped';

  function isAutoplayStopped() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function setAutoplayStopped(val) {
    if (val) {
      sessionStorage.setItem(SESSION_KEY, '1');
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  // Appliquer le défaut configuré par l'admin (une seule fois par session)
  if (DEFAULT_TO_STOPPED && sessionStorage.getItem('asp-default-applied') !== '1') {
    setAutoplayStopped(true);
    sessionStorage.setItem('asp-default-applied', '1');
  }

  // ─── Patch du PlaybackManager Jellyfin ───────────────────────────────────
  function patchPlaybackManager() {
    var tryPatch = function () {
      var pm =
        window.playbackManager ||
        (window.Emby && window.Emby.PlaybackManager) ||
        null;

      if (!pm || pm.__autoplayPatched) return !!pm;
      pm.__autoplayPatched = true;

      var originalNextTrack    = pm.nextTrack    ? pm.nextTrack.bind(pm)    : null;
      var originalPlayNextItem = pm.playNextItem  ? pm.playNextItem.bind(pm) : null;
      var manualNext = false;

      pm.nextTrack = function () {
        if (!manualNext && isAutoplayStopped()) {
          console.info('[AutoplayStopper] Autoplay bloqué (nextTrack).');
          showBlockedToast();
          return;
        }
        if (originalNextTrack) return originalNextTrack.apply(this, arguments);
      };

      if (originalPlayNextItem) {
        pm.playNextItem = function () {
          if (!manualNext && isAutoplayStopped()) {
            console.info('[AutoplayStopper] Autoplay bloqué (playNextItem).');
            showBlockedToast();
            return;
          }
          return originalPlayNextItem.apply(this, arguments);
        };
      }

      pm.__manualNext = function () {
        manualNext = true;
        try { if (originalNextTrack) originalNextTrack(); }
        finally { manualNext = false; }
      };

      console.info('[AutoplayStopper] PlaybackManager patché ✓');
      return true;
    };

    if (!tryPatch()) {
      var interval = setInterval(function () {
        if (tryPatch()) clearInterval(interval);
      }, 500);
    }
  }

  // ─── Toast "autoplay bloqué" ──────────────────────────────────────────────
  function showBlockedToast() {
    var existing = document.getElementById('asp-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'asp-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML =
      '<span class="asp-toast-icon">\uD83D\uDED1</span>' +
      '<span>Lecture automatique bloquée</span>';
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('asp-toast--visible');
    });

    setTimeout(function () {
      toast.classList.remove('asp-toast--visible');
      setTimeout(function () { toast.remove(); }, 400);
    }, 3000);
  }

  // ─── Bouton lecteur ───────────────────────────────────────────────────────
  var BUTTON_ID = 'asp-toggle-btn';

  function createButton() {
    var btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.title = "Activer/Désactiver l'autoplay (session en cours)";
    btn.setAttribute('aria-pressed', String(isAutoplayStopped()));
    btn.setAttribute('aria-label', "Stopper l'autoplay");
    btn.className = 'asp-btn' + (isAutoplayStopped() ? ' asp-btn--active' : '');

    btn.innerHTML = getButtonHTML(isAutoplayStopped());

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var stopped = !isAutoplayStopped();
      setAutoplayStopped(stopped);
      btn.setAttribute('aria-pressed', String(stopped));
      btn.innerHTML = getButtonHTML(stopped);
      btn.className = 'asp-btn' + (stopped ? ' asp-btn--active' : '');
      showTooltip(btn, stopped);
    });

    return btn;
  }

  function getButtonHTML(stopped) {
    if (stopped) {
      // Icône "lecture barrée"
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"' +
        ' width="20" height="20" aria-hidden="true">' +
        '<path d="M2 4.27L3.28 3 21 20.72 19.73 22l-2.13-2.13' +
        'C17.28 20.57 16.66 21 16 21H8c-1.1 0-2-.9-2-2V9.27L2 4.27z"/>' +
        '<path d="M20 3c1.1 0 2 .9 2 2v14c0 .55-.22 1.05-.59 1.41L6.59 5H20z"/>' +
        '</svg>' +
        '<span class="asp-btn-label">Autoplay OFF</span>'
      );
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"' +
      ' width="20" height="20" aria-hidden="true">' +
      '<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>' +
      '</svg>' +
      '<span class="asp-btn-label">Autoplay ON</span>'
    );
  }

  function showTooltip(btn, stopped) {
    var old = document.getElementById('asp-tooltip');
    if (old) old.remove();

    var tip = document.createElement('div');
    tip.id = 'asp-tooltip';
    tip.className = 'asp-tooltip';
    tip.textContent = stopped
      ? '\uD83D\uDED1 Autoplay désactivé pour cette session'
      : '\u25B6 Autoplay réactivé';
    document.body.appendChild(tip);

    var r = btn.getBoundingClientRect();
    tip.style.left = (r.left + r.width / 2) + 'px';
    tip.style.top  = (r.top - 44) + 'px';

    requestAnimationFrame(function () { tip.classList.add('asp-tooltip--visible'); });
    setTimeout(function () {
      tip.classList.remove('asp-tooltip--visible');
      setTimeout(function () { tip.remove(); }, 300);
    }, 2200);
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;

    var selectors = [
      '.videoOsdBottom .buttons',
      '.videoOsdBottom .osdControls',
      '.osdControls .buttons',
      '.videoPlayerContainer .osdControls',
      '.nowPlayingBar .nowPlayingBarRight',
      '.videoOsdBottom',
    ];

    var container = null;
    for (var i = 0; i < selectors.length; i++) {
      container = document.querySelector(selectors[i]);
      if (container) break;
    }
    if (!container) return;

    var btn = createButton();
    var fsBtn = container.querySelector(
      '[data-action="fullscreen"], .btnFullscreen, [title*="ullscreen"]'
    );
    if (fsBtn) {
      container.insertBefore(btn, fsBtn);
    } else {
      container.appendChild(btn);
    }

    console.info('[AutoplayStopper] Bouton injecté dans le lecteur ✓');
  }

  // ─── Styles ───────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('asp-styles')) return;
    var s = document.createElement('style');
    s.id = 'asp-styles';
    s.textContent = [
      '.asp-btn{display:inline-flex;align-items:center;gap:5px;background:transparent;border:none;',
      'cursor:pointer;color:rgba(255,255,255,.75);padding:5px 10px;border-radius:6px;',
      'font-size:11px;font-family:inherit;font-weight:600;letter-spacing:.04em;',
      'text-transform:uppercase;transition:color .2s,background .2s,transform .15s;',
      'white-space:nowrap;vertical-align:middle;}',

      '.asp-btn:hover{color:#fff;background:rgba(255,255,255,.1);transform:scale(1.05);}',
      '.asp-btn:focus-visible{outline:2px solid #00a4dc;outline-offset:3px;}',
      '.asp-btn--active{color:#ff6b6b!important;}',
      '.asp-btn--active:hover{background:rgba(255,107,107,.15)!important;}',
      '.asp-btn svg{flex-shrink:0;display:block;}',

      '#asp-toast{position:fixed;bottom:90px;left:50%;',
      'transform:translateX(-50%) translateY(10px);',
      'background:rgba(18,18,28,.93);color:#fff;padding:10px 22px;border-radius:30px;',
      'font-size:14px;font-family:inherit;display:flex;align-items:center;gap:8px;',
      'backdrop-filter:blur(10px);border:1px solid rgba(255,107,107,.4);',
      'box-shadow:0 4px 24px rgba(0,0,0,.55);opacity:0;pointer-events:none;',
      'z-index:99999;transition:opacity .3s,transform .3s;}',
      '#asp-toast.asp-toast--visible{opacity:1;transform:translateX(-50%) translateY(0);}',

      '#asp-tooltip{position:fixed;background:rgba(18,18,28,.96);color:#fff;',
      'padding:6px 14px;border-radius:6px;font-size:12px;font-family:inherit;',
      'pointer-events:none;z-index:99999;opacity:0;',
      'transform:translateX(-50%) translateY(4px);transition:opacity .2s,transform .2s;',
      'white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,.4);}',
      '#asp-tooltip.asp-tooltip--visible{opacity:1;transform:translateX(-50%) translateY(0);}',
    ].join('');
    document.head.appendChild(s);
  }

  // ─── Observateur DOM : ré-injecter quand le lecteur s'ouvre ──────────────
  function watchForPlayer() {
    new MutationObserver(function () {
      injectButton();
    }).observe(document.body, { childList: true, subtree: true });

    injectButton();
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  injectStyles();
  patchPlaybackManager();
  watchForPlayer();
  console.info('[AutoplayStopper] Plugin chargé ✓');

})();
