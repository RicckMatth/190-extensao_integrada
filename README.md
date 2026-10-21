# Relato 190 ↔ Base de Conhecimento — v5.15.0 (MODELO DE TESTE)

> **EXPERIMENTAL · NÃO HOMOLOGADO PARA USO OPERACIONAL.** Teste somente com relatos fictícios e ambiente simulado. Dados reais de atendimento podem conter informações pessoais e sigilosas.

## Baixar e instalar

[**Baixar ZIP — última versão da extensão de teste**](https://github.com/RicckMatth/190-extensao_integrada/archive/refs/heads/main.zip)

1. Baixe e extraia o ZIP.
2. Abra `chrome://extensions` → habilite **Modo do desenvolvedor**.
3. Remova a versão de teste antiga ou substitua os arquivos na pasta já instalada e clique em **Atualizar**. Evite instalações duplicadas.
4. **Carregar sem compactação** → selecione a pasta que contém `manifest.json`.
5. Em **Detalhes → Opções da extensão**, ative **Análise automática de relatos**.
6. Abra [a Base 190](https://base-conhecimento-190.vercel.app/) e faça login no mesmo perfil Chrome. **Não existe autorização adicional na página da Base.**
7. Abra o SADE ou simulador compatível e digite um relato fictício.

**O painel original do Relato 190 foi restaurado.** Clique no ícone da extensão para abrir a interface de associação dos campos, coleta de nome, telefone e endereço, ferramentas de mapas/CEP, preenchimento e botão **Copiar**. O painel também é restaurado após navegação nas abas previamente vinculadas, como na versão original. A análise automática é um recurso adicional e **não exige abrir o painel**.

## Fluxo

```text
SADE / simulador → campo Relato
    ↓ (ao parar de digitar por ≈ 1,15 s, com ≥20 caracteres)
Extensão de teste em segundo plano (sem janela e sem resultados)
    ↓ (se a opção de envio estiver ativada e login válido)
Base 190 autenticada → /api/analyze
    ↓ (valida que o texto ainda é o mesmo, descarta respostas obsoletas)
Chat "Integração 190" na Base 190
    ↓
Natureza sugerida, justificativa, perguntas e reformulação opcional
```

**Todos os resultados, feedbacks e orientações aparecem somente na página da Base 190.** A extensão **não apresenta resultados da Base 190** nem exibe a janela de análise integrada. Clicar no ícone do complemento abre **o painel original de atendimento** (nome, telefone, endereço, associação de campos, Copiar e ferramentas auxiliares). O resultado do Cérebro 190 continua **exclusivo ao chat do site**.

O sistema espera aproximadamente 1,15 segundo sem mudança do campo antes de analisar, e limita a frequência de envio. Atualizações sucessivas do mesmo relato substituem a análise anterior no chat, em vez de criar diversas respostas. A extensão verifica o conteúdo mais recente antes de publicar o resultado, evitando sugestões desatualizadas.

## Autorização e segurança

- **Autorização apenas na extensão**, no interruptor de **Análise automática de relatos**. É desativada por padrão e salva no `chrome.storage.local`.
- **Autenticação apenas na Base 190**, com cookie seguro `HttpOnly`; a extensão não lê cookies, tokens ou senhas.
- **HTTPS/TLS** criptografa os dados em trânsito, mas **não é criptografia ponta a ponta**: a Base recebe e processa o texto.
- O serviço só recebe o texto do relato detectado. **O próprio texto pode conter dados pessoais**, então não habilite envio automático para ocorrências reais sem avaliação e autorização institucional.
- A extensão preserva o **preenchimento assistido original dos campos do SADE** e o botão Copiar. Ela **não aplica classificações retornadas pela Base ao SADE** e não envia ocorrências, não escolhe despacho nem executa ações oficiais. As classificações são orientativas e não homologadas.
- Revogar o interruptor bloqueia novas análises; resultados pendentes também são descartados pela ponte.

## Páginas de SADE detectadas automaticamente

O **painel** também pode ser aberto em um HTML local `file://` clicando no ícone, desde que você ative **Permitir acesso a URLs de arquivo** em `chrome://extensions` → Detalhes. Ao abrir especificamente `teste-sade.html`, `teste-atendimento.html` ou `SADE_SIMULADOR_LOCAL.html` como arquivo local, o mesmo clique ativa a ponte silenciosa. A versão de teste injeta a ponte automaticamente em páginas com o caminho `/syspm-web/public/` e em páginas com `teste-sade` ou `teste-atendimento` servidas por `localhost` ou `127.0.0.1`. Se sua instalação do SADE utilizar domínio ou caminho diferente, será necessário adicionar uma regra específica ao manifesto **antes de habilitar o envio**. Não utilize um script genérico em todos os sites.

## Diagnóstico

| Sintoma | Verificação |
|---|---|
| Não analisa automaticamente | Confirme v5.15.0, interruptor ativado e login na Base 190 |
| Sem resultado no chat | Mantenha a Base 190 aberta, recarregue as duas abas e teste com 20+ caracteres |
| Campo SADE não reconhecido | Confira o adaptador e o endereço da página; a automação só envia quando encontra um campo de relato com confiança suficiente |
| Painel não abre ao clicar no ícone | Use **v5.15.0**, recarregue a extensão e a aba; se for HTML `file://`, ative **Permitir acesso a URLs de arquivo** nos Detalhes da extensão |
| Texto antigo aparece | Atualize a extensão e recarregue as abas; a ponte verifica a atualidade antes de publicar |
| Sem atividade em página de arquivo `file://` | Sirva o simulador por HTTP local; extensões Chrome precisam de permissão adicional para arquivos locais |

## Testes

```bash
node test_integracao.js
node test_integracao_runtime.cjs
node test_sade_suite.js
```

O GitHub Actions executa também verificações de sintaxe. Testes estáticos e simulados **não substituem** um teste manual com duas abas Chrome e ambiente fictício.

## Repositórios

- Extensão experimental: https://github.com/RicckMatth/190-extensao_integrada
- Base online: https://base-conhecimento-190.vercel.app/
- Base Node.js: https://github.com/RicckMatth/base-conhecimento-190
- Extensão original (não alterada): https://github.com/RicckMatth/relato-190-essencial
