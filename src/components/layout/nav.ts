import {
  LayoutDashboard,
  Building2,
  Network,
  Users2,
  Hammer,
  Images,
  User,
  GraduationCap,
  CalendarClock,
  Calculator,
  Wallet,
  FileBarChart,
  FolderOpen,
  FileSignature,
  Wrench,
  MessageSquare,
  Bot,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
  children?: { label: string; to: string }[];
}

export interface NavGroup {
  label: string;
  gold?: boolean;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Visão geral",
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }],
  },
  {
    label: "Imóveis",
    items: [
      { label: "Os meus imóveis", to: "/imoveis", icon: Building2 },
    ],
  },
  {
    label: "Comunidade",
    gold: true,
    items: [
      { label: "Mensagens", to: "/mensagens", icon: MessageSquare },
      { label: "Rede de Investidores", to: "/comunidade/rede", icon: Network },
      {
        label: "Gestão Colaborativa",
        to: "/comunidade/colaborativa",
        icon: Users2,
        children: [
          { label: "Gestão", to: "/comunidade/colaborativa" },
          { label: "Gestão de Obras", to: "/comunidade/colaborativa/obras" },
          { label: "Galeria antes/depois", to: "/comunidade/colaborativa/galeria" },
        ],
      },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { label: "Inquilinos", to: "/pessoas/inquilinos", icon: User },
      { label: "Estudantes", to: "/pessoas/estudantes", icon: GraduationCap },
    ],
  },
  {
    label: "Finanças",
    items: [
      { label: "Calendário do Investimento", to: "/financas/calendario-investimento", icon: CalendarClock },
      { label: "Calculadora de Rentabilidade", to: "/financas/calculadora-rentabilidade", icon: Calculator },
      { label: "Contabilidade", to: "/financas/contabilidade", icon: Wallet },
      { label: "Balanço / IRS", to: "/financas/balanco-irs", icon: FileBarChart },
    ],
  },
  {
    label: "Documentos",
    items: [
      { label: "Pasta Digital", to: "/documentos", icon: FolderOpen },
    ],
  },
  {
    label: "Manutenção",
    items: [
      { label: "Manutenção", to: "/manutencao", icon: Wrench },
    ],
  },
  {
    label: "IA",
    items: [{ label: "Assistente IA", to: "/ia", icon: Bot }],
  },
];
