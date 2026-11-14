/* ===========================================================
 * game.js — 主游戏逻辑
 * 状态流 / 自机 / 符卡 / 大招 / 决断 / 敌弹 / 杂鱼 / Boss / 关卡
 * 固定步长 60 FPS，dt 单位秒
 * =========================================================== */
(function () {
  const G = window.G, M = G.M, P = G.PAT, TAU = G.TAU;
  const GM = G.game = {};
  const STEP = 1 / 60;

  GM.stage = null; GM.stageTick = 0; GM.waveIdx = 0;
  GM.phase = 'idle';           // stage | boss | transition
  GM.currentTheme = 'shrine'; GM.bgTint = null;
  GM.declare = null; GM.grace = null; GM.bombFx = null;
  GM.dialogLine = null;
  GM.dialogQueue = null; GM.dialogDone = null; GM.dialogIdx = 0;
  GM.spellDelay = 0; GM.result = null; GM.debug = false;
  GM.fps = 60; GM.bulletCount = 0;
  GM.cheats = 0;        // 本局「赖皮再战」累计次数
  GM.checkpoint = null; // 失败时的续战断点

  /* =========================================================
   * 启动 / 状态流
   * ========================================================= */
  GM.startGame = function (charId, deck) {
    G.audio.init();
    G.killAll();
    const c = G.getChar(charId);
    const dif = G.diff || G.DIFFS[1];
    G.player = {
      charId, x: G.PF.w / 2, y: G.PF.h - 76, alive: true,
      lives: dif.lives, power: 100, slots: deck.map(i => ({ idx: i, broken: false })),
      slot: 0, fireT: 0, auxT: 0, invuln: 1.2, bombTime: 0,
      focus: false, hitR: c.stats.hitR, grazeR: c.stats.grazeR,
      speed: c.stats.speed, focusSpeed: c.stats.focus,
      dmgScale: c.stats.dmgScale, powerGain: c.stats.powerGain * dif.powerGain,
      bombScale: c.stats.bombScale || 1,
      /* V 冲刺：20 秒冷却，冲刺全程无敌 */
      dashCd: 0, dashTime: 0, dashDx: 0, dashDy: -1,
      lastDirX: 0, lastDirY: -1, dashTrail: 0,
      orbiters: [], frame: 0
    };
    G.score = 0; G.graze = 0; G.kills = 0;
    GM.cheats = 0; GM.checkpoint = null;
    GM.declare = null; GM.grace = null; GM.bombFx = null;
    GM.pendingSpell = null; GM.pendingBossDefeat = false; GM.spellDelay = 0;
    GM.dialogLine = null; GM.dialogQueue = null; GM.dialogDone = null;
    G.timeScale = 1; G.fx.flash = 0;
    GM.beginStage(0);
  };

  GM.beginStage = function (i) {
    G.stageIndex = i;
    const st = G.STAGES.get(i);
    if (!st) { GM.finish(true); return; }
    GM.stage = st; GM.stageTick = 0; GM.waveIdx = 0;
    GM.phase = 'transition'; GM.currentTheme = st.bg; GM.bgTint = null;
    G.boss = null;
    G.clearBullets(); G.enemies.length = 0; G.shots.length = 0;
    G.audio.playBGM(st.bgm);
    GM.playDialog(st.intro, () => GM.startStagePlay());
  };

  GM.startStagePlay = function () {
    GM.phase = 'stage'; G.state = 'playing'; G.timeScale = 1;
    if (G.player) { G.player.x = G.PF.w / 2; G.player.y = G.PF.h - 76; G.player.invuln = 1.2; }
    G.ui.hideAll(); G.audio.resumeCtx();
  };

  GM.startBoss = function () {
    const def = G.BOSSES.get(G.stageIndex);
    GM.phase = 'boss'; GM.currentTheme = def.bg; GM.bgTint = def.palette[0];
    G.clearBullets(); G.enemies.length = 0;
    G.boss = {
      def, x: G.PF.w / 2, y: 150, tx: G.PF.w / 2, ty: 150,
      spellNo: 0, spell: null, spellFrame: 0, hp: 0, left: 0,
      flash: 0, bob: 0,
      setTarget(x, y) { this.tx = x; this.ty = y; }
    };
    G.audio.playBGM(def.music);
    G.state = 'playing'; G.ui.hideAll();
    GM.pendingSpell = null; GM.pendingBossDefeat = false; GM.spellDelay = 0;
    GM.beginSpell(0);
  };

  GM.beginSpell = function (n) {
    const b = G.boss; if (!b) return;
    const tpl = b.def.spells[n];
    if (!tpl) { GM.bossDefeated(); return; }
    b.spellNo = n; b.spell = tpl; b.spellFrame = 0;
    /* 难度改变结界厚度；hpMax 供 HUD / 顶部血条按当前难度显示 */
    const dif = G.diff || G.DIFFS[1];
    b.hpMax = (tpl.hp || 0) * dif.bossHp;
    b.hp = b.hpMax; b.left = tpl.type === 'timeout' ? tpl.duration : tpl.timeout;
    G.clearBullets(true);
    G.lasers.length = 0;
    GM.bgTint = tpl.bgTint || b.def.palette[0];
    /* 清掉上一条符卡宣言的残留浮字，避免换符卡时两行台词叠在一起 */
    G.floaters = G.floaters.filter(f => f.tag !== 'declare');
    const zh = G.lang === 'zh';
    const hint = zh ? (tpl.hint || '') : (tpl.hintJa || tpl.hint || '');
    GM.declare = { text: tpl.name, sub: `${b.def.name}  ·  ${tpl.jp}  ·  ${hint}`,
      color: b.def.color, t: 0 };
    /* 符卡开场预铺的弹幕属于 Boss，不能被杂鱼低密度系数影响 */
    G._fireFrom = null;
    if (tpl.intro) tpl.intro(b);
    G.audio.sfx('declare');
    G.flash(.35, b.def.color); G.shake(7);
    const decl = tpl.declare ? (zh ? (G.tr ? G.tr(tpl.declare) : tpl.declare) : tpl.declare) : '';
    const ft = G.floatText(G.PF.w / 2, G.PF.h * .55, decl, '#ffe9c8', 14, 2.4);
    if (ft) ft.tag = 'declare';
  };

  GM.endSpell = function (reason) {
    const b = G.boss; if (!b || !b.spell) return;
    const tpl = b.spell;
    G.clearBullets(true);
    G.lasers.length = 0;
    G.audio.sfx(reason === 'break' ? 'bossDie' : 'spellEnd');
    G.flash(.5, reason === 'break' ? '#ffe0a0' : '#bfe8ff');
    G.shake(reason === 'break' ? 16 : 8);
    G.burst(b.x, b.y, reason === 'break' ? 'gold' : 'cyan', 34, 260, { type: 'shard' });
    const bonus = reason === 'break' ? 16000 : 6000;
    G.addScore(bonus + Math.floor(b.left * 100));
    G.floatText(b.x, b.y - 40, reason === 'break' ? '符卡撃破 +' + bonus : 'TIME OUT',
      reason === 'break' ? '#ffe07a' : '#bfe8ff', 19, 1.6);
    const next = b.spellNo + 1;
    b.spell = null; b.hp = 0;
    GM.spellDelay = 1.35;
    if (next >= b.def.spells.length) {
      GM.pendingBossDefeat = true;
    } else {
      GM.pendingSpell = next;
    }
  };

  GM.bossDefeated = function () {
    const b = G.boss; if (!b) return;
    G.audio.sfx('bossDie'); G.flash(1, '#fff2d0'); G.shake(24);
    for (let i = 0; i < 5; i++)
      setTimeout(() => G.burst(b.x + M.rand(-80, 80), b.y + M.rand(-60, 60), 'cream', 20, 240), i * 120);
    G.addScore(100000);
    G.boss = null; GM.phase = 'transition'; GM.bgTint = null;
    GM.currentTheme = GM.stage.bg;
    G.audio.playBGM('stage');
    const outro = GM.stage.outro;
    GM.playDialog(outro, () => {
      const next = G.stageIndex + 1;
      if (next < G.STAGES.list.length) GM.beginStage(next);
      else GM.finish(true);
    });
  };

  GM.finish = function (clear) {
    /* 失败时先记下断点（清屏之前），供「赖皮再战」从原位置续上 */
    if (!clear) GM.checkpoint = GM.captureCheckpoint();
    else GM.checkpoint = null;
    G.state = 'result'; G.timeScale = 1;
    G.audio.playBGM('title');
    /* 结算态不再跑世界更新，浮字与粒子会永远留在画面上，这里一并清掉 */
    G.floaters.length = 0; G.particles.length = 0;
    G.fx.flash = 0;
    G.clearBullets();
    GM.result = {
      clear, score: Math.floor(G.score), graze: G.graze, kills: G.kills,
      stage: G.stageIndex + 1, charId: G.player ? G.player.charId : 'reimu',
      broken: G.player ? G.player.slots.filter(s => s.broken).length : 0,
      lives: G.player ? G.player.lives : 0,
      diff: G.diff ? G.diff.no : 'Normal',
      cheats: GM.cheats || 0,
      canContinue: !clear && !!GM.checkpoint
    };
    G.ui.showResult(GM.result);
  };

  /* =========================================================
   * 赖皮再战：任意难度 Game Over 后从失败位置继续。
   * 代价：当前分数清零；通关结算留下「赖皮」标签与累计次数。
   * ========================================================= */
  GM.captureCheckpoint = function () {
    const p = G.player, b = G.boss;
    let di = 1;
    if (G.diff) { const k = G.DIFFS.findIndex(d => d.id === G.diff.id); if (k >= 0) di = k; }
    return {
      stageIndex: G.stageIndex, phase: GM.phase,
      stageTick: GM.stageTick, waveIdx: GM.waveIdx, diffIdx: di,
      charId: p ? p.charId : 'reimu',
      deck: p ? p.slots.map(x => x.idx) : [0, 1, 2, 3, 4],
      slot: p ? p.slot : 0,
      spellNo: b ? b.spellNo : -1,
      spellFrame: b ? b.spellFrame : 0,
      hp: b ? b.hp : 0, hpMax: b ? b.hpMax : 0, left: b ? b.left : 0,
      bx: b ? b.x : G.PF.w / 2, by: b ? b.y : 150,
      btx: b ? b.tx : G.PF.w / 2, bty: b ? b.ty : 150
    };
  };

  GM.continueGame = function () {
    const cp = GM.checkpoint; if (!cp) return false;
    GM.cheats = (GM.cheats || 0) + 1;
    G.score = 0;                         // 赖皮代价：分数清零
    const dif = G.DIFFS[cp.diffIdx] || G.DIFFS[1];
    G.diff = dif;
    const c = G.getChar(cp.charId);
    G.killAll();
    G.stageIndex = cp.stageIndex;
    GM.stage = G.STAGES.get(cp.stageIndex);
    GM.stageTick = cp.stageTick; GM.waveIdx = cp.waveIdx;
    G.player = {
      charId: cp.charId, x: G.PF.w / 2, y: G.PF.h - 76, alive: true,
      lives: dif.lives, power: 100,
      slots: cp.deck.map(i => ({ idx: i, broken: false })),
      slot: cp.slot, fireT: 0, auxT: 0, invuln: 2.6, bombTime: 0,
      focus: false, hitR: c.stats.hitR, grazeR: c.stats.grazeR,
      speed: c.stats.speed, focusSpeed: c.stats.focus,
      dmgScale: c.stats.dmgScale, powerGain: c.stats.powerGain * dif.powerGain,
      bombScale: c.stats.bombScale || 1,
      dashCd: 0, dashTime: 0, dashDx: 0, dashDy: -1,
      lastDirX: 0, lastDirY: -1, dashTrail: 0,
      orbiters: [], frame: 0
    };
    G.graze = 0; G.kills = 0;
    GM.declare = null; GM.grace = null; GM.bombFx = null;
    GM.pendingSpell = null; GM.pendingBossDefeat = false; GM.spellDelay = 0;
    GM.dialogQueue = null; GM.dialogDone = null; GM.dialogLine = null;
    G.timeScale = 1; G.fx.flash = 0;

    if (cp.phase === 'boss' && cp.spellNo >= 0) {
      const def = G.BOSSES.get(cp.stageIndex);
      GM.phase = 'boss'; GM.currentTheme = def.bg; GM.bgTint = def.palette[0];
      G.boss = {
        def, x: cp.bx, y: cp.by, tx: cp.btx, ty: cp.bty,
        spellNo: cp.spellNo, spell: def.spells[cp.spellNo],
        spellFrame: cp.spellFrame, hp: cp.hp, hpMax: cp.hpMax,
        left: cp.left, flash: 0, bob: 0,
        setTarget(x, y) { this.tx = x; this.ty = y; }
      };
      G.audio.playBGM(def.music);
    } else {
      GM.phase = 'stage'; GM.currentTheme = GM.stage.bg; GM.bgTint = null;
      G.boss = null;
      G.audio.playBGM(GM.stage.bgm);
    }
    G.state = 'playing'; G.ui.hideAll();
    G.flash(.5, '#ffd9a0'); G.shake(10);
    G.floatText(G.PF.w / 2, G.PF.h * .5,
      G.lang === 'zh' ? '赖皮再战 · 分数清零' : 'ずる再戦 · スコアリセット',
      '#ffe9a8', 20, 2.0);
    return true;
  };

  /* =========================================================
   * 剧情对话
   * ========================================================= */
  GM.playDialog = function (lines, done) {
    GM.dialogQueue = lines; GM.dialogIdx = 0; GM.dialogDone = done;
    G.state = 'story';
    /* 进入剧情时清掉战斗残留的浮动文字与粒子，避免叠在立绘上 */
    G.floaters.length = 0; G.particles.length = 0;
    GM.declare = null; GM.grace = null;
    G.ui.showStory();
    GM.showDialogLine();
  };
  GM.showDialogLine = function () {
    const l = GM.dialogQueue[GM.dialogIdx];
    GM.dialogLine = l;
    const p = G.player, c = p ? G.getChar(p.charId) : G.CHARS[0];
    const NAMES = { narr: '', chiyo: '綴屋 千代', honoka: '鏡井 仄', ryou: '祭篝 燎' };
    const who = l.who === 'self' ? c.name : (NAMES[l.who] !== undefined ? NAMES[l.who] : l.who);
    const txt = typeof l.text === 'function' ? l.text(c) : l.text;
    G.ui.setDialog(who, txt, GM.dialogIdx, GM.dialogQueue.length);
  };
  GM.advanceDialog = function () {
    if (G.state !== 'story') return;
    G.audio.sfx('ui');
    GM.dialogIdx++;
    if (GM.dialogIdx >= GM.dialogQueue.length) {
      const done = GM.dialogDone;
      GM.dialogQueue = null; GM.dialogDone = null; GM.dialogLine = null;
      if (done) done();
    } else GM.showDialogLine();
  };

  /* =========================================================
   * 玩家
   * ========================================================= */
  GM.switchSlot = function (dir, index) {
    const p = G.player; if (!p || GM.grace) return;
    let n;
    if (index !== undefined) n = index;
    else {
      n = p.slot;
      for (let k = 0; k < 5; k++) {
        n = (n + dir + 5) % 5;
        if (!p.slots[n].broken) break;
      }
    }
    if (n < 0 || n > 4 || p.slots[n].broken) { G.audio.sfx('cancel'); return; }
    if (n === p.slot) return;
    p.slot = n; G.audio.sfx('ok');
    const sp = G.getSpell(p.charId, p.slots[n].idx);
    G.floatText(p.x, p.y - 46, sp.name, G.COLORS[sp.color] || '#fff', 13, 1.0);
    G.burst(p.x, p.y, sp.color, 10, 100, { type: 'shard' });
  };

  /* V 冲刺：向当前移动方向（无输入时用最后移动方向）瞬移一段，全程无敌 */
  GM.DASH_CD = 20;
  GM.startDash = function () {
    const p = G.player; if (!p || !p.alive) return;
    const a = G.axis();
    let dx = a.x, dy = a.y;
    if (a.len < .01) { dx = p.lastDirX; dy = p.lastDirY; }
    if (Math.abs(dx) + Math.abs(dy) < .01) { dx = 0; dy = -1; }
    const l = Math.hypot(dx, dy) || 1;
    p.dashDx = dx / l; p.dashDy = dy / l;
    p.dashTime = .20; p.dashCd = GM.DASH_CD;
    p.invuln = Math.max(p.invuln, .32);
    G.audio.sfx('dash');
    G.burst(p.x, p.y, p.charId === 'marisa' ? 'gold' : (p.charId === 'sakuya' ? 'cyan' : 'sakura'),
      16, 190, { type: 'shard' });
    G.floatText(p.x, p.y - 46, 'DASH', '#fff0c8', 13, .7);
  };

  GM.updatePlayer = function (dt) {
    const p = G.player; if (!p || !p.alive) return;
    p.frame++;
    const a = G.axis();
    p.focus = G.focusDown();
    if (p.dashCd > 0) p.dashCd = Math.max(0, p.dashCd - dt);
    if (G.dashHit() && p.dashCd <= 0 && p.dashTime <= 0 && !GM.grace) GM.startDash();

    if (p.dashTime > 0) {
      // 冲刺位移：约 0.2 秒 / 200 px，冲刺中不受伤害
      const ds = p.speed * 3.5 * dt;
      p.x = M.clamp(p.x + p.dashDx * ds, 12, G.PF.w - 12);
      p.y = M.clamp(p.y + p.dashDy * ds, 16, G.PF.h - 14);
      p.invuln = Math.max(p.invuln, .1);
      p.dashTrail++;
      if (p.dashTrail % 2 === 0)
        G.spawnParticle({ x: p.x + M.rand(-8, 8), y: p.y + M.rand(-8, 8),
          vx: -p.dashDx * 90, vy: -p.dashDy * 90,
          color: p.charId === 'marisa' ? 'gold' : (p.charId === 'sakuya' ? 'cyan' : 'sakura'),
          life: .34, size: M.rand(3, 7), type: 'spark' });
      p.dashTime -= dt;
      if (p.dashTime <= 0) { p.dashTime = 0; p.invuln = Math.max(p.invuln, .28); }
    } else {
      const spd = p.focus ? p.focusSpeed : p.speed;
      p.x = M.clamp(p.x + a.x * spd * dt, 12, G.PF.w - 12);
      p.y = M.clamp(p.y + a.y * spd * dt, 16, G.PF.h - 14);
      if (a.len > .01) { p.lastDirX = a.x; p.lastDirY = a.y; }
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (p.bombTime > 0) p.bombTime -= dt;
    if (p.hitCd > 0) p.hitCd -= dt;

    // 符卡切换
    if (G.switchHit()) GM.switchSlot(1);
    for (let i = 0; i < 5; i++) if (G.keyHit('Digit' + (i + 1))) GM.switchSlot(1, i);
    // 主动大招
    if (G.bombHit() && !GM.grace) GM.useBomb(false);
    // 射击
    if (G.fireDown()) GM.firePlayer(dt);
  };

  GM.firePlayer = function (dt) {
    const p = G.player, sp = G.getSpell(p.charId, p.slots[p.slot].idx);
    const sh = sp.shot;
    p.fireT += 1; p.auxT += 1;
    if (p.fireT >= sh.rate) { p.fireT -= sh.rate; GM.emitShot(sh, p, sp); }
    if (sh.aux && p.auxT >= sh.aux.rate) { p.auxT -= sh.aux.rate; GM.emitShot(sh.aux, p, sp, true); }
    G.audio.sfx('shot');
  };

  /* =========================================================
   * 自机弹发射：30 张符卡 = 30 个互不重复的 emitter。
   * 灵梦=结界/御札/阴阳玉，魔理沙=魔炮/星屑/蓄力，咲夜=时间/银刀/刻度。
   * 每个 emitter 收到 c = { mk, sh, p, sp, count, up, ff, offs, isAux }。
   * ========================================================= */
  const E = GM.shotEmitters = {};

  GM.emitShot = function (sh, p, sp, isAux) {
    const dmgMul = p.dmgScale * (p.focus ? 1.12 : 1);
    const col = sh.color || sp.color;
    const up = -Math.PI / 2;
    const count = sh.count || 1;
    const ff = p.focus ? .42 : 1;
    const kind = sh.type;
    const mk = (x, y, ang, speed, o) => G.spawnShot(Object.assign({
      x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      angle: ang, speed, dmg: (sh.dmg || 10) * dmgMul,
      r: sh.r || (kind === 'laser' ? (sh.width || 8) : 5),
      color: col, sprite: sh.sprite || 'small',
      pierce: sh.pierce || 0, homing: sh.homing || 0,
      wave: sh.waveA ? 1 : 0, waveA: sh.waveA || 0, waveF: sh.waveF || 0, waveP: 0,
      accel: sh.accel || 0, maxSpeed: sh.maxSpeed || 0, delay: sh.delay || 0,
      splitN: sh.splitN || 0, splitT: sh.splitT || 0,
      split: (sh.splitN && kind !== 'mine') ? 1 : 0,
      curve: 0, ricochet: sh.ricochet || 0, satellite: sh.satellite || 0,
      satT: sh.satT || .5, mine: sh.mine || 0, mineT: sh.mineT || .42,
      mineN: sh.splitN || 8, rail: sh.rail || 0, spin: 0, orbitR: 44,
      motion: sh.motion || 'straight',
      cx: 0, cy: 0, a0: 0, rad: sh.rad0 || 0, radMax: sh.radMax || 0,
      radSpd: sh.radSpd || 0, riseSpd: sh.riseSpd || 0,
      rw1: sh.rw1 || 0, rw2: sh.rw2 || 0, rwDir: 1,
      growMax: sh.growMax || 0, onHit: sh.onHit || '', zoneR: sh.zoneR || 0,
      orbitY: sh.orbitY || 0, blinkAt: sh.blinkAt || 0,
      blinkDist: sh.blinkDist || 0, blinked: 0, sealed: 0,
      life: sh.motion === 'orbit' ? 2.2 : 2.4,
      type: kind, tag: isAux ? 'aux' : 'main'
    }, o || {}));
    const c = { mk, sh, p, sp, count, up, ff, isAux,
      offs: i => (i - (count - 1) / 2) };
    (E[kind] || E._default)(c);
  };

  /* ---------------- 博麗 霊夢：结界 / 御札 / 阴阳玉 / 祓除 ---------------- */
  E.ofuda = c => {
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x + c.offs(i) * 10 * c.ff, c.p.y - 14, c.up, c.sh.speed,
        { wave: 1, waveA: c.sh.waveA || 9, waveF: c.sh.waveF || 5,
          waveP: i / c.count * TAU, life: 2.2 });
  };
  E.kekkai = c => {
    const W = c.sh.spanX || 320;
    for (let i = 0; i < c.count; i++) {
      const t = c.count === 1 ? .5 : i / (c.count - 1);
      c.mk(c.p.x + (t - .5) * W * c.ff, c.p.y - 20,
        c.up + (t - .5) * .12, c.sh.speed, { life: 2.8 });
    }
  };
  E.yinyangArc = c => {
    /* 阴阳玉从自机上方成对射出，沿左右对称的弧线飞向前场 */
    for (let i = 0; i < c.count; i++) {
      const q = c.mk(c.p.x + (i ? 18 : -18), c.p.y - 16,
        c.up + (i ? .2 : -.2), c.sh.speed, { r: 9, life: 2.0 });
      q.curve = (i ? 1 : -1) * (c.sh.curveAlt || 1.15);
      q.spin = q.curve * 1.2;
    }
  };
  E.purifyRing = c => {
    /* 祓除轮在自机前方 210px 展开并继续向上推进，不再贴身 */
    const cx = c.p.x, cy = c.p.y - 210;
    for (let i = 0; i < c.count; i++)
      c.mk(cx, cy, i / c.count * TAU, 0,
        { motion: 'expand', cx, cy, a0: i / c.count * TAU,
          rad: c.sh.rad0 || 12, radMax: c.sh.radMax || 280,
          radSpd: c.sh.radSpd || 300, riseSpd: c.sh.riseSpd || 170,
          life: 1.2, pierce: 1 });
  };
  E.seal = c => {
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x + c.offs(i) * 18, c.p.y - 16, c.up + c.offs(i) * .1,
        c.sh.speed, { r: 9, onHit: 'seal', life: 2.4 });
  };
  E.shide = c => {
    for (let i = 0; i < c.count; i++) {
      const t = c.count === 1 ? .5 : i / (c.count - 1);
      c.mk(c.p.x, c.p.y - 12, c.up + (t - .5) * (c.sh.spread || .66) * c.ff,
        c.sh.speed, { splitN: c.sh.splitN || 2, splitT: c.sh.splitT || .3,
          split: 1, life: 2.2 });
    }
  };
  E.torii = c => {
    for (let i = 0; i < 2; i++)
      c.mk(c.p.x + (i ? 34 : -34) * c.ff, c.p.y - 18, c.up, c.sh.speed,
        { rail: 1, r: (c.sh.width || 10) * .6, pierce: c.sh.pierce || 8, life: 1.25 });
    c.mk(c.p.x + Math.sin(c.p.frame * .045) * 120, c.p.y - 18, c.up,
      c.sh.speed * .8, { rail: 1, r: 5, pierce: 6, life: 1.25 });
  };
  E.kagura = c => {
    if (c.p.frame % (c.sh.beat || 48) >= (c.sh.rate || 8)) return;
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x, c.p.y - 8, i / c.count * TAU + c.p.frame * .01,
        c.sh.speed, { life: 1.7 });
  };
  E.homingJade = c => {
    const tgt = GM.nearestTarget(c.p.x, c.p.y);
    const base = tgt ? Math.atan2(tgt.y - c.p.y, tgt.x - c.p.x) : c.up;
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x, c.p.y - 14, base + c.offs(i) * .12, c.sh.speed,
        { motion: 'rewind', homing: c.sh.homing || 6,
          rw1: c.sh.rw1 || .55, rw2: c.sh.rw2 || 1.0, life: 2.0 });
  };
  E.musou = c => {
    c.mk(c.p.x, c.p.y - 24, c.up, c.sh.speed,
      { motion: 'grow', growMax: c.sh.growMax || 26, r: c.sh.r || 11,
        pierce: c.sh.pierce || 9, life: 2.8 });
  };

  /* ---------------- 霧雨 魔理沙：魔炮 / 星屑 / 非对称火力 ---------------- */
  E.stardust = c => {
    for (let i = 0; i < c.count; i++) {
      const o = c.offs(i);
      const s = c.mk(c.p.x + o * 16 * c.ff, c.p.y - 14, c.up, c.sh.speed,
        { life: 1.6 });
      s.curve = -o * .55;                 // 两侧向中轴弯，收束成一道星针
    }
  };
  E.masterSpark = c => {
    c.mk(c.p.x, c.p.y - 26, c.up, c.sh.speed,
      { r: c.sh.r || 26, pierce: 99, rail: 1, life: .8 });
  };
  E.crossLaser = c => {
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x + c.offs(i) * 10, c.p.y - 14,
        c.up + (i % 2 ? 1 : -1) * (.3 + Math.floor(i / 2) * .2),
        c.sh.speed, { r: 6, pierce: 2, life: 1.9 });
  };
  E.spore = c => {
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x, c.p.y - 12, c.up + c.offs(i) * .17, c.sh.speed,
        { splitN: c.sh.splitN || 5, splitT: c.sh.splitT || .5, split: 1, life: 2.4 });
  };
  E.broom = c => {
    for (let i = 0; i < c.count; i++) {
      const t = c.count === 1 ? .5 : i / (c.count - 1);
      const s = c.mk(c.p.x, c.p.y - 12, c.up + (t - .5) * (c.sh.spread || 1) * c.ff,
        c.sh.speed, { life: 2.0 });
      s.curve = (t - .5) * (c.sh.curveAlt || .7) * 2;
    }
  };
  E.satelliteFixed = c => {
    /* 炮台悬浮在自机上方，不绕身贴脸；周期性向目标点射 */
    const oy = c.sh.orbitY || -105;
    for (let i = 0; i < c.count; i++) {
      const q = c.mk(c.p.x, c.p.y, c.up, c.sh.speed,
        { motion: 'orbit', sprite: 'star', life: 2.2, orbitR: 68, orbitY: oy });
      q.orbit = 1; q.orbitA = c.p.frame * .055 + i / c.count * TAU;
      q.orbitSpd = (c.sh.speed || 205) / 60; q.orbitR = 68; q.orbitY = oy;
      q.satellite = 1; q.satT = c.sh.satT || .5; q.satClock = 0;
    }
  };
  E.mine = c => {
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x + c.offs(i) * 24, c.p.y - 18, c.up + c.offs(i) * .24,
        (c.sh.speed || 300) * .42,
        { motion: 'mine', mine: 1, mineT: c.sh.mineT || .42,
          mineN: c.sh.splitN || 8, r: 8, life: 1.5 });
  };
  E.meteor = c => {
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x + c.offs(i) * 16, c.p.y - 14, c.up, c.sh.speed,
        { accel: c.sh.accel || 900, maxSpeed: c.sh.maxSpeed || 1400,
          pierce: c.sh.pierce || 5, life: 2.0 });
  };
  E.spiral = c => {
    for (let i = 0; i < c.count; i++) {
      const s = c.mk(c.p.x + c.offs(i) * 10, c.p.y - 12, c.up, c.sh.speed,
        { sprite: 'crystal', life: 2.0, homing: c.sh.homing || 1.2 });
      s.curve = (i % 2 ? 1 : -1) * (c.sh.curveAlt || 1.5);
      s.spin = s.curve * 1.6;
    }
  };
  E.shower = c => {
    for (let i = 0; i < c.count; i++) {
      const sx = c.p.x + M.rand(-160, 160), sy = c.p.y - 70 - M.rand(0, 150);
      const tgt = GM.nearestTarget(sx, sy);
      const a = tgt ? Math.atan2(tgt.y - sy, tgt.x - sx) + M.rand(-.07, .07) : c.up;
      c.mk(sx, sy, a, c.sh.speed, { sprite: 'star', life: 1.5 });
    }
  };

  /* ---------------- 十六夜 咲夜：银刀 / 操纵时间 / 精确刻度 ---------------- */
  E.knifeVolley = c => {
    const W = c.sh.spanX || 300;
    for (let i = 0; i < c.count; i++) {
      const t = c.count === 1 ? .5 : i / (c.count - 1);
      c.mk(c.p.x + (t - .5) * W, c.p.y - 14, c.up + (t - .5) * .16,
        c.sh.speed, { spin: 7, life: 1.9 });
    }
  };
  E.timeFreeze = c => {
    for (let i = 0; i < c.count; i++) {
      const t = c.count === 1 ? .5 : i / (c.count - 1);
      c.mk(c.p.x + c.offs(i) * 14 * c.ff, c.p.y - 14,
        c.up + (t - .5) * .5, c.sh.speed,
        { delay: c.sh.delay || .35, life: 2.0 });
    }
  };
  E.clockDial = c => {
    const D = c.sh.dial || 12;
    const k = Math.floor(c.p.frame / 3) % D;
    c.mk(c.p.x, c.p.y - 12, c.up + k / D * TAU, c.sh.speed,
      { life: 1.8, spin: 4 });
  };
  E.afterimage = c => {
    for (let g = -1; g <= 1; g++)
      for (let i = 0; i < c.count; i++)
        c.mk(c.p.x + g * 58, c.p.y - 14,
          c.up + c.offs(i) * .12 + g * .06, c.sh.speed,
          { ghost: g, spin: g * 3, life: 1.8 });
  };
  E.rewind = c => {
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x, c.p.y - 14, c.up + c.offs(i) * .3, c.sh.speed,
        { motion: 'rewind', rw1: c.sh.rw1 || .42, rw2: c.sh.rw2 || .78,
          life: 2.0 });
  };
  E.chronoLance = c => {
    /* 超高速银枪纵贯全场，飞行中途向前跃迁一段并留下时间残影 */
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x + c.offs(i) * 22, c.p.y - 18, c.up, c.sh.speed,
        { r: 7, pierce: 99, rail: 1, life: 1.15,
          blinkAt: c.sh.blinkAt || .16, blinkDist: c.sh.blinkDist || 170 });
  };
  E.ricochet = c => {
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x, c.p.y - 14, c.up + c.offs(i) * .28 + (i % 2 ? .1 : -.1),
        c.sh.speed, { ricochet: c.sh.ricochet || 3, life: 2.2 });
  };
  E.timeField = c => {
    /* 时域在自机前方 260px 展开，十二把银刀从该点向四周放射 */
    const fx = c.p.x, fy = c.p.y - 260, n = c.count;
    for (let i = 0; i < n; i++)
      c.mk(fx, fy, i / n * TAU + c.p.frame * .004, c.sh.speed,
        { r: 6, spin: 4, life: 1.7 });
  };
  E.converge = c => {
    const cy = c.p.y - 230;
    for (let i = 0; i < c.count; i++) {
      const sx = c.p.x + c.offs(i) * 26 * c.ff;
      c.mk(sx, c.p.y - 12, Math.atan2(cy - (c.p.y - 12), c.p.x - sx),
        c.sh.speed, { sprite: 'small' });
    }
  };
  E.twelveStrike = c => {
    for (let i = 0; i < c.count; i++)
      c.mk(c.p.x, c.p.y - 8, i / c.count * TAU + c.p.frame * .002,
        c.sh.speed, { pierce: 1, life: 1.6, spin: 5 });
  };

  /* 副武器（aux）：保留旧式的简单机构，不参与 30 种主机构计数 */
  E._default = c => {
    const { mk, sh, p, count, up, ff, isAux, offs } = c;
    if (sh.type === 'orbit') {
      for (let i = 0; i < count; i++) {
        const q = mk(p.x, p.y, up, sh.speed || 165, { sprite: 'big', life: 1.6 });
        q.orbit = 1; q.orbitA = p.frame * .06 + i / count * TAU;
        q.orbitSpd = (sh.speed || 165) / 60; q.orbitR = 44;
      }
    } else if (sh.type === 'spread') {
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? .5 : i / (count - 1);
        mk(p.x, p.y - 12, up + (t - .5) * (sh.spread || .7) * ff,
          sh.speed || 560, { sprite: sh.sprite || 'small' });
      }
    } else if (sh.type === 'laser') {
      for (let i = 0; i < count; i++)
        mk(p.x + offs(i) * (isAux ? 12 : 22) * ff, p.y - 16, up, sh.speed || 950,
          { sprite: 'needle', r: (sh.width || 9) * .7, pierce: sh.pierce || 3 });
    } else {
      for (let i = 0; i < count; i++)
        mk(p.x + offs(i) * (isAux ? 7 : 10) * ff, p.y - 14, up,
          sh.speed || 600, { sprite: sh.sprite || 'small' });
    }
  };

  /* =========================================================
   * 大招 / 符卡破碎 / 0.5 秒决断
   * ========================================================= */
  GM.useBomb = function (fromGrace) {
    const p = G.player; if (!p || !p.alive) return false;
    if (p.power < 100) {
      if (fromGrace) return false;
      G.audio.sfx('cancel'); G.floatText(p.x, p.y - 40, '霊力不足', '#c9a0ac', 13, .8);
      return false;
    }
    const sp = G.getSpell(p.charId, p.slots[p.slot].idx);
    const bm = sp.bomb;
    p.power = 0;
    p.bombTime = bm.dur; p.invuln = bm.dur + .9;
    GM.bombFx = { type: bm.type, fx: bm.fx || sp.shot.type,
      color: bm.color, dur: bm.dur, radius: bm.radius, t: 0,
      power: bm.power * p.bombScale, dealt: 0, name: bm.name };
    // 清屏 + 伤害
    G.clearBullets(true);
    G.lasers.length = 0;
    for (const e of G.enemies) GM.damageEnemy(e, bm.power * .8 * p.bombScale);
    if (G.boss && G.boss.spell && G.boss.spell.type === 'barrier') {
      G.boss.hp -= bm.power * .5 * p.bombScale;
      G.boss.flash = .3;
    }
    // 音乐：短暂角色插入句（大招专属，符卡序号决定变奏）
    G.audio.playJingle(p.charId, p.slots[p.slot].idx);
    G.audio.sfx('bomb');
    G.flash(.85, '#fff2d0'); G.shake(18);
    G.burst(p.x, p.y, bm.color, 42, 340, { type: 'shard' });
    G.floatText(G.PF.w / 2, G.PF.h * .42, bm.name, '#fff0d0', 22, 2.0);
    if (fromGrace) {
      GM.grace = null; G.timeScale = 1;
      G.floatText(p.x, p.y - 60, '符卡、無事', '#ffe9a8', 17, 1.3);
      G.addScore(3000);
    }
    return true;
  };

  GM.onPlayerHit = function () {
    const p = G.player; if (!p || !p.alive) return;
    if (p.invuln > 0 || p.bombTime > 0 || GM.grace) return;
    GM.grace = { left: .5, x: p.x, y: p.y, canBomb: p.power >= 100 };
    G.timeScale = 0;                 // 时停
    G.fx.chroma = 1; G.shake(12);
    G.audio.sfx('grace');
  };

  GM.updateGrace = function (rdt) {
    const gr = GM.grace; if (!gr) return;
    gr.left -= rdt;
    // 大招可取消本次被击
    if (G.bombHit() && gr.canBomb) { GM.useBomb(true); return; }
    if (gr.left <= 0) GM.breakCard();
  };

  GM.breakCard = function () {
    const p = G.player; const gr = GM.grace;
    GM.grace = null; G.timeScale = 1;
    if (!p) return;
    const x = gr ? gr.x : p.x, y = gr ? gr.y : p.y;
    G.audio.sfx('break'); G.flash(.75, '#ff6688'); G.shake(20);
    G.burst(x, y, 'crimson', 40, 320, { type: 'shard' });
    for (let i = 0; i < 12; i++)
      G.spawnParticle({ x, y, vx: M.rand(-260, 260), vy: M.rand(-260, 120),
        color: 'cream', life: M.rand(.6, 1.2), size: M.rand(3, 8), type: 'shard', vr: M.rand(-9, 9) });
    G.floatText(x, y - 50, '符卡破碎', '#ff9eb0', 20, 1.5);
    p.slots[p.slot].broken = true;
    // 清掉身边一圈弹，避免连锁被击
    G.clearBullets(true);
    G.lasers.length = 0;

    const alive = p.slots.findIndex(s => !s.broken);
    if (alive < 0) {
      p.lives--;
      if (p.lives < 0) { GM.finish(false); return; }
      G.audio.sfx('extend');
      G.floatText(G.PF.w / 2, G.PF.h * .5, '残機 -1  ·  符卡再编成', '#ffe9a8', 20, 2.0);
      p.slots.forEach(s => s.broken = false);
      p.power = 100;
      p.slot = 0;
    } else {
      p.slot = alive;
      p.power = Math.max(p.power, 35);
    }
    p.x = G.PF.w / 2; p.y = G.PF.h - 76;
    p.invuln = 2.4;
  };

  /* =========================================================
   * 世界更新
   * ========================================================= */
  GM.step = function (step) {
    G.updateFx(step);
    if (G.state !== 'playing' && G.state !== 'story') return;
    // 剧情画面：仍让特效动，但世界静止
    if (G.state === 'story') { G.updateParticles(step); return; }

    if (GM.grace) { GM.updateGrace(step); return; }

    const dt = step * (G.timeScale || 0);
    if (dt <= 0) return;
    G.time += dt;

    if (GM.pendingSpell !== undefined && GM.pendingSpell !== null) {
      GM.spellDelay -= dt;
      if (GM.spellDelay <= 0) {
        const n = GM.pendingSpell; GM.pendingSpell = null;
        GM.beginSpell(n);
      }
    }
    if (GM.pendingBossDefeat) {
      GM.spellDelay -= dt;
      if (GM.spellDelay <= 0) { GM.pendingBossDefeat = false; GM.bossDefeated(); }
    }

    GM.updatePlayer(dt);
    GM.updateShots(dt);
    GM.updateBullets(dt);
    GM.updateLasers(dt);
    GM.updateEnemies(dt);
    GM.updateBoss(dt);
    G.updateParticles(dt);

    if (GM.declare) { GM.declare.t += dt; if (GM.declare.t > 2.3) GM.declare = null; }
    if (GM.bombFx) {
      GM.bombFx.t += dt;
      // 持续伤害
      if (G.boss && G.boss.spell && G.boss.spell.type === 'barrier') {
        const per = GM.bombFx.power * .5 / GM.bombFx.dur * dt;
        G.boss.hp -= per; G.boss.flash = .12;
      }
      if (GM.bombFx.t >= GM.bombFx.dur) GM.bombFx = null;
    }
    // 灵力自然回复（缓慢）
    const p = G.player;
    if (p && p.power < 100) p.power = Math.min(100, p.power + dt * 1.6 * p.powerGain);

    GM.bulletCount = G.bullets.length;
  };

  /* ---------- 自机弹 ---------- */
  GM.updateShots = function (dt) {
    const arr = G.shots; let n = 0;
    const p = G.player, W = G.PF.w;
    /* 延迟生成：避免在同一帧遍历时修改数组 */
    const spawned = [];
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      s.age += dt;
      if (s.age > s.life) { G.poolS.push(s); continue; }
      s.px = s.x; s.py = s.y;

      const mo = s.motion || 'straight';
      if (mo === 'pendulum') {
        /* 阴阳玉：钟摆式甩出与回收，不绕整圈 */
        s.a0 += dt * 3.2;
        s.x = p.x + Math.sin(s.a0) * 76;
        s.y = p.y - 26 - Math.abs(Math.cos(s.a0)) * 30;
        s.angle = s.a0;
      } else if (mo === 'expand') {
        /* 祓除：所有弹沿固定角度同步扩张成一圈，到半径上限即散 */
        s.rad += s.radSpd * dt;
        if (s.rad >= s.radMax) { G.poolS.push(s); continue; }
        s.cy -= (s.riseSpd || 0) * dt;      // 前方展开的轮继续向上推进
        s.x = s.cx + Math.cos(s.a0) * s.rad;
        s.y = s.cy + Math.sin(s.a0) * s.rad;
        s.angle = s.a0;
      } else if (mo === 'grow') {
        /* 梦想封印：大玉边飞边成长，威力与半径一起上升 */
        s.r = Math.min(s.growMax || 26, s.r + 13 * dt);
        s.dmg += dt * 6;
        s.x += s.vx * dt; s.y += s.vy * dt;
      } else if (mo === 'warp' || mo === 'stay') {
        /* 瞬断 / 静止时域：不位移，靠大判定半径与 pierce 持续结算 */
        s.spinT += dt * (s.spin || 4);
      } else if (s.orbit) {
        /* 环绕玉 / 卫星：跟随自机，卫星周期性向最近目标点射 */
        s.orbitA += s.orbitSpd * dt;
        s.x = p.x + Math.cos(s.orbitA) * s.orbitR;
        s.y = p.y + (s.orbitY || 0) + Math.sin(s.orbitA) * s.orbitR;
        s.angle = s.orbitA + Math.PI / 2;
        if (s.satellite) {
          s.satClock = (s.satClock || 0) + dt;
          if (s.satClock >= (s.satT || .5)) {
            s.satClock = 0;
            const tgt = GM.nearestTarget(s.x, s.y);
            const a2 = tgt ? Math.atan2(tgt.y - s.y, tgt.x - s.x) : -Math.PI / 2;
            spawned.push({ x: s.x, y: s.y, angle: a2, speed: 700, dmg: s.dmg * .55,
              r: 4, color: s.color, sprite: 'star', life: 1.1, tag: 'sat' });
          }
        }
      } else if (s.mine) {
        /* 滞留爆雷：悬停片刻后炸成扇状碎片 */
        s.mineClock = (s.mineClock || 0) + dt;
        s.y -= 14 * dt;
        s.spinT += dt * 3;
        if (s.mineClock >= (s.mineT || .42)) {
          const N = s.mineN || 8;
          for (let k = 0; k < N; k++) {
            const a2 = -Math.PI / 2 + (k - (N - 1) / 2) * (Math.PI * 1.25 / N);
            spawned.push({ x: s.x, y: s.y, angle: a2, speed: 440, dmg: s.dmg * .6,
              r: 4, color: s.color, sprite: 'small', life: 1.1, tag: 'mine' });
          }
          G.burst(s.x, s.y, s.color, 9, 150);
          G.poolS.push(s); continue;
        }
      } else if (s.delay > 0) {
        /* 时停齐发：整批弹在原地冻结，到点一齐以高速射出 */
        s.delay -= dt;
        if (s.delay <= 0) G.burst(s.x, s.y, s.color, 5, 100);
      } else {
        if (mo === 'rewind') {
          /* 时间倒流：中段折返，末段再转回正向 */
          const flip = (s.age > s.rw1 && s.age < s.rw2) ? -1 : 1;
          if ((s.rwDir || 1) !== flip) {
            s.vx = -s.vx; s.vy = -s.vy; s.rwDir = flip;
          }
        }
        /* 时穿银枪：飞出后向前跃迁一段，留下时间残影 */
        if (s.blinkAt && !s.blinked && s.age > s.blinkAt) {
          s.blinked = 1;
          const sp = Math.hypot(s.vx, s.vy) || 1;
          G.burst(s.x, s.y, s.color, 5, 70);
          s.x += s.vx / sp * (s.blinkDist || 150);
          s.y += s.vy / sp * (s.blinkDist || 150);
        }
        if (s.curve) {
          const a2 = Math.atan2(s.vy, s.vx) + s.curve * dt;
          const sp = Math.hypot(s.vx, s.vy);
          s.vx = Math.cos(a2) * sp; s.vy = Math.sin(a2) * sp;
        }
        if (s.accel) {
          let spd = Math.hypot(s.vx, s.vy) + s.accel * dt;
          if (s.maxSpeed) spd = Math.min(spd, s.maxSpeed);
          const a2 = Math.atan2(s.vy, s.vx);
          s.vx = Math.cos(a2) * spd; s.vy = Math.sin(a2) * spd;
        }
        if (s.homing) {
          const tgt = GM.nearestTarget(s.x, s.y);
          if (tgt) {
            const want = Math.atan2(tgt.y - s.y, tgt.x - s.x);
            let d = M.norm(want - Math.atan2(s.vy, s.vx));
            if (d > Math.PI) d -= TAU;
            const na = Math.atan2(s.vy, s.vx) + M.clamp(d, -s.homing * dt, s.homing * dt);
            const spd = Math.hypot(s.vx, s.vy);
            s.vx = Math.cos(na) * spd; s.vy = Math.sin(na) * spd;
          }
        }
        s.x += s.vx * dt;
        if (s.wave) s.x += Math.sin(s.age * s.waveF + s.waveP) * s.waveA * dt * 6;
        s.y += s.vy * dt;
        if (s.ricochet > 0) {
          if (s.x < 8 && s.vx < 0) { s.vx = -s.vx; s.ricochet--; }
          else if (s.x > W - 8 && s.vx > 0) { s.vx = -s.vx; s.ricochet--; }
          if (s.ricochet > 0) s.y -= 12 * dt;
        }
        if (s.spin) s.spinT += s.spin * dt;
        /* 贴图朝向跟随实际速度（环绕弹由轨道分支单独给出切向角） */
        if (!s.orbit && (s.vx !== 0 || s.vy !== 0)) s.angle = Math.atan2(s.vy, s.vx);
      }

      if (s.hitCd > 0) s.hitCd -= dt;
      /* 通用分裂弹 */
      if (s.split && s.age > s.splitT) {
        s.split = 0;
        for (let k = 0; k < s.splitN; k++) {
          const a = -Math.PI / 2 + (k - (s.splitN - 1) / 2) * .28;
          spawned.push({ x: s.x, y: s.y, angle: a, speed: 480, dmg: s.dmg * .5,
            r: 3.5, color: s.color, sprite: 'small', life: 1.2, tag: 'split' });
        }
        G.burst(s.x, s.y, s.color, 6, 80);
      }
      if (mo !== 'expand' && (s.x < -30 || s.x > W + 30 || s.y < -40 || s.y > G.PF.h + 40)) { G.poolS.push(s); continue; }

      /* 命中判定：用上一帧到当前帧的线段做扫掠检测，高速弹也不会穿模 */
      if (s.hitCd <= 0 && s.delay <= 0) {
        let hit = false;
        for (const e of G.enemies) {
          const rr = e.r + s.r;
          if (e.hp > 0 && M.segDist2(s.px, s.py, s.x, s.y, e.x, e.y) < rr * rr) {
            GM.damageEnemy(e, s.dmg); hit = true; break;
          }
        }
        if (!hit && G.boss && G.boss.spell) {
          const b = G.boss, rr = 30 + s.r;
          if (M.segDist2(s.px, s.py, s.x, s.y, b.x, b.y) < rr * rr) {
            if (b.spell.type === 'barrier') {
              b.hp -= s.dmg; b.flash = .1;
              G.addScore(Math.floor(s.dmg * 2));
              if (Math.random() < .18) {
                G.spawnParticle({ x: s.x, y: s.y, vx: M.rand(-40, 40), vy: M.rand(-60, 0),
                  color: 'gold', life: .3, size: 2.5 });
                G.audio.sfx('bossHit');
              }
            } else {
              G.addScore(Math.floor(s.dmg * 1.2));
            }
            hit = true;
          }
        }
        if (hit) {
          if (s.onHit === 'seal' && !s.sealed) {
            s.sealed = 1;
            spawned.push({ x: s.x, y: s.y, angle: -Math.PI / 2, speed: 0,
              dmg: s.dmg * .5, r: 20, color: s.color, sprite: 'ring',
              life: 1.1, pierce: 99, motion: 'stay', tag: 'seal' });
          }
          if (s.pierce > 0) { s.pierce--; s.hitCd = .09; }
          else { G.poolS.push(s); continue; }
        }
      }
      arr[n++] = s;
    }
    arr.length = n;
    for (const o of spawned) G.spawnShot(o);
  };

  GM.nearestTarget = function (x, y) {
    let best = null, d2 = 1e9;
    for (const e of G.enemies) {
      const d = M.dist2(x, y, e.x, e.y);
      if (d < d2 && e.hp > 0) { d2 = d; best = e; }
    }
    if (G.boss && G.boss.spell) {
      const d = M.dist2(x, y, G.boss.x, G.boss.y);
      if (d < d2) best = G.boss;
    }
    return best;
  };

  /* ---------- 敌弹 ---------- */
  GM.updateBullets = function (dt) {
    const arr = G.bullets; let n = 0;
    const p = G.player;
    const W = G.PF.w, H = G.PF.h;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      b.age += dt;
      if (b.age > b.life) { G.poolB.push(b); continue; }
      if (b.delay > 0) {
        b.delay -= dt;
        if (b.delay > 0) { arr[n++] = b; continue; }
        // 延迟结束：按原角度重新起速（并明确归零，避免残留负值影响判定）
        b.delay = 0;
        b.vx = Math.cos(b.angle) * b.speed;
        b.vy = Math.sin(b.angle) * b.speed;
      }
      if (b.curve) {
        const a = Math.atan2(b.vy, b.vx) + b.curve * dt;
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.angle = a;
      }
      if (b.accel) {
        let sp = Math.hypot(b.vx, b.vy) + b.accel * dt;
        if (b.maxSpeed) sp = Math.min(sp, b.maxSpeed);
        if (b.minSpeed) sp = Math.max(sp, b.minSpeed);
        const a = Math.atan2(b.vy, b.vx);
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      }
      if (b.homing > 0 && b.age < b.homingT) {
        const want = Math.atan2(p.y - b.y, p.x - b.x);
        let d = M.norm(want - Math.atan2(b.vy, b.vx));
        if (d > Math.PI) d -= TAU;
        const na = Math.atan2(b.vy, b.vx) + M.clamp(d, -b.homing * dt, b.homing * dt);
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; b.angle = na;
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.wave) b.x += Math.sin(b.age * b.waveF) * b.waveA * dt;
      if (b.spin) b.spinT += b.spin * dt;
      // 边界反弹
      if (b.bounce > 0) {
        if (b.x < 6 && b.vx < 0) { b.vx = -b.vx; b.bounce--; }
        if (b.x > W - 6 && b.vx > 0) { b.vx = -b.vx; b.bounce--; }
        if (b.y < 6 && b.vy < 0) { b.vy = -b.vy; b.bounce--; }
        /* 下边界同样折返：否则斜向下的反射弹会直接飞出画面，
           看起来「还没到底层就消失了」，覆盖面只剩上半屏。 */
        if (b.y > H - 6 && b.vy > 0) { b.vy = -b.vy; b.bounce--; }
      }
      /* 贴图朝向始终取实际速度方向；自转由 spinT 单独叠加。
         静止弹（speed=0 / 蓄力中）保留发射角，避免 atan2(0,0) 把它拧成水平。 */
      if (b.vx !== 0 || b.vy !== 0) b.angle = Math.atan2(b.vy, b.vx);
      // 分裂
      if (b.split && b.age > b.splitT) { b.split = 0; P.doSplit(b); G.poolB.push(b); continue; }
      // 出界
      if (b.x < -46 || b.x > W + 46 || b.y < -56 || b.y > H + 56) { G.poolB.push(b); continue; }
      // 玩家判定
      if (p && p.alive && p.invuln <= 0 && b.delay <= 0) {
        const d2 = M.dist2(b.x, b.y, p.x, p.y);
        const rr = p.hitR + b.r * .62;
        if (d2 < rr * rr) {
          GM.onPlayerHit();
          // 命中弹立即消失
          G.poolB.push(b); continue;
        } else if (!b.grazed && d2 < (p.grazeR + b.r) * (p.grazeR + b.r)) {
          b.grazed = true; G.graze++;
          G.addScore(60);
          p.power = Math.min(100, p.power + 1.1 * p.powerGain);
          if (G.graze % 3 === 0) G.audio.sfx('graze');
          G.spawnParticle({ x: b.x, y: b.y, vx: M.rand(-30, 30), vy: -40,
            color: 'cream', life: .35, size: 2.2 });
        }
      }
      arr[n++] = b;
    }
    arr.length = n;
    /* 安全阀：超过上限时每帧只渐进回收少量最老的弹，并留下消散光点。
       旧版一次性 splice 掉上百发会造成「整片弹幕一瞬间凭空消失」。 */
    if (arr.length > 2600) {
      const cut = Math.min(48, arr.length - 2600);
      for (let i = 0; i < cut; i++) {
        const b = arr[i];
        if (i % 4 === 0)
          G.spawnParticle({ x: b.x, y: b.y, vx: 0, vy: -12, color: b.color,
            life: .3, size: Math.max(2, b.r * .5), type: 'dot' });
        G.poolB.push(b);
      }
      arr.splice(0, cut);
    }
  };

  /* ---------- 激光 ---------- */
  GM.updateLasers = function (dt) {
    const p = G.player, arr = G.lasers; let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const l = arr[i];
      l.age += dt;
      if (l.age > l.warn + l.life) continue;
      if (l.spin) l.angle += l.spin * dt;
      if (l.age >= l.warn && p && p.alive && p.invuln <= 0) {
        // 点到射线距离
        const dx = Math.cos(l.angle), dy = Math.sin(l.angle);
        const px = p.x - l.x, py = p.y - l.y;
        const proj = px * dx + py * dy;
        if (proj > 0 && proj < l.len) {
          const perp = Math.abs(px * dy - py * dx);
          if (perp < l.width * .8 + p.hitR) GM.onPlayerHit();
        }
      }
      arr[n++] = l;
    }
    arr.length = n;
  };

  /* ---------- 杂鱼 ---------- */
  GM.spawnWave = function (w) {
    const def = G.ENEMY_TYPES[w.type]; if (!def) return;
    const dif = G.diff || G.DIFFS[1];
    const W = G.PF.w;
    /* 难度：高密度档位增加杂鱼数量、缩短发弹间隔、略增耐久 */
    /* 弹幕削弱后靠更多杂鱼维持道中密度：全难度基础 +2，高难度再按密度叠加 */
    const n = Math.max(1, Math.round(w.n * Math.pow(dif.density, .8)) + 2);
    const rate = Math.max(10, Math.round(def.fireRate * dif.enemyRate));
    for (let i = 0; i < n; i++) {
      let x = W / 2, y = -34 - (i % 3) * 26;
      if (w.formation === 'line') x = 56 + (W - 112) * (n === 1 ? .5 : i / (n - 1));
      else if (w.formation === 'arc') { x = W / 2 + (i - (n - 1) / 2) * 58; y = -34 - Math.abs(i - (n - 1) / 2) * 22; }
      else if (w.formation === 'v') { x = W / 2 + (i - (n - 1) / 2) * 42; y = -34 - (n - Math.abs(i - (n - 1) / 2)) * 16; }
      else if (w.formation === 'sides') { x = i % 2 ? W - 46 : 46; y = -34 - Math.floor(i / 2) * 40; }
      else if (w.formation === 'spread') x = 70 + (W - 140) * (n === 1 ? .5 : i / (n - 1));
      else if (w.formation === 'center') { x = W / 2; y = 110; }
      const hp = def.hp * (w.hpMul || 1) * (.9 + .1 * dif.bossHp);
      G.enemies.push({
        x, y, hx: x, hy: y, hp, maxHp: hp, r: def.r, type: w.type,
        color: w.tint || def.color, t: 0, tick: 0, seed: M.rand(0, 100),
        fireRate: rate, move: w.move, speed: w.speed * Math.pow(dif.speedMul, .5), idx: i, n,
        flash: 0, dead: false
      });
    }
  };

  GM.damageEnemy = function (e, dmg) {
    if (e.dead) return;
    e.hp -= dmg; e.flash = .12;
    if (e.hp <= 0) {
      e.dead = true;
      const def = G.ENEMY_TYPES[e.type];
      G.addScore(def.score); G.kills++;
      G.player.power = Math.min(100, G.player.power + 2.6 * G.player.powerGain);
      G.audio.sfx('die');
      G.burst(e.x, e.y, e.color, 14, 180, { type: 'shard' });
      G.floatText(e.x, e.y, '+' + def.score, '#ffe0a0', 12, .8);
    }
  };

  GM.updateEnemies = function (dt) {
    const arr = G.enemies; let n = 0;
    const W = G.PF.w, H = G.PF.h;
    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      if (e.dead) continue;
      e.t += dt; e.tick++;
      const T = e.t;
      switch (e.move) {
        case 'hover': {
          const ty = 96 + (e.idx % 4) * 30;
          e.y = M.lerp(e.y, ty, .035);
          e.x = e.hx + Math.sin(T * 1.1 + e.seed) * 42;
          if (T > 5.4) e.y += e.speed * dt * 1.6;
          break;
        }
        case 'swoop': {
          e.y += e.speed * dt;
          e.x = W / 2 + Math.sin(T * 1.3 + e.seed) * (W * .36);
          break;
        }
        case 'cross': {
          e.y += e.speed * .55 * dt;
          const dir = e.idx % 2 ? -1 : 1;
          e.x += dir * e.speed * dt * .9;
          if (e.x < -40 || e.x > W + 40) e.dead = true;
          break;
        }
        case 'drop': {
          e.y += e.speed * dt;
          e.x = e.hx + Math.sin(T * 1.8 + e.seed) * 26;
          break;
        }
        case 'center': {
          e.y = 132 + Math.sin(T * .8) * 12;
          e.x = W / 2 + Math.sin(T * .6) * 130;
          break;
        }
        default:
          e.y += e.speed * dt;
          e.x += Math.sin(T * 1.6 + e.seed) * 18 * dt;
      }
      if (e.flash > 0) e.flash -= dt;
      if (e.y > H + 60) e.dead = true;
      // 发弹
      if (e.y > 8 && e.y < H - 40 && e.tick % e.fireRate === 0) {
        const def = G.ENEMY_TYPES[e.type];
        G._fireFrom = 'enemy';
        try { def.fire(e); } finally { G._fireFrom = null; }
      }
      if (!e.dead) arr[n++] = e;
    }
    arr.length = n;

    // 道中波次
    if (GM.phase === 'stage') {
      GM.stageTick++;
      const waves = GM.stage.waves;
      if (GM.stageTick < GM.stage.duration) {
        while (GM.waveIdx < waves.length && waves[GM.waveIdx].at <= GM.stageTick) {
          GM.spawnWave(waves[GM.waveIdx]); GM.waveIdx++;
        }
      } else {
        // 道中收尾：残余杂鱼与弹幕一并退场，进入 Boss 前对话
        GM.waveIdx = waves.length;
        G.enemies.length = 0;
        G.clearBullets(true);
        G.lasers.length = 0;
        GM.phase = 'transition';
        GM.playDialog(GM.stage.preBoss, () => GM.startBoss());
      }
    }
  };

  /* ---------- Boss ---------- */
  GM.updateBoss = function (dt) {
    const b = G.boss; if (!b) return;
    b.x += (b.tx - b.x) * .028;
    b.y += (b.ty - b.y) * .028;
    if (b.flash > 0) b.flash -= dt;
    if (!b.spell) return;
    const sp = b.spell;
    b.spellFrame++;
    b.left -= dt;
    /* Boss 脚本严格按真实帧号 1:1 运行，发射节奏不受任何难度 / 杂鱼参数缩放。
       难度对 Boss 只通过 base() 的结构化弹数、speedMul 与结界值体现。
       同时清掉杂鱼发弹上下文，避免 Boss 的图案被误按杂鱼低密度削减。 */
    G._fireFrom = null;
    if (sp.script) sp.script(b, b.spellFrame);
    if (sp.type === 'barrier') {
      if (b.hp <= 0) { b.hp = 0; GM.endSpell('break'); return; }
    }
    if (b.left <= 0) GM.endSpell(sp.type === 'barrier' ? 'timeout' : 'survive');
  };

  /* ---------- 暂停 / 调试 ---------- */
  GM.togglePause = function () {
    if (G.state === 'playing') {
      G.state = 'paused'; G.ui.showPause();
      if (G.audio.music) G.audio.music.gain.setTargetAtTime(G.audio.bgmVol * .35, G.audio.ctx.currentTime, .1);
    } else if (G.state === 'paused') {
      G.state = 'playing'; G.ui.hideAll();
      if (G.audio.music) G.audio.music.gain.setTargetAtTime(G.audio.bgmVol, G.audio.ctx.currentTime, .1);
    }
  };
  GM.debugSkip = function () {
    if (G.state !== 'playing') return;
    if (G.boss && G.boss.spell) {
      G.clearBullets(true);
      GM.endSpell(G.boss.spell.type === 'barrier' ? 'break' : 'survive');
    } else if (GM.phase === 'stage') {
      GM.stageTick = GM.stage.duration;
      GM.waveIdx = GM.stage.waves.length;
      G.enemies.length = 0; G.clearBullets(true);
    }
  };
})();
