/* ============================================================
   KiXs · motion.js · React 风格动效引擎（v11）
   1. Hero 交错入场（stagger）
   2. 滚动浮现（IntersectionObserver → .rv.in）
   3. 卡片光晕跟随（spotlight，--mx/--my）
   4. prefers-reduced-motion 降级（CSS 已保证元素可见）
   无依赖 · 全部遵守无 AI 味约束（克制 150-500ms）
   ============================================================ */
(function () {
  'use strict';
  var doc = document;

  /* 标记 JS 可用：html.js 时 .rv 才隐藏等待浮现；无 JS 时内容直接可见（CSS 兜底） */
  doc.documentElement.classList.add('js');

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; /* 系统减弱动效：CSS 26.9 已强制显示 */
  }

  /* ---- 1. Hero 交错入场（子元素依次 70ms）---- */
  var hero = doc.querySelector('.hero');
  if (hero) {
    var kids = Array.prototype.slice.call(hero.children);
    kids.forEach(function (el, i) {
      el.style.animationDelay = (i * 70) + 'ms';
    });
  }

  /* ---- 2. 滚动浮现：标记主内容区卡片 / 区块 ---- */
  var rvSelectors =
    'main .card, main .omen-card, main .big-entry, main .entry, ' +
    'main .grid-2 > *, main .grid-3 > *, main .grid-4 > *, ' +
    'main .tool-grid > *, main .app-grid > *, main .omen-grid > *';
  var rvEls = [];
  var nodes = doc.querySelectorAll(rvSelectors);
  Array.prototype.forEach.call(nodes, function (el) {
    if (el.classList.contains('rv')) return;
    el.classList.add('rv');
    rvEls.push(el);
  });

  /* ---- 3. IntersectionObserver 触发浮现（一次后解除）---- */
  if (typeof IntersectionObserver !== 'undefined') {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    rvEls.forEach(function (el) { io.observe(el); });
  } else {
    rvEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- 4. 卡片光晕跟随（spotlight）---- */
  var glowEls = doc.querySelectorAll('.card, .omen-card, .big-entry');
  Array.prototype.forEach.call(glowEls, function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });
})();
