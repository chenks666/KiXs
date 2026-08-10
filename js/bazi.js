/* ============================================================
   KiXs · 八字引擎 BaZiEngine
   ------------------------------------------------------------
   确定性算法：
   · 日柱 = 儒略日数公式（精确）
   · 时柱 = 五鼠遁（精确）
   · 年柱/月柱 = 立春/节气定界，节气用经典递推近似（±1 日，
     页面显著标注；精确万年历请接入权威历法库）
   · 子时默认晚子时：23:00 后算次日
   解读经 ToneEngine.wrap() 适配夜语模式
   ============================================================ */
(function (global) {
  'use strict';

  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const GAN_WU = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const ZHI_WU = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };

  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

  /* ---------- 地支藏干（本气·中气·余气） ---------- */
  const ZANG_GAN = {
    子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
    辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
    申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
  };

  /* ---------- 神煞（确定性规则） ----------
     桃花/驿马按年支三合局；文昌/贵人/羊刃按日干 */
  const SANHE = { 申: '酉', 子: '酉', 辰: '酉', 寅: '卯', 午: '卯', 戌: '卯', 巳: '午', 酉: '午', 丑: '午', 亥: '子', 卯: '子', 未: '子' }; // 桃花（按支所属三合局）
  const YIMA = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' }; // 驿马（按支所属三合局冲）
  const WENCHANG = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
  const GUI_REN = { 甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'], 乙: ['子', '申'], 己: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'], 壬: ['巳', '卯'], 癸: ['巳', '卯'], 辛: ['午', '寅'] };
  const YANG_REN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };

  /** 求某流年的神煞（相对日主与年支） */
  function shenShaOf(dayGan, yearZhi, gan, zhi) {
    const list = [];
    if (SANHE[yearZhi] === zhi) list.push('桃花');
    if (YIMA[yearZhi] === zhi) list.push('驿马');
    if (WENCHANG[dayGan] === zhi || WENCHANG[dayGan] === gan) list.push('文昌');
    if ((GUI_REN[dayGan] || []).includes(zhi)) list.push('天乙贵人');
    if (YANG_REN[dayGan] === zhi) list.push('羊刃');
    return list;
  }

  /* ---------- 儒略日（格里历） ---------- */
  function julianDay(y, m, d) {
    if (m <= 2) { y--; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  /* ---------- 节气近似（经典递推，基准 2000-01-06 小寒，北京时间口径） ---------- */
  const TERM_BASE_UTC = Date.UTC(2000, 0, 5, 18, 46); // 2000-01-06 02:46 北京 = UTC 01-05 18:46
  function termApprox(year, idx) {
    // idx: 0=小寒,1=大寒,2=立春,... 23=大雪（每年 12 节从立春 idx 2 起）
    const days = 365.2422 * (year - 2000) + 15.2184 * idx;
    return new Date(TERM_BASE_UTC + days * 86400000);
  }

  /* 12 节（定月）：立春惊蛰清明立夏芒种小暑立秋白露寒露立冬大雪小寒，取 idx 2,4,6,8,10,12,14,16,18,20,22,24? 实际 idx 步长2：立春2 惊蛰4 清明6 立夏8 芒种10 小暑12 立秋14 白露16 寒露18 立冬20 大雪22 小寒24(次年) */
  function monthJie(year) {
    // 返回当年 12 节（立春…大雪）的 UTC 时间戳数组
    return [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((idx) => termApprox(year, idx));
  }

  /* 六十甲子索引：idx ≡ gan (mod 10) 且 idx ≡ zhi (mod 12) */
  function ganzhiIndex(ganIdx, zhiIdx) {
    for (let i = 0; i < 60; i++) {
      if (i % 10 === ganIdx && i % 12 === zhiIdx) return i;
    }
    return -1;
  }

  /* ---------- 排盘 ---------- */
  function cast(birthDate, shichen /* '子'...'亥' */, opts = {}) {
    const lateZi = opts.lateZi !== false; // 默认晚子时
    const hourRange = { 子: [23, 1], 丑: [1, 3], 寅: [3, 5], 卯: [5, 7], 辰: [7, 9], 巳: [9, 11], 午: [11, 13], 未: [13, 15], 申: [15, 17], 酉: [17, 19], 戌: [19, 21], 亥: [21, 23] }[shichen];

    let y = birthDate.getFullYear(), m = birthDate.getMonth() + 1, d = birthDate.getDate();
    let hour = hourRange[0]; // 取该时辰开始小时

    // 晚子时：23:00 后算次日
    let dayJdn = julianDay(y, m, d);
    if (lateZi && shichen === '子' && hour === 23) {
      dayJdn += 1; // 日柱 +1（23 点后属次日）
    }

    /* 日柱（精确） */
    const dayGZ = Math.floor((dayJdn + 0.5 + 49) % 60);

    /* 年柱 + 月柱：以立春及月节为界（近似节气） */
    const jies = monthJie(y);
    const birthUtc = Date.UTC(y, m - 1, d, hour, 0, 0);
    let liChun = termApprox(y, 2);
    let yearGanZhi;

    const afterLiChun = birthUtc >= liChun.getTime();
    const yearBase = afterLiChun ? y : y - 1;

    // 年干支（1984 甲子）
    yearGanZhi = ((yearBase - 4) % 60 + 60) % 60;

    // 月支：按 12 节区间（寅月起于立春）
    const jieTimes = [liChun.getTime(), ...monthJie(y).slice(1).map((t) => t.getTime())];
    // 若未过立春，用上一年的节序列
    let jieList = jieTimes;
    let jieYear = y;
    if (!afterLiChun) {
      jieYear = y - 1;
      jieList = [termApprox(jieYear, 2).getTime(), ...monthJie(jieYear).slice(1).map((t) => t.getTime())];
    }
    let monthIdx = 0; // 0=寅月
    for (let i = jieList.length - 1; i >= 0; i--) {
      if (birthUtc >= jieList[i]) { monthIdx = i; break; }
    }
    const monthZhiIdx = (monthIdx + 2) % 12; // 0→寅(2)
    const monthZhi = ZHI[monthZhiIdx];

    // 月干：五虎遁（年干 → 寅月干）
    const yearGanIdx = yearGanZhi % 10;
    const wuHu = [2, 4, 6, 8, 0]; // 甲→丙(2), 乙→戊(4), 丙→庚(6), 丁→壬(8), 戊→甲(0)
    const yinGan = (wuHu[yearGanIdx % 5] + monthIdx) % 10;
    const monthGanZhi = yinGan * 12 + monthZhiIdx;

    /* 时柱：五鼠遁 */
    const hourZhiIdx = ZHI.indexOf(shichen);
    const dayGanIdx = dayGZ % 10;
    const wuShu = [0, 2, 4, 6, 8]; // 甲己→甲(0)起子, 乙庚→丙(2), 丙辛→戊(4), 丁壬→庚(6), 戊癸→壬(8)
    const ziGan = wuShu[dayGanIdx % 5];
    const hourGanIdx = (ziGan + hourZhiIdx) % 10;
    const hourGanZhi = hourGanIdx * 12 + hourZhiIdx;

    // 六十甲子正确索引（gan/zhi 字段仍由索引反推显示）
    const monthGZIdx = ganzhiIndex(yinGan, monthZhiIdx);
    const hourGZIdx = ganzhiIndex(hourGanIdx, hourZhiIdx);

    const pillars = [
      { name: '年柱', ganzhi: yearGanZhi, gan: GAN[yearGanZhi % 10], zhi: ZHI[yearGanZhi % 12], kind: '年柱' },
      { name: '月柱', ganzhi: monthGZIdx, gan: GAN[yinGan], zhi: ZHI[monthZhiIdx], kind: '月柱' },
      { name: '日柱', ganzhi: dayGZ, gan: GAN[dayGZ % 10], zhi: ZHI[dayGZ % 12], kind: '日柱' },
      { name: '时柱', ganzhi: hourGZIdx, gan: GAN[hourGanIdx], zhi: ZHI[hourZhiIdx], kind: '时柱' },
    ];

    // 五行统计
    const wuCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach((p) => {
      wuCount[GAN_WU[p.gan]]++;
      wuCount[ZHI_WU[p.zhi]]++;
    });

    return { pillars, wuCount, dayMaster: pillars[2].gan, dayMasterWu: GAN_WU[pillars[2].gan], monthZhi, lateZi, birthText: `${y}年${m}月${d}日 ${shichen}时` };
  }

  /* ---------- 十神 ---------- */
  function shishen(dayGan, otherGan) {
    const d = GAN.indexOf(dayGan), o = GAN.indexOf(otherGan);
    const sameYin = (d % 2) === (o % 2);
    const dWu = GAN_WU[dayGan], oWu = GAN_WU[otherGan];
    if (dWu === oWu) return sameYin ? '比肩' : '劫财';
    if (SHENG[oWu] === dWu) return sameYin ? '偏印' : '正印';
    if (SHENG[dWu] === oWu) return sameYin ? '食神' : '伤官';
    if (KE[dWu] === oWu) return sameYin ? '偏财' : '正财';
    return sameYin ? '七杀' : '正官';
  }

  /* ---------- 日主强弱（简化） ---------- */
  function strength(pillars) {
    const day = pillars[2];
    const dayWu = GAN_WU[day.gan];
    const monthZhiWu = ZHI_WU[pillars[1].zhi];
    let score = 0;
    if (SHENG[monthZhiWu] === dayWu || monthZhiWu === dayWu) score += 2; // 月令生扶
    pillars.forEach((p) => {
      if (p.gan === day.gan) score++;
      if (GAN_WU[p.gan] === dayWu && p.gan !== day.gan) score += 0.6; // 比劫帮扶
      if (SHENG[GAN_WU[p.gan]] === dayWu) score += 0.6; // 印星生我
    });
    const strong = score >= 3.2;
    return { score: Math.round(score * 10) / 10, strong, dayWu };
  }

  /* ---------- 解读（叙事版） ---------- */
  function interpret(result) {
    const dm = result.dayMaster;
    const dmWu = result.dayMasterWu;
    const st = strength(result.pillars);
    const countArr = Object.entries(result.wuCount).sort((a, b) => b[1] - a[1]);
    const most = countArr[0];
    const least = countArr[countArr.length - 1];
    const wuText = {
      木: '木主仁，你性格里有种舒展的劲儿，喜欢生长、喜欢创造，天生见不得死气沉沉。',
      火: '火主礼，你骨子里是亮的，待人热情、做事利落，情绪来得快也去得快。',
      土: '土主信，你敦厚、能扛事，是那种朋友出了事第一个想到的人，稳当是你的底色。',
      金: '金主义，你干脆、要强，心里有杆秤，对规则和标准看得很重。',
      水: '水主智，你脑子活、转得快，善变是本事也是软肋——容易想通一切，也容易想太多。',
    };
    const dmPerson = {
      木: '木命之人，如春木向荣——你这辈子要的不是「熬」，是「长」，在适合自己的土里，越长越舒展。',
      火: '火命之人，如灯烛照人——你适合站在有光的地方，创造、表达、带着别人走，是你天然的赛道。',
      土: '土命之人，如大地承载——你能容人、能托事，稳是你的福气，但也别把自己活成「什么都扛的墙」。',
      金: '金命之人，如利剑藏锋——你适合深耕一门手艺或专业，专注与精进，是你最锋利的两件武器。',
      水: '水命之人，如江河顺势——你天生适合流动与变通，困住你的从来不是能力，是「不知该往哪流」。',
    };

    // 十神取关键几样，只说对格局重要的
    const shenMap = {};
    result.pillars.forEach((p) => {
      const s = shishen(dm, p.gan);
      shenMap[s] = (shenMap[s] || 0) + 1;
    });
    const shenTalk = [];
    if (shenMap['正官'] || shenMap['七杀']) shenTalk.push(`${shenMap['七杀'] ? '官杀' : '正官'}在你盘里显形——你对「规矩、名分、往上走」有种天然的在意，事业心藏不住。`);
    if (shenMap['正财'] || shenMap['偏财']) shenTalk.push(`财星${shenMap['偏财'] ? '（偏财）' : '（正财）'}透出——你与钱的缘分不浅，但财要「求」也要「配」，身不够时财会反咬。`);
    if (shenMap['正印'] || shenMap['偏印']) shenTalk.push(`印星护身——你是有「靠山」的人：父母、师长、或你自己的学习能力，关键时刻总有人、总有知识托你一把。`);
    if (shenMap['食神'] || shenMap['伤官']) shenTalk.push(`食伤灵动——你天生有表达欲和才华，别把它闷着，写出来、说出来、做出来，都是你的运。`);
    if (shenMap['比肩'] || shenMap['劫财']) shenTalk.push(`比劫重——你讲义气、圈子热络，但也要防「为朋友两肋插刀」插的是自己的钱包。`);

    const parts = [
      `日主是 ${dm}${dmWu}——${wuText[dmWu]}`,
      ``,
      `这一盘里，${most[0]}气最重（${most[1]} 个），${least[0]}气最薄（${least[1]} 个）。五行偏在${most[0]}，说明你的天赋和执念都在这上面；而${least[0]}是你这辈子要「补课」的功课。${least[1] === 0 ? '五行缺了它，不是缺了它就不行，而是那方面的课题会反复出现，直到你学会。' : ''}`,
      ``,
      `${st.strong ? `你身旺（${st.score} 分）——自我能量足，能扛事、敢担当，但也容易「我执」：听不进劝、放不下身段。你这一生要练的，是「收敛」：把力量用在刀刃上，别四处点火。` : `你身弱（${st.score} 分）——不是弱，是「蓄势型」：适合借力、结盟、靠团队，不适合硬刚。你这一生要练的，是「借」：善用贵人、善用平台，你的命从来不是单打独斗的剧本。`}`,
      ``,
      shenTalk.length ? shenTalk.join('\n') + '。' : '四柱平和，五行流转均匀，人生起伏不会太极端，稳稳当当就是你的主线。',
      ``,
      dmPerson[dmWu],
      ``,
      `给你三句实在话——`,
      `① 事业上：${st.strong ? '你适合「带兵」——管人、牵头、扛指标，位置越高越旺你。' : '你适合「借势」——跟对平台、跟对人，比单打独斗重要十倍。'}`,
      `② 感情里：${shenMap['正财'] || shenMap['偏财'] ? '你盘里财星明现（男命财为妻、女命要看官杀），姻缘的线索一直在，问题是你会不会「留时间」给感情。' : '你盘里财星不显，感情上你属于「慢热但认真」型——宁缺毋滥不是缺点，是标准。'}`,
      `③ 健康上：${least[0] === '水' ? '水弱要护肾与睡眠，别熬夜，熬夜最耗你的短板。' : least[0] === '金' ? '金弱要护肺与呼吸系统，也要少思虑，想太多伤气。' : least[0] === '木' ? '木弱要护肝胆与情绪，怒伤肝，气大伤身，学着别往心里搁。' : least[0] === '火' ? '火弱要护心与循环，情绪起伏别太大，心平则气和。' : '土弱要护脾胃，饮食规律是第一养生。'}`,
    ];
    return ToneEngine.wrap(parts.join('\n'), { title: null, opening: true, ending: true });
  }

  /* ---------- 逐年流年详批（问真风格） ----------
     birthYear: 出生公历年；gender: 性别；dy: dayun() 结果 */
  function liunianDetail(result, year, birthYear, gender, dy) {
    const gz = ((year - 4) % 60 + 60) % 60;
    const g = GAN[gz % 10], z = ZHI[gz % 12];
    const dayGan = result.dayMaster;
    const yearZhi = result.pillars[0].zhi;
    const shen = shishen(dayGan, g);
    const zang = ZANG_GAN[z];
    const zangShen = zang.map((zg) => `${zg}${shishen(dayGan, zg)}`).join('、');
    const shenSha = shenShaOf(dayGan, yearZhi, g, z);
    const st = strength(result.pillars);

    // 当前所处大运（按出生年推算，startAge 为周岁起）
    let curYun = null;
    if (dy && dy.yuns) {
      const yunStartYear = birthYear + (dy.qiYun - 1);
      curYun = dy.yuns.find((u) => year >= yunStartYear + u.startAge - dy.qiYun && year < yunStartYear + u.startAge - dy.qiYun + 10);
      if (!curYun) curYun = dy.yuns[dy.yuns.length - 1];
    }

    const shenLine = {
      正官: '官星当头——名声、职位、规则在这一年摆上台面，升迁有门，但责任也随之而来。',
      七杀: '七杀临年——压力与机会并存的一年，挑战大，扛住了就是进身之阶，宜主动破局。',
      正财: '正财入命——正财正得，工资生意稳步进账，务实的一年，忌投机。',
      偏财: '偏财透出——意外之财与人脉财有缘，但来得快去得也快，见好就收。',
      正印: '正印护身——学习、文书、贵人运好的一年，适合进修考证、求稳沉淀。',
      偏印: '偏印流年——思维独到但易钻牛角尖，防小人与是非，宜专注一门。',
      食神: '食神之年——表达、创作、享受生活的好年份，才华变现，人缘转好。',
      伤官: '伤官流年——锋芒毕露，创意爆发，但话多易惹口舌，忌顶撞权威。',
      比肩: '比肩之年——朋友合伙、竞争并立，得人助也防人争，分账要清。',
      劫财: '劫财流年——破财防小人的信号年，管住手、捂紧钱包，借出去的钱难回。',
    }[shen] || '平顺之年，按部就班。';

    // 结合身强身弱
    const strengthLine = st.strong
      ? (shen.includes('财') ? '你身旺能担财，这一年可放开手脚求正财。' : shen.includes('官') ? '身旺官来，正是扛大旗的年份，别推辞。' : shen.includes('比') ? '身旺再逢比劫，注意别逞强过头、财被分走。' : '身旺之年，宜输出担当，忌守旧不动。')
      : (shen.includes('印') ? '身弱得印，贵人扶你一把，这是补气的好年份。' : shen.includes('比') ? '身弱逢比劫，朋友是助力，抱团取暖。' : shen.includes('官') ? '身弱见官，压力偏大，先保自己再谈上进。' : '身弱之年，养精蓄锐为上，别硬扛。');

    // 健康提示（羊刃/冲克）
    const healthLine = shenSha.includes('羊刃') ? '羊刃临年，注意意外磕碰与情绪冲动，开车办事都慢半拍。'
      : gz % 12 === (result.pillars[2].ganzhi % 12) ? '流年地支与日支同气，身体平稳，情绪略闷，多晒太阳。'
      : '流年五行与日主相安，健康平顺，规律作息即可。';

    return {
      year, g, z, gz: g + z, shen, zang, zangShen, shenSha,
      curYun: curYun ? curYun.gz : null,
      shenLine, strengthLine, healthLine,
      score: yunsheScore(result, year),
    };
  }

  /* ---------- 五维运势评分（事业/财运/感情/健康/学业，0-100） ---------- */
  function yunsheScore(result, year) {
    const gz = ((year - 4) % 60 + 60) % 60;
    const g = GAN[gz % 10], z = ZHI[gz % 12];
    const dayGan = result.dayMaster;
    const st = strength(result.pillars);
    const shen = shishen(dayGan, g);
    const yearZhi = result.pillars[0].zhi;
    const ss = shenShaOf(dayGan, yearZhi, g, z);

    let career = 50, money = 50, love = 50, health = 50, study = 50;
    const add = (v, n) => Math.max(5, Math.min(98, v + n));
    // 事业：官杀印推动
    if (shen.includes('官')) career = add(career, st.strong ? 22 : 8);
    if (shen === '正印' || shen === '偏印') career = add(career, 10);
    if (shen === '比肩' || shen === '劫财') career = add(career, st.strong ? 6 : -4);
    // 财运：财星 + 身强弱
    if (shen.includes('财')) money = add(money, st.strong ? 24 : 8);
    if (shen === '食神' || shen === '伤官') money = add(money, 12); // 食伤生财
    if (shen === '劫财') money = add(money, -12);
    if (shen === '比肩') money = add(money, -6);
    // 感情：桃花/财官
    if (ss.includes('桃花')) love = add(love, 18);
    if (shen === '正财' || shen === '七杀') love = add(love, 10); // 男财女杀
    if (shen === '伤官' && !st.strong) love = add(love, -8);
    // 健康：羊刃/冲/劫
    if (ss.includes('羊刃')) health = add(health, -14);
    if (shen === '七杀') health = add(health, -6);
    if (ss.includes('天乙贵人')) health = add(health, 6);
    // 学业：印/文昌/食伤
    if (shen.includes('印')) study = add(study, 22);
    if (ss.includes('文昌')) study = add(study, 15);
    if (shen === '食神' || shen === '伤官') study = add(study, 8);
    if (ss.includes('桃花') && !st.strong) study = add(study, -6);

    return { career: Math.round(career), money: Math.round(money), love: Math.round(love), health: Math.round(health), study: Math.round(study) };
  }

  /* ---------- 流年（未来三年） ---------- */
  function liunian(result, startYear) {
    return [0, 1, 2].map((i) => {
      const yy = startYear + i;
      const gz = ((yy - 4) % 60 + 60) % 60;
      const g = GAN[gz % 10], z = ZHI[gz % 12];
      const gzWu = GAN_WU[g];
      const dmWu = result.dayMasterWu;
      const rel = gzWu === dmWu ? '与你同气，平顺之年——稳扎稳打，别浪'
        : SHENG[gzWu] === dmWu ? '生你的年份——得助，贵人运起，可大胆推进'
        : SHENG[dmWu] === gzWu ? '你生它，泄气之年——适合输出创造，忌透支硬扛'
        : KE[gzWu] === dmWu ? '克你的年份——压力与小人并存，宜守不宜攻'
        : '你去克它，破局之年——化压力为动力，主动出击';
      return { year: yy, g, z, gz: g + z, rel };
    });
  }

  /* ---------- 大运排盘（确定性算法） ----------
     起运岁数 = 出生日至最近「节」的天数 ÷ 3（三日折一岁）
     顺排（阳男阴女）/ 逆排（阴男阳女），从月柱干支起推
     每运十年 */
  function dayun(result, birthDate, hour, gender) {
    const y = birthDate.getFullYear();
    const m = birthDate.getMonth() + 1, d = birthDate.getDate();
    const birthUtc = Date.UTC(y, m - 1, d, hour, 0, 0);
    const idxs = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]; // 小寒 立春 惊蛰 清明 立夏 芒种 小暑 立秋 白露 寒露 立冬 大雪
    const allTerms = [];
    for (const yy of [y - 1, y, y + 1]) {
      idxs.forEach((i) => allTerms.push(termApprox(yy, i).getTime()));
    }
    let prev = -Infinity, next = Infinity;
    for (const t of allTerms) {
      if (t < birthUtc && t > prev) prev = t;
      if (t > birthUtc && t < next) next = t;
    }
    const yearGan = result.pillars[0].gan;
    const yang = ['甲', '丙', '戊', '庚', '壬'].includes(yearGan);
    const forward = (gender === '男' && yang) || (gender === '女' && !yang);
    const days = forward ? (next - birthUtc) / 86400000 : (birthUtc - prev) / 86400000;
    const qiYun = Math.max(1, Math.floor(days / 3)); // 三日折一岁
    const mGZ = result.pillars[1].ganzhi;
    const step = forward ? 1 : -1;
    const yuns = [];
    for (let i = 1; i <= 8; i++) {
      const gz = (((mGZ + i * step) % 60) + 60) % 60;
      yuns.push({
        gan: GAN[gz % 10], zhi: ZHI[gz % 12],
        gz: GAN[gz % 10] + ZHI[gz % 12],
        startAge: qiYun + (i - 1) * 10,
        wu: GAN_WU[GAN[gz % 10]],
      });
    }
    return { qiYun, forward: forward ? '顺排' : '逆排', yuns };
  }

  function summarize(result, startYear) {
    const ln = liunian(result, startYear);
    const st = strength(result.pillars);
    const most = Object.entries(result.wuCount).sort((a, b) => b[1] - a[1])[0][0];
    return [
      `日主 ${result.dayMaster}${result.dayMasterWu}，${st.strong ? '身旺，这辈子练的是「收敛」' : '身弱，这辈子练的是「借力」'}。`,
      `盘里 ${most} 气最重——你的天赋与执念都在这里；四柱 ${result.pillars.map((p) => p.gan + p.zhi).join(' ')}。`,
      `${startYear} 流年 ${ln[0].gz}：${ln[0].rel}；${startYear + 1} 流年 ${ln[1].gz}：${ln[1].rel}。命是底色，运是风——帆怎么张，在你。`,
    ];
  }

  global.BaZiEngine = { cast, interpret, summarize, liunian, liunianDetail, yunsheScore, dayun, strength, shishen, GAN, ZHI, GAN_WU, ZHI_WU, ZANG_GAN, shenShaOf };
})(window);
