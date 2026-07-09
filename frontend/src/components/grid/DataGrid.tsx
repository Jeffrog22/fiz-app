import React, { useState, useCallback } from 'react';
import type { ChamadaLog, Aluno, Turma, CalendarioEvento } from '../../types';
import api from '../../utils/api';
import { formatarNomeMobile } from '../../utils/formatters';
import { isDataFutura } from '../../utils/chamadaUtils';
import AnotacoesModal from '../modals/AnotacoesModal';
import JustificativaModal from '../modals/JustificativaModal';

type PresencaStatus = 'presente' | 'falta' | 'justificado' | 'cancelado' | 'feriado' | 'ponte' | 'reuniao' | 'evento' | undefined;

const STATUS_CYCLE: (PresencaStatus)[] = [
  'presente',
  'falta',
  'justificado',
  undefined,
];

const STATUS_COLORS: Record<string, string> = {
  presente: 'bg-green-100 hover:bg-green-200 text-green-800',
  falta: 'bg-red-100 hover:bg-red-200 text-red-800',
  justificado: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
  cancelado: 'bg-gray-200 text-gray-600',
  feriado: 'bg-red-200 text-red-800',
  ponte: 'bg-orange-200 text-orange-800',
  reuniao: 'bg-blue-200 text-blue-800',
  evento: 'bg-purple-200 text-purple-800',
};

const STATUS_SYMBOLS: Record<string, string> = {
  presente: 'P',
  falta: 'F',
  justificado: 'J',
  cancelado: 'C',
  feriado: 'Fd',
  ponte: 'Po',
  reuniao: 'Re',
  evento: 'Ev',
};

const TIPO_EVENTO_CORES: Record<string, string> = {
  feriado: 'bg-red-100 border-red-300 text-red-700',
  ponte: 'bg-orange-100 border-orange-300 text-orange-700',
  reuniao: 'bg-blue-100 border-blue-300 text-blue-700',
  evento: 'bg-purple-100 border-purple-300 text-purple-700',
};

interface CardAulaRecord {
  condicao_clima?: string;
  temperatura_externa?: number;
  temperatura_piscina?: number;
  cloro_ppm?: number;
}

interface DataGridProps {
  alunos: Aluno[];
  dias: string[];
  logs: Record<string, Record<string, Record<number, ChamadaLog>>>;
  indiceAtual: number;
  turma?: Turma | null;
  eventos?: CalendarioEvento[];
  cardAulaData?: Record<string, Record<number, CardAulaRecord>>;
  turmaGrupoId?: string;
  onTogglePresenca: (alunoId: string, data: string, status: PresencaStatus) => void;
  onUpdateAnotacao: (alunoId: string, data: string, anotacao: string) => void;
  onDateHeaderClick: (data: string) => void;
  alunosComAnotacao?: Set<string>;
  onAnotacaoChange?: (alunoId: string) => void;
  onSaveJustificativa?: (alunoId: string, data: string, motivo: string) => void;
}

const DataGrid: React.FC<DataGridProps> = ({
  alunos,
  dias,
  logs,
  indiceAtual,
  turma,
  eventos,
  cardAulaData,
  turmaGrupoId,
  onTogglePresenca,
  onUpdateAnotacao,
  onDateHeaderClick,
  alunosComAnotacao,
  onAnotacaoChange,
  onSaveJustificativa,
}) => {
  const [editandoAnotacao, setEditandoAnotacao] = useState<{
    alunoId: string;
    data: string;
  } | null>(null);

  const [anotacaoTemp, setAnotacaoTemp] = useState('');
  const [historicoAberto, setHistoricoAberto] = useState<Aluno | null>(null);
  const [exclusaoModal, setExclusaoModal] = useState<{ aluno: Aluno; faltasMes: number } | null>(null);
  const [anotacoesModalAluno, setAnotacoesModalAluno] = useState<Aluno | null>(null);
  const [justificativaModal, setJustificativaModal] = useState<{
    aluno: Aluno; data: string; motivo?: string;
  } | null>(null);

  const eventosPorData = useCallback((data: string): CalendarioEvento[] => {
    if (!eventos) return [];
    return eventos.filter((e) => e.data === data);
  }, [eventos]);

  const getStatus = useCallback(
    (alunoId: string, data: string): PresencaStatus => {
      // 1. Eventos de calendário — sempre bloqueiam
      const dataEventos = eventosPorData(data);
      if (dataEventos.length > 0) {
        return dataEventos[0].tipo as PresencaStatus;
      }
      // 2. Turma-level: status propagado por CardAula/CardBO
      if (turmaGrupoId) {
        const turmaLog = logs[turmaGrupoId]?.[data]?.[indiceAtual];
        if (turmaLog?.status) return turmaLog.status as PresencaStatus;
      }
      // 3. Student-level manual: clique do usuário P/F/J
      const alunoLog = logs[alunoId]?.[data]?.[indiceAtual];
      if (alunoLog?.origem === 'manual' && alunoLog?.status) {
        return alunoLog.status as PresencaStatus;
      }
      return undefined;
    },
    [logs, eventosPorData, indiceAtual, turmaGrupoId]
  );

  const getOrigem = useCallback(
    (alunoId: string, data: string): string | undefined => {
      return logs[alunoId]?.[data]?.[indiceAtual]?.origem;
    },
    [logs, indiceAtual]
  );

  const getAnotacao = useCallback(
    (alunoId: string, data: string): string | undefined => {
      return logs[alunoId]?.[data]?.[indiceAtual]?.motivo;
    },
    [logs, indiceAtual]
  );

  const getCondicaoClima = useCallback(
    (data: string): string | undefined => {
      const diaRecords = cardAulaData?.[data];
      if (!diaRecords) return undefined;
      // Exact match for current indice
      if (diaRecords[indiceAtual]?.condicao_clima) {
        return diaRecords[indiceAtual].condicao_clima;
      }
      // Propagation: log mais recentemente salvo (criado_em DESC)
      // que tenha indice_aula <= atual
      const values = Object.values(diaRecords)
        .filter((r: any) => r.indice_aula <= indiceAtual)
        .sort((a: any, b: any) =>
          new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime()
        );
      if (values.length > 0 && values[0].condicao_clima) {
        return values[0].condicao_clima;
      }
      return undefined;
    },
    [cardAulaData, indiceAtual]
  );

  const temAlgumLog = useCallback(
    (data: string): boolean => {
      for (const alunoId of Object.keys(logs)) {
        if (logs[alunoId]?.[data]?.[indiceAtual]?.status) return true;
      }
      return false;
    },
    [logs, indiceAtual]
  );

  const getTooltipText = useCallback(
    (alunoId: string, data: string): string | undefined => {
      const status = getStatus(alunoId, data);
      if (!status) return undefined;

      const dataEventos = eventosPorData(data);
      if (dataEventos.length > 0) {
        const ev = dataEventos[0];
        return `${ev.tipo}${ev.descricao ? `: ${ev.descricao}` : ''}`;
      }

      const logEntry = logs[alunoId]?.[data]?.[indiceAtual]
        || (turmaGrupoId ? logs[turmaGrupoId]?.[data]?.[indiceAtual] : undefined);
      const turmaLog = turmaGrupoId ? logs[turmaGrupoId]?.[data]?.[indiceAtual] : undefined;

      const partes: string[] = [];

      if (status === 'cancelado') {
        partes.push('Cancelado');
        const ocorrencia = logEntry?.tipo_ocorrencia || turmaLog?.tipo_ocorrencia;
        const motivoFinal = logEntry?.motivo || turmaLog?.motivo;
        const tipoSelect = logEntry?.tipo_select || turmaLog?.tipo_select;
        if (ocorrencia) partes.push(`Ocorrência: ${ocorrencia}`);
        if (motivoFinal) partes.push(`Motivo: ${motivoFinal}`);
        if (tipoSelect) partes.push(tipoSelect === 'geral' ? 'Geral' : 'Pessoal');
      } else if (status === 'justificado') {
        partes.push('Justificado');
        const motivoFinal = logEntry?.motivo || turmaLog?.motivo;
        if (motivoFinal) partes.push(`Motivo: ${motivoFinal}`);
      } else if (status === 'presente' || status === 'falta') {
        partes.push(status === 'presente' ? 'Presente' : 'Falta');
        const clima = cardAulaData?.[data]?.[indiceAtual];
        if (clima?.condicao_clima) {
          partes.push(`Clima: ${clima.condicao_clima}`);
          if (clima.temperatura_piscina) partes.push(`Piscina: ${clima.temperatura_piscina}°C`);
        }
        if (logEntry?.origem === 'extrapolado') partes.push('(extrapolado)');
      }

      return partes.length > 0 ? partes.join(' — ') : status;
    },
    [getStatus, eventosPorData, logs, turmaGrupoId, indiceAtual, cardAulaData]
  );

  const contarFaltasMes = useCallback((alunoId: string): number => {
    let count = 0;
    for (const dia of dias) {
      if (getStatus(alunoId, dia) === 'falta') count++;
    }
    return count;
  }, [dias, getStatus]);

  const temAnotacao = useCallback((alunoId: string): boolean => {
    for (const dia of dias) {
      if (getAnotacao(alunoId, dia)) return true;
    }
    return false;
  }, [dias, getAnotacao]);

  const isEventoCalendario = useCallback((data: string): boolean => {
    return eventosPorData(data).length > 0;
  }, [eventosPorData]);

  const primeiroDiaJustificado = useCallback((alunoId: string): string | null => {
    for (const dia of dias) {
      if (getStatus(alunoId, dia) === 'justificado') return dia;
    }
    return dias.length > 0 ? dias[0] : null;
  }, [dias, getStatus]);

  const handleCellClick = useCallback(
    (alunoId: string, data: string) => {
      if (isDataFutura(data)) return;
      const current = getStatus(alunoId, data);
      if (current === 'feriado' || current === 'ponte' || current === 'reuniao' || current === 'evento' || current === 'cancelado') return;
      const studentLogEntry = logs[alunoId]?.[data]?.[indiceAtual];
      const isManual = studentLogEntry?.origem === 'manual';
      if (isManual) {
        const currentIndex = STATUS_CYCLE.indexOf(current);
        const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
        onTogglePresenca(alunoId, data, nextStatus);
      } else {
        onTogglePresenca(alunoId, data, 'presente');
      }
    },
    [getStatus, onTogglePresenca, logs, indiceAtual]
  );

  const handleNomeClick = useCallback((aluno: Aluno) => {
    setAnotacoesModalAluno(aluno);
  }, []);

  const handleAnotacaoBlur = useCallback(
    (alunoId: string, data: string) => {
      if (editandoAnotacao && anotacaoTemp !== undefined) {
        onUpdateAnotacao(alunoId, data, anotacaoTemp);
      }
      setEditandoAnotacao(null);
      setAnotacaoTemp('');
    },
    [editandoAnotacao, anotacaoTemp, onUpdateAnotacao]
  );

  const handleExcluir = async (aluno: Aluno) => {
    try {
      await api.delete(`/alunos/${aluno.id}`, { data: { motivo: 'falta' } });
      setExclusaoModal(null);
      window.location.reload();
    } catch (err) {
      console.error('Erro ao excluir aluno', err);
    }
  };

  const statusToSymbol = (status: PresencaStatus): string => {
    return STATUS_SYMBOLS[status || ''] || '';
  };

  const capacity = turma?.capacidade || alunos.length;
  const lotacao = alunos.length;

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-4 py-2 text-left font-medium text-gray-500 min-w-[160px] z-10">
                Aluno
              </th>
              {dias.map((dia) => {
                const futura = isDataFutura(dia);
                const temLog = temAlgumLog(dia);
                const diaEventos = eventosPorData(dia);
                const hasEvento = diaEventos.length > 0;
                return (
                  <th
                    key={dia}
                    className={`px-2 py-1 text-center font-medium min-w-[40px] ${
                      futura ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => !futura && onDateHeaderClick(dia)}
                      disabled={futura}
                      className={`block w-full text-center ${
                        !futura
                          ? 'cursor-pointer hover:text-primary-600'
                          : 'cursor-default'
                      }`}
                      title={
                        futura
                          ? 'Data futura'
                          : temLog
                          ? `Clima: ${getCondicaoClima(dia) || 'sem registro'}`
                          : 'Clique para registrar aula'
                      }
                    >
                      <span className="text-xs font-bold">
                        {new Date(dia + 'T12:00:00').getDate()}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th className="sticky right-0 bg-gray-50 px-2 py-2 text-center font-medium text-gray-500 min-w-[90px] z-10">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {alunos.map((aluno) => {
              const faltasMes = contarFaltasMes(aluno.id);
              return (
                <tr key={aluno.id} className="hover:bg-gray-50">
                  <td
                    className={`sticky left-0 bg-white px-4 py-2 font-medium whitespace-nowrap cursor-pointer z-10 ${
                      temAnotacao(aluno.id) || (alunosComAnotacao?.has(aluno.id))
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-800'
                    }`}
                    onClick={() => handleNomeClick(aluno)}
                    title="Clique para ver anotações"
                  >
                    {formatarNomeMobile(aluno.nome)}
                  </td>
                  {dias.map((dia) => {
                    const status = getStatus(aluno.id, dia);
                    const futura = isDataFutura(dia);
                    const isCalendario = status === 'feriado' || status === 'ponte' || status === 'reuniao' || status === 'evento' || status === 'cancelado';
                    return (
                      <td key={dia} className="px-2 py-1 text-center border-r border-gray-100">
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => handleCellClick(aluno.id, dia)}
                            aria-disabled={futura || isCalendario}
                            title={getTooltipText(aluno.id, dia)}
                            className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${
                              futura
                                ? 'bg-gray-50 text-gray-200 cursor-not-allowed'
                                : isCalendario
                                ? `${STATUS_COLORS[status || '']} cursor-default`
                                : status
                                ? `${STATUS_COLORS[status]} cursor-pointer ${getOrigem(aluno.id, dia) === 'extrapolado' ? 'border border-dashed border-amber-400' : ''}`
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-400 cursor-pointer'
                            }`}
                          >
                            {futura ? '-' : statusToSymbol(status)}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  <td className="sticky right-0 bg-white px-2 py-1 text-center z-10">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => {
                          const dia = primeiroDiaJustificado(aluno.id);
                          if (dia) setJustificativaModal({ aluno, data: dia, motivo: getAnotacao(aluno.id, dia) ?? undefined });
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
                        title="Justificativa"
                      >
                        Just
                      </button>
                      <button
                        onClick={() => setHistoricoAberto(aluno)}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        title="Histórico de presença"
                      >
                        Hist
                      </button>
                      {faltasMes >= 3 && (
                        <button
                          onClick={() => setExclusaoModal({ aluno, faltasMes })}
                          className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 rounded hover:bg-red-100"
                          title="Excluir (3+ faltas no mês)"
                        >
                          Del
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {alunos.length > 0 && (
        <div className="text-xs bg-gray-50 px-4 py-3 rounded border border-gray-200 space-y-1">
          <div className="flex justify-between text-gray-500">
            <span>Lotação</span>
            <span className="font-medium">{lotacao}/{capacity}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                lotacao > capacity
                  ? 'bg-red-500'
                  : lotacao === capacity
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((lotacao / (capacity || 1)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>
              {lotacao > capacity
                ? `${lotacao - capacity} excedente(s)`
                : lotacao === capacity
                ? 'Turma lotada'
                : `${capacity - lotacao} vaga(s)`}
            </span>
          </div>
        </div>
      )}

      {historicoAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setHistoricoAberto(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl m-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Histórico: {formatarNomeMobile(historicoAberto.nome)}</h3>
              <button onClick={() => setHistoricoAberto(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Total de Aulas</p>
                  <p className="text-lg font-bold text-gray-800">{dias.length}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Faltas no Mês</p>
                  <p className="text-lg font-bold text-red-600">{contarFaltasMes(historicoAberto.id)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 italic">Dados do período atual de {dias.length} dias.</p>
            </div>
          </div>
        </div>
      )}

      <AnotacoesModal
        aberto={!!anotacoesModalAluno}
        aluno={anotacoesModalAluno}
        onClose={() => setAnotacoesModalAluno(null)}
        onAnotacaoChange={onAnotacaoChange}
      />

      <JustificativaModal
        aberto={!!justificativaModal}
        aluno={justificativaModal?.aluno || null}
        data={justificativaModal?.data || ''}
        indiceAula={0}
        motivoAtual={justificativaModal?.motivo}
        onClose={() => setJustificativaModal(null)}
        onSave={(alunoId, data, motivo) => {
          onSaveJustificativa?.(alunoId, data, motivo);
          setJustificativaModal(null);
        }}
      />

      {exclusaoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setExclusaoModal(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl m-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Excluir Aluno</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{formatarNomeMobile(exclusaoModal.aluno.nome)}</strong> possui <strong>{exclusaoModal.faltasMes} faltas</strong> neste mês.
              Deseja enviar para a lista de exclusões?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setExclusaoModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleExcluir(exclusaoModal.aluno)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DataGrid;
