/* ============================================================
   KiXs · AI 问师面板 AskPanel（v2 · 人物形象 + 命盘感知）
   ------------------------------------------------------------
   · 人物形象：西方体系（塔罗/星盘）= 女占星师；东方体系 = 男玄师
   · 命盘感知：排盘后调用 AskPanel.setChart(data)，
     问师会结合命盘数据 + 知识库回答，而非纯知识解读
   · 后台「循环思考」：意图解析 → 命盘调取 → 知识对照 →
     综合权衡 → 语气调整，思考过程在面板可视化
   · 负面征兆夜间自动软化（ToneEngine.soften）
   ============================================================ */
(function (global) {
  'use strict';

  const SYSTEM_LABEL = {
    bazi: '八字', ziwei: '紫微', astrology: '星盘', tarot: '塔罗',
    meihua: '梅花', liuyao: '六爻', liuren: '大六壬', common: '玄学通识',
  };

  /* 人物设定：西女东男 */
  const PERSONA = {
    west: { name: '月见', title: '占星师 · 夜观星象', system: ['tarot', 'astrology'] },
    east: { name: '玄机子', title: '玄学大师 · 深研命理', system: ['bazi', 'ziwei', 'meihua', 'liuyao', 'liuren', 'common'] },
  };
  function personaOf(system) {
    return (PERSONA.west.system.includes(system) ? PERSONA.west : PERSONA.east);
  }

  /* ---------- 人物头像 SVG ---------- */
  const AVATAR_WEST = `
    <svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block;">
      <defs>
        <radialGradient id="aw-bg" cx="50%" cy="38%"><stop offset="0%" stop-color="#3a2a6a"/><stop offset="100%" stop-color="#170f33"/></radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="url(#aw-bg)"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="#d4af37" stroke-width="1.4" opacity=".55"/>
      <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(212,175,55,.25)" stroke-width=".8" stroke-dasharray="2 4"/>
      <!-- 头纱 -->
      <path d="M24 66 Q36 8 60 10 Q78 12 76 66 Q64 76 50 74 Q36 76 24 66Z" fill="#5a3a8a" opacity=".9"/>
      <path d="M28 62 Q50 16 72 62" fill="none" stroke="rgba(232,228,255,.25)" stroke-width="1"/>
      <!-- 头发 -->
      <path d="M37 52 Q40 34 50 33 Q60 34 63 52 L63 48 Q60 30 50 29 Q40 30 37 48Z" fill="#2a1a3a"/>
      <!-- 脸 -->
      <ellipse cx="50" cy="56" rx="14" ry="15" fill="#e8b98a"/>
      <!-- 闭眼微笑 -->
      <path d="M43 54 Q45.5 56.5 48 54" stroke="#5a3a2a" fill="none" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M52 54 Q54.5 56.5 57 54" stroke="#5a3a2a" fill="none" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M45 63 Q50 66.5 55 63" stroke="#8a5a3a" fill="none" stroke-width="1.1" stroke-linecap="round"/>
      <!-- 星饰 -->
      <text x="31" y="26" font-size="9" fill="#ffd66e" text-anchor="middle">✦</text>
      <circle cx="70" cy="30" r="1.6" fill="#e8e4ff"/>
      <circle cx="24" cy="44" r="1.2" fill="#e8e4ff" opacity=".7"/>
      <text x="72" y="50" font-size="7" fill="#a890ff" text-anchor="middle">☽</text>
    </svg>`;

  const AVATAR_EAST = `
    <svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block;">
      <defs>
        <radialGradient id="ae-bg" cx="50%" cy="38%"><stop offset="0%" stop-color="#2a2110"/><stop offset="100%" stop-color="#0d0a05"/></radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="url(#ae-bg)"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="#d4af6e" stroke-width="1.4" opacity=".55"/>
      <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(212,175,110,.22)" stroke-width=".8" stroke-dasharray="2 4"/>
      <!-- 发髻 + 道簪 -->
      <circle cx="50" cy="30" r="10" fill="#2a2418"/>
      <line x1="34" y1="28" x2="66" y2="28" stroke="#8a6c3a" stroke-width="2" stroke-linecap="round"/>
      <!-- 鬓角 -->
      <path d="M36 46 Q34 34 42 30" stroke="#2a2418" fill="none" stroke-width="4" stroke-linecap="round"/>
      <path d="M64 46 Q66 34 58 30" stroke="#2a2418" fill="none" stroke-width="4" stroke-linecap="round"/>
      <!-- 脸 -->
      <ellipse cx="50" cy="54" rx="14" ry="15" fill="#d9a877"/>
      <!-- 闭眼 -->
      <path d="M43 52 Q45.5 54.5 48 52" stroke="#4a2a1a" fill="none" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M52 52 Q54.5 54.5 57 52" stroke="#4a2a1a" fill="none" stroke-width="1.3" stroke-linecap="round"/>
      <!-- 八字胡 -->
      <path d="M41 61 Q44 64 49 61.5" stroke="#2a2418" fill="none" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M59 61 Q56 64 51 61.5" stroke="#2a2418" fill="none" stroke-width="1.8" stroke-linecap="round"/>
      <!-- 道袍交领 -->
      <path d="M36 70 L50 62 L64 70 L58 82 L42 82 Z" fill="#3a2f1a"/>
      <path d="M50 62 L50 82" stroke="#8a6c3a" stroke-width="1" opacity=".5"/>
      <!-- 太极 -->
      <circle cx="71" cy="79" r="7" fill="none" stroke="#d4af6e" stroke-width="1"/>
      <path d="M71 72 A7 7 0 0 1 71 86 A3.5 3.5 0 0 1 71 79 A3.5 3.5 0 0 0 71 72Z" fill="#d4af6e" opacity=".8"/>
    </svg>`;

  function avatarSvg(system) {
    return personaOf(system).name === '月见' ? AVATAR_WEST : AVATAR_EAST;
  }

  /* ---------- 状态 ---------- */
  let state = { system: 'common', chart: null, opened: false };

  /* 命盘数据由页面在排盘后传入 */
  function setChart(data) {
    state.chart = data || null;
    // 写入占卜历史（个人中心「我的占卜」数据源）
    try {
      const rec = summarizeChart(data);
      if (rec) {
        const list = JSON.parse(localStorage.getItem('kixs_records') || '[]');
        list.unshift(rec);
        localStorage.setItem('kixs_records', JSON.stringify(list.slice(0, 30)));
        // 统计
        const today = new Date().toDateString();
        localStorage.setItem('kixs_today_' + today, String((parseInt(localStorage.getItem('kixs_today_' + today) || '0', 10)) + 1));
        const night = localStorage.getItem('kixs_night') || '0';
        if (ToneEngine && ToneEngine.isNight()) localStorage.setItem('kixs_night', String(parseInt(night, 10) + 1));
      }
    } catch(e) { /* localStorage 不可用时静默 */ }
  }

  /* 命盘摘要（供个人中心历史列表展示） */
  function summarizeChart(data) {
    if (!data) return null;
    const now = new Date();
    const time = now.getMonth() + 1 + '/' + now.getDate() + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const r = data.result, draws = data.draws, ch = data.chart;
    if (r && r.ben && r.ben.name) {
      return { name: '梅花 · ' + r.ben.name, time: time, sum: '体' + r.ti.name + '/' + r.yong.name + ' · ' + r.relation + '（' + r.level + '）' };
    }
    if (r && r.dayGanzhi) {
      return { name: '六壬 · ' + r.dayGanzhi, time: time, sum: '三传 ' + r.sanChuan.map(function(z){ return (global.LiuRenEngine && global.LiuRenEngine.ZHI[z]) || z; }).join('→') + ' · ' + r.keType };
    }
    if (r && r.benBits) {
      return { name: '六爻 · ' + r.ben.name, time: time, sum: r.movingCount ? r.movingCount + ' 动爻' : '六爻皆静' };
    }
    if (draws && draws.length) {
      return { name: '塔罗 · ' + draws.map(function(d){ return d.name; }).slice(0, 3).join('、'), time: time, sum: draws[draws.length - 1].position.name + ' 落 ' + draws[draws.length - 1].name };
    }
    if (ch && ch.planets) {
      const sun = ch.planets.find(function(p){ return p.key === 'sun'; });
      return { name: '星盘 · 太阳' + (sun ? sun.sign.name : ''), time: time, sum: '上升 ' + ch.asc.sign.name };
    }
    if (r && r.pillars) {
      return { name: '八字 · ' + r.pillars.map(function(p){ return p.gan + p.zhi; }).join(' '), time: time, sum: '日主 ' + r.dayMaster + r.dayMasterWu };
    }
    if (ch && ch.palaces) {
      return { name: '紫微 · 命宫' + (ch.palaces[0] ? ch.palaces[0].stars.join('、') : ''), time: time, sum: '演示盘' };
    }
    return null;
  }

  /* ---------- 意图/领域分析（统一版） ---------- */
  function analyzeArea(q) {
    const t = (q || '').replace(/\s/g, '');
    if (/感情|恋爱|婚姻|对象|伴侣|复合|分手|桃花|喜欢|暧昧|相亲/.test(t)) return 'love';
    if (/工作|事业|升职|跳槽|offer|面试|创业|公司|项目|辞职|职业/.test(t)) return 'career';
    if (/钱|财|投资|股票|基金|生意|收入|赚钱|借贷|买房|理财/.test(t)) return 'money';
    if (/考|学|试|成绩|升学|论文|毕业|考研/.test(t)) return 'study';
    if (/健康|身体|病|失眠|焦虑|抑郁|状态|情绪/.test(t)) return 'health';
    if (/去留|选择|要不要|该不该|决定|纠结|搬家|走不走|留不留/.test(t)) return 'decision';
    return 'general';
  }
  const AREA_NAME = { love: '感情', career: '事业', money: '财运', study: '学业', health: '身心', decision: '去留抉择', general: '当下' };

  /* ============================================================
     星盘话术表：金星落座、月亮落座、七宫/十宫/二宫行星、相位话术
     ============================================================ */
  const VENUS_SIGN_STYLE = {
    '白羊': '热烈直接，爱得用力——喜欢就先冲，藏不住。',
    '金牛': '务实深情，慢热但长——爱是要慢慢过的日子。',
    '双子': '要对话、要共鸣——精神契合比什么都重要。',
    '巨蟹': '爱是被照顾的日常——一碗热汤胜过千言万语。',
    '狮子': '要仪式感，要被捧着——爱得有场面才有光。',
    '处女': '细节里见真章——爱是心里默默记着的那些事。',
    '天秤': '爱要美、要平衡——被体面地对待才能放下戒备。',
    '天蝎': '爱要深、要绝对——要么全部，要么全不要。',
    '射手': '爱要自由、要冒险——爱和你想去的远方绑在一起。',
    '摩羯': '爱是行动派——说到做到，不说甜话但扛事。',
    '水瓶': '爱是平等、自由——别用世俗框住我们。',
    '双鱼': '爱是浪漫与共情——心软，最吃温柔那一套。'
  };
  const MOON_SIGN_STYLE = {
    '白羊': '情绪来得快去得也快——生气不过夜，哄一下就好。',
    '金牛': '需要稳定与安全感——饭搭子、钱袋子、窝在一起。',
    '双子': '心里话多，但藏不住也留不住——聊开就没事。',
    '巨蟹': '敏感、念旧——一句话能暖一天也能扎一天，要小心说话。',
    '狮子': '要面子式的安全感——被认可就满血复活。',
    '处女': '操心型——总在替对方想，累了自己也要被照顾。',
    '天秤': '怕冲突——情绪藏起来，等爆的时候已经积了很久。',
    '天蝎': '情绪深不见底——信就全给，疑就全收。',
    '射手': '心大——情绪来得快去得也快，最怕被管束。',
    '摩羯': '情绪不外露——压力都在心里扛，要主动给台阶。',
    '水瓶': '情绪要抽离处理——需要个人空间来消化。',
    '双鱼': '共情过载——容易把对方的情绪当自己的，需要被托底。'
  };
  const SEVENTH_PLANET_STYLE = {
    sun: '会像「被你照亮的人」——自我、温暖、想被你看见',
    moon: '会像「懂你情绪的人」——温柔、细腻、能接住你的脆弱',
    mercury: '会像「能跟你聊到停不下来的人」——聪明、爱沟通',
    venus: '会像「温柔浪漫的人」——体贴、爱美、有情调',
    mars: '会像「有冲劲、敢拼的人」——主动、直球、行动力强',
    jupiter: '会像「带你开阔视野的人」——乐观、大方、引你成长',
    saturn: '会像「成熟稳重、有责任感的人」——可靠、严肃、扛得住事',
    uranus: '会像「特立独行的人」——独立、不按常理、给关系带来变化',
    neptune: '会像「梦幻迷离的人」——温柔、艺术气质、关系里有点雾感',
    pluto: '会像「深沉、让你脱胎换骨的人」——浓烈、深刻、关系会改变你'
  };
  const CAREER_PLANET_STYLE = {
    sun: '太阳在十宫——你是天生的舞台中心，越显眼越出彩',
    moon: '月亮在十宫——靠「人」成功，公众形象要亲民',
    mercury: '水星在十宫——靠脑子吃饭，沟通与信息处理是你的武器',
    venus: '金星在十宫——靠审美与人缘，美、艺术、关系型事业',
    mars: '火星在十宫——靠冲劲，竞争与执行是主战场',
    jupiter: '木星在十宫——靠格局与扩展，越大越能撑得开',
    saturn: '土星在十宫——靠熬，稳扎稳打，长期回报型',
    uranus: '天王在十宫——靠破局，新赛道、新玩法是你的路',
    neptune: '海王在十宫——靠灵感，艺术、疗愈、影视是赛道',
    pluto: '冥王在十宫——靠深度，深水区的事你能扛'
  };
  const MONEY_PLANET_STYLE = {
    sun: '太阳通道——靠「个人品牌」赚钱，越有名越有财',
    moon: '月亮通道——靠「服务与人际」赚钱，照料别人是手艺',
    mercury: '水星通道——靠「信息差」赚钱，脑子转得快是核心',
    venus: '金星通道——靠「美与社交」赚钱，审美变现、人脉变现',
    mars: '火星通道——靠「执行力」赚钱，敢于竞争、敢于出手',
    jupiter: '木星通道——靠「扩展与运气」赚钱，越往外走越能接住',
    saturn: '土星通道——靠「长线与积累」赚钱，慢但稳',
    uranus: '天王通道——靠「创新」赚钱，新模式新平台的红利',
    neptune: '海王通道——靠「灵感」赚钱，艺术、创作、跨界是赛道',
    pluto: '冥王通道——靠「深耕」赚钱，深水区里有大钱'
  };
  /* 金星相位话术：[对方行星][相位][h=助力/t=拉扯] */
  const VENUS_ASPECT_STYLE = {
    sun: {
      '合': { h: '爱与自我合一——爱对方时也爱自己，关系里能保持自我。', t: '爱与自我拉扯——容易在关系里失去自己，以对方为中心。' },
      '六合': { h: '与自我融洽——关系里能保持自我表达，不压抑。', t: '自我表达在关系里被卡——想说"我想你"却说不出口。' },
      '拱': { h: '爱与自我互补——关系里能自由做自己，也给对方空间。', t: '爱与自我有摩擦——爱里要磨一磨性子，先放下"我"。' },
      '刑': { h: '激情驱动——爱里带着自我证明的张力，越爱越用力。', t: '自我与爱互相拉锯——为了爱丢面子、为面子伤爱。' },
      '冲': { h: '爱是对方吸引你的反差面——自带张力，越反越爱。', t: '爱与自我严重拉扯——喜欢的不一定是适合的，要看清。' }
    },
    moon: {
      '合': { h: '爱与情绪合一——亲密感来得自然，能被温柔对待。', t: '爱与情绪互相吞噬——爱哭是因为太上头，容易情绪化。' },
      '六合': { h: '爱与情绪协调——相处舒服，能彼此照料。', t: '情绪在爱里被压着——想说"需要你"却说不出口。' },
      '拱': { h: '爱与情绪自然流动——温柔又有爱。', t: '情绪在爱里有摩擦——容易莫名烦躁、冷战。' },
      '刑': { h: '爱里有情绪张力——激情与不安并存。', t: '情绪在爱里受虐——爱里带着不安全感和嫉妒。' },
      '冲': { h: '爱是对方补全你的情绪缺失——自带戏剧性。', t: '情绪与爱对立——爱一个人却忍不住推开。' }
    },
    mars: {
      '合': { h: '情欲与爱合一——亲密自然流动。', t: '欲望与爱搅在一起——占有欲强、易冲动。' },
      '六合': { h: '欲望与爱协调——相处有热度。', t: '欲望与爱有暗流——想靠近又有距离感。' },
      '拱': { h: '爱里有激情——相处有火花。', t: '激情有摩擦——爱里易怒、易争。' },
      '刑': { h: '爱里有欲望的张力——激烈而吸引。', t: '情欲与爱互相挑逗也互相伤害——争吵与和解循环。' },
      '冲': { h: '爱是对方激起你的对立面——化学反应强。', t: '爱与欲望对立——想要但不敢要。' }
    },
    saturn: {
      '合': { h: '爱带着责任感——奔着长久去的认真。', t: '爱被责任压着——想爱却被条件束缚。' },
      '六合': { h: '爱里有务实的搭子感——能一起过日子。', t: '爱与责任有摩擦——说"我没准备好"。' },
      '拱': { h: '爱里有稳定与长久的承诺——稳。', t: '爱里有冷静的距离——亲密感来得慢。' },
      '刑': { h: '爱里有磨砺——会一起扛过难关。', t: '爱里有压迫感——被审视、被考核。' },
      '冲': { h: '爱是被对方补全你"严肃"的那一面。', t: '爱与责任强烈对立——在一起很沉重。' }
    },
    jupiter: {
      '合': { h: '爱里带着运气——遇见对的人更容易。', t: '爱里有过度乐观——看不清对方的缺点。' },
      '六合': { h: '爱里带着成长与开阔。', t: '爱与好运有暗涌——给对方太多期望。' },
      '拱': { h: '爱与好运同行——关系里感到被祝福。', t: '爱与好运有摩擦——运气来了人也跑了。' },
      '刑': { h: '爱里有浮夸的戏剧性——爱得轰轰烈烈。', t: '爱里有过度——爱到忘我、忘形。' },
      '冲': { h: '爱是被对方打开你更大的世界。', t: '爱与好运对立——你以为是缘分其实是赌博。' }
    },
    mercury: {
      '合': { h: '爱与表达合一——甜话张口就来，沟通是甜的。', t: '爱里多说多错——话太多反而让对方躲。' },
      '六合': { h: '爱里能聊到一起去——沟通顺畅。', t: '爱里沟通有时差——你想的他不懂，他说的你没接住。' },
      '拱': { h: '爱里有精神共鸣——越聊越爱。', t: '爱里容易想多——把对方的话过度解读。' },
      '刑': { h: '爱里有话赶话的张力——吵完又聊。', t: '爱里话不投机——容易为表达的事起冲突。' },
      '冲': { h: '爱是对方补全你的思维方式——新鲜有趣。', t: '爱里话不投机——价值观打架，越聊越冷。' }
    },
    uranus: { '合': { h: '爱里有自由与惊喜——关系不无聊。', t: '爱里太飘——承诺不来。' }, '六合': { h: '爱里有自在。', t: '爱里有暗波。' }, '拱': { h: '爱里有创新。', t: '爱里有突变。' }, '刑': { h: '爱里带电。', t: '爱里有爆点——来得快走得也快。' }, '冲': { h: '爱是对方打开你的新世界。', t: '爱与自由对立——你想留他想跑。' } },
    neptune: { '合': { h: '爱里有梦幻——很浪漫。', t: '爱里有迷雾——看不清对方真实样子。' }, '六合': { h: '爱里有艺术气质。', t: '爱里有自欺。' }, '拱': { h: '爱里有灵性共鸣。', t: '爱里有逃避——躲进幻想不面对现实。' }, '刑': { h: '爱里有灵感。', t: '爱里有牺牲与依赖——容易失去自己。' }, '冲': { h: '爱是对方的梦幻。', t: '爱与现实脱节——再美也撑不住日常。' } },
    pluto: { '合': { h: '爱里有深度——越爱越深。', t: '爱里有控制与占有——逃不掉。' }, '六合': { h: '爱里有亲密。', t: '爱里有暗流。' }, '拱': { h: '爱里有转化——共同成长。', t: '爱里有压抑——情绪被吞。' }, '刑': { h: '爱里有冲突但能走出。', t: '爱里有纠缠——分不开也过不好。' }, '冲': { h: '爱是对方补全你的深度。', t: '爱里有权力斗争——互相较劲到心累。' } }
  };
  /* 月亮相位话术 */
  const MOON_ASPECT_STYLE = {
    sun: {
      '合': { h: '情绪与自我协调——知道自己要什么。', t: '情绪与自我打架——想要的与该做的常冲突。' },
      '六合': { h: '情绪与自我相处融洽。', t: '情绪表达被压抑。' },
      '拱': { h: '内在与外在自然——状态稳。', t: '内在与外在有时差——表里不一。' },
      '刑': { h: '内在有张力——情绪能驱动行动。', t: '内在拉扯——常在"该做"和"想做"间纠结。' },
      '冲': { h: '情绪是驱动力的另一面。', t: '情绪与自我对立——容易冲动后悔。' }
    },
    venus: {
      '合': { h: '情绪与爱合一——能享受当下的甜。', t: '情绪被爱裹挟——爱里情绪化。' },
      '六合': { h: '情绪与爱协调——温柔又体贴。', t: '情绪被爱压抑——想要亲密却装作不在意。' },
      '拱': { h: '情绪与爱自然流动。', t: '情绪与爱有摩擦——爱里莫名低落。' },
      '刑': { h: '情绪里有爱的张力——敏感而动人。', t: '情绪在爱里受伤——爱里带着不安全感和嫉妒。' },
      '冲': { h: '情绪是爱的一面镜子。', t: '情绪与爱对立——爱里反复无常。' }
    },
    mars: {
      '合': { h: '情绪有行动力——想到就做。', t: '情绪化行动——容易发火、容易后悔。' },
      '六合': { h: '情绪与行动协调——能高效做事。', t: '情绪压抑后突然爆发。' },
      '拱': { h: '情绪有方向——能动起来。', t: '情绪与行动有摩擦——心里想手不动。' },
      '刑': { h: '情绪有爆发力。', t: '情绪与行动互相激化——烦躁时更急躁。' },
      '冲': { h: '情绪能驱动行动。', t: '情绪与行动对立——越急越乱。' }
    },
    saturn: {
      '合': { h: '情绪有纪律——能扛事。', t: '情绪被压着——情感表达困难。' },
      '六合': { h: '情绪与责任协调。', t: '情绪表达被现实卡。' },
      '拱': { h: '情绪稳——不轻易波动。', t: '情绪有冷感——不容易被触动。' },
      '刑': { h: '情绪里有重量——能深入。', t: '情绪被管束——不被允许脆弱。' },
      '冲': { h: '情绪是责任的反面。', t: '情绪与责任对立——想哭时得撑着。' }
    },
    jupiter: {
      '合': { h: '情绪有运气托底——心宽。', t: '情绪被过度乐观掩盖。' },
      '六合': { h: '情绪乐观向上。', t: '情绪过度乐观——看不到暗面。' },
      '拱': { h: '情绪自然舒展——能走出低谷。', t: '情绪过度外放——容易麻痹。' },
      '刑': { h: '情绪有扩展力。', t: '情绪过度——喜怒都放大。' },
      '冲': { h: '情绪是运气的一面。', t: '情绪与好运对立——运气来时反而低落。' }
    },
    mercury: {
      '合': { h: '情绪能被命名——能说出来。', t: '情绪用话盖过——说出来反而感觉不到。' },
      '六合': { h: '情绪与表达协调。', t: '情绪表达有时差。' },
      '拱': { h: '情绪能被理解——沟通顺畅。', t: '情绪被话过度包装。' },
      '刑': { h: '情绪里有话的张力。', t: '情绪表达有摩擦——想说说不清。' },
      '冲': { h: '情绪是思维的另一面。', t: '情绪与思维对立——越想越烦。' }
    },
    uranus: { '合': { h: '情绪有突变的力量。', t: '情绪突变——莫名烦躁。' }, '六合': { h: '情绪与自由协调。', t: '情绪被压制后爆发。' }, '拱': { h: '情绪有创意出口。', t: '情绪与稳定有摩擦。' }, '刑': { h: '情绪里带电。', t: '情绪突跳——易冲动。' }, '冲': { h: '情绪是自由的面。', t: '情绪与自由对立——想被理解又受不了靠近。' } },
    neptune: { '合': { h: '情绪有梦幻——感受力强。', t: '情绪被迷雾盖——分不清现实。' }, '六合': { h: '情绪与灵感协调。', t: '情绪过度敏感。' }, '拱': { h: '情绪有艺术性。', t: '情绪容易逃避现实。' }, '刑': { h: '情绪有创造力。', t: '情绪易被害——边界感弱。' }, '冲': { h: '情绪是灵性的一面。', t: '情绪与现实对立——在梦里生活。' } },
    pluto: { '合': { h: '情绪有深度——能转化。', t: '情绪被吞——痛苦深埋。' }, '六合': { h: '情绪与深层连接。', t: '情绪被暗涌压制。' }, '拱': { h: '情绪能转化创伤。', t: '情绪与控制有摩擦。' }, '刑': { h: '情绪有爆发性深度。', t: '情绪与创伤纠缠——反复被触发。' }, '冲': { h: '情绪是力量的反面。', t: '情绪与权力对立——被控制或控制人。' } }
  };

  /* 爻位话术（梅花/六爻共用） */
  const YAO_POS = { 1: '初爻', 2: '二爻', 3: '三爻', 4: '四爻', 5: '五爻', 6: '上爻' };
  const YAO_DEEP = {
    1: '事情的根子上动了一下——起手的第一步，走得稳比走得快重要。',
    2: '中正之位，离「关键人物」不远——顺势而为，别端着。',
    3: '多忧之位，中途最容易生变——凡事三思，留个后手。',
    4: '进退之间——要看上面的脸色，也听下面的声音，莫轻动。',
    5: '君位之动——事情快见分晓了，这一下踩准，就能上桌。',
    6: '顶到头的动静——物极必反，见好就收，别贪最后一口。'
  };
  const YAO_LIUYAO = {
    0: '初爻发动——根基在动：起手的第一步，稳比快重要。',
    1: '二爻发动——中正之位发动：离关键人物不远，顺势而为。',
    2: '三爻发动——多忧之位发动：中途易生变，凡事留个后手。',
    3: '四爻发动——进退之位发动：看上面脸色、听下面声音，莫轻动。',
    4: '五爻发动——君位发动：事情近见分晓，把握时机。',
    5: '上爻发动——顶头之动：物极必反，见好就收。'
  };

  /* ============================================================
     命盘结合问答生成器：每体系一函数，接收 (q, chart, area)
     返回 { text, steps } —— 后台循环思考的产物
     ============================================================ */
  const CHART_ANSWERS = {
    /* 八字：日主 + 十神 + 身强弱 + 大运 + 流年（深度版） */
    bazi(q, c, area) {
      const r = c.r, dy = c.dy;
      if (!r) return null;
      const steps = [];
      steps.push(`调取命盘：日主 ${r.dayMaster}${r.dayMasterWu}，四柱 ${r.pillars.map((p) => p.gan + p.zhi).join(' ')}，五行 ${Object.entries(r.wuCount).map(([w, n]) => w + n).join(' ')}`);
      const st = (global.BaZiEngine && global.BaZiEngine.strength) ? global.BaZiEngine.strength(r.pillars) : null;
      const shenSet = {};
      r.pillars.forEach((p) => { if (global.BaZiEngine) { const s = global.BaZiEngine.shishen(r.dayMaster, p.gan); shenSet[s] = (shenSet[s] || 0) + 1; } });
      const core = [];
      const wuSorted = Object.entries(r.wuCount).sort((a, b) => b[1] - a[1]);
      const mostWu = wuSorted[0], leastWu = wuSorted[wuSorted.length - 1];

      /* 1) 日主与五行格局 */
      core.push(`日主${r.dayMaster}${r.dayMasterWu}，${st ? (st.strong ? '身旺——能扛事、敢担当，但忌固执，力量要用在刀刃上。' : '身弱——善借力、善结盟，你的剧本从来不是单打独斗。') : ''}`);
      core.push(`五行以${mostWu[0]}最旺（${mostWu[1]}处）、${leastWu[0]}最弱（${leastWu[1]}处）——${leastWu[0]}弱是你这辈子的「短板区」，也是补上之后最出彩的地方。`);

      /* 2) 十神布局 */
      const shenPresent = Object.keys(shenSet).filter((s) => shenSet[s] > 0);
      core.push(`十神现形：${shenPresent.length ? shenPresent.map((s) => s + '×' + shenSet[s]).join('、') : '（格局偏纯）'}——${shenTalk(shenPresent)}`);

      /* 3) 领域深入 */
      if (area === 'love') {
        const hasCai = shenSet['正财'] || shenSet['偏财'];
        const hasGuan = shenSet['正官'] || shenSet['七杀'];
        const hasShi = shenSet['食神'] || shenSet['伤官'];
        const hasYin = shenSet['正印'] || shenSet['偏印'];
        core.push(hasCai ? `财星现形——你与「关系里的踏实感」有缘，${hasGuan ? '官财并见，姻缘有自己的章法：先立业后成家或边立边成。' : '财星为主，感情里你重实际、重承诺，不喜欢空头支票。'}` : '财星不显——感情上你偏慢热认真，宁缺毋滥是标准不是毛病。');
        core.push(`日支（夫妻宫）落${r.pillars[2].zhi}——${['子', '午', '卯', '酉'].includes(r.pillars[2].zhi) ? '桃花星坐宫，感情里容易被「感觉」牵着走，要学着用理性给感性把关。' : '夫妻宫平稳，感情重在细水长流，急不来。'}`);
        if (hasShi) core.push(`食伤透出——你表达爱的方式是${shenSet['食神'] ? '温和的照顾' : '直接的付出'}，但食伤多了也容易口不择言，爱里话到嘴边留三分。`);
        if (hasYin) core.push('印星护身——感情里你其实是「被照顾型」，嘴上不说，心里很需要对方把你放在心上。');
        core.push(`放一句话：你的姻缘底色是${hasCai ? '财星牵引' : '平淡自持'} + ${hasGuan ? '官星定调' : '自由生长'}，${st && st.strong ? '身旺感情里容易「我全都要」，要学着给彼此空间。' : '身弱感情里容易「自我怀疑」，先信自己，才能信关系。'}`);
      } else if (area === 'career') {
        const hasGuan = shenSet['正官'] || shenSet['七杀'];
        const hasYin = shenSet['正印'] || shenSet['偏印'];
        const hasShi = shenSet['食神'] || shenSet['伤官'];
        const hasBi = shenSet['比肩'] || shenSet['劫财'];
        core.push(hasGuan ? `官星现形——你对「名分、位置、往上走」有天然的在意，事业线是有的：${st && st.strong ? '身旺官旺，适合带兵管人、扛指标，位置越高越旺你。' : '身弱官现，宜借平台与贵人，别单打独斗。'}` : '官星不显——你的事业更像「自己闯出来的」，靠手艺、靠口碑，不靠体制内的名分。');
        if (hasYin) core.push(`印星护身——你有贵人缘与学习力：${shenSet['正印'] ? '正印，适合体制内、大平台、师承制。' : '偏印，适合冷门赛道、偏才方向，越没人走的路越旺你。'}`);
        if (hasShi) core.push(`食伤生财——你的才华能变现：${shenSet['伤官'] ? '伤官，敢破敢立，适合创业、创作、走差异化。' : '食神，稳中求进，靠作品与口碑吃饭。'}`);
        if (hasBi) core.push(`比劫并见——职场里你讲义气、有人脉，但也要防${shenSet['劫财'] ? '劫财夺财：合伙容易破财，亲兄弟要明算账。' : '比肩争锋：同层级竞争多，要靠实力说话。'}`);
        if (dy && dy.yuns) {
          const curAge = 35;
          const cur = dy.yuns.find((u) => u.startAge <= curAge && u.startAge + 9 >= curAge) || dy.yuns[2];
          core.push(`大运走到${cur.gz}（${cur.wu}）运——${cur.wu === r.dayMasterWu ? '比和之运，稳扎稳打，按部就班最旺你。' : ['木','火','土','金','水'].includes(cur.wu) && (SHENG_TALK[cur.wu] && SHENG_TALK[cur.wu] === r.dayMasterWu) ? '生扶之运，贵人来助，可以大胆推进。' : '运势在换挡，宜守中带进，别太冒进。'}`);
        }
      } else if (area === 'money') {
        const hasCai = shenSet['正财'] || shenSet['偏财'];
        const hasShi = shenSet['食神'] || shenSet['伤官'];
        const hasBi = shenSet['比肩'] || shenSet['劫财'];
        core.push(hasCai ? `财星现形——与钱的缘分是有的：${shenSet['偏财'] ? '偏财，财路活、来得快，但也散得快，要会守。' : '正财，财路正、来得稳，靠正职与积累。'} ${st && st.strong ? '你身旺能担财，可以放开手脚求，忌的是贪多。' : '你身弱担财吃力，财来了要会守，别硬扛大风险。'}` : '财星不显——不是说没财运，是你这辈子的钱多半「从本事里来」：凭专业、凭积累，而不是凭投机。');
        if (hasShi) core.push(`食伤生财——你的赚钱路子是「靠本事变现」：${shenSet['食神'] ? '作品、手艺、口碑，越老越值钱。' : '创意、流量、风口，敢试就有钱。'}`);
        if (hasBi) core.push(`比劫重——防「为朋友两肋插刀」插的是自己的钱包：借钱要立字据，合伙要先小人后君子。`);
        core.push(`整体看，你的财是「${hasShi ? '才生财' : hasCai ? '财自现' : '身求财'}」格局——${st && st.strong ? '能扛大财，但大财要走正路。' : '财要借势，找对平台和人比闷头干重要。'}`);
      } else if (area === 'study') {
        const hasYin = shenSet['正印'] || shenSet['偏印'];
        const hasShi = shenSet['食神'] || shenSet['伤官'];
        core.push(hasYin ? `印星护学——你天生是「坐得住」的料：${shenSet['正印'] ? '正印，系统学习强，适合按部就班啃教材。' : '偏印，偏科型天才，感兴趣的领域学得飞快。'}` : '印星不显——你不是「死读书」的类型，靠理解力和实践学得更快。');
        if (hasShi) core.push(`食伤灵动——学习时你的脑子${shenSet['伤官'] ? '爱走捷径、爱钻牛角尖，适合突破难题但忌眼高手低。' : '稳而扎实，适合把知识讲给别人听，讲着讲着就透了。'}`);
        core.push(`考试运看${['正印', '偏印'].find((s) => shenSet[s]) ? '印星当值，复习越扎实越稳。' : '食伤当值，临场发挥型，考前放松比冲刺重要。'}`);
      } else if (area === 'health') {
        core.push(`五行里${leastWu[0]}最弱——对应身体${HEALTH_MAP[leastWu[0]]}。平时别硬扛，${leastWu[0]}对应的功课要补：作息、情绪、饮食都算。`);
        core.push(`日主${r.dayMaster}${r.dayMasterWu}，${st && st.strong ? '身旺火气易偏盛，注意别太拼、情绪别太冲。' : '身弱元气易不足，睡够、吃饱、别焦虑，是最实在的养生。'}`);
      } else {
        core.push(`日主${r.dayMaster}${r.dayMasterWu}是这张盘的「发动机」——${st && st.strong ? '身旺：你天生适合冲锋，但锋芒要收一点，给别人留路就是给自己留运。' : '身弱：你天生适合结盟，找对平台和贵人，事半功倍。'}`);
        core.push(`这一盘的气机是「${mostWu[0]}盛 ${leastWu[0]}衰」——${leastWu[0]}弱的领域，是你这辈子要补的课：补上了，就是你的后发优势。`);
      }

      /* 4) 大运联动 */
      if (dy && dy.yuns) {
        const cur = dy.yuns.find((u) => u.startAge <= 35 && u.startAge + 9 >= 35) || dy.yuns[2];
        core.push(`眼下走在 ${cur.gz}（${cur.wu}）运——${cur.wu === r.dayMasterWu ? '与日主同气，最近几年是「蓄力期」，做什么都顺一点。' : cur.wu === leastWu[0] ? '正补你的短板运——这块运里吃苦是学费，学到就是赚到。' : '换挡期，前一个运的惯性还在，新的势还没完全立起来，稳着走。'}`);
        core.push(`流年提示：${nextYunHint(r, dy, cur)}`);
      }

      core.push(`给你一句：${st && st.strong ? '身旺者，戒骄戒躁——力气大，方向比速度重要。' : '身弱者，戒馁戒疑——借力不丢人，站上巨人的肩也算本事。'}命理是参考，路是你走的。`);
      return { text: core.join('\n'), steps };

      /* 局部辅助 */
      function shenTalk(list) {
        const map = { '正官': '官星给你定规矩、给方向', '七杀': '杀星给你冲劲、给野心', '正财': '财星给你踏实、给安全感', '偏财': '财星给你活络、给机会', '正印': '印星给你靠山、给学习力', '偏印': '印星给你灵性、给偏才', '食神': '食伤给你才华、给表达', '伤官': '食伤给你锋芒、给创造', '比肩': '比劫给你朋友、给圈子', '劫财': '比劫给你义气、也给你破财风险' };
        return list.map((s) => map[s] || s).join('；');
      }
      function nextYunHint(r, dy, cur) {
        const nowYear = new Date().getFullYear();
        const gz = ((nowYear - 4) % 60 + 60) % 60;
        const g = global.BaZiEngine.GAN[gz % 10];
        const yearWu = global.BaZiEngine.GAN_WU[g];
        if (yearWu === r.dayMasterWu) return nowYear + '年与你同气，适合推进正事。';
        if (yearWu === leastWu[0]) return nowYear + '年在补短板，防小病小灾，作息别乱。';
        return nowYear + '年平稳过渡，宜修内功、攒口碑。';
      }
    },

    /* 塔罗：逐张解读 + 位置呼应 + 正逆比例 + 领域落点（深度版） */
    tarot(q, c, area) {
      const draws = c.draws;
      if (!draws || !draws.length) return null;
      const steps = [`调取牌面：本次抽到 ${draws.map((d) => d.name).join('、')}（${draws.filter((d) => d.reversed).length} 逆 ${draws.length - draws.filter((d) => d.reversed).length} 正）`];
      const core = [];
      const majorCount = draws.filter((d) => d.suit === 'major').length;

      /* 1) 位置总览 */
      core.push(`这是「${draws[0].position.name}」牌阵：${draws.map((d) => d.position.name).join(' → ')}——牌阵本身就是这段事的行进路线。`);

      /* 2) 逐张解读 */
      draws.forEach((d, i) => {
        const arrow = i === 0 ? '起点' : i === draws.length - 1 ? '落点' : '中段';
        const posLine = d.position.hint ? `（${d.position.hint}）` : '';
        core.push(`\n【${d.position.name} · ${arrow}】${posLine}\n你抽到「${d.name}」${d.reversed ? '（逆位）' : '（正位）'}。${d.image}${d.reversed ? d.core.r : d.core.u}`);
      });

      /* 3) 首末呼应 */
      const first = draws[0], last = draws[draws.length - 1];
      core.push(`\n首尾呼应：「${first.name}」起手，「${last.name}」收尾——${firstReLast(first, last)}`);

      /* 4) 大阿卡纳 */
      if (majorCount) {
        core.push(`局里有 ${majorCount} 张大阿卡纳——你问的这件事${majorCount >= 2 ? '不是小事，牵动的是人生层面不小的课题，值得认真对待。' : '有一个「命运级」的节点在里面，它出现的地方就是转机所在。'}`);
      } else {
        core.push('这局全是小阿卡纳——事情还在「日常层面」运转，没有天翻地覆的变化，但细节决定成败。');
      }

      /* 5) 正逆位比例 */
      const revCount = draws.filter((d) => d.reversed).length;
      core.push(revCount === 0 ? '牌面全正——能量外放，事情在「往前推」的轨道上，阻力不在天，在你自己动不动。' : revCount === draws.length ? '牌面全逆——能量内收，表面平静底下全是翻涌，先别急着行动，把心绪理清再说。' : `正逆并见（${revCount} 逆）——事情有明有暗：顺的牌给你底气，逆的牌提醒你哪一步别踩空。`);

      /* 6) 领域落点 */
      core.push(`\n落到${AREA_NAME[area]}这条线上：${areaTail(area, draws)}`);

      /* 7) 两步行动 */
      core.push(`\n给你的两步——第一步：${stepOne(area, last)}第二步：${stepTwo(area, draws)}`);

      /* 8) 收束 */
      core.push(`\n牌看的是势，路是你走的。今晚把牌合上，明天把第一步迈出去。`);
      return { text: core.join('\n'), steps };

      function firstReLast(f, l) {
        const fMajor = f.suit === 'major', lMajor = l.suit === 'major';
        if (fMajor && lMajor) return '两头都是大牌，这件事「开始就是重要的，结局也是重要的」，全程都要认真对待。';
        if (lMajor) return '开头是日常，收尾却落到大牌上——事情会在后半程「升级」，结局比开头重。';
        if (fMajor) return '大牌开局，收尾落回日常——轰轰烈烈开始，最后还是要回到过日子本身。';
        return '全程小牌——事情在常规轨道里推进，怎么经营比怎么赌重要。';
      }
      function areaTail(a, ds) {
        const names = ds.map((d) => d.name).join('、');
        if (a === 'love') return `感情里，${names}都在提醒你：先看清「自己这侧」——你的爱还在，但关系要不要继续，得看它能不能给你「踏实感」而不只是心动。`;
        if (a === 'career') return `事业上，${names}指向一个共同信号：这一步怎么走比走多快重要——别只看眼前得失，看三个月后的走向。`;
        if (a === 'money') return `钱财上，${names}在说：先求稳再求多——焦虑替你做决定，是最贵的决定。`;
        if (a === 'study') return `学业上，${names}在说：方法比天赋更能决定你能走多远——把目标切小，信心是攒出来的。`;
        if (a === 'health') return `身心上，${names}在说：身体已经给你信号了，慢下来，听它的话——睡眠和情绪是其他一切的地基。`;
        if (a === 'decision') return `去留之间，${names}在问：哪个选项，明天醒来你不会后悔？`;
        return `这局${names}——顺着牌面的提示，看看接下来一周会发生什么。`;
      }
      function stepOne(a, last) {
        if (a === 'love') return last.reversed ? '把憋着没说的话，选一个不忙的晚上好好说一次（逆位提醒你：话说一半等于没说）。' : '给这段关系留一次「不设防的相处」，不加评判地听对方说完。';
        if (a === 'career') return last.reversed ? '把手里「悬而未决」的事先收个尾，别带着半拉子进下一步。' : '挑一个能体现你长处的活，主动领下来——牌在推你往前走。';
        if (a === 'money') return last.reversed ? '这个月先列个支出清单，把「想花」和「该花」分开。' : '把一笔闲钱往「生钱的地方」挪一步，哪怕只是存定期。';
        if (a === 'study') return '今天先啃下最难的一节，不贪多——信心是攒出来的。';
        if (a === 'health') return '今晚十一点前放下手机，睡个整觉——身体会告诉你答案。';
        if (a === 'decision') return '把两个选项各写一张纸，睡一觉，明天凭「第一反应」选。';
        return '把牌面里最戳你的那张牌记下来，观察它接下来三天怎么出现在生活里。';
      }
      function stepTwo(a, ds) {
        if (a === 'love') return '给自己一个期限：这期间观察对方的「行动」而不是「承诺」，行动才是答案。';
        if (a === 'career') return '跟一个你信任的前辈聊一次你的处境，别人的视角能帮你避坑。';
        if (a === 'money') return '找一条「被动收入」的线——哪怕很慢，开始就是赢。';
        if (a === 'study') return '把今天学的讲给一个人听，讲得出来才算真会了。';
        if (a === 'health') return '挑一样你一直想做没做的放松方式，这周就去做。';
        if (a === 'decision') return '跟利益不相关的人各问一遍意见，然后自己做决定——选项没有对错，选择才有代价。';
        return '本周五前，把牌面提示的那件事往前推一步。';
      }
    },

    /* 星盘：全相位遍历（行星落座落宫 + 盘内主要相位） */
    astrology(q, c, area) {
      const ch = c.chart;
      if (!ch) return null;
      const A = window.AstrologyEngine;
      if (!A) return null;
      const aspects = A.aspects(ch.planets);
      const sun = ch.planets.find((p) => p.key === 'sun');
      const moon = ch.planets.find((p) => p.key === 'moon');
      const ascSign = ch.asc.sign;
      const PLANET_CN = { sun: '太阳', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星', saturn: '土星', uranus: '天王', neptune: '海王', pluto: '冥王' };
      const aspsOf = (k) => aspects.filter((a) => a.ka === k || a.kb === k);
      const isHarm = (t) => ['吉', '顺', '强'].includes(t);
      const steps = [`调取星盘：太阳${sun.sign.name}·月亮${moon.sign.name}·上升${ascSign.name}，${ch.planets.length} 星排定，盘内主要张力 ${aspects.length} 条已筛出`];
      const core = [];
      if (area === 'love') {
        const venus = ch.planets.find((p) => p.key === 'venus');
        const seventh = ch.planets.filter((p) => p.house === 7);
        core.push(`金星落${venus.sign.name}（${venus.house}宫）——你「爱的方式」是${venus.sign.name}式的：${VENUS_SIGN_STYLE[venus.sign.name]}`);
        core.push(`月亮落${moon.sign.name}（${moon.house}宫）——你「情绪的安全感」来自${moon.sign.name}的调子：${MOON_SIGN_STYLE[moon.sign.name]}`);
        core.push(seventh.length
          ? `七宫（伴侣宫）有 ${seventh.map((p) => p.name).join('、')}——对方会以这些星曜的特质出现：${seventh.map((p) => SEVENTH_PLANET_STYLE[p.key] || p.name + '能量').join('；')}。`
          : `七宫空置，伴侣的样貌更多由金星与月亮共同描摹——别去找"对的人"，先看清你想要什么样的关系。`);
        const va = aspsOf('venus').slice(0, 4);
        if (va.length) {
          core.push('金星涉及的相位（你的爱如何被外力牵动）：');
          va.forEach((a) => {
            const otherKey = a.ka === 'venus' ? a.kb : a.ka;
            const otherCN = PLANET_CN[otherKey];
            const h = isHarm(a.tone);
            const phrase = (VENUS_ASPECT_STYLE[otherKey] && VENUS_ASPECT_STYLE[otherKey][a.type] && VENUS_ASPECT_STYLE[otherKey][a.type][h ? 'h' : 't']) || '一处尚未被充分诠释的关系节点。';
            core.push(`  · 金星${a.type}${otherCN}（${a.orb}°）——${h ? '助力位：' : '拉扯位：'}${phrase}`);
          });
        }
        const ma = aspsOf('moon').slice(0, 3);
        if (ma.length) {
          core.push('月亮涉及的相位（你的情绪底色如何被牵动）：');
          ma.forEach((a) => {
            const otherKey = a.ka === 'moon' ? a.kb : a.ka;
            const otherCN = PLANET_CN[otherKey];
            const h = isHarm(a.tone);
            const phrase = (MOON_ASPECT_STYLE[otherKey] && MOON_ASPECT_STYLE[otherKey][a.type] && MOON_ASPECT_STYLE[otherKey][a.type][h ? 'h' : 't']) || '一段需要被照料的内在感受。';
            core.push(`  · 月亮${a.type}${otherCN}（${a.orb}°）——${h ? '情绪有托底：' : '情绪有压力：'}${phrase}`);
          });
        }
        const vm = aspects.find((a) => (a.ka === 'venus' && a.kb === 'mars') || (a.ka === 'mars' && a.kb === 'venus'));
        if (vm) core.push(`金星与火星成「${vm.type}」——${isHarm(vm.tone) ? '情欲自然流动，亲密感来得顺，身体层面彼此愿意靠近。' : '冲动与占有并存，要学会刹车——爱里带着火，不学会控制就容易烧到自己。'}`);
        else core.push('金星与火星之间没有直接相位——激情靠日常经营，不会一上来就天雷地火。');
        const sm = aspects.find((a) => (a.ka === 'sun' && a.kb === 'moon') || (a.ka === 'moon' && a.kb === 'sun'));
        if (sm) core.push(`日月${sm.type}（${sm.orb}°）——${isHarm(sm.tone) ? '内在自我与情绪协调，在关系里能「做自己」而不被淹没。' : '内在自我与情绪有拉扯——爱里常出现「我到底是谁」的迷茫，会在亲密关系里无意识地伪装。'}`);
        const sa = aspsOf('saturn').slice(0, 2);
        if (sa.length) core.push(`盘里有土星的身影（${sa.map((a) => a.a + a.type + a.b).join('、')}）——感情自带重量：要么是奔着长久去的认真，要么是被现实约束着。它让爱沉，也让它重。`);
        else core.push('盘里没有土星相位——相处轻快，但长久的承诺需要你主动去谈，别等它自己长出来。');
        const ja = aspsOf('jupiter').slice(0, 1);
        if (ja.length) {
          const h = isHarm(ja[0].tone);
          core.push(`木星走过（${ja[0].a + ja[0].type + ja[0].b}）——${h ? '给感情带来运气与扩展，遇见对的人更容易、有贵人推一把。' : '扩张过度会失真——别把一时好感当缘分。'}`);
        }
        const saturnTone = sa.length ? (sa.some((a) => ['紧', '张'].includes(a.tone)) ? '有重量、有牵绊' : '有承诺的影子') : '轻快、无重压';
        core.push(`综合下来——你的感情底色是${venus.sign.name}金星（${venus.house}宫）+ ${moon.sign.name}月亮（${moon.house}宫），${seventh.length ? '七宫' + seventh[0].name + '坐镇' : '七宫空置，由金星与月亮描摹'}，${saturnTone}。复合这件事：你的爱还在金星与月亮的调子里，但要不要继续，要听土星说话——它会告诉你这段关系到底是「可以长久」还是「值得放手」。`);
      } else if (area === 'career') {
        const mcSign = ch.mc.sign;
        const tenth = ch.planets.filter((p) => p.house === 10);
        core.push(`中天（MC）落${mcSign.name}——你「登上的舞台」是${mcSign.name}的调性：${mcSign.element === '火' ? '要冲、要拼、要在台前。' : mcSign.element === '土' ? '要稳、要积累、要走长线。' : mcSign.element === '风' ? '要人脉、要沟通、要会来事。' : '要感知、要审美、要顺着直觉走。'}`);
        core.push(tenth.length
          ? `十宫里有 ${tenth.map((p) => p.name).join('、')}——事业不是空舞台：${tenth.map((p) => CAREER_PLANET_STYLE[p.key] || p.name + '发力').join('；')}。`
          : `十宫空置，事业的方向要靠「落座」而非落星来定——先把${mcSign.name}的功课做扎实，舞台会自己搭起来。`);
        const smc = aspects.find((a) => (a.ka === 'saturn' && a.kb === 'mc') || (a.kb === 'saturn' && a.ka === 'mc'));
        if (smc) core.push(`土星与中天有相位（${smc.a + smc.type + smc.b}，${smc.orb}°）——${isHarm(smc.tone) ? '事业上有"熬出来"的承诺，慢慢稳。' : '事业上有现实的硬约束——升职或项目推进会反复磨人，但磨过的都算数。'}`);
        const jmc = aspects.find((a) => (a.ka === 'jupiter' && a.kb === 'mc') || (a.kb === 'jupiter' && a.ka === 'mc'));
        if (jmc) core.push(`木星与中天有相位（${jmc.a + jmc.type + jmc.b}）——${isHarm(jmc.tone) ? '事业上有运气与扩展，适合走出去、争取更广的舞台。' : '过度乐观可能踩坑——先把"我以为"放一放。'}`);
        const sunT = aspects.find((a) => a.ka === 'sun' && (a.kb === 'saturn' || a.kb === 'jupiter' || a.kb === 'mars'));
        if (sunT) core.push(`太阳与${PLANET_CN[sunT.kb]}${sunT.type}（${sunT.orb}°）——${isHarm(sunT.tone) ? '事业上的自我驱动力有托底。' : '事业上的自我与外力有冲突——先把方向定清楚，再用力。'}`);
        core.push(`综合——你的事业节奏是${mcSign.name}中天 + ${tenth.length ? tenth[0].name + '发力' : '靠落座驱动'}，${smc ? '土星提醒你耐心，' : '土星不在主线上，自由度高，'}${jmc ? '木星提醒你争取。' : '木星能量偏内敛，靠实力说话。'}`);
      } else if (area === 'money') {
        const jup = ch.planets.find((p) => p.key === 'jupiter');
        const second = ch.planets.filter((p) => p.house === 2);
        const eighth = ch.planets.filter((p) => p.house === 8);
        core.push(`二宫（财帛）${second.length ? `有 ${second.map((p) => p.name).join('、')}——钱从这些行星代表的领域进来：${second.map((p) => MONEY_PLANET_STYLE[p.key] || p.name + '通道').join('；')}。` : '空置——你的钱多靠「本事」而非「运势」积累。'}`);
        if (eighth.length) core.push(`八宫（有他人资源的宫）有 ${eighth.map((p) => p.name).join('、')}——通过合作、投资或另一半的钱进来是有可能的。`);
        core.push(`木星${jup.sign.name}（${jup.house}宫）——你「运气最旺」的领域在第 ${jup.house} 宫：${['自我', '钱财', '沟通', '家庭', '恋爱', '工作', '伴侣', '深层', '远行', '事业', '社交', '隐秘'][jup.house - 1]}。`);
        const jv = aspects.find((a) => (a.ka === 'jupiter' && a.kb === 'venus') || (a.kb === 'jupiter' && a.ka === 'venus'));
        if (jv) core.push(`木星与金星${jv.type}（${jv.orb}°）——${isHarm(jv.tone) ? '钱与人缘一起来，做喜欢的事更容易变现。' : '扩张过度会破财——别为冲动买单。'}`);
        const js = aspects.find((a) => (a.ka === 'jupiter' && a.kb === 'saturn') || (a.kb === 'jupiter' && a.ka === 'saturn'));
        if (js) core.push(`木星与土星${js.type}（${js.orb}°）——${isHarm(js.tone) ? '扩张与节制并存，能守住也敢出手。' : '钱的事被现实卡住，要么出手时机不对，要么押注太重。'}`);
        core.push(`综合——你的财路是${second.length ? second[0].name + '通道' : '本事变现'}，木星在第 ${jup.house} 宫发力，${jv ? (isHarm(jv.tone) ? '金木和谐，钱与人缘兼得。' : '金木有拉扯，要分清"想花"和"该花"。') : '金星未与木星直接相位，钱财走得更稳但慢。'}`);
      } else {
        core.push(`太阳落${sun.sign.name}（${sun.house}宫）驱动你向外成就，月亮落${moon.sign.name}（${moon.house}宫）牵引你向内安顿——你的人生主轴就在这两颗星之间。`);
        core.push(`上升${ascSign.name}是你给人的第一印象：${ascSign.element === '火' ? '自带气场，藏不住。' : ascSign.element === '土' ? '沉稳可靠，慢热。' : ascSign.element === '风' ? '灵活健谈，好相处。' : '柔和神秘，有距离感。'}`);
        const sm = aspects.find((a) => (a.ka === 'sun' && a.kb === 'moon') || (a.ka === 'moon' && a.kb === 'sun'));
        if (sm) core.push(`日月${sm.type}（${sm.orb}°）——${isHarm(sm.tone) ? '内外协调，自我与情绪不打架，做决定不会太纠结。' : '内外拉扯——常在"该做的事"和"想做的事"之间翻来覆去。'}`);
        const saturnAsp = aspsOf('saturn').slice(0, 1);
        if (saturnAsp.length) core.push(`盘里有土星走过（${saturnAsp[0].a + saturnAsp[0].type + saturnAsp[0].b}）——人生有"课题"感：该慢的事别急、该扛的事别躲，熬过的都算数。`);
        const jupAsp = aspsOf('jupiter').slice(0, 1);
        if (jupAsp.length) core.push(`木星走过（${jupAsp[0].a + jupAsp[0].type + jupAsp[0].b}）——人生有"运气窗口"：${isHarm(jupAsp[0].tone) ? '敢试敢闯，回报来得自然。' : '扩张要看准——别把运气当实力。'}`);
      }
      return { text: core.join('\n'), steps };
    },

    /* 梅花：本互变 + 体用 + 动爻 + 领域（深度版） */
    meihua(q, c, area) {
      const r = c.result;
      if (!r) return null;
      const steps = [`调取卦象：${r.numbers.join('、')} 起卦，本卦${r.ben.name} → 互卦${r.hu.name} → 变卦${r.bian.name}，体${r.ti.name}${r.tiEl} / 用${r.yong.name}${r.yongEl}，${r.relation}`];
      const core = [];

      /* 1) 本卦（底色） */
      core.push(`本卦「${r.ben.name}」——${r.ben.brief}。这是这件事的底色，开局写的是这个调子。`);

      /* 2) 互卦（过程暗流） */
      core.push(`中间压着个互卦「${r.hu.name}」——它不显眼，却是过程里的暗流与人心：成事往往卡在这一层，看不见的阻力比看得见的更难缠。`);

      /* 3) 变卦（终局） */
      core.push(`动到第 ${r.moving} 爻，变出「${r.bian.name}」——这是收尾的方向：${r.bian.brief}。别被眼前的坎吓住，气在往新处转。`);

      /* 4) 体用生克深入 */
      core.push(`再看体用：体卦${r.ti.name}（属${r.tiEl}）是你自己，用卦${r.yong.name}（属${r.yongEl}）是外缘与对方。${r.relation}——${r.verdict}`);
      core.push(`${relationDeep(r)}`);

      /* 5) 动爻位置细分 */
      core.push(`这一动落在第 ${r.moving} 爻（${YAO_POS[r.moving]}）——${YAO_DEEP[r.moving]}`);

      /* 6) 领域落点深入 */
      core.push(`\n落到${AREA_NAME[area]}这条线上：${areaDeep(area, r)}`);

      /* 7) 时间尺度 */
      core.push(`关于节奏——${r.moving <= 2 ? '动在下卦，事偏「近」：几天到一个月内会有眉目。' : r.moving <= 4 ? '动在中段，事在「进行中」：一两个月见分晓，中间有反复。' : '动在上卦，事偏「远」：三个月起步，急不来，要看长线。'}`);

      /* 8) 收束 */
      core.push(`卦上给你的是一句话：${levelLine(r.level)}`);
      return { text: core.join('\n'), steps };

      function relationDeep(r) {
        if (r.relation === '比和') return '体用比和——你与这件事「同频」，内外一致，最难的部分已经过去了。';
        if (r.relation === '用生体') return '用生体——外缘在帮你：有贵人、有机会主动找上门，接住就好。';
        if (r.relation === '体生用') return '体生用——你在「付出、耗泄」：事情要你往里搭力气，但舍而有得，别怕累。';
        if (r.relation === '体克用') return '体克用——你能驾驭局面：主动权在你手里，只是要费些周章，事可成而身稍劳。';
        return '用克体——外缘在制你：阻力不小，此时宜守不宜攻，先避锋芒，等势转了再动。';
      }
      function areaDeep(a, r) {
        const level = r.level;
        if (a === 'love') return `${r.relation}的格局落到感情：${level === '吉' ? '这段关系的气是通的，可以往前推，但别在顺风时松了缰绳。' : level === '凶' ? '这段关系此刻是「用克体」的姿势——不是谁对谁错，是节奏不对：先把自己这一侧理顺，再谈对方。' : '关系里有付出也有回应，慢一点稳一点，比急着要结果强。'}`;
        if (a === 'career') return `${r.relation}落到事业：${level === '吉' ? '机会是实打实的，接得住就往上走——但越顺越要留神，别在得意处松劲。' : level === '凶' ? '现在的局势对你不利，不是硬刚的时候——先守住基本盘，把本钱留住。' : '职场里体是你的本事与位置，用是局势与机会——先安顿好自己这一侧。'}`;
        if (a === 'money') return `${r.relation}落到钱财：${level === '吉' ? '财运在走顺风，可以出手，但出手要留三分余量。' : level === '凶' ? '钱的事忌心浮——现在动钱容易破，先守，等卦气转过来。' : '体足则财自来，体虚则财亦散——先把自己的基本盘做扎实。'}`;
        if (a === 'study') return `${r.relation}落到学业：${level === '吉' ? '学习的气是通的，趁势多啃几章，效率会比平时高。' : level === '凶' ? '这段时间学得进去但记不住——是心不静，先调状态再谈进度。' : '考试与功课，体是平日积累，用是临场发挥——积累厚了，临场自然稳。'}`;
        if (a === 'health') return `${r.relation}落到身心：${level === '凶' ? '卦象在提醒你：身体已经发出信号了——睡眠、情绪，先于一切。' : '体即是你的根本——作息不乱，情绪不堵，就是最好的养生。'}`;
        if (a === 'decision') return `${r.relation}落到去留：${level === '凶' ? '此刻不是做决定的好时机——卦在劝你缓一缓，等势转了再定。' : '自己「体」那一侧站得稳，往哪走都不算错。'}`;
        return `${r.relation}落到你当下——先稳住自己这一卦的「体」，再应对外面那个「用」。`;
      }
      function levelLine(l) {
        if (l === '吉') return '气象通畅，可谋可进——但越顺越要留神，别在得意处松了缰绳。';
        if (l === '中吉') return '可行，但得亲力亲为——别指望天上掉馅饼，你的手就是那张网。';
        if (l === '中') return '先难后易，付出终有回响——熬过这一段，气就顺了。';
        return '阻力在前，宜守不宜攻——不是认输，是等风转向。避锋不是怂，是聪明。';
      }
    },

    /* 六爻：用神 + 动爻逐个 + 本变卦 + 领域（深度版） */
    liuyao(q, c, area) {
      const r = c.result;
      if (!r) return null;
      const steps = [`调取卦象：本卦${r.ben.name}${r.bian ? '，变卦' + r.bian.name : '（六爻皆静）'}，动爻 ${r.movingCount} 处`];
      const ys = (global.LiuyaoEngine && global.LiuyaoEngine.selectYongshen) ? global.LiuyaoEngine.selectYongshen(q) : { name: '用神', what: '所问' };
      const core = [];

      /* 1) 用神 */
      core.push(`这一问，卦上以「${ys.name}」为用神（${ys.what}）——盯住它，就是盯住你这事的命门。`);

      /* 2) 本卦 */
      core.push(`本卦「${r.ben.name}」——${r.ben.brief}。这是你这件事的底色。`);

      /* 3) 动爻逐个解读 */
      if (r.movingCount) {
        core.push(`卦里有 ${r.movingCount} 个动爻——${r.movingCount >= 2 ? '事有反复之象：好事防中途变卦，坏事也有松动之机。' : '一爻独发，成败的关键就在这独动的一爻。'}`);
        if (r.yao && r.yao.length) {
          r.yao.forEach((y, i) => {
            if (y.moving) core.push(`  · 第 ${i + 1} 爻（${['初', '二', '三', '四', '五', '上'][i]}爻）发动——${YAO_LIUYAO[i]}`);
          });
        }
      } else {
        core.push('六爻皆静——事态平稳，不是没机会，是机会还没到点火的时候：现在按兵不动，反而是最稳的走法。');
      }

      /* 4) 变卦 */
      if (r.bian) core.push(`动爻之变，落出「${r.bian.name}」——${r.bian.brief}。这是事情转向的方向：${movingFlow(r.movingCount)}`);

      /* 5) 阴阳爻结构 */
      const yang = r.benBits.filter((b) => b === 1).length;
      core.push(`卦象${yang >= 4 ? '阳盛——整体气场偏「主动」，事情要靠你去推。' : yang <= 2 ? '阴盛——气场偏「收敛」，顺势而为比强求更顺。' : '阴阳均衡——外因与内因各占一半，谋事在人。'}`);

      /* 6) 领域落点 */
      core.push(`\n落到${AREA_NAME[area]}这条线上：${areaDeep(area, r)}`);

      /* 7) 收束 */
      core.push(`\n给你的建议：${advice(area, r)}`);
      core.push('卦随心动，机随时移。看清此局，下一步由你落子。');
      return { text: core.join('\n'), steps };

      function movingFlow(n) {
        if (n === 0) return '无动爻，事态在既定轨道里走，急不得。';
        if (n === 1) return '一爻独动，转机就在这一处——盯住它，别错过。';
        return '多爻发动，事态多线并行——梳理优先级，一次抓一件事。';
      }
      function areaDeep(a, r) {
        const moving = r.movingCount;
        if (a === 'love') return `感情的事，${moving ? '卦在动——这段关系有变量：动爻之处就是变数所在，可能是机会也可能是转折点，观察比表态重要。' : '卦是静的——感情处在「僵持/平稳」期，谁先迈步谁掌握主动权。'} ${r.ben.brief.includes('吉') ? '底色偏吉，关系有回暖的基础。' : '底色有滞涩，先修自己，别急着修关系。'}`;
        if (a === 'career') return `职业的事，${moving ? '卦动有变——工作上有动向：可能有机会也可能有变动，做好准备，机会来的时候别端着。' : '卦静宜守——目前不是大动的时机，要么踏实做，要么备好了再挪。'}`;
        if (a === 'money') return `钱财的事，${moving ? '动则生变——近期财务有进出：顺的动是机会，逆的动是提醒，见好就收。' : '静卦守基本盘——目前不适合大动作，存钱比花钱重要。'}`;
        if (a === 'study') return `学业的事，${moving ? '卦动主「变化」——成绩或状态近期有起伏，动爻之处就是要下功夫的地方。' : '静卦主「积累」——现在学的每一点都在攒，别因为没立刻见效就怀疑。'}`;
        if (a === 'health') return `身心的事，${moving ? '卦有动象——身体或情绪近期有波动，别硬扛，该休息就休息。' : '卦静主稳——整体状态平稳，规律作息就是最好的保养。'}`;
        if (a === 'decision') return `去留之间，${moving ? '卦在动——这件事不会一直悬着，动爻之处会给你信号，注意观察。' : '卦静——现在做决定还为时过早，信息还不够，再等等。'}`;
        return `先顺着卦的势走：${moving ? '势在动就动，顺势而为。' : '势在静就等，养精蓄锐。'}`;
      }
      function advice(a, r) {
        if (a === 'love') return r.movingCount ? '把「观察期」明确下来：看行动，不看承诺——行动是卦象给的答案。' : '主动创造一次「好好说话」的机会，静卦更需要你先破冰。';
        if (a === 'career') return r.movingCount ? '动爻处有机遇也有风险：机会来了先问「我接得住吗」，别只看「看起来多好」。' : '把手里的事做精，静卦的积累会在某天集中兑现。';
        if (a === 'money') return r.movingCount ? '近期动钱要留三分余量，不把宝押在一处。' : '本月先守住预算，把「想要」和「需要」分开。';
        if (a === 'study') return '把动爻对应的那一科（或那一个难点）当作突破口，先啃硬骨头。';
        if (a === 'health') return '近期给自己排一次「强制休息」，别等身体抗议才停下。';
        if (a === 'decision') return '把选择的「代价」写下来——不能承受的那个，就是答案。';
        return '本周把卦里最扎眼的那一爻对应的事，往前推一步。';
      }
    },

    /* 大六壬：四课三传 + 神将 + 六亲 + 领域（深度版） */
    liuren(q, c, area) {
      const r = c.result;
      if (!r) return null;
      const ZHI = global.LiuRenEngine ? global.LiuRenEngine.ZHI : [];
      const steps = [`调取课象：${r.dayGanzhi}日，月将${r.yueJiang}加${r.shiZhi}时，${r.keType}发用，三传${r.sanChuan.map((z) => ZHI[z]).join('→')}`];
      const core = [];
      const JIANG_GOOD = ['贵人', '六合', '青龙', '天后', '太常'];
      const JIANG_BAD = ['白虎', '玄武', '勾陈', '天空', '螣蛇'];

      /* 1) 课体 */
      core.push(`${r.keType}发用——${keTypeTalk(r.keType)}`);

      /* 2) 四课 */
      core.push(`四课立象：${r.siKe.map((z) => ZHI[z]).join(' / ')}——天盘与地盘在此交错，这是事情「此刻的截面」。`);

      /* 3) 三传逐个（初-中-末） */
      const sanJiang = r.sanChuan.map((z) => r.tianJiang[z] || '');
      core.push('三传是事情的「行进路线」：');
      sanJiang.forEach((jiang, i) => {
        const pos = i === 0 ? '初传' : i === 1 ? '中传' : '末传';
        const qin = r.sanQin[i] || '';
        core.push(`  · ${pos}落${ZHI[r.sanChuan[i]]}，上临${jiang}（${qin}）——${jiangTalk(jiang, pos, qin)}`);
      });

      /* 4) 三传走势判断 */
      core.push(`\n三传整体：${flowTalk(r)}`);

      /* 5) 昼夜贵人 */
      core.push(`${r.dayOrNight === 'day' ? '日占' : '夜占'}，贵人临${ZHI[r.guiRenZhi]}——${r.dayOrNight === 'day' ? '白昼占课，事在明处，宜正面推进。' : '夜占之课，事有暗处，宜谨慎低调。'}`);

      /* 6) 领域落点 */
      core.push(`\n落到${AREA_NAME[area]}这条线上：${areaDeep(area, r, ZHI, sanJiang)}`);

      /* 7) 收束 */
      core.push(`\n给你的落点：${advice(area, r)}`);
      return { text: core.join('\n'), steps };

      function keTypeTalk(k) {
        if (k === '贼克') return '贼克发用——事情「有主有次」：先出手的那一方占先机，你的策略要跟对节奏。';
        if (k === '比用') return '比用发用——事情「讲关系」：同气者相求，站队比蛮干重要。';
        if (k === '遥克') return '遥克发用——事情「隔空发力」：对手或机会在远处，鞭长莫及，先蓄势。';
        return '九宗之课——事情有法度可依，按规矩来比耍小聪明更稳。';
      }
      function jiangTalk(j, pos, qin) {
        if (JIANG_GOOD.includes(j)) return pos === '初传' ? '吉将当头，开头有气象，得助之象。' : pos === '中传' ? '中段有贵人接力，过程比开头顺。' : '吉将收尾，结局偏圆满。';
        if (JIANG_BAD.includes(j)) return pos === '初传' ? '凶将临初传，开头不顺是常态——它是来提醒你慢下来看路的。' : pos === '中传' ? '中段有阻力，防小人、防波折。' : '末传有凶将，结尾要防「差一口气」——见好就收。';
        return pos === '初传' ? '平将开头，不急不缓，按部就班。' : pos === '中传' ? '平将中段，稳步推进。' : '平将收尾，平稳落地。';
      }
      function flowTalk(r) {
        const q = r.sanQin;
        if (q[0] === q[1] && q[1] === q[2]) return `三传六亲同气（${q[0]}）——事情从头到尾是同一种性质在主导，${q[0] === '妻财' ? '财是主旋律，但同气也防「一条道走到黑」。' : q[0] === '官鬼' ? '责任贯穿全程，扛得住就是你的局。' : '性质单一，专注反而好办。'}`;
        if (q[0] !== q[2]) return `六亲在变：初${q[0]} → 末${q[2]}——事情从「${qinCN(q[0])}」走向「${qinCN(q[2])}」，${q[2] === '子孙' ? '最后靠才华与表达收尾。' : q[2] === '妻财' ? '最后落到利益上。' : q[2] === '官鬼' ? '最后要面对名分与责任。' : q[2] === '父母' ? '最后靠文书、长辈、旧经验撑场。' : '最后讲合伙与竞争。'}`;
        return '六亲有动——事情的性质在中途会转，注意观察转折点。';
      }
      function qinCN(q) {
        return { '子孙': '才华表达', '妻财': '利益资源', '官鬼': '名分责任', '父母': '文书旧经验', '比肩': '合伙竞争' }[q] || q;
      }
      function areaDeep(a, r, ZHI, sanJiang) {
        const chuJ = sanJiang[0];
        if (a === 'love') return `感情，初传临${chuJ}——${JIANG_GOOD.includes(chuJ) ? '开局有吉象，关系有回暖的基础，但末传' + sanJiang[2] + '提醒你别急着一锤定音。' : JIANG_BAD.includes(chuJ) ? '开局不顺——现在的僵不是终点，是节奏问题：先把自己理顺。' : '不吉不凶，感情在按部就班地走，急不来。'} ${r.sanQin[0] === '妻财' ? '财星在感情里露头，这份关系牵扯着「现实考量」。' : r.sanQin[0] === '官鬼' ? '官鬼在感情里露头，这份关系绕不开「名分与责任」。' : ''}`;
        if (a === 'career') return `事业，初传${chuJ}，${r.sanQin[0] === '官鬼' ? '官鬼当头——职位与名分是题眼，先看初传那一势：' + (JIANG_GOOD.includes(chuJ) ? '有领导赏识之象。' : '压力当头，先把活干漂亮。') : r.sanQin[0] === '父母' ? '父母当头——文书、平台、长辈在为你撑场，适合求稳。' : r.sanQin[0] === '子孙' ? '子孙当头——靠才华与表达打开局面，适合创新。' : '比肩当头——职场竞争或合伙，找对人一起扛。'}`;
        if (a === 'money') return `财运，${r.sanQin[0] === '妻财' ? '妻财当头——财路有门，但' + (JIANG_BAD.includes(chuJ) ? '凶将临财，财来得险，要防破。' : '吉将临财，财来得正，可以接。') : '财星不居初传——这阵子财从「干活」来，不从「运气」来。'} 中传${sanJiang[1]}是过程，${JIANG_BAD.includes(sanJiang[1]) ? '中途防破财，别在这段加杠杆。' : '中途平稳，守住节奏即可。'}`;
        if (a === 'study') return `学业，${r.sanQin[0] === '父母' ? '父母当头——文书之象，考试运不差，资料复习扎实就有分。' : r.sanQin[0] === '子孙' ? '子孙当头——靠理解与发挥，临场心态决定成绩。' : '学业这事，六亲不主头——功夫在平时，课象看的是状态。'}`;
        if (a === 'health') return `身心，${r.sanQin.includes('官鬼') ? '官鬼现课——近期压力在累积，防「操心过度」，睡眠和情绪要盯着。' : '课中官鬼不显——整体平稳，规律作息即可。'} ${JIANG_BAD.includes(chuJ) ? '初传凶将，这段时间对自己宽容一点。' : ''}`;
        if (a === 'decision') return `去留，${r.sanQin[0] === '官鬼' ? '官鬼主「责任」——这个选择绕不开名分与担当。' : r.sanQin[0] === '妻财' ? '妻财主「利益」——这个选择跟钱强相关，先算清楚账。' : r.sanQin[0] === '父母' ? '父母主「稳妥」——选旧路、选平台，稳妥优先。' : '这个选择，先看初传那一势，顺势而为。'}`;
        return `初传${chuJ}是这一步的「起手式」——${JIANG_GOOD.includes(chuJ) ? '顺势而为，别犹豫。' : JIANG_BAD.includes(chuJ) ? '先看清路再迈步。' : '按部就班，稳稳推进。'}`;
      }
      function advice(a, r) {
        const chuJ = r.tianJiang[r.sanChuan[0]] || '';
        if (a === 'love') return JIANG_GOOD.includes(chuJ) ? '给关系一个「往前推」的动作——吉将当头，主动不丢人。' : '先把「等」的姿态摆出来，凶将期不逼不追，稳住自己的节奏。';
        if (a === 'career') return JIANG_GOOD.includes(chuJ) ? '抓住初传这一势，该争取的争取。' : '初传不顺就「磨」——把手上活做扎实，转机在中传。';
        if (a === 'money') return JIANG_BAD.includes(chuJ) ? '近期不碰大额与杠杆，守住现金流。' : '财星当头的时段，把钱往「正路」上放。';
        if (a === 'study') return '把复习节奏稳住，课象的吉凶更多是「状态提示」而非「结果判决」。';
        if (a === 'health') return '给自己排一次彻底的休息——课里若有官鬼，就是身体在提醒你减速。';
        if (a === 'decision') return '看末传：末传吉则选得踏实，末传凶则再等等。';
        return '顺着初传的气象走，这一课就是你的「当下指南」。';
      }
    },

    /* 紫微：命身宫 + 领域宫位 + 四化 + 三方（深度版，演示盘） */
    ziwei(q, c, area) {
      const chart = c.chart;
      if (!chart || !chart.palaces) return null;
      const steps = [`调取盘面：十二宫已布，命宫${chart.palaces[0].stars.join('、') || '空宫'}，四化${chart.sihuaDemo ? JSON.stringify(chart.sihuaDemo) : '未定'}`];
      const findPalace = (name) => chart.palaces.find((p) => p.name === name);
      const core = [];
      const ming = chart.palaces[0];
      const shen = chart.palaces.find((p) => p.name === '身宫');

      /* 1) 命宫 */
      core.push(`命宫${ming.stars.join('、') || '空宫'}——${mingStarsTalk(ming)}`);

      /* 2) 身宫 */
      if (shen && shen !== ming) core.push(`身宫落${shen.name}（${shen.stars.join('、') || '空宫'}）——后天行运的重心在「${shen.name}」这个领域，${shen.stars.includes('天机') ? '思虑重、善谋划。' : shen.stars.includes('太阳') ? '要被人看见，适合台前。' : shen.stars.includes('太阴') ? '内敛稳当，适合幕后。' : '随星曜而动，行运有起伏。'}`);

      /* 3) 领域宫位 */
      if (area === 'career') {
        const g = findPalace('官禄');
        core.push(`官禄宫${g ? (g.stars.join('、') || '空宫（借对宫之曜）') : '—'}——事业格局的题眼：${palaceStarsTalk(g, 'career')}`);
        const qi = findPalace('迁移');
        if (qi && qi.stars.length) core.push(`迁移宫${qi.stars.join('、')}——${qi.stars.includes('天机') || qi.stars.includes('贪狼') ? '你的舞台在外：出外发展、跑动型事业更旺你。' : '外出有贵人，走动是常态，别怕折腾。'}`);
      } else if (area === 'love') {
        const f = findPalace('夫妻');
        core.push(`夫妻宫${f ? (f.stars.join('、') || '空宫（借对宫之曜）') : '—'}——${palaceStarsTalk(f, 'love')}`);
        const zi = findPalace('子女');
        if (zi && zi.stars.includes('天同')) core.push('子女宫天同——你的「感情投射」偏重温馨陪伴，容易被温柔的人打动。');
        const tao = findPalace('命宫') && ming.stars.some((s) => ['贪狼', '廉贞', '红鸾'].includes(s));
        if (tao) core.push('命宫带桃花星（贪狼/廉贞）——你天生有异性缘，但也容易因「选择太多」而心不定。');
      } else if (area === 'money') {
        const cai = findPalace('财帛');
        core.push(`财帛宫${cai ? (cai.stars.join('、') || '空宫（借对宫之曜）') : '—'}——${palaceStarsTalk(cai, 'money')}`);
        const tian = findPalace('田宅');
        if (tian && (tian.stars.includes('武曲') || tian.stars.includes('天府'))) core.push('田宅宫武曲/天府——不动产有缘，攒钱买房是你的「正财路线」。');
      } else if (area === 'study') {
        const fu = findPalace('福德');
        core.push(`福德宫${fu ? (fu.stars.join('、') || '空宫') : '—'}——${fu && fu.stars.includes('天机') ? '脑子快、兴趣广，学习靠「开窍」不靠「死记」。' : fu && fu.stars.includes('文昌') ? '文昌坐福德——读书运稳，考试运不差。' : '福德宫星曜平平，学习重在方法与坚持。'}`);
      } else if (area === 'health') {
        const ji = findPalace('疾厄');
        core.push(`疾厄宫${ji ? (ji.stars.join('、') || '空宫') : '—'}——${ji && (ji.stars.includes('天梁') || ji.stars.includes('天同')) ? '底子不差，但易「操心型内耗」，情绪累比身体累多。' : ji && ji.stars.includes('七杀') ? '体质要防「过劳」，压力大时最容易出问题。' : '疾厄宫平平，规律作息就是最好的护身符。'}`);
      } else {
        const fu = findPalace('福德');
        core.push(`福德宫${fu ? (fu.stars.join('、') || '空宫') : '—'}——${fu && fu.stars.includes('天机') ? '想得多、夜路多，睡前少刷手机。' : fu && fu.stars.includes('太阳') ? '心向光明，情绪来得快去得也快。' : '心态整体平稳。'}`);
        const qian = findPalace('迁移');
        if (qian && qian.stars.length) core.push(`迁移宫${qian.stars.join('、')}——你的人生命题在「外面」：${qian.stars.includes('紫微') ? '到哪都是主心骨。' : qian.stars.includes('七杀') ? '敢闯敢拼，走出去才有你的局。' : '走动带来机会。'}`);
      }

      /* 4) 四化 */
      if (chart.sihuaDemo) {
        const sh = chart.sihuaDemo;
        core.push(`四化落宫：${['禄', '权', '科', '忌'].map((k) => k + '→' + (sh[k] || '未定')).join('，')}——${sihuaTalk(sh)}`);
      }

      /* 5) 对宫借曜 */
      const dui = chart.palaces.find((p) => p.name === '迁移');
      if (ming.stars.length === 0 && dui && dui.stars.length) {
        core.push(`命宫空宫，借迁移宫之曜：${dui.stars.join('、')}——你的特质藏在「外出的你」里，离乡发展反而更能活出自己。`);
      }

      /* 6) 收束 */
      core.push(`综合——你的紫微盘${ming.stars.includes('紫微') ? '紫微坐命，天生有「主心骨」气质，要学着放权。' : ming.stars.includes('天机') ? '天机坐命，思虑深，行动上要学「先做后想」。' : '格局偏平，但平格局有平格局的稳：不折腾就是最大的顺。'}`);
      core.push('（本页为演示盘，星曜为示意——精确命盘请以专业引擎为准。）');
      return { text: core.join('\n'), steps };

      function mingStarsTalk(m) {
        if (m.stars.includes('紫微')) return '帝星坐命——天生有领导气质，但要学「把舞台让给别人」。';
        if (m.stars.includes('天机')) return '机敏善谋——脑力是你的武器，适合动脑的活。';
        if (m.stars.includes('太阳')) return '太阳坐命——光明磊落，适合台前，越被看见越旺。';
        if (m.stars.includes('武曲')) return '武曲坐命——刚毅务实，财星守命，赚钱的底子厚。';
        if (m.stars.includes('天同')) return '天同坐命——福星照命，人缘好、心软，怕吃苦但也有人帮。';
        if (m.stars.includes('廉贞')) return '廉贞坐命——才气与争议并存，命带桃花与是非，要学着收锋芒。';
        if (m.stars.includes('天府')) return '天府坐命——库星守命，稳而能守，天生会「过日子」。';
        if (m.stars.includes('贪狼')) return '贪狼坐命——欲望与才华并存，多才多艺但易分心，要挑一条路深耕。';
        if (m.stars.includes('七杀')) return '七杀坐命——将星之命，敢闯敢拼，人生起伏大但成事也大。';
        if (m.stars.includes('天梁')) return '天梁坐命——荫星照命，贵人运强，常为别人操心，也要学着接住别人的关照。';
        return '命宫星曜平平——你的命格不在「星」而在「行」，稳扎稳打反而是你的优势。';
      }
      function palaceStarsTalk(p, kind) {
        if (!p) return '未定（演示盘数据不全）。';
        const s = p.stars;
        if (kind === 'love') {
          if (s.includes('天同')) return '天同坐夫妻宫——感情重陪伴与享受，怕吵架，宜找温和型。';
          if (s.includes('廉贞')) return '廉贞坐夫妻宫——情浓时炽烈，也要防情到浓时反生波。';
          if (s.includes('贪狼')) return '贪狼坐夫妻宫——感情有「戏剧性」，吸引力强但不稳定，要学着定下来。';
          if (s.includes('紫微')) return '紫微坐夫妻宫——另一半有主见、有地位，关系里你偏「被安排」。';
          if (s.includes('武曲')) return '武曲坐夫妻宫——感情讲实际，不爱浪漫但靠得住。';
          return '夫妻宫星曜平平——感情重在经营，不在命定。';
        }
        if (kind === 'career') {
          if (s.includes('紫微')) return '紫微坐官禄——事业有格局，适合领导岗位。';
          if (s.includes('武曲')) return '武曲坐官禄——事业靠实干，财星化禄，越拼越有。';
          if (s.includes('天机')) return '天机坐官禄——适合策划、分析、动脑型职业。';
          if (s.includes('太阳')) return '太阳坐官禄——适合公众型事业，越曝光越旺。';
          if (s.includes('七杀')) return '七杀坐官禄——事业有冲劲，但起伏大，适合开拓型岗位。';
          return '官禄宫星曜平平——事业靠积累，稳中求进。';
        }
        if (kind === 'money') {
          if (s.includes('武曲')) return '武曲坐财帛——财星得位，天生会理财，财路正。';
          if (s.includes('天府')) return '天府坐财帛——守财有道，钱攒得住，适合稳健理财。';
          if (s.includes('贪狼')) return '贪狼坐财帛——偏财缘，来钱路子多，但散财也快。';
          if (s.includes('太阴')) return '太阴坐财帛——细水长流型，适合积少成多。';
          return '财帛宫星曜平平——钱从专业与积累来，别指望一夜暴富。';
        }
        return '星曜落宫，先看格局再看行运。';
      }
      function sihuaTalk(sh) {
        const parts = [];
        if (sh['禄']) parts.push(`禄在${sh['禄']}——财与资源往${sh['禄']}这个领域流，${sh['禄'] === '财帛' ? '财帛化禄，正财有源。' : '缺钱时往这个方向使劲。'}`);
        if (sh['权']) parts.push(`权在${sh['权']}——${sh['权']}是你的「权力场」，在这里你有话语权。`);
        if (sh['科']) parts.push(`科在${sh['科']}——${sh['科']}带来名声与体面，适合在此处经营口碑。`);
        if (sh['忌']) parts.push(`忌在${sh['忌']}——${sh['忌']}是你的「课题区」：${sh['忌'] === '夫妻' ? '感情上容易想多、怕失去，要先安顿自己。' : sh['忌'] === '疾厄' ? '身体是本钱，忌在疾厄要防过劳。' : sh['忌'] === '财帛' ? '财上防破，忌在财帛要会守。' : '此处易钻牛角尖，学着放下。'}`);
        return parts.join('；');
      }
    },
  };

  /* ---------- 后台循环思考主流程 ---------- */
  function thinkChain(q, system, area) {
    const steps = [];
    // 1. 意图解析
    steps.push(`意图解析：归入「${AREA_NAME[area]}」线，提取关键词：${q.replace(/[？?。，,.！!]/g, '').slice(0, 12)}`);
    // 2. 命盘调取
    const chart = state.chart;
    const gen = CHART_ANSWERS[system];
    let chartResult = null;
    if (chart && gen) {
      chartResult = gen(q, chart, area);
      if (chartResult) steps.push(...chartResult.steps);
      else steps.push('命盘已生成但无此体系专属解析，转知识库对照');
    } else {
      steps.push(chart ? '当前命盘与本体系解析器匹配，取知识库作答' : '尚未排盘——以知识库通识作答，排盘后可结合命盘更准');
    }
    // 3. 知识对照
    const KB = global.KnowledgeBase;
    const hit = KB ? KB.search(q, system) : null;
    if (hit) steps.push(`知识对照：命中「${hit.item.q[0]}」条目`);
    else steps.push('知识对照：无精确条目，综合现有知识作答');
    // 4. 综合权衡（组装回答）
    let text = '';
    if (chartResult) {
      text = chartResult.text;
    } else if (hit) {
      text = hit.item.a;
    } else {
      const areaTips = {
        love: '感情的事，多半不是对方的问题，是你心里的坎——先问自己：这段关系里，你要的到底是什么？',
        career: '事业的路，别只看眼前的得失——先把最擅长的一件事做到八十分，机会自然来找你。',
        money: '关于钱，先求稳再求多。焦虑的时候做的决定，回头大多要后悔。',
        study: '学业上，方法比天赋更能决定走多远——把目标切小，今天先啃下一节。',
        health: '身心是地基——睡眠和情绪先理顺，别的事才有余力谈。',
        decision: '去留之间，写下两个选项各自最坏的结果——能接受的那个，就是答案。',
        general: '这一问没有标准答案，但有个稳妥的起点：先看清自己这一侧的情况，再谈外界。',
      };
      text = areaTips[area];
      steps.push(`综合权衡：按「${AREA_NAME[area]}」给出通用建议`);
    }
    // 5. 语气调整
    const negative = KB ? KB.isNegative(text) : false;
    if (negative) steps.push('语气调整：检测到负面征兆 → ' + (global.ToneEngine && global.ToneEngine.isNight() ? '夜语模式：先接住情绪，委婉作答' : '以平实语气呈现，不夸大'));
    else steps.push('语气调整：无明显负面征兆，正常语气作答');
    return { text, steps, negative };
  }

  /* ---------- UI ---------- */
  function init(opts = {}) {
    state.system = opts.system || 'common';
    injectDom(opts);
    bindEvents();
    renderChips();
  }

  function injectDom(opts) {
    const p = personaOf(state.system);
    const avatar = avatarSvg(state.system);
    const holder = document.createElement('div');
    holder.id = 'ask-panel-root';
    holder.innerHTML = `
      <style>
        #ask-panel-root { --qa-accent: var(--accent); --qa-bg: var(--bg-2); --qa-ink: var(--ink); --qa-ink2: var(--ink-2); --qa-line: var(--line); --qa-panel: var(--panel); }
        #ap-fab {
          position: fixed; right: 20px; bottom: 20px; z-index: 90;
          width: 62px; height: 62px; border-radius: 50%; padding: 0;
          border: 2px solid color-mix(in srgb, var(--qa-accent) 60%, transparent);
          background: transparent; cursor: pointer; overflow: hidden;
          box-shadow: 0 8px 26px var(--glow);
          transition: transform .3s;
        }
        #ap-fab:hover { transform: translateY(-4px) scale(1.04); }
        #ap-fab .ap-hint {
          position: absolute; right: 70px; top: 50%; transform: translateY(-50%);
          font-size: 12px; color: var(--qa-ink2); background: var(--qa-panel);
          border: 1px solid var(--qa-line); padding: 5px 14px; border-radius: 999px;
          white-space: nowrap; opacity: 0; transition: opacity .3s; pointer-events: none;
          font-family: "STKaiti","KaiTi",serif; letter-spacing: 1px;
        }
        #ap-fab:hover .ap-hint { opacity: 1; }
        #ap-panel {
          position: fixed; right: 20px; bottom: 92px; z-index: 91;
          width: min(390px, calc(100vw - 32px)); max-height: min(64vh, 580px);
          display: flex; flex-direction: column;
          background: color-mix(in srgb, var(--qa-panel) 96%, var(--qa-bg));
          border: 1px solid var(--qa-line); border-radius: 16px;
          box-shadow: 0 18px 60px rgba(0,0,0,.5);
          overflow: hidden; transform-origin: bottom right;
          transform: scale(.92) translateY(10px); opacity: 0; pointer-events: none;
          transition: all .28s cubic-bezier(.2,.8,.3,1);
        }
        #ask-panel-root.open #ap-panel { transform: none; opacity: 1; pointer-events: auto; }
        #ap-head {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-bottom: 1px solid var(--qa-line);
          background: color-mix(in srgb, var(--qa-accent) 7%, transparent);
        }
        #ap-head .avatar { width: 42px; height: 42px; border-radius: 50%; overflow: hidden; border: 1px solid color-mix(in srgb, var(--qa-accent) 50%, transparent); flex-shrink: 0; }
        #ap-head .who { flex: 1; }
        #ap-head .who .n { font-family: "STKaiti","KaiTi",serif; font-size: 15px; letter-spacing: 2px; color: var(--qa-ink); }
        #ap-head .who .t { font-size: 11px; color: var(--qa-ink2); letter-spacing: 1px; margin-top: 1px; }
        #ap-head .x { cursor: pointer; color: var(--qa-ink2); font-size: 15px; line-height: 1; padding: 2px 6px; }
        #ap-head .x:hover { color: var(--qa-accent); }
        #ap-body { padding: 14px 16px; overflow-y: auto; flex: 1; }
        #ap-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
        #ap-chips .chipq {
          font-size: 12px; padding: 5px 12px; border-radius: 999px; cursor: pointer;
          border: 1px solid var(--qa-line); color: var(--qa-ink2);
          background: transparent; transition: all .2s; font-family: inherit;
        }
        #ap-chips .chipq:hover { border-color: var(--qa-accent); color: var(--qa-accent); }
        #ap-input-row { display: flex; gap: 8px; }
        #ap-input {
          flex: 1; padding: 10px 14px; font-size: 13.5px; font-family: inherit;
          background: color-mix(in srgb, var(--qa-bg) 70%, var(--qa-panel));
          color: var(--qa-ink); border: 1px solid var(--qa-line); border-radius: 10px; outline: none;
        }
        #ap-input:focus { border-color: var(--qa-accent); }
        #ap-send {
          padding: 0 16px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 13px; letter-spacing: 2px;
          border: 1px solid var(--qa-accent); color: var(--qa-accent);
          background: color-mix(in srgb, var(--qa-accent) 10%, transparent); transition: all .25s;
        }
        #ap-send:hover { background: color-mix(in srgb, var(--qa-accent) 18%, transparent); }
        #ap-answer { margin-top: 14px; }
        #ap-answer .qa-item {
          padding: 13px 15px; border-radius: 12px; margin-bottom: 10px;
          background: color-mix(in srgb, var(--qa-accent) 6%, var(--qa-bg));
          border: 1px solid color-mix(in srgb, var(--qa-accent) 25%, transparent);
          font-size: 13.5px; line-height: 1.9; color: var(--qa-ink);
          animation: apFade .4s ease both;
        }
        @keyframes apFade { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: none;} }
        #ap-answer .qa-item .qq { font-size: 12px; color: var(--qa-accent); margin-bottom: 7px; letter-spacing: 1px; }
        #ap-answer .qa-think {
          margin-bottom: 10px; border-radius: 10px; border: 1px dashed var(--qa-line);
          background: color-mix(in srgb, var(--qa-bg) 60%, transparent);
          overflow: hidden; font-size: 12px; color: var(--qa-ink2);
        }
        #ap-answer .qa-think .th-head {
          padding: 7px 12px; cursor: pointer; user-select: none;
          display: flex; align-items: center; gap: 6px;
          color: var(--qa-accent); letter-spacing: 1px;
        }
        #ap-answer .qa-think .th-head .arr { transition: transform .25s; display: inline-block; }
        #ap-answer .qa-think.open .th-head .arr { transform: rotate(90deg); }
        #ap-answer .qa-think .th-body { display: none; padding: 2px 14px 10px; }
        #ap-answer .qa-think.open .th-body { display: block; }
        #ap-answer .qa-think .th-step { padding: 2.5px 0; }
        #ap-answer .qa-think .th-step::before { content: "· "; color: var(--qa-accent); }
        #ap-answer .qa-fallback { color: var(--qa-ink2); font-size: 13px; }
        #ap-answer .qa-fallback b { color: var(--qa-accent); font-weight: 600; }
      </style>
      <button id="ap-fab" title="${p.name} ${p.title}"><span class="ap-hint">${p.name} · 问事请讲</span>${avatar}</button>
      <div id="ap-panel">
        <div id="ap-head">
          <div class="avatar">${avatar}</div>
          <div class="who"><div class="n">${p.name}</div><div class="t">${p.title} · ${SYSTEM_LABEL[state.system]}</div></div>
          <span class="x" id="ap-close">✕</span>
        </div>
        <div id="ap-body">
          <div id="ap-chips"></div>
          <div id="ap-input-row">
            <input id="ap-input" placeholder="${state.chart ? '已结合你的盘 · 问点什么？' : '先排盘再问，我能结合你的盘回答。也可直接问知识'}">
            <button id="ap-send">问</button>
          </div>
          <div id="ap-answer"></div>
        </div>
      </div>`;
    document.body.appendChild(holder);
  }

  function bindEvents() {
    const root = document.getElementById('ask-panel-root');
    document.getElementById('ap-fab').onclick = () => {
      state.opened = !state.opened;
      root.classList.toggle('open', state.opened);
      if (state.opened) {
        document.getElementById('ap-input').focus();
        // 若有命盘，提示已结合
        if (state.chart && !state._hinted) {
          state._hinted = true;
          const p = personaOf(state.system);
          const ans = document.getElementById('ap-answer');
          ans.innerHTML = `<div class="qa-item"><div class="qq">${p.name} 轻声说</div>你已排盘——问我的时候，我会把盘里的东西一并看进去，比如问「今年财运」，我会翻你盘里的财星和大运。试着问一句看看。</div>`;
        }
      }
    };
    document.getElementById('ap-close').onclick = () => {
      state.opened = false;
      root.classList.remove('open');
    };
    const send = () => {
      const input = document.getElementById('ap-input');
      const q = input.value.trim();
      if (!q) return;
      ask(q);
      input.value = '';
    };
    document.getElementById('ap-send').onclick = send;
    document.getElementById('ap-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send();
    });
  }

  function renderChips() {
    const KB = global.KnowledgeBase;
    if (!KB) return;
    const items = KB.ITEMS.filter((i) => i.system === state.system).slice(0, 6);
    if (!items.length) items.push(...KB.ITEMS.filter((i) => i.system === 'common').slice(0, 4));
    document.getElementById('ap-chips').innerHTML = items
      .map((i) => `<button class="chipq" data-q="${i.q[0]}">${i.q[0]}</button>`).join('');
    document.getElementById('ap-chips').querySelectorAll('.chipq').forEach((b) => {
      b.onclick = () => ask(b.dataset.q);
    });
  }

  function ask(q) {
    const KB = global.KnowledgeBase;
    const area = analyzeArea(q);
    const chain = thinkChain(q, state.system, area);
    const final = (global.ToneEngine && chain.negative) ? global.ToneEngine.soften(chain.text, true) : chain.text;
    const p = personaOf(state.system);
    const ans = document.getElementById('ap-answer');
    ans.innerHTML = `
      <div class="qa-think" id="ap-think">
        <div class="th-head"><span class="arr">▶</span>后台思考 · ${chain.steps.length} 步</div>
        <div class="th-body">${chain.steps.map((s) => `<div class="th-step">${s}</div>`).join('')}</div>
      </div>
      <div class="qa-item"><div class="qq">❖ ${q}</div>${final.replace(/\n/g, '<br>')}</div>`;
    document.getElementById('ap-think').querySelector('.th-head').onclick = function () {
      this.parentElement.classList.toggle('open');
    };
    const body = document.getElementById('ap-body');
    body.scrollTop = body.scrollHeight;
  }

  /* 外部唤起：open(system?) / close() / toggle() */
  function openPanel(system) {
    if (!document.getElementById('ask-panel-root')) {
      init({ system: system || 'common' });
    } else if (system && state.system !== system) {
      state.system = system;
      const root = document.getElementById('ask-panel-root');
      const head = document.getElementById('ap-head');
      if (head) {
        const p = personaOf(system);
        const av = head.querySelector('.ap-avatar'); if (av) av.innerHTML = avatarSvg(system);
        const nm = head.querySelector('.ap-name'); if (nm) nm.textContent = p.name;
        const tl = head.querySelector('.ap-title'); if (tl) tl.textContent = p.title;
      }
      renderChips();
    }
    state.opened = true;
    const root = document.getElementById('ask-panel-root');
    if (root) root.classList.add('open');
    const inp = document.getElementById('ap-input');
    if (inp) inp.focus();
  }
  function closePanel() {
    state.opened = false;
    const root = document.getElementById('ask-panel-root');
    if (root) root.classList.remove('open');
  }
  function togglePanel() {
    state.opened ? closePanel() : openPanel();
  }

  global.AskPanel = { init, setChart, open: openPanel, close: closePanel, toggle: togglePanel, _avatarSvg: avatarSvg };
})(window);
