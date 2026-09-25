import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const app=path.join(root,'dist');
for(const file of ['game.js','chiptune.js'])execFileSync(process.execPath,['--check',path.join(app,file)]);
function localResource(ref){
 if(/^(?:data:|https?:|#|\.\/$)/.test(ref))return;
 const clean=decodeURIComponent(ref.split(/[?#]/)[0]);
 assert(existsSync(path.join(app,clean)),`Missing resource: ${clean}`);
}
const html=readFileSync(path.join(app,'index.html'),'utf8');
for(const [,ref] of html.matchAll(/(?:src|href)="([^"$]+)"/g))localResource(ref);
const css=readFileSync(path.join(app,'style.css'),'utf8');
for(const [,ref] of css.matchAll(/url\(['"]?([^'"()]+)['"]?\)/g))localResource(ref);
const atlas=JSON.parse(readFileSync(path.join(app,'assets/atlas.json'),'utf8'));
let frames=0;
for(const [id,sheet] of Object.entries(atlas.fighters)){
 const png=readFileSync(path.join(app,'assets',sheet.file));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${id}: PNG signature`);
 assert.equal(png.readUInt32BE(16),sheet.width,`${id}: width`);
 assert.equal(png.readUInt32BE(20),sheet.height,`${id}: height`);
 assert(sheet.standingHeight>0,`${id}: standing height`);
 assert.equal(sheet.frameOrder.length,12,`${id}: pose count`);
 for(const name of sheet.frameOrder){
  const frame=sheet.frames[name];assert(frame,`${id}: missing ${name}`);
  const [x,y,w,h]=frame.sourceRect;
  assert([x,y,w,h].every(Number.isInteger)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=sheet.width&&y+h<=sheet.height,`${id}/${name}: bounds`);
  const [sx,sy]=frame.alphaComponentSeedLocal;
  assert(Number.isInteger(sx)&&Number.isInteger(sy)&&sx>=0&&sy>=0&&sx<w&&sy<h,`${id}/${name}: seed`);
  assert(frame.pivot.every(Number.isFinite),`${id}/${name}: pivot`);frames++;
 }
}
console.log(`Passed: JavaScript syntax, local links, ${Object.keys(atlas.fighters).length} sprite sheets and ${frames} animation frames.`);
