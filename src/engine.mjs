// Pure, bounded instruction interpreter. Expressions never use eval or Function.
export const clone = value => structuredClone(value);
export const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const positions = a => a.flatMap((row, r) => row.map((_, c) => [r, c]));
export function expression(source, state) {
  const input = String(source).trim();
  const tokens = input.match(/\d+|[A-Za-z_]\w*|==|!=|<=|>=|\/\/|[+\-*%<>()[\],]/g) || [];
  if (tokens.join('') !== input.replace(/\s/g, '')) throw Error(`不支援的算式：${input}`);
  let i = 0;
  const take = t => tokens[i] === t && (++i, true);
  const need = t => { if (!take(t)) throw Error(`算式缺少 ${t}：${input}`); };
  function atom() {
    if (take('-')) {const get=atom();return ()=>-get();}
    if (take('(')) { const get = binary(0); need(')'); return get; }
    const token = tokens[i++];
    if (/^\d+$/.test(token || '')) return ()=>Number(token);
    if (!/^[A-Za-z_]\w*$/.test(token || '')) throw Error(`請填入有效算式：${input}`);
    if (token === 'floor') { need('('); const get = binary(0); need(')'); return ()=>Math.floor(get()); }
    if (token === 'grid' || token === 'result') {
      need('['); const row = binary(0); need(']'); need('['); const col = binary(0); need(']');
      return ()=>{const r=row(),c=col(),a=state[token];checkCell(a,r,c);if(token==='grid'){state.current=[r,c];state.reads.push([r,c]);}return a[r][c];};
    }
    return ()=>{if (!Object.hasOwn(state.vars,token)) throw Error(`變數 ${token} 尚未初始化。`);return state.vars[token];};
  }
  const priority = { or: 1, and: 2, '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3, '+': 4, '-': 4, '*': 5, '//': 5, '%': 5 };
  function binary(min) {
    let left = atom();
    while ((priority[tokens[i]] || 0) > min) {
      const op = tokens[i++], right = binary(priority[op]), previous=left;
      left=()=>{
        const a=previous();
        // Match Python short-circuit semantics: an out-of-bounds RHS is never read.
        if(op==='and'&&!a)return false;
        if(op==='or'&&a)return true;
        const b=right();
        if (['//', '%'].includes(op) && b === 0) throw Error('不能除以 0。');
        return ({ '+': () => a + b, '-': () => a - b, '*': () => a * b, '//': () => Math.floor(a / b), '%': () => a % b, '==': () => a === b, '!=': () => a !== b, '<': () => a < b, '>': () => a > b, '<=': () => a <= b, '>=': () => a >= b, and: () => Boolean(b), or: () => Boolean(b) })[op]();
      };
    }
    return left;
  }
  const value = binary(0)();
  if (i !== tokens.length || (typeof value === 'number' && !Number.isFinite(value))) throw Error(`無效算式：${input}`);
  return value;
}
export function checkCell(grid, r, c) {
  if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0 || r >= grid.length || c >= (grid[0]?.length || 0)) throw Error(`索引越界 (${r},${c})：請先檢查邊界，再讀寫。`);
}
export const card = (op, args = {}, depth = 0) => ({ op, args, depth });
export function initial(grid) {
  return { grid: clone(grid), result: [], vars: { rows: grid.length, cols: grid[0].length }, outputs: [], visited: [], reads: [], writes: [], current: null, destination: null, log: '準備就緒；先預測，再執行。', card: -1, error: null, stopped: false };
}
function tree(cards) {
  const root = [], stack = [{ children: root, depth: -1 }];
  cards.forEach((c, index) => {
    if (!Number.isInteger(c.depth) || c.depth < 0 || c.depth > 8) throw Error('縮排必須在 0–8 之間。');
    while (stack.length > 1 && stack.at(-1).depth >= c.depth) stack.pop();
    if (c.depth !== stack.at(-1).depth + 1) throw Error(`第 ${index + 1} 張卡縮排錯誤；只能放入重複或如果之內。`);
    const n = { ...clone(c), index, children: [] };
    stack.at(-1).children.push(n);
    if (['for', 'if'].includes(c.op)) stack.push(n);
  });
  return root;
}
export function run(grid, cards) {
  const state = initial(grid), frames = [clone(state)];
  let steps = 0;
  const emit = (node, message) => {
    if (++steps > 4000) throw Error('超過 4000 步；請檢查重複範圍。');
    state.card = node.index; state.log = message; frames.push(clone(state));
  };
  const value = input => expression(input, state);
  const variable = name => { if (!/^[a-zA-Z_]\w*$/.test(name) || ['rows', 'cols', '__proto__', 'constructor', 'prototype'].includes(name)) throw Error('請使用一般變數名稱，例如 total、r、c；rows 和 cols 是尺寸常數。'); return name; };
  function block(nodes) {
    for (const n of nodes) {
      if (state.stopped) return;
      state.card = n.index;
      const a = n.args;
      if (n.op === 'for') {
        const start = value(a.from), end = value(a.to), step = value(a.step);
        if (![start, end, step].every(Number.isInteger) || step === 0) throw Error('重複的起點、終點及步長必須是整數，步長不能是 0。');
        if (!n.children.length) throw Error('重複卡內沒有指令；請把下一張卡向右縮排。');
        for (let v = start; step > 0 ? v < end : v > end; v += step) {
          if (state.stopped) return;
          state.vars[variable(a.name)] = v; emit(n, `重複：${a.name} = ${v}（終點不包括 ${end}）`); block(n.children);
        }
      } else if (n.op === 'if') {
        const yes = Boolean(value(a.test)); emit(n, `如果 ${a.test} → ${yes ? '成立' : '不成立'}`);
        if (yes) block(n.children);
      } else if (n.op === 'set') {
        const v = value(a.value); state.vars[variable(a.name)] = v; emit(n, `${a.name} ← ${JSON.stringify(v)}`);
      } else if (n.op === 'read' || n.op === 'inspect') {
        const r = value(a.r), c = value(a.c); checkCell(state.grid, r, c); state.current = [r, c]; state.reads.push([r, c]);
        if (n.op === 'read') state.vars[variable(a.name)] = state.grid[r][c];
        else state.visited.push([r, c]);
        emit(n, `${n.op === 'read' ? '讀取' : '檢查'} grid[${r}][${c}] = ${state.grid[r][c]}`);
      } else if (n.op === 'write' || n.op === 'copy') {
        const r = value(a.r), c = value(a.c), v = value(a.value), dest = n.op === 'copy' ? 'result' : 'grid';
        checkCell(state[dest], r, c);
        if (dest === 'grid' && (!Number.isInteger(v) || v < 0)) throw Error('貨物數量必須是非負整數。');
        const old = state[dest][r][c]; state[dest][r][c] = v; state.current = dest === 'grid' ? [r, c] : state.current;
        if(dest==='result')state.destination=[r,c];
        state.writes.push({ dest, r, c, old, value: v }); emit(n, `${dest}[${r}][${c}]：${old} → ${v}`);
      } else if (n.op === 'output') {
        const v = a.value === 'not_found' ? '找不到' : value(a.value); state.outputs.push(v); emit(n, `輸出：${JSON.stringify(v)}`);
      } else if (n.op === 'record') {
        const r = value(a.r), c = value(a.c); checkCell(state.grid, r, c); state.outputs.push([r, c]); emit(n, `回傳位置 (${r},${c})`);
      } else if (n.op === 'stop') {
        state.stopped = true; emit(n, '停止整個程式：不再巡查其他格。');
      } else if (n.op === 'new') {
        const r = value(a.rows), c = value(a.cols);
        if (![r, c].every(v => Number.isInteger(v) && v > 0 && v <= 10)) throw Error('新表尺寸必須是 1–10 的整數。');
        state.result = Array.from({ length: r }, () => Array(c).fill(0)); emit(n, `建立 ${r} × ${c} 新表 result；原圖保留。`);
      } else throw Error(`未知指令：${n.op}`);
    }
  }
  try { block(tree(cards)); } catch (error) { state.error = error.message; state.log = error.message; frames.push(clone(state)); }
  return frames;
}
export function python(cards) {
  const lines = { for: a => `for ${a.name} in range(${a.from}, ${a.to}, ${a.step}):`, if: a => `if ${a.test}:`, set: a => `${a.name} = ${a.value}`, read: a => `${a.name} = grid[${a.r}][${a.c}]`, inspect: a => `process(grid[${a.r}][${a.c}])  # 標記已處理`, write: a => `grid[${a.r}][${a.c}] = ${a.value}`, copy: a => `result[${a.r}][${a.c}] = ${a.value}`, output: a => `print(${a.value === 'not_found' ? '"找不到"' : a.value})`, record: a => `print((${a.r}, ${a.c}))  # 位置`, stop: () => 'return  # 停止整個任務函數', new: a => `result = [[0 for _ in range(${a.cols})] for _ in range(${a.rows})]` };
  return '# 指令對照；return 需放在函數內\n# rows = len(grid); cols = len(grid[0])\n' + cards.map(c => '    '.repeat(c.depth) + lines[c.op](c.args)).join('\n');
}
