import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceCard, practiceDraft } from '../practice.js';

test('practice resumes at the first unfinished step', () => {
  assert.deepEqual(practiceDraft({ first: '  План игры  ', revision: 'Уточнить время' }), { first: 'План игры' });
  assert.deepEqual(practiceDraft(null), {});
});

test('the revised request must differ and the portfolio shows the whole completed work', () => {
  const draft = { first: 'Игра', diagnosis: 'Покупки', revision: 'Игра', comparison: 'Стало лучше' };
  assert.equal(practiceCard(practiceDraft(draft), String), '');
  draft.revision = 'Игра без покупок';
  assert.deepEqual(practiceDraft(draft), draft);
  for (const text of Object.values(draft)) assert.ok(practiceCard(draft, String).includes(text));
});
