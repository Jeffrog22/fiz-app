import React from 'react';
import SearchInput from '../SearchInput';
import BarraProgressoRelatorio from './BarraProgressoRelatorio';
import CardIndicadorRelatorio from './CardIndicadorRelatorio';
import type { FrequenciaData, AlunoFrequenciaGrid } from '../../types';

interface Props {
  data: FrequenciaData | null;
  carregando: boolean;
  onVerHistorico: (alunoId: string) => void;
  alunoSelecionado: string | null;
  onVoltar: () => void;
  alunosFiltrados: AlunoFrequenciaGrid[];
  busca: string;
  onBuscaChange: (v: string) => void;
  filtroStatus: string;
  onFiltroStatusChange: (v: string) => void;
}

const HistoricoAluno: React.FC<Props> = ({
  data,
  carregando,
  onVerHistorico,
  alunoSelecionado,
  onVoltar,
  alunosFiltrados,
  busca,
  onBuscaChange,
  filtroStatus,
  onFiltroStatusChange,
}) => {
  if (alunoSelecionado) {
    return renderAlunoDetalhe(data, carregando, onVoltar);
  }

  return renderLista(data, carregando, alunosFiltrados, busca, onBuscaChange, filtroStatus, onFiltroStatusChange, onVerHistorico);
};

function renderAlunoDetalhe(
  data: FrequenciaData | null,
  carregando: boolean,
  onVoltar: () => void,
) {
  const resumo = data?.resumo;
  const retencao = data?.retencao;
  const periods = data?.enrollmentPeriods;
  const total = resumo?.totalRegistros || 0;
  const presentes = resumo?.presentes || 0;
  const faltas = resumo?.faltas || 0;
  const justificados = resumo?.justificados || 0;
  const assiduidade = total > 0 ? (presentes / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <button
        onClick={onVoltar}
        className="text-xs text-gray-500 hover:text-gray-700 mb-2"
      >
        ← Voltar à lista
      </button>

      {carregando ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CardIndicadorRelatorio titulo="Total de Aulas" valor={total} corValor="text-blue-600" />
            <CardIndicadorRelatorio titulo="Presenças" valor={presentes} corValor="text-green-600" />
            <CardIndicadorRelatorio titulo="Faltas" valor={faltas} corValor="text-red-600" />
            <CardIndicadorRelatorio titulo="Justificativas" valor={justificados} corValor="text-yellow-600" />
          </div>

          <CardIndicadorRelatorio titulo="Taxa de Assiduidade">
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {total > 0 ? `${assiduidade.toFixed(1)}%` : 'N/A'}
            </p>
            {total > 0 && (
              <div className="mt-2">
                <BarraProgressoRelatorio valor={presentes} max={total} cor="bg-blue-500" />
              </div>
            )}
          </CardIndicadorRelatorio>

          {retencao && (
            <CardIndicadorRelatorio titulo="Índice de Retenção Total do Aluno">
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1">
                  <BarraProgressoRelatorio valor={retencao.totalDias} max={retencao.diasDesdeInicio} cor="bg-blue-500" />
                </div>
                <span className="text-lg font-bold text-blue-600">{retencao.percentual}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {retencao.totalDias} dias de permanência em {retencao.diasDesdeInicio} dias desde a primeira matrícula
              </p>
            </CardIndicadorRelatorio>
          )}

          {periods && periods.length > 0 && (
            <CardIndicadorRelatorio titulo="Linha do Tempo de Permanência">
              <div className="space-y-3 mt-2">
                {periods.map((p, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary-500 flex-shrink-0" />
                      {i < periods.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-300 min-h-[24px]" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-sm font-medium text-gray-800">{p.turma_label || p.nivel}</p>
                      <p className="text-xs text-gray-500">
                        De {new Date(p.data_inicio).toLocaleDateString('pt-BR')}
                        {p.data_fim ? ` até ${new Date(p.data_fim).toLocaleDateString('pt-BR')}` : ' até o momento'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Presenças: {p.presentes}/{p.total} ({p.total > 0 ? ((p.presentes / p.total) * 100).toFixed(1) : 0}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardIndicadorRelatorio>
          )}
        </>
      )}
    </div>
  );
}

function renderLista(
  data: FrequenciaData | null,
  carregando: boolean,
  alunosFiltrados: AlunoFrequenciaGrid[],
  busca: string,
  onBuscaChange: (v: string) => void,
  filtroStatus: string,
  onFiltroStatusChange: (v: string) => void,
  onVerHistorico: (alunoId: string) => void,
) {
  const resumo = data?.alunosResumo;

  return (
    <div className="space-y-4">
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <CardIndicadorRelatorio titulo="Total Alunos" valor={resumo.total} corValor="text-gray-800" />
          <CardIndicadorRelatorio titulo="Ativos" valor={resumo.ativos} corValor="text-green-600" />
          <CardIndicadorRelatorio titulo="Inativos" valor={resumo.inativos} corValor="text-red-600" />
          <CardIndicadorRelatorio titulo="Retenção Média" valor={`${resumo.retencaoMedia.toFixed(0)}%`} corValor="text-blue-600" />
          <CardIndicadorRelatorio titulo="Frequência Média" valor={`${resumo.frequenciaMedia.toFixed(0)}%`} corValor="text-green-600" />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <SearchInput
            value={busca}
            onChange={onBuscaChange}
            placeholder="Buscar aluno por nome..."
            className="flex-1 min-w-[200px]"
          />
          <select
            value={filtroStatus}
            onChange={(e) => onFiltroStatusChange(e.target.value)}
            className="text-sm px-2 py-1.5 border border-gray-300 rounded"
          >
            <option value="todos">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>
        </div>

        {carregando ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : data?.alunosGrid ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3 text-center">Presenças</th>
                    <th className="py-2 pr-3 text-center">Justificativas</th>
                    <th className="py-2 pr-3 text-center">Faltas</th>
                    <th className="py-2 pr-3 text-center">Total</th>
                    <th className="py-2 pr-3 text-center">Taxa</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {alunosFiltrados.map((aluno) => {
                    const taxaNum = aluno.taxa;
                    return (
                      <tr key={aluno.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-3 font-medium text-gray-800">
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${aluno.ativo ? 'bg-green-400' : 'bg-red-400'}`} />
                            {aluno.nome}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-center text-green-600">{aluno.presencas}</td>
                        <td className="py-2 pr-3 text-center text-yellow-600">{aluno.justificativas}</td>
                        <td className="py-2 pr-3 text-center text-red-600">{aluno.faltas}</td>
                        <td className="py-2 pr-3 text-center text-gray-600">{aluno.total}</td>
                        <td className="py-2 pr-3 text-center">
                          <span className={`font-medium ${
                            taxaNum >= 75 ? 'text-green-600' : taxaNum >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {aluno.total > 0 ? `${taxaNum.toFixed(1)}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => onVerHistorico(aluno.id)}
                            className="text-xs text-primary-600 hover:underline"
                          >
                            Histórico
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {alunosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-400">
                        {busca ? 'Nenhum aluno encontrado com essa busca.' : 'Nenhum aluno disponível.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-right">
              {alunosFiltrados.length} de {data.alunosGrid.length} alunos
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Selecione um mês/ano para carregar os dados.</p>
        )}

        {!busca && (
          <p className="text-sm text-gray-400 text-center py-4">
            Use a busca acima para encontrar alunos e ver o histórico de presenças.
          </p>
        )}
      </div>
    </div>
  );
}

export default HistoricoAluno;
