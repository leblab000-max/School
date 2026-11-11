import test from 'node:test';import assert from 'node:assert/strict';import {modules} from '../grade6-data.js';
test('sixth grade is a five-module learning sequence',()=>assert.equal(modules.length,5));
test('every module has goal, concept, success criteria and product result',()=>assert.ok(modules.every(m=>m.goal&&m.concept&&m.success&&m.result)));
test('every module has a named interactive mini-game',()=>assert.ok(modules.every(m=>m.game&&m.activities.length===2)));
test('course combines decisions with active construction',()=>assert.ok(modules.every(m=>m.activities.some(a=>a.type==='choice')&&m.activities.some(a=>a.type!=='choice'))));
test('mission data has no external-service configuration',()=>assert.ok(modules.every(m=>!('apiKey' in m)&&!('endpoint' in m))));
