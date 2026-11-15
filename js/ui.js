/* ===========================================================
 * ui.js — DOM 界面 / 菜单 / 编成 / 资料室 / 音乐鉴赏
 * =========================================================== */
(function () {
  const G = window.G, M = G.M;
  const U = G.ui = {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  U.charId = 'reimu';
  U.deck = [0, 1, 2, 3, 4];
  U.activeSlot = 0;
  U.galTab = 'story';
  U.titleSel = 0;
  U.screens = {
    title: 'scr-title', select: 'scr-select', config: 'scr-config',
    story: 'scr-story', pause: 'scr-pause', result: 'scr-result', gallery: 'scr-gallery'
  };
  const MENU = [
    { label: '異変調査を始める', act: 'to-select' },
    { label: '資料室・設定', act: 'to-gallery', arg: 'story' },
    { label: '音楽鑑賞', act: 'to-gallery', arg: 'music' },
    { label: '操作・オプション', act: 'to-gallery', arg: 'option' }
  ];

  U.hideAll = () => Object.keys(U.screens).forEach(k => $(U.screens[k]).classList.add('hidden'));
  U.show = k => { U.hideAll(); $(U.screens[k]).classList.remove('hidden'); };
  U.diffIdx = 1;
  U.loc = () => { if (G.localizeDOM) G.localizeDOM(); };
  /* 新增文案直接按当前语言生成，避免依赖逐词替换 */
  U.L = (zhText, jaText) => G.lang === 'zh' ? zhText : jaText;

  /* 语言切换后重建当前界面（模板重新生成日文原文，再按当前语言本地化） */
  U.refresh = function () {
    switch (G.state) {
      case 'title': U.renderTitle(); break;
      case 'select': U.renderSelect(); break;
      case 'config': U.renderConfig(); break;
      case 'gallery': U.renderGallery(); break;
      case 'result': if (G.game.result) U.showResult(G.game.result); break;
      case 'paused': U.showPause(); break;
      case 'story': if (G.game && G.game.dialogLine) G.game.showDialogLine(); break;
    }
    U.loc();
  };

  U.toast = function (msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(U._toastT); U._toastT = setTimeout(() => t.classList.remove('show'), 1900);
  };

  /* ---------------- 标题 ---------------- */
  U.renderTitle = function () {
    $('title-menu').innerHTML = MENU.map((m, i) =>
      `<div class="menu-item ${i === U.titleSel ? 'sel' : ''}" data-menu="${i}">${m.label}</div>`).join('');
  };
  U.chooseMenu = function (i) {
    U.titleSel = i;
    const m = MENU[i];
    G.audio.init(); G.audio.sfx('ok');
    U.act(m.act, m.arg);
  };
  U.goTitle = function () {
    G.state = 'title'; U.show('title'); U.renderTitle();
    G.audio.init(); G.audio.playBGM('title');
  };

  /* ---------------- 机体选择 ---------------- */
  U.renderSelect = function () {
    const cards = $('char-cards');
    cards.innerHTML = G.CHARS.map(c => `
      <div class="char-card ${c.id === U.charId ? 'sel' : ''}" data-char="${c.id}">
        <div class="char-emblem" style="color:${c.color}">${c.emblem}</div>
        <div><h3>${esc(c.name)}</h3><p>${esc(c.title)}<br>${esc(c.tactics.slice(0, 24))}…</p></div>
      </div>`).join('');
    const c = G.getChar(U.charId);
    $('char-detail').innerHTML = `
      <div class="cd-portrait"><canvas width="264" height="340"></canvas></div>
      <h3>${esc(c.name)}</h3>
      <div class="cd-jp">${esc(c.reading)} &nbsp;·&nbsp; ${esc(c.title)}</div>
      <div class="cd-quote">${esc(c.quote)}</div>
      <div class="cd-table">
        <b>原作設定</b>　${esc(c.desc)}<br>
        <b>戦闘傾向</b>　${esc(c.tactics)}<br>
        <b>移動速度</b>　${c.stats.speed} / 低速 ${c.stats.focus}<br>
        <b>判定点</b>　半径 ${c.stats.hitR} px　·　<b>擦弾</b> 半径 ${c.stats.grazeR} px<br>
        <b>火力倍率</b>　×${c.stats.dmgScale.toFixed(2)}　·　<b>霊力取得</b> ×${c.stats.powerGain.toFixed(2)}
      </div>
      <div class="cd-tags">
        <span class="tag">符卡 5 種</span><span class="tag">大招 5 種</span>
        <span class="tag">専用挿入曲</span><span class="tag">原作設定準拠</span>
      </div>
      <div class="cd-table" style="margin-top:14px"><b>符卡一覧</b><br>${c.spells.map((s, i) =>
        `${String(i + 1).padStart(2, '0')}　${esc(s.name)}`).join('<br>')}</div>`;
    const cv = $('char-detail').querySelector('canvas');
    if (cv && G.render) G.render.withCtx(cv, cc => {
      const g = cc.createLinearGradient(0, 0, 0, cv.height);
      g.addColorStop(0, 'rgba(70,30,70,.5)'); g.addColorStop(1, 'rgba(10,5,18,.2)');
      cc.fillStyle = g; cc.fillRect(0, 0, cv.width, cv.height);
      cc.strokeStyle = c.color + '66'; cc.lineWidth = 2;
      cc.beginPath(); cc.arc(cv.width / 2, cv.height * .45, 92, 0, G.TAU); cc.stroke();
      cc.save(); cc.translate(cv.width / 2, cv.height / 2 + 32); cc.scale(3.1, 3.1);
      G.render.drawPlayer({ x: 0, y: 0, charId: c.id, focus: false, invuln: 0, bombTime: 0, power: 0 });
      cc.restore();
    });
    U.renderDiff();
  };

  /* ---------------- 难度选择（原作四档） ---------------- */
  U.renderDiff = function () {
    const row = $('diff-row'); if (!row) return;
    row.innerHTML = G.DIFFS.map((d, i) => `
      <div class="diff-btn ${i === U.diffIdx ? 'sel' : ''}" data-diff="${i}">
        <div class="db-no">${d.no}</div>
        <div class="db-zh">${G.lang === 'zh' ? d.zh : d.ja}</div>
      </div>`).join('');
    const d = G.DIFFS[U.diffIdx];
    $('diff-note').innerHTML = `<b style="color:#e8c57a">${G.lang === 'zh' ? '难度' : '難易度'} · ${d.no}</b>　` +
      (G.lang === 'zh' ? d.descZh : d.descJa) +
      `　<span style="color:#8f7f90">（${G.lang === 'zh' ? '弹幕密度' : '弾幕密度'} ×${d.density} · ${G.lang === 'zh' ? '结界值' : '結界値'} ×${d.bossHp} · ${G.lang === 'zh' ? '残机' : '残機'} ${d.lives}）</span>`;
  };

  /* ---------------- 符卡编成 ---------------- */
  U.renderConfig = function () {
    const c = G.getChar(U.charId), zh = G.lang === 'zh';
    $('config-slots').innerHTML = U.deck.map((idx, i) => {
      const sp = c.spells[idx];
      return `<div class="slot ${i === U.activeSlot ? 'active' : ''}" data-slot="${i}">
        <div class="slot-no">其の${['一', '二', '三', '四', '五'][i]}</div>
        <div class="slot-key">[${i + 1}]</div>
        <div class="slot-glyph" style="color:${G.COLORS[sp.color] || '#fff'}">${sp.glyph}</div>
        <div class="slot-name">${esc(sp.name)}</div>
        <div class="slot-meta">大招：${esc(sp.bomb.name.replace(/^大招/, ''))}</div>
      </div>`;
    }).join('');
    $('config-lib').innerHTML = c.spells.map((sp, i) => `
      <div class="lib-card" data-lib="${i}">
        <div class="lib-glyph" style="color:${G.COLORS[sp.color] || '#fff'}">${sp.glyph}</div>
        <div class="lib-main">
          <div class="lib-name">${esc(sp.name)}</div>
          <div class="lib-jp"><b style="color:#ffe0a0">[${zh ? esc(sp.catZh) : esc(sp.catJa)}]</b>
            　${esc(sp.jp)}　·　${zh ? esc(sp.kindZh) : esc(sp.kindJa)}　·　${esc(sp.shot.type.toUpperCase())}</div>
          <div class="lib-desc">${esc(sp.desc)}</div>
          <div class="lib-balance">${zh ? '弹速' : '弾速'}：<b>${sp.shot.speed} px/s</b>
            　${zh ? '齐射' : '斉射'}：<b>${(60 / sp.shot.rate).toFixed(0)} ${zh ? '次/秒' : '回/秒'}</b>
            　${zh ? '单发威力' : '単発威力'}：<b>${sp.shot.dmg}</b>
            　${zh ? '理论 DPS' : '理論 DPS'}：<b>${sp.dps}</b></div>
          <div class="lib-bomb"><b>${esc(sp.bomb.name)}</b>　${esc(sp.bomb.desc)}</div>
        </div>
      </div>`).join('');
  };
  U.equip = function (i) {
    U.deck[U.activeSlot] = i;
    U.activeSlot = (U.activeSlot + 1) % 5;
    G.audio.sfx('ok');
    U.renderConfig();
  };
  U.randomDeck = function () {
    U.deck = Array.from({ length: 5 }, () => M.randi(0, 4));
    G.audio.sfx('ok'); U.renderConfig(); U.toast('符卡をランダムに編成しました');
  };

  /* ---------------- 剧情 ---------------- */
  U.showStory = function () { U.show('story'); };
  U.setDialog = function (who, txt, idx, total) {
    /* 立即本地化，不等观察器回调，避免中文模式下闪一帧日文 */
    $('dialog-name').textContent = G.tr ? (G.tr(who) || '') : (who || '');
    $('dialog-name').style.display = who ? 'inline-block' : 'none';
    $('dialog-text').textContent = G.tr ? G.tr(txt) : txt;
    $('dialog-next').textContent = `▼  ${idx + 1} / ${total}　·　` + G.t('dialog.next').replace(/^▼\s*/, '');
  };

  /* ---------------- 暂停 ---------------- */
  U.showPause = function () {
    U.show('pause');
    const p = G.player, st = G.game.stage;
    $('pause-body').innerHTML = `
      <div style="text-align:center;font-size:20px;color:#ffe9c8;letter-spacing:4px">暫く、時を止めます</div>
      <div style="margin-top:12px">${esc(st ? st.name : '')}　·　${G.boss ? 'BOSS 戦' : '道中'}<br>
      SCORE　${Math.floor(G.score)}<br>擦弾　${G.graze}　·　残機　${p ? p.lives : 0}　·　霊力　${p ? Math.floor(p.power) : 0}%</div>
      <div style="margin-top:14px;border-top:1px solid rgba(232,197,122,.25);padding-top:10px;font-size:12.5px">
      方向キー / WASD 移動　·　Z 射撃　·　Shift 低速（判定点表示）<br>
      X 大招（霊力 100% で発動）　·　C 符卡切替　·　1～5 直接選択<br>
      V ダッシュ（無敵・20 秒クールダウン）　·　F3 言語切替<br>
      Esc 休止　·　F2 現在の符卡をスキップ（練習用）</div>`;
  };

  /* ---------------- 结算 ---------------- */
  U.showResult = function (r) {
    U.show('result');
    const zh = G.lang === 'zh';
    $('result-title').textContent = G.tr(r.clear ? '異変解決　— CLEAR' : '力尽きる　— GAME OVER');
    const c = G.getChar(r.charId);
    const comment = r.clear
      ? (r.broken === 0
        ? (zh ? '一张符卡也未曾破碎，所有残符都被重新写下。结界今日依旧静静守着内侧。'
          : '一枚も割らずに、全ての残符を書き直した。結界は、今日も静かに内側を守っている。')
        : (zh ? `破碎了 ${r.broken} 张符卡，却依然取回了名字。碎掉的札再写一次就好。`
          : `${r.broken} 枚の符卡を割りながらも、名前を取り戻した。割れた札も、また書けばいい。`))
      : (zh ? '符卡尽数破碎，文字在结界内侧消失。……但名字，仍握在某个人手里。'
        : '札は全て割れ、結界の内側で文字が消えた。……だが、名前はまだ誰かの手の中にある。');
    const cheats = r.cheats || 0;
    const cheatTag = cheats > 0
      ? `<span class="cheat-tag">${zh ? '赖皮通关' : 'ずる再戦クリア'} ×${cheats}</span>` : '';
    $('result-body').innerHTML = `
      <div style="text-align:center;font-size:15px;color:#e8c57a;letter-spacing:3px;margin-bottom:10px">
        ${esc(c.name)}　·　${r.clear ? '全三面 踏破' : '第 ' + r.stage + ' 面 まで'}　${cheatTag}</div>
      <table>
        <tr><td>SCORE</td><td>${r.score.toLocaleString()}</td></tr>
        <tr><td>擦弾 GRAZE</td><td>${r.graze}</td></tr>
        <tr><td>撃破数</td><td>${r.kills}</td></tr>
        <tr><td>割れた符卡</td><td>${r.broken} / 5</td></tr>
        <tr><td>残機</td><td>${r.lives}</td></tr>
        <tr><td>${zh ? '难度' : '難易度'}</td><td>${esc(r.diff || 'Normal')}</td></tr>
        <tr><td>${zh ? '赖皮再战' : 'ずる再戦'}</td><td>${cheats} ${zh ? '次' : '回'}</td></tr>
      </table>
      ${r.canContinue ? `<div class="continue-note">${zh
        ? '从失败的位置继续。当前分数会清零，通关记录会留下赖皮次数。'
        : '敗北した場所から再開します。スコアは 0 に戻り、クリア記録に回数が残ります。'}</div>` : ''}
      <div class="result-comment">${esc(comment)}</div>`;
    const bc = $('btn-continue');
    if (bc) bc.style.display = r.canContinue ? '' : 'none';
  };

  /* ---------------- 资料室 ---------------- */
  const TABS = [
    ['story', '異変の記録'], ['chars', '自機と符卡'], ['enemy', '敵とBoss'],
    ['music', '音楽鑑賞'], ['option', '操作・オプション']
  ];
  U.renderGallery = function () {
    $('gallery-tabs').innerHTML = TABS.map(([k, n]) =>
      `<div class="gtab ${k === U.galTab ? 'sel' : ''}" data-tab="${k}">${n}</div>`).join('');
    const body = $('gallery-body');
    if (U.galTab === 'story') {
      const zh = G.lang === 'zh';
      const lore = (zh ? G.LORE.story : (G.LORE.storyJa || G.LORE.story));
      body.innerHTML = `<div class="gal-sec"><h3>東方残符異変　—　異変の記録</h3>
        ${lore.map(s => `<p>${esc(s)}</p>`).join('')}</div>
        <div class="gal-sec"><h3>本作について</h3><p>${esc(zh ? G.LORE.premise : (G.LORE.premiseJa || G.LORE.premise))}</p>
        <p><b>符卡規則</b>　${esc(zh ? G.LORE.rule : (G.LORE.ruleJa || G.LORE.rule))}</p></div>
        <div class="gal-sec"><h3>二種類の符卡</h3>
        <p><b>時限符卡</b>：固定時間（21～26 秒）で終了。撃破ではなく「耐え切る」事が目的。画面上部の水色ゲージが残り時間。</p>
        <p><b>結界符卡</b>：結界条（赤い HP バー）を削り切れば終了。こちらにも 105～140 秒の長い時限が付き、時間切れでも次へ進む。</p>
        <p>全ての符卡を終えた時点で Boss 撃破。道中・Boss 戦は全三面。</p></div>`;
    } else if (U.galTab === 'chars') {
      const zh = G.lang === 'zh';
      body.innerHTML = `<div class="gal-sec"><h3>自機　—　原作設定に準拠</h3>
        <p>${zh
          ? '每台自机固定 <b>5 张符卡</b> 与 <b>5 种大招</b>，全部落在三大类型内：<b>广域 / 追踪 / 直线</b>。出击时五张一并携带，不再从十张里挑。'
          : '各機体に <b>5 枚の符卡</b> と <b>5 種の大招</b> を固定装備。全て <b>広域 / 追尾 / 直線</b> の三系統に収まる。出撃時は五枚すべてを携行する。'}</p>
        <p>${zh
          ? '<b>限制里的花样</b>：同属一类，三台自机的几何写法也不重样 —— 灵梦是札列、结界线、净化轮与鸟居；魔理沙是星屑针、魔炮、骤雨与六芒；咲夜是银刀齐掷、时穿银枪、时域与钟面。每张符卡的弹道都单独手写。'
          : '<b>制限の中の工夫</b>：同じ系統でも三機体の幾何は重ならない。霊夢は札列・結界線・祓い輪・鳥居、魔理沙は星屑針・魔砲・驟雨・六芒、咲夜は銀刀斉投・時穿銀槍・時域・鐘面。各符卡の弾道を個別に書いた。'}</p>
        <p>${zh
          ? '<b>统一规格</b>：主弹速度 1500～1700 px/s（约 0.45 秒穿越全场），每 4～6 帧一齐射（每秒至少 10 次）。<b>广域 / 追踪约 25 秒击破 10000 结界，直线约 12 秒</b>；单发威力按各类型的有效命中弹数逐张反推。'
          : '<b>共通規格</b>：主弾は 1500～1700 px/s（全場を約 0.45 秒で駆け抜ける）、4～6 フレームごとの斉射（毎秒 10 回以上）。<b>広域・追尾は約 25 秒、直線は約 12 秒で結界 10000 を削る</b>。単発威力は系統ごとの有効命中弾数から一枚ずつ逆算した。'}</p></div>` +
        G.CHARS.map(c => `<div class="gal-sec"><h3 style="color:${c.color}">${esc(c.emblem)}　${esc(c.name)}　<small>${esc(c.title)}</small></h3>
          <p>${esc(c.desc)}</p><p>${esc(c.tactics)}</p>
          <table style="width:100%;font-size:12px;border-collapse:collapse">
          ${c.spells.map((s) => `<tr><td style="width:34px;color:${G.COLORS[s.color]}">${s.glyph}</td>
            <td style="width:220px">${esc(s.name)}</td>
            <td style="width:150px;color:#9fd8c8"><b style="color:#ffe0a0">[${zh ? esc(s.catZh) : esc(s.catJa)}]</b> ${zh ? esc(s.kindZh) : esc(s.kindJa)}<br>
              <small style="color:#c9a8b8">${s.shot.speed} px/s · ${(60 / s.shot.rate).toFixed(0)} ${zh ? '次/秒' : '回/秒'} · ${s.shot.dmg} / DPS ${s.dps}</small></td>
            <td style="color:#b9a7b4">${esc(s.desc)}</td>
            <td style="width:180px;color:#e2a9bb">${esc(s.bomb.name)}</td></tr>`).join('')}
          </table></div>`).join('');
    } else if (U.galTab === 'enemy') {
      const zh = G.lang === 'zh';
      body.innerHTML = `<div class="gal-sec"><h3>三面の弾幕語彙</h3>
        <p>${U.L(
          '三名 Boss 的弹幕机构刻意互不重叠：一面是「文字被写下」的书写型几何，二面是「成对与折返」的镜面反射，三面是「起火→拍子→行列→落灰」的祭典流程。同一 Boss 内每张符卡也各用一套独立机构。',
          '三人の Boss の弾幕機構は、意図的に重ならないように組んでいる。一面は「文字が書かれる」書写型の幾何、二面は「対になり返る」鏡面反射、三面は「火を起こし・拍子を打ち・行列が巡り・灰が落ちる」祭りの進行。同一 Boss の中でも、各符卡は独立した機構しか使わない。')}</p></div>
        <div class="gal-sec"><h3>道中の雑魚（全て本作オリジナル）</h3>
        ${Object.values(G.ENEMY_TYPES).map(e => `<p><b>${esc(e.glyph)}</b>　${esc(e.desc)}</p>`).join('')}</div>` +
        G.BOSSES.list.map(d => `<div class="gal-sec"><h3 style="color:${d.color}">${esc(d.emblem)}　${esc(d.name)}　<small>${esc(d.title)}</small></h3>
          <p>${esc(d.desc)}</p><p style="color:#a99aa7">${esc(d.lore)}</p>
          <p><b>符卡 ${d.spells.length} 枚</b></p>
          <table style="width:100%;font-size:12px;border-collapse:collapse">
          ${d.spells.map((s, i) => `<tr><td style="width:26px">${i + 1}</td>
            <td style="width:260px;color:#ffe6c4">${esc(s.name)}</td>
            <td style="width:96px;color:${s.type === 'timeout' ? '#8fd8ff' : '#ff9eb0'}">${s.type === 'timeout' ? '時限 ' + s.duration + 's' : '結界 ' + s.hp}</td>
            <td style="color:#a99aa7">${esc(zh ? s.hint : (s.hintJa || s.hint))}<br>
              <small style="color:#7f8fa0">${esc(zh ? (s.style || '') : (s.styleJa || s.style || ''))}</small></td></tr>`).join('')}
          </table></div>`).join('');
    } else if (U.galTab === 'music') {
      const cur = G.audio.nowPlaying();
      body.innerHTML = `<div class="gal-sec"><h3>楽曲一覧　—　ピアノ主奏 / Web Audio 实时合成</h3>
        <p style="font-size:12px;color:#a99aa7">${esc(G.lang === 'zh' ? G.LORE.music : (G.LORE.musicJa || G.LORE.music))}</p>
        <p style="font-size:12px;color:#e8c57a">${G.lang === 'zh'
          ? '五首均为约三分钟一次性展开的完整曲式（呈示→模进→转调→高潮→两拍骤停→再现→终止），不再使用二十秒短循环。'
          : '五曲はいずれも約三分の一度きりの展開（提示→模進→転調→高潮→二拍の急停止→再現→終止）。二十秒の短いループは廃止した。'}</p>
        ${G.MUSIC.order.map(id => {
        const t = G.MUSIC.tracks[id];
        const steps = t.order.reduce((s, i) => s + t.sections[i].steps, 0);
        const secs = Math.round(steps * 60 / t.bpm / 4);
        const len = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
        return `<div class="music-row ${cur === id ? 'playing' : ''}" data-music="${id}">
            <div class="mr-play">${cur === id ? '❚❚' : '▶'}</div>
            <div class="mr-title">${esc(t.title)}</div>
            <div class="mr-desc">${esc(t.jp)}　·　${t.key}　·　BPM ${t.bpm}　·　${len}　·　${t.sections.length} ${G.lang === 'zh' ? '段' : '段落'}　·　${esc(G.lang === 'zh' ? t.desc : (t.descJa || t.desc))}</div></div>`;
      }).join('')}
        <p style="margin-top:10px"><b>自機 大招 挿入句</b>　大招発動時に BGM を一瞬絞り、専用の短いフレーズが差し込まれます。符卡番号で転調・テンポ・装飾が変わるため、5 枚すべて異なる響きになります。</p>
        ${Object.entries(G.MUSIC.jingles).map(([k, j]) => {
        const c = G.getChar(k);
        return `<div class="music-row" data-jingle="${k}">
            <div class="mr-play">▶</div><div class="mr-title" style="color:${c.color}">${c.emblem}　${esc(j.name)}</div>
            <div class="mr-desc">${esc(j.desc)}　·　BPM ${j.bpm}　·　${esc(G.getChar(k).name)}</div></div>`;
      }).join('')}
        </div>`;
    } else {
      const L = U.L;
      body.innerHTML = `<div class="gal-sec"><h3>${L('操作', '操作')}</h3>
        <p><b>方向キー / WASD</b>　${L('移动', '移動')}　　<b>Z / J / ${L('左键', '左クリック')}</b>　${L('射击（可按住）', '射撃（押しっぱなし可）')}</p>
        <p><b>Shift</b>　${L('低速移动并显示判定点', '低速移動＋判定点表示')}　　<b>X / K</b>　${L('大招（需灵力 100%）', '大招（霊力 100% 必要）')}</p>
        <p><b>C / L</b>　${L('依次切换符卡', '符卡を順に切替')}　　<b>1～5</b>　${L('直接选择符卡槽', '符卡スロットを直接選択')}</p>
        <p><b>V</b>　${L('朝当前移动方向冲刺（约 0.2 秒、全程无敌、20 秒冷却）。冷却完毕时自机周围会有一圈淡金微光。',
          '移動方向へダッシュ（約 0.2 秒・無敵・20 秒クールダウン）。使用可能時は自機の周りに淡い光が巡ります。')}</p>
        <p><b>Esc / P</b>　${L('暂停', '休止')}　　<b>F2</b>　${L('跳过当前符卡（练习 / 验证用）', '現在の符卡をスキップ（練習・検証用）')}</p>
        <p><b>F3</b>　${L('切换简体中文 / 日本語（也可点击画面左上角按钮）', '簡体字中文 / 日本語 切替（画面左上のボタンでも可）')}</p></div>
        <div class="gal-sec"><h3>${L('难度', '難易度')}</h3>
        <p>${L('Easy / Normal / Hard / Lunatic 四档。弹幕密度、弹速、结界值、杂鱼发弹间隔、残机、灵力回复与得分倍率会联动变化，可在机体选择界面切换。',
          'Easy / Normal / Hard / Lunatic の 4 段階。弾幕密度・弾速・結界値・雑魚の発弾間隔・残機・霊力回復・スコア倍率が連動して変化します。機体選択画面で切り替えてください。')}</p></div>
        <div class="gal-sec"><h3>霊力と「0.5 秒の決断」</h3>
        <p>擦弾・敵撃破で霊力が溜まり、100% で大招が撃てます。被弾すると <b>0.5 秒だけ世界が止まり</b>、画面に亀裂が走ります。</p>
        <p>その間に <b>X / K</b> を押せば大招で無効化（符卡は割れません）。見送れば現在の符卡が<b>破碎</b>し、次のスロットへ。5 枚すべて割れると残機を 1 失い、再编成されます。</p></div>
        <div class="gal-sec"><h3>音量</h3>
        <div class="vol-row"><span>BGM</span><input id="vol-bgm" type="range" min="0" max="100" value="${Math.round(G.audio.bgmVol * 100)}"><b id="vol-bgm-v">${Math.round(G.audio.bgmVol * 100)}</b></div>
        <div class="vol-row"><span>SE</span><input id="vol-se" type="range" min="0" max="100" value="${Math.round(G.audio.sfxVol * 100)}"><b id="vol-se-v">${Math.round(G.audio.sfxVol * 100)}</b></div>
        <p style="font-size:12px;color:#a99aa7">M キーで全音量のミュート切替。音楽はブラウザの制約により、最初のクリック後に鳴り始めます。</p></div>
        <div class="gal-sec"><h3>クレジット</h3>
        <p>企画・弾幕設計・脚本・プログラム・作曲・音色設計：星屑工坊 / 莓可。<br>
        東方 Project（上海アリス幻樂団）へのオマージュとして制作した、非公式のオリジナル作品です。原作の音源・画像・楽曲旋律は一切使用していません。</p></div>`;
      const bind = (id, fn) => {
        const el = $(id); if (!el) return;
        el.addEventListener('input', e => {
          const v = +e.target.value; fn(v / 100); $(id + '-v').textContent = v;
        });
      };
      bind('vol-bgm', v => G.audio.setBGMVol(v));
      bind('vol-se', v => G.audio.setSFXVol(v));
    }
  };

  /* ---------------- 动作分发 ---------------- */
  U.act = function (a, arg) {
    switch (a) {
      case 'to-title': U.goTitle(); break;
      case 'to-select':
        G.state = 'select'; U.show('select'); U.renderSelect();
        G.audio.init(); G.audio.playBGM('title'); G.audio.sfx('ui'); break;
      case 'to-config':
        G.state = 'config'; U.show('config'); U.activeSlot = 0; U.renderConfig(); G.audio.sfx('ok'); break;
      case 'to-gallery':
        G.state = 'gallery'; U.galTab = arg || 'story'; U.show('gallery'); U.renderGallery();
        G.audio.init(); G.audio.sfx('ui'); break;
      case 'random-config': U.randomDeck(); break;
      case 'start-game':
        G.audio.init(); G.audio.sfx('ok');
        G.diff = G.DIFFS[U.diffIdx];
        G.game.startGame(U.charId, U.deck.slice()); break;
      case 'set-diff':
        U.diffIdx = M.clamp(+arg, 0, 3); G.diff = G.DIFFS[U.diffIdx];
        G.audio.sfx('ui'); U.renderDiff(); U.loc(); break;
      case 'toggle-lang': G.toggleLang(); break;
      case 'resume': G.game.togglePause(); break;
      case 'retry':
        G.diff = G.DIFFS[U.diffIdx];
        G.game.startGame(U.charId, U.deck.slice()); break;
      case 'continue':
        G.audio.sfx('ok');
        if (!G.game.continueGame()) G.ui.toast(G.lang === 'zh' ? '没有可继续的断点' : '再戦できる記録がありません');
        break;
    }
  };

  /* ---------------- 事件 ---------------- */
  U.init = function () {
    // 樱花装饰
    const pc = $('petals');
    for (let i = 0; i < 26; i++) {
      const d = document.createElement('div');
      d.className = 'petal';
      d.style.left = (i * 47 % 100) + '%';
      d.style.top = (-10 - Math.random() * 90) + 'px';
      d.style.setProperty('--dx', (M.rand(-120, 160)) + 'px');
      d.style.setProperty('--rot', (M.rand(360, 900)) + 'deg');
      d.style.animationDuration = M.rand(9, 19) + 's';
      d.style.animationDelay = (-M.rand(0, 18)) + 's';
      d.style.opacity = M.rand(.25, .7);
      pc.appendChild(d);
    }

    document.addEventListener('click', e => {
      if (e.target.closest('#lang-btn')) { G.toggleLang(); return; }
      const dif = e.target.closest('[data-diff]');
      if (dif) { U.act('set-diff', dif.dataset.diff); return; }
      const btn = e.target.closest('[data-act]');
      if (btn) { U.act(btn.dataset.act, btn.dataset.arg); return; }
      const menu = e.target.closest('[data-menu]');
      if (menu) { U.chooseMenu(+menu.dataset.menu); return; }
      const ch = e.target.closest('[data-char]');
      if (ch) {
        U.charId = ch.dataset.char;
        U.deck = G.defaultDeck(U.charId);
        G.audio.sfx('ui'); U.renderSelect(); return;
      }
      const slot = e.target.closest('[data-slot]');
      if (slot) { U.activeSlot = +slot.dataset.slot; G.audio.sfx('ui'); U.renderConfig(); return; }
      const lib = e.target.closest('[data-lib]');
      if (lib) { U.equip(+lib.dataset.lib); return; }
      const tab = e.target.closest('[data-tab]');
      if (tab) { U.galTab = tab.dataset.tab; G.audio.sfx('ui'); U.renderGallery(); return; }
      const mus = e.target.closest('[data-music]');
      if (mus) {
        G.audio.init();
        const id = mus.dataset.music;
        if (G.audio.nowPlaying() === id) { G.audio.stopBGM(); U.toast('停止しました'); }
        else { G.audio.playBGM(id); U.toast('♪ ' + G.MUSIC.tracks[id].title); }
        setTimeout(() => U.renderGallery(), 60); return;
      }
      const jn = e.target.closest('[data-jingle]');
      if (jn) {
        G.audio.init(); G.audio.playJingle(jn.dataset.jingle, M.randi(0, 4));
        U.toast('♪ 大招挿入句'); return;
      }
      if (e.target.closest('#dialog-box')) { G.game.advanceDialog(); return; }
    });

    // 标题菜单键盘
    window.addEventListener('keydown', e => {
      if (G.state === 'title') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          U.titleSel = (U.titleSel + MENU.length - 1) % MENU.length; U.renderTitle(); G.audio.sfx('ui');
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          U.titleSel = (U.titleSel + 1) % MENU.length; U.renderTitle(); G.audio.sfx('ui');
        } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') {
          U.chooseMenu(U.titleSel);
        }
      } else if (G.state === 'select') {
        if (e.code === 'Enter') U.act('to-config');
        else if (e.code === 'Escape') U.goTitle();
      } else if (G.state === 'config') {
        if (e.code === 'Enter') U.act('start-game');
        else if (e.code === 'Escape') U.act('to-select');
      } else if (G.state === 'gallery' || G.state === 'result' || G.state === 'paused') {
        if (e.code === 'Escape' && G.state !== 'paused') U.goTitle();
      }
      if (e.code === 'KeyM') {
        const m = G.audio.toggleMute(); U.toast(m ? '消音' : '音量復帰');
      }
    });

    // 初始语言应用 + 后续 DOM 变动自动本地化
    G.applyStatic();
    G.localizeDOM();
    G.startLocalizeObserver();
  };
})();
