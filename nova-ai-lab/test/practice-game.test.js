import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios,simulatePlan } from '../practice-game.js';
import { practiceDraft,practiceCard } from '../practice.js';
import { sceneFor } from '../quest-scenes.js';
import {lessons} from '../lab-content.js';

test('each practice scenario responds to each condition independently', () => {
  for(const scenario of scenarios) {
    const keys=['time','people','budget'];
    const baseline=simulatePlan(scenario,keys);
    assert.ok(baseline.ok);
    for(const missing of keys) {
      const attempt=simulatePlan(scenario,keys.filter(key=>key!==missing));
      assert.equal(attempt.ok,false);
      assert.deepEqual(attempt.checks.filter(check=>!check.ok).map(check=>check.id),[missing]);
    }
    assert.equal(simulatePlan(scenario,['noise']).ok,false);
    assert.equal(simulatePlan(scenario,[...keys,'noise']).ok,true);
  }
});

test('new practical work resumes, validates its milestones and exports the idea', () => {
  const partial=practiceDraft({version:2,passed:[0,2,2,9],idea:'Квест для друзей',check:'Пройти за 10 минут'});
  assert.deepEqual(partial.passed,[0]);
  assert.equal(partial.comparison,'');
  const finished=practiceDraft({...partial,passed:[2,1,0]});
  assert.ok(finished.comparison);
  const card=practiceCard(finished,x=>String(x).replaceAll('<','&lt;'));
  assert.ok(card.includes(partial.idea));
  assert.ok(card.includes(partial.check));
  assert.equal(practiceDraft({...finished,check:''}).comparison,'');
});

test('every investigation scene keeps the original valid action mapping', () => {
  for(const id of [1,6,8,9,11]) {
    lessons[id].rounds.forEach((round,i)=>{
      const scene=sceneFor(id,i);
      assert.equal(scene.actions.length,round[1].length);
      assert.ok(scene.actions[round[2]]);
      assert.ok(scene.good.length&&scene.bad.length);
    });
  }
});
