/* ===========================================================
 * data.js — 自机 / 符卡 / 大招 数据
 * 角色沿用东方 Project 原作人物设定；本轮 15 张符卡按制作人指定的
 * 机构逐张重写，每张的高速 / 低速形态、五张飞刀的不同贴图、以及
 * 分阶段大招（2 秒无敌 → 全屏伤害＋清弹 → 专属持续效果）都在
 * game.js 的 emitter / tickSpell / tickBomb 中逐行实现。
 * =========================================================== */
(function () {
  const G = window.G;
  const S = (o) => o;

  const reimuSpells = [
    S({
      name: '灵符「梦想封印」', jp: 'れいふ・むそうふういん', glyph: '封', color: 'sakura',
      cat: 'homing', catZh: '追踪＋集束', catJa: '追尾＋集束',
      accLabel: '易', accLabelJa: '易', dps: 820,
      desc: '高速时放出追踪灵符，并附一小撮高伤害封魔针；低速时全力发射集束封魔针。',
      descJa: '高速では追尾する霊符と高威力の封魔針、低速では集束した封魔針を全開で放つ。',
      kindZh: '追踪灵符＋集束封魔针', kindJa: '追尾霊符＋集束封魔針',
      shot: { type: 'ofuda', count: 2, rate: 4, speed: 1600, dmg: 13, sprite: 'ofuda', color: 'sakura' },
      bomb: { name: '大招「梦想封印・全解放」', desc: '2 秒无敌后全屏伤害并清弹，召来十颗彩色光球绕身，2 秒后一齐射出。',
        type: 'nova', color: 'sakura', power: 340, dur: 4, radius: 620, fx: 'ofuda', script: 'dreamSeal' }
    }),
    S({
      name: '乱符「混乱符咒」', jp: 'らんふ・こんらんふじゅ', glyph: '乱', color: 'crimson',
      cat: 'wide', catZh: '法阵散射', catJa: '法陣散射',
      accLabel: '中', accLabelJa: '中', dps: 780,
      desc: '水平对称架起五个法阵。高速时每秒射出 12 张随机偏转 30 度的符纸；低速时五阵收束到身后合为一大阵，每秒 60 张。',
      descJa: '水平対称に五つの法陣。高速では毎秒 12 枚、低速では背後の大法陣から毎秒 60 枚。',
      kindZh: '五法阵 / 大法阵', kindJa: '五法陣 / 大法陣',
      shot: { type: 'kekkai', count: 5, rate: 5, speed: 1500, dmg: 15, sprite: 'ofuda', color: 'crimson' },
      bomb: { name: '大招「万札乱舞」', desc: '2 秒无敌后全屏伤害并清弹，2 秒内每秒自法阵额外射出 300 张符。',
        type: 'rain', color: 'crimson', power: 340, dur: 2, radius: 700, fx: 'kekkai', script: 'chaos' }
    }),
    S({
      name: '极符「阴阳宝玉」', jp: 'きょくふ・おんみょうほうぎょく', glyph: '陰', color: 'gold',
      cat: 'orbit', catZh: '环绕冲撞', catJa: '周回突撃',
      accLabel: '中', accLabelJa: '中', dps: 800,
      desc: '两颗位置对称、超高速旋转的黑白宝玉（黑球泛白光、白球泛黑光）。按住开火键时，高速自动调整旋转半径攻击敌人，低速锁定敌人来回冲撞。',
      descJa: '対称に超高速周回する黒白の宝玉。射撃中、高速では半径を調整して攻め、低速では敵へ往復突撃する。',
      kindZh: '阴阳宝玉·环绕', kindJa: '陰陽宝玉・周回',
      shot: { type: 'purifyRing', count: 2, rate: 4, speed: 1700, dmg: 22, sprite: 'big', color: 'gold' },
      bomb: { name: '大招「太极・四秒沉默」', desc: '2 秒无敌后全屏伤害并清弹，浮现太极图案，4 秒内沉默所有敌人。',
        type: 'seal', color: 'white', power: 340, dur: 4, radius: 560, fx: 'purifyRing', script: 'yinyang' }
    }),
    S({
      name: '界符「弹幕结界」', jp: 'かいふ・だんまくけっかい', glyph: '界', color: 'cyan',
      cat: 'wide', catZh: '扩散冲击波', catJa: '拡散衝撃波',
      accLabel: '易', accLabelJa: '易', dps: 760,
      desc: '自身不断向外扩散冲击波造成伤害，高低速效果相同。',
      descJa: '自身から絶えず衝撃波を拡散させてダメージを与える。高速・低速とも同じ。',
      kindZh: '结界冲击波', kindJa: '結界の衝撃波',
      shot: { type: 'torii', count: 1, rate: 5, speed: 1500, dmg: 18, sprite: 'ring', color: 'cyan' },
      bomb: { name: '大招「结界・八秒守护」', desc: '2 秒无敌后全屏伤害并清弹，获得屏蔽敌弹的护盾，持续 8 秒。',
        type: 'seal', color: 'cyan', power: 340, dur: 8, radius: 480, fx: 'torii', script: 'barrier' }
    }),
    S({
      name: '钱符「下次一定省赛钱」', jp: 'せんふ・つぎはけっさいせん', glyph: '銭', color: 'amber',
      cat: 'line', catZh: '成长／扇形', catJa: '成長／扇型',
      accLabel: '易', accLabelJa: '易', dps: 800,
      desc: '高速时一条直线发射不断变大的赛钱；低速时改为扇形发射一圈大小不变的赛钱。',
      descJa: '高速では真っ直ぐに育つ賽銭、低速では大きさの変わらぬ賽銭を扇状に撒く。',
      kindZh: '成长赛钱 / 扇形赛钱', kindJa: '育つ賽銭 / 扇の賽銭',
      shot: { type: 'homingJade', count: 1, rate: 5, speed: 1600, dmg: 24, sprite: 'star', color: 'amber' },
      bomb: { name: '大招「赛钱箱・底拔」', desc: '2 秒无敌后全屏伤害并清弹，从 Boss 身上偷取 5000 分。',
        type: 'rain', color: 'amber', power: 340, dur: .5, radius: 520, fx: 'homingJade', script: 'coin' }
    })
  ];

  const marisaSpells = [
    S({
      name: '恋符「极限火花」', jp: 'こいふ・きょくげんひばな', glyph: '恋', color: 'white',
      cat: 'line', catZh: '魔炮激光', catJa: '魔砲レーザー',
      accLabel: '易', accLabelJa: '易', dps: 850,
      desc: '高速时射出带彩色线段修饰的白色激光；低速时激光更细、伤害更高。',
      descJa: '高速では色とりどりの線を纏う白いレーザー、低速では細くなり威力が上がる。',
      kindZh: '极限火花·魔炮', kindJa: '極限火花・魔砲',
      shot: { type: 'stardust', count: 1, rate: 4, speed: 1700, dmg: 46, sprite: 'needle', color: 'white' },
      bomb: { name: '大招「极限火花・全开」', desc: '2 秒无敌后全屏伤害并清弹，持续 3 秒发射占据半个屏幕的超大号激光。',
        type: 'beam', color: 'white', power: 340, dur: 3, radius: 620, fx: 'stardust', script: 'masterSparkB' }
    }),
    S({
      name: '魔符「非定向激光」', jp: 'まふ・ひていこうレーザー', glyph: '魔', color: 'cream',
      cat: 'wide', catZh: '乱扫激光', catJa: '乱扫レーザー',
      accLabel: '中', accLabelJa: '中', dps: 800,
      desc: '高速时发射四条细激光随机快速扫射；低速时集中向前。',
      descJa: '高速では四本の細いレーザーが素早く乱扫し、低速では前方へ集中する。',
      kindZh: '四线乱扫 / 前向集中', kindJa: '四線乱扫 / 前方集中',
      shot: { type: 'masterSpark', count: 4, rate: 2, speed: 1700, dmg: 18, sprite: 'needle', color: 'cream' },
      bomb: { name: '大招「十二线狂扫」', desc: '2 秒无敌后全屏伤害并清弹，12 条激光极速乱扫 3 秒。',
        type: 'cross', color: 'cream', power: 340, dur: 3, radius: 700, fx: 'masterSpark', script: 'laserMad' }
    }),
    S({
      name: '星符「好多流星」', jp: 'せいふ・たくさんりゅうせい', glyph: '星', color: 'cyan',
      cat: 'line', catZh: '加速流星', catJa: '加速流星',
      accLabel: '易', accLabelJa: '易', dps: 810,
      desc: '直线发射不断加速的流星弹（初速仍可在 0.5 秒内离屏）。高速时从自身水平一定宽度内随机位置发射，低速时固定从自身中心发射；命中后迸出星星特效。',
      descJa: '加速し続ける流星を直線発射（初速は 0.5 秒で画面外）。高速では横幅内ランダム、低速では中心固定。命中時に星が弾ける。',
      kindZh: '加速流星·星星命中特效', kindJa: '加速流星・星の命中エフェクト',
      shot: { type: 'shower', count: 1, rate: 4, rateFast: 1.6, rateFocus: 2.67,
        speed: 1500, dmg: 30, sprite: 'star', color: 'cyan' },
      bomb: { name: '大招「大流星・中心爆」', desc: '2 秒无敌后全屏伤害并清弹，发射一枚大流星在屏幕中心爆炸。',
        type: 'meteor', color: 'cyan', power: 340, dur: .6, radius: 640, fx: 'shower', script: 'bigMeteor' }
    }),
    S({
      name: '光符「坠落的繁星」', jp: 'こうふ・ついらくのはんじょう', glyph: '光', color: 'gold',
      cat: 'homing', catZh: '锁定激光', catJa: 'ロックオンレーザー',
      accLabel: '易', accLabelJa: '易', dps: 800,
      desc: '从自身两侧发射锁定敌人的激光，高低速均自动索敌。',
      descJa: '自身の左右から敵をロックオンするレーザーを放つ。高速・低速とも自動照準。',
      kindZh: '双侧锁定激光', kindJa: '両側ロックオンレーザー',
      shot: { type: 'spiral', count: 2, rate: 4, speed: 1650, dmg: 24, sprite: 'needle', color: 'gold' },
      bomb: { name: '大招「六芒星・六角齐射」', desc: '2 秒无敌后全屏伤害并清弹，6 秒内由六边形六个角各发射一道激光。',
        type: 'cross', color: 'gold', power: 340, dur: 6, radius: 640, fx: 'spiral', script: 'hexLaser' }
    }),
    S({
      name: '天符「浮游炮」', jp: 'てんふ・ふゆうほう', glyph: '天', color: 'blue',
      cat: 'orbit', catZh: '浮游炮', catJa: '浮遊砲',
      accLabel: '易', accLabelJa: '易', dps: 800,
      desc: '三个浮游炮绕自身旋转并自动索敌发射能量弹；按住开火键时自身向前发射星星子弹。',
      descJa: '三基の浮遊砲が周回しつつ自動索敵で撃つ。射撃キーで前方へ星弾を放つ。',
      kindZh: '三浮游炮＋星弹', kindJa: '三浮遊砲＋星弾',
      shot: { type: 'meteor', count: 3, rate: 4, rateFast: 1.6, rateFocus: 2.67,
        speed: 1600, dmg: 20, sprite: 'star', color: 'blue' },
      bomb: { name: '大招「浮游炮・超负荷」', desc: '2 秒无敌后全屏伤害并清弹，6 秒内浮游炮加速旋转并超高速开火。',
        type: 'orbitNova', color: 'blue', power: 340, dur: 6, radius: 520, fx: 'meteor', script: 'satelliteBoost' }
    })
  ];

  /* 咲夜五张飞刀：贴图 / 颜色 / 光轨各不相同 */
  const sakuyaSpells = [
    S({
      name: '时符「围绕的飞刀」', jp: 'じふ・めぐるナイフ', glyph: '囲', color: 'silver',
      cat: 'homing', catZh: '延时狙击', catJa: '遅延狙撃',
      accLabel: '易', accLabelJa: '易', dps: 810,
      desc: '开火时飞刀在目标身旁一定距离内随机浮现，0.3 秒后朝目标直线飞出并穿透。银色苦无。',
      descJa: '射撃とともに敵の周囲へナイフが現れ、0.3 秒後に真っ直ぐ貫通する。銀の苦無。',
      kindZh: '银苦无·延时贯穿', kindJa: '銀苦無・遅延貫通',
      shot: { type: 'knifeVolley', count: 3, rate: 5, speed: 1600, dmg: 17.6, sprite: 'kunai', color: 'silver' },
      bomb: { name: '大招「世界・静止」', desc: '2 秒无敌后全屏伤害并清弹，时间停止 2 秒（扭曲＋负片），期间敌人身旁浮现大量飞刀，时停解除时一齐射出。',
        type: 'freeze', color: 'white', power: 340, dur: 2, radius: 700, fx: 'knifeVolley', script: 'timeStopKnives' }
    }),
    S({
      name: '刀符「刀扇飞舞」', jp: 'とうふ・とうせんひまう', glyph: '扇', color: 'blue',
      cat: 'wide', catZh: '扇形飞刀', catJa: '扇型ナイフ',
      accLabel: '易', accLabelJa: '易', dps: 790,
      desc: '扇形发射大量飞刀，低速时刀扇会收拢一些。蓝色针状飞刀、带自转。',
      descJa: '扇状に多数のナイフを放ち、低速では扇が少し収まる。青い針状の刃が回転する。',
      kindZh: '蓝针刀扇·自转', kindJa: '青針の刀扇・自転',
      shot: { type: 'chronoLance', count: 11, rate: 4, speed: 1600, dmg: 14, sprite: 'needle', color: 'blue' },
      bomb: { name: '大招「千刃一闪」', desc: '2 秒无敌后全屏伤害并清弹，1 秒内高频率发射超高速密集扇形飞刀。',
        type: 'sweep', color: 'blue', power: 340, dur: 1, radius: 640, fx: 'chronoLance', script: 'knifeFanBurst' }
    }),
    S({
      name: '速符「宴请八方」', jp: 'そくふ・えんせいはっぽう', glyph: '八', color: 'indigo',
      cat: 'wide', catZh: '八方弹射', catJa: '八方跳弾',
      accLabel: '中', accLabelJa: '中', dps: 780,
      desc: '向八个方向投掷飞刀，八方向持续快速旋转，飞刀会在屏幕边缘弹射 3 次。靛色晶体刃。',
      descJa: '八方向へナイフを投げ、その八方が高速回転。刃は画面端で三回跳弾する。藍の結晶刃。',
      kindZh: '靛晶八方·三跳弹', kindJa: '藍晶八方・三跳弾',
      shot: { type: 'timeField', count: 8, rate: 5, speed: 1550, dmg: 40, sprite: 'crystal', color: 'indigo' },
      bomb: { name: '大招「八方・中心迸发」', desc: '2 秒无敌后全屏伤害并清弹，从自身中心迸发一道冲击波造成伤害。',
        type: 'nova', color: 'indigo', power: 340, dur: .5, radius: 700, fx: 'timeField', script: 'shockwave' }
    }),
    S({
      name: '幻符「逆转的时钟」', jp: 'げんふ・ぎゃくてんのとけい', glyph: '幻', color: 'violet',
      cat: 'homing', catZh: '十二刻度追踪', catJa: '十二刻度追尾',
      accLabel: '易', accLabelJa: '易', dps: 790,
      desc: '自身周围定出 12 个时钟位置，1 秒内逆时针轮流发射一枚跟踪飞刀。紫色镜刃。',
      descJa: '周囲に十二の時計位置を定め、一秒で反時計回りに追尾ナイフを順に放つ。紫の鏡刃。',
      kindZh: '紫镜十二刻度·追踪', kindJa: '紫鏡十二刻度・追尾',
      shot: { type: 'clockDial', count: 12, rate: 5, speed: 1550, dmg: 18, sprite: 'mirror', color: 'violet' },
      bomb: { name: '大招「时间逆行・五度传送」', desc: '2 秒无敌后全屏伤害并清弹，时间停止 2 秒（扭曲＋负片），期间传送 5 次、每次在十二刻度召唤飞刀，最后传回原位，时停结束后一齐射出。',
        type: 'freeze', color: 'violet', power: 340, dur: 2, radius: 700, fx: 'clockDial', script: 'reverseClock' }
    }),
    S({
      name: '奇符「堂堂正正的对决」', jp: 'きふ・どうどうせいせいのたいけつ', glyph: '正', color: 'white',
      cat: 'line', catZh: '三刀正面', catJa: '三刀正面',
      accLabel: '易', accLabelJa: '易', dps: 830,
      desc: '前方直线快速射出一枚高伤害飞刀，左右各一枚不断扫射的高伤害飞刀；低速时三把一齐向前。白色星刃。',
      descJa: '前方へ高威力の一刀、左右に掃射する二刀。低速では三刀が揃って前方へ。白い星刃。',
      kindZh: '白星三刀·正面决斗', kindJa: '白星三刀・正面決闘',
      shot: { type: 'rewind', count: 3, rate: 4, speed: 1700, dmg: 26, sprite: 'star', color: 'white' },
      bomb: { name: '大招「决斗・三倍连射」', desc: '2 秒无敌后全屏伤害并清弹，自机发射速度变为 3 倍，持续 4 秒。',
        type: 'sweep', color: 'white', power: 340, dur: 4, radius: 560, fx: 'rewind', script: 'tripleFire' }
    })
  ];

  G.CHARS = [
    {
      id: 'reimu', name: '博麗 霊夢', reading: 'はくれい れいむ', title: '楽園の巫女',
      emblem: '巫', color: '#ff5570', sub: '#ffd9e2', hair: '#3a2530', cloth: '#e83858',
      quote: '「また異変？ ……札が一枚、勝手に消えたって？ それなら結界が壊れるより、ずっと始末が悪いわね。」',
      desc: '博丽神社的巫女，掌管隔绝幻想乡与外界的博丽大结界。平日散漫，一旦涉及结界便毫不退让。',
      tactics: '五张符卡涵盖追踪灵符、五法阵散射、阴阳宝玉环绕、结界冲击波与赛钱；高低速形态差异明显。',
      stats: { speed: 350, focus: 110, hitR: 2.4, grazeR: 22, dmgScale: 1.0, powerGain: 1.0 },
      spells: reimuSpells
    },
    {
      id: 'marisa', name: '霧雨 魔理沙', reading: 'きりさめ まりさ', title: '普通の魔法使い',
      emblem: '魔', color: '#ffd36a', sub: '#fff3c8', hair: '#f2d98a', cloth: '#1a1626',
      quote: '「札が消える？ ははっ、面白いじゃない。消えた分の光、まとめて頂いてくるよ。」',
      desc: '住在魔法之森的人类魔法使。黑白帽与扫帚、随身迷你八卦炉，信奉「火力就是正义」。',
      tactics: '五张符卡以激光与流星为主：魔炮、乱扫、加速流星、锁定激光与浮游炮；正面火力最猛。',
      stats: { speed: 396, focus: 120, hitR: 2.8, grazeR: 19, dmgScale: 1.12, powerGain: 1.18 },
      spells: marisaSpells
    },
    {
      id: 'sakuya', name: '十六夜 咲夜', reading: 'いざよい さくや', title: '紅魔館のメイド長',
      emblem: '時', color: '#9fd8ff', sub: '#e8f4ff', hair: '#c9d2dd', cloth: '#2a4670',
      quote: '「時間が壊れている……のでしたら、こちらで切り揃えて差し上げます。少々、お待ちを。」',
      desc: '红魔馆的女仆长，人类，拥有操纵时间程度的能力。以银刀与精确地停止时间完成工作。',
      tactics: '五张符卡皆用飞刀，但贴图与轨迹各不相同：银苦无、蓝针、靛晶、紫镜、白星；擅长时停与正面决斗。',
      stats: { speed: 374, focus: 106, hitR: 2.6, grazeR: 21, dmgScale: 0.98, powerGain: 0.94, bombScale: 1.12 },
      spells: sakuyaSpells
    }
  ];

  G.getChar = id => G.CHARS.find(c => c.id === id) || G.CHARS[0];
  G.getSpell = (id, i) => G.getChar(id).spells[i % 5];
  G.defaultDeck = id => [0, 1, 2, 3, 4];

  const KIND = {
    ofuda: ['追踪灵符＋集束封魔针', '追尾霊符＋集束封魔針'],
    kekkai: ['五法阵 / 大法阵', '五法陣 / 大法陣'],
    purifyRing: ['阴阳宝玉·环绕', '陰陽宝玉・周回'],
    torii: ['结界冲击波', '結界の衝撃波'],
    homingJade: ['成长赛钱 / 扇形赛钱', '育つ賽銭 / 扇の賽銭'],
    stardust: ['极限火花·魔炮', '極限火花・魔砲'],
    masterSpark: ['四线乱扫 / 前向集中', '四線乱扫 / 前方集中'],
    shower: ['加速流星·星星命中', '加速流星・星の命中'],
    spiral: ['双侧锁定激光', '両側ロックオンレーザー'],
    meteor: ['三浮游炮＋星弹', '三浮遊砲＋星弾'],
    knifeVolley: ['银苦无·延时贯穿', '銀苦無・遅延貫通'],
    chronoLance: ['蓝针刀扇·自转', '青針の刀扇・自転'],
    timeField: ['靛晶八方·三跳弹', '藍晶八方・三跳弾'],
    clockDial: ['紫镜十二刻度·追踪', '紫鏡十二刻度・追尾'],
    rewind: ['白星三刀·正面决斗', '白星三刀・正面決闘']
  };
  G.SHOT_KINDS = KIND;

  G.buildSpells = function () {
    for (const c of G.CHARS) {
      c.spells.forEach((sp) => {
        sp.kindZh = (KIND[sp.shot.type] || [sp.shot.type, sp.shot.type])[0];
        sp.kindJa = (KIND[sp.shot.type] || [sp.shot.type, sp.shot.type])[1];
        sp.bomb.fx = sp.bomb.fx || sp.shot.type;
        sp.catLabel = sp.catZh;
        sp.catLabelJa = sp.catJa;
      });
    }
  };
  G.buildSpells();

  G.LORE = {
    premise: '本作是向《东方 Project》致敬的原创二次创作风弹幕射击。登场自机沿用原作人物设定；敌人、Boss、剧情、符卡名、弹幕设计、音乐均为本作原创。',
    premiseJa: '本作は『東方 Project』へのオマージュとして制作した、オリジナル二次創作風の弾幕シューティングである。自機は原作の設定に準拠し、敵・Boss・脚本・符卡名・弾幕設計・音楽は全て本作オリジナル。',
    rule: 'ZUN 式符卡规则：以「符卡」为单位的决斗，而非单纯互相射击。本作将其进一步扭曲——符卡会自行耗尽时间、结界会自行剥落，这正是本次异变的根源。',
    ruleJa: 'ZUN 式の符卡規則：単なる撃ち合いではなく、「符卡」を単位とした決闘である。本作ではこれを更に捻じ曲げた——符卡は自ら時間を尽き、結界は自ら剥がれ落ちる。これが本異変の根源である。',
    music: '所有 BGM 由 Web Audio 振荡器实时合成，谱面为独立写作的原创旋律。五首均以钢琴担任主奏，辅以电钢和弦、贝斯根音、弦乐铺底、鼓组与铜管点缀；作曲参考考据所得的东方音乐特征：带变宫的六声羽调式、高速钢琴琶音、功能性三和弦与半音中音关系、两拍骤停、动机模进与转调。每首为约三分钟一次性展开的完整曲式（呈示→模进→转调→发展→骤停→再现→终止），不再是二十秒的短循环。未使用任何原作音频或旋律。',
    musicJa: '全 BGM は Web Audio の発振器によるリアルタイム合成で、譜面は独自に書いたオリジナル旋律である。五曲はいずれもピアノを主奏とし、エレピの和音・ベースの根音・弦のパッド・ドラム・ブラスの彩りを添える。作曲には考拠から得た東方音楽の特徴——変宮を含む六声羽調式、高速ピアノのアルペジオ、機能的三和音と半音的中音関係、二拍の急停止、動機の模進と転調——を参考にした。各曲は約三分間の一度きりの展開（提示→模進→転調→展開→急停止→再現→終止）で、二十秒の短いループではない。原作の音源・旋律は一切使用していない。'
  };
})();
