# Bíblia Comparada

Aplicativo para leitura e comparação de traduções bíblicas, com **ARC** como referência.

## Traduções disponíveis

ARC, AA, RC69, BPT09 e NVI2011. As demais traduções do catálogo aparecem como indisponíveis até que seus arquivos sejam adicionados.

## Como usar

Escolha **Ler** para selecionar uma tradução, livro e capítulo. Escolha **Comparar** para selecionar livro, capítulo e versículo; no **Catálogo**, marque quais traduções deseja comparar.

A comparação usa a mesma posição de versículo quando o capítulo tem a mesma quantidade de versículos da ARC. Quando as divisões diferem, a comparação é ocultada. **Não há mapeamentos de versículos.**

## Publicação

Envie todos os arquivos e pastas para a raiz de um repositório GitHub Pages e ative Pages nas configurações do repositório.

## Arquivos

- `data/ARC.json`: tradução de referência.
- `data/AA.json`, `data/RC69.json`, `data/BPT09.json`, `data/NVI2011.json`: traduções incluídas.
- `app.js`: aplicativo; `sw.js`: cache offline.
