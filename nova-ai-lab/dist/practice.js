const fields = {
  first: 'Напиши свой запрос помощнику.',
  diagnosis: 'Какое условие нарушено? Приведи фразу из ответа.',
  revision: 'Перепиши запрос целиком, чтобы уменьшить риск этой ошибки.',
  comparison: 'Что стало лучше? Какое условие ты ещё проверишь перед игрой?',
};
const keys = Object.keys(fields);
const firstAnswer = 'Эстафета для всего класса: разбейтесь на четыре команды, купите наборы цветных фишек и передавайте фишку по цепочке. Через 10 минут подсчитайте очки.';
const revisedAnswer = 'Разделитесь на четыре группы. За 1 минуту объясните правила, затем проведите 4 раунда по 2 минуты. В каждом раунде группы по очереди называют слова по теме, а внутри группы говорят разные участники. Последнюю минуту подведите итог. Понадобятся только часы в классе.';

export function practiceDraft(value) {
  const draft = {};
  for (const key of keys) {
    if (typeof value?.[key] !== 'string' || !value[key].trim()) break;
    draft[key] = value[key].trim().slice(0, 900);
    if (key === 'revision' && draft[key] === draft.first) {
      delete draft[key];
      break;
    }
  }
  return draft;
}

export function practiceCard(draft, escape) {
  if (!draft.comparison) return '';
  return `<section class="lab-panel">
    <h2>Спаси перемену</h2>
    <div class="comparison">
      <div><b>Первый запрос</b><p>${escape(draft.first)}</p></div>
      <div><b>Исправленный запрос</b><p>${escape(draft.revision)}</p></div>
    </div>
    <div class="portfolio-row"><b>Какую ошибку я заметил</b><p>${escape(draft.diagnosis)}</p></div>
    <div class="portfolio-row"><b>Что изменилось и что ещё проверить</b><p>${escape(draft.comparison)}</p></div>
    <p class="muted">Работа с учебными ответами. Качество работы можно обсудить с учителем или родителем.</p>
  </section>`;
}

export function mountPractice(root, { saved, persist, exit, portfolio, escape }) {
  const draft = practiceDraft(saved);
  const answers = [
    '',
    `<blockquote>${firstAnswer}</blockquote>`,
    `<blockquote>${firstAnswer}</blockquote>`,
    `<div class="comparison"><div><b>Первый пример</b><p>${firstAnswer}</p></div><div><b>Пример после правки</b><p>${revisedAnswer}</p></div></div>`,
  ];
  let stage = Math.min(Object.keys(draft).length, keys.length);
  function render() {
    const key = keys[stage];
    const done = !key;
    root.innerHTML = `<section class="page">
      <button type="button" class="text-button" id="practice-exit">← К миссиям</button>
      <h1 tabindex="-1">Спаси перемену</h1>
      <p class="lead">Придумай игру на 10 минут, для всего класса и без покупок.</p>
      <p class="muted">Здесь используются заранее подготовленные примеры ответов. Твой запрос никуда не отправляется.</p>
      ${done ? `${practiceCard(draft, escape)}<button type="button" class="primary" id="practice-portfolio">Открыть портфолио</button>`
        : `<form class="lab-panel" id="practice-form"><p class="eyebrow">ШАГ ${stage + 1} ИЗ ${keys.length}</p>
        ${answers[stage]}${stage > 0 ? `<details><summary>Мой первый запрос</summary><p>${escape(draft.first)}</p></details>` : ''}
        ${stage === 3 ? `<details><summary>Мой исправленный запрос</summary><p>${escape(draft.revision)}</p></details>` : ''}
        <label for="practice-input">${fields[key]}</label>
        <textarea id="practice-input" maxlength="900" required>${escape(draft[key] || '')}</textarea>
        <p id="practice-error" role="status"></p>
        <button class="primary" type="submit">${['Показать учебный ответ', 'Перейти к правке', 'Сравнить учебные ответы', 'Сохранить в портфолио'][stage]}</button>
        </form>`}
    </section>`;
    root.querySelector('#practice-exit').onclick = exit;
    if (done) root.querySelector('#practice-portfolio').onclick = portfolio;
    else root.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const field = root.querySelector('textarea');
      const value = field.value.trim();
      const candidate = practiceDraft({ ...draft, [key]: value });
      if (!candidate[key]) {
        root.querySelector('#practice-error').textContent = value && key === 'revision'
          ? 'Запрос совпадает с первой версией. Измени формулировку и попробуй снова.'
          : 'Напиши свой ответ, чтобы продолжить.';
        field.focus({ preventScroll: true });
        return;
      }
      Object.assign(draft, candidate);
      persist({ ...draft });
      stage++;
      render();
    };
    root.querySelector('h1').focus({ preventScroll: true });
    root.scrollIntoView({ block: 'start' });
  }
  render();
}
