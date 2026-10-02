import { starter, dataFor, CARD_TYPES, FIELD_LABELS } from './missions.mjs';

// A short editor is safe only while the student's original scaffold is intact.
// Custom instructions, expressions and detached blocks always use the full editor.
export function guidedFields(id, variant, mode, cards, draft) {
 if(id>2 || mode!=='scaffold' || draft?.snapshot?.blocks?.blocks?.some(b=>b.type!=='lab_start'))return null;
 const scaffold=starter(id,variant),fields=[];
 if(cards.length!==scaffold.length)return null;
 for(let index=0;index<cards.length;index++){
  const current=cards[index],original=scaffold[index];
  if(current.op!==original.op || current.depth!==original.depth || Object.keys(current.args).length!==Object.keys(original.args).length)return null;
  for(const [key,value] of Object.entries(original.args)){
   if(value==='?'){
    if(current.args[key]!=='?'&&!fieldChoices(key,dataFor(id,variant)).includes(current.args[key]))return null;
    fields.push({index,key,value:current.args[key]});
   }else if(current.args[key]!==value)return null;
  }
 }
 return fields;
}

export function fieldChoices(key, grid) {
 const count=key==='r'?grid.length:key==='c'?grid[0].length:6;
 return Array.from({length:count},(_,i)=>String(i));
}

export function firstIncomplete(cards) {
 for(let index=0;index<cards.length;index++)for(const [key,value] of Object.entries(cards[index].args)){
  if(!value.trim() || value.includes('?'))return {index,key,message:`第 ${index+1} 張「${CARD_TYPES[cards[index].op].label}」還未完成「${FIELD_LABELS[key]}」。請先填好標示的欄位。`};
 }
 return null;
}
