// Pure, bounded instruction interpreter. Expressions never use eval or Function.
export const clone = value => structuredClone(value);
export const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const positions = a => a.flatMap((row, r) => row.map((_, c) => [r, c]));
// Accept the notation shown in the game without changing stored drafts.
export function pythonExpression(source) {
  return String(source).replace(/\bDIV\b/g,'//').replace(/\bMOD\b/g,'%')
    .replace(/\bAND\b/g,'and').replace(/\bOR\b/g,'or')
    .replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/≠/g,'!=')
    .replace(/(?<![<>=!])=(?!=)/g,'==')
    .replace(/\b(grid|result)\[([^[\],]+),([^[\],]+)\]/g,'$1[$2][$3]');
}
export function expression(source, state) {
  const input = pythonExpression(source).trim();
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
    return ()=>{if (!Object.hasOwn(state.vars,token)) throw Error(`變量 ${token} 尚未初始化。`);return state.vars[token];};
  }
  const priority = { or: 1, and: 2, '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3, '+': 4, '-': 4, '*': 5, '//': 5, '%': 5 };
  function binary(min) {
    let left = atom();
    while ((priority[tokens[i]] || 0) > min) {
      if (priority[tokens[i]] === 3) {
        // A Python comparison chain evaluates each operand once and stops on false.
        const first = left, comparisons = [];
        while (priority[tokens[i]] === 3) comparisons.push([tokens[i++], binary(3)]);
        left = () => {
          let a = first();
          for (const [op, get] of comparisons) {
            const b = get();
            const yes = ({'==': () => a === b, '!=': () => a !== b, '<': () => a < b, '>': () => a > b, '<=': () => a <= b, '>=': () => a >= b})[op]();
            if (!yes) return false;
            a = b;
          }
          return true;
        };
        continue;
      }
      const op = tokens[i++], right = binary(priority[op]), previous=left;
      left=()=>{
        const a=previous();
        // Match Python short-circuit semantics: an out-of-bounds RHS is never read.
        if(op==='and'&&!a)return a;
        if(op==='or'&&a)return a;
        const b=right();
        if (['//', '%'].includes(op) && b === 0) throw Error('不能除以 0。');
        return ({ '+': () => a + b, '-': () => a - b, '*': () => a * b, '//': () => Math.floor(a / b), '%': () => a - Math.floor(a / b) * b, and: () => b, or: () => b })[op]();
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
    if (c.depth !== stack.at(-1).depth + 1) throw Error(`第 ${index + 1} 張卡縮排錯誤；只能放入循環或如果之內。`);
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
    if (++steps > 4000) throw Error('超過 4000 步；請檢查循環範圍。');
    state.card = node.index; state.log = message; frames.push(clone(state));
  };
  const value = input => expression(input, state);
  const variable = name => { if (!/^[a-zA-Z_]\w*$/.test(name) || ['DIV', 'MOD', 'AND', 'OR', 'rows', 'cols', '__proto__', 'constructor', 'prototype'].includes(name)) throw Error('請使用一般變量名稱，例如 total、r、c；rows 和 cols 是尺寸常數。'); return name; };
  function block(nodes) {
    for (const n of nodes) {
      if (state.stopped) return;
      state.card = n.index;
      const a = n.args;
      if (n.op === 'for') {
        const start = value(a.from), end = value(a.to), step = value(a.step);
        if (![start, end, step].every(Number.isInteger) || step === 0) throw Error('循環的起點、終點及步長必須是整數，步長不能是 0。');
        if (!n.children.length) throw Error('循環卡內沒有指令；請把下一張卡向右縮排。');
        for (let v = start; step > 0 ? v < end : v > end; v += step) {
          if (state.stopped) return;
          state.vars[variable(a.name)] = v; emit(n, `循環：${a.name} = ${v}（終點不包括 ${end}）`); block(n.children);
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
        const r = value(a.r), c = value(a.c); checkCell(state.grid, r, c); state.outputs.push([r, c]); emit(n, `輸出位置 (${r},${c})；繼續下一張指令。`);
      } else if (n.op === 'stop') {
        state.stopped = true; emit(n, '結束本次任務：不再遍歷其他格。');
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
export function codeLines(cards, format = 'python') {
  const pseudo = format === 'pseudo';
  const expr = value => pseudo ? pythonExpression(value).replace(/\/\//g,' DIV ').replace(/%/g,' MOD ').replace(/==/g,'=').replace(/\band\b/g,'AND').replace(/\bor\b/g,'OR').replace(/\]\[/g,',').replace(/\s+/g,' ').trim() : pythonExpression(value);
  const render = {
    for: a => pseudo ? `設 ${a.name} 由 ${expr(a.from)} 至 ${expr(a.to)}（不包括），步長 ${expr(a.step)} 執行` : `for ${a.name} in range(${expr(a.from)}, ${expr(a.to)}, ${expr(a.step)}):`,
    if: a => pseudo ? `如果 ${expr(a.test)} 則` : `if ${expr(a.test)}:`,
    set: a => `${a.name} ${pseudo?'←':'='} ${expr(a.value)}`,
    read: a => `${a.name} ${pseudo?'←':'='} grid[${expr(a.r)}${pseudo?',':']['}${expr(a.c)}]`,
    inspect: a => pseudo ? `標記已走訪 grid[${expr(a.r)}${pseudo?',':']['}${expr(a.c)}]` : `process(grid[${expr(a.r)}][${expr(a.c)}])`,
    write: a => `grid[${expr(a.r)}${pseudo?',':']['}${expr(a.c)}] ${pseudo?'←':'='} ${expr(a.value)}`,
    copy: a => `result[${expr(a.r)}${pseudo?',':']['}${expr(a.c)}] ${pseudo?'←':'='} ${expr(a.value)}`,
    output: a => pseudo ? `輸出 ${a.value==='not_found'?'"找不到"':expr(a.value)}` : `print(${a.value==='not_found'?'"找不到"':expr(a.value)})`,
    record: a => pseudo ? `輸出 (${expr(a.r)}, ${expr(a.c)})` : `print((${expr(a.r)}, ${expr(a.c)}))`,
    stop: () => pseudo ? '結束本次任務' : 'return',
    new: a => pseudo ? `建立 ${expr(a.rows)} 行 × ${expr(a.cols)} 列的結果陣列 result，每格初始化為 0` : `result = [[0 for _ in range(${expr(a.cols)})] for _ in range(${expr(a.rows)})]`
  };
  const comments = {
    for: '每次取下一個索引；終點不包括在內', if: '條件成立才執行下方縮排內的指令',
    set: '先計算右方，再更新左方變量', read: '讀取格內的值；原貨架不變',
    inspect: '標記這個位置已處理，不改元素值', write: '只更新這格；先前的值會被覆寫',
    copy: '寫入目的座標；保留原貨架', output: '顯示數值後繼續執行',
    record: '輸出行、列後繼續；不是 return', stop: '結束本次任務函數；不回傳位置，也不是 break',
    new: '建立獨立結果表，初值為 0'
  };
  const lines = [{index:null,text:pseudo?'註：遊戲指令（0-based）：DIV 整數除法、MOD 取餘數':'# 以下指令須置於任務函數內；return 結束該函數，不回傳位置'},
    {index:null,text:pseudo?'註：本遊戲結束值不包括；筆記 1-based 偽代碼「由…至…」包括兩端；標記已走訪是遊戲自訂操作':'# rows = len(grid); cols = len(grid[0]); process 代表檢查標記'}];
  const blocks = [];
  const close = depth => { while(blocks.length && blocks.at(-1).depth >= depth) {const c=blocks.pop();lines.push({index:null,text:'    '.repeat(c.depth)+(c.op==='for'?'結束循環':'結束如果')});} };
  cards.forEach((c,index) => {
    if(pseudo)close(c.depth);
    lines.push({index,text:'    '.repeat(c.depth)+render[c.op](c.args)+`  ${pseudo?'註：':'#'} ${comments[c.op]}`});
    if(pseudo && ['for','if'].includes(c.op))blocks.push(c);
  });
  if(pseudo)close(0);
  return lines;
}
export function python(cards) { return codeLines(cards).map(line=>line.text).join('\n'); }
