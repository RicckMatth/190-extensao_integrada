// ==UserScript==
// @name         Relato 190 — Reconhecimento e Cópia (Simulador)
// @namespace    pacific-monkey.local
// @version      2.0.0
// @description  Assistente local de campos: reconhecimento, vínculo manual, prévia, copiar, inserir e desfazer. Testes autorizados, sem envio de dados.
// @match        http://localhost/*
// @grant        none
// ==/UserScript==
/*
 * Relato 190 / Pacific Monkey — versão de testes. Não homologado para operação.
 * O @match é de SIMULADOR. Para um site autorizado, altere-o no editor do
 * Pacific Monkey para o domínio EXATO usado pelo formulário. O operador precisa
 * confirmar permissões do Chrome. Scripts nunca devem contornar controle de TI.
 *
 * Sem chamadas de rede, IA, leitura de credenciais, armazenamento de atendimentos
 * ou submissão de formulários. Só altera o relato após clique explícito.
 * Formulários em iframes de outra origem exigem configuração/autorizações à parte.
 */
(() => {
  'use strict';
  const INSTANCE_KEY = '__pacificRelato190SimulatorV1';
  if (globalThis[INSTANCE_KEY]) return;
  globalThis[INSTANCE_KEY] = '2.0.0';

  const VERSION = '2.0.0';
  const KEYS = ['nome','telefone','cidade','rua','numero','bairro','complemento','cep','relato'];
  const PREFIX_KEYS = ['nome','telefone','cidade','rua','numero','bairro','complemento'];
  const LABEL = {
    nome:'Solicitante',telefone:'Telefone',cidade:'Cidade / município',rua:'Rua / logradouro',
    numero:'Número',bairro:'Bairro',complemento:'Complemento',cep:'CEP',relato:'Relato principal'
  };
  const RULES = {
    nome: [[/\bnome\s+do\s+solicitante\b/,95],[/\bsolicitante\b/,85],[/\brequerente\b/,80],[/\bnome\b/,65]],
    telefone: [[/\btelefone\b/,95],[/\bfone\b/,87],[/\bcelular\b/,85],[/\bcontato\b/,65],[/\btel\b/,75]],
    cidade: [[/\bmunicipio\b/,95],[/\bcidade\b/,90],[/\blocalidade\b/,60]],
    rua: [[/\blogradouro\b/,95],[/\bendereco\b/,80],[/\brua\b/,87],[/\bvia\b/,53]],
    numero: [[/\bnumero\b/,95],[/\bnr\b/,87],[/\bn\b/,62]],
    bairro: [[/\bbairro\b/,95],[/\bsetor\b/,75],[/\bdistrito\b/,65]],
    complemento: [[/\bcomplemento\b/,95],[/\bcompl\b/,87],[/\bapto\b/,78],[/\bapartamento\b/,80]],
    cep: [[/\bcep\b/,95],[/\bcodigo\s+postal\b/,92]],
    relato: [[/\brelato\b/,95],[/\bocorrencia\b/,92],[/\bdescricao\b/,82],[/\bnarrativa\b/,82],[/\btexto\b/,55]]
  };
  const EXCLUDE_REPORT = /\b(observacao|observacoes|historico|historicos|comentario|comentarios|pesquisa|pesquisas|busca|buscas|filtro|filtros|nota|notas|search)\b/;
  const AUTO_SCORE = 70, MIN_SCORE = 45;
  const state = {
    mapped:{}, manual:{}, selecting:null, busy:false, separator:'-', lastInsert:new WeakMap(),
    lastUndo:null, roots:[], listeners:[], observers:[], watchedFrames:new WeakSet(),
    refreshTimer:null, hidden:false, previewShown:false, crossOriginFrames:0
  };
  let host, shadow, panel, fieldBox, notice, titleStatus, previewBox, warningBox;
  let insertButton, undoButton, minimizeButton, previewButton;

  function normalized(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/[_-]/g,' ')
      .replace(/\s+/g,' ').trim().slice(0,180);
  }
  const clean = value => String(value ?? '').replace(/\s+/g,' ').trim();
  const caps = value => clean(value).toLocaleUpperCase('pt-BR');
  function capsReport(value) {
    return String(value ?? '').replace(/\r\n?/g,'\n').replace(/[\t ]+/g,' ')
      .replace(/[ ]*\n[ ]*/g,'\n').replace(/\n{3,}/g,'\n\n')
      .trim().toLocaleUpperCase('pt-BR');
  }
  function readValue(el) {
    if (!el) return '';
    if (el.tagName === 'SELECT') return el.value === '' ? '' : clean(el.selectedOptions?.[0]?.textContent || '');
    if (el.isContentEditable) return el.innerText ?? el.textContent ?? '';
    return String(el.value ?? '');
  }
  function isControl(el,key) {
    if (!el || !el.isConnected || el.disabled || el.readOnly || el.getAttribute('aria-disabled') === 'true') return false;
    if (el.closest?.('[hidden],[aria-hidden="true"]')) return false;
    if (el.tagName === 'INPUT') {
      if (['hidden','password','file','submit','button','checkbox','radio'].includes(el.type)) return false;
      return key !== 'relato' ? ['text','tel','number','search','email',''].includes(el.type) :
        el.type === 'text' && (el.maxLength > 300 || el.maxLength < 0 && (el.size > 60 || /relato|ocorrencia|descricao/.test(normalized(el.id+' '+el.name))));
    }
    if (key === 'relato') return el.tagName === 'TEXTAREA' || el.isContentEditable;
    return el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' && !el.multiple || el.isContentEditable;
  }
  function rootsAndFrames() {
    const roots = [], seen = new Set();
    let blocked = 0;
    function visit(root) {
      if (!root || seen.has(root)) return;
      seen.add(root); roots.push(root);
      let all;
      try { all = root.querySelectorAll('*'); } catch (_) { return; }
      for (const el of all) {
        if (el === host || el.closest?.('#pacific-relato190-root')) continue;
        if (el.shadowRoot) visit(el.shadowRoot);
        if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
          try {
            const doc = el.contentDocument;
            if (doc) visit(doc);
            else blocked++;
          } catch (_) { blocked++; }
        }
      }
    }
    visit(document);
    state.crossOriginFrames = blocked;
    return roots;
  }
  function signalTexts(el) {
    const out = [];
    for (const label of el.labels || []) out.push({text:normalized(label.textContent),source:'label'});
    const root = el.getRootNode();
    for (const id of (el.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean)) {
      const node = root.getElementById?.(id) || el.ownerDocument.getElementById(id);
      if (node) out.push({text:normalized(node.textContent),source:'label'});
    }
    for (const name of ['aria-label','placeholder','name','id','title','data-field','data-name']) {
      const value=el.getAttribute(name);
      if (value) out.push({text:normalized(value),source:name});
    }
    const parent = el.parentElement;
    if (parent) {
      // Evita misturar valores preenchidos, senhas e rótulos de outros controles.
      const copy = parent.cloneNode(true);
      for (const child of copy.querySelectorAll('input,textarea,select,button,script,style')) child.remove();
      const value = normalized(copy.textContent);
      if (value) out.push({text:value,source:'context'});
    }
    const td = el.closest?.('td,th');
    if (td?.previousElementSibling && !td.previousElementSibling.querySelector('input,textarea,select')) {
      out.push({text:normalized(td.previousElementSibling.textContent),source:'context'});
    }
    return out;
  }
  function scoreCandidate(key,el) {
    if (!isControl(el,key)) return 0;
    const signals = signalTexts(el);
    if (key === 'relato' && signals.some(s=>EXCLUDE_REPORT.test(s.text))) return 0;
    let best = 0;
    for (const s of signals) {
      for (const [rule, score] of RULES[key]) {
        if (!rule.test(s.text)) continue;
        const boost = s.source === 'label' ? 5 : 0;
        const penalty = s.source === 'context' ? 14 : 0;
        best = Math.max(best,Math.min(100,score + boost - penalty));
      }
    }
    return best;
  }
  function scan() {
    const roots = rootsAndFrames(), used = new Set(), next = {};
    const fields = [];
    for (const root of roots) for (const el of root.querySelectorAll('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]')) {
      if (el.closest?.('#pacific-relato190-root') || el.getRootNode() === shadow) continue;
      fields.push(el);
    }
    for (const key of KEYS) {
      const node = state.manual[key];
      if (isControl(node,key) && !used.has(node)) { next[key] = {el:node,mode:'manual',score:100};used.add(node); }
      else if (node && !node.isConnected) delete state.manual[key];
    }
    for (const key of ['relato',...KEYS.filter(k=>k!=='relato')]) {
      if (next[key]) continue;
      const matches = fields.map(el=>({el,score:scoreCandidate(key,el)}))
        .filter(item=>item.score>=MIN_SCORE && !used.has(item.el))
        .sort((a,b)=>b.score-a.score);
      const first=matches[0],second=matches[1];
      if (!first) next[key]={el:null,score:0,mode:'missing'};
      else if (second && first.score-second.score<10) next[key]={el:null,score:first.score,mode:'conflict'};
      else if(first.score<AUTO_SCORE) next[key]={el:null,score:first.score,mode:'confirm'};
      else {next[key]={el:first.el,score:first.score,mode:'auto'};used.add(first.el);}
    }
    state.mapped = next;
    state.roots = roots;
    if (panel) render();
  }
  function writeValue(el,value) {
    if (!isControl(el,'relato')) throw Error('Campo do relato indisponível ou protegido.');
    if (value.length > 25000) throw Error('Texto superior a 25 mil caracteres; revise o tamanho antes de inserir.');
    const win = el.ownerDocument.defaultView || window;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const proto = el.tagName === 'INPUT' ? win.HTMLInputElement.prototype : win.HTMLTextAreaElement.prototype;
      const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
      if (setter) setter.call(el,value); else el.value=value;
    } else if (el.isContentEditable) {
      el.textContent=value;
    } else throw Error('O relato precisa ser editável.');
    el.dispatchEvent(new win.Event('input',{bubbles:true}));
    el.dispatchEvent(new win.Event('change',{bubbles:true}));
  }
  function compose() {
    const target = state.mapped.relato?.el;
    if (!target || !isControl(target,'relato')) throw Error('Vincule primeiro o campo Relato principal.');
    const prefix = PREFIX_KEYS.map(key=>caps(readValue(state.mapped[key]?.el))).filter(Boolean).join(' '+state.separator+' ');
    const current=readValue(target);
    const last=state.lastInsert.get(target);
    let original=current;
    if (last?.combined === current) original=last.body;
    else if (last?.prefix && current.startsWith(last.prefix+last.joiner)) {
      original = current.slice((last.prefix+last.joiner).length);
    } else if(prefix && current.startsWith(prefix+' '+state.separator+' ')) {
      original = current.slice((prefix+' '+state.separator+' ').length);
    }
    const body=capsReport(original);
    const combined=[prefix,body].filter(Boolean).join(' '+state.separator+' ');
    if (!combined) throw Error('Não há dados preenchidos para copiar.');
    return {target,body,prefix,combined,raw:current,missing:KEYS.filter(key=>!state.mapped[key]?.el)};
  }
  async function copy(text) {
    if (navigator.clipboard?.writeText) {
      try {await navigator.clipboard.writeText(text);return;} catch (_) { /* fallback */ }
    }
    const element = document.createElement('textarea');
    element.value=text; element.setAttribute('readonly','');
    element.style.cssText='position:fixed;left:-99999px;top:0;opacity:0';
    document.body.appendChild(element); element.select();
    let ok=false;
    try {ok=document.execCommand('copy');} finally {element.remove();}
    if (!ok) throw Error('Área de transferência bloqueada. Permita copiar no navegador.');
  }
  function noticeText(message,error=false) {
    if (!notice) return;
    notice.textContent=message; notice.dataset.error=String(error);
  }
  function renderPreview() {
    if (!state.previewShown) {previewBox.hidden=true;previewBox.textContent='';return;}
    try { scan(); const result=compose(); previewBox.textContent=result.combined; previewBox.hidden=false;
      noticeText('Confira a prévia. Ela não é salva e não será enviada a servidores.');
    } catch (error) {previewBox.hidden=true;previewBox.textContent='';noticeText(error.message,true);}
  }
  async function action(mode) {
    if (state.busy) return;
    state.busy=true;
    try {
      scan();
      const result=compose();
      if (mode === 'insert') {
        if (result.combined !== result.raw) {
          // Guarda somente em memória; não sobrescreve mudanças posteriores do operador.
          writeValue(result.target,result.combined);
          state.lastUndo={target:result.target,previous:result.raw,written:result.combined};
        }
        state.lastInsert.set(result.target,{
          combined:result.combined,body:result.body,prefix:result.prefix,joiner:' '+state.separator+' '
        });
      }
      try {
        await copy(result.combined);
        noticeText(mode==='insert'?'Relato inserido e copiado. Revise antes de salvar no sistema.':'Texto copiado. O formulário não foi alterado.');
      } catch (error) {
        noticeText((mode==='insert'?'Relato inserido; ':'Nenhum campo alterado; ')+error.message,true);
      }
    } catch (error) {noticeText(error.message,true);}
    finally {state.busy=false;render();}
  }
  function undo() {
    const last=state.lastUndo;
    if (!last) return noticeText('Não há alteração deste painel para desfazer.',true);
    if (!last.target.isConnected || readValue(last.target)!==last.written) {
      state.lastUndo=null; return noticeText('O relato mudou depois da inserção. Desfazer bloqueado para proteger suas alterações.',true);
    }
    try {
      writeValue(last.target,last.previous);
      state.lastInsert.delete(last.target);state.lastUndo=null;
      noticeText('Última inserção desfeita. Conteúdo anterior restaurado.');
    } catch (error) {noticeText(error.message,true);}
    render();
  }
  function toCaps() {
    try {
      scan();const target=state.mapped.relato?.el;
      if (!target) throw Error('Vincule o campo Relato principal.');
      const previous=readValue(target),written=capsReport(previous);
      if (previous===written) return noticeText('Relato já está em letras maiúsculas.');
      writeValue(target,written);
      state.lastUndo={target,previous,written};
      state.lastInsert.delete(target);
      noticeText('Relato convertido para maiúsculas. Confira o resultado.');
      render();
    } catch(error) {noticeText(error.message,true);}
  }
  function render() {
    if (!fieldBox) return;
    fieldBox.replaceChildren();
    let ready=0;
    for (const key of KEYS) {
      const hit=state.mapped[key] || {mode:'missing'};
      const line=document.createElement('div');line.className='field';
      const label=document.createElement('span');label.textContent=LABEL[key];
      const status=document.createElement('span');status.className='state';status.dataset.mode=hit.mode;
      status.textContent={auto:'Auto ✓',manual:'Manual ✓',missing:'Ausente',confirm:'Revisar',conflict:'Conflito'}[hit.mode]||'Ausente';
      if(hit.el)ready++;
      const bind=document.createElement('button');bind.type='button';bind.textContent='Vincular';
      bind.title='Clique e selecione o campo correspondente no formulário';
      bind.addEventListener('click',()=>startSelection(key));
      line.append(label,status,bind);fieldBox.append(line);
    }
    titleStatus.textContent=`${ready}/${KEYS.length} campos encontrados · v${VERSION}`;
    insertButton.disabled=state.busy||!state.mapped.relato?.el;
    undoButton.disabled=!state.lastUndo;
    warningBox.textContent=state.crossOriginFrames ?
      `Atenção: ${state.crossOriginFrames} iframe(s) de outra origem ou indisponíveis. Configure a permissão do endereço correto; esta versão não acessa páginas externas automaticamente.` :
      (ready<KEYS.length?'Revise os campos ausentes ou ambíguos antes de inserir.':'Confira as informações antes de inserir no sistema.');
  }
  function cancelSelection() {
    state.selecting=null;
    const banner=shadow?.getElementById('selection');
    if (banner) banner.hidden=true;
  }
  function startSelection(key) {
    state.selecting=key;
    const banner=shadow.getElementById('selection');
    banner.textContent=`Seleção manual: clique no campo «${LABEL[key]}» do formulário. ESC cancela.`;
    banner.hidden=false;
    noticeText('Aguardando seleção manual de '+LABEL[key]+'.');
  }
  function handleSelection(event) {
    if (!state.selecting) return;
    if (event.target?.closest?.('#pacific-relato190-root')) return;
    const path=event.composedPath?.()||[event.target];
    const node=path.find(x=>x?.matches?.('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]'));
    if(!node||!isControl(node,state.selecting))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const key=state.selecting;
    for (const [name,el] of Object.entries(state.manual)) if(el===node && name!==key) delete state.manual[name];
    state.manual[key]=node;
    cancelSelection();scan();noticeText('Campo «'+LABEL[key]+'» vinculado manualmente.');
  }
  function listenAndObserve() {
    const roots=rootsAndFrames();
    for(const [root,handler] of state.listeners)root.removeEventListener('click',handler,true);
    for(const observer of state.observers) observer.disconnect();
    state.listeners=[];state.observers=[];
    for(const root of roots) {
      root.addEventListener('click',handleSelection,true);
      state.listeners.push([root,handleSelection]);
      const observer=new MutationObserver(records=>{
        if (records.some(record=>record.type==='childList'||record.type==='attributes')) scheduleRefresh();
      });
      try {observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['id','name','placeholder','aria-label','aria-labelledby','disabled','readonly','hidden']});state.observers.push(observer);}catch(_){observer.disconnect();}
      for(const frame of root.querySelectorAll('iframe,frame')) {
        if(state.watchedFrames.has(frame))continue;
        state.watchedFrames.add(frame);
        frame.addEventListener('load',scheduleRefresh);
      }
    }
  }
  function scheduleRefresh() {
    if(state.refreshTimer)clearTimeout(state.refreshTimer);
    state.refreshTimer=setTimeout(()=>{state.refreshTimer=null;listenAndObserve();scan();},420);
  }
  function createPanel() {
    if (!document.body || document.getElementById('pacific-relato190-root')) return;
    host=document.createElement('div');host.id='pacific-relato190-root';
    shadow=host.attachShadow({mode:'open'});
    const css=document.createElement('style');css.textContent=`
      :host{all:initial;font:12px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;color:#eaf3fb}
      *{box-sizing:border-box}
      .box{position:fixed;z-index:2147483646;right:14px;top:14px;width:390px;max-width:calc(100vw - 20px);max-height:calc(100dvh - 20px);overflow:auto;background:#0d2033;border:1px solid #28516b;box-shadow:0 14px 38px #0007;border-radius:14px;color:#edf5fe}
      .head{display:flex;align-items:center;justify-content:space-between;padding:13px;background:linear-gradient(120deg,#153d4c,#10253b);cursor:move;user-select:none;touch-action:none}
      .head strong{font-size:15px}.head small{display:block;color:#b8d1de;font-size:11px;margin-top:3px}
      .head button{font-weight:750;padding:5px 10px}
      main{padding:12px}.field{display:grid;grid-template-columns:minmax(0,1fr) auto 65px;gap:7px;align-items:center;padding:6px 0;border-bottom:1px solid #223a51}
      .state{font-size:10px;color:#e6b56d}.state[data-mode=auto],.state[data-mode=manual]{color:#61e0b9}
      button{border-radius:7px;border:1px solid #416985;background:#20425b;color:#e8f6ff;padding:8px 9px;font:inherit;font-weight:650;cursor:pointer}
      button:focus-visible{outline:2px solid #70dfd2;outline-offset:2px}
      button.primary{background:#12ad95;border-color:#12ad95;color:#052126}
      button:disabled{opacity:.5;cursor:default}.buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0}
      .full{width:100%;margin-top:5px}
      #preview{white-space:pre-wrap;overflow:auto;max-height:190px;word-break:break-word;background:#061525;border:1px solid #325a70;border-radius:9px;padding:10px;margin:10px 0;font-size:11px}
      #notice{border-radius:8px;padding:8px 10px;background:#143749;margin-top:10px;color:#a9f5e0}
      #notice[data-error=true]{background:#47232b;color:#ffd0c8}
      #warning{margin:9px 0;color:#d6bfa3;font-size:11px}
      #selection{border-radius:8px;border:1px solid #e6b668;background:#493c22;color:#fff3d4;margin-bottom:9px;padding:10px}
      .foot{color:#90b0c6;margin-top:10px;font-size:10px}.collapsed main{display:none}.collapsed .head{cursor:default}
      [hidden]{display:none!important}
      @media(max-width:480px){.box{right:6px;top:6px;max-width:calc(100vw - 12px)}.head{padding:10px}}
    `;
    shadow.append(css);
    panel=document.createElement('section');panel.className='box';
    panel.innerHTML=`<div class="head" id="drag"><div><strong>Relato 190 · Local</strong><small id="state">Detectando campos...</small></div><button id="minimize" type="button" aria-label="Minimizar painel">−</button></div>
      <main><div id="selection" hidden></div><div id="fields"></div>
      <div class="buttons"><button id="refresh" type="button">↻ Reconhecer</button><button id="separator" type="button">Separador: −</button></div>
      <div class="buttons"><button id="previewBtn" type="button">Ver prévia</button><button id="copy" type="button">Copiar sem alterar</button></div>
      <button id="insert" class="primary full" type="button">Inserir no relato + copiar</button>
      <div class="buttons"><button id="caps" type="button">CAPS no relato</button><button id="undo" type="button">↶ Desfazer</button></div>
      <div id="preview" hidden aria-live="polite"></div><div id="notice" role="status" aria-live="polite">Nenhum conteúdo é enviado ou salvo pelo script.</div>
      <p id="warning"></p><p class="foot">Testes autorizados · ações somente por clique · sem análise jurídica, rede ou despacho · CEP não entra no texto composto</p></main>`;
    shadow.append(panel);document.body.append(host);
    fieldBox=shadow.getElementById('fields');titleStatus=shadow.getElementById('state');
    notice=shadow.getElementById('notice');previewBox=shadow.getElementById('preview');warningBox=shadow.getElementById('warning');
    insertButton=shadow.getElementById('insert');undoButton=shadow.getElementById('undo');
    minimizeButton=shadow.getElementById('minimize');previewButton=shadow.getElementById('previewBtn');
    shadow.getElementById('refresh').addEventListener('click',()=>{listenAndObserve();scan();noticeText('Reconhecimento atualizado.');});
    shadow.getElementById('separator').addEventListener('click',e=>{
      state.separator=state.separator==='-'?'|':'-';e.target.textContent='Separador: '+state.separator;
      if(state.previewShown)renderPreview();
    });
    previewButton.addEventListener('click',()=>{
      state.previewShown=!state.previewShown;previewButton.textContent=state.previewShown?'Ocultar prévia':'Ver prévia';renderPreview();
    });
    shadow.getElementById('copy').addEventListener('click',()=>{void action('copy');});
    insertButton.addEventListener('click',()=>{void action('insert');});
    shadow.getElementById('caps').addEventListener('click',toCaps);
    undoButton.addEventListener('click',undo);
    minimizeButton.addEventListener('click',()=>{
      state.hidden=!state.hidden;panel.classList.toggle('collapsed',state.hidden);
      minimizeButton.textContent=state.hidden?'+':'−';
      minimizeButton.setAttribute('aria-label',state.hidden?'Expandir painel':'Minimizar painel');
      if(state.hidden){state.previewShown=false;previewBox.textContent='';previewBox.hidden=true;previewButton.textContent='Ver prévia';}
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.selecting){cancelSelection();noticeText('Seleção manual cancelada.');}},true);
    const drag=shadow.getElementById('drag');let pointer=null;
    drag.addEventListener('pointerdown',e=>{
      if(e.target.closest('button')||e.button!==0)return;
      const rect=panel.getBoundingClientRect();pointer={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};
      try{drag.setPointerCapture(e.pointerId);}catch(_){}
    });
    drag.addEventListener('pointermove',e=>{
      if(!pointer)return;
      const left=Math.max(0,Math.min(window.innerWidth-panel.offsetWidth,pointer.left+e.clientX-pointer.x));
      const top=Math.max(0,Math.min(window.innerHeight-40,pointer.top+e.clientY-pointer.y));
      panel.style.left=left+'px';panel.style.top=top+'px';panel.style.right='auto';
    });
    drag.addEventListener('pointerup',()=>{pointer=null;});drag.addEventListener('pointercancel',()=>{pointer=null;});
    listenAndObserve();scan();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createPanel,{once:true});
  else createPanel();
})();
