import test from 'node:test';
import assert from 'node:assert/strict';
import { expression, initial, run, codeLines } from '../src/engine.mjs';
import { dataFor, solution, starter } from '../src/missions.mjs';
import { predictionAnswer, indexGoal, indexMapping, startingCards } from '../src/learning.mjs';
import { readProgress, writeProgress } from '../src/progress.mjs';

test('Python comparison chains reject both boundaries and skip unsafe reads',()=>{
  const s=initial(dataFor(9,2));
  for(const nr of [-1,0,2,3]) {s.vars.nr=nr;assert.equal(expression('0 <= nr < rows',s),nr>=0&&nr<3);}
  s.vars.nr=-1;
  assert.equal(expression('0 <= nr < rows and grid[nr][0] == 0',s),false);
  assert.equal(expression('2 < 1 < grid[-1][0]',s),false);
  assert.equal(expression('0 < grid[1][0] < 9',s),true);
  assert.deepEqual(s.reads,[[1,0]],'middle operand is evaluated only once');
  assert.equal(expression('(2 < 1) < 3',s),true,'parentheses preserve explicit grouping');
  assert.equal(expression('1 < 2 == 2 <= 3',s),true);
  const p=solution(9,2);p[4].args.test='0 <= nr < rows and 0 <= nc < cols';
  const end=run(dataFor(9,2),p).at(-1);
  assert.equal(end.error,null);assert.deepEqual(end.writes,[]);
});
test('division and remainder follow Python for either sign and guard zero',()=>{
  const s=initial(dataFor(0));
  for(const [a,b,q,r] of [[-1,4,-1,3],[5,-3,-2,-1],[-5,-3,1,-2],[8,4,2,0]]) {
    assert.equal(expression(`${a} // ${b}`,s),q);assert.equal(expression(`${a} % ${b}`,s),r);
  }
  assert.throws(()=>expression('1 % 0',s),/不能除以 0/);
});
test('index prediction, range and both indexing conventions follow the data dimensions',()=>{
  assert.equal(predictionAnswer(7,0),'9');assert.equal(predictionAnswer(7,1),'11');
  assert.match(indexGoal(7,1),/0–14/);
  assert.equal(predictionAnswer(8,1),'1,4');assert.equal(predictionAnswer(17,1),'4');
  for(const base of [0,1])for(const cols of [4,5])for(let k=0;k<3*cols;k++) {
    const m=indexMapping(3,cols,base,k);
    assert.equal((m.r-base)*cols+m.c,m.k);
    assert.equal(Math.floor((m.k-base)/cols)+base,m.r);
    assert.equal((m.k-base)%cols+base,m.c);
  }
});
test('later scaffolds require formulas and conditions; independent mode starts empty',()=>{
  assert.equal(starter(7)[3].args.value,'?');
  assert.equal(starter(8)[1].args.value,'?');assert.equal(starter(8)[2].args.value,'?');
  assert.ok(starter(17).filter(c=>Object.values(c.args).includes('?')).length>=5);
  assert.deepEqual(startingCards(17,0,'blank'),[]);
  assert.deepEqual(startingCards(3,0,'arrange').reverse(),solution(3));
});
test('pseudocode closes nested blocks and maps executable lines to cards',()=>{
  const lines=codeLines(solution(5),'pseudo');
  assert.equal(lines.filter(l=>l.text.trim()==='結束循環').length,2);
  assert.equal(lines.filter(l=>l.text.trim()==='結束如果').length,2);
  assert.deepEqual(lines.filter(l=>l.index!==null).map(l=>l.index),solution(5).map((_,i)=>i));
  assert.match(codeLines(solution(8),'pseudo').map(l=>l.text).join('\n'),/DIV cols/);
  const positionLine=codeLines(solution(8),'python').find(l=>l.index===3).text;
  assert.match(positionLine,/print\(\(r, c\)\)/);assert.match(positionLine,/不是 return/);
});
test('drafts restore per mission and reject corrupted or obsolete storage safely',()=>{
  let text=null;const storage={getItem:()=>text,setItem:(_key,value)=>{text=value;}};
  const draft={mode:'scaffold',cards:starter(7,1),prediction:'11',locked:true,selected:[]};
  const state={version:2,id:7,v:1,drafts:{'7:1':draft}};
  assert.equal(writeProgress(storage,state),true);assert.deepEqual(readProgress(storage),state);
  text='{broken';assert.equal(readProgress(storage),null);
  text=JSON.stringify({...state,version:1});assert.equal(readProgress(storage),null);
  text=JSON.stringify({...state,id:99});assert.equal(readProgress(storage),null);
  text=JSON.stringify({...state,drafts:{'7:1':{...draft,cards:[{op:'unknown',args:{},depth:0}]}}});
  assert.deepEqual(readProgress(storage).drafts,{});
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
  assert.equal(readProgress(blocked),null);assert.equal(writeProgress(blocked,state),false);
});
