export const bridgeLevels = [
  { name: 'Посылка', span: 5, budget: 10, target: 7, cargo: [2] },
  { name: 'Два груза', span: 6, budget: 18, target: 15, cargo: [2, 3] },
  { name: 'Тяжёлый рейс', span: 7, budget: 28, target: 25, cargo: [3, 4] },
];
export const materials = {
  wood: { label: 'Дерево', cost: 1, strength: 2 },
  alloy: { label: 'Сплав', cost: 2, strength: 3 },
  carbon: { label: 'Композит', cost: 3, strength: 4 },
  steel: { label: 'Сталь', cost: 4, strength: 5 },
};
export const supportCost = 2;

export function bridgeStars(spent, target) {
  return spent <= target ? 3 : spent <= target + 1 ? 2 : 1;
}

export function bridgeCost(deck, supports) {
  return deck.reduce((total, piece) => total + (materials[piece]?.cost ?? 0), 0) + supports.size * supportCost;
}

export function inspectBridge(deck, supports, cargo) {
  const anchors = [-1, ...supports, deck.length];
  return deck.map((piece, i) => {
    const distance = Math.min(...anchors.map(anchor => Math.abs(i - anchor)));
    const demand = cargo + Math.max(0, distance - 1);
    return { demand, strength: materials[piece]?.strength ?? 0 };
  });
}

export function sortResult(item, bin) {
  return item.mark === bin;
}

const marks = [
  { mark: 'round', icon: '●', label: 'Круг', color: 'aqua' },
  { mark: 'square', icon: '■', label: 'Квадрат', color: 'purple' },
  { mark: 'triangle', icon: '▲', label: 'Треугольник', color: 'gold' },
  { mark: 'diamond', icon: '◆', label: 'Ромб', color: 'pink' },
  { mark: 'star', icon: '★', label: 'Звезда', color: 'lime' },
];

export const shifts = [
  { count: 10, goal: 8, duration: 4600, shapes: 3, label: 'Обычные детали' },
  { count: 14, goal: 11, duration: 3500, shapes: 4, label: 'Новые детали и цвета' },
  { count: 18, goal: 15, duration: 2800, shapes: 5, label: 'Ускоренная лента' },
];

export function sorterBatch(round, seed) {
  const { count, shapes } = shifts[round];
  const offset = (seed >>> 0) % shapes;
  return Array.from({ length: count }, (_, i) => {
    const index = (i + Math.floor(i / shapes) + offset) % shapes;
    const mismatch = round > 0 && (round === 2 || i % 3 !== 0);
    const colorIndex = mismatch ? (index + 1 + i % (shapes - 1)) % shapes : index;
    return { ...marks[index], color: marks[colorIndex].color, guess: marks[colorIndex].label };
  });
}

function focusGame(section) {
  section.scrollIntoView({ block: 'start' });
  section.querySelector('h1').focus({ preventScroll: true });
}

export function mountBridge(root, exit) {
  root.innerHTML = `<section class="arc-game arc-bridge">
    <button class="text-button" type="button" data-bridge="leave">← К играм</button>
    <h1 tabindex="-1">Мост для робота</h1>
    <div class="arc-bridge-meta"><strong id="bridge-level"></strong><span id="bridge-funds"></span></div>
    <p id="bridge-goal"></p><p id="bridge-rating"></p>
    <div class="arc-ravine" aria-label="Схема моста">
      <div class="arc-mountains" aria-hidden="true"></div><div class="arc-river" aria-hidden="true"></div>
      <div class="arc-bank left" aria-hidden="true"></div><div class="arc-bank right" aria-hidden="true"></div>
      <div class="arc-traveller" aria-hidden="true"><i></i><span></span></div>
      <div class="arc-span"></div>
    </div>
    <p class="arc-status" id="bridge-message" role="status"></p>
    <div class="arc-palette" aria-label="Инструменты">
      ${Object.entries(materials).map(([key, item]) => `<button type="button" data-tool="${key}"><i class="arc-material ${key}"></i><b>${item.label}</b><small>${item.cost} мон. · прочность ${item.strength}</small></button>`).join('')}
      <button type="button" data-tool="support"><i class="arc-material support"></i><b>Опора</b><small>2 мон.</small></button>
      <button type="button" data-tool="erase"><b>Убрать деталь</b><small>Вернуть монеты</small></button>
    </div>
    <div class="arc-actions"><button class="primary" type="button" data-bridge="test">Отправить машину</button>
    <button class="secondary" type="button" data-bridge="repair" hidden>Вернуться к чертежу</button><button class="secondary" type="button" data-bridge="clear">Очистить мост</button>
    <button class="primary" type="button" data-bridge="next" hidden>Следующий груз →</button></div>
    <details class="explain"><summary>Как считается прочность?</summary><p>Секция над опорой или рядом с ней держит вес, равный своей прочности. За каждую следующую клетку от опоры нагрузка растёт на 1. Берега тоже считаются опорами. Это упрощённая модель: её можно проверить на разных грузах и исправить конструкцию после испытания.</p></details>
  </section>`;
  const game = root.firstElementChild;
  const get = selector => game.querySelector(selector);
  const message = get('#bridge-message');
  const span = get('.arc-span');
  const traveller = get('.arc-traveller');
  let level = 0;
  let deck, supports, running, passed, failure, stars;
  let tool = 'wood';
  let timer;

  function reset() {
    clearTimeout(timer);
    deck = Array(bridgeLevels[level].span).fill(null);
    supports = new Set();
    running = false;
    passed = false;
    failure = -1;
    stars = 0;
    get('.arc-ravine').classList.remove('collapsed');
    traveller.style.left = '3%';
    message.textContent = 'Выбери материал и нажми на клетку. Опора ставится под секцию.';
    render();
  }

  function render() {
    const challenge = bridgeLevels[level];
    get('#bridge-level').textContent = `${level + 1}/${bridgeLevels.length} · ${challenge.name}`;
    get('#bridge-funds').textContent = `Монеты: ${challenge.budget - bridgeCost(deck, supports)}/${challenge.budget}`;
    get('#bridge-goal').textContent = `Провези груз весом ${challenge.cargo.join(' и ')}. Уложись в бюджет.`;
    get('#bridge-rating').textContent = stars
      ? `${'★'.repeat(stars)}${'☆'.repeat(3-stars)} · Потрачено ${bridgeCost(deck, supports)} мон.`
      : `★★★ до ${challenge.target} мон. · ★★ до ${challenge.target + 1} мон. · ★ при остальных тратах в пределах бюджета`;
    span.style.setProperty('--sections', deck.length);
    const activeCell = document.activeElement?.dataset.section;
    const loads = inspectBridge(deck, supports, challenge.cargo.at(-1));
    span.innerHTML = deck.map((piece, i) => {
      const load = loads[i];
      const built = piece ? `${materials[piece].label}, прочность ${load.strength}, нагрузка ${load.demand}` : 'пусто';
      return `<button type="button" class="arc-slot ${piece ?? 'empty'}${supports.has(i) ? ' supported' : ''}${failure === i ? ' cracked' : ''}" style="--fall-delay:${failure < 0 ? 0 : Math.abs(i - failure) * 70}ms;--tilt:${(i % 2 ? -1 : 1) * (15 + i * 8)}deg" data-section="${i}" aria-label="Секция ${i + 1}, ${built}${supports.has(i) ? ', с опорой' : ''}" aria-disabled="${running || passed || failure >= 0}"><b>${i + 1}</b>${piece ? `<small>${load.strength}/${load.demand}</small>` : '<small>+</small>'}</button>`;
    }).join('');
    if (activeCell !== undefined) get(`[data-section="${activeCell}"]`)?.focus({ preventScroll: true });
    game.querySelectorAll('[data-tool]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.tool === tool)); });
    get('[data-bridge="test"]').disabled = running || passed || failure >= 0;
    get('[data-bridge="repair"]').hidden = failure < 0;
    get('[data-bridge="clear"]').disabled = running;
    get('[data-bridge="next"]').hidden = !passed || level === bridgeLevels.length - 1;
  }

  function place(i) {
    if (running || passed || failure >= 0) return;
    const old = deck[i];
    const hadSupport = supports.has(i);
    if (tool === 'support') {
      if (hadSupport) supports.delete(i); else supports.add(i);
    } else if (tool === 'erase') {
      if (old) deck[i] = null; else supports.delete(i);
    } else {
      deck[i] = old === tool ? null : tool;
    }
    if (bridgeCost(deck, supports) > bridgeLevels[level].budget) {
      deck[i] = old;
      if (hadSupport) supports.add(i); else supports.delete(i);
      message.textContent = 'Монет не хватило. Убери деталь или выбери более дешёвый материал.';
    } else {
      failure = -1;
      get('.arc-ravine').classList.remove('collapsed');
      traveller.style.left = '3%';
      message.textContent = 'Числа на секциях показывают прочность / нагрузку от самого тяжёлого груза.';
    }
    render();
  }

  function test() {
    if (running || passed || failure >= 0) return;
    const cargo = bridgeLevels[level].cargo;
    running = true;
    get('.arc-ravine').classList.remove('collapsed');
    traveller.style.left = '3%';
    failure = -1;
    render();
    let trip = 0;
    let i = 0;
    let loads = inspectBridge(deck, supports, cargo[trip]);
    message.textContent = `Машина везёт груз весом ${cargo[trip]}.`;
    function step() {
      if (!game.isConnected) return;
      traveller.style.left = i < deck.length ? `${15 + (i + .5) * 70 / deck.length}%` : '96%';
      if (i < deck.length) {
        const { demand, strength } = loads[i];
        if (strength < demand) {
          failure = i;
          running = false;
          message.textContent = strength
            ? `Секция ${i + 1} не выдержала. Прочность ${strength}, нагрузка ${demand}. Поставь опору ближе или замени материал.`
            : `Машина упала. В секции ${i + 1} нет настила.`;
          render();
          get('.arc-ravine').classList.add('collapsed');
          return;
        }
        i++;
        timer = setTimeout(step, 250);
      } else if (trip + 1 < cargo.length) {
        trip++;
        i = 0;
        loads = inspectBridge(deck, supports, cargo[trip]);
        message.textContent = `Первый груз доставлен. Проверяем вес ${cargo[trip]}.`;
        timer = setTimeout(() => {
          if (!game.isConnected) return;
          traveller.style.left = '3%';
          timer = setTimeout(step, 280);
        }, 350);
      } else {
        running = false;
        passed = true;
        stars = bridgeStars(bridgeCost(deck, supports), bridgeLevels[level].target);
        message.textContent = level === bridgeLevels.length - 1 ? 'Все три испытания пройдены. Грузы доставлены!' : 'Мост выдержал. Груз доставлен!';
        render();
      }
    }
    timer = setTimeout(step, 220);
  }

  game.onclick = event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.section !== undefined) return place(Number(button.dataset.section));
    if (button.dataset.tool) {
      tool = button.dataset.tool;
      render();
      return;
    }
    switch (button.dataset.bridge) {
      case 'leave': clearTimeout(timer); exit(); break;
      case 'test': test(); break;
      case 'clear': reset(); break;
      case 'repair':
        message.textContent = `Измени секцию ${failure + 1} или поставь опору рядом. Детали и монеты сохранены.`;
        failure = -1;
        get('.arc-ravine').classList.remove('collapsed');
        traveller.style.left = '3%';
        render();
        get('[data-bridge="test"]').focus({ preventScroll: true });
        break;
      case 'next': level++; reset(); break;
    }
  };
  reset();
  focusGame(game);
}

export function mountSorter(root, exit) {
  root.innerHTML = `<section class="arc-game arc-sorter">
    <button class="text-button" type="button" data-sort="leave">← К играм</button>
    <h1 tabindex="-1">Конвейер меток</h1>
    <p>Отправляй детали в контейнеры по форме. Можно нажать контейнер или клавиши с номерами на контейнерах. С каждой сменой деталей больше, а лента быстрее.</p>
    <div class="arc-bridge-meta"><strong id="sort-level"></strong><span id="sort-score"></span></div>
    <div class="arc-machine">
      <div class="arc-belt" aria-label="Лента конвейера"><div id="sort-item" class="arc-item" hidden></div><div class="arc-endline" aria-hidden="true"></div></div>
      <div class="arc-time" aria-hidden="true"><i></i></div>
    </div>
    <p class="arc-guess" id="sort-guess"></p>
    <div class="arc-bins" aria-label="Контейнеры">${marks.map(({mark,icon,label},i)=>`<button type="button" data-bin="${mark}"><b>${icon}</b><span>${label}</span><small>${i+1}</small></button>`).join('')}</div>
    <p class="arc-status" id="sort-message" role="status"></p>
    <div class="arc-actions"><button class="primary" type="button" data-sort="start">Запустить ленту</button>
    <button class="secondary" type="button" data-sort="pause" hidden>Пауза</button>
    <button class="secondary" type="button" data-sort="retry" hidden>Начать смену заново</button></div>
    <details class="explain"><summary>Почему сканер ошибается?</summary><p>На первой смене цвет всегда совпадает с формой. На второй цвета меняются местами, и правило сканера даёт сбой. Так можно проверить, какой признак действительно помогает различать предметы.</p></details>
  </section>`;
  const game = root.firstElementChild;
  const get = selector => game.querySelector(selector);
  const item = get('#sort-item');
  const guess = get('#sort-guess');
  const message = get('#sort-message');
  const timebar = get('.arc-time i');
  const start = get('[data-sort="start"]');
  const pause = get('[data-sort="pause"]');
  const retry = get('[data-sort="retry"]');
  let round = 0;
  let seed = Math.floor(Math.random() * 10000);
  let batch, index, score, status, elapsed, last, animation, phase;

  function hud() {
    const shift = shifts[round];
    get('#sort-level').textContent = `Смена ${round + 1}/${shifts.length} · ${shift.label}`;
    get('#sort-score').textContent = `Верно: ${score} · Цель: ${shift.goal} · Детали: ${index}/${shift.count}`;
    game.querySelectorAll('[data-bin]').forEach((bin, i) => {
      bin.hidden = i >= shift.shapes;
      bin.disabled = bin.hidden || status !== 'running' || phase !== 'moving';
    });
    start.hidden = status === 'running';
    pause.hidden = status !== 'running';
    retry.hidden = status === 'ready';
  }

  function ready() {
    cancelAnimationFrame(animation);
    batch = sorterBatch(round, seed);
    index = score = elapsed = 0;
    status = 'ready';
    phase = 'moving';
    game.querySelectorAll('[data-bin]').forEach(button => { delete button.dataset.result; });
    item.hidden = true;
    timebar.style.transform = 'scaleX(1)';
    start.textContent = 'Запустить ленту';
    guess.textContent = 'Сканер подсказывает форму по цвету.';
    message.textContent = round ? 'На этот раз цвет может обмануть. Смотри на форму.' : 'Рассмотри форму и выбери контейнер, пока деталь на ленте.';
    hud();
  }

  function showItem() {
    phase = 'moving';
    game.querySelectorAll('[data-bin]').forEach(button => { delete button.dataset.result; });
    elapsed = 0;
    const current = batch[index];
    item.hidden = false;
    item.className = 'arc-item ' + current.color;
    item.textContent = current.icon;
    item.setAttribute('aria-label', `Деталь: ${current.label}`);
    guess.textContent = `Сканер по цвету: ${current.guess.toLowerCase()}`;
    position();
    hud();
  }

  function position() {
    const duration = shifts[round].duration;
    const progress = Math.min(1, elapsed / duration);
    item.style.left = `${6 + 84 * progress}%`;
    timebar.style.transform = `scaleX(${1 - progress})`;
  }

  function finish() {
    status = 'ended';
    guess.textContent = 'Лента остановлена.';
    const { goal, count } = shifts[round];
    const won = score >= goal;
    const more = round + 1 < shifts.length;
    message.textContent = !won ? `Верно ${score} из ${count}. Попробуй ещё раз, цель — ${goal}.`
      : more ? 'Смена пройдена. Дальше деталей больше, а времени на каждую меньше.'
        : `Все три смены пройдены. В последней верно ${score} из ${count}!`;
    start.textContent = won && more ? 'Следующая смена →' : 'Сыграть снова';
    hud();
  }

  function resolve(bin) {
    if (status !== 'running' || phase !== 'moving') return;
    const current = batch[index];
    const correct = sortResult(current, bin);
    if (correct) score++;
    if (bin) get(`[data-bin="${bin}"]`).dataset.result = correct ? 'right' : 'wrong';
    if (document.activeElement?.dataset.bin) get('.arc-belt').focus({ preventScroll: true });
    index++;
    phase = 'feedback';
    elapsed = 0;
    item.hidden = true;
    timebar.style.transform = 'scaleX(0)';
    message.textContent = correct ? `${current.label} на месте.`
      : bin ? `Эта деталь — ${current.label.toLowerCase()}. Выбран другой контейнер.` : 'Деталь доехала до конца ленты. Следующая уже едет.';
    hud();
  }

  function tick(now) {
    if (!game.isConnected || status !== 'running') return;
    if (document.hidden) return suspend();
    elapsed += Math.max(0, now - last);
    last = now;
    if (phase === 'moving') {
      position();
      if (elapsed >= shifts[round].duration) resolve(null);
    } else if (elapsed >= 480) {
      if (index === batch.length) return finish();
      showItem();
    }
    animation = requestAnimationFrame(tick);
  }

  function suspend() {
    status = 'paused';
    cancelAnimationFrame(animation);
    start.textContent = 'Продолжить смену';
    hud();
  }

  function launch() {
    if (status === 'ended') {
      if (score >= shifts[round].goal) round = (round + 1) % shifts.length;
      seed++;
      ready();
    }
    if (status !== 'paused') showItem();
    status = 'running';
    last = performance.now();
    hud();
    animation = requestAnimationFrame(tick);
    game.querySelector('.arc-belt').focus({ preventScroll: true });
  }

  game.querySelector('.arc-belt').tabIndex = -1;
  game.onclick = event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.bin) return resolve(button.dataset.bin);
    switch (button.dataset.sort) {
      case 'leave': cancelAnimationFrame(animation); exit(); break;
      case 'start': launch(); break;
      case 'pause': suspend(); start.focus({ preventScroll: true }); break;
      case 'retry': seed++; ready(); start.focus({ preventScroll: true }); break;
    }
  };
  game.onkeydown = event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const shape = marks[Number(event.key) - 1];
    if (shape && /^[1-5]$/.test(event.key) && Number(event.key) <= shifts[round].shapes) resolve(shape.mark);
  };
  ready();
  focusGame(game);
}
