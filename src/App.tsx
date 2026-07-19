import { Routes, Route, Navigate } from "react-router-dom";
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
import ObrasCasa from "@/pages/comunidade/ObrasCasa";
import ObraDetalhe from "@/pages/comunidade/ObraDetalhe";
import GaleriaAntesDepois from "@/pages/comunidade/GaleriaAntesDepois";
import Mensagens from "@/pages/Mensagens";
import Estudantes from "@/pages/pessoas/Estudantes";
import InquilinosList from "@/pages/pessoas/InquilinosList";
import InquilinoDetail from "@/pages/pessoas/InquilinoDetail";
import CalculadoraRentabilidade from "@/pages/financas/CalculadoraRentabilidade";
import Contabilidade from "@/pages/financas/Contabilidade";
import CalendarioInvestimento from "@/pages/financas/CalendarioInvestimento";
import ProjetoCalendario from "@/pages/financas/ProjetoCalendario";
import BalancoIRS from "@/pages/financas/BalancoIRS";
import PastaDigital from "@/pages/documentos/PastaDigital";
import ContratoDetalhe from "@/pages/contratos/ContratoDetalhe";
import AssistenteIA from "@/pages/ia/AssistenteIA";
import Manutencao from "@/pages/manutencao/Manutencao";
import ManutencaoDetalhe from "@/pages/manutencao/ManutencaoDetalhe";
import Perfil from "@/pages/conta/Perfil";
import Definicoes from "@/pages/conta/Definicoes";
import Faturacao from "@/pages/conta/Faturacao";

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
        <Route path="imoveis/:id" element={<ImovelDetail />} />

        {/* Comunidade */}
        <Route path="comunidade/rede" element={<RedeInvestidores />} />
        <Route path="comunidade/rede/anuncio/:id" element={<ListingDetail />} />
        <Route path="comunidade/rede/perfil/editar" element={<EditProfile />} />
        {/* Perfil próprio — mesmo componente do perfil público, em modo "próprio" */}
        <Route path="comunidade/rede/meu-perfil" element={<InvestorProfile />} />
        <Route path="comunidade/rede/:userId" element={<InvestorProfile />} />
        <Route path="mensagens" element={<Mensagens />} />
        <Route path="comunidade/colaborativa" element={<Colaborativa />} />
        <Route path="comunidade/colaborativa/obras" element={<CentroDeComando />} />
        {/* Navegação por profundidade: Casa → Divisão → Obra */}
        <Route path="comunidade/colaborativa/obras/:casaId" element={<ObrasCasa />} />
        <Route path="comunidade/colaborativa/obras/:casaId/:id" element={<ObraDetalhe />} />
        <Route path="obra/:id" element={<ObraDetalhe />} />
        <Route path="comunidade/colaborativa/galeria" element={<GaleriaAntesDepois />} />
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
        <Route path="financas/balanco-irs" element={<BalancoIRS />} />

        {/* Documentos */}
        <Route path="documentos" element={<PastaDigital />} />

        {/* Contratos (documento carregado pelo senhorio) */}
        <Route path="contratos/:id" element={<ContratoDetalhe />} />

        {/* Manutenção — centro de comando + detalhe do pedido */}
        <Route path="manutencao" element={<Manutencao />} />
        <Route path="manutencao/:id" element={<ManutencaoDetalhe />} />
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
