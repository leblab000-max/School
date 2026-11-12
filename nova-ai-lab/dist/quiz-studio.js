const themes = {
  football: {
    name: 'Футбол',
    source: 'На тренировку пришли 12 игроков. Тренер разделил их на 4 команды по 3 человека. В игре используют мячи, а фишками отмечают границы поля. Раунд длится 8 минут.',
    ambiguous: ['Что взяли для игры?', ['Мячи', 'Фишки', 'Ракетки'], 0],
    clarified: 'Каким предметом играют в футбол?',
    wrong: ['Сколько игроков пришло на тренировку?', ['16', '12', '8'], 0],
    correct: ['Сколько длится раунд?', ['3 минуты', '8 минут', '12 минут'], 1],
  },
  space: {
    name: 'Космос',
    source: 'В вымышленной экспедиции на станцию «Орбита» летят 6 исследователей. Они взяли камеру для съёмки и телескоп для наблюдений. Снимки передадут на Землю через 4 часа.',
    ambiguous: ['Что взяли на станцию?', ['Камеру', 'Телескоп', 'Компас'], 0],
    clarified: 'Чем исследователи будут делать снимки?',
    wrong: ['Сколько исследователей летит на станцию?', ['4', '6', '8'], 0],
    correct: ['Через сколько часов передадут снимки?', ['2', '4', '6'], 1],
  },
  games: {
    name: 'Игры',
    source: 'В вымышленной игре «Маяк» герой должен найти 5 кристаллов. В рюкзаке у него карта и фонарь. Фонарём герой освещает путь. После сбора кристаллов он зажигает маяк.',
    ambiguous: ['Что лежит в рюкзаке?', ['Фонарь', 'Карта', 'Ключ'], 0],
    clarified: 'Чем герой освещает путь?',
    wrong: ['Сколько кристаллов нужно найти?', ['3', '5', '7'], 0],
    correct: ['Что герой зажигает в финале?', ['Костёр', 'Маяк', 'Свечу'], 1],
  },
};

const limits = { title: 48, question: 100, answer: 48, explanation: 120 };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);
const textField = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
const fromExample = ([text, answers, correct]) => ({ text, answers: [...answers], correct });
const emptyQuestion = () => ({ text: '', answers: ['', '', ''], correct: 0, explanation: '' });

function normalizeDraftQuestion(question) {
  return {
    text: textField(question?.text, limits.question),
    answers: Array.from({ length: 3 }, (_, i) => textField(question?.answers?.[i], limits.answer)),
    correct: [0, 1, 2].includes(question?.correct) ? question.correct : 0,
    explanation: textField(question?.explanation, limits.explanation),
  };
}

function prepareDraft(themeId, saved) {
  const theme = themes[themeId];
  return {
    version: 1,
    theme: themeId,
    title: saved ? textField(saved.title, limits.title) : 'Викторина про ' + ({ football: 'футбол', space: 'космос', games: 'игры' })[themeId],
    fixes: [saved?.fixes?.[0] === true, saved?.fixes?.[1] === true],
    lastTrial: normalizeTrial(saved?.lastTrial),
    questions: Array.isArray(saved?.questions) && saved.questions.length === 4
      ? saved.questions.map(normalizeDraftQuestion)
      : [fromExample(theme.ambiguous), fromExample(theme.wrong), fromExample(theme.correct), emptyQuestion()],
  };
}

export function validateQuiz(quiz) {
  if (!quiz || typeof quiz.title !== 'string' || !quiz.title.trim() || quiz.title.length > limits.title) {
    return 'Укажи название викторины.';
  }
  if (!Array.isArray(quiz.questions) || quiz.questions.length !== 4) {
    return 'В викторине должно быть четыре вопроса.';
  }
  for (const [i, q] of quiz.questions.entries()) {
    if (!q || typeof q.text !== 'string' || !q.text.trim() || q.text.length > limits.question) {
      return `Напиши текст вопроса ${i + 1}.`;
    }
    if (!Array.isArray(q.answers) || q.answers.length !== 3 ||
      q.answers.some(a => typeof a !== 'string' || !a.trim() || a.length > limits.answer)) {
      return `Заполни три варианта в вопросе ${i + 1}.`;
    }
    const normalized = q.answers.map(a => a.trim().replace(/\s+/g, ' ').toLowerCase());
    if (new Set(normalized).size !== 3) return `Сделай варианты в вопросе ${i + 1} разными.`;
    if (![0, 1, 2].includes(q.correct)) return `Отметь правильный ответ в вопросе ${i + 1}.`;
    if (q.explanation !== undefined &&
      (typeof q.explanation !== 'string' || q.explanation.length > limits.explanation)) {
      return `Сократи объяснение в вопросе ${i + 1}.`;
    }
  }
  return '';
}

const SHARE_PREFIX = '#quiz=';
const MAX_PAYLOAD = 9000;

export function encodeQuiz(quiz) {
  if (validateQuiz(quiz)) return '';
  const data = {
    v: 1,
    title: quiz.title.trim(),
    questions: quiz.questions.map(q => ({
      text: q.text.trim(),
      answers: q.answers.map(a => a.trim()),
      correct: q.correct,
      ...(q.explanation?.trim() ? { explanation: q.explanation.trim() } : {}),
    })),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return SHARE_PREFIX + encoded;
}

export function decodeQuiz(hash) {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  const payload = hash.slice(SHARE_PREFIX.length);
  if (!payload || payload.length > MAX_PAYLOAD || !/^[A-Za-z0-9_-]+$/.test(payload)) return null;
  try {
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
    return data?.v === 1 && !validateQuiz(data) ? data : null;
  } catch {
    return null;
  }
}

function startAtHeading(root) {
  const heading = root.querySelector('h1,h2');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus({ preventScroll: true });
  root.scrollIntoView({ block: 'start' });
}

function normalizeTrial(trial) {
  if (typeof trial?.quiz !== 'string' || !trial.quiz.startsWith(SHARE_PREFIX) ||
      trial.quiz.length > MAX_PAYLOAD + SHARE_PREFIX.length ||
      !Array.isArray(trial.answers) || trial.answers.length !== 4 ||
      !trial.answers.every(answer => [0, 1, 2].includes(answer))) return null;
  return { quiz: trial.quiz, answers: [...trial.answers] };
}

export function quizTrial(quiz) {
  const trial = normalizeTrial(quiz?.lastTrial);
  if (!trial) return null;
  if (trial.quiz !== encodeQuiz(quiz)) return { changed: true };
  const missed = trial.answers.flatMap((answer, i) => answer === quiz.questions[i].correct ? [] : [i + 1]);
  return { changed: false, score: quiz.questions.length - missed.length, missed };
}

function trialMessage(draft) {
  const trial = quizTrial(draft);
  if (!trial) return '';
  if (trial.changed) return 'Вопросы изменились. Сыграй ещё раз, чтобы проверить новую версию.';
  const summary = `Пробная игра — ${trial.score} из 4.`;
  return trial.missed.length
    ? `${summary} Пересмотри вопросы ${trial.missed.join(', ')} и проверь, понятны ли варианты.`
    : summary;
}

export function mountQuizPlayer(root, quiz, { exit, exitLabel = 'Открыть курс', onFinish }) {
  let index = 0;
  let selected = [];

  function resultMarkup() {
    const score = selected.filter((answer, i) => answer === quiz.questions[i].correct).length;
    return `<div class="quiz-panel">
      <h2>Результат</h2><p class="quiz-score">${score} из ${quiz.questions.length}</p>
      <h3>Разбор ответов</h3>
      <ol class="quiz-review-list">${quiz.questions.map((q, i) => `<li>
        <b>${esc(q.text)}</b>
        <p class="${selected[i] === q.correct ? 'quiz-review-good' : 'quiz-review-missed'}">
          Твой ответ — ${esc(q.answers[selected[i]])}.${selected[i] === q.correct ? ' Верно.' : ''}
        </p>
        ${selected[i] !== q.correct ? `<p>Правильный ответ — ${esc(q.answers[q.correct])}.</p>` : ''}
        ${q.explanation ? `<p>${esc(q.explanation)}</p>` : ''}
      </li>`).join('')}</ol>
      <button type="button" class="primary" id="quiz-replay">Сыграть ещё раз</button>
      ${onFinish ? '<button type="button" class="secondary" id="quiz-result-editor">Вернуться к редактору</button>' : ''}
    </div>
    ${onFinish ? '' : `<details class="quiz-panel quiz-feedback">
      <summary>Подсказать автору, что улучшить</summary>
      <label>Какой вопрос стоит уточнить?
        <select id="quiz-feedback-question"><option value="">Не выбрал</option>
          ${quiz.questions.map((q, i) => `<option value="${i}">${i + 1}. ${esc(q.text)}</option>`).join('')}
        </select>
      </label>
      <label>Что было непонятно? <textarea id="quiz-feedback-note" maxlength="160" rows="2"></textarea></label>
      <button type="button" class="secondary" id="quiz-copy-feedback">Скопировать отзыв</button>
      <p id="quiz-feedback-status" role="status"></p>
      <label id="quiz-feedback-manual" hidden>Текст отзыва <textarea id="quiz-feedback-text" readonly rows="4"></textarea></label>
    </details>`}`;
  }

  function render() {
    const question = quiz.questions[index];
    root.innerHTML = `<section class="quiz-studio quiz-player">
      <button type="button" class="text-button" id="quiz-exit">← ${exitLabel}</button>
      <h1>${esc(quiz.title)}</h1>
      ${question ? `<div class="quiz-panel">
        <p class="quiz-kicker">Вопрос ${index + 1} из ${quiz.questions.length}</p>
        <h2>${esc(question.text)}</h2>
        <div class="quiz-choices">${question.answers.map((answer, i) =>
          `<button type="button" class="quiz-choice" data-play-answer="${i}">${esc(answer)}</button>`
        ).join('')}</div>
        <p id="quiz-play-feedback" role="status"></p>
        <button type="button" class="primary" id="quiz-play-next" hidden>
          ${index === quiz.questions.length - 1 ? 'Посмотреть результат' : 'Следующий вопрос →'}
        </button>
      </div>` : resultMarkup()}
    </section>`;
    root.querySelector('#quiz-exit').onclick = exit;
    root.querySelector('#quiz-result-editor')?.addEventListener('click', exit);
    root.querySelector('#quiz-replay')?.addEventListener('click', () => {
      index = 0;
      selected = [];
      render();
    });
    root.querySelector('#quiz-copy-feedback')?.addEventListener('click', async () => {
      const value = root.querySelector('#quiz-feedback-question').value;
      const question = value === '' ? null : quiz.questions[Number(value)];
      const note = root.querySelector('#quiz-feedback-note').value.trim();
      const status = root.querySelector('#quiz-feedback-status');
      const manual = root.querySelector('#quiz-feedback-manual');
      const field = root.querySelector('#quiz-feedback-text');
      manual.hidden = true;
      if (!question && !note) {
        status.textContent = 'Выбери вопрос или напиши, что стоит улучшить.';
        return;
      }
      const feedback = [
        `Отзыв на викторину «${quiz.title}».`,
        question ? `Предлагаю уточнить вопрос «${question.text}».` : '',
        note,
      ].filter(Boolean).join(' ');
      try {
        await navigator.clipboard.writeText(feedback);
        status.textContent = 'Отзыв скопирован. Его можно вставить в сообщение автору.';
      } catch {
        field.value = feedback;
        manual.hidden = false;
        field.focus();
        field.select();
        status.textContent = 'Выделенный отзыв можно скопировать и передать автору.';
      }
    });
    const answers = [...root.querySelectorAll('[data-play-answer]')];
    answers.forEach(button => button.onclick = () => {
      const answer = Number(button.dataset.playAnswer);
      const isCorrect = answer === question.correct;
      selected[index] = answer;
      answers.forEach(b => { b.disabled = true; });
      answers[question.correct].classList.add('quiz-correct');
      if (!isCorrect) button.classList.add('quiz-incorrect');
      const message = isCorrect ? 'Верно!' : 'Правильный ответ — ' + question.answers[question.correct] + '.';
      root.querySelector('#quiz-play-feedback').textContent = [message, question.explanation].filter(Boolean).join(' ');
      root.querySelector('#quiz-play-next').hidden = false;
    });
    root.querySelector('#quiz-play-next')?.addEventListener('click', () => {
      index++;
      if (index === quiz.questions.length) onFinish?.([...selected]);
      render();
    });
    startAtHeading(root);
  }

  render();
}

export function mountQuizStudio(root, { saved, persist, exit }) {
  let draft = Object.hasOwn(themes, saved?.theme) ? prepareDraft(saved.theme, saved) : null;
  const get = selector => root.querySelector(selector);

  function chooseTheme() {
    root.innerHTML = `<section class="quiz-studio">
      <button type="button" class="text-button" id="quiz-exit">← К курсу</button>
      <h1>Собери свою викторину</h1>
      <p class="lead">Выбери тему, проверь черновик и добавь вопрос. Потом дай кому-нибудь сыграть.</p>
      <div class="quiz-theme-list">${Object.entries(themes).map(([id, theme]) =>
        `<button type="button" class="quiz-choice" data-quiz-theme="${id}">${theme.name}</button>`
      ).join('')}</div>
    </section>`;
    get('#quiz-exit').onclick = exit;
    root.querySelectorAll('[data-quiz-theme]').forEach(b => b.onclick = () => {
      draft = prepareDraft(b.dataset.quizTheme);
      persist(draft);
      renderWorkshop();
    });
    startAtHeading(root);
  }

  function renderWorkshop() {
    const theme = themes[draft.theme];
    const allReviewed = draft.fixes.every(Boolean);
    root.innerHTML = `<section class="quiz-studio">
      <button type="button" class="text-button" id="quiz-exit">← К курсу</button>
      <h1>${allReviewed ? 'Твоя викторина' : 'Проверь черновик'}</h1>
      <p class="lead">${allReviewed
        ? 'Добавь четвёртый вопрос. Затем сыграй сам и отправь ссылку.'
        : 'Перед тобой учебный пример ответа ИИ. Сверь вопросы с заметкой и исправь две ошибки.'}</p>
      <aside class="quiz-source"><b>Источник для задания</b><p>${theme.source}</p></aside>
      ${allReviewed ? editorMarkup() : reviewMarkup(theme)}
    </section>`;
    get('#quiz-exit').onclick = exit;
    if (allReviewed) bindEditor();
    else bindReview();
    startAtHeading(root);
  }

  function reviewMarkup(theme) {
    const index = draft.fixes[0] ? 1 : 0;
    const q = draft.questions[index];
    const correctOptions = index === 0
      ? ['У вопроса два подходящих ответа', 'Варианты ответа одинаковые', 'Ошибки нет']
      : ['Ответов слишком много', 'Ошибки нет', 'Отмеченный ответ расходится с заметкой'];
    return `<div class="quiz-panel">
      <p class="quiz-kicker">Проверка ${index + 1} из 2</p>
      <h2>${esc(q.text)}</h2>
      <ul class="quiz-draft-answers">${q.answers.map((a, i) =>
        `<li>${esc(a)}${i === q.correct ? ' <small>· так отмечено в черновике</small>' : ''}</li>`
      ).join('')}</ul>
      <h3>Что здесь нужно исправить?</h3>
      <div class="quiz-choices">${correctOptions.map((label, i) =>
        `<button type="button" class="quiz-choice" data-review="${i}">${label}</button>`
      ).join('')}</div>
      <p id="quiz-review-note" role="status"></p>
      <div id="quiz-fix-area" hidden>
        ${index === 0
          ? `<p>Уточнённый вопрос — «${theme.clarified}»</p><button type="button" class="primary" id="quiz-fix-wording">Уточнить вопрос →</button>`
          : `<h3>Какой ответ подтверждает заметка?</h3><div class="quiz-choices">${q.answers.map((a, i) =>
            `<button type="button" class="quiz-choice" data-fix-answer="${i}">${esc(a)}</button>`
          ).join('')}</div>`}
      </div>
    </div>`;
  }

  function bindReview() {
    const index = draft.fixes[0] ? 1 : 0;
    const note = get('#quiz-review-note');
    root.querySelectorAll('[data-review]').forEach(b => b.onclick = () => {
      if (Number(b.dataset.review) !== (index === 0 ? 0 : 2)) {
        note.textContent = index === 0 ? 'Сверь первые два варианта с заметкой.' : 'Сравни отмеченный ответ с числом в заметке.';
        return;
      }
      note.textContent = index === 0
        ? 'Оба первых варианта есть в заметке. Уточни вопрос, чтобы подходил только один.'
        : 'Верно. Теперь выбери число из заметки.';
      get('#quiz-fix-area').hidden = false;
    });
    get('#quiz-fix-wording')?.addEventListener('click', () => {
      draft.questions[0].text = themes[draft.theme].clarified;
      draft.fixes[0] = true;
      persist(draft);
      renderWorkshop();
    });
    root.querySelectorAll('[data-fix-answer]').forEach(b => b.onclick = () => {
      if (Number(b.dataset.fixAnswer) !== 1) {
        note.textContent = 'Перечитай заметку и найди нужное число.';
        return;
      }
      draft.questions[1].correct = 1;
      draft.fixes[1] = true;
      persist(draft);
      renderWorkshop();
    });
  }

  function editorMarkup() {
    return `<div class="quiz-panel">
      <p class="quiz-reviewed">Ты уточнил вопрос с двумя ответами и сверил число с источником.</p>
      <div id="quiz-trial-summary">${esc(trialMessage(draft))}</div>
      <label>Название викторины <input id="quiz-title" maxlength="${limits.title}" value="${esc(draft.title)}"></label>
      ${draft.questions.map((q, i) => `<details class="quiz-edit-card" ${i === 3 ? 'open' : ''}>
        <summary>${i === 3 ? '4. Добавь свой вопрос' : `${i + 1}. ${esc(q.text || 'Вопрос')}`}</summary>
        <div class="quiz-edit-fields">
          <label>Вопрос <input data-q="${i}" maxlength="${limits.question}" value="${esc(q.text)}"></label>
          ${q.answers.map((a, j) => `<label>Вариант ${j + 1} <input data-a="${i}:${j}" maxlength="${limits.answer}" value="${esc(a)}"></label>`).join('')}
          <label>Правильный вариант <select data-correct="${i}">${q.answers.map((_, j) =>
            `<option value="${j}" ${j === q.correct ? 'selected' : ''}>Вариант ${j + 1}</option>`
          ).join('')}</select></label>
          <label>Почему ответ верный? <small>По желанию</small>
            <textarea data-explanation="${i}" maxlength="${limits.explanation}" rows="2" placeholder="Напиши короткое объяснение или укажи источник">${esc(q.explanation)}</textarea>
          </label>
        </div>
      </details>`).join('')}
      <p id="quiz-edit-status" role="status"></p>
      <div class="quiz-actions">
        <button type="button" class="primary" id="quiz-preview">Сыграть самому</button>
        <button type="button" class="secondary" id="quiz-share">Дай сыграть</button>
      </div>
      <div id="quiz-share-panel" hidden>
        <p>В ссылке будут название, вопросы и ответы. Проверь, что в них нет личных данных.</p>
        <label>Ссылка на викторину <input id="quiz-share-url" readonly></label>
        <button type="button" class="secondary" id="quiz-copy">Скопировать ссылку</button>
      </div>
    </div>`;
  }

  function bindEditor() {
    const status = get('#quiz-edit-status');
    const change = () => {
      persist(draft);
      get('#quiz-share-panel').hidden = true;
      status.textContent = '';
      get('#quiz-trial-summary').textContent = trialMessage(draft);
    };
    get('#quiz-title').oninput = e => { draft.title = e.target.value; change(); };
    root.querySelectorAll('[data-q]').forEach(input => input.oninput = () => {
      draft.questions[Number(input.dataset.q)].text = input.value;
      change();
    });
    root.querySelectorAll('[data-a]').forEach(input => input.oninput = () => {
      const [i, j] = input.dataset.a.split(':').map(Number);
      draft.questions[i].answers[j] = input.value;
      change();
    });
    root.querySelectorAll('[data-correct]').forEach(select => select.onchange = () => {
      draft.questions[Number(select.dataset.correct)].correct = Number(select.value);
      change();
    });
    root.querySelectorAll('[data-explanation]').forEach(input => input.oninput = () => {
      draft.questions[Number(input.dataset.explanation)].explanation = input.value;
      change();
    });
    function ready() {
      const error = validateQuiz(draft);
      status.textContent = error;
      return !error;
    }
    get('#quiz-preview').onclick = () => {
      if (!ready()) return;
      mountQuizPlayer(root, draft, {
        exit: renderWorkshop,
        exitLabel: 'К редактору',
        onFinish: answers => {
          draft.lastTrial = { quiz: encodeQuiz(draft), answers };
          persist(draft);
        },
      });
    };
    get('#quiz-share').onclick = () => {
      if (!ready()) return;
      get('#quiz-share-url').value = location.origin + location.pathname + encodeQuiz(draft);
      get('#quiz-share-panel').hidden = false;
    };
    get('#quiz-copy').onclick = async () => {
      const input = get('#quiz-share-url');
      try {
        await navigator.clipboard.writeText(input.value);
        status.textContent = 'Ссылка скопирована.';
      } catch {
        input.focus();
        input.select();
        status.textContent = 'Ссылка выделена. Скопируй её через меню телефона.';
      }
    };
  }

  if (draft) renderWorkshop();
  else chooseTheme();
}
