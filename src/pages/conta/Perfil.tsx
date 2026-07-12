import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  BadgeCheck,
  UserRound,
  Mail,
  MapPin,
  Landmark,
  Receipt,
  Calculator,
  Pencil,
  ArrowRight,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, SectionCard, inputCls } from "@/components/conta/ContaUI";
import { UnlockButton } from "@/components/UnlockGate";
import {
  useAccountStore,
  PLANOS,
  type RegimeFiscal,
  type EstadoVerificacao,
} from "@/store/useAccountStore";
import { useCurrentUser } from "@/store/useProfilesStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useContractsStore, statusEfetivo } from "@/store/useContractsStore";
import { useCollabStore } from "@/store/useCollabStore";
import { dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

const REGIME_LABEL: Record<RegimeFiscal, string> = {
  categoria_F: "Categoria F (predial)",
  atividade_aberta: "Atividade aberta",
  empresa: "Empresa",
};

function diasAte(iso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - hoje.getTime()) / 86400000);
}

export default function Perfil() {
  const privado = useAccountStore((s) => s.privado);
  const plano = useAccountStore((s) => s.plano);
  const verificacao = useAccountStore((s) => s.verificacao);
  const updatePrivado = useAccountStore((s) => s.updatePrivado);
  const updateVerificacao = useAccountStore((s) => s.updateVerificacao);
  const me = useCurrentUser();
  const navigate = useNavigate();

  const nImoveis = usePropertiesStore((s) => s.properties.length);
  const nContratos = useContractsStore((s) => s.contracts.filter((c) => ["active", "expiring"].includes(statusEfetivo(c))).length);
  const nProjetos = useCollabStore((s) => s.projects.length);

  const [p, setP] = useState(privado);
  const [dirty, setDirty] = useState(false);
  const [showIban, setShowIban] = useState(false);
  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const ccDias = useMemo(() => diasAte(p.ccValidade), [p.ccValidade]);
  const planoInfo = PLANOS[plano.atual];

  const guardar = () => {
    updatePrivado(p);
    setDirty(false);
    toast.success("Dados privados atualizados ✨");
  };

  const ibanMasked = showIban ? p.iban : p.iban.replace(/\w(?=\w{4})/g, "•");

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-2xl font-bold text-white">
          {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" /> : p.nomeCompleto.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{p.nomeCompleto}</h1>
            <Badge tone="gold">Plano {planoInfo.nome}</Badge>
            {verificacao.is_verified ? (
              <Badge tone="success"><BadgeCheck size={12} /> Verificado</Badge>
            ) : (
              <Badge tone="warning">Por verificar</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Senhorio desde {me?.createdAt ? dataPT(me.createdAt) : "2024"}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span><span className="num font-semibold text-ink">{nImoveis}</span> imóveis</span>
            <span><span className="num font-semibold text-ink">{nContratos}</span> contratos ativos</span>
            <span><span className="num font-semibold text-ink">{nProjetos}</span> projetos colaborativos</span>
          </div>
        </div>
      </div>

      {/* Banner verificação */}
      {!verificacao.is_verified && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gold/30 bg-gold/8 p-4 sm:flex-row sm:items-center">
          <ShieldAlert size={22} className="shrink-0 text-gold-dark" />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">Verifique a sua identidade</p>
            <p className="text-xs text-muted">Receba o selo ✔ Verificado na Rede e desbloqueie pagamentos.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ───────── A) DADOS PRIVADOS ───────── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-lg bg-accent/60 px-3 py-2 text-sm text-secondary">
            <Lock size={15} /> <span className="font-medium">Dados privados</span>
            <span className="text-muted">· Visível apenas para si</span>
          </div>

          {/* Identificação */}
          <SectionCard title="Identificação" icon={UserRound}>
            {Number.isFinite(ccDias) && ccDias < 90 && p.ccValidade && (
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs text-warning">
                  <AlertTriangle size={12} /> CC expira em {ccDias}d
                </span>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome completo (opcional)" className="sm:col-span-2">
                <input value={p.nomeCompleto} onChange={(e) => set("nomeCompleto", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Data de nascimento (opcional)">
                <input type="date" value={p.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} className={inputCls} />
              </Field>
              <Field label="NIF (opcional)" hint="🔒 Aparece apenas nos contratos. Nunca partilhamos.">
                <input value={p.nif} onChange={(e) => set("nif", e.target.value)} className={inputCls} />
                <Nec>Necessário para Contratos PDF</Nec>
              </Field>
              <Field label="Cartão de Cidadão (opcional)" hint="🔒 Apenas para verificação. Eliminado após validação.">
                <input value={p.cc} onChange={(e) => set("cc", e.target.value)} className={inputCls} />
                <Nec>Necessário para Verificação ✔</Nec>
              </Field>
              <Field label="Validade do CC (opcional)">
                <input type="date" value={p.ccValidade} onChange={(e) => set("ccValidade", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </SectionCard>

          {/* Contacto */}
          <SectionCard title="Contacto" icon={Mail}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email" className="sm:col-span-2">
                <div className="flex gap-2">
                  <input value={p.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
                  <Button variant="outline" size="sm" onClick={() => toast.success("Email de verificação enviado")}>Verificar</Button>
                </div>
              </Field>
              <Field label="Telefone">
                <input value={p.telefone} onChange={(e) => set("telefone", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Telefone alternativo">
                <input value={p.telefoneAlt} onChange={(e) => set("telefoneAlt", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </SectionCard>

          {/* Morada fiscal */}
          <SectionCard title="Morada fiscal" icon={MapPin}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Morada (opcional)" hint="🔒 Aparece nos contratos e na fatura do redegest (RGPD)." className="sm:col-span-2">
                <input value={p.moradaFiscal} onChange={(e) => set("moradaFiscal", e.target.value)} className={inputCls} />
                <Nec>Necessário para Contratos PDF</Nec>
              </Field>
              <Field label="Código postal">
                <input value={p.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Cidade">
                <input value={p.cidade} onChange={(e) => set("cidade", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Distrito" className="sm:col-span-2">
                <input value={p.distrito} onChange={(e) => set("distrito", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </SectionCard>

          {/* Dados bancários */}
          <SectionCard title="Dados bancários" icon={Landmark}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="IBAN (opcional)" hint="🔒 Apenas para constar nos contratos. Não fazemos cobranças." className="sm:col-span-2">
                <div className="flex gap-2">
                  <input value={showIban ? p.iban : ibanMasked} onChange={(e) => set("iban", e.target.value)} readOnly={!showIban} className={cn(inputCls, !showIban && "tracking-wide")} />
                  <Button variant="outline" size="sm" onClick={() => setShowIban((v) => !v)}>
                    {showIban ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                </div>
                <Nec>Necessário para Contratos PDF</Nec>
              </Field>
              <Field label="Banco">
                <input value={p.bancoNome} onChange={(e) => set("bancoNome", e.target.value)} className={inputCls} />
              </Field>
              <Field label="BIC / SWIFT">
                <input value={p.bicSwift} onChange={(e) => set("bicSwift", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
              <Receipt size={12} /> Estes dados aparecem automaticamente nos contratos PDF.
            </p>
          </SectionCard>

          {/* Regime fiscal */}
          <SectionCard title="Regime fiscal" icon={Calculator}>
            <Field label="Regime">
              <select value={p.regimeFiscal} onChange={(e) => set("regimeFiscal", e.target.value as RegimeFiscal)} className={inputCls}>
                {(Object.keys(REGIME_LABEL) as RegimeFiscal[]).map((r) => (
                  <option key={r} value={r}>{REGIME_LABEL[r]}</option>
                ))}
              </select>
            </Field>
            {p.regimeFiscal === "empresa" && (
              <Field label="NIPC" className="mt-3">
                <input value={p.nipc ?? ""} onChange={(e) => set("nipc", e.target.value)} className={inputCls} />
              </Field>
            )}
            {p.regimeFiscal === "atividade_aberta" && (
              <p className="mt-3 rounded-lg bg-accent/60 px-3 py-2 text-xs text-secondary">
                Taxa autónoma de 28% — pode optar pelo englobamento no IRS.
              </p>
            )}
          </SectionCard>

          {/* Contabilista */}
          <SectionCard title="Contabilista (opcional)" icon={UserRound} desc="Adicionar permite partilhar relatórios diretamente.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome">
                <input value={p.contabilistaNome ?? ""} onChange={(e) => set("contabilistaNome", e.target.value)} className={inputCls} />
              </Field>
              <Field label="NIF">
                <input value={p.contabilistaNif ?? ""} onChange={(e) => set("contabilistaNif", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <input value={p.contabilistaEmail ?? ""} onChange={(e) => set("contabilistaEmail", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* ───────── B) PERFIL PÚBLICO + C) VERIFICAÇÃO ───────── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-lg bg-accent/60 px-3 py-2 text-sm text-secondary">
            <Eye size={15} /> <span className="font-medium">Perfil público</span>
            <span className="text-muted">· Visível na Rede de Investidores</span>
          </div>

          <SectionCard title="Como o seu perfil aparece na Rede" icon={UserRound}
            badge={<Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate("/comunidade/rede/perfil/editar")}><Pencil size={13} /> Editar</Button>}
          >
            {me && (
              <div className="overflow-hidden rounded-xl border border-line">
                <div className="h-20 bg-accent">
                  {me.coverUrl && <img src={me.coverUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="-mt-8 px-4 pb-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-card bg-accent">
                    {me.avatarUrl ? <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xl text-muted">{me.fullName[0]}</div>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="font-display text-lg font-semibold text-ink">{me.fullName}</p>
                    {me.isVerified && <BadgeCheck size={15} className="text-success" />}
                    {me.availableForPartnership && <Badge tone="success">Disponível p/ parceria</Badge>}
                  </div>
                  <p className="text-sm text-secondary">{me.tagline}</p>
                  <p className="mt-1 text-xs text-muted">{me.city}</p>
                  {me.interesses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {me.interesses.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                    </div>
                  )}
                </div>
              </div>
            )}
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate(`/comunidade/rede/${me?.id ?? ""}`)}>
              Ver perfil público <ArrowRight size={13} />
            </Button>
          </SectionCard>

          {/* C) Verificação */}
          <SectionCard title="Verificação de identidade" icon={ShieldCheck}>
            <div className="space-y-2">
              <VerifStep n={1} label="Confirmar NIF" estado={verificacao.nif_validado} />
              <VerifStep n={2} label="Carregar CC (frente + verso)" estado={verificacao.doc_validado} />
              <VerifStep n={3} label="Selfie de verificação" estado="nao_iniciado" futuro />
              <VerifStep n={4} label="Validação final" estado={verificacao.is_verified ? "aprovado" : "nao_iniciado"} />
            </div>
            {!verificacao.is_verified && verificacao.nif_validado !== "em_revisao" && (
              <div className="mt-4">
                <UnlockButton
                  campos={["nif", "cc"]}
                  feature="pedir a verificação ✔"
                  explicacao="A verificação dá-lhe o selo ✔ Verificado na Rede e desbloqueia pagamentos. É opcional."
                  variant="gold"
                  size="sm"
                  onReady={() => { updateVerificacao({ nif_validado: "em_revisao", doc_validado: "em_revisao" }); toast.success("Pedido de verificação enviado — em revisão"); }}
                >
                  Pedir verificação ✔
                </UnlockButton>
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted">KYC completo chega na Fase 4. A verificação é opcional — é uma vantagem, não uma barreira.</p>
          </SectionCard>
        </div>
      </div>

      {/* Barra guardar (privado) */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
            <span className="text-sm text-muted">Tem alterações por guardar nos dados privados.</span>
            <Button variant="gold" onClick={guardar}><Save size={15} /> Guardar alterações</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Chip discreto "Necessário para …" — substitui asteriscos vermelhos por contexto de valor. */
function Nec({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold/12 px-2 py-0.5 text-[10px] font-medium text-gold-dark">
      <Lock size={9} /> {children}
    </span>
  );
}

function VerifStep({ n, label, estado, futuro }: { n: number; label: string; estado: EstadoVerificacao; futuro?: boolean }) {
  const conf = {
    aprovado: { icon: CheckCircle2, tone: "text-success", txt: "Aprovado" },
    em_revisao: { icon: Clock, tone: "text-warning", txt: "Em revisão" },
    rejeitado: { icon: AlertTriangle, tone: "text-danger", txt: "Rejeitado" },
    nao_iniciado: { icon: Circle, tone: "text-muted", txt: futuro ? "Em breve" : "Não iniciado" },
  }[estado];
  const Icon = conf.icon;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line/70 bg-bg/30 px-3 py-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-secondary">{n}</span>
      <span className="flex-1 text-sm text-ink">{label}</span>
      <span className={cn("flex items-center gap-1.5 text-xs font-medium", conf.tone)}>
        <Icon size={14} /> {conf.txt}
      </span>
    </div>
  );
}
