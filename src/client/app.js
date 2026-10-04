/* app.js：页签（数据驱动声明）+ 外壳（FAB/面板/门控/注册）
   新增页签：在 TABS 里加一条，实现 make(fw) 返回 React 组件即可。 */
  /* app 续写 fw 的 apply 作用域：h/P/K/NL/timer/slots/ctx/F 均可用 */

  const LANGS = [
    { id: 'python', label: 'Python' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'powershell', label: 'PowerShell' }
  ];
  const SAMPLES = {
    python: `print('你好，代码学习插件！')`,
    javascript: `console.log('你好，代码学习插件！')`,
    typescript: `const msg: string = '你好，代码学习插件！'; console.log(msg)`,
    powershell: `Write-Output '你好，代码学习插件！'`
  };

  /* ===== 解释器预热：面板挂载时触发一次，错峰跑三种语言的空脚本 ===== */
  let warmedFor = null;
  function Warmup() {
    React.useEffect(function () {
      const sid = F.ui.activeSession;
      if (!sid || warmedFor === sid) return;
      warmedFor = sid;
      const WARM = [
        { language: 'python', code: 'pass' },
        { language: 'javascript', code: '0;' },
        { language: 'powershell', code: 'Out-Null' }
      ];
      WARM.forEach(function (w, i) {
        timer.timeout(function () {
          K.call('runCode', w, sid, 20000).catch(function () {});
        }, 400 + i * 600);
      });
    }, []);
    return null;
  }

  /* ===== 编辑器页 ===== */
  function EditorTab(fw) {
    return function (props) {
      const sid = props.sessionId;
      const [lang, setLang] = React.useState('python');
      const [code, setCode] = React.useState(SAMPLES.python);
      const [input, setInput] = React.useState('');
      const run = F.useRun(sid, function (over) {
        return Object.assign({ language: lang, code: code, input: input }, over || {});
      });
      return h('div', { className: 'cd-body' },
        P.row(
          P.seg(LANGS, lang, function (id) { setLang(id); setCode(SAMPLES[id]); }),
          P.btn(run.busy ? '运行中…' : '▶ 运行', run.go, { disabled: run.busy }),
          P.ghost('🤖 分析', function () { run.go({ analyze: true }); }, { disabled: run.busy })
        ),
        P.editor({ value: code, language: lang, onChange: function (e) { setCode(e.target.value); } }),
        P.field({ placeholder: '可选：运行时标准输入 (stdin)', value: input, onChange: function (e) { setInput(e.target.value); } }),
        run.busy ? h(F.RunningBar, { ms: run.elapsed }) : null,
        run.live ? P.pre(run.live + ' ▋') : null,
        run.out && run.out.ok === false ? P.resultCard(
          h('span', { className: 'st-err' }, '❌ ' + (run.out.error || '执行失败')),
          h('div', null)
        ) : null,
        run.out && run.out.ok !== false ? P.resultCard(
          h('span', { className: 'st-ok' }, '✓ 退出码 ' + String(run.out.exitCode) + (run.out.timedOut ? '（超时）' : '') + ' · ' + (run.out.ms || 0) + ' ms'),
          h('div', null, P.code((run.out.stdout || '') + (run.out.stderr ? ((run.out.stdout ? NL + NL : '') + '--- stderr ---' + NL + run.out.stderr) : ''), lang))
        ) : null,
        run.out && run.out.sentToConversation ? P.resultCard(
          h('span', { className: 'st-ok' }, '📨 已发送到对话'),
          h('div', { className: 'cd-hint', style: { padding: '8px 14px' } }, '代码与分析请求已发进当前会话，分析将由对话直接输出，请切到聊天查看。')
        ) : null
      );
    };
  }

  /* ===== 课程页 ===== */
  function LessonTab(fw) {
    return function (props) {
      const sid = props.sessionId;
      const [course, setCourse] = React.useState(null);
      const [text, setText] = React.useState('');
      const [msg, setMsg] = React.useState(null);
      React.useEffect(function () { K.call('getState', {}, sid).then(function (r) { if (r && r.course) setCourse(r.course); }); }, []);
      const lessons = course ? (course.lessons || []) : [];
      return h('div', { className: 'cd-body' },
        P.card(
          P.h4('导入课程包'),
          P.area({ style: { minHeight: '90px' }, placeholder: '粘贴课程包 JSON…', value: text, onChange: function (e) { setText(e.target.value); } }),
          P.btn('导入', function () {
            K.call('importCourse', { courseJson: text }, sid).then(function (r) {
              if (r.ok) { setCourse(r.course); setMsg({ kind: 'ok', text: '已导入「' + r.course.title + '」' }); }
              else setMsg({ kind: 'err', text: r.error });
            }).catch(function (e) { setMsg({ kind: 'err', text: String(e) }); });
          })
        ),
        msg ? P.msg(msg.kind, msg.text) : null,
        course ? P.card(P.h4('当前课程：' + course.title),
          lessons.length === 0 ? P.hint('该课程暂无关卡。') :
          h('div', null, lessons.map(function (l) {
            return h('div', { key: l.id, style: { padding: '4px 0' } }, h('strong', null, l.title), '（' + (l.language || 'python') + '）', P.hint(l.description || ''));
          }))
        ) : P.hint('尚未导入课程。')
      );
    };
  }

  /* ===== 课程关卡页 ===== */
  function CourseRunTab(fw) {
    return function (props) {
      const sid = props.sessionId;
      const [course, setCourse] = React.useState(null);
      const [progress, setProgress] = React.useState({});
      const [lessonId, setLessonId] = React.useState('');
      const [code, setCode] = React.useState('');
      const [result, setResult] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [elapsed, setElapsed] = React.useState(0);
      const ref = React.useRef(null);
      React.useEffect(function () {
        K.call('getState', {}, sid).then(function (r) {
          if (r && r.course) { setCourse(r.course); setLessonId((r.course.lessons[0] || {}).id || ''); }
          if (r && r.progress) setProgress(r.progress);
        });
      }, []);
      function submit() {
        setBusy(true); setResult(null); setElapsed(0);
        const t0 = Date.now();
        K.stopT(ref.current); ref.current = null;
        ref.current = timer.interval(function () { setElapsed(Date.now() - t0); }, 60);
        K.call('runStart', { mode: 'submit', lessonId: lessonId, code: code }, sid, 5000).then(function (r) {
          if (!r || !r.runId) { setResult(r || { ok: false, error: '启动失败' }); setBusy(false); K.stopT(ref.current); ref.current = null; return; }
          K.runs[r.runId] = { sid: sid, started: Date.now(), onDone: function (st) {
            setResult(st); setBusy(false); K.stopT(ref.current); ref.current = null;
          } };
          K.ensurePoll();
        }).catch(function (e) { setResult({ ok: false, error: String(e) }); setBusy(false); K.stopT(ref.current); ref.current = null; });
      }
      const lessons = course ? (course.lessons || []) : [];
      const lesson = lessons.find(function (l) { return l.id === lessonId; });
      return h('div', { className: 'cd-body' },
        lessons.length === 0 ? P.hint('请先在课程页导入课程包。') :
        h('div', null,
          P.select(lessonId, function (e) { setLessonId(e.target.value); setResult(null); },
            lessons.map(function (l) {
              return { value: l.id, label: l.title + (progress[l.id] && progress[l.id].status === 'completed' ? ' ✅' : '') };
            })),
          lesson ? P.hint(lesson.description || '') : null,
          P.editor({ value: code, language: (lesson && lesson.language) || 'python', placeholder: '在此编写并提交本关卡的解答代码…', onChange: function (e) { setCode(e.target.value); } }),
          P.btn(busy ? '评判中…' : '提交并评判', submit, { disabled: busy }),
          busy ? h(F.RunningBar, { ms: elapsed }) : null,
          result && result.ok === false ? P.resultCard(
            h('span', { className: 'st-err' }, '❌ ' + (result.error || '提交失败')),
            h('div', null)
          ) : null,
          result && result.ok !== false ? P.resultCard(
            result.passed ? h('span', { className: 'st-ok' }, '🎉 全部检查通过') : h('span', { className: 'st-err' }, '❌ 未通过，请继续尝试'),
            h('div', null,
              result.checks && result.checks.length ? h('ul', { style: { margin: '8px 14px', padding: 0, listStyle: 'none' } }, result.checks.map(function (c, i) {
                return h('li', { key: i, style: { padding: '3px 0', color: c.ok ? 'var(--cd-ok)' : 'var(--cd-err)' } }, (c.ok ? '✓' : '✗') + ' ' + c.label);
              })) : null,
              P.code((result.stdout || '') + (result.stderr ? ((result.stdout ? NL + NL : '') + '--- stderr ---' + NL + result.stderr) : ''), (lesson && lesson.language) || 'python'),
              result.hint ? h('div', { className: 'cd-hint', style: { padding: '8px 14px' } }, '提示：' + result.hint) : null,
              result.reference ? h('div', { style: { padding: '8px 14px' } }, P.detail('参考答案', P.pre(result.reference))) : null
            )
          ) : null
        )
      );
    };
  }

  /* ===== 进度页 ===== */
  function ProgressTab(fw) {
    return function (props) {
      const sid = props.sessionId;
      const [course, setCourse] = React.useState(null);
      const [progress, setProgress] = React.useState({});
      const [content, setContent] = React.useState('');
      React.useEffect(function () {
        K.call('getState', {}, sid).then(function (r) { if (r) { setCourse(r.course); setProgress(r.progress || {}); } });
      }, []);
      function exportAs(fmt) {
        K.call('exportProgress', { format: fmt }, sid).then(function (r) {
          if (r && r.content) {
            setContent(r.content);
            K.call('saveExport', { filename: 'progress.' + (fmt === 'markdown' ? 'md' : 'json'), content: r.content }, sid);
          }
        });
      }
      const lessons = course ? (course.lessons || []) : [];
      return h('div', { className: 'cd-body' },
        P.row(P.btn('导出 JSON', function () { exportAs('json'); }), P.ghost('导出 Markdown', function () { exportAs('markdown'); })),
        lessons.length === 0 ? P.hint('尚未导入课程，无进度可追踪。') :
        h('div', null, lessons.map(function (l) {
          const p = progress[l.id] || { status: 'pending', attempts: 0 };
          const done = p.status === 'completed';
          return P.card(h('div', null, h('strong', null, l.title)),
            h('div', { className: done ? 'cd-status-done' : 'cd-status-pending' },
              done ? '✅ 完成　完成于 ' + (p.completedAt || '') : '⏳ 未完成　尝试：' + (p.attempts || 0)));
        })),
        content ? P.pre(content) : null
      );
    };
  }

  /* ===== 笔记页 ===== */
  function NoteTab(fw) {
    return function (props) {
      const sid = props.sessionId;
      const [title, setTitle] = React.useState('');
      const [body, setBody] = React.useState('');
      const [lessonId, setLessonId] = React.useState('');
      const [notes, setNotes] = React.useState([]);
      const [course, setCourse] = React.useState(null);
      const [msg, setMsg] = React.useState(null);
      React.useEffect(function () {
        K.call('getState', {}, sid).then(function (r) { if (r) { setNotes(r.notes || []); setCourse(r.course); } });
      }, []);
      const lessons = course ? (course.lessons || []) : [];
      return h('div', { className: 'cd-body' },
        P.field({ placeholder: '笔记标题', value: title, onChange: function (e) { setTitle(e.target.value); } }),
        lessons.length ? P.select(lessonId, function (e) { setLessonId(e.target.value); },
          [{ value: '', label: '不关联关卡' }].concat(lessons.map(function (l) { return { value: l.id, label: '关联：' + l.title }; }))) : null,
        P.area({ placeholder: 'Markdown 正文…', value: body, onChange: function (e) { setBody(e.target.value); } }),
        P.btn('保存笔记', function () {
          if (!title || !body) { setMsg({ kind: 'err', text: '请填写标题与正文。' }); return; }
          K.call('saveNote', { title: title, body: body, lessonId: lessonId || null }, sid).then(function (r) {
            if (r && r.ok) { setNotes(notes.concat([r.note])); setTitle(''); setBody(''); setMsg({ kind: 'ok', text: '笔记已保存。' }); }
          });
        }),
        msg ? P.msg(msg.kind, msg.text) : null,
        notes.length ? h('div', null, notes.slice().reverse().map(function (n) {
          return P.card(h('h4', null, n.title), P.hint((n.lessonId || '未关联') + '　' + n.createdAt), P.pre(n.body));
        })) : null
      );
    };
  }

  /* ===== 片段页 ===== */
  function SnippetTab(fw) {
    return function (props) {
      const sid = props.sessionId;
      const [title, setTitle] = React.useState('');
      const [code, setCode] = React.useState('');
      const [lang, setLang] = React.useState('python');
      const [snips, setSnips] = React.useState([]);
      const [msg, setMsg] = React.useState(null);
      React.useEffect(function () { K.call('getState', {}, sid).then(function (r) { if (r) setSnips(r.snippets || []); }); }, []);
      return h('div', { className: 'cd-body' },
        P.field({ placeholder: '片段标题', value: title, onChange: function (e) { setTitle(e.target.value); } }),
        P.seg(LANGS, lang, setLang),
        P.editor({ placeholder: '代码片段…', value: code, language: lang, onChange: function (e) { setCode(e.target.value); } }),
        P.btn('保存片段', function () {
          if (!title || !code) { setMsg({ kind: 'err', text: '请填写标题与代码。' }); return; }
          K.call('saveSnippet', { title: title, code: code, language: lang }, sid).then(function (r) {
            if (r && r.ok) { setSnips(snips.concat([r.snippet])); setTitle(''); setCode(''); setMsg({ kind: 'ok', text: '片段已保存。' }); }
          });
        }),
        msg ? P.msg(msg.kind, msg.text) : null,
        snips.length ? h('div', null, snips.slice().reverse().map(function (s) {
          return P.card(
            P.row(h('strong', null, s.title), P.hint(s.language)),
            P.code(s.code, s.language),
            P.ghost('插入 / 复制', function () {
              try { navigator.clipboard.writeText(s.code); setMsg({ kind: 'info', text: '已复制到剪贴板。' }); }
              catch (e) { setMsg({ kind: 'info', text: s.code }); }
            })
          );
        })) : null
      );
    };
  }

  /* ===== Agent 页 ===== */
  function AgentTab(fw) {
    return function (props) {
      const sid = props.sessionId;
      const [code, setCode] = React.useState('');
      const [lang, setLang] = React.useState('python');
      const [reply, setReply] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      return h('div', { className: 'cd-body' },
        P.hint('把代码原文发进当前对话，由对话主模型直接分析作答——只发代码，不带任何附加文案。'),
        P.editor({ placeholder: '待分析的代码原文…', value: code, language: lang, onChange: function (e) { setCode(e.target.value); } }),
        P.row(P.seg(LANGS, lang, setLang),
          P.btn(busy ? '发送中…' : '📨 发到对话分析', function () {
            setBusy(true); setReply(null);
            K.call('agentAnalyze', { code: code }, sid).then(function (r) {
              setReply(r); setBusy(false);
            }).catch(function (e) { setReply({ fallback: true, message: String(e) }); setBusy(false); });
          }, { disabled: busy })),
        busy ? h(F.RunningBar, { ms: 0 }) : null,
        reply ? P.card(reply.ok === false ? P.msg('err', reply.message || '发送失败') : P.msg('ok', '✅ 已把代码原文发进对话，请切到聊天查看分析。')) : null
      );
    };
  }

  /* ===== 页签注册表：新增页签只改这里 ===== */
  const TABS = [
    { key: 'edit', label: '编辑器', make: EditorTab },
    { key: 'run', label: '课程关卡', make: CourseRunTab },
    { key: 'lesson', label: '课程', make: LessonTab },
    { key: 'progress', label: '进度', make: ProgressTab },
    { key: 'note', label: '笔记', make: NoteTab },
    { key: 'snippet', label: '片段', make: SnippetTab },
    { key: 'agent', label: 'Agent', make: AgentTab }
  ];

  TABS.forEach(function (x) { x.comp = x.make(F); });

  /* ===== 外壳：拖拽 / 缩放 / 门控 / 注册 ===== */
  function Floating(props) {
    const sid = props.sessionId;
    const [tab, setTab] = React.useState('edit');
    const [rect, setRect] = React.useState(null);
    const [lock, setLock] = React.useState('');
    React.useEffect(function () {
      if (rect) return;
      const w = Math.min(440, window.innerWidth - 40);
      const hgt = Math.min(660, window.innerHeight - 80);
      setRect({ left: window.innerWidth - w - 18, top: 18, width: w, height: hgt });
    }, [rect]);
    function onDragStart(e) {
      if (e.target && e.target.closest && e.target.closest('.cd-actions')) return;
      const panel = e.currentTarget.parentElement; const r = panel.getBoundingClientRect();
      setLock('cd-locked');
      const dr = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
      function onMove(ev) {
        let left = Math.max(4, Math.min(window.innerWidth - 40, dr.left + ev.clientX - dr.x));
        let top = Math.max(4, Math.min(window.innerHeight - 40, dr.top + ev.clientY - dr.y));
        setRect(function (s) { return Object.assign({}, s, { left: left, top: top }); });
      }
      function onUp() {
        setLock('');
        window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      }
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    }
    function onResizeStart(dir) {
      return function (e) {
        e.stopPropagation(); e.preventDefault();
        const panel = e.currentTarget.parentElement; const r = panel.getBoundingClientRect();
        setLock('cd-locked');
        const s = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, w: r.width, h: r.height };
        function onMove(ev) {
          const dx = ev.clientX - s.x, dy = ev.clientY - s.y;
          let left = s.left, top = s.top, width = s.w, height = s.h;
          if (dir.indexOf('e') >= 0) width = s.w + dx;
          if (dir.indexOf('s') >= 0) height = s.h + dy;
          if (dir.indexOf('w') >= 0) { width = s.w - dx; left = s.left + dx; }
          if (dir.indexOf('n') >= 0) { height = s.h - dy; top = s.top + dy; }
          width = Math.max(320, Math.min(window.innerWidth - 40, width));
          height = Math.max(280, Math.min(window.innerHeight - 40, height));
          if (dir.indexOf('w') >= 0) left = s.left + (s.w - width);
          if (dir.indexOf('n') >= 0) top = s.top + (s.h - height);
          left = Math.max(4, Math.min(window.innerWidth - width - 4, left));
          top = Math.max(4, Math.min(window.innerHeight - height - 4, top));
          setRect({ left: left, top: top, width: width, height: height });
        }
        function onUp() {
          setLock('');
          window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
        }
        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
      };
    }
    const cur = TABS.find(function (x) { return x.key === tab; }) || TABS[0];
    const Body = cur.comp;
    const style = rect ? { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' } : null;
    return h('div', { className: 'cd-panel ' + lock, style: style },
      h('div', { className: 'cd-head', onPointerDown: onDragStart },
        h('span', { className: 'cd-title' }, '🧩 代码学习 v35'),
        h('div', { className: 'cd-actions' },
          P.ghost('本会话关闭', function (e) { const btn = e && e.currentTarget; P.closePanel(btn, function () { K.call('coding_close', {}, sid); F.setUiOpen(sid, false); }); }),
          h('button', { className: 'cd-close', title: '收起', onClick: function (e) { const btn = e && e.currentTarget; P.closePanel(btn, function () { F.setUiOpen(sid, false); }); } }, '✕'))),
      h('div', { className: 'cd-tabs' }, TABS.map(function (x) {
        return h('button', { key: x.key, className: 'cd-tab' + (x.key === tab ? ' active' : ''), onClick: function () { setTab(x.key); } }, x.label);
      })),
      h(Warmup, { key: 'warmup' }),
      h(Body, { key: cur.key, sessionId: sid }),
      ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(function (d) {
        return h('div', { key: d, className: 'cd-rz cd-rz-' + d, onPointerDown: onResizeStart(d) });
      }));
  }

  function Fab(props) {
    const sid = props.sessionId;
    return h('button', { className: 'cd-fab', title: '打开代码学习悬浮窗（本会话）',
      onClick: function () { K.call('coding_open', {}, sid); F.setUiOpen(sid, true); } }, '🧩');
  }
  function GatedFab(p) {
    const sid = p && p.sessionId;
    const [flag, setFlag] = React.useState('active');
    const [ready, setReady] = React.useState(false);
    React.useEffect(function () {
      let alive = true;
      function refresh() {
        K.call('codingIsActivated', {}, sid).then(function (r) {
          if (!alive) return;
          setFlag((r && r.flag) || (r && r.activated ? 'active' : 'inactive')); setReady(true);
        }).catch(function () { if (alive) { setFlag('inactive'); setReady(true); } });
      }
      refresh();
      const id = timer.interval(refresh, 2500);
      return function () { alive = false; K.stopT(id); };
    }, [sid]);
    if (!ready || flag !== 'active') return null;
    return h(Fab, { sessionId: sid });
  }
  function OverlayPanel() {
    const s = React.useState(0);
    React.useEffect(function () {
      const l = function () { s[1](function (x) { return x + 1; }); };
      F.ui.listeners.add(l); return function () { F.ui.listeners.delete(l); };
    }, []);
    const sid = F.ui.activeSession;
    return (sid && F.ui.open[sid]) ? h(Floating, { sessionId: sid }) : null;
  }

  slots.inject('shell.overlay', function () {
    return slots.register(
      { name: 'shell.overlay', id: 'coding-floating-overlay', order: 100, label: '代码学习' },
      function () { return h(OverlayPanel, {}); },
      function () { return {}; }
    );
  });
  slots.inject('conversation.input.dock', function () {
    return slots.register(
      { name: 'conversation.input.dock', id: 'coding-fab-panel', order: 100, label: '代码学习' },
      function (p) { return h(GatedFab, { sessionId: p && p.sessionId }); },
      function (sessionId) { return { sessionId: sessionId }; } 
    );
  });
} };
