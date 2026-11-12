// A deterministic educational agent. Commands are instructions, not a neural model.
export const robotLevels=[
 {id:'delivery',title:'Сначала груз, потом станция',concept:'Последовательность и отладка',brief:'Собери два пакета ◆ и доберись до станции ⚡. Стрелка на роботе показывает, куда он смотрит.',hint:'Сначала доберись до верхнего пакета, затем найди проход к нижнему. Поворот меняет направление, но не клетку.',maxBlocks:28,allowed:['move'],maps:[{name:'Склад',rows:['>..#..','.#.#◆.','.#....','...##.','#◆....','...#.G'],energy:40}]},
 {id:'loops',title:'Короткая программа',concept:'Циклы',brief:'Пройди длинный коридор и собери все пакеты, используя не больше 5 блоков. Одинаковые шаги объедини в цикл.',hint:'Нужны три прямых участка. Посчитай клетки до каждого поворота и замени серии шагов блоками «Повторить».',maxBlocks:5,allowed:['move','repeat'],requires:'repeat',maps:[{name:'П-образный коридор',rows:['>.....◆','######.','######.','######.','G.....◆'],energy:21}]},
 {id:'sensors',title:'Увидеть препятствие',concept:'Условие «если — то»',brief:'Составь правило по датчику: робот видит, есть ли стена впереди. Повторяй правило, пока не достигнешь станции.',hint:'На этой карте проход поворачивает вправо. Когда впереди стена, нужно повернуть; иначе можно идти вперёд.',maxBlocks:4,allowed:['move','repeat','if','until'],requires:'until',maps:[{name:'Датчик в коридоре',rows:['>....◆','#####.','#####.','G....◆'],energy:30}]},
 {id:'transfer',title:'Одна программа — три карты',concept:'Проверка на новых условиях',brief:'Найди одно правило, которое соберёт пакеты и приведёт к станции на всех трёх картах. Во время общей проверки программу менять нельзя.',hint:'На всех картах коридор делает правые повороты, но длины участков и начальное направление отличаются. Фиксированного числа шагов недостаточно.',maxBlocks:3,allowed:['if','until'],requires:'until',maps:[
 {name:'Карта A: длинный коридор',rows:['>.....◆','######.','G.....◆'],energy:35},
 {name:'Карта B: другая длина',rows:['>..◆','###.','###.','###.','G..◆'],energy:35},
 {name:'Карта C: другой старт',rows:['◆...◆','.###.','.###.','^###G'],energy:35}
 ]}
];
export const actionLabels={F:'Шаг вперёд',L:'Повернуть налево',R:'Повернуть направо'};
const vectors=[[0,-1],[1,0],[0,1],[-1,0]],starts='^>v<';
export function parseMap(map){const rows=map.rows;if(!Array.isArray(rows)||!rows.length||rows.some(r=>typeof r!=='string'||r.length!==rows[0].length))throw new Error('Некорректная карта');let start,goal;const packets=[];rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(starts.includes(c)&&c!==''){if(start)throw new Error('Два старта');start={x,y,dir:starts.indexOf(c)};}if(c==='G'){if(goal)throw new Error('Две цели');goal={x,y};}if(c==='◆')packets.push(`${x},${y}`);}));if(!start||!goal)throw new Error('Нет старта или станции');return {rows,width:rows[0].length,height:rows.length,start,goal,packets};}
export function validateProgram(program,level){if(!Array.isArray(program)||!program.length)return 'Сначала добавь хотя бы один блок.';if(program.length>level.maxBlocks)return `Слишком длинная программа: максимум ${level.maxBlocks} блоков.`;for(const b of program){if(!b||!level.allowed.includes(b.type))return 'Этот блок недоступен на данном уровне.';if(['move','repeat'].includes(b.type)&&!actionLabels[b.action])return 'Неизвестная команда.';if(b.type==='repeat'&&(!Number.isInteger(b.times)||b.times<2||b.times>12))return 'Цикл должен повторяться от 2 до 12 раз.';if(['if','until'].includes(b.type)&&(!['wall','clear'].includes(b.condition)||!actionLabels[b.yes]||!actionLabels[b.no]))return 'Проверь условие и обе ветви правила.';}if(level.requires&&!program.some(b=>b.type===level.requires))return level.requires==='repeat'?'Используй хотя бы один цикл «Повторить».':'Используй блок «Повторять правило до станции».';const until=program.findIndex(b=>b.type==='until');if(until>=0&&until!==program.length-1)return 'После блока «До станции» не должно быть команд: помести его последним.';return null;}
export function normaliseDraft(draft,level){return Array.isArray(draft)?draft.filter(b=>b&&typeof b==='object'&&level.allowed.includes(b.type)&&(['move','repeat'].includes(b.type)?!!actionLabels[b.action]:['wall','clear'].includes(b.condition)&&!!actionLabels[b.yes]&&!!actionLabels[b.no])).slice(0,level.maxBlocks).map(b=>['move','repeat'].includes(b.type)?{type:b.type,action:b.action,...(b.type==='repeat'?{times:Number.isInteger(b.times)&&b.times>=2&&b.times<=12?b.times:2}:{})}:{type:b.type,condition:b.condition,yes:b.yes,no:b.no}):[];}
export function createRun(map){const m=parseMap(map);return {...m.start,pc:0,repeatIndex:0,steps:0,remaining:[...m.packets],trail:[{...m.start}],status:'ready',message:'Программа готова к запуску.',activeBlock:null,blocked:null,lastAction:null};}
export function wallAhead(map,run){const m=parseMap(map),[dx,dy]=vectors[run.dir];const x=run.x+dx,y=run.y+dy;return x<0||y<0||x>=m.width||y>=m.height||m.rows[y][x]==='#';}
export function stepRobot(map,program,previous){if(['won','failed'].includes(previous.status))return previous;const r={...previous,remaining:[...previous.remaining],trail:[...previous.trail],status:'running',blocked:null};if(r.pc>=program.length)return {...r,status:'failed',message:r.remaining.length?`Программа закончилась. Осталось пакетов: ${r.remaining.length}.`:'Программа закончилась до станции. Добавь команды.'};if(r.steps>=map.energy)return {...r,status:'failed',message:`Лимит ${map.energy} действий исчерпан. Проверь, не повторяется ли робот на месте.`};const b=program[r.pc];r.activeBlock=r.pc;let action=b.action,observation=null;if(['if','until'].includes(b.type)){const wall=wallAhead(map,r);observation=wall?'впереди стена':'впереди свободно';const check=b.condition==='wall'?wall:!wall;action=check?b.yes:b.no;}if(!actionLabels[action])return {...r,status:'failed',message:'Неизвестная команда.'};r.steps++;r.lastAction=action;if(action==='F'){if(wallAhead(map,r)){const [dx,dy]=vectors[r.dir];return {...r,status:'failed',blocked:{x:r.x+dx,y:r.y+dy},message:`Блок ${r.pc+1}: шаг упёрся в ${r.x+dx<0||r.y+dy<0||r.x+dx>=map.rows[0].length||r.y+dy>=map.rows.length?'границу поля':'стену'}. Исправь этот блок и запусти заново.`};}const [dx,dy]=vectors[r.dir];r.x+=dx;r.y+=dy;r.remaining=r.remaining.filter(p=>p!==`${r.x},${r.y}`);}else r.dir=(r.dir+(action==='R'?1:3))%4;r.trail.push({x:r.x,y:r.y,dir:r.dir});r.message=`${observation?`Датчик: ${observation} → `:''}${actionLabels[action]}. Действие ${r.steps}.`;
const m=parseMap(map);if(r.x===m.goal.x&&r.y===m.goal.y&&r.remaining.length===0)return {...r,status:'won',message:`Станция достигнута, все пакеты собраны. Действий: ${r.steps}.`};if(b.type==='repeat'){r.repeatIndex++;if(r.repeatIndex>=b.times){r.pc++;r.repeatIndex=0;}}else if(b.type!=='until')r.pc++;if(r.pc>=program.length)return {...r,status:'failed',message:r.remaining.length?`Программа закончилась. Осталось пакетов: ${r.remaining.length}.`:'Программа закончилась до станции. Добавь команды.'};return r;}
export function simulateRobot(map,program){let r=createRun(map);let guard=0;while(!['won','failed'].includes(r.status)&&guard++<map.energy+2)r=stepRobot(map,program,r);return r;}
// Route recording uses the same engine as playback. An unfinished route can be extended.
export function previewRobotRoute(map, program) {
  if (!program.length) return createRun(map);
  const run = simulateRobot(map, program);
  if (run.status === 'failed' && run.pc === program.length && !run.blocked) {
    return { ...run, status: 'ready', message: 'Команда записана. Продолжай маршрут.' };
  }
  return run;
}
export function evaluateRobot(level,program){const error=validateProgram(program,level);if(error)return {ok:false,error,results:[]};const results=level.maps.map(m=>simulateRobot(m,program));return {ok:results.every(r=>r.status==='won'),results,error:null};}
export function describeBlock(b){if(b.type==='move')return actionLabels[b.action];if(b.type==='repeat')return `Повторить ${b.times} ${b.times>=5?'раз':b.times>=2?'раза':'раз'}: ${actionLabels[b.action].toLowerCase()}`;return `${b.type==='until'?'До станции: ':''}если впереди ${b.condition==='wall'?'стена':'свободно'} → ${actionLabels[b.yes].toLowerCase()}, иначе → ${actionLabels[b.no].toLowerCase()}`;}

export function robotBudgetHint(level, map, program, run, driving) {
  if (run.status === 'won') return '';
  if (run.steps >= map.energy) {
    return 'Ходы закончились. Убери лишние шаги или повороты и запусти программу заново.';
  }

  const full = program.length >= level.maxBlocks;
  if (!driving && run.status === 'failed' && !run.blocked && run.pc >= program.length) {
    return full
      ? 'Команды закончились до станции, а все блоки заняты. Замени часть маршрута или объедини одинаковые команды, если доступен цикл.'
      : 'Робот выполнил все команды. Добавь недостающие шаги до груза или станции.';
  }
  if (!full) return '';
  if (driving) return 'Блоки закончились. Отмени последние ходы и попробуй более короткий маршрут.';
  if (level.allowed.includes('repeat')) {
    return 'Все блоки заняты. Объедини одинаковые команды в «Повторить» или замени лишний блок.';
  }
  return 'Все блоки заняты. Измени или удали блок в редакторе, чтобы освободить место.';
}
