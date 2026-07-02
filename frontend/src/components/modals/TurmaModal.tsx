import React, { useState, useEffect } from 'react';
import type { Turma } from '../../types';
import { mascaraHora } from '../../utils/formatters';
import { validarHora, sanitizarInput } from '../../utils/validators';

interface TurmaModalProps {
  open: boolean;
  turma?: Turma | null;
  professores: { id: string; nome: string }[];
  alunosPendentes?: any[];
  onSave: (data: any) => void;
  onAlocar: (alunoIds: string[], turmaId: string) => Promise<void>;
  onClose: () => void;
}

const DAYS = [
  { key: 'Segunda', chip: 'Seg' },
  { key: 'Terça', chip: 'Ter' },
  { key: 'Quarta', chip: 'Qua' },
  { key: 'Quinta', chip: 'Qui' },
  { key: 'Sexta', chip: 'Sex' },
];

const ABBREV_TO_KEY: Record<string, string> = {
  'Seg': 'Segunda', 'Ter': 'Terça', 'Qua': 'Quarta',
  'Qui': 'Quinta', 'Sex': 'Sexta', 'Sab': 'Sábado', 'Dom': 'Domingo',
};

function parseLabel(label: string): string[] {
  return label
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ABBREV_TO_KEY[s] || s);
}

function gerarLabel(dias: string[]): string {
  const map: Record<string, string> = {
    Segunda: 'Seg', Terça: 'Ter', Quarta: 'Qua',
    Quinta: 'Qui', Sexta: 'Sex', Sábado: 'Sab', Domingo: 'Dom',
  };
  return dias.map((d) => map[d] || d.slice(0, 3)).join('/');
}

const TurmaModal: React.FC<TurmaModalProps> = ({
  open, turma, professores, alunosPendentes = [],
  onSave, onAlocar, onClose,
}) => {
  const [dias, setDias] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [horario, setHorario] = useState('');
  const [nivel, setNivel] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [erroHorario, setErroHorario] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo?: string } | null>(null);

  const [modoAlocacao, setModoAlocacao] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [alocando, setAlocando] = useState(false);

  const isNew = !turma;
  const vagasDisponiveis = turma?.capacidade
    ? turma.capacidade - (turma.alunos_count ?? 0)
    : Infinity;

  useEffect(() => {
    if (turma) {
      const parsed = parseLabel(turma.label);
      setDias(parsed);
      setLabel(turma.label);
      setHorario(mascaraHora(turma.horario || ''));
      setNivel(turma.nivel || '');
      setCapacidade(turma.capacidade?.toString() || '');
      setFaixaEtaria(turma.faixa_etaria || '');
      setProfessorId(turma.professor_id || '');
    } else {
      setDias([]);
      setLabel('');
      setHorario('');
      setNivel('');
      setCapacidade('');
      setFaixaEtaria('');
      setProfessorId('');
    }
    setModoAlocacao(false);
    setSelectedIds(new Set());
    setErroHorario(null);
    setToast(null);
  }, [turma, open]);

  if (!open) return null;

  const toggleDia = (key: string) => {
    const next = dias.includes(key)
      ? dias.filter((d) => d !== key)
      : [...dias, key];
    setDias(next);
    if (!isNew) return;
    setLabel(next.length > 0 ? gerarLabel(next) : '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNew) {
      const erro = validarHora(horario);
      if (erro) {
        setErroHorario(erro);
        setToast({ msg: erro });
        return;
      }
      onSave({
        label,
        horario,
        nivel: nivel || undefined,
        capacidade: capacidade ? parseInt(capacidade, 10) : undefined,
        faixa_etaria: faixaEtaria || undefined,
        professor_id: professorId || undefined,
      });
      return;
    }

    if (dias.length === 0) {
      setToast({ msg: 'Selecione pelo menos um dia da semana' });
      return;
    }

    const erro = validarHora(horario);
    if (erro) {
      setErroHorario(erro);
      setToast({ msg: erro });
      return;
    }

    onSave({
      dias,
      horario,
      nivel: nivel || undefined,
      capacidade: capacidade ? parseInt(capacidade, 10) : undefined,
      faixa_etaria: faixaEtaria || undefined,
      professor_id: professorId || undefined,
    });
  };

  const toggleSelecao = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmarAlocacao = async () => {
    if (!turma || selectedIds.size === 0) return;
    setAlocando(true);
    try {
      await onAlocar(Array.from(selectedIds), turma.id);
      setModoAlocacao(false);
      setSelectedIds(new Set());
    } catch {
      setToast({ msg: 'Erro ao alocar alunos', tipo: 'erro' });
    } finally {
      setAlocando(false);
    }
  };

  if (modoAlocacao && turma) {
    const pendentes = alunosPendentes.filter((a) => !a.turma_id);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Alocar em: {turma.label} - {(turma.horario || '').slice(0, 5)}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Vagas: {turma.alunos_count ?? 0}/{turma.capacidade || '∞'}
              {vagasDisponiveis > 0 && vagasDisponiveis < Infinity
                ? ` (${vagasDisponiveis} disponíve${vagasDisponiveis === 1 ? 'l' : 'is'})`
                : vagasDisponiveis <= 0 ? ' (lotada)' : ''}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {pendentes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Nenhum aluno pendente para alocar
              </p>
            ) : (
              pendentes.map((a: any) => (
                <label
                  key={a.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                    selectedIds.has(a.id)
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(a.id)}
                    onChange={() => toggleSelecao(a.id)}
                    className="rounded border-gray-300 text-primary-600"
                    disabled={vagasDisponiveis <= 0 && !selectedIds.has(a.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.nome}</p>
                    {a.data_nascimento && (
                      <p className="text-xs text-gray-400">
                        {(() => {
                          const hoje = new Date();
                          const nasc = new Date(a.data_nascimento + 'T12:00:00');
                          let idade = hoje.getFullYear() - nasc.getFullYear();
                          const mes = hoje.getMonth() - nasc.getMonth();
                          if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--;
                          return `${idade} anos`;
                        })()}
                      </p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-xs text-gray-400">
              {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setModoAlocacao(false); setSelectedIds(new Set()); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAlocacao}
                disabled={selectedIds.size === 0 || alocando || vagasDisponiveis <= 0}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {alocando ? 'Alocando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <div className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded shadow-lg text-sm z-50 ${
            toast.tipo === 'erro' ? 'bg-red-600' : 'bg-green-600'
          }`}>
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 font-bold">&times;</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {isNew ? 'Nova Turma' : turma!.label}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => setModoAlocacao(true)}
                className="px-3 py-1 text-xs font-medium border border-primary-300 text-primary-700 rounded-md hover:bg-primary-50 transition-colors"
              >
                Alocar
              </button>
            )}
            {turma?.grupo_id && (
              <span className="text-xs text-gray-400 font-mono" title="Grupo ID">
                {turma.grupo_id}
              </span>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {isNew && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Dias da Semana</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDia(day.key)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                      dias.includes(day.key)
                        ? 'bg-primary-100 border-primary-300 text-primary-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {day.chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Turma</label>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isNew}
              placeholder={isNew && dias.length > 0 ? gerarLabel(dias) : ''}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            {isNew && label && (
              <span className="text-xs text-gray-400 mt-0.5 font-mono">
                grupo_id: {professorId?.slice(0, 3)?.toLowerCase() || '??'}
                {dias.map((d) => d.toLowerCase()[0]).join('')}XX
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Horário</label>
            <input
              required
              type="text"
              inputMode="numeric"
              placeholder="somente números"
              value={horario}
              onChange={(e) => {
                setErroHorario(null);
                setHorario(mascaraHora(sanitizarInput(e.target.value)));
              }}
              onPaste={(e) => {
                e.preventDefault();
                const colado = e.clipboardData.getData('text');
                setHorario(mascaraHora(sanitizarInput(colado)));
              }}
              maxLength={5}
              className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 ${erroHorario ? 'border-red-500 animate-shake' : 'border-gray-300 focus:ring-primary-500'}`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Nível</label>
            <input
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Professor</label>
            <select
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Capacidade</label>
            <input
              type="number"
              min={1}
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Faixa Etária</label>
            <input
              value={faixaEtaria}
              onChange={(e) => setFaixaEtaria(e.target.value)}
              placeholder="ex: 6-10 anos"
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              {isNew ? 'Criar' : 'Salvar'}
            </button>
          </div>
        </form>

        {toast && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg text-sm z-50">
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 font-bold">&times;</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TurmaModal;
