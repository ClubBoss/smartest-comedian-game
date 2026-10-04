import fs from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync('ops/PARTY_V2_CONTENT.json','utf8'));
const base='https://smartest-comedian-game.blufferus.workers.dev';
const key=process.env.QUESTION_BANK_ADMIN_KEY;
if(!key) throw Error('Admin credential unavailable');
assert.equal(d.questions.length,24); assert.equal(d.packs.length,5);
const fields=['prompt','answer','answerVariants','explanation','hostNotes','category','difficulty','sourceLabel','sourceUrl','status','hints','tags'];
const compare=q=>Object.fromEntries(fields.map(k=>[k,k==='tags'?[...q[k]].sort():q[k]]));
const stripVolatile=q=>{const c=structuredClone(q);delete c.updatedAt;delete c.createdAt;for(const a of c.assets??[])delete a.previewUrl;return c};
async function req(path,opt={},admin=true){
 const headers={...opt.headers};if(admin)headers['x-question-bank-key']=key;
 const r=await fetch(base+path,{...opt,headers,signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);
 return r.json();
}
function health(h){assert.equal(h.ok,true);assert.equal(h.database,'ok');assert.equal(h.buildSha,d.expectedBuildSha);}
health(await req('/api/health',{},false));
const qb=await req('/api/questions'),pb=await req('/api/question-packs');
assert.ok(qb.questions.length>=20,'Existing game bank missing');
assert.ok(['Qualifier A','Qualifier B','Final'].every(n=>pb.packs.some(p=>p.name===n)),'Existing packs missing');
const targets=new Map(d.questions.map(q=>[q.id,q]));
const targetPacks=new Map(d.packs.map(p=>[p.id,p]));
const oldQs=qb.questions.filter(q=>!targets.has(q.id));
const oldPacks=pb.packs.filter(p=>!targetPacks.has(p.id));
for(const q of qb.questions.filter(q=>targets.has(q.id)))assert.deepEqual(compare(q),compare(targets.get(q.id)),'V2 UUID collision/content drift');
for(const p of pb.packs.filter(p=>targetPacks.has(p.id))){const t=targetPacks.get(p.id);assert.equal(p.name,t.name);assert.deepEqual(p.questionIds,t.questionIds);}
for(const q of d.questions){
 if(qb.questions.some(x=>x.id===q.id))continue;
 const payload={id:q.id,...compare(q),assets:[]};
 const form=new FormData();form.set('payload',JSON.stringify(payload));
 assert.equal((await req('/api/questions',{method:'POST',body:form})).id,q.id);
}
for(const p of d.packs){
 if(pb.packs.some(x=>x.id===p.id))continue;
 assert.equal((await req('/api/question-packs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)})).id,p.id);
}
health(await req('/api/health',{},false));
const qa=await req('/api/questions'),pa=await req('/api/question-packs');
for(const q of oldQs)assert.deepEqual(stripVolatile(qa.questions.find(x=>x.id===q.id)),stripVolatile(q),'Original question changed');
for(const p of oldPacks)assert.deepEqual(pa.packs.find(x=>x.id===p.id),p,'Original pack changed');
for(const q of d.questions)assert.deepEqual(compare(qa.questions.find(x=>x.id===q.id)),compare(q),'V2 readback failed');
for(const p of d.packs){const a=pa.packs.find(x=>x.id===p.id);assert.equal(a.name,p.name);assert.deepEqual(a.questionIds,p.questionIds);}
assert.equal(qa.questions.length,oldQs.length+24);
assert.equal(pa.packs.length,oldPacks.length+5);
console.log(JSON.stringify({status:'verified',revision:d.revision,questions:24,packs:d.packs.map(p=>({name:p.name,count:p.questionIds.length})),preservedQuestions:oldQs.length,preservedPacks:oldPacks.length,verifiedAt:new Date().toISOString()},null,2));
