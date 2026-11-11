import test from 'node:test';
import assert from 'node:assert/strict';
import { bridgeCost, bridgeStars, bridgeLevels, inspectBridge, materials, sorterBatch, sortResult, shifts } from '../arcade.js';

test('each bridge has a winning design within its own budget', () => {
  for (const { name, span, budget, target, cargo } of bridgeLevels) {
    let cheapest = Infinity;
    for (let mask = 0; mask < (1 << span); mask++) {
      const supports = new Set(Array.from({ length: span }, (_, i) => i).filter(i => mask & (1 << i)));
      const deck = inspectBridge(Array(span).fill(null), supports, cargo.at(-1)).map(({ demand }) =>
        Object.keys(materials).find(key => materials[key].strength >= demand));
      if (deck.every(Boolean)) cheapest = Math.min(cheapest, bridgeCost(deck, supports));
    }
    assert.ok(cheapest <= target, `${name}: ${cheapest} > ${budget}`);
  }
});

test('a middle support can save a weak bridge, but cannot repair a missing section', () => {
  const deck = Array(5).fill('wood');
  assert.ok(inspectBridge(deck, new Set(), 2).some(tile => tile.strength < tile.demand));
  assert.ok(inspectBridge(deck, new Set([2]), 2).every(tile => tile.strength >= tile.demand));
  deck[2] = null;
  assert.equal(inspectBridge(deck, new Set([2]), 2)[2].strength, 0);
});

test('the sorter marks by shape after the colors stop predicting the category', () => {
  const expected = { round: 'Круг', square: 'Квадрат', triangle: 'Треугольник', diamond: 'Ромб', star: 'Звезда' };
  for (let seed = 0; seed < 6; seed++) {
    const first = sorterBatch(0, seed);
    const second = sorterBatch(1, seed);
    assert.equal(second.length, 14);
    assert.equal(new Set(second.map(item => item.mark)).size, 4);
    assert.ok(first.every(item => item.guess === expected[item.mark]));
    assert.ok(second.filter(item => item.guess !== expected[item.mark]).length >= 5);
    for (const item of second) {
      assert.ok(sortResult(item, item.mark));
      assert.ok(!sortResult(item, null));
      assert.ok(!sortResult(item, Object.keys(expected).find(mark => mark !== item.mark)));
    }
  }
});


test('bridge scores reward economy and all levels allow three stars', () => {
  for (const level of bridgeLevels) {
    assert.equal(bridgeStars(level.target, level.target), 3);
    assert.equal(bridgeStars(level.target + 1, level.target), 2);
    assert.equal(bridgeStars(level.budget, level.target), 1);
  }
});

test('each later conveyor shift has more items and types and less time', () => {
  for (let round = 1; round < shifts.length; round++) {
    const batch = sorterBatch(round, 12);
    assert.equal(batch.length, shifts[round].count);
    assert.equal(new Set(batch.map(item => item.mark)).size, shifts[round].shapes);
    assert.ok(batch.length > shifts[round - 1].count);
    assert.ok(shifts[round].duration < shifts[round - 1].duration);
  }
});
