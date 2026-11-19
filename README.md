# Controle de gastos

Aplicação simples em React + Vite para registrar despesas, acompanhar o total,
excluir lançamentos e manter os dados salvos no `localStorage` do navegador.
Não usa backend nem dependências além do React e do Vite.

## Funcionalidades

- Formulário com descrição, valor e categoria, com validação dos campos.
- Listagem dos gastos registrados e total em reais.
- Exclusão individual de gastos.
- Persistência automática no `localStorage` (chave `controle-gastos:v1`).
- Layout responsivo para computador e celular.

## Comandos

```bash
npm install
npm run dev
npm run build
```

O valor aceita formatos como `12,50`, `1234.56` e `1.234,56`.
