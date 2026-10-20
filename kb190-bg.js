/* Base de Conhecimento 190 — MODELO TESTE INTEGRADO 5.10.0
 * Bridge exclusiva para sessão já autenticada no site. Não copia cookies, senhas ou tokens.
 * Somente operações de consulta permitidas (session e analyze).
 */
(()=>{
 'use strict';
 const KEY='kb190.test.origin.v1';
 const whitelist=new Set(['KB190_STATUS','KB190_ANALYZE','KB190_OPEN_OPTIONS']);
 function originOf(raw){
   try{const u=new URL(String(raw||''));return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash?u.origin:null;}
   catch{return null;}
 }
 const ownOrigin=()=>chrome.runtime.getURL('');
 async function allowedOrigin(){
   const origin=originOf((await chrome.storage.local.get(KEY))[KEY]);
   if(!origin)throw Error('Configure a URL HTTPS da Base 190 nas opções da extensão.');
   if(!(await chrome.permissions.contains({origins:[origin+'/*']})))throw Error('Autorize o domínio da Base 190 nas opções.');
   return origin;
 }
 async function bridge(origin,operation,text){
   const tabs=(await chrome.tabs.query({})).filter(t=>{
     try{return Number.isInteger(t.id)&&new URL(t.url).origin===origin;}catch{return false;}
   });
   if(!tabs.length)throw Error('Abra a Base 190 em uma aba, faça login e tente novamente.');
   let reason='Conexão indisponível. Atualize a aba da Base 190 e tente novamente.';
   for(const tab of tabs){
     try{
       const r=await chrome.tabs.sendMessage(tab.id,{type:'KB190_BRIDGE',operation,...(operation==='analyze'?{text}: {})});
       if(r?.ok)return r.data;
       if(r?.status===401||r?.status===403)throw Error('Sessão não autorizada ou expirada. Entre na Base 190 novamente.');
       reason=String(r?.error||reason).slice(0,250);
     }catch(e){
       reason=String(e?.message||reason).slice(0,250);
     }
   }
   throw Error(reason);
 }
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
   if(!whitelist.has(m?.type))return false;
   if(sender.id!==chrome.runtime.id||!(Number.isInteger(sender.tab?.id)||String(sender.url||'').startsWith(ownOrigin()))){
     reply({ok:false,error:'Origem não autorizada.'});return false;
   }
   (async()=>{
     if(m.type==='KB190_OPEN_OPTIONS'){await chrome.runtime.openOptionsPage();return {opened:true};}
     const origin=await allowedOrigin();
     if(m.type==='KB190_STATUS'){
       const session=await bridge(origin,'session');
       return {connected:true,origin,user:session?.user?.username||'',role:session?.user?.role||''};
     }
     if(m.confirmed!==true)throw Error('Confirme explicitamente o envio do relato.');
     const text=String(m.text||'');
     if(text.trim().length<3||text.length>8000)throw Error('Relato deve ter de 3 a 8.000 caracteres.');
     const analysis=await bridge(origin,'analyze',text);
     return {connected:true,result:analysis?.result,disclaimer:analysis?.disclaimer};
   })().then(x=>reply({ok:true,...x})).catch(e=>reply({ok:false,error:String(e?.message||e).slice(0,350)}));
   return true;
 });
})();