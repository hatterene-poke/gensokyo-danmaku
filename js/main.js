/* ===========================================================
 * main.js — 入口 / 固定步长主循环 / 全局键盘路由
 * =========================================================== */
(function () {
  const G = window.G;
  const STEP = 1 / 60;

  function boot() {
    G.initCanvas();
    G.render.init();
    G.ui.init();
    G.fitScreen();
    G.ui.goTitle();

    // 剧情：点击画面任意处也可推进
    G.canvas.addEventListener('click', () => {
      if (G.state === 'story') G.game.advanceDialog();
    });

    // 全局键盘（标题/菜单由 ui.js 处理）
    window.addEventListener('keydown', e => {
      if (e.code === 'F3') { e.preventDefault(); G.toggleLang(); return; }
      if (G.state === 'story') {
        if (['Enter', 'Space', 'KeyZ', 'KeyJ', 'KeyX', 'KeyK'].includes(e.code)) {
          e.preventDefault(); G.game.advanceDialog();
        }
      } else if (G.state === 'playing') {
        if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); G.game.togglePause(); }
        else if (e.code === 'F2') { e.preventDefault(); G.game.debugSkip(); G.ui.toast('符卡をスキップ'); }
        else if (e.code === 'F1') { e.preventDefault(); G.game.debug = !G.game.debug; }
      } else if (G.state === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); G.game.togglePause(); }
      }
    });

    let last = performance.now(), acc = 0;
    function loop(now) {
      const rdt = Math.min(.05, (now - last) / 1000);
      last = now;
      G.rdt = rdt; G.rtime += rdt; G.dt = rdt;
      acc += rdt;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        G.game.step(STEP);
        acc -= STEP; steps++;
        G.clearPressed();          // 每个逻辑步只消费一次按键
      }
      if (steps === 0) {
        // 高刷新率：保留按键直到下一个逻辑步，避免丢输入
      } else {
        G.mouse.clicked = false;
      }
      G.frame++;
      G.render.frame(rdt);
      if (G.setTouchVis) G.setTouchVis();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
