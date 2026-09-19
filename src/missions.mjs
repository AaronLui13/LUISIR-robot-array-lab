import { card as C, clone, equal, positions, run as executeProgram } from './engine.mjs';
export const BASE = [[2,0,4,1],[1,3,0,2],[0,2,1,0]];
const ART = [['A','B','C'],['D','E','F']];
const BLOCK = [[1,2,0,4],[3,0,2,1],[0,2,5,0],[1,3,2,4]];
const set = (name,value,d=0) => C('set',{name,value:String(value)},d);
const loop = (name,to,d=0,from='0',step='1') => C('for',{name,from,to,step},d);
const iff = (test,d=0) => C('if',{test},d);
const inspect = (d=2) => C('inspect',{r:'r',c:'c'},d);
const output = (value,d=0) => C('output',{value},d);
const record = (r='r',c='c',d=0) => C('record',{r,c},d);
const write = (r,c,value,d=0) => C('write',{r,c,value},d);
const scan = () => [loop('r','rows'),loop('c','cols',1)];
const read = (r,c,name='value',d=0) => C('read',{r,c,name},d);
const fresh = (rows,cols) => C('new',{rows,cols});
const copy = (r,c,value='grid[r][c]',d=2) => C('copy',{r,c,value},d);
export const LESSONS = ['操作教學','認識與修改','遍歷與統計','搜尋與回傳','索引轉換','移動與邊界','遍歷次序','座標變換','局部與整合','終極工作單'];
const spec = (id,lesson,title,brief,goal,predict,answer,question,choices,correct,options={}) => ({id,lesson,title,brief,goal,predict,answer,question,choices,correct,...options});
export const MISSIONS = [
 spec(0,0,'認識控制台','行 r 向下，列 c 向右；索引由 0 開始。先點選 (0,2)，再點選 (2,0)，讀取兩格。','依序輸出 4、0；完成兩個地址的點選。','預測兩次讀取的數量（用逗號分隔）','4,0','grid[0][2] 的 2 代表甚麼？',['貨物有 2 件','列索引是 2','第二行'],1),
 spec(1,1,'貨位地址','先讀取 (0,2) 和 (2,0)。橙框標示另一個貨位：把它的行、列填進最後一張讀取卡。','依序輸出 4、0，以及橙框格的數量。','橙框的位置是？（行,列）','1,3','(0,2) 與 (2,0) 為甚麼不同？',['前者是行 0、列 2','兩個索引可以互換','索引代表貨量'],0,{highlight:[1,3]}),
 spec(2,1,'指定位置補貨','把 (1,2) 的貨量由 0 設定成 5。先在貨架點選你預計會改變的一格。','只有 (1,2) 變成 5，其餘保持原值。','重新讀取 grid[1][2]，預計得到甚麼？','5','同一地址為甚麼讀到不同數字？',['地址改變了','索引從 1 開始','該格儲存的值已被更新'],2),
 spec(3,2,'巡查所有貨位','把「每行」「每列」「檢查目前格」組成巢狀迴圈。縮排表示指令屬於哪個迴圈。','12 格全部處理，每格恰好一次。','逐行巡查的第二個位置是？（行,列）','0,1','內層迴圈負責甚麼？',['走完目前行的所有列','只檢查第一格','改變貨物數量'],0),
 spec(4,2,'空位報告','每格數字是貨量；0 代表空位。巡查時符合條件才把計數器加 1。','輸出空格總數；變式要逐行輸出。','共用貨架有幾個空位？','4','每行分別計數，count 應在哪裏歸零？',['最內層每格之前','每一行開始時','所有行完成後'],1,{variants:['整個貨架','每行空位']}),
 spec(5,3,'尋找指定貨量','按逐行次序搜尋 3。找到後回傳位置並停止。再用 9 測試找不到的情況。','3 → (1,1)；9 →「找不到」。不保留舊位置。','數量為 3 的位置是？（行,列）','1,1','搜尋應回傳甚麼？',['貨量 3','總貨量','符合條件的行、列'],2,{variants:['搜尋 3','搜尋 9']}),
 spec(6,3,'第一個？還是全部？','搜尋貨量 2。比較回傳第一個與回傳所有位置，調整停止的時機。','第一個 (0,0)；全部 (0,0)、(1,3)、(2,1)。','共有幾格的貨量是 2？','3','要找齊所有位置，找到一格後應怎樣？',['立刻停止整個程式','繼續搜尋餘下格子','把搜尋值加 1'],1,{variants:['第一個','全部位置','搜尋不存在的 9']}),
 spec(7,4,'貨位貼標籤','用「前面完整行的格數＋目前列索引」計算一維編號。建立新表，原貨架不變。','逐行標籤 0–11；每行 5 格也能換算。','(2,1) 的一維編號是？','9','一維編號的公式是？',['r * rows + c','r + c','r * cols + c'],2,{variants:['每行 4 格','每行 5 格']}),
 spec(8,4,'只剩一張編號單','編號單只寫了 9。利用整除 // 及餘數 % 還原行列。','每行 4 格 → (2,1)；每行 5 格 → (1,4)。','每行 4 格時，編號 9 的位置？（行,列）','2,1','為甚麼除以 cols？',['每一完整行有 cols 格','因為總共有 cols 行','任何常數都可以'],0,{variants:['每行 4 格','每行 5 格']}),
 spec(9,5,'可以搬過去嗎？','目前貨物在 (1,1)，整批搬一格。先算 nr、nc，檢查邊界，再檢查空位，最後更新。','向右成功；向上碰到貨物；向外越界時原圖不變。','向右搬運的候選位置？（行,列）','1,2','哪一步必須先做？',['先讀取目標貨量','先清空來源','先確認候選位置在邊界內'],2,{variants:['向右空位','向上碰撞','左邊界向外']}),
 spec(10,5,'交換兩個貨位','先觀察「直接覆寫」的錯誤。用暫存變數 temp 交換 (0,0) 與 (1,2)。','2 和 5 成功交換，沒有遺失或複製貨量。','交換後 grid[0][0] 是多少？','5','temp 的用途是甚麼？',['保存即將被覆寫的原值','改變索引','讓貨量加倍'],0),
 spec(11,6,'改變巡查方向','把逐行改成逐列：外層控制列，內層控制行。貨架內容不可改變。','按 (0,0)、(1,0)、(2,0)、(0,1)… 走訪。','前四個位置？例如 0,0;1,0;2,0;0,1','0,0;1,0;2,0;0,1','逐列巡查的外層迴圈控制甚麼？',['行 r','列 c','貨量'],1),
 spec(12,6,'蛇形巡查','偶數行向右、奇數行向左。加入 r % 2 判斷及倒序範圍。','每格一次；第二行由 (1,3) 開始。','(1,0) 的蛇形走訪編號是？','7','奇數行的列範圍應是？',['0 到 cols-1，步長 1','cols-1 到 0，步長 -1','cols 到 1，步長 -1'],1,{variants:['蛇形巡查','蛇形編號挑戰']}),
 spec(13,7,'鏡像整理','字母方便追蹤來源。把每格複製到新表 result；橙色 C 是追蹤點。','先左右翻轉，再上下翻轉；原圖完整保留。','左右翻轉後 C 的位置？（行,列）','0,0','左右翻轉應反向哪個索引？',['行 r','行與列互換','列 c'],2,{variants:['左右翻轉','上下翻轉']}),
 spec(14,7,'把圖案轉正','先選新表尺寸，再組合目的位置。試試轉置與順時針 90°。','新表 3×2；六個字母各出現一次。','順時針 90° 後 C 的位置？（行,列）','2,1','順時針 90° 的映射是？',['(c, rows-1-r)','(r,c)','(cols-1-c,r)'],0,{variants:['轉置','順時針 90°']}),
 spec(15,8,'只統計這一區','區域左上角 (0,1)、高 2、寬 3。只處理框內六格並累加。','六格各一次，輸出總和 10；框外不參與。','這六格的總和是？','10','迴圈終點不包括在內，列的終點應填？',['3','4','2'],1,{region:[0,1,2,3]}),
 spec(16,8,'縮小倉庫地圖','每個不重疊 2×2 區塊合成一格。從結果索引計算來源起點。','建立 2×2 結果；每塊獨立累加，每來源格恰好一次。','左上 2×2 區塊的總和是？','6','不重疊區塊的來源起點步長是多少？',['1','2','4'],1,{variants:['2×2 合併','滑動視窗最大值','不能整除：捨去邊緣','不能整除：補 0']}),
 spec(17,9,'完成一張倉庫工作單','連續任務：找第一個空位 → 輸出位置與一維編號 → 補入 6 → 找更新後總和最大的 2×2 區域。','回傳最大總和及左上角；同值保留逐行最先者。兩組資料都要成功。','第一組資料首個空位的一維編號是？','1','最大總和同值時怎樣保留第一個？',['使用 > 才更新最佳值','使用 >= 更新','每次都更新'],0,{variants:['工作單 A','工作單 B']})
];
export function dataFor(id,v=0) {
  if ([7,8].includes(id) && v===1) return [[2,0,4,1,3],[1,3,0,2,1],[0,2,1,0,4]];
  if (id===9) return v===2 ? [[0,0,0],[5,0,0],[0,0,0]] : [[0,3,0],[0,5,0],[1,0,0]];
  if (id===10) return [[2,0,0],[0,0,5]];
  if ([13,14].includes(id)) return clone(ART);
  if (id===16) return v>=2 ? [[1,2,0,4,3],[3,0,2,1,2],[0,2,5,0,1]] : clone(BLOCK);
  if (id===17) return v===1 ? [[4,2,1,3,0],[2,0,5,1,4],[1,3,2,4,1]] : [[2,0,4,1,3],[1,3,0,2,2],[0,2,1,0,4]];
  return clone(BASE);
}
function search(target,all=false) {
  return [set('found','0'),...scan(),inspect(),iff(`grid[r][c] == ${target}`,2),record('r','c',3),set('found','1',3),...(!all?[C('stop',{},3)]:[]),iff('found == 0'),output('not_found',1)];
}
function maxWindow(depth=0) {
  return [set('best','-1',depth),loop('r','rows-1',depth),loop('c','cols-1',depth+1),set('total','0',depth+2),loop('i','r+2',depth+2,'r'),loop('j','c+2',depth+3,'c'),set('total','total + grid[i][j]',depth+4),iff('total > best',depth+2),set('best','total',depth+3),set('br','r',depth+3),set('bc','c',depth+3),output('best',depth),record('br','bc',depth)];
}
export function solution(id,v=0) {
  switch(id) {
    case 0:return [read('0','2'),output('value'),read('2','0'),output('value')];
    case 1:return [...solution(0),read('1','3'),output('value')];
    case 2:return [write('1','2','5'),read('1','2'),output('value')];
    case 3:return [...scan(),inspect()];
    case 4:return v===0 ? [set('count','0'),...scan(),inspect(),iff('grid[r][c] == 0',2),set('count','count+1',3),output('count')] : [loop('r','rows'),set('count','0',1),loop('c','cols',1),inspect(),iff('grid[r][c] == 0',2),set('count','count+1',3),output('count',1)];
    case 5:return search(v===0?'3':'9');
    case 6:return search(v===2?'9':'2',v!==0);
    case 7:return [fresh('rows','cols'),...scan(),copy('r','c','r * cols + c')];
    case 8:return [set('index','9'),set('r','index // cols'),set('c','index % cols'),record()];
    case 9:return [set('r','1'),set('c',v===2?'0':'1'),set('nr',v===1?'r-1':'r'),set('nc',v===2?'c-1':v===0?'c+1':'c'),iff('nr >= 0 and nr < rows and nc >= 0 and nc < cols'),iff('grid[nr][nc] == 0',1),write('nr','nc','grid[r][c]',2),write('r','c','0',2)];
    case 10:return [read('0','0','temp'),write('0','0','grid[1][2]'),write('1','2','temp')];
    case 11:return [loop('c','cols'),loop('r','rows',1),inspect()];
    case 12:if(v===1)return [...solution(12,0),set('r','1'),set('c','0'),set('index','r*cols+c'),iff('r % 2 == 1'),set('index','r*cols+cols-1-c',1),output('index')];return [loop('r','rows'),iff('r % 2 == 0',1),loop('c','cols',2),inspect(3),iff('r % 2 == 1',1),loop('c','-1',2,'cols-1','-1'),inspect(3)];
    case 13:return [fresh('rows','cols'),...scan(),copy(v===0?'r':'rows-1-r',v===0?'cols-1-c':'c')];
    case 14:return [fresh('cols','rows'),...scan(),copy('c',v===0?'r':'rows-1-r')];
    case 15:return [set('total','0'),loop('r','2'),loop('c','4',1,'1'),inspect(),set('total','total + grid[r][c]',2),output('total')];
    case 16: {
      if(v===1) return maxWindow();
      const r=v===3?'(rows+1)//2':'rows//2', c=v===3?'(cols+1)//2':'cols//2';
      return [fresh(r,c),loop('r',r),loop('c',c,1),set('total','0',2),loop('i','r*2+2',2,'r*2'),loop('j','c*2+2',3,'c*2'),...(v===3?[iff('i < rows and j < cols',4)]:[]),C('inspect',{r:'i',c:'j'},v===3?5:4),set('total','total + grid[i][j]',v===3?5:4),copy('r','c','total')];
    }
    case 17:return [set('found','0'),...scan(),iff('found == 0',2),iff('grid[r][c] == 0',3),record('r','c',4),output('r*cols+c',4),write('r','c','6',4),set('found','1',4),...maxWindow()];
    default:throw Error('Unknown mission');
  }
}
export function starter(id,v=0) {
  const cards = solution(id,v);
  // One editable scaffold gap per mission, never silently auto-filled at execution.
  const gaps = [0,4,0,1,0,4,4,3,1,3,0,0,5,3,0,2,0,0];
  const index=Math.min(gaps[id],cards.length-1), chosen=cards[index];
  const key=({read:'r',write:'value',for:'to',set:'value',if:'test',copy:'c',new:'rows',inspect:'r'})[chosen.op];
  if(key) chosen.args[key]='?';
  return cards;
}
export function expected(id,v,grid) {
  const all=positions(grid), cols=grid[0].length, rows=grid.length;
  if(id===0) return {outputs:[4,0]};
  if(id===1) return {outputs:[4,0,2]};
  if(id===2) {const a=clone(grid);a[1][2]=5;return {grid:a};}
  if(id===3) return {visited:all};
  if(id===4) return {visited:all,outputs:v===0?[grid.flat().filter(x=>x===0).length]:grid.map(row=>row.filter(x=>x===0).length)};
  if(id===5 || id===6) {
    const target=id===5?(v===0?3:9):(v===2?9:2), found=all.filter(([r,c])=>grid[r][c]===target);
    return {outputs:found.length ? (id===5||v===0?[found[0]]:found) : ['找不到'], first:id===5||v===0, found};
  }
  if(id===7)return {result:grid.map((row,r)=>row.map((_,c)=>r*cols+c))};
  if(id===8)return {outputs:[[Math.floor(9/cols),9%cols]]};
  if(id===9){const a=clone(grid);if(v===0){a[1][2]=a[1][1];a[1][1]=0;}return {grid:a};}
  if(id===10){const a=clone(grid);[a[0][0],a[1][2]]=[a[1][2],a[0][0]];return {grid:a};}
  if(id===11)return {visited:Array.from({length:cols},(_,c)=>Array.from({length:rows},(_,r)=>[r,c])).flat()};
  if(id===12)return {...(v===1?{outputs:[2*cols-1]}:{}),visited:grid.flatMap((row,r)=>row.map((_,c)=>[r,r%2?cols-1-c:c]))};
  if(id===13)return {result:v===0?grid.map(row=>[...row].reverse()):clone(grid).reverse()};
  if(id===14)return {result:Array.from({length:cols},(_,c)=>Array.from({length:rows},(_,r)=>grid[v===0?r:rows-1-r][c]))};
  if(id===15){const area=all.filter(([r,c])=>r<2&&c>=1&&c<4);return {outputs:[area.reduce((sum,[r,c])=>sum+grid[r][c],0)],visited:area};}
  const best = a => {let sum=-1,pos=null;for(let r=0;r<a.length-1;r++)for(let c=0;c<a[0].length-1;c++){const total=a[r][c]+a[r][c+1]+a[r+1][c]+a[r+1][c+1];if(total>sum){sum=total;pos=[r,c];}}return [sum,pos];};
  if(id===16){
    if(v===1)return {outputs:best(grid)};
    const nr=v===3?Math.ceil(rows/2):Math.floor(rows/2),nc=v===3?Math.ceil(cols/2):Math.floor(cols/2);
    return {result:Array.from({length:nr},(_,r)=>Array.from({length:nc},(_,c)=>[0,1].reduce((sum,dr)=>sum+[0,1].reduce((s,dc)=>s+(grid[r*2+dr]?.[c*2+dc]||0),0),0))),visited:all.filter(([r,c])=>r<nr*2&&c<nc*2)};
  }
  if(id===17){const a=clone(grid),[r,c]=all.find(([r,c])=>a[r][c]===0);a[r][c]=6;return {grid:a,outputs:[[r,c],r*cols+c,...best(a)]};}
}
export function validate(id,v,grid,state,cards) {
  if(state.error)return {ok:false,message:state.error};
  const e=expected(id,v,grid);
  if(id<=1&&!equal(state.reads,id===0?[[0,2],[2,0]]:[[0,2],[2,0],[1,3]]))return {ok:false,message:'請實際讀取指定地址，而不是直接輸出預計答案。'};
  if(e.grid&&!equal(state.grid,e.grid))return {ok:false,message:'貨架與目標不同。查看第一個不符合預測的讀寫步驟。'};
  if(!e.grid&&!equal(state.grid,grid))return {ok:false,message:'這個任務必須保留原貨架；請把新資料寫入 result。'};
  if(e.result&&!equal(state.result,e.result))return {ok:false,message:'新表的尺寸或位置不正確。先追蹤橙色 C 或左上角的一格。'};
  if(e.outputs&&!equal(state.outputs,e.outputs))return {ok:false,message:`輸出未符合任務。你的輸出是 ${JSON.stringify(state.outputs)}；檢查數量與位置是否混淆。`};
  if(e.visited){
    const actual=[...state.visited],wanted=[...e.visited];
    const order=[3,11,12].includes(id);
    if(!equal(order?actual:actual.sort(),order?wanted:wanted.sort()))return {ok:false,message:actual.length>wanted.length?'有格子被重複處理。檢查迴圈範圍。':'走訪的格子或次序不正確。檢查外層與內層迴圈。'};
  }
  if(e.first&&e.found.length&&!state.stopped)return {ok:false,message:'已找到位置，但程式沒有停止；加入「停止整個程式」。'};
  if([5,6].includes(id)) {
    const route=positions(grid),wanted=e.first&&e.found.length?route.slice(0,route.findIndex(p=>equal(p,e.found[0]))+1):route;
    if(!equal(state.visited,wanted))return {ok:false,message:'請按逐行次序檢查每格；找第一個時，找到後不能繼續檢查。'};
  }
  if(id===9){const candidate=v===0?[1,2]:v===1?[0,1]:[1,-1];if(!equal([state.vars.nr,state.vars.nc],candidate))return {ok:false,message:'候選位置 nr、nc 不正確。先由目前位置及方向計算新位置。'};}
  if(id>=3&&![8,9,10].includes(id)&&!cards.some(c=>c.op==='for'))return {ok:false,message:'請使用重複指令建立可以重用的方法。'};
  if(id===9&&!cards.some(c=>c.op==='if'))return {ok:false,message:'搬運前需要明確的邊界和空位檢查。'};
  if(id===10&&!cards.some(c=>c.op==='read'||c.op==='set'))return {ok:false,message:'請使用暫存保存原值。'};
  return {ok:true,message:'執行結果與規則都符合任務。完成概念題以取得任務章。'};
}
export const CARD_TYPES = {
 read:{label:'讀取一格',english:'Read',stage:0,args:{r:'0',c:'0',name:'value'}},
 write:{label:'設定一格',english:'Write',stage:0,args:{r:'0',c:'0',value:'5'}},
 output:{label:'輸出數值',english:'Output',stage:0,args:{value:'value'}},
 for:{label:'重複',english:'For',stage:2,args:{name:'r',from:'0',to:'rows',step:'1'}},
 inspect:{label:'檢查目前格',english:'Visit',stage:2,args:{r:'r',c:'c'}},
 set:{label:'設定／加總／暫存',english:'Variable',stage:2,args:{name:'total',value:'0'}},
 if:{label:'如果',english:'If',stage:2,args:{test:'grid[r][c] == 0'}},
 record:{label:'回傳位置',english:'Position',stage:3,args:{r:'r',c:'c'}},
 stop:{label:'停止整個程式',english:'Return',stage:3,args:{}},
 new:{label:'建立新表',english:'New array',stage:4,args:{rows:'rows',cols:'cols'}},
 copy:{label:'寫入新表',english:'Map',stage:4,args:{r:'r',c:'c',value:'r*cols+c'}}
};
export const FIELD_LABELS={r:'行 r',c:'列 c',value:'值／算式',name:'變數',from:'由（包括）',to:'至（不包括）',step:'步長',test:'條件',rows:'新表行數',cols:'新表列數'};

// Extra numeric datasets verify reusable methods, separately from the visible task.
export function assess(id,v,grid,state,cards) {
  const current=validate(id,v,grid,state,cards);if(!current.ok)return current;
  const probes=[];
  if([7,8,17].includes(id))probes.push([v===0?1:0,dataFor(id,v===0?1:0)]);
  if([3,4,5,6,7,8,10,11,12,15,16].includes(id)){
    const alternate=clone(grid).map((row,r)=>row.map((x,c)=>typeof x==='number'?(x+r+c+1)%5:x));
    if(id===10){alternate[0][0]=7;alternate[1][2]=1;}
    probes.push([v,alternate]);
  }
  if(id===9){const alternate=clone(grid);alternate[1][v===2?0:1]=8;probes.push([v,alternate]);}
  if(id===17)probes.push([0,[[0,0,0],[0,0,0]]],[0,[[1,1,1],[1,0,1],[1,1,1]]]);
  for(const [variant,data] of probes){const check=validate(id,variant,data,executeProgram(data,cards).at(-1),cards);if(!check.ok)return {ok:false,message:'目前資料正確，但新資料未通過：'+check.message+' 請根據尺寸、貨量或搜尋結果計算，不要寫死答案。'};}
  return {ok:true,message:'執行結果與規則都符合任務。'+(probes.length?'同一方法亦通過新資料測試。':'')+'完成概念題以取得任務章。'};
}
