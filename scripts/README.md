# Relato 190 — script local para Pacific Monkey (v2.0.0)

> **PROTÓTIPO DE TESTE — NÃO HOMOLOGADO PARA ATENDIMENTOS OPERACIONAIS.** Para sistemas institucionais, só utilizar com autorização formal da área responsável. Antes da homologação, usar apenas dados fictícios, ambiente simulado ou de testes autorizado. Não publicar prints ou dados pessoais de ocorrências.

## Download

[**⬇ Baixar script `.user.js` (clique direito → Salvar link como...)**](https://raw.githubusercontent.com/RicckMatth/190-extensao_integrada/main/scripts/relato190-pacific-monkey.user.js)

Arquivo no repositório: [`scripts/relato190-pacific-monkey.user.js`](./relato190-pacific-monkey.user.js).

## O que faz

- Identifica **9 campos**: nome/solicitante, telefone, cidade, rua/logradouro, número, bairro, complemento, CEP e relato principal.
- Procura pelo rótulo e outros atributos do campo; informa quando há **conflito**, baixa confiança ou campo ausente.
- Permite **vincular manualmente** cada campo, inclusive em formulários carregados dinamicamente.
- Reconhece documentos dentro de **iframes da mesma origem** e componentes com Shadow DOM aberto. Iframes de outras origens exigem configuração e permissões específicas e podem não ser acessíveis.
- Exibe **prévia**, permite **copiar sem alterar**, **inserir e copiar**, converter o relato para **CAPS** e **desfazer** a última alteração enquanto o texto não tiver sido modificado pelo operador.
- Evita repetir o prefixo quando o botão de inserção é acionado mais de uma vez.
- Não inclui o **CEP** no texto concatenado; ele é reconhecido para conferência.
- Não envia informações a servidores, não salva dados de atendimento, não usa IA e não faz submissão, classificação ou despacho automático.

## Instalação no Pacific Monkey 1.7.1+

1. Baixe o `.user.js` acima. Abra o **Pacific Monkey → Importar script** e selecione o arquivo.
2. O arquivo vem preparado **somente para o simulador `http://localhost/*`**. Teste primeiro em um simulador iniciado por HTTP local, por exemplo `http://localhost:8765/Simulador-Relato190.html`.
3. Para um site institucional em ambiente **expressamente autorizado**, abra **Biblioteca → Inspecionar / editar** e substitua o padrão `http://localhost/*` pelo **domínio exato** da página (ex.: `https://sistema.exemplo.gov.br/*`). A extensão aceita um padrão por script. Salve a alteração e **Ative**, concedendo a permissão solicitada pelo Chrome.
4. Nos detalhes da extensão em `chrome://extensions`, habilite **Permitir scripts do usuário**. Atualize a aba de destino com `Ctrl+R`.
5. Confirme que o Pacific Monkey exibe **Registrado no Chrome ✓**. Abra o **Diagnóstico de execução** e compare o endereço da página ao domínio configurado.
6. Na página do formulário, confira os nove campos. Use **Vincular** se algum estiver ausente ou ambíguo. Para começar com segurança, teste **Ver prévia** e **Copiar sem alterar** antes de usar **Inserir no relato + copiar**.

**Atenção:** se o formulário estiver em um iframe de outro domínio, o script pode não acessá-lo. O Pacific Monkey 1.7.1 registra scripts no documento principal (`allFrames: false`). A correção poderá exigir uma mudança futura no gerenciador e autorização explícita; não tente contornar restrições do sistema.

O painel do script pode ser minimizado e arrastado. Os vínculos manuais não são armazenados entre sessões; isso evita reter informações de um atendimento, mas exige refazê-los quando necessário.

## Convivência com a extensão original

Esta é uma **versão local para Pacific Monkey**, não substitui a extensão Chrome [Relato 190 integrada](https://github.com/RicckMatth/190-extensao_integrada). Recursos específicos da extensão original (CEP, mapas, comunicação com a Base 190 e APIs do Chrome) **não foram incorporados**. Evite executar ambas simultaneamente na mesma página durante os testes, para não duplicar controles ou alterar o mesmo campo por dois mecanismos.

## Testes automatizados

No repositório, execute:

```bash
node --test test_pacific_monkey.cjs
```

O teste valida o reconhecimento dos nove campos em dados fictícios, composição em maiúsculas, preservação de quebras de linha, exclusão do CEP, cópia sem alteração, inserção idempotente, desfazer seguro e resolução manual de conflitos. Ainda é necessário realizar testes de interface no Chrome com um formulário de demonstração. Não foram executados testes em sistemas operacionais do COPOM.