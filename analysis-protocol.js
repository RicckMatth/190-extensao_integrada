/* CIJ/Relato 190 protocol v1. Shared byte-for-byte with the extension. */
(()=>{'use strict';
 const TYPES=['classificacao','faq','indefinido','ia'];
 const PHASES=['received','local','gemini','completed','error','cancelled','superseded'];
 const LIMITS=Object.freeze({resultBytes:180000,wireBytes:240000,text:8000,apiMs:45000,requestMs:50000,sessionMs:10000});
 const labels={received:'Relato recebido',local:'Consultando base local',gemini:'Complementando com Gemini',completed:'Análise concluída',error:'Falha de conexão',cancelled:'Solicitação cancelada',superseded:'Solicitação substituída'};
 const id=value=>typeof value==='string'&&/^[a-zA-Z0-9:-]{1,100}$/.test(value);
 function validateResult(value){
  if(!value||Object.getPrototypeOf(value)!==Object.prototype||!TYPES.includes(value.tipo))throw Error('RESULT_INVALID');
  const bytes=new TextEncoder().encode(JSON.stringify(value)).length;if(bytes>LIMITS.resultBytes)throw Error('RESULT_TOO_LARGE');
  function safe(x,depth=0){if(depth>14)throw Error('RESULT_DEPTH');if(x===null||typeof x==='boolean')return;
   if(typeof x==='number'){if(!Number.isFinite(x))throw Error('RESULT_NUMBER');return;}
   if(typeof x==='string'){if(x.length>24000)throw Error('RESULT_STRING');return;}
   if(Array.isArray(x)){if(x.length>150)throw Error('RESULT_ARRAY');x.forEach(v=>safe(v,depth+1));return;}
   if(typeof x!=='object'||Object.getPrototypeOf(x)!==Object.prototype)throw Error('RESULT_OBJECT');
   const keys=Object.keys(x);if(keys.length>100)throw Error('RESULT_KEYS');for(const k of keys){if(['__proto__','prototype','constructor'].includes(k))throw Error('RESULT_KEY');safe(x[k],depth+1);}}
  safe(value);
  const fields=new Set(['tipo','titulo','resposta','source','provider','model','references','analysisQuestions','feedbackTicket','feedbackNature','legalCitations','termoOriginal','ehPergunta','principal','confianca','indiceHeuristico','termosDetectados','secundarias','contexto','relatoRevisado','triage','mensagem']);
  if(Object.keys(value).some(k=>!fields.has(k)))throw Error('RESULT_FIELD');
  for(const key of ['titulo','source','provider','model','termoOriginal','relatoRevisado','mensagem'])if(value[key]!==undefined&&typeof value[key]!=='string')throw Error('RESULT_FIELD_TYPE');
  for(const key of ['references','legalCitations','secundarias'])if(value[key]!==undefined&&!Array.isArray(value[key]))throw Error('RESULT_FIELD_TYPE');
  if(['ia','faq'].includes(value.tipo)&&(!(typeof value.resposta==='string')||!value.resposta.trim()))throw Error('RESULT_ANSWER');
  if(value.tipo==='classificacao'&&(!value.principal||typeof value.principal.officialNature!=='string'))throw Error('RESULT_NATURE');
  if(value.tipo==='indefinido'&&typeof value.mensagem!=='string')throw Error('RESULT_MESSAGE');
  if(value.feedbackTicket!==undefined&&(typeof value.feedbackTicket!=='string'||value.feedbackTicket.length>2500))throw Error('RESULT_FEEDBACK');
  if(value.analysisQuestions!==undefined&&(!Array.isArray(value.analysisQuestions)||value.analysisQuestions.length>6||value.analysisQuestions.some(q=>!q||typeof q.topic!=='string'||typeof q.question!=='string'||q.question.length>600)))throw Error('RESULT_QUESTIONS');
  return JSON.parse(JSON.stringify(value));
 }
 function envelope(value,expected){if(!value||!id(value.requestId)||expected&&value.requestId!==expected)throw Error('REQUEST_MISMATCH');return {...value,result:validateResult(value.result)};}
 async function readResponse(response,requestId,onPhase=()=>{}){
  if(!response.ok){const e=Error(response.status===401?'Sessão ausente ou expirada.':response.status===403?'Sessão ou autorização bloqueada.':'Falha na análise (HTTP '+response.status+').');e.status=response.status;throw e;}
  let bytes=0,buffer='',answer=null;const decoder=new TextDecoder();
  const streaming=(response.headers.get('content-type')||'').includes('application/x-ndjson');
  function accept(line){if(!line.trim())return;const item=JSON.parse(line);if(item.requestId!==requestId)throw Error('REQUEST_MISMATCH');if(item.type==='status'&&PHASES.includes(item.phase))onPhase(item.phase);else if(item.type==='result'){if(answer)throw Error('RESULT_DUPLICATE');answer=envelope(item,requestId);}else if(item.type==='error'){const e=Error(String(item.error||'Falha na análise.').slice(0,600));e.status=item.status;throw e;}else throw Error('PROTOCOL_INVALID');}
  const reader=response.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>LIMITS.wireBytes)throw Error('RESPONSE_TOO_LARGE');buffer+=decoder.decode(value,{stream:true});if(streaming){let at;while((at=buffer.indexOf('\n'))>=0){accept(buffer.slice(0,at));buffer=buffer.slice(at+1);}}}buffer+=decoder.decode();if(streaming){accept(buffer);if(!answer)throw Error('RESULT_MISSING');return answer;}const data=JSON.parse(buffer);if(data.requestId===undefined)data.requestId=requestId;return envelope(data,requestId);}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 function createLatestRunner({fetcher=globalThis.fetch,timeoutMs=LIMITS.requestMs}={}){
  let active=null;
  function cancel(reason='cancelled',notify=true){if(active){const old=active;active=null;if(notify)old.phase(reason);old.controller.abort();}}
  async function run(path,payload,phase=()=>{}){
   cancel('superseded');const token={requestId:crypto.randomUUID(),controller:new AbortController(),phase};active=token;phase('received');
   let timedOut=false;const timer=setTimeout(()=>{timedOut=true;token.controller.abort();},timeoutMs);
   try{const r=await fetcher(path,{method:'POST',credentials:'same-origin',cache:'no-store',signal:token.controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:token.requestId,progress:true})});const data=await readResponse(r,token.requestId,p=>{if(active===token)phase(p);});if(active!==token)throw Error('REQUEST_SUPERSEDED');phase('completed');return data;}
   catch(e){if(active!==token){const stale=Error('REQUEST_SUPERSEDED');stale.cancelled=true;throw stale;}phase('error');if(timedOut)throw Error('Tempo de análise esgotado. Tente novamente.');throw e;}
   finally{clearTimeout(timer);if(active===token)active=null;}
  }
  return {run,cancel};
 }
 globalThis.CIJAnalysisProtocol=Object.freeze({version:1,TYPES,PHASES,LIMITS,labels,id,validateResult,envelope,readResponse,createLatestRunner});
})();
