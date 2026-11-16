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


## Usar sem internet

1. Publique `app.js` e `sw.js` atualizados no GitHub Pages.
2. Abra o aplicativo com internet. O download das **24 traduções cadastradas** começará automaticamente em segundo plano.
3. Na tela inicial, toque em **Baixar/verificar todas as traduções para uso offline** e acompanhe a contagem. Aguarde **24/24** antes de desconectar.
4. Se algum arquivo estiver ausente no GitHub, publique-o em `data/CODIGO.json` e toque no botão novamente. O app não pode disponibilizar offline arquivos que ainda não existem no repositório.
5. Desligue a internet e teste a leitura e a comparação.

O armazenamento pode exigir cerca de 100 MB ou mais. A primeira preparação exige internet; o navegador pode remover o cache ao liberar espaço ou quando os dados do site forem apagados. O cache offline não modifica textos bíblicos nem a lógica de comparação.


## Pesquisa por palavra

A aba **Pesquisa** busca palavras inteiras em todas as traduções marcadas em **Traduções**, ignorando acentos e diferenças entre maiúsculas e minúsculas. Exibe ocorrências, quantidade de versículos e progresso. Toque na tradução, em **Abrir tradução**, no versículo e em **Abrir capítulo** para ler o capítulo com a palavra e o versículo destacados.

Na aba **Bíblia**, depois de escolher uma tradução, a busca acima da lista de livros pesquisa palavras apenas naquela tradução. A lista de livros permanece disponível abaixo. Ambas as buscas funcionam offline quando os JSONs estão armazenados no dispositivo.
