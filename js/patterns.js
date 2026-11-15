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
    r.a0 = (o && o.a0 || 0) + (ns - 1) * .05;
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
    G.lasers.push({
      x: o.x, y: o.y, angle: a, width: o.width || 14,
      warn: (o.warn === undefined ? .75 : o.warn) * (G.diff ? G.diff.laserWarn : 1),
      life: o.life || 1.5, age: 0, color: o.color || 'gold',
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
    cream: { color: 'cream', type: 'card', r: 7, speed: 170 }
  };
  P.T = (theme, o) => Object.assign({}, P.themes[theme] || {}, o || {});
})();
