import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download } from 'lucide-react';
import type {
  Aluno,
  Professor,
  TransferenciaNivelPendencia,
  Turma,
} from '../../types';
import SearchInput from '../SearchInput';
import { formatDateBR, normalizeSearch } from '../../utils/formatters';
import { csvBlob } from '../../utils/csv';
import { downloadBlob } from '../../utils/download';
import { getTenantNome, getTenantId } from '../../utils/tenant';
import {
  mesAnoDeData,
  projetarComposicoes,
  type MovimentoTransferencia,
} from '../../utils/transferenciasUtils';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const POR_PAGINA = 50;

interface ListagemPreviaProps {
  turmas: Turma[];
  professores: Professor[];
  alunosAtivos: Aluno[];
  movimentos: MovimentoTransferencia[];
  pendenciasNivel?: TransferenciaNivelPendencia[];
  dataEfetivaBase?: string | null;
}

interface LinhaListagem {
  aluno_id: string;
  nome: string;
  turma: string;
  turmaGrupoId: string;
  professor: string;
  horario: string;
  nivel: string;
  situacao: 'permanece' | 'entra';
}

type SortDir = 'asc' | 'desc';
interface SortRuleLocal {
  column: string;
  dir: SortDir;
}

const ListagemPrevia: React.FC<ListagemPreviaProps> = ({
  turmas,
  professores,
  alunosAtivos,
  movimentos,
  pendenciasNivel = [],
  dataEfetivaBase,
}) => {
  const tenantId = getTenantId();
  const [filtro, setFiltro] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [pagina, setPagina] = useState(1);
  const [sortRules, setSortRules] = useState<SortRuleLocal[]>([]);
  const [competencia, setCompetencia] = useState(
    () => mesAnoDeData(dataEfetivaBase || '') || { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() },
  );

  const professorMap = useMemo(
    () => new Map(professores.map((p) => [p.id, p.nome])),
    [professores],
  );

  /** Composição projetada (híbrida) de todas as turmas da unidade */
  const projecoes = useMemo(
    () => projetarComposicoes({ turmas, alunosAtivos, movimentos, pendenciasNivel }),
    [turmas, alunosAtivos, movimentos, pendenciasNivel],
  );

  /** Uma linha por aluno da composição projetada */
  const linhas = useMemo<LinhaListagem[]>(() => {
    const resultado: LinhaListagem[] = [];
    for (const proj of projecoes) {
      const grupoId = proj.turma.grupo_id || proj.turma.id;
      const entradas = new Set(proj.entradas.map((a) => a.id));
      for (const aluno of proj.alunos) {
        resultado.push({
          aluno_id: aluno.id,
          nome: aluno.nome,
          turma: proj.turma.label || '—',
          turmaGrupoId: grupoId,
          professor: professorMap.get(proj.turma.professor_id || '') || '—',
          horario: (proj.turma.horario || '').slice(0, 5),
          nivel: proj.nivelProjetado || '—',
          situacao: entradas.has(aluno.id) ? 'entra' : 'permanece',
        });
      }
    }
    return resultado;
  }, [projecoes, professorMap]);

  /** Valor de filtro de uma linha (padrão do Fis!) */
  const getFilterValue = (linha: LinhaListagem, col: string): string => {
    switch (col) {
      case 'professor': return linha.professor;
      case 'turma': return linha.turma;
      case 'horario': return linha.horario;
      case 'nivel': return linha.nivel;
      default: return '';
    }
  };

  const uniqueValues = useMemo(() => {
    const cols = ['professor', 'turma', 'horario', 'nivel'];
    const result: Record<string, string[]> = {};
    for (const col of cols) {
      const set = new Set<string>();
      for (const l of linhas) set.add(getFilterValue(l, col));
      result[col] = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    return result;
  }, [linhas]);

  const toggleSort = (column: string) => {
    setSortRules((prev) => {
      const idx = prev.findIndex((r) => r.column === column);
      if (idx === 0) {
        if (prev[0].dir === 'asc') return [{ column, dir: 'desc' }, ...prev.slice(1)];
        return prev.slice(1);
      }
      return [{ column, dir: 'asc' }, ...prev.filter((r) => r.column !== column)];
    });
  };

  const sortIcon = (column: string) => {
    const idx = sortRules.findIndex((r) => r.column === column);
    if (idx === -1) return null;
    const dir = sortRules[idx].dir;
    return (
      <span className="ml-1 text-xs text-primary-600 dark:text-primary-400">
        {dir === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const thSort = (column: string, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(column)}
      className="font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-left text-sm whitespace-nowrap"
    >
      {label}
      {sortIcon(column)}
    </button>
  );

  const processed = useMemo(() => {
    let data = [...linhas];

    if (filtro) {
      const q = normalizeSearch(filtro);
      data = data.filter((l) =>
        normalizeSearch(l.nome).includes(q) ||
        normalizeSearch(l.professor).includes(q) ||
        normalizeSearch(l.turma).includes(q) ||
        normalizeSearch(l.horario).includes(q) ||
        normalizeSearch(l.nivel).includes(q),
      );
    }

    for (const [col, val] of Object.entries(columnFilters)) {
      if (!val) continue;
      data = data.filter((l) => getFilterValue(l, col) === val);
    }

    const alunoRule = sortRules.find((r) => r.column === 'aluno');
    if (alunoRule) {
      data.sort((a, b) => {
        const cmp = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        return alunoRule.dir === 'asc' ? cmp : -cmp;
      });
    } else {
      data.sort(
        (a, b) =>
          a.turma.localeCompare(b.turma, 'pt-BR') ||
          a.horario.localeCompare(b.horario, 'pt-BR') ||
          a.nome.localeCompare(b.nome, 'pt-BR'),
      );
    }

    return data;
  }, [linhas, filtro, columnFilters, sortRules]);

  useEffect(() => {
    setPagina(1);
  }, [filtro, columnFilters]);

  // Marca o body para que a impressão mostre apenas a listagem (padrão do app)
  useEffect(() => {
    document.body.classList.add('print-lista');
    return () => document.body.classList.remove('print-lista');
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(processed.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasPagina = processed.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const temFiltro = !!filtro || Object.keys(columnFilters).length > 0;

  const descricaoFiltros = useMemo(() => {
    const partes: string[] = [];
    if (filtro) partes.push(`Nome: ${filtro}`);
    for (const [col, rotulo] of [
      ['professor', 'Professor'],
      ['turma', 'Turma'],
      ['horario', 'Horário'],
      ['nivel', 'Nível'],
    ] as const) {
      if (columnFilters[col]) partes.push(`${rotulo}: ${columnFilters[col]}`);
    }
    return partes.join(' · ');
  }, [filtro, columnFilters]);

  const cabecalho = ['Aluno', 'Turma', 'Horário', 'Nível'];

  const exportarCsv = () => {
    const dados = processed.map((l) => [l.nome, l.turma, l.horario, l.nivel]);
    const blob = csvBlob(cabecalho, dados);
    downloadBlob(blob, `fiz_listagem_previa_${competencia.ano}_${String(competencia.mes).padStart(2, '0')}.csv`);
  };

  const linhasContexto = [
    `Unidade: ${getTenantNome(tenantId) || '—'}`,
    `Competência: ${MESES[competencia.mes - 1]}/${competencia.ano}`,
    descricaoFiltros ? `Filtros: ${descricaoFiltros}` : '',
    `Emissão: ${formatDateBR(new Date().toISOString())} · ${processed.length} aluno(s)`,
  ].filter(Boolean);

  const thFiltro = (col: string, rotulo: string) => (
    <select
      value={columnFilters[col] || ''}
      onChange={(e) =>
        setColumnFilters((f) => {
          const next = { ...f };
          if (e.target.value) next[col] = e.target.value;
          else delete next[col];
          return next;
        })
      }
      className={`text-xs border rounded px-1 py-0.5 max-w-[130px] ${
        columnFilters[col]
          ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 text-primary-700 dark:text-primary-300'
          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
      }`}
    >
      <option value="">{rotulo}</option>
      {(uniqueValues[col] || []).map((v) => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  );

  const Tabela = ({ dados }: { dados: LinhaListagem[] }) => (
    <table className="text-sm border-collapse">
      <thead>
        <tr>
          <th className="text-left px-2 py-1 border border-gray-300">Aluno</th>
          <th className="text-left px-2 py-1 border border-gray-300">Turma</th>
          <th className="text-left px-2 py-1 border border-gray-300">Horário</th>
          <th className="text-left px-2 py-1 border border-gray-300">Nível</th>
        </tr>
      </thead>
      <tbody>
        {dados.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-2 py-3 border border-gray-300 text-gray-500">
              Nenhum aluno com os filtros atuais.
            </td>
          </tr>
        ) : (
          dados.map((l) => (
            <tr key={`${l.turmaGrupoId}-${l.aluno_id}`}>
              <td className="px-2 py-1 border border-gray-300">
                {l.nome}
                {l.situacao === 'entra' && (
                  <span className="ml-1 text-[10px] text-green-700 dark:text-green-400">(entra)</span>
                )}
              </td>
              <td className="px-2 py-1 border border-gray-300 whitespace-nowrap">{l.turma}</td>
              <td className="px-2 py-1 border border-gray-300 whitespace-nowrap">{l.horario}</td>
              <td className="px-2 py-1 border border-gray-300 whitespace-nowrap">{l.nivel}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mês</label>
            <select
              value={competencia.mes}
              onChange={(e) => setCompetencia((c) => ({ ...c, mes: parseInt(e.target.value, 10) }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ano</label>
            <input
              type="number"
              value={competencia.ano}
              onChange={(e) => setCompetencia((c) => ({ ...c, ano: parseInt(e.target.value, 10) || c.ano }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportarCsv}
            disabled={processed.length === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={processed.length === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={14} /> Imprimir / salvar PDF
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <SearchInput
          value={filtro}
          onChange={setFiltro}
          placeholder="Buscar por nome, professor, turma, horário ou nível..."
          className="flex-1 max-w-md"
        />
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {processed.length}
          {temFiltro ? ` de ${linhas.length} ` : ' '}aluno(s)
        </span>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <th className="text-left px-3 py-2 align-top">{thSort('aluno', 'Aluno')}</th>
              <th className="px-3 py-2 align-top">{thFiltro('turma', 'Turma')}</th>
              <th className="px-3 py-2 align-top">{thFiltro('horario', 'Horário')}</th>
              <th className="px-3 py-2 align-top">{thFiltro('nivel', 'Nível')}</th>
              <th className="px-3 py-2 align-top">{thFiltro('professor', 'Professor')}</th>
            </tr>
          </thead>
          <tbody>
            {linhasPagina.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhum aluno com os filtros atuais.
                </td>
              </tr>
            ) : (
              linhasPagina.map((l) => (
                <tr key={`${l.turmaGrupoId}-${l.aluno_id}`} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-100">
                    {l.nome}
                    {l.situacao === 'entra' && (
                      <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                        entra
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{l.turma}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{l.horario}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{l.nivel}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{l.professor}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Página {paginaAtual} de {totalPaginas}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAtual <= 1}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual >= totalPaginas}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {createPortal(
        <div className="hidden print:block print-alunos text-black bg-white">
          <h1 className="text-xl font-bold mb-1">Listagem prévia — Transferência de nível</h1>
          {linhasContexto.map((l, i) => (
            <p key={i} className="text-xs mb-0.5">{l}</p>
          ))}
          <div className="mt-3">
            <Tabela dados={processed} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default ListagemPrevia;
