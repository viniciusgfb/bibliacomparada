# Bíblia Comparada — versão corrigida para GitHub Pages

Este projeto funciona como **site comum** no navegador de qualquer visitante. Instalar na tela inicial é **opcional**. Não há importação de traduções pelo visitante, banco de dados remoto, IndexedDB ou necessidade de login.

## Publicar no GitHub Pages

1. Copie **o conteúdo desta pasta**, e não a pasta externa, para a raiz do repositório publicado pelo Pages. A raiz precisa conter `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, `icons/` e `data/`.
2. Em **Settings > Pages**, configure a publicação para a branch e a pasta onde estão esses arquivos (por exemplo `main` e `/ (root)`).
3. Aguarde a publicação e abra o endereço HTTPS fornecido pelo GitHub Pages. O app abre diretamente no navegador sem precisar ser instalado.
4. Para adicionar traduções, envie arquivos `ACF.json`, `ARA.json`, `NVI.json`, etc. à pasta `data/`, com **sigla em letras maiúsculas**. Não é necessário editar `app.js` nem criar um arquivo de índice.
5. Depois do upload, aguarde a atualização do Pages e recarregue a página. O navegador verifica a existência dos arquivos com requisições HEAD e baixa o conteúdo somente quando necessário.

## Estrutura

```text
index.html
app.js
style.css
sw.js
manifest.webmanifest
icons/
  icon.svg
  icon-192.png
  icon-512.png
data/
  ARC.json
  ARA.json     (adicione quando tiver)
  NVI.json     (adicione quando tiver)
  ...
```

## Regras dos arquivos

Os arquivos JSON precisam ter a estrutura de `ARC.json`: um array com 66 livros na ordem tradicional, cada livro contendo `abbrev`, `name` e `chapters`. Cada capítulo é um array de strings, uma string por versículo. O aplicativo verifica a estrutura e as abreviações dos livros; não aceita arquivos com livros ou capítulos faltando.

A referência bíblica exibida começa em **1**; os índices internos começam em 0. Na comparação, se o capítulo de outra tradução tiver quantidade diferente de versículos, o aplicativo **não exibe uma correspondência possivelmente errada**. Mesmo com quantidades iguais, diferenças editoriais de versificação podem exigir um mapeamento adicional no futuro.

## Seleção de traduções para comparação

Na página **Catálogo**, todas as traduções começam marcadas para comparação. Cada visitante pode desmarcar ou marcar as traduções individualmente ou usar **Marcar todas** / **Desmarcar todas**. A escolha é armazenada no `localStorage` do próprio navegador, sem login e sem alterar as escolhas de outras pessoas. Traduções não publicadas não são exibidas na comparação, mesmo quando marcadas. A seleção não afeta a leitura individual.

A tradução MENS foi removida do catálogo e não é carregada pelo aplicativo. Exclua `data/MENS.json` do repositório se ele estiver publicado.

## O que foi corrigido

- Removida a importação manual e toda a dependência de IndexedDB.
- Detecção de JSONs publicados na pasta `data/` para todos os usuários.
- Separação explícita entre modo de leitura e modo de comparação.
- Navegação Voltar compatível com o botão do aplicativo e o histórico do navegador.
- Leitura da tradução selecionada (não apenas da ARC).
- Comparação com validação de capítulos e sem assumir texto de outra referência.
- Service worker com preferência por dados novos da rede e cache de apoio offline.
- Arquivos e caminhos relativos, compatíveis com repositórios publicados em subpastas no GitHub Pages.

## Limitações

- O catálogo possui 17 traduções, mas somente `ARC.json` está incluído no pacote. Os outros textos devem ser adicionados por você.
- Se publicar muitos arquivos JSON grandes, a primeira comparação pode consumir bastante internet e levar alguns segundos, porque baixa os arquivos das traduções disponíveis.
- O GitHub Pages não fornece uma API de listagem da pasta; por isso o aplicativo procura os nomes das **17 siglas cadastradas**. Novas siglas além dessas exigem cadastrá-las no array `translations` em `app.js`.
- As diferenças de numeração entre traduções precisam ser revisadas caso a caso.
- Confirme que possui direitos para disponibilizar publicamente cada tradução protegida.

## Atualização em aparelhos que já abriram a versão antiga

O novo service worker usa cache `biblia-comparada-v5-selecao` e prioriza a rede. Se alguém ainda vir a interface antiga, feche e abra novamente a página, atualize e, se necessário, limpe os dados do site no navegador.

## Teste local

```bash
python -m http.server 8000
```

Abra `http://localhost:8000`. Não abra `index.html` diretamente com `file://`, pois o carregamento dos arquivos JSON exige HTTP(S).
