# Bíblia Comparada

Aplicativo para ler e comparar versículos de diferentes traduções da Bíblia, com a **ARC** como referência. Funciona diretamente no navegador e pode ser instalado na tela inicial (opcional). Não exige cadastro.

## Como usar

1. Abra o site e escolha uma tradução para leitura.
2. Selecione um livro, capítulo e versículo.
3. Abra a comparação para visualizar as traduções disponíveis lado a lado.
4. No **Catálogo**, marque ou desmarque as traduções que deseja comparar. A seleção fica salva neste navegador.

## Traduções disponíveis

O catálogo contém **24 traduções**. O pacote inclui os textos de **ARC, AA, RC69, BPT09, NVI2011, AVM, MATOS e PASTORAL**. As outras traduções aparecem no catálogo, mas só poderão ser lidas depois que seus arquivos JSON forem adicionados à pasta `data/`.

A cruz **†** identifica exclusivamente as traduções católicas **AVM, MATOS e PASTORAL**. A **BPT09** corresponde à edição comum.

## Publicar no GitHub Pages

1. Extraia o ZIP e envie **todos os arquivos e pastas** para a raiz do repositório, incluindo `data/`, `mappings/`, `icons/`, `index.html`, `app.js`, `style.css`, `sw.js` e `manifest.webmanifest`.
2. Em **Settings > Pages**, selecione a branch publicada (por exemplo, `main`) e **/ (root)**.
3. Acesse o endereço HTTPS fornecido pelo GitHub Pages.

Para adicionar outra tradução do catálogo, coloque seu JSON em `data/` com o nome exato da sigla em maiúsculas (por exemplo, `ARA.json`). O arquivo deve seguir a estrutura de `ARC.json`, com 66 livros na ordem correta, capítulos e versículos em arrays. Não é preciso editar o aplicativo para adicionar uma tradução já cadastrada.

## Comparação e limitações

- A comparação não mostra automaticamente versículos quando há risco conhecido de numeração diferente.
- **AA** e **NVI2011** têm alguns capítulos com comparação bloqueada; **BPT09** possui restrições mais amplas de alinhamento. A leitura individual continua disponível.
- **AVM, MATOS e PASTORAL** utilizam mapeamentos de referências na pasta `mappings/`. Algumas correspondências são sugestões ainda não verificadas individualmente.
- A coincidência na quantidade de versículos não garante, por si só, equivalência textual exata.
- O site pode armazenar arquivos em cache para uso offline após o carregamento. Se uma atualização não aparecer, recarregue a página ou limpe os dados do site.
- Antes de publicar traduções adicionais, verifique os direitos de distribuição dos textos.

## Testar no computador

Na pasta do projeto, execute `python -m http.server 8000` e acesse `http://localhost:8000`. Não abra `index.html` diretamente como arquivo local.
