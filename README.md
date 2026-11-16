# Bíblia Comparada

Aplicativo PWA para leitura, comparação e pesquisa de traduções bíblicas.

## Instalação
Publique os arquivos no GitHub Pages. O aplicativo instala somente a interface e a ARC inicialmente.

## Traduções
Na aba **Traduções**, escolha **Disponíveis** e toque em **Baixar** para armazenar uma tradução offline. Em **Baixadas**, marque quais deseja usar em comparação e pesquisa. A aba Bíblia exibe apenas traduções armazenadas, com um botão + para adicionar outras.

A ARC é a tradução inicial. As demais são opcionais. A cruz (✝) identifica exclusivamente AVM, MATOS e PASTORAL.

## Armazenamento e manutenção
Na aba Traduções, expanda **Armazenamento e manutenção** para solicitar armazenamento persistente (sujeito à autorização do navegador) ou **Restaurar aplicativo e limpar todos os dados**. A restauração exige duas confirmações, remove traduções armazenadas, caches e preferências, desregistra o service worker e reinicia o aplicativo. É necessária internet para baixar novamente a ARC.

O navegador ainda pode excluir dados em certas condições. Após publicar atualizações, feche e reabra o aplicativo para receber a versão mais recente.

## Estrutura
`app.js`, `sw.js`, `style.css`, `index.html`, `manifest.webmanifest`, `icons/` e `data/CODIGO.json`. Os JSONs adicionais precisam existir no GitHub para poderem ser baixados. A comparação não faz mapeamento de versículos com divisões diferentes.
