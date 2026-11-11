import {worlds} from './data.js';

const key='ai-school-grade-1';
let state=JSON.parse(localStorage.getItem(key)||'{"stars":0}');
const app=document.querySelector('#app');
const save=()=>localStorage.setItem(key,JSON.stringify(state));
let openedAt=Date.now();
function syncTime(){const seconds=Math.floor((Date.now()-openedAt)/1000);if(seconds){state.seconds=(state.seconds||0)+seconds;openedAt=Date.now();save();}}
function noteMistake(id){state.mistakes={...(state.mistakes||{}),[id]:(state.mistakes?.[id]||0)+1};save();}
window.addEventListener('pagehide',syncTime);

function home(){
  const final=state.stars===4?'<button class="primary" id="project">Создать своё правило</button>':'';
  const badges=(state.done||[]).map(id=>`${worlds[id].icon} ${worlds[id].achievement}`).join(' · ');
  app.innerHTML=`<section class="card"><p>AI SCHOOL · 1 КЛАСС</p><h1>Научи помощника правилу</h1><div class="progress"><i style="width:${Math.min(state.stars*25,100)}%"></i></div><p>Твои звёзды: ${state.stars}/4</p>${final}</section><section class="card"><p class="step">Выбери мир, который тебе нравится.</p><div class="worlds">${Object.entries(worlds).map(([id,w])=>`<button data-world="${id}">${w.icon}<br>${w.name}</button>`).join('')}</div></section>${badges?`<section class="card"><b>Достижения</b><p>${badges}</p></section>`:''}<section class="card"><b>Для взрослого</b><p>Цель: ребёнок создаёт правило «если — то», строит последовательность и исправляет ошибку. Данные остаются только на устройстве.</p><button id="parent">Открыть прогресс ребёнка</button></section>`;
  document.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>mission(b.dataset.world));
  document.querySelector('#project')?.addEventListener('click',project);
  document.querySelector('#parent').onclick=parent;
}

function mission(id,index=0,chosen=[]){
  const w=worlds[id],m=w.missions[index];
  const content=m.type==='sequence'
    ?`<div class="sequence">${m.steps.map((step,i)=>`<button data-step="${i}" ${chosen.includes(i)?'disabled':''}>${chosen.indexOf(i)+1||'○'} ${step}</button>`).join('')}</div><p id="hint" aria-live="polite">${chosen.length?'Продолжай собирать алгоритм.':'Нажимай команды по одной.'}</p>`
    :`<div class="worlds"><button id="good">${m.correct}</button><button id="bad">${m.wrong}</button></div><p id="hint" aria-live="polite"></p>`;
  app.innerHTML=`<section class="card"><button id="back">← К мирам</button><p>${w.icon} ${w.name} · ${index+1}/${w.missions.length}</p><h1>Помоги роботу</h1><p class="step">${m.question}</p>${content}</section>`;
  document.querySelector('#back').onclick=home;
  if(m.type==='sequence') document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{
    const step=Number(b.dataset.step),expected=chosen.length;
    if(step!==expected){noteMistake(id);document.querySelector('#hint').textContent='Эта команда будет позже. Попробуй другую.';return;}
    const next=[...chosen,step];
    if(next.length===m.steps.length) nextMission(id,index); else mission(id,index,next);
  });
  else {
    document.querySelector('#good').onclick=()=>nextMission(id,index);
    document.querySelector('#bad').onclick=()=>{noteMistake(id);document.querySelector('#hint').textContent='Попробуй ещё. Ошибаться можно.';};
  }
}

function nextMission(id,index){return index+1<worlds[id].missions.length?mission(id,index+1):win(id);}
function win(id){
  if(!state.done?.includes(id)){state.done=[...(state.done||[]),id];state.stars=state.done.length;save();}
  app.innerHTML=`<section class="card"><p class="reward">⭐</p><h1>Получилось!</h1><p class="step">Ты помог роботу: выбрал безопасное решение, собрал алгоритм и дал понятное правило.</p><button class="primary" id="go-home">Собрать ещё звезду</button></section>`;
  document.querySelector('#go-home').onclick=home;
}

function project(){
  app.innerHTML=`<section class="card"><h1>Моё правило</h1><p class="step">Выбери начало и конец правила.</p><div class="worlds"><button data-rule="Если темно|включи фонарик">Темно → фонарик</button><button data-rule="Если красный свет|остановись">Красный → стоп</button></div><p id="rule" class="step" aria-live="polite"></p><button id="back" class="primary">К мирам</button></section>`;
  document.querySelectorAll('[data-rule]').forEach(b=>b.onclick=()=>{const [a,c]=b.dataset.rule.split('|');document.querySelector('#rule').textContent=`${a}, то ${c}. Отличное правило!`;});
  document.querySelector('#back').onclick=home;
}
function parent(){
  syncTime();
  const done=state.done||[],hard=Object.entries(state.mistakes||{}).filter(([,count])=>count>=2).map(([id])=>worlds[id].name);
  const badges=done.length?done.map(id=>`<li>${worlds[id].icon} ${worlds[id].name}: ${worlds[id].goal}</li>`).join(''):'<li>Пока нет завершённых миров.</li>';
  app.innerHTML=`<section class="card"><button id="back">← К мирам</button><p>AI SCHOOL · ДЛЯ ВЗРОСЛОГО</p><h1>Прогресс ребёнка</h1><p class="step">Пройдено миров: ${done.length}/4<br>Время в курсе: ${Math.floor((state.seconds||0)/60)} мин.</p></section><section class="card"><b>Освоенные навыки</b><ul>${badges}</ul></section><section class="card"><b>Где нужна поддержка</b><p>${hard.length?`Стоит спокойно повторить: ${hard.join(', ')}.`:'Пока сложных тем не видно. Можно выбрать следующий мир по интересу.'}</p><p>Нет сравнений с другими детьми. Данные хранятся только на этом устройстве.</p></section>`;
  document.querySelector('#back').onclick=home;
}
home();
