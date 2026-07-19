import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { useExampleData } from "@/store/useExampleData";
import { useModalStore } from "@/store/useModalStore";
import { useMaintenancePlanStore, estadoPlano } from "@/store/useMaintenancePlanStore";
import { useNotificationsStore } from "@/store/useNotificationsStore";
import { usePropertiesStore } from "@/store/usePropertiesStore";
import { CURRENT_USER_ID } from "@/store/useProfilesStore";
import { KpisManutencao, FraseResumo, PedidosBoard } from "@/components/manutencao/PedidosBoard";
import { PrevencaoSection } from "@/components/manutencao/PrevencaoSection";
import { EmpreiteirosDirectory } from "@/components/obras/EmpreiteirosDirectory";
import { cn } from "@/lib/utils";

const TABS = ["Pedidos", "Prevenção", "Técnicos"] as const;
type TabKey = (typeof TABS)[number];

export default function Manutencao() {
  const { enabled } = useExampleData();
  const openMaintenanceForm = useModalStore((s) => s.openMaintenanceForm);
  const [tab, setTab] = useState<TabKey>("Pedidos");

  // Prevenção vencida/a vencer → notificação no sino (uma por tarefa+data, sem duplicar)
  const tasks = useMaintenancePlanStore((s) => s.tasks);
  const properties = usePropertiesStore((s) => s.properties);
  const notificacoes = useNotificationsStore((s) => s.notificacoes);
  const addNotif = useNotificationsStore((s) => s.add);
  useEffect(() => {
    if (!enabled) return;
    for (const t of tasks) {
      const estado = estadoPlano(t);
      if (estado === "em_dia") continue;
      const nome = properties.find((p) => p.id === t.propertyId)?.name ?? "Imóvel";
      const titulo =
        estado === "vencida"
          ? `Prevenção vencida: «${t.titulo}» · ${nome}`
          : `Prevenção a vencer: «${t.titulo}» · ${nome}`;
      const jaExiste = notificacoes.some((n) => n.userId === CURRENT_USER_ID && n.titulo === titulo);
      if (!jaExiste) {
        addNotif({
          userId: CURRENT_USER_ID,
          tipo: "geral",
          titulo,
          descricao: `Próxima execução: ${t.proximaExecucao.slice(8, 10)}/${t.proximaExecucao.slice(5, 7)}/${t.proximaExecucao.slice(0, 4)}${t.obrigatoriaLegal ? " · obrigatória por lei" : ""}`,
          link: "/manutencao",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return (
    <>
      <PageHeader
        title="Manutenção"
        subtitle="Avarias, prevenção e técnicos"
        showExampleToggle
        actions={
          <Button onClick={() => openMaintenanceForm()}>
            <Plus size={15} /> Novo pedido
          </Button>
        }
      />

      {!enabled ? (
        <div className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center text-sm text-muted">
          Ative o toggle «Dados de exemplo» para explorar a Manutenção, ou crie o primeiro pedido.
        </div>
      ) : (
        <>
          {/* Frase-resumo em linguagem humana */}
          <div className="mb-4">
            <FraseResumo />
          </div>

          <KpisManutencao />

          {/* Tabs */}
          <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
                  tab === t ? "border-primary font-medium text-primary" : "border-transparent text-muted hover:text-ink"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {tab === "Pedidos" && <PedidosBoard />}
            {tab === "Prevenção" && <PrevencaoSection />}
            {/* MESMO diretório das Obras (useTechniciansStore) — fonte única */}
            {tab === "Técnicos" && <EmpreiteirosDirectory />}
          </div>
        </>
      )}
    </>
  );
}
