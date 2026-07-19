import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Percent,
  FileText,
} from "lucide-react";
import {
  useObrasStore,
  totaisObra,
  avisoElegibilidadeIva,
  subtotalMaoDeObra,
  subtotalMaterial,
  precoDesatualizado,
  ESPECIALIDADE_MO_LABEL,
  MODALIDADE_MO_LABEL,
  UNIDADE_LABEL,
  EQUIPAMENTO_LABEL,
  LICENCIAMENTO_LABEL,
  ESTADO_PROCESSO_LABEL,
  PROJETO_ESP_LABEL,
  ESPECIALIDADES_SUGERIDAS,
  MATERIAIS_SUGERIDOS,
  type Obra,
  type MaoDeObraItem,
  type MaterialItem,
  type EquipamentoItem,
  type ProjetoHonorario,
  type EspecialidadeMO,
  type ModalidadeMO,
  type UnidadeMaterial,
  type TipoEquipamento,
  type TipoLicenciamento,
  type EstadoProcesso,
  type TipoProjetoEsp,
  type IvaJustificacao,
} from "@/store/useObrasStore";
import { MoneyBox } from "@/components/ui/MoneyField";
import { eur } from "@/lib/format";
import { cn } from "@/lib/utils";

// "Ver orçamento detalhado" — dado rico, interface burra: cada bloco é uma
// secção colapsada que o gestor abre se quiser. À medida que preenche, o
// ORÇAMENTO TOTAL recalcula-se (o store escreve obra.orcamento).

function uid(p = "i"): string {
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const inp = "h-11 rounded-lg border border-line bg-card px-2.5 text-base outline-none focus:border-secondary disabled:opacity-60";

export function OrcamentoDetalhado({ obra, souGestor }: { obra: Obra; souGestor: boolean }) {
  const despesas = useObrasStore((s) => s.despesas);
  const updateDetalhe = useObrasStore((s) => s.updateDetalhe);
  const [aberto, setAberto] = useState(false);
  const t = totaisObra(obra, despesas);

  const patch = (p: Partial<Obra>) => {
    if (!souGestor) return;
    updateDetalhe(obra.id, p);
  };

  return (
    <div className="rounded-2xl border border-line bg-card">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-base font-semibold text-ink">
          {t.temDetalhe ? "Ver orçamento detalhado" : souGestor ? "Quer detalhar o orçamento?" : "Orçamento detalhado"}
        </span>
        <span className="flex items-center gap-3">
          {t.temDetalhe && <span className="num text-base font-bold text-gold-dark">{eur(t.orcamentoTotal)}</span>}
          <ChevronDown size={18} className={cn("text-muted transition-transform", aberto && "rotate-180")} />
        </span>
      </button>

      {aberto && (
        <div className="space-y-3 border-t border-line p-4 animate-fade-in">
          {!t.temDetalhe && (
            <p className="rounded-xl bg-accent/60 px-3 py-2.5 text-sm text-secondary">
              Preencha só o que quiser — o total recalcula-se sozinho. Sem detalhe, vale o orçamento simples ({eur(obra.orcamento)}).
            </p>
          )}

          <SecaoMaoDeObra obra={obra} souGestor={souGestor} patch={patch} />
          <SecaoMateriais obra={obra} souGestor={souGestor} patch={patch} pctMateriais={t.pctMateriais} />
          <SecaoEquipamentos obra={obra} souGestor={souGestor} patch={patch} />
          <SecaoLicencas obra={obra} souGestor={souGestor} patch={patch} />
          <SecaoProjetos obra={obra} souGestor={souGestor} patch={patch} />
          <SecaoSeguros obra={obra} souGestor={souGestor} patch={patch} />
          <SecaoFiscalCso obra={obra} souGestor={souGestor} patch={patch} />
          <SecaoIva obra={obra} souGestor={souGestor} patch={patch} />
          <SecaoContingencia obra={obra} souGestor={souGestor} patch={patch} />
          <SecaoContrato obra={obra} souGestor={souGestor} patch={patch} />

          {/* Resumo dos totais — sempre no fim, linguagem humana */}
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
            <Linha k="Custos diretos (mão de obra, materiais, equipamentos)" v={eur(t.custosDiretos)} />
            <Linha k="Custos legais (licenças, projetos, seguros)" v={eur(t.custosLegais)} />
            <Linha k="Gestão técnica (fiscal de obra, segurança)" v={eur(t.custosTecnicos)} />
            <div className="my-2 border-t border-gold/30" />
            <Linha k="Subtotal sem IVA" v={eur(t.subtotalSemIva)} forte />
            <Linha k={`IVA ${t.ivaTaxa}%`} v={eur(t.valorIva)} />
            <Linha k={`Contingência ${t.contingenciaPct}%`} v={eur(t.contingenciaValor)} />
            <div className="my-2 border-t border-gold/30" />
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-ink">Orçamento total</span>
              <span className="num font-display text-[28px] font-bold text-gold-dark">{eur(t.orcamentoTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ k, v, forte }: { k: string; v: string; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-sm", forte ? "font-semibold text-ink" : "text-muted")}>{k}</span>
      <span className={cn("num text-base", forte ? "font-bold text-ink" : "font-semibold text-ink")}>{v}</span>
    </div>
  );
}

/** Secção colapsável de um bloco de custos. */
function Bloco({
  titulo,
  valor,
  children,
  defaultOpen,
}: {
  titulo: string;
  valor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-xl border border-line/70 bg-bg/40">
      <button onClick={() => setOpen((v) => !v)} className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="text-base font-medium text-ink">{titulo}</span>
        <span className="flex items-center gap-2">
          {valor && <span className="num text-sm font-semibold text-secondary">{valor}</span>}
          <ChevronDown size={16} className={cn("text-muted transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && <div className="space-y-2 border-t border-line/60 p-3 animate-fade-in">{children}</div>}
    </div>
  );
}

// ───────── Mão de obra ─────────

function SecaoMaoDeObra({ obra, souGestor, patch }: { obra: Obra; souGestor: boolean; patch: (p: Partial<Obra>) => void }) {
  const itens = obra.maoDeObra ?? [];
  const total = itens.reduce((s, i) => s + subtotalMaoDeObra(i), 0);
  const sugeridas = ESPECIALIDADES_SUGERIDAS[obra.categoria].filter((e) => !itens.some((i) => i.especialidade === e));

  const setItem = (id: string, p: Partial<MaoDeObraItem>) =>
    patch({ maoDeObra: itens.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const add = (esp: EspecialidadeMO) =>
    patch({ maoDeObra: [...itens, { id: uid("mo"), especialidade: esp, modalidade: "empreitada_fechada" }] });
  const remove = (id: string) => patch({ maoDeObra: itens.filter((i) => i.id !== id) });

  return (
    <Bloco titulo="Mão de obra" valor={total > 0 ? eur(total) : undefined}>
      {itens.map((i) => (
        <div key={i.id} className="grid grid-cols-2 items-center gap-2 rounded-lg border border-line/60 bg-card p-2.5 sm:grid-cols-[1.2fr_1.2fr_1fr_auto]">
          <select
            value={i.especialidade}
            disabled={!souGestor}
            onChange={(e) => setItem(i.id, { especialidade: e.target.value as EspecialidadeMO })}
            className={inp}
          >
            {(Object.keys(ESPECIALIDADE_MO_LABEL) as EspecialidadeMO[]).map((k) => (
              <option key={k} value={k}>{ESPECIALIDADE_MO_LABEL[k]}</option>
            ))}
          </select>
          <select
            value={i.modalidade}
            disabled={!souGestor}
            onChange={(e) => setItem(i.id, { modalidade: e.target.value as ModalidadeMO })}
            className={inp}
          >
            {(Object.keys(MODALIDADE_MO_LABEL) as ModalidadeMO[]).map((k) => (
              <option key={k} value={k}>{MODALIDADE_MO_LABEL[k]}</option>
            ))}
          </select>
          {i.modalidade === "empreitada_fechada" ? (
            <MoneyBox value={i.valorFechado} onChange={(n) => setItem(i.id, { valorFechado: n })} disabled={!souGestor} />
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={i.valorHora ?? ""}
                disabled={!souGestor}
                onChange={(e) => setItem(i.id, { valorHora: Number(e.target.value) || undefined })}
                placeholder={i.modalidade === "por_dia" ? "€/dia" : "€/h"}
                className={cn(inp, "num w-20")}
              />
              <span className="text-sm text-muted">×</span>
              <input
                type="number"
                value={i.horasPrevistas ?? ""}
                disabled={!souGestor}
                onChange={(e) => setItem(i.id, { horasPrevistas: Number(e.target.value) || undefined })}
                placeholder={i.modalidade === "por_dia" ? "dias" : "horas"}
                className={cn(inp, "num w-20")}
              />
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <span className="num text-base font-semibold text-ink">{eur(subtotalMaoDeObra(i))}</span>
            {souGestor && (
              <button onClick={() => remove(i.id)} className="text-muted hover:text-danger" title="Remover">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
      {souGestor && (
        <div className="flex flex-wrap items-center gap-2">
          {sugeridas.length > 0 && (
            <>
              <Sparkles size={14} className="text-gold-dark" />
              {sugeridas.map((e) => (
                <button
                  key={e}
                  onClick={() => add(e)}
                  className="rounded-full border border-gold/40 bg-gold/8 px-3 py-1.5 text-sm font-medium text-gold-dark hover:bg-gold/15"
                >
                  + {ESPECIALIDADE_MO_LABEL[e]}
                </button>
              ))}
            </>
          )}
          <button onClick={() => add("outros")} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink hover:bg-accent">
            <Plus size={13} className="inline" /> Outra
          </button>
        </div>
      )}
      {itens.length === 0 && !souGestor && <p className="text-sm text-muted">Sem mão de obra detalhada.</p>}
    </Bloco>
  );
}

// ───────── Materiais ─────────

function SecaoMateriais({
  obra,
  souGestor,
  patch,
  pctMateriais,
}: {
  obra: Obra;
  souGestor: boolean;
  patch: (p: Partial<Obra>) => void;
  pctMateriais: number;
}) {
  const itens = obra.materiais ?? [];
  const total = itens.reduce((s, m) => s + subtotalMaterial(m), 0);
  const desatualizados = itens.some(precoDesatualizado);
  const sugeridos = MATERIAIS_SUGERIDOS[obra.categoria].filter((d) => !itens.some((i) => i.descricao.toLowerCase() === d.toLowerCase()));

  const setItem = (id: string, p: Partial<MaterialItem>) =>
    patch({ materiais: itens.map((i) => (i.id === id ? { ...i, ...p, dataPrecoAtualizado: p.precoUnitario != null ? new Date().toISOString().slice(0, 10) : i.dataPrecoAtualizado } : i)) });
  const add = (descricao: string) =>
    patch({
      materiais: [...itens, { id: uid("mat"), descricao, quantidade: 1, unidade: "un", precoUnitario: 0, dataPrecoAtualizado: new Date().toISOString().slice(0, 10) }],
    });
  const remove = (id: string) => patch({ materiais: itens.filter((i) => i.id !== id) });

  return (
    <Bloco titulo="Materiais (mapa de quantidades)" valor={total > 0 ? eur(total) : undefined}>
      {desatualizados && (
        <p className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle size={14} /> Alguns preços têm mais de 60 dias — os preços de materiais podem ter mudado.
        </p>
      )}
      {total > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Percent size={13} /> Materiais = <strong className="num text-ink">{Math.round(pctMateriais)}%</strong> da obra (regra dos 20% para IVA a 6% fora de ARU)
        </p>
      )}
      {itens.map((m) => (
        <div key={m.id} className="grid grid-cols-2 items-center gap-2 rounded-lg border border-line/60 bg-card p-2.5 sm:grid-cols-[1.4fr_auto_auto_1fr_auto]">
          <input
            value={m.descricao}
            disabled={!souGestor}
            onChange={(e) => setItem(m.id, { descricao: e.target.value })}
            placeholder="Material"
            className={inp}
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={m.quantidade || ""}
              disabled={!souGestor}
              onChange={(e) => setItem(m.id, { quantidade: Number(e.target.value) || 0 })}
              className={cn(inp, "num w-16 text-center")}
            />
            <select
              value={m.unidade}
              disabled={!souGestor}
              onChange={(e) => setItem(m.id, { unidade: e.target.value as UnidadeMaterial })}
              className={cn(inp, "w-[70px]")}
            >
              {(Object.keys(UNIDADE_LABEL) as UnidadeMaterial[]).map((u) => (
                <option key={u} value={u}>{UNIDADE_LABEL[u]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted">×</span>
            <input
              type="number"
              step="0.01"
              value={m.precoUnitario || ""}
              disabled={!souGestor}
              onChange={(e) => setItem(m.id, { precoUnitario: Number(e.target.value) || 0 })}
              placeholder="€/un"
              className={cn(inp, "num w-20")}
            />
          </div>
          <span className={cn("text-xs", precoDesatualizado(m) ? "font-medium text-warning" : "text-muted")}>
            {m.fornecedor ?? ""}{precoDesatualizado(m) ? " · preço antigo" : ""}
          </span>
          <div className="flex items-center justify-end gap-2">
            <span className="num text-base font-semibold text-ink">{eur(subtotalMaterial(m))}</span>
            {souGestor && (
              <button onClick={() => remove(m.id)} className="text-muted hover:text-danger">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
      {souGestor && (
        <div className="flex flex-wrap items-center gap-2">
          {sugeridos.length > 0 && (
            <>
              <Sparkles size={14} className="text-gold-dark" />
              {sugeridos.map((d) => (
                <button key={d} onClick={() => add(d)} className="rounded-full border border-gold/40 bg-gold/8 px-3 py-1.5 text-sm font-medium text-gold-dark hover:bg-gold/15">
                  + {d}
                </button>
              ))}
            </>
          )}
          <button onClick={() => add("")} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink hover:bg-accent">
            <Plus size={13} className="inline" /> Outro material
          </button>
        </div>
      )}
      {itens.length === 0 && !souGestor && <p className="text-sm text-muted">Sem materiais detalhados.</p>}
    </Bloco>
  );
}

// ───────── Equipamentos e logística ─────────

function SecaoEquipamentos({ obra, souGestor, patch }: { obra: Obra; souGestor: boolean; patch: (p: Partial<Obra>) => void }) {
  const itens = obra.equipamentos ?? [];
  const total = itens.reduce((s, e) => s + (e.custo || 0), 0);
  const setItem = (id: string, p: Partial<EquipamentoItem>) =>
    patch({ equipamentos: itens.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const add = () => patch({ equipamentos: [...itens, { id: uid("eq"), tipo: "andaimes", custo: 0 }] });
  const remove = (id: string) => patch({ equipamentos: itens.filter((i) => i.id !== id) });

  return (
    <Bloco titulo="Equipamentos e logística" valor={total > 0 ? eur(total) : undefined}>
      {itens.map((e) => (
        <div key={e.id} className="grid grid-cols-2 items-center gap-2 rounded-lg border border-line/60 bg-card p-2.5 sm:grid-cols-[1.3fr_auto_1fr_auto]">
          <select value={e.tipo} disabled={!souGestor} onChange={(ev) => setItem(e.id, { tipo: ev.target.value as TipoEquipamento })} className={inp}>
            {(Object.keys(EQUIPAMENTO_LABEL) as TipoEquipamento[]).map((k) => (
              <option key={k} value={k}>{EQUIPAMENTO_LABEL[k]}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={e.dias ?? ""}
              disabled={!souGestor}
              onChange={(ev) => setItem(e.id, { dias: Number(ev.target.value) || undefined })}
              placeholder="dias"
              className={cn(inp, "num w-20")}
            />
            <span className="text-sm text-muted">dias</span>
          </div>
          <MoneyBox value={e.custo || undefined} onChange={(n) => setItem(e.id, { custo: n ?? 0 })} disabled={!souGestor} />
          <div className="flex items-center justify-end gap-2">
            <span className="num text-base font-semibold text-ink">{eur(e.custo || 0)}</span>
            {souGestor && (
              <button onClick={() => remove(e.id)} className="text-muted hover:text-danger">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
      {souGestor && (
        <button onClick={add} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink hover:bg-accent">
          <Plus size={13} className="inline" /> Adicionar (andaimes, contentor RCD, vazadouro…)
        </button>
      )}
      {itens.length === 0 && !souGestor && <p className="text-sm text-muted">Sem equipamentos registados.</p>}
    </Bloco>
  );
}

// ───────── Licenças e taxas camarárias (+OVP) ─────────

function SecaoLicencas({ obra, souGestor, patch }: { obra: Obra; souGestor: boolean; patch: (p: Partial<Obra>) => void }) {
  const lic = obra.licenciamento ?? { tipo: "nao_aplicavel" as TipoLicenciamento };
  const total = (lic.taxaCamararia ?? 0) + (lic.custoAlvara ?? 0) + (lic.ovpNecessaria ? lic.ovpCusto ?? 0 : 0);
  const set = (p: Partial<typeof lic>) => patch({ licenciamento: { ...lic, ...p } });

  return (
    <Bloco titulo="Licenças e taxas camarárias" valor={total > 0 ? eur(total) : undefined}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Enquadramento</span>
          <select value={lic.tipo} disabled={!souGestor} onChange={(e) => set({ tipo: e.target.value as TipoLicenciamento })} className={cn(inp, "w-full")}>
            {(Object.keys(LICENCIAMENTO_LABEL) as TipoLicenciamento[]).map((k) => (
              <option key={k} value={k}>{LICENCIAMENTO_LABEL[k]}</option>
            ))}
          </select>
        </label>
        {lic.tipo !== "nao_aplicavel" && lic.tipo !== "isento" && (
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Estado do processo</span>
            <select
              value={lic.estadoProcesso ?? "nao_iniciado"}
              disabled={!souGestor}
              onChange={(e) => set({ estadoProcesso: e.target.value as EstadoProcesso })}
              className={cn(inp, "w-full")}
            >
              {(Object.keys(ESTADO_PROCESSO_LABEL) as EstadoProcesso[]).map((k) => (
                <option key={k} value={k}>{ESTADO_PROCESSO_LABEL[k]}</option>
              ))}
            </select>
          </label>
        )}
        {lic.tipo !== "nao_aplicavel" && lic.tipo !== "isento" && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Taxa camarária</span>
              <MoneyBox value={lic.taxaCamararia} onChange={(n) => set({ taxaCamararia: n })} disabled={!souGestor} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Custo do alvará</span>
              <MoneyBox value={lic.custoAlvara} onChange={(n) => set({ custoAlvara: n })} disabled={!souGestor} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">N.º do processo</span>
              <input value={lic.numeroProcesso ?? ""} disabled={!souGestor} onChange={(e) => set({ numeroProcesso: e.target.value })} className={cn(inp, "w-full")} />
            </label>
          </>
        )}
      </div>

      {/* OVP — andaimes/contentores na via pública */}
      <div className="rounded-lg border border-line/60 bg-card p-3">
        <Toggle
          label="Ocupação de via pública (andaimes / contentores)"
          checked={!!lic.ovpNecessaria}
          disabled={!souGestor}
          onChange={(v) => set({ ovpNecessaria: v })}
        />
        {lic.ovpNecessaria && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Custo da licença OVP</span>
              <MoneyBox value={lic.ovpCusto} onChange={(n) => set({ ovpCusto: n })} disabled={!souGestor} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Dias previstos</span>
              <input
                type="number"
                value={lic.ovpDias ?? ""}
                disabled={!souGestor}
                onChange={(e) => set({ ovpDias: Number(e.target.value) || undefined })}
                className={cn(inp, "num w-full")}
              />
            </label>
          </div>
        )}
      </div>
    </Bloco>
  );
}

// ───────── Projetos e honorários ─────────

function SecaoProjetos({ obra, souGestor, patch }: { obra: Obra; souGestor: boolean; patch: (p: Partial<Obra>) => void }) {
  const itens = obra.projetosHonorarios ?? [];
  const total = itens.reduce((s, p) => s + (p.custo || 0), 0);
  const setItem = (id: string, p: Partial<ProjetoHonorario>) =>
    patch({ projetosHonorarios: itens.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const add = () => patch({ projetosHonorarios: [...itens, { id: uid("ph"), tipo: "arquitetura", custo: 0, estado: "por_contratar" }] });
  const remove = (id: string) => patch({ projetosHonorarios: itens.filter((i) => i.id !== id) });

  return (
    <Bloco titulo="Projetos e honorários" valor={total > 0 ? eur(total) : undefined}>
      {itens.map((p) => (
        <div key={p.id} className="grid grid-cols-2 items-center gap-2 rounded-lg border border-line/60 bg-card p-2.5 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
          <select value={p.tipo} disabled={!souGestor} onChange={(e) => setItem(p.id, { tipo: e.target.value as TipoProjetoEsp })} className={inp}>
            {(Object.keys(PROJETO_ESP_LABEL) as TipoProjetoEsp[]).map((k) => (
              <option key={k} value={k}>{PROJETO_ESP_LABEL[k]}</option>
            ))}
          </select>
          <select
            value={p.estado}
            disabled={!souGestor}
            onChange={(e) => setItem(p.id, { estado: e.target.value as ProjetoHonorario["estado"] })}
            className={inp}
          >
            <option value="por_contratar">Por contratar</option>
            <option value="em_curso">Em curso</option>
            <option value="entregue">Entregue</option>
          </select>
          <MoneyBox value={p.custo || undefined} onChange={(n) => setItem(p.id, { custo: n ?? 0 })} disabled={!souGestor} />
          <div className="flex items-center justify-end gap-2">
            <span className="num text-base font-semibold text-ink">{eur(p.custo || 0)}</span>
            {souGestor && (
              <button onClick={() => remove(p.id)} className="text-muted hover:text-danger">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
      {souGestor && (
        <button onClick={add} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink hover:bg-accent">
          <Plus size={13} className="inline" /> Adicionar projeto (arquitetura, estabilidade, ITED…)
        </button>
      )}
      {itens.length === 0 && !souGestor && <p className="text-sm text-muted">Sem projetos de especialidade.</p>}
    </Bloco>
  );
}

// ───────── Seguros ─────────

function SecaoSeguros({ obra, souGestor, patch }: { obra: Obra; souGestor: boolean; patch: (p: Partial<Obra>) => void }) {
  const seg = obra.seguros ?? {};
  const set = (p: Partial<typeof seg>) => patch({ seguros: { ...seg, ...p } });
  const total = seg.rcContratado ? seg.rcCusto ?? 0 : 0;

  return (
    <Bloco titulo="Seguros" valor={total > 0 ? eur(total) : undefined}>
      <div className="rounded-lg border border-line/60 bg-card p-3">
        <Toggle
          label="Responsabilidade civil do empreiteiro contratada"
          checked={!!seg.rcContratado}
          disabled={!souGestor}
          onChange={(v) => set({ rcContratado: v })}
        />
        {seg.rcContratado && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Seguradora</span>
              <input value={seg.rcSeguradora ?? ""} disabled={!souGestor} onChange={(e) => set({ rcSeguradora: e.target.value })} className={cn(inp, "w-full")} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Custo</span>
              <MoneyBox value={seg.rcCusto} onChange={(n) => set({ rcCusto: n })} disabled={!souGestor} />
            </label>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-line/60 bg-card p-3">
        <Toggle
          label="Seguro de acidentes de trabalho do empreiteiro verificado"
          checked={!!seg.atVerificado}
          disabled={!souGestor}
          onChange={(v) => set({ atVerificado: v })}
        />
        <p className="mt-1 text-xs text-muted">Obrigação do empreiteiro — aqui só confirma que viu o documento.</p>
      </div>
    </Bloco>
  );
}

// ───────── Fiscal de obra + coordenação de segurança ─────────

function SecaoFiscalCso({ obra, souGestor, patch }: { obra: Obra; souGestor: boolean; patch: (p: Partial<Obra>) => void }) {
  const f = obra.fiscalObra ?? {};
  const c = obra.cso ?? {};
  const total = (f.contratado ? f.custo ?? 0 : 0) + (c.necessaria ? c.custo ?? 0 : 0);

  return (
    <Bloco titulo="Fiscal de obra e segurança" valor={total > 0 ? eur(total) : undefined}>
      <div className="rounded-lg border border-line/60 bg-card p-3">
        <Toggle
          label="Fiscal de obra contratado"
          checked={!!f.contratado}
          disabled={!souGestor}
          onChange={(v) => patch({ fiscalObra: { ...f, contratado: v } })}
        />
        {f.contratado && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input value={f.nome ?? ""} disabled={!souGestor} placeholder="Nome" onChange={(e) => patch({ fiscalObra: { ...f, nome: e.target.value } })} className={inp} />
            <MoneyBox value={f.custo} onChange={(n) => patch({ fiscalObra: { ...f, custo: n } })} disabled={!souGestor} />
            <input value={f.contacto ?? ""} disabled={!souGestor} placeholder="Contacto" onChange={(e) => patch({ fiscalObra: { ...f, contacto: e.target.value } })} className={inp} />
            <input value={f.periodicidadeVisitas ?? ""} disabled={!souGestor} placeholder="Visitas (ex.: semanal)" onChange={(e) => patch({ fiscalObra: { ...f, periodicidadeVisitas: e.target.value } })} className={inp} />
          </div>
        )}
      </div>
      <div className="rounded-lg border border-line/60 bg-card p-3">
        <Toggle
          label="Coordenação de segurança em obra (CSO) necessária"
          checked={!!c.necessaria}
          disabled={!souGestor}
          onChange={(v) => patch({ cso: { ...c, necessaria: v } })}
        />
        {c.necessaria && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input value={c.coordenador ?? ""} disabled={!souGestor} placeholder="Coordenador" onChange={(e) => patch({ cso: { ...c, coordenador: e.target.value } })} className={inp} />
            <MoneyBox value={c.custo} onChange={(n) => patch({ cso: { ...c, custo: n } })} disabled={!souGestor} />
          </div>
        )}
      </div>
    </Bloco>
  );
}

// ───────── Assistente de IVA (6% vs 23%) ─────────

function SecaoIva({ obra, souGestor, patch }: { obra: Obra; souGestor: boolean; patch: (p: Partial<Obra>) => void }) {
  const despesas = useObrasStore((s) => s.despesas);
  const t = totaisObra(obra, despesas);
  const iva = obra.iva ?? {};
  const set = (p: Partial<typeof iva>) => patch({ iva: { ...iva, ...p } });

  const BotaoSim = ({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={souGestor ? onClick : undefined}
      disabled={!souGestor}
      className={cn(
        "min-h-12 flex-1 rounded-xl border px-4 text-base font-semibold transition-colors disabled:opacity-60",
        ativo ? "border-gold bg-gold text-sidebar" : "border-line bg-card text-ink hover:bg-accent"
      )}
    >
      {children}
    </button>
  );

  return (
    <Bloco titulo="Quanto IVA vou pagar?" valor={`${t.ivaTaxa}%`} defaultOpen={false}>
      {/* Pergunta 1 — ARU */}
      <div>
        <p className="mb-2 text-base text-ink">1. O imóvel está em Área de Reabilitação Urbana (ARU)?</p>
        <div className="flex gap-2">
          <BotaoSim ativo={iva.justificacao === "aru"} onClick={() => set({ justificacao: "aru" })}>Sim</BotaoSim>
          <BotaoSim ativo={iva.justificacao === "reabilitacao_habitacao" || iva.justificacao === "normal"} onClick={() => set({ justificacao: iva.justificacao === "normal" ? "normal" : "reabilitacao_habitacao" })}>
            Não / Não sei
          </BotaoSim>
        </div>
        {iva.justificacao === "aru" && <p className="mt-1.5 text-sm text-success">Taxa 6%. Confirme na sua câmara municipal.</p>}
      </div>

      {/* Pergunta 2 — reabilitação de habitação */}
      {iva.justificacao !== "aru" && (
        <div>
          <p className="mb-2 text-base text-ink">2. É obra de reabilitação de habitação?</p>
          <div className="flex gap-2">
            <BotaoSim ativo={iva.justificacao === "reabilitacao_habitacao"} onClick={() => set({ justificacao: "reabilitacao_habitacao" })}>Sim</BotaoSim>
            <BotaoSim ativo={iva.justificacao === "normal"} onClick={() => set({ justificacao: "normal" })}>Não</BotaoSim>
          </div>
        </div>
      )}

      {/* Pergunta 3 — regra dos 20% + contrato discriminado */}
      {iva.justificacao === "reabilitacao_habitacao" && (
        <div className="rounded-lg border border-line/60 bg-card p-3">
          <p className="text-base text-ink">
            3. Regra dos 20%: os materiais são <strong className="num">{Math.round(t.pctMateriais)}%</strong> do valor da obra.
          </p>
          {t.pctMateriais > 20 ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              Para IVA a 6% fora de ARU, os materiais não podem passar de 20% do valor total. Neste momento a obra é taxada a 23%.
            </p>
          ) : (
            <div className="mt-2">
              <Toggle
                label="Tenho contrato com os trabalhos e materiais discriminados"
                checked={!!iva.contratoDiscriminado}
                disabled={!souGestor}
                onChange={(v) => set({ contratoDiscriminado: v })}
              />
            </div>
          )}
        </div>
      )}

      {/* Resultado em grande */}
      <div className={cn("rounded-xl border p-4 text-center", t.ivaElegivel6 ? "border-success/40 bg-success/8" : "border-line bg-bg/40")}>
        <p className={cn("num font-display text-[32px] font-bold", t.ivaElegivel6 ? "text-success" : "text-ink")}>
          IVA: {t.ivaTaxa}%{t.ivaElegivel6 && t.poupancaIva > 0 ? ` · poupa ${eur(t.poupancaIva)}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted">{avisoElegibilidadeIva(t, obra.iva)}</p>
      </div>
      <p className="text-xs text-muted">Estimativa com base nos dados — não substitui aconselhamento fiscal.</p>
    </Bloco>
  );
}

// ───────── Contingência ─────────

function SecaoContingencia({ obra, souGestor, patch }: { obra: Obra; souGestor: boolean; patch: (p: Partial<Obra>) => void }) {
  const despesas = useObrasStore((s) => s.despesas);
  const t = totaisObra(obra, despesas);
  const pct = t.contingenciaPct;

  return (
    <Bloco titulo="Contingência (fundo para imprevistos)" valor={t.contingenciaValor > 0 ? eur(t.contingenciaValor) : `${pct}%`}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={10}
          max={20}
          step={1}
          value={pct}
          disabled={!souGestor}
          onChange={(e) => patch({ contingencia: { percentagem: Number(e.target.value) } })}
          className="h-2 flex-1 accent-[#C8A664] disabled:opacity-50"
        />
        <span className="num w-12 text-right text-lg font-bold text-ink">{pct}%</span>
      </div>
      {t.temDetalhe ? (
        <p className="text-base text-ink">
          Fundo para imprevistos: <strong className="num">{eur(t.contingenciaValor)}</strong>
          {t.contingenciaUsado > 0 ? (
            <>
              {" "}· já usou <strong className="num text-warning">{eur(t.contingenciaUsado)}</strong> · restam{" "}
              <strong className="num text-success">{eur(Math.max(0, t.contingenciaValor - t.contingenciaUsado))}</strong>
            </>
          ) : (
            <> · ainda intacto</>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted">A contingência entra no total quando detalhar o orçamento (10–20% do subtotal).</p>
      )}
    </Bloco>
  );
}

// ───────── Contrato e alvará ─────────

function SecaoContrato({ obra, souGestor, patch }: { obra: Obra; souGestor: boolean; patch: (p: Partial<Obra>) => void }) {
  const despesas = useObrasStore((s) => s.despesas);
  const t = totaisObra(obra, despesas);
  const ct = obra.contrato ?? {};
  const set = (p: Partial<typeof ct>) => patch({ contrato: { ...ct, ...p } });
  const obrigatorio = t.orcamentoTotal > 20000;

  return (
    <Bloco titulo="Contrato e alvará" valor={ct.assinado ? "Assinado" : obrigatorio ? "Obrigatório" : undefined}>
      <p className={cn("flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm", obrigatorio && !ct.assinado ? "bg-warning/10 text-warning" : "bg-bg/60 text-muted")}>
        {obrigatorio && !ct.assinado ? <AlertTriangle size={15} className="mt-0.5 shrink-0" /> : <FileText size={15} className="mt-0.5 shrink-0" />}
        {obrigatorio
          ? "Obras acima de 20.000 € exigem contrato escrito (partes, alvarás, trabalhos, materiais, valor, prazo e penalizações)."
          : "Abaixo de 20.000 € o contrato escrito não é obrigatório — mas continua a ser recomendado."}
      </p>
      <Toggle label="Contrato de empreitada assinado" checked={!!ct.assinado} disabled={!souGestor} onChange={(v) => set({ assinado: v })} />
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Alvará do empreiteiro</span>
          <input value={ct.alvaraEmpreiteiro ?? ""} disabled={!souGestor} placeholder="N.º do alvará" onChange={(e) => set({ alvaraEmpreiteiro: e.target.value })} className={cn(inp, "w-full")} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Prazo de execução (dias)</span>
          <input
            type="number"
            value={ct.prazoExecucaoDias ?? ""}
            disabled={!souGestor}
            onChange={(e) => set({ prazoExecucaoDias: Number(e.target.value) || undefined })}
            className={cn(inp, "num w-full")}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Penalização por dia de atraso</span>
          <MoneyBox value={ct.penalizacaoAtrasoDia} onChange={(n) => set({ penalizacaoAtrasoDia: n })} disabled={!souGestor} />
        </label>
      </div>
      <div className="rounded-lg border border-line/60 bg-card p-3">
        <Toggle
          label="Alvará verificado no portal do IMPIC"
          checked={!!ct.alvaraVerificadoIMPIC}
          disabled={!souGestor}
          onChange={(v) => {
            set({ alvaraVerificadoIMPIC: v });
            if (v) toast.success("Alvará marcado como verificado no IMPIC");
          }}
        />
        {ct.alvaraVerificadoIMPIC && (
          <p className="mt-1 flex items-center gap-1 text-sm text-success">
            <CheckCircle2 size={13} /> Verificado
          </p>
        )}
      </div>
    </Bloco>
  );
}

// ───────── Toggle grande partilhado ─────────

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-3 text-left disabled:opacity-60"
    >
      <span className="text-base text-ink">{label}</span>
      <span className={cn("h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors", checked ? "bg-gold" : "bg-line")}>
        <span className={cn("block h-5 w-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
      </span>
    </button>
  );
}
