/* ===========================================================
 * bosses.js — 原创 Boss / 符卡脚本（工整造型弹重做版）
 * type = 'timeout'  : 固定时间结束（生存型，时间到即通过）
 * type = 'barrier'  : 结界条清空结束（另有较长的兜底时限）
 * 击破全部符卡 → 击败 Boss
 *
 * 【造型原则】参考东方原版 Spell Card 的「工整造型弹」：
 *   花瓣（華符「仙桃蓮花」）、多重光轮（彩符「孔雀七輪星」）、
 *   星型与波纹、中轴对称的 n-way、k 重万花筒、节拍环、椭圆行列。
 *   每一发都落在等距、闭合、可阅读的几何上；不再用随机散弹铺场。
 *
 * 【四档难度修饰】除了图案库自身的结构化密度，每张符卡另按
 *   Easy / Normal / Hard / Lunatic 显式叠加不同的「造型构件」：
 *     Easy    素环单色、层数最少、留白最多
 *     Normal  双色交替的第二层 + 一圈反向旋转的内环
 *     Hard    第三层 + 自机狙的等距 n-way + 曲线环
 *     Lunatic 第四层 + 左右镜像分身环 + 星型内圈 + 激光轮
 *   参考原作同一符卡按难度改名换形（「返魂蝶 一分咲～八分咲」）的做法。
 * =========================================================== */
(function () {
  const G = window.G, P = G.PAT, M = G.M, TAU = G.TAU;
  const T = P.T;
  const B = G.BOSSES = {};
  B.list = [];

  /* 难度档位：0=Easy 1=Normal 2=Hard 3=Lunatic */
  function tier() {
    const id = G.diff ? G.diff.id : 'normal';
    return id === 'easy' ? 0 : id === 'hard' ? 2 : id === 'lunatic' ? 3 : 1;
  }

  /* 常用：Boss 在场地中缓慢游走 */
  function drift(b, f, cx, cy, ax, ay, sp) {
    b.setTarget(cx + Math.sin(f * sp) * ax, cy + Math.sin(f * sp * .63 + 1.2) * ay);
  }

  /* =========================================================
   * 一面 BOSS：綴屋 千代（つづりや ちよ）
   * 墨与纸凝成的「纹样」——同心光轮 / 六瓣花 / 方格阵 / 星型。
   * ========================================================= */
  const chiyo = {
    id: 'chiyo', name: '綴屋 千代', reading: 'つづりや ちよ',
    title: '書き損じの付喪神', emblem: '綴', music: 'boss1',
    color: '#9a7fc0', sub: '#e7dcf5', hair: '#3a2a48', robe: '#5d4479',
    palette: ['#2b1c3e', '#4a2f5e', '#8a6aa8'], bg: 'ink',
    quote: '「その名前、書き損じですの。だから、消しますの。」',
    desc: '被写下又立刻被划掉的字，在结界内侧积成了厚厚一叠。最上面的一张睁开眼睛，便成了她。她不憎恨谁，只是执着地把所有写错的名字逐一抹去。',
    lore: '付丧神（器物经百年而具灵）沿用幻想乡原作设定；本作将其设定为由「残札」诞生。墨迹在纸上洇开时自然形成同心轮与花瓣，她的弹幕便是这些工整纹样。',
    maxSpells: 4,
    spells: [
      {
        name: '筆符「書きかけの一画」', jp: 'ひつふ・かきかけのいちが',
        type: 'timeout', duration: 23, timeout: 23,
        declare: '「一画ずつ。……消す前に、ちゃんと書いておきますの。」',
        hint: '时限符卡 · 等距同心光轮一层层洇开',
        hintJa: '時限符卡 · 等間隔の同心光輪が一枚ずつ滲む',
        style: '参考原作：多重光轮（彩符「孔雀七輪星」）与六瓣花（華符「仙桃蓮花」）的等距闭合造型',
        styleJa: '参考：多重光輪（彩符「孔雀七輪星」）と六弁花（華符「仙桃蓮花」）の等間隔な閉じた形',
        bgTint: '#2b1c3e',
        intro(b) { b.setTarget(G.PF.w / 2, 160); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 158, 95, 26, .005);
          const t = tier();
          /* 主造型（本符唯一母题）：一笔挥成缓缓旋转的六瓣墨花。
             层间错开半瓣、外快内慢，整体是一朵可辨认的花。 */
          if (f % 64 === 0) {
            const k = Math.floor(f / 64);
            P.petalSpiral(T('ink', {
              x: b.x, y: b.y, n: 24, layers: t === 0 ? 1 : t >= 2 ? 3 : 2,
              petals: 6, speed: 128, speedStep: 22,
              spinDir: t === 3 ? -1 : 1, spinSpd: .12,
              a0: k * .14, curve: .08,
              colors: t === 0 ? ['violet'] : t === 1 ? ['violet', 'cream']
                : t === 2 ? ['violet', 'cream', 'ink'] : ['violet', 'cream', 'ink', 'gold'],
              type: 'ink', r: 6, life: 12
            }));
          }
          /* 副造型：花心向外荡开一圈同心波纹，补足「墨洇」的层次 */
          if (f % 128 === 64) P.waveRings(T('cream', {
            x: b.x, y: b.y, n: 20, rings: 2, r0: 14, gap: 26,
            speed: 120, ringDelay: .08, colors: ['cream', 'gold'],
            type: 'orb', r: 5, life: 11
          }));
          /* 两拍骤停：第 10～12 秒完全不发弹，像笔尖悬在纸上 */
          if (f > 600 && f < 720) return;
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：一圈反向旋转的细内环，与外层光轮反向咬合
            if (f % 64 === 32) P.ring(T('cream', {
              x: b.x, y: b.y, n: 12, speed: 96, a0: -f * .006,
              ripple: .02, r: 5, life: 12
            }));
          } else if (t === 2) {
            // Hard：第三层曲线环 + 五发等距自机狙
            if (f % 64 === 32) P.curveRing(T('violet', {
              x: b.x, y: b.y, n: 16, curve: .22, speed: 126,
              a0: f * .005, r: 6, life: 12
            }));
            if (f % 192 === 96) P.fan(T('ink', {
              x: b.x, y: b.y, n: 5, spread: .52, aim: true,
              speed: 148, r: 6, color: 'ink'
            }));
          } else if (t === 3) {
            // Lunatic：左右镜像分身各一圈小花环 + 五角星速度分布内圈
            if (f % 64 === 32) {
              for (const side of [-1, 1]) P.ring(T('crystal', {
                x: b.x + side * 168, y: b.y + 18, n: 10, speed: 104,
                a0: -side * f * .007, r: 5, color: side < 0 ? 'ink' : 'cream', life: 11
              }));
              P.star(T('ofuda', {
                x: b.x, y: b.y, n: 20, points: 5, speed: 108,
                a0: -f * .006, r: 6, color: 'gold', life: 12
              }));
            }
          }
        }
      },
      {
        name: '文符「縦書きの雨」', jp: 'ぶんふ・たてがきのあめ',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「文字は縦に読むものですの。上から、順に。」',
        hint: '时限符卡 · 等距方格阵与留缺口的札墙',
        hintJa: '時限符卡 · 等間隔の方格陣と欠けのある札壁',
        style: '参考原作：网格状结界阵与等距落弹墙（《永夜抄》《妖々夢》系）',
        styleJa: '参考：格子状の結界陣と等間隔の落下弾壁（「永夜抄」「妖々夢」系）',
        bgTint: '#33204a',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 152, 120, 34, .007);
          const t = tier();
          /* 主造型（本符唯一母题）：烟花式的多重等距光轮，
             一层层旋转着升上夜空——对应「孔雀七輪星」的原作造型。 */
          if (f % 60 === 0) {
            const k = Math.floor(f / 60);
            P.multiRing(T('ofuda', {
              x: G.PF.w / 2, y: 150 + (k % 3) * 46,
              n: 16, layers: t === 0 ? 2 : 3,
              speedStep: 26, nStep: 4, rotStep: .11,
              a0: k * .17 * (t === 3 ? -1 : 1), speed: 124,
              colors: ['crimson', 'gold', 'cream'],
              type: 'ofuda', r: 7, life: 12
            }));
          }
          /* 副造型：一圈自上方荡下的等距波纹，代替散乱的落弹 */
          if (f % 150 === 0) P.waveRings(T('cream', {
            x: G.PF.w / 2, y: -10, n: 20, rings: 2,
            r0: 24, gap: 42, speed: 116, ringDelay: .09,
            colors: ['cream', 'gold'], type: 'card', r: 6, life: 11
          }));
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：第二页以反色、错位半格落下，形成双色棋盘
            if (f % 120 === 60) P.page(T('cream', {
              cols: 9, rows: 3, n: 27, gap: G.PF.w * .5, gapW: 90,
              rowDelay: .05, dy: 40, y0: -12, speed: 118, r: 6, life: 11
            }));
          } else if (t === 2) {
            // Hard：等距自机狙五连 + 一圈自下而上的细环
            if (f % 150 === 75) P.fan(T('violet', {
              x: b.x, y: b.y, n: 5, spread: .44, aim: true,
              speed: 154, r: 6, color: 'violet'
            }));
            if (f % 180 === 90) P.ring(T('ink', {
              x: b.x, y: b.y, n: 14, speed: 104, a0: f * .005,
              ripple: .02, r: 5, color: 'ink', life: 12
            }));
          } else if (t === 3) {
            // Lunatic：四角定位小环 + 反向自转的第二层方格
            if (f % 120 === 60) {
              for (const cx of [G.PF.w * .22, G.PF.w * .78])
                for (const cy of [140, 420]) P.ring(T('crystal', {
                  x: cx, y: cy, n: 8, speed: 92, a0: -f * .006,
                  r: 5, color: 'cream', life: 11
                }));
            }
            if (f % 200 === 100) P.weave(T('ofuda', {
              x: b.x, y: b.y, n: 12, curve: .24,
              speed: 128, a0: -f * .006, color: 'gold', color2: 'crimson', r: 6
            }));
          }
        }
      },
      {
        name: '抹符「消え残る一字」', jp: 'まつふ・きえのこるいちじ',
        type: 'barrier', hp: 7600, timeout: 105,
        declare: '「消した筈の一字が、滲んで残りますの。」',
        hint: '结界符卡 · 五角星与六瓣华环交替绽开',
        hintJa: '結界符卡 · 五芒星と六弁の華環が交互に咲く',
        style: '参考原作：星型速度分布与多层花瓣华环（《東方文花帖》《妖々夢》系）',
        styleJa: '参考：星形の速度分布と多層の花弁華環（「文花帖」「妖々夢」系）',
        bgTint: '#46204a',
        intro(b) { b.setTarget(G.PF.w / 2, 155); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 150, 48, .010);
          const t = tier();
          /* 主造型：五角星（速度按 |cos(5θ/2)| 分布，尖端等距） */
          if (f % 52 === 0) P.star(T('ink', {
            x: b.x, y: b.y, n: 30, points: 5, speed: 152,
            a0: f * .006, r: 7, color: 'violet', life: 12
          }));
          /* 副造型：三层六瓣华环，每层等分、颜色交替 */
          if (f % 104 === 52) P.grandFlower(T('ofuda', {
            x: b.x, y: b.y, n: 18, layers: t === 0 ? 1 : 2, petals: 6,
            speed: 128, a0: -f * .005,
            colors: ['crimson', 'gold', 'cream'], r: 6, life: 12
          }));
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：一圈缓慢反向自转的素环收束星型的间隙
            if (f % 104 === 0) P.ring(T('cream', {
              x: b.x, y: b.y, n: 12, speed: 96, a0: -f * .004,
              ripple: .02, r: 5, life: 12
            }));
          } else if (t === 2) {
            // Hard：曲线环让星尖弯折 + 三发等距自机狙
            if (f % 104 === 0) P.curveRing(T('violet', {
              x: b.x, y: b.y, n: 14, curve: .26, speed: 134,
              a0: f * .007, r: 6, color: 'violet', life: 12
            }));
            if (f % 156 === 78) P.fan(T('ink', {
              x: b.x, y: b.y, n: 3, spread: .3, aim: true,
              speed: 160, r: 6, color: 'ink'
            }));
          } else if (t === 3) {
            // Lunatic：六重万花筒 + 左右镜像分身的对称星
            if (f % 104 === 0) P.kaleido(T('crystal', {
              x: b.x, y: b.y, k: 6, n: 4, petals: 6, spread: .4,
              a0: -f * .008, speed: 142, curve: .1,
              colors: ['violet', 'cream', 'gold', 'crimson'], r: 6
            }));
            if (f % 208 === 104) {
              for (const side of [-1, 1]) P.star(T('ofuda', {
                x: b.x + side * 160, y: b.y + 26, n: 15, points: 5,
                speed: 116, a0: side * f * .006, r: 5,
                color: side < 0 ? 'crimson' : 'gold', life: 11
              }));
            }
          }
        }
      },
      {
        name: '残符「白紙への書き出し」', jp: 'ざんふ・はくしへのかきだし',
        type: 'barrier', hp: 11000, timeout: 120,
        declare: '「では、白紙に戻しますの。最初の一行から。」',
        hint: '结界符卡 · 四重同心光轮与十字编织网',
        hintJa: '結界符卡 · 四重の同心光輪と十字の編み網',
        style: '参考原作：多重光轮与结界花环（《紅魔郷》《妖々夢》幽明结界系）',
        styleJa: '参考：多重光輪と結界の花環（「紅魔郷」「妖々夢」幽明結界系）',
        bgTint: '#1e1430',
        intro(b) { b.setTarget(G.PF.w / 2, 148); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 148, 165, 42, .012);
          const t = tier();
          /* 主造型：四重同心光轮，层数按难度 1/2/3/4 递增，每环等距 */
          if (f % 56 === 0) P.multiRing(T('cream', {
            x: b.x, y: b.y, n: 20, layers: t + 1,
            speedStep: 30, nStep: 4, rotStep: .11,
            a0: f * .005 * (t === 3 ? -1 : 1), speed: 138,
            colors: ['cream', 'violet', 'gold', 'crimson'], r: 7, life: 12
          }));
          /* 副造型：工整的十字编织网，正反两组曲线严格交错 */
          if (f % 112 === 56) P.weave(T('ofuda', {
            x: b.x, y: b.y, n: 12, curve: .26, speed: 146,
            a0: -f * .006, color: 'crimson', color2: 'gold', r: 6, life: 12
          }));
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：反向内环一层，形成内外对转
            if (f % 112 === 0) P.ring(T('violet', {
              x: b.x, y: b.y, n: 14, speed: 100, a0: -f * .006,
              ripple: .02, r: 5, life: 12
            }));
          } else if (t === 2) {
            // Hard：六瓣花环 + 五发等距自机狙
            if (f % 112 === 0) P.flower(T('ofuda', {
              x: b.x, y: b.y, n: 24, petals: 6, amp: .3,
              a0: f * .007, speed: 132, r: 6, color: 'gold', life: 12
            }));
            if (f % 168 === 84) P.fan(T('ink', {
              x: b.x, y: b.y, n: 5, spread: .5, aim: true,
              speed: 158, r: 6, color: 'ink'
            }));
          } else if (t === 3) {
            // Lunatic：六臂激光轮 + 左右镜像光轮 + 五角星内圈
            if (f % 112 === 0) {
              P.laserWheel(T('crystal', {
                x: b.x, y: b.y, arms: 6, a0: f * .008,
                warn: .72, life: 1.3, width: 9, color: 'white'
              }));
              for (const side of [-1, 1]) P.multiRing(T('crystal', {
                x: b.x + side * 172, y: b.y + 20, n: 12, layers: 2,
                speedStep: 24, a0: -side * f * .008, speed: 112,
                colors: ['cream', 'violet'], r: 5, life: 11
              }));
              P.star(T('ofuda', {
                x: b.x, y: b.y, n: 20, points: 5, speed: 116,
                a0: -f * .007, r: 5, color: 'gold', life: 12
              }));
            }
          }
        }
      }
    ]
  };

  /* =========================================================
   * 二面 BOSS：鏡井 仄（かがい ほのか）
   * 一切严格对称——镜像 n-way / 交叉网 / 扇形激光 / k 重万花筒。
   * ========================================================= */
  const honoka = {
    id: 'honoka', name: '鏡井 仄', reading: 'かがい ほのか',
    title: '映さなかった鏡', emblem: '映', music: 'boss2',
    color: '#7fe6e0', sub: '#dffcff', hair: '#9fd8e0', robe: '#2a5f78',
    palette: ['#082a3a', '#124f63', '#63b9c9'], bg: 'mirror',
    quote: '「そちらが本物か、こちらが本物か。……どちらも、映した事が無いの。」',
    desc: '一面从未被使用过、连光都没照过的古镜，被人塞进柜子最深处而遗忘了。她在无人观看的黑暗里长出意识，于是坚信「不被看见的东西才是真实」。',
    lore: '沿用原作「道具成灵 / 镜与境界」的意象；本作把她设计为异变第二层。她的弹幕永远成对、闭合、等分——对称轴本身就是弹幕。',
    maxSpells: 4,
    spells: [
      {
        name: '鏡符「合わせ鏡」', jp: 'きょうふ・あわせかがみ',
        type: 'timeout', duration: 22, timeout: 22,
        declare: '「こちら側から、始めますわ。……もう片方も、ご一緒に。」',
        hint: '时限符卡 · 以中轴为镜的严格左右对称 n-way',
        hintJa: '時限符卡 · 中軸を鏡とする厳密な左右対称 n-way',
        style: '参考原作：中轴对称的飞刀 n-way（《紅魔郷》咲夜系）与成对光环',
        styleJa: '参考：中軸対称の飛刀 n-way（「紅魔郷」咲夜系）と対になる光輪',
        bgTint: '#0b2b3c',
        intro(b) { b.setTarget(G.PF.w / 2, 155); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 154, 84, 24, .008);
          const t = tier();
          /* 主造型：以画面中轴为镜的成对放射，角度严格等分 */
          if (f % 44 === 0) P.mirrorLine(T('mirror', {
            x: b.x, y: b.y, n: 9, spread: 1.4, speed: 168,
            a0: Math.PI / 2 + Math.sin(f * .004) * .3,
            axis: G.PF.w / 2 + Math.sin(f * .002) * 44,
            color: 'cyan', color2: 'indigo', r: 6, curve: .06, life: 12
          }));
          /* 副造型：镜轴两侧同时落下的一对薄环，强调对称而非数量 */
          if (f % 132 === 66) {
            for (const x of [G.PF.w * .28, G.PF.w * .72])
              P.ring(T('crystal', {
                x, y: b.y, n: 10, speed: 132,
                a0: (x < G.PF.w / 2 ? 1 : -1) * f * .005,
                ripple: .02, r: 5, life: 12
              }));
          }
          if (f > 660 && f < 730) return; // 留白：镜面静止的一瞬
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：一对反向旋转的内环，左右互为镜像
            if (f % 132 === 0) {
              for (const side of [-1, 1]) P.ring(T('mirror', {
                x: G.PF.w / 2 + side * 120, y: b.y + 30, n: 10,
                speed: 100, a0: -side * f * .006, r: 5,
                color: side < 0 ? 'cyan' : 'silver', life: 12
              }));
            }
          } else if (t === 2) {
            // Hard：从下往上的「倒影」同样成对 + 三发等距自机狙
            if (f > 730 && f % 88 === 44) P.mirrorLine(T('mirror', {
              x: b.x, y: b.y, n: 6, spread: .9, speed: 146,
              a0: -Math.PI / 2, color: 'teal', color2: 'silver', r: 5, life: 12
            }));
            if (f % 176 === 88) P.fan(T('crystal', {
              x: b.x, y: b.y, n: 3, spread: .28, aim: true,
              speed: 158, r: 5, color: 'silver'
            }));
          } else if (t === 3) {
            // Lunatic：四重万花筒 + 中轴两侧镜像星型
            if (f % 132 === 0) P.kaleido(T('crystal', {
              x: b.x, y: b.y, k: 4, n: 4, petals: 5, spread: .4,
              a0: -f * .009, speed: 146, curve: .08,
              colors: ['cyan', 'silver', 'blue', 'violet'], r: 6
            }));
            if (f > 730 && f % 176 === 88) {
              for (const side of [-1, 1]) P.star(T('mirror', {
                x: G.PF.w / 2 + side * 150, y: G.PF.h * .56,
                n: 15, points: 5, speed: 124, a0: side * f * .007,
                r: 5, color: side < 0 ? 'teal' : 'indigo', life: 11
              }));
            }
          }
        }
      },
      {
        name: '虚像「壁を渡る影」', jp: 'きょぞう・かべをわたるかげ',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「壁の向こうにも、私は居ますの。さあ、どちらを見ます？」',
        hint: '时限符卡 · 等距交叉编织网与上下折返',
        hintJa: '時限符卡 · 等間隔の交差編み網と上下の折り返し',
        style: '参考原作：工整交叉网与壁面反射弹（《輝針城》《天空璋》系）',
        styleJa: '参考：整然とした交差網と壁面反射弾（「輝針城」「天空璋」系）',
        bgTint: '#123a4a',
        intro(b) {
          b.setTarget(G.PF.w / 2, 160);
          /* 开局先铺好三层等距折返网，每一层都是闭合的 X 形交叉 */
          for (let k = 0; k < 3; k++) P.reflectWall(T('crystal', {
            n: 10, y0: 40 + k * 20, step: 62,
            speed: 152, bounce: 2, tilt: k % 2 ? -.22 : .22,
            delay: k * .09, color: 'cyan', color2: 'silver', r: 6, life: 11
          }));
        },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 110, 36, .009);
          const t = tier();
          /* 主造型：两壁各 12 发、从 y=26 铺到 y=664 的等距折返网 */
          if (f % 48 === 0) P.reflectWall(T('crystal', {
            n: 12, y0: 26, step: 58, speed: 152, bounce: 2,
            tilt: (Math.floor(f / 48) % 2) ? .24 : -.24,
            color: 'cyan', color2: 'silver', r: 6, life: 11
          }));
          /* 副造型：中央一组正反交错的编织网，角度严格等分 */
          if (f % 96 === 48) P.weave(T('mirror', {
            x: b.x, y: G.PF.h * .55, n: 12, curve: .28,
            speed: 138, a0: f * .005,
            color: 'teal', color2: 'silver', r: 6, life: 12
          }));
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：一层反向折返网，与主网构成双 X
            if (f % 96 === 0) P.reflectWall(T('mirror', {
              n: 8, y0: 60, step: 78, speed: 128, bounce: 2,
              tilt: -.3, color: 'silver', color2: 'teal', r: 5, life: 11
            }));
          } else if (t === 2) {
            // Hard：一对左右镜像的曲线环 + 五发等距自机狙
            if (f % 144 === 72) {
              for (const side of [-1, 1]) P.curveRing(T('crystal', {
                x: G.PF.w / 2 + side * 150, y: G.PF.h * .46,
                n: 12, curve: side * .24, speed: 130,
                a0: -side * f * .006, r: 5,
                color: side < 0 ? 'cyan' : 'silver', life: 11
              }));
            }
            if (f % 192 === 96) P.fan(T('mirror', {
              x: b.x, y: b.y, n: 5, spread: .46, aim: true,
              speed: 156, r: 5, color: 'silver'
            }));
          } else if (t === 3) {
            // Lunatic：反向织网 + 四角星型 + 六臂激光轮
            if (f % 96 === 0) {
              P.weave(T('crystal', {
                x: b.x, y: G.PF.h * .5, n: 16, curve: -.3,
                speed: 146, a0: -f * .008,
                color: 'white', color2: 'indigo', r: 6, life: 12
              }));
              P.laserWheel(T('mirror', {
                x: b.x, y: b.y, arms: 6, a0: f * .007,
                warn: .7, life: 1.2, width: 9, color: 'white'
              }));
            }
            if (f % 192 === 96) {
              for (const side of [-1, 1]) P.star(T('mirror', {
                x: G.PF.w / 2 + side * 160, y: G.PF.h * .6,
                n: 15, points: 4, speed: 126, a0: side * f * .008,
                r: 5, color: side < 0 ? 'cyan' : 'violet', life: 11
              }));
            }
          }
        }
      },
      {
        name: '折光「七色の割れ目」', jp: 'せっこう・なないろのわれめ',
        type: 'barrier', hp: 9800, timeout: 108,
        declare: '「光は曲がりますの。どこへ出るか、当ててみて。」',
        hint: '结界符卡 · 等分扇形激光阵与七色星型',
        hintJa: '結界符卡 · 等分された扇形レーザー陣と七色の星型',
        style: '参考原作：扇形预警激光与星型速度分布（《星蓮船》《永夜抄》系）',
        styleJa: '参考：扇形予告レーザーと星形速度分布（「星蓮船」「永夜抄」系）',
        bgTint: '#0e3a52',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 148, 132, 44, .011);
          const t = tier();
          const ph = Math.floor(f / 300) % 3;
          /* 主造型一：五臂等分扇形激光阵，臂与臂之间严格等角 */
          if (ph === 0 && f % 96 === 0) P.laserFan(T('mirror', {
            x: b.x, y: b.y, arms: 5, spread: 1.0, warn: .82,
            life: 1.35, width: 10, color: 'cyan', aim: true
          }));
          /* 主造型二：折射碎片，末端分裂数固定、角度等分 */
          if (ph === 1 && f % 84 === 0) P.prism(T('mirror', {
            x: b.x, y: b.y, arms: 5, a0: f * .01, warn: .74,
            life: 1.4, width: 11, speed: 172, splitN: 4, splitT: .55,
            refract: .14, color: 'teal', r: 6
          }));
          /* 主造型三：旋转激光轮 + 等距七角星 */
          if (ph === 2) {
            if (f % 96 === 0) P.laserWheel(T('crystal', {
              x: b.x, y: b.y, arms: 6, a0: -f * .009,
              warn: .7, life: 1.5, width: 10, color: 'white'
            }));
            if (f % 48 === 24) P.star(T('crystal', {
              x: b.x, y: b.y, n: 28, points: 7, speed: 154,
              a0: f * .007, r: 6, color: 'silver', life: 12
            }));
          }
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：一圈反向自转的薄环，勾出七色边界
            if (f % 96 === 48) P.ring(T('mirror', {
              x: b.x, y: b.y, n: 12, speed: 108, a0: -f * .006,
              ripple: .02, r: 5, life: 12
            }));
          } else if (t === 2) {
            // Hard：六瓣花环 + 三发等距自机狙
            if (f % 96 === 48) P.flower(T('crystal', {
              x: b.x, y: b.y, n: 24, petals: 6, amp: .3,
              a0: f * .006, speed: 140, r: 6, color: 'blue', life: 12
            }));
            if (f % 168 === 84) P.fan(T('mirror', {
              x: b.x, y: b.y, n: 3, spread: .3, aim: true,
              speed: 162, r: 5, color: 'silver'
            }));
          } else if (t === 3) {
            // Lunatic：六重万花筒 + 左右镜像星型 + 附加四臂激光轮
            if (f % 96 === 48) {
              P.kaleido(T('mirror', {
                x: b.x, y: b.y, k: 6, n: 4, petals: 6, spread: .4,
                a0: -f * .01, speed: 150, curve: .1,
                colors: ['cyan', 'silver', 'blue', 'violet', 'white', 'teal'], r: 6
              }));
              P.laserWheel(T('mirror', {
                x: b.x, y: b.y, arms: 4, a0: -f * .011,
                warn: .64, life: 1.1, width: 8, color: 'violet'
              }));
            }
            if (f % 192 === 96) {
              for (const side of [-1, 1]) P.star(T('crystal', {
                x: b.x + side * 166, y: b.y + 24, n: 15, points: 5,
                speed: 128, a0: side * f * .007, r: 5,
                color: side < 0 ? 'cyan' : 'white', life: 11
              }));
            }
          }
        }
      },
      {
        name: '残符「万華鏡の内側」', jp: 'ざんふ・まんげきょうのうちがわ',
        type: 'barrier', hp: 12800, timeout: 125,
        declare: '「割れても、増えても、私の数は変わりませんの。」',
        hint: '结界符卡 · k 重对称的万花筒花瓣，重数随难度递增',
        hintJa: '結界符卡 · k 重対称の万華鏡、重数は難度で増える',
        style: '参考原作：多重旋转对称的结界花环（《妖々夢》幽明结界系）',
        styleJa: '参考：多重回転対称の結界花環（「妖々夢」幽明結界系）',
        bgTint: '#062032',
        intro(b) { b.setTarget(G.PF.w / 2, 148); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 150, 50, .013);
          const t = tier();
          /* 主造型：对称重数按难度 4 / 5 / 6 / 8 递增，每重严格等分 */
          const k = [4, 5, 6, 8][t];
          if (f % 40 === 0) P.kaleido(T('mirror', {
            x: b.x, y: b.y, k, n: 4, petals: 5, spread: .42,
            a0: f * .008 * (t === 3 ? -1 : 1), speed: 156,
            curve: .1, colors: ['cyan', 'silver', 'blue', 'violet'], r: 6
          }));
          /* 副造型：三重花瓣华环，与万花筒同轴对称 */
          if (f % 120 === 60) P.grandFlower(T('crystal', {
            x: b.x, y: b.y, n: 18, layers: t === 0 ? 1 : 2, petals: k,
            speed: 134, a0: -f * .005,
            colors: ['silver', 'cyan', 'white'], r: 6, life: 12
          }));
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：镜中分身各放一圈反向螺旋
            if (f % 160 === 80) {
              for (const side of [-1, 1]) P.spiral(T('crystal', {
                x: b.x + side * 168, y: b.y, arms: 3, speed: 142,
                a0: side * f * .02, twin: true, curve: .16,
                color: 'silver', color2: 'indigo', r: 5
              }));
            }
          } else if (t === 2) {
            // Hard：内圈反向万花筒 + 五发等距自机狙 + 花心爆散
            if (f % 160 === 80) P.kaleido(T('mirror', {
              x: b.x, y: b.y, k: 4, n: 3, petals: 5, spread: .3,
              a0: -f * .011, speed: 116, curve: -.12,
              colors: ['white', 'violet'], r: 5
            }));
            if (f % 200 === 100) P.fan(T('crystal', {
              x: b.x, y: b.y, n: 5, spread: .48, aim: true,
              speed: 160, r: 5, color: 'silver'
            }));
          } else if (t === 3) {
            // Lunatic：满开 —— 左右镜像万花筒、八臂激光轮、五角星内圈
            if (f % 120 === 60) {
              for (const side of [-1, 1]) P.kaleido(T('crystal', {
                x: b.x + side * 170, y: b.y + 22, k: 4, n: 3, petals: 5,
                spread: .36, a0: -side * f * .012, speed: 138,
                curve: .12, colors: ['cyan', 'white', 'violet'], r: 5
              }));
              P.laserWheel(T('mirror', {
                x: b.x, y: b.y, arms: 8, a0: f * .009,
                warn: .62, life: 1.2, width: 9, color: 'white'
              }));
              P.star(T('mirror', {
                x: b.x, y: b.y, n: 20, points: 5, speed: 112,
                a0: -f * .008, r: 5, color: 'silver', life: 12
              }));
            }
          }
        }
      }
    ]
  };

  /* =========================================================
   * 三面 BOSS（异变主谋）：祭篝 燎（まつかがり りょう）
   * 一场祭典的几何——节拍环 / 椭圆行列 / 灯轮 / 星型花火。
   * ========================================================= */
  const ryou = {
    id: 'ryou', name: '祭篝 燎', reading: 'まつかがり りょう',
    title: '忘れられた祭火', emblem: '燎', music: 'boss3',
    color: '#ffb35c', sub: '#ffe8c4', hair: '#7a2f3c', robe: '#b8324f',
    palette: ['#2c0f1c', '#6e2030', '#c86b3c'], bg: 'fire',
    quote: '「忘れられたから、消える訳じゃない。……ただ、誰も灯しに来なかっただけ。」',
    desc: '很久以前，山里的祭典每年都会点起篝火。后来人走了、名字忘了，火却还在结界内侧一直烧着。她从那堆无人添柴的余烬里站了起来，把整个幻想乡的符札一张张收进火里——只要还有人记得，就不会真正熄灭。',
    lore: '沿用原作「被遗忘之物化为神 / 信仰与名字维系存在」的核心设定。她的符卡是一场祭典的顺序，弹幕全部收束成灯轮、节拍环、提灯行列与星型花火这类工整的祭典纹样。',
    maxSpells: 5,
    spells: [
      {
        name: '灯符「誰も来ない祭り」', jp: 'とうふ・だれもこないまつり',
        type: 'timeout', duration: 21, timeout: 21,
        declare: '「まず、火を起こします。誰も見ていなくても。」',
        hint: '时限符卡 · 等距上升的灯列与旋转火轮',
        hintJa: '時限符卡 · 等間隔に昇る灯の列と回る火輪',
        style: '参考原作：上升火柱与花瓣华环（《妖々夢》《地霊殿》系）',
        styleJa: '参考：昇る火柱と花弁の華環（「妖々夢」「地霊殿」系）',
        bgTint: '#3a1119',
        intro(b) { b.setTarget(G.PF.w / 2, 160); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 158, 96, 30, .007);
          const t = tier();
          /* 主造型：等距上升的灯列，每列左右摇曳幅度一致 */
          if (f % 22 === 0) P.emberRise(T('fire', {
            n: 5, speed: 126, accel: 68, tilt: .22,
            waveF: 2.6, waveA: 38,
            colors: ['amber', 'red', 'gold'], r: 6, life: 11
          }));
          /* 副造型：八臂等分火轮，正反向曲线成对 */
          if (f % 88 === 44) P.fireWheel(T('fire', {
            x: b.x, y: b.y, arms: 8, curve: .12,
            a0: f * .005, speed: 138,
            color: 'gold', color2: 'amber', r: 6, life: 12
          }));
          /* 主造型二：六瓣火之花，瓣数固定、角度等分 */
          if (f % 132 === 66) P.flower(T('fire', {
            x: b.x, y: b.y, n: 24, petals: 6, amp: .38,
            a0: -f * .004, speed: 128, r: 6, color: 'gold', life: 12
          }));
          if (f > 700 && f < 770) return; // 火势暂歇
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：一圈反向自转的提灯薄环
            if (f % 132 === 0) P.ring(T('lantern', {
              x: b.x, y: b.y, n: 12, speed: 102, a0: -f * .005,
              ripple: .02, r: 5, color: 'sakura', life: 12
            }));
          } else if (t === 2) {
            // Hard：第二组反向火轮 + 三发等距自机狙
            if (f % 132 === 0) P.fireWheel(T('fire', {
              x: b.x, y: b.y, arms: 6, curve: -.16,
              a0: -f * .007, speed: 124,
              color: 'red', color2: 'gold', r: 5, life: 12
            }));
            if (f % 176 === 88) P.fan(T('fire', {
              x: b.x, y: b.y, n: 3, spread: .3, aim: true,
              speed: 158, r: 5, color: 'amber'
            }));
          } else if (t === 3) {
            // Lunatic：左右镜像火轮 + 五角星花火 + 六臂激光轮
            if (f % 132 === 0) {
              for (const side of [-1, 1]) P.fireWheel(T('fire', {
                x: b.x + side * 166, y: b.y + 20, arms: 5,
                curve: -side * .14, a0: side * f * .008, speed: 126,
                color: side < 0 ? 'amber' : 'red', color2: 'gold', r: 5, life: 11
              }));
              P.star(T('star', {
                x: b.x, y: b.y, n: 20, points: 5, speed: 118,
                a0: -f * .007, r: 5, color: 'white', life: 12
              }));
              P.laserWheel(T('fire', {
                x: b.x, y: b.y, arms: 6, a0: f * .008,
                warn: .66, life: 1.2, width: 9, color: 'gold'
              }));
            }
          }
        }
      },
      {
        name: '拍符「鳴らなかった拍子」', jp: 'はくふ・ならなかったひょうし',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「拍子は、鳴っていましたの。聞く人が居なかっただけ。」',
        hint: '时限符卡 · 每拍一整圈等距同心环，拍间完全安静',
        hintJa: '時限符卡 · 一拍ごとに等間隔の同心環、拍の間は完全な静寂',
        style: '参考原作：骚灵三姐妹的节拍型齐发（《妖々夢》）与多重光轮',
        styleJa: '参考：騒霊三姉妹の拍子型一斉発射（「妖々夢」）と多重光輪',
        bgTint: '#3d1830',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 118, 34, .008);
          const t = tier();
          /* 主造型：一拍一整环。拍点之外完全不发弹，环上每发严格等距 */
          const beat = f > 840 ? 72 : 96;
          if (f % beat === 0) {
            const k = Math.floor(f / beat);
            P.multiRing(T('lantern', {
              x: b.x, y: b.y, n: 16, layers: t === 0 ? 1 : t === 1 ? 2 : 3,
              speedStep: 44, nStep: 4, rotStep: .1,
              a0: k * .21 * (t === 3 ? -1 : 1), speed: 154,
              colors: t === 0 ? ['amber'] : t === 1 ? ['amber', 'sakura']
                : ['amber', 'sakura', 'gold', 'red'],
              r: 6, life: 12
            }));
            /* --- 四档专属修饰（都只在拍点上生效，不破坏拍间静寂） --- */
            if (t === 2) {
              // Hard：拍点补五发等距自机狙
              P.fan(T('fire', {
                x: b.x, y: b.y, n: 5, spread: .46, aim: true,
                speed: 164, r: 6, color: 'amber'
              }));
            } else if (t === 3) {
              // Lunatic：拍点补左右镜像星型与四臂激光轮
              for (const side of [-1, 1]) P.star(T('star', {
                x: b.x + side * 160, y: b.y + 24, n: 15, points: 5,
                speed: 126, a0: side * k * .3, r: 5,
                color: side < 0 ? 'gold' : 'white', life: 11
              }));
              if (k % 3 === 2) P.laserWheel(T('fire', {
                x: b.x, y: b.y, arms: 4, a0: k * .4,
                warn: .6, life: 1.0, width: 9, color: 'white'
              }));
            }
          }
        }
      },
      {
        name: '行列「千の提灯」', jp: 'ぎょうれつ・せんのちょうちん',
        type: 'barrier', hp: 11200, timeout: 110,
        declare: '「提灯を並べますの。一列ずつ、順に灯して。」',
        hint: '结界符卡 · 椭圆提灯行列与多层花瓣华环',
        hintJa: '結界符卡 · 楕円の提灯行列と多層の花弁華環',
        style: '参考原作：巡回队列与花弹（《花映塚》），等距依次点亮',
        styleJa: '参考：巡回する行列弾と花弾（「花映塚」）、等間隔に順次点灯',
        bgTint: '#4a1523',
        intro(b) { b.setTarget(G.PF.w / 2, 148); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 142, 44, .010);
          const t = tier();
          const ph = Math.floor(f / 300) % 3;
          /* 主造型：椭圆上等距排布的提灯，逐盏点亮后向外散开 */
          if (f % 84 === 0) P.procession(T('lantern', {
            n: 18, radius: 112 + ph * 30, ry: 76 + ph * 16,
            cx: G.PF.w / 2, cy: 268, a0: f * .006,
            stepDelay: .042, speed: 166, accel: 126,
            outward: ph !== 1, colors: ['gold', 'amber', 'sakura'], r: 7, life: 12
          }));
          /* 副造型：与行列同心的三层六瓣华环 */
          if (f % 168 === 84) P.grandFlower(T('fire', {
            x: G.PF.w / 2, y: 268, n: 18, layers: t === 0 ? 1 : 2,
            petals: 6, speed: 134, a0: -f * .005,
            colors: ['gold', 'sakura', 'amber'], r: 6, life: 12
          }));
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：外圈一层等距提灯环，给出明确的绕行线
            if (f % 168 === 0) P.ring(T('fire', {
              x: G.PF.w / 2, y: 268, n: 16, speed: 138,
              a0: -f * .005, ripple: .02, r: 6, color: 'red', life: 12
            }));
          } else if (t === 2) {
            // Hard：反向的第二条椭圆行列 + 五发等距自机狙
            if (f % 168 === 0) P.procession(T('lantern', {
              n: 14, radius: 96, ry: 62, cx: G.PF.w / 2, cy: 268,
              a0: -f * .007, stepDelay: .05, speed: 146, accel: 110,
              colors: ['sakura', 'gold'], r: 6, life: 11
            }));
            if (f % 210 === 105) P.fan(T('fire', {
              x: b.x, y: b.y, n: 5, spread: .48, aim: true,
              speed: 160, r: 6, color: 'amber'
            }));
          } else if (t === 3) {
            // Lunatic：左右镜像双椭圆 + 五角星花火 + 六臂激光轮
            if (f % 168 === 0) {
              for (const side of [-1, 1]) P.procession(T('lantern', {
                n: 12, radius: 78, ry: 54,
                cx: G.PF.w / 2 + side * 150, cy: 300,
                a0: side * f * .008, stepDelay: .04, speed: 152, accel: 120,
                colors: [side < 0 ? 'gold' : 'sakura', 'white'], r: 6, life: 11
              }));
              P.star(T('star', {
                x: G.PF.w / 2, y: 268, n: 20, points: 5, speed: 120,
                a0: -f * .007, r: 5, color: 'white', life: 12
              }));
              P.laserWheel(T('fire', {
                x: b.x, y: b.y, arms: 6, a0: f * .008,
                warn: .68, life: 1.2, width: 9, color: 'gold'
              }));
            }
          }
        }
      },
      {
        name: '灰符「燃え残った星」', jp: 'はいふ・もえのこったほし',
        type: 'barrier', hp: 13400, timeout: 118,
        declare: '「燃やした札は、灰になってからが本番ですの。」',
        hint: '结界符卡 · 五角星速度分布与分裂大玉花火',
        hintJa: '結界符卡 · 五芒星の速度分布と分裂大玉の花火',
        style: '参考原作：星型弹与分裂大玉（《永夜抄》《文花帖》系）',
        styleJa: '参考：星型弾と分裂大玉（「永夜抄」「文花帖」系）',
        bgTint: '#221436',
        intro(b) { b.setTarget(G.PF.w / 2, 145); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 148, 158, 52, .012);
          const t = tier();
          const ph = Math.floor(f / 280) % 3;
          /* 主造型一：五角星，尖端等分、速度按 |cos(5θ/2)| 分布 */
          if (ph === 0 && f % 44 === 0) P.star(T('star', {
            x: b.x, y: b.y, n: 30, points: 5, speed: 160,
            a0: f * .007, r: 7, color: 'gold', life: 12
          }));
          /* 主造型二：分裂大玉，末端碎片数固定、角度等分 */
          if (ph === 1 && f % 56 === 0) P.burst(T('star', {
            x: b.x, y: b.y, n: 9, speed: 142, a0: f * .006,
            splitN: 6, splitT: .6, seedType: 'big',
            r: 9, color: 'amber', life: 12
          }));
          /* 主造型三：七瓣花火华环 */
          if (ph === 2 && f % 48 === 24) P.grandFlower(T('star', {
            x: b.x, y: b.y, n: 20, layers: t === 0 ? 1 : 2, petals: 7,
            speed: 146, a0: -f * .006,
            colors: ['gold', 'white', 'amber'], r: 6, life: 12
          }));
          /* --- 四档专属修饰 --- */
          if (t === 1) {
            // Normal：一圈反向自转的余烬薄环
            if (f % 112 === 0) P.ring(T('fire', {
              x: b.x, y: b.y, n: 12, speed: 106, a0: -f * .005,
              ripple: .02, r: 5, color: 'cream', life: 12
            }));
          } else if (t === 2) {
            // Hard：曲线环让星尖弯折 + 三发等距自机狙
            if (f % 112 === 0) P.curveRing(T('fire', {
              x: b.x, y: b.y, n: 14, curve: .24, speed: 136,
              a0: f * .007, r: 6, color: 'red', life: 12
            }));
            if (f % 168 === 84) P.fan(T('fire', {
              x: b.x, y: b.y, n: 3, spread: .3, aim: true,
              speed: 162, r: 5, color: 'cream'
            }));
          } else if (t === 3) {
            // Lunatic：六重万花筒 + 左右镜像星型 + 六臂激光轮
            if (f % 112 === 0) {
              P.kaleido(T('star', {
                x: b.x, y: b.y, k: 6, n: 4, petals: 5, spread: .4,
                a0: -f * .009, speed: 146, curve: .1,
                colors: ['gold', 'white', 'amber', 'red'], r: 6
              }));
              P.laserWheel(T('fire', {
                x: b.x, y: b.y, arms: 6, a0: f * .008,
                warn: .64, life: 1.2, width: 9, color: 'white'
              }));
            }
            if (f % 224 === 112) {
              for (const side of [-1, 1]) P.star(T('star', {
                x: b.x + side * 166, y: b.y + 26, n: 15, points: 5,
                speed: 124, a0: side * f * .007, r: 5,
                color: side < 0 ? 'amber' : 'white', life: 11
              }));
            }
          }
        }
      },
      {
        name: '残符「万象忘却の宴」', jp: 'ざんふ・ばんしょうぼうきゃくのうたげ',
        type: 'barrier', hp: 18000, timeout: 140,
        declare: '「最後です。全部、灯します。……忘れないで。」',
        hint: '终符 · 五段汇演：光轮→花瓣→星型→行列→满开',
        hintJa: '終符 · 五段の宴。光輪→花弁→星型→行列→満開',
        style: '参考原作：《永夜抄》「永夜返」式多段终符，逐段叠回前四张的工整造型',
        styleJa: '参考：「永夜返」式の多段終符、前四枚の整った形を畳み込む',
        bgTint: '#160b1c', last: true,
        intro(b) { b.setTarget(G.PF.w / 2, 145); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 145, 176, 56, .014);
          const t = tier();
          const seg = Math.floor(f / 260) % 5;
          /* 第一段：三重同心光轮 */
          if (seg === 0 && f % 64 === 0) P.multiRing(T('lantern', {
            x: b.x, y: b.y, n: 20, layers: t === 0 ? 1 : t === 1 ? 2 : 3,
            speedStep: 34, nStep: 4, rotStep: .1,
            a0: f * .006, speed: 150,
            colors: ['gold', 'amber', 'sakura', 'white'], r: 6, life: 12
          }));
          /* 第二段：每拍一整环，拍间安静 */
          if (seg === 1 && f % 80 === 0) P.multiRing(T('lantern', {
            x: b.x, y: b.y, n: 16, layers: 2, speedStep: 46,
            a0: f * .008, speed: 164,
            colors: ['amber', 'sakura'], r: 6, life: 12
          }));
          /* 第三段：椭圆提灯行列 */
          if (seg === 2 && f % 72 === 0) P.procession(T('lantern', {
            n: 20, radius: 138, ry: 86, cx: G.PF.w / 2, cy: 262,
            a0: f * .007, stepDelay: .036, speed: 176, accel: 138,
            colors: ['gold', 'amber', 'sakura'], r: 7, life: 12
          }));
          /* 第四段：五角星与七瓣华环 */
          if (seg === 3) {
            if (f % 40 === 0) P.star(T('star', {
              x: b.x, y: b.y, n: 28, points: 5, speed: 156,
              a0: f * .007, r: 6, color: 'gold', life: 12
            }));
            if (f % 80 === 40) P.grandFlower(T('fire', {
              x: b.x, y: b.y, n: 18, layers: 2, petals: 7,
              speed: 142, a0: -f * .006,
              colors: ['gold', 'white'], r: 6, life: 12
            }));
          }
          /* 第五段：满开 —— 前四段造型一齐点亮，全部保持等距闭合 */
          if (seg === 4) {
            if (f % 48 === 0) P.multiRing(T('lantern', {
              x: b.x, y: b.y, n: 20, layers: t === 0 ? 1 : 2,
              speedStep: 40, nStep: 4, a0: -f * .009, speed: 168,
              colors: ['amber', 'sakura', 'gold'], r: 6, life: 12
            }));
            if (f % 48 === 24) P.star(T('star', {
              x: b.x, y: b.y, n: 20, points: 5, speed: 134,
              a0: f * .008, r: 5, color: 'white', life: 12
            }));
            if (f % 96 === 48) P.procession(T('lantern', {
              n: 14, radius: 116, ry: 70, cx: G.PF.w / 2, cy: 258,
              a0: -f * .008, stepDelay: .03, speed: 186, accel: 148,
              colors: ['gold', 'cream'], r: 6, life: 11
            }));
            if (f % 96 === 0) P.laserWheel(T('fire', {
              x: b.x, y: b.y, arms: 6, a0: f * .006,
              warn: .62, life: 1.2, width: 11, color: 'white'
            }));
          }
          /* --- 四档专属修饰（每段都叠加，越到后段越华丽） --- */
          if (t === 1) {
            // Normal：每段补一圈反向自转的薄环
            if (f % 128 === 64) P.ring(T('fire', {
              x: b.x, y: b.y, n: 12, speed: 108, a0: -f * .006,
              ripple: .02, r: 5, color: 'sakura', life: 12
            }));
          } else if (t === 2) {
            // Hard：每段补反向火轮与五发等距自机狙
            if (f % 128 === 64) P.fireWheel(T('fire', {
              x: b.x, y: b.y, arms: 6, curve: -.16,
              a0: -f * .008, speed: 136,
              color: 'red', color2: 'gold', r: 5, life: 12
            }));
            if (f % 192 === 96) P.fan(T('fire', {
              x: b.x, y: b.y, n: 5, spread: .48, aim: true,
              speed: 166, r: 6, color: 'amber'
            }));
          } else if (t === 3) {
            // Lunatic：每段补左右镜像光轮、万花筒与八臂激光轮
            if (f % 128 === 64) {
              for (const side of [-1, 1]) P.multiRing(T('crystal', {
                x: b.x + side * 170, y: b.y + 24, n: 12, layers: 2,
                speedStep: 26, a0: -side * f * .009, speed: 128,
                colors: ['gold', 'white'], r: 5, life: 11
              }));
              P.kaleido(T('star', {
                x: b.x, y: b.y, k: 6, n: 3, petals: 6, spread: .38,
                a0: -f * .011, speed: 142, curve: .1,
                colors: ['gold', 'white', 'amber', 'sakura'], r: 5
              }));
            }
            if (f % 256 === 128) P.laserWheel(T('fire', {
              x: b.x, y: b.y, arms: 8, a0: -f * .008,
              warn: .6, life: 1.2, width: 10, color: 'gold'
            }));
          }
        }
      }
    ]
  };

  B.list = [chiyo, honoka, ryou];
  B.get = i => B.list[i];
})();
