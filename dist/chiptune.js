'use strict';
// Original arcade audio, synthesized locally. No audio downloads or API keys.
window.ClayChiptune=class ClayChiptune {
 constructor(context=null){this.context=context;this.enabled=false;this.ready=false;this.voices=new Set();this.lastCue=new Map();this.musicPlaying=false;this.step=0;this.nextStep=0;}
 prepare(){
  if(this.ready)return;
  this.context??=new (window.AudioContext||window.webkitAudioContext)();
  const c=this.context;this.master=c.createGain();this.master.gain.value=.3;
  this.effects=c.createGain();this.effects.gain.value=.85;this.music=c.createGain();this.music.gain.value=.2;
  const limiter=c.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=8;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.12;
  this.effects.connect(this.master);this.music.connect(this.master);this.master.connect(limiter);limiter.connect(c.destination);
  this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const samples=this.noise.getChannelData(0);let value=0;
  for(let i=0;i<samples.length;i++){if(i%6===0)value=Math.random()*2-1;samples[i]=value;}
  this.ready=true;
 }
 setEnabled(enabled){
  this.enabled=enabled;if(!enabled){this.stop();return;}
  try{this.prepare();this.resume();}catch{this.enabled=false;}
 }
 resume(){if(!this.enabled||!this.ready||['running','closed'].includes(this.context.state))return Promise.resolve();return this.context.resume().catch(()=>{});}
 voice(source,duration,volume,when,bus,filter=null){
  const c=this.context,g=c.createGain(),start=Math.max(c.currentTime,when),end=start+duration;
  const entry={source,g,filter,bus};this.voices.add(entry);
  g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(volume,start+.003);g.gain.exponentialRampToValueAtTime(.0001,end);
  if(filter){source.connect(filter);filter.connect(g);}else source.connect(g);g.connect(bus);
  source.onended=()=>{source.disconnect();g.disconnect();filter?.disconnect();this.voices.delete(entry);};
  source.start(start);source.stop(end+.012);
 }
 tone(frequency,duration=.1,type='square',volume=.12,delay=0,endFrequency=frequency,bus=this.effects){
  const c=this.context,o=c.createOscillator(),when=c.currentTime+delay;o.type=type;o.frequency.setValueAtTime(frequency,when);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),when+duration);
  this.voice(o,duration,volume,when,bus);
 }
 hiss(duration=.08,volume=.12,frequency=1600,delay=0,bus=this.effects){
  const c=this.context,n=c.createBufferSource(),f=c.createBiquadFilter();n.buffer=this.noise;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.6;this.voice(n,duration,volume,c.currentTime+delay,bus,f);
 }
 notes(notes,spacing=.1,type='square',volume=.12,tail=.3){notes.forEach((n,i)=>this.tone(n,i===notes.length-1?tail:spacing*.85,type,volume,i*spacing));}
 play(cue){
  if(!this.enabled)return;
  try{
   this.prepare();this.resume();const now=this.context.currentTime;if(now-(this.lastCue.get(cue)??-10)<(cue==='empty'?.35:.04))return;this.lastCue.set(cue,now);
   // Bound combat polyphony; scheduled song voices use their own quiet bus.
   const active=[...this.voices].filter(v=>v.bus===this.effects);if(active.length>24)return;
   switch(cue){
    case 'select':this.tone(880,.055,'square',.075,0,1320);break;
    case 'on':case 'start':this.notes([262,330,392,523],.07,'square',.11,.18);break;
    case 'round':this.notes([523,523,784],.15,'triangle',.18,.2);break;
    case 'fight':this.notes([523,784,1047],.065,'square',.14,.2);this.hiss(.08,.09);break;
    case 'punch':this.tone(180,.09,'square',.1,0,65);this.hiss(.035,.13,2300);break;
    case 'kick':this.tone(110,.18,'triangle',.28,0,38);this.hiss(.065,.2,700);break;
    case 'hit':this.tone(150,.12,'triangle',.25,0,45);this.hiss(.09,.26,1600);break;
    case 'block':this.tone(950,.06,'square',.09,0,700);this.tone(1470,.09,'square',.055,.03);break;
    case 'jump':this.tone(240,.15,'square',.065,0,780);break;
    case 'special':this.tone(130,.22,'square',.08,0,1047);this.notes([523,622,784,1047],.05,'triangle',.12,.15);break;
    case 'mic':this.tone(1200,.18,'square',.07,0,260);this.hiss(.09,.09,3200);break;
    case 'hook':this.tone(880,.035,'square',.1);this.tone(110,.1,'triangle',.25,.025,60);break;
    case 'charge':this.tone(110,.35,'triangle',.14,0,330);break;
    case 'push':this.tone(440,.28,'square',.1,0,70);this.hiss(.16,.23,850);break;
    case 'pull':this.tone(90,.32,'triangle',.22,0,700);this.tone(180,.32,'square',.05,0,1400);break;
    case 'boss':this.notes([131,139,131,92.5],.22,'square',.14,.4);this.tone(46.25,1.1,'triangle',.2);break;
    case 'swap':this.tone(65,.45,'triangle',.23,0,523);this.tone(262,.22,'square',.12,.45);break;
    case 'ko':this.tone(220,.4,'square',.1,0,38);this.hiss(.2,.2,650);break;
    case 'victory':this.notes([523,659,784,1047],.12,'square',.12,.45);break;
    case 'defeat':this.notes([392,349,311,196],.17,'triangle',.2,.5);break;
    case 'unlock':this.notes([523,587,659,784,1047,1319],.09,'square',.1,.4);this.notes([262,330,392,523],.18,'triangle',.16,.5);break;
    case 'empty':this.tone(110,.08,'square',.05,0,75);break;
   }
  }catch{}
 }
 updateMusic(playing){
  if(!this.enabled||!playing){if(this.musicPlaying)this.stopMusic();return;}
  try{
   this.prepare();const c=this.context;if(c.state!=='running')return;
   const sixteenth=60/144/4;
   if(!this.musicPlaying){this.musicPlaying=true;this.step=0;this.nextStep=c.currentTime+.025;}
   if(this.nextStep<c.currentTime-.1)this.nextStep=c.currentTime+.025;
   // Eight original bars in C minor, with a 150ms scheduling window.
   const melody=[[72,75,79,75,72,0,70,72],[68,72,75,79,75,72,70,68],[70,74,77,74,70,72,74,77],[67,71,74,77,74,71,69,67],[72,79,84,79,75,79,82,79],[80,79,75,72,68,72,75,79],[82,77,74,77,79,77,74,70],[79,77,74,71,67,71,74,71]];
   const roots=[36,32,34,31,36,32,34,31],hz=n=>440*2**((n-69)/12);
   while(this.nextStep<c.currentTime+.15){
    const bar=Math.floor(this.step/16)%8,beat=this.step%16,delay=Math.max(0,this.nextStep-c.currentTime);
    if(beat%2===0){const note=melody[bar][beat/2];if(note)this.tone(hz(note),sixteenth*1.55,'square',.2,delay,hz(note),this.music);this.hiss(.035,.11,5800,delay,this.music);}
    if(beat%4===0){const note=roots[bar]+[0,7,12,7][beat/4];this.tone(hz(note),sixteenth*3.3,'triangle',.48,delay,hz(note),this.music);}
    if(beat===0||beat===8)this.tone(125,.12,'triangle',.55,delay,36,this.music);
    if(beat===4||beat===12)this.hiss(.095,.3,1800,delay,this.music);
    this.step=(this.step+1)%128;this.nextStep+=sixteenth;
   }
  }catch{}
 }
 stopMusic(){this.musicPlaying=false;for(const v of [...this.voices])if(v.bus===this.music){try{v.source.stop();}catch{}v.source.disconnect();v.g.disconnect();v.filter?.disconnect();this.voices.delete(v);}}
 stop(){this.stopMusic();for(const v of [...this.voices]){try{v.source.stop();}catch{}v.source.disconnect();v.g.disconnect();v.filter?.disconnect();}this.voices.clear();this.lastCue.clear();}
};
