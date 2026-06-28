import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import DataGrid from '../components/grid/DataGrid';
import GridFilters from '../components/grid/GridFilters';
import GridPagination from '../components/grid/GridPagination';
import type { Aluno, Turma, ChamadaLog } from '../types';

function gerarDias(semanaOffset: number = 0): string[] {
  const dias: string[] = [];
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() + semanaOffset * 7 - hoje.getDay() + 1);
  for (let i = 0; i < 5; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    dias.push(d.toISOString().split('T')[0]);
  }
  return dias;
}

const Chamadas: React.FC = () => {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [logs, setLogs] = useState<Record<string, Record<string, ChamadaLog>>>({});
  const [carregando, setCarregando] = useState(true);

  const [dataInicio, setDataInicio] = useState(() => gerarDias(0)[0]);
  const [dataFim, setDataFim] = useState(() => gerarDias(0)[4]);
  const [turmaId, setTurmaId] = useState('');

  const [indiceAtual, setIndiceAtual] = useState(0);
  const totalIndices = 12;

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [resAlunos, resTurmas] = await Promise.all([
        api.get('/alunos'),
        api.get('/turmas'),
      ]);
      setAlunos(resAlunos.data);
      setTurmas(resTurmas.data);
    } catch (err) {
      console.error('Erro ao carregar dados', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarLogs = useCallback(async () => {
    try {
      const res = await api.get(`/chamadas/${dataInicio}`);
      const raw: ChamadaLog[] = res.data;
      const indexed: Record<string, Record<string, ChamadaLog>> = {};
      for (const log of raw) {
        const alunoId = log.grupo_id || 'unknown';
        if (!indexed[alunoId]) indexed[alunoId] = {};
        indexed[alunoId][log.data] = log;
      }
      setLogs(indexed);
    } catch (err) {
      console.error('Erro ao carregar chamadas', err);
    }
  }, [dataInicio]);

  useEffect(() => { carregarDados(); }, [carregarDados]);
  useEffect(() => { carregarLogs(); }, [carregarLogs]);

  const dias = gerarDias(0);

  const alunosFiltrados = turmaId
    ? alunos.filter((a) => true)
    : alunos;

  const handleTogglePresenca = useCallback(
    async (alunoId: string, data: string, status: ChamadaLog['status']) => {
      const payload = [{
        grupo_id: alunoId,
        data,
        indice_aula: indiceAtual,
        status: status || null,
      }];
      try {
        const res = await api.post('/chamadas', payload);
        if (res.data.ok) {
          setLogs((prev) => {
            const next = { ...prev };
            if (!next[alunoId]) next[alunoId] = {};
            if (status) {
              next[alunoId][data] = {
                id: '',
                tenant_id: '',
                data,
                grupo_id: alunoId,
                indice_aula: indiceAtual,
                status,
                criado_em: new Date().toISOString(),
              };
            } else {
              delete next[alunoId][data];
            }
            return next;
          });
        }
      } catch (err) {
        console.error('Erro ao salvar presença', err);
      }
    },
    [indiceAtual]
  );

  const handleUpdateAnotacao = useCallback(
    async (alunoId: string, data: string, anotacao: string) => {
      const payload = [{
        grupo_id: alunoId,
        data,
        indice_aula: indiceAtual,
        motivo: anotacao || null,
      }];
      try {
        await api.post('/chamadas', payload);
        setLogs((prev) => {
          const next = { ...prev };
          if (!next[alunoId]) next[alunoId] = {};
          next[alunoId][data] = {
            ...next[alunoId][data],
            motivo: anotacao,
          } as ChamadaLog;
          return next;
        });
      } catch (err) {
        console.error('Erro ao salvar anotação', err);
      }
    },
    [indiceAtual]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Chamadas</h1>

      <GridFilters
        dataInicio={dataInicio}
        dataFim={dataFim}
        turmaId={turmaId}
        turmas={turmas}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onTurmaChange={setTurmaId}
      />

      <GridPagination
        indiceAtual={indiceAtual}
        totalIndices={totalIndices}
        onAnterior={() => setIndiceAtual((i) => Math.max(0, i - 1))}
        onProximo={() => setIndiceAtual((i) => Math.min(totalIndices - 1, i + 1))}
      />

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <DataGrid
          alunos={alunosFiltrados}
          dias={dias}
          logs={logs}
          onTogglePresenca={handleTogglePresenca}
          onUpdateAnotacao={handleUpdateAnotacao}
        />
      )}
    </div>
  );
};

export default Chamadas;
