import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeAdventure,encodeAdventure} from '../adventure.js';
import {fieldTurn,scannedCells,startField} from '../adventure-field.js';
import {lessons} from '../lab-content.js';
import {quizGuidance} from '../quiz-guidance.js';

const game = { title: 'Ключи ✨', hero: 'Лис', energy: 5, rooms: ['logic', 'supplies', 'shortcut', 'logic'] };

test('a shared adventure preserves its settings and rejects invalid layouts', () => {
  assert.deepEqual(decodeAdventure(encodeAdventure(game)), { v: 1, ...game });
  assert.equal(encodeAdventure({ ...game, rooms: Array(4).fill('supplies') }), '');
  assert.equal(decodeAdventure('#adventure=e30'), null);
});

const moves = { up: -11, down: 11, left: -1, right: 1 };

test('each map places its items and exit on reachable floor', () => {
  const layouts = new Set();
  for (let seed = 0; seed < 24; seed++) {
    const run = startField(game, seed);
    const floor = new Set([run.start]);
    for (const cell of floor) {
      for (const delta of Object.values(moves)) {
        if (!run.walls.has(cell + delta)) floor.add(cell + delta);
      }
    }
    assert.equal(Object.values(run.items).filter(item => item === 'chip').length, 3);
    assert.ok([run.exit, run.guard, ...run.route, ...Object.keys(run.items).map(Number)].every(cell => floor.has(cell)));
    assert.equal(run.items[run.start], undefined);
    layouts.add([...run.walls].join(',') + Object.keys(run.items).join(','));
  }
  assert.ok(layouts.size > 1);
});

test('walls block movement, items are collected once, and the exit requires two chips', () => {
  const run = startField(game, 0);
  const [direction, delta] = Object.entries(moves).find(([, delta]) => !run.walls.has(run.player + delta));
  const [blocked] = Object.entries(moves).find(([, delta]) => run.walls.has(run.player + delta));
  assert.equal(fieldTurn(run, blocked), run);
  const next = fieldTurn({ ...run, items: { [run.player + delta]: 'chip' }, frozen: 2 }, direction);
  assert.equal(next.player, run.player + delta);
  assert.equal(next.chips, 1);
  assert.equal(fieldTurn(next, 'wait').chips, 1);
  const gate = { ...next, exit: next.player + delta };
  assert.equal(fieldTurn(gate, direction).turns, gate.turns);
  assert.equal(fieldTurn({ ...gate, chips: 2 }, direction).status, 'won');
});

test('the drone spots players in open corridors, costs energy, and can be frozen', () => {
  const run = startField(game, 0);
  const [cell] = scannedCells(run);
  assert.ok(cell !== undefined);
  const caught = fieldTurn({ ...run, player: cell, energy: 1 }, 'wait');
  assert.equal(caught.status, 'lost');
  assert.equal(caught.energy, 0);
  const frozen = fieldTurn({ ...run, player: cell, charges: 1 }, 'pulse');
  assert.equal(frozen.charges, 0);
  assert.deepEqual(scannedCells(frozen), []);
  const after = fieldTurn(fieldTurn(frozen, 'wait'), 'wait');
  assert.equal(after.guard, run.guard);
  assert.equal(after.energy, run.energy);
  assert.equal(after.frozen, 0);
});

test('each course question explains the selected wrong answer', () => {
  for (const lesson of lessons.filter(l => l.rounds)) {
    assert.equal(quizGuidance[lesson.title].length, lesson.rounds.length);
    lesson.rounds.forEach(([, answers, correct], index) => {
      const [goal, hint, wrong] = quizGuidance[lesson.title][index];
      assert.ok(goal && hint);
      assert.equal(wrong.length, answers.length);
      answers.forEach((_, i) => { if (i !== correct) assert.ok(wrong[i]); });
    });
  }
});
