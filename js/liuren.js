/* ============================================================
   KiXs · 大六壬引擎 LiuRenEngine
   ------------------------------------------------------------
   算法参考 daliuren-lib / 传统《大六壬大全》规则：
   · 月将：按节气中气换将（雨水亥、春分戌…冬至丑、大寒子）
   · 天盘：月将加时（月将落到时支，其余顺转）
   · 四课：干上（日干寄宫上神）、干阴、支上、支阴
   · 三传：九宗门简化（贼克→比用→遥克→兜底）
   · 十二天将：十干贵人诀 + 昼夜顺逆
   · 六亲：日干生克
   标注：九宗门为演示简化版，完整版见专业排盘引擎
   解读经 ToneEngine.wrap() 适配夜语模式
   ============================================================ */
(function (global) {
  'use strict';

  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const WU_OF_GAN = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const WU_OF_ZHI = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

  /* 十干寄宫：甲寅、乙辰、丙戊巳、丁己未、庚申、辛戌、壬亥、癸丑 */
  const GAN_JI = { 甲: 2, 乙: 4, 丙: 5, 丁: 7, 戊: 5, 己: 7, 庚: 8, 辛: 10, 壬: 11, 癸: 1 };

  /* 月将名 → 地支序 */
  const YUE_JIANG = {
    子: '神后', 丑: '大吉', 寅: '功曹', 卯: '太冲', 辰: '天罡', 巳: '太乙',
    午: '胜光', 未: '小吉', 申: '传送', 酉: '从魁', 戌: '河魁', 亥: '登明',
  };
  const JIANG_SHEN = ['贵人', '螣蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];

  /* 节气近似（与 bazi.js 同法，UTC 基准 2000-01-06 小寒） */
  const TERM_BASE_UTC = Date.UTC(2000, 0, 5, 18, 46);
  function termApprox(year, idx) {
    const days = 365.2422 * (year - 2000) + 15.2184 * idx;
    return new Date(TERM_BASE_UTC + days * 86400000);
  }

  /* 儒略日 */
  function julianDay(y, m, d) {
    if (m <= 2) { y--; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  /* 日干支 */
  function dayGanzhi(y, m, d, lateZi) {
    let jdn = julianDay(y, m, d);
    if (lateZi) jdn += 1;
    const gz = Math.floor((jdn + 0.5 + 49) % 60);
    return { gan: GAN[gz % 10], zhi: ZHI[gz % 12] };
  }

  /* 月支（节气定月，近似） */
  function monthZhi(y, m, d, hour) {
    const birthUtc = Date.UTC(y, m - 1, d, hour, 0, 0);
    const idxs = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // 小寒立春惊蛰…大雪
    let terms = idxs.map((i) => termApprox(y, i).getTime());
    // 若在小寒前（1 月 1-5 日），用上一年序列
    if (birthUtc < terms[0]) terms = idxs.map((i) => termApprox(y - 1, i).getTime());
    let idx = 0;
    for (let i = terms.length - 1; i >= 0; i--) {
      if (birthUtc >= terms[i]) { idx = i; break; }
    }
    // idx: 0=小寒后丑月, 1=立春后寅月 … 11=大雪后子月
    return ZHI[(idx + 1) % 12];
  }

  /* 月将：按中气（雨水亥 春分戌 谷雨酉 小满申 夏至未 大暑午 处暑巳 秋分辰 霜降卯 小雪寅 冬至丑 大寒子） */
  const ZHONGQI = [
    { idx: 1, jiang: 0 },   // 大寒(1/20) → 子
    { idx: 3, jiang: 11 },  // 雨水(2/19) → 亥
    { idx: 5, jiang: 10 },  // 春分(3/20) → 戌
    { idx: 7, jiang: 9 },   // 谷雨(4/20) → 酉
    { idx: 9, jiang: 8 },   // 小满(5/21) → 申
    { idx: 11, jiang: 7 },  // 夏至(6/21) → 未
    { idx: 13, jiang: 6 },  // 大暑(7/23) → 午
    { idx: 15, jiang: 5 },  // 处暑(8/23) → 巳
    { idx: 17, jiang: 4 },  // 秋分(9/23) → 辰
    { idx: 19, jiang: 3 },  // 霜降(10/23) → 卯
    { idx: 21, jiang: 2 },  // 小雪(11/22) → 寅
    { idx: 23, jiang: 1 },  // 冬至(12/22) → 丑
  ];
  function yueJiang(y, m, d, hour) {
    const birthUtc = Date.UTC(y, m - 1, d, hour, 0, 0);
    let jiang = 11; // 默认亥（雨水后）
    for (const z of ZHONGQI) {
      const t = termApprox(y, z.idx).getTime();
      // 大寒在 1 月，跨年判断：若日期在 1/1–大寒之间，用上一年冬至后状态
      if (birthUtc >= t) jiang = z.jiang;
    }
    // 若在大寒（1/20 左右）之前，取上一年的冬至后的丑
    if (birthUtc < termApprox(y, 1).getTime()) {
      // 上一年最后一个中气是冬至（12/22）→ 丑
      jiang = 1;
    }
    return jiang;
  }

  /* 六亲 */
  function liuqin(dayGan, zhi) {
    const dw = WU_OF_GAN[dayGan], zw = WU_OF_ZHI[zhi];
    if (dw === zw) return '比肩';
    if (SHENG[zw] === dw) return '父母';
    if (SHENG[dw] === zw) return '子孙';
    if (KE[zw] === dw) return '官鬼';
    return '妻财';
  }

  /* ---------- 起课 ---------- */
  function cast(y, m, d, hour /* 0-23 */) {
    const lateZi = hour >= 23;
    const dg = dayGanzhi(y, m, d, lateZi);
    const mz = monthZhi(y, m, d, hour);
    const sz = ZHI[Math.floor(((hour + 1) % 24) / 2)]; // 时辰地支
    const yj = yueJiang(y, m, d, hour);

    // 天盘：地盘支 x 上的上神 = (月将 + (x - 时支)) mod 12
    const shiIdx = ZHI.indexOf(sz);
    const tianPan = {};
    ZHI.forEach((z, i) => {
      tianPan[i] = ((yj + (i - shiIdx)) % 12 + 12) % 12;
    });
    const shangShen = (i) => tianPan[i];

    // 四课
    const jiGong = GAN_JI[dg.gan];
    const ke1 = shangShen(jiGong);          // 干上
    const ke2 = shangShen(ke1);             // 干阴
    const zhiIdx = ZHI.indexOf(dg.zhi);
    const ke3 = shangShen(zhiIdx);          // 支上
    const ke4 = shangShen(ke3);             // 支阴
    const siKe = [ke1, ke2, ke3, ke4];

    // 三传（九宗门简化：贼克→比用→遥克→兜底）
    const keTi = { ke1: [jiGong, ke1], ke2: [ke1, ke2], ke3: [zhiIdx, ke3], ke4: [ke3, ke4] };
    const wuOfZhiSeq = (i) => WU_OF_ZHI[ZHI[i]];
    const dayGanIdx = GAN.indexOf(dg.gan);
    const dayWu = WU_OF_GAN[dg.gan];
    const sameYin = (i) => (dayGanIdx % 2) === (i % 2); // 干与支的阴阳同异（简化用支序奇偶）

    // 贼：下克上（下地盘克上神）；克：上克下
    let faYong = null, keType = '';
    const zei = [];
    const keList = [];
    Object.entries(keTi).forEach(([k, [down, up]]) => {
      const dw = wuOfZhiSeq(down), uw = wuOfZhiSeq(up);
      if (KE[dw] === uw) zei.push({ k, down, up, dw, uw });      // 下克上 = 贼
      if (KE[uw] === dw) keList.push({ k, down, up, dw, uw });   // 上克下 = 克
    });
    if (zei.length) {
      keType = '贼克';
      // 比用：取与日干同阴阳者，无则取第一
      const bi = zei.filter((x) => sameYin(x.up));
      faYong = (bi.length ? bi : zei)[0];
    } else if (keList.length) {
      keType = '克';
      const bi = keList.filter((x) => sameYin(x.up));
      faYong = (bi.length ? bi : keList)[0];
    } else {
      // 遥克：日干与四课上神相克（简化：取干上与日干五行相克者）
      keType = '遥克';
      const yao = siKe.filter((up) => KE[dayWu] === wuOfZhiSeq(up) || KE[wuOfZhiSeq(up)] === dayWu);
      faYong = yao.length ? { up: yao[0], k: 'ke1' } : { up: ke1, k: 'ke1' };
    }
    const chu = faYong.up;
    const zhong = shangShen(chu);
    const mo = shangShen(zhong);
    const sanChuan = [chu, zhong, mo];

    // 十二天将（昼夜贵人 + 顺逆）
    const dayOrNight = hour >= 5 && hour < 17 ? 'day' : 'night';
    const guiRenZhi = { // 十干贵人：甲戊庚牛羊 乙己鼠猴 丙丁猪鸡 壬癸蛇兔 辛马虎
      甲: dayOrNight === 'day' ? 1 : 7, 戊: dayOrNight === 'day' ? 1 : 7, 庚: dayOrNight === 'day' ? 1 : 7,
      乙: dayOrNight === 'day' ? 0 : 8, 己: dayOrNight === 'day' ? 0 : 8,
      丙: dayOrNight === 'day' ? 11 : 9, 丁: dayOrNight === 'day' ? 11 : 9,
      壬: dayOrNight === 'day' ? 5 : 3, 癸: dayOrNight === 'day' ? 5 : 3,
      辛: dayOrNight === 'day' ? 6 : 2,
    }[dg.gan];
    const forward = dayOrNight === 'day';
    const tianJiang = {};
    for (let i = 0; i < 12; i++) {
      const step = forward ? i : -i;
      const zhiPos = ((guiRenZhi + step) % 12 + 12) % 12;
      tianJiang[zhiPos] = JIANG_SHEN[i];
    }

    // 六亲（三传 + 四课上神）
    const sanQin = sanChuan.map((z) => liuqin(dg.gan, ZHI[z]));

    return {
      dateText: `${y}年${m}月${d}日 ${sz}时`,
      dayGanzhi: dg.gan + dg.zhi,
      monthZhi: mz,
      shiZhi: sz,
      yueJiang: YUE_JIANG[ZHI[yj]],
      yueJiangZhi: yj,
      tianPan,
      siKe, keType, faYong, sanChuan, sanQin,
      tianJiang, guiRenZhi, dayOrNight,
      lateZi,
    };
  }

  /* 领域分析 */
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

  /* 三传吉凶判语 */
  const JIANG_JIXIONG = {
    贵人: ['吉', '得贵人扶持，事有助力'], 螣蛇: ['凶', '虚惊缠绕，防口舌惊扰'],
    朱雀: ['中', '信息文书之事，宜明辨'], 六合: ['吉', '和合之象，合作可成'],
    勾陈: ['凶', '拖延牵扯，防旧事反复'], 青龙: ['吉', '喜事渐近，进益之象'],
    天空: ['凶', '空亡虚浮，防承诺落空'], 白虎: ['凶', '冲煞临身，宜守勿进'],
    太常: ['中', '平稳守成，循旧而安'], 玄武: ['凶', '暗昧不明，防小人欺瞒'],
    太阴: ['中', '阴柔助力，暗中成事'], 天后: ['吉', '恩泽润泽，柔顺得助'],
  };

  /* 解读（叙事版） */
  function interpret(r, question) {
    const area = analyzeArea(question);
    const q = question ? `你问的是：「${question}」` : '你没写具体问题，就当这一课是替此刻的心境起的。';
    const chuJ = r.tianJiang[r.sanChuan[0]];
    const zhongJ = r.tianJiang[r.sanChuan[1]];
    const moJ = r.tianJiang[r.sanChuan[2]];
    const [jc, jt] = JIANG_JIXIONG[chuJ] || ['中', '平'];

    const parts = [
      q,
      ``,
      `课成。${r.dateText}，${r.dayGanzhi}日，月将${r.yueJiang}加${r.shiZhi}时——天盘既定，四课三传随即落定。`,
      ``,
      `四课：${r.siKe.map((z, i) => `第${i + 1}课 ${ZHI[z]}`).join('、')}。取「${r.keType}」发用，初传落${ZHI[r.sanChuan[0]]}。`,
      `三传：${r.sanChuan.map((z, i) => `${['初传', '中传', '末传'][i]}${ZHI[z]}${r.sanQin[i]}`).join(' → ')}。`,
      ``,
      `初传${ZHI[r.sanChuan[0]]}上临${chuJ}（${jt}）；中传${ZHI[r.sanChuan[1]]}临${zhongJ}；末传${ZHI[r.sanChuan[2]]}临${moJ}。${chuJ === '贵人' || chuJ === '六合' || chuJ === '青龙' || chuJ === '天后' ? '初传得吉将，事情开头有气象。' : chuJ === '白虎' || chuJ === '玄武' || chuJ === '勾陈' || chuJ === '天空' || chuJ === '螣蛇' ? '初传逢凶将，开头不顺是常态——别慌，看它教你的功课。' : '初传平将，此事不急不缓，按部就班即可。'}`,
      ``,
      `再观六亲：三传${r.sanQin.join('、')}——${r.sanQin[0] === '官鬼' ? '官鬼当头，事业压力或规则的约束在起作用，这事绕不开「名分」二字。' : r.sanQin[0] === '妻财' ? '妻财当头，所求多与利益相关：财来有路，但要正取。' : r.sanQin[0] === '父母' ? '父母当头，有文书、长辈或旧经验在为你撑场——先取现成资源。' : r.sanQin[0] === '子孙' ? '子孙当头，这事宜靠才华与表达打开局面，忌硬拼。' : '比肩当头，合伙、竞争、平分秋色——独木难支时，找人一起扛。'}`,
      ``,
      areaLine(area, r),
      ``,
      `断课收束：${jc === '吉' ? '初传吉将，课体向顺——该来的正在路上，你只管把姿态放正。' : jc === '凶' ? '课体偏险，但六壬最忌「先乱阵脚」——凶将提醒你慢下来，看清再动，输的不是机会是急躁。' : '课体平正，无大吉亦无大凶，稳着走，时间会给你答案。'}`,
    ];
    return ToneEngine.wrap(parts.join('\n'), { title: null, opening: true, ending: true });
  }

  function areaLine(area, r) {
    const last = ZHI[r.sanChuan[2]];
    const map = {
      love: `放到感情上：三传末传落${last}，${WU_OF_ZHI[last]}性之地——感情里先别急着要结论，把话说软、把心放平，才有转圜。`,
      career: `放到事业上：看初传${ZHI[r.sanChuan[0]]}与官鬼一系——职位与名分是这一课的题眼，${r.sanQin.includes('官鬼') ? '官鬼现于传中，事业有向上走的由头，但随之而来的是责任。' : '官鬼不显，眼下不是争名分的时机，先把事做扎实。'}`,
      money: `关于钱财：${r.sanQin.includes('妻财') ? '妻财入传，财路有门——但六壬看财忌「贪」，见好就收是这门课的道理。' : '妻财未显，眼下求财宜守不宜进，先保本再谈利。'}`,
      study: `用在学业上：${r.sanQin.includes('父母') ? '父母（文书）入传，考试文书之事有靠——扎实复习，临场自稳。' : '文书之星不显，功夫要下在「理解」而非「速成」。'}`,
      health: `落到身心：课体${r.sanChuan.some((z) => [6, 0].includes(z)) ? '见子午冲气，情绪起伏要注意——睡眠和心火是这一课的重点。' : '平稳，先安睡眠与情绪这两个底，身体自会给出回应。'}`,
      decision: `这关乎去留：三传「${r.sanChuan.map((z) => ZHI[z]).join('→')}」有流动之象——事情不会停在原地，你需要的不是「完美答案」，是「敢负责的选择」。`,
      general: `落到你当下：先看初传那一课的气象——初传${ZHI[r.sanChuan[0]]}临${r.tianJiang[r.sanChuan[0]]}，起手第一势在此，顺势而为。`,
    };
    return map[area];
  }

  function summarize(r) {
    return [
      `课起于${r.dayGanzhi}日，月将${r.yueJiang}加${r.shiZhi}时，${r.keType}发用。`,
      `三传 ${r.sanChuan.map((z) => ZHI[z]).join('→')}，初传临${r.tianJiang[r.sanChuan[0]]}（${JIANG_JIXIONG[r.tianJiang[r.sanChuan[0]]][1]}）。`,
      '六壬看的是「动静之机」：传在动，事在变。看清初传那一势，剩下的路在你脚下。',
    ];
  }

  global.LiuRenEngine = { cast, interpret, summarize, ZHI, GAN, YUE_JIANG, JIANG_SHEN };
})(window);
