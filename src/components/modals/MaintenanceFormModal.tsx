import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Wrench, ImagePlus, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useModalStore } from "@/store/useModalStore";
import {
  useMaintenanceStore,
  CATEGORIA_PEDIDO_LABEL,
  PRIORIDADE_LABEL,
  RESP_SUGERIDA,
  RESPONSABILIDADE_LABEL,
  type CategoriaPedido,
  type Prioridade,
  type Responsabilidade,
} from "@/store/useMaintenanceStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useTechniciansStore } from "@/store/useTechniciansStore";
import { CATEGORIA_PEDIDO_ICON, inputCls } from "@/components/manutencao/shared";
import { MoneyBox } from "@/components/ui/MoneyField";
import { cn } from "@/lib/utils";

const CATEGORIAS = Object.keys(CATEGORIA_PEDIDO_LABEL) as CategoriaPedido[];

export function MaintenanceFormModal() {
  const { maintenanceForm, closeMaintenanceForm } = useModalStore();
  const { open, editingId, initialPropertyId, lockProperty, prefill } = maintenanceForm;

  const add = useMaintenanceStore((s) => s.add);
  const update = useMaintenanceStore((s) => s.update);
  const editing = useMaintenanceStore((s) => (editingId ? s.requests.find((r) => r.id === editingId) : undefined));
  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const technicians = useTechniciansStore((s) => s.technicians);

  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [categoria, setCategoria] = useState<CategoriaPedido>("canalizacao");
  const [prioridade, setPrioridade] = useState<Prioridade>("normal");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [resp, setResp] = useState<Responsabilidade>("senhorio");
  const [respTocada, setRespTocada] = useState(false);
  const [justificacao, setJustificacao] = useState("");
  const [custoEstimado, setCustoEstimado] = useState(0);
  const [tecnicoId, setTecnicoId] = useState("");
  const [dataAgendada, setDataAgendada] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErros({});
    if (editing) {
      setPropertyId(editing.propertyId);
      setTenantId(editing.tenantId ?? "");
      setCategoria(editing.categoria);
      setPrioridade(editing.prioridade);
      setTitulo(editing.titulo);
      setDescricao(editing.descricao);
      setFotos(editing.fotosAntes);
      setResp(editing.responsabilidade);
      setRespTocada(true);
      setJustificacao(editing.justificacaoResponsabilidade ?? "");
      setCustoEstimado(editing.custoEstimado ?? 0);
      setTecnicoId(editing.tecnicoId ?? "");
      setDataAgendada(editing.dataAgendada ?? "");
    } else {
      const cat = (prefill?.categoria && CATEGORIAS.includes(prefill.categoria as CategoriaPedido)
        ? (prefill.categoria as CategoriaPedido)
        : "canalizacao") as CategoriaPedido;
      setPropertyId(initialPropertyId ?? "");
      setTenantId(prefill?.tenantId ?? "");
      setCategoria(cat);
      setPrioridade("normal");
      setTitulo(prefill?.titulo ?? "");
      setDescricao(prefill?.descricao ?? "");
      setFotos([]);
      setResp(RESP_SUGERIDA[cat].resp);
      setRespTocada(false);
      setJustificacao("");
      setCustoEstimado(0);
      setTecnicoId("");
      setDataAgendada(prefill?.dataAgendada ?? "");
    }
  }, [open, editing, initialPropertyId, prefill]);

  if (!open) return null;

  const tenantsDoImovel = tenants.filter((t) => t.propertyId === propertyId);
  const sugestao = RESP_SUGERIDA[categoria];
  const respDiferente = resp !== sugestao.resp;

  const escolherCategoria = (c: CategoriaPedido) => {
    setCategoria(c);
    // A sugestão segue a categoria enquanto o utilizador não tocar na responsabilidade
    if (!respTocada) setResp(RESP_SUGERIDA[c].resp);
    setErros((e) => ({ ...e, categoria: "" }));
  };

  const onFotos = async (files: FileList | null) => {
    if (!files) return;
    const novas: string[] = [];
    for (const f of Array.from(files).slice(0, 6)) {
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      novas.push(dataUrl);
    }
    setFotos((cur) => [...cur, ...novas].slice(0, 8));
  };

  const submeter = () => {
    const e: Record<string, string> = {};
    if (!propertyId) e.propertyId = "Escolha o imóvel";
    if (!titulo.trim()) e.titulo = "Dê um título ao pedido";
    if (respDiferente && respTocada && !justificacao.trim())
      e.justificacao = "Alterou a sugestão — explique porquê em 1 linha";
    if (Object.keys(e).length > 0) {
      setErros(e);
      toast.error("Faltam campos obrigatórios");
      return;
    }

    if (editing) {
      update(editing.id, {
        propertyId,
        tenantId: tenantId || undefined,
        categoria,
        prioridade,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        fotosAntes: fotos,
        responsabilidade: resp,
        justificacaoResponsabilidade: respDiferente ? justificacao.trim() : undefined,
        custoEstimado: custoEstimado || undefined,
        tecnicoId: tecnicoId || undefined,
        dataAgendada: dataAgendada || undefined,
      });
      toast.success("Pedido atualizado ✓");
    } else {
      add({
        propertyId,
        tenantId: tenantId || undefined,
        categoria,
        prioridade,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        fotosAntes: fotos,
        responsabilidade: resp,
        justificacaoResponsabilidade: respDiferente ? justificacao.trim() : undefined,
        custoEstimado: custoEstimado || undefined,
        tecnicoId: tecnicoId || undefined,
        dataAgendada: dataAgendada || undefined,
        estado: dataAgendada ? "agendado" : "aberto",
        origem: prefill?.conversationId ? "inquilino" : "senhorio",
        conversationId: prefill?.conversationId,
        planTaskId: prefill?.planTaskId,
      });
      toast.success("Pedido criado ✓", { description: "Já aparece no kanban e no tab do imóvel." });
    }
    closeMaintenanceForm();
  };

  const Erro = ({ k }: { k: string }) =>
    erros[k] ? <p className="mt-1 text-[11px] font-medium text-danger">{erros[k]}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={closeMaintenanceForm}>
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <Wrench size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">{editing ? "Editar pedido" : "Novo pedido de manutenção"}</h2>
              <p className="text-xs text-muted">Avaria ou reparação pontual — para projetos com fases, use as Obras.</p>
            </div>
          </div>
          <button onClick={closeMaintenanceForm} className="text-muted hover:text-ink" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {/* 1 · Imóvel + inquilino */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">1 · Imóvel</span>
              <select
                value={propertyId}
                onChange={(e) => { setPropertyId(e.target.value); setTenantId(""); setErros((x) => ({ ...x, propertyId: "" })); }}
                disabled={lockProperty}
                className={cn(inputCls, lockProperty && "opacity-60", erros.propertyId && "border-danger")}
              >
                <option value="">Escolher imóvel…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Erro k="propertyId" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">2 · Inquilino afetado (opcional)</span>
              <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className={inputCls} disabled={!propertyId}>
                <option value="">— Nenhum —</option>
                {tenantsDoImovel.map((t) => (
                  <option key={t.id} value={t.id}>{t.nomeCompleto}</option>
                ))}
              </select>
            </label>
          </div>

          {/* 3 · Categoria (grelha de ícones) + prioridade + título + descrição + fotos */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">3 · O que se passa?</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CATEGORIAS.map((c) => {
                const Icon = CATEGORIA_PEDIDO_ICON[c];
                const ativo = categoria === c;
                return (
                  <button
                    key={c}
                    onClick={() => escolherCategoria(c)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-medium transition-colors",
                      ativo ? "border-primary bg-primary/8 text-primary" : "border-line bg-card text-muted hover:bg-accent"
                    )}
                  >
                    <Icon size={18} />
                    {CATEGORIA_PEDIDO_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Título</span>
              <input
                value={titulo}
                onChange={(e) => { setTitulo(e.target.value); setErros((x) => ({ ...x, titulo: "" })); }}
                placeholder="Ex.: Fuga na torneira da cozinha"
                className={cn(inputCls, erros.titulo && "border-danger")}
              />
              <Erro k="titulo" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Prioridade</span>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)} className={inputCls}>
                {(Object.keys(PRIORIDADE_LABEL) as Prioridade[]).map((p) => (
                  <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Descrição</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="O que acontece, desde quando, onde exatamente…"
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">Fotos (opcional)</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm text-muted hover:bg-accent">
                <ImagePlus size={15} /> Adicionar fotos
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFotos(e.target.files)} />
              </label>
              {fotos.map((f, i) => (
                <span key={i} className="relative">
                  <img src={f} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />
                  <button
                    onClick={() => setFotos((cur) => cur.filter((_, x) => x !== i))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-ink/70 p-0.5 text-white"
                    aria-label="Remover foto"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 4 · Responsabilidade */}
          <div className="rounded-xl border border-line bg-bg/40 p-4">
            <span className="mb-1.5 block text-xs font-medium text-muted">4 · Responsabilidade</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(RESPONSABILIDADE_LABEL) as Responsabilidade[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { setResp(r); setRespTocada(true); setErros((x) => ({ ...x, justificacao: "" })); }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    resp === r ? "border-primary bg-primary text-white" : "border-line bg-card text-muted hover:bg-accent"
                  )}
                >
                  {RESPONSABILIDADE_LABEL[r]}
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted">
              <Info size={12} className="mt-0.5 shrink-0" />
              Sugerido para {CATEGORIA_PEDIDO_LABEL[categoria].toLowerCase()}: <strong className="text-ink">{RESPONSABILIDADE_LABEL[sugestao.resp]}</strong> — {sugestao.nota} Informativo, não é aconselhamento jurídico.
            </p>
            {respDiferente && respTocada && (
              <label className="mt-2 block">
                <span className="mb-1 block text-xs font-medium text-muted">Porquê diferente da sugestão?</span>
                <input
                  value={justificacao}
                  onChange={(e) => { setJustificacao(e.target.value); setErros((x) => ({ ...x, justificacao: "" })); }}
                  placeholder="Ex.: Vidro partido pelo inquilino"
                  className={cn(inputCls, erros.justificacao && "border-danger")}
                />
                <Erro k="justificacao" />
              </label>
            )}
          </div>

          {/* 5 · Custo, técnico, agendamento */}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">5 · Custo estimado (opcional)</span>
              <MoneyBox value={custoEstimado} onChange={(v) => setCustoEstimado(v ?? 0)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Técnico (opcional)</span>
              <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className={inputCls}>
                <option value="">— Atribuir depois —</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Data agendada (opcional)</span>
              <input type="date" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} className={inputCls} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={closeMaintenanceForm}>Cancelar</Button>
          <Button onClick={submeter}>
            <Wrench size={15} /> {editing ? "Guardar alterações" : "Criar pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}
