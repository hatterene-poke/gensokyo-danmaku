/* ===========================================================
 * music.js — 原创曲谱（全曲独立写作，未取用任何原作旋律 / 音频）
 *
 * 【本次重做】五首 BGM 全部改编为「钢琴主奏 + 其他乐器伴奏」，
 *   并把原来约 20 秒的短循环，改成约三分钟一次性展开的完整曲式：
 *     呈示 → 反复 → 承接 → 模进 → 倒影卡农 → 转调 → 高潮 →
 *     两拍完全停顿 → 再现 → 全奏 → 皮卡迪三度终止
 *   每个段落都是手写的 8 小节乐句（break 段为 2 小节全休止），
 *   段落之间用移调 / 倒影 / 逆行 / 高八度做变奏，三分钟内不复现同一乐句。
 *   段落级 `voicing` 交给 audio.js 决定配器层次（钢琴/弦乐/铜管/铃/鼓）。
 *
 * 作曲依据（考据自东方 Project 音乐特征）：
 *  1. 和洋折衷：旋律以「带变宫的六声羽调式」为骨架（D羽 / A羽 / C羽 / E羽）。
 *  2. 东方钢琴改编曲的常见语气：钢琴担任主奏，配高速 16 分分解和弦、
 *     电钢和弦切分、贝斯根音、弦乐铺底与短促鼓点；ZUN 号只在
 *     高潮段作为副旋律短暂加入（《亡き王女》《Border of Life》式写法）。
 *  3. 功能性三和弦为主，靠模进 / 转调 / 半音中音关系制造色彩。
 *  4. 动机高度重复并作变奏 / 倒影 / 移位；高潮前安排「两拍完全停顿」。
 *  5. 4/4 拍、BPM 94～178；二面 Boss 保留 12 步一小节的 6/8 复合拍。
 *  6. 终曲以皮卡迪三度（小调收在同主音大三和弦）收束。
 * =========================================================== */
(function () {
  const MUS = window.G.MUSIC = { tracks: {}, jingles: {}, order: [] };

  /* ---------- 音名 → MIDI ---------- */
  const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function n2m(s) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
    if (!m) throw new Error('bad note: ' + s);
    let v = STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return (parseInt(m[3]) + 1) * 12 + v;
  }
  MUS.n2m = n2m;
  MUS.m2f = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- 旋律记谱："A4:2 C5:1 -:3" 冒号后为 16 分音符步数 ---------- */
  function M(str) {
    return str.trim().split(/\s+/).map(tok => {
      const [n, d] = tok.split(':');
      return { m: n === '-' ? 0 : n2m(n), d: parseInt(d, 10) || 1 };
    });
  }
  const cat = (...a) => [].concat(...a);
  const trans = (ev, s) => ev.map(e => ({ m: e.m ? e.m + s : 0, d: e.d }));
  const inv = (ev, axis) => ev.map(e => ({ m: e.m ? axis * 2 - e.m : 0, d: e.d }));
  const retro = ev => ev.slice().reverse().map(e => ({ ...e }));
  const stretch = (ev, k) => ev.map(e => ({ m: e.m, d: Math.max(1, Math.round(e.d * k)) }));

  /* ---------- 和弦 ---------- */
  const QUAL = { m: [0, 3, 7], M: [0, 4, 7], dim: [0, 3, 6], sus: [0, 5, 7],
    M7: [0, 4, 7, 11], aug: [0, 4, 8], quart: [0, 5, 10] };
  function chord(root, q) {
    const r = typeof root === 'string' ? n2m(root) : root;
    return (QUAL[q] || QUAL.m).map(i => r + i);
  }
  const transChords = (cs, s) => cs.map(c => [typeof c[0] === 'string' ? n2m(c[0]) + s : c[0] + s, c[1]]);

  /* ---------- 段落编译：补齐 / 截断到 bars*meter 步 ----------
   * meter：每小节 16 分步数，默认 16（4/4）；二面 Boss 用 12（6/8）。
   * voicing：段落级配器档位，由 audio.js 的编曲表解释。 */
  function sect(o) {
    const meter = o.meter || 16;
    const steps = o.bars * meter;
    let ev = []; let at = 0;
    for (const e of o.lead) {
      if (at >= steps) break;
      const d = Math.min(e.d, steps - at);
      ev.push({ at, m: e.m, dur: d }); at += d;
    }
    if (at < steps) ev.push({ at, m: 0, dur: steps - at });
    const chords = o.chords.map(c => chord(c[0], c[1]));
    return { steps, ev, chords, bars: o.bars, meter,
      fill: !!o.fill, voicing: o.voicing || 'piano', label: o.label || '' };
  }
  /* 8 小节段落：每一句都显式写在调用处，不做任何自动排布 */
  const P8 = (m, label, voicing, chords, p1, p2, p3, p4, p5, p6, p7, p8) =>
    sect({ bars: 8, meter: m, label, voicing, chords,
      lead: cat(p1, p2, p3, p4, p5, p6, p7, p8) });

  /* =======================================================
   * 1. 标题曲《結界の朝、札の匂い》 D羽 / BPM104 / 4/4
   *    11 段（10×8 小节 + 2 小节骤停）≈ 189 秒
   *    钢琴独奏开场，弦乐承接，倒影卡农，转调后铜管进高潮，
   *    两拍完全停顿，高八度再现，终以 D 大三和弦（皮卡迪三度）收束。
   * ======================================================= */
  (function () {
    const m = 16;
    const A = M("A4:2 D5:2 F5:2 E5:2 D5:4 C5:2 A4:2");
    const B = M("F5:2 G5:2 A5:4 G5:2 F5:2 E5:2 D5:2");
    const C = M("D5:2 F5:2 A5:4 -:4 C5:2 A4:2");
    const D = M("G5:2 F5:2 E5:2 D5:2 C5:4 D5:2 F5:2");
    const A5 = trans(A, 5), Am = trans(A, -2), A12 = trans(A, 12), A2 = trans(A, 2);
    const B3 = trans(B, 3), Bm = trans(B, -2);
    const C5 = trans(C, 5), Cm = trans(C, -2);
    const D5 = trans(D, 5), Dm = trans(D, -2);
    const Ai = inv(A, 76), Bi = inv(B, 76);
    const Ar = retro(A), Br = retro(B), Cr = retro(C), Dr = retro(D);
    const RST = M("-:16");
    const ch1 = [['D3', 'm'], ['Bb2', 'M'], ['F3', 'M'], ['C3', 'M']];
    const ch2 = [['D3', 'm'], ['F3', 'M'], ['C3', 'M'], ['G2', 'M']];
    const t1 = transChords(ch1, 5), t2 = transChords(ch2, 5);
    const sections = [
      P8(m, 'Ⅰ 呈示·结界之晨', 'piano', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅰ′ 呈示·反复', 'piano+', cat(ch2, ch1), A, B, A5, Bi, C, D, Am, A),
      P8(m, 'Ⅱ 承接·弦乐铺底', 'strings', cat(ch1, ch2), Ai, B3, C, D, A, Br, Cm, A),
      P8(m, 'Ⅱ′ 模进·上行五度', 'piano+', cat(t1, t2), A5, B, A5, C5, A2, B3, C5, D5),
      P8(m, 'Ⅲ 倒影卡农', 'solo', cat(ch1, ch2), Ai, Bi, Cr, Dr, A, B, C, D),
      P8(m, 'Ⅲ′ 转调·下属方向', 'brass', cat(t1, t2), A5, B3, A5, Bi, C5, D5, A2, A),
      P8(m, 'Ⅳ 高潮·全奏', 'full', cat(ch1, t2), A12, B, A12, C, A5, Bi, C5, D5),
      sect({ bars: 2, meter: m, label: 'Ⅳ′ 两拍完全停顿', voicing: 'break',
        chords: ch1, lead: cat(RST, RST), fill: true }),
      P8(m, 'Ⅴ 再现·高八度', 'piano+', cat(ch1, ch2), A12, B, A, C, Am, Br, C5, Dm),
      P8(m, 'Ⅴ′ 全奏再现', 'full', cat(t1, t2), A5, B3, A12, C5, A2, Bi, C, D5),
      P8(m, 'Ⅵ 终止·皮卡迪三度', 'cadence', cat(ch1, ch2), A, B, Ar, C, Dm, Am, D5, A12)
    ];
    MUS.tracks.title = {
      id: 'title', title: '結界の朝、札の匂い', jp: 'けっかいのあさ、ふだのにおい',
      desc: '主题曲（钢琴版）。D羽调式，钢琴主奏晨雾般舒缓的旋律，弦乐铺底、电钢切分与轻鼓伴奏；中段作倒影卡农与上行五度转调，高潮时铜管短暂加入，两拍完全停顿后高八度再现，终以 D 大三和弦收束。BPM 104，约三分钟一次性展开。',
      descJa: '主題曲（ピアノ版）。D羽調式、ピアノが朝霧のような旋律を奏で、弦・エレピ・軽いドラムが支える。中段は反行カノンと五度上行の転調、高潮ではブラスが短く加わり、二拍の完全停止ののち高オクターヴで再現、D長三和音で締める。BPM 104、約三分の一度きりの展開。',
      bpm: 104, key: 'D羽', lead: 'piano', meter: 16, intensity: .42,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* =======================================================
   * 2. 道中曲《褪せし札の道》 A羽 / BPM158 / 4/4
   *    16 段（15×8 + 2 小节骤停）≈ 184 秒
   *    钢琴 16 分分解和弦驱动，i–VII–VI–V 下行循环，
   *    两段 drive 鼓组之间插入钢琴华彩与铜管副旋律。
   * ======================================================= */
  (function () {
    const m = 16;
    const A = M("A4:1 C5:1 D5:2 E5:1 D5:1 C5:2 A4:2 G4:2 A4:2 C5:2");
    const B = M("E5:2 G5:2 A5:2 G5:2 E5:2 D5:2 C5:2 D5:2");
    const C = M("C5:1 D5:1 E5:1 G5:1 A5:2 G5:2 E5:4 D5:2 C5:2");
    const D = M("A5:2 G5:1 E5:1 D5:2 C5:2 E5:2 G5:2 A5:4");
    const A3 = trans(A, 3), A5 = trans(A, 5), Am = trans(A, -2), A12 = trans(A, 12);
    const B3 = trans(B, 3), Bm = trans(B, -2);
    const C3 = trans(C, 3), C5 = trans(C, 5);
    const D5 = trans(D, 5), Dm = trans(D, -2);
    const Ai = inv(A, 76), Bi = inv(B, 76);
    const Ar = retro(A), Br = retro(B), Cr = retro(C), Dr = retro(D);
    const RST = M("-:16");
    const ch1 = [['A3', 'm'], ['G3', 'M'], ['F3', 'M'], ['E3', 'M']];
    const ch2 = [['A3', 'm'], ['F3', 'M'], ['C4', 'M'], ['G3', 'M']];
    const t1 = transChords(ch1, 5), t2 = transChords(ch2, 5);
    const sections = [
      P8(m, 'Ⅰ 呈示·启程', 'piano', cat(ch1, ch2), A, B, A, C, A3, Bi, C, D),
      P8(m, 'Ⅰ′ 呈示·十六分驱动', 'piano+', cat(ch2, ch1), A, A, B, C, A3, B, C, D),
      P8(m, 'Ⅰ″ 反复·加厚', 'piano+', cat(ch1, ch2), A, B, A3, C3, A, Bi, C, D5),
      P8(m, 'Ⅱ 承接·弦乐', 'strings', cat(ch1, ch2), Ai, B3, C, D, A, Br, C5, A),
      P8(m, 'Ⅱ′ 模进·三度上行', 'piano+', cat(t1, t2), A3, B3, A3, C3, A5, B, C3, D),
      P8(m, 'Ⅲ 钢琴华彩', 'solo', cat(ch2, ch1), Ar, Br, Cr, Dr, A, B, C, D),
      P8(m, 'Ⅲ′ 铜管副旋律', 'brass', cat(t1, t2), A5, B3, A5, C5, A3, Bi, C5, D5),
      P8(m, 'Ⅲ″ 回归·drive', 'piano+', cat(ch1, ch2), A, B, A3, C, Am, Br, C3, Dm),
      P8(m, 'Ⅳ 第一高潮', 'full', cat(ch1, t2), A12, B, A12, C, A5, Bi, C5, D5),
      sect({ bars: 2, meter: m, label: 'Ⅳ′ 两拍完全停顿', voicing: 'break',
        chords: ch1, lead: cat(RST, RST), fill: true }),
      P8(m, 'Ⅴ 再现·主题', 'piano+', cat(ch1, ch2), A, B, A, C, A3, B3, C, D),
      P8(m, 'Ⅴ′ 转调·七度', 'brass', cat(t1, t2), A5, B, A5, C5, A12, B3, C5, D5),
      P8(m, 'Ⅴ″ 倒影华彩', 'solo', cat(ch2, ch1), Ai, Bi, Cr, Dr, Am, Bm, C3, Dm),
      P8(m, 'Ⅵ 第二高潮·全奏', 'full', cat(ch1, t2), A12, B3, A12, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅵ′ 收束·渐密', 'piano+', cat(ch2, ch1), A, A3, B, B3, C, C3, D, D5),
      P8(m, 'Ⅶ 终止·皮卡迪三度', 'cadence', cat(ch1, ch2), A, B, Ar, C, Dm, Am, D5, A12)
    ];
    MUS.tracks.stage = {
      id: 'stage', title: '褪せし札の道', jp: 'あせしふだのみち',
      desc: '道中曲（钢琴版）。A羽调式的 i–VII–VI–V 下行与 i–VI–III–VII 循环交替，钢琴主奏配十六分分解和弦，四拍底鼓驱赶节奏；中段插入钢琴华彩、倒影卡农与转调，铜管副旋律只在两处高潮加入，两拍骤停后收束于 A 大三和弦。BPM 158，约三分钟一次性展开。',
      descJa: '道中曲（ピアノ版）。A羽調式の i–VII–VI–V 下行と i–VI–III–VII 循環が交替し、ピアノ主奏に十六分アルペジオと四拍のキックが走る。中段にピアノ・カデンツァ、反行カノン、転調を挟み、ブラスは二度の高潮のみ。二拍の急停止ののち A長三和音で締める。BPM 158、約三分。',
      bpm: 158, key: 'A羽', lead: 'piano', meter: 16, intensity: .72,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* =======================================================
   * 3. 一面 Boss 綴屋千代《墨の呼吸》 D都节 / BPM94 / 4/4
   *    10 段（9×8 + 2 小节骤停）≈ 187 秒
   *    最慢、留白最多：钢琴长句 + 弦乐与铃的幽玄铺底，
   *    中段以逆行与模进展开，高潮才让铜管与战鼓进入。
   * ======================================================= */
  (function () {
    const m = 16;
    const A = M("D5:3 -:1 Eb5:2 G5:2 -:4 A5:2 G5:2");
    const B = M("A5:4 -:2 Bb5:2 A5:2 G5:2 Eb5:2 D5:2");
    const C = M("G5:2 A5:2 Bb5:4 -:4 A5:2 G5:2");
    const D = M("D5:2 Eb5:2 G5:2 A5:2 Bb5:2 A5:2 G5:4");
    const Am = trans(A, -2), A3 = trans(A, 3), A12 = trans(A, 12);
    const Bm = trans(B, -2), B3 = trans(B, 3);
    const C3 = trans(C, 3), Cm = trans(C, -2);
    const Dm = trans(D, -2), D5 = trans(D, 5);
    const Ai = inv(A, 79), Bi = inv(B, 79);
    const Ar = retro(A), Br = retro(B), Cr = retro(C), Dr = retro(D);
    const RST = M("-:16");
    const ch1 = [['D3', 'sus'], ['G2', 'sus'], ['A2', 'sus'], ['D3', 'sus']];
    const ch2 = [['D3', 'sus'], ['Bb2', 'M'], ['G2', 'sus'], ['A2', 'm']];
    const t1 = transChords(ch1, 3), t2 = transChords(ch2, 3);
    const sections = [
      P8(m, 'Ⅰ 呈示·墨之呼吸', 'piano', cat(ch1, ch2), A, B, C, D, A, B, C, D),
      P8(m, 'Ⅰ′ 弦乐与铃', 'strings', cat(ch2, ch1), Ai, B, C, D, A, Br, C3, D),
      P8(m, 'Ⅱ 主题反复·留白', 'piano', cat(ch1, ch2), A, B, Am, C, A3, Bm, Cm, D),
      P8(m, 'Ⅱ′ 钢琴独奏·逆行', 'solo', cat(ch2, ch1), Ar, Br, Cr, Dr, A, B, C, D),
      P8(m, 'Ⅲ 模进·上行三度', 'piano+', cat(t1, t2), A3, B3, A3, C3, A, Bi, C3, D5),
      P8(m, 'Ⅲ′ 倒影·幽玄', 'strings', cat(ch1, ch2), Ai, Bi, Cr, Dr, Am, Bm, Cm, Dm),
      sect({ bars: 2, meter: m, label: 'Ⅳ 两拍完全停顿', voicing: 'break',
        chords: ch1, lead: cat(RST, RST), fill: true }),
      P8(m, 'Ⅳ′ 再现·高八度', 'piano+', cat(ch1, ch2), A12, B, A, C, Am, Br, C3, Dm),
      P8(m, 'Ⅴ 高潮·铜管与太鼓', 'full', cat(t1, t2), A3, B3, A12, C3, A, Bi, C3, D5),
      P8(m, 'Ⅵ 终止·皮卡迪三度', 'cadence', cat(ch1, ch2), A, B, Ar, C, Dm, Am, Dm, A12)
    ];
    MUS.tracks.boss1 = {
      id: 'boss1', title: '墨の呼吸 ~ Breath of the Ink', jp: 'すみのいき',
      descJa: '綴屋千代のテーマ（ピアノ版）。D都節音階による幽玄な和風旋律、BPM 94 の息の長いフレーズと大きな余白。ピアノ主奏に弦とベルの薄い帳を重ね、エレピ・ベース・控えめなドラムが支える。四五度積み重ねを軸に大小三和弦を混ぜ、中段は逆行と模進で展開、二拍の完全停止を経て銅管と太鼓が一度だけ高潮を作り、D長三和音で締める。約三分の一度きりの展開。',
      desc: '綴屋千代主题（钢琴版）。旋律取自 D 都节音阶（阴旋法），BPM 94 的长句与大量留白，像墨迹在纸上慢慢洇开；钢琴主奏，薄叠弦乐与铃音，配电钢、贝斯与轻鼓。和声以四五度叠置为主、混入大小三和弦，中段用逆行与模进展开；两拍完全停顿后，铜管与太鼓只做一次高潮，终以 D 大三和弦收束。约三分钟一次性展开。',
      bpm: 94, key: 'D都节', lead: 'piano', meter: 16, intensity: .5,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* =======================================================
   * 4. 二面 Boss 鏡井仄《鏡面のカノン》 E利底亚 / BPM166 / 6/8（12 步）
   *    21 段（20×8 + 2 小节骤停）≈ 175 秒
   *    最短的段落换来最多的曲式变化：A 与严格倒影 A′ 构成卡农，
   *    高八度钢琴断奏作「镜面回声」，21 段几乎不作原样重复。
   * ======================================================= */
  (function () {
    const m = 12;
    const A = M("E5:1 F#5:1 G#5:1 B5:2 A#5:1 G#5:2 F#5:2 E5:2");
    const B = M("B5:2 A#5:1 G#5:1 F#5:2 E5:2 -:2 F#5:2");
    const C = M("C#6:1 B5:1 A#5:1 G#5:2 F#5:2 E5:2 F#5:1 G#5:2");
    const D = M("E5:2 G#5:2 B5:2 -:2 A#5:2 G#5:2");
    const A2 = trans(A, 2), Am = trans(A, -2), A12 = trans(A, 12);
    const B2 = trans(B, 2), Bm = trans(B, -2);
    const C2 = trans(C, 2), Cm = trans(C, -2);
    const D2 = trans(D, 2), Dm = trans(D, -2);
    const Ai = inv(A, 76), Bi = inv(B, 76), Ci = inv(C, 76), Di = inv(D, 76);
    const Ar = retro(A), Br = retro(B), Cr = retro(C), Dr = retro(D);
    const RST = M("-:12");
    const ch1 = [['E3', 'aug'], ['F#3', 'm'], ['C3', 'aug'], ['G#2', 'm']];
    const ch2 = transChords(ch1, 2);
    const t1 = transChords(ch1, 5), t2 = transChords(ch2, 5);
    const sections = [
      P8(m, 'Ⅰ 呈示·主题 A', 'piano', cat(ch1, ch2), A, Ai, B, Bi, A, Ai, B, Bi),
      P8(m, 'Ⅰ′ 卡农·倒影先行', 'piano+', cat(ch2, ch1), Ai, A, Bi, B, Ai, A, Bi, B),
      P8(m, 'Ⅱ 镜面回声·钢琴断奏', 'solo', cat(ch1, ch2), A12, Ai, B, Bi, C, Ci, D, Di),
      P8(m, 'Ⅱ′ 展开·二度移位', 'piano+', cat(t1, t2), A2, B2, A2, C2, A, Bi, C, D2),
      P8(m, 'Ⅲ 弦乐·冷冽铺底', 'strings', cat(ch2, ch1), Ai, Bi, Cr, Dr, A, B, C, D),
      P8(m, 'Ⅲ′ 卡农·逆行', 'piano+', cat(ch1, ch2), Ar, Br, Cr, Dr, Ai, Bi, Ci, Di),
      P8(m, 'Ⅳ 铜管·镜面齐奏', 'brass', cat(t1, t2), A2, B2, A12, C2, A, Bi, C2, D2),
      P8(m, 'Ⅳ′ 钢琴华彩·高八度', 'solo', cat(ch1, ch2), A12, Ai, B, Bi, Am, Bm, Cm, Dm),
      P8(m, 'Ⅴ 回归·drive', 'piano+', cat(ch2, ch1), A, B, A2, C, A2, Bi, C2, D),
      P8(m, 'Ⅴ′ 第一高潮', 'full', cat(ch1, t2), A12, B2, A12, C2, A2, Bi, C2, D2),
      sect({ bars: 2, meter: m, label: 'Ⅵ 两拍完全停顿', voicing: 'break',
        chords: ch1, lead: cat(RST, RST), fill: true }),
      P8(m, 'Ⅵ′ 再现·主题', 'piano', cat(ch1, ch2), A, Ai, B, Bi, A, Ai, B, Bi),
      P8(m, 'Ⅶ 模进·连续二度', 'piano+', cat(t1, t2), A2, B, A2, C, Am, Bm, Cm, Dm),
      P8(m, 'Ⅶ′ 倒影卡农·再', 'solo', cat(ch2, ch1), Ai, Bi, Ci, Di, Ar, Br, Cr, Dr),
      P8(m, 'Ⅷ 转调·五度', 'brass', cat(t1, t2), A2, B2, A12, C2, A, Bi, C2, D2),
      P8(m, 'Ⅷ′ 再现·十六分', 'piano+', cat(ch1, ch2), A, B, A2, C2, Ai, Bi, C, D),
      P8(m, 'Ⅸ 弦乐·静止的镜', 'strings', cat(ch2, ch1), Ai, Bi, Cr, Dr, A12, B, C, D),
      P8(m, 'Ⅸ′ 逆行华彩', 'solo', cat(ch1, ch2), Ar, Br, Cr, Dr, A12, Ai, B, Bi),
      P8(m, 'Ⅹ 第二高潮·全奏', 'full', cat(ch1, t2), A12, B2, A12, C2, A2, Bi, C2, D2),
      P8(m, 'Ⅹ′ 收束·镜面合一', 'piano+', cat(ch2, ch1), A, Ai, A2, Bi, Am, Bm, Cm, Dm),
      P8(m, 'Ⅺ 终止·皮卡迪三度', 'cadence', cat(ch1, ch2), A, Ai, Ar, B, Dm, Am, D2, A12)
    ];
    MUS.tracks.boss2 = {
      id: 'boss2', title: '鏡面のカノン ~ Mirror Canon', jp: 'きょうめんのかのん',
      descJa: '鏡井仄のテーマ（ピアノ版）。Eリディアと半音中音関係の和音、BPM 166・6/8 拍（1小節 12 歩）。ピアノ主奏 A と厳密な反行 A′ によるカノン、高オクターヴの断奏が鏡面のこだまを作る。十六分アルペジオ・エレピ・ベース・バトルドラム、中盤の逆行と連続二度模進、二拍の完全停止、二度の高潮を経て E長三和音で締める。二十一段・約三分の一度きりの展開。',
      desc: '鏡井仄主题（钢琴版）。E 利底亚与半音中音关系和弦，BPM 166、6/8 复合拍（每小节 12 步）；钢琴主奏 A 与严格倒影 A′ 构成卡农，高八度钢琴断奏作镜面回声，配十六分琶音、电钢、贝斯与战斗鼓组。中段逆行与连续二度模进，两拍完全停顿、两度高潮后收束于 E 大三和弦。共 21 段、约三分钟一次性展开。',
      bpm: 166, key: 'E利底亚/半音中音', lead: 'piano', meter: 12, intensity: .86,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* =======================================================
   * 5. 最终 Boss 祭篝燎《千人目の祭囃子》 D吕 / BPM178 / 4/4
   *    17 段（16×8 + 2 小节骤停）≈ 174 秒
   *    最厚的编曲：钢琴齐奏 + 十六分琶音 + 铜管副旋律 + 战鼓，
   *    上行大跳模进、七度转调、两拍骤停，终以 D 大三和弦点灯。
   * ======================================================= */
  (function () {
    const m = 16;
    const A = M("D5:1 E5:1 G5:1 A5:1 B5:2 D6:2 B5:2 A5:2 G5:2 E5:2");
    const B = M("A5:2 B5:2 D6:2 -:2 B5:2 A5:2 G5:2 E5:2");
    const C = M("G5:1 A5:1 B5:1 D6:1 E6:2 D6:2 B5:2 A5:2 G5:2 E5:2");
    const D = M("D5:2 G5:2 A5:2 B5:2 D6:2 F#6:2 A6:4");
    const A5 = trans(A, 5), A7 = trans(A, 7), Am = trans(A, -3), A12 = trans(A, 12);
    const B5 = trans(B, 5), Bm = trans(B, -3);
    const C5 = trans(C, 5), Cm = trans(C, -3);
    const D5 = trans(D, 5), Dm = trans(D, -3);
    const Ai = inv(A, 79), Bi = inv(B, 79), Ci = inv(C, 79);
    const Ar = retro(A), Br = retro(B), Cr = retro(C), Dr = retro(D);
    const RST = M("-:16");
    const ch1 = [['D3', 'M'], ['G2', 'M7'], ['A2', 'M'], ['D3', 'M']];
    const ch2 = [['G2', 'M'], ['A2', 'M'], ['B2', 'm'], ['D3', 'M7']];
    const t1 = transChords(ch1, 7), t2 = transChords(ch2, 7);
    const sections = [
      P8(m, 'Ⅰ 起火·主题', 'piano', cat(ch1, ch2), A, B, C, D, A, B, C, D),
      P8(m, 'Ⅰ′ 十六分齐奏', 'piano+', cat(ch2, ch1), A, B, A5, C, A, Bi, C5, D),
      P8(m, 'Ⅱ 铜管副旋律', 'brass', cat(ch1, ch2), A5, B5, A5, C5, A, Bi, C5, D5),
      P8(m, 'Ⅱ′ 上行模进', 'piano+', cat(t1, t2), A7, B5, A7, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅲ 弦乐·祭之静', 'strings', cat(ch2, ch1), Ai, Bi, Cr, Dr, A, B, C, D),
      P8(m, 'Ⅲ′ 钢琴华彩', 'solo', cat(ch1, ch2), Ar, Br, Cr, Dr, A12, B, C, D),
      P8(m, 'Ⅳ 第一高潮·全奏', 'full', cat(ch1, t2), A12, B5, A12, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅳ′ 拍子·回归', 'piano+', cat(ch2, ch1), A, B, A5, C5, Am, Br, Cm, Dm),
      P8(m, 'Ⅴ 七度转调', 'brass', cat(t1, t2), A7, B5, A7, C5, A12, Bi, C5, D5),
      sect({ bars: 2, meter: m, label: 'Ⅴ′ 两拍完全停顿', voicing: 'break',
        chords: ch1, lead: cat(RST, RST), fill: true }),
      P8(m, 'Ⅵ 再现·主题', 'piano+', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅵ′ 全奏再现', 'full', cat(t1, t2), A12, B5, A12, C5, A7, Bi, C5, D5),
      P8(m, 'Ⅶ 倒影华彩', 'solo', cat(ch2, ch1), Ai, Bi, Ci, Ar, Br, Cr, Dr, A12),
      P8(m, 'Ⅶ′ 铜管·再', 'brass', cat(ch1, t2), A5, B5, A5, C5, A12, Bi, C5, D5),
      P8(m, 'Ⅷ 收束·渐密', 'piano+', cat(ch2, ch1), A, A5, B, B5, C, C5, D, D5),
      P8(m, 'Ⅷ′ 第二高潮·满开', 'full', cat(ch1, t2), A12, B5, A12, C5, A7, Bi, C5, D5),
      P8(m, 'Ⅸ 终止·点灯（皮卡迪三度）', 'cadence', cat(ch1, ch2), A, B, Ar, C, Dm, Am, D5, A12)
    ];
    MUS.tracks.boss3 = {
      id: 'boss3', title: '千人目の祭囃子 ~ Festival for No One', jp: 'せんにんめのまつりばやし',
      descJa: '祭篝燎のテーマ（ピアノ版）。D呂音階の明るい五声に羽調式の影を混ぜ、BPM 178。ピアノ斉奏を主奏に、十六分アルペジオ・エレピ・バトルドラム、高潮ではブラスが低オクターヴで厚く重なる最も賑やかな編成。大跳を伴う上行模進、M7 和音、七度上の転調、二拍の完全停止、二度の満開を経て D 長三和音で締める——遂に誰かが灯しに来た。十七段・約三分の一度きりの展開。',
      desc: '祭篝燎主题（钢琴版）。D 吕音阶的明快五声里混入羽调式阴影，BPM 178；钢琴齐奏担任主奏，配高速十六分琶音、电钢与战斗鼓组，高潮时铜管以低八度叠成最厚的编成。带大跳的上行模进、大七和弦、上方七度转调、两拍完全停顿、两度满开后，终以 D 大三和弦收束——终于有人来点灯了。共 17 段、约三分钟一次性展开。',
      bpm: 178, key: 'D吕/羽', lead: 'piano', meter: 16, intensity: 1,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* =======================================================
   * 第四～六面新增曲目（同样为约三分钟一次性展开）
   * stage2 星読み / stage3 無音劇場 / stage4 名の無い間
   * boss4 天読星羅 / boss5 音無楽々 / boss6 無名の守人
   * ======================================================= */

  /* ---- stageMirror：第二面道中（BPM146，A 羽，镜面般的严格对称） ---- */
  (function () {
    const m = 16;
    const A = M("A4:1 C5:1 E5:2 A5:2 G5:2 E5:2 C5:2 B4:2");
    const B = M("E5:1 G5:1 A5:2 C6:2 B5:2 A5:2 G5:2 E5:2");
    const C = M("C5:2 E5:2 G5:4 -:2 E5:2 D5:2 B4:2");
    const D = M("D5:1 F5:1 A5:2 C6:2 B5:2 A5:2 F5:2 E5:2");
    const A5 = trans(A, 5), A7 = trans(A, 7), A12 = trans(A, 12), A3v = trans(A, 3);
    const B5 = trans(B, 5), C5 = trans(C, 5), D5 = trans(D, 5);
    const Ai = inv(A, 76), Bi = inv(B, 76);
    const Ar = retro(A), Br = retro(B);
    const ch1 = [['A3', 'm'], ['F3', 'M'], ['C4', 'M'], ['G3', 'M']];
    const ch2 = transChords(ch1, 5);
    const t1 = transChords(ch1, 7), t2 = transChords(ch2, 7);
    const sections = [
      P8(m, 'Ⅰ 呈示·映らぬ池', 'piano', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅰ′ 対になる弾', 'piano+', cat(ch2, ch1), A, B, A3v, C, A, Bi, C5, D),
      P8(m, 'Ⅱ 承接·弦', 'strings', cat(ch1, ch2), Ai, B, C, D, A, Br, C5, A),
      P8(m, 'Ⅱ′ 模进·七度', 'piano+', cat(t1, t2), A5, B5, A5, C5, A, Bi, C5, D5),
      P8(m, 'Ⅲ 华彩·逆行', 'solo', cat(ch2, ch1), Ar, Br, A, C, A12, B, C, D),
      P8(m, 'Ⅳ 高潮·全奏', 'full', cat(ch1, t2), A12, B5, A12, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅳ′ 二拍骤停', 'break', cat(ch1, ch2), A, B, A, C, A, B, C, D),
      P8(m, 'Ⅴ 再现', 'piano+', cat(ch1, ch2), A12, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅵ 终止', 'cadence', cat(ch1, ch2), A, B, Ar, C, D5, A5, D5, A12)
    ];
    MUS.tracks.stageMirror = {
      id: 'stageMirror', title: '映らぬ池の道中 ~ Mirror Path', jp: 'うつらぬいけのどうちゅう',
      desc: '第二面道中（钢琴版）。A 羽调式、BPM146，严格的左右对称乐句呼应镜面弹幕；钢琴与弦乐交替，七度模进与逆行华彩，两拍骤停后收于 A 大三和弦。九段、约三分钟一次性展开的完整曲式（内部不含短循环）。',
      descJa: '第二面道中（ピアノ版）。A羽調式・BPM146、厳密な左右対称の楽句が鏡面弾幕を反映。ピアノと弦の交替、七度模進と逆行、二拍の急停止、A長三和音で締める。九段・約三分の一回限りの展開（内部に短いループは無い）。',
      bpm: 146, key: 'A羽', lead: 'piano', meter: 16, intensity: .70,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* ---- stageFire：第三面道中（BPM168，D 吕，祭典般的明快律动） ---- */
  (function () {
    const m = 16;
    const A = M("D5:1 E5:1 G5:2 A5:2 G5:2 E5:2 D5:2 C5:2");
    const B = M("A5:1 C6:1 D6:2 C6:2 A5:2 G5:2 E5:2 D5:2");
    const C = M("G5:1 A5:1 C6:2 -:2 A5:2 G5:2 E5:2 D5:2");
    const D = M("E5:1 G5:1 A5:2 C6:2 D6:2 C6:2 A5:2 G5:2");
    const A5 = trans(A, 5), A7 = trans(A, 7), A12 = trans(A, 12), Am = trans(A, -3);
    const B5 = trans(B, 5), C5 = trans(C, 5), D5 = trans(D, 5), Dm = trans(D, -3);
    const Ai = inv(A, 79), Bi = inv(B, 79);
    const Ar = retro(A), Br = retro(B);
    const ch1 = [['D3', 'M'], ['G2', 'M7'], ['A2', 'M'], ['C3', 'M']];
    const ch2 = [['G2', 'M'], ['A2', 'M'], ['Bb2', 'M'], ['D3', 'M7']];
    const t1 = transChords(ch1, 5), t2 = transChords(ch2, 5);
    const sections = [
      P8(m, 'Ⅰ 呈示·祭り', 'piano', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅰ′ 提灯', 'piano+', cat(ch2, ch1), A, B, A7, C, A, Bi, C5, D),
      P8(m, 'Ⅱ 承接·弦', 'strings', cat(ch1, ch2), Ai, B, C, D, A, Br, C5, A),
      P8(m, 'Ⅱ′ 模进·五度', 'piano+', cat(t1, t2), A5, B5, A5, C5, A, Bi, C5, D5),
      P8(m, 'Ⅲ 华彩·逆行', 'solo', cat(ch2, ch1), Ar, Br, C, D, A12, B, C, D),
      P8(m, 'Ⅳ 高潮·全奏', 'full', cat(ch1, t2), A12, B5, A12, C5, A7, Bi, C5, D5),
      P8(m, 'Ⅳ′ 二拍骤停', 'break', cat(ch1, ch2), A, B, A, C, A, B, C, D),
      P8(m, 'Ⅴ 再现', 'piano+', cat(ch1, ch2), A12, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅵ 终止·点灯', 'cadence', cat(ch1, ch2), A, B, Ar, C, D5, A5, D5, A12)
    ];
    MUS.tracks.stageFire = {
      id: 'stageFire', title: '忘却の祭火の道中 ~ Fire Path', jp: 'ぼうきゃくのまつりびのどうちゅう',
      desc: '第三面道中（钢琴版）。D 吕音阶、BPM168，明快的祭典律动；钢琴齐奏与十六分琶音，五度模进与逆行华彩，两拍骤停后收于 D 大三和弦。九段、约三分钟一次性展开的完整曲式（内部不含短循环）。',
      descJa: '第三面道中（ピアノ版）。D呂音階・BPM168、明るい祭りのリズム。ピアノ斉奏と十六分アルペジオ、五度模進と逆行、二拍の急停止、D長三和音で締める。九段・約三分の一回限りの展開（内部に短いループは無い）。',
      bpm: 168, key: 'D吕', lead: 'piano', meter: 16, intensity: .85,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* ---- stage2：星読みの間（BPM132，D 羽，行星运行般的匀速感） ---- */
  (function () {
    const m = 16;
    const A = M("D5:2 F5:2 A5:4 G5:2 F5:2 E5:2 D5:2");
    const B = M("A5:2 C6:2 D6:4 C6:2 A5:2 G5:2 F5:2");
    const C = M("F5:2 A5:2 C6:4 -:2 A5:2 G5:2 E5:2");
    const D = M("E5:2 G5:2 A5:2 C6:2 D6:4 A5:2 G5:2");
    const A5 = trans(A, 5), A7 = trans(A, 7), A12 = trans(A, 12), Ai = inv(A, 76);
    const B5 = trans(B, 5), Bi = inv(B, 76), C5 = trans(C, 5), D5 = trans(D, 5);
    const Ar = retro(A), Br = retro(B);
    const ch1 = [['D3', 'm'], ['Bb2', 'M'], ['F3', 'M'], ['C3', 'M']];
    const ch2 = transChords(ch1, 5);
    const t1 = transChords(ch1, 5), t2 = transChords(ch2, 5);
    const sections = [
      P8(m, 'Ⅰ 呈示·星图', 'piano', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅰ′ 双星', 'piano+', cat(ch2, ch1), A, B, A5, C, A, Bi, C5, D),
      P8(m, 'Ⅱ 承接·弦乐', 'strings', cat(ch1, ch2), Ai, B, C, D, A, Br, C5, A),
      P8(m, 'Ⅱ′ 模进·五度', 'piano+', cat(t1, t2), A5, B5, A5, C5, A, Bi, C5, D5),
      P8(m, 'Ⅲ 华彩·倒影', 'solo', cat(ch2, ch1), Ar, Br, Bi, D, A12, B, C, D),
      P8(m, 'Ⅳ 高潮·全奏', 'full', cat(ch1, t2), A12, B5, A12, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅳ′ 两拍骤停', 'break', cat(ch1, ch2), A, B, A, C, A, B, C, D),
      P8(m, 'Ⅴ 再现·高八度', 'piano+', cat(ch1, ch2), A12, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅴ′ 展开·第七星', 'piano+', cat(t1, ch1), A5, B5, A7, C5, A, Bi, C5, D5),
      P8(m, 'Ⅴ″ 变奏·逆行轨道', 'solo', cat(ch2, ch1), Ar, Br, Ai, D, A12, B, C, D),
      P8(m, 'Ⅴ‴ 第二高潮·天球开', 'full', cat(ch1, t2), A12, B5, A7, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅵ 终止·皮卡迪三度', 'cadence', cat(ch1, ch2), A, B, Ar, C, D5, A5, D5, A12)
    ];
    MUS.tracks.stage2 = {
      id: 'stage2', title: '星図の間 ~ Between the Stars', jp: 'せいずのま',
      desc: '第四面道中（钢琴版）。D 羽调式、BPM 132，用平稳的行星运行感铺开；钢琴分解和弦与弦乐铺底，中段作五度模进与倒影，两拍骤停后高八度再现，终于 D 大三和弦。九段、约三分钟。',
      descJa: '第四面道中（ピアノ版）。D羽調式・BPM132、惑星の運行のような等速感。ピアノのアルペジオと弦、五度模進と反行、二拍の急停止と高オクターヴ再現、D長三和音で締める。九段・約三分。',
      bpm: 132, key: 'D羽', lead: 'piano', meter: 16, intensity: .68,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* ---- stage3：無音の劇場（BPM148，A 羽，华尔兹般的 12 步拍） ---- */
  (function () {
    const m = 12;
    const A = M("A4:1 C5:1 E5:2 G5:2 E5:2 C5:2 A4:2");
    const B = M("E5:1 G5:1 A5:2 C6:2 B5:2 G5:2 E5:2");
    const C = M("C5:2 E5:2 A5:2 -:2 G5:2 E5:2 C5:2");
    const D = M("G5:1 A5:1 B5:2 C6:2 E6:2 C6:2 A5:2");
    const A5 = trans(A, 5), A12 = trans(A, 12), Ai = inv(A, 76);
    const A3v = trans(A, 3), C3v = trans(C, 3);
    const B5 = trans(B, 5), Bi = inv(B, 76), C5 = trans(C, 5), D5 = trans(D, 5);
    const Ar = retro(A), Br = retro(B), Cr = retro(C);
    const ch1 = [['A3', 'm'], ['F3', 'M'], ['C4', 'M'], ['G3', 'M']];
    const ch2 = transChords(ch1, 5);
    const t1 = transChords(ch1, 3), t2 = transChords(ch2, 3);
    const sections = [
      P8(m, 'Ⅰ 呈示·幕開', 'piano', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅰ′ 拍子', 'piano+', cat(ch2, ch1), A, B, A3v, C, A, Bi, C5, D),
      P8(m, 'Ⅱ 承接·弦乐', 'strings', cat(ch1, ch2), Ai, B, C, D, A, Br, C5, A),
      P8(m, 'Ⅱ′ 模进·三度', 'piano+', cat(t1, t2), A3v, B5, A3v, C5, A, Bi, C3v, D5),
      P8(m, 'Ⅲ 华彩·逆行', 'solo', cat(ch2, ch1), Ar, Br, Cr, D, A12, B, C, D),
      P8(m, 'Ⅳ 高潮·合奏', 'full', cat(ch1, t2), A12, B5, A12, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅳ′ 休止', 'break', cat(ch1, ch2), A, B, A, C, A, B, C, D),
      P8(m, 'Ⅴ 再现·高八度', 'piano+', cat(ch1, ch2), A12, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅴ′ 展开·装饰音', 'piano+', cat(t1, ch1), A3v, B5, A3v, C5, A, Bi, C3v, D5),
      P8(m, 'Ⅴ″ 变奏·两个声部', 'strings', cat(ch2, ch1), Ai, Br, C, D, A5, Bi, C5, A),
      P8(m, 'Ⅴ‴ 第二高潮·满奏', 'full', cat(ch1, t2), A12, B5, A12, C5, A3v, Bi, C5, D5),
      P8(m, 'Ⅵ 终止·皮卡迪三度', 'cadence', cat(ch1, ch2), A, B, Ar, C, D5, A5, D5, A12),
      P8(m, 'Ⅵ 展开·三声部', 'piano+', cat(t1, ch1), A5, B5, A3v, C5, A, Bi, C3v, D5),
      P8(m, 'Ⅵ′ 华彩·再逆行', 'solo', cat(ch2, ch1), Ar, Br, Cr, D, A12, B, C, D),
      P8(m, 'Ⅵ″ 终前高潮', 'full', cat(ch1, t2), A12, B5, A12, C5, A3v, Bi, C5, D5),
    ];
    MUS.tracks.stage3 = {
      id: 'stage3', title: '無音の劇場 ~ Silent Theater', jp: 'むおんのげきじょう',
      desc: '第五面道中（钢琴版）。A 羽调式、BPM148，12 步一小节的圆舞感；钢琴主奏与弦乐交织，三度模进与逆行华彩，两拍休止后高八度再现，收于 A 大三和弦。九段、约三分钟。',
      descJa: '第五面道中（ピアノ版）。A羽調式・BPM148、12歩小節のワルツ感。ピアノ主奏と弦、三度模進と逆行、二拍の休止と高オクターヴ再現、A長三和音で締める。九段・約三分。',
      bpm: 148, key: 'A羽', lead: 'piano', meter: 12, intensity: .72,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* ---- stage4：名の無い間（BPM118，C 羽，最静的终盘道中） ---- */
  (function () {
    const m = 16;
    const A = M("C5:3 E5:3 G5:4 -:2 F5:2 E5:2 D5:2");
    const B = M("G5:3 Bb5:3 C6:4 Bb5:2 G5:2 F5:2 E5:2");
    const C = M("Eb5:3 G5:3 Bb5:4 -:2 G5:2 F5:2 D5:2");
    const D = M("F5:3 A5:3 C6:4 A5:2 F5:2 Eb5:2 D5:2");
    const A5 = trans(A, 5), A7 = trans(A, 7), A12 = trans(A, 12), Ai = inv(A, 76);
    const B5 = trans(B, 5), Bi = inv(B, 76), C5 = trans(C, 5), D5 = trans(D, 5);
    const Ar = retro(A), Br = retro(B);
    const ch1 = [['C3', 'sus'], ['G2', 'sus'], ['Ab2', 'M'], ['Eb3', 'M']];
    const ch2 = transChords(ch1, 5);
    const t1 = transChords(ch1, 7), t2 = transChords(ch2, 7);
    const sections = [
      P8(m, 'Ⅰ 呈示·空白', 'piano', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅰ′ 静かな刻', 'strings', cat(ch2, ch1), A, B, A5, C, A, Bi, C5, D),
      P8(m, 'Ⅱ 承接·模进', 'piano+', cat(t1, t2), A5, B5, A5, C5, A, Bi, C5, D5),
      P8(m, 'Ⅲ 华彩·倒影', 'solo', cat(ch1, ch2), Ai, Bi, Ar, C, A12, B, C, D),
      P8(m, 'Ⅳ 高潮·全奏', 'full', cat(ch1, t2), A12, B5, A12, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅳ′ 无音', 'break', cat(ch1, ch2), A, B, A, C, A, B, C, D),
      P8(m, 'Ⅴ 再现', 'piano+', cat(ch1, ch2), A12, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅵ 终止·皮卡迪三度', 'cadence', cat(ch1, ch2), A, B, Ar, C, D5, A5, D5, A12),
      P8(m, 'Ⅴ′ 展开·空洞的回声', 'piano+', cat(t1, ch1), A5, B5, A5, C5, A, Bi, C5, D5),
      P8(m, 'Ⅴ″ 变奏·倒影空白', 'solo', cat(ch2, ch1), Ai, Bi, Ar, C, A12, B, C, D),
      P8(m, 'Ⅴ‴ 第二高潮', 'full', cat(ch1, t2), A12, B5, A12, C5, A7, Bi, C5, D5),
    ];
    MUS.tracks.stage4 = {
      id: 'stage4', title: '名の無い間 ~ Nameless Room', jp: 'なのないま',
      desc: '第六面道中（钢琴版）。C 羽调式、BPM118，最安静的终盘；四度叠置和弦制造空白感，钢琴与弦乐稀疏铺开，五度上行模进与倒影后两拍无音，收于 C 大三和弦。八段、约三分钟。',
      descJa: '第六面道中（ピアノ版）。C羽調式・BPM118、最も静かな終盤。四度積み重ねの和音で空白を描き、五度模進と反行、二拍の無音を経てC長三和音へ。八段・約三分。',
      bpm: 118, key: 'C羽', lead: 'piano', meter: 16, intensity: .55,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* ---- boss4：天読星羅（BPM152，G 羽，星图般的清晰上行） ---- */
  (function () {
    const m = 16;
    const A = M("G4:1 B4:1 D5:2 G5:2 F#5:2 D5:2 B4:2 A4:2");
    const B = M("D5:1 F#5:1 A5:2 D6:2 C6:2 A5:2 F#5:2 E5:2");
    const C = M("B4:2 D5:2 G5:4 -:2 F#5:2 E5:2 D5:2");
    const D = M("E5:1 G5:1 A5:2 B5:2 D6:2 B5:2 A5:2 G5:2");
    const A5 = trans(A, 5), A7 = trans(A, 7), A12 = trans(A, 12), Am = trans(A, -3);
    const B5 = trans(B, 5), Bm = trans(B, -3), C5 = trans(C, 5), Cm = trans(C, -3);
    const D5 = trans(D, 5), Dm = trans(D, -3);
    const Ai = inv(A, 79), Bi = inv(B, 79);
    const Ar = retro(A), Br = retro(B), Cr = retro(C);
    const ch1 = [['G3', 'M'], ['E3', 'm'], ['C3', 'M'], ['D3', 'M']];
    const ch2 = [['E3', 'm'], ['C3', 'M'], ['D3', 'M'], ['B2', 'm']];
    const t1 = transChords(ch1, 5), t2 = transChords(ch2, 5);
    const t3 = transChords(ch1, 7), t4 = transChords(ch2, 7);
    const sections = [
      P8(m, 'Ⅰ 呈示·星図', 'piano', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅰ′ 星點', 'piano+', cat(ch2, ch1), A, B, A5, C, A, Bi, C5, D),
      P8(m, 'Ⅱ 承接·轨道', 'strings', cat(ch1, ch2), Ai, B, C, D, A, Br, C5, A),
      P8(m, 'Ⅱ′ 模进·五度', 'piano+', cat(t1, t2), A5, B5, A5, C5, A, Bi, C5, D5),
      P8(m, 'Ⅲ 华彩·星座', 'solo', cat(ch2, ch1), Ar, Br, Cr, D, A12, B, C, D),
      P8(m, 'Ⅲ′ 转调·七度', 'brass', cat(t3, t4), A7, B5, A7, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅳ 高潮·天球', 'full', cat(ch1, t2), A12, B5, A12, C5, A7, Bi, C5, D5),
      P8(m, 'Ⅳ′ 两拍骤停', 'break', cat(ch1, ch2), A, B, A, C, A, B, C, D),
      P8(m, 'Ⅴ 再现·高八度', 'piano+', cat(ch1, ch2), A12, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅵ 终止·皮卡迪三度', 'cadence', cat(ch1, ch2), A, B, Ar, C, D5, A5, D5, A12),
      P8(m, 'Ⅴ′ 展开·第八星', 'piano+', cat(t3, ch1), A7, B5, A7, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅴ″ 变奏·轨道逆行', 'solo', cat(ch2, ch1), Ar, Br, Ai, D, A12, B, C, D),
      P8(m, 'Ⅴ‴ 第二高潮·星群', 'full', cat(ch1, t2), A12, B5, A7, C5, A5, Bi, C5, D5),
    ];
    MUS.tracks.boss4 = {
      id: 'boss4', title: '星を読む者 ~ Star Reader', jp: 'ほしをよむもの',
      descJa: '天読星羅のテーマ（ピアノ版）。G調の明晰な上行旋律、BPM152。星図のように等間隔で並ぶアルペジオと弦、五度・七度の転調、反行カデンツァ、二拍の急停止を経てG長三和音で締める。十段・約三分。',
      desc: '天読星羅主题（钢琴版）。G 调清晰的上行旋律，BPM152；像星图一样等距排列的琶音与弦乐，五度与七度转调、倒影华彩、两拍骤停后收于 G 大三和弦。十段、约三分钟。',
      bpm: 152, key: 'G', lead: 'piano', meter: 16, intensity: .82,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* ---- boss5：音無楽々（BPM140，E 羽，12 步乐句＝乐谱感） ---- */
  (function () {
    const m = 12;
    const A = M("E4:1 G4:1 B4:2 E5:2 D5:2 B4:2 G4:2 A4:2");
    const B = M("B4:1 D5:1 F#5:2 B5:2 A5:2 F#5:2 D5:2 E5:2");
    const C = M("G4:2 B4:2 D5:4 -:2 B4:2 A4:2 F#4:2");
    const D = M("A4:1 C5:1 E5:2 G5:2 F#5:2 E5:2 D5:2 B4:2");
    const A5 = trans(A, 5), A7 = trans(A, 7), A12 = trans(A, 12), Am = trans(A, -3);
    const B5 = trans(B, 5), Bm = trans(B, -3), C5 = trans(C, 5), D5 = trans(D, 5);
    const Dm = trans(D, -3);
    const Ai = inv(A, 76), Bi = inv(B, 76);
    const Ar = retro(A), Br = retro(B), Cr = retro(C);
    const ch1 = [['E3', 'm'], ['C3', 'M'], ['G3', 'M'], ['D3', 'M']];
    const ch2 = [['C3', 'M'], ['G3', 'M'], ['D3', 'M'], ['A2', 'm']];
    const t1 = transChords(ch1, 5), t2 = transChords(ch2, 5);
    const t3 = transChords(ch1, 7), t4 = transChords(ch2, 7);
    const sections = [
      P8(m, 'Ⅰ 呈示·譜', 'piano', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅰ′ 音符', 'piano+', cat(ch2, ch1), A, B, A5, C, A, Bi, C5, D),
      P8(m, 'Ⅱ 承接·和音', 'strings', cat(ch1, ch2), Ai, B, C, D, A, Br, C5, A),
      P8(m, 'Ⅱ′ 模进·五度', 'piano+', cat(t1, t2), A5, B5, A5, C5, A, Bi, C5, D5),
      P8(m, 'Ⅲ 华彩·逆行', 'solo', cat(ch2, ch1), Ar, Br, Cr, D, A12, B, C, D),
      P8(m, 'Ⅲ′ 转调·七度', 'brass', cat(t3, t4), A7, B5, A7, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅳ 高潮·楽章', 'full', cat(ch1, t2), A12, B5, A12, C5, A7, Bi, C5, D5),
      P8(m, 'Ⅳ′ 休止', 'break', cat(ch1, ch2), A, B, A, C, A, B, C, D),
      P8(m, 'Ⅴ 再现', 'piano+', cat(ch1, ch2), A12, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅵ 终止·無音', 'cadence', cat(ch1, ch2), A, B, Ar, C, D5, A5, D5, A12),
      P8(m, 'Ⅴ′ 展开·装饰奏', 'piano+', cat(t3, ch1), A7, B5, A7, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅴ″ 变奏·无声之歌', 'strings', cat(ch2, ch1), Ai, Br, C, D, A5, Bi, C5, A),
      P8(m, 'Ⅴ‴ 第二高潮·全乐器', 'full', cat(ch1, t2), A12, B5, A12, C5, A7, Bi, C5, D5),
      P8(m, 'Ⅵ 展开·第二乐句', 'piano+', cat(t3, ch1), A7, B5, A7, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅵ′ 变奏·和声倒置', 'strings', cat(ch2, ch1), Ai, Br, C, D, A5, Bi, C5, A),
      P8(m, 'Ⅵ″ 终前全奏', 'full', cat(ch1, t2), A12, B5, A12, C5, A7, Bi, C5, D5),
    ];
    MUS.tracks.boss5 = {
      id: 'boss5', title: '名を歌う者 ~ Name Singer', jp: 'なをうたうもの',
      descJa: '音無楽々のテーマ（ピアノ版）。E羽調式・BPM140、12歩の楽句が五線譜を思わせる。等間隔のアルペジオ、五度・七度の転調、逆行カデンツァ、二拍の完全休止を経てE長三和音へ。「無音」の終止が特徴。十段・約三分。',
      desc: '音無楽々主题（钢琴版）。E 羽调式、BPM140，12 步乐句让人想起五线谱；等距琶音、五度与七度转调、逆行华彩、两拍完全休止后收于 E 大三和弦，终止式刻意「无声」。十段、约三分钟。',
      bpm: 140, key: 'E羽', lead: 'piano', meter: 12, intensity: .86,
      sections, order: sections.map((_, i) => i)
    };
  })();

  /* ---- boss6：無名の守人（BPM160，D 羽，终面最厚） ---- */
  (function () {
    const m = 16;
    const A = M("D5:1 F5:1 A5:2 D6:2 C6:2 A5:2 F5:2 E5:2");
    const B = M("A5:1 C6:1 D6:2 F6:2 E6:2 C6:2 A5:2 G5:2");
    const C = M("F5:2 A5:2 C6:4 -:2 A5:2 F5:2 D5:2");
    const D = M("G5:1 Bb5:1 C6:2 D6:2 F6:2 D6:2 C6:2 Bb5:2");
    const A5 = trans(A, 5), A7 = trans(A, 7), A12 = trans(A, 12), Am = trans(A, -3);
    const B5 = trans(B, 5), Bm = trans(B, -3), C5 = trans(C, 5), Cm = trans(C, -3);
    const D5 = trans(D, 5), Dm = trans(D, -3);
    const Ai = inv(A, 79), Bi = inv(B, 79), Ci = inv(C, 79);
    const Ar = retro(A), Br = retro(B), Cr = retro(C), Dr = retro(D);
    const ch1 = [['D3', 'm'], ['Bb2', 'M'], ['F3', 'M'], ['C3', 'M']];
    const ch2 = [['Bb2', 'M'], ['F3', 'M'], ['C3', 'M'], ['G2', 'm']];
    const t1 = transChords(ch1, 5), t2 = transChords(ch2, 5);
    const t3 = transChords(ch1, 7), t4 = transChords(ch2, 7);
    const sections = [
      P8(m, 'Ⅰ 呈示·無題', 'piano', cat(ch1, ch2), A, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅰ′ 曼荼羅', 'piano+', cat(ch2, ch1), A, B, A5, C, A, Bi, C5, D),
      P8(m, 'Ⅱ 承接·弦', 'strings', cat(ch1, ch2), Ai, B, C, D, A, Br, C5, A),
      P8(m, 'Ⅱ′ 模进·五度', 'piano+', cat(t1, t2), A5, B5, A5, C5, A, Bi, C5, D5),
      P8(m, 'Ⅲ 华彩·四重逆行', 'solo', cat(ch2, ch1), Ar, Br, Cr, Dr, A12, B, C, D),
      P8(m, 'Ⅲ′ 转调·七度', 'brass', cat(t3, t4), A7, B5, A7, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅳ 全奏·封印', 'full', cat(ch1, t2), A12, B5, A12, C5, A7, Bi, C5, D5),
      P8(m, 'Ⅳ′ 二拍无音', 'break', cat(ch1, ch2), A, B, A, C, A, B, C, D),
      P8(m, 'Ⅴ 再现·高八度', 'piano+', cat(ch1, ch2), A12, B, A, C, A5, Bi, C, D),
      P8(m, 'Ⅴ′ 第二高潮', 'full', cat(t1, t2), A7, B5, A12, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅵ 终止·名を返す', 'cadence', cat(ch1, ch2), A, B, Ar, C, D5, A5, D5, A12),
      P8(m, 'Ⅴ″ 展开·无名之众', 'piano+', cat(t3, ch1), A7, B5, A7, C5, A5, Bi, C5, D5),
      P8(m, 'Ⅴ‴ 变奏·四重逆行', 'solo', cat(ch2, ch1), Ar, Br, Cr, Dr, A12, B, C, D),
    ];
    MUS.tracks.boss6 = {
      id: 'boss6', title: '結界の裡 ~ Inside the Barrier', jp: 'けっかいのうち',
      descJa: '無名の守人のテーマ（ピアノ版）。D羽調式・BPM160、最も厚い編成。曼荼羅のように対称的なアルペジオ、五度・七度の転調、四重逆行のカデンツァ、二拍の無音、二度の満開を経てD長三和音——名が返された瞬間。十一段・約三分。',
      desc: '無名の守人主题（钢琴版）。D 羽调式、BPM160，最厚的编成；曼荼罗般对称的琶音、五度与七度转调、四重逆行华彩、两拍无音、两度满开后收于 D 大三和弦——名字被归还的一瞬。十一段、约三分钟。',
      bpm: 160, key: 'D羽', lead: 'piano', meter: 16, intensity: 1,
      sections, order: sections.map((_, i) => i)
    };
  })();

  MUS.order = ['title', 'stage', 'stage2', 'stage3', 'stage4', 'boss1', 'boss2', 'boss3', 'boss4', 'boss5', 'boss6'];

  /* =======================================================
   * 自机大招插入乐句（按符卡序号变调・变奏，故五张符卡各不相同）
   * ======================================================= */
  MUS.jingles = {
    reimu: {
      name: '巫女の祈り', lead: 'bells', bpm: 190,
      ev: M("D5:1 F5:1 A5:1 D6:1 C6:2 A5:2 F5:2 A5:1 C6:1 D6:2 A5:2 D6:4"),
      desc: '上行五声 + 铃音，神社的祓除。'
    },
    marisa: {
      name: '星屑の魔弾', lead: 'brass', bpm: 210,
      ev: M("A4:1 C5:1 E5:1 A5:1 G5:2 E5:2 C5:2 E5:1 G5:1 A5:2 E5:2 A5:2 C6:2"),
      desc: '大跳与明亮大调琶音，魔法使的一击。'
    },
    sakuya: {
      name: '時を刻む銀', lead: 'piano', bpm: 226,
      ev: M("E5:1 D#5:1 D5:1 C#5:1 C5:2 B4:2 A#4:2 B4:1 C5:1 D5:2 E5:2 A4:4"),
      desc: '半音下行断奏 + 时钟滴答，停止时间的银刀。'
    }
  };

})();
