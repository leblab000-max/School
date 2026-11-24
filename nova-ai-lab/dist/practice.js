const keys = ['first','diagnosis','revision','comparison'];

export function practiceDraft(value) {
  if (value?.version === 2) {
    const passed = Array.isArray(value.passed) ? [...new Set(value.passed.filter(i=>Number.isInteger(i)&&i>=0&&i<3))].sort() : [];
    const contiguous = passed.filter((i,index)=>i===index);
    const idea = typeof value.idea === 'string' ? value.idea.slice(0,160) : '';
    const check = typeof value.check === 'string' ? value.check.slice(0,160) : '';
    const complete = contiguous.length===3 && idea.trim() && check.trim();
    return {version:2,passed:contiguous,idea,check,
      comparison:complete?'Я задал условия, проверил результат и применил способ к своей идее.':''};
  }
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
  if (draft.version===2) return `<section class="lab-panel"><h2>Спаси перемену · моя идея</h2>
    <p>Пройдены три ситуации с разными условиями.</p>
    <p><b>Что хочу сделать</b><br>${escape(draft.idea)}</p>
    <p><b>Как проверю результат</b><br>${escape(draft.check)}</p>
    <p>Мой способ — задать условия → испытать → исправить.</p>
    </section>`;
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
