import { practiceDraft, practiceCard } from './practice.js';

export const scenarios = [
  { title:'Спаси перемену', place:'Класс', icon:'🏫', time:10, people:12, budget:0,
    goal:'12 ребят ждут игру. Успей до звонка.',
    choices:[
      {id:'time',icon:'⏱',label:'Не больше 10 минут'},
      {id:'noise',icon:'✨',label:'Побольше украшений'},
      {id:'people',icon:'👥',label:'Участвуют все 12'},
      {id:'budget',icon:'🪙',label:'Без покупок'},
    ]},
  { title:'Команда на разминке', place:'Маленький зал', icon:'⚽', time:6, people:8, budget:0,
    goal:'Нужно разогреть всю команду перед тренировкой.',
    choices:[
      {id:'people',icon:'👥',label:'Все 8 двигаются'},
      {id:'time',icon:'⏱',label:'Уложиться в 6 минут'},
      {id:'noise',icon:'🏆',label:'Объявить чемпиона'},
      {id:'budget',icon:'🪙',label:'Использовать то, что есть'},
    ]},
  { title:'Мастерская идей', place:'Кружок', icon:'🎨', time:15, people:6, budget:0,
    goal:'Помоги каждому придумать героя для своей игры.',
    choices:[
      {id:'budget',icon:'🪙',label:'Бумага уже есть'},
      {id:'noise',icon:'💎',label:'Сначала придумать логотип'},
      {id:'time',icon:'⏱',label:'Показать результат за 15 минут'},
      {id:'people',icon:'👥',label:'Каждый из 6 делает героя'},
    ]},
];

export function simulatePlan(scenario, conditions) {
  const chosen=new Set(conditions);
  const minutes=chosen.has('time')?scenario.time:scenario.time+5;
  const cost=chosen.has('budget')?0:3;
  const participants=chosen.has('people')?scenario.people:2;
  const checks=[
    {id:'time',icon:'⏱',label:`${minutes} / ${scenario.time} мин`,ok:minutes<=scenario.time,why:'План не поместился до звонка.'},
    {id:'budget',icon:'🪙',label:`${cost} покупок`,ok:cost<=scenario.budget,why:'Нова добавила покупки, которых нет в бюджете.'},
    {id:'people',icon:'👥',label:`${participants} / ${scenario.people} участвуют`,ok:participants===scenario.people,why:'Часть ребят осталась наблюдать.'},
  ];
  return {minutes,cost,participants,checks,ok:checks.every(check=>check.ok)};
}

const planTitles=['Словесная цепочка','Разминка по кругу','Герой из трёх деталей'];

export function mountPracticeGame(root,{saved,persist,exit,portfolio,escape}) {
  const old=saved?.version===2?practiceDraft(saved):null;
  const draft=old||{version:2,passed:[],idea:'',check:'',comparison:''};
  let stage=draft.passed.length===3?(draft.comparison?'done':'idea'):'build';
  let index=Math.min(draft.passed.length,2);
  let selected=new Set(), result=null, revealed=false;
  let timer, running=false;
  let elapsed=0;
  const get=selector=>root.querySelector(selector);
  function save() { persist(practiceDraft(draft)); }
  function render() {
    if(!root.isConnected)return;
    const scenario=scenarios[index];
    const final=stage==='idea'||stage==='done';
    root.innerHTML=`<section class="page play-practice">
      <button type="button" class="text-button" id="practice-exit">← К миссиям</button>
      <p class="eyebrow">СТУДИЯ ИДЕЙ · ${final?'ТВОЙ ПРОЕКТ':`${index+1} / 3`}</p>
      <h1 tabindex="-1">${final?'Теперь твоя идея':scenario.title}</h1>
      ${final ? ideaMarkup() : `
      <p class="lead">${scenario.goal}</p>
      <div class="play-place ${running?'testing':''}">
        <div class="play-place-title">${scenario.icon} ${scenario.place}<span>До конца ${scenario.time} минут</span></div>
        <div class="play-clock" aria-hidden="true"><i style="width:${revealed?100:0}%"></i></div><div class="play-crowd">${Array.from({length:scenario.people},(_,i)=>`<span class="play-person ${result&&i<result.participants&&revealed?'active':''}" aria-label="Участник ${i+1}">${i%3===0?'🧑':i%3===1?'👩':'👦'}</span>`).join('')}</div>
        <div class="play-status-grid">${(result&&revealed?result.checks:[
          {icon:'⏱',label:`${scenario.time} минут`},{icon:'🪙',label:'Без покупок'},{icon:'👥',label:`${scenario.people} ребят`}
        ]).map(check=>`<span class="${revealed?(check.ok?'pass':'fail'):''}">${check.icon} ${check.label}${revealed?(check.ok?' ✓':' ✕'):''}</span>`).join('')}</div>
      </div>
      <section class="lab-panel">
        <h2>${stage==='build'?'Что сказать Нове?':'Испытай предложение Новы'}</h2>
        ${stage==='build'?`<p>Собери условия. Потом проверишь, что получилось.</p><div class="play-picks">
        ${scenario.choices.map(choice=>`<button type="button" data-condition="${choice.id}" aria-pressed="${selected.has(choice.id)}"><span>${choice.icon}</span>${choice.label}</button>`).join('')}</div>
        <button type="button" class="primary" id="practice-generate">Получить план →</button>`
        : `<div class="play-plan"><b>🤖 ${planTitles[index]}</b>
        <div class="play-timeline">${Array.from({length:result.minutes},(_,i)=>`<i class="${i>=scenario.time?'over':''}" title="Минута ${i+1}"></i>`).join('')}</div>
        <p>${index===0?'Называйте слова по цепочке.':index===1?'Выполняйте движения за ведущим.':'Рисуйте героя и показывайте группе.'}</p>
        <div class="play-status-grid"><span>⏱ ${result.minutes} мин</span><span>🛒 ${result.cost?result.cost+' набора':'Всё уже есть'}</span><span>👥 ${result.participants} в деле</span></div></div>
        ${revealed?`<div class="play-find"><p>${result.ok?'Все три условия выполнены. Какое твое действие помогло?':'Нажми на условие, которое нарушено.'}</p>
        ${!result.ok?result.checks.map(check=>`<button type="button" class="secondary" data-find="${check.id}">${check.icon} ${check.label}</button>`).join(''):''}
        </div>`:''}
        <p id="practice-feedback" role="status">${running?'Пробуем игру…':''}</p>
        ${!revealed?`<button type="button" class="primary" id="practice-test" ${running?'disabled':''}>Запустить игру ▶</button>`:result.ok?`<div class="play-picks"><button type="button" data-reflect="appearance">Украсил ответ</button><button type="button" data-reflect="constraints">Задал условия и проверил их</button></div>`:''}
        <button type="button" class="secondary" id="practice-edit" ${running?'disabled':''}>Изменить условия</button>`}
        <p class="muted">Нова здесь работает по учебным правилам.</p>
      </section>`}
    </section>`;
    get('#practice-exit').onclick=()=>{clearTimeout(timer);exit();};
    if(final)bindIdea();
    else if(stage==='build') {
      root.querySelectorAll('[data-condition]').forEach(button=>button.onclick=()=>{
        const id=button.dataset.condition;
        if(selected.has(id))selected.delete(id);else selected.add(id);
        button.setAttribute('aria-pressed',String(selected.has(id)));
      });
      get('#practice-generate').onclick=()=>{result=simulatePlan(scenario,[...selected]);revealed=false;stage='test';render();};
    } else {
      get('#practice-edit').onclick=()=>{clearTimeout(timer);running=false;revealed=false;stage='build';render();};
      get('#practice-test')?.addEventListener('click',()=>{
        running=true;elapsed=0;render();
        function tick() {
          if(!root.isConnected)return;
          elapsed++;
          const clock=get('.play-clock i');
          clock.style.width=`${elapsed/result.minutes*100}%`;
          const people=root.querySelectorAll('.play-person');
          const current=(elapsed-1)%result.participants;
          people.forEach((person,i)=>person.classList.toggle('active',i<result.participants&&i===current));
          get('#practice-feedback').textContent=`Минута ${elapsed}: ${elapsed>scenario.time?'звонок уже прозвенел!':'игра идёт'}`;
          if(elapsed===result.minutes){running=false;revealed=true;render();return;}
          timer=setTimeout(tick,90);
        }
        timer=setTimeout(tick,90);
      });
      root.querySelectorAll('[data-find]').forEach(button=>button.onclick=()=>{
        const check=result.checks.find(check=>check.id===button.dataset.find);
        get('#practice-feedback').textContent=check.ok?'Это условие выполнено. Найди красную отметку.':check.why+' Измени условия и повтори испытание.';
      });
      root.querySelectorAll('[data-reflect]').forEach(button=>button.onclick=()=>{
        if(button.dataset.reflect!=='constraints'){get('#practice-feedback').textContent='Вспомни, какие три условия ты проверил.';return;}
        if(!draft.passed.includes(index))draft.passed.push(index);
        save();
        if(index===2)stage='idea';else{index++;stage='build';}
        selected=new Set();result=null;revealed=false;render();
      });
    }
    get('h1').focus({preventScroll:true});
  }
  function ideaMarkup() {
    if(stage==='done')return `${practiceCard(practiceDraft(draft),escape)}
      <p class="play-method">💡 Цель → 🧩 Условия → 🔎 Проверка → 🔧 Правка</p>
      <button type="button" class="primary" id="practice-portfolio">Открыть портфолио</button>
      <button type="button" class="secondary" id="practice-replay">Переиграть миссию</button>`;
    return `<section class="lab-panel"><p>Что ты хочешь сделать с помощью ИИ?</p>
      <form id="practice-form"><label>Моя идея<input name="idea" maxlength="160" required placeholder="Например, придумать героя для своей игры" value="${escape(draft.idea)}"></label>
      <label>Как я пойму, что получилось?<input name="check" maxlength="160" required placeholder="Назову два условия и проверю результат" value="${escape(draft.check)}"></label>
      <p class="muted">Эти строки сохранятся для следующего опыта с ИИ.</p>
      <button type="submit" class="primary">Забрать свою идею →</button></form></section>`;
  }
  function bindIdea() {
    get('#practice-portfolio')?.addEventListener('click',portfolio);
    get('#practice-replay')?.addEventListener('click',()=>{
      draft.passed=[];draft.comparison='';index=0;selected=new Set();revealed=false;stage='build';save();render();
    });
    get('#practice-form')?.addEventListener('submit',event=>{
      event.preventDefault();
      const form=event.currentTarget;
      draft.idea=form.elements.idea.value.trim();
      draft.check=form.elements.check.value.trim();
      if(!draft.idea||!draft.check)return;
      stage='done';save();render();
    });
    get('input[name="idea"]')?.addEventListener('input',event=>{draft.idea=event.target.value;save();});
    get('input[name="check"]')?.addEventListener('input',event=>{draft.check=event.target.value;save();});
  }
  render();
  root.scrollIntoView({block:'start'});
  return ()=>clearTimeout(timer);
}
