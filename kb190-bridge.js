/* Authorized, bounded CIJ protocol bridge. Never writes to SADE. */
(()=>{'use strict';
 const ORIGIN='https://base-conhecimento-190.vercel.app',KEY='kb190.autoEnabled.v3',P=globalThis.CIJAnalysisProtocol;
 if(window!==window.top||location.origin!==ORIGIN||globalThis.__kb190BridgeActive||!P)return;
 globalThis.__kb190BridgeActive=true;
 const active=new Map(),latest=new Map(),delivered=new Set();
 const announce=()=>window.dispatchEvent(new CustomEvent('base190:extension-ready',{detail:{version:'5.16.0',protocol:1}}));
 const enabled=async()=>((await chrome.storage.local.get(KEY))[KEY]===true);
 const status=(requestId,sourceKey,phase)=>window.dispatchEvent(new CustomEvent('base190:extension-status',{detail:{requestId,sourceKey,phase}}));
 function cancelAll(){for(const [id,x]of active){x.controller.abort();status(id,x.sourceKey,'cancelled');}active.clear();latest.clear();delivered.clear();}
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[KEY]?.newValue!==undefined&&changes[KEY].newValue!==true)cancelAll();});
 window.addEventListener('pagehide',cancelAll);
 window.addEventListener('base190:extension-discover',announce);
 window.addEventListener('base190:open-settings',()=>{chrome.runtime.sendMessage({type:'KB190_OPEN_OPTIONS'}).catch(()=>{});});
 async function session(){const c=new AbortController(),timer=setTimeout(()=>c.abort(),P.LIMITS.sessionMs);try{const r=await fetch('/api/session',{credentials:'same-origin',mode:'same-origin',cache:'no-store',redirect:'error',signal:c.signal});if(!r.ok)throw Object.assign(Error(r.status===401?'Faça login na Base 190.':'Sessão bloqueada.'),{status:r.status});const text=await r.text();if(text.length>10000)throw Error('Sessão inválida.');const data=JSON.parse(text);if(!data.user||data.user.mustChangePassword)throw Object.assign(Error('Login não autorizado.'),{status:403});return data;}finally{clearTimeout(timer);}}
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(sender.id!==chrome.runtime.id)return false;
  if(m?.type==='KB190_RESULT'){
   (async()=>{if(!await enabled())throw Error('Autorização revogada.');if(!P.id(m.requestId)||latest.get(m.sourceKey)!==m.requestId||delivered.has(m.requestId))throw Error('Resultado obsoleto ou duplicado.');const result=P.validateResult(m.result);const login=await session();if(String(login.user.id)!==m.userId)throw Error('Sessão alterada.');if(!await enabled()||latest.get(m.sourceKey)!==m.requestId)throw Error('Autorização ou análise alterada.');delivered.add(m.requestId);if(delivered.size>100)delivered.delete(delivered.values().next().value);
    window.dispatchEvent(new CustomEvent('base190:extension-result',{detail:{requestId:m.requestId,sourceKey:m.sourceKey,result,sourceText:String(m.sourceText||'').slice(0,1800),disclaimer:String(m.disclaimer||'').slice(0,1200),at:Date.now()}}));return {ok:true};
   })().then(reply).catch(()=>reply({ok:false,error:'Resultado inválido, obsoleto ou não autorizado.'}));return true;
  }
  if(m?.type!=='KB190_BRIDGE')return false;
  (async()=>{
   if(m.operation==='cancel'){const x=active.get(m.requestId);if(x){x.controller.abort();active.delete(m.requestId);status(m.requestId,x.sourceKey,'superseded');}if(latest.get(m.sourceKey)===m.requestId)latest.delete(m.sourceKey);return {ok:true};}
   if(m.operation==='session')return {ok:true,data:await session()};
   if(m.operation!=='analyze'||!P.id(m.requestId)||typeof m.sourceKey!=='string'||m.sourceKey.length>100||typeof m.text!=='string'||m.text.trim().length<3||m.text.length>P.LIMITS.text)throw Error('Solicitação inválida.');
   if(!await enabled())throw Object.assign(Error('Autorização desativada.'),{status:403});
   const old=latest.get(m.sourceKey);if(old){active.get(old)?.controller.abort();active.delete(old);}
   latest.set(m.sourceKey,m.requestId);const controller=new AbortController();active.set(m.requestId,{controller,sourceKey:m.sourceKey});
   status(m.requestId,m.sourceKey,'received');
   const timer=setTimeout(()=>controller.abort(),P.LIMITS.requestMs);
   try{await session();if(!await enabled())throw Error('Autorização desativada.');controller.signal.throwIfAborted();
    const r=await fetch('/api/analyze',{method:'POST',credentials:'same-origin',mode:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({text:m.text,requestId:m.requestId,progress:true})});
    const data=await P.readResponse(r,m.requestId,phase=>{if(latest.get(m.sourceKey)===m.requestId)status(m.requestId,m.sourceKey,phase);});
    if(!await enabled()||controller.signal.aborted||latest.get(m.sourceKey)!==m.requestId)throw Error('Análise substituída ou cancelada.');return {ok:true,data};
   }catch(e){if(latest.get(m.sourceKey)===m.requestId)status(m.requestId,m.sourceKey,e.name==='AbortError'?'cancelled':'error');throw e;}
   finally{clearTimeout(timer);active.delete(m.requestId);}
  })().then(reply).catch(e=>reply({ok:false,status:e.status||503,error:e.name==='AbortError'?'Tempo esgotado ou solicitação cancelada.':String(e.message||'Falha na comunicação.').slice(0,300)}));return true;
 });announce();
})();
