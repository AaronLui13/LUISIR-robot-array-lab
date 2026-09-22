import { pythonExpression } from './engine.mjs';
import { CARD_TYPES } from './missions.mjs';

const priorities={or:1,and:2,'==':3,'!=':3,'<':3,'>':3,'<=':3,'>=':3,'+':4,'-':4,'*':5,'//':5,'%':5};
const valueInput = block => block.type==='lab_atom'?{shadow:block}:{block};
const atom = value => ({type:'lab_atom',fields:{VALUE:String(value)}});
// Parse only the interpreter's expression language. Unrecognised/incomplete text
// stays in a text block rather than being silently repaired or discarded.
export function expressionBlock(source) {
 const original=String(source), input=pythonExpression(original);
 const tokens=input.match(/\d+|[A-Za-z_]\w*|==|!=|<=|>=|\/\/|[+\-*%<>()[\],?]/g)||[];
 let i=0;
 const need=t=>{if(tokens[i++]!==t)throw Error('syntax');};
 function primary(){
  const t=tokens[i++];
  if(t==='('){const b=binary(0);need(')');return b;}
  if(t==='-')return {type:'lab_unary',fields:{OP:'negative'},inputs:{VALUE:valueInput(primary())}};
  if(t==='floor'){need('(');const b=binary(0);need(')');return {type:'lab_unary',fields:{OP:'floor'},inputs:{VALUE:valueInput(b)}};}
  if(t==='grid'||t==='result'){need('[');const r=binary(0);need(']');need('[');const c=binary(0);need(']');return {type:'lab_cell',fields:{ARRAY:t},inputs:{R:valueInput(r),C:valueInput(c)}};}
  if(t==='?'||/^\d+$/.test(t||'')||/^[A-Za-z_]\w*$/.test(t||''))return atom(t);
  throw Error('syntax');
 }
 function binary(min){
  let left=primary();
  while((priorities[tokens[i]]||0)>min){
   const op=tokens[i++],right=binary(priorities[op]);
   // Chained comparisons have special short-circuit semantics; preserve the text.
   if(priorities[op]===3&&priorities[tokens[i]]===3)throw Error('chain');
   left={type:'lab_binary',fields:{OP:op},inputs:{LEFT:valueInput(left),RIGHT:valueInput(right)}};
  }
  return left;
 }
 try{if(tokens.join('')!==input.replace(/\s/g,''))throw Error('tokens');const b=binary(0);if(i!==tokens.length)throw Error('tail');return b;}
 catch{return {type:'lab_text',fields:{TEXT:original}};}
}
export function cardsToBlocks(cards){
 const start={type:'lab_start',x:24,y:24},parents=[{depth:-1,block:start,last:null}];
 for(const c of cards){
  while(parents.length>1&&parents.at(-1).depth>=c.depth)parents.pop();
  const parent=parents.at(-1);
  if(c.depth!==parent.depth+1)throw Error('請先在自行輸入模式修正縮排，再轉為積木。');
  const block={type:`lab_${c.op}`,inputs:{},fields:{}};
  for(const [key,value] of Object.entries(c.args)){
   if(key==='name')block.fields.NAME=value;
   else block.inputs[key.toUpperCase()]=valueInput(expressionBlock(value));
  }
  if(parent.last)parent.last.next={block};
  else parent.block.inputs={...parent.block.inputs,BODY:{block}};
  parent.last=block;
  if(['for','if'].includes(c.op))parents.push({depth:c.depth,block,last:null});
 }
 return {blocks:{languageVersion:0,blocks:[start]}};
}
export function blockExpression(block){
 if(!block)return '?';
 const child=name=>blockExpression(block.getInputTargetBlock(name));
 switch(block.type){
  case 'lab_atom':return block.getFieldValue('VALUE');
  case 'lab_text':return block.getFieldValue('TEXT');
  case 'lab_binary':return `(${child('LEFT')} ${block.getFieldValue('OP')} ${child('RIGHT')})`;
  case 'lab_unary':return block.getFieldValue('OP')==='floor'?`floor(${child('VALUE')})`:`(-${child('VALUE')})`;
  case 'lab_cell':return `${block.getFieldValue('ARRAY')}[${child('R')}][${child('C')}]`;
  default:throw Error('不支援的算式積木。');
 }
}
export function blocksToCards(workspace){
 const tops=workspace.getTopBlocks(false), starts=tops.filter(b=>b.type==='lab_start');
 if(starts.length!==1)throw Error('請保留一個「開始任務」積木。');
 const cards=[];
 function sequence(block,depth){
  if(depth>8)throw Error('循環／如果最多可嵌套 8 層。');
  for(let b=block;b;b=b.getNextBlock()){
   if(cards.length>=200)throw Error('指令不能超過 200 張。');
   const op=b.type.slice(4),type=CARD_TYPES[op];
   if(!type)throw Error('請把指令積木接在「開始任務」內。');
   const args={};
   for(const key of Object.keys(type.args))args[key]=key==='name'?b.getFieldValue('NAME'):blockExpression(b.getInputTargetBlock(key.toUpperCase()));
   cards.push({op,depth,args});
   if(['for','if'].includes(op))sequence(b.getInputTargetBlock('BODY'),depth+1);
  }
 }
 sequence(starts[0].getInputTargetBlock('BODY'),0);
 return {cards,issue:tops.length>1?'有積木未連接：請接入「開始任務」，或刪除不用的積木，再執行。切換模式會保留未連接積木。':''};
}
export function blockChoices(cards){
 const values=new Set(['?','0','1','2','3','4','5','rows','cols','r','c','i','j','nr','nc','value','total','count','temp','index','best','not_found',...Array.from({length:22},(_,i)=>String(i-1))]);
 const names=new Set(['r','c','i','j','nr','nc','value','total','count','temp','index','best']);
 for(const c of cards)for(const [key,value] of Object.entries(c.args)){
  if(key==='name')names.add(value);
  for(const t of value.match(/[A-Za-z_]\w*|\d+/g)||[])if(!['grid','result','floor','and','or','DIV','MOD','AND','OR'].includes(t))values.add(t);
 }
 return {values:[...values],names:[...names]};
}

// Keep loose blocks even when the connected program is edited in typing mode.
export function workspaceSnapshot(cards,draft){
 if(draft?.signature===JSON.stringify(cards))return draft.snapshot;
 const state=cardsToBlocks(cards);
 const loose=draft?.snapshot?.blocks?.blocks?.filter(b=>b.type!=='lab_start')||[];
 state.blocks.blocks.push(...structuredClone(loose));
 return state;
}
