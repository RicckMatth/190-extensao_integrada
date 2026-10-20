# Relato 190 + Base de Conhecimento — TESTE INTEGRADO v5.11.0

> **MODELO DE TESTE, NÃO HOMOLOGADO** — Versão experimental para testes com relatos fictícios e ambiente SADE simulado. Não processe informações reais, pessoais ou sigilosas sem autorização institucional.

## Download

**[Baixar versão automática integrada v5.11.0 — ZIP](https://github.com/RicckMatth/190-extensao_integrada/archive/refs/heads/main.zip)**

Este repositório é uma cópia independente de [Relato 190 Essencial v5.9.3](https://github.com/RicckMatth/relato-190-essencial) (commit de origem `209c004c2bf7911bef41b8270249ef3e9ee786a4`) e preserva o reconhecimento SADE com nove campos, endereços, mapas e ferramentas opcionais Gemini. O repositório original não foi alterado.

## O que mudou na versão 5.11.0

- **Conexão automática e fixa** com **https://base-conhecimento-190.vercel.app/**, sem configurar URL nem pedir autorização de domínio manual. O Chrome solicita permissões necessárias ao instalar/atualizar a extensão.
- **Login centralizado:** entre normalmente na Base 190; a extensão só consulta a sessão ativa na aba, sem copiar cookies, senhas, tokens ou acessar funções administrativas.
- **Resultados sincronizados em duas direções:** análise concluída na extensão aparece na página da Base 190; análise concluída no site aparece na aba **📋 Resultado** da extensão quando uma tela SADE/simulador está com a extensão ativa.
- **Botão no site:** **Ativar extensão** verifica se ela está instalada e oferece instruções quando ausente. A conexão funciona automaticamente, sem depender desse botão.
- **Aba Analisar + aba Resultado** no modal da extensão. Botão de atalho **📋 Resultado** após a primeira análise.
- **Sem envio automático do texto:** é obrigatório clicar em **Confirmar e analisar**, conferir o texto e confirmar o envio. Não há gravação de relatos em banco pela integração e não há submissão automática de ocorrências.
- **Segurança:** recepção de resultados em memória da aba do navegador; o resultado é descartado ao atualizar/fechar a aba. A extensão recebe apenas os resultados de análise e não acessa endpoints administrativos.

## Como instalar no Chrome

1. Baixe o ZIP do link acima e **extraia**.
2. Acesse `chrome://extensions` → **Modo do desenvolvedor** → **Carregar sem compactação**.
3. Escolha a pasta extraída que contém `manifest.json`.
4. Se já instalou a versão de teste anterior, **remova ou substitua a versão antiga** (v5.10.0) antes de ativar a nova. No caso de instalação anterior em pasta extraída, substitua os arquivos nessa pasta e clique em **Atualizar**.
5. Abra a [Base 190](https://base-conhecimento-190.vercel.app/) e faça login normalmente.
6. Se a página estava aberta durante a instalação, **recarregue-a** para ativar o content script.
7. No SADE simulado (`teste-sade.html` servido por HTTP local), clique no ícone da extensão e depois em **🧠 Base 190**.

Não é necessário ir a Opções, informar a URL ou autorizar o site manualmente.

## Experiência de uso

### A. Analisando pela extensão

```text
Chrome com extensão ativa + Base 190 já autenticada
          │
   Abra o SADE/simulador
          │
   Clique em 🧠 Base 190
          │
 Revise o texto (remova informações pessoais)
          │
 Clique em Confirmar e analisar
          │
  Confirme o envio ao sistema online
          │
    POST /api/analyze na Base
          │
        RESULTADO
       ├── Extensão: aba 📋 Resultado
       └── Site Base 190: seção Integração 190 (abre automaticamente)
```

A sugestão de natureza inclui enquadramento orientativo, índice heurístico (não probabilidade), perguntas de triagem e texto revisado quando disponível. Se optar por **Aplicar ao campo**, há **segunda confirmação** e verificação para não sobrescrever alterações feitas desde o início.

### B. Analisando diretamente no site

1. Na Base 190, use a pesquisa/área **Cérebro 190** e analise um caso fictício.
2. Após a resposta, o site compartilha **somente o resultado** com a extensão instalada nesta sessão do navegador.
3. A extensão mostra **📋 Novo resultado** na barra do SADE. Clique para abrir a aba Resultado. A extensão **não escreve nem envia** esse resultado ao SADE automaticamente.

O botão **Ativar extensão** no site é opcional: ele solicita a identificação da extensão quando a página não mostrou o estado conectado.

### C. O que acontece sem login ou extensão

- Sem a extensão, a Base 190 continua com todas as suas funções normais.
- Sem login, a extensão pede para abrir o site e entrar; **não contorna a autenticação**.
- Sem aba aberta da Base, a extensão mostra mensagem para abri-la. Não utiliza chaves de API e não solicita acesso ao PostgreSQL.
- Sem campo de relato reconhecido, o operador pode usar um exemplo fictício, sem escrever no SADE.
- A transferência do resultado é em tempo real entre abas do **mesmo perfil Chrome**. Não sincroniza outros aparelhos ou usuários.

## Componentes

| Arquivo | Função |
|---|---|
| `manifest.json` | Host fixo + content script automático |
| `kb190-bg.js` | Roteia consultas e respostas (somente leitura/visualização) |
| `kb190-bridge.js` | Consulta a API com sessão do próprio site e entrega eventos à página |
| `kb190-ui.js` | Abas Analisar / Resultado, confirmação e preenchimento assistido |
| `kb190-options.html/js` | Tela apenas diagnóstica, sem configuração manual de URL |
| `sade-adapter.js` | Detecção original dos nove campos de atendimento |
| `test_integracao.js` | Testes estáticos da conexão, permissões e sincronização |

## Testes

```bash
node test_integracao.js
node test_sade_suite.js
```

O GitHub Actions também verifica a sintaxe JavaScript. Os testes estáticos não substituem teste real de duas abas Chrome, login da Vercel, fluxo SADE e sessão expirada.

## Segurança e limitações

- **Público e experimental:** jamais versionar senhas, tokens, dados de ocorrências ou capturas de telas sigilosas.
- Somente o domínio exato `base-conhecimento-190.vercel.app` recebe a ponte de autenticação; as demais permissões preexistentes continuam destinadas às funcionalidades originais.
- O envio de texto para análise exige confirmação; **a sincronização posterior de resultados é automática**. Não há armazenamento persistente de relatos pela ponte.
- Ao usar uma análise no SADE, revise integralmente o texto gerado, a prioridade e o código. As regras não estão homologadas para despacho policial real.
- Apenas abas de SADE identificado ou simuladores recebem resultados originados no site, e somente se a extensão estiver carregada nessas abas.
- A sincronização ocorre no navegador e não depende de usar um novo login, chave de API ou sincronização em banco de dados.

## Repositórios

- Versão de teste: **https://github.com/RicckMatth/190-extensao_integrada**
- Base online: **https://base-conhecimento-190.vercel.app/**
- Código da Base: https://github.com/RicckMatth/base-conhecimento-190
- Extensão original: https://github.com/RicckMatth/relato-190-essencial
