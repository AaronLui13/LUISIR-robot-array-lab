import test from 'node:test';
import assert from 'node:assert/strict';
import {expression,initial,run,codeLines,pythonExpression} from '../src/engine.mjs';
import {solution,dataFor,assess} from '../src/missions.mjs';

test('displayed arithmetic and comparison notation is accepted without changing precedence',()=>{
 const s=initial(dataFor(0));
 for(const [input,expected] of [['9 DIV 4',2],['9 MOD 4',1],['-9 DIV 4',-3],['-9 MOD 4',3],['2+9 DIV 4*3',8],['grid[0,2] = 4',true],['0 ≤ 2 AND 2 < 3',true],['1 ≠ 2 OR 2 ≥ 3',true]])assert.equal(expression(input,s),expected,input);
 assert.equal(expression('0 = 1 AND grid[-1,0] = 2',s),false);
 assert.throws(()=>expression('2 DIV 0',s),/不能除以 0/);
 assert.equal(pythonExpression('myDIV + index_mod'), 'myDIV + index_mod');
 assert.equal(pythonExpression('x >= 1 and x != 2 and x == 3'),'x >= 1 and x != 2 and x == 3');
});
test('index lesson accepts DIV/MOD drafts and Python display translates them back',()=>{
 const cards=solution(8);cards[1].args.value='index DIV cols';cards[2].args.value='index MOD cols';
 for(const variant of [0,1]){
  const grid=dataFor(8,variant),end=run(grid,cards).at(-1);
  assert.equal(assess(8,variant,grid,end,cards).ok,true);
 }
 const python=codeLines(cards,'python').map(l=>l.text).join('\n');
 assert.match(python,/r = index \/\/ cols/);assert.match(python,/c = index % cols/);
});
test('pseudocode comparisons copied into cards preserve search behavior',()=>{
 const cards=solution(5);cards[4].args.test='grid[r,c] = 3';
 const grid=dataFor(5),end=run(grid,cards).at(-1);
 assert.equal(assess(5,0,grid,end,cards).ok,true);
 const line=codeLines(cards,'python').find(l=>l.index===4).text;
 assert.match(line,/if grid\[r\]\[c\] == 3:/);
});
