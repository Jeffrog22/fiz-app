import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../utils/api';
import DataGrid from '../components/grid/DataGrid';
import GridFilters from '../components/grid/GridFilters';
import GridPagination from '../components/grid/GridPagination';
import CardAula from '../components/modals/CardAula';
import CardBO from '../components/modals/CardBO';
import SearchInput from '../components/SearchInput';
import type { Aluno, Turma, ChamadaLog } from '../types';

type PresencaStatus = 'presente' | 'falta' | 'justificado' | undefined;

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
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<string | null>(null);
  const [statusSave, setStatusSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [dataInicio, setDataInicio] = useState(() => gerarDias(0)[0]);
  const [dataFim, setDataFim] = useState(() => gerarDias(0)[4]);
  const [turmaId, setTurmaId] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');

  const [indiceAtual, setIndiceAtual] = useState(0);
  const totalIndices = 12;

  const [cardAulaAberto, setCardAulaAberto] = useState(false);
  const [cardBOAberto, setCardBOAberto] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filaSalvamento = useRef<any[]>([]);

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
      const res = await api.get('/chamadas/periodo?inicio=' + dataInicio + '&fim=' + dataFim);
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
  }, [dataInicio, dataFim]);

  useEffect(() => { carregarDados(); }, [carregarDados]);
  useEffect(() => { carregarLogs(); }, [carregarLogs]);

  const dias = gerarDias(0);

  // Fuzzy search: insens�vel a acentos, busca por partes do nome
  const alunosFiltrados = useMemo(() => {
    if (!buscaTexto.trim()) return alunos;
    const termo = buscaTexto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return alunos.filter((a) =>
      a.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .includes(termo)
    );
  }, [alunos, buscaTexto]);

  const temFiltroAtivo = buscaTexto.trim() !== '' || turmaId !== '';

  const limparFiltros = () => {
    setBuscaTexto('');
    setTurmaId('');
    setDataInicio(gerarDias(0)[0]);
    setDataFim(gerarDias(0)[4]);
  };

  const processarFila = useCallback(async () => {
    if (filaSalvamento.current.length === 0) return;
    setSalvando(true);
    setStatusSave('saving');
    const payload = [...filaSalvamento.current];
    filaSalvamento.current = [];
    try {
      const res = await api.post('/chamadas', payload);
      if (res.data.ok) {
        const agora = new Date().toLocaleTimeString('pt-BR');
        setUltimoSalvamento(agora);
        setStatusSave('saved');
      }
    } catch (err) {
      console.error('Erro no salvamento automatico', err);
      setStatusSave('error');
    } finally {
      setSalvando(false);
    }
  }, []);

  const agendarSalvamento = useCallback((payload: any[]) => {
    filaSalvamento.current.push(...payload);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(processarFila, 1500);
  }, [processarFila]);

  const handleTogglePresenca = useCallback(
    (alunoId: string, data: string, status: PresencaStatus) => {
      const payload = [{
        grupo_id: alunoId,
        data,
        indice_aula: indiceAtual,
        status: status || null,
        origem: 'manual',
      }];
      setLogs((prev) => {
        const next = { ...prev };
        if (!next[alunoId]) next[alunoId] = {};
        if (status) {
          next[alunoId][data] = {
            id: '', tenant_id: '', data, grupo_id: alunoId,
            indice_aula: indiceAtual, status, origem: 'manual',
            criado_em: new Date().toISOString(),
          };
        } else {
          delete next[alunoId][data];
        }
        return next;
      });
      agendarSalvamento(payload);
    },
    [indiceAtual, agendarSalvamento]
  );

  const handleUpdateAnotacao = useCallback(
    (alunoId: string, data: string, anotacao: string) => {
      const payload = [{
        grupo_id: alunoId, data, indice_aula: indiceAtual,
        motivo: anotacao || null, origem: 'manual',
      }];
      setLogs((prev) => {
        const next = { ...prev };
        if (!next[alunoId]) next[alunoId] = {};
        next[alunoId][data] = { ...next[alunoId][data], motivo: anotacao } as ChamadaLog;
        return next;
      });
      agendarSalvamento(payload);
    },
    [indiceAtual, agendarSalvamento]
  );

  const handleExtrapolar = useCallback(async () => {
    if (!dataInicio) return;
    try {
      const res = await api.post('/chamadas/extrapolar', {
        data: dataInicio, indice_aula: indiceAtual,
      });
      alert(res.data.message || 'Presenca extrapolada');
      carregarLogs();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao extrapolar');
    }
  }, [dataInicio, indiceAtual, carregarLogs]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (filaSalvamento.current.length > 0) processarFila();
    };
  }, [processarFila]);

  const statusTexto = () => {
    switch (statusSave) {
      case 'saving': return 'Salvando alteracoes...';
      case 'saved': return 'Todas as alteracoes foram salvas';
      case 'error': return 'Erro ao salvar. Tentando novamente...';
      default: return ultimoSalvamento ? 'Salvo as ' + ultimoSalvamento : '';
    }
  };

  const statusCor = () => {
    switch (statusSave) {
      case 'saving': return 'text-gray-500';
      case 'saved': return 'text-green-600';
      case 'error': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Chamadas</h1>
        <div className="flex items-center gap-2">
          {statusSave !== 'idle' && (
            <span className={'text-xs ' + statusCor()}>{statusTexto()}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SearchInput
          value={buscaTexto}
          onChange={setBuscaTexto}
          placeholder="Buscar aluno (live search)..."
          className="flex-1 max-w-xs"
        />
        <GridFilters
          dataInicio={dataInicio} dataFim={dataFim}
          turmaId={turmaId} turmas={turmas}
          onDataInicioChange={setDataInicio}
          onDataFimChange={setDataFim}
          onTurmaChange={setTurmaId}
        />
        {temFiltroAtivo && (
          <button
            onClick={limparFiltros}
            className="px-2 py-1.5 text-xs bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 transition"
            title="Remover todos os filtros"
          >
            ? Limpar filtros
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <GridPagination
          indiceAtual={indiceAtual}
          totalIndices={totalIndices}
          onAnterior={() => setIndiceAtual((i) => Math.max(0, i - 1))}
          onProximo={() => setIndiceAtual((i) => Math.min(totalIndices - 1, i + 1))}
        />

        <div className="flex gap-1 ml-auto">
          <button onClick={handleExtrapolar}
            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200 transition">
            Extrapolar presenca
          </button>
          <button onClick={() => setCardAulaAberto(true)}
            className="px-3 py-1.5 text-xs bg-cyan-50 text-cyan-700 rounded hover:bg-cyan-100 border border-cyan-200 transition">
            Card Aula
          </button>
          <button onClick={() => setCardBOAberto(true)}
            className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100 border border-orange-200 transition">
            Card BO
          </button>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : (
        <DataGrid
          alunos={alunosFiltrados} dias={dias} logs={logs}
          onTogglePresenca={handleTogglePresenca}
          onUpdateAnotacao={handleUpdateAnotacao}
        />
      )}

      <CardAula
        aberto={cardAulaAberto}
        onClose={() => setCardAulaAberto(false)}
        data={dataInicio} indiceAula={indiceAtual}
      />

      <CardBO
        aberto={cardBOAberto}
        onClose={() => setCardBOAberto(false)}
        data={dataInicio} indiceAula={indiceAtual}
        alunos={alunos}
      />
    </div>
  );
};

export default Chamadas;
