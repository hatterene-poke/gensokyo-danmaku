/* ===========================================================
 * audio.js — Web Audio 程序化合成器 / 音序器 / 音效
 * 所有声音由振荡器与噪声实时合成，无任何外部音频文件。
 * =========================================================== */
(function () {
  const G = window.G, MUS = G.MUSIC;
  const A = G.audio = {
    ctx: null, ready: false, started: false,
    master: null, music: null, sfx: null, jingle: null, duck: 1,
    bgmVol: .55, sfxVol: .6, muted: false,
    cur: null, pending: null, switchAt: 0, nextTime: 0, pos: 0,
    totalSteps: 0, timer: null, lookahead: .14,
    _lastShot: 0, _duckUntil: 0, _pendingBGM: null,
    sfxEnabled: true
  };

  const m2f = MUS.m2f;
  function now() { return A.ctx ? A.ctx.currentTime : 0; }

  /* ---------- 初始化（必须由用户手势触发） ---------- */
  A.init = function () {
    if (A.ready) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('Web Audio 不可用'); return; }
    A.ctx = new AC();
    const c = A.ctx;
    A.master = c.createGain(); A.master.gain.value = .85; A.master.connect(c.destination);
    A.music = c.createGain(); A.music.gain.value = A.bgmVol; A.music.connect(A.master);
    A.sfxBus = c.createGain(); A.sfxBus.gain.value = A.sfxVol; A.sfxBus.connect(A.master);
    A.jingle = c.createGain(); A.jingle.gain.value = A.sfxVol * 1.15; A.jingle.connect(A.master);
    // 轻度总线压缩，避免弹幕密集时爆音
    try {
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 3.5;
      comp.attack.value = .004; comp.release.value = .18;
      A.master.disconnect(); A.master.connect(comp); comp.connect(c.destination);
    } catch (e) { }
    // 噪声缓冲
    const len = Math.floor(c.sampleRate * 1.0);
    A.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = A.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.ready = true;
    c.resume();
    A.timer = setInterval(tick, 25);
    if (A._pendingBGM) { const t = A._pendingBGM; A._pendingBGM = null; A.playBGM(t); }
  };

  A.setBGMVol = v => { A.bgmVol = v; if (A.music) A.music.gain.setTargetAtTime(v * A.duck, now(), .05); };
  A.setSFXVol = v => { A.sfxVol = v; if (A.sfxBus) A.sfxBus.gain.setTargetAtTime(v, now(), .05); if (A.jingle) A.jingle.gain.setTargetAtTime(v * 1.15, now(), .05); };
  A.toggleMute = () => { A.muted = !A.muted; if (A.master) A.master.gain.setTargetAtTime(A.muted ? 0 : .85, now(), .05); return A.muted; };

  /* ---------- 基础节点 ---------- */
  function osc(type, f, t, dur, detune) {
    const o = A.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune;
    o.start(t); o.stop(t + dur);
    return o;
  }
  function gainEnv(t, dur, peak, atk, dec, sus, rel, bus) {
    const g = A.ctx.createGain();
    const end = t + dur;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.linearRampToValueAtTime(peak * sus, t + atk + dec);
    g.gain.setValueAtTime(peak * sus, Math.max(t + atk + dec, end - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    g.connect(bus || A.music);
    return g;
  }
  function noise(t, dur, bus) {
    const s = A.ctx.createBufferSource();
    s.buffer = A.noiseBuf; s.loop = true;
    s.start(t); s.stop(t + dur);
    return s;
  }

  /* ---------- 音色 ---------- */
  const VOICE = {};

  // ZUN 号：双锯齿失谐 + 滤波扫频的合成小号
  VOICE.brass = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.07, dur);
    const flt = A.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 1.1;
    flt.frequency.setValueAtTime(900, t);
    flt.frequency.linearRampToValueAtTime(3100, t + Math.min(.055, d * .3));
    flt.frequency.linearRampToValueAtTime(1500, t + d);
    const g = gainEnv(t, d + .05, .17 * v, .012, .05, .72, .06, bus);
    flt.connect(g);
    osc('sawtooth', f, t, d + .05).connect(flt);
    osc('sawtooth', f, t, d + .05, 7).connect(flt);
    osc('square', f * .5, t, d + .05).connect(flt);
  };

  // 萨克斯风：较暗的滤波 + 轻微失谐
  VOICE.sax = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.08, dur);
    const flt = A.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 2.4;
    flt.frequency.setValueAtTime(700, t);
    flt.frequency.linearRampToValueAtTime(2100, t + .05);
    flt.frequency.linearRampToValueAtTime(1200, t + d);
    const g = gainEnv(t, d + .04, .15 * v, .035, .06, .7, .07, bus);
    flt.connect(g);
    osc('sawtooth', f, t, d + .04).connect(flt);
    osc('sawtooth', f, t, d + .04, -9).connect(flt);
  };

  // 风琴 / 标题曲主旋律：正弦泛音叠加
  VOICE.organ = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.1, dur);
    const g = gainEnv(t, d + .08, .12 * v, .055, .08, .78, .12, bus);
    for (const [mul, amp] of [[1, 1], [2, .42], [3, .18], [4, .1]]) {
      const og = A.ctx.createGain(); og.gain.value = amp;
      osc('sine', f * mul, t, d + .08).connect(og); og.connect(g);
    }
  };

  // 电钢（FM）
  VOICE.epiano = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.08, Math.min(dur, .7));
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.085 * v, t + .006);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    g.connect(bus || A.music);
    const car = osc('sine', f, t, d + .02);
    const mod = osc('sine', f * 2.01, t, d + .02);
    const mg = A.ctx.createGain();
    mg.gain.setValueAtTime(f * 1.7, t);
    mg.gain.exponentialRampToValueAtTime(1, t + d * .6);
    mod.connect(mg); mg.connect(car.frequency);
    car.connect(g);
  };

  // 快速钢琴（三角波 + 高泛音，短衰减）
  VOICE.piano = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.055, Math.min(dur, .36));
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.075 * v, t + .004);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    g.connect(bus || A.music);
    osc('triangle', f, t, d + .01).connect(g);
    const og = A.ctx.createGain(); og.gain.value = .28;
    osc('sine', f * 3, t, d + .01).connect(og); og.connect(g);
  };

  // 铃 / 和风音色
  VOICE.bells = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.12, Math.min(dur, 1.1));
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.09 * v, t + .003);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    g.connect(bus || A.music);
    for (const [mul, amp] of [[1, 1], [2.76, .34], [5.4, .14]]) {
      const og = A.ctx.createGain(); og.gain.value = amp;
      osc('sine', f * mul, t, d + .01).connect(og); og.connect(g);
    }
  };

  VOICE.bass = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.08, Math.min(dur, .45));
    const flt = A.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 480; flt.Q.value = 1.6;
    const g = gainEnv(t, d, .17 * v, .008, .05, .5, .05, bus);
    flt.connect(g);
    osc('sawtooth', f, t, d).connect(flt);
    osc('sine', f / 2, t, d).connect(flt);
  };

  VOICE.pad = (midis, t, dur, v, bus) => {
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.035 * v, t + .18);
    g.gain.setValueAtTime(.035 * v, t + dur * .7);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    g.connect(bus || A.music);
    for (const m of midis) {
      const og = A.ctx.createGain(); og.gain.value = .55;
      osc('triangle', m2f(m - 12), t, dur + .02).connect(og); og.connect(g);
    }
  };

  /* 主旋律统一使用东方原作常用的合成小号（VOICE.brass），
     伴奏为钢琴 / 电钢 / 贝斯 / 风琴；角色差异由旋律承担。 */

  /* ---------- 鼓组 ---------- */
  const DRUM = {
    kick(t, v = 1, bus) {
      const o = A.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(145, t);
      o.frequency.exponentialRampToValueAtTime(44, t + .1);
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(.32 * v, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + .2);
      o.connect(g); g.connect(bus || A.music);
      o.start(t); o.stop(t + .21);
    },
    snare(t, v = 1, bus) {
      const n = noise(t, .16, bus), f = A.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = .7;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(.16 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .145);
      n.connect(f); f.connect(g); g.connect(bus || A.music);
      const o = osc('sine', 185, t, .1);
      const og = A.ctx.createGain(); og.gain.setValueAtTime(.075 * v, t);
      og.gain.exponentialRampToValueAtTime(.0001, t + .09);
      o.connect(og); og.connect(bus || A.music);
    },
    hat(t, v = 1, open = false, bus) {
      const dur = open ? .16 : .045;
      const n = noise(t, dur + .01, bus), f = A.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7600;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(.055 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      n.connect(f); f.connect(g); g.connect(bus || A.music);
    },
    tom(t, v = 1, bus) {
      const o = A.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(95, t + .13);
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(.14 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
      o.connect(g); g.connect(bus || A.music); o.start(t); o.stop(t + .17);
    },

  };

  /* ---------- 音序器 ---------- */
  function trackPeriod(tr) { return tr.order.reduce((s, i) => s + tr.sections[i].steps, 0); }

  function locate(tr, pos) {
    let p = pos % trackPeriod(tr);
    for (const si of tr.order) {
      const s = tr.sections[si];
      if (p < s.steps) return { s, local: p, si };
      p -= s.steps;
    }
    return { s: tr.sections[0], local: 0, si: 0 };
  }

  /* ---------- 三种 Boss 曲风 + 经典编曲的分派 ----------
   * gagaku  : 尺八 + 筝 + 稀疏太鼓，四五度叠置，大量留白
   * crystal : 玻璃音色 + 高八度镜面回声，6/8（12 步），钲击代替鼓组
   * matsuri : 篠笛 + 三味线 + 大太鼓与钲的祭囃子拍
   * classic : 标题 / 道中曲的铜管 + 16 分钢琴 + 底鼓
   */
  /* 东方原作风格的标准编曲：ZUN 号主旋律 + 钢琴琶音 + 电钢切分 +
     贝斯根音 + 鼓组。meter 可为 16（4/4）或 12（6/8），鼓点自动换算。 */
  function scheduleToho(s, local, step, meter, ch, t, sd, opt) {
    const D = DRUM;
    const beat = meter / 4;
    const lead = VOICE.brass;
    /* 主旋律始终是 ZUN 号；每首再叠一层不同的、同样属于东方常用配器的
       辅助音色，只做轻微色差，不喧宾夺主。 */
    const color = opt.color ? VOICE[opt.color] : null;
    for (const e of s.ev) {
      if (e.at === local && e.m) {
        const dur = Math.max(.05, e.dur * sd * .93);
        lead(e.m, t, dur, 1, A.music);
        if (opt.thick && e.dur >= 2)
          VOICE.brass(e.m - 12, t, dur * .8, .3, A.music);
        if (color) color(e.m + (opt.colorOct || 0), t,
          Math.max(.06, dur * (opt.colorShort ? .55 : .9)),
          opt.colorVol || .3, A.music);
      }
    }
    // 电钢和弦切分
    if (step === 0 || step === Math.round(meter * .375) || step === Math.round(meter * .625)) {
      const vel = step === 0 ? .85 : .55;
      for (const m of ch)
        VOICE.epiano(m + 12, t, sd * (step === 0 ? 3.2 : 1.7), vel, A.music);
    }
    // 抒情曲的风琴铺底
    if (step === 0 && opt.pad) VOICE.pad(ch, t, sd * meter, .7, A.music);
    // 贝斯：每拍根音，小节中点升五度
    if (beat > 0 && step % beat === 0)
      VOICE.bass(ch[0] - 12 + (step === meter / 2 ? 7 : 0), t, sd * 3.2, .9, A.music);
    // 钢琴琶音
    if (opt.arp === 'fast') {
      const seq = [0, 1, 2, 1, 2, 1, 0, 2, 1, 2, 1, 0, 2, 1, 2, 1];
      const idx = seq[step % 16] % ch.length;
      const baseOct = opt.bright ? 24 : 12;   // 二面琶音整体高一个八度，冷亮但不刺耳
      VOICE.piano(ch[idx] + (step >= meter / 2 ? baseOct + 12 : baseOct), t, sd * .85,
        step % 2 === 0 ? .72 : .5, A.music);
    } else if (opt.arp === 'soft' && step % 2 === 0) {
      VOICE.piano(ch[(step / 2) % ch.length] + 12, t, sd * 1.7, .5, A.music);
    }
    // 鼓组
    if (opt.drums === 'ballad') {
      if (step === 0 || step === meter / 2) D.kick(t, .7);
      if (step === beat || step === beat * 3) D.snare(t, .38);
      if (step % 2 === 0) D.hat(t, .45);
    } else {
      const kicks = meter === 12 ? [0, 3, 6, 9] : [0, 3, 6, 8, 11, 14];
      if (kicks.includes(step)) D.kick(t, step % 3 === 0 ? 1 : .6);
      if (step === Math.round(beat) || step === Math.round(beat * 3)) D.snare(t, 1);
      D.hat(t, step % 2 === 0 ? .8 : .5, step === meter - 2);
      if (step === meter - 1 && opt.fillHeavy) D.tom(t, .5);
    }
    // 段落末尾：两拍 fill 后完全骤停（原作常见转折）
    if (s.fill && local >= s.steps - 4 && local < s.steps - 2) {
      D.snare(t, .55); D.tom(t, .35);
    }
    if (s.fill && local >= s.steps - 2) return;
  }

  function scheduleStep(tr, pos, t, sd) {
    const { s, local } = locate(tr, pos);
    const meter = s.meter || tr.meter || 16;
    const step = local % meter;
    const bar = Math.floor(local / meter);
    const ch = s.chords[bar % s.chords.length];
    const lead = VOICE[tr.lead] || VOICE.brass;
    const intens = tr.intensity || .7;
    const style = tr.style || 'classic';
    const D = DRUM;

    /* 三种曲风共用东方原作的标准配器：
       合成小号（ZUN 号）主旋律 + 钢琴琶音 + 电钢和弦 + 贝斯 + 标准鼓组。
       角色差异全部交给旋律、音阶、拍号与速度，不靠奇怪的音色。 */
    if (style === 'gagaku') {          // 一面：慢速抒情，留白多
      scheduleToho(s, local, step, meter, ch, t, sd,
        { arp: 'soft', drums: 'ballad', pad: true, thick: false,
          color: 'organ', colorOct: 0, colorVol: .3 });
      return;
    }
    if (style === 'crystal') {         // 二面：6/8 复合拍，冷冽快曲
      scheduleToho(s, local, step, meter, ch, t, sd,
        { arp: 'fast', drums: 'battle', pad: false, thick: true, bright: true,
          color: 'piano', colorOct: 12, colorShort: true, colorVol: .34 });
      return;
    }
    if (style === 'matsuri') {         // 三面：热闹终曲，铜管最厚
      scheduleToho(s, local, step, meter, ch, t, sd,
        { arp: 'fast', drums: 'battle', pad: false, thick: true, fillHeavy: true,
          color: 'sax', colorOct: -12, colorVol: .3 });
      return;
    }

    /* ---------------- classic（标题 / 道中曲） ---------------- */
    const step16 = step;
    for (const e of s.ev) {
      if (e.at === local && e.m) {
        const dur = Math.max(.045, e.dur * sd * .93);
        lead(e.m, t, dur, 1, A.music);
        if (intens > .8 && e.dur >= 2) VOICE.brass(e.m - 12, t, dur * .8, .32, A.music);
      }
    }
    if (step16 === 0 || step16 === 6 || step16 === 10) {
      const vel = step16 === 0 ? .85 : .55;
      for (const m of ch) VOICE.epiano(m + 12, t, sd * (step16 === 0 ? 3.2 : 1.7), vel, A.music);
    }
    if (step16 === 0 && tr.arp === 'soft') VOICE.pad(ch, t, sd * 15, .8, A.music);
    if (step16 % 4 === 0) {
      VOICE.bass(ch[0] - 12 + (step16 === 8 ? 7 : 0), t, sd * (step16 === 0 ? 3.4 : 1.9), .9, A.music);
    }
    if (tr.drums === 'battle' && step16 === 14) VOICE.bass(ch[0] - 5, t, sd * 1.6, .55, A.music);
    if (tr.arp === 'fast') {
      const seq = [0, 1, 2, 1, 2, 1, 0, 2, 1, 2, 1, 0, 2, 1, 2, 1];
      const idx = seq[step16] % ch.length;
      const oct = step16 >= 8 ? 24 : 12;
      VOICE.piano(ch[idx] + oct, t, sd * .85, step16 % 2 === 0 ? .72 : .5, A.music);
    } else if (tr.arp === 'soft' && step16 % 2 === 0) {
      const idx = (step16 / 2) % ch.length;
      VOICE.piano(ch[idx] + 12, t, sd * 1.7, .5, A.music);
    }
    if (tr.drums === 'ballad') {
      if (step16 === 0 || step16 === 8) D.kick(t, .7);
      if (step16 === 4 || step16 === 12) D.snare(t, .38);
      if (step16 % 2 === 0) D.hat(t, .45);
    } else if (tr.drums === 'drive') {
      if (step16 % 4 === 0) D.kick(t, step16 === 0 ? 1 : .82);
      if (step16 === 4 || step16 === 12) D.snare(t, .9);
      if (step16 % 2 === 0) D.hat(t, step16 % 4 === 2 ? .8 : .55);
      if (step16 === 14 && bar % 2 === 1) D.snare(t, .4);
    } else {
      if ([0, 3, 6, 8, 11, 14].includes(step16)) D.kick(t, step16 % 4 === 0 ? 1 : .6);
      if (step16 === 4 || step16 === 12) D.snare(t, 1);
      D.hat(t, step16 % 4 === 2 ? .8 : .5, step16 === 14);
      if (step16 === 15 && bar % 2 === 1) D.tom(t, .6);
    }
    if (s.fill && local >= s.steps - 4 && local < s.steps) {
      D.snare(t, .55); D.tom(t, .35);
    }
  }

  function tick() {
    if (!A.ready || !A.ctx) return;
    const c = A.ctx, t0 = now();

    // 待切换的曲目
    if (A.pending && t0 >= A.switchAt) {
      A.cur = MUS.tracks[A.pending]; A.pending = null;
      A.pos = 0; A.nextTime = t0 + .04;
      A.totalSteps = trackPeriod(A.cur);
      A.music.gain.cancelScheduledValues(t0);
      A.music.gain.setValueAtTime(Math.max(.0001, A.music.gain.value), t0);
      A.music.gain.linearRampToValueAtTime(A.bgmVol * A.duck, t0 + .35);
    }

    // duck 恢复
    if (A._duckUntil && t0 > A._duckUntil) {
      A.duck = 1; A._duckUntil = 0;
      A.music.gain.setTargetAtTime(A.bgmVol, t0, .18);
    }

    if (!A.cur) return;
    const tr = A.cur, sd = 60 / tr.bpm / 4;
    let guard = 0;
    while (A.nextTime < t0 + A.lookahead && guard++ < 64) {
      if (A.nextTime >= t0 - .02) scheduleStep(tr, A.pos, A.nextTime, sd);
      A.nextTime += sd;
      A.pos = (A.pos + 1) % A.totalSteps;
    }
  }

  /* ---------- BGM 控制 ---------- */
  A.playBGM = function (id) {
    if (!MUS.tracks[id]) return;
    if (!A.ready) { A._pendingBGM = id; A.init(); return; }
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    if (A.cur && A.cur.id === id && !A.pending) return;
    if (A.pending === id) return;
    const t = now();
    A.music.gain.cancelScheduledValues(t);
    A.music.gain.setValueAtTime(Math.max(.0001, A.music.gain.value), t);
    A.music.gain.linearRampToValueAtTime(0.0001, t + .18);
    A.pending = id; A.switchAt = t + .2;
  };
  A.stopBGM = function () {
    if (!A.ready) { A._pendingBGM = null; return; }
    const t = now();
    A.music.gain.cancelScheduledValues(t);
    A.music.gain.setValueAtTime(Math.max(.0001, A.music.gain.value), t);
    A.music.gain.linearRampToValueAtTime(.0001, t + .3);
    A.cur = null; A.pending = null;
  };
  A.nowPlaying = () => A.cur ? A.cur.id : (A.pending || null);

  /* ---------- 自机大招插入乐句 ---------- */
  A.playJingle = function (charId, spellIdx = 0, bus) {
    if (!A.ready) A.init();
    if (!A.ready) return;
    const j = MUS.jingles[charId] || MUS.jingles.reimu;
    const t = now() + .015, sd = 60 / j.bpm / 4;
    const v = VOICE[j.lead] || VOICE.brass;
    // 依符卡序号转调 / 变奏：十张符卡的插入句各不相同
    const shift = [0, 2, -2, 3, -3, 5, -5, 7, -4, 4][spellIdx % 10];
    const rate = [1, .92, 1.08, .85, 1.15, 1, .8, 1.2, .9, 1.1][spellIdx % 10];
    const out = bus || A.jingle;
    let at = 0;
    for (const e of j.ev) {
      const dur = Math.max(.04, e.d * sd * rate * .94);
      if (e.m) {
        v(e.m + shift, t + at * sd * rate, dur, 1.15, out);
        if (spellIdx % 3 === 0) VOICE.bells(e.m + shift + 12, t + at * sd * rate, dur * 1.6, .35, out);
      }
      at += e.d;
    }
    // 收束和弦
    const root = 62 + shift;
    for (const m of [root, root + 4, root + 7, root + 12])
      VOICE.epiano(m, t + at * sd * rate, sd * 7, .8, out);
    const total = (at * sd * rate) + sd * 7;
    // BGM 闪避（ducking）
    A.duck = .34; A._duckUntil = t + total * .8;
    A.music.gain.cancelScheduledValues(t);
    A.music.gain.setValueAtTime(Math.max(.0001, A.music.gain.value), t);
    A.music.gain.linearRampToValueAtTime(A.bgmVol * .34, t + .05);
    return total;
  };

  /* ---------- 音效 ---------- */
  A.sfx = function (name, arg) {
    if (!A.ready || !A.sfxEnabled) return;
    const t = now() + .002, out = A.sfxBus, C = A.ctx;
    switch (name) {
      case 'ui': VOICE.bells(84, t, .22, .55, out); break;
      case 'ok': VOICE.bells(76, t, .18, .6, out); VOICE.bells(83, t + .06, .3, .5, out); break;
      case 'cancel': VOICE.epiano(60, t, .16, .6, out); break;
      case 'shot': {
        if (t - A._lastShot < .055) return; A._lastShot = t;
        const o = osc('square', 1250 + Math.random() * 180, t, .035);
        const g = C.createGain(); g.gain.setValueAtTime(.017, t);
        g.gain.exponentialRampToValueAtTime(.0001, t + .035);
        o.connect(g); g.connect(out); break;
      }
      case 'graze': VOICE.bells(93, t, .16, .42, out); break;
      case 'dash': {
        // 冲刺：短促上扫的风切声 + 一记清亮铃音
        const n = noise(t, .16), f = C.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.setValueAtTime(900, t);
        f.frequency.exponentialRampToValueAtTime(5200, t + .15); f.Q.value = 1.2;
        const g = C.createGain(); g.gain.setValueAtTime(.075, t);
        g.gain.exponentialRampToValueAtTime(.0001, t + .17);
        n.connect(f); f.connect(g); g.connect(out);
        VOICE.bells(88, t, .16, .45, out); break;
      }
      case 'hit': {
        const n = noise(t, .035), f = C.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 4200;
        const g = C.createGain(); g.gain.setValueAtTime(.045, t);
        g.gain.exponentialRampToValueAtTime(.0001, t + .035);
        n.connect(f); f.connect(g); g.connect(out); break;
      }
      case 'die': {
        const n = noise(t, .22), f = C.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t);
        f.frequency.exponentialRampToValueAtTime(300, t + .2);
        const g = C.createGain(); g.gain.setValueAtTime(.13, t);
        g.gain.exponentialRampToValueAtTime(.0001, t + .22);
        n.connect(f); f.connect(g); g.connect(out); DRUM.kick(t, .7, out); break;
      }
      case 'declare': {
        for (let i = 0; i < 4; i++) VOICE.bells(72 + i * 3, t + i * .045, .5, .5, out);
        VOICE.brass(69, t, .5, .7, out); VOICE.brass(76, t + .12, .6, .8, out);
        break;
      }
      case 'bossHit': VOICE.piano(72 + Math.floor(Math.random() * 6), t, .09, .35, out); break;
      case 'grace': {
        // 时间静止：下行扫频 + 低沉冲击
        const o = C.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(680, t); o.frequency.exponentialRampToValueAtTime(70, t + .5);
        const f = C.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
        const g = C.createGain(); g.gain.setValueAtTime(.13, t);
        g.gain.exponentialRampToValueAtTime(.0001, t + .55);
        o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + .56);
        DRUM.kick(t, 1, out); break;
      }
      case 'break': {
        for (let i = 0; i < 7; i++) VOICE.bells(84 + i * 2 + Math.random() * 3, t + i * .022, .38 - i * .035, .55, out);
        const n = noise(t, .3), f = C.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 3200;
        const g = C.createGain(); g.gain.setValueAtTime(.11, t);
        g.gain.exponentialRampToValueAtTime(.0001, t + .3);
        n.connect(f); f.connect(g); g.connect(out); break;
      }
      case 'bomb': {
        const o = C.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(1800, t + .34);
        const f = C.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(6000, t + .34);
        const g = C.createGain(); g.gain.setValueAtTime(.16, t);
        g.gain.exponentialRampToValueAtTime(.0001, t + .5);
        o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + .51);
        DRUM.kick(t, 1.2, out);
        for (const m of [62, 65, 69, 74]) VOICE.brass(m, t + .06, .55, .5, out);
        break;
      }
      case 'bossDie': {
        for (let i = 0; i < 6; i++) VOICE.bells(72 + i * 2, t + i * .07, 1.1, .5, out);
        const n = noise(t, .9), f = C.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t);
        f.frequency.exponentialRampToValueAtTime(200, t + .9);
        const g = C.createGain(); g.gain.setValueAtTime(.12, t);
        g.gain.exponentialRampToValueAtTime(.0001, t + .9);
        n.connect(f); f.connect(g); g.connect(out); break;
      }
      case 'extend': for (let i = 0; i < 5; i++) VOICE.bells(72 + i * 4, t + i * .07, .7, .6, out); break;
      case 'spellEnd': for (let i = 0; i < 3; i++) VOICE.epiano(72 + i * 4, t + i * .05, .4, .7, out); break;
    }
  };

  A.resumeCtx = () => { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
})();
