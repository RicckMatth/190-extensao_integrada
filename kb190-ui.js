/* Base 190 v5.13.0: autoanálise controlada SOMENTE pelas configurações da extensão. */
(()=>{
 'use strict';
 if(globalThis.__kb190TestUi)return;
 const root=document.getElementById('relato190-essencial-root'),shadow=root?.shadowRoot,bindings=globalThis.RelatoAgilBindings;
 if(!shadow||!bindings)return;
 globalThis.__kb190TestUi=true;
 const $=s=>shadow.querySelector(s);
 const css=document.createElement('style');
 css.textContent=`
 .kb190Config{margin-top:12px;padding:12px;border:1px solid #b7cee7;background:var(--relato-surface,#eef5fd);border-radius:11px;color:var(--relato-text,#183244);font:12px system-ui,sans-serif}
 .kb190Config h3{margin:0 0 8px;font-size:14px}.kb190Config p{font-size:11px;line-height:1.5}
 .kb190Config button{margin:5px 4px 5px 0;border:0;border-radius:7px;background:#225cb8;color:white;padding:8px 11px;cursor:pointer}
 .kb190Modal{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:rgba(9,24,39,.78);padding:12px;font:13px system-ui,sans-serif}
 .kb190Modal[hidden]{display:none!important}.kb190Dialog{width:min(690px,100%);max-height:90vh;overflow:auto;background:var(--relato-surface,#fff);color:var(--relato-text,#193144);border-radius:13px;padding:19px;box-shadow:0 12px 48px #0005}
 .kb190Dialog h2{font-size:18px;margin:0 0 10px}.kb190Dialog p{line-height:1.6}.kb190Dialog textarea{display:block;width:100%;height:175px;resize:vertical;box-sizing:border-box;border:1px solid #9bafc8;border-radius:8px;padding:10px;margin:8px 0;color:var(--relato-text,#132a41);background:var(--relato-surface,#fff);font:13px system-ui}
 .kb190Dialog button{border:0;border-radius:8px;padding:9px 12px;background:#245cb5;color:#fff;font-weight:700;cursor:pointer}
 .kb190Dialog button.secondary{background:#e0eaf6;color:#16427c}.kb190Dialog button:disabled{opacity:.55}
 .kb190Buttons{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.kb190Warning{background:#fff6dd;color:#705113;border-left:3px solid #d2a53b;padding:11px;border-radius:7px;font-size:12px}
 .kb190Output{margin-top:16px;padding-top:14px;border-top:1px solid #cbd6e5}.kb190Output[hidden]{display:none!important}
 .kb190Output pre{white-space:pre-wrap;word-break:break-word;background:var(--relato-hover,#edf4fb);padding:12px;border-radius:8px;max-height:260px;overflow:auto}
 .kb190Output ul{line-height:1.7;padding-left:20px}
 .kb190AutoTag{display:inline-flex;align-items:center;color:#dcefff;background:#183a50;border:1px solid #547182;
   padding:7px 9px;border-radius:8px;font-size:11px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .kb190AutoTag[data-state="on"]{color:#b9f5dd;border-color:#209a70}
 .kb190AutoTag[data-state="off"]{color:#ffe0a7;border-color:#b88849}
 .kb190Config p{overflow-wrap:anywhere}
 .kb190Tabs{display:flex;gap:6px;margin:9px 0 12px}
 .kb190Tabs button{background:var(--relato-hover,#eef4fc);color:var(--relato-text,#163956);border:1px solid var(--relato-border,#b9ccdd);font-size:12px}
 .kb190Tabs button[aria-selected="true"]{background:#245cb5;color:white}
 .kb190Dialog [hidden],.toolbar button[hidden]{display:none!important}
 .kb190Config .kb190State{font-weight:600}
 `;
 shadow.append(css);
 const settings=$('#settingsView');
 const block=document.createElement('section');block.className='kb190Config';
 block.innerHTML='<h3>🧠 Base 190 online — TESTE</h3><p>A autorização da análise agora fica <b>nesta extensão</b>. Ative ou desative o envio automático aqui ou na página de Configurações. É necessário estar logado na Base 190.</p><button type="button" id="kb190Toggle">Ativar / desativar nas configurações</button><button type="button" id="kb190Set">Configurações completas</button><button type="button" id="kb190Check">Atualizar conexão</button><p class="kb190State" id="kb190State" role="status">Verificando configurações…</p>';
 settings?.append(block);
 const modal=document.createElement('div');modal.className='kb190Modal';modal.hidden=true;
 modal.innerHTML='<div class="kb190Dialog" role="dialog" aria-modal="true" aria-label="Análise com Base 190">'
 +'<h2>🧠 Base 190 — MODELO DE TESTE INTEGRADO</h2>'
 +'<div class="kb190Tabs" role="tablist" aria-label="Painéis da análise"><button id="kb190TabCompose" role="tab" aria-selected="true" type="button">✏️ Analisar</button><button id="kb190TabResult" role="tab" aria-selected="false" type="button">📋 Resultado</button></div>'
 +'<p id="kb190Info" role="status">Confirme antes de analisar.</p>'
 +'<label for="kb190Input">Relato a analisar (revise e remova dados pessoais)</label>'
 +'<textarea id="kb190Input" maxlength="8000" placeholder="Digite um caso fictício ou revise o relato do simulador."></textarea>'
 +'<div class="kb190Warning">Protótipo não homologado. A autorização é definida nas Configurações desta extensão. A análise exige login na Base 190; revise classificação e informações antes de utilizá-las.</div>'
 +'<div class="kb190Buttons"><button class="secondary" id="kb190Close" type="button">Fechar</button>'
 +'<button class="secondary" id="kb190Options" type="button">Configurações da extensão</button>'
 +'<button id="kb190Run" type="button">Confirmar e analisar</button></div>'
 +'<section class="kb190Output" id="kb190Result" hidden></section>'
 +'</div>';
 shadow.append(modal);
 let target=null,previous='',suggestion='',busy=false,latestSade=null,lastData=null;
 let remoteAuthorized=false,autoPolling=false,autoBusy=false,autoLastStatus=0,autoRetryAt=0;
 let observedText='',observedSince=0,sentText='',cachedElement=null;
 const send=async(type,extra={})=>{
   const r=await chrome.runtime.sendMessage({type,...extra});
   if(!r?.ok)throw Error(r?.error||'Base 190 indisponível.');
   return r;
 };
 const notify=t=>{$('#kb190Info').textContent=String(t||'');};
 function setTab(which){
   const showResult=which==='result';
   $('#kb190TabCompose').setAttribute('aria-selected',String(!showResult));
   $('#kb190TabResult').setAttribute('aria-selected',String(showResult));
   $('#kb190Input').hidden=showResult;
   modal.querySelector('label[for="kb190Input"]').hidden=showResult;
   modal.querySelector('.kb190Warning').hidden=showResult;
   $('#kb190Run').hidden=showResult;
   $('#kb190Result').hidden=!showResult;
   if(showResult&&!lastData)notify('Ainda não há resultado nesta sessão. Abra Analisar e envie um exemplo fictício.');
 }
 const add=(parent,tag,txt)=>{
   const el=document.createElement(tag);el.textContent=String(txt??'');parent.append(el);return el;
 };
 const read=el=>!el?'':String(el.isContentEditable?el.innerText:el.value||'');
 const textField=el=>el?.isConnected&&!el.disabled&&!el.readOnly&&(el.tagName==='TEXTAREA'||el.tagName==='INPUT'&&['text','search'].includes(el.type)||el.isContentEditable);
 window.addEventListener('relato190:sade:status',e=>{if(e?.detail?.fields)latestSade=e.detail;});
 async function findRelato(){
   window.dispatchEvent(new CustomEvent('relato190:sade:command',{detail:{type:'ping'}}));
   const info=latestSade?.fields?.relato;
   if(info?.mode==='auto'&&info.description){
     try{const el=bindings.resolve(info.description,document);if(textField(el))return el;}catch{}
   }
   const cfg=await bindings.remote('load');
   if(cfg?.fields?.relato){
     try{const el=bindings.resolve(cfg.fields.relato,document);if(textField(el))return el;}catch{}
   }
   return null;
 }
 function close(){if(busy)return;modal.hidden=true;target=null;previous='';suggestion='';$('#kb190Result').replaceChildren();$('#kb190Result').hidden=true;}
 async function open(){
   if(busy)return;
   modal.hidden=false;$('#kb190Result').replaceChildren();setTab('compose');
   target=null;previous='';suggestion='';$('#kb190Input').value='';
   notify('Ative a análise automática nas Configurações da extensão. É necessário estar logado na Base 190.');
   try{
     target=await findRelato();previous=read(target);
     if(target)$('#kb190Input').value=previous.slice(0,8000);
     else notify('Campo SADE não reconhecido com segurança. Digite texto fictício ou configure os vínculos no painel.');
   }catch(e){notify('Não foi possível identificar o relato: '+String(e?.message||e));}
 }
 function write(el,text){
   if(!textField(el))throw Error('Campo de destino não disponível.');
   const win=el.ownerDocument.defaultView;
   if(el.isContentEditable)el.textContent=text;
   else{
     const proto=el.tagName==='TEXTAREA'?win.HTMLTextAreaElement.prototype:win.HTMLInputElement.prototype;
     const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
     if(setter)setter.call(el,text);else el.value=text;
   }
   el.dispatchEvent(new win.Event('input',{bubbles:true}));
   el.dispatchEvent(new win.Event('change',{bubbles:true}));
 }
 function output(data){
   lastData=data;
   const box=$('#kb190Result');box.replaceChildren();setTab('result');
   if($('#kb190OpenLast'))$('#kb190OpenLast').hidden=false;
   const r=data?.result;
   if(!r){add(box,'p','A Base 190 não retornou classificação.');return;}
   if(r.tipo==='faq'){add(box,'h3',r.titulo||'Orientação');add(box,'pre',r.resposta||'');return;}
   if(r.tipo!=='classificacao'){add(box,'h3','Sem conclusão');add(box,'p',r.mensagem||'Não foi possível classificar.');return;}
   const a=r.principal||{};
   add(box,'h3','Sugestão: '+(a.officialNature||'Natureza não informada'));
   add(box,'p','Código: '+(a.code||'A confirmar')+' • Prioridade orientativa: '+(a.priority||'A confirmar'));
   if(r.indiceHeuristico!=null)add(box,'p','Índice heurístico: '+r.indiceHeuristico+'/99 (não é probabilidade de acerto).');
   if(a.explanation)add(box,'p',a.explanation);
   if(Array.isArray(a.triageQuestions)&&a.triageQuestions.length){
     add(box,'h4','Perguntas de triagem sugeridas');
     const list=document.createElement('ul');a.triageQuestions.slice(0,8).forEach(t=>add(list,'li',t));box.append(list);
   }
   if(Array.isArray(r.secundarias)&&r.secundarias.length){
     add(box,'h4','Outras hipóteses');
     add(box,'p',r.secundarias.slice(0,3).map(x=>x.officialNature||'').join(' • '));
   }
   suggestion=String(r.relatoRevisado||'').slice(0,16000);
   if(suggestion){
     add(box,'h4','Redação sugerida (revisar antes de utilizar)');
     add(box,'pre',suggestion);
     const buttons=document.createElement('div');buttons.className='kb190Buttons';
     const copy=add(buttons,'button','Copiar sugestão');copy.type='button';copy.addEventListener('click',()=>{
       navigator.clipboard?.writeText(suggestion).then(()=>notify('Sugestão copiada.')).catch(()=>notify('Falha ao copiar.'));
     });
     if(textField(target)){
       const apply=add(buttons,'button','Aplicar ao campo (confirmar)');apply.type='button';
       apply.addEventListener('click',()=>{
         if(!textField(target)||read(target)!==previous){notify('O campo mudou. Nenhum texto foi alterado; faça nova análise.');return;}
         if(!window.confirm('Você revisou todos os fatos? Confirmar alteração local do campo, SEM enviar a ocorrência?'))return;
         try{write(target,suggestion);previous=suggestion;notify('Texto aplicado localmente. Confira antes de salvar no SADE.');}
         catch(e){notify('Não aplicado: '+e.message);}
       });
     }
     box.append(buttons);
   }
   if(data?.disclaimer)add(box,'p',data.disclaimer);
 }
 const options=()=>chrome.runtime.sendMessage({type:'KB190_OPEN_OPTIONS'}).catch(()=>{});
 const setAutoState=(enabled,connected,message)=>{
   remoteAuthorized=enabled===true&&connected===true;
   const tag=$('#kb190AutoState'),toggle=$('#kb190Toggle');
   if(tag){
     tag.dataset.state=remoteAuthorized?'on':'off';
     tag.textContent=remoteAuthorized?'● Análise automática ativa':enabled?'○ Faça login na Base':'○ Análise desligada';
   }
   if(toggle)toggle.textContent=enabled?'Gerenciar análise automática':'Ativar análise automática';
   if($('#kb190State'))$('#kb190State').textContent=message||
     (remoteAuthorized?'● Configuração ativa e sessão autenticada.':
       enabled?'○ Envio autorizado na extensão; abra a Base 190 e faça login.':
       '○ Análise desativada nesta extensão.');
 };
 async function refreshAuthorization(force=false){
   const now=Date.now();
   if(!force&&now-autoLastStatus<4000)return remoteAuthorized;
   autoLastStatus=now;
   try{
     const status=await send('KB190_STATUS');
     const enabled=status.enabled===true,connected=status.connected===true;
     setAutoState(enabled,connected,
       enabled?(connected?'● Análise ativada nesta extensão · '+status.user+'.':
         '○ Análise ativada · '+(status.reason||'faça login na Base 190.')):
         '○ Análise automática desativada. Clique em Ativar análise automática.');
   }catch(e){setAutoState(false,false,'○ '+e.message);}
   return remoteAuthorized;
 }
 async function pollRelato(){
   if(autoPolling||autoBusy)return;
   autoPolling=true;
   try{
     if(!await refreshAuthorization())return;
     const el=cachedElement?.isConnected?cachedElement:await findRelato();
     if(!textField(el)){cachedElement=null;observedText='';return;}
     cachedElement=el;
     const text=read(el).trim().slice(0,8000);
     if(text!==observedText){observedText=text;observedSince=Date.now();return;}
     if(text.length<20||text===sentText||Date.now()-observedSince<3500||Date.now()<autoRetryAt)return;
     autoBusy=true;
     if($('#kb190AutoState'))$('#kb190AutoState').textContent='◌ Analisando relato…';
     target=el;previous=text;
     try{
       const result=await send('KB190_AUTO_ANALYZE',{text});
       sentText=text;autoRetryAt=0;output(result);
       if($('#kb190OpenLast'))$('#kb190OpenLast').textContent='📋 Novo resultado';
       if($('#kb190AutoState'))$('#kb190AutoState').textContent='✓ Resultado disponível';
       // O site abre o chat automaticamente ao receber a resposta.
       if(!modal.hidden)notify('Nova análise recebida. Revise sempre o enquadramento.');
     }catch(e){
       autoRetryAt=Date.now()+15000;
       if($('#kb190State'))$('#kb190State').textContent='Análise não realizada: '+e.message;
       if(/desativada|configurações|sessão|login|entre na base/i.test(e.message))void refreshAuthorization(true);
     }finally{autoBusy=false;}
   }catch(e){
     autoRetryAt=Date.now()+15000;
   }finally{autoPolling=false;}
 }
 // Resultados produzidos diretamente no site chegam à aba Resultado sem envio ao SADE.
 chrome.runtime.onMessage.addListener((m,sender,respond)=>{
   if(m?.type!=='KB190_SITE_RESULT_TO_UI'||sender.id!==chrome.runtime.id)return false;
   if(!m.result||typeof m.result!=='object')return false;
   target=null;previous='';suggestion='';
   const data={result:m.result,disclaimer:m.disclaimer||''};
   lastData=data;
   if($('#kb190OpenLast')){
     $('#kb190OpenLast').hidden=false;
     $('#kb190OpenLast').textContent='📋 Novo resultado';
   }
   if(!modal.hidden)output(data);
   if($('#kb190State'))$('#kb190State').textContent='● Resultado sincronizado da Base 190.';
   respond({ok:true});return false;
 });
 $('#kb190TabCompose').addEventListener('click',()=>setTab('compose'));
 $('#kb190TabResult').addEventListener('click',()=>{
   if(lastData)output(lastData);
   else setTab('result');
 });
 $('#kb190Set')?.addEventListener('click',options);
 $('#kb190Options').addEventListener('click',options);
 $('#kb190Toggle')?.addEventListener('click',options);
 chrome.storage.onChanged.addListener((changes,area)=>{
   if(area==='local'&&changes['kb190.autoEnabled.v3']){
     autoLastStatus=0;
     void refreshAuthorization(true);
   }
 });
 $('#kb190Check')?.addEventListener('click',async()=>{
   $('#kb190State').textContent='Verificando sessão na Base 190…';
   try{await refreshAuthorization(true);}
   catch(e){$('#kb190State').textContent='Não conectado: '+e.message;}
 });
 $('#kb190Close').addEventListener('click',close);
 $('#kb190Run').addEventListener('click',async()=>{
   if(busy)return;
   const text=$('#kb190Input').value;
   if(text.trim().length<3||text.length>8000){notify('Relato inválido. Use de 3 a 8.000 caracteres.');return;}
   if(!await refreshAuthorization(true)){
     notify('Ative a análise nas Configurações desta extensão e mantenha o login na Base 190.');
     return;
   }
   busy=true;$('#kb190Run').disabled=true;notify('Enviando para análise autenticada…');
   try{const result=await send('KB190_ANALYZE',{text});output(result);notify('Sugestão recebida. Confirme o enquadramento e o texto antes de qualquer uso.');}
   catch(e){notify('Falha: '+e.message);}
   finally{busy=false;$('#kb190Run').disabled=false;}
 });
 const toolbar=$('.toolbar'),quick=toolbar?.querySelector('#quick');
 const button=document.createElement('button');button.type='button';button.id='kb190Action';button.textContent='🧠 Base 190';button.title='Conexão automática com a Base 190 autenticada';
 button.addEventListener('click',open);
 const tag=document.createElement('span');tag.id='kb190AutoState';tag.className='kb190AutoTag';
 tag.dataset.state='off';tag.textContent='○ Análise desativada';
 const latest=document.createElement('button');latest.type='button';latest.id='kb190OpenLast';latest.textContent='📋 Resultado';
 latest.title='Reabrir resultado da última análise nesta aba';latest.hidden=true;
 latest.addEventListener('click',()=>{
   modal.hidden=false;latest.textContent='📋 Resultado';
   if(lastData)output(lastData);else setTab('result');
 });
 if(quick)quick.after(button,latest,tag);else toolbar?.append(button,latest,tag);
 // Nenhum relato é lido/transmitido antes da autorização persistida na aba da Base.
 void refreshAuthorization(true);
 setInterval(()=>{void pollRelato();},1700);
})();