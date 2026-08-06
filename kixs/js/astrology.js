/* ============================================================
   KiXs · 出生星盘引擎 AstrologyEngine（完整版）
   ------------------------------------------------------------
   天文算法（确定性，轨道元素法）：
   · 十大行星地心黄经（太阳=Meeus 25.2，月亮=47.1 低精度级数，
     水金火木土天海冥=开普勒轨道元素法，Meeus 33.A/33.B）
   · 上升 / MC（恒星时 + 出生地经度纬度）
   · 等宫制十二宫
   · 相位：合 0° / 六合 60° / 刑 90° / 拱 120° / 冲 180°
   精度：内行星 ±0.5°，月亮 ±1°，外行星 ±2°（1900–2100）
   解读按「行星落座 × 落宫 × 相位」生成（测测风格）
   ============================================================ */
(function (global) {
  'use strict';

  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const rad = (d) => d * D2R;
  const deg = (r) => r * R2D;
  function norm360(x) { return ((x % 360) + 360) % 360; }

  /* ---------- 星座 ---------- */
  const SIGNS = [
    { name: '白羊', en: 'Aries', glyph: '♈', element: '火' },
    { name: '金牛', en: 'Taurus', glyph: '♉', element: '土' },
    { name: '双子', en: 'Gemini', glyph: '♊', element: '风' },
    { name: '巨蟹', en: 'Cancer', glyph: '♋', element: '水' },
    { name: '狮子', en: 'Leo', glyph: '♌', element: '火' },
    { name: '处女', en: 'Virgo', glyph: '♍', element: '土' },
    { name: '天秤', en: 'Libra', glyph: '♎', element: '风' },
    { name: '天蝎', en: 'Scorpio', glyph: '♏', element: '水' },
    { name: '射手', en: 'Sagittarius', glyph: '♐', element: '火' },
    { name: '摩羯', en: 'Capricorn', glyph: '♑', element: '土' },
    { name: '水瓶', en: 'Aquarius', glyph: '♒', element: '风' },
    { name: '双鱼', en: 'Pisces', glyph: '♓', element: '水' },
  ];
  function signOf(lon) { return SIGNS[Math.floor(norm360(lon) / 30)]; }
  function signIdx(lon) { return Math.floor(norm360(lon) / 30); }

  /* ---------- 城市经纬度 ---------- */
  const CITIES = {
    '北京': [39.9, 116.4], '上海': [31.2, 121.5], '广州': [23.1, 113.3], '深圳': [22.5, 114.1],
    '成都': [30.7, 104.1], '杭州': [30.3, 120.2], '武汉': [30.6, 114.3], '西安': [34.3, 108.9],
    '南京': [32.1, 118.8], '重庆': [29.6, 106.5], '天津': [39.1, 117.2], '苏州': [31.3, 120.6],
    '香港': [22.3, 114.2], '台北': [25.0, 121.5], '长沙': [28.2, 113.0], '青岛': [36.1, 120.4],
    '大连': [38.9, 121.6], '厦门': [24.5, 118.1], '郑州': [34.7, 113.7], '沈阳': [41.8, 123.4],
    '济南': [36.7, 117.0], '昆明': [25.0, 102.7], '哈尔滨': [45.8, 126.5], '合肥': [31.8, 117.3],
    '福州': [26.1, 119.3], '南宁': [22.8, 108.3], '贵阳': [26.6, 106.7], '兰州': [36.0, 103.8],
    '乌鲁木齐': [43.8, 87.6], '海口': [20.0, 110.3], '石家庄': [38.0, 114.5], '南昌': [28.7, 115.9],
    '太原': [37.9, 112.5], '长春': [43.9, 125.3], '呼和浩特': [40.8, 111.7], '银川': [38.5, 106.3],
    '西宁': [36.6, 101.8], '拉萨': [29.7, 91.1], '澳门': [22.2, 113.5], '其他（手动输入）': null,
  };

  /* ---------- 时间工具 ---------- */
  function julianDay(y, m, d, h) {
    if (m <= 2) { y--; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + h / 24;
  }

  /* ---------- 太阳（Meeus 25.2） ---------- */
  function sunPosition(T) {
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(rad(M))
      + (0.019993 - 0.000101 * T) * Math.sin(rad(2 * M))
      + 0.000289 * Math.sin(rad(3 * M));
    const lon = norm360(L0 + C);
    const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
    const v = M + C;
    const R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(rad(v)));
    return { lon, R, M: norm360(M) };
  }

  /* ---------- 月亮（Meeus 47.1 低精度） ---------- */
  function moonPosition(T) {
    const L = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699;
    const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000;
    const lon = L
      + 6.288774 * Math.sin(rad(Mp))
      + 1.274027 * Math.sin(rad(2 * D - Mp))
      + 0.658314 * Math.sin(rad(2 * D))
      + 0.213618 * Math.sin(rad(2 * Mp))
      - 0.185116 * Math.sin(rad(M))
      - 0.114332 * Math.sin(rad(2 * F))
      + 0.058793 * Math.sin(rad(2 * D - 2 * Mp))
      + 0.057066 * Math.sin(rad(2 * D - M - Mp))
      + 0.053322 * Math.sin(rad(2 * D + Mp))
      + 0.045758 * Math.sin(rad(2 * D - M))
      - 0.040923 * Math.sin(rad(M - Mp))
      - 0.034720 * Math.sin(rad(D))
      - 0.030383 * Math.sin(rad(M + Mp));
    return norm360(lon);
  }

  /* ---------- 行星轨道元素（Meeus 33.A/33.B 主项，T 修正仅平均黄经） ---------- */
  const PLANET_EL = {
    mercury: { name: '水星', sym: '☿', a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.25032350, w: 77.45779628, O: 48.33076593, Lr: 149472.6746 },
    venus: { name: '金星', sym: '♀', a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.97909950, w: 131.60246718, O: 76.67984255, Lr: 58517.81567 },
    mars: { name: '火星', sym: '♂', a: 1.52371034, e: 0.09339410, I: 1.84969142, L: 336.04083995, w: 23.56394424, O: 49.55953891, Lr: 19140.30268 },
    jupiter: { name: '木星', sym: '♃', a: 5.20288700, e: 0.04838624, I: 1.30439695, L: 34.39644051, w: 14.72847983, O: 100.47390909, Lr: 3034.74613 },
    saturn: { name: '土星', sym: '♄', a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, w: 92.59887831, O: 113.66242448, Lr: 1222.49362 },
    uranus: { name: '天王', sym: '♅', a: 19.18916464, e: 0.04725744, I: 0.77263783, L: 313.23810451, w: 170.95427630, O: 74.01692503, Lr: 428.48203 },
    neptune: { name: '海王', sym: '♆', a: 30.06992276, e: 0.00859048, I: 1.77004347, L: 304.34866548, w: 44.96476227, O: 131.78422574, Lr: 218.45961 },
    pluto: { name: '冥王', sym: '♇', a: 39.48211675, e: 0.24882730, I: 17.14001206, L: 238.92903833, w: 224.06891629, O: 110.30393684, Lr: 145.20780515 },
  };

  /* 轨道元素法求地心黄经 */
  function planetGeocentricLon(key, T, sun) {
    const p = PLANET_EL[key];
    const L = norm360(p.L + p.Lr * T);
    const M = rad(norm360(L - p.w)); // 平近点角
    // 解开普勒方程：E − e·sinE = M（迭代）
    let E = M;
    for (let i = 0; i < 20; i++) E = M + p.e * Math.sin(E);
    // 真近点角
    const v = 2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2));
    const r = p.a * (1 - p.e * Math.cos(E));
    // 日心黄道坐标
    const u = v + rad(p.w - p.O);
    const x = r * (Math.cos(rad(p.O)) * Math.cos(u) - Math.sin(rad(p.O)) * Math.sin(u) * Math.cos(rad(p.I)));
    const y = r * (Math.sin(rad(p.O)) * Math.cos(u) + Math.cos(rad(p.O)) * Math.sin(u) * Math.cos(rad(p.I)));
    // 地球日心坐标 ≈ 太阳地心的反方向
    const Ex = -sun.R * Math.cos(rad(sun.lon));
    const Ey = -sun.R * Math.sin(rad(sun.lon));
    // 行星地心黄经（忽略黄纬对视黄经的影响，近现代足够）
    return norm360(deg(Math.atan2(y - Ey, x - Ex)));
  }

  /* ---------- 黄赤交角 + 恒星时 + 上升/MC ---------- */
  function obliquity(T) { return 23.43929111 - 0.013004167 * T - 1.6389e-7 * T * T + 5.0361e-7 * T * T * T; }
  function gmst(JDN, T) {
    return norm360(280.46061837 + 360.98564736629 * (JDN - 2451545) + 0.000387933 * T * T - T * T * T / 38710000);
  }
  function angles(JDN, T, lat, lonEast) {
    const eps = rad(obliquity(T));
    const ramc = rad(gmst(JDN, T) + lonEast);
    // MC（黄经）
    let mc = deg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)));
    mc = norm360(mc);
    // ASC
    const tLat = rad(lat);
    let asc = deg(Math.atan2(-Math.cos(ramc), Math.sin(ramc) * Math.cos(eps) + Math.tan(tLat) * Math.sin(eps)));
    asc = norm360(asc);
    return { asc, mc, ramc: deg(ramc) };
  }

  /* ---------- 相位 ---------- */
  function aspects(planets) {
    const out = [];
    const orb = (p1, p2) => {
      const slow = ['uranus', 'neptune', 'pluto'];
      const light = ['sun', 'moon'];
      if (light.includes(p1.key) && light.includes(p2.key)) return 8;
      if (light.includes(p1.key) || light.includes(p2.key)) return 6.5;
      if (slow.includes(p1.key) || slow.includes(p2.key)) return 5;
      return 6;
    };
    const types = [
      { ang: 0, name: '合', tone: '强' }, { ang: 60, name: '六合', tone: '顺' },
      { ang: 90, name: '刑', tone: '紧' }, { ang: 120, name: '拱', tone: '吉' },
      { ang: 180, name: '冲', tone: '张' },
    ];
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        const a = planets[i], b = planets[j];
        const diff = norm360(a.lon - b.lon);
        const d = Math.min(diff, 360 - diff);
        for (const t of types) {
          if (Math.abs(d - t.ang) <= orb(a, b)) {
            out.push({ a: a.name + a.sym, b: b.name + b.sym, ka: a.key, kb: b.key, type: t.name, tone: t.tone, orb: Math.round(Math.abs(d - t.ang) * 10) / 10 });
            break;
          }
        }
      }
    }
    out.sort((x, y) => x.orb - y.orb);
    return out.slice(0, 6);
  }

  /* ---------- 主盘计算 ---------- */
  /* 从儒略日直接排盘（本命盘与时空盘共用） */
  function chartFromJDN(jdn, lat, lonEast) {
    const T = (jdn - 2451545.0) / 36525;
    const sun = sunPosition(T);
    const moon = moonPosition(T);
    const keys = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    const planets = [
      { key: 'sun', name: '太阳', sym: '☉', lon: sun.lon },
      { key: 'moon', name: '月亮', sym: '☽', lon: moon },
    ];
    keys.forEach((k) => planets.push({ key: k, name: PLANET_EL[k].name, sym: PLANET_EL[k].sym, lon: planetGeocentricLon(k, T, sun) }));
    const { asc, mc } = angles(jdn, T, lat, lonEast);
    planets.forEach((p) => {
      p.sign = signOf(p.lon);
      p.house = Math.floor(norm360(p.lon - asc) / 30) + 1;
      p.degInSign = Math.floor(norm360(p.lon) % 30);
    });
    const houses = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, cusp: norm360(asc + i * 30) }));
    return { planets, asc: { lon: asc, sign: signOf(asc) }, mc: { lon: mc, sign: signOf(mc) }, houses, T, jdn, _lat: lat, _lon: lonEast };
  }

  function computeChart(y, mo, d, hour, min, lat, lonEast) {
    const utcH = hour - 8 + min / 60; // 北京时间 → UTC
    const jdn = julianDay(y, mo, d, utcH);
    return chartFromJDN(jdn, lat, lonEast);
  }

  /* ---------- 儒略日 → 公历（马三推运用） ---------- */
  function jdnToDate(jdn) {
    const J = Math.floor(jdn + 0.5);
    const j = J + 32044;
    const g = Math.floor(j / 146097), dg = j % 146097;
    const c = Math.floor((Math.floor(dg / 36524) + 1) * 3 / 4), dc = dg - c * 36524;
    const b = Math.floor(dc / 1461), db = dc % 1461;
    const a = Math.floor((Math.floor(db / 365) + 1) * 3 / 4), da = db - a * 365;
    const y = g * 400 + c * 100 + b * 4 + a;
    const m = Math.floor((da * 5 + 308) / 153) - 2;
    const dd = da - Math.floor((m + 4) * 153 / 5) + 122;
    return { y: y - 4800 + Math.floor((m + 2) / 12), m: (m + 2) % 12 + 1, d: dd + 1 };
  }

  /* ---------- 关系盘引擎（比较 / 合盘 / 时空 / 马盘 / 马三） ---------- */
  /* 最短弧中点（合盘用） */
  function midLon(a, b) {
    let d = norm360(b - a);
    if (d > 180) d -= 360;
    return norm360(a + d / 2);
  }

  /* 单对相位判定（跨盘/同盘共用） */
  function aspectPair(lonA, lonB, keyA, keyB) {
    const orb = (k1, k2) => {
      const slow = ['uranus', 'neptune', 'pluto'];
      const light = ['sun', 'moon'];
      if (light.includes(k1) && light.includes(k2)) return 8;
      if (light.includes(k1) || light.includes(k2)) return 6.5;
      if (slow.includes(k1) || slow.includes(k2)) return 5;
      return 6;
    };
    const types = [
      { ang: 0, name: '合', tone: '强' }, { ang: 60, name: '六合', tone: '顺' },
      { ang: 90, name: '刑', tone: '紧' }, { ang: 120, name: '拱', tone: '吉' },
      { ang: 180, name: '冲', tone: '张' },
    ];
    const diff = norm360(lonA - lonB);
    const d = Math.min(diff, 360 - diff);
    for (const t of types) {
      if (Math.abs(d - t.ang) <= orb(keyA, keyB)) {
        return { type: t.name, tone: t.tone, orb: Math.round(Math.abs(d - t.ang) * 10) / 10 };
      }
    }
    return null;
  }

  /* 比较盘 Synastry：A 星 vs B 星相位 */
  function synastry(ca, cb) {
    const aspects = [];
    ca.planets.forEach((pa) => {
      cb.planets.forEach((pb) => {
        const ap = aspectPair(pa.lon, pb.lon, pa.key, pb.key);
        if (ap) aspects.push({ a: pa.name + pa.sym, b: pb.name + pb.sym, ka: pa.key, kb: pb.key, ...ap });
      });
    });
    aspects.sort((x, y) => x.orb - y.orb);
    return { a: ca, b: cb, aspects: aspects.slice(0, 12) };
  }

  /* 合盘 Composite：双方行星取最短弧中点 */
  function compositeChart(ca, cb) {
    const ascLon = midLon(ca.asc.lon, cb.asc.lon);
    const mcLon = midLon(ca.mc.lon, cb.mc.lon);
    const planets = ca.planets.map((pa, i) => {
      const lon = midLon(pa.lon, cb.planets[i].lon);
      return { ...pa, lon, sign: signOf(lon), degInSign: Math.floor(norm360(lon) % 30), house: Math.floor(norm360(lon - ascLon) / 30) + 1 };
    });
    const houses = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, cusp: norm360(ascLon + i * 30) }));
    return { planets, asc: { lon: ascLon, sign: signOf(ascLon) }, mc: { lon: mcLon, sign: signOf(mcLon) }, houses, _lat: (ca._lat + cb._lat) / 2, _lon: (ca._lon + cb._lon) / 2 };
  }

  /* 时空盘 Davison：双方时间/地点取中点后重新排盘 */
  function davisonChart(ca, cb) {
    const jdn = (ca.jdn + cb.jdn) / 2;
    const lat = (ca._lat + cb._lat) / 2;
    const lon = (ca._lon + cb._lon) / 2;
    const ch = chartFromJDN(jdn, lat, lon);
    const dt = jdnToDate(jdn);
    ch.dateText = dt.y + '年' + dt.m + '月' + dt.d + '日（双方出生中点时刻）';
    return ch;
  }

  /* 马盘（马克思盘，演绎版）：合盘行星 + 时空盘宫位 —— 内心感受层 */
  function marsChart(ca, cb) {
    const comp = compositeChart(ca, cb);
    const dav = davisonChart(ca, cb);
    const planets = comp.planets.map((p) => {
      const house = Math.floor(norm360(p.lon - dav.asc.lon) / 30) + 1;
      return { ...p, house };
    });
    return { planets, asc: dav.asc, mc: dav.mc, houses: dav.houses, dateText: dav.dateText, _jdn: dav.jdn, _lat: dav._lat, _lon: dav._lon };
  }

  /* 马三（马克思三限，演绎版）：马盘推进，1 天 = 1 年 */
  function marsTertiary(ca, cb, nowYear) {
    const m = marsChart(ca, cb);
    const avgYear = jdnToDate(m._jdn).y;
    const ageDays = Math.max(1, Math.round(nowYear - avgYear));
    const jdn3 = m._jdn + ageDays;
    const ch3 = chartFromJDN(jdn3, m._lat, m._lon);
    const planets = ch3.planets.map((p) => ({ ...p, house: Math.floor(norm360(p.lon - m.asc.lon) / 30) + 1 }));
    return { planets, asc: m.asc, mc: m.mc, houses: m.houses, dateText: m.dateText + ' · 三限推进' + ageDays + '天' };
  }

  /* ---------- 关系盘解读 ---------- */
  function interpretRelation(chart, type, aName, bName) {
    const P = (k) => chart.planets.find((p) => p.key === k);
    const sn = (k) => { const p = P(k); return p ? p.sign.name : ''; };
    const dm = `${aName} × ${bName}`;
    const parts = [];
    if (type === 'synastry') {
      const sunMoon = chart.aspects.find((x) => (x.ka === 'sun' && x.kb === 'moon') || (x.ka === 'moon' && x.kb === 'sun'));
      const venMars = chart.aspects.filter((x) => (x.ka === 'venus' && x.kb === 'mars') || (x.ka === 'mars' && x.kb === 'venus'));
      const saturn = chart.aspects.filter((x) => x.ka === 'saturn' || x.kb === 'saturn');
      parts.push(
        `把你们的两张本命盘叠在一起，看的是「气场怎么碰」。${dm}——`,
        sunMoon ? `最值得注意的一笔：一方的太阳/月亮与另一方成「${sunMoon.type}」（${sunMoon.orb}°）——直接作用在「第一眼感觉」上，${
          ['吉', '顺', '强'].includes(sunMoon.tone) ? '吸引力来得自然，见面就想多说几句。' : '来电快，但情绪也容易互踩，需要磨合说话的分寸。'}`
          : '日月之间没有强相位，吸引力不在第一眼，而在相处久了以后慢慢沉淀出来的。',
        venMars.length
          ? `金星与火星之间有${venMars.map((x) => `「${x.a} ${x.type} ${x.b}」`).join('、')}——身体层面的化学反应，${
              venMars.some((x) => ['吉', '顺'].includes(x.tone)) ? '亲密感来得顺，彼此都愿意靠近。' : '冲动与占有并存，火花大，但需要学会刹车。'}`
          : '金火之间没有直接相位，激情靠日常经营，不会一上来就天雷地火。',
        saturn.length
          ? `土星出现在你们之间（${saturn.map((x) => `「${x.a} ${x.type} ${x.b}」`).join('、')}）——这段关系自带「责任」的味道：要么奔着长久去的认真，要么是现实的约束。它让感情沉，也让它重。`
          : '你们之间没有土星的重压，相处轻快，但长久的承诺需要自己主动去谈。',
      );
    } else if (type === 'composite') {
      parts.push(
        `合盘把你们俩「合成一个人」看——描述这段关系作为一个整体的性格。${dm}的关系，整体气质是：`,
        `太阳落${sn('sun')}：这段关系对外呈现的样子——${relSunTalk(sn('sun'))}`,
        `月亮落${sn('moon')}：这段关系私底下的情绪底色——${relMoonTalk(sn('moon'))}`,
        `金星落${sn('venus')}：你们相处最舒服的模式——${relVenusTalk(sn('venus'))}`,
        `土星落${sn('saturn')}：这段关系要过的坎——${relSaturnTalk(sn('saturn'))}`,
      );
    } else if (type === 'davison') {
      parts.push(
        `时空盘取的是你们出生时间与地点的「正中间」——它不看两个人，看的是这段关系自己的命。${dm}，关系本身的长势是：`,
        `太阳落${sn('sun')}：关系走到中后期会长成什么样——${relSunTalk(sn('sun'))}`,
        `月亮落${sn('moon')}：关系最真实的需求——${relMoonTalk(sn('moon'))}`,
        `上升落${chart.asc.sign.name}：这段关系给外人的印象——${ascTalk(chart.asc.sign.name)}`,
        `MC 落${chart.mc.sign.name}：关系在事业与公众层面的展开——${mcTalk(chart.mc.sign.name)}`,
      );
    } else if (type === 'mars') {
      parts.push(
        `马克思盘是「你心里怎么感受这段关系」的镜头——${dm}，落在心里那层的感觉是：`,
        `太阳落${sn('sun')}：你在这段关系里最在意的自我位置——${relSunTalk(sn('sun'))}`,
        `月亮落${sn('moon')}：你心底的安全感来源与缺口——${relMoonTalk(sn('moon'))}`,
        `金星落${sn('venus')}：你愿意为这段关系付出什么——${relVenusTalk(sn('venus'))}`,
        `火星落${sn('mars')}：你在这段关系里容易较劲的地方——${relMarsTalk(sn('mars'))}`,
      );
    } else if (type === 'mars3') {
      const vt = aspectToneOf(chart, 'venus', 'moon');
      parts.push(
        `马三是马盘的快进——把时间轴拉近，看这段关系「当下的心跳」。${dm}，最近这段日子的能量是：`,
        `月亮落${sn('moon')}：最近情绪的主导色——${relMoonTalk(sn('moon'))}`,
        `金星落${sn('venus')}：最近相处舒适区与摩擦点——${relVenusTalk(sn('venus'))}`,
        `火星落${sn('mars')}：最近容易爆发争执的引信——${relMarsTalk(sn('mars'))}`,
        `${['吉', '顺', '强'].includes(vt) ? '金星与月亮处于顺相位，这段日子是滋养期，适合把关系往深里推。' : '金星与月亮相位偏紧，这段日子略有心浮，沟通时话到嘴边留半句，等风头过了再谈正事。'}`,
      );
    }
    parts.push(`——盘是参考，路是两个人走出来的。${aName}与${bName}的答案，在你们每天的选择里。`);
    return parts.join('\n');
  }

  /* 关系盘小话术 */
  const relSunTalk = (s) => ({ '白羊': '外放、要强，这段关系带着冲劲，但也要防一言不合就较劲。', '金牛': '稳、实、慢热，关系像老树扎根，越久越结实。', '双子': '轻松、话多、好奇心驱动，新鲜感是燃料，怕的是热得快凉得也快。', '巨蟹': '顾家、念旧，关系里带着暖意，最怕伤到安全感。', '狮子': '体面、仗义，这段关系要面子，公开场合给足彼此存在感。', '处女': '细、较真、讲道理，关系靠磨合出默契，容不得糊弄。', '天秤': '平衡、体面，关系里最怕失衡，一旦天平歪了就会冷战。', '天蝎': '深、烈、占有感强，关系浓度高，信任是地基。', '射手': '自由、乐观、奔着远方，关系需要各自的空间来呼吸。', '摩羯': '克制、务实、奔着长久去，感情藏在行动里，不说甜话但扛事。', '水瓶': '独立、特别、不按常理，关系像两个自由人的联盟。', '双鱼': '柔、共情、爱幻想，关系带着浪漫滤镜，怕滤镜碎了要面对现实。' }[s] || '平顺中带着自己的节奏。');
  const relMoonTalk = (s) => ({ '白羊': '情绪来得快去得也快，生气不过夜，哄一下就好。', '金牛': '需要稳定和实际的安全感——饭搭子、钱袋子、窝在一起。', '双子': '心里话多，但藏不住也留不住，聊开就没事。', '巨蟹': '敏感、念旧，一句话能暖一天也能扎一天，要小心说话。', '狮子': '要面子式安全感，被认可就满血复活。', '处女': '操心型，总在替对方想，累了自己也要被照顾。', '天秤': '怕冲突，情绪藏起来，等爆的时候已经积了很久。', '天蝎': '情绪深不见底，信就全给，疑就全收。', '射手': '心大，情绪来得快去得也快，最怕被管束。', '摩羯': '情绪不外露，但压力都在心里扛，要主动给台阶。', '水瓶': '情绪要抽离处理，需要个人空间来消化。', '双鱼': '共情过载，容易把对方的情绪当自己的，需要被托底。' }[s] || '平稳内敛。');
  const relVenusTalk = (s) => ({ '白羊': '喜欢直球表达，送礼要快、要亮眼、要带劲儿。', '金牛': '喜欢实在的享受，一起吃好吃的比什么都管用。', '双子': '喜欢聊得来，精神共鸣是第一需求。', '巨蟹': '喜欢被照顾的日常感，一碗热汤胜过千言万语。', '狮子': '喜欢被捧着的仪式感，仪式感给足，关系就顺。', '处女': '喜欢细节里的用心，小处见真章。', '天秤': '喜欢美和平衡，约会要体面，礼物要好看。', '天蝎': '喜欢深度的连接，礼物和情话都要走心。', '射手': '喜欢一起玩、一起冒险，关系要有新鲜空气。', '摩羯': '喜欢稳和实，行动派的爱，说到做到。', '水瓶': '喜欢精神共鸣和自由，别用世俗标准框住爱。', '双鱼': '喜欢浪漫和陪伴，心软，最吃温柔那一套。' }[s] || '细水长流。');
  const relSaturnTalk = (s) => ({ '白羊': '要过的坎是耐心——都太急，慢下来才能久。', '金牛': '要过的坎是改变——太舒服会懒得动，关系需要新刺激。', '双子': '要过的坎是深度——聊得太多太浅，要敢碰认真的话题。', '巨蟹': '要过的坎是安全感——把「怕失去」说出口，才能一起面对。', '狮子': '要过的坎是面子——放下输赢，关系才能赢。', '处女': '要过的坎是挑剔——完美主义会伤人，学着接受「够好」。', '天秤': '要过的坎是决断——总想两全，关键时刻要敢选。', '天蝎': '要过的坎是信任——疑心是最大的内耗。', '射手': '要过的坎是承诺——自由与责任要找到一个平衡点。', '摩羯': '要过的坎是表达——把爱说出来，别只做不说。', '水瓶': '要过的坎是亲密——再独立，也要允许自己被需要。', '双鱼': '要过的坎是边界——心太软，也要学会说不。' }[s] || '是责任也是考题，过了就更牢固。');
  const relMarsTalk = (s) => ({ '白羊': '容易在「谁说了算」上较劲，赢了道理输了感情。', '金牛': '容易在「钱和懒」上较劲，最怕被催。', '双子': '容易在「讲道理」上较劲，赢了嘴仗输了气氛。', '巨蟹': '容易在「你不懂我」上较劲，情绪一上来就冷战。', '狮子': '容易在「你不给我面子」上较劲。', '处女': '容易在「你不按标准来」上较劲。', '天秤': '容易在「你为什么不平衡」上较劲。', '天蝎': '容易在「你是不是瞒着我」上较劲。', '射手': '容易在「你管我」上较劲，越管越跑。', '摩羯': '容易在「你不上进」上较劲。', '水瓶': '容易在「你太俗/太黏」上较劲。', '双鱼': '容易在「你不够懂我」上较劲，委屈感上头。' }[s] || '要避免的是把小事吵成大伤。');
  const ascTalk = (s) => ({ '白羊': '风风火火的一对，看着就有冲劲。', '金牛': '安稳踏实的一对，让人羡慕的「过日子」范儿。', '双子': '热闹话多的一对，走到哪都是气氛组。', '巨蟹': '温情低调的一对，家庭感很重。', '狮子': '高调耀眼的一对，站在一起就有排面。', '处女': '讲究细节的一对，精致但偶尔挑剔。', '天秤': '体面优雅的一对，外人眼里总是和谐的。', '天蝎': '神秘深沉的组合，外人看不透你们的底。', '射手': '阳光自由的一对，总在路上。', '摩羯': '成熟稳重的一对，目标感很强。', '水瓶': '特立独行的组合，不按常理出牌。', '双鱼': '浪漫感伤的一对，自带故事感。' }[s] || '有自己的气场。');
  const mcTalk = (s) => ({ '白羊': '关系在事业上走得冲，适合一起打头阵。', '金牛': '关系在事业上重积累，慢工出细活。', '双子': '关系在事业上有信息优势，适合做沟通型的事。', '巨蟹': '关系在事业上靠人脉和口碑，人情是资产。', '狮子': '关系在事业上要站台，公开成绩是最好的润滑剂。', '处女': '关系在事业上靠专业度，细节决定评价。', '天秤': '关系在事业上擅长协调，是团队的粘合剂。', '天蝎': '关系在事业上适合做深水区的事，越深越有分量。', '射手': '关系在事业上适合向外开拓，远方有你们的局。', '摩羯': '关系在事业上要熬，但熬出来的都是硬的。', '水瓶': '关系在事业上适合新赛道，越先锋越顺。', '双鱼': '关系在事业上靠创意和共情，做内容有天分。' }[s] || '稳步展开。');
  function aspectToneOf(chart, k1, k2) {
    const p1 = chart.planets.find((p) => p.key === k1), p2 = chart.planets.find((p) => p.key === k2);
    if (!p1 || !p2) return '中';
    const ap = aspectPair(p1.lon, p2.lon, k1, k2);
    return ap ? ap.tone : '中';
  }

  /* ---------- 解读文本 ---------- */
  const PLANET_THEME = {
    sun: ['自我', '你的人生主轴'],
    moon: ['情绪', '你内心安全感'],
    mercury: ['思维', '你如何想与说'],
    venus: ['爱与审美', '你如何去爱'],
    mars: ['行动与欲望', '你如何争取'],
    jupiter: ['幸运与扩张', '你的机会所在'],
    saturn: ['责任与课题', '你要修炼的功课'],
    uranus: ['独立与变革', '你突破常规的方式'],
    neptune: ['灵感与幻梦', '你的灵性触角'],
    pluto: ['深层转化', '你脱胎换骨之处'],
  };
  const SIGN_TRAIT = [
    '白羊：直接、要强、先做了再说', '金牛：稳、恋物、慢热但深情', '双子：机敏、话多、好奇心重',
    '巨蟹：护家、念旧、情绪细腻', '狮子：要面子、仗义、舞台中央', '处女：细致、挑剔、心里有标准',
    '天秤：怕冲突、要体面、权衡高手', '天蝎：藏得深、爱憎分明、洞察力强', '射手：要自由、心大、奔着远方去',
    '摩羯：能忍、自律、把目标刻在骨子里', '水瓶：特立独行、交朋友不看圈子', '双鱼：共情强、容易想多、心软',
  ];
  const HOUSE_THEME = [
    '自我形象与人生方向', '钱财与自我价值', '沟通、学习、手足邻里',
    '家庭、根基、内在安全感', '恋爱、创作、表达自我', '日常工作、身体、服务',
    '伴侣、合作关系、明面敌人', '深层资源、债务、亲密共享', '远方、高等教育、信仰',
    '事业、名声、社会责任', '社交、圈层、理想愿景', '潜意识、隐秘、幕后功课',
  ];
  const ASPECT_TXT = {
    '合': (x) => `${x}合相——两颗星能量拧成一股，作用在一个人身上：既是天赋，也是功课，成也在此、败也在此。`,
    '六合': (x) => `${x}六合——两股力量彼此照应，属于「顺手」的相位：机会来了你能接住，只是未必会主动去追。`,
    '刑': (x) => `${x}刑相——两股力量互相拉扯，是盘里最「磨人」的位置：它逼你在冲突里成长，绕不过去，只能翻过去。`,
    '拱': (x) => `${x}拱相——天然的和谐相位：这两股能量合作无间，是盘里最「省力」的礼物，好好用它。`,
    '冲': (x) => `${x}冲相——两股力量正面相对，像拔河：一面推你东，一面拉你西，而平衡点就是你成熟的坐标。`,
  };

  function planetReading(p) {
    const theme = PLANET_THEME[p.key];
    const trait = SIGN_TRAIT[signIdx(p.lon)];
    const house = HOUSE_THEME[p.house - 1];
    return `${p.name}${p.sym}落在${p.sign.name}（${p.sign.glyph}），落第 ${p.house} 宫（${house}）。${theme[1]}是「${trait}」——这一层，是你人生里比较本能的反应模式。`;
  }

  function interpret(chart, birthText) {
    const parts = [];
    const sun = chart.planets[0], moon = chart.planets[1];
    // 三轴
    parts.push(`你的三根支柱——太阳（${sun.sign.name}）、月亮（${moon.sign.name}）、上升（${chart.asc.sign.name}）：太阳是你想成为的样子，月亮是你安心的方式，上升是你给人的第一印象。三者${sun.sign.element === moon.sign.element ? '气质同频，里外一致' : '元素不同，外在与内心存在张力——处世先安内，再攘外'}。`);
    parts.push('');
    // 行星逐宫
    chart.planets.forEach((p) => parts.push(planetReading(p)));
    parts.push('');
    // 相位
    const asp = aspects(chart.planets);
    if (asp.length) {
      parts.push('【几处要紧的相位】');
      asp.forEach((a) => parts.push('· ' + ASPECT_TXT[a.type](`${a.a} — ${a.b}`)));
    }
    parts.push('');
    // 上升与 MC
    parts.push(`上升落在${chart.asc.sign.name}（${chart.asc.sign.glyph}），中天（MC）落在${chart.mc.sign.name}——上升是你「出场的方式」，中天指向你「登上的舞台」：${HOUSE_THEME[9]}。`);
    return ToneEngine.wrap(parts.join('\n'), { title: null, opening: true, ending: true });
  }

  function summarize(chart) {
    const sun = chart.planets[0], moon = chart.planets[1];
    const strong = aspects(chart.planets)[0] || null;
    return [
      `你是「${chart.asc.sign.name}的壳、${sun.sign.name}的核、${moon.sign.name}的心」——三轴合起来，才是完整的你。`,
      strong ? `盘里最紧的相位是「${strong.a} ${strong.type} ${strong.b}」（容许度 ${strong.orb}°）：${ASPECT_TXT[strong.type](`${strong.a} — ${strong.b}`).replace(/——.*。/, '。')}` : '盘面相位温和，人生起伏不算剧烈，稳稳经营即是上策。',
      '星盘画的是先天倾向，后天选择才是真正的你。行己所爱，即为上策。',
    ];
  }

  /* ---------- 行运盘 Transit（当前行星 vs 本命，看近期运势） ---------- */
  function transit(natal, nowDate) {
    const now = nowDate || new Date();
    const utcH = now.getHours() - 8 + now.getMinutes() / 60;
    const jdn = julianDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), utcH);
    const T = (jdn - 2451545.0) / 36525;
    const sun = sunPosition(T);
    const moon = moonPosition(T);
    const keys = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    const tPlanets = [
      { key: 'sun', name: '太阳', sym: '☉', lon: sun.lon },
      { key: 'moon', name: '月亮', sym: '☽', lon: moon },
    ];
    keys.forEach((k) => tPlanets.push({ key: k, name: PLANET_EL[k].name, sym: PLANET_EL[k].sym, lon: planetGeocentricLon(k, T, sun) }));
    // 行运行星落本命宫位 + 落座
    const ascLon = natal.asc.lon;
    tPlanets.forEach((p) => {
      p.sign = signOf(p.lon);
      p.house = Math.floor(norm360(p.lon - ascLon) / 30) + 1;
      p.degInSign = Math.floor(norm360(p.lon) % 30);
    });
    // 行运相位：行运行星 vs 本命行星（快行星看日常，慢行星看阶段）
    const tAspects = [];
    const fast = ['moon', 'mercury', 'venus', 'mars', 'sun'];
    const slow = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    tPlanets.forEach((tp) => {
      natal.planets.forEach((np) => {
        // 慢行星行运只对本命快行星看；快行星行运对本命所有行星看（简化：互看但去重日月组）
        if (slow.includes(tp.key) && slow.includes(np.key)) return;
        const ap = aspectPair(tp.lon, np.lon, tp.key, np.key);
        if (ap) tAspects.push({ a: tp.name + tp.sym, b: np.name + np.sym, ka: tp.key, kb: np.key, ...ap });
      });
    });
    tAspects.sort((x, y) => x.orb - y.orb);
    return { planets: tPlanets, aspects: tAspects.slice(0, 12), jdn, dateText: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') };
  }

  /* 行运解读：结合行运行星落宫 + 与本命相位 */
  function interpretTransit(t, natal) {
    const PLANET_CN = { sun: '太阳', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星', saturn: '土星', uranus: '天王', neptune: '海王', pluto: '冥王' };
    const HOUSE_THEME = ['自我', '财帛', '沟通', '家庭', '恋爱', '工作', '伴侣', '深层', '远行', '事业', '社交', '隐秘'];
    const lines = [];
    lines.push(`现在是 ${t.dateText} 的行运盘——把「此刻的天空」叠在你的本命盘上，看近期这股能量在推你往哪走。`);
    // 慢行星行运（阶段性能量）落宫
    ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].forEach((k) => {
      const p = t.planets.find((x) => x.key === k);
      if (!p) return;
      const houseTheme = HOUSE_THEME[p.house - 1] || '未知';
      const line = {
        jupiter: `木星正行运到你的${p.house}宫（${houseTheme}）——扩张的能量在这里：${p.house === 10 ? '事业上有贵人、有上升窗口，该争取就争取。' : p.house === 7 ? '关系上有扩展，单身易遇桃花，有伴的更亲密。' : p.house === 2 ? '财运上有机会，正财偏财都活络。' : '这个领域在「涨」，顺势而为。'}`,
        saturn: `土星正行运到你的${p.house}宫（${houseTheme}）——考验的能量在这里：${p.house === 10 ? '事业进入"打磨期"，慢工出细活，扛住就是晋升。' : p.house === 7 ? '关系要过"现实关"——承诺、责任、见真章。' : p.house === 2 ? '财务要收紧，忌大额开销与杠杆。' : '这个领域在「补课」，别躲。'}`,
        uranus: `天王星正行运到你的${p.house}宫（${houseTheme}）——突变与自由的能量：${p.house === 10 ? '事业可能突生变动，是意外也是破局。' : p.house === 7 ? '关系需要呼吸感，太紧会爆。' : '这个领域有「意外之变」，保持弹性。'}`,
        neptune: `海王星正行运到你的${p.house}宫（${houseTheme}）——梦幻与直觉的能量：灵感好但边界模糊，${p.house === 12 ? '适合闭关沉淀、灵性功课。' : '防被骗、防想太多，落地再信。'}`,
        pluto: `冥王星正行运到你的${p.house}宫（${houseTheme}）——深层转化的能量：这个领域正在"脱胎换骨"，${p.house === 8 ? '财务与亲密关系有深度课题。' : '过程会有点痛，但出来是新的你。'}`,
      }[k];
      lines.push(line);
    });
    // 行运月亮（每日情绪）
    const tm = t.planets.find((x) => x.key === 'moon');
    if (tm) lines.push(`行运月亮正在${tm.sign.name}——最近几天情绪底色是${['白羊', '狮子', '射手'].includes(tm.sign.name) ? '热的：想动、想表达、想做就做。' : ['金牛', '处女', '摩羯'].includes(tm.sign.name) ? '稳的：适合收尾、整理、务实做事。' : ['双子', '天秤', '水瓶'].includes(tm.sign.name) ? '活的：适合社交、沟通、换换脑子。' : '柔的：适合休息、陪伴、照顾情绪。'}`);
    // 关键行运相位
    const strong = t.aspects.filter((a) => ['紧', '张'].includes(a.tone)).slice(0, 3);
    const good = t.aspects.filter((a) => ['吉', '顺'].includes(a.tone)).slice(0, 3);
    if (good.length) lines.push(`行运顺相位：${good.map((a) => a.a + a.type + a.b).join('、')}——${goodTone(good[0])}`);
    if (strong.length) lines.push(`行运紧相位：${strong.map((a) => a.a + a.type + a.b).join('、')}——${tightTone(strong[0])}`);
    lines.push('——行运是「天时」，命盘是「地势」，怎么走，还是你说了算。');
    return lines.join('\n');

    function goodTone(a) {
      const ka = PLANET_CN[a.ka] || a.a;
      return `${ka}带来顺风，适合推进、表达、遇见。`;
    }
    function tightTone(a) {
      const ka = PLANET_CN[a.ka] || a.a;
      return `${ka}带来张力，是提醒不是判决——放慢、核对、别硬来。`;
    }
  }

  global.AstrologyEngine = { SIGNS, CITIES, computeChart, chartFromJDN, aspects, interpret, summarize, synastry, compositeChart, davisonChart, marsChart, marsTertiary, interpretRelation, transit, interpretTransit };
})(window);
