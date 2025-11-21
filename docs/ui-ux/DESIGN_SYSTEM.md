# Design System – WhatsSelf (MVP)

Tokens e diretrizes para garantir consistência visual e acessibilidade. Base: Tailwind (UI escura).

## Cores (tokens)
- Fundo: `bg-gray-900`, superfícies `bg-gray-800`, borda `border-gray-700`
- Texto: primário `text-white`, secundário `text-gray-300/400`, meta `text-gray-500`
- Ação primária: `bg-green-600` hover `bg-green-700`
- Info: `text-blue-400`; Suporte/roxo: `text-purple-400`
- Estados: sucesso `green`, aviso `yellow`, erro `red`
- Badges (StatusBadge):
  - online: fundo `green-100` texto `green-800` borda `green-200`
  - offline: `gray-100/800/200`
  - connecting: `yellow-100/800/200`
  - error: `red-100/800/200`

## Tipografia
- Fonte: sistema/Inter.
- Títulos: 24–32px (Dashboard/Headers)
- Corpo: 14–16px; meta 12–13px
- Peso: 400/500/700 conforme hierarquia

## Espaçamento e raios
- Grid base 4px; espaçamentos comuns: 8/12/16/24/32
- Raio: `rounded-lg` em cartões, `rounded-full` em chips/badges

## Ícones e tamanhos
- Lucide: 20–32px; cor acompanhando contexto (ex.: `text-green-400`)

## Foco e acessibilidade
- Focus: ring visível (ex.: `focus:outline-none focus:ring-2 focus:ring-green-500`)
- Contraste mínimo AA
- Textos claros; sem depender apenas de cor

## Componentes base
- Card: `bg-gray-800 border border-gray-700 rounded-lg p-6`
- Botão primário: `bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2`
- Input: `bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400`
- Tabela/lista: divisores `divide-gray-700`, hover `hover:bg-gray-750`

## Estados padrão
- Loading: skeleton (blocos cinza com animação leve)
- Empty: ícone + texto + CTA
- Error: banner com contexto + ação

## Escrita
- Português do Brasil
- Mensagens curtas; labels consistentes (“Gatilhos”, “Fluxos”, “QR Code”, “Contatos”)

