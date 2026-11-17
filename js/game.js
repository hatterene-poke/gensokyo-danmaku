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
  /* 玩家初始化：正常游戏与 Boss 练习共用 */
  GM.setupPlayer = function (charId, deck) {
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
  };

  GM.startGame = function (charId, deck) {
    GM.setupPlayer(charId, deck);
    GM.practice = false;
    GM.beginStage(0);
  };

  /* Boss 练习：跳过道中与剧情，直接以指定难度进入指定 Boss */
  GM.startBossPractice = function (bossIdx, charId, deck) {
    /* 从练习界面反复切换 Boss 时，上一次的弹幕/激光/装饰必须清掉，
       否则会残留到新 Boss 的场景里（截图里星罗场景出现他面的札弹即此因）。 */
    G.clearBullets(); G.lasers.length = 0;
    G.enemies.length = 0; G.shots.length = 0;
    G.particles.length = 0; G.floaters.length = 0;
    GM.clearDecor();
    GM.freeze = false; GM.freezeBullets = false;
    G.fx.invert = 0; G.fx.warp = 0;
    GM.setupPlayer(charId, deck);
    GM.practice = true;
    GM.practiceBoss = bossIdx;
    GM.stage = G.STAGES.get(bossIdx);
    G.stageIndex = bossIdx;
    GM.stageTick = 0; GM.waveIdx = 0;
    GM.phase = 'transition';
    GM.startBoss();
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
    /* 符卡级时停在换符时必须清掉，否则上一张在时停中结束时
       会让下一张符卡全场卡死。 */
    GM.freeze = false; GM.freezeBullets = false; G.fx.invert = 0; G.fx.warp = 0;
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
    /* 击破瞬间必须清场：否则残留敌弹/激光/装饰玉会在过场对话期间继续演化，
       下一面开局前若对话停留就会在画面上堆积成一团（第四面曾复现）。 */
    G.clearBullets(); G.lasers.length = 0;
    G.enemies.length = 0;
    GM.clearDecor(); G.shots.length = 0;
    GM.freeze = false; GM.freezeBullets = false;
    G.fx.invert = 0; G.fx.warp = 0;
    GM.currentTheme = GM.stage.bg;
    if (GM.practice) { GM.finish(true); return; }
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
      stage: G.stageIndex + 1, practice: !!GM.practice,
      charId: G.player ? G.player.charId : 'reimu',
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
      p.y = M.clamp(p.y + p.dashDy * ds, G.PF.topLimit, G.PF.h - 14);
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
      p.y = M.clamp(p.y + a.y * spd * dt, G.PF.topLimit, G.PF.h - 14);
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
    const rate = GM.fireRateMul || 1;   // 「决斗・三倍连射」大招期间为 3
    p.fireT += rate; p.auxT += rate;
    /* 部分符卡按高低速改写齐射间隔：rateFast 2.5 倍 / rateFocus 1.5 倍 */
    const mainRate = p.focus ? (sh.rateFocus || sh.rate) : (sh.rateFast || sh.rate);
    if (p.fireT >= mainRate) { p.fireT -= mainRate; GM.emitShot(sh, p, sp); }
    if (sh.aux && p.auxT >= sh.aux.rate) { p.auxT -= sh.aux.rate; GM.emitShot(sh.aux, p, sp, true); }
    G.audio.sfx('shot');
  };

  /* =========================================================
   * 自机弹发射：15 张符卡逐张手写的 emitter。
   * 每张的高速 / 低速形态在 emitter 内分叉；不依赖开火键的持续机构
   * （法阵、黑白宝玉、结界冲击波、浮游炮、八方、十二刻度）交给
   * 下面的 GM.tickSpell，每帧调用一次。
   * ========================================================= */
  const E = GM.shotEmitters = {};

  /* 直接生成一发弹（供 emitter / tickSpell / tickBomb 共用）。
     spawnShot 自带完整默认值，这里只补速度向量与非默认字段。 */
  GM.raw = o => {
    const a = o.angle === undefined ? -Math.PI / 2 : o.angle;
    const sp = o.speed === undefined ? 1600 : o.speed;
    return G.spawnShot(Object.assign({
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      angle: a, speed: sp, dmg: 12, r: 5, color: 'white',
      sprite: 'small', type: 'raw', life: 1.3, tag: 'main'
    }, o));
  };
  /* 固定炮台 / 环绕物：delay 极大 → 不位移、不参与命中判定，
     但 drawShots 仍会把它（连同提示环）画出来。 */
  GM.decor = (x, y, o) => GM.raw(Object.assign({
    x, y, vx: 0, vy: 0, speed: 0, delay: 999, dmg: 0,
    pierce: 0, life: 999, tag: 'decor', motion: 'stay',
    r: 9, sprite: 'card', color: 'gold', zoneR: 26
  }, o || {}));
  GM.clearDecor = () => {
    const arr = G.shots; let n = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].tag === 'decor' || arr[i].tag === 'bombOrb' || arr[i].tag === 'yinOrb') { G.poolS.push(arr[i]); continue; }
      arr[n++] = arr[i];
    }
    arr.length = n;
  };
  GM.syncDecor = (positions, key, o) => {
    const p = G.player;
    if (GM._decorKey !== key) {
      GM.clearDecor(); GM._decorKey = key;
      for (const q of positions)
        GM.decor(p.x + q[0], p.y + q[1], o || {});
    }
    let i = 0;
    for (const s of G.shots) {
      if (s.tag !== 'decor') continue;
      const q = positions[i % positions.length];
      s.x = p.x + q[0]; s.y = p.y + q[1];
      s.px = s.x; s.py = s.y; i++;
    }
  };
  /* 圆形冲击波：一整圈可见的波前向外扩散，敌人被波前扫到即结算一次伤害。
     不再用 16 颗子弹拼成环 —— 那既会被当作子弹逐颗判定，视觉上也有缺口。 */
  GM.shock = (x, y, dmg, color, radMax, spd) => {
    const max = radMax || 320;
    /* 默认速度让波前约 0.5 秒扫完半径；全屏波会传更大的速度覆盖整个画面 */
    G.waves.push({ x, y, r: 10, radMax: max, spd: spd || Math.max(620, max * 2),
      dmg, color, hit: new Set(), width: 12, dead: false });
  };
  /* 波前推进 + 命中结算：每个目标每圈只吃一次伤害 */
  GM.updateWaves = function (dt) {
    const arr = G.waves; let n = 0;
    for (let i = 0; i < arr.length; i++) {
      const w = arr[i];
      const prev = w.r;
      w.r += w.spd * dt;
      for (const e of G.enemies) {
        if (e.hp <= 0 || w.hit.has(e)) continue;
        const d = Math.sqrt(M.dist2(w.x, w.y, e.x, e.y));
        if (d >= prev - w.width - e.r && d <= w.r + w.width + e.r) {
          w.hit.add(e); GM.damageEnemy(e, w.dmg);
        }
      }
      if (G.boss && G.boss.spell && G.boss.spell.type === 'barrier' && !w.hit.has(G.boss)) {
        const d = Math.sqrt(M.dist2(w.x, w.y, G.boss.x, G.boss.y));
        if (d >= prev - w.width && d <= w.r + w.width) {
          w.hit.add(G.boss); G.boss.hp -= w.dmg; G.boss.flash = .12;
        }
      }
      if (w.r < w.radMax) arr[n++] = w;
    }
    arr.length = n;
  };

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
      r: sh.r || 5, color: col, sprite: sh.sprite || 'small',
      pierce: sh.pierce || 0, homing: sh.homing || 0,
      wave: 0, waveA: 0, waveF: 0, waveP: 0,
      accel: sh.accel || 0, maxSpeed: sh.maxSpeed || 0, delay: 0,
      curve: 0, rail: sh.rail || 0, spin: 0, spinT: 0, orbitR: 44,
      motion: 'straight', cx: 0, cy: 0, a0: 0,
      rad: 0, radMax: 0, radSpd: 0, riseSpd: 0,
      rw1: 0, rw2: 0, rwDir: 1, growMax: 0, onHit: '', zoneR: 0,
      blinkAt: 0, blinkDist: 0, blinked: 0, sealed: 0,
      life: 1.3, type: kind, tag: isAux ? 'aux' : 'main'
    }, o || {}));
    const c = { mk, sh, p, sp, count, up, ff, isAux,
      offs: i => (i - (count - 1) / 2) };
    (E[kind] || E._default)(c);
  };

  /* ---------------- 灵梦 ---------------- */
  /* 1 梦想封印：高速追踪灵符＋高伤害封魔针 / 低速全力集束封魔针 */
  E.ofuda = c => {
    const p = c.p, sh = c.sh;
    if (p.focus) {
      for (let i = 0; i < 5; i++) {
        const t = i / 4 - .5;
        const s = c.mk(p.x + t * 26, p.y - 14, c.up - t * .16, sh.speed,
          { dmg: sh.dmg * 1.5, r: 4, sprite: 'needle', color: 'cream',
            pierce: 3, rail: 1, life: 1.2 });
        s.curve = -t * .3;
      }
    } else {
      const tgt = GM.nearestTarget(p.x, p.y);
      const base = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : c.up;
      for (let i = 0; i < 2; i++)
        c.mk(p.x, p.y - 12, base + (i ? .10 : -.10), sh.speed,
          { homing: 9, sprite: 'ofuda', color: 'sakura',
            dmg: sh.dmg, life: 1.2 });
      for (let i = 0; i < 3; i++)
        c.mk(p.x + (i - 1) * 9 * c.ff, p.y - 14, c.up, sh.speed,
          { dmg: sh.dmg * 1.8, r: 3, sprite: 'needle', color: 'gold',
            pierce: 3, rail: 1, life: 1.2 });
    }
  };
  /* 2 混乱符咒：法阵本身与齐射由 tickSpell 承担 */
  E.kekkai = c => {};
  /* 3 阴阳宝玉：黑白球由 tickSpell 维持并冲撞 */
  E.purifyRing = c => {};
  /* 4 弹幕结界：持续扩散的冲击波由 tickSpell 承担 */
  E.torii = c => {};
  /* 5 钱符：高速成长赛钱 / 低速扇形赛钱 */
  E.homingJade = c => {
    const p = c.p, sh = c.sh;
    if (p.focus) {
      /* 低速散射：七枚扇形赛钱，伤害 2 倍 */
      for (let i = 0; i < 7; i++) {
        const t = i / 6 - .5;
        c.mk(p.x, p.y - 12, c.up + t * .9, sh.speed,
          { sprite: 'star', color: 'amber', r: 6, dmg: sh.dmg * 2, life: 1.2 });
      }
    } else {
      /* 高速成长赛钱（大钱符）：伤害 3 倍 */
      c.mk(p.x, p.y - 20, c.up, sh.speed,
        { motion: 'grow', growMax: 34, r: 8, sprite: 'star', color: 'gold',
          dmg: sh.dmg * 3, pierce: 9, life: 1.3 });
    }
  };

  /* ---------------- 魔理沙 ---------------- */
  /* 1 极限火花：高速白色带彩线粗激光 / 低速更细更痛 */
  E.stardust = c => {
    const p = c.p, sh = c.sh;
    if (p.focus) {
      c.mk(p.x, p.y - 26, c.up, sh.speed,
        { r: 4, dmg: sh.dmg * 1.7, sprite: 'needle', color: 'white',
          rail: 1, pierce: 99, life: .9 });
    } else {
      c.mk(p.x, p.y - 26, c.up, sh.speed,
        { r: 13, dmg: sh.dmg, sprite: 'needle', color: 'white',
          rail: 1, pierce: 99, life: .9 });
      for (let k = 0; k < 3; k++)
        G.spawnParticle({ x: p.x + M.rand(-12, 12), y: p.y - 20 - k * 40,
          vx: M.rand(-30, 30), vy: -220,
          color: ['red', 'blue', 'gold'][k], life: .35, size: 3, type: 'spark' });
    }
  };
  /* 2 非定向激光：高速四线随机扫射 / 低速向前集中 */
  E.masterSpark = c => {
    const p = c.p, sh = c.sh;
    if (p.focus) {
      for (let i = 0; i < 4; i++)
        c.mk(p.x + (i - 1.5) * 10, p.y - 16, c.up, sh.speed,
          { r: 4, sprite: 'needle', color: 'cream', rail: 1,
            pierce: 99, dmg: sh.dmg, life: .9 });
    } else {
      for (let i = 0; i < 4; i++)
        c.mk(p.x, p.y - 16, c.up + M.rand(-1.2, 1.2), sh.speed,
          { r: 3, sprite: 'needle', color: 'gold', rail: 1,
            pierce: 99, dmg: sh.dmg, life: .8 });
    }
  };
  /* 3 好多流星：高速横向随机 / 低速中心固定，命中迸星 */
  E.shower = c => {
    const p = c.p, sh = c.sh;
    const x = p.focus ? p.x : p.x + M.rand(-150, 150);
    c.mk(x, p.y - 18, c.up, sh.speed,
      { sprite: 'star', color: 'cyan', r: 7, accel: 700, maxSpeed: 2100,
        pierce: 3, onHit: 'star', tag: 'meteor', dmg: sh.dmg, life: 1.0 });
  };
  /* 4 坠落的繁星：两侧锁定激光 */
  E.spiral = c => {
    const p = c.p, sh = c.sh;
    const tgt = GM.nearestTarget(p.x, p.y);
    for (const side of [-1, 1]) {
      const x = p.x + side * 34 * c.ff;
      const a = tgt ? Math.atan2(tgt.y - (p.y - 10), tgt.x - x) : c.up;
      c.mk(x, p.y - 10, a, sh.speed,
        { r: 5, sprite: 'needle', color: side < 0 ? 'blue' : 'gold',
          rail: 1, pierce: 99, dmg: sh.dmg, life: 1.0 });
    }
  };
  /* 5 浮游炮：按开火键向前发射星星子弹（炮台本身在 tickSpell） */
  E.meteor = c => {
    /* 直射星星子弹伤害降到 1/3；浮游炮自身的索敌弹在 tickSpell 里，不受影响 */
    for (let i = 0; i < 3; i++)
      c.mk(c.p.x + (i - 1) * 12 * c.ff, c.p.y - 14, c.up, c.sh.speed,
        { sprite: 'star', color: 'gold', r: 5, dmg: c.sh.dmg / 3, life: 1.2 });
  };

  /* ---------------- 咲夜：五张飞刀贴图与轨迹各不相同 ---------------- */
  /* 1 围绕的飞刀：银苦无，目标身旁浮现、0.3 秒后贯穿 */
  E.knifeVolley = c => {
    const tgt = GM.nearestTarget(c.p.x, c.p.y);
    const tx = tgt ? tgt.x : c.p.x, ty = tgt ? tgt.y : 150;
    for (let i = 0; i < 3; i++) {
      const a0 = M.rand(0, TAU), R = M.rand(46, 92);
      const x = tx + Math.cos(a0) * R, y = ty + Math.sin(a0) * R;
      c.mk(x, y, Math.atan2(ty - y, tx - x), c.sh.speed,
        { delay: .3, sprite: 'kunai', color: 'silver', r: 5,
          pierce: 99, rail: 1, dmg: c.sh.dmg, life: 1.4, tag: 'knife' });
    }
  };
  /* 2 刀扇飞舞：蓝针自转，低速收拢 */
  E.chronoLance = c => {
    const n = 11, spread = c.p.focus ? .55 : 1.15;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1) - .5;
      c.mk(c.p.x, c.p.y - 12, c.up + t * spread, c.sh.speed,
        { sprite: 'needle', color: 'blue', r: 4, dmg: c.sh.dmg,
          pierce: 2, rail: 1, life: 1.2, spin: 6 });
    }
  };
  /* 3 宴请八方：由 tickSpell 旋转发射、靛晶刃三跳弹 */
  E.timeField = c => {};
  /* 4 逆转的时钟：由 tickSpell 十二刻度轮流发射追踪镜刃 */
  E.clockDial = c => {};
  /* 5 堂堂正正的对决：白星三刀，低速并排向前 */
  E.rewind = c => {
    const p = c.p, sh = c.sh;
    if (p.focus) {
      for (let i = 0; i < 3; i++)
        c.mk(p.x + (i - 1) * 14, p.y - 16, c.up, sh.speed,
          { sprite: 'star', color: 'white', r: 6, dmg: sh.dmg * 1.3,
            pierce: 9, rail: 1, life: 1.1 });
    } else {
      c.mk(p.x, p.y - 18, c.up, sh.speed,
        { sprite: 'star', color: 'white', r: 7, dmg: sh.dmg * 1.6,
          pierce: 99, rail: 1, life: 1.1 });
      for (const side of [-1, 1]) {
        const a = c.up + side * (.25 + .2 * Math.sin(p.frame * .09));
        const s = c.mk(p.x + side * 22, p.y - 14, a, sh.speed,
          { sprite: 'star', color: 'cream', r: 5, dmg: sh.dmg * 1.2,
            pierce: 9, rail: 1, life: 1.1 });
        s.curve = -side * .5;
      }
    }
  };

  E._default = c => {
    const { mk, sh, p, count, up, ff } = c;
    for (let i = 0; i < count; i++)
      mk(p.x + (i - (count - 1) / 2) * 10 * ff, p.y - 14, up,
        sh.speed || 1600, { sprite: sh.sprite || 'small' });
  };

  /* =========================================================
   * 持续机构：每帧一次，不依赖开火键的符卡在此维持与齐射
   * ========================================================= */
  GM._decorOf = null; GM._decorKey = null;
  GM.tickSpell = function (dt) {
    const p = G.player;
    if (!p || !p.alive || G.state !== 'playing') return;
    const sp = G.getSpell(p.charId, p.slots[p.slot].idx);
    const k = sp.shot.type;
    if (GM._decorOf !== k) { GM.clearDecor(); GM._decorOf = k; GM._decorKey = null; }
    const F = p.frame;
    const dmg = sp.shot.dmg;
    switch (k) {
      case 'kekkai': {
        /* 五个法阵水平对称分散；低速收束到身后合为一大阵 */
        const mode = p.focus ? 1 : 0;
        const xs = mode ? [0] : [-160, -80, 0, 80, 160];
        const dy = mode ? 46 : -18;
        const pos = xs.map(x => [x, dy]);
        GM.syncDecor(pos, 'kekkai' + mode, {
          sprite: 'card', color: mode ? 'gold' : 'crimson',
          r: mode ? 16 : 9, zoneR: mode ? 46 : 22, spin: 4
        });
        if (mode) {
          /* 低速：每秒 120 张（原 60 的 2 倍），随机 ±15 度偏转 */
          for (let k = 0; k < 2; k++)
            GM.raw({ x: p.x + M.rand(-14, 14), y: p.y + dy,
              angle: -Math.PI / 2 + M.rand(-.26, .26), speed: 1500,
              sprite: 'ofuda', color: 'crimson', dmg: dmg * .75, r: 6, life: 1.2, tag: 'talisman' });
        } else {
          /* 高速：频率翻倍为每阵每秒 24 张。用索引跳变触发（2.5 帧一拍），
             五阵仍严格同时发射，造型不被拆散。 */
          const beat = Math.floor(F * 2 / 5);
          if (GM._kekkaiBeat !== beat) {
            GM._kekkaiBeat = beat;
            for (const dx of xs)
              GM.raw({ x: p.x + dx, y: p.y + dy,
                angle: -Math.PI / 2 + M.rand(-.26, .26), speed: 1500,
                sprite: 'ofuda', color: 'crimson', dmg: dmg * .9, r: 6,
                life: 1.2, tag: 'talisman' });
          }
        }
        break;
      }
      case 'purifyRing': {
        /* 极符「阴阳宝玉」：阴阳玉本身不发射子弹，而是作为环绕物
           直接撞击敌人。两颗黑白玉位置对称、超高速绕自机旋转。
           高速按住攻击：旋转半径自动调到刚好能碰到最近敌人。
           低速按住攻击：玉暂时停止公转，改为反复穿透冲撞敌人。 */
        const t = F / 60;
        const fire = G.fireDown();
        const tgt = GM.nearestTarget(p.x, p.y);
        const summon = fire && p.focus;              // 低速：召唤物自由追击
        const reach  = fire && !p.focus;             // 高速：按敌人距离调半径

        /* 高速：旋转半径直接跟随最近敌人的距离，不设上限——
           敌人多远就扩到多远，保证一定能攻击到最近的敌人。
           没按攻击时回到贴身的基础半径。 */
        let wantR = 44;
        if (reach && tgt)
          wantR = Math.max(30, Math.hypot(tgt.x - p.x, tgt.y - p.y));
        GM._orbR = GM._orbR === undefined ? 44 : GM._orbR;
        GM._orbR += (wantR - GM._orbR) * .2;
        const R = GM._orbR;

        const a0 = t * 11;
        const base = [[Math.cos(a0) * R, Math.sin(a0) * R],
                      [-Math.cos(a0) * R, -Math.sin(a0) * R]];
        let i = 0;
        for (const s of G.shots) {
          if (s.tag !== 'yinOrb') continue;
          s.px = s.x; s.py = s.y;
          /* 高速模式（含常态绕圈）伤害翻倍；低速穿刺维持基础值。 */
          s.dmg = summon ? dmg * 2.2 : dmg * 4.4;
          if (summon) {
            /* 低速：像十六夜的飞天玉——玉从敌人身旁 80px 处出现，
               沿穿过敌人的方向高速直线穿越，到另一侧 80px 后折返，
               再高速穿回来，如此往复。撞击由 pierce:99 + hitCd 反复结算。
               每次锁定新敌人时重置相位与方向。 */
            /* 两颗玉分工：i%2===0 打最近的敌人，i%2===1 打次近的（远的那枚），
               形成「一个打近、一个打远」。敌人不足时都落到同一目标。 */
            const aim = GM.nthTarget(p.x, p.y, i % 2) || tgt;
            if (aim) {
              /* 只在「切换到另一个敌人」时才重置相位——不能用坐标比较，
                 因为敌人一直在移动，坐标每帧都变会让相位反复归零、
                 玉就卡在敌人身旁不动了。 */
              if (s._aimRef !== aim || s._dash === undefined) {
                s._aimRef = aim;
                const ang0 = Math.atan2(p.y - aim.y, p.x - aim.x);
                s._dashDir = [Math.cos(ang0), Math.sin(ang0)];
                s._dash = -80; s._dashSign = 1;
              }
              const OFF = 80, SPD = 720;
              s._dash += s._dashSign * SPD / 60;
              if (s._dash >= OFF) { s._dash = OFF; s._dashSign = -1; }
              if (s._dash <= -OFF) { s._dash = -OFF; s._dashSign = 1; }
              const d = s._dashDir;
              s.x = aim.x + d[0] * s._dash;
              s.y = aim.y + d[1] * s._dash;
              s.vx = d[0] * SPD * s._dashSign;
              s.vy = d[1] * SPD * s._dashSign;
              s.angle = Math.atan2(s.vy, s.vx);
              if (F % 4 === 0)
                G.spawnParticle({ x: s.x, y: s.y, vx: M.rand(-20, 20), vy: M.rand(-20, 20),
                  color: i % 2 ? 'ink' : 'white', life: .2, size: 4, type: 'spark' });
            }
          } else {
            /* 常态 / 高速：两颗玉对称绕自机高速旋转，本体撞击敌人 */
            s._dash = undefined;   // 离开召唤模式时清掉穿越相位
            const q = base[i % 2];
            s.x = p.x + q[0]; s.y = p.y + q[1];
            s.vx = s.vy = 0;
          }
          i++;
        }
        /* 首次进入该武器时创建两颗可撞击的阴阳玉 */
        if (i === 0) {
          GM.raw({ x: p.x + base[0][0], y: p.y + base[0][1],
            vx: 0, vy: 0, speed: 0, delay: 0,
            sprite: 'big', color: 'white', r: 14, zoneR: 30, spin: 9,
            dmg: dmg * 2.2, pierce: 99, hitCd: .09, life: 999,
            motion: 'stay', tag: 'yinOrb' });
          GM.raw({ x: p.x + base[1][0], y: p.y + base[1][1],
            vx: 0, vy: 0, speed: 0, delay: 0,
            sprite: 'big', color: 'ink', r: 14, zoneR: 30, spin: -9,
            dmg: dmg * 2.2, pierce: 99, hitCd: .09, life: 999,
            motion: 'stay', tag: 'yinOrb' });
        }
        break;
      }
      case 'torii': {
        /* 结界：一秒一道的全屏冲击波，伤害为基准的 40 倍。
           半径给到画面对角线，确保波前扫过整个场地。 */
        if (F % 60 === 0)
          GM.shock(p.x, p.y - 10, dmg * 20, 'cyan', 1200, 2400);
        break;
      }
      case 'meteor': {
        /* 三台浮游炮绕身旋转，自动索敌发射能量弹 */
        const fast = GM.bombFx && GM.bombFx.script === 'satelliteBoost';
        const w = fast ? 13 : 5;
        const pos = [];
        for (let i = 0; i < 3; i++) {
          const a = F / 60 * w + i / 3 * TAU;
          pos.push([Math.cos(a) * 62, Math.sin(a) * 62 - 12]);
        }
        GM.syncDecor(pos, 'satellite', {
          sprite: 'star', color: 'blue', r: 8, zoneR: 22, spin: 7
        });
        if (F % (fast ? 2 : 12) === 0) {
          for (const q of pos) {
            const x = p.x + q[0], y = p.y + q[1];
            const tgt = GM.nearestTarget(x, y);
            const a = tgt ? Math.atan2(tgt.y - y, tgt.x - x) : -Math.PI / 2;
            GM.raw({ x, y, angle: a, speed: 1650, sprite: 'small',
              color: 'cyan', dmg: dmg * .8, r: 4, life: 1.1, tag: 'sat' });
          }
        }
        break;
      }
      case 'timeField': {
        /* 八方快速旋转，晶体刃在屏幕边缘弹射 3 次 */
        const rot = F * .055;
        if (F % 7 === 0) {
          for (let i = 0; i < 8; i++) {
            const a = rot + i / 8 * TAU;
            GM.raw({ x: p.x, y: p.y - 10, angle: a, speed: 1550,
              sprite: 'crystal', color: 'indigo', dmg, r: 6,
              ricochet: 3, spin: 5, life: 2.2, tag: 'knife' });
          }
        }
        break;
      }
      case 'clockDial': {
        /* 逆行时钟：12 刻度环绕自机贴图，半径贴合判定点外缘；
           表盘与指针由 render.drawClockFace 绘制，指针正对当前发射刻度。
           发射速率加倍：每 2.5 帧一枚（原每 5 帧）。 */
        const R = 34, cy = p.y - 8;
        /* 每 2.5 帧推进一个刻度（每秒 24 枚 = 原来 12 枚的 2 倍）。
           用刻度索引跳变触发，指针角度与这一发的位置严格一致。 */
        const step24 = Math.floor(F * 2 / 5);
        const idx = step24 % 12;
        const k12 = (12 - idx) % 12;             // 逆时针
        const a = -Math.PI / 2 - k12 / 12 * TAU; // 指针角 = 发射位置
        GM.clockFace = { x: p.x, y: cy, r: R, ang: a, active: true };
        if (GM._clockStep !== step24) {
          GM._clockStep = step24;
          const x = p.x + Math.cos(a) * R, y = cy + Math.sin(a) * R;
          GM.raw({ x, y, angle: a, speed: 1550,
            sprite: 'mirror', color: 'violet', dmg, r: 6,
            homing: 8, pierce: 1, life: 1.3, tag: 'knife' });
        }
        break;
      }
    }
  };

  /* =========================================================
   * 大招阶段机：0～2 秒无敌蓄力 → 全屏伤害＋清弹 → 各自专属效果
   * ========================================================= */
  GM.freeze = false;
  GM.freezeBullets = false;   // 符卡级「只冻结敌弹」，不影响 Boss 时间
  GM.fireRateMul = 1;
  GM.silence = 0;
  GM.tickBomb = function (dt) {
    const f = GM.bombFx;
    if (!f) return;
    const p = G.player;
    f.t += dt;
    const u = f.t - 2;
    if (u < 0) {
      /* 蓄力的 2 秒：无敌期间给一圈缓慢收拢的光点 */
      if (p && p.frame % 3 === 0)
        G.spawnParticle({ x: p.x + Math.cos(f.t * 5) * 78,
          y: p.y + Math.sin(f.t * 5) * 78, vx: -Math.cos(f.t * 5) * 40,
          vy: -Math.sin(f.t * 5) * 40, color: f.color, life: .5,
          size: 3.5, type: 'spark' });
      return;
    }
    if (!f.fired) {
      f.fired = true;
      G.clearBullets(true); G.lasers.length = 0;
      for (const e of G.enemies) GM.damageEnemy(e, f.power * .8);
      if (G.boss && G.boss.spell && G.boss.spell.type === 'barrier') {
        G.boss.hp -= f.power * .5; G.boss.flash = .3;
      }
      G.flash(.9, '#fff2d0'); G.shake(20);
      G.floatText(G.PF.w / 2, G.PF.h * .44, f.name, '#fff0d0', 22, 1.8);
      f.home = p ? { x: p.x, y: p.y } : null;
      f.step = 0;
    }
    f.step = (f.step || 0) + 1;
    const S = f.step;
    const col = f.color;
    const px = p ? p.x : G.PF.w / 2, py = p ? p.y - 20 : 500;
    const tgt = GM.nearestTarget(px, py);
    const tx = tgt ? tgt.x : G.PF.w / 2, ty = tgt ? tgt.y : 160;

    switch (f.script) {
      case 'dreamSeal': {
        /* 十颗彩色光球绕身 2 秒，之后一齐射出 */
        const cols = ['red', 'gold', 'cyan', 'violet', 'green', 'blue', 'pink', 'amber', 'white', 'sakura'];
        if (u < 2) {
          for (let i = 0; i < 10; i++) {
            const a = f.t * 4 + i / 10 * TAU;
            G.spawnParticle({ x: px + Math.cos(a) * 70, y: py + Math.sin(a) * 70,
              vx: 0, vy: 0, color: cols[i], life: .3, size: 9, type: 'spark' });
          }
        } else if (!f.fired2) {
          f.fired2 = true;
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i - 4.5) * .16;
            GM.raw({ x: px, y: py, angle: a, speed: 1700, sprite: 'big',
              color: cols[i], dmg: 120, r: 12, homing: 7, pierce: 9,
              rail: 1, life: 1.4, tag: 'bombShot' });
          }
        }
        break;
      }
      case 'chaos': {
        /* 2 秒内每秒 600 张符纸（每帧 10 张，原 5 张翻倍）自法阵额外射出 */
        if (u < 2) for (let i = 0; i < 10; i++)
          GM.raw({ x: px + M.rand(-170, 170), y: py + 20,
            angle: -Math.PI / 2 + M.rand(-.26, .26), speed: 1500,
            sprite: 'ofuda', color: 'crimson', dmg: 10.5, r: 5,
            life: 1.0, tag: 'bombShot' });
        break;
      }
      case 'yinyang': {
        /* 太极图案 + 4 秒沉默所有敌人 */
        GM.silence = Math.max(GM.silence, 4 - u);
        for (let i = 0; i < 2; i++) {
          const a = f.t * 2.4 + i * Math.PI;
          G.spawnParticle({ x: G.PF.w / 2 + Math.cos(a) * 76,
            y: G.PF.h * .46 + Math.sin(a) * 76,
            vx: 0, vy: 0, color: i ? 'ink' : 'white',
            life: .35, size: 11, type: 'spark' });
        }
        if (S % 6 === 0) GM.shock(G.PF.w / 2, G.PF.h * .46, 40, 'white', 260);
        break;
      }
      case 'barrier': {
        /* 8 秒护盾：屏蔽靠近自机的敌弹 */
        if (p) p.shield = Math.max(p.shield || 0, f.dur - 2 - u);
        if (S % 8 === 0)
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * TAU;
            G.spawnParticle({ x: px + Math.cos(a) * 52, y: py + Math.sin(a) * 52,
              vx: 0, vy: 0, color: 'cyan', life: .4, size: 4, type: 'spark' });
          }
        break;
      }
      case 'coin': {
        if (!f.fired2) {
          f.fired2 = true;
          G.addScore(5000);
          if (G.boss && G.boss.spell && G.boss.spell.type === 'barrier') G.boss.hp -= 2600;
          G.floatText(G.PF.w / 2, G.PF.h * .4, '+5000 赛钱', '#ffe07a', 22, 1.8);
          for (let i = 0; i < 40; i++)
            G.spawnParticle({ x: tx, y: ty, vx: M.rand(-240, 240), vy: M.rand(-240, 240),
              color: 'gold', life: .9, size: 5, type: 'shard' });
        }
        break;
      }
      case 'masterSparkB': {
        /* 3 秒发射占据半个屏幕的超大号激光 */
        if (u < 3 && S % 6 === 0)
          GM.raw({ x: px, y: py, angle: -Math.PI / 2, speed: 1700,
            sprite: 'needle', color: 'white', dmg: 90, r: 78,
            rail: 1, pierce: 99, life: .8, tag: 'bombShot' });
        break;
      }
      case 'laserMad': {
        /* 12 条激光极速随机乱扫 3 秒 */
        if (u < 3 && S % 3 === 0)
          for (let i = 0; i < 12; i++)
            GM.raw({ x: px, y: py, angle: M.rand(0, TAU), speed: 1750,
              sprite: 'needle', color: 'cream', dmg: 26, r: 4,
              rail: 1, pierce: 99, life: .6, tag: 'bombShot' });
        break;
      }
      case 'bigMeteor': {
        /* 一枚大流星飞向屏幕中心后爆炸 */
        if (u < .35) {
          if (S % 2 === 0)
            G.spawnParticle({ x: px, y: py - u * 900, vx: 0, vy: -60,
              color: 'cyan', life: .3, size: 20, type: 'spark' });
        } else if (!f.fired2) {
          f.fired2 = true;
          const cx = G.PF.w / 2, cy = G.PF.h * .44;
          G.burst(cx, cy, 'cyan', 60, 420, { type: 'shard' });
          G.flash(.8, '#bff4ff'); G.shake(22);
          GM.shock(cx, cy, 160, 'cyan', 420);
          for (const e of G.enemies) GM.damageEnemy(e, 300);
          if (G.boss && G.boss.spell && G.boss.spell.type === 'barrier') G.boss.hp -= 1400;
        }
        break;
      }
      case 'hexLaser': {
        /* 6 秒内由六边形六个角各发射一道激光 */
        if (u < 6 && S % 12 === 0)
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * TAU + f.t * .5;
            const x = px + Math.cos(a) * 92, y = py + Math.sin(a) * 92;
            const ang = Math.atan2(ty - y, tx - x);
            GM.raw({ x, y, angle: ang, speed: 1700, sprite: 'needle',
              color: 'gold', dmg: 34, r: 6, rail: 1, pierce: 99,
              life: .9, tag: 'bombShot' });
          }
        break;
      }
      case 'satelliteBoost': {
        /* 6 秒内浮游炮加速旋转并超高速开火 */
        if (u < 6 && S % 2 === 0)
          for (let i = 0; i < 3; i++) {
            const a = f.t * 13 + i / 3 * TAU;
            const x = px + Math.cos(a) * 66, y = py + Math.sin(a) * 66;
            const ang = Math.atan2(ty - y, tx - x);
            GM.raw({ x, y, angle: ang, speed: 1750, sprite: 'star',
              color: 'blue', dmg: 24, r: 5, life: 1.0, tag: 'bombShot' });
          }
        break;
      }
      case 'timeStopKnives': {
        /* 时停 2 秒（扭曲＋负片），敌人身旁浮现大量飞刀，解除时一齐射出 */
        if (u < 2) {
          GM.freeze = true; G.fx.invert = 1; G.fx.warp = 1;
          if (S % 2 === 0)
            for (let i = 0; i < 6; i++) {
              const a = M.rand(0, TAU), R = M.rand(50, 110);
              const x = tx + Math.cos(a) * R, y = ty + Math.sin(a) * R;
              GM.raw({ x, y, angle: Math.atan2(ty - y, tx - x), speed: 1700,
                sprite: 'kunai', color: 'silver', dmg: 34, r: 5,
                delay: 9, pierce: 99, rail: 1, life: 2.2, tag: 'bombKnife' });
            }
        } else if (!f.fired2) {
          f.fired2 = true;
          GM.freeze = false; GM.freezeBullets = false; G.fx.invert = 0; G.fx.warp = 0;
          for (const s of G.shots)
            if (s.tag === 'bombKnife') { s.delay = 0; s.hitCd = 0; }
          G.flash(.7, '#ffffff'); G.shake(16);
        }
        break;
      }
      case 'knifeFanBurst': {
        /* 1 秒内高频率发射超高速密集扇形飞刀 */
        if (u < 1 && S % 2 === 0)
          for (let i = 0; i < 11; i++) {
            const t = i / 10 - .5;
            GM.raw({ x: px, y: py, angle: -Math.PI / 2 + t * 1.3,
              speed: 1900, sprite: 'needle', color: 'blue', dmg: 26,
              r: 4, pierce: 3, rail: 1, life: .8, tag: 'bombShot' });
          }
        break;
      }
      case 'shockwave': {
        if (!f.fired2) {
          f.fired2 = true;
          GM.shock(px, py, 220, 'indigo', 560);
          G.flash(.7, '#b8a8ff'); G.shake(18);
        }
        break;
      }
      case 'reverseClock': {
        /* 时停 2 秒＋扭曲负片；传送 5 次，每次在 12 刻度召唤飞刀，
           最后一次传回施法位置，时停结束后一齐射出 */
        if (u < 2) {
          GM.freeze = true; G.fx.invert = 1; G.fx.warp = 1;
          if (S % 24 === 0) {
            f.warpN = (f.warpN || 0) + 1;
            if (f.warpN >= 5 && f.home && p) { p.x = f.home.x; p.y = f.home.y; }
            else if (p) {
              const a = f.warpN / 12 * TAU;
              p.x = M.clamp(G.PF.w / 2 + Math.cos(a) * 150, 16, G.PF.w - 16);
              p.y = M.clamp(G.PF.h * .62 + Math.sin(a) * 120, 16, G.PF.h - 16);
            }
            G.burst(p ? p.x : px, p ? p.y : py, 'violet', 22, 240, { type: 'shard' });
            for (let i = 0; i < 12; i++) {
              const a = -Math.PI / 2 - i / 12 * TAU;
              GM.raw({ x: (p ? p.x : px) + Math.cos(a) * 54,
                y: (p ? p.y : py) + Math.sin(a) * 54,
                angle: Math.atan2(ty - ((p ? p.y : py) + Math.sin(a) * 54),
                                  tx - ((p ? p.x : px) + Math.cos(a) * 54)),
                speed: 1700, sprite: 'mirror', color: 'violet', dmg: 30,
                r: 5, delay: 9, pierce: 99, rail: 1, life: 2.2, tag: 'bombKnife' });
            }
          }
        } else if (!f.fired2) {
          f.fired2 = true;
          GM.freeze = false; GM.freezeBullets = false; G.fx.invert = 0; G.fx.warp = 0;
          if (f.home && p) { p.x = f.home.x; p.y = f.home.y; }
          for (const s of G.shots)
            if (s.tag === 'bombKnife') { s.delay = 0; s.hitCd = 0; }
          G.flash(.8, '#e8c8ff'); G.shake(18);
        }
        break;
      }
      case 'tripleFire': {
        /* 4 秒内自机发射速度 3 倍 */
        GM.fireRateMul = 3;
        if (S % 10 === 0)
          G.spawnParticle({ x: px, y: py, vx: 0, vy: -40,
            color: 'white', life: .4, size: 6, type: 'spark' });
        break;
      }
    }
    if (f.t >= f.dur) {
      GM.freeze = false; GM.freezeBullets = false; G.fx.invert = 0; G.fx.warp = 0;
      GM.fireRateMul = 1;
      GM.bombFx = null;
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
    /* 统一时序：先 2 秒无敌蓄力，再由 tickBomb 触发全屏伤害＋清弹，
       最后执行该符卡专属的持续效果。 */
    p.bombTime = bm.dur + 2;
    p.invuln = Math.max(p.invuln, bm.dur + 2.3);
    GM.bombFx = { type: bm.type, fx: bm.fx || sp.shot.type,
      color: bm.color, dur: bm.dur + 2, radius: bm.radius, t: 0,
      power: bm.power * p.bombScale, name: bm.name, script: bm.script,
      fired: false, fired2: false, step: 0, home: null, warpN: 0 };
    // 音乐：短暂角色插入句（大招专属，符卡序号决定变奏）
    G.audio.playJingle(p.charId, p.slots[p.slot].idx);
    G.audio.sfx('bomb');
    G.flash(.35, '#fff2d0'); G.shake(8);
    G.burst(p.x, p.y, bm.color, 20, 220, { type: 'shard' });
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
    GM.tickSpell(dt);
    GM.updateShots(dt);
    GM.updateWaves(dt);
    /* 时停大招：敌人、敌弹、Boss 全部静止，自机与自身弹幕仍可动。
       freezeBullets 是符卡级的「只冻结敌弹」开关：Boss 与其时间（spellFrame）
       照常推进，否则符卡脚本里靠帧号解除的时停会永远卡死。 */
    if (!GM.freeze) {
      if (!GM.freezeBullets) GM.updateBullets(dt);
      GM.updateLasers(dt);
      GM.updateEnemies(dt);
      GM.updateBoss(dt);
    }
    G.updateParticles(dt);

    /* 护盾：屏蔽靠近自机的敌弹 */
    if (G.player && G.player.shield > 0) {
      G.player.shield -= dt;
      const px = G.player.x, py = G.player.y;
      const b = G.bullets; let n = 0;
      for (let i = 0; i < b.length; i++) {
        if (M.dist2(px, py, b[i].x, b[i].y) < 92 * 92) { G.poolB.push(b[i]); continue; }
        b[n++] = b[i];
      }
      b.length = n;
    }
    /* 沉默：持续清除敌人发出的弹幕 */
    if (GM.silence > 0) { GM.silence -= dt; G.bullets.length = 0; G.lasers.length = 0; }
    /* 负片 / 扭曲特效的兜底衰减（大招会每帧置回 1） */
    G.fx.invert = Math.max(0, (G.fx.invert || 0) - dt * 2);
    G.fx.warp = Math.max(0, (G.fx.warp || 0) - dt * 2);

    if (GM.declare) { GM.declare.t += dt; if (GM.declare.t > 2.3) GM.declare = null; }
    GM.tickBomb(dt);
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
      /* 装饰物（法阵 / 阴阳玉 / 浮游炮 / 传送阵）跟随自机或固定摆位，
         不能被常规越界逻辑回收，否则贴边时会整件消失。 */
      const fixed = s.tag === 'decor' || s.tag === 'bombOrb' || s.tag === 'clockFace' || s.tag === 'yinOrb';
      if (!fixed && mo !== 'expand' && mo !== 'wave' &&
          (s.x < -30 || s.x > W + 30 || s.y < -40 || s.y > G.PF.h + 40)) {
        G.poolS.push(s); continue;
      }

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
          /* 受击半径与立绘实体持平（袖口 / 下摆约 ±40px），
             不含背后那圈半透明光轮；原先 30 明显小于贴图。 */
          const b = G.boss, rr = 42 + s.r;
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
          /* 「好多流星」：命中处迸出星屑 */
          if (s.onHit === 'star')
            G.burst(s.x, s.y, 'gold', 7, 150, { type: 'shard' });
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

  GM.nearestTarget = function (x, y) { return GM.nthTarget(x, y, 0); };
  /* 第 n 近目标（0=最近）。阴阳玉低速时两颗分工：一颗打最近、一颗打次近。 */
  GM.nthTarget = function (x, y, n) {
    const cand = [];
    for (const e of G.enemies)
      if (e.hp > 0) cand.push({ o: e, d: M.dist2(x, y, e.x, e.y) });
    if (G.boss && G.boss.spell)
      cand.push({ o: G.boss, d: M.dist2(x, y, G.boss.x, G.boss.y) });
    cand.sort((a, b) => a.d - b.d);
    return cand[Math.min(n, cand.length - 1)] ? cand[Math.min(n, cand.length - 1)].o : null;
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
        // 延迟结束：起速。若带 aimBias，则在「发射的这一刻」按自机当前位置
        // 实时计算朝向（预警期玩家移动过也能追向新位置），而不沿用生成时的旧角度。
        b.delay = 0;
        if (b.aimBias > 0 && p) {
          const toP = Math.atan2(p.y - b.y, p.x - b.x);
          let gap = M.norm(toP - b.aimBaseAngle);
          if (gap > Math.PI) gap -= TAU;
          b.angle = b.aimBaseAngle + gap * b.aimBias
            + M.rand(-b.aimJitter, b.aimJitter);
        }
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
