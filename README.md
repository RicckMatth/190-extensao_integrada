# Relato 190 + Base 190 — versão de teste integrada v5.13.0

> **MODELO DE TESTE — NÃO HOMOLOGADO PARA USO OPERACIONAL.**
> O projeto original `RicckMatth/relato-190-essencial` permanece intacto. Nunca suba relatos reais, dados pessoais, prints ou credenciais neste repositório público.

## Baixar e instalar

[**Baixar a extensão integrada em ZIP**](https://github.com/RicckMatth/190-extensao_integrada/archive/refs/heads/main.zip)

1. Baixe e **extraia** o ZIP.
2. Abra `chrome://extensions` no Chrome e habilite o **Modo do desenvolvedor**.
3. Remova a versão de teste anterior ou atualize os arquivos da mesma pasta para evitar extensões duplicadas.
4. Selecione **Carregar sem compactação** e escolha a pasta contendo `manifest.json`.
5. Clique em **Detalhes → Opções da extensão** ou no botão **Configurações completas** do painel Relato 190.

## Autorização: agora na própria extensão

A partir da **v5.13.0**, **não existe autorização obrigatória na Base 190**. O controle fica somente nas **Configurações da extensão**, através da chave:

**Análise automática de relatos — Ativar / Desativar**

- O padrão na primeira instalação/atualização é **DESATIVADO**. Por segurança, a autorização antiga do site não é transferida automaticamente.
- A preferência é gravada em `chrome.storage.local` **no perfil Chrome da extensão**, não em `sessionStorage` nem no banco da Base.
- Após ativar, a opção permanece válida entre recarregamentos de abas e reinícios do Chrome até ser desativada.
- Para interromper o envio, abra as configurações e **desative** a chave: o service worker e a ponte verificam a preferência novamente antes de cada POST à API.
- Apenas a página de opções da extensão pode modificar a preferência. O site e as páginas SADE podem **abrir** as opções, mas não ativar a transmissão sozinhos.

## Conexão com a Base 190

O endereço é fixo: **https://base-conhecimento-190.vercel.app/**

1. Abra a Base 190 em uma aba do **mesmo perfil do Chrome** e entre com sua conta autorizada.
2. Abra as **Configurações da extensão** e ative **Análise automática de relatos**.
3. Clique em **Testar conexão**: o status deverá indicar **Análise ativada** e **Conectada à Base 190** com o seu usuário.
4. Abra o simulador SADE, ative a extensão, e digite um relato **inteiramente fictício** com pelo menos 20 caracteres.
5. Quando o texto ficar estável por aproximadamente **3,5 segundos**, a extensão consulta `POST /api/analyze` automaticamente; a Base 190 apresenta o resultado no **chat integrado**, e a extensão na aba **📋 Resultado**.

**Não clique em “Autorizar conexão remota” na Base.** Essa etapa pertence à versão antiga e foi removida do site.

A extensão só transmite o **texto do campo Relato** detectado. Ela não envia outros campos separadamente e **não envia nem encerra uma ocorrência** no SADE. A função **Aplicar texto** continua exigindo confirmação humana.

## Diagnóstico rápido

| Situação | Solução |
|---|---|
| “Ative nas Configurações da extensão” | Abra `chrome://extensions` → Detalhes → Opções e ligue a chave |
| “Abra a Base 190 e faça login” | Abra a Base 190 no mesmo perfil Chrome e conclua o login |
| “Extensão desativada” após ativar | Atualize a extensão em `chrome://extensions`; recarregue as abas Base 190 e SADE |
| Resultado não aparece | Confirme o reconhecimento automático do campo Relato, escreva 20+ caracteres fictícios e espere ~3,5 s |
| Resultado aparece somente em um lugar | Mantenha a Base 190 aberta e recarregue as abas após atualizar a extensão |
| Dois botões ou painéis iguais | Desative/remova a instalação duplicada da extensão |

## Segurança e limites

- O navegador envia os dados para a Base 190 por **HTTPS/TLS**, protegendo o transporte. **Não há criptografia ponta a ponta**: a Base precisa ler o texto para classificá-lo.
- O login da Base é obrigatório e validado pelo servidor usando cookie `HttpOnly`; a extensão **não coleta nem armazena senhas ou cookies de sessão**.
- O controle do envio é da extensão e pode ser revogado a qualquer momento pelo operador.
- Este é um sistema **experimental**, sem homologação dos códigos, procedimentos ou enquadramentos. O operador deve conferir qualquer classificação.
- O próprio campo Relato pode conter nomes, endereços e dados sensíveis: **não transmita dados reais sem autorização institucional e avaliação da LGPD**.
- A sincronização de resultados ocorre entre abas no mesmo navegador; não é sincronização entre dispositivos nem histórico em banco de dados.

## Testes técnicos

```bash
node test_integracao.js
node test_integracao_runtime.cjs
node test_sade_suite.js
```

O GitHub Actions valida a sintaxe JavaScript, integridade, os nove campos SADE e simulações de ativação, revogação e sessão expirada. **Teste final no Chrome ainda é necessário**.

## Projetos

- [Esta extensão experimental](https://github.com/RicckMatth/190-extensao_integrada)
- [Base 190 online](https://base-conhecimento-190.vercel.app/)
- [Código da Base 190](https://github.com/RicckMatth/base-conhecimento-190)
- [Relato 190 Essencial original](https://github.com/RicckMatth/relato-190-essencial)
