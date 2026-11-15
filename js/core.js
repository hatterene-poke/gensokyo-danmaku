/* ===========================================================
 * core.js — 全局内核 / 数学工具 / 输入 / 对象池 / 弹丸精灵
 * 零依赖，file:// 直接运行
 * =========================================================== */
(function () {
  const G = window.G = {
    W: 1200, H: 800,
    PF: { x: 44, y: 36, w: 680, h: 728 },   // 弹幕游戏区
    HUD: { x: 744, y: 36, w: 412, h: 728 }, // 右侧状态栏
    TAU: Math.PI * 2,
    state: 'title',     // title|select|config|story|playing|paused|result|gallery
    prevState: 'title',
    time: 0, rtime: 0, dt: 0, rdt: 0,
    timeScale: 1, frame: 0,
    keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, clicked: false },
    tedge: { dash: false, bomb: false, switch: false },   // 触摸按钮「单次触发」边沿
    tbtn: { fire: false },                                  // 触摸「射击」按住态
    touch: { anchorX: 0, anchorY: 0, pX: 0, pY: 0, moved: false },
    bullets: [], shots: [], enemies: [], particles: [], floaters: [], items: [], lasers: [],
    waves: [],   // 圆形冲击波（弹幕结界等），以整圈扩散而非一颗颗子弹结算
    poolB: [], poolP: [], poolS: [],
    fx: { shake: 0, shakeX: 0, shakeY: 0, flash: 0, flashColor: '#fff', chroma: 0,
      vignette: 0, wave: 0, invert: 0, warp: 0 },
    spriteCache: {},
    audio: null, game: null, ui: null, render: null,
    stageIndex: 0, phase: 'idle', boss: null, player: null,
    score: 0, graze: 0, kills: 0,
    settings: { bgm: 0.55, sfx: 0.6, difficulty: 1 },
    lang: 'zh',            // 'zh' 简体中文（默认） | 'ja' 日本語
    scale: 1,              // 当前画面对窗口的缩放比
    diff: null,            // 当前难度参数（见 G.DIFFS）
  };

  /* ---------- 难度表（对应原作 Easy / Normal / Hard / Lunatic） ---------- */
  G.DIFFS = [
    { id: 'easy', no: 'Easy', ja: '易', zh: '简单', density: .72, speedMul: .84,
      bossHp: .78, enemyRate: 1.5, lives: 3, powerGain: 1.3, scoreMul: .8, laserWarn: 1.25,
      descZh: '弹幕稀疏、结界较薄，残机 3。适合初次调查异变。',
      descJa: '弾幕は疎らで結界も薄く、残機は 3。初めての異変調査に。' },
    { id: 'normal', no: 'Normal', ja: '普', zh: '普通', density: 1, speedMul: 1,
      bossHp: 1, enemyRate: 1, lives: 2, powerGain: 1, scoreMul: 1, laserWarn: 1,
      descZh: '标准的符卡决斗。弹幕密度与结界值均为基准。',
      descJa: '標準的な符卡決闘。弾幕密度・結界値ともに基準値。' },
    { id: 'hard', no: 'Hard', ja: '難', zh: '困难', density: 1.26, speedMul: 1.12,
      bossHp: 1.22, enemyRate: .96, lives: 2, powerGain: .9, scoreMul: 1.35, laserWarn: .85,
      descZh: '弹更多、更快，Boss 结界更厚，灵力获取略减。',
      descJa: '弾は増え速くなり、結界は厚く、霊力の溜まりも遅くなる。' },
    { id: 'lunatic', no: 'Lunatic', ja: '狂', zh: '疯狂', density: 1.58, speedMul: 1.26,
      bossHp: 1.48, enemyRate: .9, lives: 1, powerGain: .8, scoreMul: 1.8, laserWarn: .7,
      descZh: '弹幕近乎无解，残机仅 1。与幻想乡的疯狂为邻。',
      descJa: '弾幕はほぼ回避不能、残機は 1。幻想郷の狂気と隣り合わせ。' }
  ];
  G.diff = G.DIFFS[1];
  G.addScore = n => { G.score += n * (G.diff ? G.diff.scoreMul : 1); };

  /* ---------- 数学 ---------- */
  const M = G.M = {
    rand: (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(M.rand(a, b + 1)),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    clamp: (v, a, b) => v < a ? a : (v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    ease: t => t * t * (3 - 2 * t),
    dist2: (x1, y1, x2, y2) => (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2),
    ang: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    /* 点到线段的最短距离平方：用于高速弹的扫掠命中判定，避免穿模 */
    segDist2: (x1, y1, x2, y2, px, py) => {
      const dx = x2 - x1, dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? M.clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
      const qx = x1 + dx * t - px, qy = y1 + dy * t - py;
      return qx * qx + qy * qy;
    },
    norm: a => { while (a < 0) a += G.TAU; while (a >= G.TAU) a -= G.TAU; return a; },
    approach: (v, target, step) => v < target ? Math.min(v + step, target) : Math.max(v - step, target),
  };

  /* ---------- 颜色板 ---------- */
  G.COLORS = {
    red: '#ff5570', crimson: '#e0244f', pink: '#ff9ec8', sakura: '#ffc0d8',
    gold: '#ffd36a', amber: '#ff9c3a', cream: '#fff2c8', white: '#ffffff',
    purple: '#c07aff', violet: '#8a5cff', indigo: '#5f7cff', blue: '#6fd6ff',
    cyan: '#8affee', teal: '#43d6b5', green: '#9dff70', lime: '#d8ff6a',
    ink: '#6f5b8e', silver: '#dce6f5', gray: '#a9a2bd', dark: '#2a1838',
  };
  G.colorList = Object.keys(G.COLORS);

  /* ---------- 弹丸贴图方向表 ----------
   * 预渲染贴图各有固有朝向：needle/kunai 尖端朝 +y（-90° 内旋后），
   * ofuda/card/mirror/crystal 长轴竖直，petal/fire/butterfly/star 尖端朝 -y。
   * offset 表示「要让贴图尖端指向发射角 a，需要额外旋转的角度」。
   * 圆形与不规则墨点没有方向，rot=false。 */
  const HP = Math.PI / 2;
  G.SPRITE_DIR = {
    needle: { rot: true, offset: -HP }, kunai: { rot: true, offset: -HP },
    ofuda: { rot: true, offset: -HP }, card: { rot: true, offset: -HP },
    mirror: { rot: true, offset: -HP }, crystal: { rot: true, offset: -HP },
    petal: { rot: true, offset: HP }, fire: { rot: true, offset: HP },
    butterfly: { rot: true, offset: HP }, star: { rot: true, offset: HP },
    orb: { rot: false, offset: 0 }, big: { rot: false, offset: 0 },
    small: { rot: false, offset: 0 }, shot: { rot: false, offset: 0 },
    ink: { rot: false, offset: 0 }, ring: { rot: false, offset: 0 }
  };
  G.spriteDir = type => G.SPRITE_DIR[type] || { rot: false, offset: 0 };

  /* ---------- 输入 ---------- */
  const BLOCK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    'KeyZ', 'KeyX', 'KeyC', 'KeyJ', 'KeyK', 'KeyL', 'ShiftLeft', 'ShiftRight',
    'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Enter', 'Escape', 'KeyP',
    'KeyV', 'F1', 'F2', 'F3']);
  window.addEventListener('keydown', e => {
    if (BLOCK.has(e.code)) e.preventDefault();
    if (!G.keys[e.code]) G.pressed[e.code] = true;
    G.keys[e.code] = true;
  });
  window.addEventListener('keyup', e => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => { G.keys = {}; });
  G.keyDown = c => !!G.keys[c];
  G.keyHit = c => !!G.pressed[c];
  G.anyHit = (...cs) => cs.some(c => !!G.pressed[c]);
  G.clearPressed = () => { G.pressed = {}; G.mouse.clicked = false; G.tedge.dash = G.tedge.bomb = G.tedge.switch = false; };

  G.axis = () => {
    let x = 0, y = 0;
    if (G.keyDown('ArrowLeft') || G.keyDown('KeyA')) x--;
    if (G.keyDown('ArrowRight') || G.keyDown('KeyD')) x++;
    if (G.keyDown('ArrowUp') || G.keyDown('KeyW')) y--;
    if (G.keyDown('ArrowDown') || G.keyDown('KeyS')) y++;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    return { x, y, len: Math.hypot(x, y) };
  };
  G.fireDown = () => G.keyDown('KeyZ') || G.keyDown('KeyJ') || G.mouse.down || G.tbtn.fire;
  G.focusDown = () => G.keyDown('ShiftLeft') || G.keyDown('ShiftRight');
  G.bombHit = () => G.keyHit('KeyX') || G.keyHit('KeyK') || G.tedge.bomb;
  G.switchHit = () => G.keyHit('KeyC') || G.keyHit('KeyL') || G.tedge.switch;
  G.dashHit = () => G.keyHit('KeyV') || G.tedge.dash;

  /* ---------- 对象池 ---------- */
  function blankB() {
    return {
      x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, r: 6, type: 'orb', color: 'red',
      angle: 0, spin: 0, curve: 0, age: 0, life: 999, dead: false, grazed: false,
      speed: 0, accel: 0, maxSpeed: 0, minSpeed: 0, homing: 0, homingT: 0,
      bounce: 0, split: 0, splitN: 0, splitT: 0, fadeIn: 0, alpha: 1,
      delay: 0, delayMax: 0, waitVx: 0, waitVy: 0, wave: 0, waveF: 0, waveA: 0,
      scale: 1, dmgScale: 1, tag: '', data: null, rotToVel: false, spinT: 0
    };
  }
  G.spawnBullet = function (o) {
    const b = G.poolB.pop() || blankB();
    const d = blankB();
    for (const k in d) b[k] = d[k];
    /* 过滤 undefined：图案库常把可选字段留空，若直接写入会覆盖默认值，
       令 radius/scale/life 变成 undefined，产生只闪一帧的异常弹。 */
    for (const k in o) if (o[k] !== undefined) b[k] = o[k];
    if (o.vx === undefined && o.speed !== undefined) {
      b.vx = Math.cos(o.angle || 0) * o.speed;
      b.vy = Math.sin(o.angle || 0) * o.speed;
    }
    if (o.angle === undefined) b.angle = Math.atan2(b.vy, b.vx);
    if (o.rotToVel === undefined) b.rotToVel = G.spriteDir(b.type).rot;
    b.delayMax = b.delay > 0 ? b.delay : 0;
    b.dead = false; b.age = 0; b.spinT = 0;
    G.bullets.push(b);
    return b;
  };
  G.spawnShot = function (o) {
    const s = G.poolS.pop() || {};
    const d = { x: 0, y: 0, vx: 0, vy: 0, speed: 0, r: 5, dmg: 10, color: 'white', type: 'shot',
      sprite: 'small', pierce: 0, age: 0, life: 3, dead: false, angle: 0, homing: 0,
      scale: 1, trail: 0, tag: '', hitCd: 0, wave: 0, waveA: 0, waveF: 0, waveP: 0,
      accel: 0, maxSpeed: 0, delay: 0, split: 0, splitN: 0, splitT: 0, orbit: 0,
      orbitA: 0, orbitSpd: 0, orbitR: 40,
      /* 多样化机构 */
      curve: 0, ricochet: 0, satellite: 0, satT: 0, mine: 0, mineT: 0, mineN: 0,
      charge: 0, rail: 0, spin: 0, spinT: 0, rotToVel: false, px: 0, py: 0,
      /* 15 张符卡（三大类型）共用的一组运动参数 */
      motion: 'straight', cx: 0, cy: 0, a0: 0, rad: 0, radMax: 0, radSpd: 0,
      rw1: 0, rw2: 0, rwDir: 1, growMax: 0, onHit: '', zoneR: 0,
      riseSpd: 0, orbitY: 0, blinkAt: 0, blinkDist: 0, blinked: 0,
      twin: 0, ghost: 0, sealed: 0 };
    for (const k in d) s[k] = d[k];
    for (const k in o) if (o[k] !== undefined) s[k] = o[k];
    s.angle = o.angle !== undefined ? o.angle : Math.atan2(s.vy, s.vx);
    if (o.rotToVel === undefined) s.rotToVel = G.spriteDir(s.sprite).rot;
    s.dead = false; s.age = 0; s.spinT = 0;
    s.px = s.x; s.py = s.y;
    G.shots.push(s);
    return s;
  };
  G.spawnParticle = function (o) {
    const p = G.poolP.pop() || {};
    const d = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, life: .6, max: .6, size: 3,
      color: 'gold', type: 'dot', rot: 0, vr: 0, alpha: 1, drag: 0.96, glow: true, dead: false };
    for (const k in d) p[k] = d[k];
    for (const k in o) p[k] = o[k];
    p.max = p.life; p.dead = false;
    G.particles.push(p);
    return p;
  };
  G.floatText = (x, y, text, color = '#ffe0a0', size = 14, life = 1.1) => {
    const f = { x, y, text, color, size, life, max: life, vy: -22, tag: '' };
    G.floaters.push(f);
    return f;
  };

  G.clearBullets = function (toScore = false) {
    for (const b of G.bullets) {
      if (toScore && Math.random() < .14)
        G.spawnParticle({ x: b.x, y: b.y, vx: M.rand(-30, 30), vy: M.rand(-90, -20),
          color: 'cream', life: .7, size: 2.5, type: 'spark' });
      G.poolB.push(b);
    }
    G.bullets.length = 0;
    /* 激光是独立结构，不回收进粒子池，避免污染粒子对象 */
    G.lasers.length = 0;
  };
  G.killAll = function () {
    G.clearBullets(); G.shots.length = 0; G.enemies.length = 0; G.waves.length = 0;
    G.particles.length = 0; G.floaters.length = 0; G.items.length = 0;
  };

  /* ---------- 弹丸精灵预渲染 ---------- */
  G.getSprite = function (type, color, r) {
    const rr = Math.max(2, Math.round(r));
    const key = type + '|' + color + '|' + rr;
    if (G.spriteCache[key]) return G.spriteCache[key];
    const c = G.COLORS[color] || color;
    const pad = Math.round(rr * 1.85 + 8);
    const S = pad * 2;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const g = cv.getContext('2d');
    const cx = S / 2, cy = S / 2;
    g.translate(cx, cy);
    // 通用外发光
    const glow = g.createRadialGradient(0, 0, rr * .2, 0, 0, pad);
    glow.addColorStop(0, c + 'cc'); glow.addColorStop(.35, c + '55'); glow.addColorStop(1, c + '00');
    g.fillStyle = glow; g.beginPath(); g.arc(0, 0, pad, 0, G.TAU); g.fill();
    g.lineJoin = 'round'; g.lineCap = 'round';

    switch (type) {
      case 'orb': case 'big': {
        g.fillStyle = c; g.globalAlpha = .95;
        g.beginPath(); g.arc(0, 0, rr, 0, G.TAU); g.fill();
        g.globalAlpha = 1;
        g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, rr * .16);
        g.beginPath(); g.arc(0, 0, rr * .9, 0, G.TAU); g.stroke();
        g.fillStyle = '#ffffff'; g.globalAlpha = .92;
        g.beginPath(); g.arc(0, 0, rr * .42, 0, G.TAU); g.fill();
        g.globalAlpha = .55; g.fillStyle = c;
        g.beginPath(); g.arc(0, 0, rr * .62, 0, G.TAU); g.fill();
        break;
      }
      case 'small': case 'shot': {
        g.fillStyle = c; g.beginPath(); g.arc(0, 0, rr, 0, G.TAU); g.fill();
        g.fillStyle = '#fff'; g.globalAlpha = .85;
        g.beginPath(); g.arc(0, 0, rr * .5, 0, G.TAU); g.fill();
        break;
      }
      case 'needle': case 'kunai': {
        const L = rr * 2.5, W = rr * .62;
        g.rotate(Math.PI / 2);
        g.fillStyle = c;
        g.beginPath(); g.moveTo(L, 0); g.lineTo(0, -W); g.lineTo(-L * .55, 0); g.lineTo(0, W); g.closePath(); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, rr * .22); g.stroke();
        g.fillStyle = '#fff'; g.globalAlpha = .9;
        g.beginPath(); g.moveTo(L * .75, 0); g.lineTo(0, -W * .35); g.lineTo(0, W * .35); g.closePath(); g.fill();
        break;
      }
      case 'ofuda': {
        const W = rr * 1.05, H = rr * 1.7;
        g.fillStyle = '#fff6e4'; g.globalAlpha = .96;
        g.fillRect(-W, -H, W * 2, H * 2);
        g.globalAlpha = 1; g.strokeStyle = c; g.lineWidth = 2;
        g.strokeRect(-W, -H, W * 2, H * 2);
        g.fillStyle = c;
        for (let i = -1; i <= 1; i++) {
          g.fillRect(-W * .55, i * H * .42 - 1, W * 1.1, Math.max(1.2, rr * .16));
        }
        g.fillRect(-1, -H * .85, 2, H * 1.7);
        break;
      }
      case 'petal': {
        g.rotate(-.4);
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(0, -rr * 1.5);
        g.bezierCurveTo(rr * 1.3, -rr * .7, rr * .9, rr * 1.1, 0, rr * 1.4);
        g.bezierCurveTo(-rr * .9, rr * 1.1, -rr * 1.3, -rr * .7, 0, -rr * 1.5);
        g.fill();
        g.strokeStyle = '#fff8'; g.lineWidth = 1; g.stroke();
        g.fillStyle = '#fff'; g.globalAlpha = .65;
        g.beginPath(); g.ellipse(0, 0, rr * .22, rr * .8, 0, 0, G.TAU); g.fill();
        break;
      }
      case 'star': {
        g.fillStyle = c; g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? rr * .45 : rr * 1.25;
          i ? g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.globalAlpha = .8;
        g.beginPath(); g.arc(0, 0, rr * .3, 0, G.TAU); g.fill();
        break;
      }
      case 'ink': {
        g.fillStyle = c;
        g.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * G.TAU, rad = rr * (.75 + .42 * Math.sin(i * 2.7 + rr));
          i ? g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.globalAlpha = .35;
        g.beginPath(); g.arc(-rr * .2, -rr * .2, rr * .3, 0, G.TAU); g.fill();
        break;
      }
      case 'mirror': case 'crystal': {
        g.fillStyle = c; g.beginPath();
        g.moveTo(0, -rr * 1.4); g.lineTo(rr * .85, 0); g.lineTo(0, rr * 1.4); g.lineTo(-rr * .85, 0);
        g.closePath(); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, rr * .2); g.stroke();
        g.fillStyle = '#fff'; g.globalAlpha = .8;
        g.beginPath(); g.moveTo(0, -rr * 1.4); g.lineTo(0, rr * 1.4); g.lineTo(-rr * .85, 0); g.closePath(); g.fill();
        break;
      }
      case 'butterfly': {
        g.fillStyle = c;
        for (const s of [-1, 1]) {
          g.beginPath();
          g.moveTo(0, 0);
          g.bezierCurveTo(s * rr * 1.5, -rr * 1.6, s * rr * 2, rr * .2, 0, rr * .5);
          g.bezierCurveTo(s * rr * .8, rr * 1.5, s * rr * .3, rr * .6, 0, 0);
          g.fill();
        }
        g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke();
        break;
      }
      case 'fire': {
        g.fillStyle = c; g.beginPath();
        g.moveTo(0, -rr * 1.7);
        g.bezierCurveTo(rr * 1.2, -rr * .3, rr * .9, rr * 1.3, 0, rr * 1.4);
        g.bezierCurveTo(-rr * .9, rr * 1.3, -rr * 1.2, -rr * .3, 0, -rr * 1.7);
        g.fill();
        g.fillStyle = '#fff8c0'; g.globalAlpha = .9;
        g.beginPath(); g.ellipse(0, rr * .4, rr * .35, rr * .65, 0, 0, G.TAU); g.fill();
        break;
      }
      case 'ring': {
        g.strokeStyle = c; g.lineWidth = Math.max(2, rr * .35);
        g.beginPath(); g.arc(0, 0, rr * .85, 0, G.TAU); g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 1; g.globalAlpha = .8;
        g.beginPath(); g.arc(0, 0, rr * .55, 0, G.TAU); g.stroke();
        break;
      }
      case 'card': {
        const W = rr * .8, H = rr * 1.3;
        g.fillStyle = '#fff6e4'; g.fillRect(-W, -H, W * 2, H * 2);
        g.strokeStyle = c; g.lineWidth = 2.5; g.strokeRect(-W, -H, W * 2, H * 2);
        g.fillStyle = c; g.beginPath(); g.arc(0, 0, rr * .42, 0, G.TAU); g.fill();
        g.fillStyle = '#fff'; g.globalAlpha = .8; g.beginPath(); g.arc(0, 0, rr * .2, 0, G.TAU); g.fill();
        break;
      }
      default: {
        g.fillStyle = c; g.beginPath(); g.arc(0, 0, rr, 0, G.TAU); g.fill();
      }
    }
    const spr = { canvas: cv, half: S / 2, size: S };
    G.spriteCache[key] = spr;
    return spr;
  };

  /* ---------- 屏幕特效 ---------- */
  G.shake = (v) => { G.fx.shake = Math.max(G.fx.shake, v); };
  G.flash = (v, color = '#fff') => { G.fx.flash = Math.max(G.fx.flash, v); G.fx.flashColor = color; };
  G.updateFx = function (rdt) {
    const f = G.fx;
    f.shake = Math.max(0, f.shake - rdt * 26);
    f.shakeX = (Math.random() - .5) * f.shake;
    f.shakeY = (Math.random() - .5) * f.shake;
    f.flash = Math.max(0, f.flash - rdt * 2.6);
    f.chroma = Math.max(0, f.chroma - rdt * 2.2);
    f.wave += rdt;
  };

  /* ---------- 粒子更新 ---------- */
  G.updateParticles = function (dt) {
    const arr = G.particles; let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) { G.poolP.push(p); continue; }
      p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
      p.vx += p.ax * dt; p.vy += p.ay * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      arr[n++] = p;
    }
    arr.length = n;
    const fl = G.floaters; let m = 0;
    for (let i = 0; i < fl.length; i++) {
      const f = fl[i]; f.life -= dt; f.y += f.vy * dt; f.vy *= .96;
      if (f.life > 0) fl[m++] = f;
    }
    fl.length = m;
  };

  G.burst = function (x, y, color, count = 12, speed = 120, opts = {}) {
    for (let i = 0; i < count; i++) {
      const a = M.rand(0, G.TAU), s = M.rand(speed * .25, speed);
      G.spawnParticle({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        color, life: M.rand(.35, .8), size: M.rand(1.5, 4.5), type: opts.type || 'spark',
        vr: M.rand(-8, 8), rot: a, drag: opts.drag || .94, glow: opts.glow !== false });
    }
  };

  /* ---------- 画布 ---------- */
  G.canvas = null; G.ctx = null;
  G.initCanvas = function () {
    G.canvas = document.getElementById('game');
    G.ctx = G.canvas.getContext('2d', { alpha: false });
    G.ctx.imageSmoothingEnabled = true;
    G.canvas.addEventListener('mousemove', e => {
      const r = G.canvas.getBoundingClientRect();
      G.mouse.x = (e.clientX - r.left) / r.width * G.W;
      G.mouse.y = (e.clientY - r.top) / r.height * G.H;
    });
    G.canvas.addEventListener('mousedown', () => { G.mouse.down = true; G.mouse.clicked = true; });
    window.addEventListener('mouseup', () => { G.mouse.down = false; });
    G.initTouch();
  };

  /* ---------- 移动端触摸控制（仅触摸设备启用） ----------
   * 左半屏：相对拖拽移动自机（按下锚定玩家位置，手指位移 / 缩放 = 游戏内位移）。
   * 右半屏：四个动作按钮（冲刺/射击/大招/切换）+ 右上角退出。
   * 仅在 body.touch 且 state==='playing' 时显示。 */
  G.initTouch = function () {
    const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches)
      || ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
    if (!isTouch) return;
    document.body.classList.add('touch');
    const ui = document.getElementById('touch-ui');
    const move = document.getElementById('touch-move');
    const stick = document.getElementById('touch-stick');
    const dot = stick ? stick.querySelector('i') : null;
    const exit = document.getElementById('touch-exit');
    const T = G.touch;
    const clamp = (v, lo, hi) => v < lo ? lo : (v > hi ? hi : v);

    const toLocal = (cx, cy) => {
      const r = G.canvas.getBoundingClientRect();
      const s = G.scale || 1;
      return { x: (cx - r.left) / s, y: (cy - r.top) / s };
    };

    // 左半屏：相对拖拽移动自机
    let pid = null;
    const onMoveDown = e => {
      if (!G.player || G.state !== 'playing') return;
      e.preventDefault();
      pid = e.pointerId;
      const a = toLocal(e.clientX, e.clientY);
      T.anchorX = a.x; T.anchorY = a.y; T.pX = G.player.x; T.pY = G.player.y; T.moved = false;
      if (stick) { stick.style.left = a.x + 'px'; stick.style.top = a.y + 'px'; stick.classList.add('on'); }
      if (dot) dot.style.transform = 'translate(0px,0px)';
      try { move.setPointerCapture(pid); } catch (_) {}
    };
    const onMoveMove = e => {
      if (e.pointerId !== pid || !G.player) return;
      e.preventDefault();
      const a = toLocal(e.clientX, e.clientY);
      const dx = a.x - T.anchorX, dy = a.y - T.anchorY;
      if (Math.abs(dx) + Math.abs(dy) > 4) T.moved = true;
      G.player.x = clamp(T.pX + dx, 12, G.PF.w - 12);
      G.player.y = clamp(T.pY + dy, 16, G.PF.h - 14);
      if (Math.abs(dx) + Math.abs(dy) > 1) { G.player.lastDirX = dx; G.player.lastDirY = dy; }
      if (dot) dot.style.transform = 'translate(' + clamp(dx, -60, 60) + 'px,' + clamp(dy, -60, 60) + 'px)';
    };
    const onMoveUp = e => { if (e.pointerId !== pid) return; pid = null; if (stick) stick.classList.remove('on'); };
    move.addEventListener('pointerdown', onMoveDown);
    move.addEventListener('pointermove', onMoveMove);
    move.addEventListener('pointerup', onMoveUp);
    move.addEventListener('pointercancel', onMoveUp);

    // 右侧四个动作按钮
    ui.querySelectorAll('.tbtn').forEach(btn => {
      const act = btn.dataset.act;
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (G.state !== 'playing') return;
        btn.classList.add('press');
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        if (act === 'fire') G.tbtn.fire = true;
        else if (act === 'dash') G.tedge.dash = true;
        else if (act === 'bomb') G.tedge.bomb = true;
        else if (act === 'switch') G.tedge.switch = true;
      });
      const release = e => {
        e.preventDefault();
        btn.classList.remove('press');
        if (act === 'fire') G.tbtn.fire = false;
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', () => { if (act === 'fire') { G.tbtn.fire = false; btn.classList.remove('press'); } });
    });

    // 右上角退出 → 暂停（Pause 面板含继续 / 返回标题）
    if (exit) exit.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (G.state === 'playing') G.game.togglePause();
    });

    G.setTouchVis = function () {
      const playing = G.state === 'playing';
      if (ui) ui.classList.toggle('show', playing);
      if (!playing) {           // 离场时清空所有触摸态，避免「卡住射击/冲刺」等残留
        G.tbtn.fire = false; G.tedge.dash = G.tedge.bomb = G.tedge.switch = false;
        if (stick) stick.classList.remove('on');
      }
    };
  };

  /* ---------- 自适应任意浏览器窗口 ----------
   * 保持 3:2 画面比例完整可见，居中留边；transform-origin 固定左上角，
   * 这样 left/top 与缩放后的实际尺寸严格对应，不会出现偏移或裁切。 */
  G.fitScreen = function () {
    const app = document.getElementById('app');
    if (!app) return;
    const vw = Math.max(320, window.innerWidth), vh = Math.max(240, window.innerHeight);
    const s = Math.min(vw / G.W, vh / G.H);
    const scale = Math.min(s, 1.6);           // 大屏适度放大，避免位图过度拉伸
    G.scale = scale;
    const w = G.W * scale, h = G.H * scale;
    app.style.transformOrigin = '0 0';
    app.style.transform = `scale(${scale})`;
    app.style.position = 'absolute';
    app.style.width = G.W + 'px';
    app.style.height = G.H + 'px';
    app.style.left = Math.round((vw - w) / 2) + 'px';
    app.style.top = Math.round((vh - h) / 2) + 'px';
    document.body.style.width = vw + 'px';
    document.body.style.height = vh + 'px';
  };
  window.addEventListener('resize', G.fitScreen, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(G.fitScreen, 120));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', G.fitScreen, { passive: true });
  document.addEventListener('fullscreenchange', () => setTimeout(G.fitScreen, 80));

})();
