/* ============================================================
   KiXs · Delight Engine（愉悦引擎）
   Whimsy Injector · 仪式感 / 温度 / 克制
   1. 今日一签「抽签」      2. 按钮「落印」反馈
   3. 中央印记「流星雨」     4. 六爻「掷币」过程反馈
   5. 问师加载文案轮换       6. 首次起卦「初窥天机」
   全部遵守 prefers-reduced-motion，动画 ≤400ms
   ============================================================ */
(function () {
  'use strict';
  if (window.KiXsDelight) return;
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 今日一签「抽签」 ---------- */
  function bindOmens() {
    var cards = document.querySelectorAll('.omen-card');
    if (!cards.length) return;
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        if (card.classList.contains('omen-shaking')) return;
        card.classList.add('omen-shaking');
        var seal = card.querySelector('.o-seal');
        var verse = card.querySelector('.o-verse');
        var sealDelay = RM ? 0 : 360;
        if (seal) { seal.classList.remove('omen-sealed'); setTimeout(function () { seal.classList.add('omen-sealed'); }, sealDelay); }
        if (verse) verse.classList.remove('omen-open');
        setTimeout(function () { if (verse) verse.classList.add('omen-open'); card.classList.remove('omen-shaking'); }, RM ? 50 : 650);
      });
    });
  }

  /* ---------- 2. 按钮「落印」 ---------- */
  function bindButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.btn') : null;
      if (!btn) return;
      var ink = document.createElement('span');
      ink.className = 'btn-ink';
      btn.appendChild(ink);
      setTimeout(function () { if (ink.parentNode) ink.parentNode.removeChild(ink); }, RM ? 0 : 380);
    });
  }

  /* ---------- 3. 中央印记「流星雨」 ---------- */
  var markClicks = [];
  var lastShower = 0;
  function bindLogoEgg() {
    var targets = document.querySelectorAll('.hero-mark, .sigil');
    targets.forEach(function (el) {
      el.addEventListener('click', function (e) {
        var now = Date.now();
        markClicks.push(now);
        markClicks = markClicks.filter(function (t) { return now - t < 2500; });
        el.classList.add('mark-pulse');
        setTimeout(function () { el.classList.remove('mark-pulse'); }, 400);
        if (markClicks.length >= 3 && now - lastShower > 30000) {
          lastShower = now;
          markClicks = [];
          if (e && e.preventDefault) e.preventDefault();
          spawnMeteorShower(12);
          toast('流星雨来了 🌠');
        }
      });
    });
  }
  /* 流星雨：12 颗多形态多节奏，从屏幕各点斜划而过 */
  function spawnMeteorShower(count) {
    if (RM) return;
    var types = ['', ' m1', ' m2', ' m3', ' m4'];
    for (var i = 0; i < count; i++) {
      (function (i) {
        setTimeout(function () {
          var m = document.createElement('div');
          m.className = 'meteor' + types[i % types.length];
          m.style.left = (Math.random() * 70 + 15) + '%';
          m.style.top = (Math.random() * 18 + 2) + '%';
          document.body.appendChild(m);
          setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 1800);
        }, i * 90);
      })(i);
    }
  }

  /* ---------- 4. 六爻「掷币」过程反馈 ---------- */
  function bindCoinToss() {
    var box = document.getElementById('coin-box');
    if (!box || window.KiXsCoinsBound) return;
    window.KiXsCoinsBound = true;
    var btn = document.getElementById('btn-toss');
    var orig = btn ? btn.textContent : '';
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (RM) return;
      box.classList.remove('coin-shake');
      void box.offsetWidth;
      box.classList.add('coin-shake');
      var n = box.textContent.match(/\d+/);
      if (n) { box.textContent = '掷…'; btn.textContent = '掷…'; }
      setTimeout(function () {
        if (n) box.textContent = '点击按钮，依次摇卦 ' + n[0] + '/6 次';
        btn.textContent = orig;
        box.classList.remove('coin-shake');
      }, 320);
    });
  }

  /* ---------- 5. 问师加载文案轮换 ---------- */
  var LOADING_LINES = {
    west: ['正在为你的星盘点亮星轨…', '让我看看今夜的月亮怎么说…', '把你的问题放进星图里，稍等…'],
    east: ['正在排你的四柱，稍候…', '卦象正在成形，莫急…', '我在盘里找你的用神…'],
    common: ['正在为你推算…', '静候片刻，答案正在成形…']
  };
  function hookLoadingCopy() {
    if (window.KiXsLoadingHooked) return;
    window.KiXsLoadingHooked = true;
    if (typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (mut) {
        mut.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          var load = node.querySelector ? node.querySelector('.qa-loading') : null;
          if (!load) return;
          var lines = LOADING_LINES.east;
          try {
            var name = (document.querySelector('#ap-head .n') || {}).textContent || '';
            if (name.indexOf('月见') >= 0) lines = LOADING_LINES.west;
            else if (name.indexOf('玄机子') >= 0) lines = LOADING_LINES.east;
          } catch (e) {}
          var txt = load.lastChild;
          if (txt && txt.nodeType === 3 && txt.textContent.indexOf('正在') >= 0) {
            txt.textContent = ' ' + lines[Math.floor(Math.random() * lines.length)];
          }
        });
      });
    });
    var panel = document.getElementById('ask-panel-root');
    if (panel) obs.observe(panel, { childList: true, subtree: true });
    else document.addEventListener('DOMContentLoaded', function () {
      var p = document.getElementById('ask-panel-root');
      if (p) obs.observe(p, { childList: true, subtree: true });
    });
  }

  /* ---------- 6. 首次起卦「初窥天机」 ---------- */
  function bindFirstCast() {
    if (window.KiXsFirstBound) return;
    window.KiXsFirstBound = true;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('#btn-cast, #btn-toss') : null;
      if (!btn) return;
      try {
        var k = 'kixs_first_' + location.pathname.split('/').pop();
        if (localStorage.getItem(k)) return;
        localStorage.setItem(k, '1');
        setTimeout(function () { toast('初窥天机 · 第一卦已成'); }, 1500);
      } catch (err) {}
    });
  }

  /* ---------- 7. 提示 toast ---------- */
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'kixs-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, 2600);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    bindOmens();
    bindButtons();
    bindLogoEgg();
    bindCoinToss();
    hookLoadingCopy();
    bindFirstCast();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.KiXsDelight = { spawnMeteorShower: spawnMeteorShower, toast: toast };
})();