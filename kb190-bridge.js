/* Executado apenas no domínio HTTPS concedido à extensão pelo usuário.
 * Faz requisições same-origin autenticadas no site, sem disponibilizar cookie/token ao background.
 */
(()=>{
 'use strict';
 if(window!==window.top||globalThis.__kb190BridgeActive)return;
 globalThis.__kb190BridgeActive=true;
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
   if(m?.type!=='KB190_BRIDGE'||sender.id!==chrome.runtime.id)return false;
   (async()=>{
     if(!['session','analyze'].includes(m.operation))return {ok:false,status:400,error:'Operação bloqueada.'};
     const text=m.operation==='analyze'?String(m.text||''):'';
     if(m.operation==='analyze'&&(text.trim().length<3||text.length>8000))
       return {ok:false,status:400,error:'Tamanho de relato inválido.'};
     const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
     try{
       const response=await fetch(m.operation==='session'?'/api/session':'/api/analyze',{
         method:m.operation==='session'?'GET':'POST',
         credentials:'same-origin',mode:'same-origin',cache:'no-store',redirect:'error',
         ...(m.operation==='analyze'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({text})}:{}),
         signal:controller.signal
       });
       const raw=await response.text();
       if(raw.length>140000)return {ok:false,status:502,error:'Resposta acima do limite.'};
       let value;try{value=JSON.parse(raw);}catch{return {ok:false,status:502,error:'Resposta inválida da Base 190.'};}
       if(!response.ok)return {ok:false,status:response.status,error:
          response.status===401?'Sessão expirada ou ausente.':
          response.status===403?'Acesso não autorizado.':
          'Erro do serviço (HTTP '+response.status+').'};
       return {ok:true,data:value};
     }finally{clearTimeout(timer);}
   })().then(reply).catch(e=>reply({ok:false,status:503,error:e?.name==='AbortError'?'Tempo limite da Base 190.':'Falha na conexão à Base 190.'}));
   return true;
 });
})();