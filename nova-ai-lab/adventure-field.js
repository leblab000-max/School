const blueprint = [
  '###########',
  '#.........#',
  '#.###.#.#.#',
  '#.....#...#',
  '#.##....#.#',
  '#....##...#',
  '#.##....#.#',
  '#.........#',
  '###########',
];
const width = blueprint[0].length;
const height = blueprint.length;
const directions = { up: -width, left: -1, down: width, right: 1 };
const patrol = [16, 38, 40, 51, 48, 37, 38, 16];
const chipSites = [14, 34, 42, 57, 73, 85];
const supplySites = [27, 36, 75, 81, 78, 19];

function shuffled(items, random) {
  const order = [...items];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function startField(game, seed) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  random();
  const mirrorX = random() < .5;
  const mirrorY = random() < .5;
  const place = index => {
    const x = index % width;
    const y = Math.floor(index / width);
    return (mirrorY ? height - 1 - y : y) * width + (mirrorX ? width - 1 - x : x);
  };
  const walls = new Set(blueprint.flatMap((row, y) => [...row].flatMap((tile, x) => tile === '#' ? [place(y * width + x)] : [])));
  const route = patrol.map(place);
  const chips = shuffled(chipSites, random);
  const supplies = shuffled(supplySites, random);
  const items = {};
  for (const room of game.rooms) {
    if (room === 'supplies') {
      items[place(supplies.pop())] = 'battery';
    } else {
      items[place(chips.pop())] = 'chip';
    }
  }
  items[place(79)] = 'pulse';
  const start = place(12);
  return {
    walls, route, start, exit: place(86), player: start, guard: route[0],
    waypoint: 1, target: null, items, energy: game.energy, maxEnergy: game.energy,
    chips: 0, charges: 0, frozen: 0, turns: 0, status: 'playing', mode: 'patrol',
    message: 'Собери 2 чипа и доберись до шлюза. Ходи по соседним клеткам.',
  };
}

function shortestStep(walls, from, to) {
  if (from === to) return from;
  const queue = [[from, from]];
  const seen = new Set([from]);
  for (const [cell, first] of queue) {
    for (const delta of Object.values(directions)) {
      const next = cell + delta;
      if (walls.has(next) || seen.has(next)) continue;
      const step = first === from ? next : first;
      if (next === to) return step;
      seen.add(next);
      queue.push([next, step]);
    }
  }
  return from;
}

export function scannedCells(run) {
  if (run.frozen) return [];
  return Object.values(directions).flatMap(delta => {
    const ray = [];
    for (let distance = 1; distance <= 3; distance++) {
      const cell = run.guard + delta * distance;
      if (run.walls.has(cell)) break;
      ray.push(cell);
    }
    return ray;
  });
}

export function fieldTurn(run, action) {
  if (run.status !== 'playing') return run;
  const next = { ...run, message: '' };
  if (action === 'pulse') {
    if (!run.charges || run.frozen) return run;
    next.charges--;
    next.frozen = 2;
    next.target = null;
    next.mode = 'frozen';
    next.message = 'Импульс сработал. Дрон пропустит два твоих хода.';
    return next;
  }
  if (action !== 'wait' && !Object.hasOwn(directions, action)) return run;
  const cell = run.player + (directions[action] ?? 0);
  if (run.walls.has(cell)) return run;
  next.turns++;
  if (cell === run.exit) {
    if (run.chips < 2) return { ...run, message: 'Шлюз закрыт. Для него нужны 2 чипа.' };
    return { ...next, player: cell, status: 'won', message: 'Шлюз открыт. Чипы доставлены!' };
  }
  next.player = cell;
  const item = run.items[cell];
  if (item) {
    next.items = { ...run.items };
    delete next.items[cell];
    if (item === 'chip') {
      next.chips++;
      next.message = next.chips === 2 ? 'Второй чип получен. Теперь можно открыть шлюз!' : 'Чип подобран.';
    } else if (item === 'battery') {
      next.energy = Math.min(run.energy + 2, run.maxEnergy);
      next.message = next.energy === run.energy ? 'Батарея подобрана. Энергия уже полная.' : 'Батарея восстановила энергию.';
    } else {
      next.charges++;
      next.message = 'Импульс подобран. Используй его, чтобы остановить дрон на два хода.';
    }
  }
  if (run.frozen) {
    next.frozen--;
    next.mode = next.frozen ? 'frozen' : 'patrol';
    return next;
  }
  if (scannedCells(run).includes(cell)) next.target = cell;
  next.mode = next.target === null ? 'patrol' : 'search';
  const destination = next.target ?? run.route[run.waypoint];
  next.guard = shortestStep(run.walls, run.guard, destination);
  if (next.target === null && next.guard === destination) next.waypoint = (next.waypoint + 1) % run.route.length;
  if (next.guard === cell || run.guard === cell) {
    next.energy--;
    next.player = run.start;
    next.guard = run.route[0];
    next.waypoint = 1;
    next.target = null;
    next.mode = 'patrol';
    next.status = next.energy ? 'playing' : 'lost';
    next.message = next.energy
      ? 'Дрон поймал тебя. −1 энергия. Ты вернулся на старт с добычей.'
      : 'Энергия закончилась. В новом забеге обходи подсвеченные клетки или возьми импульс.';
  } else if (next.mode === 'search' && !next.message) {
    next.message = 'Дрон идёт к месту, где заметил тебя. Сверни за стену.';
  }
  if (next.guard === next.target) next.target = null;
  return next;
}

const keyboard = {
  ArrowUp: 'up', w: 'up', ц: 'up', ArrowLeft: 'left', a: 'left', ф: 'left',
  ArrowDown: 'down', s: 'down', ы: 'down', ArrowRight: 'right', d: 'right', в: 'right',
  ' ': 'wait', e: 'pulse', у: 'pulse',
};
const controls = [['up','↑','Вверх'],['left','←','Влево'],['wait','•','Ждать ход'],['right','→','Вправо'],['down','↓','Вниз']];
const labels = { chip: 'Чип', battery: 'Батарея', pulse: 'Импульс', exit: 'Шлюз' };

export function mountField(root, game, { exit, exitLabel = 'К курсу', build, escape }) {
  let seed = Math.floor(Math.random() * 4294967296);
  let run = startField(game, seed);
  root.innerHTML = `<section class="field-game">
    <div class="field-nav"><button type="button" class="text-button" data-field="leave">← ${exitLabel}</button>
    ${build ? '<button type="button" class="text-button" data-field="build">Конструктор карты ↗</button>' : ''}</div>
    <h1>${escape(game.title)}</h1>
    <div class="field-layout">
      <div class="field-main">
        <div class="field-hud" aria-label="Ресурсы"></div>
        <div class="field-board" tabindex="0" role="group" aria-label="Карта лаборатории. Ходи стрелками, WASD или кнопками под полем"></div>
        <p class="field-message" role="status"></p>
      </div>
      <aside class="field-side">
        <div class="field-mission"><strong>Доберись до шлюза</strong><span>Собери два чипа и обойди дрон.</span></div>
        <div class="field-legend">${Object.entries(labels).map(([kind, label]) => `<span><i class="field-piece ${kind}" aria-hidden="true"></i>${label}</span>`).join('')}</div>
        <div class="field-drone"></div>
        <div class="field-controls" aria-label="Управление">${controls.map(([key, symbol, label]) => `<button type="button" class="field-${key}" data-field="${key}" aria-label="${label}">${symbol}</button>`).join('')}</div>
        <button type="button" class="field-pulse" data-field="pulse">⚡ Импульс</button>
        <button type="button" class="secondary field-restart" data-field="restart">Новый забег</button>
      </aside>
    </div>
  </section>`;
  const section = root.querySelector('.field-game');
  const get = selector => section.querySelector(selector);
  const board = get('.field-board');
  const message = get('.field-message');

  function render() {
    const scan = new Set(scannedCells(run));
    board.innerHTML = Array.from({length: width * height}, (_, cell) => {
      const item = cell === run.exit ? 'exit' : run.items[cell];
      const type = run.walls.has(cell) ? 'wall' : 'floor';
      const isAdjacent = !run.walls.has(cell) && Object.values(directions).includes(cell - run.player);
      const player = cell === run.player;
      const guard = cell === run.guard;
      const contents = [item && `<i class="field-piece ${item}"></i>`, guard && '<i class="field-piece guard"></i>', player && '<i class="field-piece player"></i>'].filter(Boolean).join('');
      const name = [labels[item], guard && 'Дрон', player && game.hero, scan.has(cell) && 'Зона сканирования'].filter(Boolean).join(', ');
      return `<span class="field-tile ${type}${scan.has(cell) ? ' scan' : ''}${isAdjacent ? ' adjacent' : ''}" data-cell="${cell}" ${name ? `title="${escape(name)}"` : ''}>${contents}</span>`;
    }).join('');
    get('.field-hud').innerHTML = `<span>♥ Энергия <b>${run.energy}/${run.maxEnergy}</b></span><span>◆ Чипы <b>${run.chips}/2</b></span><span>Ходы <b>${run.turns}</b></span>`;
    const mode = run.mode === 'search' ? 'Ищет тебя' : run.mode === 'frozen' ? `Пауза · ${run.frozen} хода` : 'Патрулирует';
    get('.field-drone').innerHTML = `<span>Дрон</span><b>${mode}</b><small>Красные клетки — зона обзора. Стены закрывают обзор.</small>`;
    const done = run.status !== 'playing';
    message.textContent = run.message || (done ? '' : 'Ход за тобой.');
    message.dataset.outcome = run.status;
    get('[data-field="pulse"]').disabled = done || !run.charges || !!run.frozen;
    get('[data-field="pulse"]').textContent = `⚡ Импульс · ${run.charges}`;
    for (const [key] of controls) get(`[data-field="${key}"]`).disabled = done;
  }

  function act(action) {
    if (action === 'leave') return exit();
    if (action === 'build') return build();
    if (action === 'restart') {
      seed = (seed + 1) >>> 0;
      run = startField(game, seed);
      board.focus({ preventScroll: true });
    } else {
      const next = fieldTurn(run, action);
      if (next === run) return;
      run = next;
    }
    render();
  }
  section.onclick = event => {
    const button = event.target.closest('[data-field]');
    if (button) return act(button.dataset.field);
    const tile = event.target.closest('.field-tile.adjacent');
    if (!tile) return;
    const direction = Object.keys(directions).find(key => directions[key] === Number(tile.dataset.cell) - run.player);
    if (direction) act(direction);
  };
  section.onkeydown = event => {
    if (event.altKey || event.metaKey || event.ctrlKey || (event.key === ' ' && event.target !== board)) return;
    const action = keyboard[event.key.toLowerCase()] ?? keyboard[event.key];
    if (!action) return;
    event.preventDefault();
    act(action);
  };
  render();
  section.scrollIntoView({ block: 'start' });
  board.focus({ preventScroll: true });
}
