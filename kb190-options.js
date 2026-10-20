(()=>{
 'use strict';
 const KEY='kb190.test.origin.v1', SCRIPT='kb190-test-bridge';
 const $=id=>document.getElementById(id);
 const notice=t=>{$('status').textContent=t;};
 function normalize(text){
   const url=new URL(String(text||'').trim());
   if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||url.search||url.hash||url.pathname!=='/')
     throw Error('Informe somente a origem HTTPS, como https://exemplo.vercel.app, sem caminhos ou parâmetros.');
   return url.origin;
 }
 chrome.storage.local.get(KEY).then(data=>{
   if(data[KEY]){$('origin').value=data[KEY];notice('Domínio registrado: '+data[KEY]+'. Faça login na Base 190 e teste a sessão.');}
   else notice('Informe o endereço do sistema para começar.');
 }).catch(e=>notice('Erro de leitura da configuração: '+e.message));
 $('save').addEventListener('click',async()=>{
   $('save').disabled=true;
   try{
     const origin=normalize($('origin').value);
     const old=(await chrome.storage.local.get(KEY))[KEY];
     if(!(await chrome.permissions.request({origins:[origin+'/*']}))){notice('Permissão negada pelo operador.');return;}
     const existing=await chrome.scripting.getRegisteredContentScripts({ids:[SCRIPT]});
     if(existing.length)await chrome.scripting.unregisterContentScripts({ids:[SCRIPT]});
     await chrome.scripting.registerContentScripts([{id:SCRIPT,matches:[origin+'/*'],js:['kb190-bridge.js'],
       runAt:'document_idle',allFrames:false,persistAcrossSessions:true}]);
     await chrome.storage.local.set({[KEY]:origin});
     if(old&&old!==origin)await chrome.permissions.remove({origins:[old+'/*']}).catch(()=>{});
     const tabs=await chrome.tabs.query({});
     for(const tab of tabs){
       try{
         if(new URL(tab.url).origin!==origin)continue;
         await chrome.scripting.executeScript({target:{tabId:tab.id},files:['kb190-bridge.js']});
       }catch{ /* Recarregar a aba ativa se necessário */ }
     }
     notice('Domínio autorizado. Mantenha a aba autenticada aberta e clique em Testar sessão.');
   }catch(e){notice('Configuração não concluída: '+String(e.message||e));}
   finally{$('save').disabled=false;}
 });
 $('test').addEventListener('click',async()=>{
   $('test').disabled=true;notice('Consultando a sessão da Base 190…');
   try{
     const s=await chrome.runtime.sendMessage({type:'KB190_STATUS'});
     notice(s?.ok?'Conectado como '+s.user+' ('+s.role+') em '+s.origin+'.':s?.error||'Sem resposta da extensão.');
   }catch(e){notice('Não foi possível testar: '+e.message);}
   finally{$('test').disabled=false;}
 });
})();