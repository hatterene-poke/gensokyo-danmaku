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

  /* Sound Canvas 的短房间混响：程序生成脉冲响应。
     1.5 秒指数衰减 + 前 12ms 的稀疏早期反射，湿度偏干，
     对应 SC-88Pro / SD-90 内置 GM reverb 的「小而亮」空间感。 */
  function makeIR(c, seconds, decay) {
    const len = Math.max(1, Math.floor(c.sampleRate * seconds));
    const buf = c.createBuffer(2, len, c.sampleRate);
    const early = Math.floor(c.sampleRate * .012);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, decay);
        const sparse = i < early ? (Math.random() < .12 ? 1 : 0) : 1;
        /* 一阶低通滤掉混响尾巴里的高频嘶声，让空间感更温润 */
        lp += ((Math.random() * 2 - 1) - lp) * .38;
        d[i] = lp * env * sparse * (i < early ? .35 : 1);
      }
    }
    return buf;
  }

  /* ---------- 初始化（必须由用户手势触发） ---------- */
  A.init = function () {
    if (A.ready) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('Web Audio 不可用'); return; }
    A.ctx = new AC();
    const c = A.ctx;
    A.master = c.createGain(); A.master.gain.value = .85; A.master.connect(c.destination);
    /* BGM 总线：去掉浑浊低频 + 抬亮 3.2kHz 以上（SC 音源那种明亮、略硬、
       高频带一点数字削波的质感），再并一路短混响。SFX 保持干净不进效果器。 */
    A.music = c.createGain(); A.music.gain.value = A.bgmVol;
    A.musicHP = c.createBiquadFilter();
    A.musicHP.type = 'highpass'; A.musicHP.frequency.value = 55;
    A.musicEQ = c.createBiquadFilter();
    /* 高频只轻抬 0.6dB（原 2.6dB 是刺耳主因），保留 SC 的清晰但不尖锐 */
    A.musicEQ.type = 'highshelf'; A.musicEQ.frequency.value = 3600; A.musicEQ.gain.value = .6;
    A.music.connect(A.musicHP); A.musicHP.connect(A.musicEQ); A.musicEQ.connect(A.master);
    try {
      const cv = c.createConvolver(); cv.buffer = makeIR(c, 1.7, 2.0);
      /* 湿度略增，用混响把相邻音的缝隙填起来 */
      A.revSend = c.createGain(); A.revSend.gain.value = .27;
      A.revOut = c.createGain(); A.revOut.gain.value = .85;
      A.musicEQ.connect(A.revSend); A.revSend.connect(cv);
      cv.connect(A.revOut); A.revOut.connect(A.master);
    } catch (e) { }
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

  /* =========================================================
   * 音色 —— 参考东方原版音源逐行重做
   *
   * 考据依据：
   *  · ZUN 1999–2001 用 Roland SC-88Pro 制作 MIDI 版；2001 年起 WAV 版
   *    改用 Edirol/Roland SD-90。「ZUN 号」不是普通合成铜管，而是 SD-90
   *    的 Romantic Tp（浪漫小号）采样音色：音域高于真小号、尖亮带鼻音。
   *  · 小号的共振峰 F1≈1200–1500Hz、F2≈2000–3000Hz；基音下限约 165Hz，
   *    强奏高次谐波可直达 15kHz —— 所以用 source–filter（锯齿 + 并联带通）
   *    而不是原来那种 900→3100Hz 的「扫频合成铜管」。
   *  · SC-88Pro 的整体味道：清晰明亮但略生硬、谐波规整、高频有数字削波；
   *    合唱（失谐层）与短房间混响是标志；起音 1–2ms 极快。
   *  · 钢琴为采样钢琴（SC-88Pro Piano 1 / 后期 The Grand 3）：琴锤瞬态、
   *    两段衰减、规整泛音列、轻微失谐加宽；绝不是柔和的三角波长音。
   *  · 电钢走 Yamaha DX7 系 FM 的金属感；贝斯有拨弦瞬态；鼓干脆紧实
   *    （LM-4 / Groove Agent 的采样鼓性格）。
   * 谱面（music.js）完全不动，这里只换发声方式。
   * ========================================================= */
  const VOICE = {};

  /* 短噪声瞬态：琴锤击弦 / 小号吹气 / 贝斯拨弦 / 鼓槌 click。
     SC 音源是采样音源，起音那一下的宽带噪声是「像真乐器」的关键。 */
  function transient(t, dur, hp, amp, bus) {
    const n = noise(t, dur, bus);
    const f = A.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp;
    const g = A.ctx.createGain();
    /* 起音瞬态整体收掉四成，避免琴锤/吹气/鼓槌的「嚓」声 */
    g.gain.setValueAtTime(amp * .60, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(bus || A.music);
  }

  /* ---------------------------------------------------------
   * ZUN 号 / Romantic Tp
   * 锯齿 + 方形叠偶数谐波作激励，两层失谐加宽；
   * 并联两路带通（1350 / 2650Hz）塑造小号共振峰，
   * 一路低通保留基音厚度，另叠 f×3 模拟高音区亮度。
   * --------------------------------------------------------- */
  VOICE.brass = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.08, dur);
    const out = bus || A.music;
    const g = gainEnv(t, d + .05, .155 * v, .009, .045, .82, .055, out);
    const src = A.ctx.createGain(); src.gain.value = 1;
    osc('sawtooth', f, t, d + .05).connect(src);
    osc('sawtooth', f, t, d + .05, 6).connect(src);
    const sq = A.ctx.createGain(); sq.gain.value = .26;
    osc('square', f, t, d + .05, -5).connect(sq); sq.connect(src);
    /* 共振峰整体下移、Q 放宽：保留小号的鼻音辨识度，去掉尖刺 */
    const f1 = A.ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 1150; f1.Q.value = .9;
    const f2 = A.ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.frequency.value = 2300; f2.Q.value = 1.0;
    const lo = A.ctx.createBiquadFilter();
    lo.type = 'lowpass'; lo.frequency.value = 4200; lo.Q.value = .7;
    const m1 = A.ctx.createGain(); m1.gain.value = .55;
    const m2 = A.ctx.createGain(); m2.gain.value = .30;
    const m0 = A.ctx.createGain(); m0.gain.value = .76;
    src.connect(f1); f1.connect(m1); m1.connect(g);
    src.connect(f2); f2.connect(m2); m2.connect(g);
    src.connect(lo); lo.connect(m0); m0.connect(g);
    const hb = A.ctx.createGain(); hb.gain.value = .045;
    osc('sine', f * 3, t, d + .05).connect(hb); hb.connect(g);
    transient(t, .020, 1300, .018 * v, out);
  };

  /* ---------------------------------------------------------
   * ZUN 萨克斯（SD-90）：簧片的鼻音来自 ~500/1400/2300Hz 共振峰，
   * 起音比小号更软、带气流噪声，滤波比小号暗。
   * --------------------------------------------------------- */
  VOICE.sax = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.08, dur);
    const out = bus || A.music;
    const g = gainEnv(t, d + .04, .145 * v, .022, .06, .74, .07, out);
    const src = A.ctx.createGain(); src.gain.value = 1;
    osc('sawtooth', f, t, d + .04).connect(src);
    osc('sawtooth', f, t, d + .04, -8).connect(src);
    const r1 = A.ctx.createBiquadFilter();
    r1.type = 'bandpass'; r1.frequency.value = 1400; r1.Q.value = 1.0;
    const r2 = A.ctx.createBiquadFilter();
    r2.type = 'bandpass'; r2.frequency.value = 2300; r2.Q.value = 1.6;
    const lo = A.ctx.createBiquadFilter();
    lo.type = 'lowpass'; lo.frequency.value = 1500; lo.Q.value = .8;
    const a1 = A.ctx.createGain(); a1.gain.value = .48;
    const a2 = A.ctx.createGain(); a2.gain.value = .30;
    const a0 = A.ctx.createGain(); a0.gain.value = .72;
    src.connect(r1); r1.connect(a1); a1.connect(g);
    src.connect(r2); r2.connect(a2); a2.connect(g);
    src.connect(lo); lo.connect(a0); a0.connect(g);
    transient(t, .035, 1200, .022 * v, out);
  };

  /* 风琴：正弦泛音叠加 + 轻微失谐，SC 音源的 organ 偏干净 */
  VOICE.organ = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.1, dur);
    const g = gainEnv(t, d + .08, .12 * v, .012, .06, .82, .11, bus);
    for (const [mul, amp] of [[1, 1], [2, .42], [3, .18], [4, .1]]) {
      const og = A.ctx.createGain(); og.gain.value = amp;
      osc('sine', f * mul, t, d + .08).connect(og); og.connect(g);
    }
    const og2 = A.ctx.createGain(); og2.gain.value = .18;
    osc('sine', f, t, d + .08, 6).connect(og2); og2.connect(g);
  };

  /* ---------------------------------------------------------
   * 电钢：DX7 系 FM。载波正弦 + 2.01 倍调制，调制指数从 f×1.7
   * 快速衰到 1，得到那种「金属感 + 空灵感」；再叠一层二倍频与
   * 微量失谐，呼应 SC 音源的合唱宽度。
   * --------------------------------------------------------- */
  VOICE.epiano = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.08, Math.min(dur, .7));
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.088 * v, t + .002);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    g.connect(bus || A.music);
    const car = osc('sine', f, t, d + .02);
    const mod = osc('sine', f * 2.01, t, d + .02);
    const mg = A.ctx.createGain();
    mg.gain.setValueAtTime(f * 1.7, t);
    mg.gain.exponentialRampToValueAtTime(1, t + d * .6);
    mod.connect(mg); mg.connect(car.frequency);
    car.connect(g);
    const sh = A.ctx.createGain(); sh.gain.value = .20;
    osc('sine', f * 2, t, d + .02, 4).connect(sh); sh.connect(g);
  };

  /* ---------------------------------------------------------
   * 采样钢琴（主奏 pianoLead 与伴奏 piano 共用发声核）
   *  · 锯齿经低通（比三角波泛音丰富），两层 ±5cent 失谐加宽
   *  · 2/3/4/5 倍规整谐波层，振幅递减，高频略削（SC 的数字味）
   *  · 极快 2ms 起音 + 两段衰减（先快后慢），不是单一指数
   *  · 9ms 高通噪声作琴锤击弦瞬态
   *  · 高通 105Hz 去掉低频浑浊，保留清晰度
   * --------------------------------------------------------- */
  function pianoVoice(m, t, dur, v, bus, opt) {
    const f = m2f(m);
    const d = Math.max(opt.min, Math.min(dur, opt.max));
    const out = bus || A.music;
    const g = A.ctx.createGain();
    /* 衔接修正：6ms 软起音 → 线性缓降 → 保留延音 → 末段线性淡出。
       原来用 exponentialRamp 直接摔到 .0001，音尾会硬切，下一音接不上。 */
    const t1 = Math.min(.11, d * .32);
    const tail = d * .84;
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(opt.peak * v, t + .006);
    g.gain.linearRampToValueAtTime(opt.peak * v * .45, t + t1);
    g.gain.linearRampToValueAtTime(opt.peak * v * .28, t + tail);
    g.gain.linearRampToValueAtTime(.0001, t + d);
    g.connect(out);
    const hp = A.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 80;
    hp.connect(g);
    const lp = A.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = opt.bright; lp.Q.value = .5;
    lp.connect(hp);
    const saw1 = A.ctx.createGain(); saw1.gain.value = .56;
    osc('sawtooth', f, t, d + .01).connect(saw1); saw1.connect(lp);
    const saw2 = A.ctx.createGain(); saw2.gain.value = .20;
    osc('sawtooth', f, t, d + .01, 5).connect(saw2); saw2.connect(lp);
    /* 高次泛音收掉一半，锯齿轮廓变圆润 */
    for (const [mul, amp] of [[2, .26], [3, .11], [4, .04], [5, .015]]) {
      const og = A.ctx.createGain(); og.gain.value = amp;
      osc('sine', f * mul, t, d + .01).connect(og); og.connect(hp);
    }
    transient(t, .010, 1900, .014 * v, out);
  }
  /* 伴奏琶音：短、轻、更暗，给主奏让出中高频 */
  VOICE.piano = (m, t, dur, v, bus) =>
    pianoVoice(m, t, dur, v, bus, { peak: .070, min: .055, max: .55, bright: 2400 });
  /* 主奏钢琴：低通收窄、峰值略降；max 放宽到 1.15s，
     慢曲里的长音不再在 0.68s 被截断，才能连到下一个主音。 */
  VOICE.pianoLead = (m, t, dur, v, bus) =>
    pianoVoice(m, t, dur, v, bus, { peak: .125, min: .10, max: 1.15, bright: 2900 });

  /* 钟 / 铃：非整数倍泛音（2.76 / 5.4 / 8.9）是管钟的特征 */
  VOICE.bells = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.12, Math.min(dur, 1.2));
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.092 * v, t + .002);
    g.gain.exponentialRampToValueAtTime(.0001, t + d);
    g.connect(bus || A.music);
    /* 最高那层非谐波泛音收窄，铃音不刺耳但仍清亮 */
    for (const [mul, amp] of [[1, 1], [2.76, .30], [5.4, .09], [8.9, .025]]) {
      const og = A.ctx.createGain(); og.gain.value = amp;
      osc('sine', f * mul, t, d + .01).connect(og); og.connect(g);
    }
  };

  /* 电贝斯：锯齿 + 低八度正弦，低通放宽一点，加拨弦瞬态 */
  VOICE.bass = (m, t, dur, v, bus) => {
    const f = m2f(m), d = Math.max(.08, Math.min(dur, .45));
    const flt = A.ctx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = 760; flt.Q.value = 1.1;
    const g = gainEnv(t, d, .165 * v, .003, .055, .52, .05, bus);
    flt.connect(g);
    osc('sawtooth', f, t, d).connect(flt);
    osc('sine', f / 2, t, d).connect(flt);
    transient(t, .007, 1400, .018 * v, bus || A.music);
  };

  /* 风琴式长音垫（备用音色） */
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

  /* ---------------------------------------------------------
   * 弦乐 ensemble：两把 ±7cent 失谐锯齿 + 低通，0.23Hz 的慢速
   * LFO 让截止频率轻轻呼吸，接近 SC-8850 的 stereo strings。
   * --------------------------------------------------------- */
  VOICE.strings = (midis, t, dur, v, bus) => {
    const flt = A.ctx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = 2400; flt.Q.value = .8;
    try {
      const lfo = A.ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = .23;
      const lg = A.ctx.createGain(); lg.gain.value = 380;
      lfo.connect(lg); lg.connect(flt.frequency);
      lfo.start(t); lfo.stop(t + dur + .02);
    } catch (e) { }
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(.034 * v, t + .20);
    g.gain.setValueAtTime(.034 * v, t + dur * .72);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    flt.connect(g); g.connect(bus || A.music);
    for (const m of midis) {
      for (const det of [-7, 7]) {
        const og = A.ctx.createGain(); og.gain.value = .26;
        osc('sawtooth', m2f(m - 12), t, dur + .02, det).connect(og); og.connect(flt);
      }
      const body = A.ctx.createGain(); body.gain.value = .10;
      osc('sine', m2f(m - 24), t, dur + .02).connect(body); body.connect(g);
    }
  };

  /* ---------- 鼓组：LM-4 / Groove Agent 式干脆紧实的采样鼓性格 ---------- */
  const DRUM = {
    kick(t, v = 1, bus) {
      const out = bus || A.music;
      const o = A.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(155, t);
      o.frequency.exponentialRampToValueAtTime(46, t + .085);
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(.34 * v, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + .19);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + .20);
      transient(t, .006, 2200, .030 * v, out);
    },
    snare(t, v = 1, bus) {
      const out = bus || A.music;
      const n = noise(t, .14, out), f = A.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1750; f.Q.value = .6;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(.15 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .13);
      n.connect(f); f.connect(g); g.connect(out);
      const o = osc('sine', 185, t, .09);
      const og = A.ctx.createGain(); og.gain.setValueAtTime(.07 * v, t);
      og.gain.exponentialRampToValueAtTime(.0001, t + .085);
      o.connect(og); og.connect(out);
    },
    hat(t, v = 1, open = false, bus) {
      /* 高通从 8200 降到 6600、音量收两成，去掉「嘶」的齿音 */
      const dur = open ? .15 : .045;
      const n = noise(t, dur + .01, bus), f = A.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 6600;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(.046 * v, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      n.connect(f); f.connect(g); g.connect(bus || A.music);
    },
    tom(t, v = 1, bus) {
      const o = A.ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(230, t);
      o.frequency.exponentialRampToValueAtTime(95, t + .13);
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(.14 * v, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + .16);
      o.connect(g); g.connect(bus || A.music); o.start(t); o.stop(t + .17);
    }
  };
  /* =========================================================
   * 音序器：按 music.js 的段落级 voicing 分层编曲
   * 五首曲子主旋律一律由 VOICE.pianoLead（钢琴）担任，
   * 其余乐器作伴奏；段落展开约三分钟，不再是二十秒短循环。
   * ========================================================= */
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

  /* 八档配器，逐档手写。
   *   pad    弦乐铺底厚度      brass  铜管副旋律（只在高潮加入）
   *   bells  高八度铃点缀      oct    高八度钢琴回声
   *   arp    伴奏钢琴琶音      drums  鼓型（ballad / drive / battle / none）
   *   ep     电钢和弦切分      bass   贝斯根音
   * 参考东方钢琴改编曲的分层：钢琴唱旋律、弦乐铺底、电钢切分、
   * 十六分琶音流动、贝斯与短促鼓点推进，ZUN 号只在高潮轻轻压上一层。 */
  const ARR = {
    piano:    { pad: .55, brass: 0, bells: 0,  oct: 0, arp: 'soft',  drums: 'ballad', ep: .75, bass: .85 },
    'piano+': { pad: .55, brass: 0, bells: 0,  oct: 0, arp: 'fast',  drums: 'drive',  ep: .90, bass: .90 },
    strings:  { pad: 1,   brass: 0, bells: .8, oct: 0, arp: 'soft',  drums: 'ballad', ep: .80, bass: .70 },
    solo:     { pad: .30, brass: 0, bells: 1,  oct: 1, arp: 'fast',  drums: 'none',   ep: .50, bass: .50 },
    brass:    { pad: .70, brass: 1, bells: 0,  oct: 0, arp: 'fast',  drums: 'battle', ep: 1,   bass: 1 },
    full:     { pad: 1,   brass: 1, bells: 1,  oct: 1, arp: 'fast',  drums: 'battle', ep: 1,   bass: 1 },
    break:    { pad: 1,   brass: 0, bells: 0,  oct: 0, arp: 'none',  drums: 'none',   ep: 0,   bass: 0 },
    cadence:  { pad: 1,   brass: 1, bells: 1,  oct: 1, arp: 'soft',  drums: 'battle', ep: 1,   bass: 1 }
  };

  /* 一个 16 分音符步：把当前段落的配器一层层铺开 */
  function scheduleStep(tr, pos, t, sd) {
    const { s, local } = locate(tr, pos);
    const meter = s.meter || tr.meter || 16;
    const step = local % meter;
    const bar = Math.floor(local / meter);
    const ch = s.chords[bar % s.chords.length];
    const a = ARR[s.voicing] || ARR.piano;
    const V = VOICE, D = DRUM, beat = meter / 4;
    const out = A.music;

    /* 主旋律：钢琴主奏；高潮段叠铜管副旋律、铃与高八度回声 */
    for (const e of s.ev) {
      if (e.at === local && e.m) {
        /* 音符实际发声略长于谱面时值（1.06 倍），让相邻主音轻微搭接；
         原来 0.92 倍会留出 8% 的空隙，是「过渡断开」的主因。 */
      const dur = Math.max(.09, e.dur * sd * 1.06);
        V.pianoLead(e.m, t, dur, 1, out);
        if (a.oct) V.pianoLead(e.m + 12, t, dur * .70, .32, out);
        if (a.brass) V.brass(e.m, t, dur * .80, .26, out);
        if (a.bells) V.bells(e.m + 12, t, Math.max(.09, dur * 1.2), .22 * a.bells, out);
      }
    }

    /* 两拍完全停顿：整段只剩一层极轻的弦乐长音，
       鼓、贝斯、琶音全部静止；末尾两记重拍把曲子接回下一乐段。 */
    if (s.voicing === 'break') {
      if (step === 0) V.strings(ch, t, sd * meter * 1.6, .55, out);
      if (local >= s.steps - 2) { D.snare(t, .55); D.tom(t, .35); }
      return;
    }

    /* 电钢和弦切分（伴奏） */
    if (a.ep > 0 && (step === 0 || step === Math.round(meter * .375) || step === Math.round(meter * .625))) {
      const vel = (step === 0 ? .85 : .55) * a.ep;
      for (const m of ch) V.epiano(m + 12, t, sd * (step === 0 ? 3.2 : 1.7), vel, out);
    }
    /* 弦乐铺底：每小节头一层长音 */
    if (step === 0 && a.pad > 0) V.strings(ch, t, sd * meter, .8 * a.pad, out);
    /* 贝斯：每拍根音，小节中点升五度 */
    if (a.bass > 0 && step % beat === 0)
      V.bass(ch[0] - 12 + (step === meter / 2 ? 7 : 0), t, sd * 3.0, .9 * a.bass, out);
    /* 伴奏钢琴琶音：高速十六分 / 慢速八分 */
    if (a.arp === 'fast') {
      const seq = [0, 1, 2, 1, 2, 1, 0, 2, 1, 2, 1, 0, 2, 1, 2, 1];
      const idx = seq[step % 16] % ch.length;
      const oct = step >= meter / 2 ? 24 : 12;
      V.piano(ch[idx] + oct, t, sd * .85, step % 2 === 0 ? .72 : .5, out);
    } else if (a.arp === 'soft' && step % 2 === 0) {
      const idx = (step / 2) % ch.length;
      V.piano(ch[idx] + 12, t, sd * 1.7, .5, out);
    }
    /* 鼓组：ballad / drive / battle，12 步（6/8）与 16 步（4/4）自动换算 */
    if (a.drums === 'ballad') {
      if (step === 0 || step === meter / 2) D.kick(t, .7);
      if (step === beat || step === beat * 3) D.snare(t, .38);
      if (step % 2 === 0) D.hat(t, .45);
    } else if (a.drums === 'drive') {
      if (step % beat === 0) D.kick(t, step === 0 ? 1 : .82);
      if (step === beat || step === beat * 3) D.snare(t, .9);
      if (step % 2 === 0) D.hat(t, step % beat === 2 ? .8 : .55);
      if (step === meter - 2 && bar % 2 === 1) D.snare(t, .4);
    } else if (a.drums === 'battle') {
      const kicks = meter === 12 ? [0, 3, 6, 9] : [0, 3, 6, 8, 11, 14];
      if (kicks.includes(step)) D.kick(t, step % 3 === 0 ? 1 : .6);
      if (step === Math.round(beat) || step === Math.round(beat * 3)) D.snare(t, 1);
      D.hat(t, step % 2 === 0 ? .8 : .5, step === meter - 2);
      if (step === meter - 1 && bar % 2 === 1) D.tom(t, .6);
    }
    /* 段落末尾的两拍 fill */
    if (s.fill && local >= s.steps - 4 && local < s.steps) { D.snare(t, .5); D.tom(t, .3); }
    /* 终止段最后一小节：钢琴奏出同主音大三和弦（皮卡迪三度）收束 */
    if (s.voicing === 'cadence' && local === s.steps - meter) {
      const root = ch[0] + 12;
      for (const m of [root, root + 4, root + 7, root + 12])
        V.pianoLead(m, t, sd * meter * 1.4, .5, out);
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
    // 依符卡序号转调 / 变奏：五张固定符卡的插入句各不相同
    const shift = [0, 2, -2, 5, -4][spellIdx % 5];
    const rate = [1, .92, 1.08, .85, 1.15][spellIdx % 5];
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
