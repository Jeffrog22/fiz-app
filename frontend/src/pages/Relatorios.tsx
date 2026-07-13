import React, { useState } from 'react';
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

const TABS: { id: TabId; label: string }[] = [
  { id: 'frequencia-aluno', label: 'Frequência por Aluno' },
  { id: 'frequencia-turma', label: 'Frequência por Turma' },
  { id: 'rotatividade', label: 'Rotatividade' },
  { id: 'exclusoes', label: 'Exclusões' },
  { id: 'cancelamentos', label: 'Cancelamentos' },
  { id: 'piscina', label: 'Histórico da Piscina' },
  { id: 'demografico', label: 'Demográfico' },
  { id: 'ocupacao', label: 'Ocupação' },
];

const Relatorios: React.FC = () => {
  const [tab, setTab] = useState<TabId>('frequencia-aluno');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>

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

      {tab === 'frequencia-aluno' && <TabFrequenciaAluno />}
      {tab === 'frequencia-turma' && <TabFrequenciaTurma />}
      {tab === 'rotatividade' && <TabRotatividade />}
      {tab === 'exclusoes' && <TabExclusoes />}
      {tab === 'cancelamentos' && <TabCancelamentos />}
      {tab === 'piscina' && <TabPiscina />}
      {tab === 'demografico' && <TabDemografico />}
      {tab === 'ocupacao' && <TabOcupacao />}
    </div>
  );
};

export default Relatorios;
