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

  /* =========================================================
   * 四面 BOSS：天読 星羅 —— 把名字登记成星的天文官
   * 语汇：星图、椭圆轨道、星座连线、流星雨、天球逆转。
   * 与前三面的书写 / 镜面 / 祭典完全不重叠。
   * ========================================================= */
  const seira = {
    id: 'seira', name: '天読 星羅', reading: 'あまよみ せいら',
    title: '星を読む者', emblem: '星', music: 'boss4',
    color: '#8fd0ff', sub: '#e4f2ff', hair: '#c8ddf5', robe: '#25406e',
    palette: ['#071228', '#102a52', '#2c5a8c'], bg: 'star',
    quote: '「名を書けば消える。けれど星にすれば、消えませんの。」',
    desc: '结界深处的星象台上，有一位把名字一颗颗登记成星的天文官。她读出了第三面那叠残札上仅存的字迹，认为写下的名字会被擦掉、唱出的名字会散去，唯有编进星图的名字才真正不灭。',
    lore: '「天读」是古时观测星象、为名字定位置的官。她并非想毁灭谁，只是把所有消失的东西都变成星，让它们停在天球上。星与星之间以等距的线相连——那正是她替它们写下的新名字。',
    maxSpells: 5,
    spells: [
      {
        name: '星符「星図の輪」', jp: 'せいふ・せいずのわ',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「まず、名前を星にします。すると、もう消えませんの。」',
        hint: '时限符卡 · 等距同心星环一轮轮亮起',
        hintJa: '時限符卡 · 等間隔の同心星輪が順に光る',
        style: '参考原作：多重光轮与星型弹（彩符「孔雀七輪星」/ 星符「银河」）',
        styleJa: '参考：多重光輪と星型弾（彩符「孔雀七輪星」/ 星符「銀河」）',
        bgTint: '#071228',
        intro(b) { b.setTarget(G.PF.w / 2, 156); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 156, 88, 28, .006);
          const t = tier();
          /* 主造型：严格等距的同心星环，环上每颗都是四角星芒 */
          if (f % 58 === 0) {
            const k = Math.floor(f / 58);
            P.ring(T('starlight', {
              x: b.x, y: b.y, n: 16 + t * 4,
              speed: 118 + t * 6, a0: k * .13 * (t === 3 ? -1 : 1),
              ripple: .03, r: 6, type: 'starpoint', life: 12,
              colors: ['gold', 'cyan', 'white', 'silver']
            }));
          }
          /* Normal 起：第二层反向星环，两环咬合成星图仪 */
          if (t >= 1 && f % 58 === 29) P.ring(T('starlight', {
            x: b.x, y: b.y, n: 12 + t * 2, speed: 96,
            a0: -f * .005, ripple: .02, r: 5,
            type: 'starpoint', color: 'silver', life: 12
          }));
          /* Hard 起：一发等距自机狙的「观测针」 */
          if (t >= 2 && f % 116 === 58) P.fan(T('starlight', {
            x: b.x, y: b.y, n: 5, spread: .42, aim: true,
            speed: 150, r: 5, type: 'starpoint', color: 'white'
          }));
          /* Lunatic：第三层更快的逆向小星环，与外层反向咬合 */
          if (t === 3 && f % 58 === 29) P.ring(T('starlight', {
            x: b.x, y: b.y, n: 24, speed: 152, a0: f * .009,
            ripple: .04, r: 4, type: 'starpoint', color: 'gold', life: 11
          }));
        }
      },
      {
        name: '軌符「楕円の運行」', jp: 'きふ・だえんのうんこう',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「星は、決まった道を歩きます。名前も、そうあるべきですの。」',
        hint: '时限符卡 · 行星沿椭圆轨道分层运行',
        hintJa: '時限符卡 · 惑星が楕円軌道を層ごとに巡る',
        style: '参考原作：天体轨道与行星弹（魔空「小行星带」/ 焰星「星球运转」）',
        styleJa: '参考：天体軌道と惑星弾（魔空「小惑星帯」/ 焔星「星球運転」）',
        bgTint: '#102a52',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 106, 34, .007);
          const t = tier();
          const bands = [1, 2, 3, 4][t];
          /* 主造型：椭圆轨道上等距排布的行星弹，邻层公转方向相反 */
          if (f % 62 === 0) P.orbitBand(T('starlight', {
            x: b.x, y: b.y, bands, n: 14,
            rx: 118, ry: 70, gap: 30,
            a0: f * .005, speed: 120, bandDelay: .05,
            colors: ['gold', 'cyan', 'silver', 'violet'],
            type: 'big', r: 6, life: 12
          }));
          /* Normal 起：一枚彗星沿轨道切线拖尾划出 */
          if (t >= 1 && f % 124 === 62) {
            const a = f * .011;
            for (let k = 0; k < 6; k++)
              G.spawnBullet({ x: b.x + Math.cos(a) * (150 - k * 18),
                y: b.y + Math.sin(a) * (88 - k * 10),
                angle: a + Math.PI / 2, speed: 168 - k * 8,
                delay: k * .04, r: 8 - k, type: 'star', color: 'white', life: 10 });
          }
          /* Hard 起：轨道交点处落下等距星点，把椭圆钉实 */
          if (t >= 2 && f % 186 === 93) P.ring(T('starlight', {
            x: b.x, y: b.y + 40, n: 10, speed: 108,
            a0: -f * .006, r: 5, type: 'starpoint', color: 'cyan', life: 11
          }));
          /* Lunatic：外层再套一条更大的逆行轨道 */
          if (t === 3 && f % 124 === 0) P.orbitBand(T('starlight', {
            x: b.x, y: b.y, bands: 2, n: 18,
            rx: 220, ry: 130, gap: 26, a0: -f * .008,
            speed: 138, type: 'starpoint', colors: ['white', 'gold'], r: 5, life: 11
          }));
        }
      },
      {
        name: '連符「星座の結び」', jp: 'れんぷ・せいざのむすび',
        type: 'barrier', hp: 9800, timeout: 108,
        declare: '「星と星を結べば、名前になります。結びましょう。」',
        hint: '结界符卡 · 星点之间以弹道连成几何星座',
        hintJa: '結界符卡 · 星と星が弾道で結ばれ幾何の星座となる',
        style: '参考原作：星点连线构成的星座图形',
        styleJa: '参考：星点を結んで描く星座の図形',
        bgTint: '#0d1c3c',
        intro(b) { b.setTarget(G.PF.w / 2, 148); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 148, 128, 44, .010);
          const t = tier();
          const pts = [5, 6, 7, 8][t];
          /* 主造型：星点＋星点之间的等距连线弹，构成闭合星座 */
          if (f % 92 === 0) P.constellation(T('starlight', {
            x: b.x, y: b.y, points: pts, radius: 138,
            a0: f * .006, n: 6, seg: 8,
            speed: 128, starN: 6, r: 6, life: 12,
            colors: ['gold', 'cyan', 'white', 'violet']
          }));
          /* Normal 起：星座中心一轮淡淡的内环 */
          if (t >= 1 && f % 138 === 46) P.ring(T('starlight', {
            x: b.x, y: b.y, n: 12, speed: 96, a0: -f * .005,
            ripple: .02, r: 5, type: 'starpoint', color: 'white', life: 12
          }));
          /* Hard 起：一枚自机狙，从星座的顶点射出 */
          if (t >= 2 && f % 184 === 92) P.fan(T('starlight', {
            x: b.x, y: b.y - 120, n: 3, spread: .26, aim: true,
            speed: 156, r: 5, type: 'starpoint', color: 'gold'
          }));
          /* Lunatic：第二重更小的星座反相叠加 */
          if (t === 3 && f % 138 === 0) P.constellation(T('starlight', {
            x: b.x, y: b.y, points: 6, radius: 82,
            a0: -f * .009, n: 4, seg: 6, speed: 112,
            starN: 5, r: 5, colors: ['violet', 'white'], life: 11
          }));
        }
      },
      {
        name: '魔符「流星の雨」', jp: 'まふ・りゅうせいのあめ',
        type: 'barrier', hp: 12000, timeout: 112,
        declare: '「落ちる星も、星です。拾って、並べておきますの。」',
        hint: '结界符卡 · 天顶坠落的流星雨分层加速',
        hintJa: '結界符卡 · 天頂から降る流星が層ごとに加速する',
        style: '参考原作：高速落星与彗尾弹（星符「银河」系）',
        styleJa: '参考：高速の降星と彗星の尾（星符「銀河」系）',
        bgTint: '#16244a',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 158, 52, .012);
          const t = tier();
          /* 主造型：等距间隔的流星自天顶坠落，加速留下彗尾 */
          if (f % 22 === 0) {
            const n = [3, 5, 7, 9][t];
            for (let i = 0; i < n; i++) {
              const x = 30 + (G.PF.w - 60) * (i / (n - 1));
              for (let k = 0; k < 3; k++)
                G.spawnBullet({ x: x + k * 6, y: -14 - k * 20,
                  angle: Math.PI / 2, speed: 118 - k * 12,
                  accel: 240, maxSpeed: 260,
                  delay: k * .05, r: 7 - k, type: 'star',
                  color: k === 0 ? 'white' : 'gold', life: 10 });
            }
          }
          /* Normal 起：流星落点处炸开一圈星芒 */
          if (t >= 1 && f % 88 === 44) P.star(T('starlight', {
            x: b.x, y: b.y, n: 24, points: 6, speed: 146,
            a0: f * .007, r: 6, type: 'starpoint', color: 'cyan', life: 12
          }));
          /* Hard 起： InterruptedException 般的「逆流星」自下而上 */
          if (t >= 2 && f % 132 === 66) P.fan(T('starlight', {
            x: b.x, y: G.PF.h - 24, n: 5, spread: .5, aim: true,
            speed: 172, r: 5, type: 'starpoint', color: 'silver'
          }));
          /* Lunatic：两层交错的星型速度分布 */
          if (t === 3 && f % 88 === 0) {
            P.star(T('starlight', {
              x: b.x, y: b.y, n: 30, points: 8, speed: 158,
              a0: f * .008, r: 5, type: 'starpoint', color: 'gold', life: 12
            }));
            P.star(T('starlight', {
              x: b.x, y: b.y, n: 24, points: 5, speed: 124,
              a0: -f * .01, r: 5, type: 'starpoint', color: 'white', life: 12
            }));
          }
        }
      },
      {
        name: '終符「天球の反転」', jp: 'しゅうふ・てんきゅうのはんてん',
        type: 'barrier', hp: 15000, timeout: 130, last: true,
        declare: '「では、天球を裏返します。名前も、星も、すべて。」',
        hint: '终符 · 天球逆转：外环与内环反向旋转的多段星图',
        hintJa: '終符 · 天球反転。外輪と内輪が逆に回る多段の星図',
        style: '参考原作：多段终符（永夜返）与旋转对称天球',
        styleJa: '参考：多段終符（永夜返）と回転対称の天球',
        bgTint: '#050e22',
        intro(b) { b.setTarget(G.PF.w / 2, 145); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 145, 176, 56, .014);
          const t = tier();
          const seg = Math.floor(f / [300, 260, 220, 180][t]) % 4;
          if (seg === 0) {
            /* 一、星图展开：等距星环 */
            if (f % 54 === 0) P.ring(T('starlight', {
              x: b.x, y: b.y, n: 18, speed: 130, a0: f * .006,
              ripple: .03, r: 6, type: 'starpoint',
              colors: ['gold', 'cyan'], life: 12
            }));
          } else if (seg === 1) {
            /* 二、轨道运行：椭圆行星带 */
            if (f % 68 === 0) P.orbitBand(T('starlight', {
              x: b.x, y: b.y, bands: t >= 2 ? 3 : 2, n: 14,
              rx: 128, ry: 74, gap: 28, a0: -f * .007,
              speed: 126, colors: ['cyan', 'silver', 'gold'],
              type: 'big', r: 6, life: 12
            }));
          } else if (seg === 2) {
            /* 三、星座连线：星点＋连线弹 */
            if (f % 92 === 0) P.constellation(T('starlight', {
              x: b.x, y: b.y, points: 7, radius: 146,
              a0: f * .008, n: 5, seg: 7, speed: 132,
              colors: ['gold', 'violet', 'white'], r: 6, life: 12
            }));
          } else {
            /* 四、天球反转：内外多环逆向交错 */
            if (f % 46 === 0) {
              P.ring(T('starlight', {
                x: b.x, y: b.y, n: 20, speed: 148, a0: f * .009,
                ripple: .04, r: 6, type: 'starpoint', color: 'white', life: 12
              }));
              P.ring(T('starlight', {
                x: b.x, y: b.y, n: 16, speed: 112, a0: -f * .011,
                ripple: .03, r: 5, type: 'starpoint', color: 'violet', life: 12
              }));
              if (t >= 2) P.ring(T('starlight', {
                x: b.x, y: b.y, n: 12, speed: 92, a0: f * .014,
                ripple: .02, r: 5, type: 'starpoint', color: 'gold', life: 12
              }));
            }
          }
          /* Lunatic 全程叠一层反向的小星环 */
          if (t === 3 && f % 92 === 46) P.ring(T('starlight', {
            x: b.x, y: b.y, n: 10, speed: 164, a0: -f * .016,
            r: 4, type: 'starpoint', color: 'cyan', life: 11
          }));
        }
      }
    ]
  };

  /* =========================================================
   * 五面 BOSS：音無 楽々 —— 把名字唱成歌的无音乐师
   * 语汇：五线谱激光、音符弹、和弦层、骤停、声波环、乐章回归。
   * 参考原作：九十九弁弁「邪恶的五线谱」「Double Score」、
   *           骚灵三姐妹的节拍型齐发。
   * ========================================================= */
  const rakuraku = {
    id: 'rakuraku', name: '音無 楽々', reading: 'おとなし らくらく',
    title: '名を歌う者', emblem: '音', music: 'boss5',
    color: '#c6a0ff', sub: '#f0e6ff', hair: '#8f78c4', robe: '#3b2a68',
    palette: ['#120a28', '#281448', '#4a2a80'], bg: 'music',
    quote: '「書いた名は消える。けれど、歌った名は残りますの。」',
    desc: '废弃剧场里，一位不再发声的乐师。星羅登记成星的名字，被她一首首唱成旋律收进乐谱；她说写下的字会被擦掉，唱出的歌却能在无人的剧场里一直回响。她已经把自己的名字唱进了歌里，所以本人反而无名。',
    lore: '「音無」意指无声——她唱出的歌只有乐谱，没有声音。她认为符卡决斗中互报名字，本质是把名字唱给对方听；既然如此，把名字编成不会散的旋律，比写在札上更可靠。她的弹幕就是乐谱：五线是激光，音符是弹，休止符是骤停。',
    maxSpells: 6,
    spells: [
      {
        name: '楽符「五線の譜」', jp: 'がくふ・ごせんのふみ',
        type: 'timeout', duration: 23, timeout: 23,
        declare: '「五本の線を、引きましょう。そこが、名前の居場所ですの。」',
        hint: '时限符卡 · 五道五线谱激光与沿线滑行的音符弹',
        hintJa: '時限符卡 · 五本の五線レーザーと線を滑る音符弾',
        style: '参考原作：九十九弁弁「樂符「邪惡的五線譜」」',
        styleJa: '参考：九十九弁弁「楽符「邪悪な五線譜」」',
        bgTint: '#120a28',
        intro(b) { b.setTarget(G.PF.w / 2, 156); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 156, 90, 28, .006);
          const t = tier();
          const W = G.PF.w;
          /* 五线谱固定架在画面上方：五道完全水平、自左向右横贯全屏的谱线。
             高低速一律 5 道，不随难度增加；每 2 秒一波，激光实体持续 2 秒。
             音符落点铺满整幅画面，与谱线位置同步。 */
          const staffY = 128, gap = 18;   // 五道位于 y=92/110/128/146/164
          if (f % 120 === 0) P.scoreLines(T('score', {
            x: 4, y: staffY, lines: 5, gap,
            n: 6 + t, speed: 148, a0: 0,
            noteX0: 20, noteX1: W - 20,
            warn: .6, laserLife: 2, width: 7,
            colors: ['cyan', 'violet', 'gold', 'silver', 'pink'],
            type: 'note', r: 6, life: 11, waveA: 8
          }));
          /* Normal 起：错开半拍补一层落下的音符，不增加谱线数量 */
          if (t >= 1 && f % 120 === 60) P.scoreLines(T('score', {
            x: 4, y: staffY, lines: 5, gap: 26, n: 5 + t,
            speed: 128, a0: 0, noteX0: 20, noteX1: W - 20,
            withLasers: false, colors: ['violet', 'cyan'],
            type: 'note', r: 5, life: 11, waveA: 10
          }));
          /* 拨弦：五道竖激光每 4 秒一次，起点随玩家位置移动。
             五条全部夹在画面内，且中间一条始终压在玩家当前的 x 上——
             也就是说玩家一定处在某条激光的警告路径里，必须走位。 */
          if (f % 240 === 0) {
            const px = M.clamp(G.player ? G.player.x : W / 2, 12, W - 12);
            const gapV = Math.min(118, (W - 60) / 4);
            /* 以玩家为锚点：中间那条（i=2）必定正对玩家当前 x；其余向两侧展开，
               越界的镜像夹回场内。五条都在屏幕内，且玩家永远在警告路径上。 */
            for (let i = 0; i < 5; i++) {
              const off = (i - 2) * gapV;
              let x = px + off;
              if (i !== 2 && (x < 28 || x > W - 28)) x = M.clamp(px - off, 28, W - 28);
              x = M.clamp(x, 12, W - 12);
              P.laser(T('score', {
                x, y: staffY + 36, a0: Math.PI / 2, aim: false, noDiffAngle: true,
                warn: .62, laserLife: 2, width: 8,
                color: i % 2 ? 'gold' : 'white'
              }));
              for (let k = 0; k < 3; k++)
                G.spawnBullet({ x, y: staffY + 36 + k * 24,
                  angle: Math.PI / 2, speed: 156, delay: k * .07,
                  r: 5, type: 'note', color: i % 2 ? 'gold' : 'white', life: 11 });
            }
          }
          /* Hard 起：自机狙的「指挥棒」一音，错开帧 */
          if (t >= 2 && f % 180 === 90) P.fan(T('score', {
            x: b.x, y: b.y, n: 5 + t, spread: .5, aim: true,
            speed: 164, r: 5, type: 'note', color: 'gold'
          }));
          /* Lunatic：只加密落下的音符，不增加谱线/竖激光条数 */
          if (t === 3 && f % 120 === 30) P.scoreLines(T('score', {
            x: 4, y: staffY, lines: 5, gap: 30, n: 6,
            speed: 152, a0: 0, noteX0: 20, noteX1: W - 20,
            withLasers: false, colors: ['pink', 'white'],
            type: 'note', r: 5, life: 11, waveA: 12
          }));
        }
      },
      {
        name: '音符「跳梁する譜」', jp: 'おんぷ・ちょうりょうするふみ',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「弾みますが、鳴りません。……譜に書いた音は、まだ音ではないのです。」',
        hint: '时限符卡 · 音符先静止写在谱上，拍点一到才同时奏响',
        hintJa: '時限符卡 · 音符は一度譜に書き留められ、拍で一斉に鳴る',
        style: '参考原作：静默谱面＋拍点齐奏（时符 / 骚灵拍子），以「延迟起动」实现写谱→奏响',
        styleJa: '参考：静かな譜面と拍点の一斉発射（時符 / 騒霊）、遅延起動で「書く→鳴る」を表現',
        bgTint: '#1a1038',
        intro(b) { b.setTarget(G.PF.w / 2, 152); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 152, 104, 32, .007);
          const t = tier();
          const W = G.PF.w, H = G.PF.h;
          /* 机制：每小节先把一整行音符「写」在谱线上——用长 delay 冻结，
             静止弹无判定；小节末的拍点让它们同时起速（奏响）。
             玩家必须在静默期读谱走位，在奏响的一瞬穿过弹群。
             这与任何现存的环/螺旋/激光阵都不同。 */
          const bar = [180, 150, 126, 108][t];
          const ph = f % bar;
          const beatAt = Math.floor(bar * .78);
          const noteDelay = (bar * .78) / 60;

          if (ph === 0) {
            const rows = [2, 3, 4, 5][t];
            const cols = [7, 8, 9, 11][t];
            for (let r = 0; r < rows; r++) {
              const y = 130 + r * (H * .54 / Math.max(1, rows - 1));
              for (let k = 0; k < cols; k++) {
                const x = 28 + (W - 56) * (k / (cols - 1));
                const aim = M.clamp((G.player ? G.player.x : W / 2) - x, -240, 240) / 1100;
                G.spawnBullet({ x, y,
                  angle: Math.PI / 2 + aim + Math.sin(k * 1.7 + r) * .05,
                  speed: 138 + r * 7 + t * 4,
                  delay: noteDelay + (k % 2) * .04,
                  r: 6, type: 'note',
                  color: (k + r) % 3 === 0 ? 'gold' : ((k + r) % 3 === 1 ? 'cyan' : 'violet'),
                  life: 12 });
              }
            }
          }
          /* 拍点：一记自机狙的「指挥棒」落下，与整行音符同时奏响 */
          if (ph === beatAt)
            P.fan(T('score', {
              x: b.x, y: b.y, n: [3, 5, 7, 9][t], spread: .4 + t * .05,
              aim: true, speed: 168, r: 5, type: 'note', color: 'white'
            }));
          /* 静默期：沿谱线滑过一道无判定的反光，提示下一行将写在哪 */
          if (t >= 1 && ph > 0 && ph % 22 === 0) {
            const rows = [2, 3, 4, 5][t];
            const y = 130 + (Math.floor(ph / 22) % rows) * (H * .54 / Math.max(1, rows - 1));
            P.scoreLines(T('score', {
              x: 4, y, lines: 1, gap: 0, n: 6, speed: 96, a0: 0,
              noteX0: 20, noteX1: W - 20, withLasers: false, laserLife: 2,
              colors: ['silver'], type: 'note', r: 4, life: 10
            }));
          }
          /* Hard 起：反拍补写一行低音音符，用更短的 delay 错开奏响 */
          if (t >= 2 && ph === Math.floor(bar * .38)) {
            const y = H * .72;
            for (let k = 0; k < 9; k++) {
              const x = 40 + (W - 80) * (k / 8);
              G.spawnBullet({ x, y, angle: Math.PI / 2, speed: 122,
                delay: (bar * .40) / 60, r: 5, type: 'note',
                color: k % 2 ? 'pink' : 'silver', life: 11 });
            }
          }
          /* Lunatic：拍点后再补一圈从两侧收束的「余韵」 */
          if (t === 3 && ph === beatAt + 6)
            P.mirrorLine(T('score', {
              x: W / 2, y: b.y + 40, n: 6, spread: 1.0, a0: Math.PI / 2,
              axis: W / 2, color: 'violet', color2: 'gold',
              type: 'note', r: 5, speed: 142, life: 11
            }));
        }
      },
      {
        name: '弦符「和音の層」', jp: 'げんふ・わおんのそう',
        type: 'barrier', hp: 11000, timeout: 106,
        declare: '「三つの音を重ねます。重なった所が、消えない名前ですの。」',
        hint: '结界符卡 · 三层和弦环错相叠加',
        hintJa: '結界符卡 · 三層の和音環が位相をずらして重なる',
        style: '参考原作：和弦层叠与旋转花环（弦楽「嵐のアンサンブル」）',
        styleJa: '参考：和音の層と回転花環（弦楽「嵐のアンサンブル」）',
        bgTint: '#201448',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 132, 44, .010);
          const t = tier();
          const layers = [1, 2, 3, 4][t];
          /* 主造型：三层同心和弦环，层间错开半音（相位） */
          if (f % 72 === 0) {
            const k = Math.floor(f / 72);
            P.multiRing(T('score', {
              x: b.x, y: b.y, n: 18, layers,
              speedStep: 24, nStep: 3, rotStep: .13,
              a0: k * .16 * (t === 3 ? -1 : 1), speed: 124,
              colors: ['violet', 'cyan', 'gold', 'pink'],
              type: 'note', r: 6, life: 12
            }));
          }
          /* Normal 起：和弦之间的「共鸣」——一圈细小的白环 */
          if (t >= 1 && f % 108 === 36) P.ring(T('score', {
            x: b.x, y: b.y, n: 14, speed: 92, a0: -f * .005,
            ripple: .02, r: 4, type: 'note', color: 'white', life: 12
          }));
          /* Hard 起：拨弦式的自机狙五连 */
          if (t >= 2 && f % 144 === 72) P.fan(T('score', {
            x: b.x, y: b.y, n: 5, spread: .5, aim: true,
            speed: 158, r: 5, type: 'note', color: 'gold'
          }));
          /* Lunatic：第四层反向快速和弦，与外层构成对位 */
          if (t === 3 && f % 72 === 36) P.multiRing(T('score', {
            x: b.x, y: b.y, n: 12, layers: 2, speedStep: 30,
            a0: -f * .011, speed: 148,
            colors: ['pink', 'white'], type: 'note', r: 5, life: 11
          }));
        }
      },
      {
        name: '拍符「休止の間」', jp: 'はくふ・きゅうしのま',
        type: 'barrier', hp: 12000, timeout: 108,
        declare: '「二拍、休みます。……鳴らない間も、譜面の内ですの。」',
        hint: '结界符卡 · 休止期间音符静止写在场上，拍点一到全部奏响',
        hintJa: '結界符卡 · 休止中は音符が譜面に書き込まれ、拍で一斉に鳴る',
        style: '参考原作：骚灵三姐妹的节拍齐发 + 时停型齐射（静止弹一次性激活）',
        styleJa: '参考：騒霊三姉妹の拍子一斉発射＋時停型の一斉起動',
        bgTint: '#2a0e44',
        intro(b) { b.setTarget(G.PF.w / 2, 148); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 148, 118, 34, .008);
          const t = tier();
          const cycle = [126, 108, 90, 72][t];
          const beat = Math.floor(f / cycle);
          const ph = f % cycle;
          const hold = Math.floor(cycle * .46);   // 前半拍是「写在谱上的静止音符」

          /* 主造型：休止期把音符弹一颗颗写在场上的谱线位置（delay 冻结），
             拍点一到统一激活——静止本身就是威胁，玩家必须提前找位。 */
          if (ph === 0) {
            const rows = [2, 3, 3, 4][t];
            const per = [6, 7, 8, 9][t];
            for (let r = 0; r < rows; r++)
              for (let k = 0; k < per; k++) {
                const x = 30 + (G.PF.w - 60) * (k / (per - 1));
                const y = 80 + r * 64;
                G.spawnBullet({ x, y,
                  angle: Math.PI / 2 + (x - G.PF.w / 2) / 1400,
                  speed: 158 + r * 8 + t * 6,
                  delay: Math.floor(hold / 60 * .92),
                  r: 6, type: 'note',
                  color: (k + r) % 3 === 0 ? 'gold' : ((k + r) % 3 === 1 ? 'cyan' : 'violet'),
                  life: 11 });
              }
          }
          /* 拍点：先落一记强拍环，把所有静止音符一并「奏响」 */
          if (ph === hold) {
            P.ring(T('score', {
              x: b.x, y: b.y, n: 14 + t * 2, speed: 150 + t * 8,
              a0: beat * .21, ripple: .03, r: 6, type: 'note',
              color: beat % 2 ? 'cyan' : 'gold', life: 12
            }));
            /* 全难度都有的自机狙：让拍点本身也具威胁 */
            P.fan(T('score', {
              x: b.x, y: b.y, n: [3, 5, 7, 9][t], spread: .34 + t * .06,
              aim: true, speed: 164 + t * 6, r: 5, type: 'note', color: 'white'
            }));
          }
          /* 休止期的弱拍：从谱线边缘滑下的小音符，避免空场 */
          if (ph > 0 && ph % 18 === 0) P.scoreLines(T('score', {
            x: b.x, y: b.y + 30, lines: t >= 2 ? 3 : 2, gap: 30,
            n: 5, speed: 126, withLasers: false,
            colors: ['violet', 'silver'], type: 'note', r: 5, life: 11
          }));
          /* Hard 起：反拍补一层反向环，Lunatic 再加一层快环 */
          if (t >= 2 && ph === Math.floor(hold * .7))
            P.ring(T('score', {
              x: b.x, y: b.y, n: 16, speed: 132,
              a0: -beat * .24, ripple: .04, r: 5,
              type: 'note', color: 'silver', life: 11
            }));
          if (t === 3 && ph === Math.floor(hold * .35))
            P.ring(T('score', {
              x: b.x, y: b.y, n: 20, speed: 172,
              a0: beat * .3, ripple: .05, r: 4,
              type: 'note', color: 'violet', life: 11
            }));
        }
      },
      {
        name: '声符「波紋の歌」', jp: 'せいふ・はもんのうた',
        type: 'barrier', hp: 13000, timeout: 112,
        declare: '「声は、波になります。広がって、名前を運びますの。」',
        hint: '结界符卡 · 一圈圈同心声波由内向外推',
        hintJa: '結界符卡 · 同心の音波が内から外へ押し広がる',
        style: '参考原作：同心波纹与月面波纹（波符「月面波纹」）',
        styleJa: '参考：同心の波紋（波符「月面波紋」）',
        bgTint: '#160c38',
        intro(b) { b.setTarget(G.PF.w / 2, 146); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 146, 142, 46, .011);
          const t = tier();
          /* 主造型：多重同心波纹，从中心一圈圈荡开 */
          if (f % 56 === 0) P.waveRings(T('score', {
            x: b.x, y: b.y, n: 20 + t * 2, rings: [2, 3, 4, 5][t],
            r0: 18, gap: 32, speed: 118,
            ringDelay: .08, accel: 180,
            colors: ['cyan', 'violet', 'gold', 'white'],
            type: 'note', r: 6, life: 12
          }));
          /* Normal 起：波与波之间补一层静止的共鸣环 */
          if (t >= 1 && f % 112 === 56) P.ring(T('score', {
            x: b.x, y: b.y, n: 14, speed: 88, a0: -f * .005,
            ripple: .02, r: 5, type: 'note', color: 'white', life: 12
          }));
          /* Hard 起：波前的一记自机狙 */
          if (t >= 2 && f % 168 === 84) P.fan(T('score', {
            x: b.x, y: b.y, n: 5, spread: .44, aim: true,
            speed: 164, r: 5, type: 'note', color: 'gold'
          }));
          /* Lunatic：反向收缩的第二组波纹，与外推波干涉 */
          if (t === 3 && f % 112 === 0) P.waveRings(T('score', {
            x: b.x, y: b.y, n: 18, rings: 3, r0: 220, gap: -32,
            speed: 96, outSpeed: false, ringDelay: .07, accel: 120,
            colors: ['pink', 'violet'], type: 'note', r: 5, life: 11
          }));
        }
      },
      {
        name: '終符「無音の楽章」', jp: 'しゅうふ・むおんのがくしょう',
        type: 'barrier', hp: 16000, timeout: 132, last: true,
        declare: '「最後は、無音です。鳴った音を、全部思い出してください。」',
        hint: '终符 · 四段乐章：谱→音符→和弦→无声回归',
        hintJa: '終符 · 四つの楽章。譜→音符→和音→無音への回帰',
        style: '参考原作：多段终符（永夜返）与乐章式段落推进',
        styleJa: '参考：多段終符（永夜返）と楽章式の進行',
        bgTint: '#0a0620',
        intro(b) { b.setTarget(G.PF.w / 2, 145); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 145, 176, 56, .014);
          const t = tier();
          const seg = Math.floor(f / [320, 270, 230, 190][t]) % 4;
          if (seg === 0) {
            /* 一、谱：五线谱激光 + 持续落下的音符 */
            if (f % 72 === 0) P.scoreLines(T('score', {
              x: b.x, y: b.y, lines: 5, gap: 24, n: 9 + t * 2,
              speed: 140, warn: .62, life: 1.2,
              colors: ['cyan', 'violet', 'gold'], type: 'note', r: 6, life: 12, waveA: 10
            }));
            if (f % 36 === 18) P.scoreLines(T('score', {
              x: b.x, y: b.y + 40, lines: 3, gap: 30, n: 6 + t,
              speed: 128, withLasers: false, colors: ['silver', 'cyan'],
              type: 'note', r: 5, life: 11
            }));
          } else if (seg === 1) {
            /* 二、音符：跳跃的节奏，八分/十六分交替 */
            if (f % 24 === 0) for (let i = 0; i < [7, 9, 11, 13][t]; i++)
              G.spawnBullet({ x: b.x + (i - 6) * 20, y: b.y,
                angle: Math.PI / 2 + (i - 6) * .13, speed: 140 + i * 3,
                wave: 1, waveF: 3.4, waveA: 24,
                r: 5, type: 'note', color: i % 2 ? 'gold' : 'cyan', life: 11 });
            if (t >= 1 && f % 48 === 12)
              P.fan(T('score', { x: b.x, y: b.y, n: 5 + t, spread: .5,
                aim: true, speed: 164, r: 5, type: 'note', color: 'white' }));
          } else if (seg === 2) {
            /* 三、和弦：三层环叠加 + 反拍的小环 */
            if (f % 56 === 0) P.multiRing(T('score', {
              x: b.x, y: b.y, n: 18, layers: t >= 2 ? 3 : 2,
              speedStep: 26, nStep: 3, a0: f * .008, speed: 132,
              colors: ['violet', 'cyan', 'gold'], type: 'note', r: 6, life: 12
            }));
            if (f % 56 === 28) P.ring(T('score', {
              x: b.x, y: b.y, n: 14, speed: 108, a0: -f * .01,
              ripple: .03, r: 5, type: 'note', color: 'silver', life: 11
            }));
          } else {
            /* 四、无声回归：全静两拍后，先前所有音符同时回归成环 */
            if (f % 96 === 0) {
              P.ring(T('score', {
                x: b.x, y: b.y, n: 20, speed: 152, a0: -f * .01,
                ripple: .04, r: 6, type: 'note', color: 'white', life: 12
              }));
              P.ring(T('score', {
                x: b.x, y: b.y, n: 16, speed: 108, a0: f * .009,
                ripple: .03, r: 5, type: 'note', color: 'violet', life: 12
              }));
              if (t >= 2) P.scoreLines(T('score', {
                x: b.x, y: b.y, lines: 5, gap: 22, n: 8,
                speed: 152, withLasers: false, a0: Math.PI,
                colors: ['pink', 'white'], type: 'note', r: 5, life: 11, waveA: 12
              }));
              /* 与 4 号符呼应：终章也把音符先写在谱上，半拍后一起奏响 */
              if (t >= 1) {
                const per = [0, 6, 8, 10][t];
                for (let k = 0; k < per; k++) {
                  const x = 40 + (G.PF.w - 80) * (k / (per - 1));
                  G.spawnBullet({ x, y: b.y + 60,
                    angle: Math.PI / 2 + (x - G.PF.w / 2) / 1200,
                    speed: 162, delay: .42, r: 5, type: 'note',
                    color: k % 2 ? 'pink' : 'white', life: 11 });
                }
              }
              if (t >= 2) P.fan(T('score', {
                x: b.x, y: b.y, n: 7, spread: .46, aim: true,
                speed: 166, r: 5, type: 'note', color: 'white'
              }));
            }
          }
          /* Lunatic 全程叠一层反向小音符环 */
          if (t === 3 && f % 96 === 48) P.ring(T('score', {
            x: b.x, y: b.y, n: 12, speed: 166, a0: -f * .014,
            r: 4, type: 'note', color: 'gold', life: 11
          }));
        }
      }
    ]
  };

  /* =========================================================
   * 六面 BOSS（异变根源）：無名の守人 —— 想让一切回到无名的守护者
   * 语汇：曼荼罗、封印柱、抹名的黑札、阴阳逆极、无名方阵、结界终焉。
   * 与第三面祭篝燎同源却方向相反：燎替人记住名字，守人要把名字收回无名。
   * 参考原作：寅丸星「焦土曼荼罗」、灵梦「八方鬼缚阵」、多段终符。
   * ========================================================= */
  const nameless = {
    id: 'nameless', name: '無名の守人', reading: 'むめいのもりびと',
    title: '結界の裡に在る者', emblem: '無', music: 'boss6',
    color: '#b7b0d8', sub: '#e8e6f5', hair: '#4a4668', robe: '#26223e',
    palette: ['#080610', '#171426', '#2e2848'], bg: 'void',
    quote: '「名があれば、違いが生まれる。違いが、争いを生む。……だから、名を返す。」',
    desc: '结界最深处、连光都懒得照进来的空白之间。她原本是替结界看管「尚未被使用的名字」的守人；看多了名字带来的争执，便想把所有名字收回无名。她连自己的名字也一并抹去了，因此符卡全部「無題」——因为一旦题名，就等于承认自己有名字。',
    lore: '她与第三面的祭篝燎同源：燎在无人来时替人把名字读下去，守人却认为读名字本身就是错的。残札从祭火飘出后，一层层被登记成星、唱成歌，最后都回到她这里，被收进无名。真正的异变不是符卡被改写，而是「被记住」这件事被她判了罪。',
    maxSpells: 7,
    spells: [
      /* 1 消名：笔首沿方框写字，沿途留下飞刀——「写上去又抹掉」 */
      {
        name: '無題「還魂の盤」', jp: 'むだい・かんごんのばん',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「時計の盤に、名を戻します。……針は、止まりませんの。」',
        hint: '时限符卡 · 放射光带构成钟面，紫银蝶弹沿圆周分段爬升',
        hintJa: '時限符卡 · 放射光帯が時計盤を作り、紫銀の蝶弾が円周を昇る',
        style: '参考原作：西行寺幽幽子「反魂蝶」的时钟魔术（光带＋双色蝶弹绕圈）',
        styleJa: '参考：西行寺幽幽子「反魂蝶」の時計の魔術（光帯＋二色の蝶弾）',
        bgTint: '#080610',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 96, 30, .006);
          const t = tier();
          const cycle = [96, 82, 68, 56][t];
          /* 主造型：光环钟面——放射激光当刻度，紫银蝶弹分波沿圆周爬升。
             每波整体旋转一点，像钟面指针一圈圈拨动。 */
          if (f % cycle === 0) {
            const k = Math.floor(f / cycle);
            P.haloDial(T('silence', {
              x: b.x, y: b.y,
              spokes: [10, 12, 14, 16][t],
              arc: [6, 7, 8, 9][t],
              radius: 128 + t * 8, spreadR: 62,
              a0: k * .21, tilt: .1, curve: .18,
              stepDelay: .026, speed: 132 + t * 8,
              laserLife: 1.5, width: 5,
              colors: ['violet', 'silver'],
              type: 'butterfly', r: 6, life: 12
            }));
          }
          /* Normal 起：反向的第二圈，紫银位置对调，两环像齿轮咬合 */
          if (t >= 1 && f % (cycle * 2) === cycle) {
            P.haloDial(T('silence', {
              x: b.x, y: b.y, spokes: 10, arc: 6,
              radius: 92, spreadR: 48,
              a0: -f * .009, tilt: -.12, curve: -.2,
              stepDelay: .022, speed: 150,
              laserLife: 1.2, width: 4,
              colors: ['silver', 'violet'],
              type: 'butterfly', r: 5, life: 11
            }));
          }
          /* Hard 起：同一光环机构再叠一圈逆向「时针」环补强威胁 */
          if (t >= 2 && f % 102 === 51)
            P.haloDial(T('silence', {
              x: b.x, y: b.y, spokes: 8, arc: 5,
              radius: 110, spreadR: 36,
              a0: -f * .011, tilt: -.1, curve: -.2,
              stepDelay: .02, speed: 160,
              withLasers: false, colors: ['white', 'violet'],
              type: 'butterfly', r: 5, life: 11
            }));
          /* Lunatic：第三圈高速小蝶环 */
          if (t === 3 && f % (cycle * 2) === cycle + 28)
            P.haloDial(T('silence', {
              x: b.x, y: b.y, spokes: 12, arc: 5,
              radius: 188, spreadR: 40,
              a0: f * .014, tilt: .14, curve: .22,
              speed: 172, stepDelay: .02,
              withLasers: false, colors: ['white', 'violet'],
              type: 'butterfly', r: 4, life: 11
            }));
        }
      },

      /* 2 名の残影：脉冲网格——全场的名字格子由内而外依次点亮 */
      {
        name: '無題「名の残影」', jp: 'むだい・なのざんえい',
        type: 'barrier', hp: 11800, timeout: 108,
        declare: '「名前を、格子に仕舞いました。……順に、呼びますの。」',
        hint: '结界符卡 · 网格节点按波纹顺序依次发射',
        hintJa: '結界符卡 · 格子の節点が波紋の順に次々と放つ',
        style: '参考原作：八云紫「波与粒的境界」的波纹式扩散',
        styleJa: '参考：八雲紫「波と粒の境界」の波紋状の拡がり',
        bgTint: '#100c1e',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 108, 34, .008);
          const t = tier();
          if (f % 72 === 0) P.pulseGrid(T('silence', {
            x: G.PF.w / 2, y: G.PF.h * .42,
            cols: [7, 9, 11, 13][t], rows: [4, 5, 6, 7][t],
            waveSpeed: 460, gradient: .35,
            spin: (Math.floor(f / 72) % 2) ? .6 : -.6,
            speed: 138 + t * 6, a0: f * .003,
            type: 'rune', color: 'violet', life: 12
          }));
          if (t >= 2 && f % 144 === 72) P.pulseGrid(T('silence', {
            x: G.PF.w / 2, y: G.PF.h * .6,
            cols: 10, rows: 4, waveSpeed: 620, gradient: .5,
            speed: 156, a0: -f * .005,
            type: 'rune', color: 'silver', life: 11
          }));
        }
      },

      /* 3 虚空の縁：盘蛇螺旋——弹如蛇从身上环绕，包裹整屏后散开 */
      {
        name: '無題「虚空の縁」', jp: 'むだい・きょくうのふち',
        type: 'barrier', hp: 12600, timeout: 112,
        declare: '「名を、輪にして巻きます。……解ける時が、来るまで。」',
        hint: '结界符卡 · 盘蛇螺旋自BoSS环绕而出，包裹整屏后散开',
        hintJa: '結界符卡 · 蛇のように螺旋が広がり、画面を包んで解ける',
        style: '参考原作：洩矢诹访子「蛙狩」的盘蛇螺旋包围弹幕',
        styleJa: '参考：洩矢諏訪子「蛙狩」の蛇のように廻る螺旋',
        bgTint: '#0c0a18',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 132, 44, .010);
          const t = tier();
          const cycle = [104, 88, 74, 62][t];
          /* 主造型：多臂盘蛇螺旋——从 Boss 身边一圈圈向外舒展，
             螺旋半径不断增大，覆盖整屏；dir 逐波反向。 */
          if (f % cycle === 0) {
            const k = Math.floor(f / cycle);
            P.coilSerpent(T('silence', {
              x: b.x, y: b.y,
              arms: [3, 4, 5, 6][t], per: [12, 14, 16, 18][t],
              radius: 26, grow: 12, coils: 2.2,
              a0: k * .3, dir: k % 2 ? -1 : 1,
              curve: .04, stepDelay: .026,
              speed: 130 + t * 6,
              colors: ['violet', 'silver'],
              type: 'orb', r: 6, life: 13
            }));
          }
          /* Normal 起：第二组反向小螺旋，与主螺旋交错成双蛇 */
          if (t >= 1 && f % (cycle * 2) === cycle) {
            P.coilSerpent(T('silence', {
              x: b.x, y: b.y, arms: 3, per: 12,
              radius: 18, grow: 9, coils: 1.8,
              a0: -f * .008, dir: -1, curve: -.06,
              stepDelay: .022, speed: 148,
              colors: ['silver', 'ink'],
              type: 'orb', r: 5, life: 12
            }));
          }
          /* Lunatic：第三组更密的螺旋，填满外圈 */
          if (t === 3 && f % (cycle * 2) === cycle + 30) {
            P.coilSerpent(T('silence', {
              x: b.x, y: b.y, arms: 5, per: 16,
              radius: 40, grow: 13, coils: 2.6,
              a0: f * .011, dir: 1, curve: .05,
              stepDelay: .02, speed: 162,
              colors: ['white', 'violet'],
              type: 'orb', r: 4, life: 11
            }));
          }
        }
      },

      /* 4 書き損じの反響：坍缩星——卫星留下追踪星弹，无安定点 */
      {
        name: '無題「書き損じの反響」', jp: 'むだい・かきそじのはんきょう',
        type: 'timeout', duration: 25, timeout: 25,
        declare: '「書いた名は、追って来ます。……其処に居る筈もないのに。」',
        hint: '时限符卡 · 卫星留下会追踪自机的星弹，站着不动必被追上',
        hintJa: '時限符卡 · 星弾が自機を追う。動かなければ、必ず追いつく',
        style: '参考原作：魔理沙「闭符大坍缩」的旋转卫星＋接近变色追踪弹',
        styleJa: '参考：魔理沙「閉符大坍縮」の回転使魔＋接近して追尾する弾',
        bgTint: '#14102a',
        intro(b) { b.setTarget(G.PF.w / 2, 152); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 152, 122, 42, .011);
          const t = tier();
          const cycle = [82, 70, 58, 48][t];
          /* 主造型：卫星绕身旋转留下星弹轨迹，星弹带追踪——
             玩家一旦站定就会被追上，必须持续移动。 */
          if (f % cycle === 0) {
            const k = Math.floor(f / cycle);
            P.collapseOrb(T('silence', {
              x: b.x, y: b.y,
              satellites: [3, 4, 5, 6][t], per: [6, 7, 8, 9][t],
              radius: 108 + t * 8, satR: 28,
              a0: k * .3, speed: 126 + t * 6,
              homing: 1.5 + t * .2, homingT: 1.6,
              curve: .06, stepDelay: .035,
              bulkSpeed: 116, bulkSplit: [8, 10, 12, 14][t], bulkSplitT: 1.05,
              colors: ['silver', 'violet'], bulkColor: 'ink',
              type: 'starpoint', r: 6, life: 12
            }));
          }
          /* Normal 起：反向旋转的第二组卫星，追踪更短更急 */
          if (t >= 1 && f % (cycle * 2) === cycle) {
            P.collapseOrb(T('silence', {
              x: b.x, y: b.y, satellites: 4, per: 6,
              radius: 74, satR: 22, a0: -f * .008,
              speed: 148, homing: 2.1, homingT: 1.2,
              curve: -.08, stepDelay: .03,
              withBulk: false,
              colors: ['violet', 'white'],
              type: 'starpoint', r: 5, life: 11
            }));
          }
          /* Lunatic：第三组高速小卫星，进一步压缩安全空间 */
          if (t === 3 && f % (cycle * 2) === cycle + 24) {
            P.collapseOrb(T('silence', {
              x: b.x, y: b.y, satellites: 5, per: 7,
              radius: 150, satR: 20, a0: f * .012,
              speed: 166, homing: 2.4, homingT: 1.0,
              withBulk: false,
              colors: ['white', 'ink'],
              type: 'starpoint', r: 4, life: 11
            }));
          }
        }
      },

      /* 5 呼ばれない名：永动喷口——无名玉自动从巡游喷口涌出 */
      {
        name: '無題「呼ばれない名」', jp: 'むだい・よばれないな',
        type: 'barrier', hp: 13200, timeout: 116,
        declare: '「呼ばれない名は、天から降ります。……留める事も、出来ませんの。」',
        hint: '结界符卡 · 天上巡游的喷口持续落下无名玉',
        hintJa: '結界符卡 · 天を巡る噴口が無名の玉を降らせる',
        style: '参考原作：八云紫「第一种永动机关」的自动弹幕',
        styleJa: '参考：八雲紫「第一种永動機関」の自動弾幕',
        bgTint: '#0a0816',
        intro(b) { b.setTarget(G.PF.w / 2, 146); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 146, 142, 48, .011);
          const t = tier();
          /* 喷口固定在画面上方横向巡游，无名玉从天上落下；
             间隔较原来拉长约 1.33 倍（发射速率 0.75 倍）。 */
          if (f % 40 === 0) P.autoFountain(T('silence', {
            x: G.PF.w / 2, y: 44, jets: [4, 5, 6, 8][t],
            radius: 120 + t * 12, phase: f * .004,
            n: [3, 4, 5, 6][t], spread: .18,
            stepDelay: .04, curve: .12,
            speed: 134 + t * 6,
            type: 'orb', color: 'silver', life: 12,
            dropFromTop: true
          }));
          if (f % 80 === 40) P.autoFountain(T('silence', {
            x: G.PF.w / 2, y: 30, jets: [3, 4, 5, 6][t], radius: 76,
            phase: -f * .006, n: 4, spread: .2,
            speed: 154, type: 'rune', color: 'violet', life: 11,
            dropFromTop: true
          }));
          if (t >= 2 && f % 120 === 20) P.autoFountain(T('silence', {
            x: G.PF.w / 2, y: 52, jets: 5, radius: 170,
            phase: f * .009, n: 4, spread: .15,
            speed: 168, type: 'orb', color: 'white', life: 11,
            dropFromTop: true
          }));
        }
      },

      /* 6 千の無名：形变——弹在飞行中途变成不同字形 */
      {
        name: '無題「千の無名」', jp: 'むだい・せんのむめい',
        type: 'barrier', hp: 15000, timeout: 120,
        declare: '「四隅の式が、交わる所で名を呼びます。……十文字に、鳴りますの。」',
        hint: '结界符卡 · 四角式神抵达交点时炸开十字弹',
        hintJa: '結界符卡 · 四隅の式が交点で十文字に弾ける',
        style: '参考原作：交叉式神触发弹幕（稗田阿求／天邪鬼十字）',
        styleJa: '参考：交差する式神が引き金になる弾幕',
        bgTint: '#120e24',
        intro(b) { b.setTarget(G.PF.w / 2, 144); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 144, 158, 54, .013);
          const t = tier();
          if (f % 42 === 0) P.crossTrigger(T('silence', {
            x: b.x, y: b.y, n: [6, 8, 10, 12][t],
            rays: [5, 6, 7, 8][t], radius: 240,
            a0: f * .006, splitT: [.6, .5, .42, .34][t],
            curve: .06, accel: 90,
            speed: 132 + t * 6,
            type: 'big', seedType: 'star',
            color: 'violet', color2: 'white',
            r: 6, life: 12
          }));
          if (t >= 1 && f % 84 === 42) P.crossTrigger(T('silence', {
            x: b.x, y: b.y, n: 6, rays: 7, radius: 170,
            a0: -f * .009, splitT: .4,
            curve: -.1, speed: 156,
            type: 'big', seedType: 'starpoint',
            color: 'ink', color2: 'silver',
            r: 5, life: 11
          }));
        }
      },

      /* 7 結界の忘却：先兆齐射——每波先预告位置1秒，再逐颗乱射，
         5 秒内发完；满屏弹全部出屏销毁后才生成下一波。 */
      {
        name: '無題「結界の忘却」', jp: 'むだい・けっかいのぼうきゃく',
        type: 'barrier', hp: 21000, timeout: 150, last: true,
        declare: '「先に、場所を告げます。……それから、一斉に、parade ですの。」',
        hint: '终符 · 预告1秒→5秒内逐颗乱射→全弹出屏后换下一波',
        hintJa: '終符 · 1秒予告→5秒で乱射→全弾が消えて次の波',
        style: '参考原作：先兆预告型弹幕（位置先显形再发射）与旋律曲线齐射',
        styleJa: '参考：予告型弾幕と旋律曲線の一斉発射',
        bgTint: '#04030a',
        intro(b) { b.setTarget(G.PF.w / 2, 145); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 145, 176, 58, .015);
          const t = tier();
          /* 状态机：wave=当前波序号；pending=本波是否已发出。
             只有在场弹全部销毁（出屏）后，才发下一波。 */
          if (b._w7 === undefined) { b._w7 = 0; b._w7Pending = false; }
          const alive = G.bullets.length;
          if (!b._w7Pending || alive === 0) {
            const w = b._w7;
            const ratio = [[3, 2], [5, 4], [7, 6]][w % 3];
            P.heraldSalvo(T('silence', {
              x: G.PF.w / 2, y: G.PF.h * .42,
              freqA: ratio[0], freqB: ratio[1],
              phase: w * .27,
              rx: 290 + (w % 3) * 8, ry: 220 + (w % 3) * 8,
              /* 弹量四档精确 1:2:3:4（以 Normal 128 发为 2 份基准）；
                 速度约为原来的 3 倍（Normal 基准 96→约 300）。 */
              exactCount: [64, 128, 192, 256][t],
              speed: 300 + t * 12 + (w % 3) * 10,
              warnT: 1.0, spanT: 3.0,          // 1 秒预告 + 3 秒逐颗＝4 秒内发完
              aimBias: .88, aimJitter: .22,    // 朝玩家偏转，差距越大偏越多，带随机范围
              colors: [
                ['violet', 'silver'],
                ['silver', 'ink', 'white'],
                ['white', 'violet', 'silver', 'ink']
              ][w % 3],
              type: 'starpoint', r: 5, life: 9   // 出屏即销毁，寿命兜底
            }));
            b._w7Pending = true;
            b._w7++;
          }
        }
      }
    ]
  };

  B.list = [chiyo, honoka, ryou, seira, rakuraku, nameless];
  B.get = i => B.list[i];
})();
