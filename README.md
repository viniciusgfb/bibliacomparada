# Bíblia Comparada

Aplicativo PWA para leitura e comparação de traduções bíblicas, com a **ARC como referência**.

## Como usar

- **Tradução específica:** selecione uma versão, um livro e um capítulo para ler.
- **Comparar traduções:** escolha livro, capítulo e versículo; as traduções disponíveis aparecem lado a lado.
- **Catálogo:** marque ou desmarque as traduções que deseja incluir na comparação.

## Traduções incluídas

ARC, AA, RC69, BPT09, NVI2011, AVM (Ave-Maria), MATOS (Matos Soares) e PASTORAL (Bíblia Pastoral). O catálogo também contém outras traduções que podem ser adicionadas manualmente à pasta `data/`, usando o código correspondente como nome do arquivo JSON.

## Publicar no GitHub Pages

Envie os arquivos e pastas do projeto para a raiz do repositório e ative **Settings → Pages**. Ao atualizar o aplicativo instalado, feche e abra novamente para carregar a versão mais recente.

## Compatibilidade

- Cada JSON deve conter 66 livros na ordem da ARC, com abreviações correspondentes e versículos não vazios.
- As traduções AVM, MATOS e PASTORAL têm 3 capítulos em Malaquias, contra 4 na ARC; a leitura individual respeita a estrutura de cada tradução.
- **Não há mapeamentos especiais:** a comparação é exibida somente quando o capítulo existe e tem a mesma quantidade de versículos da ARC. Mesmo assim, igualdade de contagem não garante equivalência textual perfeita.
- Quando a divisão diverge, a comparação é sinalizada como indisponível; o texto permanece acessível na leitura individual.
