/* Relato 190 + Base 190 v5.13.0 (MODELO TESTE)
 * Autorização de autoanálise é EXCLUSIVA das configurações da extensão.
 * O site autentica via sessão HttpOnly; nenhum consentimento em sessionStorage do site.
 * A permissão é conferida novamente ANTES de cada requisição ao servidor.
 */
(()=>{'use strict';
 const BASE='https://base-conhecimento-190.vercel.app';
 const KEY='kb190.autoEnabled.v3';
 const ACTIONS=new Set(['KB190_STATUS','KB190_SET_AUTO','KB190_ANALYZE','KB190_AUTO_ANALYZE','KB190_OPEN_BASE','KB190_OPEN_OPTIONS']);
 const EXT_URL=chrome.runtime.getURL('');
 const validBase=url=>{try{return new URL(url).origin===BASE;}catch{return false;}};
 const sadePage=url=>{try{const p=new URL(url).pathname.toLowerCase();return p.includes('/syspm-web/public/')||/(?:teste[-_]sade|simulador|teste-atendimento)/.test(p);}catch{return false;}};
 const enabled=async()=>((await chrome.storage.local.get(KEY))[KEY]===true);
 const baseTabs=async()=>(await chrome.tabs.query({})).filter(t=>Number.isInteger(t.id)&&validBase(t.url));
 async function openBase(){
   const tabs=await baseTabs();
   if(tabs.length){
     await chrome.tabs.update(tabs[0].id,{active:true});
     if(Number.isInteger(tabs[0].windowId))await chrome.windows.update(tabs[0].windowId,{focused:true});
   }else await chrome.tabs.create({url:BASE+'/',active:true});
   return {opened:true};
 }
 async function ask(tab,operation,text){
   const r=await chrome.tabs.sendMessage(tab.id,{type:'KB190_BRIDGE',operation,...(operation==='analyze'?{text}:{})});
   if(!r?.ok)throw Error(r?.error||'A aba da Base 190 não respondeu.');
   return r.data;
 }
 async function sessionTab(){
   const tabs=await baseTabs();
   if(!tabs.length)throw Error('Abra a Base 190 em uma aba e faça login.');
   let last='Faça login na Base 190 e recarregue a aba.';
   for(const tab of tabs){
     try{
       const data=await ask(tab,'session');
       if(data?.user&&!data.user.mustChangePassword)return {tab,user:data.user};
       last='A sessão da Base 190 ainda não está autorizada.';
     }catch(e){last=String(e?.message||last).slice(0,250);}
   }
   throw Error(last);
 }
 async function status(){
   const active=await enabled();
   try{
     const {user}=await sessionTab();
     return {connected:true,enabled:active,user:user.username,role:user.role,origin:BASE};
   }catch(e){
     return {connected:false,enabled:active,origin:BASE,reason:String(e?.message||e).slice(0,250)};
   }
 }
 async function analyze(text){
   if(!await enabled())throw Error('Ative a análise automática nas Configurações da extensão.');
   const {tab}=await sessionTab();
   // Checagem dupla: revogar no Chrome impede nova chamada mesmo com sessão ativa.
   if(!await enabled())throw Error('Análise automática desativada nas Configurações da extensão.');
   const result=await ask(tab,'analyze',text);
   if(!await enabled())throw Error('Autorização revogada; resultado descartado.');
   if(!result?.result||typeof result.result!=='object')throw Error('O Cérebro 190 não retornou análise.');
   try{
     await chrome.tabs.sendMessage(tab.id,{type:'KB190_RESULT',result:result.result,
       disclaimer:String(result.disclaimer||'').slice(0,1200),at:Date.now()});
   }catch{}
   return {connected:true,enabled:true,result:result.result,
     disclaimer:result.disclaimer,synchronized:true};
 }
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
   if(sender.id!==chrome.runtime.id)return false;
   if(m?.type==='KB190_SITE_RESULT'){
     if(!Number.isInteger(sender.tab?.id)||!validBase(sender.url||sender.tab.url)){
       reply({ok:false,error:'Origem da Base 190 não permitida.'});return false;
     }
     (async()=>{
       if(!await enabled())return {delivered:0};
       const r=m.result;
       if(!r||!['classificacao','faq','indefinido'].includes(r.tipo)||JSON.stringify(r).length>40000)throw Error('Resultado inválido.');
       let delivered=0;
       for(const tab of await chrome.tabs.query({})){
         if(!await enabled())break;
         if(!Number.isInteger(tab.id)||!sadePage(tab.url))continue;
         try{
           const x=await chrome.tabs.sendMessage(tab.id,{type:'KB190_SITE_RESULT_TO_UI',
             result:r,disclaimer:String(m.disclaimer||'').slice(0,1200)});
           if(x?.ok)delivered++;
         }catch{}
       }
       return {delivered};
     })().then(x=>reply({ok:true,...x})).catch(e=>reply({ok:false,error:String(e?.message||e)}));
     return true;
   }
   if(!ACTIONS.has(m?.type))return false;
   const extSender=String(sender.url||'').startsWith(EXT_URL);
   const sadeSender=Number.isInteger(sender.tab?.id)&&sender.frameId===0&&sadePage(sender.url||sender.tab.url);
   const baseOpener=m.type==='KB190_OPEN_OPTIONS'&&Number.isInteger(sender.tab?.id)&&validBase(sender.url||sender.tab.url);
   if(!(extSender||sadeSender||baseOpener)){reply({ok:false,error:'Origem não autorizada.'});return false;}
   if(m.type==='KB190_SET_AUTO'&&!extSender){
     reply({ok:false,error:'A autorização só pode ser alterada nas configurações da extensão.'});return false;
   }
   if(['KB190_AUTO_ANALYZE','KB190_ANALYZE'].includes(m.type)&&!sadeSender){
     reply({ok:false,error:'A análise de relatos só pode partir do SADE/simulador.'});return false;
   }
   (async()=>{
     if(m.type==='KB190_OPEN_BASE')return openBase();
     if(m.type==='KB190_OPEN_OPTIONS'){await chrome.runtime.openOptionsPage();return {opened:true};}
     if(m.type==='KB190_SET_AUTO'){
       if(typeof m.enabled!=='boolean')throw Error('Selecione ativado ou desativado.');
       await chrome.storage.local.set({[KEY]:m.enabled});
       return {enabled:await enabled()};
     }
     if(m.type==='KB190_STATUS')return status();
     const text=String(m.text||'');
     if(text.trim().length<3||text.length>8000)throw Error('Relato fora dos limites de 3 a 8.000 caracteres.');
     if(m.type==='KB190_AUTO_ANALYZE'&&text.trim().length<20)throw Error('Aguarde pelo menos 20 caracteres para análise automática.');
     return analyze(text);
   })().then(x=>reply({ok:true,...x})).catch(e=>reply({ok:false,error:String(e?.message||e).slice(0,350)}));
   return true;
 });
})();