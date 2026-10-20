/* Base 190 v5.12.0 — ponte de sessão por domínio fixo.
 * Autoriza cada POST de análise consultando GET /api/session e sessionStorage da aba.
 * TLS (HTTPS), sem leitura/exportação de token ou cookie.
 */
(()=>{'use strict';
 const ORIGIN='https://base-conhecimento-190.vercel.app';
 const CONSENT='base190.remoteConsent.v2';
 if(window!==window.top||location.origin!==ORIGIN||globalThis.__kb190BridgeActive)return;
 globalThis.__kb190BridgeActive=true;
 const VERSION='5.12.0';
 function announce(){window.dispatchEvent(new CustomEvent('base190:extension-ready',{detail:{version:VERSION}}));}
 window.addEventListener('base190:extension-discover',announce);
 window.addEventListener('base190:site-analysis',e=>{
   const data=e?.detail;
   if(!data?.result||!['classificacao','faq','indefinido'].includes(data.result.tipo))return;
   try{if(JSON.stringify(data).length>40000)return;
     chrome.runtime.sendMessage({type:'KB190_SITE_RESULT',result:data.result,
       disclaimer:String(data.disclaimer||'').slice(0,1200)}).catch(()=>{});
   }catch{}
 });
 announce();
 async function json(path,method='GET',text=''){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{
     const response=await fetch(path,{method,credentials:'same-origin',mode:'same-origin',cache:'no-store',
       redirect:'error',signal:controller.signal,
       ...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({text})}:{})});
     const raw=await response.text();
     if(raw.length>140000)return {ok:false,status:502,error:'Resposta excedeu limite.'};
     let value;try{value=JSON.parse(raw);}catch{return {ok:false,status:502,error:'Resposta inválida.'};}
     if(!response.ok)return {ok:false,status:response.status,error:response.status===401?'Faça login na Base 190.':
       response.status===403?'Sessão bloqueada.':'Falha da API (HTTP '+response.status+').'};
     return {ok:true,data:value};
   }finally{clearTimeout(timer);}
 }
 chrome.runtime.onMessage.addListener((m,sender,respond)=>{
   if(sender.id!==chrome.runtime.id)return false;
   if(m?.type==='KB190_RESULT'){
     if(m.result&&['classificacao','faq','indefinido'].includes(m.result.tipo)&&JSON.stringify(m.result).length<=40000){
       window.dispatchEvent(new CustomEvent('base190:extension-result',{detail:{result:m.result,
         disclaimer:String(m.disclaimer||'').slice(0,1200),at:Number(m.at)||Date.now()}}));
     }
     respond({ok:true});return false;
   }
   if(m?.type!=='KB190_BRIDGE')return false;
   (async()=>{
     if(!['consent','analyze','session'].includes(m.operation))return {ok:false,status:400,error:'Operação não permitida.'};
     const session=await json('/api/session');
     if(!session.ok)return session;
     const user=session.data?.user;
     if(!user||user.mustChangePassword)return {ok:false,status:403,error:'Sessão inválida.'};
     const authorized=sessionStorage.getItem(CONSENT)===String(user.id);
     if(m.operation==='consent')return {ok:true,data:{authorized,user:user.username,role:user.role}};
     if(m.operation==='session')return {ok:true,data:session.data};
     if(!authorized)return {ok:false,status:403,error:'Autorize conexão remota no chat da Base 190.'};
     const text=String(m.text||'');
     if(text.trim().length<3||text.length>8000)return {ok:false,status:400,error:'Texto inválido.'};
     return json('/api/analyze','POST',text);
   })().then(respond).catch(e=>respond({ok:false,status:503,error:e?.name==='AbortError'?'Tempo esgotado.':'Não foi possível consultar a Base 190.'}));
   return true;
 });
})();