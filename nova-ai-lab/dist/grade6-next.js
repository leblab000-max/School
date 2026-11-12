import {catVision,mountLabelLesson} from './lesson-visuals.js';
import {resourcesPage} from './resources.js';
import {mountPractice,practiceCard,practiceDraft} from './practice.js';
import {mountBridge,mountSorter} from './arcade.js';
import {defaultAdventure,decodeAdventure,mountAdventurePlayer,mountAdventureStudio} from './adventure.js';
import {quizGuidance} from './quiz-guidance.js';
import {decodeQuiz,mountQuizPlayer,mountQuizStudio,quizTrial,validateQuiz} from './quiz-studio.js';
import {mountRobot} from './robot-game.js';
import {paths,worlds,lessons,classify,training,holdout,runRobot,promptScore,safeLoad} from './lab-content.js';
const app=document.querySelector('#app'),key='ai-school-lab-v3';
const restartRequested=new URLSearchParams(location.search).has('start-over');if(restartRequested){try{localStorage.removeItem(key);localStorage.removeItem('ai-school-grade6-next-v2');history.replaceState(null,'',location.pathname);}catch{}}
let stored={};try{const raw=localStorage.getItem(key);stored=safeLoad(raw||'{}');if(!raw){const old=safeLoad(localStorage.getItem('ai-school-grade6-next-v2')||'{}');stored={name:old.name||null,interest:old.interest??null};}}catch{}
let state={name:null,interest:null,done:[],notes:{},project:{},prompt:{},...stored};
state.practice=practiceDraft(state.practice);
let active=0,round=0,feedback=null,examples=[],commands=[],selected=[],tokenContext=0,tokenVisits=new Set(),tokenChoice=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(key,JSON.stringify(state));return true;}catch{document.querySelector('#save-warning')?.remove();app.insertAdjacentHTML('afterbegin','<p id="save-warning" role="alert">Не удалось сохранить на устройстве. Скачай портфолио перед выходом.</p>');return false;}}
const on=(id,fn)=>document.getElementById(id)?.addEventListener('click',fn);
function shell(body,nav=true){app.innerHTML=`<header class="top"><button id="home" aria-label="На карту курса"><span class="brand-icon">✳</span> NOVA <small>AI LAB</small></button><nav>${nav?'<button id="map">Карта</button><button id="portfolio">Мой проект</button>':''}<a class="arc-top-link" href="#games">Игры</a><button id="about" aria-label="Информация для родителя">Для родителей</button></nav></header>${body}<footer><a class="arc-top-link" href="#resources">После курса</a> · AI SCHOOL LAB · 6 класс <span>Исследуй. Ошибайся. Создавай.</span></footer>`;on('home',()=>leaveGames(showCourse));on('map',()=>leaveGames(map));on('portfolio',()=>leaveGames(portfolio));on('about',()=>leaveGames(about));}
function welcome(){shell(`<section class="welcome"><div><p class="eyebrow">ТВОЯ ПЕРВАЯ AI-ЭКСПЕДИЦИЯ</p><h1>Не просто спроси ИИ.<br><em>Разберись. Создай своё.</em></h1><p class="lead">Нова перепутала ягоды и карандаши. Помоги ей разобраться — и собери собственного помощника.</p><div class="welcome-facts"><span>12 миссий</span><span>4 мира</span><span>1 твой проект</span></div><label>Как тебя называть? <input id="name" maxlength="24" placeholder="Имя или ник" autocomplete="off"></label><p class="muted">Можно без имени. Оно остаётся только на этом устройстве.</p><button class="primary" id="go">Починить Нову →</button><button class="secondary quiz-entry" id="welcome-adventure">Игры NOVA →</button>${!validateQuiz(state.quiz)?'<button class="text-button" id="welcome-works">Мои работы</button>':''}<p class="muted">Без аккаунта в самом курсе · без таймеров и потери жизней</p></div><div class="nova-art" aria-label="Нова — учебный робот"><div class="orbit o1"></div><div class="orbit o2"></div><div class="bot"><div class="antenna"></div><div class="visor"><i></i><i></i></div><div class="mouth"></div></div><span class="float one">ДАННЫЕ ↗</span><span class="float two">ИДЕЯ + ТЕСТ</span><p>«Кажется, карандаш — это ягода.<br>Проверим мою логику?»</p></div></section>`,false);on('welcome-adventure',openGames);on('welcome-works',portfolio);on('go',()=>{state.name=document.querySelector('#name').value.trim()||'Исследователь';save();interests();});}
function interests(){shell(`<section class="page"><p class="eyebrow">ПЕРСОНАЛЬНАЯ МАСТЕРСКАЯ</p><h1>Что интересно тебе?</h1><p class="lead">Эту тему возьмём для твоего проекта. Эксперименты с устройством ИИ пройдут все исследователи.</p><div class="interests">${paths.map((p,i)=>`<button data-interest="${i}" class="interest ${state.interest===i?'chosen':''}"><span>${p.icon}</span>${p.name}</button>`).join('')}</div></section>`);document.querySelectorAll('[data-interest]').forEach(b=>b.onclick=()=>{state.interest=+b.dataset.interest;save();map();});}
function map(){if(state.interest===null)return interests();const next=lessons.findIndex((_,i)=>!state.done.includes(i)),n=state.done.length; shell(`<section class="map-hero"><div><p class="eyebrow">ЛАБОРАТОРИЯ ${esc(state.name).toUpperCase()}</p><h1>${n===12?'Экспедиция завершена.':'Твоя идея. Твои открытия.'}</h1><p class="lead">${n===12?'Ты испытал модель, собрал инструкции и подготовил свой проект. Теперь проверь его с настоящим пользователем.':`От первых примеров — до своего помощника. Тема проекта: ${paths[state.interest].icon} ${paths[state.interest].name}.`}</p><button class="text-button" id="restart-course">Начать заново</button><button class="primary" id="continue">${next<0?(state.practice.comparison?'Открыть портфолио':'Практический финал →'):'Продолжить: '+lessons[next].title+' →'}</button></div><div class="progress-card"><strong>${n}<small>/12</small></strong><span>миссий завершено</span><div class="progress-track"><div style="width:${n/12*100}%"></div></div><p>${n===0?'Первая победа начинается с опыта':`${n*100} XP · ${Math.floor(n/3)} из 4 значков`}</p></div></section><section class="quiz-start-card"><div><h2>Игры NOVA</h2><p>Побег из лаборатории, строительство моста и конвейер.</p></div><button type="button" class="primary" id="map-adventure">Играть →</button></section><section class="worlds">${worlds.map((w,wi)=>`<section class="world" style="--accent:${w[3]}"><div class="world-heading"><span>${w[0]}</span><div><h2>${w[1]}</h2><p>${w[2]}</p></div><b>${[0,1,2].filter(j=>state.done.includes(wi*3+j)).length}/3</b></div><div class="mission-grid">${lessons.slice(wi*3,wi*3+3).map((l,j)=>{const i=wi*3+j,done=state.done.includes(i),open=i===0||state.done.includes(i-1);return `<button class="mission-tile ${done?'done':''}" data-lesson="${i}" ${!open?'disabled':''}><span class="tile-top"><i>${l.icon}</i><small>${done?'✓ ГОТОВО':open?'ДОСТУПНО':'ЗАКРЫТО'}</small></span><h3>${l.title}</h3><p>${l.type?'Интерактивная лаборатория':'Расследование · 3 решения'}</p><span class="tile-bottom">МИССИЯ ${i+1} <b>${done?'Повторить ↗':open?'Начать →':'После предыдущей'}</b></span></button>`;}).join('')}</div></section>`).join('')}</section><section class="callout"><b>В финале у тебя будет свой проект</b><p>Паспорт помощника, инструкция и три сценария проверки. Встроенные лаборатории — учебные симуляции, без подключения к ChatGPT.</p><button class="text-button" id="change">Изменить тему проекта ↗</button></section>`);on('restart-course',restartCourse);on('map-adventure',openGames);on('continue',()=>next<0?(state.practice.comparison?portfolio():openPractice()):openLesson(next));on('change',interests);document.querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>openLesson(+b.dataset.lesson));}
let quizStarted=false;
function openLesson(i){quizStarted=false;active=i;round=0;feedback=null;examples=[];commands=[];selected=[];tokenVisits=new Set();tokenChoice=null;renderLesson();document.querySelector('h1')?.scrollIntoView({block:'start'});}
function frame(content){const l=lessons[active],w=worlds[Math.floor(active/3)];shell(`<section class="lesson-page" style="--accent:${w[3]}"><div class="lesson-meta"><button class="text-button" id="back">← К экспедиции</button><span>МИССИЯ ${active+1} / 12 · ${w[1]}</span></div><p class="eyebrow">${l.type?'ЛАБОРАТОРИЯ':'РАССЛЕДОВАНИЕ'} · БЕЗ ТАЙМЕРА</p><h1>${l.title}</h1><p class="lead">${l.goal||l.intro}</p>${content}<details class="explain"><summary>Как это связано с ИИ?</summary><p>${l.why||l.take}</p></details></section>`);on('back',map);}
function renderLesson(){
if(active===2){frame('<div id="label-lab"></div>');mountLabelLesson(document.querySelector('#label-lab'),complete);return;}
if(active===1&&!quizStarted){
  frame('<section class="lab-panel"><h2>Сначала посмотри на пример</h2><p>Представь, что сканер видел красные яблоки, но ни разу не видел зелёных. На тесте покажем ему новый предмет и проверим, что он усвоил.</p><div class="label-deck"><div><span class="label-icon">🍎</span>Было в примерах</div><div><span class="label-icon">🍏</span>Новый пример</div></div><button class="primary" id="begin-quiz">К заданиям →</button></section>');
  on('begin-quiz',()=>{quizStarted=true;quiz();});return;
}
const type=lessons[active].type;if(!type)return quiz();({train:train,robot:robot,prompt:promptLab,tokens:tokens,privacy:privacy,project:project})[type]();}
function complete(){const firstCompletion=!state.done.includes(active);if(firstCompletion)state.done.push(active);state.notes[active]=lessons[active].take;save();const w=worlds[Math.floor(active/3)];frame(`<section class="success"><span class="success-star">✦</span><p class="eyebrow">${active%3===2?'МИР ПРОЙДЕН · ЗНАЧОК ПОЛУЧЕН':'ОТКРЫТИЕ СОХРАНЕНО'}</p><h2>${active===11?'Ты — AI-изобретатель!':'Миссия выполнена'}</h2><p>${lessons[active].take}</p><div class="badge">${active%3===2?'✳ '+w[1]:(firstCompletion?'+100 XP · шаг к своему проекту':'Пройдено повторно · прогресс сохранён')}</div><button class="primary" id="next">${active===11?'К практике «Спаси перемену» →':'Следующая миссия →'}</button><button class="secondary" id="to-map">Вернуться на карту</button>${active<3?'<a class="arc-top-link" href="#games">Пауза: сыграть в мини-игру →</a>':''}</section>`);on('next',()=>active===11?openPractice():openLesson(active+1));on('to-map',map);}
function quiz() {
  const lesson = lessons[active];
  const [question, answers, correct, explanation] = lesson.rounds[round];
  const [goal, hint, wrong] = quizGuidance[lesson.title][round];
  frame(`<div class="step-dots">${lesson.rounds.map((_,i)=>`<span class="${i<=round?'lit':''}"></span>`).join('')}</div>
    <section class="lab-panel">
      <p class="eyebrow">РЕШЕНИЕ ${round+1} ИЗ ${lesson.rounds.length}</p>
      <p class="test-goal">${esc(goal)}</p>
      <h2>${esc(question)}</h2>
      <p class="muted">Выбери один вариант.</p>
      <details class="test-hint"><summary>Подсказка</summary><p>${esc(hint)}</p></details>
      <div class="options">${answers.map((answer,i)=>`<button type="button" data-answer="${i}" class="option"><span>${i+1}</span>${esc(answer)}</button>`).join('')}</div>
      <div id="course-answer-feedback" class="feedback" role="status" hidden><b id="course-answer-title"></b><p id="course-answer-reason"></p></div>
      <button id="advance" type="button" class="primary" hidden></button>
    </section>`);
  const buttons = [...document.querySelectorAll('[data-answer]')];
  const box = document.querySelector('#course-answer-feedback');
  const next = document.querySelector('#advance');
  let chosen = null;

  for (const [i, button] of buttons.entries()) {
    button.onclick = () => {
      if (chosen !== null) return;
      chosen = i;
      const ok = i === correct;
      buttons.forEach(b => { b.disabled = true; });
      button.classList.add(ok ? 'correct' : 'incorrect');
      box.classList.toggle('good', ok);
      box.classList.toggle('retry', !ok);
      document.querySelector('#course-answer-title').textContent = ok ? 'Верно' : 'Что не сходится';
      document.querySelector('#course-answer-reason').textContent = ok ? explanation : wrong[i];
      box.hidden = false;
      next.textContent = ok ? (round === lesson.rounds.length-1 ? 'Завершить миссию' : 'Следующее решение →') : 'Попробовать ещё раз';
      next.hidden = false;
      next.focus({preventScroll:true});
    };
  }
  next.onclick = () => {
    if (chosen === null) return;
    if (chosen !== correct) {
      const previous = buttons[chosen];
      chosen = null;
      buttons.forEach(b => { b.disabled = false; b.classList.remove('correct','incorrect'); });
      box.hidden = true;
      next.hidden = true;
      previous.focus({preventScroll:true});
      return;
    }
    if (++round >= lesson.rounds.length) complete();
    else quiz();
  };
}

function train(){const results=holdout.map(i=>classify(examples,i)),ok=examples.length===4&&results.every((r,i)=>r===holdout[i].label);frame(`<section class="lab-panel"><div class="simulation-label">УЧЕБНАЯ МОДЕЛЬ · БЛИЖАЙШИЕ ПРИМЕРЫ</div><p>Два признака: <b>цвет и форма</b>. Пометь каждый объект: ягода или не ягода. Модель берёт метку у самых похожих примеров; при равных голосах — сомневается.</p><div class="data-grid">${training.map((o,i)=>`<div class="data-card"><span>${o.icon}</span><p>${o.name}</p><div>${[true,false].map(v=>`<button data-label="${i},${v}" class="${examples.find(e=>e.id===i)?.label===v?'chosen':''}">${v?'Ягода':'Не ягода'}</button>`).join('')}</div></div>`).join('')}</div><h2>Испытание на новых объектах</h2><p class="muted">Это небольшой опыт с условными признаками, а не распознавание настоящих фотографий.</p><div class="test-results">${holdout.map((o,i)=>`<div><span>${o.name}</span><b>${results[i]===null?'? Недостаточно уверенности':results[i]?'Ягода':'Не ягода'}</b><small>${examples.length===4?(results[i]===o.label?'✓ Верно':'↻ Проверь метки'):''}</small></div>`).join('')}</div><p role="status">${ok?'4 из 4. Ты обучил и испытал простую модель!':`${examples.length}/4 примера размечено. Проверь, не перепутаны ли метки.`}</p><button id="finish" class="primary" ${ok?'':'disabled'}>Сохранить открытие →</button></section>`);document.querySelectorAll('[data-label]').forEach(b=>b.onclick=()=>{const [i,v]=b.dataset.label.split(',');examples=examples.filter(e=>e.id!==+i);examples.push({...training[+i],id:+i,label:v==='true'});train();});on('finish',complete);}
function robot(){frame('<div id="robot-game-root"></div>');mountRobot(document.querySelector('#robot-game-root'),{draft:state.robot,persist:d=>{state.robot=d;save();},onComplete:complete});}

const promptFields=[['goal','Цель','Придумай три идеи школьной игры'],['context','Контекст','Для шестиклассников, в классе на перемене'],['limit','Ограничения','Без покупок, без бега, на 10 минут'],['format','Формат','Название, правила и длительность каждой игры']];
function promptLab(){const p=state.prompt;frame(`<section class="lab-panel"><div class="simulation-label">КОНСТРУКТОР ПРОМПТА · ПРОВЕРКА СТРУКТУРЫ</div><p>Используй свою тему «${esc(paths[state.interest].name)}» или придумай игру на перемене. Напиши четыре части задания, затем сравни с исходным.</p><div class="form-grid">${promptFields.map(([k,t,ex])=>`<label>${t}<textarea id="p-${k}" maxlength="350" placeholder="${ex}">${esc(p[k]||'')}</textarea></label>`).join('')}</div><button id="compare" class="primary">Сравнить запросы →</button><div id="comparison" aria-live="polite"></div></section>`);promptFields.forEach(([k])=>document.querySelector('#p-'+k).oninput=e=>{state.prompt[k]=e.target.value;save();});on('compare',()=>{promptFields.forEach(([k])=>state.prompt[k]=document.querySelector('#p-'+k).value.trim());save();const score=promptScore(state.prompt);document.querySelector('#comparison').innerHTML=`<div class="comparison"><div><p class="eyebrow">ДО</p><b>«Придумай что-нибудь»</b><p>Неясно, для кого и какой результат нужен.</p></div><div><p class="eyebrow">ПОСЛЕ · ${score}/4 ЧАСТЕЙ</p><p>${esc(promptFields.map(([k])=>state.prompt[k]).join('. '))}</p><p>${score===4?'Теперь результат можно сравнить с условиями. Это проверка структуры, а не оценка качества настоящего ответа ИИ.':'В каждой части напиши хотя бы 8 символов, чтобы инструкция была содержательной.'}</p></div></div>${score===4?'<button class="primary" id="finish">Сохранить мой промпт →</button>':''}`;on('finish',complete);});}
function tokens(){const contexts=[['Обычный день','На улице идёт …',[['дождь',65],['снег',30],['поезд',5]],0],['Зимнее утро','На улице мороз, белые сугробы. На улице идёт …',[['дождь',10],['снег',85],['поезд',5]],1]];const c=contexts[tokenContext];frame(`<section class="lab-panel"><div class="simulation-label">ИГРУШЕЧНАЯ МОДЕЛЬ · ЧИСЛА ЗАДАНЫ ДЛЯ ОПЫТА</div><p>Выбери наиболее вероятное слово, затем смени контекст. Эти проценты не измерены у ChatGPT.</p><div class="tabs">${contexts.map((x,i)=>`<button data-context="${i}" class="${i===tokenContext?'chosen':''}">${x[0]}</button>`).join('')}</div><h2>${c[1]}</h2><div class="options">${c[2].map(([word,weight],i)=>`<button data-token="${i}" class="option"><b>${word}</b>${tokenChoice!==null?`<span class="weight" style="--weight:${weight}%">${weight}%</span>`:''}</button>`).join('')}</div><p role="status">${tokenChoice===null?'Предскажи продолжение.':tokenChoice===c[3]?'Да: в этом контексте модель даёт ему наибольший вес. Другие варианты всё ещё возможны.':'В этой модели у другого слова вес выше. Изучи проценты и попробуй снова.'}</p><p>${tokenVisits.size}/2 контекста исследовано. Настоящие модели делят текст на токены, которые могут быть короче целого слова.</p><button class="primary" id="finish" ${tokenVisits.size===2?'':'disabled'}>Сохранить вывод →</button></section>`);document.querySelectorAll('[data-context]').forEach(b=>b.onclick=()=>{tokenContext=+b.dataset.context;tokenChoice=null;tokens();});document.querySelectorAll('[data-token]').forEach(b=>b.onclick=()=>{tokenChoice=+b.dataset.token;if(tokenChoice===c[3])tokenVisits.add(tokenContext);tokens();});on('finish',complete);}
function privacy(){const pieces=[['Мне 12 лет',false],['Мой адрес: улица Примерная, дом 7, квартира 4',true],['Мой пароль: example-not-real-123',true],['Телефон друга: +7 000 000-00-00',true],['Придумай игру для класса на 10 минут без покупок',false]];const ok=[1,2,3].every(i=>selected.includes(i))&&selected.every(i=>[1,2,3].includes(i));frame(`<section class="lab-panel"><div class="simulation-label">ВЫМЫШЛЕННЫЕ ДАННЫЕ · НИЧЕГО НЕ ОТПРАВЛЯЕТСЯ</div><p>Нажми на фрагменты, которые нужно исключить из запроса. Возраст можно оставить для подбора сложности; точные контакты и пароль не нужны.</p><div class="options">${pieces.map(([t],i)=>`<button class="option ${selected.includes(i)?'redacted':''}" data-private="${i}" aria-pressed="${selected.includes(i)}"><span>${selected.includes(i)?'×':'+'}</span>${t}</button>`).join('')}</div><button class="primary" id="check">Проверить запрос</button><div id="privacy-result" aria-live="polite"></div></section>`);document.querySelectorAll('[data-private]').forEach(b=>b.onclick=()=>{const i=+b.dataset.private;selected=selected.includes(i)?selected.filter(x=>x!==i):[...selected,i];privacy();});on('check',()=>{document.querySelector('#privacy-result').innerHTML=ok?`<div class="feedback good"><b>Лишнее убрано. Задача осталась понятной.</b><p>${pieces.filter((_,i)=>!selected.includes(i)).map(([t])=>t).join('. ')}</p><button class="primary" id="finish">Запрос готов →</button></div>`:'<div class="feedback retry">Убери адрес, пароль и телефон друга. Сохрани условия игры и возраст для подбора сложности.</div>';on('finish',complete);});}
const projectFields=[['name','Название','Например, Генератор игр на перемене'],['audience','Для кого','Для одноклассников шестого класса'],['goal','Что делает','Предлагает три игры для класса на перемене'],['limits','Границы','Без покупок и опасных действий; не просит контакты'],['test1','Тест 1: обычный запрос → ожидаемый результат','Дай игру на 10 минут → правила, время, без покупок'],['test2','Тест 2: данных мало → ожидаемый результат','Придумай игру → уточняет возраст, место и время'],['test3','Тест 3: нарушение границ → ожидаемый результат','Попроси пароль → отказывается и возвращается к задаче']];
function project(){frame(`<section class="lab-panel"><p>Тема: ${esc(paths[state.interest].name)}. Паспорт и промпт сохранятся в твоём портфолио. Используй вымышленные примеры, без контактов людей.</p><div class="form-grid">${projectFields.map(([k,t,ph])=>`<label>${t}<textarea id="project-${k}" maxlength="500" placeholder="${ph}">${esc(state.project[k]||'')}</textarea></label>`).join('')}</div><button class="primary" id="project-save">Собрать паспорт проекта →</button><div id="project-result" aria-live="polite"></div></section>`);projectFields.forEach(([k])=>document.querySelector('#project-'+k).oninput=e=>{state.project[k]=e.target.value;save();});on('project-save',()=>{const missing=projectFields.filter(([k])=>!state.project[k]||state.project[k].trim().length<8);document.querySelector('#project-result').innerHTML=missing.length?`<p role="alert">Дополни поля: ${missing.map(([,t])=>t).join(', ')}. Хотя бы 8 символов в каждом.</p>`:'<div class="feedback good"><b>Паспорт готов к первому испытанию.</b><p>Это проверка заполнения. Качество ответов помощника ещё нужно испытать — шаблон не заменяет реальные тесты.</p><button class="primary" id="finish">В финальную экспедицию →</button></div>';on('finish',complete);});}
function quizPortfolioCard() {
  if (validateQuiz(state.quiz)) return '';
  const trial = quizTrial(state.quiz);
  return `<section class="lab-panel quiz-portfolio-card">
    <h2>${esc(state.quiz.title)}</h2>
    <p>Готовая викторина из четырёх вопросов. Ученик уточнил двусмысленный вопрос, сверил ответ с заметкой и добавил свой вопрос.</p>
    ${trial && !trial.changed ? `<p>Пробная игра — ${trial.score} из 4.</p>` : ''}
    <button type="button" class="primary" id="quiz-portfolio-play">Сыграть в викторину</button>
    <button type="button" class="secondary" id="quiz-portfolio-edit">Открыть редактор</button>
  </section>`;
}

function bindQuizPortfolio(exit) {
  on('quiz-portfolio-play',()=>mountQuizPlayer(app,state.quiz,{exit,exitLabel:'Назад к работе'}));
  on('quiz-portfolio-edit',openQuizStudio);
}

function portfolio(){if(state.interest===null){
  if(validateQuiz(state.quiz))return interests();
  shell(`<section class="page"><h1>Мои работы</h1>${quizPortfolioCard()}</section>`,false);
  bindQuizPortfolio(portfolio);
  return;
}shell(`<section class="page"><p class="eyebrow">ПОРТФОЛИО ИЗОБРЕТАТЕЛЯ</p><h1>${esc(state.project.name||'Твой будущий помощник')}</h1><p class="lead">${state.done.length}/12 миссий · ${state.done.length*100} XP · тема: ${esc(paths[state.interest].name)}</p><div class="badge-row">${worlds.map((w,i)=>`<span class="badge ${[0,1,2].every(j=>state.done.includes(i*3+j))?'earned':'locked'}">✳ ${w[1]}</span>`).join('')}</div>${quizPortfolioCard()}${practiceCard(state.practice,esc)}<div class="portfolio-grid"><section class="lab-panel"><h2>Паспорт проекта</h2>${projectFields.map(([k,t])=>`<div class="portfolio-row"><b>${t}</b><p>${esc(state.project[k]||'Появится в миссии 11')}</p></div>`).join('')}</section><section class="lab-panel"><h2>Моя инструкция</h2><p class="prompt-output">${esc(promptFields.map(([k,t])=>state.prompt[k]?t+': '+state.prompt[k]:'').filter(Boolean).join('\n')||'Соберёшь в миссии 5')}</p><h2>Мои открытия</h2>${state.done.sort((a,b)=>a-b).map(i=>`<p class="discovery">✓ ${lessons[i].take}</p>`).join('')||'<p>Пройди первую лабораторию, чтобы сохранить открытие.</p>'}</section></div><section class="callout"><h2>Следующий шаг — испытать в реальности</h2><p>Покажи паспорт родителю или учителю. Вместе выберите подходящий сервис, запустите три теста и запишите, что получилось. В этой версии настоящая языковая модель не подключена.</p><a class="arc-top-link" href="#resources">Что попробовать после курса →</a><button id="export" class="primary">Скачать портфолио (.json)</button><button id="print" class="secondary">Печать / сохранить PDF</button><button id="resume" class="text-button">Вернуться к миссиям →</button></section></section>`);bindQuizPortfolio(portfolio);on('resume',map);on('print',()=>window.print());on('export',()=>{const blob=new Blob([JSON.stringify({course:'NOVA AI LAB',version:3,exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nova-ai-portfolio.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});}
function about(){shell(`<section class="page prose"><p class="eyebrow">ДЛЯ РОДИТЕЛЕЙ И ПЕДАГОГОВ</p><h1>Понимать ИИ.<br>Думать самостоятельно.</h1><p class="lead">Практический вводный маршрут для шестиклассника. Его результат — первые навыки проверки ИИ и паспорт собственного помощника.</p>${quizPortfolioCard()}<section class="lab-panel"><h2>Чему учится ребёнок</h2><p>Обучающие и проверочные примеры, разнообразие данных, разметка, алгоритмы, структура промпта, генерация текста, проверка утверждений, приватность, внедрение инструкций, критерии испытаний.</p><h2>Как устроено обучение</h2><p>12 миссий в четырёх мирах. Лаборатории чередуются с ситуационными задачами. Ошибки можно исправить без штрафа. Миссии доступны последовательно, пройденные можно повторять.</p><h2>Как оценить практический финал</h2><p>Откройте «Спаси перемену» в портфолио. Посмотрите, задал ли ребёнок три условия в запросе, привёл ли фразу с ошибкой, исправил ли запрос и объяснил ли, что ещё нужно проверить. Для каждого действия отметьте «самостоятельно», «с подсказкой» или «пока не получилось». Для проверки переноса предложите новую задачу, например разминку для всей команды в небольшом зале на 10 минут без инвентаря.</p><h2>Что важно понимать</h2><p>Лаборатории — упрощённые учебные модели. Нова не подключена к ChatGPT и не ведёт свободный разговор. Прохождение не подтверждает профессиональную квалификацию. Интерес и понятность курса нужно проверить на реальных учениках.</p><h2>Данные и прогресс</h2><p>Курс сохраняет ник, ответы конструктора и проект только в браузере этого устройства. Очистка данных браузера удалит прогресс. Автоматической синхронизации между устройствами нет. Скачайте портфолио, чтобы сохранить результат. Экспорт содержит введённый ник и проект.</p><h2>Доступ</h2><p>Курс открывается по ссылке. Прогресс и черновики сохраняются в браузере устройства.</p><h2>Живой ИИ — следующий этап</h2><p>Подключение требует серверного API, ключа владельца, ограничений расходов и сценария работы с детьми. Ключ нельзя хранить в коде страницы или просить у ребёнка. До подключения все миссии работают автономно.</p></section><button id="return" class="primary">${state.name===null?'Начать экспедицию':'Вернуться в лабораторию'}</button></section>`,false);bindQuizPortfolio(about);on('return',()=>state.name===null?welcome():map());}
function finalPromptText(){const p=paths[state.interest]||{name:'мой проект'};const name=state.project.name||`${p.name}‑помощник`;const goal=state.project.goal||state.prompt.goal||'помогать с одной понятной задачей';const audience=state.project.audience||'школьнику';const limits=state.project.limits||state.prompt.limit||'не использовать личные данные';return `Помоги создать прототип «${name}».\nДля кого: ${audience}.\nТема: ${p.name}.\nЦель: ${goal}.\nОграничения: ${limits}.\nСначала задай до трёх коротких уточняющих вопросов. Затем предложи результат простым русским языком. Не проси пароль, адрес, телефон, школу или личные фотографии. Если данных недостаточно или ты не уверен — прямо скажи, что нужно проверить. Не принимай решение за человека.`;}
const basePortfolio=portfolio;portfolio=()=>{basePortfolio();const target=document.querySelector('.callout');if(!target)return;const prompt=finalPromptText();target.insertAdjacentHTML('beforeend',`<section class="lab-panel final-prompt"><h2>Готовый запрос для AI</h2><p>Это старт для создания <b>${esc(state.project.name||'твоего помощника')}</b>. Вставляй его в нейросеть вместе с родителем или учителем.</p><textarea id="final-prompt" readonly>${esc(prompt)}</textarea><button id="copy-final-prompt" class="primary">Скопировать запрос</button><p id="copy-status" class="muted" aria-live="polite"></p></section>`);on('copy-final-prompt',async()=>{const status=document.querySelector('#copy-status');try{await navigator.clipboard.writeText(prompt);status.textContent='Скопировано. Можно вставить в выбранную нейросеть.';}catch{const field=document.querySelector('#final-prompt');field.focus();field.select();status.textContent='Запрос выделен — скопируй его вручную.';}});};
let trainStage=0;const baseOpenLesson=openLesson;openLesson=i=>{trainStage=0;baseOpenLesson(i);};
train=()=>{if(trainStage<2){
  const first=trainStage===0;
  frame(`<section class="lab-panel"><h2>${first?'Один кот, два способа увидеть':'Проверим, чему научилась модель'}</h2>
    ${first?catVision():'<div class="label-deck"><div><span class="label-icon">🐱 🛋️</span>Кот на диване</div><div><span class="label-icon">🐶 🌿</span>Собака на траве</div></div><p>Если модель видела только такие примеры, она может принять кота на траве за собаку. Добавим животных на разных фонах и проверим её снова.</p>'}
    ${first?'<p>Нейросеть — модель, которая учится замечать закономерности в примерах. Подпись «кот» помогает ей связать цвета и формы с названием.</p>':''}
    <button class="primary" id="train-next">${first?'Посмотреть, как модель ошибается →':'Разметить картинки →'}</button></section>`);
  on('train-next',()=>{trainStage++;train();});return;
}
const results=holdout.map(i=>classify(examples,i)),ok=examples.length===4&&results.every((r,i)=>r===holdout[i].label);frame(`<section class="lab-panel"><p class="eyebrow">ТВОЁ ЗАДАНИЕ</p><h2>Научи учебную модель различать животных</h2><p><b>Действие:</b> подпиши 4 обучающих примера. <b>Условия:</b> обучающие карточки — сверху, испытание — на новых карточках ниже. <b>Успех:</b> модель верно определяет всех 4 новых животных.</p><div class="data-grid">${training.map((o,i)=>`<div class="data-card"><span>${o.icon}</span><p>${o.name}</p><div>${[true,false].map(v=>`<button data-label="${i},${v}" class="${examples.find(e=>e.id===i)?.label===v?'chosen':''}">${v?'Кот':'Собака'}</button>`).join('')}</div></div>`).join('')}</div><h2>Проверь результат</h2><div class="test-results">${holdout.map((o,i)=>`<div><span>${o.name}</span><b>${results[i]===null?'? жду примеры':results[i]?'кот':'собака'}</b><small>${examples.length===4?(results[i]===o.label?'✓':'↻ проверь метки'):''}</small></div>`).join('')}</div><p id="train-status" role="status">${ok?'Испытание пройдено: примеры помогли модели различать животных независимо от фона.':`${examples.length}/4 примера подписано. Подсказка: подпиши животное, а не фон.`}</p><button id="finish" class="primary" ${ok?'':'disabled'}>Сохранить открытие →</button></section>`);document.querySelectorAll('[data-label]').forEach(b=>b.onclick=()=>{const [i,v]=b.dataset.label.split(',');examples=examples.filter(e=>e.id!==+i);examples.push({...training[+i],id:+i,label:v==='true'});train();});on('finish',complete);};
function restartCourse() {
  if (!window.confirm('Начать курс заново? Прогресс миссий, проект и практическая работа будут удалены с этого устройства. Свои викторина и карта игры сохранятся.')) return;
  const reset = {
    name:null,interest:null,done:[],notes:{},project:{},prompt:{},practice:{},
    quiz:state.quiz,adventure:state.adventure,
  };
  try {
    localStorage.setItem(key,JSON.stringify(reset));
  } catch {
    window.alert('Не удалось сбросить прогресс. Разреши сайту сохранять данные в браузере и попробуй снова.');
    return;
  }
  state=reset;
  history.replaceState(null,'',location.pathname+location.search);
  welcome();
  window.scrollTo(0,0);
}

function showCourse() {
  if(state.name===null) welcome();
  else if(state.interest===null) interests();
  else map();
}

function openPractice() {
  if (!state.done.includes(11)) return showCourse();
  shell('<div id="practice-root"></div>');
  mountPractice(document.querySelector('#practice-root'),{
    saved:state.practice, persist:draft=>{state.practice=draft;save();},
    exit:map, portfolio, escape:esc,
  });
}

function openQuizStudio() {
  shell('<div id="quiz-studio-root"></div>',state.interest!==null);
  mountQuizStudio(document.querySelector('#quiz-studio-root'),{
    saved:state.quiz,
    persist:draft=>{state.quiz=draft;save();},
    exit:showCourse,
  });
}

function leaveGames(callback) {
  if (location.hash==='#resources' || /^#games(?:-|$)/.test(location.hash)) history.replaceState(null,'',location.pathname+location.search);
  callback();
}

function openGames() {
  if (location.hash !== '#games') {
    location.hash = '#games';
    return;
  }
  shell(`<section class="arc-hub"><button class="text-button" id="games-back">← К курсу</button>
    <h1 tabindex="-1">Игры NOVA</h1>
    <div class="arc-links">
      <a class="arc-card" href="#games-escape"><span class="arc-card-art" aria-hidden="true">◈</span><b>Побег из лаборатории</b><span>Собери чипы и обойди дрон.</span></a>
      <a class="arc-card" href="#games-bridge"><span class="arc-card-art bridge" aria-hidden="true">╱▰╲</span><b>Мост для робота</b><span>Построй переправу и испытай её под нагрузкой.</span></a>
      <a class="arc-card" href="#games-sorter"><span class="arc-card-art sort" aria-hidden="true">● ■ ▲</span><b>Конвейер меток</b><span>Распредели детали, пока они движутся по ленте.</span></a>
    </div><button class="text-button" id="games-quiz">Мастерская викторин →</button></section>`,state.interest!==null);
  on('games-quiz',()=>leaveGames(openQuizStudio));
  on('games-back',()=>leaveGames(showCourse));
  document.querySelector('.arc-hub').scrollIntoView({block:'start'});
  document.querySelector('.arc-hub h1').focus({preventScroll:true});
}

function openArcade(mount) {
  shell('<div id="arcade-root"></div>',state.interest!==null);
  mount(document.querySelector('#arcade-root'),openGames);
}

function openAdventureGame() {
  shell('<div id="adventure-game-root"></div>',state.interest!==null);
  mountAdventurePlayer(document.querySelector('#adventure-game-root'),defaultAdventure,{
    exit:openGames,
    exitLabel:'К играм',
    build:openAdventureStudio,
  });
}

function openAdventureStudio() {
  shell('<div id="adventure-studio-root"></div>',state.interest!==null);
  mountAdventureStudio(document.querySelector('#adventure-studio-root'),{
    saved:state.adventure,
    persist:draft=>{state.adventure=draft;save();},
    exit:openAdventureGame,
  });
}

function openResources() {
  shell(resourcesPage(),state.interest!==null);
  on('resources-back',()=>leaveGames(showCourse));
  const heading=app.querySelector('h1');
  heading.scrollIntoView({block:'start'});
  heading.focus({preventScroll:true});
}

function openInitialScreen() {
  if(location.hash==='#resources') return openResources();
  if(location.hash==='#games') return openGames();
  if(location.hash==='#games-bridge') return openArcade(mountBridge);
  if(location.hash==='#games-sorter') return openArcade(mountSorter);
  if(location.hash==='#games-escape') return openAdventureGame();
  const isAdventure=location.hash.startsWith('#adventure=');
  if(!isAdventure&&!location.hash.startsWith('#quiz=')) {
    showCourse();
    return;
  }
  const sharedQuiz=isAdventure?null:decodeQuiz(location.hash);
  const exit=()=>{
    history.replaceState(null,'',location.pathname+location.search);
    showCourse();
  };
  if(isAdventure) {
    const game=decodeAdventure(location.hash);
    if(game) {
      mountAdventurePlayer(app,game,{exit});
      return;
    }
  }
  if(sharedQuiz) {
    mountQuizPlayer(app,sharedQuiz,{exit});
    return;
  }
  app.innerHTML='<section class="quiz-studio"><h1>Ссылка на игру не открылась</h1><p>Попроси автора скопировать ссылку целиком.</p><button type="button" class="primary" id="quiz-return">Открыть курс</button></section>';
  on('quiz-return',exit);
}

window.addEventListener('hashchange',openInitialScreen);
openInitialScreen();
