import test from 'node:test';
import assert from 'node:assert/strict';
import { run, card } from '../src/engine.mjs';
import { dataFor, solution } from '../src/missions.mjs';
import { stepEffect } from '../src/game-effects.mjs';

test('scan and output effects reflect new events, not retained cursor state',()=>{
  const frames=run(dataFor(0),solution(0));
  assert.equal(stepEffect(frames[0],frames[1]).kind,'read');
  assert.deepEqual(stepEffect(frames[1],frames[2]),{kind:'output',label:'輸出結果',value:4});
  assert.equal(stepEffect(frames[2],frames[2]),null);
  assert.equal(stepEffect(frames[2],frames[1]),null,'undo does not claim a new output');
  const scan=run(dataFor(3),solution(3));
  assert.equal(stepEffect(scan[0],scan[1]),null,'a loop update is not a read');
  assert.deepEqual(stepEffect(scan[2],scan[3]).position,[0,0]);
  assert.equal(stepEffect(scan[2],scan[3]).kind,'scan');
});
test('write and copy effects preserve source/destination values without mutating snapshots',()=>{
  const frames=run(dataFor(14),solution(14)),before=structuredClone(frames);
  const effect=stepEffect(frames[7],frames[8]);
  assert.deepEqual([effect.kind,effect.dest,effect.r,effect.c,effect.old,effect.value],['copy','result',2,0,0,'C']);
  assert.deepEqual(frames,before);
  const write=run(dataFor(2),solution(2));
  assert.equal(stepEffect(write[0],write[1]).kind,'write');
  assert.equal(stepEffect(write[0],write[1]).value,5);
});
test('invalid reads show an error effect rather than moving to an invalid position',()=>{
  const frames=run(dataFor(0),[card('read',{r:'-1',c:'0',name:'value'})]);
  assert.equal(stepEffect(frames[0],frames[1]).kind,'error');
  assert.equal(stepEffect(frames[0],frames[1]).position,undefined);
});
