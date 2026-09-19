import { MISSIONS, dataFor, starter, solution, CARD_TYPES, FIELD_LABELS } from './missions.mjs';

export function predictionAnswer(id, variant = 0) {
  const grid = dataFor(id, variant), cols = grid[0].length;
  if (id === 7) return String(2 * cols + 1);
  if (id === 8) return `${Math.floor(9 / cols)},${9 % cols}`;
  if (id === 9) return ['1,2','0,1','1,-1'][variant];
  if (id === 13) return variant === 0 ? '0,0' : '1,2';
  if (id === 14) return variant === 0 ? '2,0' : '2,1';
  if (id === 17) return String(grid.flat().indexOf(0));
  return MISSIONS[id].answer;
}

export function indexGoal(id, variant) {
  const grid = dataFor(id, variant), cols = grid[0].length;
  return id === 7 ? `逐行標籤 0–${grid.length * cols - 1}；每行 ${cols} 格。原貨架保留。` : null;
}

export const explanations = [
  'grid[0][2] 的 0 是行索引，2 是列索引；格內的 4 才是貨量。地址與內容要分開。',
  '(0,2) 是行 0、列 2；(2,0) 是行 2、列 0。交換兩個索引會指向另一格。',
  '寫入只改變指定格的內容；地址仍是 (1,2)，重新讀取會得到更新後的 5。',
  '外層固定目前行，內層走完該行各列。開始下一行時，內層列索引重新開始。',
  '逐行計數要在每行開始時歸零；每格歸零會丟失累計，只在最外層歸零則得到全表總數。',
  '搜尋值是條件；要找的是符合條件的行、列。輸出位置後另用停止卡結束搜尋。',
  '找全部位置時，輸出一個位置後要繼續巡查；找第一個才在首次符合後停止。',
  'r 個完整行各有 cols 格，再加目前列索引 c。rows 是行數，不能代替每行格數。',
  'index // cols 數完整行，index % cols 是剩餘格數，因此得到行與列索引。',
  '先確認 0 ≤ nr < rows 及 0 ≤ nc < cols，再讀取目標；越界時不能讀取，也不能清空來源。',
  '覆寫前先把原值存入 temp；第二次寫入才能取回原值，而不是再次複製已改變的格。',
  '逐列巡查固定列 c，內層改變行 r。外層完成一列後才移到下一列。',
  '奇數行由 cols−1 開始，每次減 1；終點填 −1（不包括），最後處理的列索引是 0。',
  '左右鏡像保留行，目的列是 cols−1−c；上下鏡像則保留列，反向行索引。',
  '順時針轉 90°：(r,c) → (c,rows−1−r)，新表的行列數互換。轉置則是 (r,c) → (c,r)。',
  '列由 1 開始，寬 3 格，即處理 1、2、3；終點不包括在內，所以填 4。',
  '不重疊 2×2 區塊的來源起點每次移 2 格；滑動視窗每次只移 1 格，兩者不同。',
  '只在 total > best 時更新；相等時保留已有位置，就能保留逐行最先遇到的最大區域。'
];

export function hint(id, variant, level, mode) {
  if (level === 1) return id <= 2 ? '先指出地址，再讀格內數量。「?」要換成你的值或算式。' : '先逐步執行：第一個不符合預測的位置在哪裏？檢查該步的變數、來源格和輸出。';
  if (level === 2) return explanations[id];
  const correct = solution(id, variant), scaffold = starter(id, variant);
  const clues = scaffold.flatMap((c,i) => Object.entries(c.args).filter(([,value])=>value === '?').map(([key]) => `${CARD_TYPES[c.op].label}${c.args.name ? `（${c.args.name}）` : ''}：${FIELD_LABELS[key]}可用 ${correct[i].args[key]}`));
  return `${mode === 'blank' ? '先自行嘗試，再比較關鍵步驟。' : ''}${clues.join('；')}。解釋原因後，再執行核對。`;
}

export function startingCards(id, variant, mode) {
  if (mode === 'blank') return [];
  if (mode === 'arrange') return solution(id, variant).reverse();
  return starter(id, variant);
}

export function indexMapping(rows, cols, base, position) {
  const r = Math.floor(position / cols), c = position % cols;
  return { r: r + base, c: c + base, k: position + base, count: rows * cols };
}
