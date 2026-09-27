/* fw.js：设计令牌 + 内核（RPC/运行轮询/定时器）+ 原语
   三层结构：
     T  设计令牌（改这里=全站换肤）
     K  内核（RPC 仪表与守护、运行启动与轮询、timer 包装）
     P  原语（row/btn/field/panel/card/msg：页签只声明结构，不碰 className）*/
return {
  inject: ['slots', 'timer'],
  apply(ctx) {
    const h = React.createElement;
    const slots = ctx.get('slots');
    const timer = ctx.get('timer');

    /* ===== 1. 设计令牌：所有视觉常量集中于此 ===== */
    const T = {
      brand: 'var(--dsw-alias-brand-primary, #5b7cfa)',
      ok: 'var(--dsw-alias-state-success-primary, #3fb27f)',
      err: 'var(--dsw-alias-state-error-primary, #e5484d)',
      warn: 'var(--dsw-alias-state-warn-primary, #f5a524)',
      text: 'var(--dsw-alias-label-primary, inherit)',
      text2: 'var(--dsw-alias-label-secondary, inherit)',
      bg: 'var(--dsw-alias-bg-base, transparent)',
      bg1: 'var(--dsw-alias-bg-layer-1, transparent)',
      bg2: 'var(--dsw-alias-bg-layer-1, transparent)',
      b1: 'var(--dsw-alias-border-l1, transparent)',
      b2: 'var(--dsw-alias-border-l2, transparent)',
      r: '12px', rS: '8px', rXs: '6px', rTab: '10px',
      dur: '.2s', durUI: '.18s', durPress: '.1s',
      ease: 'ease', easeOut: 'cubic-bezier(.2,.8,.25,1)', easeSpring: 'cubic-bezier(.34,1.56,.64,1)',
      zPanel: 2147482998, zFab: 2147483000,
      headH: '46px', padBody: '12px', gapBody: '10px',
      mono: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'
    };
    const tr = function (extra) {
      const base = 'background-color ' + T.dur + ' ' + T.ease + ',color ' + T.dur + ' ' + T.ease +
        ',border-color ' + T.dur + ' ' + T.ease + ',box-shadow ' + T.dur + ' ' + T.ease;
      return extra ? base + ',' + extra : base;
    };

    /* ===== 2. CSS：全部引用 T，无散落魔法值 ===== */
    const css = [
      '.cd-panel,.cd-fab{--cd-brand:' + T.brand + ';--cd-ok:' + T.ok + ';--cd-err:' + T.err + ';--cd-warn:' + T.warn + ';',
      '--cd-text:' + T.text + ';--cd-text2:' + T.text2 + ';--cd-bg:' + T.bg + ';--cd-bg1:' + T.bg1 + ';--cd-bg2:' + T.bg2 + ';',
      '--cd-b1:' + T.b1 + ';--cd-b2:' + T.b2 + ';--cd-r:' + T.r + ';--cd-rs:' + T.rS + ';}',
      '.cd-panel{position:fixed;box-sizing:border-box;width:440px;height:min(82vh,660px);max-width:96vw;max-height:96vh;',
      'display:flex;flex-direction:column;overflow:hidden;z-index:' + T.zPanel + ';',
      'background:var(--cd-bg);color:var(--cd-text);border:1px solid var(--cd-b1);border-radius:var(--cd-r);',
      'box-shadow:0 8px 28px rgba(0,0,0,.16),0 2px 8px rgba(0,0,0,.10);',
      'font-family:inherit;font-size:13px;line-height:1.55;animation:cd-pop .16s ease-out;will-change:transform;}',
      '.cd-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 8px 0 16px;height:' + T.headH + ';',
      'flex:none;border-bottom:1px solid var(--cd-b1);cursor:move;user-select:none;transition:' + tr() + ';}',
      '.cd-title{font-size:13.5px;font-weight:600;color:var(--cd-text);letter-spacing:.2px;}',
      '.cd-actions{display:flex;gap:6px;align-items:center;}',
      '.cd-btn{appearance:none;padding:0 12px;height:30px;border:0;border-radius:var(--cd-rs);cursor:pointer;',
      'font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:6px;color:#111;background:#fff;border:1px solid rgba(0,0,0,.14);',
      'transition:filter .15s ease,transform ' + T.durPress + ' ease;}',
      '.cd-btn:hover{filter:none;background:#f0f0f2;}.cd-btn:active{transform:translateY(1px);}',
      '.cd-btn:disabled{opacity:.5;cursor:default;filter:none;transform:none;}',
      '.cd-btn:focus-visible,.cd-tab:focus-visible,.cd-lang button:focus-visible{outline:2px solid #888;outline-offset:1px;}',
      '.cd-btn-ghost{color:var(--cd-text);background:transparent;border:1px solid var(--cd-b2);}',
      '.cd-btn-ghost:hover{background:var(--cd-bg2);filter:none;transform:translateY(-1px);}',
      '.cd-btn:focus-visible,.cd-tab:focus-visible,.cd-lang button:focus-visible{outline:2px solid var(--cd-brand);outline-offset:1px;}',
      '.cd-close{width:30px;height:30px;border-radius:var(--cd-rs);background:transparent;border:0;color:var(--cd-text2);',
      'font-size:15px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:' + tr('transform .12s ease') + ';}',
      '.cd-close:hover{background:var(--cd-bg2);color:var(--cd-text);}.cd-close:active{transform:scale(.9);}',
      '.cd-tabs{display:flex;gap:2px;padding:3px;margin:10px 12px 0;flex:none;background:var(--cd-bg2);border:1px solid var(--cd-b1);border-radius:' + T.rTab + ';transition:' + tr() + ';}',
      '.cd-tab{flex:1 1 auto;padding:5px 8px;border:0;border-radius:' + T.rS + ';cursor:pointer;font-size:12px;font-weight:500;',
      'color:var(--cd-text2);background:transparent;white-space:nowrap;transition:background .18s ease,color .18s ease,box-shadow .18s ease,transform ' + T.durPress + ' ease;}',
      '.cd-tab:hover{color:var(--cd-text);}.cd-tab:active{transform:scale(.96);}',
      '.cd-tab.active{background:#fff;color:#111;font-weight:600;',
      'box-shadow:0 1px 4px color-mix(in srgb,var(--cd-brand) 18%,rgba(0,0,0,.12));}',
      '.cd-body{flex:1;overflow:auto;padding:' + T.padBody + ';display:flex;flex-direction:column;gap:' + T.gapBody + ';}',
      '.cd-body>*{animation:cd-fade-up .22s ' + T.easeOut + ' both;}',
      '.cd-body>*:nth-child(2){animation-delay:.03s;}.cd-body>*:nth-child(3){animation-delay:.06s;}.cd-body>*:nth-child(n+4){animation-delay:.09s;}',
      '.cd-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}',
      '.cd-input,.cd-textarea,.cd-select{width:100%;box-sizing:border-box;padding:7px 10px;border-radius:var(--cd-rs);',
      'background:var(--cd-bg2);color:var(--cd-text);border:1px solid var(--cd-b1);font-size:12.5px;transition:' + tr() + ';}',
      '.cd-input:focus,.cd-textarea:focus,.cd-select:focus{outline:none;border-color:#999;',
      'box-shadow:0 0 0 2px rgba(0,0,0,.18);}',
      '.cd-select option{background:var(--cd-bg1);color:var(--cd-text);}',
      '.cd-select option:checked,.cd-select option:hover{background:color-mix(in srgb,var(--cd-brand) 24%,var(--cd-bg1));color:var(--cd-text);font-weight:600;}',
      '.cd-textarea{flex:1;min-height:150px;resize:vertical;font-family:' + T.mono + ';font-size:12.5px;line-height:1.6;}',
      '.cd-pre{margin:0;padding:10px 12px;background:var(--cd-bg2);border:1px solid var(--cd-b1);border-radius:var(--cd-rs);',
      'white-space:pre-wrap;word-break:break-word;max-height:280px;overflow:auto;font-family:' + T.mono + ';font-size:12px;line-height:1.6;transition:' + tr() + ';}',
      '.cd-card{background:var(--cd-bg1);border:1px solid var(--cd-b1);border-radius:' + T.rTab + ';padding:12px;',
      'transition:' + tr('transform .2s ease') + ';}',
      '.cd-card:hover{box-shadow:0 3px 12px rgba(0,0,0,.10);}',
      '.cd-card h4{margin:0 0 8px;font-size:13px;font-weight:600;}',
      '.cd-result{background:var(--cd-bg1);border:1px solid var(--cd-b1);border-radius:var(--cd-rs);overflow:hidden;transition:' + tr('transform .2s ease') + ';}',
      '.cd-result-head{padding:7px 12px;background:var(--cd-bg2);border-bottom:1px solid var(--cd-b1);font-size:11.5px;color:var(--cd-text2);font-variant-numeric:tabular-nums;}',
      '.cd-result-body{padding:0;}',
      '.cd-result-body .cd-pre{border:0;border-radius:0;max-height:240px;background:transparent;}',
      '.cd-result-body .cd-msg{border-radius:0;border:0;}',
      '.cd-result+.cd-result{margin-top:2px;}',
      '.cd-msg{padding:8px 10px;border-radius:var(--cd-rs);font-size:12px;border:1px solid transparent;animation:cd-msg-in .2s ' + T.easeOut + ' both;}',
      '.cd-msg.ok{background:color-mix(in srgb,var(--cd-ok) 12%,transparent);border-color:color-mix(in srgb,var(--cd-ok) 45%,transparent);animation:cd-pop-in .25s ' + T.easeSpring + ' both;}',
      '.cd-msg.err{background:color-mix(in srgb,var(--cd-err) 10%,transparent);border-color:color-mix(in srgb,var(--cd-err) 45%,transparent);animation:cd-shake .3s ease;}',
      '.cd-msg.info{background:var(--cd-bg2);border-color:var(--cd-b1);}',
      '.cd-hint{color:var(--cd-text2);font-size:11.5px;line-height:1.5;}',
      '.cd-lang{display:flex;gap:2px;flex-wrap:wrap;background:var(--cd-bg2);border:1px solid var(--cd-b1);border-radius:' + T.rS + ';padding:3px;}',
      '.cd-lang button{padding:4px 10px;border:0;border-radius:' + T.rXs + ';cursor:pointer;font-size:11.5px;font-weight:500;',
      'background:transparent;color:var(--cd-text2);transition:background .18s ease,color .18s ease,transform ' + T.durPress + ' ease;}',
      '.cd-lang button:active{transform:scale(.94);}',
      '.cd-lang button.active{background:#fff;color:#111;font-weight:600;box-shadow:inset 0 0 0 1px rgba(0,0,0,.22);}',
      '.cd-status-done{color:var(--cd-ok);font-weight:500;}.cd-status-pending{color:var(--cd-text2);}',
      '.cd-result-head .st-ok{color:#3fb27f;font-weight:600;}',
      '.cd-result-head .st-err{color:#e5484d;font-weight:600;}',
      '.cd-rz{position:absolute;z-index:5;border-radius:4px;transition:background .15s ease;}',
      '.cd-rz:hover{background:rgba(255,255,255,.35);}',
      '.cd-rz-n{top:0;left:0;right:0;height:6px;cursor:ns-resize;}.cd-rz-s{bottom:0;left:0;right:0;height:6px;cursor:ns-resize;}',
      '.cd-rz-e{top:0;bottom:0;right:0;width:6px;cursor:ew-resize;}.cd-rz-w{top:0;bottom:0;left:0;width:6px;cursor:ew-resize;}',
      '.cd-rz-ne{top:0;right:0;width:12px;height:12px;cursor:nesw-resize;}.cd-rz-nw{top:0;left:0;width:12px;height:12px;cursor:nwse-resize;}',
      '.cd-rz-se{bottom:0;right:0;width:12px;height:12px;cursor:nwse-resize;}.cd-rz-sw{bottom:0;left:0;width:12px;height:12px;cursor:nesw-resize;}',
      '.cd-panel::-webkit-scrollbar,.cd-panel ::-webkit-scrollbar{width:8px;height:8px;}',
      '.cd-panel::-webkit-scrollbar-thumb,.cd-panel ::-webkit-scrollbar-thumb{background:var(--cd-b2);border-radius:999px;border:2px solid transparent;background-clip:content-box;}',
      '.cd-panel::-webkit-scrollbar-track,.cd-panel ::-webkit-scrollbar-track{background:transparent;}',
      '.cd-runbar{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:var(--cd-rs);background:var(--cd-bg2);border:1px solid var(--cd-b1);animation:cd-msg-in .18s ease-out both;}',
      '.cd-dot{width:7px;height:7px;border-radius:50%;background:#fff;animation:cd-pulse 1s infinite ease-in-out;flex:none;}',
      '.cd-runbar-text{font-size:11px;color:var(--cd-text2);font-variant-numeric:tabular-nums;}',
      '.cd-runbar-track{flex:1;height:3px;border-radius:999px;background:var(--cd-b1);overflow:hidden;}',
      '.cd-runbar-fill{height:100%;width:30%;border-radius:999px;background:linear-gradient(90deg,#fff,#bbb);animation:cd-indeterminate 1.2s infinite ease-in-out;}',
      '.cd-stream{animation:cd-slide .1s ease-out;white-space:pre-wrap;word-break:break-word;}',
      '.cd-fab{position:fixed;right:18px;bottom:18px;width:48px;height:48px;border:1px solid var(--cd-b1);border-radius:14px;',
      'background:#fff;color:#111;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;',
      'box-shadow:0 6px 20px rgba(0,0,0,.28);z-index:' + T.zFab + ';transition:transform .15s ease,box-shadow .15s ease;}',
      '.cd-fab:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.36);}',
      '.cd-fab:active{transform:translateY(0);}',
      '.cd-panel.cd-locked{transition:none;cursor:grabbing;user-select:none;}',
      '.cd-panel.cd-locked *{pointer-events:none;}',
      'summary{cursor:pointer;border-radius:' + T.rXs + ';padding:2px 4px;transition:color .15s ease,background .15s ease;}',
      'summary:hover{color:var(--cd-text);background:var(--cd-bg2);}',
      '.cd-panel.cd-closing{animation:cd-out .18s ease-in both;pointer-events:none;}',
      '@keyframes cd-out{from{opacity:1;transform:none;}to{opacity:0;transform:translateY(10px) scale(.97);}}',
      '@media (prefers-reduced-motion: reduce){.cd-panel.cd-closing{animation:none;opacity:0;}}',
      '@keyframes cd-pop{from{opacity:0;transform:translateY(8px) scale(.98);}to{opacity:1;transform:none;}}',
      '@keyframes cd-fade-up{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}',
      '@keyframes cd-msg-in{from{opacity:0;transform:translateY(4px) scale(.99);}to{opacity:1;transform:none;}}',
      '@keyframes cd-pop-in{from{opacity:0;transform:scale(.92);}to{opacity:1;transform:scale(1);}}',
      '@keyframes cd-shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-3px);}75%{transform:translateX(3px);}}',
      '@keyframes cd-pulse{0%{opacity:.35;}50%{opacity:1;}100%{opacity:.35;}}',
      '@keyframes cd-slide{from{opacity:0;transform:translateX(5px);}to{opacity:1;transform:none;}}',
      '@keyframes cd-indeterminate{0%{margin-left:-30%;}100%{margin-left:100%;}}',
      '@media (prefers-reduced-motion: reduce){.cd-panel,.cd-panel *,.cd-fab{animation:none!important;transition:none!important;}}'
    ].join(' ');

    let cleanupStyle = function () {};
    const styles = ctx.get('styles');
    if (styles && typeof styles.insert === 'function') {
      try { const d = styles.insert(css); cleanupStyle = (d && typeof d.dispose === 'function') ? d.dispose : function () {}; } catch (e) {}
    } else if (typeof document !== 'undefined') {
      try { const el = document.createElement('style'); el.textContent = css; document.head.appendChild(el); cleanupStyle = function () { if (el.parentNode) el.parentNode.removeChild(el); }; } catch (e) {}
    }
    ctx.effect(function () { return cleanupStyle; });

    /* ===== 3. 内核 K：RPC + 运行轮询 + 定时器包装 ===== */
    const K = {
      stats: { total: 0, ok: 0, fail: 0, hang: 0, lastMs: 0, lastMethod: '' },
      stopT: function (x) { try { if (!x) return; if (typeof x === 'function') x(); else if (typeof x.dispose === 'function') x.dispose(); } catch (e) {} },
      call: function (method, args, sid, timeoutMs) {
        const S = K.stats; S.total++; S.lastMethod = method;
        const t0 = Date.now(); let settled = false;
        const a = Object.assign({}, args || {}); if (sid) a.sessionId = sid;
        const p = host.call(method, a).then(function (r) {
          settled = true; S.ok++; S.lastMs = Date.now() - t0; return r;
        }, function (e) { settled = true; S.fail++; S.lastMs = Date.now() - t0; throw e; });
        if (timeoutMs) {
          return Promise.race([p, timer.timeout(timeoutMs).then(function () {
            if (!settled) S.hang++;
            return { ok: false, error: 'RPC超时(' + timeoutMs + 'ms): ' + method };
          })]);
        }
        return p;
      },
      runs: {}, pollId: null,
      ensurePoll: function () {
        if (K.pollId) return;
        const tick = function () {
          const ids = Object.keys(K.runs);
          if (!ids.length) { K.stopT(K.pollId); K.pollId = null; return; }
          ids.forEach(function (rid) {
            const R = K.runs[rid]; if (!R || R.finished) return;
            K.call('runPoll', { runId: rid }, R.sid, 3000).then(function (st) {
              if (!st) return;
              if (st.done) { R.finished = true; delete K.runs[rid]; if (R.onDone) R.onDone(st.result || st); return; }
              if (st.partial && st.partial.stdout !== undefined && st.partial.stdout !== R.stdout) {
                R.stdout = st.partial.stdout; if (R.onData) R.onData(st.partial.stdout);
              }
            }).catch(function (e) {
              R.errCount = (R.errCount || 0) + 1;
              if (R.errCount > 8) {
                R.finished = true; delete K.runs[rid];
                if (R.onDone) R.onDone({ ok: false, error: '轮询失败：' + String(e && e.message ? e.message : e) });
              }
            });
          });
        };
        K.pollId = timer.interval(tick, 400);
      },
      start: function (args, sid, onData, onDone) {
        K.call('runStart', args, sid, 5000).then(function (r) {
          if (!r || r.ok === false || !r.runId) { onDone(r || { ok: false, error: '启动失败' }); return; }
          K.runs[r.runId] = { sid: sid, stdout: '', started: Date.now(), onData: onData, onDone: onDone };
          K.ensurePoll();
        }).catch(function (e) { onDone({ ok: false, error: String(e && e.message ? e.message : e) }); });
      }
    };

    /* ===== 4. 原语 P：页签只声明结构，不碰 className ===== */
    const P = {
      row: function () { return h('div', { className: 'cd-row' }, Array.prototype.slice.call(arguments)); },
      btn: function (label, onClick, opts) {
        opts = opts || {};
        return h('button', {
          className: 'cd-btn' + (opts.ghost ? ' cd-btn-ghost' : ''),
          onClick: onClick, disabled: !!opts.disabled, title: opts.title
        }, label);
      },
      ghost: function (label, onClick, opts) { return P.btn(label, onClick, Object.assign({ ghost: true }, opts)); },
      field: function (props) { return h('input', Object.assign({ className: 'cd-input' }, props)); },
      area: function (props) { return h('textarea', Object.assign({ className: 'cd-textarea', spellCheck: false }, props)); },
      select: function (value, onChange, options) {
        return h('select', { className: 'cd-select', value: value, onChange: onChange },
          options.map(function (o) { return h('option', { key: o.value, value: o.value }, o.label); }));
      },
      card: function () { const kids = Array.prototype.slice.call(arguments); return h('div', { className: 'cd-card' }, kids); },
      h4: function (s) { return h('h4', null, s); },
      msg: function (kind, text) { return h('div', { className: 'cd-msg ' + kind }, text); },
      hint: function (s) { return h('div', { className: 'cd-hint' }, s); },
      pre: function (s) { return h('pre', { className: 'cd-pre' }, s); },
      detail: function (summary, kid) { return h('details', null, h('summary', null, summary), kid); },
      resultCard: function (header, body) { return h('div', { className: 'cd-result' }, h('div', { className: 'cd-result-head' }, header), h('div', { className: 'cd-result-body' }, body)); },
      closePanel: function (el, onClose) {
        try { const panel = el && el.closest ? el.closest('.cd-panel') : null;
          if (!panel) { onClose(); return; }
          panel.classList.add('cd-closing');
          let done = false;
          const finish = function () { if (done) return; done = true; K.stopT(iv); onClose(); };
          const iv = timer.interval(finish, 190);
        } catch (e) { onClose(); }
      },
      seg: function (items, value, onPick) {
        return h('div', { className: 'cd-lang' }, items.map(function (i) {
          return h('button', { key: i.id, className: i.id === value ? 'active' : '', onClick: function () { onPick(i.id); } }, i.label);
        }));
      }
    };

    /* ===== 5. 通用部件：流式文本 / 运行条 ===== */
    const NL = String.fromCharCode(10);
    const NLc = { v: NL };
    function StreamText(props) {
      const full = props.text || '';
      const [n, setN] = React.useState(props.instant ? full.length : 0);
      React.useEffect(function () {
        if (props.instant) { setN(full.length); return; }
        if (!full) { setN(0); return; }
        let i = 0; setN(0);
        const step = Math.max(6, Math.ceil(full.length / 90));
        let d = null;
        d = timer.interval(function () {
          i += step;
          if (i >= full.length) { setN(full.length); K.stopT(d); } else { setN(i); }
        }, 16);
        return function () { K.stopT(d); };
      }, [full, props.instant]);
      return h('span', { className: 'cd-stream' }, full.slice(0, n), n >= full.length ? null : '▋');
    }
    function StreamPre(props) { return P.pre(h(StreamText, { text: props.text, instant: props.instant })); }
    function RunningBar(props) {
      return h('div', { className: 'cd-runbar' },
        h('span', { className: 'cd-dot' }),
        h('span', { className: 'cd-runbar-text' }, '运行中 ' + (props.ms || 0) + ' ms'),
        h('div', { className: 'cd-runbar-track' }, h('div', { className: 'cd-runbar-fill' })));
    }
    /* useRun：页签的运行状态机（busy/elapsed/live/out 三态一网打尽） */
    function useRun(sid, makeArgs) {
      const [busy, setBusy] = React.useState(false);
      const [elapsed, setElapsed] = React.useState(0);
      const [live, setLive] = React.useState('');
      const [out, setOut] = React.useState(null);
      const ref = React.useRef(null);
      const begin = function () {
        setBusy(true); setOut(null); setLive(''); setElapsed(0);
        const t0 = Date.now();
        K.stopT(ref.current); ref.current = null;
        ref.current = timer.interval(function () { setElapsed(Date.now() - t0); }, 60);
      };
      const end = function () { setBusy(false); K.stopT(ref.current); ref.current = null; };
      const go = function (over) {
        begin();
        K.start(makeArgs(over), sid, function (partial) { setLive(partial); }, function (finalR) { setOut(finalR); end(); });
      };
      const stop = function () { end(); };
      return { busy: busy, elapsed: elapsed, live: live, out: out, go: go, stop: stop, setOut: setOut };
    }

    /* ===== 6. 框架上下文：页签工厂从这里取所有依赖 ===== */
    ctx.effect(function () { return function () { K.stopT(K.pollId); }; });
    const ui = { activeSession: null, open: {}, listeners: new Set() };
    function setUiOpen(sid, v) { if (sid) { ui.open[sid] = v; if (v) ui.activeSession = sid; } ui.listeners.forEach(function (f) { f(); }); }
    const F = { h: h, T: T, K: K, P: P, StreamText: StreamText, StreamPre: StreamPre, RunningBar: RunningBar, useRun: useRun, ui: ui, setUiOpen: setUiOpen };
