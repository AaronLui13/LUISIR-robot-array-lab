import test from 'node:test';
import assert from 'node:assert/strict';
import { predictionIssue, nextTask } from '../src/flow.mjs';

test('intro requires both selected addresses in order, not a correct guess',()=>{
  assert.ok(predictionIssue(0,[[2,0],[0,2]],'4,0'));
  assert.ok(predictionIssue(0,[[0,2]],'4,0'));
  assert.ok(predictionIssue(0,[[0,2],[2,0]],'   '));
  assert.equal(predictionIssue(0,[[0,2],[2,0]],'wrong guess'),'');
});
test('write lesson requires its target; other lessons allow any nonempty prediction',()=>{
  assert.ok(predictionIssue(2,[[0,2]],'5'));
  assert.equal(predictionIssue(2,[[1,2]],'5'),'');
  assert.equal(predictionIssue(7,[],'11'),'');
});
test('next step fills missing variants, advances completed lessons, and ends at 17',()=>{
  assert.deepEqual(nextTask(14,2,{variants:[1],complete:false}),{id:14,v:0});
  assert.deepEqual(nextTask(14,2,{variants:[0,1],complete:true}),{id:15,v:0});
  assert.deepEqual(nextTask(0,1,{variants:[0],complete:true}),{id:1,v:0});
  assert.deepEqual(nextTask(17,2,{variants:[0],complete:false}),{id:17,v:1});
  assert.equal(nextTask(17,2,{variants:[0,1],complete:true}),null);
});
