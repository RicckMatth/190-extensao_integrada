/* Ponte Base 190 v5.14.0: sessão autenticada, resultado apenas no site.
 * A autorização de envio NÃO vive no site. Ela fica na extensão (chrome.storage.local)
 * e é checada pela ponte novamente em cada análise.
 */
(()=>{'use strict';
 const ORIGIN='https://base-conhecimento-190.vercel.app';
 const KEY='kb190.autoEnabled.v3';
 if(window!==window.top||location.origin!==ORIGIN||globalThis.__kb190BridgeActive)return;
 globalThis.__kb190BridgeActive=true;
 function announce(){window.dispatchEvent(new CustomEvent('base190:extension-ready',{detail:{version:'5.14.0'}}));}
 window.addEventListener('base190:extension-discover',announce);
 window.addEventListener('base190:open-settings',()=>{
   chrome.runtime.sendMessage({type:'KB190_OPEN_OPTIONS'}).catch(()=>{});
 });
 async function json(path,method='GET',value=''){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{
     const response=await fetch(path,{method,credentials:'same-origin',mode:'same-origin',
       cache:'no-store',redirect:'error',signal:controller.signal,
       ...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value})}:{})});
     const raw=await response.text();
     if(raw.length>140000)return {ok:false,status:502,error:'Resposta da Base 190 excedeu o limite.'};
     let data;try{data=JSON.parse(raw);}catch{return {ok:false,status:502,error:'Resposta inválida da Base 190.'};}
     if(!response.ok)return {ok:false,status:response.status,error:
       response.status===401?'Faça login na Base 190.':
       response.status===403?'Sessão da Base 190 bloqueada.':
       'Erro da API (HTTP '+response.status+').'};
     return {ok:true,data};
   }finally{clearTimeout(timer);}
 }
 const enabled=async()=>((await chrome.storage.local.get(KEY))[KEY]===true);
 announce();
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
   if(sender.id!==chrome.runtime.id)return false;
   if(m?.type==='KB190_RESULT'){
     if(m.result&&['classificacao','faq','indefinido'].includes(m.result.tipo)&&JSON.stringify(m.result).length<=40000){
       window.dispatchEvent(new CustomEvent('base190:extension-result',{detail:{result:m.result,
         sourceText:String(m.sourceText||'').slice(0,1800),
         disclaimer:String(m.disclaimer||'').slice(0,1200),at:Number(m.at)||Date.now()}}));
     }
     reply({ok:true});return false;
   }
   if(m?.type!=='KB190_BRIDGE')return false;
   (async()=>{
     if(!['session','analyze'].includes(m.operation))return {ok:false,status:400,error:'Operação não permitida.'};
     if(m.operation==='analyze'&&!await enabled())
       return {ok:false,status:403,error:'Ative a análise nas Configurações da extensão.'};
     const session=await json('/api/session');
     if(!session.ok)return session;
     if(!session.data?.user||session.data.user.mustChangePassword)
       return {ok:false,status:403,error:'Login da Base 190 não autorizado.'};
     if(m.operation==='session')return session;
     const text=String(m.text||'');
     if(text.trim().length<3||text.length>8000)return {ok:false,status:400,error:'Relato inválido.'};
     if(!await enabled())return {ok:false,status:403,error:'Autorização desativada.'};
     return json('/api/analyze','POST',text);
   })().then(reply).catch(e=>reply({ok:false,status:503,error:
     e?.name==='AbortError'?'Tempo esgotado.':'Falha na comunicação com a Base 190.'}));
   return true;
 });
})();