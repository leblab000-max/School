const pixels = [
  '............',
  '..O......O..',
  '..OO....OO..',
  '..OPOOOOPO..',
  '..OOOOOOOO..',
  '..ODOLLODO..',
  '..OOOOOOOO..',
  '..OOWPWWOO..',
  '...OWWWWO...',
  '....OOOO....',
  '............',
  '............',
];
const colors = { '.':'#bce9db', O:'#edaa56', P:'#f5919c', W:'#fff4df', D:'#223149', L:'#ffd188' };

export function catVision() {
  const image = pixels.join('').split('');
  return `<div class="vision-grid">
    <figure><div class="vision-cat" role="img" aria-label="Рыжий кот с ушами, глазами и розовым носом">${image.map(pixel=>`<i style="background:${colors[pixel]}"></i>`).join('')}</div><figcaption><b>Ты видишь кота</b><br>Узнаёшь уши, глаза и мордочку.</figcaption></figure>
    <figure><div class="vision-cat vision-numbers" role="img" aria-label="То же изображение как сетка цветных пикселей">${image.map((pixel,index)=>`<i class="${index===50?'sample':''}" style="background:${colors[pixel]}"></i>`).join('')}</div><figcaption><b>Компьютер получает цвета пикселей</b><br>Выделенная клетка — 237 красного, 170 зелёного и 86 синего.</figcaption></figure>
  </div>`;
}

const cards = [
  { icon:'🍎', name:'Красное яблоко', shape:'round', color:'red' },
  { icon:'🧱', name:'Красный кирпич', shape:'long', color:'red' },
  { icon:'🍏', name:'Зелёное яблоко', shape:'round', color:'green' },
  { icon:'🍐', name:'Зелёная груша', shape:'pear', color:'green' },
];

export function classifyCard(examples, labels, item) {
  const distances = examples.map(example=>Number(example.shape!==item.shape)*2+Number(example.color!==item.color));
  const best=Math.min(...distances);
  const guesses=labels.filter((_,i)=>distances[i]===best);
  return guesses.length && guesses.every(guess=>guess===guesses[0]) ? guesses[0] : null;
}

export function mountLabelLesson(root, complete) {
  const expected = cards.map(card=>card.name.includes('яблоко'));
  const labels = [];
  let stage = 0;
  const face = card=>`<span class="label-icon" aria-hidden="true">${card.icon}</span><strong>${card.name}</strong>`;
  function render() {
    root.innerHTML = stage === 0 ? `<section class="lab-panel">
      <h2>Почему сканер перепутал кирпич с яблоком?</h2>
      <p>На обучении ему показали только красные яблоки. Теперь он считает яблоком всё красное.</p>
      <div class="label-deck"><div>${face(cards[0])}<p>Метка «яблоко»</p></div><div>${face(cards[1])}<p>Сканер ошибся: «яблоко»</p></div></div>
      <button class="primary" id="label-next">Подписать примеры →</button>
    </section>` : stage === 1 ? `<section class="lab-panel">
      <h2>Подпиши четыре примера</h2>
      <p>Метка — это ответ, который мы даём модели вместе с примером.</p>
      <div class="label-deck">${cards.map((card,i)=>`<div>${face(card)}<div class="label-controls">${[true,false].map(value=>`<button type="button" class="secondary" data-label-card="${i}" data-value="${value}" aria-pressed="${labels[i]===value}">${value?'Яблоко':'Не яблоко'}</button>`).join('')}</div></div>`).join('')}</div>
      <p id="label-feedback" role="status"></p><button class="primary" id="label-next">Проверить метки →</button>
    </section>` : `<section class="lab-panel"><h2>Испытай новое правило</h2>
      <p>В этой модели форма важнее цвета. Она сравнивает новые предметы с подписанными примерами.</p>
      <div class="label-deck"><div>🍎 <strong>Яблоко с жёлтым боком</strong></div><div>🧣 <strong>Красный шарф</strong></div></div>
      <p id="label-feedback" role="status"></p><button class="primary" id="label-next">Запустить проверку →</button></section>`;
    const next = root.querySelector('#label-next');
    root.querySelectorAll('[data-label-card]').forEach(button=>button.onclick=()=>{
      const i=Number(button.dataset.labelCard);
      labels[i]=button.dataset.value==='true';
      root.querySelectorAll(`[data-label-card="${i}"]`).forEach(choice=>choice.setAttribute('aria-pressed',String(choice===button)));
      root.querySelector('#label-feedback').textContent='';
    });
    next.onclick=()=>{
      const feedback=root.querySelector('#label-feedback');
      if(stage===1) {
        const wrong=expected.findIndex((value,i)=>value!==labels[i]);
        if(wrong>=0) {
          feedback.textContent=labels[wrong]===undefined?'Выбери метку для каждой карточки.':`Перепроверь карточку «${cards[wrong].name}». Смотри, какой это предмет.`;
          return;
        }
      }
      if(stage===2) {
        const verdict = item => {
          const guess=classifyCard(cards,labels,item);
          return guess===null?'не уверен':guess?'яблоко':'не яблоко';
        };
        feedback.textContent=`Яблоко с жёлтым боком → ${verdict({shape:'round',color:'yellow'})}. Красный шарф → ${verdict({shape:'long',color:'red'})}. Одинаковый цвет не всегда означает одинаковый предмет.`;
        next.textContent='Завершить миссию';
        next.onclick=complete;
        return;
      }
      stage++;
      render();
      const heading=root.querySelector('h2');
      heading.tabIndex=-1;
      heading.focus({preventScroll:true});
    };
  }
  render();
}
