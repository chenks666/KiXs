/* ============================================================
   KiXs · 梅花易数引擎 MeihuaEngine
   ------------------------------------------------------------
   以数起卦：报三数（1–9）
   上卦 = 数1 mod 8，下卦 = 数2 mod 8，动爻 = 数3 mod 6（0→6）
   起本卦 → 取互卦 → 动爻变而成变卦 → 体用生克断吉凶
   卦表取自 HexagramData（须先加载 hexagram-data.js）
   解读经 ToneEngine.wrap() 适配夜语模式
   ============================================================ */
(function (global) {
  'use strict';

  const { TRIGRAMS, HEXAGRAM_NAMES, BRIEF } = global.HexagramData;

  /* 五行生克 */
  const SHENG = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
  const KE = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };
  function sheng(a, b) { return SHENG[a] === b; }
  function ke(a, b) { return KE[a] === b; }

  /* 起卦 */
  function cast(n1, n2, n3) {
    const upper = ((n1 - 1) % 8) + 1;
    const lower = ((n2 - 1) % 8) + 1;
    let moving = n3 % 6; if (moving === 0) moving = 6;

    const T = TRIGRAMS;
    const benU = T[upper], benL = T[lower];
    const benName = HEXAGRAM_NAMES[upper][lower];

    // 本卦六爻（0..5 自下往上）：[下卦三爻, 上卦三爻]
    const benLines = [...benL.lines, ...benU.lines];

    // 互卦：2,3,4 爻为下互；3,4,5 爻为上互
    const huLower = trigramByLines([benLines[1], benLines[2], benLines[3]]);
    const huUpper = trigramByLines([benLines[2], benLines[3], benLines[4]]);
    const huName = HEXAGRAM_NAMES[huUpper.id][huLower.id];

    // 变卦：动爻取反
    const biLines = [...benLines];
    biLines[moving - 1] = biLines[moving - 1] === 1 ? 0 : 1;
    const biLower = trigramByLines(biLines.slice(0, 3));
    const biUpper = trigramByLines(biLines.slice(3, 6));
    const biName = HEXAGRAM_NAMES[biUpper.id][biLower.id];

    // 体用：动爻所在卦为用，另一为体
    const movingInLower = moving <= 3;
    const ti = movingInLower ? benU : benL;   // 体卦（不动之卦）
    const yong = movingInLower ? benL : benU; // 用卦（动之卦）
    const tiEl = ti.element, yongEl = yong.element;

    // 生克关系
    let relation, verdict, level;
    if (tiEl === yongEl) { relation = '比和'; verdict = '体用比和，两气相扶，主顺遂平和。'; level = '吉'; }
    else if (sheng(yongEl, tiEl)) { relation = '用生体'; verdict = '用卦生体卦，外力来助，主得人之力、事有转机。'; level = '吉'; }
    else if (sheng(tiEl, yongEl)) { relation = '体生用'; verdict = '体卦生用卦，主付出耗泄：为事劳心费力，但舍而有得。'; level = '中'; }
    else if (ke(tiEl, yongEl)) { relation = '体克用'; verdict = '体卦克用卦，主可以驾驭局面，但需费些周章，事可成而身稍劳。'; level = '中吉'; }
    else { relation = '用克体'; verdict = '用卦克体卦，主外力相制、阻力不小：此时宜守不宜攻，先避锋芒。'; level = '凶'; }

    return {
      numbers: [n1, n2, n3],
      moving,
      ben: { name: benName, upper: benU, lower: benL, brief: BRIEF[benName] || '卦象已起，静观其变', lines: benLines },
      hu: { name: huName, upper: huUpper, lower: huLower },
      bian: { name: biName, upper: biUpper, lower: biLower, lines: biLines },
      ti, yong, tiEl, yongEl, relation, verdict, level,
    };
  }

  /* 由三爻求八卦 */
  function trigramByLines(lines) {
    const key = lines.join('');
    for (const [id, t] of Object.entries(TRIGRAMS)) {
      if (t.lines.join('') === key) return { ...t, id: +id };
    }
    return { name: '?', symbol: '?', lines, element: '?', id: 0 };
  }

  /* 爻辞提示池 */
  const YAO_HINTS = {
    1: '初爻动：事之发端，根基初立，宜慎始。',
    2: '二爻动：位居中正，有近贵之象，顺势可为。',
    3: '三爻动：多忧多凶之位，凡事三思，防中途生变。',
    4: '四爻动：进退之间，宜察上意，勿轻举妄动。',
    5: '五爻动：君位之动，事近大成，把握时机。',
    6: '上爻动：物极必反，事至终局，见好就收。',
  };

  /* 问题领域（用于落点话术） */
  function analyzeArea(q) {
    const t = (q || '').replace(/\s/g, '');
    if (/感情|恋爱|婚姻|对象|伴侣|复合|分手|桃花|喜欢/.test(t)) return 'love';
    if (/工作|事业|升职|跳槽|offer|面试|创业|公司|项目|辞职/.test(t)) return 'career';
    if (/钱|财|投资|股票|基金|生意|收入|赚钱|借贷|买房/.test(t)) return 'money';
    if (/考|学|试|成绩|升学|论文|毕业/.test(t)) return 'study';
    if (/健康|身体|病|失眠|焦虑|状态/.test(t)) return 'health';
    if (/去留|选择|要不要|该不该|决定|纠结|搬家/.test(t)) return 'decision';
    return 'general';
  }

  /* 领域落点话术（不再重复 verdict 全文，只做领域衔接） */
  const AREA_VERDICT = {
    love: () => `放到感情上：先看你这一侧顺不顺——体稳则心定，心定，关系才有转圜的空间。`,
    career: () => `落到事业上：先安顿好自己的基本盘——体是你的本事与位置，用是局势与机会。`,
    money: () => `关于钱财：体足则财自来，体虚则财亦散——先守本，再谈利。`,
    study: () => `用在学业上：体是平日积累，用是临场发挥——积累厚了，临场自然稳。`,
    health: () => `落到身心上：体即是根本——睡眠、情绪、身体的底子，先于一切。`,
    decision: () => `这关乎去留：先看你「体」那一侧站不站得稳——自己稳，往哪走都不算错。`,
    general: () => `落到你当下：先稳住自己这一卦的「体」，再应对外面那个「用」。`,
  };

  /* 解读生成（叙事版） */
  function interpret(result, question) {
    const area = analyzeArea(question);
    const q = question ? `你问的是：「${question}」` : '你没写下具体问题，那就当这卦是替此刻的心境起的。';
    const verdictLine = AREA_VERDICT[area]();
    const yaoLine = {
      1: '这一动落在初爻——事情的根子上动了一下，起手的第一步，走得稳比走得快重要。',
      2: '这一动在二爻——中正之位，离「关键人物」不远，顺势而为，别端着。',
      3: '这一动在三爻——多忧之位，中途最容易生变，凡事三思，留个后手。',
      4: '这一动在四爻——进退之间，要看上面的脸色，也听下面的声音，莫轻动。',
      5: '这一动在五爻——君位之动，事情快见分晓了，这一下踩准，就能上桌。',
      6: '这一动在上爻——顶到头的动静，物极必反，见好就收，别贪最后一口。',
    }[result.moving];

    const parts = [
      q,
      ``,
      `卦成了。你报的数 ${result.numbers.join('、')}，定出上卦${result.ben.upper.name}（${result.ben.upper.symbol}）、下卦${result.ben.lower.name}（${result.ben.lower.symbol}），动爻落在第 ${result.moving} 爻——这一动，就是整卦的「眼」。`,
      ``,
      `先看本卦「${result.ben.name}」：${result.ben.brief}。这是你这件事的底色——开局写的是这个调子。`,
      `中间还压着个互卦「${result.hu.name}」：它不显眼，却是过程里的暗流与人心，成事往往卡在这一层。`,
      `动到第 ${result.moving} 爻，变出「${result.bian.name}」：这是收尾的方向——${result.ben.brief.includes('吉') ? '向着通顺处走' : '气在往新处转'}，别被眼前的坎吓住。`,
      ``,
      `再看体用：体卦是${result.ti.name}（属${result.tiEl}），用卦是${result.yong.name}（属${result.yongEl}），${result.relation}。${result.verdict}`,
      verdictLine,
      ``,
      yaoLine,
      ``,
      `卦上给你的是一句话：${result.level === '吉' ? '气象通畅，可谋可进——但越顺越要留神，别在得意处松了缰绳。' : result.level === '中吉' ? '可行，但得亲力亲为——别指望天上掉馅饼，你的手就是那张网。' : result.level === '中' ? '先难后易，付出终有回响——熬过这一段，气就顺了。' : '阻力在前，宜守不宜攻——不是认输，是等风转向。避锋不是怂，是聪明。'}`,
    ];
    return ToneEngine.wrap(parts.join('\n'), { title: null, opening: true, ending: true });
  }

  /* 三句点醒 */
  function summarize(result) {
    return [
      `本卦「${result.ben.name}」：${result.ben.brief}。你问的这件事，底色就是它。`,
      `体用「${result.relation}」——${result.verdict}`,
      `动在第 ${result.moving} 爻：${YAO_HINTS[result.moving].replace(/。$/, '。')}一念之诚，转念即新，剩下的在你手里。`,
    ];
  }

  global.MeihuaEngine = { cast, interpret, summarize, TRIGRAMS, HEXAGRAM_NAMES, BRIEF };
})(window);
