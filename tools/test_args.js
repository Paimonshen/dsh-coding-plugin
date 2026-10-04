// test_args.js：验证 runStart 的 args 始终是纯 JSON（复现并防回归）
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('C:/Users/Han/Documents/ChatGPT/Studying/dsh-coding-plugin/source/client.js', 'utf8');

// 抠出 cleanOver（若存在）
const a = src.indexOf('const cleanOver = function');
if (a < 0) { console.log('cleanOver 不存在 — 兜底缺失'); process.exit(1); }
const b = src.indexOf('};', src.indexOf('return out;', a)) + 2;
const code = src.slice(a, b);

const sandbox = { Object, console };
vm.createContext(sandbox);
vm.runInContext(code + '; globalThis.cleanOver = cleanOver;', sandbox);

function check(label, input, expectNull) {
  const out = sandbox.cleanOver(input);
  const ok = expectNull ? out === null : (out && typeof out === 'object');
  const pure = out === null ? true : out !== null && Object.keys(out).every(function (k) {
    const v = out[k];
    return v === null || ['string', 'number', 'boolean'].indexOf(typeof v) >= 0;
  });
  console.log((ok && pure ? 'PASS ' : 'FAIL ') + label + ' -> ' + JSON.stringify(out));
}
// 模拟 React 传给 onClick 的事件对象
const fakeEvent = { target: {}, nativeEvent: {}, preventDefault: function () {}, clientX: 10 };
check('React 事件对象（应被丢弃）', fakeEvent, true);
check('null（应返回 null）', null, true);
check('纯对象 {analyze:true}', { analyze: true }, false);
check('纯对象 {language, code, input}', { language: 'python', code: 'x', input: '' }, false);
check('含 DOM 的混合对象（应丢弃）', { language: 'python', target: {} }, true);
