# Projeto 02 — comunicação Gemini, aplicação e extensão

## Auditoria e causa-raiz
Branches principais examinadas: aplicação `main` em 0958ed1a422b310af493bdb45982612903bf75ce; extensão `main` em 0a231feb0fe261c3bd70c54bdab16f3d3ed111db. Esta correção parte dessas versões e não inclui a biblioteca jurídica do Projeto 01.

Confirmados: página aceitava `ia`, mas kb190-bridge.js aceitava apenas classificacao/faq/indefinido; ponte limitava fetch a 12 segundos, enquanto Gemini admitia 22. A ponte confirmava KB190_RESULT mesmo descartando seu conteúdo. IDs eram gerados após processamento, sem correlação até a API. A página não possuía descarte de respostas manuais antigas e o relay parava de observar alterações enquanto aguardava.

## Contrato v1
`public/analysis-protocol.js` na aplicação é idêntico a `analysis-protocol.js` na extensão. Não depende de bibliotecas; o wrapper `lib/analysis-protocol.js` o importa no servidor/React. Tipos: classificacao, faq, indefinido, ia. Há validação da estrutura requerida por tipo, campos superiores conhecidos, tipos de metadados, perguntas, ticket, profundidade, listas e tamanho UTF-8 (resultado 180 KB; transporte 240 KB). Objetos fora do contrato são rejeitados. Natureza, fontes, fundamentação, perguntas, triagem e ticket são preservados quando presentes. Os metadados opcionais compatíveis com a biblioteca jurídica são transportados, sem integrar aquela branch.

Clientes novos enviam requestId e progress=true. A API retorna NDJSON com eventos status/result/error correlacionados. Sem progress, a resposta JSON tradicional permanece disponível, acrescida de requestId. Resposta JSON da API anterior sem ID é associada pelo leitor à própria requisição HTTP; isso não autoriza eventos de resultado arbitrários.

## Prazos e cancelamento
- Gemini: máximo 22 segundos, zero retries, cancelável com o sinal da requisição.
- Orçamento de análise: 40 segundos contados desde entrada no gate, incluindo preparo/autenticação; sinal verificado após consultas locais e antes/depois da IA. Consultas PostgreSQL já iniciadas não são interrompidas pelo sinal.
- Função Vercel: maxDuration 45 segundos.
- Página e ponte: 50 segundos; ponte inclui sua verificação de sessão nessa janela. Consulta isolada de sessão: 10 segundos.
- Worker: chamada de análise limitada a 60 segundos; sessão 12; cancelamento 5. Não há espera infinita. A checagem final de sessão pode acrescentar uma janela limitada antes da entrega.

Progresso recebido/local/gemini é real: a fase Gemini é emitida somente quando há fallback. Resultados locais são retornados imediatamente após consulta local; não há geração paralela de IA desnecessária. Concluído aparece após entrega válida. Cancelar ou editar relato aborta a espera e invalida sua correlação. Cancelamento não garante reembolso de uma geração já recebida pelo provedor.

## Concorrência e segurança
IDs são gerados antes do envio. Worker controla requisição vigente por aba e frame de origem. Relay continua observando alterações enquanto aguarda, cancela o anterior e confirma novamente o texto antes de solicitar publicação. Worker e ponte voltam a verificar autorização e sessão. Publicação é feita na mesma aba autenticada que executou a análise e exige o mesmo usuário. Simples troca de aba ativa não cancela; navegação/fechamento de origem ou destino invalida. Resultados duplicados/obsoletos/sem estrutura recebem erro, não confirmação falsa.

Nenhum resultado é enviado ao SADE; nenhum campo é preenchido ou ocorrência submetida. Relatos/resultados ficam apenas em memória transitória do fluxo existente. Não há logs de relatos, telemetria ou nova persistência. Permissões, domínio HTTPS exato, validação de remetente, consentimento pelas opções do Chrome e sessão HTTP-only foram preservados. O evento DOM é uma interface da própria página, não autenticação independente contra scripts já executados na mesma origem.

## Arquivos alterados
Aplicação: public/analysis-protocol.js; lib/analysis-protocol.js; lib/gemini.js; app/api/[[...path]]/route.js; app/page.jsx; app/globals.css; tests/communication.test.mjs; este relatório.
Extensão: analysis-protocol.js; kb190-bridge.js; kb190-bg.js; kb190-relay.js; background.js (carregamento do contrato); manifest.json (ordem e versão 5.16.0); test_integracao_runtime.cjs; testes de versão em test_integracao.js/test_sade_suite.js; workflow de testes habilitado para feature/**; este relatório. Ícones e demais arquivos originais permanecem intactos.

## Evidências e limites
Aplicação: 50 testes automatizados aprovados, incluindo contrato, respostas reais do motor local, progresso, timeout, cancelamento silencioso ao desmontar, ordem inversa, compatibilidade, autenticação e reconexão. Build Next de produção aprovado.
Extensão: 9 testes de integração executam o código real de ponte e worker em contextos VM, com transporte Chrome/HTTP simulado; cobrem resultados locais/Gemini, metadados, autenticação, revogação, navegação, ordem inversa, texto modificado, troca de usuário, timeout e reconexão. Testes estáticos de integridade e 16 regressões SADE aprovados. Os casos fictícios não contêm dados reais do COPOM.

Não foi realizado teste em instalação Chrome autenticada no ambiente real do COPOM, nem chamada Gemini real com chave de produção. O harness valida a integração ponte/worker e o protocolo, mas não substitui a homologação de ponta a ponta no navegador nem teste com PostgreSQL de produção. Não é uma garantia absoluta de disponibilidade externa.

## Como homologar e publicar posteriormente
1. Usar ambiente de teste autorizado, usuário de teste e relatos fictícios; nunca apontar um preview para dados reais sem autorização.
2. Instalar extensão desta branch como descompactada; recarregar a aba do site para carregar o novo contrato/ponte. A nova ponte suporta a API antiga, mas os estados local/Gemini ao vivo exigem a API nova. A extensão antiga continuará sem aceitar ia; precisa ser atualizada.
3. Habilitar envio nas configurações, abrir o simulador e o site autenticado. Confirmar resultado local, pergunta sem resposta local com Gemini, alterar texto durante geração, revogar autorização e recuperar conexão.
4. Conferir que trocar apenas a aba ativa não perde a entrega, navegar/fechar invalida, e não houve envio/preenchimento no SADE.
5. Nenhuma alteração foi feita nas branches principais ou em produção. Merge/deploy não faz parte desta entrega.
