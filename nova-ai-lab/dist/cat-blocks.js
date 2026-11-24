import { loadScript } from './browser-libraries.js';

const commands = [
  ['nova_step','Шаг вправо',150],
  ['nova_jump','Прыжок через лужу',270],
  ['nova_meow','Мяу!',30],
];

export function catAction(state, action) {
  if (state.message) return state;
  if (action === 'nova_step') {
    if (state.cell === 1) return { ...state, message:'Впереди лужа. В этой клетке нужен прыжок.' };
    if (state.cell === 4) return { ...state, message:'Кот уже у мяча. Добавь «Мяу!».' };
    return { cell:state.cell+1 };
  }
  if (action === 'nova_jump') return state.cell === 1
    ? { cell:3 }
    : { ...state, message:'Прыжок нужен у края лужи. Сначала подойди к ней.' };
  if (action === 'nova_meow') return { ...state, won:state.cell===4, message:state.cell===4
    ? 'Мяу! Кот добрался до мяча. Команды сработали по порядку.'
    : 'Кот мяукнул раньше, чем добрался до мяча.' };
  return state;
}

export function mountCatBlocks(root) {
  root.innerHTML = `<div class="cat-track" aria-label="Кот, лужа и мяч"></div>
    <p>Собери одну цепочку сверху вниз. Кот должен добраться до мяча и мяукнуть.</p>
    <div class="cat-board" aria-label="Редактор Blockly"></div>
    <div class="cat-buttons">${commands.map(([type,label])=>`<button type="button" class="secondary" data-cat-block="${type}" disabled>+ ${label}</button>`).join('')}</div>
    <div class="cat-buttons"><button type="button" class="primary" id="cat-run" disabled>Запустить</button><button type="button" class="secondary" id="cat-reset" disabled>Очистить блоки</button></div>
    <p role="status" id="cat-status">Загружаем редактор…</p>`;
  const get=selector=>root.querySelector(selector);
  const track=get('.cat-track'), status=get('#cat-status'), board=get('.cat-board');
  let workspace, observer, timer, disposed=false;
  function draw(cell) {
    track.innerHTML=[0,1,2,3,4].map(i=>`<span>${i===cell?'🐈 ':''}${i===2?'💧':i===4?'⚽':''}</span>`).join('');
    track.setAttribute('aria-label',`Кот в клетке ${cell+1} из 5, лужа в третьей, мяч в пятой`);
  }
  draw(0);
  (async()=>{
    await loadScript('./vendor/blockly/blockly.min.js');
    await loadScript('./vendor/blockly/ru.js');
    if(disposed||!root.isConnected)return;
    const B=globalThis.Blockly;
    if(!B.Blocks.nova_step) B.common.defineBlocksWithJsonArray(commands.map(([type,message0,colour])=>({
      type,message0,colour,previousStatement:null,nextStatement:null,
    })));
    workspace=B.inject(board,{
      toolbox:{kind:'flyoutToolbox',contents:commands.map(([type])=>({kind:'block',type}))},
      media:new URL('./vendor/blockly/media/',import.meta.url).href,
      scrollbars:true,trashcan:true,sounds:false,zoom:{startScale:.82},
    });
    observer=new ResizeObserver(()=>B.svgResize(workspace));
    observer.observe(board);
    status.textContent='Перетащи блок или добавь его кнопкой.';
    root.querySelectorAll('button').forEach(button=>button.disabled=false);
    root.querySelectorAll('[data-cat-block]').forEach(button=>button.onclick=()=>{
      if(workspace.getAllBlocks(false).length>=12){status.textContent='Умести маршрут в 12 блоков.';return;}
      const top=workspace.getTopBlocks(true)[0];
      let end=top;
      while(end?.getNextBlock())end=end.getNextBlock();
      const block=workspace.newBlock(button.dataset.catBlock);
      block.initSvg();
      block.render();
      if(end)end.nextConnection.connect(block.previousConnection);
      else block.moveBy(30,24);
    });
    get('#cat-reset').onclick=()=>{clearTimeout(timer);workspace.clear();draw(0);status.textContent='Поле очищено. Собери новую цепочку.';};
    get('#cat-run').onclick=()=>{
      clearTimeout(timer);
      draw(0);
      const tops=workspace.getTopBlocks(true);
      if(tops.length!==1){status.textContent='Соедини блоки в одну цепочку.';return;}
      const steps=[];
      for(let block=tops[0];block;block=block.getNextBlock())steps.push(block.type);
      if(steps.length>12){status.textContent='Умести маршрут в 12 блоков.';return;}
      let state={cell:0}, index=0;
      function tick(){
        if(disposed||!root.isConnected)return;
        state=catAction(state,steps[index++]);
        draw(state.cell);
        if(state.message){status.textContent=state.message;return;}
        if(index===steps.length){status.textContent='Команды закончились. Проверь, дошёл ли кот до мяча и есть ли «Мяу!». ';return;}
        timer=setTimeout(tick,420);
      }
      status.textContent='Кот выполняет команды…';
      timer=setTimeout(tick,250);
    };
  })().catch(()=>{if(!disposed)status.textContent='Редактор не загрузился. Можно перейти к следующему заданию.';});
  return ()=>{disposed=true;clearTimeout(timer);observer?.disconnect();workspace?.dispose();};
}
