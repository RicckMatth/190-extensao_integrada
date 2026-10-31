'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'scripts/relato190-pacific-monkey.user.js'),'utf8');
const instrumented=source.replace("  if(document.readyState==='loading')","  globalThis.__R190_TEST__={state,scan,compose,action,undo,toCaps};\n  if(document.readyState==='loading')");
function setup(){
  let inputs=[],clip='';
  const doc={readyState:'loading',addEventListener(){},getElementById(){return null},querySelectorAll(){return inputs}};
  const win={HTMLTextAreaElement:function(){},HTMLInputElement:function(){},Event:class{constructor(type){this.type=type}}};
  doc.defaultView=win;
  const scope={document:doc,window:win,navigator:{clipboard:{writeText:async s=>{clip=s}}},setTimeout,clearTimeout,MutationObserver:class{},console};
  scope.globalThis=scope;vm.runInNewContext(instrumented,scope);
  const field=(name,tag='INPUT',value='')=>({tagName:tag,type:tag==='INPUT'?'text':undefined,value,isConnected:true,
    disabled:false,readOnly:false,isContentEditable:false,maxLength:-1,size:100,labels:[{textContent:name}],
    ownerDocument:doc,getRootNode(){return doc},getAttribute(){return null},closest(){return null},
    parentElement:null,dispatchEvent(){}});
  const names=['Nome do solicitante','Telefone','Município','Logradouro','Número','Bairro','Complemento','CEP','Relato da ocorrência'];
  const values=['Pessoa Fictícia','(00) 00000-0000','Curitiba','Rua Exemplo','123','Centro','Bloco A','00000-000','Relato fictício.\nOutra linha.'];
  const fields=names.map((s,i)=>field(s,i===8?'TEXTAREA':'INPUT',values[i]));
  inputs=[...fields,field('Observações internas','TEXTAREA','Ignorar')];
  scope.__R190_TEST__.scan();
  return {core:scope.__R190_TEST__,fields,field,setInputs:next=>inputs=next,clipboard:()=>clip};
}
test('arquivo compatível com importação do Pacific Monkey',()=>{
  assert.match(source,/\/\/ ==UserScript==/);
  assert.match(source,/\/\/ @match\s+http:\/\/localhost\/\*/);
  assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\s*\(/);
  assert.ok(source.length<100000);
});
test('9 campos localizados sem confundir observações',()=>{
  const {core}=setup();
  assert.equal(Object.keys(core.state.mapped).length,9);
  for(const hit of Object.values(core.state.mapped))assert.ok(hit.el);
  assert.equal(core.state.mapped.relato.el.labels[0].textContent,'Relato da ocorrência');
});
test('prévia em maiúsculas, com quebra de linha e sem CEP',()=>{
  const {core,fields}=setup(),original=fields[8].value;
  const s=core.compose().combined;
  assert.ok(s.startsWith('PESSOA FICTÍCIA'));
  assert.ok(s.includes('RELATO FICTÍCIO.\nOUTRA LINHA.'));
  assert.ok(!s.includes('00000-000 -'));
  assert.equal(fields[8].value,original);
});
test('cópia não altera campo',async()=>{
  const {core,fields,clipboard}=setup(),original=fields[8].value;
  await core.action('copy');assert.equal(fields[8].value,original);
  assert.ok(clipboard().includes('PESSOA FICTÍCIA'));
});
test('inserção é idempotente e desfaz o valor anterior',async()=>{
  const {core,fields}=setup(),original=fields[8].value;
  await core.action('insert');const first=fields[8].value;
  await core.action('insert');assert.equal(fields[8].value,first);
  core.undo();assert.equal(fields[8].value,original);
});
test('desfazer nunca apaga edição posterior do operador',async()=>{
  const {core,fields}=setup();await core.action('insert');
  fields[8].value+=' CORREÇÃO';core.undo();
  assert.ok(fields[8].value.endsWith(' CORREÇÃO'));
});
test('CAPS e vinculação manual em caso de conflito',()=>{
  const e=setup(),duplicado=e.field('Nome do solicitante','INPUT','Nome errado');
  e.setInputs([...e.fields,duplicado]);e.core.scan();
  assert.equal(e.core.state.mapped.nome.mode,'conflict');
  e.core.state.manual.nome=e.fields[0];e.core.scan();
  assert.equal(e.core.state.mapped.nome.mode,'manual');
  e.core.toCaps();assert.equal(e.fields[8].value,'RELATO FICTÍCIO.\nOUTRA LINHA.');
  e.core.undo();assert.equal(e.fields[8].value,'Relato fictício.\nOutra linha.');
});
