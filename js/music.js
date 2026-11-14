/* ===========================================================
 * music.js — 原创曲谱（全曲独立写作，未取用任何原作旋律 / 音频）
 *
 * 作曲依据（考据自东方 Project 音乐特征）：
 *  1. 和洋折衷：旋律以「带变宫的六声羽调式」为骨架
 *     （羽・变宫・宫・商・角・徵，即自然小调去掉小六度音），
 *     故本作 D羽=D E F G A C / A羽=A B C D E G / C羽=C D Eb F G Bb / E羽=E F# G A B D。
 *  2. 重用小号音色担任主旋律（俗称 ZUN 号），辅以高速钢琴 16 分琶音、
 *     电钢和弦切分、贝斯根音与短促激烈的鼓点。
 *  3. 功能性三和弦为主，靠模进・转调・半音中音关系和弦制造色彩；
 *     终曲以皮卡迪三度收束。
 *  4. 旋律动机高度重复并作变奏 / 倒影 / 移位，段落短循环；
 *     高潮前安排「两拍完全停顿」以呼应弹幕局势转换。
 *  5. 4/4 拍、BPM 104～184，循环段无缝接回开头。
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

  /* ---------- 段落编译：自动补齐 / 截断到 bars*16 步 ---------- */
  function sect(o) {
    /* meter：每小节的 16 分步数。默认 16（4/4）；
       二面 Boss 用 12 步（6/8 复合拍），从拍子上就与其它曲子分开。 */
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
    return { steps, ev, chords, bars: o.bars, meter, fill: !!o.fill };
  }

  const BPM = 0; // 占位，避免误用

  /* =======================================================
   * 1. 标题曲《結界の朝、札の匂い》 D羽 / BPM104 / 风琴主旋律
   * ======================================================= */
  (function () {
    const A = M("A4:2 D5:2 F5:2 E5:2 D5:4 C5:2 A4:2");
    const B = M("F5:2 G5:2 A5:4 G5:2 F5:2 E5:2 D5:2");
    const C = M("D5:2 F5:2 A5:4 -:4 C5:2 A4:2");
    const D = M("G5:2 F5:2 E5:2 D5:2 C5:4 D5:2 F5:2");
    const ch1 = [['D3', 'm'], ['Bb2', 'M'], ['F3', 'M'], ['C3', 'M']];
    const ch2 = [['D3', 'm'], ['F3', 'M'], ['C3', 'M'], ['G2', 'M']];
    MUS.tracks.title = {
      id: 'title', title: '結界の朝、札の匂い', jp: 'けっかいのあさ、ふだのにおい',
      desc: '主题曲。D羽调式，风琴与电钢为主，铜管只在高潮轻描一笔。缓慢的琶音像穿过结界的晨雾。BPM 104。',
      bpm: 104, key: 'D羽', lead: 'organ', arp: 'soft', drums: 'ballad', intensity: .42,
      sections: [
        sect({ bars: 4, chords: ch1, lead: cat(A, B, trans(A, 0), C) }),
        sect({ bars: 4, chords: ch2, lead: cat(trans(A, 5), inv(B, 76), trans(C, 5), D), fill: true }),
      ],
      order: [0, 1, 0, 1]
    };
  })();

  /* =======================================================
   * 2. 道中曲《褪せし札の道》 A羽 / BPM158 / ZUN号 + 16分钢琴
   * ======================================================= */
  (function () {
    const A = M("A4:1 C5:1 D5:2 E5:1 D5:1 C5:2 A4:2 G4:2 A4:2 C5:2");
    const B = M("E5:2 G5:2 A5:2 G5:2 E5:2 D5:2 C5:2 D5:2");
    const C = M("C5:1 D5:1 E5:1 G5:1 A5:2 G5:2 E5:4 D5:2 C5:2");
    const D = M("A5:2 G5:1 E5:1 D5:2 C5:2 E5:2 G5:2 A5:4");
    const ch1 = [['A3', 'm'], ['G3', 'M'], ['F3', 'M'], ['E3', 'M']];
    const ch2 = [['A3', 'm'], ['F3', 'M'], ['C4', 'M'], ['G3', 'M']];
    MUS.tracks.stage = {
      id: 'stage', title: '褪せし札の道', jp: 'あせしふだのみち',
      desc: '道中曲。A羽调式的 i–VII–VI–V 下行与 i–VI–III–VII 循环交替，铜管主旋律配 16 分钢琴琶音，四拍底鼓驱赶节奏。BPM 158。',
      bpm: 158, key: 'A羽', lead: 'brass', arp: 'fast', drums: 'drive', intensity: .72,
      sections: [
        sect({ bars: 4, chords: ch1, lead: cat(A, trans(A, 0), B, C) }),
        sect({ bars: 4, chords: ch2, lead: cat(trans(A, 3), inv(B, 76), trans(C, 5), D), fill: true }),
      ],
      order: [0, 0, 1, 0, 1, 1, 0, 1]
    };
  })();

  /* =======================================================
   * 3. 一面 Boss 綴屋千代《墨の呼吸》
   *    旋律：D 都节音阶（阴旋法）的和风幽玄动机，BPM 88，长音与留白多。
   *    配器统一采用东方原作常用的合成小号（ZUN 号）主旋律，
   *    配慢速钢琴琶音、电钢和弦、贝斯与轻鼓；四五度叠置和声。
   *    角色气质由「旋律」承担，不靠特殊音色。
   * ======================================================= */
  (function () {
    const A = M("D5:3 -:1 Eb5:2 G5:2 -:4 A5:2 G5:2");
    const B = M("A5:4 -:2 Bb5:2 A5:2 G5:2 Eb5:2 D5:2");
    const C = M("G5:2 A5:2 Bb5:4 -:4 A5:2 G5:2");
    const D = M("D5:2 Eb5:2 G5:2 A5:2 Bb5:2 A5:2 G5:4");
    // 四五度叠置（sus = 根音 / 四度 / 五度），不用功能性三和弦
    const ch1 = [['D3', 'sus'], ['G2', 'sus'], ['A2', 'sus'], ['D3', 'sus']];
    const ch2 = [['D3', 'sus'], ['Bb2', 'M'], ['G2', 'sus'], ['A2', 'm']];
    MUS.tracks.boss1 = {
      id: 'boss1', title: '墨の呼吸 ~ Breath of the Ink', jp: 'すみのいき',
      descJa: '綴屋千代のテーマ。D都節音階（陰旋法）による幽玄な和風旋律、BPM 94 の息の長いフレーズと大きな余白が特徴。主旋律は東方でお馴染みのシンセブラス（ZUN ブラス）にオルガンを薄く重ね、伴奏はゆっくりしたピアノアルペジオ、エレピ、ベースと控えめなドラム。四五度積み重ねを軸に大小三和弦を混ぜ、B 段は逆行と模進で展開する。',
      desc: '綴屋千代主题。旋律取自 D 都节音阶（阴旋法），BPM 94 的长句与大量留白，像墨迹在纸上慢慢洇开；主旋律为东方原作常用的合成小号（ZUN 号），薄叠一层风琴增添暖意，配慢速钢琴琶音、电钢、贝斯与轻鼓。和声以四五度叠置为主、混入大小三和弦，B 段用逆行与模进展开。',
      bpm: 94, key: 'D都节', meter: 16, style: 'gagaku',
      lead: 'brass', arp: 'soft', drums: 'ballad', intensity: .5,
      sections: [
        sect({ bars: 4, meter: 16, chords: ch1, lead: cat(A, B, C, D) }),
        sect({ bars: 4, meter: 16, chords: ch2,
          lead: cat(trans(A, -2), retro(B), trans(C, 3), D), fill: true }),
      ],
      order: [0, 1, 0, 1]
    };
  })();

  /* =======================================================
   * 4. 二面 Boss 鏡井仄《鏡面のカノン》
   *    旋律：E 利底亚 + 增三和弦，A 与严格倒影 A′ 构成卡农，
   *          B 段再加逆行；12 步一小节（6/8 复合拍）、BPM 162。
   *    配器同样是 ZUN 号主旋律 + 高速 16 分钢琴琶音 + battle 鼓。
   *    「镜」的概念由倒影/逆行的旋律写法体现，不用玻璃类音色。
   * ======================================================= */
  (function () {
    const A = M("E5:1 F#5:1 G#5:1 B5:2 A#5:1 G#5:2 F#5:2 E5:2"); // 12 步
    const B = M("B5:2 A#5:1 G#5:1 F#5:2 E5:2 -:2 F#5:2");
    const C = M("C#6:1 B5:1 A#5:1 G#5:2 F#5:2 E5:2 F#5:1 G#5:2");
    const D = M("E5:2 G#5:2 B5:2 -:2 A#5:2 G#5:2 F#5:2 E5:2");
    // 增三和弦 + 半音中音关系游移，削弱功能调性
    const ch1 = [['E3', 'aug'], ['F#3', 'm'], ['C3', 'aug'], ['G#2', 'm']];
    const ch2 = transChords(ch1, 2);
    MUS.tracks.boss2 = {
      id: 'boss2', title: '鏡面のカノン ~ Mirror Canon', jp: 'きょうめんのかのん',
      descJa: '鏡井仄のテーマ。Eリディアと半音中音関係の和音、BPM 166・6/8 拍（1小節 12 歩）。主旋律 A と厳密な反行 A′ によるカノン、B 段では逆行と模進を加える——「鏡」は音色ではなく旋律の反行・逆行で表す。ZUN ブラス主旋律に高オクターブのピアノ断奏を薄く添え、16 分アルペジオも一段高く、エレピ・ベース・バトルドラムという東方らしい編成。',
      desc: '鏡井仄主题。E 利底亚与半音中音关系和弦，BPM 166、6/8 复合拍（每小节 12 步）；主旋律 A 与严格倒影 A′ 构成卡农，B 段再加入逆行与模进——「镜」由旋律的镜像写法体现。主旋律仍是 ZUN 号，薄叠一层高八度钢琴断奏，16 分琶音整体抬高一八度，配高音区钢琴、电钢、贝斯与战斗鼓组。',
      bpm: 166, key: 'E利底亚/半音中音', meter: 12, style: 'crystal',
      lead: 'brass', arp: 'fast', drums: 'battle', intensity: .86,
      sections: [
        sect({ bars: 4, meter: 12, chords: ch1,
          lead: cat(A, inv(A, 76), B, inv(B, 76)) }),
        sect({ bars: 4, meter: 12, chords: ch2,
          lead: cat(trans(A, 2), retro(A), trans(C, -2), inv(D, 76)), fill: true }),
      ],
      order: [0, 0, 1, 0, 1, 1, 0]
    };
  })();

  /* =======================================================
   * 5. 最终 Boss 祭篝燎《千人目の祭囃子》
   *    旋律：D 吕音阶（明快五声）混入羽调式阴影，BPM 172，
   *          模进上行后转调，终句以 D 大三和弦（皮卡迪三度）收束。
   *    配器：ZUN 号齐奏主旋律 + 高速 16 分钢琴 + 电钢 + battle 鼓，
   *          是全曲最厚的热闹终曲。祭典感来自旋律与律动，不靠民俗乐器。
   * ======================================================= */
  (function () {
    const A = M("D5:1 E5:1 G5:1 A5:1 B5:2 D6:2 B5:2 A5:2 G5:2 E5:2");
    const B = M("A5:2 B5:2 D6:2 -:2 B5:2 A5:2 G5:2 E5:2");
    const C = M("G5:1 A5:1 B5:1 D6:1 E6:2 D6:2 B5:2 A5:2 G5:2 E5:2");
    const D = M("D5:2 G5:2 A5:2 B5:2 D6:2 F#6:2 A6:4"); // F# 构成 D 大三和弦
    const ch1 = [['D3', 'M'], ['G2', 'M7'], ['A2', 'M'], ['D3', 'M']];
    const ch2 = [['G2', 'M'], ['A2', 'M'], ['B2', 'm'], ['D3', 'M7']];
    MUS.tracks.boss3 = {
      id: 'boss3', title: '千人目の祭囃子 ~ Festival for No One', jp: 'せんにんめのまつりばやし',
      descJa: '祭篝燎のテーマ。D呂音階の明るい五声に羽調式の影を混ぜ、BPM 178。シンセブラス主旋律にサックスの低オクターブを重ねた最も厚い編成、16 分ピアノ、エレピ、バトルドラム。大きな跳躍を伴う上行模進、M7 和音、七度上の転調を経て二拍の完全停止、D 長三和音で締める——遂に誰かが灯しに来た。祭りの熱気は旋律と律動が担う。',
      desc: '祭篝燎主题。D 吕音阶的明快五声里混入羽调式的阴影，BPM 178；主旋律为东方原作常用的合成小号，叠一层低八度萨克斯令厚度最大，配高速 16 分钢琴、电钢与战斗鼓组。动机改为带大跳的上行模进，和声加入大七和弦，转到上方七度后再回主调；高潮连打、骤停两拍，终句以 D 大三和弦收束——终于有人来点灯了。祭典的热闹来自旋律与律动。',
      bpm: 178, key: 'D吕/羽', meter: 16, style: 'matsuri',
      lead: 'brass', arp: 'fast', drums: 'battle', intensity: 1,
      sections: [
        sect({ bars: 4, meter: 16, chords: ch1, lead: cat(A, B, C, D) }),
        sect({ bars: 4, meter: 16, chords: ch2,
          lead: cat(trans(A, 5), inv(C, 79), trans(B, 7), D), fill: true }),
      ],
      order: [0, 0, 1, 0, 1, 1, 0, 1]
    };
  })();

  MUS.order = ['title', 'stage', 'boss1', 'boss2', 'boss3'];

  /* =======================================================
   * 自机大招插入乐句（按符卡序号变调・变奏，故十张符卡各不相同）
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
