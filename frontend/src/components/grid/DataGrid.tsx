import React, { useState, useCallback } from 'react';
import type { ChamadaLog, Aluno } from '../../types';
import api from '../../utils/api';

type PresencaStatus = 'presente' | 'falta' | 'justificado' | undefined;

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
};

interface DataGridProps {
  alunos: Aluno[];
  dias: string[];
  logs: Record<string, Record<string, ChamadaLog>>;
  onTogglePresenca: (alunoId: string, data: string, status: PresencaStatus) => void;
  onUpdateAnotacao: (alunoId: string, data: string, anotacao: string) => void;
}

const DataGrid: React.FC<DataGridProps> = ({
  alunos,
  dias,
  logs,
  onTogglePresenca,
  onUpdateAnotacao,
}) => {
  const [editandoAnotacao, setEditandoAnotacao] = useState<{
    alunoId: string;
    data: string;
  } | null>(null);

  const [anotacaoTemp, setAnotacaoTemp] = useState('');
  const [historicoAberto, setHistoricoAberto] = useState<Aluno | null>(null);
  const [exclusaoModal, setExclusaoModal] = useState<{ aluno: Aluno; faltasMes: number } | null>(null);

  const getStatus = useCallback(
    (alunoId: string, data: string): PresencaStatus => {
      return logs[alunoId]?.[data]?.status as PresencaStatus;
    },
    [logs]
  );

  const getAnotacao = useCallback(
    (alunoId: string, data: string): string | undefined => {
      return logs[alunoId]?.[data]?.motivo;
    },
    [logs]
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

  const handleCellClick = useCallback(
    (alunoId: string, data: string) => {
      const current = getStatus(alunoId, data);
      const currentIndex = STATUS_CYCLE.indexOf(current);
      const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
      onTogglePresenca(alunoId, data, nextStatus);
    },
    [getStatus, onTogglePresenca]
  );

  const handleNomeClick = useCallback((alunoId: string, data: string) => {
    const atual = logs[alunoId]?.[data]?.motivo || '';
    setAnotacaoTemp(atual);
    setEditandoAnotacao({ alunoId, data });
  }, [logs]);

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
    switch (status) {
      case 'presente': return 'P';
      case 'falta': return 'F';
      case 'justificado': return 'J';
      default: return '';
    }
  };

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-4 py-2 text-left font-medium text-gray-500 min-w-[180px]">
                Aluno
              </th>
              {dias.map((dia) => (
                <th
                  key={dia}
                  className="px-3 py-2 text-center font-medium text-gray-500 min-w-[48px]"
                >
                  {new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </th>
              ))}
              <th className="sticky right-0 bg-gray-50 px-2 py-2 text-center font-medium text-gray-500 min-w-[100px]">
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
                    className={`sticky left-0 bg-white px-4 py-2 font-medium whitespace-nowrap cursor-pointer ${
                      temAnotacao(aluno.id) ? 'text-blue-600 bg-blue-50' : 'text-gray-800'
                    }`}
                    onClick={() => handleNomeClick(aluno.id, dias[0])}
                    title="Clique para anotar"
                  >
                    {aluno.nome}
                  </td>
                  {dias.map((dia) => {
                    const status = getStatus(aluno.id, dia);
                    return (
                      <td key={dia} className="px-1 py-1 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => handleCellClick(aluno.id, dia)}
                            className={`w-8 h-8 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              status
                                ? STATUS_COLORS[status]
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                            }`}
                            title={
                              status === 'presente'
                                ? 'Presente'
                                : status === 'falta'
                                ? 'Falta'
                                : status === 'justificado'
                                ? 'Justificado'
                                : 'Vazio'
                            }
                          >
                            {statusToSymbol(status)}
                          </button>
                          {editandoAnotacao?.alunoId === aluno.id &&
                          editandoAnotacao?.data === dia ? (
                            <input
                              autoFocus
                              className="w-20 text-[10px] px-1 py-0.5 border border-gray-300 rounded"
                              value={anotacaoTemp}
                              onChange={(e) => setAnotacaoTemp(e.target.value)}
                              onBlur={() =>
                                handleAnotacaoBlur(aluno.id, dia)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAnotacaoBlur(aluno.id, dia);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-[10px] text-gray-400 max-w-[80px] truncate block">
                              {getAnotacao(aluno.id, dia) || ''}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="sticky right-0 bg-white px-2 py-1 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => setHistoricoAberto(aluno)}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        title="Histórico de presença"
                      >
                        📊
                      </button>
                      {faltasMes >= 3 && (
                        <button
                          onClick={() => setExclusaoModal({ aluno, faltasMes })}
                          className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600 rounded hover:bg-red-100"
                          title="Excluir (3+ faltas no mês)"
                        >
                          🗑️
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
        <div className="text-xs text-gray-500 bg-gray-50 px-4 py-2 rounded border border-gray-200">
          Lotação/capacidade (da turma): {alunos.length}/{alunos.length}
        </div>
      )}

      {historicoAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setHistoricoAberto(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl m-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Histórico: {historicoAberto.nome}</h3>
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

      {exclusaoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setExclusaoModal(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl m-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Excluir Aluno</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{exclusaoModal.aluno.nome}</strong> possui <strong>{exclusaoModal.faltasMes} faltas</strong> neste mês.
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
