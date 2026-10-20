/* Relato 190 → Base 190 v5.12.0 — TESTE integrado.
 * Autorizar conexão remota é feito NA BASE, por sessão/aba.
 * Sem token persistente, sem copiar cookies; conteúdo só via HTTPS same-origin.
 */
(()=>{'use strict';
 const BASE='https://base-conhecimento-190.vercel.app';
 const ALLOWED=new Set(['KB190_STATUS','KB190_ANALYZE','KB190_AUTO_ANALYZE','KB190_OPEN_BASE','KB190_OPEN_OPTIONS']);
 const validPage=url=>{try{return new URL(url).origin===BASE;}catch{return false;}};
 const sadePage=url=>{try{const p=new URL(url).pathname.toLowerCase();return p.includes('/syspm-web/public/')||/(?:teste[-_]sade|simulador|teste-atendimento)/.test(p);}catch{return false;}};
 const extensionURL=chrome.runtime.getURL('');
 const baseTabs=async()=>((await chrome.tabs.query({})).filter(t=>Number.isInteger(t.id)&&validPage(t.url)));
 async function openBase(){
   const tabs=await baseTabs();
   if(tabs.length){await chrome.tabs.update(tabs[0].id,{active:true});if(Number.isInteger(tabs[0].windowId))await chrome.windows.update(tabs[0].windowId,{focused:true});}
   else await chrome.tabs.create({url:BASE+'/',active:true});
   return {opened:true};
 }
 async function askTab(tab,operation,text){
   const r=await chrome.tabs.sendMessage(tab.id,{type:'KB190_BRIDGE',operation,...(operation==='analyze'?{text}:{})});
   if(!r?.ok)throw Error(r?.error||'A Base 190 não respondeu.');
   return r.data;
 }
 async function authorized(){
   const tabs=await baseTabs();
   if(!tabs.length)throw Error('Abra a Base 190 em outra aba e faça login.');
   let loggedIn=null,auth=null;
   for(const tab of tabs){
     try{
       const data=await askTab(tab,'consent');
       if(data?.user)loggedIn={tab,data};
       if(data?.authorized){auth={tab,data};break;}
     }catch{}
   }
   return {auth,loggedIn};
 }
 async function check(){
   const {auth,loggedIn}=await authorized();
   if(!loggedIn&&!auth)throw Error('Faça login na Base 190 e recarregue a página.');
   return {connected:true,authorized:Boolean(auth),user:(auth||loggedIn).data.user,
     origin:BASE,role:(auth||loggedIn).data.role};
 }
 async function analyze(text){
   const {auth}=await authorized();
   if(!auth)throw Error('Acesse Integração 190 na Base e clique em Autorizar conexão remota.');
   // O próprio content script valida a autorização novamente antes de consultar a API.
   const data=await askTab(auth.tab,'analyze',text);
   const r={type:'KB190_RESULT',result:data?.result||null,
     disclaimer:String(data?.disclaimer||'').slice(0,1200),at:Date.now()};
   // Nunca repassar dados a abas não autenticadas de outros usuários.
   try{await chrome.tabs.sendMessage(auth.tab.id,r);}catch{}
   return {connected:true,authorized:true,result:data?.result,disclaimer:data?.disclaimer,synchronized:true};
 }
 chrome.runtime.onMessage.addListener((m,sender,respond)=>{
   if(m?.type==='KB190_SITE_RESULT'){
     if(sender.id!==chrome.runtime.id||!Number.isInteger(sender.tab?.id)||!validPage(sender.url||sender.tab.url)){
       respond({ok:false,error:'Origem não permitida.'});return false;
     }
     (async()=>{
       if(!m.result||!['classificacao','faq','indefinido'].includes(m.result.tipo)||JSON.stringify(m.result).length>40000)throw Error('Resultado inválido.');
       let delivered=0;
       for(const tab of await chrome.tabs.query({})){
         if(!Number.isInteger(tab.id)||!sadePage(tab.url))continue;
         try{
           const r=await chrome.tabs.sendMessage(tab.id,{type:'KB190_SITE_RESULT_TO_UI',result:m.result,
             disclaimer:String(m.disclaimer||'').slice(0,1200)});
           if(r?.ok)delivered++;
         }catch{}
       }
       return {delivered};
     })().then(x=>respond({ok:true,...x})).catch(e=>respond({ok:false,error:String(e.message||e)}));
     return true;
   }
   if(!ALLOWED.has(m?.type))return false;
   const isExtension=String(sender.url||'').startsWith(extensionURL);
   const isSadeTab=Number.isInteger(sender.tab?.id)&&sender.frameId===0&&sadePage(sender.url||sender.tab.url);
   if(sender.id!==chrome.runtime.id || !(isExtension||isSadeTab)){
     respond({ok:false,error:'Remetente não autorizado.'});return false;
   }
   if(m.type==='KB190_AUTO_ANALYZE'&&!isSadeTab){
     respond({ok:false,error:'Análise automática permitida somente na tela SADE.'});return false;
   }
   (async()=>{
     if(m.type==='KB190_OPEN_BASE')return openBase();
     if(m.type==='KB190_OPEN_OPTIONS'){await chrome.runtime.openOptionsPage();return {opened:true};}
     if(m.type==='KB190_STATUS')return check();
     if(!isSadeTab)throw Error('A análise de relato está limitada à tela SADE ou ao simulador.');
     const text=String(m.text||'');
     if(text.trim().length<3||text.length>8000)throw Error('Relato fora dos limites de 3 a 8.000 caracteres.');
     if(m.type==='KB190_AUTO_ANALYZE'&&text.trim().length<20)throw Error('Aguarde pelo menos 20 caracteres antes da análise automática.');
     // Sem prompt adicional: autorização explícita já foi concedida na Base e é reverificada pela ponte.
     return analyze(text);
   })().then(x=>respond({ok:true,...x})).catch(e=>respond({ok:false,error:String(e?.message||e).slice(0,320)}));
   return true;
 });
})();