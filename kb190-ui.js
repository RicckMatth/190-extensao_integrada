/* Base 190 - interface TESTE (MV3). Nenhum relato é enviado automaticamente. */
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
 `;
 shadow.append(css);
 const settings=$('#settingsView');
 const block=document.createElement('section');block.className='kb190Config';
 block.innerHTML='<h3>🧠 Base 190 online — TESTE</h3><p>Requer uma aba autenticada da Base 190. A extensão não coleta senhas, cookies ou tokens. A análise só ocorre mediante confirmação do operador.</p><button type="button" id="kb190Set">Configurar conexão</button><button type="button" id="kb190Check">Testar conexão</button><p id="kb190State" role="status">Conexão ainda não verificada.</p>';
 settings?.append(block);
 const modal=document.createElement('div');modal.className='kb190Modal';modal.hidden=true;
 modal.innerHTML='<div class="kb190Dialog" role="dialog" aria-modal="true" aria-label="Análise com Base 190">'
 +'<h2>🧠 Base 190 — MODELO DE TESTE INTEGRADO</h2>'
 +'<p id="kb190Info" role="status">Confirme antes de analisar.</p>'
 +'<label for="kb190Input">Relato a analisar (revise e remova dados pessoais)</label>'
 +'<textarea id="kb190Input" maxlength="8000" placeholder="Digite um caso fictício ou revise o relato do simulador."></textarea>'
 +'<div class="kb190Warning">Sistema experimental, sem homologação institucional. Nunca utilize classificação automática como decisão definitiva. O botão de análise envia o texto à Base 190 online, após sua autorização.</div>'
 +'<div class="kb190Buttons"><button class="secondary" id="kb190Close" type="button">Fechar</button>'
 +'<button class="secondary" id="kb190Options" type="button">Configurar</button>'
 +'<button id="kb190Run" type="button">Confirmar e analisar</button></div>'
 +'<section class="kb190Output" id="kb190Result" hidden></section>'
 +'</div>';
 shadow.append(modal);
 let target=null,previous='',suggestion='',busy=false,latestSade=null;
 const send=async(type,extra={})=>{
   const r=await chrome.runtime.sendMessage({type,...extra});
   if(!r?.ok)throw Error(r?.error||'Base 190 indisponível.');
   return r;
 };
 const notify=t=>{$('#kb190Info').textContent=String(t||'');};
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
   modal.hidden=false;$('#kb190Result').replaceChildren();$('#kb190Result').hidden=true;
   target=null;previous='';suggestion='';$('#kb190Input').value='';
   notify('Revise o texto antes de enviar. Nenhum relato será transmitido sem sua confirmação.');
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
   const box=$('#kb190Result');box.replaceChildren();box.hidden=false;
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
 $('#kb190Set')?.addEventListener('click',options);
 $('#kb190Options').addEventListener('click',options);
 $('#kb190Check')?.addEventListener('click',async()=>{
   $('#kb190State').textContent='Verificando sessão na Base 190…';
   try{const x=await send('KB190_STATUS');$('#kb190State').textContent='Conectado: '+x.user+' em '+x.origin+'.';}
   catch(e){$('#kb190State').textContent='Não conectado: '+e.message;}
 });
 $('#kb190Close').addEventListener('click',close);
 $('#kb190Run').addEventListener('click',async()=>{
   if(busy)return;
   const text=$('#kb190Input').value;
   if(text.trim().length<3||text.length>8000){notify('Relato inválido. Use de 3 a 8.000 caracteres.');return;}
   if(!window.confirm('Enviar o texto mostrado à Base 190 online? Confirme que usa dados fictícios ou tem autorização institucional.'))return;
   busy=true;$('#kb190Run').disabled=true;notify('Enviando para análise autenticada…');
   try{const result=await send('KB190_ANALYZE',{confirmed:true,text});output(result);notify('Sugestão recebida. Confirme o enquadramento e o texto antes de qualquer uso.');}
   catch(e){notify('Falha: '+e.message);}
   finally{busy=false;$('#kb190Run').disabled=false;}
 });
 const toolbar=$('.toolbar'),quick=toolbar?.querySelector('#quick');
 const button=document.createElement('button');button.type='button';button.id='kb190Action';button.textContent='🧠 Base 190';button.title='Modelo de TESTE: consultar a Base 190 autenticada';
 button.addEventListener('click',open);
 if(quick)quick.after(button);else toolbar?.append(button);
})();