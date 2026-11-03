# Relato 190 ↔ Base de Conhecimento — v5.15.2 (MODELO DE TESTE)

## Novo: Script para Pacific Monkey (v2.0.0)

[**⬇ BAIXAR O SCRIPT .user.js DIRETAMENTE**](https://raw.githubusercontent.com/RicckMatth/190-extensao_integrada/main/scripts/relato190-pacific-monkey.user.js) · [Guia de instalação e diagnóstico](scripts/README.md)

Esta é uma **versão local de testes**, independente da extensão completa. Detecta nove campos, oferece vínculo manual, prévia, cópia sem alterar, inserção em CAPS e desfazer seguro. **Não envia relatos à Base 190 nem a serviços externos, não armazena dados de atendimento e não executa despachos.**

O arquivo está configurado para `http://localhost/*`; para uma página institucional, é necessário **autorização formal** e alteração do domínio exato no editor do Pacific Monkey. Evite ativar simultaneamente a extensão original e o script na mesma página. Não é homologado para uso com ocorrências reais.

> **EXPERIMENTAL · NÃO HOMOLOGADO PARA USO OPERACIONAL.** Teste somente com relatos fictícios e ambiente simulado. Dados reais de atendimento podem conter informações pessoais e sigilosas.

## Baixar e instalar

[**Baixar ZIP — última versão da extensão de teste**](https://github.com/RicckMatth/190-extensao_integrada/archive/refs/heads/main.zip)

1. Baixe e extraia o ZIP.
2. Abra `chrome://extensions` → habilite **Modo do desenvolvedor**.
3. Remova a versão de teste antiga ou substitua os arquivos na pasta já instalada e clique em **Atualizar**. Evite instalações duplicadas.
4. **Carregar sem compactação** → selecione a pasta que contém `manifest.json`.
5. A análise ao vivo inicia ativada automaticamente. Abra [a Base 190](https://base-conhecimento-190.vercel.app/) e faça login no mesmo perfil Chrome. **Não existe confirmação por análise na página da Base.**
6. Para interromper os envios, acesse as opções da extensão e desligue **Compartilhar relato com a Base 190**.
7. Abra o SADE ou simulador compatível e digite um relato fictício.

**O painel original do Relato 190 foi restaurado.** Clique no ícone da extensão para abrir a interface de associação dos campos, coleta de nome, telefone e endereço, ferramentas de mapas/CEP, preenchimento e botão **Copiar**. O painel também é restaurado após navegação nas abas previamente vinculadas, como na versão original. A análise automática é um recurso adicional e **não exige abrir o painel**.

## Nova opção: Relato ao vivo / dinâmico

No painel original da extensão, clique em **⚙ Configurações** → **Relato ao vivo / dinâmico** → **Configurar relato ao vivo / dinâmico**. Uma página da **própria extensão** abrirá, sem perder o painel de atendimento.

1. A chave **Compartilhar relato com a Base 190** inicia ligada em uma instalação nova. A preferência fica salva em `chrome.storage.local` e continua ativa após fechar o Chrome.
2. A extensão testa automaticamente se a Base 190 está aberta e autenticada no mesmo perfil. Se não estiver, basta entrar na Base; não é preciso autorizar cada análise.
3. Desligue a chave nas opções da extensão quando quiser interromper os envios.
4. O texto principal do SADE é transmitido após uma pausa na digitação. Enquanto o relato muda, a Base remove a resposta anterior e só publica o resultado se ele ainda corresponder à versão mais recente. Os resultados ficam **exclusivamente no chat da Base 190**.

**Sem mudanças nas demais funções:** o painel de nome, telefone, endereço, vínculos de campos, botão Copiar, mapas, perfis, preenchimento assistido e regras da ponte de análise permanecem preservados.

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

O sistema espera aproximadamente 1,15 segundo sem mudança do campo antes de analisar. Uma mudança no texto invalida imediatamente análises pendentes e limpa a resposta anterior do chat; cada resultado também é conferido contra a versão atual antes de ser publicado. Atualizações substituem a análise anterior no mesmo painel.

## Autorização e segurança

- **Preferência apenas na extensão**, no interruptor de compartilhamento. Inicia ativada em instalação nova e pode ser desligada a qualquer momento; a escolha explícita fica salva em `chrome.storage.local`.
- **Autenticação apenas na Base 190**, com cookie seguro `HttpOnly`; a extensão não lê cookies, tokens ou senhas.
- **HTTPS/TLS** criptografa os dados em trânsito, mas **não é criptografia ponta a ponta**: a Base recebe e processa o texto.
- O serviço recebe o texto do relato detectado. **O próprio texto pode conter dados pessoais**; mantenha o compartilhamento desligado para ocorrências reais até haver avaliação e autorização institucional.
- A extensão preserva o **preenchimento assistido original dos campos do SADE** e o botão Copiar. Ela **não aplica classificações retornadas pela Base ao SADE** e não envia ocorrências, não escolhe despacho nem executa ações oficiais. As classificações são orientativas e não homologadas.
- Revogar o interruptor bloqueia novas análises; resultados pendentes também são descartados pela ponte.

## Páginas de SADE detectadas automaticamente

O **painel** também pode ser aberto em um HTML local `file://` clicando no ícone, desde que você ative **Permitir acesso a URLs de arquivo** em `chrome://extensions` → Detalhes. Ao abrir especificamente `teste-sade.html`, `teste-atendimento.html` ou `SADE_SIMULADOR_LOCAL.html` como arquivo local, o mesmo clique ativa a ponte silenciosa. A versão de teste injeta a ponte automaticamente em páginas com o caminho `/syspm-web/public/` e em páginas com `teste-sade` ou `teste-atendimento` servidas por `localhost` ou `127.0.0.1`. Se sua instalação do SADE utilizar domínio ou caminho diferente, será necessário adicionar uma regra específica ao manifesto **antes de habilitar o envio**. Não utilize um script genérico em todos os sites.

## Diagnóstico

| Sintoma | Verificação |
|---|---|
| Não analisa automaticamente | Confirme v5.15.2, interruptor ligado e login na Base 190 |
| Sem resultado no chat | Mantenha a Base 190 aberta, recarregue as duas abas e teste com 20+ caracteres |
| Campo SADE não reconhecido | Confira o adaptador e o endereço da página; a automação só envia quando encontra um campo de relato com confiança suficiente |
| Painel não abre ao clicar no ícone | Use **v5.15.2**, recarregue a extensão e a aba; se for HTML `file://`, ative **Permitir acesso a URLs de arquivo** nos Detalhes da extensão |
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
