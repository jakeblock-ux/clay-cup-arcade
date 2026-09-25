'use strict';
(() => {
const $ = id => document.getElementById(id);
const cupSeparator = '<img class="cup-separator" src="assets/cup-separator.png" width="20" height="20" alt="" aria-hidden="true">';
const roster = [
 {id:'leszek',sheet:'leszek-sheet-v2.png',portraitImage:'leszek-portrait.png',name:'LESZEK',region:'EUROPE',type:'THE TACTICIAN',special:'Signal Surge',color:'#42bafa',power:4,speed:3,range:4,portrait:[170,223,228,250]},
 {id:'sabrina',name:'SABRINA',region:'AMERICAS',type:'THE ALL-ROUNDER',special:'Pipeline Pulse',color:'#ff852c',power:4,speed:4,range:3,portrait:[460,223,233,250]},
 {id:'avik',name:'AVIK',region:'ASIA',type:'THE COMBO SPECIALIST',special:'Data Storm',color:'#ba69ff',power:3,speed:5,range:3,portrait:[752,223,234,250]},
 {id:'ben',name:'BEN',region:'OCEANIA',type:'THE HEAVY HITTER',special:'Clay Breaker',color:'#fbe241',power:5,speed:2,range:4,portrait:[1040,223,231,250]},
 {id:'owen',name:'OWEN',region:'THE HOSTS',type:'THE MIC MASTER',special:'Mic Hook · throw & pull',color:'#4f9eff',power:4,speed:4,range:4,host:true},
 {id:'munnawar',name:'MUNNAWAR',region:'THE HOSTS',type:'THE CROWD CONTROLLER',special:'Mic Hook · throw & pull',color:'#ba69ff',power:4,speed:3,range:5,host:true},
 {id:'kareem',name:'KAREEM',region:'SECRET BOSS',type:'THE FLOATING FOUNDER',color:'#f4bd58',power:5,speed:2,range:5,boss:true},
 {id:'varun',name:'VARUN',region:'SECRET BOSS',type:'THE FINAL FORCE',color:'#57ddf2',power:5,speed:3,range:5,boss:true}
];
const stage = new Image(), reference = new Image(), effects = new Image(), microphone = new Image(), sheets = {};
let atlas={}, loaded=false, selected=1, mode='select', resumeMode='fight', opponents=[], matchIndex=0, wins=[0,0], fighters=[], projectiles=[], particles=[], phaseTimer=0, timer=60, shake=0, flash=0, sound=true, soundEngine=null, last=0, totalTime=0, combo=0, comboTime=0, roundResolved=false;
const frameCache={}, portraitCache={};
let hostsUnlocked=false;
try{hostsUnlocked=localStorage.getItem('clay-cup-hosts-v1')==='unlocked';}catch{}
let bossEncounter=false,bossPhase=0,confetti=[],confettiTime=0,micBounds=null;
const confettiCanvas=$('confetti'),confettiContext=confettiCanvas.getContext('2d');
function availableFighters(){return hostsUnlocked?6:4;}
function roundName(){return ['QUALIFIER','QUARTERFINAL','SEMIFINAL','THE FINAL'][4-opponents.length+matchIndex]||'THE FINAL';}
function clearBossAlert(){$('boss-alert').classList.add('hidden');}

const keys=new Set(), keyboardKeys=new Set(), pointerInputs=new Map();
let lastScreen=null, previewFrame=-1, previewFighter=-1;
const canvas=$('game'), ctx=canvas.getContext('2d'), preview=$('preview').getContext('2d');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const actions={punch:{frame:4,duration:.33,startup:.10,damage:8,range:120},kick:{frame:5,duration:.58,startup:.22,damage:13,range:169},special:{frame:6,duration:.7,startup:.25,damage:17,range:0}};
actions.push={frame:4,duration:1.1,startup:.72,damage:12,range:660};
actions.pull={frame:5,duration:1.15,startup:.78,damage:8,range:680};
function portraitHTML(i){const f=roster[i];if(f.portraitImage)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 228 250" role="img" aria-label="${f.name}"><image href="assets/${f.portraitImage}" width="228" height="250" preserveAspectRatio="xMidYMid slice"/><svg x="169" y="6" width="53" height="48" viewBox="339 229 53 48"><image href="assets/selection-reference.png" width="1448" height="1086"/></svg></svg>`;if(!f.portrait)return `<img src="${portraitCache[f.id]||''}" alt="${f.name}" style="background:${f.color}33">`;const [x,y,w,h]=f.portrait;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${f.name}"><image href="assets/selection-reference.png" width="1448" height="1086"/></svg>`;}
function renderRoster(){
 $('roster').innerHTML=roster.slice(0,4).map((f,i)=>`<button class="fighter-card" data-fighter="${i}" aria-pressed="false" aria-label="Choose ${f.name}"><span class="portrait">${portraitHTML(i)}</span><strong>${f.name}</strong></button>`).join('');
 $('host-roster').innerHTML=roster.slice(4,6).map((f,n)=>hostsUnlocked?`<button class="host-card" data-fighter="${n+4}" aria-pressed="false" aria-label="Choose ${f.name}"><span class="host-portrait">${portraitHTML(n+4)}</span><span><strong>${f.name}</strong><small>MIC HOOK ${cupSeparator} UNLOCKED</small></span></button>`:`<div class="host-card locked"><span class="lock-mark" aria-hidden="true">?</span><span><strong>SECRET HOST</strong><small>WIN THE SECRET FINAL</small></span></div>`).join('');
 $('host-status').textContent=hostsUnlocked?'THE HOSTS ARE IN.':'TWO HOSTS. ONE SECRET.';
}
for(const id of ['roster','host-roster'])$(id).addEventListener('click',e=>{const card=e.target.closest('[data-fighter]');if(card)select(Number(card.dataset.fighter));});
function select(i){if(mode!=='select')return;selected=(i+availableFighters())%availableFighters();const f=roster[selected];document.querySelectorAll('[data-fighter]').forEach(b=>{const active=Number(b.dataset.fighter)===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});$('fighter-name').textContent=f.name;$('fighter-region').textContent=f.region;$('fighter-type').textContent=f.type;$('fighter-special').innerHTML=`Special: ${f.special.replace(' · ',cupSeparator)}`;$('fighter-stats').innerHTML=[['POWER',f.power],['SPEED',f.speed],['RANGE',f.range]].map(([name,n])=>`<div class="stat"><label>${name}</label><span>${[1,2,3,4,5].map(v=>`<i class="${v<=n?'on':''}"></i>`).join('')}</span></div>`).join('');playSound('select');}
function loadImage(img,url){return new Promise((resolve,reject)=>{img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(url));img.src=url;});}
async function loadAssets(){
 $('start-button').disabled=true;
 try{
 const jobs=[loadImage(stage,'assets/stage.png'),loadImage(reference,'assets/selection-reference.png'),loadImage(new Image(),'assets/leszek-portrait.png'),loadImage(effects,'assets/effects.png'),loadImage(microphone,'assets/microphone.png')];
 for(const f of roster){sheets[f.id]=new Image();jobs.push(loadImage(sheets[f.id],`assets/${f.sheet||f.id+'-sheet.png'}`));}
 const manifest=await fetch('assets/atlas.json');if(!manifest.ok)throw new Error('atlas');atlas=(await manifest.json()).fighters;await Promise.all(jobs);prepareFrames();preparePortraits();prepareMicrophone();loaded=true;renderRoster();select(selected);$('load-status').classList.add('hidden');$('start-button').disabled=false;
 }catch(e){$('load-status').textContent='ARTWORK COULD NOT LOAD. TAP TO RETRY.';$('load-status').style.cursor='pointer';$('load-status').onclick=loadAssets;}
}
function playSound(cue){if(sound)soundEngine?.play(cue);}
function renderSoundButton(){
 $('sound-button').setAttribute('aria-pressed',String(sound));$('sound-button').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');$('sound-button').innerHTML=`♪ <span>SOUND ${sound?'ON':'OFF'}</span>`;
}
function enableAudio(){
 if(!sound)return;
 try{soundEngine??=new window.ClayChiptune();if(!soundEngine.enabled)soundEngine.setEnabled(true);else soundEngine.resume();sound=soundEngine.enabled;}catch{sound=false;}
 renderSoundButton();
}
function setSound(){
 sound=!sound;
 if(sound)enableAudio();else soundEngine?.setEnabled(false);
 renderSoundButton();if(sound)playSound('on');
}
function unlockAudio(event){if(event.target?.closest?.('#sound-button'))return;enableAudio();}
// User gestures unlock Web Audio on browsers that block automatic playback.
window.addEventListener('pointerup',unlockAudio,{capture:true});
window.addEventListener('click',unlockAudio,{capture:true});
window.addEventListener('keydown',unlockAudio,{capture:true});
function prepareFrames(){
 for(const fighter of roster){const info=atlas[fighter.id],im=sheets[fighter.id];frameCache[fighter.id]=info.frameOrder.map(name=>{
  const data=info.frames[name],r=data.sourceRect,c=document.createElement('canvas');c.width=r[2];c.height=r[3];const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(im,...r,0,0,c.width,c.height);const pixels=cx.getImageData(0,0,c.width,c.height),rgba=pixels.data,n=c.width*c.height,visited=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;const seed=data.alphaComponentSeedLocal[1]*c.width+data.alphaComponentSeedLocal[0];visited[seed]=1;queue[tail++]=seed;
  while(head<tail){const q=queue[head++],x=q%c.width,y=Math.floor(q/c.width);for(const next of [x>0?q-1:-1,x<c.width-1?q+1:-1,y>0?q-c.width:-1,y<c.height-1?q+c.width:-1])if(next>=0&&!visited[next]&&rgba[next*4+3]>info.alphaThreshold){visited[next]=1;queue[tail++]=next;}}
  for(let i=0;i<n;i++)if(!visited[i])rgba[i*4+3]=0;cx.putImageData(pixels,0,0);return {canvas:c,pivot:data.pivot};
 });}
}
function preparePortraits(){for(let i=4;i<roster.length;i++){const f=roster[i],c=document.createElement('canvas');c.width=240;c.height=260;const context=c.getContext('2d');context.fillStyle=f.color+'44';context.fillRect(0,0,240,260);drawSprite(context,f.id,0,120,610,575);portraitCache[f.id]=c.toDataURL();}}
function prepareMicrophone(){const c=document.createElement('canvas');c.width=microphone.width;c.height=microphone.height;const context=c.getContext('2d',{willReadFrequently:true});context.drawImage(microphone,0,0);const pixels=context.getImageData(0,0,c.width,c.height).data;let left=c.width,top=c.height,right=0,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>24){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}micBounds=[left,top,right-left+1,bottom-top+1];}
function drawSprite(context,id,frame,x,baseline,targetHeight,face=1,alpha=1){const source=frameCache[id]?.[frame];if(!source)return;const scale=targetHeight/atlas[id].standingHeight;context.save();context.translate(x,baseline);context.scale(face,1);context.globalAlpha=alpha;context.imageSmoothingEnabled=false;context.drawImage(source.canvas,-source.pivot[0]*scale,-source.pivot[1]*scale,source.canvas.width*scale,source.canvas.height*scale);context.restore();}
function drawPreview(){if(mode!=='select'||!loaded)return;const frame=reducedMotion?0:Math.floor(totalTime*3)%2;if(previewFrame===frame&&previewFighter===selected)return;previewFrame=frame;previewFighter=selected;preview.clearRect(0,0,440,470);if(!loaded)return;preview.save();preview.fillStyle='#09060abd';preview.beginPath();preview.ellipse(215,431,126,17,0,0,Math.PI*2);preview.fill();drawSprite(preview,roster[selected].id,frame,220,440,386);preview.restore();}
function createFighter(index,cpu){return {index,cpu,x:cpu?930:350,y:0,vy:0,face:cpu?-1:1,hp:100,maxHp:100,forceVelocity:0,forceTime:0,energy:60,action:'idle',actionTime:0,duration:0,cooldown:0,hitDone:false,stun:0,block:false,moving:false,aiTimer:.7,aiMove:0};}
function startTournament(){if(!loaded||mode!=='select')return;bossEncounter=false;bossPhase=0;opponents=[0,1,2,3].filter(i=>i!==selected);matchIndex=0;startMatch();}
function startMatch(){bossEncounter=false;clearBossAlert();$('boss-cue').classList.add('hidden');wins=[0,0];roundResolved=false;fighters=[createFighter(selected,false),createFighter(opponents[matchIndex],true)];projectiles=[];particles=[];resetInput();mode='versus';phaseTimer=2.8;$('selection').classList.add('hidden');$('arena').classList.remove('hidden');$('battle-controls').classList.remove('hidden');$('versus').classList.remove('hidden');$('result').classList.add('hidden');$('pause').classList.add('hidden');$('announcement').classList.add('hidden');$('vs-player').innerHTML=portraitHTML(selected);$('vs-cpu').innerHTML=portraitHTML(opponents[matchIndex]);$('vs-player-name').textContent=roster[selected].name;$('vs-cpu-name').textContent=roster[opponents[matchIndex]].name;$('versus-round').textContent=roundName();$('p-name').textContent=roster[selected].name;$('cpu-name').textContent=roster[opponents[matchIndex]].name;$('match-label').textContent=`MATCH ${matchIndex+1} / ${opponents.length}`;timer=60;updateHUD();$('arena').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'});playSound('start');}
function startRound(){if(bossEncounter){startBoss();return;}fighters=[createFighter(selected,false),createFighter(opponents[matchIndex],true)];projectiles=[];particles=[];resetInput();roundResolved=false;timer=60;combo=0;mode='intro';phaseTimer=2;$('versus').classList.add('hidden');announce(`ROUND ${wins[0]+wins[1]+1}`);updateHUD();playSound('round');}
function announce(text){if($('announcement').textContent!==text)$('announcement').textContent=text;$('announcement').classList.remove('hidden');}
function backToSelect(){soundEngine?.stop();mode='select';bossEncounter=false;confetti=[];confettiCanvas.classList.add('hidden');clearBossAlert();$('boss-cue').classList.add('hidden');renderRoster();fighters=[];resetInput();$('arena').classList.add('hidden');$('battle-controls').classList.add('hidden');$('selection').classList.remove('hidden');$('pause').classList.add('hidden');select(selected);$('start-button').focus({preventScroll:true});}
function togglePause(){if(mode==='pause'){soundEngine?.resume();mode=resumeMode;$('pause').classList.add('hidden');}else if(['fight','intro','versus','roundover','approaching','swap'].includes(mode)){resumeMode=mode;mode='pause';soundEngine?.stop();resetInput();$('pause').classList.remove('hidden');$('resume-button').focus({preventScroll:true});}}
function attack(f,type){if(mode!=='fight'||f.stun>0||f.cooldown>0||f.action!=='idle'||f.block||!actions[type])return false;if(type==='special'&&f.energy<40){if(!f.cpu)playSound('empty');return false;}if(type==='special')f.energy-=40;f.action=type;f.duration=actions[type].duration;f.actionTime=0;f.cooldown=f.duration+.05;f.hitDone=false;f.moving=false;playSound(['push','pull'].includes(type)?'charge':type==='special'&&roster[f.index].host?'mic':type);return true;}
function jump(f){if(mode==='fight'&&f.y===0&&f.stun<=0&&f.action==='idle'&&!f.block){f.vy=660;playSound('jump');}}
function hit(target,source,damage,pointX,pointY,special=false){
 if(target.hp<=0||mode!=='fight')return false;
 const guarding=target.block&&target.y===0&&((source.x-target.x)*target.face>0);
 const dealt=guarding?Math.max(1,Math.round(damage*.2)):damage;
 target.hp=Math.max(bossEncounter&&target.cpu&&bossPhase===0?target.maxHp/2:0,target.hp-dealt);
 target.energy=Math.min(100,target.energy+(guarding?5:8));source.energy=Math.min(100,source.energy+7);target.stun=guarding?.1:.23;
 target.x=Math.max(95,Math.min(1185,target.x+source.face*(guarding?9:23)));
 if(!guarding){target.action='idle';target.actionTime=0;target.cooldown=Math.max(target.cooldown,.22);}
 particles.push({x:pointX,y:pointY,life:.28,max:.28,type:guarding?'block':'hit',special});
 if(!reducedMotion)shake=guarding?3:8;flash=guarding?0:.035;playSound(guarding?'block':'hit');
 if(!source.cpu&&!guarding){combo=comboTime>0?combo+1:1;comboTime=1.2;}
 if(bossEncounter&&target.cpu&&bossPhase===0&&target.hp<=target.maxHp/2)swapBoss();
 else if(target.hp<=0)finishRound(source.cpu?1:0);
 return !guarding;
}
function applyForce(target,source,pull,strength=1){
 if(mode!=='fight'||target.hp<=0)return;
 const distance=Math.abs(target.x-source.x),direction=Math.sign(target.x-source.x)||source.face;
 target.forceTime=.42;
 target.forceVelocity=(pull?-direction:direction)*(pull?Math.max(0,distance-102):290)/.42*strength;
 target.stun=Math.max(target.stun,.42*strength);target.forceSource=source;target.forcePull=pull;
}
function resolveAttack(f,other){
 const a=actions[f.action];if(!a||f.hitDone||f.actionTime<a.startup)return;f.hitDone=true;
 if(f.action==='push'||f.action==='pull'){
  const pull=f.action==='pull';playSound(f.action);particles.push({x:f.x,y:435,life:.55,max:.55,type:pull?'pull':'push',face:f.face,color:roster[f.index].color});
  if(Math.abs(other.x-f.x)<a.range&&other.y<95){const unblocked=hit(other,f,a.damage,other.x,435-other.y,true);applyForce(other,f,pull,unblocked?1:.18);}return;
 }
 if(f.action==='special'){projectiles.push({kind:roster[f.index].host?'mic':'orb',x:f.x+f.face*70,y:435-f.y,vx:f.face*(roster[f.index].host?700:550),owner:f,life:1.65,color:roster[f.index].color,returning:false});return;}
 const distance=(other.x-f.x)*f.face,range=a.range+(roster[f.index].range-3)*8;
 if(distance>0&&distance<range&&Math.abs(f.y-other.y)<100){const power=1+(roster[f.index].power-4)*.1;hit(other,f,Math.round(a.damage*power),other.x-other.face*30,425-other.y);}
}
function finishRound(winner){if(roundResolved||mode!=='fight')return;roundResolved=true;wins[winner]++;mode='roundover';phaseTimer=2.6;resetInput();announce(timer<=0?'TIME UP': 'K.O.');fighters[1-winner].action='defeat';fighters[winner].action='victory';projectiles=[];updateHUD();playSound('ko');}
function showResult(){
 const won=wins[0]>wins[1];
 if(won&&!bossEncounter&&matchIndex===opponents.length-1){beginBossApproach();return;}
 mode='result';$('announcement').classList.add('hidden');$('boss-cue').classList.add('hidden');$('result').classList.remove('hidden');
 const champion=bossEncounter&&won;
 $('result-kicker').innerHTML=champion?'KAREEM + VARUN DEFEATED':bossEncounter?'SECRET FINAL':`${roundName()} ${cupSeparator} ${wins[0]} – ${wins[1]}`;
 $('result-title').textContent=champion?'CUP CHAMPION!':won?'YOU WIN!':'DEFEATED';
 $('result-trophy').style.color=won?'var(--acid)':'#705776';
 $('result-copy').textContent=champion?'Owen & Munnawar are now playable. Throw the mic. Pull them in.':bossEncounter?'Two founders. One more shot. Rematch to challenge Kareem and Varun again.':won?`${roster[selected].name} advances. The next challenger is waiting.`:'Every champion starts with a rematch.';
 $('continue-button').textContent=champion?'PLAY AS THE HOSTS ▶':won?'NEXT CHALLENGER ▶':'REMATCH ↻';
 $('unlock-reveal').classList.toggle('hidden',!champion);
 playSound(champion?'unlock':won?'victory':'defeat');
 if(champion){hostsUnlocked=true;try{localStorage.setItem('clay-cup-hosts-v1','unlocked');$('unlock-save').textContent='UNLOCK SAVED ON THIS DEVICE';}catch{$('unlock-save').textContent='UNLOCKED FOR THIS SESSION';}$('unlock-faces').innerHTML=[4,5].map(i=>`<div>${portraitHTML(i)}<strong>${roster[i].name}</strong></div>`).join('');startConfetti();}
 $('result-progress').innerHTML=Array.from({length:opponents.length+1},(_,i)=>`<span class="${i<matchIndex+(won?1:0)||(bossEncounter&&(i<opponents.length||won))?'won':''}"></span>`).join('');
 $('continue-button').focus({preventScroll:true});
}
function continueGame(){if(mode!=='result')return;if(bossEncounter){if(wins[0]>wins[1]){backToSelect();select(4);}else startBoss();return;}if(wins[0]>=2)matchIndex++;startMatch();}
function beginBossApproach(){
 bossEncounter=true;bossPhase=0;mode='approaching';phaseTimer=3.6;resetInput();projectiles=[];particles=[];
 $('result').classList.add('hidden');$('announcement').classList.add('hidden');
 $('boss-alert').classList.remove('hidden');$('boss-alert').classList.remove('swap-alert');
 $('boss-alert-kicker').textContent='THE CUP WAS ONLY THE BEGINNING';$('boss-alert-title').textContent='!!!Aproaching!!!!';
 $('boss-alert-copy').textContent='A secret challenger has entered the arena.';playSound('boss');
}
function startBoss(){
 bossEncounter=true;bossPhase=0;wins=[0,0];roundResolved=false;fighters=[createFighter(selected,false),createFighter(6,true)];fighters[1].hp=fighters[1].maxHp=200;fighters[1].aiTimer=1.1;
 projectiles=[];particles=[];resetInput();timer=99;combo=0;mode='intro';phaseTimer=2.6;
 clearBossAlert();$('selection').classList.add('hidden');$('arena').classList.remove('hidden');$('battle-controls').classList.remove('hidden');$('versus').classList.add('hidden');$('result').classList.add('hidden');$('pause').classList.add('hidden');$('boss-cue').classList.add('hidden');
 $('p-name').textContent=roster[selected].name;announce('SECRET FINAL');updateHUD();
}
function swapBoss(){
 const old=fighters[1];bossPhase=1;fighters[1]={...createFighter(7,true),x:old.x,face:old.face,hp:old.hp,maxHp:200,aiTimer:1.2};
 fighters[0].action='idle';fighters[0].forceTime=0;fighters[0].stun=0;fighters[0].block=false;
 mode='swap';phaseTimer=2.2;resetInput();projectiles=[];particles=[];$('boss-cue').classList.add('hidden');
 $('boss-alert').classList.remove('hidden');$('boss-alert').classList.add('swap-alert');
 $('boss-alert-kicker').textContent='HALF HEALTH. WHOLE NEW PROBLEM.';$('boss-alert-title').textContent='VARUN TAKES OVER';$('boss-alert-copy').textContent='The final force. Jump or block the push and pull.';updateHUD();playSound('swap');
}
function startConfetti(){
 confettiTime=0;confettiCanvas.width=window.innerWidth||1280;confettiCanvas.height=window.innerHeight||800;confettiCanvas.classList.remove('hidden');
 confetti=Array.from({length:reducedMotion?45:140},()=>({x:Math.random()*confettiCanvas.width,y:Math.random()*confettiCanvas.height-confettiCanvas.height,vx:(Math.random()-.5)*70,vy:90+Math.random()*130,rotation:Math.random()*6,color:['#efff00','#ff721c','#ec2383','#b960fa','#57ddf2'][Math.floor(Math.random()*5)]}));
 if(reducedMotion){confetti.forEach(p=>p.y+=confettiCanvas.height);drawConfetti();}
}
function drawConfetti(){const c=confettiContext;c.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);for(const p of confetti){c.save();c.translate(p.x,p.y);c.rotate(p.rotation);c.fillStyle=p.color;c.fillRect(-3,-5,6,10);c.restore();}}
function updateConfetti(dt){if(!confetti.length||mode==='pause'||reducedMotion)return;confettiTime+=dt;for(const p of confetti){p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation+=dt*2;if(p.y>confettiCanvas.height+15&&confettiTime<7)p.y=-15;}drawConfetti();if(confettiTime>14){confetti=[];confettiCanvas.classList.add('hidden');}}
function updateHUD(){if(fighters.length<2)return;$('arena').classList.toggle('boss-match',bossEncounter);if(bossEncounter){$('cpu-name').textContent=roster[fighters[1].index].name;$('match-label').textContent='SECRET FINAL';}for(const [i,prefix] of ['p','cpu'].entries()){$(`${prefix}-health`).style.width=`${fighters[i].hp/fighters[i].maxHp*100}%`;$(`${prefix}-energy`).style.width=`${fighters[i].energy}%`;$(`${prefix}-rounds`).textContent=bossEncounter?(i===1?`PHASE ${bossPhase+1} / 2`:'FINAL'):[0,1].map(n=>wins[i]>n?'●':'○').join(' ');}$('timer').textContent=String(Math.max(0,Math.ceil(timer))).padStart(2,'0');const energy=Math.floor(fighters[0].energy);$('touch-energy').textContent=energy>=40?'READY':`${energy}%`;const special=document.querySelector('[data-key="l"]');special.style.setProperty('--charge',`${energy}%`);special.classList.toggle('charging',energy<40);}
function updateFighter(f,other,dt){f.cooldown=Math.max(0,f.cooldown-dt);f.stun=Math.max(0,f.stun-dt);f.energy=Math.min(100,f.energy+dt*6);f.moving=false;if(f.action==='idle')f.face=other.x>=f.x?1:-1;
 if(f.y>0||f.vy>0){f.y+=f.vy*dt;f.vy-=1650*dt;if(f.y<=0){f.y=0;f.vy=0;}}
 if(actions[f.action]){f.actionTime+=dt;resolveAttack(f,other);if(f.actionTime>=f.duration)f.action='idle';}
 if(mode!=='fight')return;
 let move=0;f.block=false;
 if(f.forceTime>0){const amount=f.forceVelocity*Math.min(dt,f.forceTime);f.forceTime=Math.max(0,f.forceTime-dt);if(!f.forcePull||Math.abs(f.x-f.forceSource.x)>102){const oldSide=Math.sign(f.x-f.forceSource.x);f.x+=amount;if(f.forcePull&&(Math.sign(f.x-f.forceSource.x)!==oldSide||Math.abs(f.x-f.forceSource.x)<102))f.x=f.forceSource.x+oldSide*102;}}
 if(f.cpu&&bossEncounter){updateBoss(f,other,dt);f.x=Math.max(90,Math.min(1190,f.x));return;}

 if(f.cpu){f.aiTimer-=dt;const distance=Math.abs(other.x-f.x);if(f.aiTimer<=0){f.aiTimer=.17+Math.random()*.3;f.aiMove=distance>150?f.face:distance<90?-f.face:0;const chance=Math.random();if(distance<185&&other.action!=='idle'&&chance<.3){f.guardUntil=totalTime+.35;}else if(distance<130&&chance<.52)attack(f,'punch');else if(distance<178&&chance<.78)attack(f,'kick');else if(distance>180&&chance<.38)attack(f,'special');else if(chance>.91)jump(f);}f.block=(f.guardUntil||0)>totalTime&&f.action==='idle'&&f.y===0;move=f.aiMove;
 }else{f.block=(keys.has('s')||keys.has('arrowdown'))&&f.action==='idle'&&f.y===0;move=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);}
 if(f.stun<=0&&!f.block&&f.action==='idle'){const speed=250+(roster[f.index].speed-3)*20;f.x+=move*speed*dt;f.moving=!!move;}
 f.x=Math.max(90,Math.min(1190,f.x));
 if(!f.cpu&&f.stun<=0){const held=new Set([...pointerInputs.values()].map(p=>p.key));if(held.has('w'))jump(f);for(const [key,type] of [['l','special'],['k','kick'],['j','punch']])if(held.has(key)&&attack(f,type))break;}
}
function updateBoss(f,other,dt){
 const distance=Math.abs(other.x-f.x);f.aiTimer-=dt;
 if(f.aiTimer<=0&&f.action==='idle'&&f.stun<=0){f.aiTimer=1.5+Math.random()*.6;
  if(distance<130&&Math.random()<.45)attack(f,'punch');else{const move=(f.nextForce||0)%2===0?'pull':'push';f.nextForce=(f.nextForce||0)+1;attack(f,move);}
 }
 if(f.stun<=0&&f.action==='idle'&&distance>340){f.x+=f.face*(bossPhase?115:70)*dt;f.moving=true;}
 const telegraph=['push','pull'].includes(f.action)&&!f.hitDone;
 $('boss-cue').classList.toggle('hidden',!telegraph);
 if(telegraph){$('boss-cue').innerHTML=`${f.action==='push'?'FORCE PUSH':'GRAVITY PULL'} ${cupSeparator} JUMP OR BLOCK`;$('boss-cue').dataset.force=f.action;}
}
function update(dt){if(mode==='pause')return;totalTime+=dt;drawPreview();if(mode==='select'||mode==='result')return;
 if(mode==='approaching'){phaseTimer-=dt;if(phaseTimer<=0)startBoss();return;}
 if(mode==='swap'){phaseTimer-=dt;if(phaseTimer<=0){clearBossAlert();mode='fight';}return;}
 if(mode==='versus'){phaseTimer-=dt;if(phaseTimer<=0)startRound();return;}
 if(mode==='intro'){phaseTimer-=dt;if(phaseTimer<.7)announce('FIGHT!');if(phaseTimer<=0){mode='fight';$('announcement').classList.add('hidden');playSound('fight');}return;}
 if(mode==='roundover'){phaseTimer-=dt;if(phaseTimer<1.35)announce(bossEncounter?(wins[0]?'YOU WIN':'YOU LOSE'):wins[0]>=2?'YOU WIN':wins[1]>=2?'YOU LOSE':`${roster[fighters[fighters[0].action==='victory'?0:1].index].name} WINS`);if(phaseTimer<=0){if(bossEncounter||wins.some(n=>n>=2))showResult();else startRound();}return;}
 timer-=dt;comboTime=Math.max(0,comboTime-dt);shake=Math.max(0,shake-dt*45);flash=Math.max(0,flash-dt);
 const [p,c]=fighters;updateFighter(p,c,dt);if(mode!=='fight')return;updateFighter(c,p,dt);if(mode!=='fight')return;
 if(Math.abs(p.x-c.x)<74&&Math.abs(p.y-c.y)<135){const middle=(p.x+c.x)/2;const sign=p.x<c.x?-1:1;p.x=middle+sign*37;c.x=middle-sign*37;}
 for(const orb of projectiles){
  orb.life-=dt;const target=orb.owner===p?c:p;
  if(orb.kind==='mic'&&orb.returning){orb.x+=(orb.owner.x-orb.x)*Math.min(1,dt*14);orb.y+=(435-orb.owner.y-orb.y)*Math.min(1,dt*14);if(Math.abs(orb.x-orb.owner.x)<55)orb.life=0;continue;}
  orb.x+=orb.vx*dt;
  if(Math.abs(orb.x-target.x)<43&&Math.abs(orb.y-(435-target.y))<100){const unblocked=hit(target,orb.owner,orb.kind==='mic'?14:17,orb.x,orb.y,true);if(mode!=='fight')break;if(orb.kind==='mic'){if(unblocked){applyForce(target,orb.owner,true);playSound('hook');}orb.returning=true;orb.life=.48;}else orb.life=0;}
  else if(orb.kind==='mic'&&(orb.life<.75||orb.x<80||orb.x>1200)){orb.returning=true;orb.life=.48;}
 }
 projectiles=projectiles.filter(o=>o.life>0&&o.x>-100&&o.x<1380);particles.forEach(p=>p.life-=dt);particles=particles.filter(p=>p.life>0);if(timer<=0&&mode==='fight')finishRound(bossEncounter?1:p.hp>=c.hp?0:1);updateHUD();
}
function spriteFrame(f){if(f.action==='defeat')return 10;if(f.action==='victory')return 11;if(f.stun>0&&!f.block)return 8;if(f.block)return 7;if(actions[f.action])return actions[f.action].frame;if(f.y>0)return 9;if(f.moving)return 2+Math.floor(totalTime*7)%2;return Math.floor(totalTime*3)%2;}
function effect(context,index,x,y,size){if(!effects.naturalWidth)return;const rects=[[84,303,148,140],[330,250,232,242],[627,198,300,333],[964,221,272,301],[75,824,166,198],[335,803,259,252],[641,760,279,332],[975,791,250,286]];const r=rects[index];const scale=size/Math.max(r[2],r[3]);context.drawImage(effects,...r,x-r[2]*scale/2,y-r[3]*scale/2,r[2]*scale,r[3]*scale);}
function resizeArena(){const bounds=$('arena').getBoundingClientRect();if(bounds.width>0&&bounds.height>0){const width=Math.max(400,Math.round(720*bounds.width/bounds.height));if(canvas.width!==width)canvas.width=width;}}
function fighterHeight(f){return f.index===7?580:f.index===6?225:290;}
function draw(){
 const viewWidth=canvas.width;
 ctx.clearRect(0,0,viewWidth,720);ctx.imageSmoothingEnabled=false;if(!stage.naturalWidth)return;ctx.save();if(shake>0&&!reducedMotion)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);const distance=fighters.length===2?Math.abs(fighters[0].x-fighters[1].x):580;
 const tallest=Math.max(290,...fighters.map(f=>fighterHeight(f)));
 const horizontalZoom=Math.max(viewWidth/1280,Math.min(1,viewWidth/(distance+320+(tallest-290)*.5)));
 const zoom=Math.min(horizontalZoom,437/tallest);
 const half=viewWidth/(2*zoom),mid=fighters.length===2?(fighters[0].x+fighters[1].x)/2:640;
 const center=half>=640?640:Math.max(half,Math.min(1280-half,mid));
 const sw=Math.min(stage.width,stage.height*viewWidth/720),sx=Math.max(0,Math.min(stage.width-sw,center/1280*stage.width-sw/2));
 ctx.drawImage(stage,sx,0,sw,stage.height,0,0,viewWidth,720);ctx.fillStyle='rgba(13,5,24,.12)';ctx.fillRect(0,0,viewWidth,720);ctx.fillStyle='rgba(12,4,18,.22)';ctx.fillRect(0,0,viewWidth,125);
 ctx.save();ctx.translate(viewWidth/2-center*zoom,592*(1-zoom));ctx.scale(zoom,zoom);
 for(const f of fighters){ctx.fillStyle='#0d06196b';ctx.beginPath();ctx.ellipse(f.x,593,(f.index===7?130:78)-f.y*.04,17,0,0,Math.PI*2);ctx.fill();if(loaded)drawSprite(ctx,roster[f.index].id,spriteFrame(f),f.x,592-f.y-(f.index===6?50+(reducedMotion?0:Math.sin(totalTime*2.6)*8):0),fighterHeight(f),f.face,f.stun>0&&Math.floor(totalTime*22)%2===0?.72:1);if(f.block){ctx.strokeStyle='#b9dfff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(f.x+f.face*35,460-f.y,44,100,0,-Math.PI/2,Math.PI/2);ctx.stroke();}}
 for(const o of projectiles){if(o.kind==='mic'){
  ctx.strokeStyle=o.color;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(o.owner.x+o.owner.face*40,435-o.owner.y);ctx.quadraticCurveTo((o.owner.x+o.x)/2,o.y+35,o.x,o.y);ctx.stroke();
  if(micBounds){ctx.save();ctx.translate(o.x,o.y);ctx.scale(Math.sign(o.vx),1);const h=74*micBounds[3]/micBounds[2];ctx.drawImage(microphone,...micBounds,-37,-h/2,74,h);ctx.restore();}continue;
 }ctx.save();ctx.globalAlpha=.4;ctx.fillStyle=o.color;for(let i=1;i<5;i++)ctx.fillRect(o.x-Math.sign(o.vx)*i*20-13,o.y-7,26,14);ctx.restore();effect(ctx,4+Math.floor(totalTime*12)%4,o.x,o.y,118);}
 for(const p of particles){const t=1-p.life/p.max;if(p.type==='push'||p.type==='pull'){ctx.save();ctx.strokeStyle=p.color;ctx.globalAlpha=p.life/p.max;ctx.lineWidth=7;for(let i=0;i<3;i++){const radius=45+(p.type==='pull'?1-t:t)*560+i*35;ctx.beginPath();ctx.ellipse(p.x,p.y,radius,90+radius*.18,0,p.face>0?-1.2:Math.PI-1.2,p.face>0?1.2:Math.PI+1.2);ctx.stroke();}ctx.restore();continue;}ctx.save();ctx.globalAlpha=Math.min(1,p.life*8);effect(ctx,p.type==='block'?4+Math.min(3,Math.floor(t*4)):Math.min(3,Math.floor(t*4)),p.x,p.y,p.type==='block'?85:p.special?160:115);ctx.restore();}
 ctx.restore();
 if(combo>1&&comboTime>0){ctx.font='19px Arcade,monospace';ctx.fillStyle='#efff00';ctx.fillText(`${combo} HIT COMBO`,25,190);}
 if(flash>0&&!reducedMotion){ctx.fillStyle='#fff7c833';ctx.fillRect(0,0,viewWidth,720);}ctx.restore();
}
function tick(t){const dt=Math.min((t-last)/1000||0,.034);last=t;update(dt);soundEngine?.updateMusic(sound&&!document.hidden&&document.hasFocus()&&(mode==='select'||mode==='fight'));updateConfetti(dt);syncScreen();if(!['select','pause','result'].includes(mode))draw();requestAnimationFrame(tick);}
function onPress(key){if($('controls-dialog').open)return;if(['escape','p'].includes(key)){togglePause();return;}if(mode==='select'){if(['a','arrowleft'].includes(key))select(selected-1);if(['d','arrowright'].includes(key))select(selected+1);if(key==='enter')startTournament();return;}if(mode==='result'&&key==='enter'){continueGame();return;}if(mode==='versus'&&key==='enter'){startRound();return;}if(mode!=='fight')return;const p=fighters[0];p.block=(keys.has('s')||keys.has('arrowdown'))&&p.action==='idle'&&p.y===0;if(key==='w'||key==='arrowup')jump(p);if(key==='j')attack(p,'punch');if(key==='k')attack(p,'kick');if(key==='l')attack(p,'special');}
function syncInput(){
 keys.clear();for(const key of keyboardKeys)keys.add(key);for(const {key} of pointerInputs.values())if(key)keys.add(key);
 for(const button of document.querySelectorAll('[data-key]')){const held=[...pointerInputs.values()].some(p=>p.key===button.dataset.key);button.classList.toggle('held',held);}
}
function resetInput(){
 keyboardKeys.clear();keys.clear();const active=[...pointerInputs.entries()];pointerInputs.clear();
 for(const [id,p] of active)if(p.capture.hasPointerCapture?.(id))p.capture.releasePointerCapture(id);
 for(const b of document.querySelectorAll('[data-key]'))b.classList.remove('held');
}
function syncScreen(){if(lastScreen===mode)return;lastScreen=mode;document.body.dataset.screen=mode;document.body.classList.toggle('in-match',mode!=='select');if(mode!=='select')resizeArena();if(mode!=='fight')resetInput();for(const b of document.querySelectorAll('[data-key]'))b.disabled=mode!=='fight';}
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if($('controls-dialog').open)return;if(['arrowleft','arrowright','arrowup','arrowdown',' ','enter','w','a','s','d','j','k','l','p','escape'].includes(key)){if(e.target instanceof HTMLButtonElement&&['enter',' '].includes(key))return;e.preventDefault();const wasDown=keyboardKeys.has(key);keyboardKeys.add(key);syncInput();if(!wasDown)onPress(key);}});
window.addEventListener('keyup',e=>{keyboardKeys.delete(e.key.toLowerCase());syncInput();});
function suspend(){soundEngine?.stop();resetInput();if(['fight','intro','versus','roundover','approaching','swap'].includes(mode))togglePause();}
function resumeAudio(){if(!document.hidden&&document.hasFocus())soundEngine?.resume();}
window.addEventListener('blur',suspend);
window.addEventListener('focus',resumeAudio);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else resumeAudio();});
window.addEventListener('orientationchange',suspend);
window.screen?.orientation?.addEventListener('change',suspend);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeArena).observe($('arena'));else window.addEventListener('resize',resizeArena);
for(const b of document.querySelectorAll('[data-key]')){
 b.addEventListener('contextmenu',e=>e.preventDefault());
 b.addEventListener('pointerdown',e=>{if(mode!=='fight'||e.button>0)return;e.preventDefault();b.setPointerCapture(e.pointerId);pointerInputs.set(e.pointerId,{key:b.dataset.key,capture:b});syncInput();onPress(b.dataset.key);});
 b.addEventListener('pointermove',e=>{const input=pointerInputs.get(e.pointerId);if(!input||!b.closest('.dpad'))return;e.preventDefault();const over=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-key]');const key=over?.closest('.dpad')===b.closest('.dpad')?over.dataset.key:null;if(input.key!==key){input.key=key;syncInput();if(key)onPress(key);}});
 const release=e=>{pointerInputs.delete(e.pointerId);syncInput();};
 b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
}
$('start-button').addEventListener('click',startTournament);$('continue-button').addEventListener('click',continueGame);$('reselect-button').addEventListener('click',backToSelect);$('quit-button').addEventListener('click',backToSelect);$('pause-button').addEventListener('click',togglePause);$('resume-button').addEventListener('click',togglePause);$('sound-button').addEventListener('click',setSound);
$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen-button').title='Fullscreen is unavailable in this browser';}});
$('help-button').addEventListener('click',()=>{if(['fight','intro','versus','roundover','approaching','swap'].includes(mode))togglePause();$('controls-dialog').showModal();});$('close-help').addEventListener('click',()=>$('controls-dialog').close());$('help-done').addEventListener('click',()=>$('controls-dialog').close());
function snapshot(){return {screen:mode,fighter:roster[selected].name,match:matchIndex+1,roundWins:[...wins],seconds:Math.ceil(timer),fighters:fighters.map(f=>({name:roster[f.index].name,health:f.hp,energy:Math.round(f.energy)})),assetsReady:loaded,hostsUnlocked,secretFinal:bossEncounter,bossPhase:bossEncounter?bossPhase+1:null};}
if(document.modelContext?.registerTool){const defs=[{name:'read_clay_cup',description:'Read the current Clay Cup screen, fighter, and match score.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>snapshot()},{name:'select_clay_cup_fighter',description:'Select a fighter on the Clay Cup fighter-selection screen without starting a match.',inputSchema:{type:'object',properties:{fighter:{type:'string',enum:roster.slice(0,6).map(f=>f.name)}},required:['fighter'],additionalProperties:false},execute:input=>{const i=roster.findIndex(f=>f.name===input.fighter);if(i<0||i>=availableFighters()||mode!=='select')throw new Error('Select a valid fighter on the selection screen.');select(i);return snapshot();}},{name:'start_clay_cup',description:'Start a Clay Cup arcade tournament using the selected fighter.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>{if(mode!=='select'||!loaded)throw new Error('Return to selection and wait for assets.');startTournament();return snapshot();}}];for(const tool of defs){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}}}
renderRoster();
if(!document.documentElement.requestFullscreen)$('fullscreen-button').hidden=true;select(selected);syncScreen();loadAssets();requestAnimationFrame(tick);
})();
