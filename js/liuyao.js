/* ============================================================
   KiXs · 六爻引擎 LiuyaoEngine
   ------------------------------------------------------------
   京房纳甲六爻（简化演示版）：
   三枚铜钱六掷 → 老阴/少阳/少阴/老阳 → 自下而上成卦
   本卦 + 变卦（动爻变），卦名判语 + 动爻解读 + 用神简化
   完整纳甲（六亲/六神/世应装卦）标注为精算版待接入
   卦表取自 HexagramData（须先加载 hexagram-data.js）
   解读经 ToneEngine.wrap() 适配夜语模式
   ============================================================ */
(function (global) {
  'use strict';

  const { TRIGRAMS, HEXAGRAM_NAMES, BRIEF } = global.HexagramData;

  /* 摇一爻：模拟三枚铜钱。字=2（阴），花=3（阳） */
  function tossCoin() {
    const coins = [0, 1, 2].map(() => (Math.random() < 0.5 ? 2 : 3));
    const sum = coins.reduce((a, b) => a + b, 0);
    // 6=老阴(动) 7=少阳(静) 8=少阴(静) 9=老阳(动)
    if (sum === 6) return { yin: true, moving: true, label: '老阴 ×' };
    if (sum === 7) return { yin: false, moving: false, label: '少阳 、' };
    if (sum === 8) return { yin: true, moving: false, label: '少阴 、' };
    return { yin: false, moving: true, label: '老阳 ○' };
  }

  /* 六掷成卦（自下而上），也可传外部摇得的爻序列 */
  function cast(externalYao) {
    const yao = externalYao && externalYao.length === 6 ? externalYao : Array.from({ length: 6 }, tossCoin);
    // 本卦爻：阴=0 阳=1（index0=初爻）
    const benBits = yao.map((y) => (y.yin ? 0 : 1));
    const bianBits = benBits.map((b, i) => (yao[i].moving ? (b === 1 ? 0 : 1) : b));

    const lowerId = bitsToTrigram(benBits.slice(0, 3));
    const upperId = bitsToTrigram(benBits.slice(3, 6));
    const benName = HEXAGRAM_NAMES[upperId][lowerId];

    let bian = null;
    if (yao.some((y) => y.moving)) {
      const bl = bitsToTrigram(bianBits.slice(0, 3));
      const bu = bitsToTrigram(bianBits.slice(3, 6));
      bian = { name: HEXAGRAM_NAMES[bu][bl], lower: bl, upper: bu };
    }

    return {
      yao, benBits, bianBits,
      ben: { name: benName, lower: lowerId, upper: upperId, brief: BRIEF[benName] || '卦成' },
      bian,
      movingCount: yao.filter((y) => y.moving).length,
    };
  }

  function bitsToTrigram(bits) {
    const key = bits.join('');
    for (const [id, t] of Object.entries(TRIGRAMS)) {
      if (t.lines.join('') === key) return +id;
    }
    return 8;
  }

  /* 用神简化：按所问关键词选 */
  function selectYongshen(question) {
    const q = question || '';
    if (/财|钱|生意|收入|投资|涨/.test(q)) return { name: '妻财', what: '所求之财' };
    if (/感情|恋爱|婚姻|对象|伴侣|复合|分手|桃花/.test(q)) return { name: '妻财 / 官鬼', what: '情之所系' };
    if (/工作|事业|升职|跳槽|offer|面试/.test(q)) return { name: '官鬼', what: '事业前程' };
    if (/健康|身体|病/.test(q)) return { name: '子孙', what: '健康平安' };
    if (/学|考|试|毕/.test(q)) return { name: '父母 / 官鬼', what: '文书功名' };
    return { name: '应爻', what: '所问之事' };
  }

  /* 动爻解读 */
  function movingReading(yaoArr) {
    const moving = yaoArr.map((y, i) => ({ y, i: i + 1 })).filter((x) => x.y.moving);
    if (!moving.length) return '六爻皆静，事在当下无大变动，宜按现状从容行事。';
    return moving.map((m) => {
      const pos = { 1: '初爻', 2: '二爻', 3: '三爻', 4: '四爻', 5: '五爻', 6: '上爻' }[m.i];
      const tip = {
        1: '发端之动，根基初动，慎始则吉',
        2: '中位之动，有近贵之助，顺势可成',
        3: '多凶之位，防中途变故，三思后行',
        4: '进退之动，察时度势，勿轻举妄动',
        5: '君位之动，事近有成，把握良机',
        6: '极位之动，物极必反，见好即收',
      }[m.i];
      return `${pos}${m.y.label}动：${tip}。`;
    }).join('\n');
  }

  /* 问题领域落点 */
  function areaLine(question, benBrief, movingCount) {
    const t = (question || '').replace(/\s/g, '');
    if (/感情|恋爱|婚姻|对象|伴侣|复合|分手|桃花|喜欢/.test(t))
      return `放在感情上：${benBrief}这段关系里的变数，往往不在对方，在你心里那道「要不要继续投入」的坎。${movingCount ? '有动爻，说明这段关系正处在被「推一把」的阶段——要么说开，要么拉开，别耗着。' : '六爻安静，说明感情暂时平稳，急不来，也催不得。'}`;
    if (/工作|事业|升职|跳槽|offer|面试|创业|公司|项目|辞职/.test(t))
      return `放到事业上：${benBrief}职业这条线，最忌「没动爻却心猿意马」——要么踏实做手头事，要么准备好了再挪，二选一，别两头吊着。${movingCount ? '既然有动，说明时机在动：机会有，但得你自己伸手。' : ''}`;
    if (/钱|财|投资|股票|基金|生意|收入|赚钱|借贷|买房/.test(t))
      return `关于钱财：${benBrief}钱的事，卦象最直接——${movingCount ? '有动爻，说明钱在「流」，宜顺势调整布局，别捂死也别撒手。' : '六爻皆静，钱的事暂时没大波澜，守好基本盘，别贪快钱。'}`;
    if (/考|学|试|成绩|升学|论文|毕业/.test(t))
      return `用在学业上：${benBrief}考试与功课，静卦主稳扎稳打，动卦主临场发挥——你缺的从来不是聪明，是「坐下来」这三个字。`;
    if (/健康|身体|病|失眠|焦虑|状态/.test(t))
      return `落到身心：${benBrief}身体的问题，卦从不吓人，只提醒——先查睡眠和情绪这两个「地基」，别的都是表象。`;
    if (/去留|选择|要不要|该不该|决定|纠结|搬家/.test(t))
      return `这关乎去留：${benBrief}选择这种事，卦给的是「势」，不是「令」——势在动，就顺势而为；势在静，就再等等。`;
    return `落到你问的这件事：${benBrief}${movingCount ? '有动爻，说明事情正在松动，机会藏在变数里。' : '六爻皆静，事情暂时平稳，按部就班就是最好的节奏。'}`;
  }

  /* 解读生成（叙事版） */
  function interpret(result, question) {
    const q = question ? `你问的是：「${question}」` : '你没写具体问题，就当这是替此刻心绪摇的一卦。';
    const ys = selectYongshen(question);
    const moving = result.movingCount;
    const movingText = movingReading(result.yao).split('\n');

    const parts = [
      q,
      ``,
      `卦成了。三枚铜钱摇六次，得本卦「${result.ben.name}」——${result.ben.brief}。`,
      result.bian
        ? `有 ${moving} 个动爻，变出「${result.bian.name}」——这卦不是停在原地的，它在动，事情的走向也随之一变。`
        : '这一卦六爻皆静——没有动爻，说的是事态正处在一个相对平稳的区间，眼下没有大变故。',
      ``,
      `这一问，卦上以「${ys.name}」为用神（${ys.what}），盯住它，就是盯住你这事的命门。`,
      ``,
      movingText.map((t) => '· ' + t).join('\n'),
      ``,
      areaLine(question, result.ben.brief, moving),
      ``,
      `卦给的方向：${result.bian
        ? (moving >= 2
          ? `动爻 ${moving} 处，事情有反复之象——好事防中途变卦，坏事也有松动之机。此时最忌来回折腾，以静制动，等它自己落定。`
          : `一爻独发，成败的关键就藏在这独动的一爻里：${movingText[0].replace('· ', '')}顺势而应，别强求速成。`)
        : '六爻安静，主事态平稳——不是没机会，是机会还没到点火的时候。先把能做的事做好，时机自有它的脾气。'}`,
    ];
    return ToneEngine.wrap(parts.join('\n'), { title: null, opening: true, ending: true });
  }

  function summarize(result) {
    const moving = result.movingCount;
    return [
      `本卦「${result.ben.name}」：${result.ben.brief}。`,
      result.bian
        ? `动爻 ${moving} 处，变卦「${result.bian.name}」——${moving >= 2 ? '事情有反复，守静待定，别来回折腾。' : '关键转折在这独动的一爻，顺着它走。'}`
        : '六爻皆静：事态平稳，按部就班即是上策。',
      '卦看的是当下的势，路是你走出来的。合上卦，明天照样迈步。',
    ];
  }

  global.LiuyaoEngine = { cast, interpret, summarize, tossCoin, selectYongshen };
})(window);
