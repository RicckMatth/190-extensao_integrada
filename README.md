# Relato 190 + Base de Conhecimento 190 — MODELO TESTE INTEGRADO

> **🧪 VERSÃO EXPERIMENTAL 5.10.0 — NÃO HOMOLOGADA PARA USO OPERACIONAL**
>
> Esta é uma cópia **independente** da extensão [Relato 190 Essencial](https://github.com/RicckMatth/relato-190-essencial), com uma integração de teste com a [Base de Conhecimento 190](https://github.com/RicckMatth/base-conhecimento-190), hospedada na Vercel usando Node.js/Next.js e PostgreSQL. A extensão e sua integração precisam ser validadas em um **simulador**, sem dados pessoais ou sigilosos, antes de considerar qualquer adoção institucional.

| Componente | Origem / versão |
|---|---|
| Extensão original | `RicckMatth/relato-190-essencial`, branch `master`, commit `209c004c2bf7911bef41b8270249ef3e9ee786a4` (v5.9.3) |
| Modelo de teste | **v5.10.0-teste-integrado.1**, neste repositório |
| Base de conhecimento | `RicckMatth/base-conhecimento-190` — API autenticada Node.js |
| Dados / login da Base | Permanecem **no sistema online**; a extensão não replica o banco nem solicita credenciais |

## ⬇️ Instalação no Chrome

**[Baixar o código completo do MODELO TESTE (ZIP)](https://github.com/RicckMatth/190-extensao_integrada/archive/refs/heads/main.zip)**

1. Clique no link acima e extraia o ZIP.
2. Abra o Chrome: `chrome://extensions`.
3. Ative **Modo do desenvolvedor** e escolha **Carregar sem compactação**.
4. Escolha a pasta extraída `190-extensao_integrada-main`, que contém o arquivo `manifest.json`.
5. **Não remova a extensão original** antes de concluir os testes; as duas versões são independentes. Diferencie-as pelo nome **MODELO TESTE**. Evite ativar as duas na mesma aba para não duplicar barras.
6. Clique em **Detalhes → Opções da extensão** ou abra o painel e use **Configurar Base 190**.

> Esta extensão não requer publicação na Chrome Web Store para o teste local. O ZIP do GitHub é código-fonte; **não** selecione o arquivo ZIP diretamente em "Carregar sem compactação": extraia-o antes.

## 🔐 Primeira conexão com a Base 190

1. Abra **uma aba** com a URL HTTPS da Base 190 publicada na Vercel (ou domínio autorizado da sua organização).
2. Entre normalmente com **seu usuário autorizado** na interface web. **Não digite senhas na extensão.**
3. Na página **Opções da extensão**, informe **somente a origem** do sistema, por exemplo `https://exemplo.vercel.app` (sem barra adicional, /login, tokens ou parâmetros).
4. Clique em **Autorizar domínio** e aceite a solicitação do Chrome para aquele domínio específico.
5. Clique em **Testar sessão**. O resultado deve mostrar seu usuário e a origem autenticada. Se a sessão expirar, faça login novamente na aba da Base 190.
6. Mantenha a aba do sistema online **aberta** enquanto estiver testando a extensão.

**Por que abrir uma aba?** A integração utiliza o arquivo `kb190-bridge.js` executado somente no domínio autorizado para fazer requisições `same-origin` à API da Base 190. Isso aproveita a sessão **já existente no navegador** sem ler/exportar cookies, armazenar tokens ou fornecer sua senha ao complemento. Uma solicitação de análise sai para a Base **apenas quando o operador confirmar**. Não há sincronização silenciosa dos campos do SADE.

**Permissões:** A opção `optional_host_permissions: ["https://*/*"]` permite solicitar acesso em tempo de execução a **uma origem HTTPS escolhida pelo usuário**, não concede acesso automático a todos os sites. A extensão continua utilizando suas permissões originais para endereços e serviços opcionais de IA.

## 🧠 Como funciona a integração (passo a passo)

1. Abra `teste-sade.html` ou a tela de teste do SADE, clique no ícone da extensão e confira **SADE reconhecido**.
2. O adaptador `sade-adapter.js` preserva o mapeamento automático de **nome, telefone, município, rua, número, bairro, complemento, texto do relato e CEP** em formulários e iframes acessíveis. Campos ambíguos continuam exigindo confirmação.
3. Na barra do Relato 190 clique em **🧠 Base 190**. O painel tenta localizar o campo de relato do SADE já reconhecido e carrega uma **prévia local** na caixa de texto; se não encontrar, você poderá digitar um cenário fictício.
4. **Revise ou remova informações pessoais**. Clique em **Confirmar e analisar** e confirme a janela explicando o envio à Base 190.
5. A extensão envia **somente o texto revisado da caixa** para o endpoint autenticado `POST /api/analyze`. Não envia automaticamente nome, telefone, endereço nem os demais campos do formulário.
6. A Base retorna a **natureza sugerida**, código, índice heurístico, perguntas de triagem e, quando disponível, uma versão de texto revisada. A classificação **não é decisão oficial, tipificação conclusiva ou prioridade de despacho homologada**.
7. Se houver uma sugestão de texto, você poderá **copiar** ou **aplicar ao campo do simulador/SADE**, após outra confirmação. A extensão verifica se o texto original do campo foi alterado desde o início da análise, para evitar substituição acidental.
8. **Nenhum botão desta integração envia, salva ou encerra ocorrências** no SADE. A conferência e eventual registro permanecem a cargo do operador no sistema autorizado.

## 🧩 Arquitetura

```text
SADE / teste-sade.html  (campos identificados localmente)
     │ clique em "🧠 Base 190"; confirmação
     ▼
kb190-ui.js (interface de teste no painel da extensão)
     ▼
kb190-bg.js (service worker; exige URL autorizada)
     ▼
kb190-bridge.js (content script só na aba HTTPS autorizada)
     ▼
Base 190 autenticada → /api/session e /api/analyze
     ▼
Resposta consultiva → interface de teste (sem envio ao SADE)
```

As APIs administrativas (aprovações, gestão de usuários, edição de textos) **não são expostas** por essa integração. O serviço online continua verificando autenticação e permissões no servidor.

## ✅ Funcionalidades originais preservadas

- Reconhecimento automático e associação assistida dos nove campos do SADE, inclusive formulários em iframes acessíveis.
- Geração assistida de relato, atalhos CAPS, cópia e preenchimento após ação do usuário.
- Conferência e sugestão de endereço pelo ViaCEP, BrasilAPI, IBGE e integrações HERE/Maps, nos termos da extensão original.
- Perfis de vínculo e interface flutuante.
- Integração **opcional e separada** com Gemini, sujeita às confirmações e configurações do usuário.
- Histórico local de relatos **desligado por padrão**, conforme implementação original.

## 🧪 Testes e validação

Com **Node.js 20+** instalado, na pasta do projeto:

```bash
node test_integracao.js
node test_sade_suite.js
```

Para o fluxo visual, abra o arquivo `teste-sade.html` em servidor HTTP local (`npx serve .`) e habilite a extensão para a aba. Use dados inteiramente fictícios. O `chrome_test.js` original é um teste opcional de Chrome/Windows e pode exigir ajustes de caminho no seu computador.

**Cenários de aceitação obrigatórios:** login ativo, login expirado (401), domínio não autorizado, permissão do Chrome recusada, mudança de campo entre análise e aplicação, campo não reconhecido, formulário dentro de iframe, dados fictícios e relatório sem sugestão conclusiva.

### Solução de problemas

| Problema | Solução |
|---|---|
| "Configure a URL" | Abra **Opções** e informe exatamente a origem HTTPS da Base 190 |
| "Abra a Base 190 em uma aba" | Abra o site e conclua o login no mesmo perfil do Chrome |
| Sem permissão para o domínio | Repita **Autorizar domínio** e aceite a confirmação do Chrome |
| Sessão expirada (401) | Entre novamente na Base 190 e reteste |
| "Campo SADE não reconhecido" | Verifique o status de reconhecimento, seletores ou perfis do `sade-adapter.js` |
| Resultado não conclusivo | Confirme fatos manualmente; **nunca force natureza ou código** |
| Botão não aparece | Atualize a extensão em `chrome://extensions`, recarregue a aba e clique novamente no ícone |

## ⚠️ Segurança, privacidade e limitações

- **Este repositório é público e exclusivamente experimental.** Não faça commit de credenciais, token, senha, chave Gemini, conexão PostgreSQL, registro de ocorrência, prints ou dados pessoais.
- A extensão não armazena senha administrativa, banco de dados ou credenciais de sessão da Base 190. Armazena **somente a origem** explicitamente autorizada.
- A análise remota é opcional e usa confirmação; mesmo assim, dados reais podem estar protegidos por LGPD e por sigilo institucional. **Não utilize dados reais sem autorização e avaliação formal.**
- A versão depende de uma sessão aberta na Base 190 e de permissões específicas do Chrome. Não substitui avaliação humana, serviços de emergência nem sistemas oficiais.
- O reconhecimento SADE é heurístico e foi desenvolvido sobre **simuladores**. O comportamento em um sistema oficial deve ser validado com a instituição e seus responsáveis técnicos.
- A opção Gemini existente é uma integração distinta, com transferência de texto a fornecedor externo mediante ação do usuário; desative-a ao testar cenários sensíveis.
- Esta etapa publica os arquivos e testes estáticos. O funcionamento no Chrome e a comunicação com uma sessão real ainda exigem **teste manual de ponta a ponta**.

## Relação com os repositórios oficiais

- Extensão de origem (não modificada): https://github.com/RicckMatth/relato-190-essencial
- Base Node.js (não modificada por esta importação): https://github.com/RicckMatth/base-conhecimento-190
- **Extensão experimental e isolada:** https://github.com/RicckMatth/190-extensao_integrada

**Não confunda este protótipo com uma extensão oficial ou validada.**
