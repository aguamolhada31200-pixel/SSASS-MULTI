import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  Upload,
  Search,
  FolderPlus,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  RotateCcw,
  Share2,
  Download,
  Pencil,
  FolderInput,
  Link2,
  X,
  AlertTriangle,
  FolderOpen,
  Building2,
  User as UserIcon,
  Network,
  ChevronRight,
  ChevronDown,
  Tag as TagIcon,
  Maximize2,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Lightbox } from "@/components/Lightbox";
import {
  useDocumentsStore,
  DOC_CATEGORIAS,
  sugerirCategoria,
  expiraEmBreve,
  diasAteExpiracao,
  formatBytes,
  type DocCategoria,
  type PropertyDocument,
} from "@/store/useDocumentsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useTenantsStore } from "@/store/useTenantsStore";
import { useContractsStore } from "@/store/useContractsStore";
import { useProjectStagesStore } from "@/store/useProjectStagesStore";
import { useExampleData } from "@/store/useExampleData";
import { dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

// ───────────────────────── Tipos da árvore ─────────────────────────

type TreeNode =
  | { kind: "todas" }
  | { kind: "property"; propertyId: string; categoria?: DocCategoria }
  | { kind: "categoria"; categoria: DocCategoria }
  | { kind: "tenant"; tenantId: string }
  | { kind: "projeto"; projectId: string }
  | { kind: "folder"; nome: string }
  | { kind: "lixo" };

type TipoGrupo = "pdf" | "imagem" | "doc" | "sheet" | "outro";

function tipoGrupo(mime: string): TipoGrupo {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "imagem";
  if (/word|msword|document/.test(mime)) return "doc";
  if (/sheet|excel|spreadsheet/.test(mime)) return "sheet";
  return "outro";
}

function iconForDoc(d: PropertyDocument): LucideIcon {
  const g = tipoGrupo(d.mimeType);
  if (g === "imagem") return ImageIcon;
  if (g === "sheet") return FileSpreadsheet;
  if (g === "outro") return FileIcon;
  return FileText;
}

function temAssociacao(d: PropertyDocument): boolean {
  return !!(d.propertyId || d.tenantId || d.contractId || d.projectId || d.obraId);
}

function isDataImage(d: PropertyDocument): boolean {
  return d.mimeType.startsWith("image/") && d.ficheiroUrl !== "#" && d.ficheiroUrl !== "";
}

// ───────────────────────── Página ─────────────────────────

export default function PastaDigital() {
  const documents = useDocumentsStore((s) => s.documents);
  const customFolders = useDocumentsStore((s) => s.customFolders);
  const addFolder = useDocumentsStore((s) => s.addFolder);
  const enabled = useExampleData((s) => s.enabled);

  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const projects = useProjectStagesStore((s) => s.projects);

  const propName = (id?: string) => properties.find((p) => p.id === id)?.name ?? "Imóvel";
  const tenantName = (id?: string) => tenants.find((t) => t.id === id)?.nomeCompleto ?? "Inquilino";
  const projName = (id?: string) => projects.find((p) => p.id === id)?.nome ?? "Projeto";

  const [node, setNode] = useState<TreeNode>({ kind: "todas" });
  const [q, setQ] = useState("");
  const [fTipo, setFTipo] = useState<"todos" | TipoGrupo>("todos");
  const [fPeriodo, setFPeriodo] = useState<"todos" | "30" | "90" | "365">("todos");
  const [fExpira, setFExpira] = useState(false);
  const [fAssoc, setFAssoc] = useState<"todos" | "com" | "sem">("todos");
  const [view, setView] = useState<"grid" | "lista">("grid");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [panelId, setPanelId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [expandProp, setExpandProp] = useState<Set<string>>(new Set());

  const all = enabled ? documents : [];
  const ativos = all.filter((d) => !d.deletedAt);
  const naLixeira = all.filter((d) => d.deletedAt);

  // Documentos correspondentes ao nó selecionado
  const baseList = useMemo(() => {
    const inNode = (d: PropertyDocument): boolean => {
      switch (node.kind) {
        case "todas":
          return !d.deletedAt;
        case "property":
          return !d.deletedAt && d.propertyId === node.propertyId && (!node.categoria || d.categoria === node.categoria);
        case "categoria":
          return !d.deletedAt && d.categoria === node.categoria;
        case "tenant":
          return !d.deletedAt && d.tenantId === node.tenantId;
        case "projeto":
          return !d.deletedAt && d.projectId === node.projectId;
        case "folder":
          return !d.deletedAt && d.pasta === node.nome;
        case "lixo":
          return !!d.deletedAt;
      }
    };
    return all.filter(inNode);
  }, [all, node]);

  // Filtros
  const lista = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const now = Date.now();
    return baseList
      .filter((d) => {
        if (ql) {
          const hay = `${d.nome} ${(d.tags ?? []).join(" ")} ${d.notas ?? ""}`.toLowerCase();
          if (!hay.includes(ql)) return false;
        }
        if (fTipo !== "todos" && tipoGrupo(d.mimeType) !== fTipo) return false;
        if (fPeriodo !== "todos") {
          const dias = (now - new Date(`${d.uploadedAt}T00:00:00`).getTime()) / 86400000;
          if (dias > Number(fPeriodo)) return false;
        }
        if (fExpira && !expiraEmBreve(d, 30)) return false;
        if (fAssoc === "com" && !temAssociacao(d)) return false;
        if (fAssoc === "sem" && temAssociacao(d)) return false;
        return true;
      })
      .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  }, [baseList, q, fTipo, fPeriodo, fExpira, fAssoc]);

  // Alertas
  const aExpirar = ativos.filter((d) => expiraEmBreve(d, 30));
  const semAssoc = ativos.filter((d) => !temAssociacao(d));

  // Agrupamentos para a árvore
  const propsComDocs = properties.filter((p) => ativos.some((d) => d.propertyId === p.id));
  const catsComDocs = DOC_CATEGORIAS.filter((c) => ativos.some((d) => d.categoria === c));
  const tenantsComDocs = tenants.filter((t) => ativos.some((d) => d.tenantId === t.id));
  const projsComDocs = projects.filter((p) => ativos.some((d) => d.projectId === p.id));

  const panelDoc = panelId ? all.find((d) => d.id === panelId) ?? null : null;

  const toggleSel = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const clearSel = () => setSel(new Set());

  const novaPasta = () => {
    const nome = window.prompt("Nome da nova pasta:");
    if (nome && nome.trim()) {
      addFolder(nome.trim());
      toast.success("Pasta criada", { description: nome.trim() });
    }
  };

  const breadcrumb = nodeBreadcrumb(node, { propName, tenantName, projName });

  return (
    <div>
      <PageHeader
        title="Pasta Digital"
        subtitle="Arquivo central de todos os documentos — contratos, escrituras, faturas, seguros e mais."
        showExampleToggle
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload size={16} /> Carregar documento
          </Button>
        }
      />

      {/* Alertas */}
      {node.kind !== "lixo" && (aExpirar.length > 0 || semAssoc.length > 0) && (
        <div className="mb-5 space-y-2">
          {aExpirar.length > 0 && (
            <div className="rounded-xl border border-danger/30 bg-danger/8 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-danger">
                <AlertTriangle size={15} /> {aExpirar.length} documento(s) expiram nos próximos 30 dias
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {aExpirar.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setPanelId(d.id)}
                    className="rounded-full bg-card px-2.5 py-1 text-xs text-danger ring-1 ring-danger/20 hover:bg-danger/10"
                  >
                    {d.nome} · {diasAteExpiracao(d.expiraEm)}d
                  </button>
                ))}
              </div>
            </div>
          )}
          {semAssoc.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
              <button
                onClick={() => {
                  setNode({ kind: "todas" });
                  setFAssoc("sem");
                }}
                className="flex items-center gap-2 text-sm font-medium text-warning"
              >
                <AlertTriangle size={15} /> {semAssoc.length} documento(s) sem associação a imóvel/inquilino — clicar para ver
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* ───────── Árvore ───────── */}
        <aside className="rounded-xl border border-line bg-card p-2 lg:sticky lg:top-2 lg:h-fit">
          <TreeRow
            active={node.kind === "todas"}
            icon={FolderOpen}
            label="Todas"
            count={ativos.length}
            onClick={() => setNode({ kind: "todas" })}
          />

          <TreeGroup label="Por imóvel">
            {propsComDocs.map((p) => {
              const open = expandProp.has(p.id);
              const cats = DOC_CATEGORIAS.filter((c) =>
                ativos.some((d) => d.propertyId === p.id && d.categoria === c)
              );
              return (
                <div key={p.id}>
                  <TreeRow
                    active={node.kind === "property" && node.propertyId === p.id && !node.categoria}
                    icon={Building2}
                    label={p.name}
                    count={ativos.filter((d) => d.propertyId === p.id).length}
                    chevron={cats.length > 0 ? (open ? "down" : "right") : undefined}
                    onChevron={() =>
                      setExpandProp((s) => {
                        const n = new Set(s);
                        n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                        return n;
                      })
                    }
                    onClick={() => setNode({ kind: "property", propertyId: p.id })}
                  />
                  {open &&
                    cats.map((c) => (
                      <TreeRow
                        key={c}
                        indent
                        active={node.kind === "property" && node.propertyId === p.id && node.categoria === c}
                        label={c}
                        count={ativos.filter((d) => d.propertyId === p.id && d.categoria === c).length}
                        onClick={() => setNode({ kind: "property", propertyId: p.id, categoria: c })}
                      />
                    ))}
                </div>
              );
            })}
          </TreeGroup>

          <TreeGroup label="Por categoria">
            {catsComDocs.map((c) => (
              <TreeRow
                key={c}
                active={node.kind === "categoria" && node.categoria === c}
                label={c}
                count={ativos.filter((d) => d.categoria === c).length}
                onClick={() => setNode({ kind: "categoria", categoria: c })}
              />
            ))}
          </TreeGroup>

          {tenantsComDocs.length > 0 && (
            <TreeGroup label="Por inquilino">
              {tenantsComDocs.map((t) => (
                <TreeRow
                  key={t.id}
                  icon={UserIcon}
                  active={node.kind === "tenant" && node.tenantId === t.id}
                  label={t.nomeCompleto}
                  count={ativos.filter((d) => d.tenantId === t.id).length}
                  onClick={() => setNode({ kind: "tenant", tenantId: t.id })}
                />
              ))}
            </TreeGroup>
          )}

          {projsComDocs.length > 0 && (
            <TreeGroup label="Projetos">
              {projsComDocs.map((p) => (
                <TreeRow
                  key={p.id}
                  icon={Network}
                  active={node.kind === "projeto" && node.projectId === p.id}
                  label={p.nome}
                  count={ativos.filter((d) => d.projectId === p.id).length}
                  onClick={() => setNode({ kind: "projeto", projectId: p.id })}
                />
              ))}
            </TreeGroup>
          )}

          <TreeGroup
            label="Pastas"
            action={
              <button onClick={novaPasta} title="Nova pasta" className="text-muted hover:text-primary">
                <FolderPlus size={14} />
              </button>
            }
          >
            {customFolders.length === 0 ? (
              <p className="px-3 py-1 text-[11px] text-muted">Sem pastas personalizadas.</p>
            ) : (
              customFolders.map((f) => (
                <TreeRow
                  key={f}
                  icon={FolderOpen}
                  active={node.kind === "folder" && node.nome === f}
                  label={f}
                  count={ativos.filter((d) => d.pasta === f).length}
                  onClick={() => setNode({ kind: "folder", nome: f })}
                />
              ))
            )}
          </TreeGroup>

          <div className="mt-1 border-t border-line pt-1">
            <TreeRow
              active={node.kind === "lixo"}
              icon={Trash2}
              label="Lixo"
              count={naLixeira.length}
              onClick={() => setNode({ kind: "lixo" })}
            />
          </div>
        </aside>

        {/* ───────── Vista da pasta ───────── */}
        <section className="min-w-0">
          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm text-muted">{breadcrumb}</p>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
              <Search size={15} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar…"
                className="h-9 w-40 bg-transparent text-sm outline-none placeholder:text-muted sm:w-56"
              />
            </div>
            <Button variant="outline" size="sm" onClick={novaPasta}>
              <FolderPlus size={14} /> Nova pasta
            </Button>
            <div className="flex overflow-hidden rounded-lg border border-line">
              <button
                onClick={() => setView("grid")}
                className={cn("flex h-9 w-9 items-center justify-center", view === "grid" ? "bg-primary text-white" : "bg-card text-muted hover:bg-accent")}
                title="Grelha"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView("lista")}
                className={cn("flex h-9 w-9 items-center justify-center", view === "lista" ? "bg-primary text-white" : "bg-card text-muted hover:bg-accent")}
                title="Lista"
              >
                <ListIcon size={15} />
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={fTipo} onChange={(e) => setFTipo(e.target.value as typeof fTipo)} className={selCls}>
              <option value="todos">Todos os tipos</option>
              <option value="pdf">PDF</option>
              <option value="imagem">Imagem</option>
              <option value="doc">Documento</option>
              <option value="sheet">Folha de cálculo</option>
            </select>
            <select value={fPeriodo} onChange={(e) => setFPeriodo(e.target.value as typeof fPeriodo)} className={selCls}>
              <option value="todos">Qualquer período</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
            <select value={fAssoc} onChange={(e) => setFAssoc(e.target.value as typeof fAssoc)} className={selCls}>
              <option value="todos">Com/sem associação</option>
              <option value="com">Associados</option>
              <option value="sem">Sem associação</option>
            </select>
            <button
              onClick={() => setFExpira((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium",
                fExpira ? "border-danger/40 bg-danger/10 text-danger" : "border-line bg-card text-muted hover:bg-accent"
              )}
            >
              <AlertTriangle size={13} /> Expira em breve
            </button>
          </div>

          {/* Barra de seleção múltipla */}
          {sel.size > 0 && (
            <BulkBar
              count={sel.size}
              ids={[...sel]}
              onDone={clearSel}
              lixo={node.kind === "lixo"}
            />
          )}

          {/* Conteúdo */}
          {lista.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-card py-16 text-center">
              <FolderOpen size={30} className="mx-auto mb-2 text-muted" />
              <p className="text-sm text-muted">Sem documentos nesta vista.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map((d) => (
                <DocCard
                  key={d.id}
                  d={d}
                  selected={sel.has(d.id)}
                  onToggle={() => toggleSel(d.id)}
                  onOpen={() => setPanelId(d.id)}
                  propName={propName}
                  tenantName={tenantName}
                  projName={projName}
                />
              ))}
            </div>
          ) : (
            <DocTable
              docs={lista}
              sel={sel}
              onToggle={toggleSel}
              onOpen={(id) => setPanelId(id)}
              propName={propName}
              tenantName={tenantName}
            />
          )}
        </section>
      </div>

      {panelDoc && (
        <DocPanel
          doc={panelDoc}
          onClose={() => setPanelId(null)}
          propName={propName}
          tenantName={tenantName}
          projName={projName}
        />
      )}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} initialNode={node} />}
    </div>
  );
}

const selCls =
  "h-9 rounded-lg border border-line bg-card px-2.5 text-xs text-ink outline-none focus:border-secondary";

// ───────────────────────── Árvore: componentes ─────────────────────────

function TreeGroup({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between px-3 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function TreeRow({
  active,
  icon: Icon,
  label,
  count,
  indent,
  chevron,
  onChevron,
  onClick,
}: {
  active?: boolean;
  icon?: LucideIcon;
  label: string;
  count?: number;
  indent?: boolean;
  chevron?: "right" | "down";
  onChevron?: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg pr-2 text-sm transition-colors",
        active ? "bg-accent font-medium text-primary" : "text-ink hover:bg-accent/60",
        indent ? "pl-7" : "pl-2"
      )}
    >
      {chevron ? (
        <button onClick={onChevron} className="text-muted hover:text-ink">
          {chevron === "down" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        !indent && <span className="w-3.5" />
      )}
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
        {Icon && <Icon size={15} className="shrink-0 text-muted" />}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && <span className="shrink-0 text-[11px] text-muted">{count}</span>}
      </button>
    </div>
  );
}

function nodeBreadcrumb(
  node: TreeNode,
  r: { propName: (id?: string) => string; tenantName: (id?: string) => string; projName: (id?: string) => string }
): string {
  const base = "Pasta Digital";
  switch (node.kind) {
    case "todas":
      return `${base} / Todas`;
    case "property":
      return `${base} / Por imóvel / ${r.propName(node.propertyId)}${node.categoria ? ` / ${node.categoria}` : ""}`;
    case "categoria":
      return `${base} / Por categoria / ${node.categoria}`;
    case "tenant":
      return `${base} / Por inquilino / ${r.tenantName(node.tenantId)}`;
    case "projeto":
      return `${base} / Projetos / ${r.projName(node.projectId)}`;
    case "folder":
      return `${base} / Pastas / ${node.nome}`;
    case "lixo":
      return `${base} / Lixo`;
  }
}

// ───────────────────────── Cartão / Tabela ─────────────────────────

function AssocBadges({
  d,
  propName,
  tenantName,
  projName,
}: {
  d: PropertyDocument;
  propName: (id?: string) => string;
  tenantName: (id?: string) => string;
  projName?: (id?: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {d.propertyId && <Badge tone="info">{propName(d.propertyId)}</Badge>}
      {d.tenantId && <Badge tone="neutral">{tenantName(d.tenantId)}</Badge>}
      {d.projectId && projName && <Badge tone="gold">{projName(d.projectId)}</Badge>}
    </div>
  );
}

function ExpiraSelo({ d }: { d: PropertyDocument }) {
  if (!d.expiraEm) return null;
  const dias = diasAteExpiracao(d.expiraEm);
  if (dias === null) return null;
  const tone = dias <= 30 ? "danger" : dias <= 90 ? "warning" : "neutral";
  return <Badge tone={tone as "danger" | "warning" | "neutral"}>expira em {dias}d</Badge>;
}

function DocCard({
  d,
  selected,
  onToggle,
  onOpen,
  propName,
  tenantName,
  projName,
}: {
  d: PropertyDocument;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  propName: (id?: string) => string;
  tenantName: (id?: string) => string;
  projName: (id?: string) => string;
}) {
  const Icon = iconForDoc(d);
  return (
    <div
      className={cn(
        "group relative cursor-pointer rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
        selected ? "border-primary ring-1 ring-primary/30" : "border-line"
      )}
      onClick={onOpen}
    >
      <input
        type="checkbox"
        checked={selected}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggle}
        className="absolute right-3 top-3 h-4 w-4 accent-primary"
      />
      <div className="flex items-start gap-3">
        {isDataImage(d) ? (
          <img src={d.ficheiroUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-line object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1 pr-5">
          <p className="truncate text-sm font-medium text-ink" title={d.nome}>
            {d.nome}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {d.categoria} · {formatBytes(d.tamanho)} · {dataPT(d.uploadedAt)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <AssocBadges d={d} propName={propName} tenantName={tenantName} projName={projName} />
        <ExpiraSelo d={d} />
      </div>
    </div>
  );
}

function DocTable({
  docs,
  sel,
  onToggle,
  onOpen,
  propName,
  tenantName,
}: {
  docs: PropertyDocument[];
  sel: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  propName: (id?: string) => string;
  tenantName: (id?: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-accent/40 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="w-8 px-3 py-2.5" />
            <th className="px-3 py-2.5">Nome</th>
            <th className="px-3 py-2.5">Categoria</th>
            <th className="hidden px-3 py-2.5 md:table-cell">Associação</th>
            <th className="hidden px-3 py-2.5 sm:table-cell">Tamanho</th>
            <th className="px-3 py-2.5">Data</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => {
            const Icon = iconForDoc(d);
            return (
              <tr key={d.id} className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-accent/30" onClick={() => onOpen(d.id)}>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={sel.has(d.id)} onChange={() => onToggle(d.id)} className="h-4 w-4 accent-primary" />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="shrink-0 text-secondary" />
                    <span className="truncate text-ink">{d.nome}</span>
                    <ExpiraSelo d={d} />
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted">{d.categoria}</td>
                <td className="hidden px-3 py-2.5 md:table-cell">
                  {d.propertyId ? propName(d.propertyId) : d.tenantId ? tenantName(d.tenantId) : <span className="text-muted">—</span>}
                </td>
                <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{formatBytes(d.tamanho)}</td>
                <td className="px-3 py-2.5 text-muted">{dataPT(d.uploadedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────── Barra de lote ─────────────────────────

function BulkBar({ count, ids, onDone, lixo }: { count: number; ids: string[]; onDone: () => void; lixo: boolean }) {
  const trash = useDocumentsStore((s) => s.trash);
  const restore = useDocumentsStore((s) => s.restore);
  const remove = useDocumentsStore((s) => s.remove);
  const setCategoria = useDocumentsStore((s) => s.setCategoria);
  const update = useDocumentsStore((s) => s.update);

  const aplicarCategoria = () => {
    const c = window.prompt(`Nova categoria (${DOC_CATEGORIAS.join(", ")}):`);
    if (c && (DOC_CATEGORIAS as string[]).includes(c)) {
      ids.forEach((id) => setCategoria(id, c as DocCategoria));
      toast.success(`Categoria alterada para ${c}`);
      onDone();
    }
  };
  const etiquetar = () => {
    const t = window.prompt("Etiqueta a adicionar:");
    if (t && t.trim()) {
      ids.forEach((id) => {
        const doc = useDocumentsStore.getState().documents.find((d) => d.id === id);
        update(id, { tags: [...new Set([...(doc?.tags ?? []), t.trim()])] });
      });
      toast.success("Etiqueta adicionada");
      onDone();
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-accent p-2.5">
      <span className="px-1 text-sm font-medium text-primary">{count} selecionado(s)</span>
      <span className="flex-1" />
      <Button size="sm" variant="ghost" onClick={() => { toast.success("Download iniciado (ZIP)"); onDone(); }}>
        <Download size={14} /> Descarregar
      </Button>
      {!lixo && (
        <>
          <Button size="sm" variant="ghost" onClick={aplicarCategoria}>
            <FolderInput size={14} /> Categoria
          </Button>
          <Button size="sm" variant="ghost" onClick={etiquetar}>
            <TagIcon size={14} /> Etiquetar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(`${count} documentos`); toast.success("Link de partilha copiado"); onDone(); }}>
            <Share2 size={14} /> Partilhar
          </Button>
        </>
      )}
      {lixo ? (
        <>
          <Button size="sm" variant="ghost" onClick={() => { ids.forEach(restore); toast.success("Restaurado(s)"); onDone(); }}>
            <RotateCcw size={14} /> Restaurar
          </Button>
          <Button size="sm" variant="danger" onClick={() => { ids.forEach(remove); toast.success("Eliminado(s) definitivamente"); onDone(); }}>
            <Trash2 size={14} /> Eliminar
          </Button>
        </>
      ) : (
        <Button size="sm" variant="danger" onClick={() => { ids.forEach(trash); toast.success("Movido(s) para o Lixo"); onDone(); }}>
          <Trash2 size={14} /> Eliminar
        </Button>
      )}
    </div>
  );
}

// ───────────────────────── Painel lateral ─────────────────────────

function DocPanel({
  doc,
  onClose,
  propName,
  tenantName,
  projName,
}: {
  doc: PropertyDocument;
  onClose: () => void;
  propName: (id?: string) => string;
  tenantName: (id?: string) => string;
  projName: (id?: string) => string;
}) {
  const rename = useDocumentsStore((s) => s.rename);
  const setCategoria = useDocumentsStore((s) => s.setCategoria);
  const associate = useDocumentsStore((s) => s.associate);
  const update = useDocumentsStore((s) => s.update);
  const move = useDocumentsStore((s) => s.move);
  const trash = useDocumentsStore((s) => s.trash);
  const restore = useDocumentsStore((s) => s.restore);
  const remove = useDocumentsStore((s) => s.remove);

  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const projects = useProjectStagesStore((s) => s.projects);
  const customFolders = useDocumentsStore((s) => s.customFolders);

  const [lightbox, setLightbox] = useState(false);
  const Icon = iconForDoc(doc);
  const g = tipoGrupo(doc.mimeType);
  const semFicheiro = doc.ficheiroUrl === "#" || doc.ficheiroUrl === "";

  const baixar = () => {
    if (semFicheiro) {
      toast.info("Documento de exemplo — sem ficheiro real para descarregar.");
      return;
    }
    const a = document.createElement("a");
    a.href = doc.ficheiroUrl;
    a.download = doc.nome;
    a.click();
  };
  const partilhar = () => {
    navigator.clipboard?.writeText(`https://redegest-app.vercel.app/d/${doc.id}`);
    toast.success("Link de partilha copiado");
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-display text-base font-semibold text-ink">Documento</p>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Preview */}
          <div className="mb-4 overflow-hidden rounded-xl border border-line bg-bg">
            {isDataImage(doc) ? (
              <button onClick={() => setLightbox(true)} className="group relative block w-full">
                <img src={doc.ficheiroUrl} alt="" className="max-h-64 w-full object-cover" />
                <span className="absolute right-2 top-2 rounded-full bg-ink/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Maximize2 size={14} />
                </span>
              </button>
            ) : g === "pdf" && !semFicheiro ? (
              <iframe title={doc.nome} src={doc.ficheiroUrl} className="h-64 w-full" />
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted">
                <Icon size={34} />
                <p className="text-xs">{semFicheiro ? "Pré-visualização indisponível (exemplo)" : "Sem pré-visualização"}</p>
              </div>
            )}
          </div>

          {/* Nome (rename) */}
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Nome</span>
            <input
              defaultValue={doc.nome}
              onBlur={(e) => e.target.value.trim() && rename(doc.id, e.target.value.trim())}
              className="h-9 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
            />
          </label>

          {/* Categoria */}
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Categoria</span>
            <select value={doc.categoria} onChange={(e) => setCategoria(doc.id, e.target.value as DocCategoria)} className={panelSel}>
              {DOC_CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          {/* Pasta (mover) */}
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Pasta personalizada</span>
            <select value={doc.pasta ?? ""} onChange={(e) => move(doc.id, e.target.value || undefined)} className={panelSel}>
              <option value="">— Nenhuma —</option>
              {customFolders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>

          {/* Associações */}
          <div className="mb-3 grid grid-cols-1 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Imóvel</span>
              <select value={doc.propertyId ?? ""} onChange={(e) => associate(doc.id, { propertyId: e.target.value || undefined })} className={panelSel}>
                <option value="">— Sem imóvel —</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Inquilino</span>
              <select value={doc.tenantId ?? ""} onChange={(e) => associate(doc.id, { tenantId: e.target.value || undefined })} className={panelSel}>
                <option value="">— Sem inquilino —</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.nomeCompleto}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Projeto</span>
              <select value={doc.projectId ?? ""} onChange={(e) => associate(doc.id, { projectId: e.target.value || undefined })} className={panelSel}>
                <option value="">— Sem projeto —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Expiração */}
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Expira em (opcional)</span>
            <input type="date" defaultValue={doc.expiraEm ?? ""} onChange={(e) => update(doc.id, { expiraEm: e.target.value || undefined })} className={panelSel} />
          </label>

          {/* Notas */}
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Notas</span>
            <textarea
              defaultValue={doc.notas ?? ""}
              onBlur={(e) => update(doc.id, { notas: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-secondary"
            />
          </label>

          {/* Metadados */}
          <div className="rounded-lg border border-line bg-bg/50 p-3 text-xs text-muted">
            <p>Tamanho: <span className="text-ink">{formatBytes(doc.tamanho)}</span></p>
            <p>Tipo: <span className="text-ink">{doc.mimeType}</span></p>
            <p>Carregado: <span className="text-ink">{dataPT(doc.uploadedAt)}</span></p>
            <div className="mt-1 flex flex-wrap gap-1">
              <AssocBadges d={doc} propName={propName} tenantName={tenantName} projName={projName} />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
          <Button variant="outline" size="sm" onClick={baixar}><Download size={14} /> Download</Button>
          <Button variant="outline" size="sm" onClick={partilhar}><Share2 size={14} /> Partilhar</Button>
          {doc.deletedAt ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { restore(doc.id); toast.success("Restaurado"); onClose(); }}><RotateCcw size={14} /> Restaurar</Button>
              <Button variant="danger" size="sm" onClick={() => { remove(doc.id); toast.success("Eliminado"); onClose(); }}><Trash2 size={14} /> Eliminar</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { const n = window.prompt("Novo nome:", doc.nome); if (n?.trim()) rename(doc.id, n.trim()); }}><Pencil size={14} /> Renomear</Button>
              <Button variant="danger" size="sm" onClick={() => { trash(doc.id); toast.success("Movido para o Lixo"); onClose(); }}><Trash2 size={14} /> Eliminar</Button>
            </>
          )}
        </div>
      </aside>

      {lightbox && isDataImage(doc) && (
        <Lightbox fotos={[{ url: doc.ficheiroUrl, legenda: doc.nome }]} onClose={() => setLightbox(false)} />
      )}
    </>
  );
}

const panelSel = "h-9 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

// ───────────────────────── Upload ─────────────────────────

interface PendingFile {
  key: string;
  nome: string;
  categoria: DocCategoria;
  mimeType: string;
  tamanho: number;
  ficheiroUrl: string;
}

const MAX_BYTES = 25 * 1024 * 1024;
const ACEITES = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx";

function UploadModal({ onClose, initialNode }: { onClose: () => void; initialNode: TreeNode }) {
  const add = useDocumentsStore((s) => s.add);
  const customFolders = useDocumentsStore((s) => s.customFolders);
  const properties = usePropertiesStore((s) => s.properties);
  const tenants = useTenantsStore((s) => s.tenants);
  const contracts = useContractsStore((s) => s.contracts);
  const projects = useProjectStagesStore((s) => s.projects);

  const [files, setFiles] = useState<PendingFile[]>([]);
  const [drag, setDrag] = useState(false);
  // associações comuns — pré-preenche pelo nó atual
  const [propertyId, setPropertyId] = useState(initialNode.kind === "property" ? initialNode.propertyId : "");
  const [tenantId, setTenantId] = useState(initialNode.kind === "tenant" ? initialNode.tenantId : "");
  const [contractId, setContractId] = useState("");
  const [projectId, setProjectId] = useState(initialNode.kind === "projeto" ? initialNode.projectId : "");
  const [pasta, setPasta] = useState(initialNode.kind === "folder" ? initialNode.nome : "");
  const [expiraEm, setExpiraEm] = useState("");
  const [notas, setNotas] = useState("");

  const onFiles = (list: FileList) => {
    const novos: PendingFile[] = [];
    Array.from(list).forEach((f) => {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} excede 25 MB`);
        return;
      }
      const r = new FileReader();
      r.onload = () => {
        setFiles((prev) =>
          prev.map((p) => (p.key === key ? { ...p, ficheiroUrl: String(r.result) } : p))
        );
      };
      const key = `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 6)}`;
      novos.push({
        key,
        nome: f.name,
        categoria: sugerirCategoria(f.name),
        mimeType: f.type || "application/octet-stream",
        tamanho: f.size,
        ficheiroUrl: "#",
      });
      r.readAsDataURL(f);
    });
    setFiles((prev) => [...prev, ...novos]);
  };

  const guardar = () => {
    if (files.length === 0) {
      toast.error("Adicione pelo menos um ficheiro");
      return;
    }
    files.forEach((f) => {
      add({
        nome: f.nome,
        ficheiroUrl: f.ficheiroUrl,
        mimeType: f.mimeType,
        tamanho: f.tamanho,
        categoria: f.categoria,
        uploadedAt: new Date().toISOString().slice(0, 10),
        propertyId: propertyId || undefined,
        tenantId: tenantId || undefined,
        contractId: contractId || undefined,
        projectId: projectId || undefined,
        pasta: pasta || undefined,
        expiraEm: expiraEm || undefined,
        notas: notas || undefined,
      });
    });
    toast.success(`${files.length} documento(s) carregado(s)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Carregar documentos</h2>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Dropzone */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-sm transition-colors",
              drag ? "border-primary bg-accent" : "border-line bg-bg text-muted hover:bg-accent"
            )}
          >
            <Upload size={26} className="text-primary" />
            <span>Arrastar ficheiros para aqui ou <span className="font-medium text-primary">escolher</span></span>
            <span className="text-xs text-muted">PDF, JPG, PNG, DOC, DOCX, XLSX · máx. 25 MB</span>
            <input type="file" multiple accept={ACEITES} className="hidden" onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }} />
          </label>

          {/* Ficheiros */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f) => (
                <div key={f.key} className="flex items-center gap-2 rounded-lg border border-line bg-bg/40 p-2">
                  <FileText size={16} className="shrink-0 text-secondary" />
                  <input
                    value={f.nome}
                    onChange={(e) => setFiles((prev) => prev.map((p) => (p.key === f.key ? { ...p, nome: e.target.value } : p)))}
                    className="h-8 min-w-0 flex-1 rounded border border-line bg-card px-2 text-sm outline-none focus:border-secondary"
                  />
                  <select
                    value={f.categoria}
                    onChange={(e) => setFiles((prev) => prev.map((p) => (p.key === f.key ? { ...p, categoria: e.target.value as DocCategoria } : p)))}
                    className="h-8 rounded border border-line bg-card px-1.5 text-xs outline-none"
                  >
                    {DOC_CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="shrink-0 text-[11px] text-muted">{formatBytes(f.tamanho)}</span>
                  <button onClick={() => setFiles((prev) => prev.filter((p) => p.key !== f.key))} className="text-muted hover:text-danger"><X size={15} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Associações comuns */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Sel label="Imóvel" value={propertyId} onChange={setPropertyId} options={[{ v: "", l: "— Nenhum —" }, ...properties.map((p) => ({ v: p.id, l: p.name }))]} />
            <Sel label="Inquilino" value={tenantId} onChange={setTenantId} options={[{ v: "", l: "— Nenhum —" }, ...tenants.map((t) => ({ v: t.id, l: t.nomeCompleto }))]} />
            <Sel label="Contrato" value={contractId} onChange={setContractId} options={[{ v: "", l: "— Nenhum —" }, ...contracts.map((c) => ({ v: c.id, l: c.id }))]} />
            <Sel label="Projeto" value={projectId} onChange={setProjectId} options={[{ v: "", l: "— Nenhum —" }, ...projects.map((p) => ({ v: p.id, l: p.nome }))]} />
            <Sel label="Pasta personalizada" value={pasta} onChange={setPasta} options={[{ v: "", l: "— Nenhuma —" }, ...customFolders.map((f) => ({ v: f, l: f }))]} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Expira em (opcional)</span>
              <input type="date" value={expiraEm} onChange={(e) => setExpiraEm(e.target.value)} className={panelSel} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">Notas (opcional)</span>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas sobre os documentos…" className={panelSel} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar}><Upload size={16} /> Carregar {files.length > 0 ? `(${files.length})` : ""}</Button>
        </div>
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={panelSel}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}
