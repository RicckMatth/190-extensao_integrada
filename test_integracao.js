/* Verificações estáticas de integridade — Modelo TESTE Relato 190 + Base 190 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const config=JSON.parse(read('manifest.json')),bg=read('background.js'),
  srv=read('kb190-bg.js'),bridge=read('kb190-bridge.js'),ui=read('kb190-ui.js'),
  opts=read('kb190-options.js'),adapter=read('sade-adapter.js');
const check=(name,fn)=>{fn();console.log('✓ '+name);};
check('Manifest V3 and test version',()=>{
  assert.equal(config.manifest_version,3);assert.equal(config.version,'5.11.0');
  assert.match(config.name,/TESTE/);assert.equal(config.options_page,'kb190-options.html');
});
check('Preserves Chrome icons and original modules',()=>{
  for(const name of ['icons/icon-16.png','icons/icon-48.png','icons/icon-128.png',
     'bindings.js','content.js','relato-tools.js','relato-ia-bg.js','sade-adapter.js'])assert.ok(fs.existsSync(path.join(__dirname,name)),name);
});
check('Registers integration in worker and injected toolbar',()=>{
  assert.ok(bg.includes("'kb190-bg.js'"));assert.ok(bg.includes("'kb190-ui.js'"));
  assert.ok(bg.includes("'sade-adapter.js'"));assert.ok(bg.includes("'relato-tools.js'"));
});
check('Automatic fixed-domain bridge without manual URL configuration',()=>{
  const origin='https://base-conhecimento-190.vercel.app/*';
  assert.ok(config.host_permissions.includes(origin),'Fixed Base 190 host permission');
  assert.ok(config.content_scripts.some(s=>s.matches.includes(origin)&&s.js.includes('kb190-bridge.js')));
  assert.ok(!('optional_host_permissions' in config));
  assert.ok(srv.includes('https://base-conhecimento-190.vercel.app'));
});
check('Bidirectional result sync without session persistence',()=>{
  assert.ok(srv.includes("type:'KB190_RESULT'"));
  assert.ok(srv.includes("type:'KB190_SITE_RESULT_TO_UI'"));
  assert.ok(srv.includes("m?.type==='KB190_SITE_RESULT'"));
  assert.ok(srv.includes('sadePage(tab.url)'));
  assert.ok(bridge.includes('base190:extension-result'));
  assert.ok(bridge.includes('base190:site-analysis'));
  assert.ok(ui.includes('kb190TabResult'));
  assert.ok(ui.includes('kb190OpenLast'));
  assert.ok(!srv.includes('storage.session.set('));
});
check('Bridge exposes only session and analysis',()=>{
  assert.ok(bridge.includes("['session','analyze']"));assert.ok(bridge.includes("credentials:'same-origin'"));
  assert.ok(!/\/api\/admin/i.test(bridge));assert.ok(!/chrome\.cookies/i.test(bridge));
});
check('Background requires operator confirmation and host permission',()=>{
  assert.ok(srv.includes("m.confirmed!==true"));
  assert.ok(srv.includes('chrome.permissions.contains'));
  assert.ok(srv.includes("new URL(t.url).origin===origin"));
});
check('Fixed URL needs no manual authorization',()=>{
  assert.ok(opts.includes('https://base-conhecimento-190.vercel.app'));
  assert.ok(opts.includes("type:'KB190_OPEN_BASE'"));
  assert.ok(!opts.includes('chrome.permissions.request'));
  assert.ok(!opts.includes('registerContentScripts'));
});
check('No automatic sending of relatos from DOM',()=>{
  assert.ok(ui.includes('KB190_ANALYZE'));assert.ok(ui.includes('window.confirm'));
  assert.ok(ui.includes("read(target)!==previous"));
});
check('Existing SADE field recognition retained',()=>{
  for(const field of ['nome','telefone','cidade','rua','numero','bairro','complemento','relato','cep'])
    assert.ok(adapter.includes(field+': ['),'SADE signal missing: '+field);
});
console.log('Modelo TESTE com sincronização automática: 10 verificações estáticas concluídas.');