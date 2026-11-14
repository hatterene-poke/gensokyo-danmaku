/* ===========================================================
 * data.js — 自机 / 符卡 / 大招 数据
 * 角色沿用东方 Project 原作人物设定，符卡名与弹幕设计全部原创。
 * =========================================================== */
(function () {
  const G = window.G;
  const S = (o) => o; // 语义糖

  /* ---------------------------------------------------------
   * 博麗 霊夢 — 乐园的巫女
   * 原作设定：博丽神社巫女，管理幻想乡大结界，以御札、阴阳玉、
   *           结界与「梦想封印」退治妖怪。性格散漫但直觉敏锐。
   * 本作弹幕倾向：御札 / 结界线 / 祓除 / 对称整齐的和风几何。
   * --------------------------------------------------------- */
  const reimuSpells = [
    S({ name: '霊符「白紙の御札」', jp: 'れいふ・はくしのおふだ', glyph: '札', color: 'red',
      desc: '最基础的御札连射。两列笔直的札弹，低速时收束为一点。',
      shot: { type: 'needle', count: 2, dmg: 11, rate: 5, speed: 720, sprite: 'ofuda', color: 'red', aux: { type: 'orb', count: 1, dmg: 7, rate: 12 } },
      bomb: { name: '大招「祓いの初手」', desc: '以一张空白御札展开净化轮，扫去过近的弹幕。', type: 'nova', color: 'sakura', power: 210, dur: 2.1, radius: 210 } }),
    S({ name: '結界「博麗の境界線」', jp: 'けっかい・はくれいのきょうかいせん', glyph: '界', color: 'crimson',
      desc: '沿结界拉出笔直的光线，贯穿路径上的一切。',
      shot: { type: 'laser', count: 1, dmg: 15, rate: 4, speed: 980, sprite: 'needle', color: 'pink', aux: { type: 'needle', count: 2, dmg: 5, rate: 9 } },
      bomb: { name: '大招「結界展開・内側」', desc: '展开博丽大结界的一瞬，全画面弹幕被弹回并消散。', type: 'seal', color: 'crimson', power: 260, dur: 2.6, radius: 460 } }),
    S({ name: '祓符「紙垂の乱れ」', jp: 'はらいふ・しでのみだれ', glyph: '祓', color: 'sakura',
      desc: '纸垂随风散开，五向广域射击，擅长清理杂鱼。',
      shot: { type: 'spread', count: 5, spread: .62, dmg: 8, rate: 6, speed: 560, sprite: 'petal', color: 'sakura' },
      bomb: { name: '大招「神楽の祓講」', desc: '无数纸垂自中心旋舞而出，将画面染成樱色。', type: 'petal', color: 'sakura', power: 230, dur: 2.5, radius: 340 } }),
    S({ name: '陰陽「二玉の回廊」', jp: 'おんみょう・にぎょくのまわり廊', glyph: '陰', color: 'gold',
      desc: '两颗阴阳玉绕身巡游，接触的敌人被持续削去结界。',
      shot: { type: 'orbit', count: 2, dmg: 9, rate: 4, speed: 165, sprite: 'big', color: 'gold', aux: { type: 'needle', count: 1, dmg: 7, rate: 10 } },
      bomb: { name: '大招「陰陽玉・双界」', desc: '两颗阴阳玉膨胀为双轮，沿轨道碾碎一切符札。', type: 'orbitNova', color: 'gold', power: 275, dur: 2.9, radius: 300 } }),
    S({ name: '巫舞「神楽の拍子」', jp: 'まいふ・かぐらのひょうし', glyph: '舞', color: 'cream',
      desc: '随拍子起伏的波动弹，轨迹如神乐铃的余韵。',
      shot: { type: 'wave', count: 3, dmg: 10, rate: 5, speed: 610, sprite: 'small', color: 'cream', waveA: 46, waveF: 9 },
      bomb: { name: '大招「鈴の連拍」', desc: '铃音化为同心波纹，一层层推开所有弹幕。', type: 'wave', color: 'cream', power: 240, dur: 2.4, radius: 400 } }),
    S({ name: '封印「夢想の綻び」', jp: 'ふういん・むそうのほころび', glyph: '封', color: 'purple',
      desc: '缓慢而沉重的封印大玉，可贯穿多个目标。',
      shot: { type: 'pierce', count: 1, dmg: 24, rate: 11, speed: 430, sprite: 'big', color: 'purple', pierce: 9 },
      bomb: { name: '大招「夢想の綻び・解」', desc: '封印之玉炸开成无数缚札，钉住对手的结界。', type: 'burst', color: 'purple', power: 300, dur: 2.8, radius: 380 } }),
    S({ name: '賽銭「散りゆく銅貨」', jp: 'さいせん・ちりゆくどうか', glyph: '銭', color: 'amber',
      desc: '撒出的铜钱呈扇形飞散，擦过敌阵时四散分裂。',
      shot: { type: 'burst', count: 3, dmg: 9, rate: 8, speed: 520, sprite: 'star', color: 'amber', splitN: 4, splitT: .32 },
      bomb: { name: '大招「賽銭箱・底無し」', desc: '倾覆的赛钱箱倾泻出金币洪流，将敌阵淹没。', type: 'rain', color: 'amber', power: 265, dur: 2.7, radius: 420 } }),
    S({ name: '神符「鳥居の列」', jp: 'しんぷ・とりいのれつ', glyph: '鳥', color: 'red',
      desc: '朱红鸟居化作纵向光柱，正面火力极为集中。',
      shot: { type: 'laser', count: 2, dmg: 17, rate: 5, speed: 1050, sprite: 'ofuda', color: 'red', width: 9, aux: { type: 'spread', count: 3, dmg: 5, rate: 14, spread: .3 } },
      bomb: { name: '大招「千本鳥居」', desc: '朱色光柱接连升起，织成一道无法穿越的神域。', type: 'beam', color: 'red', power: 310, dur: 3.0, radius: 250 } }),
    S({ name: '浄符「結界の呼吸」', jp: 'じょうふ・けっかいのいき', glyph: '浄', color: 'cyan',
      desc: '会自己寻找妖气的净化弹，转弯追向最近的敌人。',
      shot: { type: 'homing', count: 3, dmg: 10, rate: 7, speed: 500, sprite: 'ring', color: 'cyan', homing: 7 },
      bomb: { name: '大招「結界の深呼吸」', desc: '大结界一呼一吸，所有敌弹被吸入一点后归于虚无。', type: 'vortex', color: 'cyan', power: 290, dur: 2.8, radius: 500 } }),
    S({ name: '大結界「幻想の内側」', jp: 'だいけっかい・げんそうのうちがわ', glyph: '幻', color: 'white',
      desc: '把结界本身当作弹幕：十方向齐射，攻守一体。',
      shot: { type: 'cross', count: 10, dmg: 8, rate: 7, speed: 540, sprite: 'ofuda', color: 'white' },
      bomb: { name: '大招「幻想郷の内側」', desc: '将整个幻想乡的边界短暂收拢于掌心，再一并释放。', type: 'nova', color: 'white', power: 360, dur: 3.4, radius: 620 } }),
  ];

  /* ---------------------------------------------------------
   * 霧雨 魔理沙 — 普通的魔法使
   * 原作设定：魔法之森的住人，黑白女巫帽与扫帚，随身迷你八卦炉，
   *           偏爱火力强大、直来直去的星光与魔炮，收集癖。
   * 本作弹幕倾向：星屑 / 魔炮 / 激光 / 蘑菇孢子 / 大火力非对称。
   * --------------------------------------------------------- */
  const marisaSpells = [
    S({ name: '星符「屑星の針」', jp: 'せいふ・くずぼしのはり', glyph: '星', color: 'gold',
      desc: '细密的星屑针，射速全自机最快。',
      shot: { type: 'needle', count: 3, dmg: 9, rate: 3.5, speed: 820, sprite: 'needle', color: 'gold' },
      bomb: { name: '大招「屑星の雨」', desc: '把口袋里的星屑一股脑撒向天空，再一并坠落。', type: 'rain', color: 'gold', power: 220, dur: 2.2, radius: 420 } }),
    S({ name: '魔砲「八卦炉の息」', jp: 'まほう・はっかろのいき', glyph: '砲', color: 'amber',
      desc: '迷你八卦炉全开，一道粗大的光束持续灼烧。',
      shot: { type: 'laser', count: 1, dmg: 26, rate: 5, speed: 1100, sprite: 'big', color: 'amber', width: 16, aux: { type: 'spread', count: 2, dmg: 5, rate: 12, spread: .18 } },
      bomb: { name: '大招「炉心全開」', desc: '不受限制的八卦炉喷出贯穿画面的白色魔炮。', type: 'beam', color: 'amber', power: 340, dur: 3.1, radius: 220 } }),
    S({ name: '光符「交差する星路」', jp: 'こうふ・こうさするせいろ', glyph: '光', color: 'cream',
      desc: '两束斜向光线在敌阵前交叉，交汇处伤害叠加。',
      shot: { type: 'cross', count: 4, dmg: 13, rate: 6, speed: 700, sprite: 'needle', color: 'cream', angleOffset: .5 },
      bomb: { name: '大招「星路の交差点」', desc: '无数光轨交错成网，把整片夜空照亮。', type: 'cross', color: 'cream', power: 270, dur: 2.6, radius: 400 } }),
    S({ name: '菌符「胞子の霧」', jp: 'きんふ・ほうしのきり', glyph: '菌', color: 'green',
      desc: '从魔法森林采来的孢子，缓慢飘散却在命中时炸开。',
      shot: { type: 'burst', count: 4, dmg: 8, rate: 9, speed: 380, sprite: 'small', color: 'green', splitN: 5, splitT: .5, waveA: 25, waveF: 5 },
      bomb: { name: '大招「森の息吹」', desc: '整片森林的孢子一齐萌发，绿色的雾吞没弹幕。', type: 'nova', color: 'green', power: 250, dur: 2.7, radius: 480 } }),
    S({ name: '箒符「夜を掃く軌跡」', jp: 'ほうきふ・よるをはくきせき', glyph: '箒', color: 'violet',
      desc: '扫帚划过的残光呈弧形扩散，覆盖面极广。',
      shot: { type: 'spread', count: 7, spread: 1.0, dmg: 8, rate: 6, speed: 580, sprite: 'petal', color: 'violet' },
      bomb: { name: '大招「夜空の一掃」', desc: '骑着扫帚横扫整片夜空，留下一条空白的轨迹。', type: 'sweep', color: 'violet', power: 275, dur: 2.6, radius: 600 } }),
    S({ name: '魔符「集めし光の欠片」', jp: 'まふ・あつめしひかりのかけら', glyph: '魔', color: 'blue',
      desc: '收集来的光点绕身旋转，越转越亮。',
      shot: { type: 'orbit', count: 3, dmg: 10, rate: 4, speed: 205, sprite: 'star', color: 'blue', aux: { type: 'needle', count: 2, dmg: 6, rate: 8 } },
      bomb: { name: '大招「コレクション全放出」', desc: '把收藏的所有光之碎片一次丢出，爆发成星环。', type: 'orbitNova', color: 'blue', power: 290, dur: 2.9, radius: 330 } }),
    S({ name: '炎符「炉の散火花」', jp: 'えんふ・ろのさんびか', glyph: '炎', color: 'red',
      desc: '炉口飞散的火星，命中后向四周再溅一次。',
      shot: { type: 'burst', count: 2, dmg: 13, rate: 7, speed: 620, sprite: 'fire', color: 'red', splitN: 6, splitT: .28 },
      bomb: { name: '大招「散火花の宴」', desc: '火星连锁爆散，整片画面被橙红的花火填满。', type: 'burst', color: 'red', power: 305, dur: 2.9, radius: 430 } }),
    S({ name: '星符「流星の遅延」', jp: 'せいふ・りゅうせいのちえん', glyph: '流', color: 'cyan',
      desc: '先缓后急的流星弹，加速后无法闪避。',
      shot: { type: 'pierce', count: 2, dmg: 19, rate: 9, speed: 300, sprite: 'star', color: 'cyan', accel: 900, pierce: 5 },
      bomb: { name: '大招「流星群、落下」', desc: '把夜空里所有流星一并拽下，砸向敌阵。', type: 'meteor', color: 'cyan', power: 320, dur: 3.0, radius: 460 } }),
    S({ name: '魔法陣「六芒の収束」', jp: 'まほうじん・ろくぼうのしゅうそく', glyph: '陣', color: 'purple',
      desc: '魔法阵锁定的追踪光弹，六方向同时咬住目标。',
      shot: { type: 'homing', count: 6, dmg: 9, rate: 8, speed: 460, sprite: 'crystal', color: 'purple', homing: 9 },
      bomb: { name: '大招「六芒星・完全展開」', desc: '巨大的六芒魔法阵覆盖战场，阵内一切归于星光。', type: 'seal', color: 'purple', power: 315, dur: 3.0, radius: 520 } }),
    S({ name: '終符「夜空を盗む光」', jp: 'しゅうふ・よぞらをぬすむひかり', glyph: '終', color: 'white',
      desc: '把整片星空的光都借来的一击，火力与范围皆极致。',
      shot: { type: 'cross', count: 12, dmg: 11, rate: 5, speed: 700, sprite: 'star', color: 'white', aux: { type: 'laser', count: 1, dmg: 14, rate: 8 } },
      bomb: { name: '大招「星光、全て頂いた」', desc: '连星星也不放过的最终魔炮，白光吞没整个战场。', type: 'nova', color: 'white', power: 390, dur: 3.6, radius: 700 } }),
  ];

  /* ---------------------------------------------------------
   * 十六夜 咲夜 — 红魔馆的女仆长
   * 原作设定：人类，侍奉吸血鬼，操纵时间程度的能力，
   *           以投掷银刀与停止时间战斗，讲究精确与效率。
   * 本作弹幕倾向：银刀 / 时针刻度 / 对称精确 / 冷色与短促停顿。
   * --------------------------------------------------------- */
  const sakuyaSpells = [
    S({ name: '銀符「十二本の刃」', jp: 'ぎんふ・じゅうにほんのやいば', glyph: '銀', color: 'silver',
      desc: '十二把银刀齐掷，低速时收束成笔直的一列。',
      shot: { type: 'needle', count: 4, dmg: 10, rate: 5, speed: 780, sprite: 'kunai', color: 'silver' },
      bomb: { name: '大招「銀の雨」', desc: '将整柜银刀抛向空中，落下时封死所有退路。', type: 'rain', color: 'silver', power: 230, dur: 2.2, radius: 430 } }),
    S({ name: '時符「秒針の刻み」', jp: 'じふ・びょうしんのきざみ', glyph: '秒', color: 'blue',
      desc: '按秒针节拍射出的等间隔光刃，节拍精准。',
      shot: { type: 'laser', count: 2, dmg: 16, rate: 4, speed: 1000, sprite: 'kunai', color: 'blue', width: 8 },
      bomb: { name: '大招「秒針、一巡」', desc: '秒针走完一圈，期间的弹幕被一并带回原点。', type: 'wave', color: 'blue', power: 260, dur: 2.5, radius: 430 } }),
    S({ name: '幻符「残像の列」', jp: 'げんふ・ざんぞうのれつ', glyph: '幻', color: 'indigo',
      desc: '银刀的残像分三路扩散，像同时有三名女仆在投掷。',
      shot: { type: 'spread', count: 6, spread: .85, dmg: 8, rate: 5, speed: 640, sprite: 'kunai', color: 'indigo' },
      bomb: { name: '大招「十六夜の残影」', desc: '无数残像同时出刀，刀光织成一张密不透风的网。', type: 'cross', color: 'indigo', power: 275, dur: 2.6, radius: 450 } }),
    S({ name: '刻符「時計廻りの刃」', jp: 'こくふ・とけいまわりのやいば', glyph: '刻', color: 'cyan',
      desc: '绕身旋转的刀轮，如钟表指针般匀速巡逻。',
      shot: { type: 'orbit', count: 4, dmg: 9, rate: 4, speed: 230, sprite: 'kunai', color: 'cyan', aux: { type: 'needle', count: 2, dmg: 6, rate: 9 } },
      bomb: { name: '大招「全針、同時」', desc: '时针分针秒针重合的一瞬，刀轮扩张成巨大钟面。', type: 'orbitNova', color: 'cyan', power: 295, dur: 2.9, radius: 360 } }),
    S({ name: '停止「一瞬の間」', jp: 'ていし・いっしゅんのあいだ', glyph: '止', color: 'white',
      desc: '弹丸射出后短暂凝滞再加速，仿佛时间被切开。',
      shot: { type: 'pierce', count: 2, dmg: 20, rate: 10, speed: 250, sprite: 'crystal', color: 'white', accel: 1100, pierce: 7, delay: .16 },
      bomb: { name: '大招「世界、静止」', desc: '时间彻底停止，唯有银刀仍在其间穿行。', type: 'freeze', color: 'white', power: 320, dur: 3.2, radius: 700 } }),
    S({ name: '給仕「紅茶の飛沫」', jp: 'きゅうじ・こうちゃのひまつ', glyph: '茶', color: 'amber',
      desc: '端茶时溅出的飞沫，轨迹呈柔和的波纹。',
      shot: { type: 'wave', count: 4, dmg: 9, rate: 6, speed: 560, sprite: 'small', color: 'amber', waveA: 55, waveF: 11 },
      bomb: { name: '大招「ティータイム」', desc: '优雅地放下茶杯，冲击波以杯为中心层层扩散。', type: 'wave', color: 'amber', power: 250, dur: 2.5, radius: 440 } }),
    S({ name: '刀符「折り返す軌道」', jp: 'とうふ・おりかえすきどう', glyph: '刀', color: 'silver',
      desc: '从画面边缘反弹回来的银刀，角度难以预测。',
      shot: { type: 'burst', count: 3, dmg: 11, rate: 8, speed: 600, sprite: 'kunai', color: 'silver', splitN: 3, splitT: .3 },
      bomb: { name: '大招「無数の折り返し」', desc: '让所有银刀在结界内无限反弹，织出银色风暴。', type: 'sweep', color: 'silver', power: 300, dur: 2.9, radius: 600 } }),
    S({ name: '時符「遅れた分針」', jp: 'じふ・おくれたぶんしん', glyph: '分', color: 'violet',
      desc: '先散开、后收束的追尾光刃，专咬 Boss 的空隙。',
      shot: { type: 'homing', count: 4, dmg: 11, rate: 7, speed: 520, sprite: 'kunai', color: 'violet', homing: 10 },
      bomb: { name: '大招「分針、追いつく」', desc: '被落下的一分钟一齐追上，弹幕在原地凝成碎片。', type: 'vortex', color: 'violet', power: 305, dur: 2.9, radius: 500 } }),
    S({ name: '掃除「埃ひとつ無く」', jp: 'そうじ・ほこりひとつなく', glyph: '掃', color: 'teal',
      desc: '像掸去灰尘一样，把前方扇形区域扫得干干净净。',
      shot: { type: 'spread', count: 9, spread: 1.25, dmg: 8, rate: 5, speed: 600, sprite: 'small', color: 'teal' },
      bomb: { name: '大招「館内、一斉清掃」', desc: '红魔馆大扫除，所有不该存在的东西一并被扫走。', type: 'sweep', color: 'teal', power: 285, dur: 2.8, radius: 640 } }),
    S({ name: '終符「時を刻む銀の世界」', jp: 'しゅうふ・ときをきざむぎんのせかい', glyph: '終', color: 'white',
      desc: '钟面十二刻度同时开火，静止的世界里只有刀光。',
      shot: { type: 'cross', count: 12, dmg: 10, rate: 5, speed: 720, sprite: 'kunai', color: 'white', aux: { type: 'orbit', count: 2, dmg: 8, rate: 6 } },
      bomb: { name: '大招「完全なる停止」', desc: '把整个战场钉在某一秒，然后由自己独自结束这一秒。', type: 'freeze', color: 'white', power: 400, dur: 3.8, radius: 760 } }),
  ];

  /* --------------------------------------------------------- */
  G.CHARS = [
    {
      id: 'reimu', name: '博麗 霊夢', reading: 'はくれい れいむ', title: '楽園の巫女',
      emblem: '巫', color: '#ff5570', sub: '#ffd9e2', hair: '#3a2530', cloth: '#e83858',
      quote: '「また異変？ ……札が一枚、勝手に消えたって？ それなら結界が壊れるより、ずっと始末が悪いわね。」',
      desc: '博丽神社的巫女，掌管隔绝幻想乡与外界的博丽大结界。平日散漫，一旦涉及结界便毫不退让。',
      tactics: '弹幕规整、判定点极小，擅长以结界与御札做对称压制。被击时的决断时间也比他人更从容。',
      stats: { speed: 292, focus: 138, hitR: 2.4, grazeR: 22, dmgScale: 1.0, powerGain: 1.0 },
      spells: reimuSpells
    },
    {
      id: 'marisa', name: '霧雨 魔理沙', reading: 'きりさめ まりさ', title: '普通の魔法使い',
      emblem: '魔', color: '#ffd36a', sub: '#fff3c8', hair: '#f2d98a', cloth: '#1a1626',
      quote: '「札が消える？ ははっ、面白いじゃない。消えた分の光、まとめて頂いてくるよ。」',
      desc: '住在魔法之森的人类魔法使。黑白帽与扫帚、随身迷你八卦炉，信奉「火力就是正义」。',
      tactics: '单发威力与射速最高，弹幕偏向前方集中与星屑扩散。擦弹获得的灵力更多，大招周转更快。',
      stats: { speed: 330, focus: 150, hitR: 2.8, grazeR: 19, dmgScale: 1.12, powerGain: 1.18 },
      spells: marisaSpells
    },
    {
      id: 'sakuya', name: '十六夜 咲夜', reading: 'いざよい さくや', title: '紅魔館のメイド長',
      emblem: '時', color: '#9fd8ff', sub: '#e8f4ff', hair: '#c9d2dd', cloth: '#2a4670',
      quote: '「時間が壊れている……のでしたら、こちらで切り揃えて差し上げます。少々、お待ちを。」',
      desc: '红魔馆的女仆长，人类，拥有操纵时间程度的能力。以银刀与精确地停止时间完成工作。',
      tactics: '银刀弹幕角度刁钻、覆盖面广，移动与低速切换最为顺滑。灵力回复稍慢，但大招威力最高。',
      stats: { speed: 312, focus: 132, hitR: 2.6, grazeR: 21, dmgScale: 0.98, powerGain: 0.94, bombScale: 1.12 },
      spells: sakuyaSpells
    }
  ];

  G.getChar = id => G.CHARS.find(c => c.id === id) || G.CHARS[0];
  G.getSpell = (id, i) => G.getChar(id).spells[i % 10];

  /* 默认编成 */
  G.defaultDeck = id => [0, 1, 2, 3, 9];

  /* 资料室用：原作设定对照说明 */
  /* =========================================================
   * 符卡多样性重排 + 数值平衡
   * 思路：每张符卡指定独立的射击机构（17 种），并按「命中难度」反推
   * 单发威力 —— 越难命中，单发伤害越高、理论 DPS 上限也略高；
   * 越容易命中，单发伤害越低。整体强度保持一致，风险与回报对应。
   *   acc  = 命中率估计（0.32 极难 ～ 0.95 极易）
   *   dps  = 目标有效 DPS × reward，reward = 0.90 + (1-acc)×0.55
   *   dmg  = dps / (每秒弹数 × acc)
   * ========================================================= */
  const VARIETY = {
    /* 博麗霊夢 —— 结界 / 御札 / 阴阳玉 / 祓除 / 封印。
       机构关键词：铺开、扩张、摆动、封印、按拍、成长。没有一发是「单纯直线连射」。 */
    reimu: [
      { t: 'ofuda', acc: .58, n: 2, rate: 5, spd: 720, spr: 'ofuda', m: 'straight',
        waveA: 9, waveF: 5, mul: 1 },
      { t: 'kekkai', acc: .82, n: 9, rate: 9, spd: 340, spr: 'ofuda', m: 'straight',
        spanX: 320, mul: .55 },
      { t: 'yinyangArc', acc: .66, n: 2, rate: 5, spd: 520, spr: 'big', m: 'straight',
        curveAlt: 1.15, mul: .7 },
      { t: 'purifyRing', acc: .74, n: 16, rate: 11, spd: 0, spr: 'ring', m: 'expand',
        rad0: 12, radMax: 280, radSpd: 300, riseSpd: 170, mul: .55 },
      { t: 'seal', acc: .62, n: 2, rate: 9, spd: 330, spr: 'ofuda', m: 'straight',
        onHit: 'seal', mul: .85 },
      { t: 'shide', acc: .76, n: 5, rate: 6, spd: 520, spr: 'petal', m: 'straight',
        spread: .66, splitN: 2, splitT: .3, mul: 1.15 },
      { t: 'torii', acc: .44, n: 3, rate: 6, spd: 1180, spr: 'ofuda', m: 'straight',
        rail: 1, pierce: 8, width: 10, mul: .75 },
      { t: 'kagura', acc: .70, n: 12, rate: 8, spd: 520, spr: 'ofuda', m: 'straight',
        beat: 48, mul: .28 },
      { t: 'homingJade', acc: .90, n: 3, rate: 7, spd: 480, spr: 'ring', m: 'rewind',
        homing: 6, rw1: .55, rw2: 1.0, mul: .8 },
      { t: 'musou', acc: .48, n: 1, rate: 18, spd: 190, spr: 'big', m: 'grow',
        growMax: 26, r: 11, pierce: 9, mul: .85 }
    ],
    /* 霧雨魔理沙 —— 魔炮 / 星屑 / 蓄力 / 非对称大火力。
       机构关键词：集束、巨弹贯穿、交叉、孢子、弧线、卫星、爆雷、流星、螺旋、骤雨。 */
    marisa: [
      { t: 'stardust', acc: .60, n: 3, rate: 3.5, spd: 860, spr: 'needle', m: 'straight',
        convergeX: 1, mul: 1 },
      { t: 'masterSpark', acc: .42, n: 1, rate: 16, spd: 1500, spr: 'big', m: 'straight',
        rail: 1, pierce: 99, r: 26, width: 26, mul: .9 },
      { t: 'crossLaser', acc: .46, n: 4, rate: 6, spd: 700, spr: 'needle', m: 'straight',
        angleOffset: .5, mul: .8 },
      { t: 'spore', acc: .70, n: 4, rate: 9, spd: 360, spr: 'small', m: 'straight',
        splitN: 5, splitT: .5, mul: 1.1 },
      { t: 'broom', acc: .72, n: 7, rate: 6, spd: 560, spr: 'petal', m: 'straight',
        spread: 1.0, curveAlt: .7, mul: .8 },
      { t: 'satelliteFixed', acc: .82, n: 3, rate: 4, spd: 205, spr: 'star', m: 'orbit',
        satellite: 1, satT: .48, orbitY: -105, mul: .4 },
      { t: 'mine', acc: .50, n: 2, rate: 10, spd: 300, spr: 'fire', m: 'mine',
        mineT: .42, splitN: 8, mul: .5 },
      { t: 'meteor', acc: .48, n: 2, rate: 9, spd: 280, spr: 'star', m: 'straight',
        accel: 900, maxSpeed: 1400, pierce: 5, mul: .9 },
      { t: 'spiral', acc: .66, n: 4, rate: 7, spd: 480, spr: 'crystal', m: 'straight',
        curveAlt: 1.5, homing: 1.2, mul: .85 },
      { t: 'shower', acc: .88, n: 6, rate: 6, spd: 620, spr: 'star', m: 'straight', mul: 1 }
    ],
    /* 十六夜咲夜 —— 银刀 / 操纵时间 / 精确刻度。
       机构关键词：齐掷、时停、钟面、残像、倒流、瞬移、跳弹、静止时域、收束、十二刻度。 */
    sakuya: [
      { t: 'knifeVolley', acc: .72, n: 12, rate: 20, spd: 760, spr: 'kunai', m: 'straight',
        spanX: 300, mul: .6 },
      { t: 'timeFreeze', acc: .64, n: 8, rate: 14, spd: 1250, spr: 'kunai', m: 'straight',
        delay: .35, mul: .7 },
      { t: 'clockDial', acc: .56, n: 1, rate: 3, spd: 640, spr: 'kunai', m: 'straight',
        dial: 12, mul: .55 },
      { t: 'afterimage', acc: .84, n: 3, rate: 6, spd: 700, spr: 'kunai', m: 'straight',
        ghosts: 2, spread: .24, mul: 1.5 },
      { t: 'rewind', acc: .60, n: 4, rate: 8, spd: 620, spr: 'kunai', m: 'rewind',
        rw1: .42, rw2: .78, mul: .8 },
      { t: 'chronoLance', acc: .94, n: 3, rate: 10, spd: 1450, spr: 'kunai', m: 'straight',
        pierce: 99, rail: 1, blinkAt: .16, blinkDist: 170, mul: .85 },
      { t: 'ricochet', acc: .54, n: 3, rate: 8, spd: 620, spr: 'kunai', m: 'straight',
        ricochet: 3, mul: .85 },
      { t: 'timeField', acc: .78, n: 12, rate: 11, spd: 330, spr: 'kunai', m: 'straight', mul: .6 },
      { t: 'converge', acc: .68, n: 9, rate: 5, spd: 600, spr: 'small', m: 'straight', mul: 1 },
      { t: 'twelveStrike', acc: .40, n: 12, rate: 12, spd: 700, spr: 'kunai', m: 'straight',
        pierce: 1, mul: .42 }
    ]
  };

  /* 30 种互不重复的射击机构：资料室名称（中 / 日） */
  const KIND = {
    ofuda: ['御札连射·结界呼吸', '御札連射・結界の呼吸'],
    kekkai: ['结界线·横向铺开', '結界線・横一線に敷く'],
    yinyangArc: ['阴阳玉·对称弧射', '陰陽玉・対称の弧'],
    purifyRing: ['祓除·前方展开轮', '祓い・前方に開く輪'],
    seal: ['封印札·残留刻印', '封印札・残留の刻'],
    shide: ['纸垂·二裂之字', '紙垂・二つ裂け'],
    torii: ['鸟居·双柱与移门', '鳥居・双柱と動く門'],
    kagura: ['神乐·拍子齐发', '神楽・拍子一斉'],
    homingJade: ['净化玉·追踪回返', '浄化玉・追尾して戻る'],
    musou: ['梦想封印·成长大玉', '夢想封印・育つ大玉'],
    stardust: ['星屑针·三列集束', '星屑針・三列収束'],
    masterSpark: ['魔炮·一发巨弹贯穿', '魔砲・一発貫通'],
    crossLaser: ['星路·斜向交叉', '星路・斜め交差'],
    spore: ['孢子雾·半途爆散', '胞子霧・途中で弾ける'],
    broom: ['扫帚·弧线扇面', '箒・弧を描く扇'],
    satelliteFixed: ['悬浮炮台·前位点射', '浮遊砲台・前方で点射'],
    mine: ['炉火·滞留爆雷', '炉火・滞留機雷'],
    meteor: ['流星·加速贯穿', '流星・加速貫通'],
    spiral: ['六芒·螺旋咬合', '六芒・螺旋で噛み付く'],
    shower: ['星屑骤雨·自上方坠落', '星屑の驟雨・上から落ちる'],
    knifeVolley: ['银刀·十二把齐掷', '銀刀・十二本一斉'],
    timeFreeze: ['时停·冻结后齐发', '時停・凍らせて一斉'],
    clockDial: ['钟面·十二刻度轮转', '鐘面・十二刻度を回す'],
    afterimage: ['残像·三源同时出刀', '残像・三所から同時'],
    rewind: ['时间倒流·折返再射', '時間逆行・折り返す'],
    chronoLance: ['时穿银枪·中途跃迁', '時穿銀槍・途中で跳ぶ'],
    ricochet: ['壁面跳弹·银刀折返', '壁面跳弾・折り返す'],
    timeField: ['时域远展·十二刻度放射', '時域遠展・十二刻度放射'],
    converge: ['集束·九刀汇于一点', '集束・九刀が一点へ'],
    twelveStrike: ['完全停止·十二刻度全开', '完全なる停止・十二刻度全開']
  };

  G.buildSpells = function () {
    const TARGET = 292;
    for (const c of G.CHARS) {
      c.spells.forEach((sp, i) => {
        const v = VARIETY[c.id][i], sh = sp.shot;
        sh.type = v.t; sh.count = v.n; sh.rate = v.rate; sh.speed = v.spd;
        if (v.spr) sh.sprite = v.spr;
        for (const k of ['m', 'r', 'spread', 'spanX', 'waveA', 'waveF', 'pierce',
          'splitN', 'splitT', 'width', 'accel', 'maxSpeed', 'delay', 'curve', 'curveAlt',
          'homing', 'satellite', 'satT', 'mine', 'mineT', 'charge', 'rail', 'ricochet',
          'angleOffset', 'rad0', 'radMax', 'radSpd', 'rw1', 'rw2', 'growMax', 'onHit',
          'beat', 'dial', 'ghosts', 'convergeX', 'zoneR', 'riseSpd', 'orbitY',
          'blinkAt', 'blinkDist', 'mul']) {
          if (v[k] !== undefined) sh[k] = v[k];
        }
        sh.motion = sh.m || 'straight';
        /* 30 张符卡各自使用独立的大招特效（key = 该符卡的机构名） */
        sp.bomb.fx = sh.type;
        sp.acc = v.acc;                       // 命中难度（越低越难命中）
        sp.accLabel = v.acc >= .85 ? '极易' : v.acc >= .7 ? '易' : v.acc >= .55 ? '中' : v.acc >= .42 ? '难' : '极难';
        sp.accLabelJa = v.acc >= .85 ? '極易' : v.acc >= .7 ? '易' : v.acc >= .55 ? '中' : v.acc >= .42 ? '難' : '極難';
        sp.kindZh = (KIND[v.t] || [v.t, v.t])[0];
        sp.kindJa = (KIND[v.t] || [v.t, v.t])[1];

        /* 每秒实际可命中的弹数估计（考虑机构特性） */
        const mainSPS = 60 / sh.rate * sh.count;
        const auxSPS = sh.aux ? 60 / (sh.aux.rate || 8) * (sh.aux.count || 1) : 0;
        /* mul 由各机构给出：只有一部分弹真正落在 Boss 判定的有效比例 */
        const sps = mainSPS * (v.mul || 1) + auxSPS * .7;
        /* 难命中 → 单发威力与理论 DPS 同时提高，风险与回报对应 */
        const reward = .90 + (1 - v.acc) * .55;
        const dmg = G.M.clamp(Math.round(TARGET * reward / (sps * v.acc) * 10) / 10, 2.5, 80);
        sh.dmg = dmg;
        if (sh.aux) sh.aux.dmg = Math.round(dmg * .6 * 10) / 10;
        sp.dps = Math.round(TARGET * reward);
        sp.dpsReal = Math.round(dmg * sps * v.acc);
        sp.bomb.power = Math.round(210 + (1 - v.acc) * 90 + (i === 9 ? 110 : 0));
      });
    }
  };
  G.buildSpells();
  G.SHOT_KINDS = KIND;

  G.LORE = {
    premise: '本作是向《东方 Project》致敬的原创二次创作风弹幕射击。登场自机沿用原作人物设定；敌人、Boss、剧情、符卡名、弹幕设计、音乐均为本作原创。',
    premiseJa: '本作は『東方 Project』へのオマージュとして制作した、オリジナル二次創作風の弾幕シューティングである。自機は原作の設定に準拠し、敵・Boss・脚本・符卡名・弾幕設計・音楽は全て本作オリジナル。',
    rule: 'ZUN 式符卡规则：以「符卡」为单位的决斗，而非单纯互相射击。本作将其进一步扭曲——符卡会自行耗尽时间、结界会自行剥落，这正是本次异变的根源。',
    ruleJa: 'ZUN 式の符卡規則：単なる撃ち合いではなく、「符卡」を単位とした決闘である。本作ではこれを更に捻じ曲げた——符卡は自ら時間を尽き、結界は自ら剥がれ落ちる。これが本異変の根源である。',
    music: '所有 BGM 由 Web Audio 振荡器实时合成，谱面为独立写作的原创旋律。作曲上参考考据所得的东方音乐特征：带变宫的六声羽调式、小号主旋律、高速钢琴琶音、功能性三和弦与半音中音关系、两拍骤停、短循环与动机模进。未使用任何原作音频或旋律。',
    musicJa: '全 BGM は Web Audio の発振器によるリアルタイム合成で、譜面は独自に書いたオリジナル旋律である。作曲には考拠から得た東方音楽の特徴——変宮を含む六声羽調式、トランペット主体の旋律、高速ピアノのアルペジオ、機能的三和音と半音的中音関係、二拍の急停止、短いループと動機の模進——を参考にした。原作の音源・旋律は一切使用していない。'
  };
})();
