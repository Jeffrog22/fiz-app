import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import type { Aluno, Turma, SavePayload } from '../../types';
import { mascaraTelefone, mascaraData, desmascarar, formatDateISO, formatDateBR } from '../../utils/formatters';
import { calcIdade, calcCategoria } from '../../utils/formatters';
import { validarData, validarTelefone, sanitizarInput } from '../../utils/validators';

interface AlunoModalProps {
  open: boolean;
  aluno?: Aluno | null;
  onSave: (payload: SavePayload) => void;
  onClose: () => void;
}

function normalizarGenero(valor: string): string {
  const v = valor.toLowerCase().trim().replace(/[^a-zà-ÿ]/g, '');
  if (v.includes('nao') || v.includes('não')) return 'nao-binario';
  if (v.startsWith('masculin') || v === 'm') return 'masculino';
  if (v.startsWith('feminin') || v === 'f') return 'feminino';
  return v;
}

const AlunoModal: React.FC<AlunoModalProps> = ({ open, aluno, onSave, onClose }) => {
  const [editMode, setEditMode] = useState(false);
  const [acao, setAcao] = useState<'correcao' | 'transferencia' | null>(null);

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
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [erroData, setErroData] = useState<string | null>(null);
  const [erroContato, setErroContato] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo?: 'sucesso' | 'erro' } | null>(null);

  const isNew = !aluno;
  const idade = calcIdade(dataNascimento);
  const categoria = calcCategoria(idade);
  const turmaSelecionada = turmas.find((t) => t.id === turmaId);

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
      setDataAtestado(aluno.data_atestado ? formatDateBR(aluno.data_atestado) : '');
      setTurmaId(aluno.turma_id || '');
      setNivel(aluno.nivel || (aluno as any).turma?.nivel || '');
    } else {
      setNome('');
      setDataNascimento('');
      setGenero('');
      setContato('');
      setAtivo(true);
      setParQ('');
      setAtestadoMedico(false);
      setDataAtestado('');
      setTurmaId('');
      setNivel('');
    }
    setEditMode(false);
    setAcao(null);
    setErroData(null);
    setErroContato(null);
    setToast(null);
  }, [aluno, open]);

  if (!open) return null;

  const isEditMode = isNew || editMode;

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
      atestado_medico: atestadoMedico || undefined,
      data_atestado: dataAtestado ? formatDateISO(dataAtestado) : undefined,
    };

    if (acao === 'transferencia') {
      payload.turma_id = turmaId || undefined;
      payload.nivel = nivel || undefined;
    } else if (acao === 'correcao') {
    } else if (isNew) {
      payload.turma_id = turmaId || undefined;
      payload.nivel = nivel || undefined;
    }

    onSave({ data: payload, acao: acao || undefined });
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {isNew ? 'Novo Aluno' : isEditMode ? `Editando: ${aluno!.nome}` : aluno!.nome}
          </h2>
          {!isNew && !isEditMode && (
            <button
              type="button"
              onClick={handleEditClick}
              className="px-3 py-1 text-xs font-medium border border-primary-300 text-primary-700 rounded-md hover:bg-primary-50 transition-colors"
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
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Correção
            </button>
            <button
              type="button"
              onClick={() => setAcao(acao === 'transferencia' ? null : 'transferencia')}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                acao === 'transferencia'
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Transferência
            </button>
          </div>
        )}

        {acao === 'transferencia' && (
          <div className="mx-6 mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
            <p className="text-xs font-medium text-purple-700 mb-2">
              Transferir aluno para outra turma
            </p>
            <select
              value={turmaId}
              onChange={(e) => {
                setTurmaId(e.target.value);
                const t = turmas.find((x) => x.id === e.target.value);
                if (t) setNivel(t.nivel || '');
              }}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione a nova turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} - {t.horario} ({t.nivel || 'sem nível'})
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Nome</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={!isEditMode}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Data de Nascimento</label>
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
              disabled={!isEditMode}
              className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
                erroData ? 'border-red-500 animate-shake' : 'border-gray-300 focus:ring-primary-500'
              }`}
            />
            {idade !== null && <span className="text-xs text-gray-400 mt-0.5">{idade} anos</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Gênero</label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                disabled={!isEditMode}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="nao-binario">Não binário</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Contato</label>
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
                disabled={!isEditMode}
                className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
                  erroContato ? 'border-red-500 animate-shake' : 'border-gray-300 focus:ring-primary-500'
                }`}
              />
              {contato && desmascarar(contato).length >= 10 && (
                <a
                  href={`https://wa.me/55${desmascarar(contato)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:text-green-800 mt-0.5 inline-block"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {isNew && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Turma</label>
              <select
                value={turmaId}
                onChange={(e) => {
                  setTurmaId(e.target.value);
                  const t = turmas.find((x) => x.id === e.target.value);
                  if (t) setNivel(t.nivel || '');
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Selecione uma turma</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} - {t.horario} ({t.nivel || 'sem nível'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Nível</label>
            <p className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-700">
              {nivel || '-'}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Categoria</label>
            <input
              disabled
              value={categoria}
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div>
              <label className="text-sm font-medium text-gray-600">ParQ - Apto para atividade física?</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="parQ"
                    checked={parQ === 'sim'}
                    onChange={() => setParQ('sim')}
                    disabled={!isEditMode}
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
                    disabled={!isEditMode}
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
                  disabled={!isEditMode}
                  className="rounded border-gray-300 text-primary-600"
                />
                <span className="font-medium text-gray-600">Possui Atestado Médico?</span>
              </label>
              {atestadoMedico && (
                <div className="mt-2">
                  <label className="text-sm font-medium text-gray-600">Data do Atestado</label>
                  <input
                    type="date"
                    value={dataAtestado}
                    onChange={(e) => setDataAtestado(e.target.value)}
                    disabled={!isEditMode}
                    className="mt-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="ativo-modal"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              disabled={!isEditMode}
              className="rounded border-gray-300 text-primary-600"
            />
            <label htmlFor="ativo-modal" className="text-sm text-gray-600">
              Ativo
            </label>
          </div>

          {isEditMode && (
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
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
            className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded shadow-lg text-sm z-50 ${
              toast.tipo === 'erro' ? 'bg-red-600' : 'bg-green-600'
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
