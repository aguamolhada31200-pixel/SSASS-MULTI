import { useEffect, useMemo, useRef, useState } from "react";
import { toastSuccess, toastError, toastInfo } from "@/lib/toast";
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
  Download,
  Pencil,
  FolderInput,
  X,
  AlertTriangle,
  Folder as FolderIcon,
  FolderOpen,
  Building2,
  Users,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  SlidersHorizontal,
  Maximize2,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExampleDataToggle } from "@/components/ExampleDataToggle";
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
import { useFoldersStore, type Folder, type SecaoTopo } from "@/store/useFoldersStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { useCollabStore } from "@/store/useCollabStore";
import { useExampleData } from "@/store/useExampleData";
import { dataPT } from "@/lib/format";
import { cn } from "@/lib/utils";

// ───────────────────────── Tipos de localização (Explorador) ─────────────────────────

type Loc =
  | { kind: "root" }
  | { kind: "imoveis" }
  | { kind: "colaborativa" }
  | { kind: "sem" }
  | { kind: "lixo" }
  | { kind: "property"; propertyId: string }
  | { kind: "project"; projectId: string }
  | { kind: "folder"; folderId: string };

function locKey(l: Loc): string {
  switch (l.kind) {
    case "property": return `property:${l.propertyId}`;
    case "project": return `project:${l.projectId}`;
    case "folder": return `folder:${l.folderId}`;
    default: return l.kind;
  }
}
function sameLoc(a: Loc, b: Loc) { return locKey(a) === locKey(b); }

function isSeedDoc(d: PropertyDocument) { return d.id.startsWith("seed-doc-"); }
function isSeedProperty(id: string) { return id.startsWith("seed-"); }

// ───────────────────────── Ícones por tipo ─────────────────────────

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
function isDataImage(d: PropertyDocument): boolean {
  return d.mimeType.startsWith("image/") && d.ficheiroUrl !== "#" && d.ficheiroUrl !== "";
}

// Item mostrado no conteúdo (pasta navegável OU documento).
type Item =
  | { type: "folder"; id: string; nome: string; loc: Loc; icon: LucideIcon; count: number }
  | { type: "doc"; doc: PropertyDocument };

// ───────────────────────── Página ─────────────────────────

export default function PastaDigital() {
  const documents = useDocumentsStore((s) => s.documents);
  const addDoc = useDocumentsStore((s) => s.add);
  const moveDocToFolder = useDocumentsStore((s) => s.moveToFolder);
  const renameDoc = useDocumentsStore((s) => s.rename);
  const folders = useFoldersStore((s) => s.folders);
  const addFolder = useFoldersStore((s) => s.add);
  const renameFolder = useFoldersStore((s) => s.rename);
  const removeFolder = useFoldersStore((s) => s.remove);
  const enabled = useExampleData((s) => s.enabled);

  const properties = usePropertiesStore((s) => s.properties);
  const collabProjects = useCollabStore((s) => s.projects);

  // Exemplo OFF → esconde os seeds, mas mantém sempre os dados do utilizador.
  const docs = enabled ? documents : documents.filter((d) => !isSeedDoc(d));
  const imoveis = enabled ? properties : properties.filter((p) => !isSeedProperty(p.id));
  const ativos = docs.filter((d) => !d.deletedAt);
  const naLixeira = docs.filter((d) => d.deletedAt);
  const projetos = enabled ? collabProjects : collabProjects.filter((p) => ativos.some((d) => d.projectId === p.id));

  const propName = (id?: string) => imoveis.find((p) => p.id === id)?.name ?? properties.find((p) => p.id === id)?.name ?? "Imóvel";
  const projName = (id?: string) => collabProjects.find((p) => p.id === id)?.title ?? "Projeto";
  const folderById = (id?: string) => folders.find((f) => f.id === id);

  // Navegação com histórico (setas voltar/avançar)
  const [hist, setHist] = useState<Loc[]>([{ kind: "root" }]);
  const [hi, setHi] = useState(0);
  const loc = hist[hi];
  const navigate = (l: Loc) => {
    if (sameLoc(l, loc)) return;
    const novo = hist.slice(0, hi + 1);
    novo.push(l);
    setHist(novo);
    setHi(novo.length - 1);
    setSel(new Set());
  };
  const back = () => { if (hi > 0) { setHi(hi - 1); setSel(new Set()); } };
  const forward = () => { if (hi < hist.length - 1) { setHi(hi + 1); setSel(new Set()); } };
  const parentLoc = (l: Loc): Loc => {
    switch (l.kind) {
      case "property": return { kind: "imoveis" };
      case "project": return { kind: "colaborativa" };
      case "folder": {
        const f = folderById(l.folderId);
        if (f?.parentId) return { kind: "folder", folderId: f.parentId };
        if (f?.propertyId) return { kind: "property", propertyId: f.propertyId };
        if (f?.projectId) return { kind: "project", projectId: f.projectId };
        if (f?.secao) return { kind: f.secao } as Loc;
        return { kind: "sem" };
      }
      case "imoveis": case "colaborativa": case "sem": case "lixo": return { kind: "root" };
      default: return { kind: "root" };
    }
  };
  const up = () => navigate(parentLoc(loc));

  const [q, setQ] = useState("");
  const [view, setView] = useState<"lista" | "grid">("lista");
  const [sort, setSort] = useState<{ campo: "nome" | "tipo" | "tamanho" | "data" | "validade"; asc: boolean }>({ campo: "nome", asc: true });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [lastClick, setLastClick] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["imoveis", "colaborativa", "sem"]));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; doc: PropertyDocument } | null>(null);
  const [folderCtx, setFolderCtx] = useState<{ x: number; y: number; folderId: string; nome: string } | null>(null);
  // Diálogos estilizados (substituem window.prompt / window.confirm)
  const [nomeModal, setNomeModal] = useState<{ titulo: string; valor: string; cta: string; placeholder?: string; onOk: (nome: string) => void } | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ folderId: string; nome: string } | null>(null);
  const [filtOpen, setFiltOpen] = useState(false);
  const [fTipo, setFTipo] = useState<"todos" | TipoGrupo>("todos");
  const [fExpira, setFExpira] = useState(false);

  const toggleExpand = (k: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  // ── Conteúdo derivado da localização atual ──
  const subFoldersDe = (propertyId: string | null, projectId: string | null, parentId: string | null): Folder[] =>
    folders.filter((f) => f.propertyId === propertyId && f.projectId === projectId && f.parentId === parentId);

  // Pastas manuais de topo (sem imóvel/projeto/parent) de uma secção.
  const pastasTopo = (secao: SecaoTopo): Folder[] =>
    folders.filter((f) => !f.propertyId && !f.projectId && !f.parentId && f.secao === secao);

  const docCountFolder = (fid: string) => ativos.filter((d) => d.pastaId === fid).length;
  const docsSemAssoc = ativos.filter((d) => !d.propertyId && !d.projectId && !d.pastaId);

  const conteudo: Item[] = useMemo(() => {
    const folderItem = (f: Folder): Item => ({ type: "folder", id: f.id, nome: f.nome, loc: { kind: "folder", folderId: f.id }, icon: FolderIcon, count: docCountFolder(f.id) });
    switch (loc.kind) {
      case "root":
        return [
          { type: "folder", id: "g-imoveis", nome: "Os meus imóveis", loc: { kind: "imoveis" }, icon: Building2, count: imoveis.length + pastasTopo("imoveis").length },
          { type: "folder", id: "g-colab", nome: "Gestão Colaborativa", loc: { kind: "colaborativa" }, icon: Users, count: projetos.length + pastasTopo("colaborativa").length },
          { type: "folder", id: "g-sem", nome: "Sem associação", loc: { kind: "sem" }, icon: FolderIcon, count: docsSemAssoc.length + pastasTopo("sem").length },
        ];
      case "imoveis": {
        const props = imoveis.map((p) => ({ type: "folder", id: p.id, nome: p.name, loc: { kind: "property", propertyId: p.id }, icon: FolderIcon, count: ativos.filter((d) => d.propertyId === p.id).length } as Item));
        return [...props, ...pastasTopo("imoveis").map(folderItem)];
      }
      case "colaborativa": {
        const projs = projetos.map((p) => ({ type: "folder", id: p.id, nome: p.title, loc: { kind: "project", projectId: p.id }, icon: FolderIcon, count: ativos.filter((d) => d.projectId === p.id).length } as Item));
        return [...projs, ...pastasTopo("colaborativa").map(folderItem)];
      }
      case "property": {
        const subs = subFoldersDe(loc.propertyId, null, null).map(folderItem);
        const ds = ativos.filter((d) => d.propertyId === loc.propertyId && !d.pastaId).map((d) => ({ type: "doc", doc: d } as Item));
        return [...subs, ...ds];
      }
      case "project": {
        const subs = subFoldersDe(null, loc.projectId, null).map(folderItem);
        const ds = ativos.filter((d) => d.projectId === loc.projectId && !d.pastaId).map((d) => ({ type: "doc", doc: d } as Item));
        return [...subs, ...ds];
      }
      case "folder": {
        const subs = folders.filter((f) => f.parentId === loc.folderId).map(folderItem);
        const ds = ativos.filter((d) => d.pastaId === loc.folderId).map((d) => ({ type: "doc", doc: d } as Item));
        return [...subs, ...ds];
      }
      case "sem":
        return [...pastasTopo("sem").map(folderItem), ...docsSemAssoc.map((d) => ({ type: "doc", doc: d } as Item))];
      case "lixo":
        return naLixeira.map((d) => ({ type: "doc", doc: d } as Item));
    }
  }, [loc, ativos, naLixeira, folders, imoveis, projetos]);

  // Filtro + pesquisa + ordenação (pastas sempre primeiro)
  const itens = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filtrados = conteudo.filter((it) => {
      if (it.type === "folder") return ql ? it.nome.toLowerCase().includes(ql) : true;
      const d = it.doc;
      if (ql && !`${d.nome} ${d.notas ?? ""}`.toLowerCase().includes(ql)) return false;
      if (fTipo !== "todos" && tipoGrupo(d.mimeType) !== fTipo) return false;
      if (fExpira && !expiraEmBreve(d, 30)) return false;
      return true;
    });
    const pastas = filtrados.filter((i) => i.type === "folder");
    const docsF = filtrados.filter((i) => i.type === "doc") as Extract<Item, { type: "doc" }>[];
    const dir = sort.asc ? 1 : -1;
    const cmp = (a: Extract<Item, { type: "doc" }>, b: Extract<Item, { type: "doc" }>) => {
      const da = a.doc, db = b.doc;
      switch (sort.campo) {
        case "nome": return da.nome.localeCompare(db.nome) * dir;
        case "tipo": return tipoGrupo(da.mimeType).localeCompare(tipoGrupo(db.mimeType)) * dir;
        case "tamanho": return ((da.tamanho ?? 0) - (db.tamanho ?? 0)) * dir;
        case "data": return da.uploadedAt.localeCompare(db.uploadedAt) * dir;
        case "validade": return (da.expiraEm ?? "9999").localeCompare(db.expiraEm ?? "9999") * dir;
      }
    };
    docsF.sort(cmp);
    (pastas as Extract<Item, { type: "folder" }>[]).sort((a, b) => a.nome.localeCompare(b.nome) * (sort.campo === "nome" ? dir : 1));
    return [...pastas, ...docsF];
  }, [conteudo, q, fTipo, fExpira, sort]);

  const docsNaVista = itens.filter((i) => i.type === "doc") as Extract<Item, { type: "doc" }>[];
  const totalBytes = docsNaVista.reduce((s, i) => s + (i.doc.tamanho ?? 0), 0);
  const aExpirar = ativos.filter((d) => expiraEmBreve(d, 30));

  const breadcrumb = useMemo(() => {
    const segs: { label: string; loc: Loc }[] = [{ label: "Pasta Digital", loc: { kind: "root" } }];
    const chain: Loc[] = [];
    let cur: Loc = loc;
    while (cur.kind !== "root") { chain.unshift(cur); cur = parentLoc(cur); }
    for (const l of chain) {
      let label = "";
      if (l.kind === "imoveis") label = "Os meus imóveis";
      else if (l.kind === "colaborativa") label = "Gestão Colaborativa";
      else if (l.kind === "sem") label = "Sem associação";
      else if (l.kind === "lixo") label = "Lixo";
      else if (l.kind === "property") label = propName(l.propertyId);
      else if (l.kind === "project") label = projName(l.projectId);
      else if (l.kind === "folder") label = folderById(l.folderId)?.nome ?? "Pasta";
      segs.push({ label, loc: l });
    }
    return segs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, folders, imoveis, projetos]);

  // Contexto para criar subpasta / pré-preencher upload a partir da localização.
  // `secao` só é usado ao criar pastas manuais de topo; `label` é o destino a mostrar no upload.
  type Ctx = { propertyId: string | null; projectId: string | null; parentId: string | null; secao?: SecaoTopo; label: string | null };
  const contextoAtual: Ctx = useMemo(() => {
    if (loc.kind === "property") return { propertyId: loc.propertyId, projectId: null, parentId: null, label: propName(loc.propertyId) };
    if (loc.kind === "project") return { propertyId: null, projectId: loc.projectId, parentId: null, label: projName(loc.projectId) };
    if (loc.kind === "folder") { const f = folderById(loc.folderId); return { propertyId: f?.propertyId ?? null, projectId: f?.projectId ?? null, parentId: loc.folderId, secao: f?.secao, label: f?.nome ?? "Pasta" }; }
    if (loc.kind === "imoveis") return { propertyId: null, projectId: null, parentId: null, secao: "imoveis", label: null };
    if (loc.kind === "colaborativa") return { propertyId: null, projectId: null, parentId: null, secao: "colaborativa", label: null };
    if (loc.kind === "sem") return { propertyId: null, projectId: null, parentId: null, secao: "sem", label: null };
    return { propertyId: null, projectId: null, parentId: null, label: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, folders]);

  // Pode criar pasta em qualquer secção (imóveis / colaborativa / sem), dentro de um
  // imóvel/projeto ou dentro de uma subpasta — só não na raiz nem no Lixo.
  const podeCriarPasta = loc.kind !== "root" && loc.kind !== "lixo";

  const novaPasta = () => {
    if (!podeCriarPasta) { toastInfo("Abra uma secção, imóvel ou projeto para criar a pasta."); return; }
    setNomeModal({
      titulo: "Nova pasta", valor: "", cta: "Criar pasta", placeholder: "Ex.: Documentos essenciais",
      onOk: (nome) => {
        addFolder({ nome, propertyId: contextoAtual.propertyId, projectId: contextoAtual.projectId, parentId: contextoAtual.parentId, secao: contextoAtual.secao });
        toastSuccess("Pasta criada", nome);
      },
    });
  };

  const renomearPasta = (folderId: string, nomeAtual: string) => {
    setNomeModal({
      titulo: "Renomear pasta", valor: nomeAtual, cta: "Guardar", placeholder: "Nome da pasta",
      onOk: (nome) => { renameFolder(folderId, nome); toastSuccess("Pasta renomeada", nome); },
    });
  };

  const renomearDoc = (d: PropertyDocument) => {
    setNomeModal({
      titulo: "Renomear documento", valor: d.nome, cta: "Guardar", placeholder: "Nome do documento",
      onOk: (nome) => { renameDoc(d.id, nome); toastSuccess("Documento renomeado", nome); },
    });
  };

  const eliminarPasta = (folderId: string, nome: string) => setConfirmDel({ folderId, nome });

  const confirmarEliminarPasta = () => {
    if (!confirmDel) return;
    const { folderId } = confirmDel;
    const alvo = parentLoc({ kind: "folder", folderId });
    const removidos = removeFolder(folderId);
    documents.forEach((d) => { if (d.pastaId && removidos.includes(d.pastaId)) moveDocToFolder(d.id, undefined); });
    if (loc.kind === "folder" && removidos.includes(loc.folderId)) navigate(alvo);
    toastSuccess("Pasta eliminada", "Os documentos foram mantidos na secção.");
    setConfirmDel(null);
  };

  // Seleção com click / Ctrl / Shift
  const idsVisiveis = docsNaVista.map((i) => i.doc.id);
  const clicarDoc = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClick) {
      const a = idsVisiveis.indexOf(lastClick), b = idsVisiveis.indexOf(id);
      if (a >= 0 && b >= 0) { const [lo, hi2] = a < b ? [a, b] : [b, a]; setSel(new Set(idsVisiveis.slice(lo, hi2 + 1))); return; }
    }
    if (e.ctrlKey || e.metaKey) { setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); setLastClick(id); return; }
    setSel(new Set([id])); setLastClick(id);
  };

  useEffect(() => { const close = () => setCtx(null); if (ctx) { window.addEventListener("click", close); window.addEventListener("scroll", close, true); return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); }; } }, [ctx]);
  useEffect(() => { const close = () => setFolderCtx(null); if (folderCtx) { window.addEventListener("click", close); window.addEventListener("scroll", close, true); return () => { window.removeEventListener("click", close); window.removeEventListener("scroll", close, true); }; } }, [folderCtx]);

  const abrirDoc = (d: PropertyDocument) => setPanelId(d.id);
  const panelDoc = panelId ? documents.find((d) => d.id === panelId) ?? null : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Pasta Digital</h1>
          <p className="text-sm text-muted">Todos os documentos num só sítio — organizados por imóvel e projeto, como no explorador.</p>
        </div>
        <ExampleDataToggle />
      </div>

      {/* Alerta de expiração compacto */}
      {aExpirar.length > 0 && loc.kind !== "lixo" && (
        <button
          onClick={() => { navigate({ kind: "root" }); setFExpira(true); toastInfo("Filtro aplicado: expira em breve"); }}
          className="mb-3 flex w-full items-center gap-2 rounded-lg border border-warning/40 bg-warning/8 px-3 py-2 text-sm text-warning"
        >
          <AlertTriangle size={15} className="shrink-0" />
          <span className="font-medium">{aExpirar.length} {aExpirar.length === 1 ? "documento expira" : "documentos expiram"} nos próximos 30 dias</span>
          <span className="ml-auto underline">Ver</span>
        </button>
      )}

      {/* Barra superior: navegação + breadcrumb + ações */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5">
          <NavBtn icon={ArrowLeft} title="Voltar" disabled={hi === 0} onClick={back} />
          <NavBtn icon={ArrowRight} title="Avançar" disabled={hi >= hist.length - 1} onClick={forward} />
          <NavBtn icon={ArrowUp} title="Subir um nível" disabled={loc.kind === "root"} onClick={up} />
        </div>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-line bg-card px-3 py-2 text-sm">
          {breadcrumb.map((s, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1">
              {i > 0 && <ChevronRight size={13} className="text-muted/60" />}
              <button onClick={() => navigate(s.loc)} className={cn("truncate rounded px-1 hover:bg-accent", i === breadcrumb.length - 1 ? "font-semibold text-ink" : "text-muted")}>{s.label}</button>
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3">
          <Search size={15} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar…" className="h-9 w-32 bg-transparent text-sm outline-none sm:w-44" />
        </div>
        <div className="relative">
          <Button variant={fTipo !== "todos" || fExpira ? "gold" : "outline"} size="sm" onClick={() => setFiltOpen((v) => !v)}>
            <SlidersHorizontal size={14} /> Filtros
          </Button>
          {filtOpen && (
            <FilterPopover
              fTipo={fTipo} setFTipo={setFTipo} fExpira={fExpira} setFExpira={setFExpira}
              onClose={() => setFiltOpen(false)} onLimpar={() => { setFTipo("todos"); setFExpira(false); }}
            />
          )}
        </div>
        <Button variant="outline" size="sm" onClick={novaPasta} disabled={!podeCriarPasta} title={podeCriarPasta ? "Nova pasta" : "Abra uma secção para criar"}>
          <FolderPlus size={14} /> Nova pasta
        </Button>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload size={14} /> Carregar documento
        </Button>
        <div className="flex overflow-hidden rounded-lg border border-line">
          <button onClick={() => setView("lista")} className={cn("flex h-9 w-9 items-center justify-center", view === "lista" ? "bg-primary text-white" : "bg-card text-muted hover:bg-accent")} title="Lista"><ListIcon size={15} /></button>
          <button onClick={() => setView("grid")} className={cn("flex h-9 w-9 items-center justify-center", view === "grid" ? "bg-primary text-white" : "bg-card text-muted hover:bg-accent")} title="Grelha"><LayoutGrid size={15} /></button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* ───────── Árvore ───────── */}
        <aside className="h-fit rounded-xl border border-line bg-card p-2 lg:sticky lg:top-2">
          <TreeRow depth={0} icon={FolderOpen} label="Pasta Digital" active={loc.kind === "root"} onClick={() => navigate({ kind: "root" })} />
          {/* Os meus imóveis */}
          <TreeRow depth={1} icon={Building2} label="Os meus imóveis" active={loc.kind === "imoveis"} expandable open={expanded.has("imoveis")} onToggle={() => toggleExpand("imoveis")} onClick={() => navigate({ kind: "imoveis" })} />
          {expanded.has("imoveis") && imoveis.map((p) => (
            <TreeBranch key={p.id} depth={2} label={p.name} loc={{ kind: "property", propertyId: p.id }} propertyId={p.id} projectId={null}
              loc0={loc} navigate={navigate} folders={folders} expanded={expanded} toggleExpand={toggleExpand} />
          ))}
          {expanded.has("imoveis") && pastasTopo("imoveis").map((f) => (
            <TreeBranch key={f.id} depth={2} label={f.nome} loc={{ kind: "folder", folderId: f.id }} propertyId={null} projectId={null} parentId={f.id}
              loc0={loc} navigate={navigate} folders={folders} expanded={expanded} toggleExpand={toggleExpand} />
          ))}
          {/* Gestão Colaborativa */}
          <TreeRow depth={1} icon={Users} label="Gestão Colaborativa" active={loc.kind === "colaborativa"} expandable open={expanded.has("colaborativa")} onToggle={() => toggleExpand("colaborativa")} onClick={() => navigate({ kind: "colaborativa" })} />
          {expanded.has("colaborativa") && projetos.map((p) => (
            <TreeBranch key={p.id} depth={2} label={p.title} loc={{ kind: "project", projectId: p.id }} propertyId={null} projectId={p.id}
              loc0={loc} navigate={navigate} folders={folders} expanded={expanded} toggleExpand={toggleExpand} />
          ))}
          {expanded.has("colaborativa") && pastasTopo("colaborativa").map((f) => (
            <TreeBranch key={f.id} depth={2} label={f.nome} loc={{ kind: "folder", folderId: f.id }} propertyId={null} projectId={null} parentId={f.id}
              loc0={loc} navigate={navigate} folders={folders} expanded={expanded} toggleExpand={toggleExpand} />
          ))}
          {/* Sem associação */}
          <TreeRow depth={1} icon={FolderIcon} label="Sem associação" active={loc.kind === "sem"} expandable={pastasTopo("sem").length > 0} open={expanded.has("sem")} onToggle={() => toggleExpand("sem")} onClick={() => navigate({ kind: "sem" })} />
          {expanded.has("sem") && pastasTopo("sem").map((f) => (
            <TreeBranch key={f.id} depth={2} label={f.nome} loc={{ kind: "folder", folderId: f.id }} propertyId={null} projectId={null} parentId={f.id}
              loc0={loc} navigate={navigate} folders={folders} expanded={expanded} toggleExpand={toggleExpand} />
          ))}
          <div className="mt-1 border-t border-line pt-1">
            <TreeRow depth={1} icon={Trash2} label="Lixo" active={loc.kind === "lixo"} onClick={() => navigate({ kind: "lixo" })} />
          </div>
        </aside>

        {/* ───────── Conteúdo ───────── */}
        <section
          className="min-w-0"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) { setUploadOpen(true); } }}
        >
          {itens.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-card py-20 text-center">
              <FolderOpen size={30} className="mx-auto mb-2 text-muted" />
              <p className="text-sm text-muted">{loc.kind === "lixo" ? "Lixo vazio." : "Pasta vazia. Carregue um documento ou arraste ficheiros para aqui."}</p>
            </div>
          ) : view === "lista" ? (
            <ListaView itens={itens} sort={sort} setSort={setSort} sel={sel} onFolder={navigate} onDoc={abrirDoc} onSelect={clicarDoc} onCtx={(x, y, doc) => setCtx({ x, y, doc })} onFolderCtx={(x, y, folderId, nome) => setFolderCtx({ x, y, folderId, nome })} propName={propName} projName={projName} />
          ) : (
            <GridView itens={itens} sel={sel} onFolder={navigate} onDoc={abrirDoc} onSelect={clicarDoc} onCtx={(x, y, doc) => setCtx({ x, y, doc })} onFolderCtx={(x, y, folderId, nome) => setFolderCtx({ x, y, folderId, nome })} />
          )}

          {/* Rodapé */}
          <div className="mt-2 flex items-center justify-between rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-muted">
            <span>{itens.length} {itens.length === 1 ? "item" : "itens"}{sel.size > 0 && ` · ${sel.size} selecionado${sel.size === 1 ? "" : "s"}`}</span>
            <span className="num">{formatBytes(totalBytes)}</span>
          </div>
        </section>
      </div>

      {/* Menu de contexto */}
      {ctx && <ContextMenu ctx={ctx} onClose={() => setCtx(null)} onOpen={abrirDoc} onPanel={(id) => setPanelId(id)} onRename={renomearDoc} sel={sel} />}
      {folderCtx && <FolderContextMenu ctx={folderCtx} onClose={() => setFolderCtx(null)} onOpen={(id) => navigate({ kind: "folder", folderId: id })} onRename={renomearPasta} onDelete={eliminarPasta} />}

      {panelDoc && <DocPanel doc={panelDoc} onClose={() => setPanelId(null)} onRename={renomearDoc} propName={propName} projName={projName} />}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} contexto={contextoAtual} addDoc={addDoc} />}

      {/* Diálogos estilizados */}
      {nomeModal && (
        <NomeModal
          titulo={nomeModal.titulo}
          valorInicial={nomeModal.valor}
          cta={nomeModal.cta}
          placeholder={nomeModal.placeholder}
          onClose={() => setNomeModal(null)}
          onConfirm={(nome) => { nomeModal.onOk(nome); setNomeModal(null); }}
        />
      )}
      {confirmDel && (
        <ConfirmDialog
          titulo="Eliminar pasta"
          mensagem={`Eliminar a pasta "${confirmDel.nome}"? Os documentos lá dentro não são apagados — ficam guardados na secção.`}
          cta="Eliminar pasta"
          onClose={() => setConfirmDel(null)}
          onConfirm={confirmarEliminarPasta}
        />
      )}
    </div>
  );
}

// ───────────────────────── Barra superior: botão de navegação ─────────────────────────

function NavBtn({ icon: Icon, title, disabled, onClick }: { icon: LucideIcon; title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={cn("flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card transition-colors", disabled ? "text-muted/40" : "text-secondary hover:bg-accent")}>
      <Icon size={16} />
    </button>
  );
}

// ───────────────────────── Árvore ─────────────────────────

function TreeRow({ depth, icon: Icon, label, active, count, expandable, open, onToggle, onClick }: {
  depth: number; icon?: LucideIcon; label: string; active?: boolean; count?: number;
  expandable?: boolean; open?: boolean; onToggle?: () => void; onClick: () => void;
}) {
  return (
    <div className={cn("flex h-8 items-center rounded-lg pr-2 text-sm transition-colors", active ? "bg-accent font-medium text-primary" : "text-ink hover:bg-accent/60")} style={{ paddingLeft: depth * 16 }}>
      {expandable ? (
        <button onClick={(e) => { e.stopPropagation(); onToggle?.(); }} className="flex h-8 w-5 items-center justify-center text-muted hover:text-ink">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        <span className="w-5" />
      )}
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        {Icon && <Icon size={15} className="shrink-0 text-muted" />}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && count > 0 && <span className="num shrink-0 text-[11px] text-muted">{count}</span>}
      </button>
    </div>
  );
}

// Ramo da árvore com subpastas manuais recursivas.
function TreeBranch({ depth, label, loc, propertyId, projectId, loc0, navigate, folders, expanded, toggleExpand, parentId = null }: {
  depth: number; label: string; loc: Loc; propertyId: string | null; projectId: string | null; parentId?: string | null;
  loc0: Loc; navigate: (l: Loc) => void; folders: Folder[]; expanded: Set<string>; toggleExpand: (k: string) => void;
}) {
  const subs = folders.filter((f) => f.propertyId === propertyId && f.projectId === projectId && f.parentId === parentId);
  const key = locKey(loc);
  const open = expanded.has(key);
  return (
    <>
      <TreeRow depth={depth} icon={FolderIcon} label={label} active={sameLoc(loc0, loc)} expandable={subs.length > 0} open={open} onToggle={() => toggleExpand(key)} onClick={() => navigate(loc)} />
      {open && subs.map((f) => (
        <TreeBranch key={f.id} depth={depth + 1} label={f.nome} loc={{ kind: "folder", folderId: f.id }} propertyId={propertyId} projectId={projectId} parentId={f.id}
          loc0={loc0} navigate={navigate} folders={folders} expanded={expanded} toggleExpand={toggleExpand} />
      ))}
    </>
  );
}

// ───────────────────────── Vista LISTA ─────────────────────────

function ListaView({ itens, sort, setSort, sel, onFolder, onDoc, onSelect, onCtx, onFolderCtx, propName, projName }: {
  itens: Item[];
  sort: { campo: "nome" | "tipo" | "tamanho" | "data" | "validade"; asc: boolean };
  setSort: (s: { campo: "nome" | "tipo" | "tamanho" | "data" | "validade"; asc: boolean }) => void;
  sel: Set<string>;
  onFolder: (l: Loc) => void;
  onDoc: (d: PropertyDocument) => void;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onCtx: (x: number, y: number, doc: PropertyDocument) => void;
  onFolderCtx: (x: number, y: number, folderId: string, nome: string) => void;
  propName: (id?: string) => string; projName: (id?: string) => string;
}) {
  const th = (campo: typeof sort.campo, label: string, extra?: string) => (
    <th className={cn("cursor-pointer select-none px-3 py-2 font-medium", extra)} onClick={() => setSort({ campo, asc: sort.campo === campo ? !sort.asc : true })}>
      <span className="inline-flex items-center gap-1">{label}{sort.campo === campo && (sort.asc ? <ChevronUp /> : <ChevronDownMini />)}</span>
    </th>
  );
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-accent/40 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            {th("nome", "Nome")}
            {th("tipo", "Tipo", "hidden sm:table-cell")}
            {th("tamanho", "Tamanho", "hidden md:table-cell")}
            {th("data", "Data", "hidden sm:table-cell")}
            {th("validade", "Validade", "hidden lg:table-cell")}
          </tr>
        </thead>
        <tbody>
          {itens.map((it) => it.type === "folder" ? (
            <tr key={`f-${it.id}`} className="cursor-pointer border-b border-line/50 last:border-0 hover:bg-accent/60" onDoubleClick={() => onFolder(it.loc)} onClick={() => onFolder(it.loc)}
              onContextMenu={(e) => { if (it.loc.kind === "folder") { e.preventDefault(); onFolderCtx(e.clientX, e.clientY, it.id, it.nome); } }}>
              <td className="px-3 py-2.5"><span className="flex items-center gap-2"><it.icon size={16} className="shrink-0 text-gold-dark" /><span className="font-medium text-ink">{it.nome}</span></span></td>
              <td className="hidden px-3 py-2.5 text-muted sm:table-cell">Pasta</td>
              <td className="hidden px-3 py-2.5 text-muted md:table-cell">{it.count > 0 ? `${it.count} item${it.count === 1 ? "" : "s"}` : "—"}</td>
              <td className="hidden px-3 py-2.5 text-muted sm:table-cell">—</td>
              <td className="hidden px-3 py-2.5 text-muted lg:table-cell">—</td>
            </tr>
          ) : (
            <DocRow key={it.doc.id} d={it.doc} selected={sel.has(it.doc.id)} onOpen={() => onDoc(it.doc)} onSelect={onSelect} onCtx={onCtx} propName={propName} projName={projName} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChevronUp() { return <ChevronDown size={11} className="rotate-180" />; }
function ChevronDownMini() { return <ChevronDown size={11} />; }

function DocRow({ d, selected, onOpen, onSelect, onCtx, propName, projName }: {
  d: PropertyDocument; selected: boolean; onOpen: () => void; onSelect: (id: string, e: React.MouseEvent) => void;
  onCtx: (x: number, y: number, doc: PropertyDocument) => void; propName: (id?: string) => string; projName: (id?: string) => string;
}) {
  const Icon = iconForDoc(d);
  const dias = diasAteExpiracao(d.expiraEm);
  return (
    <tr
      className={cn("group cursor-pointer border-b border-line/50 last:border-0", selected ? "bg-accent" : "hover:bg-accent/60")}
      onClick={(e) => onSelect(d.id, e)}
      onDoubleClick={onOpen}
      onContextMenu={(e) => { e.preventDefault(); onSelect(d.id, e); onCtx(e.clientX, e.clientY, d); }}
    >
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-2">
          <Icon size={16} className="shrink-0 text-secondary" />
          <span className="truncate text-ink" title={d.nome}>{d.nome}</span>
        </span>
      </td>
      <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{d.categoria}</td>
      <td className="hidden px-3 py-2.5 text-muted md:table-cell">{formatBytes(d.tamanho)}</td>
      <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{dataPT(d.uploadedAt)}</td>
      <td className="hidden px-3 py-2.5 lg:table-cell">
        {dias === null ? <span className="text-muted">—</span> : <span className={cn(dias <= 30 ? "text-danger" : dias <= 90 ? "text-warning" : "text-muted")}>{dataPT(d.expiraEm!)}</span>}
      </td>
    </tr>
  );
}

// ───────────────────────── Vista GRELHA ─────────────────────────

function GridView({ itens, sel, onFolder, onDoc, onSelect, onCtx, onFolderCtx }: {
  itens: Item[]; sel: Set<string>; onFolder: (l: Loc) => void; onDoc: (d: PropertyDocument) => void;
  onSelect: (id: string, e: React.MouseEvent) => void; onCtx: (x: number, y: number, doc: PropertyDocument) => void;
  onFolderCtx: (x: number, y: number, folderId: string, nome: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {itens.map((it) => it.type === "folder" ? (
        <button key={`f-${it.id}`} onDoubleClick={() => onFolder(it.loc)} onClick={() => onFolder(it.loc)}
          onContextMenu={(e) => { if (it.loc.kind === "folder") { e.preventDefault(); onFolderCtx(e.clientX, e.clientY, it.id, it.nome); } }}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-transparent p-3 text-center hover:border-line hover:bg-accent/60">
          <it.icon size={44} className="text-gold-dark" strokeWidth={1.4} />
          <span className="line-clamp-2 text-xs font-medium text-ink">{it.nome}</span>
        </button>
      ) : (
        <button key={it.doc.id} onClick={(e) => onSelect(it.doc.id, e)} onDoubleClick={() => onDoc(it.doc)}
          onContextMenu={(e) => { e.preventDefault(); onSelect(it.doc.id, e); onCtx(e.clientX, e.clientY, it.doc); }}
          className={cn("flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors", sel.has(it.doc.id) ? "border-primary bg-accent" : "border-transparent hover:border-line hover:bg-accent/60")}>
          {isDataImage(it.doc) ? (
            <img src={it.doc.ficheiroUrl} alt="" className="h-14 w-14 rounded-lg border border-line object-cover" />
          ) : (
            (() => { const I = iconForDoc(it.doc); return <I size={44} className="text-secondary" strokeWidth={1.4} />; })()
          )}
          <span className="line-clamp-2 text-xs text-ink" title={it.doc.nome}>{it.doc.nome}</span>
        </button>
      ))}
    </div>
  );
}

// ───────────────────────── Menu de contexto ─────────────────────────

function ContextMenu({ ctx, onClose, onOpen, onPanel, onRename, sel }: {
  ctx: { x: number; y: number; doc: PropertyDocument }; onClose: () => void; onOpen: (d: PropertyDocument) => void; onPanel: (id: string) => void; onRename: (d: PropertyDocument) => void; sel: Set<string>;
}) {
  const trash = useDocumentsStore((s) => s.trash);
  const remove = useDocumentsStore((s) => s.remove);
  const restore = useDocumentsStore((s) => s.restore);
  const d = ctx.doc;
  const naLixeira = !!d.deletedAt;
  const alvo = sel.size > 1 && sel.has(d.id) ? [...sel] : [d.id];

  const baixar = () => { if (d.ficheiroUrl === "#" || d.ficheiroUrl === "") { toastInfo("Documento de exemplo — sem ficheiro real."); return; } const a = document.createElement("a"); a.href = d.ficheiroUrl; a.download = d.nome; a.click(); };
  const item = (icon: LucideIcon, label: string, fn: () => void, danger?: boolean) => {
    const Icon = icon;
    return (
      <button onClick={() => { fn(); onClose(); }} className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-accent", danger ? "text-danger" : "text-ink")}>
        <Icon size={15} className={danger ? "text-danger" : "text-muted"} /> {label}
      </button>
    );
  };
  const x = Math.min(ctx.x, window.innerWidth - 200);
  const y = Math.min(ctx.y, window.innerHeight - 250);
  return (
    <div className="fixed z-[60] w-48 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-2xl" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      {naLixeira ? (
        <>
          {item(RotateCcw, "Restaurar", () => { alvo.forEach(restore); toastSuccess(alvo.length > 1 ? `${alvo.length} restaurados` : "Restaurado"); })}
          {item(Trash2, "Eliminar definitivamente", () => { alvo.forEach(remove); toastSuccess("Eliminado(s) definitivamente"); }, true)}
        </>
      ) : (
        <>
          {item(ExternalLink, "Abrir", () => onOpen(d))}
          {item(Download, "Descarregar", baixar)}
          {item(Pencil, "Renomear", () => onRename(d))}
          {item(FolderInput, "Mover para…", () => onPanel(d.id))}
          <div className="my-1 border-t border-line" />
          {item(Trash2, alvo.length > 1 ? `Eliminar (${alvo.length})` : "Eliminar", () => { alvo.forEach(trash); toastSuccess(alvo.length > 1 ? `${alvo.length} movidos para o Lixo` : "Movido para o Lixo"); }, true)}
        </>
      )}
    </div>
  );
}

// ───────────────────────── Menu de contexto de pastas ─────────────────────────

function FolderContextMenu({ ctx, onClose, onOpen, onRename, onDelete }: {
  ctx: { x: number; y: number; folderId: string; nome: string };
  onClose: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, nome: string) => void;
  onDelete: (id: string, nome: string) => void;
}) {
  const item = (icon: LucideIcon, label: string, fn: () => void, danger?: boolean) => {
    const Icon = icon;
    return (
      <button onClick={() => { fn(); onClose(); }} className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-accent", danger ? "text-danger" : "text-ink")}>
        <Icon size={15} className={danger ? "text-danger" : "text-muted"} /> {label}
      </button>
    );
  };
  const x = Math.min(ctx.x, window.innerWidth - 200);
  const y = Math.min(ctx.y, window.innerHeight - 160);
  return (
    <div className="fixed z-[60] w-48 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-2xl" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      {item(FolderOpen, "Abrir", () => onOpen(ctx.folderId))}
      {item(Pencil, "Renomear", () => onRename(ctx.folderId, ctx.nome))}
      <div className="my-1 border-t border-line" />
      {item(Trash2, "Eliminar pasta", () => onDelete(ctx.folderId, ctx.nome), true)}
    </div>
  );
}

// ───────────────────────── Diálogo de nome (criar / renomear) ─────────────────────────

function NomeModal({ titulo, valorInicial, cta, placeholder, onConfirm, onClose }: {
  titulo: string; valorInicial: string; cta: string; placeholder?: string; onConfirm: (nome: string) => void; onClose: () => void;
}) {
  const [v, setV] = useState(valorInicial);
  const submeter = () => { const n = v.trim(); if (!n) return; onConfirm(n); };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl border border-line bg-card p-5 shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">{titulo}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submeter(); } if (e.key === "Escape") onClose(); }}
          placeholder={placeholder ?? "Nome"}
          className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submeter} disabled={!v.trim()}>{cta}</Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Diálogo de confirmação ─────────────────────────

function ConfirmDialog({ titulo, mensagem, cta, onConfirm, onClose }: {
  titulo: string; mensagem: string; cta: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl border border-line bg-card p-5 shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger"><AlertTriangle size={18} /></span>
          <h3 className="font-display text-base font-semibold text-ink">{titulo}</h3>
        </div>
        <p className="text-sm text-muted">{mensagem}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={() => { onConfirm(); }}><Trash2 size={14} /> {cta}</Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Popover de filtros ─────────────────────────

function FilterPopover({ fTipo, setFTipo, fExpira, setFExpira, onClose, onLimpar }: {
  fTipo: "todos" | TipoGrupo; setFTipo: (t: "todos" | TipoGrupo) => void; fExpira: boolean; setFExpira: (b: boolean) => void; onClose: () => void; onLimpar: () => void;
}) {
  useEffect(() => { const h = () => onClose(); const t = setTimeout(() => window.addEventListener("click", h), 0); return () => { clearTimeout(t); window.removeEventListener("click", h); }; }, [onClose]);
  return (
    <div className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-line bg-card p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <p className="mb-1 text-xs font-medium text-muted">Tipo de ficheiro</p>
      <select value={fTipo} onChange={(e) => setFTipo(e.target.value as "todos" | TipoGrupo)} className="mb-3 h-9 w-full rounded-lg border border-line bg-card px-2.5 text-sm outline-none">
        <option value="todos">Todos os tipos</option>
        <option value="pdf">PDF</option>
        <option value="imagem">Imagem</option>
        <option value="doc">Documento</option>
        <option value="sheet">Folha de cálculo</option>
      </select>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={fExpira} onChange={(e) => setFExpira(e.target.checked)} className="h-4 w-4 accent-primary" />
        Só os que expiram em breve
      </label>
      <div className="mt-3 flex justify-between">
        <button onClick={onLimpar} className="text-xs text-muted hover:text-ink">Limpar</button>
        <button onClick={onClose} className="text-xs font-medium text-primary">Fechar</button>
      </div>
    </div>
  );
}

// ───────────────────────── Painel do documento ─────────────────────────

function DocPanel({ doc, onClose, onRename, propName, projName }: {
  doc: PropertyDocument; onClose: () => void; onRename: (d: PropertyDocument) => void; propName: (id?: string) => string; projName: (id?: string) => string;
}) {
  const rename = useDocumentsStore((s) => s.rename);
  const setCategoria = useDocumentsStore((s) => s.setCategoria);
  const associate = useDocumentsStore((s) => s.associate);
  const update = useDocumentsStore((s) => s.update);
  const moveToFolder = useDocumentsStore((s) => s.moveToFolder);
  const trash = useDocumentsStore((s) => s.trash);
  const restore = useDocumentsStore((s) => s.restore);
  const remove = useDocumentsStore((s) => s.remove);
  const properties = usePropertiesStore((s) => s.properties);
  const projects = useCollabStore((s) => s.projects);
  const folders = useFoldersStore((s) => s.folders);

  const [lightbox, setLightbox] = useState(false);
  const Icon = iconForDoc(doc);
  const g = tipoGrupo(doc.mimeType);
  const semFicheiro = doc.ficheiroUrl === "#" || doc.ficheiroUrl === "";
  // Subpastas disponíveis para mover (as do imóvel/projeto do documento)
  const pastasDisponiveis = folders.filter((f) => (doc.propertyId && f.propertyId === doc.propertyId) || (doc.projectId && f.projectId === doc.projectId));

  const baixar = () => { if (semFicheiro) { toastInfo("Documento de exemplo — sem ficheiro real para descarregar."); return; } const a = document.createElement("a"); a.href = doc.ficheiroUrl; a.download = doc.nome; a.click(); };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-display text-base font-semibold text-ink">Documento</p>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 overflow-hidden rounded-xl border border-line bg-bg">
            {isDataImage(doc) ? (
              <button onClick={() => setLightbox(true)} className="group relative block w-full">
                <img src={doc.ficheiroUrl} alt="" className="max-h-64 w-full object-cover" />
                <span className="absolute right-2 top-2 rounded-full bg-ink/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"><Maximize2 size={14} /></span>
              </button>
            ) : g === "pdf" && !semFicheiro ? (
              <iframe title={doc.nome} src={doc.ficheiroUrl} className="h-64 w-full" />
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted"><Icon size={34} /><p className="text-xs">{semFicheiro ? "Pré-visualização indisponível (exemplo)" : "Sem pré-visualização"}</p></div>
            )}
          </div>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Nome</span>
            <input defaultValue={doc.nome} onBlur={(e) => e.target.value.trim() && rename(doc.id, e.target.value.trim())} className={panelSel} />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Categoria</span>
            <select value={doc.categoria} onChange={(e) => setCategoria(doc.id, e.target.value as DocCategoria)} className={panelSel}>
              {DOC_CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className="mb-3 grid grid-cols-1 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Imóvel</span>
              <select value={doc.propertyId ?? ""} onChange={(e) => associate(doc.id, { propertyId: e.target.value || undefined })} className={panelSel}>
                <option value="">— Sem imóvel —</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Projeto colaborativo</span>
              <select value={doc.projectId ?? ""} onChange={(e) => associate(doc.id, { projectId: e.target.value || undefined })} className={panelSel}>
                <option value="">— Sem projeto —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
            {pastasDisponiveis.length > 0 && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Subpasta</span>
                <select value={doc.pastaId ?? ""} onChange={(e) => moveToFolder(doc.id, e.target.value || undefined)} className={panelSel}>
                  <option value="">— Raiz —</option>
                  {pastasDisponiveis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </label>
            )}
          </div>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Validade (opcional)</span>
            <input type="date" defaultValue={doc.expiraEm ?? ""} onChange={(e) => update(doc.id, { expiraEm: e.target.value || undefined })} className={panelSel} />
          </label>
          <div className="rounded-lg border border-line bg-bg/50 p-3 text-xs text-muted">
            <p>Tamanho: <span className="text-ink">{formatBytes(doc.tamanho)}</span></p>
            <p>Carregado: <span className="text-ink">{dataPT(doc.uploadedAt)}</span></p>
            {doc.propertyId && <p>Imóvel: <span className="text-ink">{propName(doc.propertyId)}</span></p>}
            {doc.projectId && <p>Projeto: <span className="text-ink">{projName(doc.projectId)}</span></p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
          <Button variant="outline" size="sm" onClick={baixar}><Download size={14} /> Descarregar</Button>
          <Button variant="outline" size="sm" onClick={() => onRename(doc)}><Pencil size={14} /> Renomear</Button>
          {doc.deletedAt ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { restore(doc.id); toastSuccess("Restaurado"); onClose(); }}><RotateCcw size={14} /> Restaurar</Button>
              <Button variant="danger" size="sm" onClick={() => { remove(doc.id); toastSuccess("Eliminado"); onClose(); }}><Trash2 size={14} /> Eliminar</Button>
            </>
          ) : (
            <Button variant="danger" size="sm" className="col-span-2" onClick={() => { trash(doc.id); toastSuccess("Movido para o Lixo"); onClose(); }}><Trash2 size={14} /> Eliminar</Button>
          )}
        </div>
      </aside>
      {lightbox && isDataImage(doc) && <Lightbox fotos={[{ url: doc.ficheiroUrl, legenda: doc.nome }]} onClose={() => setLightbox(false)} />}
    </>
  );
}

const panelSel = "h-9 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-secondary";

// ───────────────────────── Upload ─────────────────────────

interface PendingFile { key: string; nome: string; categoria: DocCategoria; mimeType: string; tamanho: number; ficheiroUrl: string; }
const MAX_BYTES = 25 * 1024 * 1024;
const ACEITES = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx";

function UploadModal({ onClose, contexto, addDoc }: {
  onClose: () => void;
  contexto: { propertyId: string | null; projectId: string | null; parentId: string | null; label: string | null };
  addDoc: (input: Omit<PropertyDocument, "id">) => string;
}) {
  const properties = usePropertiesStore((s) => s.properties);
  const projects = useCollabStore((s) => s.projects);

  const [files, setFiles] = useState<PendingFile[]>([]);
  const [drag, setDrag] = useState(false);
  const [propertyId, setPropertyId] = useState(contexto.propertyId ?? "");
  const [projectId, setProjectId] = useState(contexto.projectId ?? "");
  const [validade, setValidade] = useState("");
  // Numa secção/raiz sem pasta atual → deixa escolher; dentro de um imóvel/projeto
  // ou de uma pasta manual, vem pré-preenchido pelo destino.
  const dentroDePasta = !!(contexto.propertyId || contexto.projectId || contexto.parentId);

  const onFiles = (list: FileList) => {
    Array.from(list).forEach((f) => {
      if (f.size > MAX_BYTES) { toastError(`${f.name} excede 25 MB`); return; }
      const key = `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 6)}`;
      setFiles((prev) => [...prev, { key, nome: f.name, categoria: sugerirCategoria(f.name), mimeType: f.type || "application/octet-stream", tamanho: f.size, ficheiroUrl: "#" }]);
      const r = new FileReader();
      r.onload = () => setFiles((prev) => prev.map((p) => (p.key === key ? { ...p, ficheiroUrl: String(r.result) } : p)));
      r.readAsDataURL(f);
    });
  };

  const guardar = () => {
    if (files.length === 0) { toastError("Adicione pelo menos um ficheiro"); return; }
    files.forEach((f) => {
      addDoc({
        nome: f.nome, ficheiroUrl: f.ficheiroUrl, mimeType: f.mimeType, tamanho: f.tamanho, categoria: f.categoria,
        uploadedAt: new Date().toISOString().slice(0, 10),
        propertyId: propertyId || undefined,
        projectId: projectId || undefined,
        pastaId: contexto.parentId || undefined,
        expiraEm: validade || undefined,
      });
    });
    toastSuccess(`${files.length} documento${files.length === 1 ? "" : "s"} carregado${files.length === 1 ? "" : "s"}`, dentroDePasta && contexto.label ? `Guardado em ${contexto.label}.` : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Carregar documento</h2>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
            className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-sm transition-colors", drag ? "border-primary bg-accent" : "border-line bg-bg text-muted hover:bg-accent")}
          >
            <Upload size={26} className="text-primary" />
            <span>Arrastar ficheiros ou <span className="font-medium text-primary">escolher</span></span>
            <span className="text-xs text-muted">PDF, JPG, PNG, DOC, DOCX, XLSX · máx. 25 MB</span>
            <input type="file" multiple accept={ACEITES} className="hidden" onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }} />
          </label>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f) => (
                <div key={f.key} className="flex items-center gap-2 rounded-lg border border-line bg-bg/40 p-2">
                  <FileText size={16} className="shrink-0 text-secondary" />
                  <input value={f.nome} onChange={(e) => setFiles((prev) => prev.map((p) => (p.key === f.key ? { ...p, nome: e.target.value } : p)))} className="h-8 min-w-0 flex-1 rounded border border-line bg-card px-2 text-sm outline-none focus:border-secondary" />
                  <select value={f.categoria} onChange={(e) => setFiles((prev) => prev.map((p) => (p.key === f.key ? { ...p, categoria: e.target.value as DocCategoria } : p)))} className="h-8 rounded border border-line bg-card px-1.5 text-xs outline-none">
                    {DOC_CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => setFiles((prev) => prev.filter((p) => p.key !== f.key))} className="text-muted hover:text-danger"><X size={15} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {dentroDePasta ? (
              <div className="sm:col-span-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-sm text-ink">
                Vai para <strong>{contexto.label}</strong> — pré-preenchido pela pasta onde está.
              </div>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Imóvel (opcional)</span>
                  <select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); if (e.target.value) setProjectId(""); }} className={panelSel}>
                    <option value="">— Sem associação —</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Projeto (opcional)</span>
                  <select value={projectId} onChange={(e) => { setProjectId(e.target.value); if (e.target.value) setPropertyId(""); }} className={panelSel}>
                    <option value="">— Sem associação —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </label>
              </>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Validade (opcional)</span>
              <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className={panelSel} />
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
