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
     if(s.enabled&&s.connected){
       notice.textContent='✓ Autorização salva e integração testada com sucesso! Base 190 conectada como '+s.user+
         '. Os próximos relatos serão analisados automaticamente, sem novas confirmações.';
     }else if(s.enabled){
       notice.textContent='✓ Autorização salva no Chrome. Teste de integração pendente: '+
         (s.reason||'abra a Base 190 e faça login no mesmo navegador.')+
         ' Após entrar na Base, clique em Testar integração agora. Não é preciso autorizar de novo.';
     }else{
       notice.textContent='○ Relato ao vivo desativado. Ative a chave para salvar a autorização e testar a integração.';
     }
   }catch(e){notice.textContent='Erro ao verificar status: '+e.message;}
   finally{notice.setAttribute('aria-busy','false');}
 }
 toggle.addEventListener('change',async()=>{
   const next=toggle.checked;
   toggle.disabled=true;
   notice.textContent=next?'Ativando a análise automática…':'Desativando a transmissão…';
   try{
     await request({type:'KB190_SET_AUTO',enabled:next});
     // O status consulta a sessão da aba Base 190 e confirma automaticamente a conexão.
     await render();
   }catch(e){toggle.checked=!next;notice.textContent='Não foi possível salvar: '+e.message;}
   finally{toggle.disabled=false;}
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