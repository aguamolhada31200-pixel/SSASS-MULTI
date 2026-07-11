import { Routes, Route, Navigate } from "react-router-dom";
import {
  FileBarChart,
  Wrench,
  Images,
  Smartphone,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ImoveisList from "@/pages/imoveis/ImoveisList";
import ImovelDetail from "@/pages/imoveis/ImovelDetail";
import ArrendamentosList from "@/pages/imoveis/ArrendamentosList";
import NovoArrendamento from "@/pages/imoveis/NovoArrendamento";
import ArrendamentoDetail from "@/pages/imoveis/ArrendamentoDetail";
import RedeInvestidores from "@/pages/comunidade/RedeInvestidores";
import ListingDetail from "@/pages/comunidade/ListingDetail";
import InvestorProfile from "@/pages/comunidade/InvestorProfile";
import EditProfile from "@/pages/comunidade/EditProfile";
import Colaborativa from "@/pages/comunidade/Colaborativa";
import ProjectRoom from "@/pages/comunidade/ProjectRoom";
import CentroDeComando from "@/pages/comunidade/CentroDeComando";
import ObraDetalhe from "@/pages/comunidade/ObraDetalhe";
import Mensagens from "@/pages/Mensagens";
import Estudantes from "@/pages/pessoas/Estudantes";
import InquilinosList from "@/pages/pessoas/InquilinosList";
import InquilinoDetail from "@/pages/pessoas/InquilinoDetail";
import CalculadoraRentabilidade from "@/pages/financas/CalculadoraRentabilidade";
import Contabilidade from "@/pages/financas/Contabilidade";
import CalendarioInvestimento from "@/pages/financas/CalendarioInvestimento";
import ProjetoCalendario from "@/pages/financas/ProjetoCalendario";
import PastaDigital from "@/pages/documentos/PastaDigital";
import ContratoDetalhe from "@/pages/contratos/ContratoDetalhe";
import AssistenteIA from "@/pages/ia/AssistenteIA";
import Perfil from "@/pages/conta/Perfil";
import Definicoes from "@/pages/conta/Definicoes";
import Faturacao from "@/pages/conta/Faturacao";
import Placeholder from "@/pages/Placeholder";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />

        {/* Imóveis */}
        <Route path="imoveis" element={<ImoveisList />} />
        {/* Arrendamentos (antes de :id — rotas estáticas têm prioridade) */}
        <Route path="imoveis/arrendamentos" element={<ArrendamentosList />} />
        <Route path="imoveis/arrendamentos/novo" element={<NovoArrendamento />} />
        <Route path="imoveis/arrendamentos/:id" element={<ArrendamentoDetail />} />
        <Route path="imoveis/arrendamentos/:id/editar" element={<NovoArrendamento />} />
        <Route
          path="imoveis/acesso-digital"
          element={
            <Placeholder
              title="Acesso Digital"
              subtitle="Fechaduras inteligentes e entrada sem chaves"
              icon={Smartphone}
              fase="Fase 2 — Operação avançada"
              bullets={[
                "Códigos de acesso temporários por inquilino/estadia",
                "Registo de entradas · integração com fechaduras smart",
                "Partilha segura com equipas de limpeza e manutenção",
              ]}
            />
          }
        />
        <Route path="imoveis/:id" element={<ImovelDetail />} />

        {/* Comunidade */}
        <Route path="comunidade/rede" element={<RedeInvestidores />} />
        <Route path="comunidade/rede/anuncio/:id" element={<ListingDetail />} />
        <Route path="comunidade/rede/perfil/editar" element={<EditProfile />} />
        <Route path="comunidade/rede/:userId" element={<InvestorProfile />} />
        <Route path="mensagens" element={<Mensagens />} />
        <Route path="comunidade/colaborativa" element={<Colaborativa />} />
        <Route path="comunidade/colaborativa/obras" element={<CentroDeComando />} />
        <Route path="obra/:id" element={<ObraDetalhe />} />
        <Route
          path="comunidade/colaborativa/galeria"
          element={
            <Placeholder
              title="Galeria antes/depois"
              subtitle="Comparações visuais das remodelações"
              icon={Images}
              fase="Fase 3 — Colaboração"
              bullets={[
                "Slider arrastável entre foto 'antes' e 'depois'",
                "Filtros por projeto/imóvel/obra",
                "Categoria e custo por comparação · lightbox",
              ]}
            />
          }
        />
        <Route path="comunidade/colaborativa/:id" element={<ProjectRoom />} />

        {/* Pessoas */}
        <Route path="pessoas/inquilinos" element={<InquilinosList />} />
        <Route path="pessoas/inquilinos/:id" element={<InquilinoDetail />} />
        <Route path="pessoas/estudantes" element={<Estudantes />} />

        {/* Finanças */}
        <Route path="financas/calendario-investimento" element={<CalendarioInvestimento />} />
        <Route path="financas/calendario-investimento/:projectId" element={<ProjetoCalendario />} />
        <Route path="financas/calculadora-rentabilidade" element={<CalculadoraRentabilidade />} />
        <Route path="financas/contabilidade" element={<Contabilidade />} />
        <Route
          path="financas/balanco-irs"
          element={
            <Placeholder
              title="Balanço / IRS"
              subtitle="Resumo anual da Categoria F"
              icon={FileBarChart}
              fase="Fase 1 — MVP operacional"
              bullets={[
                "Resumo por imóvel: rendimento, despesas dedutíveis, líquido",
                "Estimativa informativa + exportação de relatório · aviso legal",
              ]}
            />
          }
        />

        {/* Documentos */}
        <Route path="documentos" element={<PastaDigital />} />

        {/* Contratos (documento carregado pelo senhorio) */}
        <Route path="contratos/:id" element={<ContratoDetalhe />} />

        {/* Manutenção */}
        <Route
          path="manutencao"
          element={
            <Placeholder
              title="Manutenção"
              subtitle="Pedidos e reparações"
              icon={Wrench}
              fase="Fase 1 — MVP operacional"
              bullets={[
                "KPIs, filtros e lista (prioridade, status, imóvel, custo)",
                "Detalhe: descrição, fotos, técnico, orçamento vs custo, notas",
              ]}
            />
          }
        />
        {/* IA */}
        <Route path="ia" element={<AssistenteIA />} />

        {/* Conta */}
        <Route path="perfil" element={<Perfil />} />
        <Route path="definicoes" element={<Definicoes />} />
        <Route path="faturacao" element={<Faturacao />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
