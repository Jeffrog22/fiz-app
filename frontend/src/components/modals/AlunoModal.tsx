import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import type { Aluno, Turma } from '../../types';
import { mascaraTelefone, mascaraData, desmascarar, formatDateISO, formatDateBR } from '../../utils/formatters';
import { validarData, validarTelefone, sanitizarInput } from '../../utils/validators';

interface AlunoModalProps {
  open: boolean;
  aluno?: Aluno | null;
  onSave: (data: Partial<Aluno>) => void;
  onClose: () => void;
}

function parseData(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const [dia, mes, ano] = dateStr.split('/').map(Number);
    return new Date(ano, mes - 1, dia);
  }
  const d = new Date(dateStr + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function calcularIdade(dataNascimento?: string): number | null {
  if (!dataNascimento) return null;
  const nasc = parseData(dataNascimento);
  if (!nasc) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mes = hoje.getMonth() - nasc.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function normalizarGenero(valor: string): string {
  const v = valor.toLowerCase().trim().replace(/[^a-zà-ÿ]/g, '');
  if (v.includes('nao') || v.includes('não')) return 'nao-binario';
  if (v.startsWith('masculin') || v === 'm') return 'masculino';
  if (v.startsWith('feminin') || v === 'f') return 'feminino';
  return v;
}

function calcularCategoria(idade: number | null): string {
  if (idade === null) return '';
  if (idade < 2) return 'Bebe';
  if (idade <= 3) return 'Infantil A';
  if (idade <= 5) return 'Infantil B';
  if (idade <= 7) return 'Infantil C';
  if (idade <= 9) return 'Infantil D';
  if (idade <= 11) return 'Juvenil A';
  if (idade <= 13) return 'Juvenil B';
  if (idade <= 15) return 'Juvenil C';
  if (idade <= 17) return 'Juvenil D';
  if (idade <= 29) return 'Adulto';
  if (idade <= 49) return 'Master';
  return 'Master+';
}

const AlunoModal: React.FC<AlunoModalProps> = ({ open, aluno, onSave, onClose }) => {
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
  const [toast, setToast] = useState<{ msg: string } | null>(null);

  const idade = calcularIdade(dataNascimento);
  const categoria = calcularCategoria(idade);

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
      setContato(aluno.contato || '');
      setAtivo(aluno.ativo);
      setParQ(aluno.par_q === true ? 'sim' : aluno.par_q === false ? 'nao' : '');
      setAtestadoMedico(aluno.atestado_medico === true);
      setDataAtestado(aluno.data_atestado ? formatDateBR(aluno.data_atestado) : '');
      setTurmaId(aluno.turma_id || '');
      setNivel(aluno.nivel || '');
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
    setErroData(null);
    setErroContato(null);
    setToast(null);
  }, [aluno, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const erroDataMsg = dataNascimento ? validarData(dataNascimento) : null;
    const erroContatoMsg = contato ? validarTelefone(contato) : null;

    if (erroDataMsg || erroContatoMsg) {
      setErroData(erroDataMsg);
      setErroContato(erroContatoMsg);
      setToast({ msg: erroDataMsg || erroContatoMsg || 'Verifique os campos' });
      return;
    }

    onSave({
      nome,
      data_nascimento: dataNascimento ? formatDateISO(dataNascimento) : undefined,
      genero: normalizarGenero(genero || '') || undefined,
      contato: contato ? desmascarar(contato) : undefined,
      ativo,
      par_q: parQ === 'sim' ? true : parQ === 'nao' ? false : undefined,
      atestado_medico: atestadoMedico || undefined,
      data_atestado: dataAtestado ? formatDateISO(dataAtestado) : undefined,
      turma_id: turmaId || undefined,
      nivel: nivel || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {aluno ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Nome</label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Data de Nascimento</label>
            <input type="text" inputMode="numeric" placeholder="somente números"
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
              className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 ${erroData ? 'border-red-500 animate-shake' : 'border-gray-300 focus:ring-primary-500'}`} />
            {idade !== null && <span className="text-xs text-gray-400 mt-0.5">{idade} anos</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Genero</label>
              <select value={genero} onChange={(e) => setGenero(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="nao-binario">Nao binario</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Contato</label>
              <input value={contato}
                onChange={(e) => {
                  setErroContato(null);
                  setContato(mascaraTelefone(sanitizarInput(e.target.value)));
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  setContato(mascaraTelefone(sanitizarInput(e.clipboardData.getData('text'))));
                }}
                placeholder="somente números" maxLength={16}
                className={`px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 ${erroContato ? 'border-red-500 animate-shake' : 'border-gray-300 focus:ring-primary-500'}`} />
              {contato && desmascarar(contato).length >= 10 && (
                <a href={`https://wa.me/55${desmascarar(contato)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:text-green-800 mt-0.5 inline-block">
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Turma</label>
            <select value={turmaId} onChange={(e) => {
              setTurmaId(e.target.value);
              const t = turmas.find((x) => x.id === e.target.value);
              if (t) setNivel(t.nivel || '');
            }}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Selecione uma turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} - {t.horario} ({t.nivel || 'sem nivel'})
                </option>
              ))}
            </select>
            {turmaSelecionada && (
              <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                <div>Horario: {turmaSelecionada.horario}</div>
                <div>Professor ID: {turmaSelecionada.professor_id || '-'}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Nível</label>
            <p className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-700">
              {nivel || '-'}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Categoria</label>
            <input disabled value={categoria}
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500" />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div>
              <label className="text-sm font-medium text-gray-600">ParQ - Apto para atividade fisica?</label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="parQ" checked={parQ === 'sim'}
                    onChange={() => setParQ('sim')} className="text-primary-600" /> Sim
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="parQ" checked={parQ === 'nao'}
                    onChange={() => setParQ('nao')} className="text-primary-600" /> Nao
                </label>
              </div>
            </div>

            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={atestadoMedico}
                  onChange={(e) => setAtestadoMedico(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600" />
                <span className="font-medium text-gray-600">Possui Atestado Medico?</span>
              </label>
              {atestadoMedico && (
                <div className="mt-2">
                  <label className="text-sm font-medium text-gray-600">Data do Atestado</label>
                  <input type="date" value={dataAtestado}
                    onChange={(e) => setDataAtestado(e.target.value)}
                    className="mt-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="ativo-modal" checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="rounded border-gray-300 text-primary-600" />
            <label htmlFor="ativo-modal" className="text-sm text-gray-600">Ativo</label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
              Salvar
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

export default AlunoModal;
