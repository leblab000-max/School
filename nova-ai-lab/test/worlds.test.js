import test from 'node:test';import assert from 'node:assert/strict';import {worlds} from '../data.js';
test('first grade has four worlds',()=>assert.equal(Object.keys(worlds).length,4));
test('each world ends with its own rule',()=>assert.equal(new Set(Object.values(worlds).map(x=>x.missions[2].correct)).size,4));
test('each world has three meaningful missions',()=>assert.ok(Object.values(worlds).every(x=>x.missions.length===3)));
test('each world contains a choice, sequence and rule mission',()=>assert.ok(Object.values(worlds).every(x=>x.missions.map(m=>m.type).join(',')==='choose,sequence,rule')));
test('sequence missions contain three ordered actions',()=>assert.ok(Object.values(worlds).every(x=>x.missions[1].steps.length===3)));
test('each world has a child-friendly achievement',()=>assert.ok(Object.values(worlds).every(x=>x.achievement?.length>3)));
