import test from 'node:test';
import assert from 'node:assert/strict';
import { guidedFields, fieldChoices, firstIncomplete } from '../src/student-guidance.mjs';
import { blockChoices, cardsToBlocks } from '../src/blocks-model.mjs';
import { defineLabBlocks, toolbox } from '../src/blockly-editor.mjs';
import { starter, dataFor, solution, assess } from '../src/missions.mjs';
import { run } from '../src/engine.mjs';
import B from 'blockly/core';

test('short editors keep all early mission rules and accept wrong numerical choices',()=>{
 for(let id=0;id<=2;id++){
  const cards=starter(id),fields=guidedFields(id,0,'scaffold',cards);
  assert.equal(fields.length,id===1?2:1);
  for(const {index,key} of fields){
   const choices=fieldChoices(key,dataFor(id));
   assert.ok(choices.includes(solution(id)[index].args[key]));
   cards[index].args[key]=choices.find(v=>v!==solution(id)[index].args[key]);
  }
  assert.ok(guidedFields(id,0,'scaffold',cards));
  assert.equal(assess(id,0,dataFor(id),run(dataFor(id),cards).at(-1),cards).ok,false);
  for(const {index,key} of fields)cards[index].args[key]=solution(id)[index].args[key];
  assert.equal(assess(id,0,dataFor(id),run(dataFor(id),cards).at(-1),cards).ok,true);
 }
});
test('custom drafts and loose blocks remain in the complete editor',()=>{
 assert.equal(guidedFields(3,0,'scaffold',starter(3)),null);
 assert.equal(guidedFields(0,0,'blank',starter(0)),null);
 const changed=starter(0);changed[0].args.r='rows-1';
 assert.equal(guidedFields(0,0,'scaffold',changed),null);
 changed[0].args.r='27';assert.equal(guidedFields(0,0,'scaffold',changed),null);
 const edited=starter(0);edited[1].args.value='5';
 assert.equal(guidedFields(0,0,'scaffold',edited),null);
 const snapshot=cardsToBlocks(starter(0));snapshot.blocks.blocks.push({type:'lab_atom'});
 assert.equal(guidedFields(0,0,'scaffold',starter(0),{snapshot}),null);
});
test('missing-field feedback identifies the first unfinished instruction and field',()=>{
 const cards=starter(1);
 assert.deepEqual(firstIncomplete(cards),{index:4,key:'r',message:'第 5 張「讀取一格」還未完成「行索引 r」。請先填好標示的欄位。'});
 cards[4].args.r='1';assert.equal(firstIncomplete(cards).key,'c');
 cards[4].args.c=' ';assert.equal(firstIncomplete(cards).key,'c');
 cards[4].args.c='3';assert.equal(firstIncomplete(cards),null);
});
test('Blockly choices follow the lesson while preserving values already in custom drafts',()=>{
 const choices=blockChoices(starter(0),{stage:0,rows:3,cols:4});
 assert.deepEqual(choices.values,['?','0','1','2','3','4','5','value']);
 for(const v of ['rows','temp','best'])assert.ok(!choices.values.includes(v));
 const palette=toolbox(0,starter(0),choices);
 assert.equal(palette.contents.find(c=>c.name==='陣列元素').contents[0].inputs.R.shadow.fields.VALUE,'0');
 const custom=starter(0);custom[0].args.r='special+27';
 const extra=blockChoices(custom,{stage:0});assert.ok(extra.values.includes('special'));assert.ok(extra.values.includes('27'));
 for(const id of [0,1,2,7,17]){
  const cards=solution(id),choices=blockChoices(cards,{stage:id===0?0:id<3?1:id===7?4:9});
  defineLabBlocks(B,choices);const ws=new B.Workspace();
  try{B.serialization.workspaces.load(cardsToBlocks(cards),ws);assert.equal(ws.getAllBlocks(false).filter(b=>b.type==='lab_atom'&&b.getFieldValue('VALUE')==='?').length,0);}
  finally{ws.dispose();}
 }
});
