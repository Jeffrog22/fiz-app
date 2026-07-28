import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import type { FrequenciaAlunoItem, HistoricoAlunoResponse, EnrollmentPeriodHistorico, RetencaoAluno } from '../../types';

interface Props {
  alunoData: FrequenciaAlunoItem;
  onClose: () => void;
}

const HistoricoAlunoModal: React.FC<Props> = ({ alunoData, onClose }) => {
  const [data, setData] = useState<HistoricoAlunoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/relatorios/historico-aluno/${alunoData.aluno_id}`)
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [alunoData.aluno_id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const totalAulas = alunoData.total_aulas;
  const presentes = alunoData.presente;
  const faltas = alunoData.falta;
  const justificados = alunoData.justificado;
  const assiduidadeTotal = alunoData.percentual_presenca;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">{alunoData.nome}</h2>
            {alunoData.turma_label && (
              <span className="text-xs text-gray-400 ml-1">{alunoData.turma_label} {alunoData.professor ? `(${alunoData.professor})` : ''}</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 4 cards indicadores — direto do grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniCard titulo="Total Aulas" valor={totalAulas} cor="text-blue-600" />
              <MiniCard titulo="Presenças" valor={presentes} cor="text-green-600" />
              <MiniCard titulo="Faltas" valor={faltas} cor="text-red-600" />
              <MiniCard titulo="Justificativas" valor={justificados} cor="text-yellow-600" />
            </div>

            {/* Taxa de Assiduidade */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Taxa de Assiduidade</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${totalAulas > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                    style={{ width: `${totalAulas > 0 ? assiduidadeTotal : 0}%` }}
                  />
                </div>
                <span className={`text-lg font-bold min-w-[4rem] text-right ${totalAulas > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {totalAulas > 0 ? `${assiduidadeTotal}%` : '-'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {totalAulas > 0
                  ? `${presentes} presenças em ${totalAulas} aulas`
                  : 'Sem registros de chamada'}
              </p>
            </div>

            {/* Índice de Retenção Total */}
            {data && <RetencaoCard retencao={data.retencao} />}

            {/* Nó de Progressão — Linha do Tempo */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1">
                <span>📈</span> Nó de Progressão — Linha do Tempo
              </h3>
              {!data ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin h-6 w-6 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : data.enrollmentPeriods.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum período de matrícula encontrado.</p>
              ) : (
                <div className="space-y-0">
                  {data.enrollmentPeriods.map((p, i) => (
                    <TimelineNode key={i} period={p} isLast={i === data.enrollmentPeriods.length - 1} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function MiniCard({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{titulo}</p>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}

function RetencaoCard({ retencao }: { retencao: RetencaoAluno }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <p className="text-sm font-semibold text-gray-700 mb-2">Índice de Retenção Total do Aluno</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-blue-200 rounded-full h-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${retencao.totalDias > 0 ? 'bg-blue-600' : 'bg-gray-300'}`}
            style={{ width: `${retencao.percentual}%` }}
          />
        </div>
        <span className={`text-xl font-bold min-w-[4rem] text-right ${retencao.totalDias > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
          {retencao.totalDias > 0 ? `${retencao.percentual}%` : '-'}
        </span>
      </div>
      <p className="text-xs text-blue-600 mt-1">
        {retencao.totalDias > 0
          ? `${retencao.totalDias} dias de permanência em ${retencao.diasDesdeInicio} dias desde a primeira matrícula`
          : 'Sem dados de matrícula para calcular retenção'}
      </p>
    </div>
  );
}

function TimelineNode({ period, isLast }: { period: EnrollmentPeriodHistorico; isLast: boolean }) {
  const dataInicio = new Date(period.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR');
  const dataFim = period.data_fim
    ? new Date(period.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'o momento';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 ${period.data_fim ? 'bg-gray-400' : 'bg-primary-500 ring-2 ring-primary-200'}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-300 min-h-[32px]" />}
      </div>
      <div className="flex-1 pb-4">
        <p className="text-xs text-gray-500">
          {period.turma_label}{period.turma_label && period.nivel ? ' - ' : ''}{period.nivel ? `Nível ${period.nivel}` : ''}{period.professor && period.professor !== '-' ? ` (${period.professor})` : ''}
        </p>
        <p className="text-xs text-gray-500">
          De {dataInicio} até {dataFim}
        </p>
        <div className="flex flex-wrap gap-3 mt-1">
          <span className="text-xs text-gray-500">
            <strong>Permanência:</strong> {period.permanenciaDias} dias
          </span>
          <span className="text-xs text-gray-500">
            <strong>Assiduidade:</strong> {period.total > 0 ? `${period.assiduidade}%` : '-'}
          </span>
          <span className="text-xs text-gray-400">
            {period.total > 0 ? `(${period.presentes}P / ${period.faltas}F / ${period.justificados}J)` : '(sem registros)'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default HistoricoAlunoModal;
