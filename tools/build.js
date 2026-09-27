#!/usr/bin/env node
/* build.js — 生成发布产物
   1. 合并 src/client/{fw,app}.js → source/client.js（折叠空白 + JSON 安全校验）
   2. source/host.js 原样复制
   3. 校验两半边可解析且具备 type=object / apply=function / inject */
const fs = require('fs');
const path = require('path');
const root = __dirname + '/..';
const parts = ['src/client/fw.js', 'src/client/app.js'];
let t = parts.map(function (f) { return fs.readFileSync(path.join(root, f), 'utf8'); }).join('\n');
t = t.replace(/\/\*[\s\S]*?\*\//g, '');
t = t.replace(/\r/g, '');
t = t.replace(/\n\s*/g, ' ');
t = t.replace(/ {2,}/g, ' ').trim();
// JSON 安全校验：产物需可无损嵌入 cordis_define 的 JSON 参数
const dq = (t.match(/"/g) || []).length;
const bs = (t.match(/\\/g) || []).length;
const lc = (t.match(/(^|[^:])\/\/(?!\/)/g) || []).length;
if (dq || bs || lc) {
  console.error('JSON-SAFE FAIL dq=' + dq + ' bs=' + bs + ' lineComment=' + lc);
  process.exit(1);
}
fs.mkdirSync(path.join(root, 'source'), { recursive: true });
fs.writeFileSync(path.join(root, 'source/client.js'), t, 'utf8');
fs.copyFileSync(path.join(root, 'source/host.js'), path.join(root, 'source/host.js')); // 保持原样
// 双半边语法校验
function check(file, label) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const wrapped = '(function(){' + src + '})()';
  let m;
  try {
    m = require('vm').runInNewContext(wrapped, { host: { handle() {}, defineTool: x => x, registerTool() {} } }, { timeout: 1000 });
  } catch (e) {
    console.error(label + ': eval FAIL — ' + e.message);
    process.exit(1);
  }
  const ok = m && typeof m === 'object' && typeof m.apply === 'function' && Array.isArray(m.inject);
  console.log(label + ': type=' + typeof m + ' apply=' + typeof m.apply + ' inject=' + Array.isArray(m.inject) + (ok ? ' OK' : ' FAIL'));
  if (!ok) process.exit(1);
}
check('source/client.js', 'client');
check('source/host.js', 'host  ');
console.log('build OK → source/client.js (' + t.length + 'B), source/host.js');
