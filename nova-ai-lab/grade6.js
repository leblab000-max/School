import {modules} from './grade6-data.js';

const key='ai-school-grade-6-v2';
let state=JSON.parse(localStorage.getItem(key)||'{"done":[],"mistakes":0}');
const app=document.querySelector('#app');
const save=()=>localStorage.setItem(key,JSON.stringify(state));
const isOpen=index=>index===0||state.done.includes(modules[index-1].id);

function home(){
  const done=state.done||[];
  app.innerHTML=`<header><a href="index.html">AI SCHOOL</a><span>6 КЛАСС · БЕТА</span></header><section class="hero"><p class="eyebrow">КУРС-СОЗДАНИЕ</p><h1>Создай идею своего AI‑помощника</h1><p>За 5 модулей ты поймёшь AI и соберёшь паспорт своего первого полезного продукта.</p><div class="meter"><i style="width:${done.length/modules.length*100}%"></i></div><small>${done.length}/${modules.length} модулей завершено</small></section><section class="roadmap"><h2>Твой маршрут</h2>${modules.map((module,index)=>`<button class="module ${done.includes(module.id)?'done':''}" data-module="${index}" ${isOpen(index)?'':'disabled'}><span>${done.includes(module.id)?'✓':index+1}</span><div><b>${module.icon} ${module.title}</b><small>${module.goal} · Игра: ${module.game}</small></div><em>${isOpen(index)?'→':'🔒'}</em></button>`).join('')}</section>${done.length===modules.length?'<button class="primary" id="product">Открыть паспорт моего продукта</button>':''}<section class="privacy"><b>Без аккаунта и внешнего AI.</b> Прогресс остаётся в этом браузере. В заданиях не нужно писать личные данные.</section>`;
  document.querySelectorAll('[data-module]').forEach(button=>button.onclick=()=>lesson(Number(button.dataset.module)));
  document.querySelector('#product')?.addEventListener('click',product);
}

function lesson(moduleIndex,activityIndex=0,chosen=[]){
  const module=modules[moduleIndex],activity=module.activities[activityIndex];
  let action='';
  if(activity.type==='choice')action=`<div class="answers">${activity.options.map((option,index)=>`<button data-answer="${index}">${option}</button>`).join('')}</div>`;
  if(activity.type==='order')action=`<div class="answers">${activity.steps.map((step,index)=>`<button data-step="${index}" ${chosen.includes(index)?'disabled':''}><em>${chosen.indexOf(index)+1||'·'}</em>${step}</button>`).join('')}</div>`;
  if(activity.type==='build')action=`<div class="builder"><p>Начало</p>${activity.left.map((text,index)=>`<button data-left="${index}">${text}</button>`).join('')}<p>Продолжение</p>${activity.right.map((text,index)=>`<button data-right="${index}">${text}</button>`).join('')}</div><button class="primary" id="check" disabled>Проверить</button>`;
  app.innerHTML=`<header><button id="back">← Маршрут</button><span>МОДУЛЬ ${moduleIndex+1}/${modules.length}</span></header><section class="lesson"><p class="eyebrow">${module.icon} ${module.title}</p><h1>${module.goal}</h1><div class="lesson-map"><span>1. Пойми</span><span>2. Примени</span><span>3. Добавь в продукт</span></div><aside><b>Главная мысль</b><p>${module.concept}</p><b>После модуля</b><p>${module.success}</p></aside><div class="task"><p class="eyebrow">МИНИ‑ИГРА · ${module.game} · ${activityIndex+1}/${module.activities.length}</p><h2>${activity.question}</h2>${action}<p id="feedback" aria-live="polite"></p></div></section>`;
  document.querySelector('#back').onclick=home;
  const feedback=document.querySelector('#feedback');
  const mistake=text=>{state.mistakes++;save();feedback.className='hint';feedback.textContent=text;};
  const success=text=>{feedback.className='ok';feedback.textContent=text;setTimeout(()=>activityIndex+1<module.activities.length?lesson(moduleIndex,activityIndex+1):finish(moduleIndex),650);};
  if(activity.type==='choice')document.querySelectorAll('[data-answer]').forEach(button=>button.onclick=()=>Number(button.dataset.answer)===activity.correct?success(activity.feedback):mistake('Перечитай главную мысль и попробуй другой вариант.'));
  if(activity.type==='order')document.querySelectorAll('[data-step]').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.step);if(index!==chosen.length)return mistake('Этот шаг будет позже. Начни с первого действия.');const updated=[...chosen,index];updated.length===activity.steps.length?success(activity.feedback):lesson(moduleIndex,activityIndex,updated);});
  if(activity.type==='build'){let left,right;const check=document.querySelector('#check');const paint=()=>{check.disabled=left===undefined||right===undefined;document.querySelectorAll('[data-left]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.left)===left));document.querySelectorAll('[data-right]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.right)===right));};document.querySelectorAll('[data-left]').forEach(b=>b.onclick=()=>{left=Number(b.dataset.left);paint();});document.querySelectorAll('[data-right]').forEach(b=>b.onclick=()=>{right=Number(b.dataset.right);paint();});check.onclick=()=>left===activity.answer[0]&&right===activity.answer[1]?success(activity.feedback):mistake('Проверь: помогает ли правило пользователю и защищает ли личные данные.');}
}

function finish(index){const module=modules[index];if(!state.done.includes(module.id)){state.done.push(module.id);save();}app.innerHTML=`<section class="complete"><p>${module.icon}</p><p class="eyebrow">МОДУЛЬ ЗАВЕРШЁН</p><h1>В паспорт добавлено</h1><p class="result">${module.result}</p><p><b>Проверка себя:</b> ${module.success}</p><button class="primary" id="home">Понял — продолжить</button><button class="secondary" id="repeat">Хочу повторить модуль</button></section>`;document.querySelector('#home').onclick=home;document.querySelector('#repeat').onclick=()=>lesson(index);}
function product(){app.innerHTML=`<header><button id="back">← Маршрут</button><span>МОЙ ПРОДУКТ</span></header><section class="passport"><p class="eyebrow">ПАСПОРТ AI‑ПОМОЩНИКА</p><h1>Помощник по подготовке школьного события</h1><ol>${modules.map(module=>`<li><b>${module.title}</b><span>${module.result}</span></li>`).join('')}</ol><section class="launch"><b>Что можно сделать дальше</b><p>Возьми этот паспорт и создай первый прототип: попроси AI сделать план для настоящего события, проверь факты и попроси друга оценить пользу.</p></section></section>`;document.querySelector('#back').onclick=home;}
home();
