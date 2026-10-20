/* Verificações estáticas de integridade — Modelo TESTE Relato 190 + Base 190 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const config=JSON.parse(read('manifest.json')),bg=read('background.js'),
  srv=read('kb190-bg.js'),bridge=read('kb190-bridge.js'),ui=read('kb190-ui.js'),
  opts=read('kb190-options.js'),adapter=read('sade-adapter.js');
const check=(name,fn)=>{fn();console.log('✓ '+name);};
check('Manifest V3 and test version',()=>{
  assert.equal(config.manifest_version,3);assert.equal(config.version,'5.10.0');
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
check('Bridge exposes only session and analysis',()=>{
  assert.ok(bridge.includes("['session','analyze']"));assert.ok(bridge.includes("credentials:'same-origin'"));
  assert.ok(!/\/api\/admin/i.test(bridge));assert.ok(!/chrome\.cookies/i.test(bridge));
});
check('Background requires operator confirmation and host permission',()=>{
  assert.ok(srv.includes("m.confirmed!==true"));
  assert.ok(srv.includes('chrome.permissions.contains'));
  assert.ok(srv.includes("new URL(t.url).origin===origin"));
});
check('Origin is authorized through user gesture',()=>{
  assert.ok(opts.includes('chrome.permissions.request'));assert.ok(opts.includes('chrome.scripting.registerContentScripts'));
  assert.ok(opts.includes("url.protocol!=='https:'"));
});
check('No automatic sending of relatos from DOM',()=>{
  assert.ok(ui.includes('KB190_ANALYZE'));assert.ok(ui.includes('window.confirm'));
  assert.ok(ui.includes("read(target)!==previous"));
});
check('Existing SADE field recognition retained',()=>{
  for(const field of ['nome','telefone','cidade','rua','numero','bairro','complemento','relato','cep'])
    assert.ok(adapter.includes(field+': ['),'SADE signal missing: '+field);
});
console.log('Modelo TESTE integrado: 8 verificações estáticas concluídas.');