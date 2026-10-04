import fs from 'node:fs';import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync('ops/PARTY_V2_CONTENT.json','utf8'));
const base='https://smartest-comedian-game.blufferus.workers.dev',key=process.env.QUESTION_BANK_ADMIN_KEY;
if(!key)throw Error('Admin credential unavailable');
assert.equal(d.questions.length,24);assert.equal(d.packs[0].questionIds.length,12);assert.equal(d.packs[1].questionIds.length,11);
assert.equal(new Set(d.packs.flatMap(p=>p.questionIds)).size,23);
for(const e of d.excludedFromPlay)assert.ok(!d.packs.some(p=>p.questionIds.includes(e.id)));
const fields=['prompt','answer','answerVariants','explanation','hostNotes','category','difficulty','sourceLabel','sourceUrl','status','hints','tags'];
const cmp=q=>Object.fromEntries(fields.map(k=>[k,k==='tags'?[...q[k]].sort():q[k]]));
async function req(path,opt={},admin=true){const headers={...opt.headers};if(admin)headers['x-question-bank-key']=key;const r=await fetch(base+path,{...opt,headers,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return r.json();}
function health(h){assert.equal(h.ok,true);assert.equal(h.database,'ok');assert.equal(h.buildSha,d.expectedBuildSha);}
const packcmp=p=>({id:p.id,name:p.name,description:p.description,questionIds:p.questionIds});
const clean=q=>{let c=structuredClone(q);for(let a of c.assets??[])delete a.previewUrl;return c;};
health(await req('/api/health',{},false));
const qb=await req('/api/questions'),pb=await req('/api/question-packs');
for(const q of d.questions)assert.deepEqual(cmp(qb.questions.find(x=>x.id===q.id)),cmp(q),'Question content drift');
const changes=d.archiveChanges;
for(const ch of changes){const a=pb.packs.find(p=>p.id===ch.before.id);assert.ok(a);assert.ok([ch.before,ch.after].some(p=>JSON.stringify(packcmp(p))===JSON.stringify(packcmp(a))),'Archive drift');}
for(const p of d.packs){const a=pb.packs.find(x=>x.id===p.id);if(a)assert.deepEqual(packcmp(a),packcmp(p),'Short pack drift');}
const targetIds=new Set([...changes.map(x=>x.before.id),...d.packs.map(x=>x.id)]);
const untouched=pb.packs.filter(p=>!targetIds.has(p.id));
async function save(p){assert.equal((await req('/api/question-packs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)})).id,p.id);}
for(const p of d.packs)if(!pb.packs.some(x=>x.id===p.id))await save(p);
for(const ch of changes)if(pb.packs.find(p=>p.id===ch.after.id).name!==ch.after.name)await save(ch.after);
health(await req('/api/health',{},false));
const qa=await req('/api/questions'),pa=await req('/api/question-packs');
assert.equal(qa.questions.length,qb.questions.length);
for(const q of qb.questions)assert.deepEqual(clean(qa.questions.find(x=>x.id===q.id)),clean(q),'Question changed');
for(const p of untouched)assert.deepEqual(pa.packs.find(x=>x.id===p.id),p,'Other pack changed');
for(const p of [...d.packs,...changes.map(x=>x.after)])assert.deepEqual(packcmp(pa.packs.find(x=>x.id===p.id)),packcmp(p));
console.log(JSON.stringify({status:'verified',revision:d.revision,main:12,nextGameReserve:11,excluded:1,preservedQuestions:qa.questions.length,preservedOtherPacks:untouched.length,archivedPriorV2Packs:changes.length,verifiedAt:new Date().toISOString()},null,2));
