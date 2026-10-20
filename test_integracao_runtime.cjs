/* v5.13.0: testes dinâmicos simulados de autorização EXCLUSIVA da extensão.
 * Mock das APIs MV3 do Chrome e da sessão da Base 190, sem rede real.
 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=name=>fs.readFileSync(name,'utf8');
const KEY='kb190.autoEnabled.v3';
function call(listener,msg,sender){
 return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Sem resposta: '+msg.type)),4000);
   try{listener(msg,sender,r=>{clearTimeout(timer);resolve(r);});}
   catch(e){clearTimeout(timer);reject(e);}
 });
}
async function workerTest(){
 let logged=true,analyzes=0,siteDeliveries=0;const listeners=[],store=new Map();
 const baseUrl='https://base-conhecimento-190.vercel.app/';
 const sadeUrl='http://localhost:8080/teste-sade.html';
 const chrome={
   runtime:{id:'abc',getURL:()=> 'chrome-extension://abc/',onMessage:{addListener:fn=>listeners.push(fn)},openOptionsPage:async()=>({})},
   storage:{local:{
     get:async k=>({[k]:store.get(k)}),
     set:async values=>{Object.entries(values).forEach(([k,v])=>store.set(k,v));}
   }},
   tabs:{
     query:async()=>[{id:7,url:baseUrl,windowId:1},{id:9,url:sadeUrl,windowId:1}],
     sendMessage:async(id,m)=>{
       if(id===7&&m.type==='KB190_BRIDGE'&&m.operation==='session')
         return logged?{ok:true,data:{user:{id:'one',username:'example',role:'user',mustChangePassword:false}}}:
           {ok:false,status:401,error:'Faça login na Base.'};
       if(id===7&&m.type==='KB190_BRIDGE'&&m.operation==='analyze'){
         analyzes++;assert.equal(m.text,'RELATO DE TESTE: BARULHO EXTENSO NA RUA');
         return {ok:true,data:{result:{tipo:'classificacao',principal:{officialNature:'PERTURBAÇÃO'}},disclaimer:'Teste'}};
       }
       if(id===7&&m.type==='KB190_RESULT')return {ok:true};
       if(id===9&&m.type==='KB190_SITE_RESULT_TO_UI'){siteDeliveries++;return {ok:true};}
       return {ok:false,error:'Mensagem não reconhecida.'};
     },update:async()=>({}),create:async()=>({})
   },windows:{update:async()=>({})}
 };
 vm.runInNewContext(code('kb190-bg.js'),{chrome,URL,console,Set,Number,String,Promise,JSON,Error,Date},
   {filename:'kb190-bg.js'});
 assert.equal(listeners.length,1);
 const listener=listeners[0];
 const sade={id:'abc',tab:{id:9,url:sadeUrl},frameId:0,url:sadeUrl};
 const settings={id:'abc',url:'chrome-extension://abc/kb190-options.html'};
 const fake={id:'abc',url:'https://untrusted.test/simulador'};
 const text='RELATO DE TESTE: BARULHO EXTENSO NA RUA';
 let r=await call(listener,{type:'KB190_STATUS'},sade);
 assert.equal(r.ok,true);assert.equal(r.connected,true);assert.equal(r.enabled,false);
 r=await call(listener,{type:'KB190_AUTO_ANALYZE',text},sade);
 assert.equal(r.ok,false);assert.match(r.error,/Configurações da extensão/i);assert.equal(analyzes,0);
 r=await call(listener,{type:'KB190_SET_AUTO',enabled:true},sade);
 assert.equal(r.ok,false);assert.equal(store.get(KEY),undefined);
 r=await call(listener,{type:'KB190_SET_AUTO',enabled:true},fake);
 assert.equal(r.ok,false);
 r=await call(listener,{type:'KB190_SET_AUTO',enabled:true},settings);
 assert.equal(r.ok,true);assert.equal(store.get(KEY),true);
 r=await call(listener,{type:'KB190_AUTO_ANALYZE',text},sade);
 assert.equal(r.ok,true);assert.equal(analyzes,1);
 const baseSender={id:'abc',tab:{id:7,url:baseUrl},url:baseUrl};
 const result={tipo:'classificacao',principal:{officialNature:'TESTE'}};
 r=await call(listener,{type:'KB190_SITE_RESULT',result},baseSender);
 assert.equal(r.ok,true);assert.equal(siteDeliveries,1);
 r=await call(listener,{type:'KB190_SET_AUTO',enabled:false},settings);
 assert.equal(r.ok,true);assert.equal(store.get(KEY),false);
 r=await call(listener,{type:'KB190_AUTO_ANALYZE',text},sade);
 assert.equal(r.ok,false);assert.equal(analyzes,1);
 r=await call(listener,{type:'KB190_SITE_RESULT',result},baseSender);
 assert.equal(r.ok,true);assert.equal(siteDeliveries,1);
 r=await call(listener,{type:'KB190_SET_AUTO',enabled:true},settings);
 assert.equal(r.ok,true);
 logged=false;
 r=await call(listener,{type:'KB190_AUTO_ANALYZE',text},sade);
 assert.equal(r.ok,false);assert.equal(analyzes,1);
 console.log('✓ Worker: configurações exclusivas, liga/desliga, site resultado, sessão expirada, origem restrita.');
}
async function bridgeTest(){
 const listeners=[],handlers=new Map(),store=new Map();let login=true,posts=0,sent=0,opened=0;
 const chrome={
   runtime:{id:'abc',onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async m=>{
     if(m.type==='KB190_OPEN_OPTIONS'){opened++;return {ok:true};}
     if(m.type==='KB190_SITE_RESULT'){sent++;return {ok:true};}
     return {ok:false};
   }},
   storage:{local:{get:async k=>({[k]:store.get(k)})}}
 };
 const ctx={
   chrome,URL,Number,String,Date,JSON,Promise,Error,AbortController,setTimeout,clearTimeout,
   location:{origin:'https://base-conhecimento-190.vercel.app'},
   CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}},
   addEventListener:(type,cb)=>handlers.set(type,cb),dispatchEvent:()=>{},
   fetch:async(path,options)=>{
     if(path==='/api/analyze'){posts++;assert.equal(options.credentials,'same-origin');
       assert.equal(options.method,'POST');}
     const data=path==='/api/session'?{user:{id:'one',username:'example',role:'user',mustChangePassword:false}}:
       {result:{tipo:'classificacao',principal:{officialNature:'TESTE'}}};
     return {ok:login,status:login?200:401,text:async()=>JSON.stringify(login?data:{error:'Sessão expirada'})};
   }
 };
 ctx.window=ctx;ctx.top=ctx;
 vm.runInNewContext(code('kb190-bridge.js'),ctx,{filename:'kb190-bridge.js'});
 assert.equal(listeners.length,1);
 const s={id:'abc'},text='BARULHO EXCESSIVO NO PÁTIO DO SIMULADOR';
 let r=await call(listeners[0],{type:'KB190_BRIDGE',operation:'session'},s);
 assert.equal(r.ok,true);
 r=await call(listeners[0],{type:'KB190_BRIDGE',operation:'analyze',text},s);
 assert.equal(r.ok,false);assert.equal(r.status,403);assert.equal(posts,0);
 const event={detail:{result:{tipo:'classificacao',principal:{officialNature:'TESTE'}}}};
 await handlers.get('base190:site-analysis')(event);
 assert.equal(sent,0);
 store.set(KEY,true);
 r=await call(listeners[0],{type:'KB190_BRIDGE',operation:'analyze',text},s);
 assert.equal(r.ok,true);assert.equal(posts,1);
 await handlers.get('base190:site-analysis')(event);assert.equal(sent,1);
 handlers.get('base190:open-settings')();await Promise.resolve();
 assert.equal(opened,1);
 store.set(KEY,false);
 r=await call(listeners[0],{type:'KB190_BRIDGE',operation:'analyze',text},s);
 assert.equal(r.ok,false);assert.equal(posts,1);
 await handlers.get('base190:site-analysis')(event);assert.equal(sent,1);
 store.set(KEY,true);login=false;
 r=await call(listeners[0],{type:'KB190_BRIDGE',operation:'analyze',text},s);
 assert.equal(r.ok,false);assert.equal(posts,1);
 console.log('✓ Ponte HTTPS: envio sem site consent, revogação imediata, login e acesso às opções.');
}
(async()=>{await workerTest();await bridgeTest();console.log('Testes dinâmicos da v5.13.0 concluídos.');})().catch(e=>{console.error(e);process.exitCode=1;});
