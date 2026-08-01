import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import type { Aluno, Turma, Professor, SavePayload } from '../../types';
import { mascaraTelefone, mascaraData, desmascarar, formatDateISO, formatDateBR, sortTurmas } from '../../utils/formatters';
import { calcIdade, calcCategoria } from '../../utils/formatters';
import { validarData, validarTelefone, sanitizarInput } from '../../utils/validators';

interface LastSession {
  genero: string;
  turmaId: string;
  professorId: string;
  nivel: string;
}

interface AlunoModalProps {
  open: boolean;
  aluno?: Aluno | null;
  professores?: Professor[];
  onSave: (payload: SavePayload) => void;
  onClose: () => void;
  lastSession?: LastSession;
  resetCounter?: number;
}

function normalizarGenero(valor: string): string {
  const v = valor.toLowerCase().trim().replace(/[^a-zà-ÿ]/g, '');
  if (v.includes('nao') || v.includes('não')) return 'nao-binario';
  if (v.startsWith('masculin') || v === 'm') return 'masculino';
  if (v.startsWith('feminin') || v === 'f') return 'feminino';
  return v;
}

const AlunoModal: React.FC<AlunoModalProps> = ({ open, aluno, professores = [], onSave, onClose, lastSession, resetCounter }) => {
  const [editMode, setEditMode] = useState(false);
  const [acao, setAcao] = useState<'correcao' | 'transferencia' | 'duplicar' | null>(null);

  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [genero, setGenero] = useState('');
  const [contato, setContato] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [parQ, setParQ] = useState<'sim' | 'nao' | ''>('');
  const [atestadoMedico, setAtestadoMedico] = useState(false);
  const [dataAtestado, setDataAtestado] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [nivel, setNivel] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [erroData, setErroData] = useState<string | null>(null);
  const [erroContato, setErroContato] = useState<string | null>(null);
  const [transferenciaExterna, setTransferenciaExterna] = useState(false);
  const [duplicarCadastro, setDuplicarCadastro] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tipo?: 'sucesso' | 'erro' } | null>(null);

  const isNew = !aluno;
  const idade = calcIdade(dataNascimento ? formatDateISO(dataNascimento) : undefined);
  const categoria = calcCategoria(idade);
  const turmasFiltradas = useMemo(() => {
    if (!professorId) return turmas;
    return turmas.filter((t) => t.professor_id === professorId);
  }, [turmas, professorId]);
  const turmaSelecionada = turmas.find((t) => t.grupo_id === turmaId);
  const turmasOrdenadas = useMemo(() => sortTurmas(turmasFiltradas), [turmasFiltradas]);

  useEffect(() => {
    if (!open) return;
    api.get('/turmas').then((res) => setTurmas(res.data)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (aluno) {
      setNome(aluno.nome);
      setDataNascimento(aluno.data_nascimento ? formatDateBR(aluno.data_nascimento) : '');
      setGenero(normalizarGenero(aluno.genero || ''));
      setContato(mascaraTelefone(aluno.contato || ''));
      setAtivo(aluno.ativo);
      setParQ(aluno.par_q === true ? 'sim' : aluno.par_q === false ? 'nao' : '');
      setAtestadoMedico(aluno.atestado_medico === true);
      setDataAtestado(aluno.data_atestado || '');
      setTurmaId(aluno.turma_id || '');
      setNivel(aluno.nivel || (aluno as any).turma?.nivel || '');
      setProfessorId(aluno.turma?.professor_id || '');
    } else {
      setNome('');
      setDataNascimento('');
      setGenero(lastSession?.genero || '');
      setContato('');
      setAtivo(true);
      setParQ('');
      setAtestadoMedico(false);
      setDataAtestado('');
      setTurmaId(lastSession?.turmaId || '');
      setNivel(lastSession?.nivel || '');
      setProfessorId(lastSession?.professorId || '');
    }
    setEditMode(false);
    setAcao(null);
    setTransferenciaExterna(false);
    setDuplicarCadastro(false);
    setErroData(null);
    setErroContato(null);
    setToast(null);
  }, [aluno, open, resetCounter]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const isEditMode = isNew || editMode;
  const camposEditaveis = isEditMode && (isNew || acao !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const erroDataMsg = dataNascimento ? validarData(dataNascimento) : null;
    const erroContatoMsg = contato ? validarTelefone(contato) : null;

    if (erroDataMsg || erroContatoMsg) {
      setErroData(erroDataMsg);
      setErroContato(erroContatoMsg);
      setToast({ msg: erroDataMsg || erroContatoMsg || 'Verifique os campos', tipo: 'erro' });
      return;
    }

    const payload: Partial<Aluno> = {
      nome,
      data_nascimento: dataNascimento ? formatDateISO(dataNascimento) : undefined,
      genero: normalizarGenero(genero || '') || undefined,
      contato: contato ? desmascarar(contato) : undefined,
      ativo,
      par_q: parQ === 'sim' ? true : parQ === 'nao' ? false : undefined,
      par_q_data: parQ === 'sim' ? (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })() : undefined,
      atestado_medico: atestadoMedico || undefined,
      data_atestado: dataAtestado ? formatDateISO(dataAtestado) : undefined,
    };

    if (acao === 'transferencia' || acao === 'duplicar') {
      payload.turma_id = turmaId || undefined;
      payload.nivel = nivel || undefined;
    } else if (acao === 'correcao') {
    } else if (isNew) {
      payload.turma_id = turmaId || undefined;
      payload.nivel = nivel || undefined;
      (payload as any).transferencia_externa = transferenciaExterna || undefined;
      (payload as any).duplicar_cadastro = duplicarCadastro || undefined;
    }

    onSave({ data: payload, acao: acao || undefined });
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-black/20 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {isNew ? 'Novo Aluno' : isEditMode ? `Editando: ${aluno!.nome}` : aluno!.nome}
          </h2>
          {!isNew && !isEditMode && (
            <button
              type="button"
              onClick={handleEditClick}
              className="px-3 py-1 text-xs font-medium border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
            >
              ✏️ Editar
            </button>
          )}
        </div>

        {isEditMode && !isNew && (
          <div className="px-6 pt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setAcao(acao === 'correcao' ? null : 'correcao')}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                acao === 'correcao'
                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Correção
            </button>
            <button
              type="button"
              onClick={() => setAcao(acao === 'transferencia' ? null : 'transferencia')}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                acao === 'transferencia'
                  ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Transferência
            </button>
            <button
              type="button"
              onClick={() => setAcao(acao === 'duplicar' ? null : 'duplicar')}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                acao === 'duplicar'
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Criar segundo cadastro
            </button>
          </div>
        )}

        {acao === 'transferencia' && (
          <div className="mx-6 mt-3 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-md space-y-3">
            <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Transferir aluno para outra turma</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Professor(a)</label>
              <select
                value={professorId}
                onChange={(e) => {
                  setProfessorId(e.target.value);
                  setTurmaId('');
                  setNivel('');
                }}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm"
              >
                <option value="">Selecione</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Turma + Horário</label>
              <select
                value={turmaId}
                onChange={(e) => {
                  setTurmaId(e.target.value);
                  const t = turmas.find((x) => x.grupo_id === e.target.value);
                  if (t) {
                    setNivel(t.nivel || '');
                    setProfessorId(t.professor_id || '');
                  }
                }}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm"
                disabled={!professorId}
              >
                <option value="">Selecione a turma</option>
                {turmasOrdenadas.map((t) => (
                  <option key={t.grupo_id} value={t.grupo_id}>
                    {t.label} - {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {acao === 'duplicar' && (
          <div className="mx-6 mt-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md space-y-3">
            <p className="text-xs font-medium text-green-700 dark:text-green-300">Criar novo cadastro em outra turma (original mantido)</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Professor(a)</label>
              <select
                value={professorId}
                onChange={(e) => {
                  setProfessorId(e.target.value);
                  setTurmaId('');
                  setNivel('');
                }}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm"
              >
                <option value="">Selecione</option>
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Turma + Horário</label>
              <select
                value={turmaId}
                onChange={(e) => {
                  setTurmaId(e.target.value);
                  const t = turmas.find((x) => x.grupo_id === e.target.value);
                  if (t) {
                    setNivel(t.nivel || '');
                    setProfessorId(t.professor_id || '');
                  }
                }}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm"
                disabled={!professorId}
              >
                <option value="">Selecione a turma</option>
                {turmasOrdenadas.map((t) => (
                  <option key={t.grupo_id} value={t.grupo_id}>
                    {t.label} - {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nome</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
               disabled={!camposEditaveis}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400"
            />
          </div>

          {acao !== 'transferencia' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Data de Nascimento</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="somente números"
                value={dataNascimento}
                onChange={(e) => {
                  setErroData(null);
                  setDataNascimento(mascaraData(sanitizarInput(e.target.value)));
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  setDataNascimento(mascaraData(sanitizarInput(e.clipboardData.getData('text'))));
                }}
                maxLength={10}
                disabled={!camposEditaveis}
                className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 ${
                  erroData ? 'border-red-500 animate-shake' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary-500'
                }`}
              />
              {idade !== null && <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{idade} anos</span>}
            </div>
          )}

          {acao !== 'transferencia' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Gênero</label>
                <select
                  value={genero}
                  onChange={(e) => setGenero(e.target.value)}
                  disabled={!camposEditaveis}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                >
                  <option value="">Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="nao-binario">Não binário</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contato</label>
                <input
                  value={contato}
                  onChange={(e) => {
                    setErroContato(null);
                    setContato(mascaraTelefone(sanitizarInput(e.target.value)));
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    setContato(mascaraTelefone(sanitizarInput(e.clipboardData.getData('text'))));
                  }}
                  placeholder="somente números"
                  maxLength={16}
                  disabled={!camposEditaveis}
                  className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 ${
                    erroContato ? 'border-red-500 animate-shake' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary-500'
                  }`}
                />
                {contato && desmascarar(contato).length >= 10 && (
                  <a
                    href={`https://wa.me/55${desmascarar(contato)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 mt-0.5 inline-block"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {isNew && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Professor(a)</label>
                <select
                  value={professorId}
                  onChange={(e) => {
                    setProfessorId(e.target.value);
                    setTurmaId('');
                    setNivel('');
                  }}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecione</option>
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Turma</label>
                <select
                  value={turmaId}
                  onChange={(e) => {
                    setTurmaId(e.target.value);
                    const t = turmas.find((x) => x.grupo_id === e.target.value);
                    if (t) {
                      setNivel(t.nivel || '');
                      setProfessorId(t.professor_id || '');
                    }
                  }}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecione uma turma</option>
                  {turmasOrdenadas.map((t) => (
                    <option key={t.grupo_id} value={t.grupo_id}>
                      {t.label} - {(t.horario || '').slice(0, 5)} ({t.nivel || 'sem nível'})
                    </option>
                  ))}
                </select>
              </div>

              {turmaId && (
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={duplicarCadastro}
                      onChange={(e) => setDuplicarCadastro(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600"
                    />
                    Já possui cadastro em outra turma
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={transferenciaExterna}
                      onChange={(e) => setTransferenciaExterna(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600"
                    />
                    Veio de outra unidade
                  </label>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nível</label>
            <p className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              {nivel || '-'}
            </p>
          </div>

          {acao !== 'transferencia' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Categoria</label>
              <input
                disabled
                value={categoria}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400"
              />
            </div>
          )}

          {acao !== 'transferencia' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">ParQ - Apto para atividade física?</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="parQ"
                      checked={parQ === 'sim'}
                      onChange={() => setParQ('sim')}
                      disabled={!camposEditaveis}
                      className="text-primary-600"
                    />{' '}
                    Sim
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="parQ"
                      checked={parQ === 'nao'}
                      onChange={() => setParQ('nao')}
                      disabled={!camposEditaveis}
                      className="text-primary-600"
                    />{' '}
                    Não
                  </label>
                </div>
              </div>

              <div className="mt-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={atestadoMedico}
                    onChange={(e) => setAtestadoMedico(e.target.checked)}
                    disabled={!camposEditaveis}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600"
                  />
                  <span className="font-medium text-gray-600 dark:text-gray-400">Possui Atestado Médico?</span>
                </label>
                {isEditMode && !isNew && acao === null && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Selecione Correção ou Transferência para editar o atestado
                  </p>
                )}
                {atestadoMedico && (
                  <div className="mt-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Data do Atestado</label>
                    <input
                      type="date"
                      value={dataAtestado}
                      onChange={(e) => setDataAtestado(e.target.value)}
                      disabled={!camposEditaveis}
                      className="mt-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 dark:disabled:bg-gray-800"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              ativo
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {isEditMode && (
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                {acao === 'transferencia'
                  ? 'Transferir'
                  : acao === 'correcao'
                  ? 'Corrigir'
                  : 'Salvar'}
              </button>
            </div>
          )}
        </form>

        {toast && (
          <div
            className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded shadow-lg dark:shadow-black/20 text-sm z-50 ${
              toast.tipo === 'erro' ? 'bg-red-600 dark:bg-red-700' : 'bg-green-600 dark:bg-green-700'
            }`}
          >
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 font-bold">
              &times;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlunoModal;
