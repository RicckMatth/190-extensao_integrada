'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{randomUUID}=require('node:crypto');
const BASE='https://base-conhecimento-190.vercel.app',SADE='https://example.invalid/syspm-web/public/atendimento';
const sample='RELATO FICTÍCIO PARA TESTE DE COMUNICAÇÃO';
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(setImmediate);}throw Error('Condição do teste não alcançada.');}
function harness({fastTimeout=false}={}){
 const requests=[],events=[],storageListeners=[],tabListeners=[],removeListeners=[],workerListeners=[],bridgeListeners=[];
 let enabled=true,authenticated=true,userId='user-test';
 const source={id:'ext',url:SADE,tab:{id:5,url:SADE},frameId:0};
 const shared={URL,Date,JSON,Object,TextEncoder,TextDecoder,Response,ReadableStream,AbortController,AbortSignal,setTimeout:fastTimeout?((fn,ms)=>setTimeout(fn,Math.min(ms,15))):setTimeout,clearTimeout,crypto:{randomUUID},console};
 const storage={local:{get:async()=>({'kb190.autoEnabled.v3':enabled}),set:async v=>{enabled=v['kb190.autoEnabled.v3'];storageListeners.forEach(f=>f({'kb190.autoEnabled.v3':{newValue:enabled}},'local'));}},onChanged:{addListener:f=>storageListeners.push(f)}};
 function invoke(listener,message,sender){return new Promise(resolve=>{const async=listener(message,sender,resolve);if(async===false)resolve(undefined);});}
 const bc={...shared,location:{origin:BASE},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},addEventListener(){},dispatchEvent:e=>events.push(e),chrome:{storage,runtime:{id:'ext',onMessage:{addListener:f=>bridgeListeners.push(f)},sendMessage:async()=>({ok:true})}},fetch:async(path,options={})=>{
  if(path==='/api/session')return new Response(JSON.stringify({user:{id:userId,mustChangePassword:false}}),{status:authenticated?200:401});
  const d=deferred(),body=JSON.parse(options.body);requests.push({body,...d,signal:options.signal});
  // Deliberately allow late completion after cancellation to verify stale-result checks.
  return d.promise;
 }};bc.window=bc;bc.top=bc;
 vm.createContext(bc);vm.runInContext(fs.readFileSync('analysis-protocol.js','utf8'),bc);vm.runInContext(fs.readFileSync('kb190-bridge.js','utf8'),bc);
 const wc={...shared,chrome:{storage,runtime:{id:'ext',getURL:()=> 'chrome-extension://ext/',onMessage:{addListener:f=>workerListeners.push(f)},openOptionsPage:async()=>{}},tabs:{query:async()=>[{id:3,url:BASE},{id:5,url:SADE}],sendMessage:async(id,m)=>{if(id!==3)throw Error('Resultado enviado ao destino errado.');return invoke(bridgeListeners[0],m,{id:'ext'});},onUpdated:{addListener:f=>tabListeners.push(f)},onRemoved:{addListener:f=>removeListeners.push(f)}},windows:{update:async()=>{}}}};
 vm.createContext(wc);vm.runInContext(fs.readFileSync('analysis-protocol.js','utf8'),wc);vm.runInContext(fs.readFileSync('kb190-bg.js','utf8'),wc);
 const send=(message,sender=source)=>invoke(workerListeners[0],message,sender);
 const start=text=>send({type:'KB190_ANALYZE_LIVE',requestId:randomUUID(),text:text||sample});
 function finish(index,result={tipo:'ia',resposta:'Orientação fictícia.',source:'gemini',analysisQuestions:[{topic:'injured',question:'Há feridos?'}],feedbackTicket:'signed-test'}){const r=requests[index];r.resolve(new Response([{type:'status',requestId:r.body.requestId,phase:'local'},{type:'status',requestId:r.body.requestId,phase:'gemini'},{type:'result',requestId:r.body.requestId,result}].map(x=>JSON.stringify(x)).join('\n')+'\n',{headers:{'Content-Type':'application/x-ndjson'}}));}
 const publish=(r,text=sample)=>send({type:'KB190_PUBLISH_LIVE',requestId:r.requestId,text});
 return {requests,events,send,start,finish,publish,source,bridge:(m,s={id:'ext'})=>invoke(bridgeListeners[0],m,s),setAuth:v=>{authenticated=v;},setUser:v=>{userId=v;},revoke:()=>send({type:'KB190_SET_AUTO',enabled:false},{id:'ext',url:'chrome-extension://ext/kb190-options.html'}),navigate:id=>tabListeners.forEach(f=>f(id,{status:'loading'}))};
}
test('ponte e worker encaminham local e Gemini com perguntas/ticket, sem duplicar ou enviar ao SADE',async()=>{
 for(const result of [{tipo:'classificacao',principal:{officialNature:'Natureza fictícia'}},{tipo:'faq',resposta:'Resposta local.'},{tipo:'indefinido',mensagem:'Dados insuficientes.'},{tipo:'ia',resposta:'Resposta fictícia.',source:'gemini',analysisQuestions:[{topic:'injured',question:'Há feridos?'}],feedbackTicket:'signed-test',references:[{code:'TEST',title:'Ficha fictícia'}]}]){
 const h=harness(),p=h.start();await until(()=>h.requests.length===1);h.finish(0,result);const r=await p;assert.equal(r.ok,true);assert.equal((await h.publish(r)).ok,true);const delivered=h.events.filter(e=>e.type==='base190:extension-result');assert.equal(delivered.length,1);assert.deepEqual(delivered[0].detail.result,result);assert.equal((await h.publish(r)).ok,false);
 }
});
test('falha de autenticação e remetente não autorizado não iniciam Gemini',async()=>{const h=harness();h.setAuth(false);assert.equal((await h.start()).ok,false);assert.equal(h.requests.length,0);assert.equal((await h.send({type:'KB190_ANALYZE_LIVE',text:sample},{...h.source,id:'other'})),undefined);});
test('revogação durante execução cancela e impede publicação',async()=>{const h=harness(),p=h.start();await until(()=>h.requests.length);await h.revoke();assert.equal(h.requests[0].signal.aborted,true);h.finish(0);assert.equal((await p).ok,false);assert.equal(h.events.filter(e=>e.type==='base190:extension-result').length,0);});
test('respostas fora de ordem e relato modificado não substituem análise recente',async()=>{const h=harness(),first=h.start();await until(()=>h.requests.length===1);const second=h.start(sample+' NOVO');await until(()=>h.requests.length===2);h.finish(1);const r=await second;h.finish(0);assert.equal((await first).ok,false);assert.equal((await h.publish(r,sample+' NOVO')).ok,true);assert.equal(h.events.filter(e=>e.type==='base190:extension-result').length,1);});
test('mudar aba ativa não cancela; navegar a aba de origem cancela',async()=>{const h=harness(),p=h.start();await until(()=>h.requests.length);h.navigate(99);assert.equal(h.requests[0].signal.aborted,false);h.navigate(5);await until(()=>h.requests[0].signal.aborted);h.finish(0);assert.equal((await p).ok,false);});
test('troca de usuário antes da publicação rejeita o resultado',async()=>{const h=harness(),p=h.start();await until(()=>h.requests.length);h.finish(0);const r=await p;h.setUser('outro-usuario');assert.equal((await h.publish(r)).ok,false);});
test('reconexão após falha permite reanalisar o mesmo relato',async()=>{const h=harness(),p=h.start();await until(()=>h.requests.length);h.requests[0].reject(Error('Falha fictícia'));assert.equal((await p).ok,false);const retry=h.start();await until(()=>h.requests.length===2);h.finish(1);assert.equal((await h.publish(await retry)).ok,true);});
test('resultado arbitrário recebe erro em vez de confirmação falsa',async()=>{const h=harness(),p=h.start();await until(()=>h.requests.length);h.finish(0,{tipo:'ia',resposta:42});assert.equal((await p).ok,false);assert.equal((await h.bridge({type:'KB190_RESULT',requestId:'fake',sourceKey:'5:0',result:{tipo:'ia',resposta:'fake'}})).ok,false);});

test('timeout da ponte é finito e a resposta tardia é descartada',async()=>{const h=harness({fastTimeout:true}),p=h.start();await until(()=>h.requests.length);await new Promise(r=>setTimeout(r,25));h.finish(0);assert.equal((await p).ok,false);assert.equal(h.events.filter(e=>e.type==='base190:extension-result').length,0);});
