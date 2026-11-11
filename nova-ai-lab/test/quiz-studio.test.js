import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeQuiz,encodeQuiz,quizTrial,validateQuiz} from '../quiz-studio.js';

const sample = () => ({
  title: 'Футбол ⚽',
  questions: Array.from({length:4},(_,i)=>({
    text:'Вопрос '+(i+1),answers:['Один','Два','Три'],correct:i%3,
  })),
  name:'Имя из локального профиля',
});

test('shared quiz round trips Cyrillic and carries only the quiz',()=>{
  const draft=sample();
  const link=encodeQuiz(draft);
  const decoded=decodeQuiz(link);
  assert.deepEqual(decoded,{v:1,title:draft.title,questions:draft.questions});
  assert.equal(Object.hasOwn(decoded,'name'),false);
});

test('incomplete or duplicate answers cannot be shared',()=>{
  const draft=sample();
  draft.questions[3].answers=['  Два','два ','Три'];
  assert.match(validateQuiz(draft),/разными/);
  assert.equal(encodeQuiz(draft),'');
  draft.questions[3].answers=['','Два','Три'];
  assert.match(validateQuiz(draft),/три варианта/);
});

test('malformed and oversized links are handled without a crash',()=>{
  for(const hash of ['#quiz=','#quiz=bad%','##','#quiz='+ 'a'.repeat(9001),'#quiz=e30']){
    assert.equal(decodeQuiz(hash),null);
  }
});

test('an author trial belongs to the exact version tested',()=>{
  const draft=sample();
  draft.lastTrial={quiz:encodeQuiz(draft),answers:[0,0,2,0]};
  assert.deepEqual(quizTrial(draft),{changed:false,score:3,missed:[2]});
  draft.questions[1].explanation='Ответ указан в заметке.';
  assert.deepEqual(quizTrial(draft),{changed:true});
  assert.equal(decodeQuiz(encodeQuiz(draft)).questions[1].explanation,'Ответ указан в заметке.');
});
