import test from 'node:test';
import assert from 'node:assert/strict';
import { expression, initial, run, card, equal } from '../src/engine.mjs';
import { MISSIONS, BASE, dataFor, solution, starter, expected, validate, assess } from '../src/missions.mjs';
for(const m of MISSIONS)for(let v=0;v<(m.variants?.length||1);v++)test(`${m.id} ${m.title} / variant ${v}: correct general program satisfies independent oracle`,()=>{
 const grid=dataFor(m.id,v),cards=solution(m.id,v),frames=run(grid,cards),last=frames.at(-1);
 assert.equal(last.error,null);assert.deepEqual(grid,dataFor(m.id,v),'source input is immutable');
 assert.equal(validate(m.id,v,grid,last,cards).ok,true,JSON.stringify({feedback:validate(m.id,v,grid,last,cards),last,expected:expected(m.id,v,grid)}));
 assert.ok(starter(m.id,v).some(c=>Object.values(c.args).includes('?')),'scaffold must contain a decision');
});
test('expressions preserve precedence, integer division, comparisons, and reject code',()=>{
 const s=initial(BASE);s.vars.r=2;s.vars.c=1;
 assert.equal(expression('r * cols + c',s),9);assert.equal(expression('9 // cols',s),2);assert.equal(expression('9 % cols',s),1);
 assert.equal(expression('r >= 0 and r < rows and c < cols',s),true);
 for(const bad of ['alert(1)','window.location','grid[-1][0]','1 // 0','missing+1','grid[0][4]'])assert.throws(()=>expression(bad,s));
});
test('missing indentation, empty loops, and runaway loops produce bounded meaningful failures',()=>{
 assert.match(run(BASE,[card('output',{value:'0'},2)]).at(-1).error,/縮排/);
 assert.match(run(BASE,[card('for',{name:'r',from:'0',to:'3',step:'1'})]).at(-1).error,/沒有指令/);
 assert.match(run(BASE,[card('for',{name:'r',from:'0',to:'999999',step:'1'}),card('set',{name:'x',value:'r'},1)]).at(-1).error,/4000/);
});
test('snapshots can undo all mutations without sharing arrays or variables',()=>{
 const frames=run(BASE,solution(2));assert.equal(frames[0].grid[1][2],0);assert.equal(frames[1].grid[1][2],5);
 frames.at(-1).grid[1][2]=9;assert.equal(frames[1].grid[1][2],5);assert.equal(BASE[1][2],0);
});
test('search for missing target starts fresh after an earlier successful search',()=>{
 assert.deepEqual(run(BASE,solution(5,0)).at(-1).outputs,[[1,1]]);
 assert.deepEqual(run(BASE,solution(5,1)).at(-1).outputs,['找不到']);
 assert.deepEqual(run(BASE,solution(6,1)).at(-1).outputs,[[0,0],[1,3],[2,1]]);
});
test('wrong counter initialization fails and direct overwrite loses cargo',()=>{
 const cards=solution(4);cards[0].depth=2;assert.equal(validate(4,0,BASE,run(BASE,cards).at(-1),cards).ok,false);
 const g=dataFor(10),bad=[card('write',{r:'0',c:'0',value:'grid[1][2]'}),card('write',{r:'1',c:'2',value:'grid[0][0]'})];
 const s=run(g,bad).at(-1);assert.equal(s.grid[0][0],5);assert.equal(s.grid[1][2],5);assert.equal(validate(10,0,g,s,bad).ok,false);
});
test('outward movement and occupied destination never mutate data',()=>{
 for(const v of [1,2]){const g=dataFor(9,v),s=run(g,solution(9,v)).at(-1);assert.deepEqual(s.grid,g);assert.deepEqual(s.writes,[]);assert.equal(s.error,null);}
});
test('index conversions use dimensions and transfer to five-column shelves',()=>{
 for(const id of [7,8]){const g=dataFor(id,1),p=solution(id,0);assert.equal(validate(id,1,g,run(g,p).at(-1),p).ok,true);}
});
test('row/column/snake traversal has correct order and no missing or repeated positions',()=>{
 const row=run(BASE,solution(3)).at(-1).visited,col=run(BASE,solution(11)).at(-1).visited,snake=run(BASE,solution(12)).at(-1).visited;
 assert.deepEqual(row.slice(0,4),[[0,0],[0,1],[0,2],[0,3]]);assert.deepEqual(col.slice(0,4),[[0,0],[1,0],[2,0],[0,1]]);assert.deepEqual(snake.slice(4,8),[[1,3],[1,2],[1,1],[1,0]]);
 for(const list of [row,col,snake])assert.equal(new Set(list.map(JSON.stringify)).size,12);
});
test('non-square transformations retain orange C and preserve input',()=>{
 for(const [id,v,pos] of [[13,0,[0,0]],[13,1,[1,2]],[14,0,[2,0]],[14,1,[2,1]]]){
 const g=dataFor(id),s=run(g,solution(id,v)).at(-1);assert.equal(s.result[pos[0]][pos[1]],'C');assert.deepEqual(s.grid,g);assert.equal(new Set(s.result.flat()).size,6);
 }
});
test('region sum is 10 and block aggregation distinguishes cropped and padded policies',()=>{
 assert.deepEqual(run(BASE,solution(15)).at(-1).outputs,[10]);
 const cropped=run(dataFor(16,2),solution(16,2)).at(-1),padded=run(dataFor(16,3),solution(16,3)).at(-1);
 assert.deepEqual(cropped.result,[[6,7]]);assert.deepEqual(padded.result,[[6,7,5],[2,5,1]]);assert.equal(cropped.visited.length,8);assert.equal(padded.visited.length,15);
});
test('final program is reused across unseen shelves, uses updated values and row-major ties',()=>{
 const p=solution(17);
 for(const g of [dataFor(17,0),dataFor(17,1),[[0,0,0],[0,0,0]],[[1,1,1],[1,0,1],[1,1,1]]]){
 const s=run(g,p).at(-1),e=expected(17,0,g);assert.deepEqual(s.outputs,e.outputs);assert.deepEqual(s.grid,e.grid);
 }
 const tie=run([[0,0,0],[0,0,0]],p).at(-1);assert.deepEqual(tie.outputs.slice(-2),[6,[0,0]]);
});
test('source data is reset per task',()=>{const a=dataFor(2);a[1][2]=5;assert.equal(dataFor(2)[1][2],0);assert.equal(equal(a,dataFor(2)),false);});

test('all mission reference programs also pass transfer assessment',()=>{
 for(const m of MISSIONS)for(let v=0;v<(m.variants?.length||1);v++){
  const g=dataFor(m.id,v),p=solution(m.id,v),check=assess(m.id,v,g,run(g,p).at(-1),p);
  assert.equal(check.ok,true,`${m.id}/${v}: ${check.message}`);
 }
});
test('short-circuiting avoids invalid array reads and respects arithmetic grouping',()=>{
 const s=initial(BASE);s.vars.nr=-1;
 assert.equal(expression('nr >= 0 and grid[nr][0] == 0',s),false);
 assert.equal(expression('nr < 0 or grid[nr][0] == 0',s),true);
 assert.equal(expression('(2+3)*4',s),20);
});
test('transfer tests reject hardcoded counts and >= tie updates',()=>{
 const p=solution(4);p[p.length-1].args.value='4';const g=dataFor(4);
 assert.equal(validate(4,0,g,run(g,p).at(-1),p).ok,true);
 assert.equal(assess(4,0,g,run(g,p).at(-1),p).ok,false);
 const q=solution(17);q.find(c=>c.args.test==='total > best').args.test='total >= best';
 const a=dataFor(17);assert.equal(assess(17,0,a,run(a,q).at(-1),q).ok,false);
});
