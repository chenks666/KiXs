/* ============================================================
   KiXs · 紫微斗数引擎 ZiweiEngine（演示框架版）
   ------------------------------------------------------------
   ⚠️ 精度声明：本文件为「产品形态演示」——
   十二宫框架、星曜示意排布、四化演示均为示意数据。
   精确排盘（命宫/身宫/五行局/安星/四化）必须接入专业
   算法引擎（如 iztro-py）。页面会显著标注。
   解读经 ToneEngine.wrap() 适配夜语模式
   ============================================================ */
(function (global) {
  'use strict';

  const PALACES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

  /* 演示星曜池 */
  const STAR_POOL = [
    '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
    '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
    '左辅', '右弼', '文昌', '文曲', '禄存', '擎羊', '陀罗', '火星', '铃星',
  ];

  /* 演示盘：固定布局示意（仅供理解盘面形态） */
  function demoChart(birthText) {
    // 打乱星曜池作为演示分布
    const pool = [...STAR_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const sihuaDemo = { 禄: '财帛', 权: '官禄', 科: '夫妻', 忌: '疾厄' }; // 演示四化落宫

    return {
      birthText,
      palaces: PALACES.map((name, i) => ({
        name,
        stars: pool.slice(i * 2, i * 2 + 2),
        // 演示四化：仅给特定宫位打标
        sihua: Object.entries(sihuaDemo).filter(([, p]) => p === name).map(([k]) => k),
      })),
      sihuaDemo,
      note: '演示数据',
    };
  }

  /* 大限（演示）：十年一大限，简单列出 12 大限的起始年龄（按命宫起） */
  function dalimian(gender) {
    return Array.from({ length: 12 }, (_, i) => ({
      age: i * 10,
      palace: PALACES[i],
      years: `${i * 10}–${i * 10 + 9}岁`,
    }));
  }

  function interpret(chart, question) {
    const parts = [
      `本盘为演示框架（${chart.note}），星曜排布仅示盘面形态，不代表实际命格。`,
      ``,
      `【十二宫】${chart.palaces.map((p) => `${p.name}（${p.stars.join('、') || '空宫'}${p.sihua.length ? '·化' + p.sihua.join('化') : ''}）`).join('；')}。`,
      ``,
      `【四化（演示）】禄在财帛、权在官禄、科在夫妻、忌在疾厄——四化流转示人生着力点：财禄之求、事业之进、感情之缘、身体之护，四者此消彼长。`,
      ``,
      `【断】${question || '此盘'}：命宫星辰已定，后天行运在己。紫微重「格局」，格局看大方向，细节在人事。`,
    ];
    return ToneEngine.wrap(parts.join('\n'), {
      title: `◆ 紫微斗数 · 演示盘`,
      ending: false,
    }) + '\n\n' + ToneEngine.closingLine();
  }

  global.ZiweiEngine = { demoChart, dalimian, interpret, PALACES };
})(window);
