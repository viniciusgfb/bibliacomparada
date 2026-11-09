# Bíblia Comparada — versão 0.1

Aplicativo web progressivo (PWA) para celular, com aparência preta, cinza e lilás.

## Como executar

1. Extraia o ZIP.
2. No terminal, entre na pasta `biblia-comparada`.
3. Execute `python -m http.server 8000`.
4. Abra `http://localhost:8000` no navegador do computador.

Para usar no iPhone ou Android, publique esta pasta em uma hospedagem HTTPS (por exemplo, Netlify ou GitHub Pages). Em Android, abra no Chrome e escolha **Instalar aplicativo**. Em iPhone, abra no Safari e escolha **Compartilhar > Adicionar à Tela de Início**.

## Incluído

- Arquivo ARC.json original fornecido, com 66 livros, 1.189 capítulos e 31.105 versículos.
- Leitura integral por tradução, livro e capítulo.
- Comparação por livro, capítulo e versículo.
- Navegação sequencial por setas.
- Catálogo com 18 traduções e seus metadados.
- Importação local de JSON pelo navegador, persistida em IndexedDB.
- Manifest, ícones e cache offline dos arquivos iniciais.

## Formato dos arquivos adicionais

Cada arquivo deve ter o nome da sigla, como `NVI.json`, e seguir o mesmo formato da ARC:

```json
[{"abbrev":"Gn","name":"Gênesis","chapters":[["Versículo 1","Versículo 2"]]}]
```

O arquivo completo precisa conter 66 livros na mesma ordem e quantidade de capítulos da ARC. A importação valida a estrutura, mas **não** garante equivalência textual de numeração entre traduções. Para casos de versificação diferente, será necessário um mapeamento editorial de referências. Traduções protegidas por direitos autorais só devem ser distribuídas mediante licença ou autorização.

## Limitações

- Apenas a ARC está incluída inicialmente.
- A comparação exibe as traduções efetivamente importadas, começando com ARC.
- Os dados importados ficam apenas no navegador/dispositivo, sem sincronização.
- A primeira versão não tem painel de administração remoto.
