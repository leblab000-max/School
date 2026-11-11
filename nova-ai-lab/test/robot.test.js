import test from 'node:test';import assert from 'node:assert/strict';
import {robotLevels,parseMap,createRun,stepRobot,simulateRobot,evaluateRobot,previewRobotRoute,robotBudgetHint,validateProgram,normaliseDraft} from '../robot-engine.js';
const move=action=>({type:'move',action}),repeat=(times,action='F')=>({type:'repeat',times,action});
const rule={type:'until',condition:'wall',yes:'R',no:'F'};
const delivery='RFFFLFRFLFLFFRFFLFRFRFFFF'.split('').map(move);
const loopProgram=[repeat(6),move('R'),repeat(4),move('R'),repeat(6)];
test('all shipped maps are rectangular and have start, station and packages',()=>{for(const l of robotLevels)for(const m of l.maps){const p=parseMap(m);assert.ok(p.width>=4);assert.ok(p.packets.length);assert.ok(m.energy>0);}});
test('each level has a valid solution within its actual block and energy limits',()=>{[delivery,loopProgram,[rule],[rule]].forEach((p,i)=>{const proof=evaluateRobot(robotLevels[i],p);assert.equal(proof.ok,true,JSON.stringify(proof));});});
test('turning changes direction but not coordinates',()=>{const map=robotLevels[0].maps[0],r=stepRobot(map,[move('R'),move('F')],createRun(map));assert.equal(r.x,0);assert.equal(r.y,0);assert.equal(r.dir,2);assert.equal(r.steps,1);});
test('collision preserves last valid position and identifies the failing block',()=>{const map=robotLevels[0].maps[0],r=simulateRobot(map,[move('F'),move('F'),move('F'),move('R')]);assert.equal(r.status,'failed');assert.equal(r.activeBlock,2);assert.equal(r.x,2);assert.equal(r.y,0);assert.deepEqual(r.blocked,{x:3,y:0});assert.match(r.message,/Блок 3/);});
test('no commands after collision execute and a corrected rerun starts cleanly',()=>{const m=robotLevels[0].maps[0],program=[move('L'),move('F'),move('R')];const r=simulateRobot(m,program);assert.equal(r.steps,2);assert.equal(stepRobot(m,program,r),r);assert.equal(evaluateRobot(robotLevels[0],delivery).ok,true);});
test('arrival without all packages is not victory',()=>{const m={rows:['>G◆'],energy:10};const r=simulateRobot(m,[move('F')]);assert.equal(r.status,'failed');assert.equal(r.remaining.length,1);});
test('a package is collected once even when revisiting its cell',()=>{const m={rows:['>◆.G'],energy:20};const r=simulateRobot(m,[move('F'),move('R'),move('R'),move('F'),move('R'),move('R'),repeat(3)]);assert.equal(r.status,'won');assert.equal(r.remaining.length,0);});
test('repeat expands to multiple steps and stops immediately at the goal',()=>{const m={rows:['>..G'],energy:10};const r=simulateRobot(m,[repeat(8)]);assert.equal(r.status,'won');assert.equal(r.steps,3);});
test('loop puzzle rejects a long uncompressed program and a one-off forward step',()=>{assert.match(validateProgram(Array.from({length:6},()=>move('F')),robotLevels[1]),/максимум 5/);assert.match(validateProgram([move('F')],robotLevels[1]),/цикл/);});
test('sensor evaluates current state on each step, not initial state',()=>{assert.equal(evaluateRobot(robotLevels[2],[rule]).ok,true);assert.equal(evaluateRobot(robotLevels[3],[rule]).results.length,3);});
test('inverted condition with inverted branches has the same correct behavior',()=>{assert.equal(evaluateRobot(robotLevels[3],[{...rule,condition:'clear',yes:'F',no:'R'}]).ok,true);});
test('a bad sensor rule cannot loop forever',()=>{const m=robotLevels[2].maps[0],r=simulateRobot(m,[{...rule,yes:'L',no:'L'}]);assert.equal(r.status,'failed');assert.equal(r.steps,m.energy);assert.match(r.message,/Лимит/);});
test('commands after an until block and malformed commands are rejected',()=>{assert.match(validateProgram([rule,move('F')],robotLevels[2]),/последним/);assert.match(validateProgram([repeat(0)],robotLevels[1]),/от 2 до 12/);assert.match(validateProgram([move('BAD')],robotLevels[0]),/Неизвестная/);});
test('draft normalization rejects unavailable, malformed and oversized data',()=>{assert.deepEqual(normaliseDraft(null,robotLevels[0]),[]);assert.deepEqual(normaliseDraft([null,{},rule,move('BAD'),move('F')],robotLevels[0]),[move('F')]);assert.equal(normaliseDraft(Array.from({length:200},()=>move('F')),robotLevels[0]).length,28);});
test('validation does not mutate the program or the level maps',()=>{const before=JSON.stringify([robotLevels,loopProgram]);evaluateRobot(robotLevels[1],loopProgram);assert.equal(JSON.stringify([robotLevels,loopProgram]),before);});

test('route recording can continue a partial route and still detects real collisions',()=>{
  const map=robotLevels[0].maps[0];
  const partial=previewRobotRoute(map,[move('F'),move('F')]);
  assert.equal(partial.status,'ready');
  assert.equal(partial.x,2);
  assert.equal(partial.steps,2);
  const collision=previewRobotRoute(map,[move('F'),move('F'),move('F')]);
  assert.equal(collision.status,'failed');
  assert.deepEqual(collision.blocked,{x:3,y:0});
  assert.equal(previewRobotRoute(map,delivery).status,'won');
});

test('robot distinguishes full blocks, spent moves and a route that ended early',()=>{
  const level=robotLevels[0];
  const map=level.maps[0];
  const ready=createRun(map);
  const full=Array.from({length:level.maxBlocks},()=>move('R'));
  assert.match(robotBudgetHint(level,map,full,ready,true),/^Блоки закончились/);
  assert.match(robotBudgetHint(level,map,full,{...ready,steps:map.energy},false),/^Ходы закончились/);
  const incomplete=simulateRobot(map,[move('F')]);
  assert.match(robotBudgetHint(level,map,[move('F')],incomplete,false),/Добавь недостающие шаги/);
  const won=simulateRobot(map,delivery);
  assert.equal(robotBudgetHint(level,map,full,won,false),'');
});
