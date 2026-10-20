/* Integração automática Relato 190 ↔ Base 190 v5.11.0 (MODELO TESTE).
 * Host fixo, leitura de sessão do site, nunca leitura/armazenamento de cookies ou senhas.
 * Envio do relato exige confirmação do operador. Resultados apenas em memória do navegador.
 */
(()=>{
 'use strict';
 const BASE='https://base-conhecimento-190.vercel.app';
 const ALLOWED=new Set(['KB190_STATUS','KB190_ANALYZE','KB190_OPEN_BASE','KB190_OPEN_OPTIONS']);
 const extensionURL=chrome.runtime.getURL('');
 const validPage=(url)=>{try{return new URL(url).origin===BASE;}catch{return false;}};
 const sadePage=url=>{
   try{
     const path=new URL(url).pathname;
     return /\\/syspm-web\\/public\\//i.test(path)||/(?:teste[-_]sade|simulador|teste-atendimento)/i.test(path);
   }catch{return false;}
 };
 async function getBaseTabs(){
   return (await chrome.tabs.query({})).filter(t=>Number.isInteger(t.id)&&validPage(t.url));
 }
 async function openBase(){
   const tabs=await getBaseTabs();
   if(tabs.length){
     await chrome.tabs.update(tabs[0].id,{active:true});
     if(Number.isInteger(tabs[0].windowId))await chrome.windows.update(tabs[0].windowId,{focused:true});
   }else await chrome.tabs.create({url:BASE+'/',active:true});
   return {opened:true,origin:BASE};
 }
 async function invoke(operation,text){
   const tabs=await getBaseTabs();
   if(!tabs.length)throw Error('Abra a Base 190 e faça login. A conexão será reconhecida automaticamente.');
   let last='A aba da Base 190 não respondeu. Recarregue o site e tente novamente.';
   for(const tab of tabs){
     try{
       const reply=await chrome.tabs.sendMessage(tab.id,{type:'KB190_BRIDGE',operation,...(operation==='analyze'?{text}:{})});
       if(reply?.ok)return {data:reply.data,tabId:tab.id};
       if(reply?.status===401||reply?.status===403){last='Sessão não autenticada. Entre na Base 190 e tente novamente.';continue;}
       last=String(reply?.error||last).slice(0,200);
     }catch(e){last=String(e?.message||last).slice(0,200);}
   }
   throw Error(last);
 }
 async function syncResult(analysis,sourceTabId){
   // A aba que executou a análise sempre recebe primeiro; outras abas autenticadas
   // da mesma origem também podem mostrar o resultado, sem persistir textos.
   const tabs=await getBaseTabs();
   const ordered=[...tabs.filter(t=>t.id===sourceTabId),...tabs.filter(t=>t.id!==sourceTabId)];
   const data={type:'KB190_RESULT',result:analysis?.result||null,
     disclaimer:String(analysis?.disclaimer||'').slice(0,1200),at:Date.now()};
   let delivered=0;
   for(const tab of ordered){
     try{
       const response=await chrome.tabs.sendMessage(tab.id,data);
       if(response?.ok)delivered++;
     }catch{}
   }
   return delivered;
 }
 chrome.runtime.onMessage.addListener((m,sender,respond)=>{
   if(m?.type==='KB190_SITE_RESULT'){
     if(sender.id!==chrome.runtime.id||!Number.isInteger(sender.tab?.id)||!validPage(sender.url||sender.tab.url)){
       respond({ok:false,error:'Origem de resultado não permitida.'});return false;
     }
     (async()=>{
       if(!m.result||typeof m.result!=='object'||!['classificacao','faq','indefinido'].includes(m.result.tipo))
         throw Error('Resultado inválido.');
       if(JSON.stringify(m.result).length>40000)throw Error('Resultado excedeu limite.');
       const tabs=await chrome.tabs.query({});
       let delivered=0;
       for(const tab of tabs){
         if(!Number.isInteger(tab.id)||!sadePage(tab.url))continue;
         try{
           const res=await chrome.tabs.sendMessage(tab.id,{type:'KB190_SITE_RESULT_TO_UI',
             result:m.result,disclaimer:String(m.disclaimer||'').slice(0,1200)});
           if(res?.ok)delivered++;
         }catch{}
       }
       return {delivered};
     })().then(x=>respond({ok:true,...x})).catch(e=>respond({ok:false,error:e.message}));
     return true;
   }
   if(!ALLOWED.has(m?.type))return false;
   if(sender.id!==chrome.runtime.id ||
     !(Number.isInteger(sender.tab?.id)||String(sender.url||'').startsWith(extensionURL))){
     respond({ok:false,error:'Remetente da extensão não autorizado.'});return false;
   }
   (async()=>{
     if(m.type==='KB190_OPEN_BASE')return openBase();
     if(m.type==='KB190_OPEN_OPTIONS'){await chrome.runtime.openOptionsPage();return {opened:true};}
     if(m.type==='KB190_STATUS'){
       const {data}=await invoke('session');
       return {connected:true,origin:BASE,user:data?.user?.username||'',role:data?.user?.role||''};
     }
     if(m.confirmed!==true)throw Error('É necessário confirmar o envio do relato.');
     const text=String(m.text||'');
     if(text.trim().length<3||text.length>8000)throw Error('Relato deve ter de 3 a 8.000 caracteres.');
     const response=await invoke('analyze',text);
     const delivered=await syncResult(response.data,response.tabId);
     return {connected:true,result:response.data?.result,disclaimer:response.data?.disclaimer,
       synchronized:delivered>0};
   })().then(data=>respond({ok:true,...data}))
      .catch(e=>respond({ok:false,error:String(e?.message||e).slice(0,350)}));
   return true;
 });
})();