import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download } from 'lucide-react';
import api from '../../utils/api';
import { calcIdade, calcIdadeDoAno, calcCategoria, formatDateBR } from '../../utils/formatters';

interface ColunaOpcao {
  key: string;
  label: string;
}

export const COLUNAS_LISTA: ColunaOpcao[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'contato', label: 'Whatsapp' },
  { key: 'data_nascimento', label: 'Data Nasc.' },
  { key: 'idade', label: 'Idade' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'genero', label: 'Gênero' },
  { key: 'nivel', label: 'Nível' },
  { key: 'turma', label: 'Turma' },
  { key: 'horario', label: 'Horário' },
  { key: 'professor', label: 'Professor' },
];

interface ImpressaoListaModalProps {
  aberto: boolean;
  onClose: () => void;
  alunos: any[];
  professorMap: Map<string, string>;
  unidade: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ImpressaoListaModal: React.FC<ImpressaoListaModalProps> = ({
  aberto,
  onClose,
  alunos,
  professorMap,
  unidade,
}) => {
  const [colunasSel, setColunasSel] = useState<string[]>(['nome']);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      setColunasSel(['nome']);
      setErro(null);
      setBaixando(false);
    }
    document.body.classList.toggle('print-lista', aberto);
    return () => { document.body.classList.remove('print-lista'); };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onClose]);

  const colunas = COLUNAS_LISTA.filter((c) => colunasSel.includes(c.key));

  const valor = (a: any, key: string): string => {
    switch (key) {
      case 'nome': return a.nome || '';
      case 'contato': return a.contato || '-';
      case 'data_nascimento': return a.data_nascimento ? formatDateBR(a.data_nascimento) : '-';
      case 'idade': { const i = calcIdade(a.data_nascimento); return i !== null ? String(i) : '-'; }
      case 'categoria': return calcCategoria(calcIdadeDoAno(a.data_nascimento)) || '-';
      case 'genero': return a.genero ? a.genero.charAt(0).toUpperCase() + a.genero.slice(1).replace('-', ' ') : '-';
      case 'nivel': return a.turma?.nivel || a.nivel || '-';
      case 'turma': return a.turma?.label || '-';
      case 'horario': return (a.turma?.horario || '-').substring(0, 5);
      case 'professor': return professorMap.get(a.turma?.professor_id) || '-';
      default: return '';
    }
  };

  const turmas = Array.from(new Set(alunos.map((a) => a.turma?.label).filter(Boolean))) as string[];
  const professores = Array.from(new Set(alunos.map((a) => professorMap.get(a.turma?.professor_id)).filter(Boolean))) as string[];
  const horarios = Array.from(new Set(alunos.map((a) => (a.turma?.horario || '').substring(0, 5)).filter((h) => h && h !== '-')));

  const linhasContexto = [
    unidade ? `Unidade: ${unidade}` : '',
    turmas.length === 1 ? `Turma: ${turmas[0]}` : '',
    professores.length === 1 ? `Professor: ${professores[0]}` : '',
    horarios.length === 1 ? `Horário: ${horarios[0]}` : '',
    `Emissão: ${formatDateBR(new Date().toISOString())} · ${alunos.length} aluno${alunos.length !== 1 ? 's' : ''}`,
  ].filter(Boolean);

  const toggleColuna = (key: string) => setColunasSel((prev) => {
    if (prev.includes(key)) {
      if (prev.length <= 1) return prev;
      return prev.filter((k) => k !== key);
    }
    const ordem = COLUNAS_LISTA.map((c) => c.key);
    return [...prev, key].sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
  });

  const baixarXLSX = async () => {
    if (baixando || alunos.length === 0) return;
    setBaixando(true);
    setErro(null);
    try {
      const payload = {
        titulo: 'Lista de Alunos',
        subtitulo: linhasContexto,
        colunas,
        linhas: alunos.map((a) => {
          const linha: Record<string, string> = {};
          for (const c of colunas) linha[c.key] = valor(a, c.key);
          return linha;
        }),
      };
      const res = await api.post('/exportar/lista-alunos', payload, { responseType: 'blob' });
      const hoje = new Date();
      const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
      downloadBlob(res.data as Blob, `fiz_lista_alunos_${data}.xlsx`);
    } catch (e) {
      console.error('Erro ao gerar XLSX da lista:', e);
      setErro('Não foi possível gerar o XLSX. Tente novamente.');
    } finally {
      setBaixando(false);
    }
  };

  const Tabela = () => (
    <table className="text-sm border-collapse">
      <thead>
        <tr>
          {colunas.map((c) => (
            <th key={c.key} className="border border-gray-300 px-2 py-1 text-left whitespace-nowrap">{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {alunos.map((a) => (
          <tr key={a.id}>
            {colunas.map((c) => (
              <td key={c.key} className="border border-gray-300 px-2 py-1">{valor(a, c.key)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!aberto) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/60 flex items-center justify-center z-40 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Printer size={18} /> Lista de impressão
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {alunos.length} aluno{alunos.length !== 1 ? 's' : ''}
          </p>

          <fieldset className="mb-3">
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Colunas da lista</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {COLUNAS_LISTA.map((c) => (
                <label key={c.key} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={colunasSel.includes(c.key)}
                    onChange={() => toggleColuna(c.key)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 dark:text-primary-400"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto max-h-72 overflow-y-auto mb-4">
            {alunos.length === 0 ? (
              <p className="p-4 text-sm text-center text-gray-400 dark:text-gray-500">Nenhum aluno com os filtros atuais.</p>
            ) : (
              <Tabela />
            )}
          </div>

          {erro && <p className="text-sm text-red-500 dark:text-red-400 mb-2">{erro}</p>}

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={alunos.length === 0}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Printer size={15} /> Imprimir / Salvar PDF
            </button>
            <button
              type="button"
              onClick={baixarXLSX}
              disabled={alunos.length === 0 || baixando}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Download size={15} /> {baixando ? 'Gerando...' : 'Baixar XLSX'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {createPortal(
        <div className="hidden print:block print-alunos text-black bg-white">
          <h1 className="text-xl font-bold mb-1">Lista de Alunos</h1>
          {linhasContexto.map((l, i) => (
            <p key={i} className="text-xs mb-0.5">{l}</p>
          ))}
          <div className="mt-3">
            {alunos.length === 0 ? <p className="text-sm">Nenhum aluno com os filtros atuais.</p> : <Tabela />}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ImpressaoListaModal;
