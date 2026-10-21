/* Teste dinâmico v5.14: autorização, análise automática e publicação SOMENTE na Base 190. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=p=>fs.readFileSync(p,'utf8');
function request(listener,message,sender){
 return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Sem resposta: '+message.type)),5000);
   try{listener(message,sender,r=>{clearTimeout(timer);resolve(r);});}
   catch(e){clearTimeout(timer);reject(e);}
 });
}
async function worker(){
 const listeners=[],stored=new Map(),messages=[];
 let activeLogin=true,analysisCount=0,revision=0;
 const base='https://base-conhecimento-190.vercel.app/';
 const sade='https://exemplo.invalid/syspm-web/public/atendimento';
 const chrome={
   runtime:{id:'ext',getURL:()=> 'chrome-extension://ext/',onMessage:{addListener:l=>listeners.push(l)},openOptionsPage:async()=>({})},
   storage:{local:{get:async k=>({[k]:stored.get(k)}),set:async x=>{Object.entries(x).forEach(([k,v])=>stored.set(k,v));}}},
   tabs:{
     onRemoved:{addListener:()=>{}},
     query:async()=>[{id:3,url:base,windowId:1},{id:5,url:sade,windowId:1}],
     sendMessage:async(id,m)=>{
       messages.push({id,type:m.type,message:m});
       if(id===3&&m.type==='KB190_BRIDGE'&&m.operation==='session')
         return activeLogin?{ok:true,data:{user:{id:'user-1',username:'teste',role:'user',mustChangePassword:false}}}:{ok:false,error:'Login expirado'};
       if(id===3&&m.type==='KB190_BRIDGE'&&m.operation==='analyze'){
         analysisCount++;return {ok:true,data:{result:{tipo:'classificacao',principal:{officialNature:'Natureza de teste'}},disclaimer:'Teste'}};
       }
       if(id===3&&m.type==='KB190_RESULT')return {ok:true};
       return {ok:false,error:'Mensagem inesperada'};
     },update:async()=>({}),create:async()=>({})
   },windows:{update:async()=>({})}
 };
 vm.runInNewContext(src('kb190-bg.js'),{chrome,URL,Date,Set,Map,Promise,String,Number,JSON,Error,
   crypto:{randomUUID:()=>String(++revision)}},{filename:'kb190-bg.js'});
 assert.equal(listeners.length,1);
 const handler=listeners[0],sender={id:'ext',tab:{id:5,url:sade},url:sade,frameId:0};
 const opts={id:'ext',url:'chrome-extension://ext/kb190-options.html'};
 const sample='RELATO FICTÍCIO TESTE BARULHO E SOM ALTO';
 let x=await request(handler,{type:'KB190_ANALYZE_LIVE',text:sample},sender);
 assert.equal(x.ok,false);assert.equal(analysisCount,0);
 x=await request(handler,{type:'KB190_SET_AUTO',enabled:true},sender);
 assert.equal(x.ok,false);assert.equal(stored.size,0);
 x=await request(handler,{type:'KB190_SET_AUTO',enabled:true},opts);
 assert.equal(x.ok,true);
 x=await request(handler,{type:'KB190_ANALYZE_LIVE',text:sample},sender);
 assert.equal(x.ok,true);assert.equal(analysisCount,1);
 let sent=messages.filter(x=>x.type==='KB190_RESULT');assert.equal(sent.length,0,'Não publica antes da validação de atualidade');
 let p=await request(handler,{type:'KB190_PUBLISH_LIVE',requestId:'fake',text:sample},sender);
 assert.equal(p.ok,false);assert.equal(messages.filter(x=>x.type==='KB190_RESULT').length,0);
 p=await request(handler,{type:'KB190_PUBLISH_LIVE',requestId:x.requestId,text:sample},sender);
 assert.equal(p.ok,true);sent=messages.filter(x=>x.type==='KB190_RESULT');
 assert.equal(sent.length,1);assert.equal(sent[0].id,3);
 assert.equal(messages.filter(x=>x.id===5&&x.type==='KB190_RESULT').length,0,'Nenhuma resposta ao SADE');
 x=await request(handler,{type:'KB190_ANALYZE_LIVE',text:sample},sender);
 assert.equal(x.ok,true);assert.equal(x.skip,true);assert.equal(analysisCount,1);
 const changed='NOVO RELATO FICTÍCIO TESTE — PESSOA GRITANDO';
 x=await request(handler,{type:'KB190_ANALYZE_LIVE',text:changed},sender);
 assert.equal(x.ok,true);assert.equal(analysisCount,2);
 await request(handler,{type:'KB190_SET_AUTO',enabled:false},opts);
 p=await request(handler,{type:'KB190_PUBLISH_LIVE',requestId:x.requestId,text:changed},sender);
 assert.equal(p.ok,false);assert.equal(messages.filter(x=>x.type==='KB190_RESULT').length,1);
 x=await request(handler,{type:'KB190_ANALYZE_LIVE',text:'RELATO FICTICIO OUTRO EXEMPLO'},sender);
 assert.equal(x.ok,false);
 await request(handler,{type:'KB190_SET_AUTO',enabled:true},opts);
 activeLogin=false;
 x=await request(handler,{type:'KB190_ANALYZE_LIVE',text:'RELATO FICTICIO OUTRA SITUACAO'},sender);
 assert.equal(x.ok,false);
 console.log('✓ Worker: permissões, análise contínua, deduplicação, descarte obsoleto, revogação e login.');
}
async function bridge(){
 const listeners=[],events=[];let submitted=0;
 const chrome={runtime:{id:'ext',onMessage:{addListener:l=>listeners.push(l)},sendMessage:async()=>({ok:true})},
   storage:{local:{get:async()=>({'kb190.autoEnabled.v3':true})}}};
 const ctx={chrome,URL,Date,JSON,String,Number,Promise,Error,AbortController,setTimeout,clearTimeout,
   location:{origin:'https://base-conhecimento-190.vercel.app'},
   CustomEvent:class{constructor(type,x){this.type=type;this.detail=x.detail;}},
   addEventListener:(name,handler)=>events.push({name,handler}),
   dispatchEvent:e=>{if(e.type==='base190:extension-result')submitted++;},
   fetch:async(path)=>({ok:true,status:200,text:async()=>JSON.stringify(path==='/api/session'?
     {user:{id:'user-1',username:'test',mustChangePassword:false}}:{result:{tipo:'classificacao'}})})
 };
 ctx.window=ctx;ctx.top=ctx;
 vm.runInNewContext(src('kb190-bridge.js'),ctx,{filename:'kb190-bridge.js'});
 assert.equal(listeners.length,1);
 assert.equal(events.some(x=>x.name==='base190:site-analysis'),false,'Não envia resultados da Base ao SADE');
 const ans=await request(listeners[0],{type:'KB190_RESULT',result:{tipo:'classificacao'},sourceText:'RELATO DE TESTE'}, {id:'ext'});
 assert.equal(ans.ok,true);assert.equal(submitted,1);
 console.log('✓ Ponte: resultados somente no site, sem aba de resposta na extensão.');
}
(async()=>{await worker();await bridge();console.log('Testes dinâmicos v5.14 aprovados.');})().catch(e=>{console.error(e);process.exitCode=1;});
