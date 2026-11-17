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
    /* 单帧异常保护：任何一帧抛错都不能让 requestAnimationFrame 断掉，
       否则整局会永久定格（画面卡住、右侧 HUD 消失）。这里兜住异常、
       丢掉出错帧的残余状态、在画面上提示，并保留错误供排查。 */
    function reportFrameError(e, phase) {
      window.__lastFrameError = { message: e && e.message, stack: e && e.stack, phase };
      try { console.error('[frame ' + phase + ']', e); } catch (_) {}
      try {
        const ctx = G.ctx;
        if (ctx) {
          ctx.save();
          ctx.fillStyle = 'rgba(20,6,12,.86)';
          ctx.fillRect(0, G.PF.h * .42, G.PF.w, 58);
          ctx.fillStyle = '#ff9eb0';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('一帧出错已跳过（游戏继续）。按 F12 查看 Console',
            G.PF.w / 2, G.PF.h * .42 + 36);
          ctx.restore();
        }
      } catch (_) {}
    }
    function loop(now) {
      const rdt = Math.min(.05, (now - last) / 1000);
      last = now;
      G.rdt = rdt; G.rtime += rdt; G.dt = rdt;
      acc += rdt;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        try { G.game.step(STEP); }
        catch (e) { reportFrameError(e, 'step'); acc = 0; break; }
        acc -= STEP; steps++;
        G.clearPressed();          // 每个逻辑步只消费一次按键
      }
      if (steps === 0) {
        // 高刷新率：保留按键直到下一个逻辑步，避免丢输入
      } else {
        G.mouse.clicked = false;
      }
      G.frame++;
      try { G.render.frame(rdt); }
      catch (e) { reportFrameError(e, 'render'); }
      if (G.setTouchVis) { try { G.setTouchVis(); } catch (_) {} }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
