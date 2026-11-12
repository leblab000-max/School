import {robotLevels,actionLabels,parseMap,validateProgram,normaliseDraft,createRun,wallAhead,stepRobot,evaluateRobot,describeBlock,previewRobotRoute,robotBudgetHint} from './robot-engine.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const robotSvg=dir=>`<svg class="agent-icon" viewBox="0 0 40 40" role="img" aria-label="Робот смотрит ${['вверх','вправо','вниз','влево'][dir]}"><path d="M20 3 15 10h10Z" fill="#b9f369" transform="rotate(${dir*90} 20 20)"/><rect x="8" y="12" width="24" height="21" rx="7" fill="#c6d1eb"/><rect x="11" y="17" width="18" height="10" rx="4" fill="#1c2938"/><circle cx="16" cy="22" r="2" fill="#b9f369"/><circle cx="24" cy="22" r="2" fill="#b9f369"/></svg>`;
export function mountRobot(root,{draft={},persist,onComplete}){
 const clean= draft&&typeof draft==='object'?draft:{};
 const data={version:2,level:Number.isInteger(clean.level)&&clean.level>=0&&clean.level<4?clean.level:0,done:Array.isArray(clean.done)?[...new Set(clean.done.filter(i=>Number.isInteger(i)&&i>=0&&i<4))]:[],programs:{},steps:0,map:0,deliveryMode:clean.deliveryMode==='program'?'program':'drive'};
 robotLevels.forEach(l=>data.programs[l.id]=normaliseDraft(clean.programs?.[l.id],l));
 let level=robotLevels[data.level],mapIndex=0,program=data.programs[level.id],run=createRun(level.maps[0]),playing=false,timer=null,verification=null,notice='',editing=null;
 const write=()=>{data.programs[level.id]=program;data.map=mapIndex;data.steps=run.steps;persist(data);};
 const el=id=>root.querySelector('#'+id);
 const driving=()=>data.level===0&&data.deliveryMode==='drive';
 function stop(){playing=false;if(timer)clearTimeout(timer);timer=null;}
 function invalidate(){stop();run=createRun(level.maps[mapIndex]);verification=null;notice='Программа изменена. Робот снова на старте — запусти её для проверки.';write();update();}
 function showRecordedRoute() {
   run=previewRobotRoute(level.maps[mapIndex],program);
   verification=run.status==='won'?evaluateRobot(level,program):null;
 }
 function enterRecording() {
   showRecordedRoute();
   if(run.status==='failed') {
     data.deliveryMode='program';
     notice=run.message;
     return;
   }
   notice=program.length?run.message:'Нажми «Вперёд». Каждое движение будет записано.';
 }
 function drive(action) {
   if(program.length>=level.maxBlocks) {
     notice='Лимит команд. Отмени последний ход или сократи маршрут.';
     update();
     return;
   }
   const candidate=[...program,{type:'move',action}];
   const nextRun=previewRobotRoute(level.maps[mapIndex],candidate);
   if(nextRun.blocked) {
     run={...run,status:'failed',blocked:nextRun.blocked};
     notice='Впереди стена или край поля. Поверни и попробуй ещё раз.';
     update();
     return;
   }
   program=candidate;
   showRecordedRoute();
   notice=run.status==='won'?'Пакеты доставлены. Твои команды уже записаны в программу.':
     action==='F'?'Шаг записан.':'Поворот записан. Нажми «Вперёд», чтобы поехать в эту сторону.';
   write();
   update();
 }
 function rememberFocus(){const active=document.activeElement;return active&&root.contains(active)&&active.id?active.id:null;}
 function restoreFocus(id){if(id)el(id)?.focus({preventScroll:true});}
 function update(){if(!root.isConnected){stop();return;}const m=level.maps[mapIndex],board=parseMap(m),pos=`${run.x},${run.y}`,bad=run.blocked,focus=rememberFocus();
 el('robot-board').style.setProperty('--cols',board.width);el('robot-board').innerHTML=board.rows.flatMap((row,y)=>[...row].map((c,x)=>{const key=`${x},${y}`,isRobot=pos===key,packet=run.remaining.includes(key),visited=run.trail.some(p=>p.x===x&&p.y===y),blocked=bad&&bad.x===x&&bad.y===y;return `<div class="agent-cell ${c==='#'?'agent-wall':''} ${visited?'agent-trail':''} ${blocked?'agent-blocked':''}" role="img" aria-label="Строка ${y+1}, столбец ${x+1}: ${isRobot?'робот, смотрит '+['вверх','вправо','вниз','влево'][run.dir]:c==='#'?'стена':packet?'пакет данных':c==='G'?'станция':'свободно'}">${c==='G'?'<span class="station">⚡</span>':''}${packet?'<span class="packet">◆</span>':''}${isRobot?robotSvg(run.dir):''}</div>`;})).join('');
 el('robot-counters').innerHTML=`<span>Пакеты <b>${board.packets.length-run.remaining.length}/${board.packets.length}</b></span><span>Действия <b>${run.steps}/${m.energy}</b></span><span>Блоки <b>${program.length}/${level.maxBlocks}</b></span>`;
 el('robot-sensor').textContent=`Направление: ${['↑ вверх','→ вправо','↓ вниз','← влево'][run.dir]}. Датчик: впереди ${wallAhead(m,run)?'стена или край':'свободно'}.`;
 el('robot-program').innerHTML=program.length?program.map((b,i)=>`<li class="program-block ${run.activeBlock===i?(run.status==='failed'?'block-error':'block-active'):''} ${editing===i?'block-editing':''}"><span class="block-index">${i+1}</span><button type="button" class="block-label" id="edit-${i}" data-edit="${i}" aria-label="Изменить блок ${i+1}: ${esc(describeBlock(b))}">${esc(describeBlock(b))}</button><div class="block-tools"><button type="button" id="up-${i}" data-up="${i}" ${i===0?'disabled':''} aria-label="Поднять блок ${i+1}">↑</button><button type="button" id="down-${i}" data-down="${i}" ${i===program.length-1?'disabled':''} aria-label="Опустить блок ${i+1}">↓</button><button type="button" id="delete-${i}" data-delete="${i}" aria-label="Удалить блок ${i+1}">×</button></div></li>`).join(''):'<li class="empty-program">Добавь команды ниже. Пока программа пуста, робот остаётся на старте.</li>';
 el('robot-program').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const i=+b.dataset.delete;program.splice(i,1);editing=null;setEditing();invalidate();el('robot-add-move')?.focus({preventScroll:true});});
 for(const [attr,delta]of [['up',-1],['down',1]])el('robot-program').querySelectorAll(`[data-${attr}]`).forEach(b=>b.onclick=()=>{const i=+b.dataset[attr];[program[i],program[i+delta]]=[program[i+delta],program[i]];editing=null;setEditing();invalidate();el(`${attr}-${i+delta}`)?.focus({preventScroll:true});});
 el('robot-program').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=+b.dataset.edit;const block=program[editing];el('block-kind').value=block.type;el('move-action').value=block.action||'F';el('repeat-count').value=block.times||3;el('sense-condition').value=block.condition||'wall';el('sense-yes').value=block.yes||'R';el('sense-no').value=block.no||'F';showBuilder();setEditing();update();});
 const isDriving=driving();
 el('drive-panel').hidden=!isDriving;
 el('robot-program-panel').hidden=isDriving;
 el('robot-playback').hidden=isDriving;
 el('robot-check-panel').hidden=isDriving;
 el('drive-undo').disabled=!program.length;
 el('drive-reset').disabled=!program.length&&run.status!=='failed';
 el('drive-next').hidden=!isDriving||!verification?.ok;
 root.querySelectorAll('[data-drive]').forEach(b=>b.disabled=run.status==='won');
 root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===data.deliveryMode)));
 const hint=el('robot-budget-hint');
 hint.textContent=robotBudgetHint(level,m,program,run,isDriving);
 hint.hidden=!hint.textContent;
 el('robot-status').textContent=notice||run.message;el('robot-status').className=`robot-status ${run.status==='won'?'status-good':run.status==='failed'?'status-error':''}`;
 el('robot-run').disabled=!program.length;
 el('robot-run').textContent=playing?'Пауза':run.status==='failed'||run.status==='won'?'Запустить заново':'Запустить';el('robot-step').disabled=playing||run.status==='won'||run.status==='failed'||!program.length;
 el('robot-reset').disabled=run.steps===0&&!playing;el('robot-empty').disabled=program.length===0;el('robot-validate').disabled=!program.length||playing;
 el('robot-results').innerHTML=verification?`<h3>Проверка программы</h3>${verification.error?`<p class="status-error">${esc(verification.error)}</p>`:verification.results.map((r,i)=>`<p class="verification ${r.status==='won'?'pass':'fail'}"><b>${r.status==='won'?'✓':'↻'} ${level.maps[i].name}</b><span>${esc(r.message)}</span></p>`).join('')}`:'';
 el('robot-next').hidden=!verification?.ok;el('robot-next').textContent=data.level===3?'Завершить миссию →':'Уровень пройден. Дальше →';
 el('robot-edit-cancel').hidden=editing===null;el('robot-add').textContent=editing===null?'Добавить блок':'Сохранить блок';
 restoreFocus(focus);
 }
 function showBuilder(){const type=el('block-kind').value;el('builder-move').hidden=!['move','repeat'].includes(type);el('builder-count').hidden=type!=='repeat';el('builder-sense').hidden=!['if','until'].includes(type);el('builder-rule-note').hidden=type!=='until';}
 function setEditing(){el('robot-builder-title').textContent=editing===null?'Добавь команду':`Изменить блок ${editing+1}`;}
 function check(){const error=validateProgram(program,level);if(error){notice=error;update();return false;}return true;}
 function performStep(){if(!root.isConnected){stop();return;}notice='';run=stepRobot(level.maps[mapIndex],program,run);write();if(['failed','won'].includes(run.status))stop();update();}
 function tick(){if(!playing)return;performStep();if(playing)timer=setTimeout(tick,350);}
 function build(){stop();level=robotLevels[data.level];program=data.programs[level.id];mapIndex=0;run=createRun(level.maps[0]);verification=null;notice='Сначала собери программу. Кнопки поворота меняют направление, а не положение робота.';editing=null;
 if(driving()) enterRecording();
 root.innerHTML=`<section class="agent-game"><div class="agent-levels" aria-label="Уровни робота">${robotLevels.map((l,i)=>`<button type="button" data-stage="${i}" aria-current="${i===data.level?'step':'false'}" ${i>0&&!data.done.includes(i-1)?'disabled':''}><span>${data.done.includes(i)?'✓':i+1}</span>${l.title}</button>`).join('')}</div><section class="agent-task"><p class="eyebrow">ТВОЁ ЗАДАНИЕ · УРОВЕНЬ ${data.level+1}/4</p><h2>${level.title}</h2><p>${level.brief}</p><p class="agent-constraints"><b>План:</b> найди ближайший ◆ и заранее реши, где понадобится поворот. <b>Успех:</b> все пакеты собраны, робот на станции. <b>Условия:</b> не больше ${level.maxBlocks} блоков, без столкновений. ${level.maps.length>1?'Программа должна пройти все три карты.':''}</p><details class="robot-guide"><summary>Как управлять? Пример и подсказка</summary><div class="guide-cards"><div><b>1. Составь</b><p>«Шаг» двигает на одну клетку туда, куда смотрит стрелка. «Поворот» разворачивает на 90° на месте.</p></div><div><b>2. Запусти</b><p>«По шагам» исполняет одно действие. «Запустить» показывает весь процесс. Пауза позволяет рассмотреть результат.</p></div><div><b>3. Исправь</b><p>Нажми название блока, чтобы изменить его. Можно удалить ошибочный блок в середине. После изменения робот возвращается на старт.</p></div></div><p><b>Пример:</b> робот смотрит ↑. «Направо», затем «шаг» → робот смотрит → и смещается на одну клетку вправо.</p><p><b>Подсказка уровня:</b> ${level.hint}</p></details></section><div class="agent-workspace"><section class="agent-board-panel"><div class="agent-map-tabs">${level.maps.map((m,i)=>`<button type="button" data-map="${i}" aria-pressed="${i===0}">${m.name}</button>`).join('')}</div><div class="agent-board" id="robot-board" role="group" aria-label="Карта робота"></div>${data.level===0?`<div class="agent-mode-tabs" aria-label="Управление роботом"><button type="button" data-mode="drive">Записать маршрут</button><button type="button" data-mode="program">Редактор программы</button></div>`:''}
 <div id="drive-panel" hidden><div class="agent-drive-keys" aria-label="Движение робота">
 <button type="button" class="secondary" data-drive="L">↶ Налево</button>
 <button type="button" class="primary" data-drive="F">↑ Вперёд</button>
 <button type="button" class="secondary" data-drive="R">↷ Направо</button>
 </div><button type="button" class="secondary" id="drive-reset">Начать маршрут заново</button><button type="button" class="text-button" id="drive-undo">Отменить последний ход</button></div>
 <div class="robot-controls" id="robot-playback"><button type="button" id="robot-run" class="primary">Запустить</button><button type="button" id="robot-step" class="secondary">По шагам</button><button type="button" id="robot-reset" class="secondary">На старт</button><button type="button" id="robot-empty" class="text-button">Очистить программу</button><button type="button" id="robot-open-editor" class="text-button">К редактору ↓</button></div>
 <p id="robot-status" class="robot-status" role="status" aria-live="polite"></p><p id="robot-budget-hint" class="robot-budget-hint" role="status" hidden></p>
 <button type="button" id="drive-next" class="primary" hidden>Следующее испытание →</button><p class="board-legend"><span>◆ пакет данных</span><span>⚡ станция</span><span>▧ стена</span></p><p id="robot-sensor" class="robot-sensor"></p><div id="robot-counters" class="robot-counters"></div></section><section class="agent-program-panel" id="robot-program-panel"><h3>Твоя программа</h3><p class="muted">Робот начинает движение только после запуска. Строка программы подсвечивается при выполнении.</p><ol id="robot-program" class="agent-program" aria-label="Блоки программы"></ol><section class="robot-builder"><h4 id="robot-builder-title">Добавь команду</h4><label>Тип блока<select id="block-kind">${level.allowed.map(t=>`<option value="${t}">${({move:'Одна команда',repeat:'Повторить команду',if:'Если — то — иначе',until:'Повторять правило до станции'})[t]}</option>`).join('')}</select></label><label id="builder-move">Команда<select id="move-action">${Object.entries(actionLabels).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><label id="builder-count" hidden>Сколько раз<select id="repeat-count">${Array.from({length:11},(_,i)=>`<option value="${i+2}" ${i===1?'selected':''}>${i+2}</option>`).join('')}</select></label><div id="builder-sense" hidden><label>Если впереди<select id="sense-condition"><option value="wall">Стена или край поля</option><option value="clear">Свободная клетка</option></select></label><label>То выполнить<select id="sense-yes">${['L','R','F'].map(a=>`<option value="${a}">${actionLabels[a]}</option>`).join('')}</select></label><label>Иначе выполнить<select id="sense-no">${['F','L','R'].map(a=>`<option value="${a}">${actionLabels[a]}</option>`).join('')}</select></label></div><p id="builder-rule-note" class="muted" hidden>Правило проверяет датчик заново перед каждым действием. Повторение останавливается на станции с собранными пакетами или при исчерпании лимита действий.</p><button type="button" id="robot-add" class="secondary">Добавить блок</button><button type="button" id="robot-edit-cancel" class="text-button" hidden>Отменить изменение</button><button type="button" id="robot-view-field" class="text-button">К полю и запуску ↑</button><span id="robot-add-move" tabindex="-1"></span></section></section></div><section class="robot-check" id="robot-check-panel"><button type="button" id="robot-validate" class="primary">${level.maps.length>1?'Проверить на всех трёх картах':'Проверить решение'}</button><p class="muted">Проверка исполняет сохранённую программу с начала. Изменение любого блока отменяет предыдущий результат.</p><div id="robot-results" aria-live="polite"></div><button type="button" id="robot-next" class="primary" hidden>Дальше →</button></section><aside class="robot-ai-note"><b>Как это связано с ИИ?</b><p>Ты программируешь учебного агента: он получает наблюдение от датчика, выбирает действие и проверяет результат. Это алгоритм, а не обучение нейросети. На последних уровнях ты проверяешь, работает ли одно правило в новых условиях.</p></aside></section>`;
 root.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{data.level=+b.dataset.stage;build();write();});
 root.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{stop();mapIndex=+b.dataset.map;run=createRun(level.maps[mapIndex]);notice='Выбрана другая карта. Программа сохранена, робот на старте.';root.querySelectorAll('[data-map]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));write();update();});
 root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
   stop();
   data.deliveryMode=b.dataset.mode;
   editing=null;
   setEditing();
   verification=null;
   if(driving()) {
     enterRecording();
   } else {
     run=createRun(level.maps[mapIndex]);
     notice=program.length?'Маршрут записан. Нажми «Запустить», чтобы его повторить.':'Добавь блок в редакторе, затем запусти программу.';
   }
   write();
   update();
 });
 root.querySelectorAll('[data-drive]').forEach(b=>b.onclick=()=>drive(b.dataset.drive));
 el('drive-undo').onclick=()=>{
   program=program.slice(0,-1);
   showRecordedRoute();
   notice='Последняя команда отменена.';
   write();
   update();
 };
 el('drive-reset').onclick=()=>{
   program=[];
   verification=null;
   run=createRun(level.maps[mapIndex]);
   notice='Робот на старте. Найди ближайший пакет и представь первые два действия.';
   write();
   update();
   root.querySelector('[data-drive="F"]').focus({preventScroll:true});
 };
 el('drive-next').onclick=()=>el('robot-next').click();
 el('robot-open-editor').onclick=()=>{
   el('robot-program-panel').scrollIntoView({block:'start'});
   el('block-kind').focus({preventScroll:true});
 };
 el('robot-view-field').onclick=()=>{
   el('robot-board').scrollIntoView({block:'start'});
   el('robot-run').focus({preventScroll:true});
 };
 el('block-kind').onchange=showBuilder;
 el('robot-add').onclick=()=>{const type=el('block-kind').value,block={type};if(['move','repeat'].includes(type))block.action=el('move-action').value;if(type==='repeat')block.times=+el('repeat-count').value;if(['if','until'].includes(type)){block.condition=el('sense-condition').value;block.yes=el('sense-yes').value;block.no=el('sense-no').value;}if(editing!==null){program[editing]=block;editing=null;}else if(program.length<level.maxBlocks)program.push(block);else{notice=`Достигнут лимит ${level.maxBlocks} блоков. Измени существующий блок или объедини шаги в цикл.`;update();return;}setEditing();invalidate();};
 el('robot-edit-cancel').onclick=()=>{editing=null;setEditing();update();};
 el('robot-empty').onclick=()=>{program=[];editing=null;setEditing();invalidate();};
 el('robot-reset').onclick=()=>{stop();run=createRun(level.maps[mapIndex]);notice='Робот на старте. Твоя программа сохранена.';write();update();};
 el('robot-step').onclick=()=>{if(check())performStep();};
 el('robot-run').onclick=()=>{if(playing){stop();notice='Пауза. Можно продолжить запуск или выполнить одно действие.';write();update();return;}if(!check())return;if(['failed','won'].includes(run.status))run=createRun(level.maps[mapIndex]);playing=true;notice='';tick();};
 el('robot-validate').onclick=()=>{stop();verification=evaluateRobot(level,program);if(verification.results.length){run=verification.results[mapIndex];}notice=verification.error||(verification.ok?'Все проверки пройдены. Можно перейти дальше.':'Испытание нашло ошибку. Измени программу и проверь снова.');write();update();};
 el('robot-next').onclick=()=>{const proof=evaluateRobot(level,program);if(!proof.ok){verification=proof;update();return;}if(!data.done.includes(data.level))data.done.push(data.level);write();if(data.level===3){stop();onComplete();}else{
   data.level++;
   build();
   write();
   root.querySelector('.agent-task').scrollIntoView({block:'start'});
 }};
 showBuilder();update();
 }
 build();
 return ()=>stop();
}
