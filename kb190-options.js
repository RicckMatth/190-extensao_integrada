(()=>{'use strict';
 const BASE='https://base-conhecimento-190.vercel.app';
 const $=id=>document.getElementById(id);
 $('origin').value=BASE; $('origin').disabled=true;
 $('save').textContent='Abrir Base 190';
 $('test').textContent='Verificar login automático';
 $('status').textContent='Conexão automática com '+BASE+'. Basta abrir o site, entrar e usar a extensão no SADE.';
 $('save').addEventListener('click',async()=>{const r=await chrome.runtime.sendMessage({type:'KB190_OPEN_BASE'});$('status').textContent=r?.ok?'Base aberta. Faça login pelo site.':r?.error||'Não foi possível abrir.';});
 $('test').addEventListener('click',async()=>{
   $('test').disabled=true;$('status').textContent='Verificando a aba autenticada…';
   try{
     const r=await chrome.runtime.sendMessage({type:'KB190_STATUS'});
     $('status').textContent=r?.ok?'Conectado automaticamente: '+r.user+' ('+r.role+').':r?.error||'Não foi possível verificar.';
   }finally{$('test').disabled=false;}
 });
})();