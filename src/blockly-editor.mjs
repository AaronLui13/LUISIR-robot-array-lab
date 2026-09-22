import { CARD_TYPES, FIELD_LABELS } from './missions.mjs';
import { blockChoices, cardsToBlocks, blocksToCards } from './blocks-model.mjs';

export function defineLabBlocks(B,choices){
 const dropdown=values=>values.map(v=>[v==='?'?'？請選擇':v==='not_found'?'找不到':v===''?'（未填）':v,String(v)]);
 B.Blocks.lab_start={init(){this.appendDummyInput().appendField('開始任務');this.appendStatementInput('BODY');this.setColour(155);this.setDeletable(false);}};
 B.Blocks.lab_atom={init(){this.appendDummyInput().appendField(new B.FieldDropdown(dropdown(choices.values)),'VALUE');this.setOutput(true);this.setColour(35);}};
 B.Blocks.lab_text={init(){this.appendDummyInput().appendField('保留原算式').appendField(new B.FieldTextInput('?'),'TEXT');this.setOutput(true);this.setColour(20);this.setTooltip('這段文字保留原樣；可切回自行輸入修改，或換成算式積木。');}};
 B.Blocks.lab_binary={init(){this.appendValueInput('LEFT');this.appendDummyInput().appendField(new B.FieldDropdown([['＋','+'],['－','-'],['×','*'],['DIV 整數除法','//'],['MOD 取餘數','%'],['＝ 相等','=='],['≠ 不相等','!='],['＜','<'],['≤','<='],['＞','>'],['≥','>='],['AND 且','and'],['OR 或','or']]),'OP');this.appendValueInput('RIGHT');this.setInputsInline(true);this.setOutput(true);this.setColour(210);}};
 B.Blocks.lab_unary={init(){this.appendValueInput('VALUE').appendField(new B.FieldDropdown([['取負數','negative'],['向下取整','floor']]),'OP');this.setOutput(true);this.setColour(210);}};
 B.Blocks.lab_cell={init(){this.appendDummyInput().appendField('元素值').appendField(new B.FieldDropdown([['原陣列 grid','grid'],['結果陣列 result','result']]),'ARRAY');this.appendValueInput('R').appendField('行索引');this.appendValueInput('C').appendField('列索引');this.setInputsInline(true);this.setOutput(true);this.setColour(185);}};
 for(const [op,type] of Object.entries(CARD_TYPES))B.Blocks[`lab_${op}`]={init(){
  this.appendDummyInput().appendField(type.label);
  for(const key of Object.keys(type.args)){
   if(key==='name')this.appendDummyInput().appendField('變量').appendField(new B.FieldDropdown(dropdown(choices.names)),'NAME');
   else this.appendValueInput(key.toUpperCase()).appendField(FIELD_LABELS[key]);
  }
  if(['for','if'].includes(op))this.appendStatementInput('BODY').appendField('執行');
  this.setInputsInline(false);this.setPreviousStatement(true);this.setNextStatement(true);this.setColour(op==='for'?225:op==='if'?285:155);
  this.setTooltip(op==='for'?'起點包括，結束值不包括；索引由 0 起。':type.label);
 }};
}
const shadow=value=>({shadow:{type:'lab_atom',fields:{VALUE:value}}});
export function toolbox(stage,cards){
 const simple={kind:'block',type:'lab_atom',fields:{VALUE:'?'}};
 return {kind:'categoryToolbox',contents:[
  {kind:'category',name:'數值／變量',colour:35,contents:[simple,{...simple,fields:{VALUE:'0'}},{...simple,fields:{VALUE:'r'}},{...simple,fields:{VALUE:'c'}},{...simple,fields:{VALUE:'rows'}},{...simple,fields:{VALUE:'cols'}}]},
  {kind:'category',name:'算式／條件',colour:210,contents:['+','-','*','//','%','==','<','and','or'].map(OP=>({kind:'block',type:'lab_binary',fields:{OP},inputs:{LEFT:shadow('?'),RIGHT:shadow('?')}})).concat([{kind:'block',type:'lab_unary',inputs:{VALUE:shadow('?')}}])},
  {kind:'category',name:'陣列元素',colour:185,contents:[{kind:'block',type:'lab_cell',inputs:{R:shadow('r'),C:shadow('c')}}]},
  {kind:'category',name:'指令',colour:155,contents:Object.entries(CARD_TYPES).filter(([op,t])=>t.stage<=stage||cards.some(c=>c.op===op)).map(([op,t])=>({kind:'block',type:`lab_${op}`,fields:t.args.name?{NAME:t.args.name}:undefined,inputs:Object.fromEntries(Object.entries(t.args).filter(([k])=>k!=='name').map(([k])=>[k.toUpperCase(),shadow('?')]))}))}
 ]};
}
export function mountBlockly(element,{cards,stage,snapshot,onChange}){
 const B=globalThis.Blockly;
 if(!B)throw Error('積木工具未能載入，請重新整理；仍可使用自行輸入。');
 const choices=blockChoices(cards);
 // Detached blocks can contain values that no longer occur in the active cards.
 const collect=node=>{if(!node||typeof node!=='object')return;for(const [key,value] of Object.entries(node)){if((key==='VALUE'||key==='NAME')&&typeof value==='string'){const list=key==='NAME'?choices.names:choices.values;if(!list.includes(value))list.push(value);}else if(typeof value==='object')collect(value);}};
 collect(snapshot);
 defineLabBlocks(B,choices);
 const workspace=B.inject(element,{toolbox:toolbox(stage,cards),media:'./vendor/media/',renderer:'zelos',horizontalLayout:true,toolboxPosition:'start',trashcan:true,sounds:false,scrollbars:true,move:{scrollbars:true,drag:true,wheel:true},zoom:{controls:true,wheel:false,startScale:.8,minScale:.35,maxScale:1.4,scaleSpeed:1.15}});
 let loading=true;
 try{B.serialization.workspaces.load(snapshot||cardsToBlocks(cards),workspace);}catch(error){workspace.dispose();throw error;}
 loading=false;
 const read=()=>({...blocksToCards(workspace),snapshot:B.serialization.workspaces.save(workspace)});
 const listener=event=>{if(loading||event.isUiEvent||event.type===B.Events.FINISHED_LOADING)return;try{onChange(read());}catch(error){onChange({issue:error.message});}};
 workspace.addChangeListener(listener);
 const observer=new ResizeObserver(()=>B.svgResize(workspace));observer.observe(element);
 return {read,focusGap(){const gap=workspace.getAllBlocks(false).find(b=>(b.type==='lab_atom'&&b.getFieldValue('VALUE')==='?')||(b.type==='lab_text'&&(!b.getFieldValue('TEXT').trim()||b.getFieldValue('TEXT').includes('?')))||b.inputList.some(input=>input.connection?.type===B.ConnectionType.INPUT_VALUE&&!input.connection.targetBlock()));if(!gap)return false;workspace.centerOnBlock(gap.id);gap.select();return true;},resize:()=>B.svgResize(workspace),dispose(){observer.disconnect();workspace.removeChangeListener(listener);workspace.dispose();}};
}
