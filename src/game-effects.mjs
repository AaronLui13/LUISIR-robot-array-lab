// Effects consume execution snapshots; they never change the student's program or data.
export function stepEffect(before, after) {
  if (!before || !after) return null;
  if (after.error && after.error !== before.error) return { kind:'error', label:'停一停，檢查這一步' };
  if (after.writes.length > before.writes.length) {
    const write = after.writes.at(-1);
    return { kind:write.dest === 'result' ? 'copy' : 'write', label:write.dest === 'result' ? '寫入結果表' : '更新貨量', ...write };
  }
  if (after.visited.length > before.visited.length) return { kind:'scan', label:'掃描貨位', position:after.visited.at(-1) };
  if (after.reads.length > before.reads.length) return { kind:'read', label:'讀取資料', position:after.reads.at(-1) };
  if (after.outputs.length > before.outputs.length) return { kind:'output', label:'送出結果', value:after.outputs.at(-1) };
  return null;
}

export function robotMarkup(extraClass = '') {
  return `<span class="lab-robot ${extraClass}" aria-hidden="true"><svg viewBox="0 0 52 58" fill="none"><path d="M26 10V5" stroke="currentColor" stroke-width="3"/><circle cx="26" cy="4" r="3" fill="#e7a74b"/><rect x="8" y="11" width="36" height="28" rx="10" fill="#bde96b" stroke="#173e49" stroke-width="2"/><rect x="13" y="17" width="26" height="15" rx="6" fill="#173e49"/><g class="robot-eyes" fill="#d9ffd2"><rect x="18" y="21" width="4" height="6" rx="2"/><rect x="30" y="21" width="4" height="6" rx="2"/></g><path d="M20 35h12" stroke="#173e49" stroke-width="2" stroke-linecap="round"/><rect x="15" y="41" width="22" height="11" rx="4" fill="#e7a74b" stroke="#173e49" stroke-width="2"/><path d="M12 44l-5 4m33-4 5 4M20 53v3m12-3v3" stroke="#173e49" stroke-width="3" stroke-linecap="round"/></svg></span>`;
}

export function createGameAnimator() {
  const active = new Set(), transient = new Set();
  const clear = () => {
    for (const animation of active) animation.cancel();
    active.clear();
    for (const el of transient) el.remove();
    transient.clear();
  };
  const play = (el, keyframes, options) => {
    if (!el?.animate) return;
    const animation = el.animate(keyframes, options);
    active.add(animation);
    animation.onfinish = () => active.delete(animation);
    return animation;
  };
  const capture = () => {
    const bot = document.querySelector('.shelf-robot');
    return bot?.getBoundingClientRect();
  };
  const cell = (table, r, c) => document.querySelector(`[data-table="${table}"][data-cell="${r},${c}"]`);
  function render({ beforeRobot, state, effect, enabled, duration, celebrate, mission, finished }) {
    clear();
    const bot = document.querySelector('.shelf-robot'), stage = document.querySelector('.robot-stage');
    const position = state.current || [0,0], target = cell('grid',...position);
    if (bot && target && stage) {
      const box = target.getBoundingClientRect(), parent = stage.getBoundingClientRect();
      bot.style.left = `${box.right-parent.left-29}px`;
      bot.style.top = `${box.top-parent.top-9}px`;
      bot.classList.toggle('docked',!state.current);
      if (enabled && beforeRobot?.width) {
        const after = bot.getBoundingClientRect();
        play(bot,[{transform:`translate(${beforeRobot.x-after.x}px,${beforeRobot.y-after.y}px)`},{transform:'translate(0,0)'}],{duration,easing:'cubic-bezier(.22,.8,.3,1)'});
      }
    }
    if (!enabled) return;
    if (effect) {
      document.querySelectorAll('.robot-avatar .lab-robot').forEach(el => play(el,
        [{transform:'translateY(0) rotate(0)'},{transform:`translateY(-4px) rotate(${effect.kind==='error'?-8:6}deg)`},{transform:'translateY(0) rotate(0)'}],{duration:Math.min(duration,420),easing:'ease-out'}));
      let target;
      if (effect.position) target = cell('grid',...effect.position);
      else if (['write','copy'].includes(effect.kind)) target = cell(effect.dest,effect.r,effect.c);
      if (target) {
        const color = ['write','copy'].includes(effect.kind) ? '#e9a03c' : '#27ada4';
        play(target,[{boxShadow:`0 0 0 0 ${color}`,transform:'scale(1)'},{boxShadow:`0 0 0 5px ${color}55`,transform:'scale(1.04)',offset:0.45},{boxShadow:`0 0 0 0 ${color}00`,transform:'scale(1)'}],{duration,easing:'ease-out'});
        if (['write','copy'].includes(effect.kind)) {
          const tag=document.createElement('span');tag.className='cargo-change';tag.textContent=`${effect.old} → ${effect.value}`;tag.setAttribute('aria-hidden','true');target.append(tag);transient.add(tag);
          play(tag,[{opacity:0,transform:'translate(-50%,6px)'},{opacity:1,transform:'translate(-50%,-3px)',offset:.3},{opacity:0,transform:'translate(-50%,-18px)'}],{duration:Math.max(duration,550),easing:'ease-out'});
        }
      }
      if(effect.kind==='copy' && state.current && target) {
        const source=cell('grid',...state.current);
        if(source) {
          const from=source.getBoundingClientRect(),to=target.getBoundingClientRect();
          const cargo=document.createElement('span');cargo.className='cargo-flight';cargo.textContent=String(effect.value);cargo.setAttribute('aria-hidden','true');
          cargo.style.left=`${from.x+from.width/2-14}px`;cargo.style.top=`${from.y+from.height/2-14}px`;document.body.append(cargo);transient.add(cargo);
          const animation=play(cargo,[{transform:'translate(0,0) scale(.7)',opacity:0},{transform:'translate(0,0) scale(1)',opacity:1,offset:.15},{transform:`translate(${to.x+to.width/2-from.x-from.width/2}px,${to.y+to.height/2-from.y-from.height/2}px) scale(.6)`,opacity:0}],{duration,easing:'ease-in-out'});
          if(animation)animation.onfinish=()=>{active.delete(animation);cargo.remove();transient.delete(cargo);};
        }
      }
      if(effect.kind==='output')document.querySelectorAll('.output-signal').forEach(el=>play(el,[{transform:'scale(.94)',opacity:.5},{transform:'scale(1)',opacity:1}],{duration,easing:'ease-out'}));
    }
    if(celebrate) {
      const toast=document.createElement('div');toast.className='mission-celebration';toast.setAttribute('role','status');
      const title=document.createElement('strong');title.textContent=finished?`任務 ${String(mission).padStart(2,'0')} 完成！`:'變式完成！繼續下一個挑戰';
      toast.append(title);document.body.append(toast);transient.add(toast);
      for(let i=0;i<18;i++) {
        const particle=document.createElement('i');particle.style.setProperty('--burst-x',`${Math.cos(i*Math.PI/9)*(65+i%4*20)}px`);particle.style.setProperty('--burst-y',`${Math.sin(i*Math.PI/9)*75-35}px`);particle.style.setProperty('--burst-turn',`${i*47}deg`);particle.style.background=['#c2ef69','#e7a74b','#31aaa4'][i%3];toast.append(particle);
      }
      const animation=play(toast,[{opacity:0,transform:'translate(-50%,15px) scale(.9)'},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.15},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.8},{opacity:0,transform:'translate(-50%,-10px) scale(1)'}],{duration:2400,easing:'ease-out'});
      if(animation)animation.onfinish=()=>{active.delete(animation);toast.remove();transient.delete(toast);};
    }
  }
  return { capture, render, clear };
}
