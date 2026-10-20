/* Testes de integridade v5.13.0 — controle de autorização na extensão. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const cfg=JSON.parse(read('manifest.json')),bg=read('background.js'),
  worker=read('kb190-bg.js'),bridge=read('kb190-bridge.js'),ui=read('kb190-ui.js'),
  opts=read('kb190-options.js'),adapter=read('sade-adapter.js'),
  siteURL='https://base-conhecimento-190.vercel.app/*';
let total=0;
const check=(name,fn)=>{fn();total++;console.log('✓ '+name);};
check('Manifest V3 integrado versão 5.13.0',()=>{
  assert.equal(cfg.manifest_version,3);assert.equal(cfg.version,'5.13.0');assert.match(cfg.name,/TESTE/);
});
check('Código SADE e ícones preservados',()=>{
  for(const x of ['icons/icon-16.png','icons/icon-48.png','icons/icon-128.png',
    'bindings.js','content.js','relato-tools.js','relato-ia-bg.js','sade-adapter.js'])
    assert.ok(fs.existsSync(path.join(__dirname,x)),x);
});
check('Domínio fixo HTTPS e content-script autenticado',()=>{
  assert.ok(cfg.host_permissions.includes(siteURL));
  assert.ok(cfg.content_scripts.some(s=>s.matches.includes(siteURL)&&s.js.includes('kb190-bridge.js')));
  assert.ok(bridge.includes("credentials:'same-origin'"));
  assert.ok(!/chrome\.cookies/i.test(bridge));
});
check('Background da extensão inclui ponte e IU',()=>{
  assert.ok(bg.includes("'kb190-bg.js'"));assert.ok(bg.includes("'kb190-ui.js'"));
  assert.ok(bg.includes("'sade-adapter.js'"));
});
check('Somente as opções podem alterar autorização',()=>{
  assert.ok(worker.includes("m.type==='KB190_SET_AUTO'&&!extSender"));
  assert.ok(opts.includes("type:'KB190_SET_AUTO'"));
  assert.ok(opts.includes("chrome.storage.onChanged"));
  assert.ok(worker.includes("chrome.storage.local.set"));
});
check('Autorização local desativada por padrão',()=>{
  assert.ok(worker.includes("kb190.autoEnabled.v3"));
  assert.ok(worker.includes("===true"));
  assert.ok(worker.includes("if(!await enabled())throw"));
  assert.ok(!bridge.includes('sessionStorage'));
  assert.ok(!worker.includes('remoteConsent'));
});
check('Ponte rejeita POST se desativada',()=>{
  assert.ok(bridge.includes("if(m.operation==='analyze'&&!await enabled())"));
  assert.ok(bridge.includes("if(!await enabled())return"));
  assert.ok(bridge.includes("'/api/analyze','POST'"));
});
check('Site pode abrir opções sem alterar estado',()=>{
  assert.ok(bridge.includes('base190:open-settings'));
  assert.ok(worker.includes("m.type==='KB190_OPEN_OPTIONS'"));
  assert.ok(worker.includes('baseOpener'));
});
check('SADE: envio somente após estabilidade do relato',()=>{
  assert.ok(ui.includes("KB190_AUTO_ANALYZE"));
  assert.ok(ui.includes("Date.now()-observedSince<3500"));
  assert.ok(ui.includes("text.length<20"));
  assert.ok(ui.includes("if(!await refreshAuthorization())return"));
});
check('Confirmação ainda obrigatória para aplicar texto no SADE',()=>{
  assert.ok(ui.includes("read(target)!==previous"));
  assert.ok(ui.includes('window.confirm'));
  assert.ok(ui.includes('kb190TabResult'));
  assert.ok(ui.includes('kb190OpenLast'));
});
check('Nove campos SADE originais intactos',()=>{
  for(const f of ['nome','telefone','cidade','rua','numero','bairro','complemento','relato','cep'])
    assert.ok(adapter.includes(f+': ['),'Campo ausente: '+f);
});
console.log(total+' verificações estáticas aprovadas.');
