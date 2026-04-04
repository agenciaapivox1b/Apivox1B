import { useNavigate, useParams } from 'react-router-dom';
import LeadDetailPanel from '@/components/LeadDetailPanel';
import { mockLeads } from '@/data/mockSalesData';

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const lead = mockLeads.find((item) => String(item.id) === String(id));

  if (!lead) {
    return (
      <div className="w-full min-h-screen p-6 text-white">
        <h2 className="text-lg font-bold">Oportunidade não encontrada</h2>
        <p className="mt-2 text-muted-foreground">Verifique se a oportunidade existe e tente novamente.</p>
        <button
          type="button"
          onClick={() => navigate('/opportunities')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Voltar para Oportunidades
        </button>
      </div>
    );
  }

  return <LeadDetailPanel lead={lead as any} onBack={() => navigate('/opportunities')} />;
}
