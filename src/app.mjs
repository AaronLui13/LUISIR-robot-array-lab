import { run, initial, clone, codeLines, equal, card } from './engine.mjs';
import { MISSIONS, LESSONS, dataFor, starter, assess, CARD_TYPES, FIELD_LABELS } from './missions.mjs';
import { predictionAnswer, indexGoal, explanations, hint, startingCards, indexMapping } from './learning.mjs';
import { readProgress, writeProgress } from './progress.mjs';
const $ = s => document.querySelector(s);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved={};try{saved=JSON.parse(localStorage.getItem('luisir-array-badges')||'{}');}catch{/* Storage is optional. */}
if(!saved || typeof saved !== 'object' || Array.isArray(saved)) saved={};
let id=0,v=0,cards=starter(0),frames=[initial(dataFor(0))],cursor=0,prediction='',locked=false,selected=[],result=null,hints=0,quiz=null,timer=null,drawer=false,mode='scaffold',drag=null,predictedCorrect=false;
let storage=null;try{storage=window.localStorage;}catch{/* Private browsing may block storage. */}
let progress=readProgress(storage)||{version:2,id:0,v:0,drafts:{}};
let storageOK=true, format='pseudo', speed=600, advanced=false, mappingBase=0, mappingPosition=0, unfolded=false;
function persist(){progress.id=id;progress.v=v;progress.drafts[`${id}:${v}`]={cards:clone(cards),mode,prediction,locked,selected:clone(selected)};storageOK=writeProgress(storage,progress);}
function restoreDraft(){const draft=progress.drafts[`${id}:${v}`];mode=draft?.mode||'scaffold';cards=draft?clone(draft.cards):startingCards(id,v,mode);prediction=draft?.prediction||'';locked=draft?.locked||false;selected=draft?clone(draft.selected):[];predictedCorrect=locked&&normalize(prediction)===normalize(predAnswer());}
const mission=()=>MISSIONS[id],state=()=>frames[cursor],grid=()=>dataFor(id,v);
function stop(){if(timer)clearInterval(timer);timer=null;}
function invalidate(){stop();frames=[initial(grid())];cursor=0;result=null;quiz=null;}
function load(next,variant=0){persist();stop();id=next;v=variant;restoreDraft();hints=0;drawer=false;advanced=false;mappingPosition=0;unfolded=false;invalidate();render();window.scrollTo({top:0,behavior:'instant'});}
function save(){try{localStorage.setItem('luisir-array-badges',JSON.stringify(saved));}catch{/* Do not require browser storage. */}}
function predAnswer(){return predictionAnswer(id,v);}
function predPrompt(){if(id===13)return `${v===0?'左右':'上下'}翻轉後 C 的位置？（行,列）`;if(id===14)return `${v===0?'轉置':'順時針 90°'}後 C 的位置？（行,列）`;if(id===8)return `每行 ${grid()[0].length} 格時，編號 9 的位置？（行,列）`;if(id===9)return '這次搬運的候選位置？（行,列）';if(id===17)return '本組資料首個空位的一維編號是？';return mission().predict;}
function normalize(s){return s.replace(/[()（）\s]/g,'').replace(/[，、]/g,',').replace(/；/g,';');}
function begin(){
 if(!locked){result={ok:false,message:'先填寫並鎖定預測，再執行指令。'};render();return false;}
 if(id===0&&!equal(selected,[[0,2],[2,0]])){result={ok:false,message:'先依序點選 (0,2)，再點選 (2,0)。可按「重新預測」重選。'};render();return false;}
 if(id===2&&!equal(selected,[[1,2]])){result={ok:false,message:'先在貨架點選預計會改變的格子 (1,2)。'};render();return false;}
 if(frames.length===1){frames=run(grid(),cards);cursor=0;}
 return true;
}
function step(){if(!begin())return;stop();if(cursor<frames.length-1)cursor++;render();}
function execute(){if(!begin())return;if(timer){stop();render();return;}timer=setInterval(()=>{if(cursor<frames.length-1)cursor++;if(cursor>=frames.length-1)stop();render();},speed);render();}
function verify(){
 stop();if(cursor!==frames.length-1||frames.length===1){result={ok:false,message:'請先執行至程式結束，再核對結果。'};render();return;}
 result=assess(id,v,grid(),state(),cards);

 render();
}
function table(a,type='grid'){
 if(!a.length)return '<p class="muted">建立新表後，結果會顯示在這裏。</p>';
 const cols=a[0].length,position=type==='grid'?state().current:state().destination;
 return `<div class="array-table ${type==='result'?'result-table':''}" style="--cols:${cols}" role="group" aria-label="${type==='grid'?'原貨架':'結果表'}"><span class="axis-corner">r ╲ c</span>${a[0].map((_,c)=>`<span class="axis ${position?.[1]===c?'axis-active':''}">${c}</span>`).join('')}${a.map((row,r)=>`<span class="axis ${position?.[0]===r?'axis-active':''}">${r}</span>${row.map((value,c)=>{
 const visits=state().visited.filter(p=>equal(p,[r,c])).length,active=equal(type==='grid'?state().current:state().destination,[r,c]),chosen=type==='grid'&&selected.some(p=>equal(p,[r,c])),target=(id===1&&equal(mission().highlight,[r,c]))||(id===9&&equal([1,v===2?0:1],[r,c])),inRegion=id===15&&r<2&&c>=1;
 return `<button class="cell ${value===0?'empty':''} ${value==='C'?'tracked':''} ${active?'active':''} ${chosen?'chosen':''} ${visits?'visited':''} ${target?'target':''} ${inRegion?'in-region':''}" data-cell="${r},${c}" data-table="${type}" aria-label="行 ${r} 列 ${c}，${value==='C'?'橙色 C':value}${visits?`，已處理 ${visits} 次`:''}" ${type==='grid'?'aria-pressed="'+chosen+'"':''}><span class="cell-number">${value}</span><span class="cell-address">${r},${c}</span>${visits?`<span class="visit-count">${visits===1?'✓':visits}</span>`:''}</button>`;
 }).join('')}`).join('')}</div>`;
}
function viewBrief(){
 if(id===9)return `目前貨物在 ${v===2?'(1,0)':'(1,1)'}，方向${['向右','向上','向左'][v]}。先計算 nr、nc，檢查邊界，再檢查空位，最後更新。`;
 if(id===12&&v===1)return '完成蛇形巡查後，再用算式輸出 (1,0) 的走訪編號；編號從 0 開始。';
 if(id===16&&v===1)return '找出所有 2×2 滑動視窗中總和最大的一個。起點步長為 1；輸出最大總和，再輸出左上角；同值保留最先遇到者。';
 if(id===16&&v>=2)return `這張貨架是 3×5，不能整除。已選邊界政策：${v===2?'捨去不能組成完整 2×2 區塊的底行及右列':'邊界以 0 補足；只讀取原圖存在的格子'}。每個 2×2 區塊合成一格。`;
 return mission().brief;
}
function viewGoal(){
 if(id===7)return indexGoal(id,v);
 if(id===12&&v===1)return '蛇形走訪每格一次，最後輸出 (1,0) 的編號。';
 if(id===16&&v===1)return '輸出最大總和及左上角位置；原貨架不變。';
 if(id===16&&v===2)return '建立 1×2 結果；只處理完整區塊的 8 格。';
 if(id===16&&v===3)return '建立 2×3 結果；15 個來源格各處理一次，超出邊界部分當作 0。';
 return mission().goal;
}
function mappingView(){
 if(![7,8].includes(id))return '';
 const rows=grid().length,cols=grid()[0].length,m=indexMapping(rows,cols,mappingBase,mappingPosition);
 return `<details class="mapping" data-details="mapping"><summary>二維 ⇄ 一維：展開貨架，追蹤同一格</summary><p>先數前面完整的行，再數這一行的格。這個示範可切換編號慣例；任務指令仍由 0 開始。</p><label>示範索引 <select id="mapping-base"><option value="0" ${mappingBase===0?'selected':''}>由 0 開始</option><option value="1" ${mappingBase===1?'selected':''}>由 1 開始</option></select></label><div class="mapping-actions"><button data-action="unfold">${unfolded?'還原二維貨架':'逐行展開成一維'}</button><button data-action="map-back" ${mappingPosition===0?'disabled':''}>上一格</button><button data-action="map-next" ${mappingPosition===m.count-1?'disabled':''}>下一格</button></div><div class="mapping-scroll"><div class="mapping-canvas" style="width:${(unfolded?m.count:cols)*66}px;height:${(unfolded?1:rows)*66}px">${grid().flat().map((_,k)=>{const point=indexMapping(rows,cols,mappingBase,k);return `<button class="mapping-cell ${k===mappingPosition?'selected':''}" data-map="${k}" style="left:${(unfolded?k:k%cols)*66}px;top:${(unfolded?0:Math.floor(k/cols))*66}px" aria-label="示範位置 (${point.r},${point.c})，編號 ${point.k}" aria-pressed="${k===mappingPosition}"><b>${point.k}</b><small>(${point.r},${point.c})</small></button>`;}).join('')}</div></div><p class="mapping-answer">同一格：(${m.r}, ${m.c}) ⇄ 編號 ${m.k}；每行 n = ${cols} 格。</p><details data-details="formulas"><summary>看換算方法與代入步驟</summary><pre>${mappingBase===0?`k = r*n+c = ${m.r}*${cols}+${m.c} = ${m.k}\nr = k DIV n = ${Math.floor(m.k/cols)}\nc = k MOD n = ${m.k%cols}`:`k = (i-1)*n+j = (${m.r}-1)*${cols}+${m.c} = ${m.k}\ni = (k-1) DIV n+1 = ${Math.floor((m.k-1)/cols)+1}\nj = (k-1) MOD n+1 = ${(m.k-1)%cols+1}`}</pre><p>${mappingBase===0?'r、c、k 均由 0 開始。':'i、j、k 均由 1 開始；先減 1，完成換算後再加 1。'}</p></details></details>`;
}
function monitorView(s){
 return `<div class="live-monitor" aria-label="執行快照"><div class="mini-grid" style="--cols:${s.grid[0].length}">${s.grid.flatMap((row,r)=>row.map((value,c)=>`<span class="${equal(s.current,[r,c])?'active':''}" aria-label="快照行 ${r} 列 ${c}，${escape(value)}">${escape(value)}</span>`)).join('')}</div><div><b>第 ${cursor} 步${s.card>=0?` · 第 ${s.card+1} 張卡`:''}</b><p>${escape(s.log)}</p><small>${s.current?`來源 (${s.current.join(',')})`:''}${s.destination?` → 目的 (${s.destination.join(',')})`:''}</small><div class="monitor-vars">${Object.entries(s.vars).filter(([k])=>!['rows','cols'].includes(k)).map(([k,value])=>`<code>${escape(k)}=${escape(JSON.stringify(value))}</code>`).join(' ')}</div></div></div>`;
}
function render(){
 const mapPositions=new Map([...document.querySelectorAll('[data-map]')].map(el=>[el.dataset.map,el.getBoundingClientRect()]));
 const focused=document.activeElement,focusAction=focused?.getAttribute('data-action'),focusEdit=focused?.getAttribute('data-edit'),focusIndex=focused?.getAttribute('data-index');
 const oldScroll=$('.program')?.scrollTop||0,codeScroll=$('.code-view')?.scrollTop||0,mapScroll=$('.mapping-scroll')?.scrollLeft||0,focusId=focused?.id;
 const openDetails=new Map([...document.querySelectorAll('details[data-details]')].map(d=>[d.dataset.details,d.open]));
 persist();
 const m=mission(),s=state(),done=Object.keys(saved).filter(k=>saved[k]?.complete).length,stage=m.lesson;
 $('#app').innerHTML=`
 <a class="skip" href="#workspace">跳到指令工作區</a>
 <header class="topbar"><a class="brand" href="./" aria-label="機械人倉庫首頁"><span class="brand-mark">▦</span><span>機械人倉庫<small>LUI SIR’S ICT LAB</small></span></a><div class="header-center"><span>高中 ICT</span><b>2D ARRAY 任務</b></div><div class="header-right"><span class="badge-progress">${done}<span> / 18 任務章</span></span><button class="outline" data-action="drawer" aria-expanded="${drawer}">課程地圖 <span>☷</span></button></div></header>
 <div class="shell">
 <nav class="rail ${drawer?'open':''}" aria-label="課程地圖"><div class="rail-title">倉庫訓練計劃 <small>8 課 · 18 個任務</small></div>${LESSONS.map((name,l)=>`<section class="lesson"><h2><span>${String(l).padStart(2,'0')}</span> ${name}</h2>${MISSIONS.filter(x=>x.lesson===l).map(x=>`<button data-mission="${x.id}" class="mission-link ${id===x.id?'current':''}" ${id===x.id?'aria-current="step"':''}><span>${String(x.id).padStart(2,'0')}</span>${x.title}<span class="mission-status">${saved[x.id]?.complete?'✓':id===x.id?'●':''}</span></button>`).join('')}</section>`).join('')}<p class="rail-note">不限時 · 重試不扣分<br>紀錄只保存在這部裝置</p></nav>
 <main>
 <p class="save-note" role="status">${storageOK?'草稿已在此裝置儲存；重開會接續關卡，執行由第 0 步開始。':'這個瀏覽器暫時無法儲存；請保留本頁，避免遺失草稿。'}</p>
 <section class="mission-heading"><div><div class="eyebrow">${id===17?'連續任務':'每次任務重設資料'} <span>/</span> ${LESSONS[stage]}</div><h1><span>${String(id).padStart(2,'0')}</span> ${m.title}</h1><p>${viewBrief()}</p></div><div class="task-stamp">ARRAY<br><strong>${String(id).padStart(2,'0')}</strong></div></section>
 <div class="workflow" aria-label="遊玩流程"><span class="${!locked?'on':''}"><b>1</b> 預測</span><i></i><span class="${locked&&cursor===0?'on':''}"><b>2</b> 組合指令</span><i></i><span class="${cursor>0&&!result?.ok?'on':''}"><b>3</b> 觀察執行</span><i></i><span class="${result?.ok?'on':''}"><b>4</b> 解釋與修正</span></div>
 ${m.variants?`<div class="variants" role="group" aria-label="任務變式">${m.variants.map((name,index)=>`<button data-variant="${index}" class="${v===index?'selected':''}">${name} ${saved[id]?.variants?.includes(index)?'✓':''}</button>`).join('')}</div>`:''}
 ${id===0?`<div class="onboarding"><b>${selected.length<2&&!locked?'第一步：依序點選 (0,2) 與 (2,0)。':!locked?'第二步：填入兩格貨量，鎖定預測。':'第三步：補完指令，按執行一步，觀察讀取與輸出。'}</b><button class="text-button" data-action="advanced">${advanced?'收起編排工具':'顯示全部編排工具'}</button></div>`:''}
 ${mappingView()}
 <div class="workbench ${id===0&&!advanced&&!locked?'intro-simple':''}">
 <section class="panel warehouse"><div class="panel-heading"><h2>倉庫貨架 <small>Warehouse</small></h2><span class="dimensions">${grid().length} × ${grid()[0].length}</span></div><div class="warehouse-body"><div class="coordinate-note"><span>行 r ↓</span><span>列 c →</span></div>${table(s.grid)}<div class="legend"><span><i class="legend-square"></i> ${[13,14].includes(id)?'字母圖案':'每格數字 = 貨量'}</span><span><i class="legend-square dashed"></i> ${[13,14].includes(id)?'橙色 C = 追蹤點':id===9?'0 = 空格 · 橙框 = 起點':'0 = 空格'}</span></div><div class="selection-info">${s.current?`來源位置 <b>(${s.current.join(', ')})</b>${s.destination?` → 目的 <b>(${s.destination.join(', ')})</b>`:''}`:selected.length?`已選位置 <b>${selected.map(p=>'('+p.join(',')+')').join(' → ')}</b>`:'點選貨位，觀察行與列索引。'}</div>
 ${[7,13,14,16].includes(id)?`<div class="new-array"><h3>新表 <span>result</span></h3>${table(s.result,'result')}</div>`:''}
 <div class="prediction"><div class="micro-heading"><span>01 / 先預測</span>${locked?'<b>已鎖定</b>':'<b>執行前</b>'}</div><label for="prediction">${predPrompt()}</label><input id="prediction" value="${escape(prediction)}" placeholder="填入你的預測" ${locked?'disabled':''} autocomplete="off"><button class="${locked?'quiet':'dark'}" data-action="predict">${locked?'重新預測':'鎖定我的預測 →'}</button></div></div></section>
 <section class="panel workspace" id="workspace"><div class="panel-heading"><h2>指令工作區 <small>Program</small></h2><span class="card-count">${cards.length} 張卡</span></div><div class="workspace-toolbar"><label>編排方式 <select id="mode"><option value="scaffold" ${mode==='scaffold'?'selected':''}>補完關鍵步驟</option><option value="arrange" ${mode==='arrange'?'selected':''}>排卡練習</option><option value="blank" ${mode==='blank'?'selected':''}>自由編排</option></select></label><button class="text-button" data-action="restore">重設指令</button></div><p class="workspace-note">拖動卡片排序，或用 ↑ ↓；用 → 縮排，放入重複／如果內。</p>
 ${monitorView(s)}
 <div class="program" aria-label="指令卡列表">${cards.length?cards.map((c,index)=>`<article class="command ${s.card===index?'executing':''} ${['for','if'].includes(c.op)?'block-card':''}" style="--depth:${c.depth}" draggable="true" data-card="${index}"><div class="command-title"><span class="line-number">${index+1}</span><b>${CARD_TYPES[c.op].label}</b><small>${CARD_TYPES[c.op].english}</small><div class="command-actions">${[['up','↑','上移'],['down','↓','下移'],['out','←','減少縮排'],['in','→','增加縮排'],['remove','×','移除']].map(([action,text,label])=>`<button data-edit="${action}" data-index="${index}" aria-label="第 ${index+1} 張卡${label}" ${action==='up'&&index===0||action==='down'&&index===cards.length-1||action==='out'&&c.depth===0?'disabled':''}>${text}</button>`).join('')}</div></div><div class="command-fields">${Object.entries(c.args).map(([key,value])=>`<label>${FIELD_LABELS[key]}<input data-field="${key}" data-index="${index}" value="${escape(value)}" class="${value.includes('?')?'gap':''}" aria-label="第 ${index+1} 張卡 ${FIELD_LABELS[key]}" autocomplete="off" spellcheck="false"></label>`).join('')}</div></article>`).join(''):'<div class="empty-program">從下方選一張指令卡開始。<br><small>點一下加入；不需要拖拉也能完成。</small></div>'}</div>
 <details class="palette" data-details="palette"><summary>＋ 指令卡庫 <span>按一下加入</span></summary><div>${Object.entries(CARD_TYPES).filter(([,type])=>type.stage<=stage||cards.some(c=>CARD_TYPES[c.op]===type)).map(([op,type])=>`<button data-add="${op}" draggable="true" data-new="${op}">${type.label}</button>`).join('')}</div></details>
 <div class="execution-controls"><label class="speed-label">速度 <select id="speed"><option value="1000" ${speed===1000?'selected':''}>慢</option><option value="600" ${speed===600?'selected':''}>中</option><option value="250" ${speed===250?'selected':''}>快</option></select></label><button class="primary" data-action="step" ${cursor===frames.length-1&&frames.length>1?'disabled':''}>▷ 執行一步</button><button class="outline" data-action="run" ${cursor===frames.length-1&&frames.length>1?'disabled':''}>${timer?'Ⅱ 暫停':'▶ 連續執行'}</button><button class="icon-button" data-action="undo" aria-label="撤銷一步" ${cursor===0?'disabled':''}>↶</button><button class="icon-button" data-action="reset" aria-label="重設執行">↺</button></div>
 <details class="python" data-details="code"><summary>展開偽代碼／Python <span>含註解 · 同步追蹤</span></summary><label>程式顯示 <select id="code-format"><option value="pseudo" ${format==='pseudo'?'selected':''}>偽代碼</option><option value="python" ${format==='python'?'selected':''}>Python</option></select></label><pre class="code-view">${codeLines(cards,format).map(line=>`<span class="code-line ${line.index===s.card?'executing':''}">${escape(line.text)}</span>`).join('')}</pre><p>偽代碼採用遊戲的「終點不包括」慣例；題目若採用其他慣例，要調整界限。Python 是指令對照，return 需放在函數內；process／VISIT 是遊戲檢查標記。輸出位置會繼續執行，停止卡才結束任務。</p></details></section>
 <aside class="panel objective"><div class="panel-heading"><h2>任務工作單</h2><span>◎</span></div><div class="objective-body"><div class="micro-heading">完成條件</div><p class="goal">${viewGoal()}</p><ul class="criteria"><li>核對結果與處理規則</li><li>${[7,8,17].includes(id)?'同一方法通過兩組資料':'每次重試可修正指令'}</li><li>回答一條概念題</li></ul><button class="dark full" data-action="verify">核對結果 ✓</button>
 ${result?`<div class="feedback ${result.ok?'success':'failure'}" role="status"><b>${result.ok?'方法正確':'再檢查一下'}</b><p>${escape(result.message)}</p></div>`:''}
 ${result?.ok?`<div class="quiz"><h3>最後一問</h3><p>${m.question}</p>${m.choices.map((choice,i)=>`<button data-quiz="${i}" class="${quiz===i?(i===m.correct?'correct':'incorrect'):''}">${choice}</button>`).join('')}${quiz!==null?`<p role="status">${quiz===m.correct?'✓ 概念正確！'+(saved[id]?.complete?'已獲得任務章。':'完成其餘變式以取得任務章。'):escape(explanations[id])+' 可以立即重試。'}</p>`:''}${quiz===m.correct?`<div class="earned">${predictedCorrect?'✦ 預測準確 ':''}${[7,8,17].includes(id)?'✦ 方法可重用':''}${mode==='blank'?' ✦ 自行編排':''}</div><p>${escape(explanations[id])}</p><div class="next-actions">${(m.variants?.length||1)>1?'<button data-action="next-variant">再試另一組資料 →</button>':''}${id<17?'<button data-action="next">下一個任務 →</button>':'<p>已完成最後一項任務！可在課程地圖回看學過的方法。</p>'}${mode!=='blank'?'<button data-action="independent">從空白自行組合</button>':''}</div>`:''}</div>`:''}
 <div class="hints"><button class="text-button" data-action="hint">${hints===0?'需要一點提示？':`提示 ${Math.min(hints,3)} / 3 · 再看一步`}</button>${hints>0?`<p>${hintText()}</p>`:''}</div><div class="reference"><h3>控制員筆記</h3><p><code>grid[r][c]</code><br>先行，後列。索引從 0 開始。</p><p><code>rows</code> 行數 · <code>cols</code> 列數<br>迴圈的終點不包括在內。</p><p><code>==</code> 相等 · <code>and</code> 同時成立<br>讀寫前先確認索引有效。</p></div>${id===10?'<button class="outline full" data-action="overwrite">觀看直接覆寫的錯誤</button>':''}</div></aside>
 </div>
 <section class="trace panel"><div class="panel-heading"><h2>執行紀錄 <small>Trace</small></h2><span>步驟 ${cursor} / ${Math.max(0,frames.length-1)}</span></div><div class="trace-body"><div class="current-step ${s.error?'trace-error':''}" role="status"><span>目前指令</span><b>${escape(s.log)}</b></div><div class="variables"><span>變數</span>${Object.entries(s.vars).map(([k,value])=>`<code>${escape(k)} <b>${escape(JSON.stringify(value))}</b></code>`).join('')}</div><div class="outputs"><span>輸出</span><code>${s.outputs.length?escape(s.outputs.map(x=>Array.isArray(x)?'('+x.join(', ')+')':x).join(' · ')):'—'}</code></div><details data-details="trace"><summary>回看已執行的 ${cursor} 步</summary><ol>${frames.slice(1,cursor+1).map((f,i)=>`<li><button data-frame="${i+1}"><span>${i+1}</span>${escape(f.log)}</button></li>`).join('')}</ol></details></div></section>
 <footer><span>Lui Sir · 高中 ICT · 二維陣列</span><span>無帳戶 · 無計時 · 裝置本機紀錄</span><a href="./LICENSE">MIT © 2026 Aaron Lui</a></footer>
 </main></div>`;
 bind();
 document.querySelectorAll('details[data-details]').forEach(d=>{if(openDetails.has(d.dataset.details))d.open=openDetails.get(d.dataset.details);});
 const map=$('.mapping-scroll');if(map){map.scrollLeft=mapScroll;const point=map.querySelector('.selected');if(unfolded&&point){const left=point.offsetLeft;if(left<map.scrollLeft||left+point.offsetWidth>map.scrollLeft+map.clientWidth)map.scrollLeft=Math.max(0,left-map.clientWidth/2);}}
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelectorAll('[data-map]').forEach(el=>{
  const before=mapPositions.get(el.dataset.map),after=el.getBoundingClientRect();
  if(before?.width && after.width && (before.x!==after.x || before.y!==after.y))el.animate([{transform:`translate(${before.x-after.x}px,${before.y-after.y}px)`},{transform:'translate(0,0)'}],{duration:600,easing:'ease-in-out'});
 });
 const program=$('.program');program.scrollTop=oldScroll;
 const running=program.querySelector('.executing');
 if(running&&cursor>0){const top=running.offsetTop-program.offsetTop;if(top<program.scrollTop||top+running.offsetHeight>program.scrollTop+program.clientHeight)program.scrollTop=Math.max(0,top-program.clientHeight/3);}
 const code=$('.code-view');code.scrollTop=codeScroll;const currentCode=code.querySelector('.executing');if(currentCode){const top=currentCode.offsetTop-code.offsetTop;if(top<code.scrollTop||top+currentCode.offsetHeight>code.scrollTop+code.clientHeight)code.scrollTop=Math.max(0,top-code.clientHeight/2);}
 let restore=null;
 if(focusAction)restore=document.querySelector(`[data-action="${focusAction}"]`);
 else if(focusEdit)restore=document.querySelector(`[data-edit="${focusEdit}"][data-index="${focusIndex}"]`);
 else if(focusId)restore=document.getElementById(focusId);
 if(restore&&!restore.disabled)restore.focus({preventScroll:true});
}
function hintText(){return escape(hint(id,v,hints,mode));}
function bind(){
 document.querySelectorAll('[data-mission]').forEach(b=>b.onclick=()=>load(Number(b.dataset.mission)));
 document.querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>load(id,Number(b.dataset.variant)));
 $('#prediction').oninput=e=>{prediction=e.target.value;persist();};
 $('#speed').onchange=e=>{stop();speed=Number(e.target.value);render();};
 $('#code-format').onchange=e=>{format=e.target.value;render();};
 if($('#mapping-base'))$('#mapping-base').onchange=e=>{mappingBase=Number(e.target.value);render();};
 document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{mappingPosition=Number(b.dataset.map);render();});
 $('#mode').onchange=e=>{mode=e.target.value;cards=startingCards(id,v,mode);invalidate();render();};
 document.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>{if(b.dataset.table!=='grid')return;const p=b.dataset.cell.split(',').map(Number);if(!locked){if(id===0){selected=selected.length>=2?[p]:[...selected,p];}else selected=[p];}state().current=p;render();});
 document.querySelectorAll('[data-field]').forEach(input=>input.oninput=e=>{const index=input.dataset.index,field=input.dataset.field,start=e.target.selectionStart,end=e.target.selectionEnd;cards[Number(index)].args[field]=e.target.value;invalidate();render();const fresh=document.querySelector(`[data-field="${field}"][data-index="${index}"]`);fresh.focus({preventScroll:true});fresh.setSelectionRange(start,end);});
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.index),a=b.dataset.edit;if(a==='remove')cards.splice(i,1);if(a==='in')cards[i].depth=Math.min(8,cards[i].depth+1);if(a==='out')cards[i].depth=Math.max(0,cards[i].depth-1);if(a==='up'&&i>0)[cards[i-1],cards[i]]=[cards[i],cards[i-1]];if(a==='down'&&i<cards.length-1)[cards[i+1],cards[i]]=[cards[i],cards[i+1]];invalidate();render();});
 document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{cards.push(card(b.dataset.add,clone(CARD_TYPES[b.dataset.add].args)));invalidate();render();});
 document.querySelectorAll('[draggable]').forEach(el=>el.ondragstart=e=>{if(e.target.tagName==='INPUT'){e.preventDefault();return;}drag=el.dataset.new?{op:el.dataset.new}:{index:Number(el.dataset.card)};e.dataTransfer.setData('text/plain','instruction');});
 $('.program').ondragover=e=>e.preventDefault();
 $('.program').ondrop=e=>{e.preventDefault();if(!drag)return;const target=e.target.closest('[data-card]');let at=target?Number(target.dataset.card):cards.length;if(drag.op)cards.splice(at,0,card(drag.op,clone(CARD_TYPES[drag.op].args)));else{const [c]=cards.splice(drag.index,1);if(drag.index<at)at--;cards.splice(at,0,c);}drag=null;invalidate();render();};
 document.querySelectorAll('[data-frame]').forEach(b=>b.onclick=()=>{stop();cursor=Number(b.dataset.frame);result=null;render();});
 document.querySelectorAll('[data-quiz]').forEach(b=>b.onclick=()=>{quiz=Number(b.dataset.quiz);if(quiz===mission().correct){const previous=saved[id]||{variants:[]};const variants=[...new Set([...(previous.variants||[]),v])];if([7,8,17].includes(id))variants.push(0,1);saved[id]={variants:[...new Set(variants)],complete:new Set(variants).size>=(mission().variants?.length||1),prediction:predictedCorrect||previous.prediction};save();}render();});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{
  switch(b.dataset.action){
   case 'drawer':drawer=!drawer;render();break;
   case 'advanced':advanced=!advanced;render();break;
   case 'unfold':unfolded=!unfolded;render();break;
   case 'map-back':mappingPosition=Math.max(0,mappingPosition-1);render();break;
   case 'map-next':mappingPosition=Math.min(grid().flat().length-1,mappingPosition+1);render();break;
   case 'next':if(id<17)load(id+1);break;
   case 'next-variant':load(id,(v+1)%(mission().variants?.length||1));break;
   case 'independent':mode='blank';cards=[];hints=0;invalidate();render();break;
   case 'predict':if(locked){locked=false;selected=[];invalidate();}else if(prediction.trim()){locked=true;predictedCorrect=normalize(prediction)===normalize(predAnswer());result=null;}else result={ok:false,message:'請先填入預測；答錯也可以執行和修正。'};render();break;
   case 'step':step();break;case 'run':execute();break;case 'verify':verify();break;
   case 'undo':stop();cursor=Math.max(0,cursor-1);result=null;quiz=null;render();break;
   case 'reset':invalidate();render();break;
   case 'restore':cards=startingCards(id,v,mode);invalidate();render();break;
   case 'hint':hints=Math.min(3,hints+1);render();break;
   case 'overwrite':stop();frames=run(grid(),[card('write',{r:'0',c:'0',value:'grid[1][2]'}),card('write',{r:'1',c:'2',value:'grid[0][0]'})]);cursor=frames.length-1;result={ok:false,message:'示範：2 已被 5 覆寫，最後兩格都是 5。按「重設執行」，使用 temp 保存原值再試。'};render();break;
  }
 });
}
id=progress.id;v=progress.v;restoreDraft();invalidate();
render();
