# Especificação de Componentes – WhatsSelf

Componentes base do painel, com comportamento e estados.

## Layout (Sidebar + Main)
- Sidebar lateral com navegação e estado ativo (verde quando ativo).
- Conteúdo principal com `p-8` e cartões.
- Acessibilidade: links navegáveis por teclado; foco visível.

## StatusBadge
- Props: `status: 'online'|'offline'|'connecting'|'error'`, children (label)
- Semântica por cor e rótulo; dot color animado em `connecting`.
- Uso em Dashboard, QR, listas.

## MetricCard
- Props: `title`, `value`, `change?`, `changeType? ('positive'|'negative'|'neutral')`, `icon?`, `description?`
- Mostrar `change` colorido por tipo; ícone opcional.

## Listas/Tabelas
- Divisores com `divide-y divide-gray-700`.
- Hover sutil `hover:bg-gray-750`.
- Empty state com ícone e instrução.

## Filtros e Busca
- Inputs com `bg-gray-700` e borda `gray-600`; placeholder `gray-400`.
- Icone leading em busca (Search) e select (Filter + select nativo estilizado).

## Botões
- Primário: verde; secundário: cinza; destrutivo: vermelho.
- Estados: hover, disabled, loading (spinner em ícone opcional).

## Feedback
- Banners de sucesso/erro/aviso; toasts (futuro).
- Campos com validação inline.

## Padrões
- Consistência de espaçamento, raio, borda e tipografia (ver Design System).
- Evitar sobrecarregar telas: dividir em cartões; títulos e descrições breves.

