/* ============================================================
   KiXs · 塔罗引擎 TarotEngine（叙事版）
   ------------------------------------------------------------
   78 张 Rider-Waite-Smith 牌库：
   · 每张牌含画面意象（image）与正/逆位叙事文案（core）
   · 问题领域分析器 analyzeQuestion()：感情/事业/财运/学业/
     健康/决策/通用，解读贴合用户所问
   · interpret() 生成有画面、有情绪、第二人称的叙事解读
   解读经 ToneEngine.wrap() 适配夜语模式
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 大阿卡纳 22 张（画面 + 正/逆叙事） ---------- */
  const MAJOR = [
    { id: 0, name: '愚者', en: 'The Fool', suit: 'major', element: '风', emoji: '🃏',
      image: '悬崖边，他背着小小的行囊，脚下就是未知，脚边还有只小狗在欢跳。',
      core: { u: '抽到愚者，是说你现在正站在一个需要「大胆一步」的关口——不是让你鲁莽，是提醒你：有些事，只有先迈出去，才知道答案。', r: '愚者逆位，是悬崖边的迟疑。不是不敢，是心里有太多「万一」。你需要的不是勇气，是先分清：你怕的是危险本身，还是怕别人怎么看。' } },
    { id: 1, name: '魔术师', en: 'The Magician', suit: 'major', element: '风', emoji: '🪄',
      image: '他一手举杖指天，一手指地，桌上四样法器齐备——天地间的资源，此刻都在他手里。',
      core: { u: '抽到魔术师，是说这件事你其实「什么都有」：能力、时机、支持都在桌上。缺的不是条件，是你还不太相信「我能做到」。', r: '魔术师逆位，是满桌法器却没人施法。你握着资源却觉得不对劲——也许是方法不对，也许是那个「我配不上」的声音在作祟。先把杂念清掉，你比自己以为的更有力。' } },
    { id: 2, name: '女祭司', en: 'The High Priestess', suit: 'major', element: '水', emoji: '🕯️',
      image: '她坐在黑白双柱之间，帷幕后是幽深的水面——表面静，底下全是流动的直觉。',
      core: { u: '抽到女祭司，是在告诉你：答案不在外面的资料里，在你心里那股「隐隐觉得」里。别急着找证据，先听直觉——尤其当你问的是感情或方向时。', r: '女祭司逆位，是帷幕被扯开一半，你却不敢看。不是没有直觉，是你选择忽略它——因为那个答案可能不那么舒服。可它一直在那里，越拖越沉。' } },
    { id: 3, name: '皇后', en: 'The Empress', suit: 'major', element: '土', emoji: '🌹',
      image: '麦田丰熟，她坐在柔软的椅子里，周身都是丰饶的气息。',
      core: { u: '抽到皇后，是说这件事正需要「滋养」而非「强攻」——对关系、对事业、对自己，多给一点耐心和温柔，反而长得更快。你值得被好好对待，先从自己开始。', r: '皇后逆位，是丰饶的田地没人打理。你一直在付出，却忘了自己也在这片田里。停一下，先照顾自己——这不是自私，是你把力气都给了别人，忘了给自己浇水。' } },
    { id: 4, name: '皇帝', en: 'The Emperor', suit: 'major', element: '火', emoji: '🏔️',
      image: '山峦为靠，公羊头威仪，他坐在磐石般的宝座上。',
      core: { u: '抽到皇帝，是说这件事需要「立规矩」——边界、秩序、干脆的决定。你心里那个想当老好人的念头，此刻该放一放了：有时爱和狠，是一体两面。', r: '皇帝逆位，是王座上的固执。不是权力不够，是握得太紧，反而听不见别人的声音。问问自己：你要的是「对」，还是「好」？松开一点，局面反而会活。' } },
    { id: 5, name: '教皇', en: 'The Hierophant', suit: 'major', element: '土', emoji: '⛪',
      image: '双柱之下，他传道授业，座下众人聆听。',
      core: { u: '抽到教皇，是说这件事可以参考「过来人的经验」——师长的建议、行业的老规矩、靠谱的专业意见。别一个人硬扛着琢磨，有些答案早就写在经验里，你要做的是虚心去取。', r: '教皇逆位，是标准答案失灵的时刻。旧的路数走不通了，你不必再按别人的剧本活。这不是叛逆，是成长：该你为自己立规矩了。' } },
    { id: 6, name: '恋人', en: 'The Lovers', suit: 'major', element: '风', emoji: '💞',
      image: '天使在上，亚当夏娃相对，身后是生命树与智慧树。',
      core: { u: '抽到恋人，问感情是心有灵犀、情投意合；问选择，是「心之所向」与「理性考量」的正面相遇。这张牌不问对错，只问：你到底更想要哪一个？', r: '恋人逆位，是两条路都伸向迷雾。不是没有真心，是两颗心暂时没对齐；不是选不出，是怕选了就失去另一个可能。可人生没有完美选项，只有你愿意负责的那个。' } },
    { id: 7, name: '战车', en: 'The Chariot', suit: 'major', element: '水', emoji: '🛞',
      image: '黑白两头狮身人面兽拉着战车，方向却握在他自己手里。',
      core: { u: '抽到战车，是说这件事要靠「意志力硬推一把」——目标清楚，就别管杂音，向前冲。战车喜欢赢，而它也在告诉你：你可以赢。', r: '战车逆位，是车轮陷在泥里空转。不是你不够用力，是方向没对，或者你心里那两个声音在互相拉扯。先定方向，再谈速度。' } },
    { id: 8, name: '力量', en: 'Strength', suit: 'major', element: '火', emoji: '🦁',
      image: '她温柔地合上狮子的嘴，头顶悬着「无限」的符号。',
      core: { u: '抽到力量，是说此刻最有力的武器不是硬碰硬，是「温柔的坚定」——对那个暴躁的自己、难缠的局面，慢下来，用耐心驯服它。你的柔软，恰恰是你的力量。', r: '力量逆位，是狮子在吼，你却不敢看它。你也许在逞强，或者在不甘里耗着。允许自己先承认「我撑不住了」，那不算输，是重新出发的第一步。' } },
    { id: 9, name: '隐士', en: 'The Hermit', suit: 'major', element: '土', emoji: '🏮',
      image: '雪山顶上，他提着一盏灯独行。',
      core: { u: '抽到隐士，是说你现在需要一点「独处」——不是逃避，是退后一步看清自己。有些答案，热闹的地方找不到，安静的时候反而自己浮上来。', r: '隐士逆位，是灯灭了还硬要走夜路。你把自己关得太久，或者拒绝看清某些事。可以独处，但别把自己锁死——那盏灯，有时得让别人帮你点着。' } },
    { id: 10, name: '命运之轮', en: 'Wheel of Fortune', suit: 'major', element: '火', emoji: '🎡',
      image: '巨轮转动，轮上的符号周而复始，轮缘有神兽守望。',
      core: { u: '抽到命运之轮，是说这件事正在「换季」——僵局要松了，或转机要来了。轮子不停，你别站在原地等，顺着势走，它会把你带到新的一页。', r: '命运之轮逆位，是轮子卡了一下。别慌，这只是转动的间隙，不是终点。趁机检查：上一轮的功课，是不是还没做完？做完它，轮子自然会转起来。' } },
    { id: 11, name: '正义', en: 'Justice', suit: 'major', element: '风', emoji: '⚖️',
      image: '一手天平，一手宝剑，目光平直，紫袍端肃。',
      core: { u: '抽到正义，是说这件事「种什么因得什么果」——合同、承诺、是非对错，都到了该算清楚的时候。别怕面对结果，公平会站在讲理的人这边。', r: '正义逆位，是天平歪了一边。也许是你不肯面对的事实，也许是旧账没结清。先把「公平」放到台面上来谈，掩盖只会让天平越歪。' } },
    { id: 12, name: '倒吊人', en: 'The Hanged Man', suit: 'major', element: '水', emoji: '🙃',
      image: '他倒悬在树上，神色却安宁，头顶有光环。',
      core: { u: '抽到倒吊人，是说现在最聪明的做法是「换个角度看」——事情卡住，不是死路，是你看它的角度不对。倒过来看，也许就通了。', r: '倒吊人逆位，是吊着却不肯松手。你明知该换个活法，却还在原地熬。有时候「放下」不是认输，是给新东西腾位置。' } },
    { id: 13, name: '死神', en: 'Death', suit: 'major', element: '水', emoji: '💀',
      image: '白马踏过，旗帜黑底白花，而远处太阳照常升起。',
      core: { u: '抽到死神，别怕——它说的是「结束」，更是「蜕变」。有些事、有些人、有些阶段，到了该谢幕的时候。腾空双手，新的才能接住。', r: '死神逆位，是旧的门已经关上，你却还站在门口不肯走。变化是躲不掉的，越抗拒越疼。不如主动松手，让该结束的体面结束。' } },
    { id: 14, name: '节制', en: 'Temperance', suit: 'major', element: '火', emoji: '💧',
      image: '天使一脚在水里一脚在岸上，两杯水来回倾注。',
      core: { u: '抽到节制，是说这件事要「慢慢来、匀着来」——节奏、平衡、分寸。急不得，也停不得，像熬一锅好汤，火候对了，味道自然对。', r: '节制逆位，是水洒了一地。你也许在过犹不及：要么用力过猛，要么彻底摆烂。找个中间点，别让情绪替你开车。' } },
    { id: 15, name: '恶魔', en: 'The Devil', suit: 'major', element: '土', emoji: '😈',
      image: '锁链松松地挂在两人颈上——其实挣脱得了，倒五芒星悬在头顶。',
      core: { u: '抽到恶魔，是说有样东西在「困住」你：执念、欲望、习惯，或一段消耗你的关系。牌面在提醒：锁是你自己戴上的，你也可以自己摘。', r: '恶魔逆位，是觉醒的开始。你已经看见那条锁链了，甚至已经开始挣——别停，也别回头。自由不是一步到位的，是挣一下松一寸。' } },
    { id: 16, name: '高塔', en: 'The Tower', suit: 'major', element: '火', emoji: '⚡',
      image: '闪电劈中塔顶，王冠坠落，人在半空，塔身崩裂。',
      core: { u: '抽到高塔，是说有些「旧结构」要塌了——计划、关系、认知，也许措手不及。但塌掉的是本来就不该留的。疼是真疼，可塔倒了，天也亮了。', r: '高塔逆位，是闪电在云里蓄着还没劈下。你感觉到了危机，还有时间准备。与其等它塌，不如自己先动手拆几块松动的砖。' } },
    { id: 17, name: '星星', en: 'The Star', suit: 'major', element: '风', emoji: '⭐',
      image: '她跪在溪边，两壶水倒回大地，头顶是巨大的八芒星。',
      core: { u: '抽到星星，是深夜里的一点光——失望过后，希望回来了。这件事值得你继续相信：前路虽远，但方向是对的。', r: '星星逆位，是星光被云遮住。你也许刚刚失去信心，觉得努力没用。可云会散，星还在。今晚先照顾好自己，明天那点光会再亮起来。' } },
    { id: 18, name: '月亮', en: 'The Moon', suit: 'major', element: '水', emoji: '🌙',
      image: '双塔之间，狼犬对月而吠，小径伸向迷雾。',
      core: { u: '抽到月亮，是说此刻「看不清」是正常的——情绪、猜测、流言、自己的想象，都混在一起。别急着做决定，等雾散一点；也别急着相信最坏的版本。', r: '月亮逆位，是雾开始散了。那些吓唬你的想象，正一个个显形为事实——多半没那么糟。你比你以为的更清醒。' } },
    { id: 19, name: '太阳', en: 'The Sun', suit: 'major', element: '火', emoji: '☀️',
      image: '孩童骑着白马，从围墙后跃出，向日葵向阳而开。',
      core: { u: '抽到太阳，是阴霾散尽的好消息：这件事会往好的方向走，值得高兴，值得庆祝。你就该像那孩子一样，痛快地笑一回。', r: '太阳逆位，是光还在，只是你背对着它。也许是不敢相信好事会轮到你，也许是暂时还没看到成果。转个身，光一直都在。' } },
    { id: 20, name: '审判', en: 'Judgement', suit: 'major', element: '火', emoji: '📯',
      image: '天使吹响号角，棺中人闻声而起，从沉睡中醒来。',
      core: { u: '抽到审判，是「重新开始」的召唤——过去的事该翻篇了：欠自己的道歉、该做的和解、一直拖着没开始的改变，是时候回应那个声音了。', r: '审判逆位，是号角响了，你却还躺在棺里装睡。也许在逃避某件该面对的事。逃避的代价，比面对的代价贵得多。' } },
    { id: 21, name: '世界', en: 'The World', suit: 'major', element: '土', emoji: '🌍',
      image: '舞者在花环中舒展，四角四活物安然守望。',
      core: { u: '抽到世界，是一个阶段的「圆满」——事成了、学成了、这段路走完了。好好庆祝，然后带着这份完整，去开下一个篇章。', r: '世界逆位，是差最后一口气的圆满。别灰心，你离终点很近了，只是还有些细节没收尾。把那根线头捻好，花环就能合上。' } },
  ];

  /* ---------- 小阿卡纳：花色灵魂 + 数字阶段 ---------- */
  const SUITS = {
    wands: { name: '权杖', en: 'Wands', element: '火', emoji: '🪵',
      soul: { u: '权杖是火——你的行动力、热情、创造的火种。它提醒你：想一万遍，不如做一遍。', r: '权杖逆位，是火苗暗了。也许是倦了，也许是方向不对让热情空耗。先护住火种，再谈燎原。' } },
    cups: { name: '圣杯', en: 'Cups', element: '水', emoji: '🏺',
      soul: { u: '圣杯是水——情感、关系、心与心的流动。这张牌说：这件事，顺着心走比讲道理管用。', r: '圣杯逆位，是水结冰了。感情里的别扭、没说出口的话，都堵在那里。先解开心结，水才会流。' } },
    swords: { name: '宝剑', en: 'Swords', element: '风', emoji: '⚔️',
      soul: { u: '宝剑是风——思维、语言、真相。这张牌说：把话说明白、把事想清楚，比什么都重要。', r: '宝剑逆位，是风中满是杂音。你也许想太多、说太多，或听了太多。清一清脑内的弹幕，回到事实本身。' } },
    pentacles: { name: '星币', en: 'Pentacles', element: '土', emoji: '🪙',
      soul: { u: '星币是土——现实、积累、稳稳的根基。这张牌说：慢即是快，把地基打牢，楼才能盖高。', r: '星币逆位，是土里没养分。也许是钱、精力、时间的投入出了问题。先止损，再重耕。' } },
  };
  const NUM_STAGE = {
    1: { u: '这是初生的第一步，种子刚入土。别急着要结果，先让它发芽。', r: '第一步还犹豫着，种子仍在口袋里。' },
    2: { u: '权衡与平衡的时刻，两件事在拉你。不急着选，先摆正天平。', r: '僵在那里不敢选，犹豫本身就是成本。' },
    3: { u: '协作与初成，几股力拧成一股，有苗头了。', r: '配合出了岔子，合力没拧到一处。' },
    4: { u: '安顿下来的时刻，根基在扎稳。', r: '稳是稳了，但小心把自己困进舒适区。' },
    5: { u: '冲突与考验，这道坎在教你东西。', r: '冲突开始松动，和解的时机到了。' },
    6: { u: '顺流与馈赠，好事开始向你走来。', r: '你付出太多，该往回收一收了。' },
    7: { u: '坚持与把关，再核对一遍，别松劲。', r: '累了，想放弃了——允许你歇，但别停。' },
    8: { u: '前进与精进，速度起来了，方向也清楚了。', r: '在原地打转，缺的不是力，是破局的点子。' },
    9: { u: '接近圆满，九十九步都走了，就差最后一步。', r: '患得患失，越接近目标，越怕失去。' },
    10: { u: '圆满收官，一段旅程走完了，该庆祝。', r: '过犹不及，装得太满反而溢出来。' },
  };
  const COURTS = {
    page: { name: '侍从', desc: '新消息与学习的使者，还带着一点好奇与青涩。' },
    knight: { name: '骑士', desc: '行动与奔赴的化身，能量正处在出发的姿态。' },
    queen: { name: '王后', desc: '成熟与滋养，力量来自内在的稳定与包容。' },
    king: { name: '国王', desc: '掌控与担当，局面需要一个能拍板的人。' },
  };

  function buildMinor() {
    const deck = [];
    for (const [skey, suit] of Object.entries(SUITS)) {
      for (let n = 1; n <= 10; n++) {
        deck.push({
          id: deck.length + 22, name: suit.name + n, en: `${n} of ${suit.en}`,
          suit: skey, element: suit.element, emoji: suit.emoji,
          image: `${suit.name}数字牌，${suit.en}一组，画的是${NUM_STAGE[n].u.replace('。', '')}的意象。`,
          core: { u: `${suit.soul.u}${NUM_STAGE[n].u}`, r: `${suit.soul.r}${NUM_STAGE[n].r}` },
        });
      }
      for (const [ckey, c] of Object.entries(COURTS)) {
        deck.push({
          id: deck.length + 22, name: suit.name + c.name, en: `${c.name} of ${suit.en}`,
          suit: skey, element: suit.element, emoji: suit.emoji,
          image: `${suit.name}宫廷牌：${c.name}。`,
          core: { u: `${suit.soul.u}而这张是${c.name}——${c.desc}`, r: `${suit.soul.r}这张是${c.name}——${c.desc}` },
        });
      }
    }
    return deck;
  }
  const MINOR = buildMinor();
  const DECK = [...MAJOR, ...MINOR];

  /* ---------- 问题领域分析 ---------- */
  function analyzeQuestion(q) {
    const t = (q || '').replace(/\s/g, '');
    if (/感情|恋爱|婚姻|对象|伴侣|复合|分手|桃花|喜欢|男友|女友|老公|老婆|暧昧|相亲/.test(t)) return 'love';
    if (/工作|事业|升职|跳槽|offer|面试|创业|公司|项目|辞职|领导|同事|老板|职业/.test(t)) return 'career';
    if (/钱|财|投资|股票|基金|生意|收入|赚钱|借贷|债务|买房|存钱|理财/.test(t)) return 'money';
    if (/考|学|试|成绩|升学|论文|毕业|考研|读研|复习/.test(t)) return 'study';
    if (/健康|身体|病|失眠|焦虑|抑郁|状态|情绪/.test(t)) return 'health';
    if (/去留|选择|要不要|该不该|决定|纠结|搬家|城市|辞职还是/.test(t)) return 'decision';
    return 'general';
  }

  const AREA_NAMES = {
    love: '感情', career: '事业', money: '财运', study: '学业', health: '身心', decision: '去留抉择', general: '当下',
  };

  /* 领域落点（结合牌名+关键词，口语化）——每个领域一组句式 */
  const AREA_POINTS = {
    love: [
      (name, kw) => `放在感情里，这张「${name}」是在告诉你：${kw}。你心里其实一直有数，缺的只是把它说出口的勇气。`,
      (name, kw) => `问感情抽到「${name}」，重点不在对方怎么做，在你自己的心怎么转——${kw}，先安顿好自己这一侧，关系才有空间。`,
    ],
    career: [
      (name, kw) => `放到事业上，「${name}」指向的是「${kw}」——这一步怎么走，比走多快更重要。`,
      (name, kw) => `问工作抽到「${name}」，是在提醒你：${kw}。别只看眼前得失，看看这条线三个月后的走向。`,
    ],
    money: [
      (name, kw) => `落到财务上，「${name}」说的是「${kw}」——关于钱，先求稳，再求多。`,
      (name, kw) => `关于金钱，「${name}」的提示是：${kw}。越是缺钱的时候，越要守住边界，别让焦虑替你做投资决定。`,
    ],
    study: [
      (name, kw) => `用在学业上，「${name}」给的提示是「${kw}」——方法比天赋更能决定你能走多远。`,
      (name, kw) => `问学业抽到「${name}」，核心是「${kw}」：把目标切小，今天先啃下一节，信心是攒出来的。`,
    ],
    health: [
      (name, kw) => `关于身心状态，「${name}」想说的是「${kw}」——身体已经在提醒你了，慢下来，听它的话。`,
      (name, kw) => `抽到「${name}」，健康这条线的关键词是「${kw}」：先别硬撑，睡眠和情绪，是其他一切的地基。`,
    ],
    decision: [
      (name, kw) => `这是件事关去留的牌：「${name}」劝你「${kw}」。答案不会自己掉下来，但你的心会逐渐给出信号，注意听。`,
      (name, kw) => `面对选择抽到「${name}」——${kw}。与其纠结对错，不如问自己：哪个选项，明天醒来你不会后悔？`,
    ],
    general: [
      (name, kw) => `对你此刻的处境，「${name}」说的是「${kw}」——听起来抽象，落到你生活里，它会以具体的样子出现。`,
      (name, kw) => `「${name}」这一牌，落在你当下就是「${kw}」。顺着这个提示，看看接下来一周会发生什么。`,
    ],
  };

  /* 行动建议池 */
  const ADVICE = {
    love: ['挑一个不忙的晚上，把那句憋了很久的话，好好说一次。', "把「猜」换成「问」——一段关系最贵的成本是误解。", '先把自己过好，你对别人的期待自然会松绑。'],
    career: ['把大目标拆成这周能完成的三个小步，先动起来。', '去找一个比你懂行的人聊一次，答案常常藏在对话里。', '把手头最重要的一件事做到八十分，比十件事都做六十分强。'],
    money: ['记账两周，你会看见钱都去了哪里——看见，即是控制。', "任何让你「心跳加速」的投资建议，先放凉三天再决定。", '先存下一笔「安全感基金」，再谈别的。'],
    study: ['把最难的那科放在精力最好的时段，其余时间放过自己。', "把「我要考好」换成「我要搞懂」，压力会小一半。", '每天定一个小到不可能失败的目标，先建立手感。'],
    health: ['把今天的睡眠优先级，排在所有待办前面。', '给身体一个固定的节奏：睡、吃、动，先做到一样。', '允许自己休息，不是浪费时间，是给电池充电。'],
    decision: ['写下两个选项各自最坏的结果——能接受的那个，就是答案。', "用「如果明天就要选」逼自己一把，你的心会先于大脑表态。", '选那个让你「敢承担后果」的，而不是让你「感觉安全」的。'],
    general: ['今晚先做一件「对自己好」的小事，其他的明天再说。', '把纠结写下来，字一落地，它就变小了。', '这一周，每天留十分钟，只听自己心里的声音。'],
  };

  /* ---------- 牌阵 ---------- */
  const SPREADS = {
    single: {
      name: '单牌 · 日卡', desc: '一牌一问，看当下最直接的气象',
      positions: [{ key: 'now', name: '当下', hint: '此刻的气场与核心讯息' }],
    },
    three: {
      name: '三牌 · 过去现在未来', desc: '三牌贯之，看一段时局的前因后果',
      positions: [
        { key: 'past', name: '过去', hint: '局面由何而来，你的底牌何在' },
        { key: 'now', name: '现在', hint: '当下的重心与关键' },
        { key: 'future', name: '未来', hint: '若顺流而行，将抵何处' },
      ],
    },
    cross5: {
      name: '五牌 · 简化十字', desc: '五牌成阵，看事之全貌与走向',
      positions: [
        { key: 'situation', name: '现状', hint: '事情的核心状态' },
        { key: 'challenge', name: '挑战', hint: '横在你面前的课题' },
        { key: 'root', name: '根源', hint: '这件事的深层根由' },
        { key: 'path', name: '前路', hint: '正在成形的方向' },
        { key: 'outcome', name: '结果', hint: '依当前轨迹的走向' },
      ],
    },
  };

  /* ---------- 抽牌（不重复，用户点击选牌后由页面传入） ---------- */
  function draw(positions, selectedCards) {
    return positions.map((p, i) => {
      const card = selectedCards[i];
      const reversed = Math.random() < 0.5;
      return { ...card, position: p, reversed };
    });
  }

  /* 正/逆位关键词（供落点句嵌入） */
  const KW = {
    0: { u: '放手一试、听从内心的冒险', r: '犹豫再三、被顾虑绊住' },
    1: { u: '资源齐备、相信自己能成', r: '有力使不出、自我怀疑' },
    2: { u: '信任直觉、答案在心里', r: '回避真相、直觉被按下' },
    3: { u: '用滋养代替强攻、善待自己', r: '付出失衡、忘了照顾自己' },
    4: { u: '立边界、做干脆的决定', r: '握得太紧、固执听不见' },
    5: { u: '请教过来人、走成熟路径', r: '旧路失效、该自己立规矩' },
    6: { u: '听从真心、选择所爱', r: '心意未对齐、怕选错' },
    7: { u: '靠意志力推进、目标明确', r: '方向未定、内心拉扯' },
    8: { u: '温柔的坚定、耐心驯服', r: '逞强硬撑、先承认脆弱' },
    9: { u: '独处沉淀、向内看清', r: '自我封闭、灯该被点亮' },
    10: { u: '顺势而为、转机在即', r: '轮子卡顿、补完旧功课' },
    11: { u: '算清因果、直面公平', r: '天秤倾斜、旧账未清' },
    12: { u: '换个角度看、以退为进', r: '明知该变、却不肯松手' },
    13: { u: '让该结束的结束、蜕变', r: '抗拒变化、守着旧门' },
    14: { u: '慢下来、掌握分寸节奏', r: '用力过猛、失衡摇摆' },
    15: { u: '看清执念、锁是自己戴的', r: '正在挣脱、别回头' },
    16: { u: '旧结构崩塌、破而后立', r: '危机预警、先拆松动处' },
    17: { u: '希望回归、方向是对的', r: '信心受挫、云会散星还在' },
    18: { u: '允许看不清、别信最坏版本', r: '迷雾渐散、比想象清醒' },
    19: { u: '好消息、值得庆祝', r: '光还在、只是背对了它' },
    20: { u: '重新开始、回应内心的召唤', r: '逃避面对、代价更贵' },
    21: { u: '圆满收尾、开启新篇', r: '差最后一口气、收好尾' },
  };
  function cardKw(card, reversed) {
    if (card.suit === 'major') return (reversed ? KW[card.id].r : KW[card.id].u);
    const suit = SUITS[card.suit];
    const num = card.name.match(/(\d+)/);
    const stage = num ? NUM_STAGE[+num[1]] : null;
    const soulKw = reversed ? suit.soul.r : suit.soul.u;
    const stageKw = stage ? (reversed ? stage.r : stage.u) : '';
    return soulKw.replace(/[。，]/g, '').slice(0, 14) + (stageKw ? '、' + stageKw.replace(/[。，]/g, '') : '');
  }

  /* ---------- 叙事解读生成 ---------- */
  function interpret(drawResult, question) {
    const area = analyzeQuestion(question);
    const areaName = AREA_NAMES[area];
    const qLine = question ? `你问的是：「${question}」` : '你没有写下具体问题，那就当这是一次给自己的照见。';
    const qOpen = question
      ? `把这副牌放到你问的这件事上——${areaName}这条线。`
      : `就当牌面在替你照一照此刻的心境。`;

    // 每张牌的段落：位置引导 + 画面 + 核心叙事 + 领域落点（句式轮换，避免同局重复）
    const cardParts = drawResult.map((d, di) => {
      const kw = cardKw(d, d.reversed);
      const areaPool = AREA_POINTS[area];
      const areaLine = areaPool[di % areaPool.length](d.name, kw);
      const posOpen = {
        past: '先看过去。', now: '再看当下。', future: '最后看向未来。',
        situation: '先看现状。', challenge: '横在你面前的是——', root: '往深处挖，这件事的根子在——',
        path: '正在成形的方向是——', outcome: '依着现在的轨迹，结局指向——',
      }[d.position.key] || '';
      return `${posOpen}你抽到「${d.name}」（${d.reversed ? '逆位' : '正位'}）。${d.image}${d.reversed ? d.core.r : d.core.u}\n${areaLine}`;
    });

    // 综合段
    const majors = drawResult.filter((d) => d.suit === 'major');
    const revCount = drawResult.filter((d) => d.reversed).length;
    const elementCount = {};
    drawResult.forEach((d) => { elementCount[d.element] = (elementCount[d.element] || 0) + 1; });
    const domEl = Object.entries(elementCount).sort((a, b) => b[1] - a[1])[0];
    const elLine = {
      火: '这一局火气偏盛：行动是主线，热血是燃料，但记得给刹车留个位置。',
      水: '这一局水气偏盛：直觉和情绪在主导，顺着心走没错，只是别让它淹没判断。',
      风: '这一局风气偏盛：想得多、说得也重要，先把话说开，局就开了一半。',
      土: '这一局土气偏盛：现实和积累是主线，慢即是快，地基比屋顶重要。',
    }[domEl ? domEl[0] : '土'];

    const story = [];
    if (majors.length) {
      story.push(`这一局里有 ${majors.map((m) => `「${m.name}」`).join('、')} 这几张大牌——你问的这件事，触到了你人生里某个不小的课题，值得认真对待。`);
    } else {
      story.push('这一局都是小牌，说的是日常人事里的具体起伏——格局不大，处理好眼前这一两步就行。');
    }
    if (revCount >= Math.ceil(drawResult.length / 2)) {
      story.push(`翻了 ${revCount} 张逆位，眼下有些能量在打结——不是坏事，是提醒你先松绑（把憋着的话说了、把攥紧的放下），再上路。`);
    }
    story.push(elLine);

    // 行动建议
    const advicePool = ADVICE[area];
    const advice1 = advicePool[Math.floor(Math.random() * advicePool.length)];
    const advice2 = advicePool[Math.floor(Math.random() * advicePool.length)];

    // 整体吉凶收尾
    const good = majors.filter((d) => [19, 21, 17, 3, 6].includes(d.id) && !d.reversed).length;
    const bad = majors.filter((d) => [16, 15, 13, 18].includes(d.id) && !d.reversed).length;
    let closer;
    if (revCount >= Math.ceil(drawResult.length / 2)) closer = '牌面偏滞，不是坏事——它是在替你把刹车踩下来，省得你撞墙。停下来看看路，也是前进。';
    else if (good > bad) closer = '牌面偏顺——该来的正在路上，你要做的，是别挡它的道。';
    else closer = '牌面有顺有阻，赢面在你手里——稳着走，比冲得快重要。';

    const body = [
      qLine,
      qOpen,
      '',
      ...cardParts,
      '',
      `把这几张牌合起来看——`,
      story.join('\n'),
      '',
      `给你两个小建议：`,
      `第一件：${advice1}`,
      `第二件：${advice2}`,
      '',
      closer,
    ].join('\n');

    return ToneEngine.wrap(body, { title: null, opening: true, ending: true });
  }

  /* ---------- 三句点醒 ---------- */
  function summarize(drawResult, question) {
    const area = analyzeQuestion(question);
    const last = drawResult[drawResult.length - 1];
    const coreText = (last.reversed ? last.core.r : last.core.u).replace(/^抽到[^，。]{2,8}[，。]/, '').replace(/^抽到「[^」]+」[，。]/, '');
    return [
      `这局由「${last.name}」收尾（${last.position.name}之位）——${coreText}`,
      `落在${AREA_NAMES[area]}这条线上：${cardKw(last, last.reversed)}。这是牌面给你最实在的一句话。`,
      `牌看的是势，路是你走的。今晚把牌合上，明天把第一步迈出去。`,
    ];
  }

  global.TarotEngine = { DECK, SPREADS, analyzeQuestion, draw, interpret, summarize };
})(window);
