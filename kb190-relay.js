/* Base 190 v5.14 — ponte SILENCIOSA no SADE/simulador.
 * Detecta o campo Relato e envia após pausa breve; NÃO monta qualquer interface,
 * NÃO exibe análise, NÃO armazena conteúdo, NÃO submete ocorrência ao SADE.
 */
(()=>{'use strict';
 if(globalThis.__base190SilentRelay)return;
 globalThis.__base190SilentRelay=true;
 const KEY='kb190.autoEnabled.v3';
 const MIN_CHARS=20,STABLE_MS=1150,MIN_INTERVAL_MS=2400;
 const bindings=globalThis.RelatoAgilBindings;
 let latest=null,field=null,observed='',since=Date.now(),sent='',lastSendAt=0;
 let processing=false,nextTryAt=0,enabled=false,checking=false,lastEnabledAt=0;
 function textOf(el){return String(el?.isContentEditable?el.innerText:el?.value||'').trim().slice(0,8000);}
 function isInput(el){
   return !!(el&&el.isConnected&&!el.disabled&&!el.readOnly&&
     (el.tagName==='TEXTAREA'||el.tagName==='INPUT'&&['text','search'].includes(el.type)||el.isContentEditable));
 }
 function safeResolve(description){
   try{const el=bindings?.resolve(description,document);return isInput(el)?el:null;}catch{return null;}
 }
 function strongCandidate(doc){
   try{
     const els=[...doc.querySelectorAll('textarea,input[type="text"],[contenteditable="true"]')];
     const matches=els.filter(el=>{
       if(!isInput(el))return false;
       const key=[el.id,el.name,el.getAttribute('aria-label'),el.getAttribute('placeholder')]
         .join(' ').toLowerCase();
       return /(?:^|[^a-z])(relato|narrativa|descricao.?fato|historia.?fato)(?:[^a-z]|$)/i.test(key)
          && !/(observac|historico|pesquisa|busca|filtro)/i.test(key);
     });
     return matches.length===1?matches[0]:null;
   }catch{return null;}
 }
 function findField(){
   if(isInput(field))return field;
   field=null;
   const described=latest?.fields?.relato;
   if(described?.mode==='auto'&&described.description){
     const el=safeResolve(described.description);
     if(el)return field=el;
   }
   let el=strongCandidate(document);
   if(el)return field=el;
   const frames=[...document.querySelectorAll('iframe')].slice(0,8);
   for(const frame of frames){
     try{el=strongCandidate(frame.contentDocument);if(el)return field=el;}catch{}
   }
   return null;
 }
 async function checkEnabled(force=false){
   const now=Date.now();
   if(!force&&now-lastEnabledAt<1800)return enabled;
   if(checking)return enabled;
   checking=true;lastEnabledAt=now;
   try{enabled=(await chrome.storage.local.get(KEY))[KEY]===true;}catch{enabled=false;}
   finally{checking=false;}
   return enabled;
 }
 window.addEventListener('relato190:sade:status',e=>{
   if(e?.detail?.fields)latest=e.detail;
   if(!field?.isConnected)field=null;
 });
 chrome.storage.onChanged.addListener((changes,area)=>{
   if(area==='local'&&Object.prototype.hasOwnProperty.call(changes,KEY)){
     enabled=changes[KEY].newValue===true;lastEnabledAt=Date.now();
     if(!enabled){sent='';nextTryAt=0;}
   }
 });
 async function tick(){
   if(processing)return; // Não perde a análise se o operador alternar de aba após digitar.
   if(!await checkEnabled())return;
   const el=findField();
   if(!el){observed='';field=null;return;}
   const text=textOf(el),now=Date.now();
   if(text!==observed){observed=text;since=now;return;}
   if(text.length<MIN_CHARS||text===sent||now-since<STABLE_MS||
       now-lastSendAt<MIN_INTERVAL_MS||now<nextTryAt)return;
   if(!await checkEnabled(true))return;
   processing=true;lastSendAt=now;
   try{
     const response=await chrome.runtime.sendMessage({type:'KB190_ANALYZE_LIVE',text});
     if(!response?.ok)throw Error(response?.error||'Base 190 indisponível');
     if(response.skip){sent=text;return;}
     if(textOf(el)!==text||!await checkEnabled(true))return;
     const publish=await chrome.runtime.sendMessage({type:'KB190_PUBLISH_LIVE',
       requestId:response.requestId,text});
     if(publish?.ok){sent=text;nextTryAt=0;}
     else throw Error(publish?.error||'Resultado não sincronizado');
   }catch{
     // Modo ponte: nenhum alerta ou resultado é mostrado na extensão.
     nextTryAt=Date.now()+10000;
   }finally{processing=false;}
 }
 window.dispatchEvent(new CustomEvent('relato190:sade:command',{detail:{type:'ping'}}));
 void checkEnabled(true);
 setInterval(()=>{void tick();},420);
})();