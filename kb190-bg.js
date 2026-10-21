/* Base 190 v5.14 — roteador seguro. Análise/feedback somente na Base.
 * Autorização no Chrome (default OFF), sessão HTTP-only exigida pela Base,
 * remetente SADE validado, confirmação de atualidade antes de publicar.
 */
(()=>{'use strict';
 const BASE='https://base-conhecimento-190.vercel.app';
 const KEY='kb190.autoEnabled.v3',EXT=chrome.runtime.getURL('');
 const recent=new Map(),pending=new Map();
 const allowed=new Set(['KB190_STATUS','KB190_SET_AUTO','KB190_OPEN_BASE','KB190_OPEN_OPTIONS',
   'KB190_ANALYZE_LIVE','KB190_PUBLISH_LIVE']);
 const baseUrl=url=>{try{return new URL(url).origin===BASE;}catch{return false;}};
 const sadeUrl=url=>{try{const u=new URL(url),p=u.pathname.toLowerCase();
   // Somente arquivos de simulador conhecidos, e apenas se o Chrome permitir file://.
   if(u.protocol==='file:')return /\/(?:teste[-_]sade|teste[-_]atendimento|sade[_-]simulador[_-]local)\.html$/.test(p);
   return ['http:','https:'].includes(u.protocol)&&
     (p.includes('/syspm-web/public/')||/(?:teste[-_]sade|teste-atendimento|simulador)/.test(p));
   }catch{return false;}};
 const isEnabled=async()=>((await chrome.storage.local.get(KEY))[KEY]===true);
 const baseTabs=async()=>(await chrome.tabs.query({})).filter(t=>Number.isInteger(t.id)&&baseUrl(t.url));
 async function openBase(){
   const tabs=await baseTabs();
   if(tabs.length){await chrome.tabs.update(tabs[0].id,{active:true});
     if(Number.isInteger(tabs[0].windowId))await chrome.windows.update(tabs[0].windowId,{focused:true});}
   else await chrome.tabs.create({url:BASE+'/',active:true});
   return {opened:true};
 }
 async function bridge(tab,operation,text){
   const r=await chrome.tabs.sendMessage(tab.id,{type:'KB190_BRIDGE',operation,
     ...(operation==='analyze'?{text}:{})});
   if(!r?.ok)throw Error(r?.error||'A Base 190 não respondeu.');
   return r.data;
 }
 async function sessionTab(){
   const tabs=await baseTabs();if(!tabs.length)throw Error('Abra a Base 190 e faça login.');
   for(const tab of tabs){
     try{
       const data=await bridge(tab,'session');
       if(data?.user&&!data.user.mustChangePassword)return {tab,user:data.user};
     }catch{}
   }
   throw Error('Faça login na Base 190 e atualize a aba.');
 }
 async function status(){
   const enabled=await isEnabled();
   try{
     const {user}=await sessionTab();
     return {connected:true,enabled,user:user.username,role:user.role,origin:BASE};
   }catch(e){return {connected:false,enabled,origin:BASE,reason:String(e.message||e).slice(0,220)};}
 }
 const keyOf=sender=>String(sender.tab.id)+':'+String(sender.frameId||0);
 async function analyzeLive(sender,text){
   if(!await isEnabled())throw Error('Ative a análise nas Configurações da extensão.');
   const tabId=sender.tab.id,now=Date.now();
   const old=recent.get(tabId);
   if(old?.text===text&&now-old.at<20000)return {skip:true};
   recent.set(tabId,{text,at:now});
   try{
     const {tab,user}=await sessionTab();
     if(!await isEnabled())throw Error('Transmissão desativada.');
     const data=await bridge(tab,'analyze',text);
     if(!await isEnabled())throw Error('Transmissão desativada.');
     if(!data?.result||typeof data.result!=='object')throw Error('Resultado inválido.');
     const requestId=crypto.randomUUID();
     pending.set(keyOf(sender),{requestId,tabId:tab.id,userId:String(user.id),text,
       result:data.result,disclaimer:String(data.disclaimer||'').slice(0,1200),at:Date.now()});
     return {requestId};
   }catch(e){
     if(recent.get(tabId)?.text===text)recent.delete(tabId);
     throw e;
   }
 }
 async function publishLive(sender,requestId,text){
   const key=keyOf(sender),entry=pending.get(key);
   if(!entry||entry.requestId!==requestId||entry.text!==text)
     throw Error('Solicitação obsoleta ou inválida.');
   pending.delete(key);
   if(Date.now()-entry.at>15000)throw Error('Resultado expirou.');
   if(!await isEnabled())throw Error('Transmissão desativada.');
   const {tab,user}=await sessionTab();
   if(tab.id!==entry.tabId||String(user.id)!==entry.userId)
     throw Error('Sessão da Base 190 alterada.');
   if(!await isEnabled())throw Error('Autorização revogada.');
   // Envia apenas à aba da Base 190 que realizou o processamento, nunca ao SADE.
   const r=await chrome.tabs.sendMessage(tab.id,{type:'KB190_RESULT',
     result:entry.result,sourceText:text.slice(0,1800),
     disclaimer:entry.disclaimer,at:Date.now()});
   if(!r?.ok)throw Error('Chat da Base 190 não recebeu resultado.');
   return {delivered:true};
 }
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
   if(sender.id!==chrome.runtime.id)return false;
   if(!allowed.has(m?.type))return false;
   const extSender=String(sender.url||'').startsWith(EXT);
   const sadeSender=Number.isInteger(sender.tab?.id)&&sadeUrl(sender.url||sender.tab.url);
   const baseOpener=m.type==='KB190_OPEN_OPTIONS'&&Number.isInteger(sender.tab?.id)&&baseUrl(sender.url||sender.tab.url);
   if(!(extSender||sadeSender||baseOpener)){
     reply({ok:false,error:'Remetente não autorizado.'});return false;
   }
   if(m.type==='KB190_SET_AUTO'&&!extSender){
     reply({ok:false,error:'Somente as opções da extensão podem alterar autorização.'});return false;
   }
   if(['KB190_ANALYZE_LIVE','KB190_PUBLISH_LIVE'].includes(m.type)&&!sadeSender){
     reply({ok:false,error:'Somente o SADE/simulador pode enviar relatos.'});return false;
   }
   (async()=>{
     if(m.type==='KB190_OPEN_OPTIONS'){await chrome.runtime.openOptionsPage();return {opened:true};}
     if(m.type==='KB190_OPEN_BASE')return openBase();
     if(m.type==='KB190_SET_AUTO'){
       if(typeof m.enabled!=='boolean')throw Error('Estado de autorização inválido.');
       await chrome.storage.local.set({[KEY]:m.enabled});
       if(!m.enabled){pending.clear();recent.clear();}
       return {enabled:await isEnabled()};
     }
     if(m.type==='KB190_STATUS')return status();
     const text=String(m.text||'');
     if(text.length<20||text.length>8000)throw Error('Relato fora dos limites de análise ao vivo.');
     if(m.type==='KB190_ANALYZE_LIVE')return analyzeLive(sender,text);
     if(typeof m.requestId!=='string')throw Error('Identificador da análise inválido.');
     return publishLive(sender,m.requestId,text);
   })().then(x=>reply({ok:true,...x}))
     .catch(e=>reply({ok:false,error:String(e?.message||e).slice(0,300)}));
   return true;
 });
 chrome.tabs.onRemoved.addListener(id=>{
   recent.delete(id);
   for(const [k,x] of pending)if(x.tabId===id||k.startsWith(id+':'))pending.delete(k);
 });
})();