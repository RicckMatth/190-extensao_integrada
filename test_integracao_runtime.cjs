/* Testes de segurança do fluxo consentimento → análise.
 * Node VM simula APIs Chrome; não é teste de navegador real. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const runMessage=(callback,message,sender)=>new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(Error('Resposta assíncrona não recebida: '+message.type)),5000);
 let finished=false;
 const respond=v=>{if(!finished){finished=true;clearTimeout(timeout);resolve(v);}};
 try{callback(message,sender,respond);}catch(e){clearTimeout(timeout);reject(e);}
});
async function workerTest(){
 const listeners=[],base='https://base-conhecimento-190.vercel.app/';
 const sade='http://localhost:8099/teste-sade.html';
 let authorized=false,analyzed=0,pushed=0;
 const chrome={
   runtime:{id:'ext-test',getURL:()=> 'chrome-extension://ext-test/',onMessage:{addListener:l=>listeners.push(l)}},
   tabs:{
     query:async()=>[{id:7,url:base,windowId:1},{id:9,url:sade,windowId:1}],
     sendMessage:async(id,m)=>{
       if(id===7&&m.type==='KB190_BRIDGE'&&m.operation==='consent')
         return {ok:true,data:{authorized,user:'teste',role:'user'}};
       if(id===7&&m.type==='KB190_BRIDGE'&&m.operation==='analyze'){
         analyzed++;
         assert.equal(m.text,'BARULHO EXCESSIVO EM LOCAL FICTICIO');
         return {ok:true,data:{result:{tipo:'classificacao',principal:{officialNature:'Perturbação',code:'TESTE'}}}};
       }
       if(id===7&&m.type==='KB190_RESULT'){pushed++;return {ok:true};}
       return {ok:true};
     },
     update:async()=>({}),create:async()=>({id:70})
   },windows:{update:async()=>({})}
 };
 vm.runInNewContext(read('kb190-bg.js'),{chrome,URL,console,Date,Set,Number,String,Promise,JSON,Error}, {filename:'kb190-bg.js'});
 assert.equal(listeners.length,1);
 const sender={id:'ext-test',tab:{id:9,url:sade},url:sade,frameId:0};
 const example='BARULHO EXCESSIVO EM LOCAL FICTICIO';
 const status=await runMessage(listeners[0],{type:'KB190_STATUS'},sender);
 assert.equal(status.ok,true);assert.equal(status.authorized,false);
 let r=await runMessage(listeners[0],{type:'KB190_AUTO_ANALYZE',text:example},sender);
 assert.equal(r.ok,false);assert.match(r.error,/Autorizar conexão remota/);assert.equal(analyzed,0);
 authorized=true;
 r=await runMessage(listeners[0],{type:'KB190_AUTO_ANALYZE',text:example},sender);
 assert.equal(r.ok,true);assert.equal(analyzed,1);assert.equal(pushed,1);
 authorized=false;
 r=await runMessage(listeners[0],{type:'KB190_AUTO_ANALYZE',text:example},sender);
 assert.equal(r.ok,false);assert.equal(analyzed,1);
 r=await runMessage(listeners[0],{type:'KB190_AUTO_ANALYZE',text:example},
   {id:'ext-test',tab:{id:33,url:'https://example.org/'},url:'https://example.org/',frameId:0});
 assert.equal(r.ok,false);assert.equal(analyzed,1);
 console.log('✓ Worker: autorização, revogação, remetente e entrega ao chat');
}
async function bridgeTest(){
 const listeners=[],storage=new Map(),events=[];
 let posts=0,userId='test-user',eventsSent=0;
 const base='https://base-conhecimento-190.vercel.app';
 const chrome={runtime:{id:'ext-test',onMessage:{addListener:l=>listeners.push(l)},sendMessage:async()=>{eventsSent++;return {ok:true};}}};
 const ctx={chrome,URL,Date,String,Number,JSON,Promise,Error,AbortController,setTimeout,clearTimeout,
   location:{origin:base},sessionStorage:{getItem:k=>storage.get(k)||null},
   CustomEvent:class{constructor(type,data){this.type=type;this.detail=data.detail;}},
   addEventListener:(t,fn)=>events.push({t,fn}),
   dispatchEvent:()=>{},
   fetch:async(path,opts)=>{
     const data=path==='/api/session'?{user:{id:userId,username:'teste',role:'user',mustChangePassword:false}}:
       {result:{tipo:'classificacao',principal:{officialNature:'Teste'}}};
     if(path==='/api/analyze'){posts++;assert.equal(opts.credentials,'same-origin');assert.equal(opts.method,'POST');}
     return {ok:true,status:200,text:async()=>JSON.stringify(data)};
   }
 };
 ctx.window=ctx;ctx.top=ctx;
 vm.runInNewContext(read('kb190-bridge.js'),ctx,{filename:'kb190-bridge.js'});
 assert.equal(listeners.length,1);
 const sender={id:'ext-test'};
 const original='RELATO FICTICIO DE TESTE';
 const siteAnalysis=events.find(x=>x.t==='base190:site-analysis')?.fn;
 assert.ok(siteAnalysis,'Ouvinte para resultados originados na Base deve existir');
 const resultEvent={detail:{result:{tipo:'classificacao',principal:{officialNature:'Teste'}}}};
 await siteAnalysis(resultEvent);
 assert.equal(eventsSent,0,'Revogação deve bloquear Base -> SADE');
 let response=await runMessage(listeners[0],{type:'KB190_BRIDGE',operation:'analyze',text:original},sender);
 assert.equal(response.ok,false);assert.equal(response.status,403);assert.equal(posts,0);
 storage.set('base190.remoteConsent.v2',userId);
 await siteAnalysis(resultEvent);
 assert.equal(eventsSent,1,'Autorização ativa pode enviar resultado Base -> SADE');
 response=await runMessage(listeners[0],{type:'KB190_BRIDGE',operation:'consent'},sender);
 assert.equal(response.ok,true);assert.equal(response.data.authorized,true);
 response=await runMessage(listeners[0],{type:'KB190_BRIDGE',operation:'analyze',text:original},sender);
 assert.equal(response.ok,true);assert.equal(posts,1);
 userId='other-user';
 await siteAnalysis(resultEvent);
 assert.equal(eventsSent,1,'Troca de usuário invalida transmissão de resultados');
 response=await runMessage(listeners[0],{type:'KB190_BRIDGE',operation:'analyze',text:original},sender);
 assert.equal(response.ok,false);assert.equal(posts,1);
 console.log('✓ Ponte: sessão, consentimento, HTTPS, revogação bidirecional e troca de usuário');
}
(async()=>{await workerTest();await bridgeTest();console.log('Todos os testes dinâmicos simulados passaram.');})()
 .catch(e=>{console.error(e);process.exitCode=1;});
