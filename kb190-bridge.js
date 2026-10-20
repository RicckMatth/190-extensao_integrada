/* Bridge instalada AUTOMATICAMENTE em https://base-conhecimento-190.vercel.app.
 * Só permite GET /api/session e POST /api/analyze no próprio domínio.
 * Eventos enviados à página são exclusivamente de visualização; não autorizam acesso.
 */
(()=>{
 'use strict';
 const ORIGIN='https://base-conhecimento-190.vercel.app';
 if(window!==window.top||location.origin!==ORIGIN||globalThis.__kb190BridgeActive)return;
 globalThis.__kb190BridgeActive=true;
 const VERSION='5.11.0';
 function announce(){
   window.dispatchEvent(new CustomEvent('base190:extension-ready',{detail:{version:VERSION}}));
 }
 window.addEventListener('base190:extension-discover',announce);
 announce();
 chrome.runtime.onMessage.addListener((m,sender,respond)=>{
   if(sender.id!==chrome.runtime.id)return false;
   if(m?.type==='KB190_RESULT'){
     if(m.result&&typeof m.result==='object'){
       const payload={result:m.result,disclaimer:String(m.disclaimer||'').slice(0,1200),
         at:Number(m.at)||Date.now()};
       window.dispatchEvent(new CustomEvent('base190:extension-result',{detail:payload}));
     }
     respond({ok:true});return false;
   }
   if(m?.type!=='KB190_BRIDGE')return false;
   (async()=>{
     if(!['session','analyze'].includes(m.operation))
       return {ok:false,status:400,error:'Operação não permitida.'};
     const value=m.operation==='analyze'?String(m.text||''):'';
     if(m.operation==='analyze'&&(value.trim().length<3||value.length>8000))
       return {ok:false,status:400,error:'Texto fora dos limites.'};
     const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
     try{
       const response=await fetch(m.operation==='session'?'/api/session':'/api/analyze',{
         method:m.operation==='session'?'GET':'POST',
         credentials:'same-origin',mode:'same-origin',cache:'no-store',redirect:'error',
         ...(m.operation==='analyze'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({text:value})}:{}),
         signal:controller.signal
       });
       const raw=await response.text();
       if(raw.length>140000)return {ok:false,status:502,error:'Resposta muito grande.'};
       let data;try{data=JSON.parse(raw);}catch{return {ok:false,status:502,error:'Resposta inválida.'};}
       if(!response.ok)return {ok:false,status:response.status,error:
         response.status===401?'Faça login na Base 190.':
         response.status===403?'Sessão não autorizada.':
         'Serviço indisponível (HTTP '+response.status+').'};
       return {ok:true,data};
     }finally{clearTimeout(timer);}
   })().then(respond).catch(e=>respond({ok:false,status:503,error:e?.name==='AbortError'?'Tempo esgotado.':'Falha ao consultar a Base 190.'}));
   return true;
 });
})();