/* ===========================================================
 * render.js — 全画面绘制
 * 背景 / 角色 / 弹幕 / 激光 / 粒子 / HUD / 符卡宣言 / 决断特效
 * =========================================================== */
(function () {
  const G = window.G, M = G.M, TAU = G.TAU;
  const R = G.render = {};
  const MIN = '"Yu Mincho","MS Mincho","Songti SC",serif';
  const GOTH = '"Yu Gothic","Microsoft YaHei",sans-serif';
  const C = G.COLORS;
  let ctx;

  R.init = function () { ctx = G.ctx; };

  // 临时把绘制目标切到任意 canvas（供 UI 内嵌立绘使用）
  R.withCtx = function (canvas, fn) {
    const old = ctx;
    const c = canvas.getContext('2d');
    ctx = c;
    c.save(); c.clearRect(0, 0, canvas.width, canvas.height);
    try { fn(c); } finally { c.restore(); ctx = old; }
  };

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function text(s, x, y, size, color, align = 'left', font = MIN, weight = '') {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillText(G.tr ? G.tr(s) : s, x, y);
  }
  function glowText(s, x, y, size, color, glow, align = 'center') {
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 18;
    text(s, x, y, size, color, align); ctx.restore();
  }
  function line(x1, y1, x2, y2, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  /* ================= 背景 ================= */
  const BG_CACHE = {};
  R.drawBackdrop = function (theme, t, tint) {
    const W = G.W, H = G.H;
    const pal = {
      title: ['#1a0d26', '#3a1738', '#6b2549'],
      shrine: ['#0d0a1c', '#211333', '#3d2046'],
      ink: ['#120c1e', '#27143a', '#4a2757'],
      mirror: ['#04141f', '#0a3345', '#165b6b'],
      fire: ['#170810', '#3a1020', '#6d2130'],
      select: ['#150b20', '#2c1430', '#4a1f3e']
    }[theme] || ['#0d0818', '#24123a', '#40204c'];
    const g = ctx.createLinearGradient(0, 0, W * .3, H);
    g.addColorStop(0, pal[0]); g.addColorStop(.55, pal[1]); g.addColorStop(1, pal[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 和风放射（结界的光芒）
    ctx.save(); ctx.globalAlpha = .10; ctx.translate(W * .5, H * .42);
    for (let i = 0; i < 24; i++) {
      ctx.rotate(TAU / 24);
      ctx.fillStyle = i % 2 ? '#ffd9b0' : '#ff9ec0';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(760, -26); ctx.lineTo(760, 26); ctx.fill();
    }
    ctx.restore();

    if (theme === 'shrine' || theme === 'title' || theme === 'select') {
      // 鸟居剪影
      ctx.save(); ctx.globalAlpha = theme === 'title' ? .34 : .22;
      const bx = W * .5, by = H * .74;
      ctx.fillStyle = '#1b0a16';
      ctx.fillRect(bx - 140, by - 120, 18, 240); ctx.fillRect(bx + 122, by - 120, 18, 240);
      ctx.fillRect(bx - 175, by - 138, 350, 20);
      ctx.fillRect(bx - 158, by - 100, 316, 12);
      ctx.restore();
      // 星屑
      ctx.save(); ctx.globalAlpha = .5;
      for (let i = 0; i < 46; i++) {
        const x = (i * 173.7) % W, y = (i * 97.3) % (H * .62);
        const a = .3 + .35 * Math.sin(t * 1.5 + i);
        ctx.fillStyle = `rgba(255,235,200,${a})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
      ctx.restore();
    }
    if (theme === 'mirror') {
      // 镜面格纹与对称光柱
      ctx.save(); ctx.globalAlpha = .13;
      for (let i = -H; i < W + H; i += 62) {
        line(i, 0, i + H, H, '#7fe6e0', 1);
        line(W - i, 0, W - i - H, H, '#8ab0ff', 1);
      }
      ctx.globalAlpha = .09;
      for (let k = 0; k < 5; k++) {
        const x = W / 2 + (k - 2) * 130;
        const gg = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
        gg.addColorStop(0, '#0000'); gg.addColorStop(.5, '#affff0'); gg.addColorStop(1, '#0000');
        ctx.fillStyle = gg; ctx.fillRect(x - 20, 0, 40, H);
      }
      ctx.restore();
    }
    if (theme === 'fire' || theme === 'ink') {
      // 上升的火星 / 墨纹
      ctx.save();
      const warm = theme === 'fire';
      for (let i = 0; i < 34; i++) {
        const x = (i * 131.3 + Math.sin(t * .5 + i) * 26) % W;
        const y = (H - ((t * (18 + i % 5 * 7) + i * 53) % (H + 80)));
        ctx.globalAlpha = .12 + .2 * Math.sin(t + i);
        ctx.fillStyle = warm ? (i % 3 ? '#ffb35c' : '#ff6a6a') : (i % 2 ? '#9a7fc0' : '#5b4780');
        ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // 樱花 / 札纸飘落
    ctx.save();
    for (let i = 0; i < 22; i++) {
      const sp = 16 + i % 6 * 5;
      const x = (i * 91.7 + Math.sin(t * .4 + i * 2.1) * 44 + t * sp * .35) % (W + 80) - 40;
      const y = ((t * sp + i * 79) % (H + 90)) - 45;
      ctx.save();
      ctx.globalAlpha = .16 + .12 * Math.sin(t + i);
      ctx.translate(x, y); ctx.rotate(t * (.6 + i % 3 * .2) + i);
      ctx.fillStyle = theme === 'fire' ? '#ffc98a' : (theme === 'mirror' ? '#bff3ff' : '#ffb6cf');
      if (i % 4 === 0) ctx.fillRect(-4, -6, 8, 12);
      else { ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.4, .5, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();

    if (tint) {
      ctx.save(); ctx.globalAlpha = .22; ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    // 和纸颗粒
    ctx.save(); ctx.globalAlpha = .035;
    for (let i = 0; i < 90; i++) {
      const x = (i * 197.3) % W, y = (i * 331.7) % H;
      ctx.fillStyle = i % 2 ? '#fff' : '#000'; ctx.fillRect(x, y, 2, 1);
    }
    ctx.restore();
  };

  /* ================= 游戏区背景（可滚动） ================= */
  R.drawFieldBg = function (theme, t, tint) {
    const W = G.PF.w, H = G.PF.h;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const pal = {
      shrine: ['#100a20', '#281637', '#3a1c40'],
      ink: ['#0e0a1a', '#241338', '#361a3e'],
      mirror: ['#04121c', '#082c3c', '#0d4454'],
      fire: ['#160710', '#33101f', '#4c1726'],
      star: ['#040c20', '#0a1c3e', '#16345e'],
      music: ['#0e0622', '#1c0e3e', '#331a5e'],
      void: ['#040309', '#0a0814', '#141022'],
      title: ['#140a22', '#2a1535', '#4a2044']
    }[theme] || ['#100a20', '#281637', '#3a1c40'];
    g.addColorStop(0, pal[0]); g.addColorStop(.6, pal[1]); g.addColorStop(1, pal[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 结界格纹（缓慢滚动）
    ctx.save(); ctx.globalAlpha = .09;
    const off = (t * 14) % 56;
    for (let y = -56 + off; y < H; y += 56) line(0, y, W, y, theme === 'mirror' ? '#9ff' : '#ffd6e8', 1);
    for (let x = 0; x < W; x += 56) line(x, 0, x, H, theme === 'mirror' ? '#9ff' : '#ffd6e8', 1);
    ctx.restore();

    if (theme === 'shrine' || theme === 'ink') {
      // 参道石阶 + 远处鸟居
      ctx.save(); ctx.globalAlpha = .16;
      ctx.fillStyle = '#0a0614';
      ctx.fillRect(W / 2 - 116, 46, 14, 74); ctx.fillRect(W / 2 + 102, 46, 14, 74);
      ctx.fillRect(W / 2 - 142, 40, 284, 12); ctx.fillRect(W / 2 - 128, 62, 256, 8);
      ctx.globalAlpha = .1;
      for (let i = 0; i < 7; i++) line(0, 250 + i * 60, W, 250 + i * 60, '#d9b0e0', 1);
      ctx.restore();
    }
    if (theme === 'mirror') {
      ctx.save(); ctx.globalAlpha = .12;
      for (let i = 0; i < 8; i++) {
        const y = ((t * 22 + i * 110) % (H + 120)) - 60;
        ctx.beginPath(); ctx.ellipse(W / 2, y, 260 - i * 12, 22, 0, 0, TAU);
        ctx.strokeStyle = '#8ff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.restore();
    }
    if (theme === 'fire') {
      ctx.save();
      const gg = ctx.createRadialGradient(W / 2, H * .82, 20, W / 2, H * .82, 420);
      gg.addColorStop(0, 'rgba(255,140,60,.22)'); gg.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = .14;
      for (let i = 0; i < 9; i++) {
        const x = 40 + i * 76, y = 120 + Math.sin(t + i) * 8;
        ctx.fillStyle = '#ffb35c'; ctx.beginPath(); ctx.ellipse(x, y, 10, 18, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    if (theme === 'star') {
      /* 第四面：缓慢旋转的天球仪与星座连线 */
      ctx.save(); ctx.translate(W / 2, H * .38);
      ctx.globalAlpha = .13; ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        ctx.save(); ctx.rotate(t * (k % 2 ? -.06 : .05));
        ctx.beginPath(); ctx.ellipse(0, 0, 190 - k * 42, 108 - k * 22, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      /* 星座：八个等分点用直线相连，构成一个转动的八边形 */
      ctx.globalAlpha = .18;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = t * .04 + i / 8 * TAU;
        const x = Math.cos(a) * 160, y = Math.sin(a) * 92;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      for (let i = 0; i < 8; i++) {
        const a = t * .04 + i / 8 * TAU;
        ctx.fillRect(Math.cos(a) * 160 - 2, Math.sin(a) * 92 - 2, 4, 4);
      }
      ctx.restore();
    }
    if (theme === 'music') {
      /* 第五面：五线谱自下缓缓流动 + 跳动的音符点 */
      ctx.save(); ctx.globalAlpha = .14; ctx.strokeStyle = '#c6a0ff'; ctx.lineWidth = 1;
      const scroll = (t * 18) % 30;
      for (let i = -1; i < 8; i++) {
        const y = i * 30 + scroll;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.fillStyle = '#e6d0ff'; ctx.globalAlpha = .28;
      for (let i = 0; i < 24; i++) {
        const x = (i * 137 + 40) % W;
        const y = ((t * 26 + i * 97) % (H + 60)) - 30;
        ctx.beginPath(); ctx.ellipse(x, y, 4, 3, -.3, 0, TAU); ctx.fill();
        ctx.fillRect(x + 3, y - 12, 1.5, 12);
      }
      ctx.restore();
    }
    if (theme === 'void') {
      /* 第六面：几乎全黑，只有缓缓反向旋转的封印几何 */
      ctx.save(); ctx.translate(W / 2, H * .44);
      ctx.globalAlpha = .11; ctx.strokeStyle = '#b7b0d8'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        ctx.save(); ctx.rotate(t * (k % 2 ? -.035 : .028) + k * Math.PI / 8);
        const R = 210 - k * 38;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU;
          const x = Math.cos(a) * R, y = Math.sin(a) * R;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }
    // 符卡背景染色
    if (tint) { ctx.save(); ctx.globalAlpha = .17; ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // 边缘暗角
    const v = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .8);
    v.addColorStop(0, '#0000'); v.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  };

  /* ================= 弹幕 ================= */
  R.drawBullets = function () {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const arr = G.bullets;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      if (b.x < -40 || b.x > G.PF.w + 40 || b.y < -50 || b.y > G.PF.h + 50) continue;
      const spr = G.getSprite(b.type, b.color, b.r * b.scale);
      const charging = b.delay > 0;
      let alpha = b.fadeIn > 0 ? Math.min(1, b.age / b.fadeIn) : b.alpha;
      let grow = 1;
      if (charging) {
        /* 蓄力弹只画成逐渐凝聚的小光点，而不是一整片静止的实体弹幕。
           这样 Boss 身边不会「凭空冒出一圈弹、一瞬又散掉」。 */
        const t = b.delayMax > 0 ? M.clamp(1 - b.delay / b.delayMax, 0, 1) : 0;
        alpha *= .12 + .30 * t;
        grow = .38 + .28 * t;
      }
      if (alpha < 1) ctx.globalAlpha = alpha;
      const dir = G.spriteDir(b.type);
      ctx.save(); ctx.translate(b.x, b.y);
      if (b.rotToVel) ctx.rotate(b.angle + dir.offset + b.spinT);
      else if (b.spinT) ctx.rotate(b.spinT);
      if (grow !== 1) ctx.scale(grow, grow);
      ctx.drawImage(spr.canvas, -spr.half, -spr.half);
      ctx.restore();
      if (alpha < 1) ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  R.drawShots = function () {
    /* 自机弹幕统一压到低亮度、普通混合模式：只作为「自己在开火」的反馈，
       不与敌弹争夺注意力。层级由 R.frame 放在最底层。 */
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = .46;
    for (const s of G.shots) {
      const sprName = s.type === 'beam' ? 'needle' : (s.sprite || 'shot');
      const spr = G.getSprite(sprName, s.color, s.r);
      /* 轨炮 / 蓄力弹：细光轨也一并淡化 */
      if (s.rail || s.charge) {
        const c = C[s.color] || '#fff';
        const k = s.rail ? .035 : .02;
        ctx.save(); ctx.globalAlpha = s.delay > 0 ? .12 : .24;
        ctx.strokeStyle = c; ctx.lineWidth = s.r * 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.x - s.vx * k, s.y - s.vy * k);
        ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.restore();
      }
      if (s.mine) {
        const pulse = .18 + .14 * Math.sin(G.rtime * 16);
        ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = C[s.color] || '#fff';
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(s.x, s.y, 13 + pulse * 5, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      /* 时停 / 成长大玉 / 瞬枪：机构提示环，低亮度 */
      const mo = s.motion || 'straight';
      if (mo === 'stay' || s.delay > 0 || mo === 'grow') {
        const pulse = .5 + .5 * Math.sin(G.rtime * 9 + s.age * 6);
        ctx.save(); ctx.globalAlpha = .12 + pulse * .1;
        ctx.strokeStyle = C[s.color] || '#fff'; ctx.lineWidth = mo === 'grow' ? 2 : 1.2;
        ctx.beginPath(); ctx.arc(s.x, s.y,
          (mo === 'stay' ? s.zoneR || 40 : Math.max(9, s.r * 1.9)) + pulse * 4, 0, TAU);
        ctx.stroke(); ctx.restore();
      }
      /* 有方向性的贴图仍按速度方向旋转，但整体已淡化 */
      const dir = G.spriteDir(sprName);
      const charging = s.delay > 0 ? .4 : 1;
      ctx.save(); ctx.translate(s.x, s.y);
      if (s.rotToVel) ctx.rotate(s.angle + dir.offset + s.spinT);
      else if (s.spinT) ctx.rotate(s.spinT);
      if (charging !== 1) ctx.scale(charging, charging);
      ctx.drawImage(spr.canvas, -spr.half, -spr.half);
      ctx.restore();
    }
    ctx.restore();
  };

  /* 逆行时钟：12 刻度表盘 + 一根正对当前发射位置的指针 */
  R.drawClockFace = function () {
    const gm = G.game, p = G.player;
    if (!gm || !p || !p.alive || G.state !== 'playing') return;
    const sp = G.getSpell ? G.getSpell(p.charId, p.slots[p.slot].idx) : null;
    if (!sp || sp.shot.type !== 'clockDial' || !gm.clockFace) return;
    const f = gm.clockFace;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(192,122,255,.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, f.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = .35;
    ctx.beginPath(); ctx.arc(0, 0, f.r - 5, 0, TAU); ctx.stroke();
    ctx.globalAlpha = .9;
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + i / 12 * TAU;
      const c = Math.cos(a), s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(c * (f.r - 4), s * (f.r - 4));
      ctx.lineTo(c * (f.r + 4), s * (f.r + 4));
      ctx.lineWidth = i % 3 === 0 ? 2 : 1;
      ctx.stroke();
    }
    /* 逆时针行进的指针：角度与本次发射的镜刃完全同向 */
    ctx.save(); ctx.rotate(f.ang + Math.PI / 2);
    ctx.strokeStyle = '#e6c0ff'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -f.r + 2); ctx.stroke();
    ctx.fillStyle = '#c07aff';
    ctx.beginPath(); ctx.arc(0, -f.r + 2, 3, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
  };

  /* 圆形冲击波：一整圈由内向外推进的波前 */
  R.drawWaves = function () {
    if (!G.waves || !G.waves.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const w of G.waves) {
      const k = 1 - w.r / w.radMax;
      if (k <= 0) continue;
      const c = C[w.color] || '#fff';
      ctx.globalAlpha = .10 + .55 * k;
      ctx.strokeStyle = c;
      ctx.lineWidth = 2 + 5 * k;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = .06 + .22 * k;
      ctx.lineWidth = 12 + 16 * k;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };

  /* ================= 激光 ================= */
  R.drawLasers = function () {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const l of G.lasers) {
      const c = C[l.color] || l.color;
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.angle);
      if (l.age < l.warn) {
        const k = .3 + .7 * Math.abs(Math.sin(l.age * 22));
        ctx.globalAlpha = .55 * k; ctx.strokeStyle = c; ctx.lineWidth = 2.2;
        ctx.setLineDash([9, 7]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(l.len, 0); ctx.stroke();
        ctx.setLineDash([]);
        // 准星
        ctx.globalAlpha = .35 * k; ctx.beginPath(); ctx.arc(0, 0, 12 + k * 7, 0, TAU); ctx.stroke();
      } else {
        const fade = Math.min(1, (l.life - (l.age - l.warn)) / .35);
        ctx.globalAlpha = Math.max(0, fade);
        const g = ctx.createLinearGradient(0, -l.width, 0, l.width);
        g.addColorStop(0, c + '00'); g.addColorStop(.24, c + 'aa'); g.addColorStop(.5, '#ffffff');
        g.addColorStop(.76, c + 'aa'); g.addColorStop(1, c + '00');
        ctx.fillStyle = g; ctx.fillRect(0, -l.width, l.len, l.width * 2);
        ctx.globalAlpha = Math.max(0, fade) * .28;
        ctx.fillStyle = c; ctx.fillRect(0, -l.width * 1.8, l.len, l.width * 3.6);
      }
      ctx.restore();
    }
    ctx.restore();
  };

  /* ================= 粒子 / 浮字 ================= */
  R.drawParticles = function () {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of G.particles) {
      const a = M.clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a * p.alpha;
      if (p.type === 'petal') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = C[p.color] || p.color;
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.5, p.size * .7, 0, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (p.type === 'shard') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = C[p.color] || p.color;
        ctx.beginPath(); ctx.moveTo(0, -p.size * 2); ctx.lineTo(p.size, 0); ctx.lineTo(0, p.size * 2); ctx.lineTo(-p.size, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = C[p.color] || p.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2 - a), 0, TAU); ctx.stroke();
      } else {
        ctx.fillStyle = C[p.color] || p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (.4 + a * .6), 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    for (const f of G.floaters) {
      ctx.globalAlpha = M.clamp(f.life / f.max, 0, 1);
      glowText(f.text, f.x, f.y, f.size, f.color, f.color);
    }
    ctx.globalAlpha = 1;
  };

  /* ================= 自机绘制 ================= */
  function drawFigure(o) {
    // o: {hair, cloth, sub, ribbon, hat, ...}
    ctx.save();
    const bob = Math.sin(G.rtime * 3.4) * 1.6;
    ctx.translate(0, bob);
    // 裙 / 下摆
    ctx.fillStyle = o.cloth;
    ctx.beginPath(); ctx.moveTo(-13, 12); ctx.lineTo(13, 12); ctx.lineTo(20, 30); ctx.lineTo(-20, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = o.sub;
    ctx.beginPath(); ctx.moveTo(-20, 29); ctx.lineTo(20, 29); ctx.lineTo(23, 33); ctx.lineTo(-23, 33); ctx.closePath(); ctx.fill();
    // 身体
    ctx.fillStyle = o.sub; ctx.fillRect(-11, -7, 22, 22);
    ctx.fillStyle = o.cloth;
    ctx.beginPath(); ctx.moveTo(-11, -7); ctx.lineTo(0, 3); ctx.lineTo(11, -7); ctx.lineTo(11, 2); ctx.lineTo(-11, 2); ctx.fill();
    // 袖
    ctx.fillStyle = o.sub;
    ctx.beginPath(); ctx.ellipse(-15, 3, 8, 11, -.35, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(15, 3, 8, 11, .35, 0, TAU); ctx.fill();
    // 头
    ctx.fillStyle = '#ffe2cf'; ctx.beginPath(); ctx.arc(0, -16, 11, 0, TAU); ctx.fill();
    // 后发
    ctx.fillStyle = o.hair;
    ctx.beginPath(); ctx.ellipse(0, -13, 14, 15, 0, Math.PI * .92, Math.PI * 2.08); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-13, -18); ctx.quadraticCurveTo(-16, 3, -10, 10); ctx.lineTo(-7, -12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(13, -18); ctx.quadraticCurveTo(16, 3, 10, 10); ctx.lineTo(7, -12); ctx.fill();
    // 刘海
    ctx.beginPath(); ctx.moveTo(-12, -19); ctx.quadraticCurveTo(0, -33, 12, -19);
    ctx.quadraticCurveTo(7, -22, 3, -18); ctx.quadraticCurveTo(0, -24, -4, -18);
    ctx.quadraticCurveTo(-8, -23, -12, -19); ctx.fill();
    /* 不画眼睛：留白的脸更有幻想乡剪影的味道 */
    ctx.restore();
  }

  R.drawPlayer = function (p, scale = 1) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(scale, scale);
    const c = G.getChar(p.charId);
    const sway = Math.sin(G.rtime * 2.2) * .08;
    ctx.rotate(sway * (p.focus ? .3 : 1));

    // 灵力光环
    if (p.invuln > 0 || p.bombTime > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const r = 30 + Math.sin(G.rtime * 9) * 4;
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
      g.addColorStop(0, 'rgba(255,245,210,.55)'); g.addColorStop(1, 'rgba(255,180,220,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
    }
    /* V 冲刺：冷却完毕时一圈缓慢旋转的淡金微光（不刺眼，但可辨识） */
    if (G.state === 'playing' && p.dashCd !== undefined) {
      if (p.dashTime > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 54);
        g.addColorStop(0, 'rgba(255,252,232,.38)'); g.addColorStop(1, 'rgba(255,190,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 54, 0, TAU); ctx.fill(); ctx.restore();
      } else if (p.dashCd <= 0) {
        const pulse = .5 + .5 * Math.sin(G.rtime * 3.4);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 42);
        g.addColorStop(0, `rgba(255,238,196,${.055 + pulse * .055})`);
        g.addColorStop(1, 'rgba(255,238,196,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 42, 0, TAU); ctx.fill();
        ctx.globalAlpha = .12 + pulse * .14; ctx.strokeStyle = '#fff2c8'; ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 7]);
        ctx.save(); ctx.rotate(G.rtime * .5);
        ctx.beginPath(); ctx.arc(0, 0, 33 + pulse * 2.5, 0, TAU); ctx.stroke();
        ctx.restore(); ctx.setLineDash([]);
        ctx.restore();
      }
    }
    // 低速时的结界圈
    if (p.focus) {
      ctx.save(); ctx.globalAlpha = .5; ctx.strokeStyle = c.color; ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(0, 0, 22 + Math.sin(G.rtime * 5) * 2, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }

    // 角色特征
    if (p.charId === 'reimu') {
      drawFigure({ hair: '#3a2530', cloth: '#e83858', sub: '#fff2ea' });
      // 大蝴蝶结
      ctx.fillStyle = '#e03456';
      ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(-14, -33); ctx.lineTo(-13, -20); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(14, -33); ctx.lineTo(13, -20); ctx.fill();
      ctx.fillStyle = '#ffd9e2'; ctx.beginPath(); ctx.arc(0, -25, 3.2, 0, TAU); ctx.fill();
      // 飘浮御札
      for (let i = 0; i < 2; i++) {
        const a = G.rtime * 1.6 + i * Math.PI;
        ctx.save(); ctx.globalAlpha = .8;
        ctx.translate(Math.cos(a) * 26, Math.sin(a) * 16 - 4);
        ctx.rotate(a * .3); ctx.fillStyle = '#fff6e4'; ctx.fillRect(-3, -6, 6, 12);
        ctx.fillStyle = '#c8384f'; ctx.fillRect(-2, -3, 4, 1.5);
        ctx.restore();
      }
    } else if (p.charId === 'marisa') {
      drawFigure({ hair: '#f2d98a', cloth: '#1a1626', sub: '#f7f1e2', eye: '#5a3a20' });
      // 大魔女帽
      ctx.fillStyle = '#171322';
      ctx.beginPath(); ctx.ellipse(0, -26, 24, 6, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-13, -27); ctx.quadraticCurveTo(-6, -58, 5, -55);
      ctx.quadraticCurveTo(12, -44, 13, -27); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff2e0'; ctx.fillRect(-13, -30, 26, 3.5);
      ctx.fillStyle = '#e8c57a'; ctx.beginPath(); ctx.arc(6, -29, 3.4, 0, TAU); ctx.fill();
      // 八卦炉
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(19, 8, 6 + Math.sin(G.rtime * 7) * 1.2, 0, TAU); ctx.stroke();
      ctx.restore();
      // 扫帚
      ctx.strokeStyle = '#8a6a42'; ctx.lineWidth = 2.4;
      line(-22, 10, 14, 20, '#8a6a42', 2.4);
      ctx.fillStyle = '#c9a24f';
      ctx.beginPath(); ctx.moveTo(-22, 10); ctx.lineTo(-32, 6); ctx.lineTo(-30, 17); ctx.closePath(); ctx.fill();
    } else {
      drawFigure({ hair: '#c9d2dd', cloth: '#2a4670', sub: '#f2f6fa', eye: '#304a70' });
      // 女仆头饰
      ctx.fillStyle = '#f7fbff';
      ctx.beginPath(); ctx.moveTo(-12, -25); ctx.quadraticCurveTo(0, -31, 12, -25); ctx.lineTo(10, -21); ctx.quadraticCurveTo(0, -26, -10, -21); ctx.fill();
      // 环绕银刀
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = G.rtime * 2.4 + i * TAU / 3;
        ctx.save(); ctx.translate(Math.cos(a) * 27, Math.sin(a) * 19); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = '#dce6f5';
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2.2, 0); ctx.lineTo(0, 4); ctx.lineTo(-2.2, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    /* 判定点：对战中恒定为醒目红点，低速时略放大；不走 lighter 以免泛白 */
    if (p.focus || G.state === 'playing') {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const hr = p.focus ? 4.8 : 3.9;
      // 深色底衬，保证在密集弹幕上仍能辨认
      ctx.fillStyle = 'rgba(12,2,10,.9)';
      ctx.beginPath(); ctx.arc(0, 0, hr + 2.4, 0, TAU); ctx.fill();
      // 柔和红光
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, hr * 2.8);
      g.addColorStop(0, 'rgba(255,40,70,.65)'); g.addColorStop(1, 'rgba(255,40,70,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, hr * 2.8, 0, TAU); ctx.fill();
      ctx.restore();
      // 实心红点 + 白色高光核 + 细白环
      ctx.fillStyle = '#ff1744';
      ctx.beginPath(); ctx.arc(0, 0, hr, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-hr * .28, -hr * .3, hr * .34, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.arc(0, 0, hr + 1.1, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  /* ================= 杂鱼绘制 ================= */
  R.drawEnemy = function (e) {
    const c = G.ENEMY_TYPES[e.type];
    ctx.save(); ctx.translate(e.x, e.y);
    const pulse = 1 + Math.sin(G.rtime * 4 + e.seed) * .05;
    ctx.scale(pulse, pulse);
    // 光晕
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, e.r * 2.2);
    g.addColorStop(0, (C[e.color] || '#fff') + 'aa'); g.addColorStop(1, (C[e.color] || '#fff') + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, e.r * 2.2, 0, TAU); ctx.fill();
    ctx.restore();
    // 本体：符札形
    ctx.fillStyle = 'rgba(246,236,217,.94)';
    rr(-e.r * .62, -e.r, e.r * 1.24, e.r * 2, 3); ctx.fill();
    ctx.strokeStyle = C[e.color] || '#c8384f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C[e.color] || '#c8384f';
    text(c ? c.glyph : '札', 0, e.r * .42, e.r * 1.05, C[e.color] || '#c8384f', 'center', MIN);
    // 顶/底装饰
    ctx.fillRect(-e.r * .3, -e.r * .82, e.r * .6, 1.6);
    ctx.fillRect(-e.r * .3, e.r * .72, e.r * .6, 1.6);
    ctx.restore();
  };

  /* ================= Boss 立绘（程序化和风人形） ================= */
  R.drawBoss = function (b, big) {
    if (!b || !b.def) return;
    const d = b.def;
    ctx.save(); ctx.translate(b.x, b.y);
    const s = big ? 1.55 : 1;
    ctx.scale(s, s);
    const t = G.rtime;

    // 背后光轮 / 纹章
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 86);
    g.addColorStop(0, d.color + '88'); g.addColorStop(.6, d.color + '33'); g.addColorStop(1, d.color + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 86, 0, TAU); ctx.fill();
    ctx.strokeStyle = d.color + '66'; ctx.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) {
      ctx.save(); ctx.rotate(t * (k ? -.14 : .1));
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU, rad = 58 + (i % 2 ? -8 : 6);
        i ? ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();

    // 飘带
    ctx.save(); ctx.globalAlpha = .7;
    for (const side of [-1, 1]) {
      ctx.fillStyle = d.robe;
      ctx.beginPath();
      ctx.moveTo(side * 16, -4);
      ctx.bezierCurveTo(side * 52, -20 + Math.sin(t * 1.6 + side) * 12, side * 66, 22, side * 42, 46);
      ctx.bezierCurveTo(side * 50, 20, side * 34, 6, side * 16, 10);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // 和服下摆
    ctx.fillStyle = d.robe;
    ctx.beginPath(); ctx.moveTo(-20, 6); ctx.lineTo(20, 6); ctx.lineTo(34, 52); ctx.lineTo(-34, 52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = d.sub;
    ctx.beginPath(); ctx.moveTo(-34, 50); ctx.lineTo(34, 50); ctx.lineTo(37, 55); ctx.lineTo(-37, 55); ctx.closePath(); ctx.fill();
    // 上衣与襟
    ctx.fillStyle = d.robe; ctx.fillRect(-19, -14, 38, 28);
    ctx.fillStyle = d.sub;
    ctx.beginPath(); ctx.moveTo(-19, -14); ctx.lineTo(0, 2); ctx.lineTo(19, -14); ctx.lineTo(19, -8); ctx.lineTo(-19, -8); ctx.fill();
    // 袖
    ctx.fillStyle = d.robe;
    ctx.beginPath(); ctx.ellipse(-27, 0, 13, 19, -.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(27, 0, 13, 19, .3, 0, TAU); ctx.fill();
    // 头
    ctx.fillStyle = '#ffe6d6'; ctx.beginPath(); ctx.arc(0, -27, 15, 0, TAU); ctx.fill();
    // 长发
    ctx.fillStyle = d.hair;
    ctx.beginPath(); ctx.ellipse(0, -25, 19, 20, 0, Math.PI * .9, Math.PI * 2.1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18, -30); ctx.quadraticCurveTo(-24, 12, -14, 34); ctx.lineTo(-9, -26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, -30); ctx.quadraticCurveTo(24, 12, 14, 34); ctx.lineTo(9, -26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-16, -32); ctx.quadraticCurveTo(0, -50, 16, -32);
    ctx.quadraticCurveTo(9, -36, 3, -29); ctx.quadraticCurveTo(0, -37, -5, -29);
    ctx.quadraticCurveTo(-10, -36, -16, -32); ctx.fill();
    /* 不画眼睛：Boss 立绘也用留白的脸 */
    // 各人特征
    if (d.id === 'chiyo') {
      // 卷轴与笔、飘浮札纸
      ctx.save(); ctx.rotate(-.3);
      ctx.fillStyle = '#f6ecd9'; ctx.fillRect(-48, 6, 26, 42);
      ctx.fillStyle = '#8a6a42'; ctx.fillRect(-50, 4, 30, 4); ctx.fillRect(-50, 46, 30, 4);
      ctx.fillStyle = '#5d4479';
      for (let i = 0; i < 4; i++) ctx.fillRect(-44, 13 + i * 8, 18 - i * 2, 1.6);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const a = t * .7 + i * TAU / 4;
        ctx.fillStyle = '#e7dcf5'; ctx.globalAlpha = .65;
        ctx.save(); ctx.translate(Math.cos(a) * 52, Math.sin(a) * 40 - 6); ctx.rotate(a);
        ctx.fillRect(-4, -7, 8, 14); ctx.restore();
      }
      ctx.restore();
    } else if (d.id === 'honoka') {
      // 手持古镜 + 对称镜碎
      ctx.save(); ctx.translate(35, -4);
      ctx.strokeStyle = '#e8c57a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.stroke();
      const mg = ctx.createLinearGradient(-12, -12, 12, 12);
      mg.addColorStop(0, '#dffcff'); mg.addColorStop(.5, '#7fe6e0'); mg.addColorStop(1, '#2a5f78');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7;
      for (let i = 0; i < 6; i++) {
        const a = t * .5 + i * TAU / 6;
        ctx.save(); ctx.translate(Math.cos(a) * 58, Math.sin(a) * 44); ctx.rotate(a * 2);
        ctx.fillStyle = '#bff3ff';
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 0); ctx.lineTo(0, 8); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    } else if (d.id === 'seira') {
      // 星Reader：天球仪冠与绕身行星
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#8fd0ff'; ctx.lineWidth = 1.6; ctx.globalAlpha = .8;
      ctx.beginPath(); ctx.arc(0, -38, 20, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -38, 26, 9, -.3, 0, TAU); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = t * .9 + i * TAU / 3;
        ctx.fillStyle = i === 1 ? '#ffe9a8' : '#9fd8ff';
        ctx.beginPath(); ctx.arc(Math.cos(a) * 58, Math.sin(a) * 44 - 4, 4, 0, TAU); ctx.fill();
      }
      ctx.restore();
      // 星芒发饰
      ctx.fillStyle = '#ffe9a8';
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(s * 16, -42); ctx.rotate(t * .4);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4, rr = i % 2 ? 2 : 6;
          i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    } else if (d.id === 'rakuraku') {
      // 无音乐师：悬浮五线谱与音符
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .75;
      ctx.strokeStyle = '#c6a0ff'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-30, -14 + i * 6 + Math.sin(t + i) * 2);
        ctx.quadraticCurveTo(0, -20 + i * 6, 30, -14 + i * 6 + Math.sin(t + i) * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#e6d0ff';
      for (let i = 0; i < 4; i++) {
        const y = ((t * 22 + i * 24) % 96) - 48;
        ctx.beginPath(); ctx.ellipse(38 + Math.sin(t * 2 + i) * 6, y, 4, 3, -.3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    } else if (d.id === 'nameless') {
      // 无名守人：层层反向旋转的封印几何，无脸无饰
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#b7b0d8';
      for (let k = 0; k < 3; k++) {
        ctx.save(); ctx.rotate(t * (k % 2 ? -.18 : .13) + k * Math.PI / 6);
        ctx.globalAlpha = .35 - k * .07; ctx.lineWidth = 1.2;
        const R = 44 + k * 15;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU;
          i ? ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R) : ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
        }
        ctx.closePath(); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    } else {
      // 篝火与樱瓣
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const a = t * .8 + i * TAU / 7;
        const r = 52 + Math.sin(t * 2 + i) * 8;
        ctx.fillStyle = i % 2 ? '#ffb35c' : '#ff8a7a'; ctx.globalAlpha = .6;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * .8, 3.5 + Math.sin(t * 3 + i), 0, TAU); ctx.fill();
      }
      ctx.restore();
      // 祭典发饰
      ctx.fillStyle = '#ffd36a';
      ctx.beginPath(); ctx.arc(-14, -40, 4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -40, 4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  /* ================= 大招特效 ================= */
  /* =========================================================
   * 大招特效：30 张符卡 = 30 个独立绘制的样式。
   * 每一项使用不同的几何母题与构图（矩形札阵 / 水平带 / 双圆 / 波纹 /
   * 符印 / 折线 / 透视鸟居 / 脉冲环 / 贝塞尔 / 法阵 / 针雨 / 粗光束 /
   * 交叉网 / 孢子斑 / 粗弧 / 公转点射 / 连锁爆点 / 流星尾 / 螺线 /
   * 星点 / 刀扇 / 扫描线 / 钟面 / 剪影 / 折返轨迹 / 纵贯枪 / 壁面折线 /
   * 方格 / 汇聚焦线 / 刻度放射），不是同一形状换颜色或换大小。
   * ========================================================= */
  function bxLine(x1, y1, x2, y2, col, w, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  function bxRing(x, y, r, col, w, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(x, y, Math.max(1, r), 0, TAU); ctx.stroke(); ctx.restore();
  }
  function bxRect(x, y, w, h, col, a, fill) {
    ctx.save(); ctx.globalAlpha = a; fill ? ctx.fillStyle = col : ctx.strokeStyle = col;
    ctx.lineWidth = 2; fill ? ctx.fillRect(x, y, w, h) : ctx.strokeRect(x, y, w, h); ctx.restore();
  }
  function bxPoly(pts, col, w, a, fill) {
    ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = w || 2;
    fill ? ctx.fillStyle = col : ctx.strokeStyle = col;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]);
    ctx.closePath(); fill ? ctx.fill() : ctx.stroke(); ctx.restore();
  }
  function bxDot(x, y, r, col, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, Math.max(.5, r), 0, TAU); ctx.fill(); ctx.restore();
  }
  function bxStar(x, y, r, col, a) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * .45 : r;
      pts.push([x + Math.cos(ang) * rad, y + Math.sin(ang) * rad]);
    }
    bxPoly(pts, col, 1, a, true);
  }
  function bxGlow(x, y, r, col, a) {
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x, y, 1, x, y, Math.max(2, r));
    g.addColorStop(0, '#ffffffcc'); g.addColorStop(.45, col + '66'); g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, Math.max(2, r), 0, TAU); ctx.fill(); ctx.restore();
  }

  const F = R.BOMB_FX = {};
  const EZ = k => M.ease(Math.min(1, k * 1.5));

  /* ---------------- 博麗 霊夢 ---------------- */
  F.ofuda = (fx, k, col, W, H, cx, cy) => {
    // 满屏旋转的矩形御札沿径向飞散
    const e = EZ(k), a = 1 - k;
    for (let i = 0; i < 30; i++) {
      const ang = i / 30 * TAU + k * 1.2, r = 40 + e * (180 + (i % 5) * 42);
      ctx.save(); ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * .8);
      ctx.rotate(ang + k * 3); bxRect(-7, -13, 14, 26, i % 3 ? '#fff6e4' : col, a * .85, true);
      ctx.restore();
    }
  };
  F.kekkai = (fx, k, col, W, H, cx, cy) => {
    // 数条水平结界光带自中心向上下推开
    const e = EZ(k);
    for (let i = -4; i <= 4; i++) {
      const y = cy + i * e * 92;
      bxLine(0, y, W, y, i % 2 ? col : '#fff3e0', 6 - Math.abs(i) * .7, (1 - k) * .8);
      if (i % 2 === 0) bxRect(0, y - 3, W * (0.2 + e * .3), 6, col, (1 - k) * .35, true);
    }
  };
  F.yinyangArc = (fx, k, col, W, H, cx, cy) => {
    // 一红一白双圆反向旋转，各拖一条弧轨
    const e = EZ(k);
    for (const s of [-1, 1]) {
      const x = cx + s * (60 + e * 130), y = cy - 110 - e * 90;
      bxGlow(x, y, 70, s < 0 ? col : '#fff2e0', (1 - k) * .5);
      bxRing(x, y, 46, s < 0 ? col : '#fff2e0', 5, (1 - k) * .85);
      ctx.save(); ctx.globalAlpha = (1 - k) * .7; ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 70, s * k * 3, s * k * 3 + 2.1, s < 0); ctx.stroke(); ctx.restore();
    }
  };
  F.purifyRing = (fx, k, col, W, H, cx, cy) => {
    // 多层同心波纹由内向外扩散并淡出
    for (let i = 0; i < 6; i++) {
      const r = ((k * 1.7 + i / 6) % 1) * 420;
      bxRing(cx, cy - 60, r, i % 2 ? col : '#ffffff', 5 - i * .5, (1 - r / 420) * (1 - k * .5) * .8);
    }
  };
  F.seal = (fx, k, col, W, H, cx, cy) => {
    // 中央巨大方形符印 + 四周钉入的札钉
    const e = EZ(k), a = 1 - k, s = 90 + e * 60;
    bxPoly([[cx - s, cy - s], [cx + s, cy - s], [cx + s, cy + s], [cx - s, cy + s]], col, 6, a);
    bxPoly([[cx - s * .55, cy - s * .55], [cx + s * .55, cy - s * .55],
      [cx + s * .55, cy + s * .55], [cx - s * .55, cy + s * .55]], '#fff2dc', 3, a * .8);
    for (let i = 0; i < 8; i++) {
      const ang = i / 8 * TAU, r = 150 + e * 130;
      bxRect(cx + Math.cos(ang) * r - 5, cy + Math.sin(ang) * r - 14, 10, 28, col, a * .9, true);
    }
  };
  F.shide = (fx, k, col, W, H, cx, cy) => {
    // 之字形纸垂折线从中心向左右分叉
    const a = 1 - k, e = EZ(k);
    for (let s = -1; s <= 1; s += 2) {
      const pts = [];
      for (let i = 0; i < 8; i++) pts.push([cx + s * i * e * 48, cy - 20 + (i % 2 ? -46 : 46) - i * 14]);
      ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 7; ctx.strokeStyle = '#fff6e4';
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.stroke(); ctx.restore();
    }
  };
  F.torii = (fx, k, col, W, H, cx, cy) => {
    // 一列朱红鸟居框沿纵深透视排列
    const a = 1 - k;
    for (let i = 0; i < 7; i++) {
      const t = (i / 7 + k * .35) % 1, sc = .25 + t * 1.5;
      const w = 110 * sc, h = 92 * sc, y = cy - 130 + t * 210;
      bxRect(cx - w / 2, y, w, 8 * sc, '#e83858', a * .85, true);
      bxRect(cx - w / 2, y + 20 * sc, 9 * sc, h, '#e83858', a * .85, true);
      bxRect(cx + w / 2 - 9 * sc, y + 20 * sc, 9 * sc, h, '#e83858', a * .85, true);
    }
  };
  F.kagura = (fx, k, col, W, H, cx, cy) => {
    // 按拍点离散闪现的同心铃环
    const beat = Math.floor(k * 8);
    for (let i = 0; i <= beat; i++) {
      const age = k * 8 - i;
      if (age < 0 || age > .55) continue;
      bxRing(cx, cy - 40, 40 + age * 250, i % 2 ? col : '#ffe9c8', 5 * (1 - age / .55), (1 - age / .55) * .8);
    }
  };
  F.homingJade = (fx, k, col, W, H, cx, cy) => {
    // 多条贝塞尔曲线绕场一周的净化轨迹
    const a = 1 - k, e = EZ(k);
    for (let i = 0; i < 7; i++) {
      const y0 = cy - i * 34, amp = 90 + i * 26;
      ctx.save(); ctx.globalAlpha = a * .85; ctx.strokeStyle = i % 2 ? col : '#dffcff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, y0);
      ctx.bezierCurveTo(W * .3 * e, y0 - amp, W * .7 * e, y0 + amp, W * e, y0 - 40);
      ctx.stroke(); ctx.restore();
    }
  };
  F.musou = (fx, k, col, W, H, cx, cy) => {
    // 多层法阵 + 自中心放射的光柱
    const e = EZ(k), a = 1 - k;
    for (let L = 0; L < 3; L++) {
      const r = (80 + L * 62) * e, pts = [];
      for (let i = 0; i < (L % 2 ? 8 : 6); i++) {
        const ang = i / (L % 2 ? 8 : 6) * TAU + k * (L % 2 ? -1 : 1);
        pts.push([cx + Math.cos(ang) * r, cy - 60 + Math.sin(ang) * r]);
      }
      bxPoly(pts, L === 1 ? '#fff2dc' : col, 3, a * .8);
    }
    for (let i = 0; i < 12; i++) {
      const ang = i / 12 * TAU;
      bxLine(cx, cy - 60, cx + Math.cos(ang) * 620 * e, cy - 60 + Math.sin(ang) * 620 * e, col, 3, a * .5);
    }
  };

  /* ---------------- 霧雨 魔理沙 ---------------- */
  F.stardust = (fx, k, col, W, H, cx, cy) => {
    // 密集细针自上方倾泻
    const e = EZ(k), a = 1 - k;
    for (let i = 0; i < 64; i++) {
      const x = (i * 97 % W), y = ((i * 53 + e * H * 1.6) % (H + 120)) - 60;
      bxLine(x, y, x - 6, y + 26 + (i % 4) * 7, i % 3 ? col : '#ffffff', 2, a * .75);
    }
  };
  F.masterSpark = (fx, k, col, W, H, cx, cy) => {
    // 一道横贯画面的粗大魔炮 + 边缘散射
    const w = 40 + 70 * Math.sin(k * Math.PI), a = 1 - k;
    ctx.save(); ctx.globalAlpha = a * .9;
    const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    g.addColorStop(0, col + '00'); g.addColorStop(.35, col + 'cc');
    g.addColorStop(.5, '#ffffff'); g.addColorStop(.65, col + 'cc'); g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.fillRect(cx - w, 0, w * 2, H); ctx.restore();
    for (let i = 0; i < 10; i++)
      bxLine(cx - w, H * i / 10, cx - w - 60 * a, H * i / 10 + (i % 2 ? 30 : -30), col, 2, a * .5);
  };
  F.crossLaser = (fx, k, col, W, H, cx, cy) => {
    // 多条斜线在中心交汇成网
    const a = 1 - k, e = EZ(k);
    for (let i = -7; i <= 7; i++) {
      bxLine(cx - W * e, cy + i * 52 * e, cx + W * e, cy - i * 52 * e, i % 2 ? col : '#fff3d0', 3, a * .6);
      bxLine(cx + i * 52 * e, cy - H * e, cx - i * 52 * e, cy + H * e, col, 2, a * .35);
    }
  };
  F.spore = (fx, k, col, W, H, cx, cy) => {
    // 缓慢膨胀的有机圆斑群
    const e = EZ(k), a = 1 - k;
    for (let i = 0; i < 26; i++) {
      const ang = i * 2.399, r = 30 + (i % 7) * 34 * e;
      bxDot(cx + Math.cos(ang) * r * 2.2, cy - 60 + Math.sin(ang) * r * 1.5,
        5 + (i % 5) * 5 * e, i % 3 ? col : '#d8ff6a', a * .55);
    }
  };
  F.broom = (fx, k, col, W, H, cx, cy) => {
    // 一条粗弧线扫过，留下渐宽的残光
    const a = 1 - k;
    ctx.save(); ctx.globalAlpha = a * .8; ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = 34 - i * 3.4; ctx.globalAlpha = a * (.4 - i * .035);
      ctx.beginPath(); ctx.arc(cx, cy + 260, 300 + i * 12,
        -Math.PI * (.1 + k * .8), Math.PI * (.1 + k * .8), false); ctx.stroke();
    }
    ctx.restore();
  };
  F.satelliteFixed = (fx, k, col, W, H, cx, cy) => {
    // 多个小光点公转并向外点射细线
    const e = EZ(k), a = 1 - k, oy = cy - 120;
    for (let i = 0; i < 5; i++) {
      const ang = i / 5 * TAU + k * 4, r = 90 + e * 60;
      const x = cx + Math.cos(ang) * r, y = oy + Math.sin(ang) * r * .6;
      bxStar(x, y, 12, col, a * .9);
      bxLine(x, y, x + Math.cos(ang) * 150 * e, y + Math.sin(ang) * 150 * e, col, 2, a * .55);
    }
    bxRing(cx, oy, 90 + e * 60, col, 1.5, a * .4);
  };
  F.mine = (fx, k, col, W, H, cx, cy) => {
    // 多个火球依次炸开成放射火星
    const a = 1 - k;
    for (let i = 0; i < 6; i++) {
      const t = k * 6 - i; if (t < 0 || t > 1) continue;
      const x = 60 + (i * 137 % (W - 120)), y = 80 + (i * 91 % (H - 200));
      bxGlow(x, y, 30 + t * 80, '#ff9c3a', (1 - t) * .8);
      for (let j = 0; j < 9; j++) {
        const ang = j / 9 * TAU + i;
        bxLine(x, y, x + Math.cos(ang) * t * 90, y + Math.sin(ang) * t * 90, j % 2 ? col : '#ffe9a8', 3, (1 - t) * a);
      }
    }
  };
  F.meteor = (fx, k, col, W, H, cx, cy) => {
    // 带尾迹的斜线群从上方坠落
    const e = EZ(k), a = 1 - k;
    for (let i = 0; i < 18; i++) {
      const x = (i * 83 % W) + e * 180, y = ((i * 67 + e * H * 1.8) % (H + 200)) - 100;
      bxLine(x - 40 * e, y - 90 * e, x, y, i % 3 ? col : '#ffffff', 4, a * .8);
      bxStar(x, y, 8, '#fff2c8', a);
    }
  };
  F.spiral = (fx, k, col, W, H, cx, cy) => {
    // 六条阿基米德螺线自中心旋出
    const e = EZ(k), a = 1 - k;
    for (let arm = 0; arm < 6; arm++) {
      ctx.save(); ctx.globalAlpha = a * .8; ctx.strokeStyle = arm % 2 ? col : '#e8d0ff'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 50; i++) {
        const t = i / 50, ang = t * 6 + arm / 6 * TAU + k * 2, r = t * 330 * e;
        const x = cx + Math.cos(ang) * r, y = cy - 60 + Math.sin(ang) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.restore();
    }
  };
  F.shower = (fx, k, col, W, H, cx, cy) => {
    // 大量小星点随机散布并拖短尾
    const e = EZ(k), a = 1 - k;
    for (let i = 0; i < 54; i++) {
      const x = (i * 149 % W), y = (i * 227 % H) + e * 60 - 30;
      bxStar(x, y, 4 + (i % 4) * 2, i % 3 ? col : '#ffffff', a * .85);
      bxLine(x, y - 6, x, y - 16 - e * 20, col, 1.5, a * .4);
    }
  };

  /* ---------------- 十六夜 咲夜 ---------------- */
  F.knifeVolley = (fx, k, col, W, H, cx, cy) => {
    // 数十把银刀呈扇形定格
    const e = EZ(k), a = 1 - k;
    for (let i = 0; i < 26; i++) {
      const ang = -Math.PI * .1 - i / 25 * Math.PI * .8, r = 40 + e * 260;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      bxPoly([[x, y - 13], [x + 4, y], [x, y + 9], [x - 4, y]],
        i % 2 ? '#dce6f5' : col, 1, a * .9, true);
    }
  };
  F.timeFreeze = (fx, k, col, W, H, cx, cy) => {
    // 定格的几何碎片 + 一条水平扫描线
    const a = 1 - k, e = EZ(k);
    for (let i = 0; i < 22; i++) {
      const x = (i * 173 % W), y = (i * 109 % H), s = 10 + (i % 4) * 9;
      bxPoly([[x, y], [x + s, y - s * .4], [x + s * .6, y + s]], col, 1.5, a * .55);
    }
    bxLine(0, e * H, W, e * H, '#ffffff', 5, a * .9);
    bxLine(0, e * H + 8, W, e * H + 8, col, 2, a * .6);
  };
  F.clockDial = (fx, k, col, W, H, cx, cy) => {
    // 巨大钟面刻度与旋转指针
    const e = EZ(k), a = 1 - k, r = 60 + e * 210, oy = cy - 60;
    bxRing(cx, oy, r, col, 4, a * .85);
    bxRing(cx, oy, r * .82, '#dce6f5', 1.5, a * .5);
    for (let i = 0; i < 12; i++) {
      const ang = i / 12 * TAU - Math.PI / 2;
      bxLine(cx + Math.cos(ang) * r * .82, oy + Math.sin(ang) * r * .82,
        cx + Math.cos(ang) * r, oy + Math.sin(ang) * r, '#f2f6fa', i % 3 ? 2 : 4, a * .9);
    }
    bxLine(cx, oy, cx + Math.cos(k * 8) * r * .7, oy + Math.sin(k * 8) * r * .7, '#ffffff', 5, a);
    bxLine(cx, oy, cx + Math.cos(k * 1.5) * r * .5, oy + Math.sin(k * 1.5) * r * .5, col, 3, a);
  };
  F.afterimage = (fx, k, col, W, H, cx, cy) => {
    // 三个半透明自机剪影同时出刀
    const a = 1 - k, e = EZ(k);
    for (let g = -1; g <= 1; g++) {
      const x = cx + g * (50 + e * 100);
      bxPoly([[x, cy - 26], [x - 16, cy + 16], [x + 16, cy + 16]], col, 2, a * (g === 0 ? .8 : .4), true);
      bxDot(x, cy - 30, 9, '#ffe2cf', a * .7);
      for (let j = 0; j < 3; j++)
        bxLine(x + (j - 1) * 9, cy - 20, x + (j - 1) * 22, cy - 130 * e, '#dce6f5', 2.5, a * .8);
    }
  };
  F.rewind = (fx, k, col, W, H, cx, cy) => {
    // 轨迹先向外再折返回中心
    const a = 1 - k, e = k < .5 ? EZ(k * 2) : EZ((1 - k) * 2);
    for (let i = 0; i < 14; i++) {
      const ang = i / 14 * TAU, x1 = cx + Math.cos(ang) * 40, y1 = cy - 40 + Math.sin(ang) * 40;
      const x2 = cx + Math.cos(ang) * (60 + e * 280), y2 = cy - 40 + Math.sin(ang) * (60 + e * 280);
      bxLine(x1, y1, x2, y2, i % 2 ? col : '#ffffff', 3, a * .7);
      bxDot(x2, y2, 5, '#dce6f5', a * .9);
    }
  };
  F.chronoLance = (fx, k, col, W, H, cx, cy) => {
    // 三道细长光枪纵贯画面，中段留下跃迁残影
    const a = 1 - k, e = EZ(k);
    for (let i = -1; i <= 1; i++) {
      const x = cx + i * 74;
      bxLine(x, cy + 30, x + i * 12, -20, '#ffffff', 8, a * .75);
      bxLine(x, cy + 30, x + i * 12, -20, col, 3, a);
      const jy = cy - 120 - e * 320;
      bxLine(x - 14, jy - 8, x + 14, jy + 8, '#dce6f5', 2, a * .7);
      bxLine(x - 14, jy + 8, x + 14, jy - 8, '#dce6f5', 2, a * .7);
    }
  };
  F.ricochet = (fx, k, col, W, H, cx, cy) => {
    // 折线在四壁之间反复反弹
    const a = 1 - k, e = EZ(k);
    for (let j = 0; j < 4; j++) {
      const pts = []; let x = cx, y = cy - 40, vx = (j % 2 ? 1 : -1) * 150, vy = -120 - j * 22;
      for (let i = 0; i < 7; i++) {
        x += vx * e * .06; y += vy * e * .06;
        if (x < 8 || x > W - 8) { vx = -vx; x = M.clamp(x, 8, W - 8); }
        if (y < 8 || y > H - 8) { vy = -vy; y = M.clamp(y, 8, H - 8); }
        pts.push([x, y]);
      }
      ctx.save(); ctx.globalAlpha = a * .7; ctx.strokeStyle = j % 2 ? col : '#dce6f5'; ctx.lineWidth = 3;
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.stroke(); ctx.restore();
    }
  };
  F.timeField = (fx, k, col, W, H, cx, cy) => {
    // 前方远处展开的方形时钟网格
    const e = EZ(k), a = 1 - k, s = 40 + e * 130, ox = cx, oy = cy - 240;
    for (let i = -3; i <= 3; i++) {
      bxLine(ox - s, oy + i * s / 3, ox + s, oy + i * s / 3, i % 2 ? col : '#dce6f5', 2, a * .6);
      bxLine(ox + i * s / 3, oy - s, ox + i * s / 3, oy + s, col, 2, a * .6);
    }
    bxRing(ox, oy, s * .75, '#ffffff', 4, a * .8);
    for (let i = 0; i < 12; i++) {
      const ang = i / 12 * TAU;
      bxLine(ox + Math.cos(ang) * s * .75, oy + Math.sin(ang) * s * .75,
        ox + Math.cos(ang) * s, oy + Math.sin(ang) * s, '#f2f6fa', 3, a);
    }
  };
  F.converge = (fx, k, col, W, H, cx, cy) => {
    // 多条斜线从两侧汇于一点后爆开
    const a = 1 - k, e = EZ(k), fx2 = cx, fy = cy - 250;
    for (let i = 0; i < 18; i++) {
      const t = i / 17, sx = t < .5 ? -40 : W + 40, sy = 40 + (i % 9) * 78;
      const px = fx2 + (sx - fx2) * (1 - e), py = fy + (sy - fy) * (1 - e);
      bxLine(sx, sy, px, py, i % 2 ? col : '#ffffff', 2.5, a * .7);
    }
    bxGlow(fx2, fy, 20 + e * 90, '#ffffff', a * .7);
  };
  F.twelveStrike = (fx, k, col, W, H, cx, cy) => {
    // 12 条放射线 + 环形刻度同时全开
    const e = EZ(k), a = 1 - k, oy = cy - 40;
    for (let i = 0; i < 12; i++) {
      const ang = i / 12 * TAU + k * .5;
      bxLine(cx, oy, cx + Math.cos(ang) * 560 * e, oy + Math.sin(ang) * 560 * e,
        i % 2 ? col : '#dce6f5', 4, a * .7);
      bxDot(cx + Math.cos(ang) * 300 * e, oy + Math.sin(ang) * 300 * e, 6, '#ffffff', a * .9);
    }
    bxRing(cx, oy, 300 * e, '#f2f6fa', 2, a * .6);
  };

  R.drawBombFx = function (fx) {
    if (!fx) return;
    const k = M.clamp(fx.t / fx.dur, 0, 1);
    const p = G.player;
    const cx = p ? p.x : G.PF.w / 2, cy = p ? p.y : G.PF.h * .72;
    const col = C[fx.color] || fx.color;
    const fn = R.BOMB_FX[fx.fx] || R.BOMB_FX.ofuda;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fn(fx, k, col, G.PF.w, G.PF.h, cx, cy, fx.t);
    ctx.restore();
  };

  /* ================= 符卡宣言 ================= */
  R.drawDeclare = function (d) {
    if (!d) return;
    const k = M.clamp(d.t / 2.3, 0, 1);
    const slide = (1 - M.ease(Math.min(1, k * 3))) * 340;
    ctx.save();
    // 放射背景
    ctx.save(); ctx.globalAlpha = .16 * (1 - k * .5);
    ctx.translate(G.PF.w / 2, G.PF.h * .38);
    for (let i = 0; i < 28; i++) {
      ctx.rotate(TAU / 28);
      ctx.fillStyle = i % 2 ? d.color : '#fff';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(560, -18); ctx.lineTo(560, 18); ctx.fill();
    }
    ctx.restore();
    // 斜切红白条
    ctx.save(); ctx.translate(slide, 0); ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    ctx.fillStyle = 'rgba(140,22,48,.86)';
    ctx.beginPath(); ctx.moveTo(-30, 176); ctx.lineTo(G.PF.w + 30, 138);
    ctx.lineTo(G.PF.w + 30, 258); ctx.lineTo(-30, 296); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8c57a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-30, 176); ctx.lineTo(G.PF.w + 30, 138); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-30, 296); ctx.lineTo(G.PF.w + 30, 258); ctx.stroke();
    glowText(d.text, G.PF.w / 2, 226, 27, '#fff6e4', d.color);
    text(d.sub, G.PF.w / 2, 254, 13, '#f4d7c2', 'center');
    ctx.restore();
    ctx.restore();
  };

  /* ================= 0.5 秒决断特效 ================= */
  R.drawGrace = function (gr) {
    if (!gr) return;
    const k = 1 - gr.left / .5; // 0→1
    const W = G.PF.w, H = G.PF.h;
    ctx.save();
    // 色差 / 时间静止滤镜
    ctx.globalAlpha = .30; ctx.fillStyle = '#2a0b1c'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .075;
    ctx.fillStyle = k > .5 ? '#66e0ff' : '#ff5570';
    for (let y = 0; y < H; y += 11) ctx.fillRect((Math.sin(y * .1 + G.rtime * 30) * 6), y, W, 1.5);
    // 裂纹
    ctx.globalAlpha = .8;
    ctx.strokeStyle = '#fff2e0'; ctx.lineWidth = 2;
    const cx = gr.x, cy = gr.y;
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU + .2, len = 40 + (i * 37 % 90) + k * 60;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len * .55, cy + Math.sin(a) * len * .55);
      ctx.lineTo(cx + Math.cos(a + .12) * len, cy + Math.sin(a + .12) * len);
      ctx.stroke();
    }
    // 碎裂符札
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + G.rtime * .8;
      const r = 60 + k * 120 + i * 6;
      ctx.save(); ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .7);
      ctx.rotate(a + k * 3); ctx.globalAlpha = .8 - k * .3;
      ctx.fillStyle = '#fff6e4'; ctx.fillRect(-6, -10, 12, 20);
      ctx.strokeStyle = '#c8384f'; ctx.lineWidth = 1.5; ctx.strokeRect(-6, -10, 12, 20);
      ctx.restore();
    }
    // 倒计时环
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + TAU * (gr.left / .5)); ctx.stroke();
    // 大字（深色底衬，保证弹幕之上也读得清）
    const ty = H * .30;
    ctx.fillStyle = 'rgba(16,5,20,.78)'; rr(W / 2 - 268, ty - 44, 536, 120, 4); ctx.fill();
    ctx.strokeStyle = gr.canBomb ? 'rgba(255,211,106,.65)' : 'rgba(255,85,112,.6)';
    ctx.lineWidth = 1.5; rr(W / 2 - 268, ty - 44, 536, 120, 4); ctx.stroke();
    glowText('符卡崩壊の危機', W / 2, ty, 32, '#fff0dc', '#ff3a60');
    text('0.5 秒 · 大招で無効化 / 見送れば符卡が割れる', W / 2, ty + 29, 13, '#f0d8cc', 'center', GOTH);
    const ready = gr.canBomb;
    glowText(ready ? '▶  X / K  :  大招で切り抜ける' : '霊力不足 … 符卡が割れる',
      W / 2, ty + 60, 17, ready ? '#ffe9a8' : '#e7bec8', ready ? '#ffb347' : '#ff5570');
    ctx.restore();
  };

  /* ================= 游戏区边框 ================= */
  R.drawFrame = function () {
    const p = G.PF;
    ctx.save();
    ctx.strokeStyle = 'rgba(232,197,122,.65)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    ctx.strokeStyle = 'rgba(232,197,122,.22)'; ctx.strokeRect(p.x - 7, p.y - 7, p.w + 14, p.h + 14);
    // 四角纹样
    for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const x = p.x + sx * p.w, y = p.y + sy * p.h;
      ctx.fillStyle = '#e8c57a';
      ctx.save(); ctx.translate(x, y); ctx.scale(sx ? -1 : 1, sy ? -1 : 1);
      ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(18, -6); ctx.lineTo(-6, 18); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  /* ================= HUD ================= */
  function bar(x, y, w, h, v, color, bg = 'rgba(255,255,255,.09)') {
    ctx.fillStyle = bg; rr(x, y, w, h, h / 2); ctx.fill();
    if (v > 0) {
      ctx.fillStyle = color; rr(x, y, Math.max(3, w * M.clamp(v, 0, 1)), h, h / 2); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .4;
      ctx.fillStyle = color; rr(x, y, Math.max(3, w * M.clamp(v, 0, 1)), h, h / 2); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = 'rgba(232,197,122,.3)'; ctx.lineWidth = 1; rr(x, y, w, h, h / 2); ctx.stroke();
  }

  R.drawHUD = function () {
    const h = G.HUD, x = h.x, y = h.y, w = h.w;
    const p = G.player, st = G.game && G.game.stage;
    const zh = G.lang === 'zh';
    ctx.save();
    // 底板
    const g = ctx.createLinearGradient(x, y, x + w, y + h.h);
    g.addColorStop(0, 'rgba(24,12,32,.94)'); g.addColorStop(1, 'rgba(10,6,18,.96)');
    ctx.fillStyle = g; rr(x, y, w, h.h, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(232,197,122,.45)'; ctx.lineWidth = 1; rr(x, y, w, h.h, 4); ctx.stroke();
    // 装饰线
    line(x + 18, y + 54, x + w - 18, y + 54, 'rgba(232,197,122,.35)', 1);
    glowText(G.lang === 'zh' ? '东 方 残 符 异 变' : '東 方 残 符 異 変',
      x + w / 2, y + 36, 22, '#ffe9c8', '#c8384f');
    const dif = G.diff || G.DIFFS[1];
    text((st ? `${st.name}  ·  ${st.place}` : 'FRAGMENTED SPELLCARD INCIDENT') +
      `  ·  ${dif.no}`, x + w / 2, y + 50, 10.5, '#a894a4', 'center', GOTH);

    let Y = y + 78;
    // 分数
    text('SCORE', x + 22, Y, 12, '#c9a8b8', 'left', GOTH);
    text(String(Math.floor(G.score)).padStart(9, '0'), x + w - 22, Y + 2, 21, '#ffe9a8', 'right', MIN);
    Y += 24;
    text('擦弾 GRAZE', x + 22, Y, 11, '#c9a8b8', 'left', GOTH);
    text(String(G.graze), x + w - 22, Y, 14, '#e8d0dc', 'right', MIN);
    Y += 30;
    // 残机 / 灵力
    if (p) {
      text('残機', x + 22, Y, 12, '#c9a8b8', 'left', MIN);
      for (let i = 0; i < Math.min(5, p.lives); i++) {
        ctx.save(); ctx.translate(x + 82 + i * 21, Y - 4); ctx.rotate(.4);
        ctx.fillStyle = '#ff9ec8'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.5, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      Y += 22;
      text('霊力 / 大招', x + 22, Y, 12, '#c9a8b8', 'left', MIN);
      const full = p.power >= 100;
      text(full ? 'READY  ▶ X' : Math.floor(p.power) + ' %', x + w - 22, Y, 13, full ? '#ffe07a' : '#bba6b4', 'right', GOTH);
      Y += 8;
      bar(x + 22, Y, w - 44, 9, p.power / 100, full ? '#ffd36a' : '#9f74c8');
      Y += 22;
      /* V 冲刺冷却条 */
      const dready = (p.dashCd || 0) <= 0;
      text(zh ? 'V 冲刺' : 'V ダッシュ', x + 22, Y, 11, '#c9a8b8', 'left', MIN);
      text(dready ? 'READY' : (p.dashCd.toFixed(1) + ' s'), x + w - 22, Y, 12,
        dready ? '#ffe07a' : '#9f8fa2', 'right', GOTH);
      Y += 7;
      bar(x + 22, Y, w - 44, 5, dready ? 1 : 1 - p.dashCd / 20, dready ? '#ffd36a' : '#7f6a90');
      Y += 18;
    }
    line(x + 18, Y, x + w - 18, Y, 'rgba(232,197,122,.22)', 1); Y += 20;

    // 符卡槽
    text('符卡编成  ·  C 切替 / 1-5 直选', x + 22, Y, 12, '#e8c57a', 'left', MIN); Y += 16;
    if (p) {
      const sw = (w - 44) / 5;
      for (let i = 0; i < 5; i++) {
        const broken = p.slots[i].broken;
        const sp = G.getSpell(p.charId, p.slots[i].idx);
        const isCur = i === p.slot;
        const bx = x + 22 + i * sw;
        ctx.fillStyle = broken ? 'rgba(60,40,50,.4)' : (isCur ? 'rgba(190,50,86,.42)' : 'rgba(255,255,255,.04)');
        rr(bx + 2, Y, sw - 4, 62, 3); ctx.fill();
        ctx.strokeStyle = broken ? 'rgba(150,120,130,.4)' : (isCur ? '#ffd36a' : 'rgba(232,197,122,.28)');
        ctx.lineWidth = isCur ? 2 : 1; rr(bx + 2, Y, sw - 4, 62, 3); ctx.stroke();
        if (isCur && !broken) {
          ctx.save(); ctx.shadowColor = '#ffd36a'; ctx.shadowBlur = 12;
          rr(bx + 2, Y, sw - 4, 62, 3); ctx.stroke(); ctx.restore();
        }
        text(String(i + 1), bx + 8, Y + 14, 10, '#a894a4', 'left', GOTH);
        ctx.globalAlpha = broken ? .3 : 1;
        glowText(sp.glyph, bx + sw / 2, Y + 36, 22, broken ? '#7a6a74' : (C[sp.color] || '#fff'), broken ? '#000' : (C[sp.color] || '#fff'));
        text(sp.name.slice(0, 5), bx + sw / 2, Y + 54, 10, broken ? '#7a6a74' : '#f0dcc8', 'center', MIN);
        ctx.globalAlpha = 1;
        if (broken) {
          line(bx + 8, Y + 8, bx + sw - 8, Y + 54, '#c8384f', 1.5);
          line(bx + sw - 8, Y + 8, bx + 8, Y + 54, '#c8384f', 1.5);
        }
      }
      Y += 80;
      const cur = G.getSpell(p.charId, p.slots[p.slot].idx);
      text('現在  ' + cur.name, x + 22, Y, 13, '#ffe9c8', 'left', MIN); Y += 17;
      text(zh ? `命中 ${cur.accLabel} · 理论 DPS ${cur.dps} · ${cur.kindZh}`
        : `命中 ${cur.accLabelJa} · 理論 DPS ${cur.dps} · ${cur.kindJa}`,
        x + 22, Y, 10.5, '#a894a4', 'left', MIN); Y += 18;
      text(cur.bomb.name, x + 22, Y, 12, '#f0a9bd', 'left', MIN); Y += 22;
    }
    line(x + 18, Y, x + w - 18, Y, 'rgba(232,197,122,.22)', 1); Y += 22;

    // Boss 信息
    const b = G.boss;
    if (b && b.def) {
      text('BOSS  ' + b.def.name, x + 22, Y, 16, '#ffe0b8', 'left', MIN); Y += 8;
      text(`符卡 ${b.spellNo + 1} / ${b.def.spells.length}`, x + w - 22, Y - 8, 11, '#c9a8b8', 'right', GOTH);
      Y += 16;
      const sp = b.spell;
      if (sp) {
        // 符卡名
        ctx.fillStyle = 'rgba(160,40,72,.25)'; rr(x + 20, Y - 15, w - 40, 27, 3); ctx.fill();
        text(sp.name, x + 26, Y + 3, 12.5, '#fff0d8', 'left', MIN); Y += 26;
        if (sp.type === 'barrier') {
          text('結界条  ·  撃破で終了', x + 22, Y, 11, '#c9a8b8', 'left', GOTH);
          const hpMax = b.hpMax || sp.hp;
          text(Math.ceil(b.hp) + ' / ' + Math.round(hpMax), x + w - 22, Y, 11, '#e8d0dc', 'right', GOTH);
          Y += 8;
          bar(x + 22, Y, w - 44, 10, b.hp / hpMax, '#ff6a8a');
          Y += 22;
        } else {
          text('時限符卡  ·  時間切れで終了', x + 22, Y, 11, '#c9a8b8', 'left', GOTH); Y += 8;
          bar(x + 22, Y, w - 44, 10, b.left / sp.duration, '#7fd8ff');
          Y += 22;
        }
        text('残り ' + b.left.toFixed(1) + ' 秒' + (sp.type === 'barrier' ? '（長时限 ' + sp.timeout + ' 秒）' : ''),
          x + 22, Y, 11.5, '#ffd9a8', 'left', GOTH);
        Y += 20;
        // 符卡进度点
        for (let i = 0; i < b.def.spells.length; i++) {
          ctx.fillStyle = i < b.spellNo ? '#e8c57a' : (i === b.spellNo ? '#ff5570' : 'rgba(255,255,255,.18)');
          ctx.beginPath(); ctx.arc(x + 28 + i * 17, Y, 4.5, 0, TAU); ctx.fill();
        }
        Y += 24;
      }
    } else {
      text('道中  ·  STAGE', x + 22, Y, 15, '#ffe0b8', 'left', MIN); Y += 22;
      if (st) {
        const prog = M.clamp((G.game.stageTick || 0) / st.duration, 0, 1);
        bar(x + 22, Y, w - 44, 8, prog, '#9fd8ff'); Y += 22;
        text('残り ' + Math.max(0, Math.ceil((st.duration - (G.game.stageTick || 0)) / 60)) + ' 秒',
          x + 22, Y, 11.5, '#c9a8b8', 'left', GOTH); Y += 20;
      }
    }
    // 音乐信息
    Y = y + h.h - 92;
    line(x + 18, Y, x + w - 18, Y, 'rgba(232,197,122,.22)', 1); Y += 20;
    const tr = G.MUSIC.tracks[G.audio.nowPlaying()];
    text('♪  ' + (tr ? tr.title : '—'), x + 22, Y, 13, '#e8c57a', 'left', MIN); Y += 17;
    if (tr) text(`${tr.key}  ·  BPM ${tr.bpm}  ·  独自合成`, x + 22, Y, 10.5, '#8f7f90', 'left', GOTH);
    Y += 18;
    text('Z 射撃 / Shift 低速 / X 大招 / C 符卡 / Esc 休止', x + 22, Y, 10.5, '#8f7f90', 'left', GOTH);
    ctx.restore();
  };

  /* ================= 顶部 Boss 血条（游戏区内） ================= */
  R.drawTopBar = function () {
    const b = G.boss; if (!b || !b.spell) return;
    const sp = b.spell, W = G.PF.w;
    ctx.save();
    ctx.fillStyle = 'rgba(10,4,16,.5)'; ctx.fillRect(0, 0, W, 22);
    const v = sp.type === 'barrier' ? b.hp / (b.hpMax || sp.hp) : b.left / sp.duration;
    const col = sp.type === 'barrier' ? '#ff5570' : '#7fd8ff';
    ctx.fillStyle = col; ctx.fillRect(0, 19, W * M.clamp(v, 0, 1), 3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55;
    ctx.fillStyle = col; ctx.fillRect(0, 17, W * M.clamp(v, 0, 1), 7); ctx.restore();
    text(sp.name, W / 2, 14, 11.5, '#fff0dc', 'center', MIN);
    ctx.restore();
  };

  /* ================= 剧情立绘 =================
   * 修正覆盖：立绘统一收进「对话框上方」的专用画幅内（TOP ~ BOTTOM），
   * 底部做渐隐而非硬裁切；同时压暗战斗区网格、给立绘独立背光，
   * 使左右两张立绘互不遮挡、也不被对话框或边框压住。 */
  R.drawStoryScene = function (lineObj) {
    const W = G.W, TOP = 36, BOTTOM = 592;
    const selfIsSpeaker = lineObj.who === 'self';
    const other = ['chiyo', 'honoka', 'ryou'].includes(lineObj.who) ? lineObj.who : null;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, TOP, W, BOTTOM - TOP); ctx.clip();

    // 画幅暗底：与战斗区网格分离
    const shade = ctx.createLinearGradient(0, TOP, 0, BOTTOM);
    shade.addColorStop(0, 'rgba(8,4,14,.30)');
    shade.addColorStop(.6, 'rgba(8,4,14,.14)');
    shade.addColorStop(1, 'rgba(8,4,14,.66)');
    ctx.fillStyle = shade; ctx.fillRect(0, TOP, W, BOTTOM - TOP);

    // 左：自机立绘（缩放与位置均收在画幅内，不再被对话框切掉下摆）
    if (G.player) {
      ctx.save();
      const g1 = ctx.createRadialGradient(266, 340, 16, 266, 340, 226);
      g1.addColorStop(0, 'rgba(255,150,190,.15)'); g1.addColorStop(1, 'rgba(255,150,190,0)');
      ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(266, 340, 226, 0, TAU); ctx.fill();
      ctx.translate(266, 348); ctx.scale(3.9, 3.9);
      ctx.globalAlpha = selfIsSpeaker ? 1 : .48;
      R.drawPlayer({ x: 0, y: 0, charId: G.player.charId, focus: false,
        invuln: 0, bombTime: 0, power: 0 }, 1);
      ctx.restore();
    }

    // 右：Boss 立绘 / 旁白纹章
    ctx.save();
    if (other) {
      const bd = G.BOSSES.list.find(d => d.id === other);
      const g2 = ctx.createRadialGradient(946, 316, 18, 946, 316, 230);
      g2.addColorStop(0, (bd ? bd.color : '#e8c57a') + '2c');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(946, 316, 230, 0, TAU); ctx.fill();
      ctx.translate(946, 316); ctx.scale(2.35, 2.35);
      ctx.globalAlpha = selfIsSpeaker ? .5 : 1;
      R.drawBoss({ x: 0, y: 0, def: bd }, false);
    } else {
      ctx.translate(946, 306); ctx.globalAlpha = .4;
      ctx.save(); ctx.rotate(G.rtime * .045);
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = k === 1 ? '#ff9ec8' : '#e8c57a'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU, rad = (k === 1 ? 70 : 100) + (i % 2 ? -12 : 8);
          i ? ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
      ctx.save(); ctx.rotate(-.12); ctx.globalAlpha = .5;
      ctx.fillStyle = '#f6ecd9'; ctx.fillRect(-27, -58, 54, 116);
      ctx.strokeStyle = '#c8384f'; ctx.lineWidth = 3; ctx.strokeRect(-27, -58, 54, 116);
      ctx.fillStyle = '#c8384f';
      for (let i = -1; i <= 1; i++) ctx.fillRect(-16, i * 24 - 2, 32, 4);
      ctx.fillRect(-2, -54, 4, 108);
      ctx.restore();
    }
    ctx.restore();

    // 底部渐隐：立绘自然溶入背景，与对话框之间不再出现生硬的水平截断
    const fade = ctx.createLinearGradient(0, BOTTOM - 150, 0, BOTTOM);
    fade.addColorStop(0, 'rgba(8,4,14,0)');
    fade.addColorStop(1, 'rgba(8,4,14,.9)');
    ctx.fillStyle = fade; ctx.fillRect(0, BOTTOM - 150, W, 150);
    ctx.restore();
    /* 画幅以下延续同一暗度，消除与对话框之间的水平断层 */
    ctx.fillStyle = 'rgba(8,4,14,.9)';
    ctx.fillRect(0, BOTTOM, W, G.H - BOTTOM);
  };

  /* ================= 综合帧 ================= */
  R.frame = function (rdt) {
    ctx = G.ctx;
    const gm = G.game;
    const theme = G.state === 'playing' || G.state === 'paused' || G.state === 'story'
      ? (gm && gm.currentTheme ? gm.currentTheme : 'shrine') : 'title';
    const tint = gm && gm.bgTint;

    // 整体背景
    ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, G.W, G.H);
    R.drawBackdrop(theme, G.rtime, null);

    // 游戏区
    ctx.save();
    ctx.translate(G.PF.x + G.fx.shakeX, G.PF.y + G.fx.shakeY);
    ctx.beginPath(); ctx.rect(0, 0, G.PF.w, G.PF.h); ctx.clip();
    R.drawFieldBg(theme, G.rtime, tint);
    if (G.state === 'playing' || G.state === 'paused') {
      // 背景装饰：符卡光环
      if (G.boss && G.boss.spell) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .13;
        ctx.translate(G.boss.x, G.boss.y);
        for (let i = 0; i < 3; i++) {
          ctx.save(); ctx.rotate(G.rtime * (i % 2 ? -.2 : .25) + i);
          ctx.strokeStyle = G.boss.def.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 90 + i * 32, 0, TAU); ctx.stroke(); ctx.restore();
        }
        ctx.restore();
      }
      /* 自机弹幕画在最底层：敌弹、激光、Boss、杂鱼一律盖在它上面，
         保证玩家永远先看清该躲什么，而不是被自己的火力糊住视野。 */
      R.drawShots();
      R.drawWaves();
      R.drawLasers();
      for (const e of G.enemies) R.drawEnemy(e);
      if (G.boss) R.drawBoss(G.boss, false);
      R.drawBullets();
      R.drawParticles();
      if (G.player && G.player.alive) R.drawPlayer(G.player);
      R.drawClockFace();
      R.drawBombFx(gm && gm.bombFx);
      R.drawTopBar();
      R.drawDeclare(gm && gm.declare);
      if (gm && gm.grace) R.drawGrace(gm.grace);
    } else {
      // 标题 / 菜单时游戏区也放一点装饰弹幕；剧情时保持干净，避免盖住立绘
      if (G.state !== 'story') R.drawParticles();
    }
    ctx.restore();
    R.drawFrame();

    // 剧情立绘盖在游戏区之上（必须在场地区域绘制完成之后）
    if (G.state === 'story') R.drawStoryScene(gm && gm.dialogLine || { who: 'narr' });

    // HUD
    if (G.state === 'playing' || G.state === 'paused') R.drawHUD();

    // 全屏特效
    if (G.fx.flash > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, G.fx.flash);
      ctx.fillStyle = G.fx.flashColor; ctx.fillRect(0, 0, G.W, G.H); ctx.restore();
    }
    if (gm && gm.grace) {
      ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#ff3355';
      ctx.fillRect(0, 0, G.W, G.H); ctx.restore();
    }
    /* 时停大招：负片 = 对已渲染的画面逐像素取反色（R/G/B 各自 255-x），
       不是盖一层白／异色遮挡。Canvas 无 image filter 时用 difference +
       纯白 full-alpha 覆盖可得到逐通道取反，故先取消 globalAlpha。 */
    if (G.fx.invert > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'difference';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, G.W, G.H);
      ctx.restore();
    }
    if (G.fx.warp > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(.28, G.fx.warp * .28);
      ctx.strokeStyle = '#a8d8ff'; ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const y = (i + 1) / 11 * G.H + Math.sin(G.rtime * 6 + i) * 9;
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= G.W; x += 40)
          ctx.lineTo(x, y + Math.sin(x * .02 + G.rtime * 9 + i) * 7);
        ctx.stroke();
      }
      ctx.restore();
    }
    // 暗角
    const vg = ctx.createRadialGradient(G.W / 2, G.H / 2, 300, G.W / 2, G.H / 2, 760);
    vg.addColorStop(0, '#0000'); vg.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, G.W, G.H);
  };
})();
