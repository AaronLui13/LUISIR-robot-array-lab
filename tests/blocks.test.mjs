import test from 'node:test';
import assert from 'node:assert/strict';
import B from 'blockly/core';
import { defineLabBlocks } from '../src/blockly-editor.mjs';
import { cardsToBlocks,blocksToCards,blockChoices,workspaceSnapshot,expressionBlock,blockExpression } from '../src/blocks-model.mjs';
import { MISSIONS,solution,starter,dataFor,assess } from '../src/missions.mjs';
import { run,expression,initial } from '../src/engine.mjs';
import { readProgress,writeProgress } from '../src/progress.mjs';
function workspace(cards){defineLabBlocks(B,blockChoices(cards));const ws=new B.Workspace();B.serialization.workspaces.load(cardsToBlocks(cards),ws);return ws;}
test('every mission and variant remains correct through real Blockly serialization',()=>{
 for(const m of MISSIONS)for(let v=0;v<(m.variants?.length||1);v++){
  const ws=workspace(solution(m.id,v));
  try{const {cards,issue}=blocksToCards(ws);assert.equal(issue,'');const grid=dataFor(m.id,v);assert.equal(assess(m.id,v,grid,run(grid,cards).at(-1),cards).ok,true,`mission ${m.id}:${v}`);
   const saved=B.serialization.workspaces.save(ws);B.serialization.workspaces.load(saved,ws);assert.deepEqual(blocksToCards(ws).cards,cards);
  }finally{ws.dispose();}
 }
});
test('unfinished starter gaps survive switches and dropdown selection edits the program',()=>{
 const ws=workspace(starter(1));
 try{const gap=ws.getAllBlocks(false).find(b=>b.type==='lab_atom'&&b.getFieldValue('VALUE')==='?');assert.ok(gap);assert.ok(blocksToCards(ws).cards.some(c=>Object.values(c.args).includes('?')));gap.setFieldValue('1','VALUE');assert.ok(blocksToCards(ws).cards.some(c=>c.args.r==='1'));}finally{ws.dispose();}
});
test('detached blocks are not silently executed or lost when saving drafts',()=>{
 const ws=workspace(solution(8,0));
 try{
  ws.newBlock('lab_atom');assert.match(blocksToCards(ws).issue,/未連接/);
  const draft={cards:blocksToCards(ws).cards,mode:'scaffold',prediction:'2,1',locked:true,selected:[],blockDraft:{signature:JSON.stringify(blocksToCards(ws).cards),snapshot:B.serialization.workspaces.save(ws)}};
  let json;const storage={setItem:(_k,v)=>json=v,getItem:()=>json};writeProgress(storage,{version:2,id:8,v:0,drafts:{'8:0':draft}});
  const restored=readProgress(storage);assert.deepEqual(restored.drafts['8:0'].blockDraft,JSON.parse(JSON.stringify(draft.blockDraft)));
  B.serialization.workspaces.load(restored.drafts['8:0'].blockDraft.snapshot,ws);assert.match(blocksToCards(ws).issue,/未連接/);
 }finally{ws.dispose();}
});
test('operator precedence, short circuiting, nested indexing and raw invalid text survive conversion',()=>{
 const state=initial([[2,0,4],[1,3,2]]);state.vars={...state.vars,r:1,c:0,index:5};
 for(const source of ['index DIV cols','index MOD cols','grid[r,c] = 1','2+3*4','(2+3)*4','0 <= r < rows','r < 0 AND grid[-1][0] = 0','grid[grid[0][1]][2]','floor(-3//2)','bad @ text','']){
  defineLabBlocks(B,blockChoices([{args:{value:source}}]));const ws=new B.Workspace();
  try{const block=B.serialization.blocks.append(expressionBlock(source),ws),out=blockExpression(block);
   if(['bad @ text',''].includes(source))assert.equal(out,source);
   else assert.equal(expression(out,structuredClone(state)),expression(source,structuredClone(state)),source);
  }finally{ws.dispose();}
 }
});
test('invalid indentation requires correction instead of losing statements',()=>{
 assert.throws(()=>cardsToBlocks([{op:'output',args:{value:'1'},depth:1}]),/縮排/);
});

test('typing edits keep disconnected blocks available on return to Blockly',()=>{
 const cards=solution(8,0),ws=workspace(cards);
 try{ws.newBlock('lab_atom');const draft={signature:JSON.stringify(cards),snapshot:B.serialization.workspaces.save(ws)};
 const changed=structuredClone(cards);changed[0].args.value='8';
 B.serialization.workspaces.load(workspaceSnapshot(changed,draft),ws);
 assert.equal(blocksToCards(ws).cards[0].args.value,'8');assert.match(blocksToCards(ws).issue,/未連接/);
 }finally{ws.dispose();}
});
