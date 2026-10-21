/* Integridade v5.14.0 — extensão é SOMENTE uma ponte para a Base 190. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const m=JSON.parse(read('manifest.json')),worker=read('kb190-bg.js'),bridge=read('kb190-bridge.js'),
  relay=read('kb190-relay.js'),bg=read('background.js'),adapter=read('sade-adapter.js'),opt=read('kb190-options.js');
let count=0;function check(name,fn){fn();count++;console.log('✓ '+name);}
check('Manifest MV3, versão 5.14.0',()=>{
  assert.equal(m.manifest_version,3);assert.equal(m.version,'5.14.0');
});
check('SADE injeta automaticamente sem clique no ícone',()=>{
  const rule=m.content_scripts.find(c=>c.js.includes('kb190-relay.js'));
  assert.ok(rule);assert.ok(rule.js.includes('sade-adapter.js'));
  assert.ok(rule.matches.includes('*://*/syspm-web/public/*'));
  assert.ok(rule.matches.some(x=>x.includes('localhost')));
  assert.equal(rule.all_frames,true);
});
check('A Base 190 permanece vinculada ao domínio HTTPS exato',()=>{
  assert.ok(m.host_permissions.includes('https://base-conhecimento-190.vercel.app/*'));
  assert.ok(m.content_scripts.some(c=>c.js.includes('kb190-bridge.js')));
});
check('Nenhuma interface de resultado da Base na extensão',()=>{
  assert.ok(!bg.includes("'kb190-ui.js'"));
  assert.ok(!m.content_scripts.some(c=>c.js.includes('kb190-ui.js')));
  assert.ok(!relay.includes('document.createElement'));
  assert.ok(!relay.includes('KB190_SITE_RESULT_TO_UI'));
});
check('Autorização controlada apenas pelas opções do Chrome',()=>{
  assert.ok(worker.includes("m.type==='KB190_SET_AUTO'&&!extSender"));
  assert.ok(worker.includes('chrome.storage.local.set'));
  assert.ok(worker.includes('if(!await isEnabled())'));
  assert.ok(opt.includes("type:'KB190_SET_AUTO'"));
});
check('Análise automática com estabilização e antirrepetição',()=>{
  assert.ok(relay.includes('STABLE_MS=1150'));
  assert.ok(relay.includes('MIN_INTERVAL_MS=2400'));
  assert.ok(relay.includes('text===sent'));
  assert.ok(relay.includes('processing=true'));
  assert.ok(relay.includes('textOf(el)!==text'));
});
check('Resultado só publicado após confirmação de texto atual',()=>{
  assert.ok(relay.includes("KB190_PUBLISH_LIVE"));
  assert.ok(worker.includes('entry.requestId!==requestId'));
  assert.ok(worker.includes('String(user.id)!==entry.userId'));
  assert.ok(worker.includes('if(!await isEnabled())'));
});
check('Somente o site recebe resultados: sem divulgação ao SADE',()=>{
  assert.ok(worker.includes("type:'KB190_RESULT'"));
  assert.ok(!worker.includes('KB190_SITE_RESULT_TO_UI'));
  assert.ok(!bridge.includes('base190:site-analysis'));
  assert.ok(bridge.includes('base190:extension-result'));
});
check('Não coleta cookies ou senha',()=>{
  assert.ok(!/chrome\.cookies|document\.cookie/i.test(worker+bridge+relay));
  assert.ok(bridge.includes("credentials:'same-origin'"));
});
check('Adapter original mantém reconhecimento dos nove campos',()=>{
  for(const key of ['nome','telefone','cidade','rua','numero','bairro','complemento','relato','cep'])
    assert.ok(adapter.includes(key+': ['),'Campo: '+key);
});
check('Arquivos originais da extensão preservados',()=>{
  for(const f of ['icons/icon-16.png','icons/icon-48.png','icons/icon-128.png',
    'content.js','bindings.js','sade-adapter.js','relato-tools.js'])assert.ok(fs.existsSync(path.join(__dirname,f)));
});
console.log(count+' verificações de ponte silenciosa concluídas.');
