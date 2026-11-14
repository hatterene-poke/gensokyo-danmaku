/* ===========================================================
 * bosses.js — 原创 Boss / 符卡脚本
 * type = 'timeout'  : 固定时间结束（生存型，时间到即通过）
 * type = 'barrier'  : 结界条清空结束（另有较长的兜底时限）
 * 击破全部符卡 → 击败 Boss
 *
 * 三名 Boss 的对战语汇刻意互不重叠：
 *   綴屋 千代 …「文字が書かれる」  书写 / 纵列 / 涂抹 / 整页札阵
 *   鏡井 仄   …「映して返す」      成对镜像 / 壁面折返 / 激光折射 / 万花筒
 *   祭篝 燎   …「祭りが始まる」    上升火柱 / 节拍 / 巡游行列 / 落灰 / 多段汇演
 * 同一 Boss 内每张符卡也只使用一套独立机构，不叠用彼此的主图案。
 * =========================================================== */
(function () {
  const G = window.G, P = G.PAT, M = G.M, TAU = G.TAU;
  const T = P.T;
  const B = G.BOSSES = {};
  B.list = [];

  /* 常用：Boss 在场地中缓慢游走 */
  function drift(b, f, cx, cy, ax, ay, sp) {
    b.setTarget(cx + Math.sin(f * sp) * ax, cy + Math.sin(f * sp * .63 + 1.2) * ay);
  }

  /* =========================================================
   * 一面 BOSS：綴屋 千代（つづりや ちよ）
   * 「書き損じの札」から生まれた付喪神。
   * 她的弹幕不是「射出来」的，是「被写下来」的：
   * 玩家能看见笔锋移动、竖排成列、被抹开、最后铺满一整页。
   * 参考原作：札弹与延迟弹（《紅魔郷》大图书馆系）、
   *           纵向落弹与弹墙（《妖々夢》《永夜抄》）、
   *           分裂墨玉与自机狙（《文花帖》取材型）。
   * ========================================================= */
  const chiyo = {
    id: 'chiyo', name: '綴屋 千代', reading: 'つづりや ちよ',
    title: '書き損じの付喪神', emblem: '綴', music: 'boss1',
    color: '#9a7fc0', sub: '#e7dcf5', hair: '#3a2a48', robe: '#5d4479',
    palette: ['#2b1c3e', '#4a2f5e', '#8a6aa8'], bg: 'ink',
    quote: '「その名前、書き損じですの。だから、消しますの。」',
    desc: '被写下又立刻被划掉的字，在结界内侧积成了厚厚一叠。最上面的一张睁开眼睛，便成了她。她不憎恨谁，只是执着地把所有写错的名字逐一抹去。',
    lore: '付丧神（器物经百年而具灵）沿用幻想乡原作设定；本作将其设定为由「残札」诞生。她的弹幕以「书写」为语法——弹不是飞来，而是被一笔一笔写在场上。',
    maxSpells: 4,
    spells: [
      {
        name: '筆符「書きかけの一画」', jp: 'ひつふ・かきかけのいちが',
        type: 'timeout', duration: 23, timeout: 23,
        declare: '「一画ずつ。……消す前に、ちゃんと書いておきますの。」',
        hint: '时限符卡 · 笔锋正在写下一画，撑过 23 秒',
        hintJa: '時限符卡 · 筆先が一画を書く、23 秒耐え切る',
        style: '参考原作：札弹 + 延迟显现的「书写型」弹幕',
        styleJa: '参考：札弾＋遅延出現する「書写型」弾幕（原作の札弾系）', bgTint: '#2b1c3e',
        intro(b) { b.setTarget(G.PF.w / 2, 160); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 158, 95, 26, .005);
          // 主：一笔一画。每 52 帧写一道笔画，笔顺由左上到右下逐点显现
          if (f % 52 === 0) {
            const k = Math.floor(f / 52), seed = k * .83;
            P.stroke(T('ofuda', {
              x0: 54 + M.rand(0, 50), x1: G.PF.w - 54 - M.rand(0, 50),
              y0: b.y - 30, y1: b.y + 56 + Math.sin(seed) * 26,
              n: 16, speed: 132, seed, wave: 34, waveY: 18,
              stepDelay: .024, bend: .38, r: 7,
              color: k % 3 === 0 ? 'gold' : 'crimson'
            }));
          }
          // 副：写完一笔，落一圈极慢的墨点作「句读」
          if (f % 104 === 52) P.ring(T('ink', {
            n: 12, speed: 108, a0: f * .006, r: 6, curve: .05, life: 12
          }));
          // 两拍骤停的留白：第 11 秒一发不发，像笔尖悬在纸上
          if (f > 600 && f < 720) return;
          // 后段加快运笔，并补一道反向下撇
          if (f > 900 && f % 76 === 0) P.stroke(T('violet', {
            x0: G.PF.w - 60, x1: 90, y0: b.y + 20, y1: b.y + 110,
            n: 12, speed: 150, seed: f * .01, wave: 48, stepDelay: .018,
            bend: -.3, dir: -1, r: 6
          }));
        }
      },
      {
        name: '文符「縦書きの雨」', jp: 'ぶんふ・たてがきのあめ',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「文字は縦に読むものですの。上から、順に。」',
        hint: '时限符卡 · 竖排文字雨密集压场',
        hintJa: '時限符卡 · 縦書きの文字雨が敷き詰める',
        style: '参考原作：纵向落弹 + 留缺口的弹墙（《妖々夢》《永夜抄》系）',
        styleJa: '参考：縦落ち弾＋欠けのある弾壁（原作の落弾系）',
        bgTint: '#33204a',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 152, 120, 34, .007);
          /* 全程固定强度：7 列 × 5 行的整页竖排文字雨，每 56 帧压一页。
             发射频率较原版减半、弹速降低三成，让这一面时符有充分的可读性。 */
          if (f % 56 === 0) P.column(T('ofuda', {
            cols: 7, rows: 5, n: 35, speed: 130,
            colDelay: .04, rowDelay: .028, dy: 30, dx: G.PF.w / 8,
            /* 起始高度逐波轮换：开局画面里就有成列的文字，
               轮换周期与主发射间隔保持一致。 */
            x0: 56, y0: -10 + (Math.floor(f / 56) % 3) * 170,
            waveF: 2.6, waveA: 30, tilt: .1,
            seed: f * .011, r: 7, life: 11,
            color: f % 112 === 0 ? 'gold' : 'crimson'
          }));
          // 副：自机狙五枚札（频率同步减半、弹速降低三成）
          if (f % 92 === 0) P.fan(T('ofuda', {
            n: 5, spread: .5, speed: 168, aim: true, a0: 0, r: 6, color: 'purple'
          }));
          // 副：留缺口的纸墙（频率同步减半、弹速降低三成）
          if (f % 148 === 0) P.wall(T('cream', {
            y: -8, speed: 125, step: 26, gapW: 70,
            gap: G.PF.w * (.5 + .3 * Math.sin(f * .004)), r: 7
          }));
        }
      },
      {
        name: '抹符「消え残る一字」', jp: 'まつふ・きえのこるいちじ',
        type: 'barrier', hp: 7600, timeout: 105,
        declare: '「消した筈の一字が、滲んで残りますの。」',
        hint: '结界符卡 · 墨玉炸开、墨线横扫',
        hintJa: '結界符卡 · 墨玉が弾け、墨の線が横に走る',
        style: '参考原作：分裂大玉 + 横向扫弹 + 低速追踪（《文花帖》取材型）',
        styleJa: '参考：分裂大玉＋横掃き弾＋低速追尾（原作の取材型）',
        bgTint: '#46204a',
        intro(b) { b.setTarget(G.PF.w / 2, 155); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 150, 48, .010);
          // 主：墨玉飞到半途洇开成一圈小墨点
          if (f % 46 === 0) P.burst(T('ink', {
            n: 9, speed: 158, a0: f * .006, splitN: 6, splitT: .58,
            seedType: 'big', r: 9, color: 'violet', life: 11
          }));
          // 主：一道墨线横扫，中间留可穿过的缺口（左右交替）
          if (f % 98 === 0) P.erase(T('ink', {
            n: 20, y0: 120 + (f % 196 === 0 ? 0 : 120),
            dir: f % 196 === 0 ? 1 : -1, gap: G.PF.w * (.42 + .16 * Math.sin(f * .005)),
            gapW: 74, wave: 18, stepDelay: .016, speed: 148, r: 6
          }));
          // 副：低速追踪的墨玉，抹不掉的一字
          if (f % 168 === 0) P.homing(T('ink', {
            n: 3, speed: 96, homing: 1.4, homingT: 3.2, r: 8, color: 'ink'
          }));
        }
      },
      {
        name: '残符「白紙への書き出し」', jp: 'ざんふ・はくしへのかきだし',
        type: 'barrier', hp: 11000, timeout: 120,
        declare: '「では、白紙に戻しますの。最初の一行から。」',
        hint: '结界符卡 · 满页札阵连续压制',
        hintJa: '結界符卡 · 頁いっぱいの札が絶え間なく降る',
        style: '参考原作：网格状结界阵 + 逐行延时起动的「满页」压制',
        styleJa: '参考：格子状の結界陣＋行ごとの遅延起動',
        bgTint: '#1e1430',
        intro(b) { b.setTarget(G.PF.w / 2, 148); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 148, 165, 42, .012);
          /* 全程固定满强度：13 列 × 5 行整页札阵，每 48 帧一页。
             原版按四阶段逐步加密，前五秒几乎没弹，这里全部取消。 */
          if (f % 42 === 0) P.page(T('cream', {
            cols: 13, rows: 6, n: 78,
            gap: G.PF.w * (.5 + .3 * Math.sin(f * .0042)), gapW: 66,
            rowDelay: .045, dy: 30,
            y0: -10 + (Math.floor(f / 42) % 3) * 160,
            speed: 215, r: 7, life: 12
          }));
          // 副：落款笔锋，全程每 72 帧一道，横向扫过整页
          if (f % 72 === 0) P.stroke(T('ofuda', {
            x0: 70, x1: G.PF.w - 70, y0: b.y + 10, y1: b.y + 96,
            n: 16, speed: 200, seed: f * .013, wave: 44,
            stepDelay: .014, r: 7
          }));
          // 副：四周向中心收束的墨点，全程每 60 帧一圈，压缩玩家的站位
          if (f % 60 === 0) P.seepRing(T('violet', {
            n: 18, speed: 240, delay: .3, accel: 240, dist: 235, r: 6
          }));
        }
      }
    ]
  };

  /* =========================================================
   * 二面 BOSS：鏡井 仄（かがい ほのか）
   * 「一度も映さなかった鏡」から生まれた付喪神。
   * 她的弹幕永远「成对」或「折返」：
   * 玩家必须判断哪一侧是真身、弹会从哪面墙回来、光会折向何处。
   * 参考原作：对称飞刀与时停（《紅魔郷》咲夜）、
   *           壁面反射弹（《輝針城》《天空璋》系）、
   *           扇形激光与分裂碎片（《星蓮船》《永夜抄》）、
   *           k 重对称的万华镜（《妖々夢》幽明结界系）。
   * ========================================================= */
  const honoka = {
    id: 'honoka', name: '鏡井 仄', reading: 'かがい ほのか',
    title: '映さなかった鏡', emblem: '映', music: 'boss2',
    color: '#7fe6e0', sub: '#dffcff', hair: '#9fd8e0', robe: '#2a5f78',
    palette: ['#082a3a', '#124f63', '#63b9c9'], bg: 'mirror',
    quote: '「そちらが本物か、こちらが本物か。……どちらも、映した事が無いの。」',
    desc: '一面从未被使用过、连光都没照过的古镜，被人塞进柜子最深处而遗忘了。她在无人观看的黑暗里长出意识，于是坚信「不被看见的东西才是真实」。',
    lore: '沿用原作「道具成灵 / 镜与境界」的意象；本作把她设计为异变第二层——把「符卡被看见」这件事反过来。她的弹幕从不单独出现，永远有另一侧与之对应。',
    maxSpells: 4,
    spells: [
      {
        name: '鏡符「合わせ鏡」', jp: 'きょうふ・あわせかがみ',
        type: 'timeout', duration: 22, timeout: 22,
        declare: '「こちら側から、始めますわ。……もう片方も、ご一緒に。」',
        hint: '时限符卡 · 所有弹幕严格左右成对',
        hintJa: '時限符卡 · 全ての弾が厳密に左右で対になる',
        style: '参考原作：中轴对称的飞刀 n-way（《紅魔郷》咲夜系）',
        styleJa: '参考：中軸対称の n-way（原作の飛刀系）',
        bgTint: '#0b2b3c',
        intro(b) { b.setTarget(G.PF.w / 2, 155); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 154, 84, 24, .008);
          // 主：以画面中轴为镜，成对放射；镜轴本身随进度微微偏移
          if (f % 30 === 0) P.mirrorLine(T('mirror', {
            n: 9, spread: 1.45, speed: 172,
            a0: Math.PI / 2 + Math.sin(f * .004) * .32,
            axis: G.PF.w / 2 + Math.sin(f * .002) * 46,
            color: 'cyan', color2: 'indigo', r: 6, curve: .07, life: 12
          }));
          // 副：镜轴两侧同时落下的一层薄环，强调「对称」而非「数量」
          if (f % 120 === 60) {
            for (const x of [G.PF.w * .28, G.PF.w * .72])
              P.ring(T('crystal', { x, y: b.y, n: 10, speed: 138, a0: -f * .008, r: 5 }));
          }
          if (f > 660 && f < 730) return; // 留白：镜面静止的一瞬
          // 后段：从下往上的「倒影」，同样成对
          if (f > 730 && f % 44 === 0) P.mirrorLine(T('mirror', {
            n: 6, spread: .9, speed: 150, a0: -Math.PI / 2,
            color: 'teal', color2: 'silver', r: 5
          }));
        }
      },
      {
        name: '虚像「壁を渡る影」', jp: 'きょぞう・かべをわたるかげ',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「壁の向こうにも、私は居ますの。さあ、どちらを見ます？」',
        hint: '时限符卡 · 全屏壁面折返交叉网',
        hintJa: '時限符卡 · 画面全体を覆う壁面折返しの網',
        style: '参考原作：壁面反射弹（bounce）与交叉网（《輝針城》《天空璋》系）',
        styleJa: '参考：壁面反射弾（bounce）と交差網',
        bgTint: '#123a4a',
        intro(b) {
          b.setTarget(G.PF.w / 2, 160);
          /* 符卡一开始就铺好四层折返网 + 两束中央碎片（依次渐显），
             开局即有全屏密度，不再让玩家等十几秒才等到弹幕铺开。 */
          for (let k = 0; k < 4; k++) P.reflectWall(T('crystal', {
            n: 10, y0: 34 + k * 18, step: 62,
            speed: 158, bounce: 2, tilt: k % 2 ? -.24 : .24,
            delay: k * .09, color: 'cyan', color2: 'silver', r: 6, life: 11
          }));
          for (let k = 0; k < 2; k++) P.bounce(T('mirror', {
            x: G.PF.w / 2, y: G.PF.h * (.46 + k * .14),
            n: 9, speed: 147, spread: 1.15, a0: Math.PI / 2 + (k ? .3 : -.3),
            bounce: 2, delay: .12 + k * .1, r: 7, color: 'teal'
          }));
        },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 110, 36, .009);
          /* 全程固定满强度：两壁各 12 发，从 y=26 铺到 y=664（几乎整个场地高度），
             上下倾角逐波交替形成 X 形交叉；上下边界都会折返，不会中途消失。 */
          if (f % 40 === 0) P.reflectWall(T('crystal', {
            n: 12, y0: 26, step: 58,
            speed: 158, bounce: 2,
            tilt: (Math.floor(f / 40) % 2) ? .26 : -.26,
            color: 'cyan', color2: 'silver', r: 6, life: 11
          }));
          // 副：自场地中央偏下散开的反弹碎片，补满 x 中段与下半屏
          if (f % 42 === 0) P.bounce(T('mirror', {
            x: G.PF.w / 2, y: G.PF.h * .55,
            n: 9, speed: 147, spread: 1.15, a0: Math.PI / 2,
            bounce: 2, r: 7, color: 'teal'
          }));
        }
      },
      {
        name: '折光「七色の割れ目」', jp: 'せっこう・なないろのわれめ',
        type: 'barrier', hp: 9800, timeout: 108,
        declare: '「光は曲がりますの。どこへ出るか、当ててみて。」',
        hint: '结界符卡 · 扇形激光与折射碎片',
        hintJa: '結界符卡 · 扇形レーザーと屈折した欠片',
        style: '参考原作：扇形预警激光 + 沿光束分裂的碎片（《星蓮船》《永夜抄》系）',
        styleJa: '参考：扇形予告レーザー＋光線に沿う分裂弾',
        bgTint: '#0e3a52',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 148, 132, 44, .011);
          const ph = Math.floor(f / 280) % 3;
          if (ph === 0) {
            // 预警 → 扇形激光阵
            if (f % 96 === 0) P.laserFan(T('mirror', {
              arms: 5, spread: 1.0, warn: .82, life: 1.35, width: 10,
              color: 'cyan', aim: true
            }));
            if (f % 48 === 24) P.star(T('crystal', {
              n: 22, points: 6, speed: 158, a0: f * .008, r: 6, color: 'silver'
            }));
          } else if (ph === 1) {
            // 每道光束末端折射出分裂碎片
            if (f % 84 === 0) P.prism(T('mirror', {
              arms: 5, a0: f * .01, warn: .74, life: 1.4, width: 11,
              speed: 178, splitN: 4, splitT: .55, refract: .14,
              color: 'teal', r: 6
            }));
          } else {
            if (f % 70 === 0) P.laserWheel(T('crystal', {
              arms: 6, a0: -f * .009, warn: .7, life: 1.5, width: 10, color: 'white'
            }));
            if (f % 34 === 0) P.ring(T('mirror', {
              n: 16, speed: 166, a0: f * .011, r: 5, curve: .13, color: 'blue'
            }));
          }
        }
      },
      {
        name: '残符「万華鏡の内側」', jp: 'ざんふ・まんげきょうのうちがわ',
        type: 'barrier', hp: 12800, timeout: 125,
        declare: '「割れても、増えても、私の数は変わりませんの。」',
        hint: '结界符卡 · k 重对称的万花筒',
        hintJa: '結界符卡 · k 重対称の万華鏡',
        style: '参考原作：多重旋转对称的结界花环（《妖々夢》幽明结界系）',
        styleJa: '参考：多重回転対称の結界花環',
        bgTint: '#062032',
        intro(b) { b.setTarget(G.PF.w / 2, 148); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 150, 50, .013);
          const ph = Math.floor(f / 300) % 4;
          // 主：对称重数随阶段 4 → 5 → 6 → 8 递增
          const k = [4, 5, 6, 8][ph];
          if (f % 32 === 0) P.kaleido(T('mirror', {
            k, n: 4 + (ph > 1 ? 1 : 0), petals: 5, spread: .42,
            a0: f * .012 * (ph % 2 ? -1 : 1), speed: 160 + ph * 9,
            curve: .1, colors: ['cyan', 'silver', 'blue', 'violet'], r: 6
          }));
          // 阶段 2 起：镜中分身各放一圈反向螺旋
          if (ph >= 2 && f % 120 === 60) {
            for (const x of [b.x - 170, b.x + 170])
              P.spiral(T('crystal', {
                x, y: b.y, arms: 3, speed: 152,
                a0: f * .03 * (x < b.x ? 1 : -1), twin: true,
                curve: .18, color: 'silver', color2: 'indigo', r: 5
              }));
          }
          // 终段：花心炸裂，碎片仍保持对称
          if (ph === 3 && f % 96 === 0) P.burst(T('mirror', {
            n: 8, speed: 150, splitN: 6, splitT: .5, r: 9, color: 'white'
          }));
        }
      }
    ]
  };

  /* =========================================================
   * 三面 BOSS（异变主谋）：祭篝 燎（まつかがり りょう）
   * 被人类忘掉的祭典与篝火中诞生的神明。
   * 她的弹幕是「一场祭典的流程」：
   * 起火 → 打拍子 → 提灯行列 → 落灰 → 最后全部一齐点亮。
   * 参考原作：上升火柱与蝶（《妖々夢》幽々子 / 《地霊殿》お空）、
   *           节拍型齐发（《妖々夢》骚灵三姐妹）、
   *           巡回队列与花弹（《花映塚》）、
   *           多段终符结构（《永夜抄》「永夜返」）。
   * ========================================================= */
  const ryou = {
    id: 'ryou', name: '祭篝 燎', reading: 'まつかがり りょう',
    title: '忘れられた祭火', emblem: '燎', music: 'boss3',
    color: '#ffb35c', sub: '#ffe8c4', hair: '#7a2f3c', robe: '#b8324f',
    palette: ['#2c0f1c', '#6e2030', '#c86b3c'], bg: 'fire',
    quote: '「忘れられたから、消える訳じゃない。……ただ、誰も灯しに来なかっただけ。」',
    desc: '很久以前，山里的祭典每年都会点起篝火。后来人走了、名字忘了，火却还在结界内侧一直烧着。她从那堆无人添柴的余烬里站了起来，把整个幻想乡的符札一张张收进火里——只要还有人记得，就不会真正熄灭。',
    lore: '沿用原作「被遗忘之物化为神 / 信仰与名字维系存在」的核心设定；她与博丽大结界的规则同源，因此能改写符卡的结束方式。她的符卡是一场祭典的顺序，越到后面，参与的东西越多。',
    maxSpells: 5,
    spells: [
      {
        name: '灯符「誰も来ない祭り」', jp: 'とうふ・だれもこないまつり',
        type: 'timeout', duration: 21, timeout: 21,
        declare: '「まず、火を起こします。誰も見ていなくても。」',
        hint: '时限符卡 · 火苗自脚下升起',
        hintJa: '時限符卡 · 火の粉が足元から昇ってくる',
        style: '参考原作：自下而上的上升弹与火蝶（《妖々夢》《地霊殿》系）',
        styleJa: '参考：下から上へ昇る弾と火蝶',
        bgTint: '#3a1119',
        intro(b) { b.setTarget(G.PF.w / 2, 160); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 158, 96, 30, .007);
          // 主：从画面底部升起的火苗，左右摇曳、越升越快
          if (f % 16 === 0) P.emberRise(T('fire', {
            n: 5, speed: 128, accel: 70, tilt: .24,
            waveF: 2.6, waveA: 40, colors: ['amber', 'red', 'gold'], r: 6, life: 11
          }));
          // 副：火之花在中空缓缓张开，与上升弹形成纵向通路
          if (f % 82 === 0) P.flower(T('fire', {
            n: 20, petals: 6, amp: .42, speed: 132,
            a0: -f * .004, r: 6, color: 'gold'
          }));
          if (f > 700 && f < 770) return; // 火势暂歇
          // 后段：火柱加宽，但始终留出可穿行的间隙
          if (f > 770 && f % 26 === 0) P.emberRise(T('fire', {
            n: 3, speed: 158, accel: 90, tilt: .12, jitter: 20,
            colors: ['red', 'amber'], r: 5
          }));
        }
      },
      {
        name: '拍符「鳴らなかった拍子」', jp: 'はくふ・ならなかったひょうし',
        type: 'timeout', duration: 24, timeout: 24,
        declare: '「拍子は、鳴っていましたの。聞く人が居なかっただけ。」',
        hint: '时限符卡 · 严格节拍，拍与拍之间完全安静',
        hintJa: '時限符卡 · 厳密な拍子、拍と拍の間は完全な静寂',
        style: '参考原作：骚灵三姐妹的节拍型齐发（《妖々夢》），动静对比',
        styleJa: '参考：騒霊三姉妹の拍子型一斉発射、動静の対比',
        bgTint: '#3d1830',
        intro(b) { b.setTarget(G.PF.w / 2, 150); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 118, 34, .008);
          // 主：一拍一齐发。拍点之外完全不发弹，制造「没响过的拍子」
          const beat = f > 840 ? 72 : 96;
          if (f % beat === 0) {
            const k = Math.floor(f / beat);
            P.beatRing(T('lantern', {
              n: 14, layers: 2,
              speed: 158, speedStep: 44, a0: k * .21,
              aimN: 5, aimSpread: .46, aimColor: 'amber',
              colors: ['amber', 'sakura'], type: 'fire', r: 6
            }));
            if (k % 3 === 2) P.laser(T('fire', {
              a0: .3, warn: .55, life: .9, width: 9, color: 'gold', aim: true
            }));
          }
        }
      },
      {
        name: '行列「千の提灯」', jp: 'ぎょうれつ・せんのちょうちん',
        type: 'barrier', hp: 11200, timeout: 110,
        declare: '「提灯を並べますの。一列ずつ、順に灯して。」',
        hint: '结界符卡 · 灯笼沿椭圆依次点亮后散开',
        hintJa: '結界符卡 · 提灯が楕円に順に灯り、散る',
        style: '参考原作：巡回队列与花弹（《花映塚》），延迟依次起动',
        styleJa: '参考：巡回する行列弾と花弾、遅延起動',
        bgTint: '#4a1523',
        intro(b) { b.setTarget(G.PF.w / 2, 148); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 150, 142, 44, .010);
          // 主：椭圆队列逐盏点亮，随后向外散开；半径随阶段变化
          if (f % 78 === 0) {
            const ph = Math.floor(f / 300) % 3;
            P.procession(T('lantern', {
              n: 18 + ph * 2, radius: 110 + ph * 34, ry: 74 + ph * 18,
              cx: G.PF.w / 2, cy: 268, a0: f * .006,
              stepDelay: .042, speed: 170, accel: 130,
              outward: ph !== 1, colors: ['gold', 'amber', 'sakura'], r: 7, life: 12
            }));
          }
          // 副：外圈提灯环，给玩家一条明确的绕行线
          if (f % 132 === 66) P.ring(T('fire', {
            n: 16, speed: 142, a0: -f * .005, r: 6, curve: .1, color: 'red'
          }));
        }
      },
      {
        name: '灰符「燃え残った星」', jp: 'はいふ・もえのこったほし',
        type: 'barrier', hp: 13400, timeout: 118,
        declare: '「燃やした札は、灰になってからが本番ですの。」',
        hint: '结界符卡 · 余烬大玉半途炸成星屑',
        hintJa: '結界符卡 · 燃え残りの大玉が途中で星屑に弾ける',
        style: '参考原作：分裂大玉 + 低速追踪余烬 + 星形速度分布',
        styleJa: '参考：分裂大玉＋低速追尾の燃え残り＋星形速度分布',
        bgTint: '#221436',
        intro(b) { b.setTarget(G.PF.w / 2, 145); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 148, 158, 52, .012);
          const ph = Math.floor(f / 280) % 3;
          if (ph === 0) {
            if (f % 40 === 0) P.emberFall(T('star', {
              n: 5, y: -12, speed: 118, splitN: 6, splitT: .72,
              waveF: 1.8, waveA: 30, colors: ['gold', 'amber'], r: 9, life: 12
            }));
          } else if (ph === 1) {
            if (f % 76 === 0) P.star(T('star', {
              n: 26, points: 5, speed: 168, a0: f * .007, r: 6, color: 'gold'
            }));
            if (f % 148 === 0) P.homing(T('fire', {
              n: 4, speed: 108, homing: 1.6, homingT: 2.8, r: 7, color: 'cream'
            }));
          } else {
            if (f % 34 === 0) P.emberFall(T('fire', {
              n: 4, y: -12, speed: 138, splitN: 7, splitT: .6,
              colors: ['red', 'gold', 'amber'], r: 9
            }));
            if (f % 96 === 48) P.grandFlower(T('star', {
              n: 20, layers: 2, petals: 7, colors: ['gold', 'white'],
              speed: 152, a0: -f * .006, r: 6
            }));
          }
        }
      },
      {
        name: '残符「万象忘却の宴」', jp: 'ざんふ・ばんしょうぼうきゃくのうたげ',
        type: 'barrier', hp: 18000, timeout: 140,
        declare: '「最後です。全部、灯します。……忘れないで。」',
        hint: '终符 · 五段汇演，击破它即解决异变',
        hintJa: '終符 · 五段の宴。撃破すれば異変は解決',
        style: '参考原作：《永夜抄》「永夜返」式多段终符，逐段叠回前四张的机构',
        styleJa: '参考：「永夜返」式の多段終符、前四枚の機構を畳み込む',
        bgTint: '#160b1c', last: true,
        intro(b) { b.setTarget(G.PF.w / 2, 145); },
        script(b, f) {
          drift(b, f, G.PF.w / 2, 145, 176, 56, .014);
          const seg = Math.floor(f / 260) % 5;
          if (seg === 0) {           // 一、起火
            if (f % 18 === 0) P.emberRise(T('fire', {
              n: 5, speed: 142, accel: 80, tilt: .2,
              colors: ['amber', 'red', 'gold'], r: 6
            }));
          } else if (seg === 1) {    // 二、拍子
            if (f % 80 === 0) P.beatRing(T('lantern', {
              n: 16, layers: 2, speed: 168, speedStep: 46,
              a0: f * .004, aimN: 5, aimSpread: .5,
              colors: ['amber', 'sakura'], type: 'fire', r: 6
            }));
          } else if (seg === 2) {    // 三、行列
            if (f % 72 === 0) P.procession(T('lantern', {
              n: 20, radius: 142, ry: 88, cy: 262, a0: f * .007,
              stepDelay: .036, speed: 180, accel: 140,
              colors: ['gold', 'amber', 'sakura'], r: 7
            }));
          } else if (seg === 3) {    // 四、落灰
            if (f % 30 === 0) P.emberFall(T('star', {
              n: 5, y: -12, speed: 132, splitN: 7, splitT: .62,
              colors: ['gold', 'amber', 'red'], r: 9
            }));
          } else {                   // 五、万象：只把前四段的祭典机构一齐点亮
            if (f % 22 === 0) P.beatRing(T('lantern', {
              n: 18, layers: 2, speed: 176, speedStep: 48, a0: f * .012,
              aimN: 5, aimSpread: .5,
              colors: ['amber', 'sakura', 'gold'], type: 'fire', r: 6
            }));
            if (f % 20 === 0) P.emberRise(T('fire', {
              n: 3, speed: 166, accel: 90, tilt: .16,
              colors: ['gold', 'red'], r: 5
            }));
            if (f % 48 === 0) P.procession(T('lantern', {
              n: 14, radius: 118, ry: 70, cy: 258, a0: -f * .008,
              stepDelay: .03, speed: 190, accel: 150,
              colors: ['gold', 'cream'], r: 6
            }));
            if (f % 64 === 0) P.emberFall(T('star', {
              n: 4, y: -12, speed: 138, splitN: 6, splitT: .6,
              colors: ['gold', 'amber'], r: 8
            }));
            if (f % 100 === 0) P.laserWheel(T('star', {
              arms: 6, a0: f * .006, warn: .62, life: 1.2, width: 11, color: 'white'
            }));
          }
        }
      }
    ]
  };

  B.list = [chiyo, honoka, ryou];
  B.get = i => B.list[i];
})();
