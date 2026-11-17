/* ===========================================================
 * patterns.js — 弹幕图案库
 * 所有发射器都以「帧」为节奏单位，由 Boss 符卡脚本组合调用。
 * =========================================================== */
(function () {
  const G = window.G, M = G.M, TAU = G.TAU;
  const P = G.PAT = {};

  function aim(x, y) {
    const p = G.player;
    return p ? Math.atan2(p.y - y, p.x - x) : Math.PI / 2;
  }
  P.aim = aim;
  P.playerPos = () => G.player ? { x: G.player.x, y: G.player.y } : { x: G.PF.w / 2, y: G.PF.h * .8 };

  /* 统一默认值 */
  function base(o) {
    const r = Object.assign({
      x: G.boss ? G.boss.x : G.PF.w / 2,
      y: G.boss ? G.boss.y : G.PF.h * .25,
      n: 16, speed: 150, a0: 0, r: 6, color: 'red', type: 'orb',
      curve: 0, accel: 0, spin: 0, life: 14, delay: 0, scale: 1
    }, o);
    /* 记录调用方是否显式给了坐标：落雨 / 弹墙若未给 y，
       必须从画面上方进场，不能误用 Boss 的 y 坐标而在 Boss 身边凭空生成一排弹。 */
    r._yGiven = !!(o && o.y !== undefined);
    r._xGiven = !!(o && o.x !== undefined);
    /* ---------- 难度的结构化密度 ----------
       不再随机跳过 / 随机补弹（那会在环和花瓣上咬出缺口，破坏对称）。
       改为按图案本身的计数单位缩放：环的 n 保持 4 的倍数，臂数 / 层数 /
       行列数取整，墙的间距反比缩放 —— Easy 只是「疏而完整」，
       Lunatic 是「密而有序」，每一档都仍然是闭合、等距、可阅读的图案。 */
    const d = G.diff || G.DIFFS[1];
    /* 杂鱼发弹走独立的低密度：Boss 的 density 只作用于 Boss 弹幕。
       小怪靠「数量」制造压迫感，单只的弹幕大幅削减，高难度才躲得开。 */
    const ns = G._fireFrom === 'enemy' ? .38 : (d.density || 1);
    /* Normal 是绝对基准：所有计数原样保留，只加轻微的花瓣起伏。 */
    const rawN = o && o.n !== undefined ? o.n : 16;
    r.n = ns === 1 ? rawN
      : (rawN >= 6 ? Math.max(4, Math.round(rawN * ns / 4) * 4)
        : Math.max(1, Math.round(rawN * ns)));
    for (const k of ['arms', 'layers', 'cols', 'rows', 'k']) {
      if (o && o[k] !== undefined)
        r[k] = ns === 1 ? o[k]
          : Math.max(k === 'layers' || k === 'rows' ? 1 : 2, Math.round(o[k] * ns));
    }
    if (o && o.step !== undefined)
      r.step = ns === 1 ? o.step : Math.max(16, Math.round(o.step / ns));
    /* 排列美感：环的速度按花瓣数作轻微正弦起伏，高难度起伏略大，
       让「更密」同时呈现更明显的花瓣层次，而不是一堆同心圆。 */
    r.ripple = o && o.ripple !== undefined ? o.ripple : (.05 + Math.max(0, ns - 1) * .10);
    /* noDiffAngle：完全水平 / 竖直的激光要求造型跨难度一致，
       跳过难度角度偏移，否则横向谱线在各难度会微微倾斜。 */
    r.a0 = (o && o.a0 || 0) + ((o && o.noDiffAngle) ? 0 : (ns - 1) * .05);
    return r;
  }
  function emit(o, a, sp) {
    /* 密度由 base() 结构化处理；此处只统一施加难度弹速倍率，
       保证每个图案的对称性与均匀间距不被随机删改破坏。 */
    const d = G.diff || G.DIFFS[1];
    const s = (sp === undefined ? o.speed : sp) * d.speedMul;
    const make = (ang, speed) => G.spawnBullet({
      x: o.x, y: o.y, angle: ang, speed, r: o.r, color: o.color, type: o.type,
      curve: o.curve, accel: o.accel, minSpeed: o.minSpeed, maxSpeed: o.maxSpeed,
      spin: o.spin, life: o.life, delay: o.delay, scale: o.scale,
      /* 未显式指定时交给 spawnBullet 按贴图类型自动决定方向适配 */
      rotToVel: o.rotToVel,
      wave: o.wave, waveF: o.waveF, waveA: o.waveA,
      bounce: o.bounce, homing: o.homing, homingT: o.homingT,
      split: o.split, splitN: o.splitN, splitT: o.splitT,
      fadeIn: o.fadeIn, tag: o.tag
    });
    return make(a, s);
  }

  /* ---------- 基础：均匀环 ---------- */
  P.ring = function (o) {
    o = base(o);
    for (let i = 0; i < o.n; i++) {
      const a = o.a0 + i / o.n * TAU;
      const sp = o.speed * (1 + (o.ripple || 0) * Math.cos((o.petals || 6) * (a - o.a0)));
      emit(o, a, sp);
    }
    return o.n;
  };

  /* ---------- 多层环（速度 / 颜色交替） ---------- */
  P.multiRing = function (o) {
    o = base(o);
    const layers = o.layers || 3, colors = o.colors || [o.color];
    for (let L = 0; L < layers; L++) {
      const n = o.n + L * (o.nStep || 0);
      const sp = o.speed + L * (o.speedStep || 26);
      const col = colors[L % colors.length];
      for (let i = 0; i < n; i++)
        emit(Object.assign({}, o, { color: col, r: o.r + L * (o.rStep || 0) }),
          o.a0 + (i + L * .5) / n * TAU + L * (o.rotStep || .09), sp);
    }
  };

  /* ---------- 螺旋臂 ---------- */
  P.spiral = function (o) {
    o = base(o);
    const arms = o.arms || 3;
    for (let i = 0; i < arms; i++) {
      const a = o.a0 + i / arms * TAU;
      emit(o, a, o.speed);
      if (o.twin) emit(Object.assign({}, o, { color: o.color2 || o.color }), a + Math.PI, o.speed * (o.twinRatio || 1));
    }
  };

  /* ---------- 花瓣（速度随角度正弦起伏） ---------- */
  P.flower = function (o) {
    o = base(o);
    const petals = o.petals || 5, n = o.n || 40;
    for (let i = 0; i < n; i++) {
      const a = o.a0 + i / n * TAU;
      const sp = o.speed * (1 + (o.amp || .45) * Math.cos(petals * (a - o.a0)));
      emit(o, a, sp);
    }
  };

  /* ---------- 星形速度分布 ---------- */
  P.star = function (o) {
    o = base(o);
    const pts = o.points || 5, n = o.n || 36;
    for (let i = 0; i < n; i++) {
      const a = o.a0 + i / n * TAU;
      const k = Math.abs(Math.cos(pts * (a - o.a0) / 2));
      emit(o, a, o.speed * (.55 + .75 * k));
    }
  };

  /* ---------- 扇形 / 瞄准 n-way ---------- */
  P.fan = function (o) {
    o = base(o);
    const target = o.aim === false ? o.a0 : (o.a0 + aim(o.x, o.y));
    const spread = o.spread === undefined ? .8 : o.spread;
    const n = o.n || 7;
    for (let i = 0; i < n; i++) {
      const a = target + (n === 1 ? 0 : (i / (n - 1) - .5) * spread);
      emit(o, a, o.speed * (o.speedVar ? (1 + M.rand(-o.speedVar, o.speedVar)) : 1));
    }
  };

  /* ---------- 随机散弹 ---------- */
  P.scatter = function (o) {
    o = base(o);
    for (let i = 0; i < o.n; i++)
      emit(o, o.a0 + M.rand(-(o.spread || .6), o.spread || .6), M.rand(o.speed * .55, o.speed * 1.25));
  };

  /* ---------- 顶部落雨 ---------- */
  P.rain = function (o) {
    o = base(o);
    const W = G.PF.w, y0 = o._yGiven ? o.y : -10;
    for (let i = 0; i < o.n; i++) {
      const x = o.fixedX ? o.x : M.rand(14, W - 14);
      emit(Object.assign({}, o, { x, y: y0 }),
        Math.PI / 2 + M.rand(-(o.spread || .12), o.spread || .12),
        o.speed * M.rand(.8, 1.2));
    }
  };

  /* ---------- 弹墙（留安全缺口） ---------- */
  P.wall = function (o) {
    o = base(o);
    const W = G.PF.w, gap = o.gap === undefined ? M.rand(40, W - 40) : o.gap;
    const gapW = o.gapW || 70, y0 = o._yGiven ? o.y : -8;
    for (let x = 12; x < W - 12; x += o.step || 24) {
      if (Math.abs(x - gap) < gapW) continue;
      emit(Object.assign({}, o, { x, y: y0 }), Math.PI / 2, o.speed);
    }
  };

  /* ---------- 曲线环（弹道缓慢弯折） ---------- */
  P.curveRing = function (o) {
    o = base(o);
    for (let i = 0; i < o.n; i++) {
      const a = o.a0 + i / o.n * TAU;
      const cc = (i % 2 ? 1 : -1) * (o.curve || .35);
      emit(Object.assign({}, o, { curve: cc }), a, o.speed);
    }
  };

  /* ---------- 延迟起动 / 变速大玉 ---------- */
  P.delayed = function (o) {
    o = base(o);
    for (let i = 0; i < o.n; i++) {
      const a = o.a0 + i / o.n * TAU;
      emit(Object.assign({}, o, { delay: o.delay || .35, accel: o.accel || 240 }), a, o.speed * .18);
    }
  };

  /* ---------- 爆散弹（飞到一半再分裂） ---------- */
  P.burst = function (o) {
    o = base(o);
    for (let i = 0; i < o.n; i++) {
      const a = o.a0 + i / o.n * TAU;
      emit(Object.assign({}, o, {
        split: 1, splitN: o.splitN || 5, splitT: o.splitT || .6,
        color: o.color, type: o.seedType || 'big'
      }), a, o.speed);
    }
  };

  /* ---------- 镜面对称（以画面中轴反射） ---------- */
  P.mirror = function (o) {
    o = base(o);
    const W = G.PF.w, n = o.n || 10;
    for (let i = 0; i < n; i++) {
      const a = o.a0 + (i / (n - 1) - .5) * (o.spread || 1.5);
      emit(o, a, o.speed);
      emit(Object.assign({}, o, { x: W - o.x, color: o.color2 || o.color }), Math.PI - a, o.speed);
    }
  };

  /* ---------- 书法笔势：沿曲线排布札弹 ---------- */
  P.calligraphy = function (o) {
    o = base(o);
    const n = o.n || 14, W = G.PF.w;
    const seed = o.seed || 0;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = o.x0 + (o.x1 - o.x0) * t + Math.sin(t * 7 + seed) * (o.wave || 34);
      const y = o.y0 + (o.y1 - o.y0) * t + Math.cos(t * 5 + seed) * (o.waveY || 18);
      emit(Object.assign({}, o, { x, y, type: o.type || 'ofuda' }),
        Math.PI / 2 + Math.sin(t * 6 + seed) * .5, o.speed * (.65 + .5 * Math.sin(t * Math.PI)));
    }
  };

  /* ---------- 火焰轮（旋转的多层放射 + 尾迹） ---------- */
  P.fireWheel = function (o) {
    o = base(o);
    const arms = o.arms || 8;
    for (let i = 0; i < arms; i++) {
      const a = o.a0 + i / arms * TAU;
      emit(Object.assign({}, o, { type: o.type || 'fire', curve: o.curve || .12 }), a, o.speed);
      if (o.inner !== false)
        emit(Object.assign({}, o, { color: o.color2 || 'amber', type: o.innerType || 'small', curve: -(o.curve || .12) }),
          a + .18, o.speed * .72);
    }
  };

  /* ---------- 激光（预警 → 实体化） ---------- */
  P.laser = function (o) {
    o = base(o);
    const a = o.aim === false ? o.a0 : o.a0 + aim(o.x, o.y);
    /* 激光存活时间优先取 laserLife；否则取显式的短 life（≤3 秒）。
       base()/主题预设里的 life 是「子弹」寿命（11～14 秒），绝不能当激光用，
       否则横向谱线会挂十几秒不消失、层层叠在一起。 */
    let dur = o.laserLife;
    if (dur === undefined) {
      const l = o.life;
      dur = (typeof l === 'number' && l > 0 && l <= 3) ? l : 1.5;
    }
    G.lasers.push({
      x: o.x, y: o.y, angle: a, width: o.width || 14,
      warn: (o.warn === undefined ? .75 : o.warn) * (G.diff ? G.diff.laserWarn : 1),
      life: dur, age: 0, color: o.color || 'gold',
      spin: o.spin || 0, len: o.len || 1000, dead: false,
      damage: true, from: o.from || 'boss'
    });
  };

  /* ---------- 环形激光阵 ---------- */
  P.laserWheel = function (o) {
    o = base(o);
    for (let i = 0; i < (o.arms || 4); i++)
      P.laser(Object.assign({}, o, { a0: o.a0 + i / (o.arms || 4) * TAU, aim: false }));
  };

  /* ---------- 追踪弹 ---------- */
  P.homing = function (o) {
    o = base(o);
    for (let i = 0; i < o.n; i++)
      emit(Object.assign({}, o, { homing: o.homing || 2.2, homingT: o.homingT || 2.4 }),
        o.a0 + i / o.n * TAU, o.speed);
  };

  /* ---------- 反弹弹 ---------- */
  P.bounce = function (o) {
    o = base(o);
    for (let i = 0; i < o.n; i++)
      emit(Object.assign({}, o, { bounce: o.bounce || 3, type: o.type || 'crystal' }),
        o.a0 + M.rand(-(o.spread || 1), o.spread || 1), o.speed);
  };

  /* ---------- 大型弹幕组合：花瓣华环 ---------- */
  P.grandFlower = function (o) {
    o = base(o);
    const layers = o.layers || 3, colors = o.colors || [o.color];
    for (let L = 0; L < layers; L++) {
      const n = (o.n || 24) + L * 6;
      for (let i = 0; i < n; i++) {
        const a = o.a0 + i / n * TAU + L * .12;
        const sp = o.speed * (1 + .32 * Math.cos((o.petals || 6) * a + L));
        emit(Object.assign({}, o, { color: colors[L % colors.length], curve: (L % 2 ? .16 : -.16) }), a, sp);
      }
    }
  };

  /* ---------- 结界型符卡常用的「密集交叉网」 ---------- */
  P.weave = function (o) {
    o = base(o);
    const n = o.n || 12;
    for (let i = 0; i < n; i++) {
      const a = o.a0 + i / n * TAU;
      emit(Object.assign({}, o, { curve: o.curve || .28 }), a, o.speed);
      emit(Object.assign({}, o, { curve: -(o.curve || .28), color: o.color2 || o.color }), a + Math.PI / n, o.speed * .9);
    }
  };

  /* ---------- 从背景渗出的一圈札弹（带延时） ---------- */
  P.seepRing = function (o) {
    o = base(o);
    for (let i = 0; i < o.n; i++) {
      const a = o.a0 + i / o.n * TAU;
      const R = o.dist || 90;
      emit(Object.assign({}, o, {
        x: o.x + Math.cos(a) * R, y: o.y + Math.sin(a) * R,
        delay: o.delay || .45, accel: o.accel || 200
      }), a + Math.PI, o.speed * .2);
    }
  };

  /* ---------- 分裂弹实际执行（由 game.js 调用于 splitT 到期） ---------- */
  P.doSplit = function (b) {
    const n = b.splitN || 5;
    const c2 = b.data && b.data.splitColor ? b.data.splitColor : b.color;
    for (let i = 0; i < n; i++) {
      const a = b.angle + i / n * TAU + M.rand(-.15, .15);
      G.spawnBullet({
        x: b.x, y: b.y, angle: a, speed: Math.max(90, b.speed * .72),
        r: Math.max(3, b.r * .62), color: c2, type: b.data && b.data.splitType ? b.data.splitType : 'small',
        life: 8, curve: b.curve * .4
      });
    }
    G.burst(b.x, b.y, b.color, 7, 90, { type: 'dot' });
  };

  /* =========================================================
   * 追加机构：为三名 Boss 提供彼此完全不同的弹幕语汇
   * ========================================================= */

  /* 书写：沿一条笔画路径，按笔顺逐点「写」出札弹 */
  P.stroke = function (o) {
    o = base(o);
    const n = o.n || 14, seed = o.seed || 0;
    const x0 = o.x0 === undefined ? 60 : o.x0, x1 = o.x1 === undefined ? G.PF.w - 60 : o.x1;
    const y0 = o.y0 === undefined ? o.y : o.y0, y1 = o.y1 === undefined ? o.y + 60 : o.y1;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = x0 + (x1 - x0) * t + Math.sin(t * 5 + seed) * (o.wave || 26);
      const y = y0 + (y1 - y0) * t + Math.cos(t * 4 + seed) * (o.waveY || 14);
      const di = o.dir === -1 ? (n - 1 - i) : i;   // 反向下撇：笔顺从右往左
      emit(Object.assign({}, o, { x, y, delay: (o.stepDelay || .022) * di,
        type: o.type || 'ofuda' }),
        (o.a0 || 0) + Math.PI / 2 + Math.sin(t * 5 + seed) * (o.bend || .4),
        o.speed * (.8 + .35 * Math.sin(t * Math.PI)));
    }
  };

  /* 纵列文字雨：竖排文字一列列自上而下浮现 */
  P.column = function (o) {
    o = base(o);
    const W = G.PF.w, cols = o.cols || 5, rows = o.rows || 5, seed = o.seed || 0;
    for (let c = 0; c < cols; c++) {
      const cx = o.x0 === undefined ? W * (c + .5) / cols : o.x0 + c * (o.dx || 46);
      for (let r = 0; r < rows; r++) {
        const y = (o.y0 === undefined ? -12 : o.y0) - r * (o.dy || 30);
        emit(Object.assign({}, o, { x: cx + Math.sin(seed + c) * 10, y,
          delay: (o.colDelay || .1) * c + (o.rowDelay || .045) * r,
          wave: 1, waveF: o.waveF || 2.2, waveA: o.waveA || 22,
          type: o.type || 'ofuda' }),
          Math.PI / 2 + (o.tilt || .08) * Math.sin(seed + c), o.speed);
      }
    }
  };

  /* 整页札阵：网格逐行点亮再落下，留出可穿越的列 */
  P.page = function (o) {
    o = base(o);
    const W = G.PF.w, cols = o.cols || 12, rows = o.rows || 4;
    const gap = o.gap === undefined ? W * .5 : o.gap, gapW = o.gapW || 60;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = 20 + (W - 40) * (c / (cols - 1));
        if (Math.abs(x - gap) < gapW && r % 2 === 0) continue;
        emit(Object.assign({}, o, { x, y: (o.y0 === undefined ? -10 : o.y0) - r * (o.dy || 42),
          delay: (o.rowDelay || .12) * r, type: o.type || 'card' }),
          Math.PI / 2, o.speed * (1 + r * .06));
      }
  };

  /* 涂抹：一道墨线横扫过画面，中间留缺口 */
  P.erase = function (o) {
    o = base(o);
    const W = G.PF.w, n = o.n || 18, y0 = o.y0 === undefined ? o.y : o.y0;
    const gap = o.gap === undefined ? W * .5 : o.gap, gapW = o.gapW || 60;
    const fromLeft = o.dir !== -1;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = fromLeft ? 8 + (W - 16) * t : W - 8 - (W - 16) * t;
      if (Math.abs(x - gap) < gapW) continue;
      emit(Object.assign({}, o, { x, y: y0 + Math.sin(t * 7 + (o.seed || 0)) * (o.wave || 16),
        delay: (o.stepDelay || .018) * i, type: o.type || 'ink' }),
        Math.PI / 2 - .25 + t * .5, o.speed);
    }
  };

  /* 镜面成对放射：以可指定的镜轴严格左右对称 */
  P.mirrorLine = function (o) {
    o = base(o);
    const W = G.PF.w, axis = o.axis === undefined ? W / 2 : o.axis;
    const n = o.n || 8, spread = o.spread || 1.3;
    for (let i = 0; i < n; i++) {
      const a = o.a0 + (n === 1 ? 0 : (i / (n - 1) - .5) * spread);
      emit(o, a, o.speed);
      emit(Object.assign({}, o, { x: 2 * axis - o.x, color: o.color2 || o.color,
        curve: -(o.curve || 0) }), Math.PI - a, o.speed);
    }
  };

  /* 反射壁：自左右两壁向场中发射、碰壁折返的菱形碎片 */
  P.reflectWall = function (o) {
    o = base(o);
    const W = G.PF.w, n = o.n || 6;
    for (const side of [-1, 1])
      for (let i = 0; i < n; i++) {
        const y = (o.y0 === undefined ? 40 : o.y0) + i * (o.step || 52);
        emit(Object.assign({}, o, {
          x: side < 0 ? 10 : W - 10, y, bounce: o.bounce || 2,
          type: o.type || 'crystal', life: o.life === undefined ? 9 : o.life,
          color: side < 0 ? o.color : (o.color2 || o.color)
        }), side < 0 ? (o.tilt || .12) : Math.PI - (o.tilt || .12), o.speed);
      }
  };

  /* 折光：激光轮 + 每道光束末端折射出的分裂碎片 */
  P.prism = function (o) {
    o = base(o);
    const arms = o.arms || 5;
    for (let i = 0; i < arms; i++) {
      const a = o.a0 + i / arms * TAU;
      P.laser(Object.assign({}, o, { a0: a, aim: false,
        warn: o.warn === undefined ? .8 : o.warn, life: o.life || 1.3,
        width: o.width || 10, color: o.color }));
      emit(Object.assign({}, o, { split: 1, splitN: o.splitN || 4,
        splitT: o.splitT || .55, type: o.type || 'crystal' }),
        a + (o.refract || .12), o.speed || 180);
    }
  };

  /* 万花筒：k 重对称复制的旋转花瓣 */
  P.kaleido = function (o) {
    o = base(o);
    const k = o.k || 6, petals = o.petals || 5, n = o.n || 5;
    const cols = o.colors || [o.color];
    for (let s = 0; s < k; s++) {
      const baseA = o.a0 + s / k * TAU;
      for (let i = 0; i < n; i++) {
        const a = baseA + (n === 1 ? 0 : (i / (n - 1) - .5) * (o.spread || .5));
        emit(Object.assign({}, o, { color: cols[s % cols.length],
          curve: (s % 2 ? 1 : -1) * (o.curve || .1) }),
          a, o.speed * (1 + .3 * Math.cos(petals * a + s)));
      }
    }
  };

  /* 祭火：自画面底部升起的火苗，横向摇曳并逐渐加速 */
  P.emberRise = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h, cols = o.colors || [o.color];
    for (let i = 0; i < o.n; i++) {
      const x = o._xGiven ? o.x + M.rand(-(o.jitter || 30), o.jitter || 30) : M.rand(20, W - 20);
      emit(Object.assign({}, o, { x, y: H - 14, wave: 1,
        waveF: o.waveF || 2.4, waveA: o.waveA || 34, accel: o.accel || 60,
        type: o.type || 'fire', color: cols[i % cols.length] }),
        -Math.PI / 2 + M.rand(-(o.tilt || .22), o.tilt || .22), o.speed * M.rand(.8, 1.2));
    }
  };

  /* 一拍齐发：多层环 + 自机狙（原作常见的节拍型复合） */
  P.beatRing = function (o) {
    o = base(o);
    /* 直接 emit，避免嵌套 base() 造成密度被缩放两次 */
    const layers = o.layers || 2, cols = o.colors || [o.color];
    for (let L = 0; L < layers; L++) {
      const n = Math.max(4, (o.n || 16) + L * 4);
      for (let i = 0; i < n; i++)
        emit(Object.assign({}, o, { color: cols[L % cols.length] }),
          o.a0 + L * .08 + i / n * TAU, o.speed + L * (o.speedStep || 40));
    }
    const base2 = aim(o.x, o.y), N = o.aimN || 5;
    for (let i = 0; i < N; i++)
      emit(Object.assign({}, o, { color: o.aimColor || o.color }),
        base2 + (N === 1 ? 0 : (i / (N - 1) - .5) * (o.aimSpread || .5)), o.speed);
  };

  /* 巡回行列：沿椭圆路径排队，依次点亮后向外散开 */
  P.procession = function (o) {
    o = base(o);
    const W = G.PF.w, n = o.n || 20, R = o.radius || 120;
    const cx = o.cx === undefined ? W / 2 : o.cx, cy = o.cy === undefined ? o.y : o.cy;
    const cols = o.colors || [o.color];
    for (let i = 0; i < n; i++) {
      const a = o.a0 + i / n * TAU;
      emit(Object.assign({}, o, {
        x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * (o.ry || R * .55),
        delay: (o.stepDelay || .045) * i, type: o.type || 'fire',
        accel: o.accel || 120, color: cols[i % cols.length]
      }), a + (o.outward === false ? Math.PI : 0) + (o.spinAng || 0), o.speed * .5);
    }
  };

  /* 落灰：缓慢下落的大玉，半途炸成星屑 */
  P.emberFall = function (o) {
    o = base(o);
    const W = G.PF.w, cols = o.colors || [o.color];
    for (let i = 0; i < o.n; i++)
      emit(Object.assign({}, o, { x: M.rand(20, W - 20), y: o._yGiven ? o.y : -12,
        split: 1, splitN: o.splitN || 6, splitT: o.splitT || .8,
        type: o.type || 'big', wave: 1, waveF: o.waveF || 1.6,
        waveA: o.waveA || 26, color: cols[i % cols.length] }),
        Math.PI / 2 + M.rand(-.12, .12), o.speed * M.rand(.75, 1.15));
  };

  /* 扇形激光阵（原作常见的广域预警型） */
  P.laserFan = function (o) {
    o = base(o);
    const n = o.arms || 5, spread = o.spread || .8;
    const center = o.aim === false ? o.a0 : aim(o.x, o.y) + o.a0;
    for (let i = 0; i < n; i++)
      P.laser(Object.assign({}, o, {
        a0: center + (n === 1 ? 0 : (i / (n - 1) - .5) * spread), aim: false
      }));
  };

  /* ---------- 花瓣螺旋：原作「華符」常见的旋转花瓣 ----------
     每层花瓣数固定、层间错开半瓣，整体是一朵缓缓转动的花。
     与普通 ring 的区别：速度按 cos(花瓣数×角) 起伏，轮廓是花瓣而非圆。 */
  P.petalSpiral = function (o) {
    o = base(o);
    const layers = o.layers || 2, petals = o.petals || 6;
    const cols = o.colors || [o.color];
    for (let L = 0; L < layers; L++) {
      const n = o.n || petals * 4;
      const spin = o.a0 + L * Math.PI / petals + (o.spinDir || 1) * G.rtime * (o.spinSpd || .12) * L;
      for (let i = 0; i < n; i++) {
        const a = spin + i / n * TAU;
        /* 花瓣轮廓：cos 的绝对值决定「瓣」，层间反相形成交错 */
        const k = Math.abs(Math.cos(petals * (a - spin) / 2));
        const sp = o.speed * (.55 + .65 * k) + L * (o.speedStep || 0);
        emit(Object.assign({}, o, { color: cols[L % cols.length], type: o.type || 'petal',
          curve: (L % 2 ? 1 : -1) * (o.curve || .08) }), a, sp);
      }
    }
  };

  /* ---------- 同心波纹：一圈圈自中心荡开的等距波 ----------
     原作「波符」「月面波纹」式的层层环，每层半径错开、延迟起动，
     在空中形成清晰的同心圆，而不是一堆朝各方向乱飞的弹。 */
  P.waveRings = function (o) {
    o = base(o);
    const rings = o.rings || 4, n = o.n || 24;
    const cols = o.colors || [o.color];
    for (let k = 0; k < rings; k++) {
      const R = (o.r0 || 18) + k * (o.gap || 30);
      const sp = (o.outSpeed === false ? -1 : 1) * (o.speed * .28 + k * (o.speedStep || 8));
      for (let i = 0; i < n; i++) {
        const a = o.a0 + k * (o.rotStep || .05) + i / n * TAU;
        emit(Object.assign({}, o, {
          x: o.x + Math.cos(a) * R, y: o.y + Math.sin(a) * R,
          delay: k * (o.ringDelay || .10),
          color: cols[k % cols.length], type: o.type || 'orb',
          accel: o.accel || 160
        }), a, -sp);   // 负号：朝圆心收拢后由 accel 反向推开，形成「荡开」感
      }
    }
  };

  /* ========== 第四～六面专用原语（前三面从未使用） ==========
   * 星轨 / 星座 / 五线谱 / 封印柱 —— 每个都落在等距闭合的几何上。 */

  /* 行星轨道：沿椭圆等距排布的运行弹，公转方向逐层交替 */
  P.orbitBand = function (o) {
    o = base(o);
    const bands = o.bands || 2, n = o.n || 16;
    const cols = o.colors || [o.color];
    for (let B = 0; B < bands; B++) {
      const rx = (o.rx || 150) + B * (o.gap || 34);
      const ry = o.ry === undefined ? rx * .52 : o.ry + B * 12;
      const dir = B % 2 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const a = o.a0 + dir * i / n * TAU + B * .21;
        emit(Object.assign({}, o, {
          x: o.x + Math.cos(a) * rx, y: o.y + Math.sin(a) * ry,
          color: cols[B % cols.length], delay: B * (o.bandDelay || .06)
        }), a + dir * Math.PI / 2 + (o.tilt || 0), o.speed * (1 + B * .06));
      }
    }
  };

  /* 星座连线：先摆出星点，再在点与点之间撒等距的「连线弹」 */
  P.constellation = function (o) {
    o = base(o);
    const pts = o.points || 6, R = o.radius || 140;
    const cols = o.colors || [o.color];
    const star = [];
    for (let i = 0; i < pts; i++) {
      const a = o.a0 - Math.PI / 2 + i / pts * TAU;
      star.push([o.x + Math.cos(a) * R * (i % 2 ? .72 : 1),
                 o.y + Math.sin(a) * R * (i % 2 ? .72 : 1)]);
    }
    for (let i = 0; i < pts; i++) {
      /* 星点：一圈小弹 */
      P.ring(Object.assign({}, o, { x: star[i][0], y: star[i][1],
        n: o.starN || 6, speed: o.speed * .5, r: o.r,
        color: cols[i % cols.length], type: o.starType || 'star', life: o.life }));
      /* 连线：沿相邻两星之间等距撒弹 */
      const a = star[i], b = star[(i + 1) % pts];
      const seg = o.seg || 7;
      for (let k = 1; k < seg; k++) {
        const t = k / seg;
        emit(Object.assign({}, o, { x: a[0] + (b[0] - a[0]) * t,
          y: a[1] + (b[1] - a[1]) * t, delay: t * (o.lineDelay || .12),
          color: 'white', type: o.lineType || 'small', r: Math.max(3, o.r * .6) }),
          Math.atan2(b[1] - a[1], b[0] - a[0]), o.speed * .34);
      }
    }
  };

  /* 五线谱：五道水平等距激光 + 从每条谱线落下的音符弹。
     a0 只决定激光的朝向；音符弹始终朝下（π/2）扫向自机，
     否则只是横着飘过画面、对玩家毫无威胁。 */
  P.scoreLines = function (raw) {
    /* 先记下调用方原始角度：base() 会加难度偏移，而完全水平的谱线不能偏 */
    const rawA0 = raw && raw.a0 !== undefined ? raw.a0 : 0;
    const o = base(raw);
    const lines = o.lines || 5, gap = o.gap || 26;
    const top = o.y - gap * (lines - 1) / 2;
    const cols = o.colors || [o.color];
    const drop = raw && raw.noteAngle !== undefined ? raw.noteAngle : Math.PI / 2;
    /* 激光起点(o.x)与音符落点(noteX0~noteX1)分开控制：
       谱线可以从左边缘横贯，音符则整幅铺开落下。 */
    const nx0 = o.noteX0 === undefined ? o.x - G.PF.w * .5 : o.noteX0;
    const nx1 = o.noteX1 === undefined ? o.x + G.PF.w * .5 : o.noteX1;
    for (let i = 0; i < lines; i++) {
      const y = top + i * gap;
      if (o.withLasers !== false)
        P.laser(Object.assign({}, o, { x: o.x, y, a0: rawA0, aim: false,
          /* 用调用方原始角度，彻底去掉 base() 的难度偏移：各难度都完全水平 */
          noDiffAngle: true,
          width: o.width || 7, laserLife: o.laserLife || 2,
          warn: o.warn === undefined ? .6 : o.warn, color: cols[i % cols.length] }));
      const n = o.n || 8;
      for (let k = 0; k < n; k++) {
        /* 每颗音符稍带向自机的偏转，形成真正的覆盖而非平行飘过 */
        const px = n === 1 ? (nx0 + nx1) / 2 : nx0 + (nx1 - nx0) * (k / (n - 1));
        const aim = M.clamp((G.player ? G.player.x : G.PF.w / 2) - px, -260, 260) / 900;
        emit(Object.assign({}, o, { x: px, y,
          delay: (k * .05 + i * .08), color: cols[i % cols.length],
          type: o.type || 'note', r: o.r, life: o.life,
          wave: o.wave || 1, waveF: o.waveF || 1.8, waveA: o.waveA || 8 }),
          drop + aim, o.speed);
      }
    }
  };

  /* 封印柱：自画面边缘等距合拢的光柱，末端带封印札 */
  P.sealPillars = function (o) {
    o = base(o);
    const W = G.PF.w, n = o.n || 8, cols = o.colors || [o.color];
    for (let i = 0; i < n; i++) {
      const x = 24 + (W - 48) * (i / (n - 1));
      const fromTop = i % 2 === 0;
      for (let k = 0; k < (o.stack || 6); k++)
        emit(Object.assign({}, o, { x, y: fromTop ? -12 - k * 26 : G.PF.h + 12 + k * 26,
          delay: (o.stepDelay || .04) * k,
          color: cols[i % cols.length], type: o.type || 'rune', r: o.r }),
          fromTop ? Math.PI / 2 : -Math.PI / 2, o.speed * (1 + k * .05));
    }
  };


  /* ==========================================================
   * 六面 Boss 专属原语：七套机构，彼此独立，不与前五面任何原语重叠。
   * 全部基于「写字 / 网格脉冲 / 变轨 / 交点 / 永动喷口 / 形变 / 瀑」，
   * 对应「无名守人」把名字写进虚空、又逐一抹去的主题。
   * ========================================================== */

  /* ① 轨迹写字：若干「笔首」沿闭合路径巡游，沿途按拍留弹，画出图案。
     路径由 shape 决定：'box' 方框 / 'diamond' 菱 / 'infinity' 双纽线。 */
  P.traceGlyph = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const cx = o.x, cy = o.y;
    const R = o.radius || 150, heads = o.heads || 3;
    const shape = o.shape || 'box';
    const steps = o.steps || 48;
    for (let h = 0; h < heads; h++) {
      const phase = (o.a0 || 0) + h / heads * TAU;
      for (let i = 0; i < steps; i++) {
        const u = i / steps * TAU + phase;
        let x, y;
        if (shape === 'diamond') {
          const r = R * (1 - .25 * Math.abs(Math.sin(u * 2)));
          x = cx + Math.cos(u) * r; y = cy + Math.sin(u) * r * .62;
        } else if (shape === 'infinity') {
          x = cx + Math.sin(u) * R * 1.25;
          y = cy + Math.sin(u * 2) * R * .5;
        } else {
          const a = u / TAU;
          if (a < .25) { x = cx - R + 4 * R * a; y = cy - R * .6; }
          else if (a < .5) { x = cx + R; y = cy - R * .6 + 4 * R * .6 * (a - .25); }
          else if (a < .75) { x = cx + R - 4 * R * (a - .5); y = cy + R * .6; }
          else { x = cx - R; y = cy + R * .6 - 4 * R * .6 * (a - .75); }
        }
        const ang = o.leaveAngle === undefined ? Math.PI / 2 : o.leaveAngle;
        emit(Object.assign({}, o, { x, y, delay: (o.spread || .012) * i + h * (o.headDelay || .06) }),
          ang, o.speed * (1 + .18 * Math.sin(u * 3)));
      }
    }
  };

  /* ② 脉冲网格：全场等距网格，按到中心的距离波次依次激活，
     每个节点向外发一发——「波与粒的境界」的网格版本。 */
  P.pulseGrid = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const cols = o.cols || 9, rows = o.rows || 5;
    const cx = o.x === undefined ? W / 2 : o.x;
    const cy = o.y === undefined ? H * .42 : o.y;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = 24 + (W - 48) * (c / Math.max(1, cols - 1));
        const y = 60 + (H * .52) * (r / Math.max(1, rows - 1));
        const dist = Math.hypot(x - cx, y - cy);
        const a = Math.atan2(y - cy, x - cx) + (o.spin || 0) * dist;
        emit(Object.assign({}, o, { x, y,
          delay: dist / (o.waveSpeed || 420) + (o.a0 || 0) }),
          a, o.speed * (1 + (o.gradient || .3) * dist / W));
      }
  };

  /* ③ 变轨折线：弹飞到中途（splitT）突然转向，分成两组走折线，
     形成「/write/ 写到一半改笔」的折角图案。 */
  P.railSwap = function (o) {
    o = base(o);
    const n = o.n || 12;
    for (let i = 0; i < n; i++) {
      const a = (o.a0 || 0) + i / n * TAU;
      const b = G.spawnBullet(Object.assign({}, o, {
        x: o.x + Math.cos(a) * (o.offset || 40),
        y: o.y + Math.sin(a) * (o.offset || 40),
        angle: a, speed: o.speed, curve: o.curve || 0,
        split: 1, splitN: 2, splitT: o.splitT || .55,
        seedType: o.seedType || 'small', r: o.r, color: o.color,
        type: o.type, life: o.life
      }));
    }
  };

  /* ④ 交点编织：两组反向行进的弹，按 grid 的行列错开，
     在视觉上于交点处「交叉而过」，形成编织格纹。 */
  P.latticeWeave = function (o) {
    o = base(o);
    const W = G.PF.w;
    const cols = o.cols || 8, rows = o.rows || 4;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = 30 + (W - 60) * (c / Math.max(1, cols - 1));
        const y = (o.y || 100) + r * (o.gap || 56);
        const dir = (c + r) % 2 ? 1 : -1;
        emit(Object.assign({}, o, { x, y,
          curve: dir * (o.curve || .2), delay: (o.stepDelay || .03) * (c + r) }),
          (o.a0 === undefined ? Math.PI / 2 : o.a0) + dir * (o.tilt || .22),
          o.speed * (dir > 0 ? 1 : (o.slowRatio || .78)));
      }
  };

  /* ⑤ 永动喷口：若干喷口沿圆周缓慢巡游，自动持续吐出短扇，
     像「第二种永动机关」那样不靠 Boss 持续施力。 */
  P.autoFountain = function (o) {
    o = base(o);
    const jets = o.jets || 4;
    const R = o.radius || 130;
    const t = (o.phase || 0);
    for (let j = 0; j < jets; j++) {
      const a = t + j / jets * TAU;
      let x, y, ang;
      if (o.dropFromTop) {
        /* 天上落下模式：喷口固定在画面顶部横向巡游，弹一律朝下。 */
        x = o.x + Math.sin(a) * R * 1.8;
        y = o.y;
        ang = Math.PI / 2;
      } else {
        x = o.x + Math.cos(a) * R;
        y = o.y + Math.sin(a) * R * .55;
        ang = Math.atan2(G.PF.h - y, G.PF.w / 2 - x);
      }
      for (let k = 0; k < (o.n || 3); k++)
        emit(Object.assign({}, o, { x, y,
          delay: k * (o.stepDelay || .05), curve: (j % 2 ? 1 : -1) * (o.curve || .1) }),
          ang + (k - (o.n || 3) / 2) * (o.spread || .14),
          o.speed * (1 + k * .04));
    }
  };

  /* ⑥ 形变：弹按编号在飞行中途变成不同「字形」——
     用 split 到不同 seedType 来模拟，同时速度分层。 */
  P.metamorph = function (o) {
    o = base(o);
    const n = o.n || 16, kinds = o.kinds || ['rune', 'needle', 'starpoint'];
    for (let i = 0; i < n; i++) {
      const a = (o.a0 || 0) + i / n * TAU;
      const kind = kinds[i % kinds.length];
      G.spawnBullet(Object.assign({}, o, {
        x: o.x, y: o.y, angle: a,
        speed: o.speed * (1 + (i % kinds.length) * (o.speedStep || .12)),
        split: 1, splitN: 1, splitT: o.splitT || .45,
        seedType: kind, type: kind, r: o.r,
        color: (o.colors || [o.color])[i % (o.colors || [o.color]).length],
        life: o.life
      }));
    }
  };

  /* ⑦ 引力涡旋：完全独立的第七套机构——弹从四角沿螺旋臂向中心汇聚，
     抵达临界半径后反向甩出，速度先减后增（minSpeed→accel）。
     这是「向心→离心」的运动，与写字/网格/变轨/编织/喷口/形变皆不同。 */
  P.finalCascade = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const cx = o.x === undefined ? W / 2 : o.x;
    const cy = o.y === undefined ? H * .44 : o.y;
    const arms = o.arms || 6, per = o.per || 8;
    const R = o.radius || 260;
    /* waves：同一涡旋机构的多个时间相位，错峰齐发以堆叠密度，
       不引入任何其他机构。 */
    const waves = o.waves || 1;
    for (let w = 0; w < waves; w++)
      for (let a = 0; a < arms; a++) {
        const baseA = (o.a0 || 0) + a / arms * TAU + w * .11;
        for (let i = 0; i < per; i++) {
          const u = i / per;
          /* 起点在四角外缘，目标指向中心；带切向分量形成螺旋 */
          const sx = cx + Math.cos(baseA) * R;
          const sy = cy + Math.sin(baseA) * R * .7;
          const inward = Math.atan2(cy - sy, cx - sx);
          const tangent = inward + (a % 2 ? 1 : -1) * (o.twist || .55);
          /* 先减速向心、到达后加速甩出：minSpeed + accel + 中途换向 */
          G.spawnBullet(Object.assign({}, o, {
            x: sx, y: sy, angle: tangent,
            speed: o.speed * (1.15 + .35 * u),
            minSpeed: o.speed * .35,
            accel: o.accel || 95,
            maxSpeed: o.speed * 2.1,
            curve: (a % 2 ? 1 : -1) * (o.curve || .22),
            bounce: o.bounce === undefined ? 2 : o.bounce,
            split: 1, splitN: 2, splitT: (o.splitT || .52) - u * .06,
            seedType: o.seedType || 'starpoint',
            delay: u * (o.stepDelay || .07) + w * (o.waveDelay || .12),
            r: o.r, color: (o.colors || [o.color, o.color2 || 'silver'])[a % (o.colors || [o.color]).length],
            type: o.type || 'rune', life: o.life
          }));
        }
      }
  };


  /* ==========================================================
   * 六面第二波专属原语：再四套完全独立的机构。
   * 与第一批七套（写字/网格/变轨/编织/喷口/形变/涡旋）零重叠。
   * ========================================================== */

  /* ⑧ 收束呼吸：多圈弹从画面外缘向中心收拢，抵近后又向外炸开，
     像呼吸一样反复。与涡旋不同：这是径向直线运动、无切向螺旋。 */
  P.breathRing = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const cx = o.x === undefined ? W / 2 : o.x;
    const cy = o.y === undefined ? H * .45 : o.y;
    const rings = o.rings || 3, n = o.n || 20;
    for (let r = 0; r < rings; r++) {
      const R = (o.radius || 300) - r * (o.gap || 62);
      const dir = r % 2 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + (o.a0 || 0) + r * .1;
        const sx = cx + Math.cos(a) * R;
        const sy = cy + Math.sin(a) * R * .68;
        /* 向心发射，靠 curve + bounce 在中心附近反折向外 */
        G.spawnBullet(Object.assign({}, o, {
          x: sx, y: sy,
          angle: Math.atan2(cy - sy, cx - sx),
          speed: o.speed * (1 + .08 * dir),
          curve: (o.curve || .02) * dir,
          bounce: o.bounce === undefined ? 1 : o.bounce,
          delay: r * (o.ringDelay || .1),
          r: o.r, type: o.type || 'rune',
          color: (o.colors || [o.color, o.color2 || 'silver'])[r % 2],
          life: o.life
        }));
      }
    }
  };

  /* ⑨ 边沿环绕：弹从画面一侧进入，沿屏幕边缘绕行一圈再射向中央，
     像「二次元与三次元的境界」的沿边冲击波。 */
  P.edgeCrawl = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const n = o.n || 12, per = o.per || 6;
    for (let i = 0; i < n; i++) {
      const corner = i % 4;
      for (let k = 0; k < per; k++) {
        const u = k / per;
        let x, y, ang;
        if (corner === 0) { x = 18 + u * (W - 36); y = 26; ang = 0; }
        else if (corner === 1) { x = W - 26; y = 26 + u * (H - 52); ang = Math.PI / 2; }
        else if (corner === 2) { x = W - 18 - u * (W - 36); y = H - 26; ang = Math.PI; }
        else { x = 26; y = H - 26 - u * (H - 52); ang = -Math.PI / 2; }
        /* 一部分弹沿边爬（保留造型），另一部分从同一边缘点直接朝中央
           扇形射出，覆盖中间区域——两者都从边缘出发，机构仍是「边缘巡游」。 */
        const inward = (o.inwardRatio === undefined ? .5 : o.inwardRatio);
        const toCenter = Math.atan2(H * .48 - y, W / 2 - x);
        const goIn = ((i + k) % 10) / 10 < inward;
        const shootAngle = goIn
          ? toCenter + (u - .5) * (o.fanSpread || 1.0)
          : ang + (o.tilt || 0);
        G.spawnBullet(Object.assign({}, o, {
          x, y, angle: shootAngle,
          speed: o.speed * (goIn ? 1 : .55),
          curve: goIn ? 0 : (o.curve || .09) * (corner % 2 ? 1 : -1),
          accel: goIn ? 0 : (o.accel || 120),
          maxSpeed: goIn ? o.speed * 1.2 : o.speed * 1.7,
          delay: u * (o.stepDelay || .06) + corner * (o.cornerDelay || .12),
          r: o.r, type: o.type || 'rune', color: o.color, life: o.life
        }));
      }
    }
  };

  /* ⑩ 滞留满屏：弹以极慢速度停在场上、几乎不前进，逐步把画面填满，
     逼玩家在越来越窄的空隙里移动（天邪鬼「停留塞满画面」的弹幕）。 */
  P.stallField = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const cols = o.cols || 12, rows = o.rows || 7;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = 26 + (W - 52) * (c / Math.max(1, cols - 1));
        const y = 70 + (H * .6) * (r / Math.max(1, rows - 1));
        /* 大部分是慢速滞留弹，每隔一格留一个「会动的」缺口弹 */
        const moving = (c + r) % (o.gapEvery || 5) === 0;
        G.spawnBullet(Object.assign({}, o, {
          x, y,
          angle: (o.a0 === undefined ? Math.PI / 2 : o.a0) + (moving ? (o.tilt || .12) : 0),
          speed: moving ? o.speed : o.speed * (o.stallRatio || .06),
          accel: moving ? (o.accel || 80) : 0,
          delay: (o.stepDelay || .02) * (c + r) + (o.a0 || 0),
          r: o.r, type: o.type || 'orb',
          color: moving ? (o.color2 || 'white') : o.color,
          life: o.life
        }));
      }
  };

  /* ⑪ 十字触发：四角射来的「式神」沿对角线移动，到达网格交点时
     分裂出十字形弹幕（天邪鬼／神子的十字触发机构）。 */
  P.crossTrigger = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const n = o.n || 4, rays = o.rays || 4;
    const cx = o.x === undefined ? W / 2 : o.x;
    const cy = o.y === undefined ? H * .42 : o.y;
    for (let i = 0; i < n; i++) {
      const a = (o.a0 || 0) + Math.PI / 4 + i / n * TAU;
      const sx = cx + Math.cos(a) * (o.radius || 250);
      const sy = cy + Math.sin(a) * (o.radius || 250) * .7;
      const toCenter = Math.atan2(cy - sy, cx - sx);
      G.spawnBullet(Object.assign({}, o, {
        x: sx, y: sy,
        angle: toCenter,
        speed: o.speed, r: o.r + 2,
        split: 1, splitN: rays, splitT: o.splitT || .5,
        seedType: o.seedType || 'star',
        curve: (i % 2 ? 1 : -1) * (o.curve || .06),
        color: o.color2 || 'white',
        type: o.type || 'big', life: o.life
      }));
      /* 母弹出发的同时，就地先撒一圈「预兆十字」，
         让同帧就有可读的十字造型（母弹到交点再补一次真正分裂）。 */
      const spokes = o.spokes || 4;
      for (let k = 0; k < spokes; k++) {
        const ka = toCenter + k / spokes * TAU;
        emit(Object.assign({}, o, { x: sx, y: sy,
          delay: (o.spokeDelay || .04) * k, r: Math.max(3, o.r * .6) }),
          ka, o.speed * .72);
      }
    }
  };


  /* ⑫ 光环钟面：参考《东方妖妖梦》六面终符「反魂蝶」的时钟魔术——
     围绕 Boss 的放射光带构成钟表刻度，红/蓝双色弹沿圆周分段爬升，
     像指针一样绕圈。冷色光带 + 暖冷双色弹的交织是这张符的视觉核心。 */
  P.haloDial = function (o) {
    o = base(o);
    const cx = o.x, cy = o.y;
    const spokes = o.spokes || 12;          // 光带（刻度）数
    const arc = o.arc || 8;                 // 每段圆周上的弹数
    const R = o.radius || 150;
    const a0 = o.a0 || 0;
    const cols = o.colors || ['red', 'cyan'];
    /* 放射光带：等角度的细激光，作为钟面刻度（短寿命、逐步旋转） */
    if (o.withLasers !== false) {
      for (let s = 0; s < spokes; s++) {
        const a = a0 + s / spokes * TAU;
        P.laser(Object.assign({}, o, {
          x: cx, y: cy, a0: a, aim: false, noDiffAngle: true,
          laserLife: o.laserLife || 1.6,
          warn: o.warn === undefined ? .5 : o.warn,
          width: o.width || 5, color: cols[s % cols.length]
        }));
      }
    }
    /* 双色蝶弹：相邻两段一红一蓝，沿圆周切向发射并缓慢外扩，
       等距分段形成「绕圈爬升」的视觉。 */
    for (let s = 0; s < spokes; s++) {
      const a = a0 + s / spokes * TAU;
      for (let i = 0; i < arc; i++) {
        const t = i / arc;
        const rr = R + t * (o.spreadR || 60);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * .72;
        /* 切向 + 轻微径向分量：弹沿圆周走，形成绕圈感 */
        const tangent = a + Math.PI / 2 * (s % 2 ? 1 : -1);
        G.spawnBullet(Object.assign({}, o, {
          x: px, y: py,
          angle: tangent + (o.tilt || .08) * (i - arc / 2),
          speed: o.speed * (1 + t * .3),
          curve: (s % 2 ? 1 : -1) * (o.curve || .18),
          delay: (o.stepDelay || .03) * i,
          r: o.r, type: o.type || 'butterfly',
          color: cols[s % cols.length], life: o.life
        }));
      }
    }
  };


  /* ⑬ 盘蛇螺旋：参考《东方风神录》洩矢诹访子「蛙狩」——
     弹如盘蛇从 Boss 环绕而出，一层层螺旋向外包裹整屏，随后整层散开。
     与 haloDial（钟面切线）/ finalCascade（向心涡旋）都不同：
     这是「从内向外、多臂螺旋臂长递增」的包裹型。 */
  P.coilSerpent = function (o) {
    o = base(o);
    const cx = o.x, cy = o.y;
    const arms = o.arms || 4, per = o.per || 16;
    const R0 = o.radius || 30, grow = o.grow || 14;
    const coils = o.coils || 2.2;
    for (let a = 0; a < arms; a++) {
      const base = (o.a0 || 0) + a / arms * TAU;
      for (let i = 0; i < per; i++) {
        const u = i / per;
        const ang = base + u * TAU * coils;
        const r = R0 + u * grow * per * .5;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r * .72;
        /* 切向发射，整条臂看起来像盘起来的蛇向外舒展 */
        G.spawnBullet(Object.assign({}, o, {
          x, y, angle: ang + Math.PI / 2 * (o.dir === undefined ? 1 : o.dir),
          speed: o.speed * (.7 + u * .6),
          curve: (o.curve || .04) * (a % 2 ? 1 : -1),
          delay: u * (o.stepDelay || .028),
          r: o.r, type: o.type || 'orb',
          color: (o.colors || [o.color, o.color2 || 'silver'])[a % 2],
          life: o.life
        }));
      }
    }
  };

  /* ⑭ 幻想瀑布：参考《东方风神录》河城荷取「河童の幻想大瀑布」/「洪水」——
     整条水幕自天顶倾泻，圆弹与水滴弹交替，落地时向两侧溅开。
     水流是「整幅帘幕」而非几束，覆盖整屏。 */
  P.fantasyFalls = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const streams = o.streams || 16, per = o.per || 10;
    const top = o.y === undefined ? -20 : o.y;
    const gapL = o.gapL === undefined ? 20 : o.gapL;
    const gapR = o.gapR === undefined ? W - 20 : o.gapR;
    for (let s = 0; s < streams; s++) {
      const x = gapL + (gapR - gapL) * (s / Math.max(1, streams - 1));
      for (let k = 0; k < per; k++) {
        const u = k / per;
        /* 水流下落时轻微横向摆动，落到底部向两侧溅开（curve 反向） */
        const splash = u > .72;
        G.spawnBullet(Object.assign({}, o, {
          x: x + Math.sin(u * 3 + s) * (o.sway || 10),
          y: top - k * (o.step || 26),
          angle: Math.PI / 2 + (splash ? (s % 2 ? 1 : -1) * (o.splash || .5) : 0),
          speed: o.speed * (splash ? 1.1 : 1),
          curve: splash ? (s % 2 ? 1 : -1) * (o.curve || .18) : 0,
          accel: o.accel || 40,
          delay: (o.stepDelay || .02) * k + s * (o.streamDelay || 0),
          r: o.r, type: o.type || 'orb',
          color: (o.colors || [o.color, o.color2 || 'silver'])[k % 2],
          life: o.life
        }));
      }
    }
  };


  /* ⑮ 坍缩星：参考《东方永夜抄》魔理沙「闭符大坍缩」——
     绕 Boss 旋转的卫星沿途留下蓝色星弹，星弹飞到玩家附近时
     变成紫色并加速追踪；另有大圆弹到屏幕边缘爆散。
     核心是「弹幕会追着玩家走」，不存在安定点。 */
  P.collapseOrb = function (o) {
    o = base(o);
    const cx = o.x, cy = o.y;
    const sats = o.satellites || 5, per = o.per || 8;
    const R = o.radius || 120;
    const a0 = o.a0 || 0;
    const p = G.player;
    for (let s = 0; s < sats; s++) {
      const sa = a0 + s / sats * TAU;
      const sx = cx + Math.cos(sa) * R;
      const sy = cy + Math.sin(sa) * R * .6;
      for (let i = 0; i < per; i++) {
        const u = i / per;
        const sx2 = sx + Math.cos(sa + u * 1.2) * (o.satR || 26);
        const sy2 = sy + Math.sin(sa + u * 1.2) * (o.satR || 26);
        /* 卫星沿轨道留下的星弹：朝外飞，带追踪（靠近玩家才加速） */
        const ang = sa + (i % 2 ? .2 : -.2);
        G.spawnBullet(Object.assign({}, o, {
          x: sx2, y: sy2, angle: ang,
          speed: o.speed * (.8 + u * .4),
          homing: o.homing || 1.6, homingT: o.homingT || 1.8,
          curve: (s % 2 ? 1 : -1) * (o.curve || .06),
          delay: u * (o.stepDelay || .04),
          r: o.r, type: o.type || 'starpoint',
          color: (o.colors || ['silver', 'violet'])[s % 2],
          life: o.life
        }));
      }
    }
    /* 大圆弹：飞向屏幕边缘后分裂成随机星弹（无安定点） */
    if (o.withBulk !== false && p) {
      const aimP = Math.atan2(p.y - cy, p.x - cx);
      G.spawnBullet(Object.assign({}, o, {
        x: cx, y: cy, angle: aimP,
        speed: o.bulkSpeed || 118,
        split: 1, splitN: o.bulkSplit || 12, splitT: o.bulkSplitT || 1.1,
        seedType: 'star', r: (o.r || 6) + 4, type: 'orb',
        color: o.bulkColor || 'violet', life: o.life || 12
      }));
    }
  };


  /* ⑯ 终焉星图：全作最后一张符的专属机构——
     Boss 在中央展开一枚巨大的多层星盘：最外层是旋转的刻度光带，
     中层是等距星点沿同心轨道反向巡游，内层不断向四周放射星芒。
     三段（展开→收缩→爆开）只改变半径与速度方向，机构始终同一套。 */
  P.finalStarMap = function (o) {
    o = base(o);
    const cx = o.x, cy = o.y;
    const rings = o.rings || 4, pts = o.pts || 18;
    const R = o.radius || 180, gap = o.gap || 56;
    const a0 = o.a0 || 0;
    const dir = o.dir === undefined ? 1 : o.dir;
    const cols = o.colors || ['violet', 'silver', 'white', 'ink'];
    /* 层一：同心的星点轨道——每层反向巡游，构成星盘的骨架 */
    for (let r = 0; r < rings; r++) {
      const rr = R - r * gap;
      const rd = (r % 2 ? -1 : 1) * dir;
      for (let i = 0; i < pts; i++) {
        const a = a0 + rd * (i / pts * TAU) + r * .16;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * .7;
        /* 沿轨道的切面射出，整体像旋转的星盘 */
        G.spawnBullet(Object.assign({}, o, {
          x, y, angle: a + rd * Math.PI / 2,
          speed: o.speed * (1 + r * .12),
          curve: rd * (o.curve || .08),
          delay: r * (o.ringDelay || .05) + i * (o.stepDelay || .008),
          r: o.r, type: o.type || 'starpoint',
          color: cols[r % cols.length], life: o.life
        }));
      }
    }
    /* 层二：刻度光带—— dozen 道放射激光构成星盘的量角器 */
    if (o.withLasers !== false) {
      const spokes = o.spokes || 12;
      for (let s = 0; s < spokes; s++) {
        P.laser(Object.assign({}, o, {
          x: cx, y: cy,
          a0: a0 + s / spokes * TAU, aim: false, noDiffAngle: true,
          laserLife: o.laserLife || 1.5,
          warn: o.warn === undefined ? .5 : o.warn,
          width: o.width || 5, color: cols[s % cols.length]
        }));
      }
    }
    /* 层三：星芒核心——从中心向四面放射的尖锐星弹 */
    if (o.withCore !== false) {
      const core = o.coreN || 8;
      for (let c = 0; c < core; c++) {
        const a = -a0 + c / core * TAU;
        G.spawnBullet(Object.assign({}, o, {
          x: cx, y: cy, angle: a,
          speed: o.speed * 1.4,
          r: (o.r || 5) + 2, type: 'star',
          color: 'white', life: o.life
        }));
      }
    }
  };


  /* ⑰ 虚空密葬：参考《东方妖妖梦》幽幽子终符「天文密葬法」——
     铺天盖地的冷色星点以「缓慢但稳定」的速度袭来，如星辰陨落、
     幽灵低语。对应无名守人把名字散成星点、缓缓收回虚空的设定。
     难度来自密度与缓慢收敛的走位压力，而非弹速。
     mode: 'scatter' 散名 / 'gather' 归墟 / 'rain' 无名星雨。 */
  P.voidBurial = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const cx = o.x === undefined ? W / 2 : o.x;
    const cy = o.y === undefined ? H * .4 : o.y;
    const mode = o.mode || 'scatter';
    const cols = o.colors || ['violet', 'silver', 'ink', 'white'];
    const slow = o.speed || 62;                 // 弹速刻意压低

    if (mode === 'scatter') {
      /* 散名：一圈圈星点自 Boss 缓缓向外铺开，像名字被撒进夜空 */
      const rings = o.rings || 3, n = o.n || 20;
      for (let r = 0; r < rings; r++)
        for (let i = 0; i < n; i++) {
          const a = (o.a0 || 0) + i / n * TAU + r * .13;
          G.spawnBullet(Object.assign({}, o, {
            x: cx + Math.cos(a) * (24 + r * 18),
            y: cy + Math.sin(a) * (18 + r * 14),
            angle: a + (o.tilt || .1),
            speed: slow * (1 + r * .12),
            curve: (r % 2 ? 1 : -1) * (o.curve || .03),
            delay: r * (o.ringDelay || .14),
            r: o.r, type: o.type || 'starpoint',
            color: cols[r % cols.length], life: o.life
          }));
        }
    } else if (mode === 'gather') {
      /* 归墟：星点从画面四缘缓缓向中心收拢，把名字收回无名 */
      const per = o.per || 9, n = o.n || 20;
      for (let k = 0; k < n; k++) {
        const a = (o.a0 || 0) + k / n * TAU;
        for (let i = 0; i < per; i++) {
          const u = i / per;
          const R = 300 + u * 120;
          const sx = cx + Math.cos(a) * R;
          const sy = cy + Math.sin(a) * R * .68;
          G.spawnBullet(Object.assign({}, o, {
            x: sx, y: sy,
            angle: Math.atan2(cy - sy, cx - sx),
            speed: slow * (1.1 + u * .2),
            curve: (k % 2 ? 1 : -1) * (o.curve || .04),
            delay: u * (o.stepDelay || .05),
            r: o.r, type: o.type || 'starpoint',
            color: cols[k % cols.length], life: o.life
          }));
        }
      }
    } else {
      /* 无名星雨：从天顶整幅缓缓降下冷色星点，交错成缓慢星河 */
      const colsN = o.colsN || 14, rows = o.rows || 7;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < colsN; c++) {
          const x = 26 + (W - 52) * (c / Math.max(1, colsN - 1));
          const y = -20 - r * (o.step || 34);
          G.spawnBullet(Object.assign({}, o, {
            x: x + Math.sin(c * 1.3 + r) * (o.sway || 8), y,
            angle: Math.PI / 2 + (c % 2 ? .04 : -.04),
            speed: slow * (1 + r * .04),
            curve: (c % 2 ? 1 : -1) * (o.curve || .02),
            delay: (o.stepDelay || .03) * (c + r),
            r: o.r, type: o.type || 'starpoint',
            color: cols[(c + r) % cols.length], life: o.life
          }));
        }
    }
  };


  /* ⑱ 尺素成字：参考 THBWiki 记载的「弹幕组合成汉字」符卡（鳥/鶴/火/炎…）——
     弹幕本身按笔画路径排成巨大的汉字，写完后整字散开压向玩家。
     完美对应无名守人「把名字写进虚空、再逐一抹去」的设定。
     三个字：無（无）→ 名 → 空；慢速书写、砰然溃散。 */
  const GLYPHS = {
    /* 每字是若干笔画，笔画是归一坐标 [0,0]..[1,1] 的折线 */
    '無': [
      [[.12,.16],[.88,.16]],                       // 上横
      [[.30,.05],[.30,.34]], [[.70,.05],[.70,.34]], // 两竖
      [[.12,.40],[.88,.40]],                       // 中横
      [[.20,.52],[.80,.52]],
      [[.12,.62],[.88,.62]],
      [[.30,.52],[.30,.92]], [[.70,.52],[.70,.92]],// 下四竖
      [[.12,.92],[.88,.92]],
      [[.08,.74],[.92,.74]]
    ],
    '名': [
      [[.20,.12],[.72,.12],[.72,.32],[.20,.32],[.20,.12]], // 夕
      [[.46,.32],[.30,.60]],
      [[.30,.52],[.80,.52],[.80,.88],[.30,.88],[.30,.52]], // 口
      [[.30,.70],[.80,.70]]
    ],
    '空': [
      [[.18,.10],[.18,.30],[.82,.30],[.82,.10]],  // 穴 宝盖
      [[.30,.30],[.24,.44]], [[.70,.30],[.76,.44]],
      [[.38,.46],[.38,.90]], [[.62,.46],[.62,.90]],// 工
      [[.30,.90],[.70,.90]], [[.30,.68],[.70,.68]]
    ]
  };
  P.glyphPaths = GLYPHS;
  P.glyphBurst = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const cx = o.x === undefined ? W / 2 : o.x;
    const cy = o.y === undefined ? H * .4 : o.y;
    const ch = o.glyph || '無';
    const paths = GLYPHS[ch] || GLYPHS['無'];
    /* base() 会把 scale 填成弹丸缩放默认值 1；这里必须区分
       字形宽高（百像素级）与弹丸缩放（约等于 1），否则字宽会塌成 1px。 */
    const scale = (o.glyphScale > 0 ? o.glyphScale : 230);
    const hScale = (o.glyphHeight > 0 ? o.glyphHeight : 300);
    const per = o.per || 9;                       // 每笔取点数
    const phase = o.phase || 'write';             // 'write' 书写 / 'burst' 溃散
    let idx = 0;
    for (let s = 0; s < paths.length; s++) {
      const pts = paths[s];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        for (let k = 0; k < per; k++) {
          const u = k / per;
          const gx = cx + ((x0 + (x1 - x0) * u) - .5) * scale;
          const gy = cy + ((y0 + (y1 - y0) * u) - .5) * hScale;
          if (phase === 'write') {
            /* 书写：笔画上的弹静止（delay 冻结），逐笔出现，像墨迹未干 */
            G.spawnBullet(Object.assign({}, o, {
              x: gx, y: gy, angle: Math.PI / 2, speed: 0,
              delay: (o.hold || 1.4) + idx * (o.stepDelay || .006),
              r: o.r, type: o.type || 'rune',
              color: (o.colors || ['violet', 'silver', 'white'])[s % 3],
              life: o.life || 12
            }));
          } else {
            /* 溃散：整字的每颗弹朝下 / 朝自机散开 */
            const aim = (G.player ? G.player.x : W / 2) - gx;
            G.spawnBullet(Object.assign({}, o, {
              x: gx, y: gy,
              angle: Math.PI / 2 + M.clamp(aim, -260, 260) / 900,
              speed: o.speed * (.8 + (idx % 5) * .08),
              curve: (s % 2 ? 1 : -1) * (o.curve || .03),
              delay: idx * (o.stepDelay || .004),
              r: o.r, type: o.type || 'rune',
              color: (o.colors || ['violet', 'silver', 'white'])[s % 3],
              life: o.life || 12
            }));
          }
          idx++;
        }
      }
    }
  };


  /* ⑲ 旋律轮回：全新的终符机构——弹幕沿「利萨如曲线」分布，
     频率比随时间改变（3:2→5:4→7:6），花瓣一层层交织，整条曲线缓慢旋转。
     对应无名守人「把名字编成不会散的旋律、在结界里轮回」的设定。
     弹沿曲线切向缓缓流动，慢速、图案极其绚丽，与前所有环/螺旋/雨/汉字皆不同。 */
  P.melodyLoop = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const cx = o.x === undefined ? W / 2 : o.x;
    const cy = o.y === undefined ? H * .42 : o.y;
    const a = o.freqA || 3, b = o.freqB || 2;      // 频率比，整数确保闭合成花瓣
    const phase = o.phase || 0;                     // 曲线整体旋转相位
    const A = o.rx || 210, B = o.ry || 168;         // 曲线半宽高
    const n = o.n || 90;                            // 曲线上的弹点数
    const layers = o.layers || 2;
    const cols = o.colors || ['violet', 'silver', 'white', 'ink'];

    for (let L = 0; L < layers; L++) {
      const la = a + L, lb = b + L;                 // 每层频率比递增→花瓣更密
      const sc = 1 - L * .16;                       // 每层略小，套成同心花
      const rot = phase + L * .5;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      for (let i = 0; i < n; i++) {
        const u = i / n * TAU;
        /* 利萨如曲线上的点 */
        const px = A * sc * Math.sin(la * u + L * .7);
        const py = B * sc * Math.sin(lb * u);
        /* 整体旋转 */
        const x = cx + px * cr - py * sr;
        const y = cy + px * sr + py * cr;
        /* 切向：对 u 求导 */
        const dx = A * sc * la * Math.cos(la * u + L * .7);
        const dy = B * sc * lb * Math.cos(lb * u);
        let tang = Math.atan2(dy, dx) + rot;
        G.spawnBullet(Object.assign({}, o, {
          x, y, angle: tang,
          speed: o.speed * (1 + L * .08),
          curve: (L % 2 ? 1 : -1) * (o.curve || .015),
          delay: L * (o.layerDelay || .18) + i * (o.stepDelay || .002),
          r: o.r, type: o.type || 'starpoint',
          color: cols[(i + L) % cols.length], life: o.life
        }));
      }
    }
  };


  /* ⑳ 先兆齐射：为六面终符定制——弹幕先用 1 秒「预告」位置（静止冻结、无判定，
     画面上以凝聚光点提示落点），1 秒后逐颗乱射而出；整波强制在 5 秒内发完。
     无 bounce，出屏即销毁。发射样式沿用旋律曲线（利萨如）。 */
  P.heraldSalvo = function (o) {
    o = base(o);
    const W = G.PF.w, H = G.PF.h;
    const cx = o.x === undefined ? W / 2 : o.x;
    const cy = o.y === undefined ? H * .42 : o.y;
    const a = o.freqA || 3, b = o.freqB || 2;
    const phase = o.phase || 0;
    const A = o.rx || 290, B = o.ry || 220;
    /* exactCount：跳过难度缩放，直接按指定总数发射（单层曲线均分），
       用于精确控制「各难度弹量成固定比例」。 */
    const exact = o.exactCount > 0;
    const n = exact ? o.exactCount : (o.n || 90);
    const layers = exact ? 1 : (o.layers || 2);
    const cols = o.colors || ['violet', 'silver', 'white', 'ink'];
    const warnT = o.warnT === undefined ? 1.0 : o.warnT;   // 预警 1 秒
    const spanT = o.spanT === undefined ? 3.6 : o.spanT;   // 逐颗发射跨度（1+3.6<5s）
    const total = n * layers;
    let idx = 0;
    for (let L = 0; L < layers; L++) {
      const la = a + L, lb = b + L, sc = 1 - L * .16;
      const rot = phase + L * .5, cr = Math.cos(rot), sr = Math.sin(rot);
      for (let i = 0; i < n; i++) {
        const u = i / n * TAU;
        const px = A * sc * Math.sin(la * u + L * .7);
        const py = B * sc * Math.sin(lb * u);
        const x = cx + px * cr - py * sr;
        const y = cy + px * sr + py * cr;
        /* 发射方向以切向为基准。朝自机的偏转不在生成时算，而是把基准角与
           偏置参数存进弹丸，由引擎在「发射的这一刻」按自机实时位置计算——
           预警期玩家移动过，弹也会追向新位置。 */
        const dx = A * sc * la * Math.cos(la * u + L * .7);
        const dy = B * sc * lb * Math.cos(lb * u);
        const tang = Math.atan2(dy, dx) + rot;
        const delay = warnT + (idx / Math.max(1, total - 1)) * spanT;
        G.spawnBullet(Object.assign({}, o, {
          x, y, angle: tang,
          aimBaseAngle: tang,
          aimBias: o.aimBias === undefined ? .55 : o.aimBias,
          aimJitter: o.aimJitter === undefined ? .22 : o.aimJitter,
          speed: o.speed * (1 + (idx % 4) * .06),
          curve: 0, bounce: 0,                 // 直线、出屏即销毁
          delay, r: o.r, type: o.type || 'starpoint',
          color: cols[(i + L) % cols.length], life: o.life
        }));
        idx++;
      }
    }
  };

  /* ---------- 主题预设：让 Boss 符卡脚本更简洁 ---------- */
  P.themes = {
    ink: { color: 'ink', type: 'ink', r: 6, speed: 165 },
    ofuda: { color: 'crimson', type: 'ofuda', r: 7, speed: 155 },
    mirror: { color: 'cyan', type: 'crystal', r: 6, speed: 185 },
    fire: { color: 'amber', type: 'fire', r: 6, speed: 190 },
    sakura: { color: 'sakura', type: 'petal', r: 6, speed: 170 },
    star: { color: 'gold', type: 'star', r: 6, speed: 180 },
    crystal: { color: 'silver', type: 'crystal', r: 6, speed: 190 },
    lantern: { color: 'gold', type: 'fire', r: 7, speed: 165 },
    violet: { color: 'violet', type: 'ink', r: 6, speed: 160 },
    cream: { color: 'cream', type: 'card', r: 7, speed: 170 },
    starlight: { color: 'gold', type: 'starpoint', r: 6, speed: 160 },
    score: { color: 'cyan', type: 'note', r: 6, speed: 165 },
    silence: { color: 'violet', type: 'rune', r: 6, speed: 150 }
  };
  P.T = (theme, o) => Object.assign({}, P.themes[theme] || {}, o || {});
})();
