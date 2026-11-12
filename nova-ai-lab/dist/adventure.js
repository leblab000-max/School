import { mountField } from './adventure-field.js';

const rooms = {
  logic: { name: 'Хранилище чипа', description: 'Добавляет на поле чип для открытия шлюза.' },
  supplies: { name: 'Батарея', description: 'Добавляет на поле батарею. Она восстанавливает до 2 энергии.' },
  shortcut: { name: 'Хранилище чипа (из старой карты)', description: 'Добавляет на поле чип для открытия шлюза.' },
};

const prefix = '#adventure=';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const bounded = (value, fallback) => typeof value === 'string' ? value.slice(0, 48) : fallback;
const defaultRooms = ['logic', 'supplies', 'logic', 'logic'];
export const defaultAdventure = { title: 'Побег из лаборатории', hero: 'Нова', energy: 5, rooms: defaultRooms };

export function validateAdventure(game) {
  if (!game || typeof game.title !== 'string' || !game.title.trim() || game.title.length > 48 ||
      typeof game.hero !== 'string' || !game.hero.trim() || game.hero.length > 48) return 'Укажи название игры и имя проводника.';
  if (![4, 5, 6].includes(game.energy)) return 'Выбери запас энергии.';
  if (!Array.isArray(game.rooms) || game.rooms.length < 4 || game.rooms.length > 6 ||
      !game.rooms.every(room => Object.hasOwn(rooms, room))) return 'Выбери от четырёх до шести предметов.';
  if (game.rooms.filter(room => room !== 'supplies').length < 2) return 'Добавь минимум два чипа для открытия шлюза.';
  return '';
}

export function encodeAdventure(game) {
  if (validateAdventure(game)) return '';
  const data = { v: 1, title: game.title.trim(), hero: game.hero.trim(), energy: game.energy, rooms: game.rooms };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return prefix + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeAdventure(hash) {
  if (!hash.startsWith(prefix)) return null;
  const text = hash.slice(prefix.length);
  if (text.length > 1200 || !/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const bytes = Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return data?.v === 1 && !validateAdventure(data) ? data : null;
  } catch { return null; }
}

function beginScreen(root) {
  const heading = root.querySelector('h1');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus({ preventScroll: true });
  root.scrollIntoView({ block: 'start' });
}

export function mountAdventurePlayer(root, game, options) {
  mountField(root, game, { ...options, escape: esc });
}

export function mountAdventureStudio(root, { saved, persist, exit }) {
  const game = {
    title: bounded(saved?.title, defaultAdventure.title),
    hero: bounded(saved?.hero, defaultAdventure.hero),
    energy: [4, 5, 6].includes(saved?.energy) ? saved.energy : 5,
    rooms: Array.isArray(saved?.rooms) && saved.rooms.length >= 4 && saved.rooms.length <= 6 &&
      saved.rooms.every(room => Object.hasOwn(rooms, room)) ? saved.rooms.map(room => room === 'shortcut' ? 'logic' : room) : [...defaultRooms],
  };
  const get = selector => root.querySelector(selector);
  function render(scroll = true) {
    root.innerHTML = `<section class="quiz-studio adventure-studio">
      <button class="text-button" id="adventure-exit">← К курсу</button>
      <h1>Собери свою карту</h1>
      <p class="lead">Реши, сколько чипов и батарей будет в лаборатории. В каждом забеге они появляются в новых местах.</p>
      <div class="quiz-panel">
        <label>Название игры<input id="adventure-title" maxlength="48" value="${esc(game.title)}"></label>
        <label>Имя вымышленного проводника<input id="adventure-hero" maxlength="48" value="${esc(game.hero)}"></label>
        <label>Энергия на старте<select id="adventure-energy">${[4,5,6].map(value => `<option ${value === game.energy ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <h2>Предметы на карте</h2>
        <p>Размести от 4 до 6 предметов. Для победы нужно найти два чипа.</p>
        <div class="adventure-room-list">${game.rooms.map((room, i) => `<label>Предмет ${i + 1}
          <select data-adventure-room="${i}">${Object.entries(rooms).filter(([key]) => key !== 'shortcut').map(([key, info]) =>
            `<option value="${key}" ${key === room ? 'selected' : ''}>${info.name}</option>`).join('')}</select>
          <span class="adventure-room-tip">${rooms[room].description}</span>
        </label>`).join('')}</div>
        <p><b>Финал</b> · шлюз открывается двумя чипами.</p>
        <div class="quiz-actions"><button class="secondary" id="adventure-add" ${game.rooms.length === 6 ? 'disabled' : ''}>Добавить предмет</button>
          <button class="secondary" id="adventure-remove" ${game.rooms.length === 4 ? 'disabled' : ''}>Убрать последний</button></div>
        <p id="adventure-editor-status" role="status"></p>
        <div class="quiz-actions"><button class="primary" id="adventure-preview">Сыграть самому</button><button class="secondary" id="adventure-share">Дай сыграть</button></div>
        <div id="adventure-share-panel" hidden>
          <label>Ссылка на игру<input readonly id="adventure-url"></label>
          <button class="secondary" id="adventure-copy">Скопировать ссылку</button>
        </div>
      </div>
    </section>`;
    const status = get('#adventure-editor-status');
    const change = () => {
      persist(game);
      status.textContent = '';
      get('#adventure-share-panel').hidden = true;
    };
    get('#adventure-exit').onclick = exit;
    get('#adventure-title').oninput = e => { game.title = e.target.value; change(); };
    get('#adventure-hero').oninput = e => { game.hero = e.target.value; change(); };
    get('#adventure-energy').onchange = e => { game.energy = Number(e.target.value); change(); };
    root.querySelectorAll('[data-adventure-room]').forEach(select => select.onchange = () => {
      game.rooms[Number(select.dataset.adventureRoom)] = select.value;
      select.nextElementSibling.textContent = rooms[select.value].description;
      change();
    });
    get('#adventure-add').onclick = () => { game.rooms.push('logic'); persist(game); render(false); get('#adventure-add').focus({preventScroll:true}); };
    get('#adventure-remove').onclick = () => { game.rooms.pop(); persist(game); render(false); get('#adventure-remove').focus({preventScroll:true}); };
    const ready = () => {
      const error = validateAdventure(game);
      status.textContent = error;
      if (!error) persist(game);
      return !error;
    };
    get('#adventure-preview').onclick = () => {
      if (ready()) mountAdventurePlayer(root, game, { exit: render, exitLabel: 'К карте' });
    };
    get('#adventure-share').onclick = () => {
      if (!ready()) return;
      get('#adventure-url').value = location.origin + location.pathname + encodeAdventure(game);
      get('#adventure-share-panel').hidden = false;
    };
    get('#adventure-copy').onclick = async () => {
      const input = get('#adventure-url');
      try {
        await navigator.clipboard.writeText(input.value);
        status.textContent = 'Ссылка скопирована.';
      } catch {
        input.focus();
        input.select();
        status.textContent = 'Ссылка выделена. Скопируй её через меню телефона.';
      }
    };
    if (scroll) beginScreen(root);
  }
  render();
}
