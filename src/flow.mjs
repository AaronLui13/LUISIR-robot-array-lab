export function predictionIssue(id, selected, prediction) {
  const targets=id===0?[[0,2],[2,0]]:id===2?[[1,2]]:[];
  if(targets.length && JSON.stringify(targets)!==JSON.stringify(selected))return id===0?'先依序點選 (0,2) 和 (2,0)，再預測讀到的貨量。':'先點選準備補貨的 (1,2)。';
  return prediction.trim()?'':'請填入你的預測；答錯也可以繼續學習。';
}
export function nextTask(id, variants, saved) {
  const missing=Array.from({length:variants},(_,i)=>i).find(i=>!saved?.variants?.includes(i));
  if(!saved?.complete && missing!==undefined)return {id,v:missing};
  return id<17?{id:id+1,v:0}:null;
}
