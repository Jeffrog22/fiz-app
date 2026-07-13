import React, { useState, useCallback } from 'react';
import PeriodPicker from '../components/reports/PeriodPicker';
import TabFrequenciaAluno from '../components/reports/tabs/TabFrequenciaAluno';
import TabFrequenciaTurma from '../components/reports/tabs/TabFrequenciaTurma';
import TabRotatividade from '../components/reports/tabs/TabRotatividade';
import TabExclusoes from '../components/reports/tabs/TabExclusoes';
import TabCancelamentos from '../components/reports/tabs/TabCancelamentos';
import TabPiscina from '../components/reports/tabs/TabPiscina';
import TabDemografico from '../components/reports/tabs/TabDemografico';
import TabOcupacao from '../components/reports/tabs/TabOcupacao';

type TabId = 'frequencia-aluno' | 'frequencia-turma' | 'rotatividade' | 'exclusoes'
  | 'cancelamentos' | 'piscina' | 'demografico' | 'ocupacao';

interface TabDef { id: TabId; label: string }

const TABS: TabDef[] = [
  { id: 'frequencia-aluno', label: 'Frequência por Aluno' },
  { id: 'frequencia-turma', label: 'Frequência por Turma' },
  { id: 'rotatividade', label: 'Rotatividade' },
  { id: 'exclusoes', label: 'Exclusões' },
  { id: 'cancelamentos', label: 'Cancelamentos' },
  { id: 'piscina', label: 'Histórico da Piscina' },
  { id: 'demografico', label: 'Demográfico' },
  { id: 'ocupacao', label: 'Ocupação' },
];

const TABS_COM_PERIODO: TabId[] = ['frequencia-aluno', 'frequencia-turma', 'rotatividade', 'exclusoes', 'cancelamentos', 'piscina'];

const hoje = new Date();
const Relatorios: React.FC = () => {
  const [tab, setTab] = useState<TabId>('frequencia-aluno');
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const handlePeriodChange = useCallback((m: number, a: number) => {
    setMes(m);
    setAno(a);
  }, []);

  const mostrarPeriodo = TABS_COM_PERIODO.includes(tab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        {mostrarPeriodo && <PeriodPicker mes={mes} ano={ano} onChange={handlePeriodChange} />}
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'frequencia-aluno' && <TabFrequenciaAluno mes={mes} ano={ano} />}
      {tab === 'frequencia-turma' && <TabFrequenciaTurma mes={mes} ano={ano} />}
      {tab === 'rotatividade' && <TabRotatividade mes={mes} ano={ano} />}
      {tab === 'exclusoes' && <TabExclusoes mes={mes} ano={ano} />}
      {tab === 'cancelamentos' && <TabCancelamentos mes={mes} ano={ano} />}
      {tab === 'piscina' && <TabPiscina mes={mes} ano={ano} />}
      {tab === 'demografico' && <TabDemografico />}
      {tab === 'ocupacao' && <TabOcupacao />}
    </div>
  );
};

export default Relatorios;
