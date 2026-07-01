# decogest

Plataforma SaaS de **gestão imobiliária e rede de investidores** para o mercado português.
Implementação a partir de `decogest_Blueprint_Completo.md`.

> Internamente "SSAS". Três pilares: **Gestão Operacional** · **Contabilidade & Finanças** · **Rede de Investidores** (o diferenciador). Não é uma ferramenta de reservas/booking — é gestão de património.

## Stack

React + Vite · TypeScript · Tailwind CSS · React Router · Recharts · Lucide · Zustand.
(Backend Supabase + integrações Stripe/Claude/DocuSeal/Nuki por ligar — Fase 4.)

## Como correr

```bash
cd decogest-app
npm install      # já feito
npm run dev      # http://localhost:5173
npm run build    # verifica tipos + bundle de produção
```

> O Node.js foi instalado nesta máquina (v24). Se abrir um terminal novo, o `npm` já estará no PATH.

## Design system — paleta "Madeira"

Tokens em `tailwind.config.js` e `src/index.css`. Primária `#5C3D2E`, sidebar `#2E1A0E`, accent `#F5ECD7`, fundo `#FDF8F0`. **Dourado `#C8A664` exclusivo da Comunidade** (+ padrão azulejo + glassmorphism + Playfair editorial). Títulos em `Playfair Display`, corpo em `DM Sans`.

## O que está construído

**Fundação completa e funcional:**
- App shell — sidebar escura com a navegação exata do blueprint (grupo Comunidade com ponto dourado), topbar com breadcrumb, pesquisa **⌘K** (command palette), mensagens e notificações.
- **Motor financeiro** (`src/lib/calc/`) — funções puras, testáveis: tabelas IMT oficiais (HPP/HS), IS, PMT, e os **4 modelos** (Arrendamento, Flip, Cedência, Investidores) + módulo de Avaliação (checklist 15 critérios + comparativo). Formatação PT.
- Toggle global **"Dados de exemplo"** (estado vazio ↔ populado).

**Páginas-bandeira (ligadas a dados de exemplo):**
- **Dashboard** — KPIs, ações rápidas, gráfico receita/despesa, alertas, próximos vencimentos, donut de ocupação.
- **Os meus imóveis** (lista com filtros) + **Detalhe do imóvel** com o bloco **"Situação Financeira"** (veredito num relance 🟢🟡🔴) e tab Finanças (deep dive).
- **Calculadora de Rentabilidade** — 4 modos com recálculo em tempo real, **veredito-herói + gauge** vs média de mercado, cashflow a 10 anos.
- **Rede de Investidores** — hero imersivo premium, cards com **métricas type-aware** (Arrendamento/Flip/Cedência/Parceiro) e track record do autor.
- **Gestão Colaborativa** + **Project Room** — dashboard financeiro de parceria (resumo executivo de 9 cards, distribuição por sócios, gráficos orçamento/categorias/composição).
- **Estudantes** — quartos académicos.

**Especificadas como placeholder informativo** (cada uma descreve o que vem do blueprint e em que fase liga ao backend): Acesso Digital, Inquilinos, Calendário do Investimento, Contabilidade, Recibos, Balanço/IRS, Pasta Digital, Contratos Inteligentes, Manutenção, Mensagens, Assistente IA, Gestão de Obras (centro de comando) e Galeria antes/depois.

## Estrutura

```
src/
  lib/calc/        motor financeiro (imt, models, avaliacao)
  lib/             format (PT), property (situação financeira), utils
  components/      ui/ (Button, Card, Badge), layout/ (Sidebar, Topbar, CommandPalette, AppLayout), StatCard, EmptyState, PageHeader
  data/mock.ts     dados de exemplo
  store/           zustand (dados de exemplo)
  pages/           Dashboard, imoveis/, comunidade/, financas/, pessoas/, Placeholder
```

## Próximos passos sugeridos

1. Ligar o Supabase (Auth + schema da secção 5 do blueprint + RLS `is_project_member`).
2. Construir as páginas placeholder por ordem de fase (Fase 1 operacional → Fase 2 Rede → Fase 3 Colaboração).
3. Modais globais via `useModalStore` (PropertyForm, ContractForm wizard, ExpenseForm, etc.).
4. Integrações (Stripe MB WAY, Claude via Edge Function, DocuSeal, Nuki).
