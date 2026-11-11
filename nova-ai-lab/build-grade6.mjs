import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist');
for(const file of ['grade6-next.html','grade6-next.js','grade6-next.css','lab-content.js','robot-engine.js','robot-game.js','quiz-studio.js','adventure.js','adventure-field.js','adventure-field.css','quiz-guidance.js','arcade.js','arcade.css','practice.js'])await cp(file,`dist/${file}`);
await cp('grade6-next.html','dist/index.html');
