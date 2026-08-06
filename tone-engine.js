/* ============================================================
   KiXs · 语气引擎 ToneEngine
   ------------------------------------------------------------
   核心规则：北京时间 22:00 - 次日 03:00 → 夜语温和模式
   所有解读文案经 wrap() 包装，自动加柔和引导语。
   说明：换算基于本机时间 → 北京时间（UTC+8），纯前端判定。
   ============================================================ */
(function (global) {
  'use strict';

  const BEIJING_OFFSET_MIN = 8 * 60; // UTC+8

  /* 取当前北京时间 */
  function getBeijingNow() {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000; // 转 UTC
    return new Date(utcMs + BEIJING_OFFSET_MIN * 60000);           // +8h
  }

  /* 是否处于夜语时段：22:00 ≤ h < 03:00 */
  function isNightHour() {
    const h = getBeijingNow().getHours();
    return h >= 22 || h < 3;
  }

  /* 时段标签（给人看的） */
  function hourLabel() {
    const h = getBeijingNow().getHours();
    if (h >= 22 || h < 3) return '夜深';
    if (h < 6) return '凌晨';
    if (h < 12) return '清晨';
    if (h < 14) return '正午';
    if (h < 18) return '午后';
    return '黄昏';
  }

  const NIGHT = {
    label: '夜语模式',
    banner: '夜深了 · 愿言语轻落',
    opening: [
      '夜深了。这些话有点长，你慢慢看，不用急着消化。',
      '这个点还在想这件事，一定是心里放不下。来，咱慢慢捋。',
      '夜已经很静了。你为这件事留到现在，它值得被认真看看。',
    ],
    ending: [
      '夜还长，想不通的先放下，交给睡眠。晚安。',
      '明天的事，等天亮再说。今晚，你值得睡个好觉。',
      '此刻若觉得沉，就先合上手机。天总会亮，事总有解。',
    ],
  };

  const DAY = {
    label: '日常模式',
    banner: '',
    opening: [],
    ending: [],
  };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* 当前语气模式 */
  function getMode() {
    const night = isNightHour();
    const bj = getBeijingNow();
    return {
      mode: night ? 'night' : 'day',
      isNight: night,
      label: night ? NIGHT.label : DAY.label,
      beijingTime: bj,
      beijingHour: bj.getHours(),
      period: hourLabel(),
    };
  }

  /**
   * 包装一段解读正文：
   * · 日间模式：原样输出，不加任何包装（去模板腔）
   * · 夜语模式：开头一句自然安抚 + 结尾一句晚安
   * @param {string} text 核心解读
   * @param {object} opts { title?, opening?, ending? } 默认都开
   */
  function wrap(text, opts = {}) {
    const mode = getMode();
    if (!mode.isNight) return text; // 白天不加戏，干净输出

    const parts = [];
    if (opts.title) parts.push(opts.title);
    if (opts.opening !== false) parts.push(pick(NIGHT.opening));
    parts.push(text);
    if (opts.ending !== false) parts.push(pick(NIGHT.ending));
    return parts.join('\n\n');
  }

  /* 只取柔和收尾（适合短卡片） */
  function closingLine() {
    const pack = getMode().isNight ? NIGHT : DAY;
    return pick(pack.ending);
  }

  /* 夜语徽标自动注入：找到页面上 .night-badge 元素 */
  function applyBadge() {
    const badges = document.querySelectorAll('.night-badge');
    if (!badges.length) return;
    const m = getMode();
    badges.forEach((b) => {
      if (m.isNight) {
        b.classList.remove('hidden');
        b.title = '当前为北京时间 ' + String(m.beijingHour).padStart(2, '0') + ' 点 · 已自动切换温和语气';
        const label = b.querySelector('.label-text');
        if (label) label.textContent = m.period + ' · 夜语模式';
      } else {
        b.classList.add('hidden');
      }
    });
  }

  /* ---------- 负面征兆软化（接住情绪为主，委婉回答为辅） ----------
     规则：北京时间 22:00–03:00 + 回答含负面征兆 → 先共情接住，再委婉托底
     白天或非负面：原样返回 */
  const CATCH_LINES = [
    '看到这一句，先别急着往下想——夜里看到不好的征兆，心里发紧是正常的。先深呼吸一下，我们慢慢说。',
    '听到这里，先接住你的不安：此刻的担忧是真实的，也值得被认真对待。',
    '先说一句：夜里人的心会变轻，一点点风吹草动都会被放大。这不是你脆弱，是夜晚的本性。',
  ];
  const HOLD_LINES = [
    '夜里看到的坏消息，多半没有此刻想的那么重。今晚先照顾好自己，睡一觉，天亮了再看，它常常就变小了。',
    '征兆是提醒，不是判决——它告诉你这里有功课，不是告诉你此路不通。夜还长，想不通的先交给睡眠。',
    '别让这一句压着你过夜。明天的你有今天的你撑着，今天的你值得被温柔对待。晚安。',
  ];

  /**
   * @param {string} text    回答正文（可能含负面征兆）
   * @param {boolean} isNegative 是否判定为负面征兆
   * @returns {string} 软化后的回答
   */
  function soften(text, isNegative) {
    const mode = getMode();
    if (!mode.isNight || !isNegative) return text;
    return `${pick(CATCH_LINES)}\n\n${text}\n\n${pick(HOLD_LINES)}`;
  }

  global.ToneEngine = {
    getMode,
    wrap,
    closingLine,
    soften,
    isNight: isNightHour,
    applyBadge,
    beijingNow: getBeijingNow,
  };
})(window);
