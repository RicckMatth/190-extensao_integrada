# Relato 190 + Base de Conhecimento — MODELO TESTE INTEGRADO v5.12.0

> **VERSÃO EXPERIMENTAL / NÃO HOMOLOGADA PARA ATENDIMENTO OPERACIONAL.** Utilize relatos fictícios no SADE simulado. O envio de ocorrências reais, dados pessoais ou informações sigilosas depende de autorização institucional e avaliação de segurança/LGPD.

## Instalação e download

**[Baixar ZIP da extensão de teste v5.12.0](https://github.com/RicckMatth/190-extensao_integrada/archive/refs/heads/main.zip)**

1. Baixe e extraia o ZIP.
2. Abra `chrome://extensions`, ative **Modo do desenvolvedor**, clique em **Carregar sem compactação** e escolha a pasta que contém `manifest.json`.
3. **Atualize ou remova a versão de teste antiga** (v5.11) para não haver dois complementos interferindo na mesma tela.
4. Abra [https://base-conhecimento-190.vercel.app/](https://base-conhecimento-190.vercel.app/) e faça login com sua conta autorizada.
5. Recarregue a aba da Base se ela já estava aberta antes de instalar a extensão.
6. No menu lateral da Base, escolha **Integração 190**. A extensão será detectada automaticamente, sem informar URL, senha ou token.
7. Clique em **Autorizar conexão remota** na página da Base. Este é o **único consentimento para transmissão automática**; não será solicitado a cada relato.
8. Abra o SADE simulado e clique no ícone da extensão para habilitar a detecção do formulário.

## Fluxo novo: análise automática → chat

```text
Extensão instalada no Chrome
     │
Base 190 aberta e com login válido
     │
Botão “Autorizar conexão remota” na Base 190
     │
SADE simulado: campo principal de relato detectado
     │
Aguarda 3,5 segundos sem nova edição (mínimo 20 caracteres)
     │
Extensão envia SOMENTE o texto do relato para a API da Base
     │
GET /api/session confirma o usuário + autorização ativa na aba
POST /api/analyze só é permitido se a autorização continuar válida
     │
RESULTADO: chat da Base 190 abre automaticamente
         + aba 📋 Resultado da extensão é atualizada
```

Não é necessário clicar em **Confirmar envio** na extensão após ter autorizado a conexão na Base. Quando o texto do relato for alterado, uma nova análise poderá ser enviada após o período de estabilidade. O envio é interrompido imediatamente pela checagem de autorização ao clicar em **Revogar autorização**, sair da conta ou fechar a aba autorizada. O indicador visual da extensão pode demorar alguns segundos para atualizar.

A extensão **não envia nem encerra ocorrências no SADE**. Só fornece sugestões de enquadramento, perguntas de triagem e possível reformulação de texto. Aplicar qualquer reformulação ao campo do SADE requer confirmação separada e verificação de que o texto original não foi alterado.

### O chat no site

- O painel **Integração 190** foi redesenhado como conversa responsiva.
- Cada análise recebida da extensão aparece como uma resposta do Cérebro 190, com natureza e código sugeridos, justificativa e detalhes recolhíveis.
- O operador pode enviar um cenário fictício diretamente pelo chat e receber uma nova resposta.
- O resultado também pode ser consultado na aba **📋 Resultado** da extensão.
- As mensagens e resultados da ponte são mantidos somente na memória da aba aberta, sem gravar relatórios na tabela PostgreSQL pela integração.

### Autorizar e revogar

A autorização fica em **sessionStorage**, no domínio da Base 190, vinculada ao ID de usuário autenticado. Ela é específica da aba e não é uma credencial de API. Uma aba da Base deve permanecer aberta, autorizada e com sessão válida. O serviço verifica a sessão autenticada **antes de cada requisição de análise**. O encerramento da sessão e a revogação removem a autorização usada pela ponte.

A URL está configurada diretamente no `manifest.json`: **https://base-conhecimento-190.vercel.app/**. O Chrome poderá pedir a permissão para o domínio ao instalar/atualizar; isso é uma autorização **do navegador**, separada do botão de transmissão na Base.

## Segurança e criptografia

A comunicação utiliza **HTTPS com TLS** entre o navegador e a Vercel. O login da Base usa cookie `Secure`, `HttpOnly` e `SameSite`, validado no servidor. A extensão **não armazena nem exporta cookies, senhas ou tokens de acesso**. A ponte só consulta os endpoints permitidos (`/api/session` e `/api/analyze`), e o serviço remoto exige a autorização ativa na aba.

**TLS criptografa a comunicação em trânsito, mas isto NÃO é criptografia ponta a ponta.** O servidor da Base 190 precisa receber o texto em claro para analisá-lo; portanto, não use dados sensíveis ou sigilosos sem aprovação institucional. Não existe serviço de transmissão oculto, chave mestre em GitHub ou bypass do login.

A transmissão é limitada ao **texto principal do relato**, sem coletar separadamente nome, telefone, número, endereço, bairro ou CEP. **O próprio texto do relato pode conter dados pessoais**: a autorização deve considerar esse risco.

## Recursos anteriores preservados

A extensão experimental foi derivada de [Relato 190 Essencial v5.9.3](https://github.com/RicckMatth/relato-190-essencial), commit `209c004c2bf7911bef41b8270249ef3e9ee786a4`. O repositório original **não foi modificado**. Mantém:

- Detecção automática dos nove campos SADE acessíveis, com fallback por vínculo de campos e confirmação de ambiguidade.
- Funcionamento em iframes acessíveis, suporte ao simulador e atualização de formulário dinâmico.
- Integrações opcionais com ViaCEP, BrasilAPI, IBGE, HERE e Google Maps.
- Ferramentas CAPS, histórico local opcional e integração Gemini independente (sujeita às próprias permissões e riscos).

## Testes automatizados

Com Node.js 20 ou superior:

```bash
node test_integracao.js
node test_integracao_runtime.cjs
node test_sade_suite.js
```

O GitHub Actions executa também a verificação de sintaxe dos scripts JavaScript. O teste `test_integracao_runtime.cjs` simula as APIs do Chrome, verificando autorização, revogação, sessão vinculada ao usuário e bloqueio de origens não permitidas. **Não substitui** teste manual no Chrome com duas abas e o SADE simulado.

## Teste manual recomendado

1. Sem autorizar na Base: digite um relato fictício no simulador e confirme que **nenhuma análise** aparece.
2. Autorize na Base e edite o relato: após alguns segundos, confira o chat e o botão **📋 Novo resultado** na extensão.
3. Revogue na Base e altere o relato: confirme que novos resultados não são transmitidos.
4. Faça logout e tente analisar; a autorização deve permanecer inativa.
5. Reentre com outro usuário: a autorização anterior não deve servir para esse novo usuário.
6. Teste texto curto, texto ambíguo, iframe recriado, navegador sem extensão e sessão vencida.
7. Teste novamente os nove campos SADE e o preenchimento assistido sem submissão automática.

## Repositórios

- [Esta extensão de teste](https://github.com/RicckMatth/190-extensao_integrada)
- [Base de Conhecimento Node.js](https://github.com/RicckMatth/base-conhecimento-190)
- [Extensão original (independente)](https://github.com/RicckMatth/relato-190-essencial)

**Não confundir este modelo com uma ferramenta oficialmente aprovada ou homologada.**
