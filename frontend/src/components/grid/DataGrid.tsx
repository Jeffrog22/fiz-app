import React, { useState, useCallback } from 'react';
import type { ChamadaLog, Aluno } from '../../types';

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

  const handleCellClick = useCallback(
    (alunoId: string, data: string) => {
      const current = getStatus(alunoId, data);
      const currentIndex = STATUS_CYCLE.indexOf(current);
      const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
      onTogglePresenca(alunoId, data, nextStatus);
    },
    [getStatus, onTogglePresenca]
  );

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

  const statusToSymbol = (status: PresencaStatus): string => {
    switch (status) {
      case 'presente': return 'P';
      case 'falta': return 'F';
      case 'justificado': return 'J';
      default: return '';
    }
  };

  return (
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
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {alunos.map((aluno) => (
            <tr key={aluno.id} className="hover:bg-gray-50">
              <td className="sticky left-0 bg-white px-4 py-2 text-gray-800 font-medium whitespace-nowrap">
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
                        <button
                          onClick={() => {
                            const atual = getAnotacao(aluno.id, dia) || '';
                            setAnotacaoTemp(atual);
                            setEditandoAnotacao({
                              alunoId: aluno.id,
                              data: dia,
                            });
                          }}
                          className="text-[10px] text-gray-400 hover:text-gray-600 max-w-[80px] truncate"
                        >
                          {getAnotacao(aluno.id, dia) || '✏️'}
                        </button>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataGrid;
