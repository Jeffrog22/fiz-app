import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import type {
  Aluno,
  Professor,
  Turma,
  TransferenciaLoteCreateInput,
  TransferenciaLoteItemInput,
} from '../../types';
import { getTenantId } from '../../utils/tenant';
import { parseDiasFromLabel } from '../../utils/chamadaUtils';
import { X, Loader2, Clock, AlertCircle, Users, ArrowRight } from 'lucide-react';

interface TransferenciaLoteReviewModalProps {
  aberto: boolean;
  onClose: () => void;
  alunosSelecionados: Aluno[];
  onSucesso: () => void;
}

const primeiroDiaMesSeguinte = (): string => {
  const hoje = new Date();
  hoje.setMonth(hoje.getMonth() + 1);
  hoje.setDate(1);
  hoje.setHours(0, 0, 0, 0);
  return hoje.toISOString().split('T')[0];
};

const TransferenciaLoteReviewModal: React.FC<TransferenciaLoteReviewModalProps> = ({
  aberto,
  onClose,
  alunosSelecionados,
  onSucesso,
}) => {
  const { isVisitante } = useAuth();
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professorDestino, setProfessorDestino] = useState<string>('');
  const [turmaDestino, setTurmaDestino] = useState<string>('');
  const [dataEfetiva, setDataEfetiva] = useState(primeiroDiaMesSeguinte());
  const [motivo, setMotivo] = useState('');
  const [nivelDestino, setNivelDestino] = useState<string | null>(null);
  const [professorDestinoNome, setProfessorDestinoNome] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Origem de cada aluno: matrícula atual (turma_id + nivel)
  const origens = useMemo(() => {
    return alunosSelecionados.map((a) => ({
      aluno_id: a.id,
      aluno_nome: a.nome,
      turma_origem: a.turma_id || '',
      nivel_origem: a.nivel || null,
    }));
  }, [alunosSelecionados]);

  // Turmas disponíveis para o professor destino selecionado
  const turmasDisponiveis = useMemo(() => {
    if (!professorDestino) return turmas;
    return turmas.filter((t) => t.professor_id === professorDestino);
  }, [professorDestino, turmas]);

  const turmaSelecionada = turmas.find((t) => t.grupo_id === turmaDestino);

  useEffect(() => {
    if (!aberto) return;
    setSucesso(null);
    setErro(null);
    setTurmaDestino('');
    setNivelDestino(null);
    setProfessorDestinoNome(null);
    carregarDados();
  }, [aberto]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const [resProf, resTur] = await Promise.all([
        api.get('/api/professores'),
        api.get('/api/turmas'),
      ]);
      setProfessores(resProf.data || []);
      setTurmas((resTur.data || []).filter((t: any) => t.tenant_id === getTenantId()));
    } catch {
      setErro('Erro ao carregar professores e turmas');
    } finally {
      setCarregando(false);
    }
  };

  const handleProfessorChange = async (value: string) => {
    setProfessorDestino(value);
    setTurmaDestino('');
    setNivelDestino(null);
    setProfessorDestinoNome(null);
    const prof = professores.find((p) => p.id === value);
    setProfessorDestinoNome(prof?.nome || null);
  };

  const handleTurmaChange = (value: string) => {
    setTurmaDestino(value);
    const t = turmasDisponiveis.find((t) => t.grupo_id === value);
    setNivelDestino(t?.nivel || null);
  };

  const handleSave = async () => {
    if (isVisitante) {
      setErro('Visitante não pode programar transferências');
      return;
    }
    if (!turmaDestino) {
      setErro('Selecione a turma de destino');
      return;
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataEf = new Date(dataEfetiva);
    if (dataEf < hoje) {
      setErro('A data efetiva não pode ser no passado');
      return;
    }

    const itens: TransferenciaLoteItemInput[] = origens.map((o) => ({
      aluno_id: o.aluno_id,
      turma_destino: o.turma_origem ? turmaDestino : '',
    }));

    const input: TransferenciaLoteCreateInput = {
      turma_destino: turmaDestino,
      nivel_destino: nivelDestino,
      professor_destino: professorDestino || undefined,
      data_efetiva: dataEfetiva,
      motivo: motivo || undefined,
      itens,
    };

    setCarregando(true);
    setErro(null);
    try {
      await api.post('/api/transferencias-nivel/lotes', input);
      setSucesso('Lote programado com sucesso. Os alunos serão transferidos na data efetiva.');
      onSucesso();
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setErro(err?.response?.data?.error || 'Erro ao programar transferência');
    } finally {
      setCarregando(false);
    }
  };

  if (!aberto) return null;

  // Projeção de lotação: alunos atuais da turma destino - saídas + entradas
  let projecao = { atuais: 0, saidas: 0, entradas: 0, projetado: 0 };
  if (turmaSelecionada?.capacidade) {
    projecao.atuais = turmaSelecionada.capacidade; // usar capacidade como base visual
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Programar Transferência de Nível
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex flex-col gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Users size={18} className="text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-800 dark:text-blue-200">Alunos selecionados ({alunosSelecionados.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left pb-2 text-gray-600 dark:text-gray-400">Aluno</th>
                    <th className="text-left pb-2 text-gray-600 dark:text-gray-400">Turma de origem</th>
                    <th className="text-left pb-2 text-gray-600 dark:text-gray-400">Nível de origem</th>
                  </tr>
                </thead>
                <tbody>
                  {origens.map((o) => (
                    <tr key={o.aluno_id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 text-gray-800 dark:text-gray-200">{o.aluno_nome}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{o.turma_origem || 'Sem turma'}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{o.nivel_origem || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Professor de destino
              </label>
              <select
                value={professorDestino}
                onChange={(e) => handleProfessorChange(e.target.value)}
                disabled={carregando}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="">Escolha o professor</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome_documento || p.nome} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Turma / Horário de destino
              </label>
              <select
                value={turmaDestino}
                onChange={(e) => handleTurmaChange(e.target.value)}
                disabled={!professorDestino || carregando}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Escolha a turma</option>
                {turmasDisponiveis.map((t) => {
                  const prof = professores.find((p) => p.id === t.professor_id);
                  return (
                    <option key={t.grupo_id} value={t.grupo_id}>
                      {t.label} • {t.horario.slice(0, 5)} {prof ? `— ${prof.nome_documento || prof.nome}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data efetiva
              </label>
              <input
                type="date"
                value={dataEfetiva}
                onChange={(e) => setDataEfetiva(e.target.value)}
                disabled={carregando}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Padrão: 1º dia do mês seguinte (America/Sao_Paulo)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nível de destino
              </label>
              <input
                type="text"
                value={nivelDestino || ''}
                readOnly
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">Lotação projetada</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Vagas na turma destino:</span>
              <span className="font-mono font-medium">{turmaSelecionada?.capacidade ?? '—'}</span>
              <span className="text-gray-600 dark:text-gray-400">Alunos entrando:</span>
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{alunosSelecionados.length}</span>
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5" />
                <p className="text-red-800 dark:text-red-300 text-sm">{erro}</p>
              </div>
            </div>
          )}
          {sucesso && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
              <p className="text-green-800 dark:text-green-300 text-sm">{sucesso}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={carregando}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={carregando || !turmaDestino || isVisitante}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? <Loader2 size={16} className="mr-2 animate-spin" /> : ''}
            Programar transferência
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferenciaLoteReviewModal;
