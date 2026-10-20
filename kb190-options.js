/* Preferência única e verificável no service worker; nada de sessionStorage no site. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const toggle=$('autoEnabled'),notice=$('status'),test=$('test'),open=$('openBase');
 const request=async(m)=>{
   const r=await chrome.runtime.sendMessage(m);
   if(!r?.ok)throw Error(r?.error||'A extensão não respondeu.');
   return r;
 };
 async function render(){
   notice.setAttribute('aria-busy','true');
   try{
     const s=await request({type:'KB190_STATUS'});
     toggle.checked=s.enabled===true;
     notice.textContent=(s.enabled?'● Análise automática ativada. ':'○ Análise automática desativada. ')+
       (s.connected?'Conectada à Base 190 como '+s.user+'.':(s.reason||'Faça login na Base 190 em outra aba.'));
   }catch(e){notice.textContent='Erro ao verificar status: '+e.message;}
   finally{notice.setAttribute('aria-busy','false');}
 }
 toggle.addEventListener('change',async()=>{
   const next=toggle.checked;
   toggle.disabled=true;
   notice.textContent=next?'Ativando a análise automática…':'Desativando a transmissão…';
   try{
     await request({type:'KB190_SET_AUTO',enabled:next});
   }catch(e){toggle.checked=!next;notice.textContent='Não foi possível salvar: '+e.message;}
   finally{toggle.disabled=false;await render();}
 });
 test.addEventListener('click',async()=>{test.disabled=true;try{await render();}finally{test.disabled=false;}});
 open.addEventListener('click',async()=>{
   open.disabled=true;
   try{await request({type:'KB190_OPEN_BASE'});}
   catch(e){notice.textContent='Não foi possível abrir a Base: '+e.message;}
   finally{open.disabled=false;}
 });
 chrome.storage.onChanged.addListener((changes,area)=>{
   if(area==='local'&&changes['kb190.autoEnabled.v3'])void render();
 });
 void render();
})();