import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { filtrarNotas, type FiltroBloco } from '../utils/blocoDeNotasUtils';
import type { BlocoDeNotas, ItemNota, TipoNota, CorNota } from '../types';

const CORES: CorNota[] = ['amarelo', 'azul', 'verde', 'rosa', 'lilas'];

const COR_CLASSES: Record<CorNota, string> = {
  amarelo: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
  azul: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
  verde: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
  rosa: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100',
  lilas: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100',
};

const FILTROS: { value: FiltroBloco; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'textos', label: 'Textos' },
  { value: 'listas', label: 'Listas' },
];

const TIPOS: TipoNota[] = ['texto', 'lista'];

type NotaParaCriar = Omit<
  BlocoDeNotas,
  'id' | 'tenant_id' | 'professor_id' | 'criado_em' | 'atualizado_em' | 'fixada'
> & { itens?: ItemNota[] };

const BlocoDeNotas: React.FC = () => {
  const [notas, setNotas] = useState<BlocoDeNotas[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [abrirModal, setAbrirModal] = useState(false);
  const [notaEditando, setNotaEditando] = useState<BlocoDeNotas | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroBloco>('todas');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'sucesso' | 'erro' } | null>(null);

  // --- estado do modal (declarado antes dos returns para nao haver TDZ) ---
  const [tipoNota, setTipoNota] = useState<TipoNota>('texto');
  const [corNota, setCorNota] = useState<CorNota>('amarelo');
  const [itens, setItens] = useState<ItemNota[]>([]);

  useEffect(() => {
    carregarNotas();
  }, []);

  const carregarNotas = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await api.get('/bloco-de-notas');
      setNotas(res.data || []);
    } catch {
      setErro('Falha ao carregar notas');
      setNotas([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  const salvarErro = useCallback((texto: string) => {
    setMensagem({ texto, tipo: 'erro' });
    setTimeout(() => setMensagem(null), 5000);
  }, []);

  const salvarSucesso = useCallback((texto: string) => {
    setMensagem({ texto, tipo: 'sucesso' });
    setTimeout(() => setMensagem(null), 3000);
  }, []);

  const handleCriar = useCallback(async (payload: NotaParaCriar) => {
    setSalvando(true);
    setMensagem(null);
    try {
      const res = await api.post('/bloco-de-notas', {
        titulo: payload.titulo,
        conteudo: payload.conteudo,
        tipo: payload.tipo,
        itens: payload.itens ?? [],
        cor: payload.cor,
      });
      setNotas((prev) => [res.data, ...prev]);
      setAbrirModal(false);
      setNotaEditando(null);
      salvarSucesso('Nota criada');
    } catch {
      salvarErro('Falha ao salvar nota. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }, [salvarErro, salvarSucesso]);

  const handleAtualizar = useCallback(async (payload: {
    titulo: string;
    conteudo: string;
    tipo: TipoNota;
    itens: ItemNota[];
    cor: CorNota;
    fixada?: boolean;
  }) => {
    if (!notaEditando) return;
    setSalvando(true);
    setMensagem(null);
    try {
      const res = await api.put(`/bloco-de-notas/${notaEditando.id}`, {
        titulo: payload.titulo,
        conteudo: payload.conteudo,
        tipo: payload.tipo,
        itens: payload.itens,
        cor: payload.cor,
        fixada: payload.fixada ?? notaEditando.fixada,
      });
      setNotas((prev) => prev.map((n) => (n.id === res.data.id ? res.data : n)));
      setAbrirModal(false);
      setNotaEditando(null);
      salvarSucesso('Nota atualizada');
    } catch {
      salvarErro('Falha ao salvar nota. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }, [notaEditando, salvarErro, salvarSucesso]);

  const handleFixar = useCallback(async (id: string, fixada: boolean) => {
    try {
      const res = await api.patch(`/bloco-de-notas/${id}/fixar`, { fixada });
      setNotas((prev) => prev.map((n) => (n.id === res.data.id ? res.data : n)));
    } catch {
      salvarErro('Falha ao fixar nota. Tente novamente.');
    }
  }, [salvarErro]);

  const handleRemover = useCallback(async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta nota?')) return;
    try {
      await api.delete(`/bloco-de-notas/${id}`);
      setNotas((prev) => prev.filter((n) => n.id !== id));
      salvarSucesso('Nota excluída');
    } catch {
      salvarErro('Falha ao excluir nota. Tente novamente.');
    }
  }, [salvarSucesso]);

  const handleAlternarItem = useCallback(async (notaId: string, itemId: string, concluido: boolean) => {
    const nota = notas.find((n) => n.id === notaId);
    if (!nota) return;
    const novaItens = nota.itens.map((i) => (i.id === itemId ? { ...i, concluido } : i));
    try {
      const res = await api.put(`/bloco-de-notas/${notaId}`, {
        titulo: nota.titulo,
        conteudo: nota.conteudo,
        tipo: nota.tipo,
        itens: novaItens,
        cor: nota.cor,
        fixada: nota.fixada,
      });
      setNotas((prev) => prev.map((n) => (n.id === res.data.id ? res.data : n)));
    } catch {
      salvarErro('Falha ao salvar tarefa. Tente novamente.');
    }
  }, [notas, salvarErro]);

  const notasFiltradas = useMemo(() => filtrarNotas(notas, busca, filtro), [
    notas,
    busca,
    filtro,
  ]);

  const fixadas = notasFiltradas.filter((n) => n.fixada);
  const outras = notasFiltradas.filter((n) => !n.fixada);

  const fecharModal = () => {
    setAbrirModal(false);
    setNotaEditando(null);
  };

  const salvarModal = () => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement | null;
    const titulo = input?.value.trim() ?? '';
    if (!titulo) {
      setMensagem({ texto: 'Titulo e obrigatorio', tipo: 'erro' });
      return;
    }
    const itensValidos = itens.filter((i) => i.texto.trim());
    const conteudo =
      tipoNota === 'texto'
        ? (document.querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? ''
        : '';
    const payload: NotaParaCriar = {
      titulo,
      conteudo,
      tipo: tipoNota,
      itens: itensValidos,
      cor: corNota,
    };
    if (notaEditando) {
      handleAtualizar({
        titulo,
        conteudo,
        tipo: tipoNota,
        itens: itensValidos,
        cor: corNota,
        fixada: notaEditando.fixada,
      });
    } else {
      handleCriar(payload);
    }
  };

  const adicionarItem = () => {
    setItens([...itens, { id: crypto.randomUUID(), texto: '', concluido: false }]);
  };

  const editarItemTexto = (idx: number, texto: string) => {
    const novo = [...itens];
    novo[idx] = { ...novo[idx], texto };
    setItens(novo);
  };

  const removerItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const alternarItemConcluido = (idx: number) => {
    const novo = [...itens];
    novo[idx] = { ...novo[idx], concluido: !novo[idx].concluido };
    setItens(novo);
  };

  useEffect(() => {
    if (notaEditando) {
      setTipoNota(notaEditando.tipo);
      setCorNota(notaEditando.cor);
      setItens(notaEditando.itens);
    } else {
      setTipoNota('texto');
      setCorNota('amarelo');
      setItens([]);
    }
  }, [notaEditando]);

  if (!abrirModal && !notaEditando) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Bloco de notas</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Lembretes, ideias de aula e listas de tarefas da sua unidade.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNotaEditando(null);
              setAbrirModal(true);
            }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            <span>+ Nova nota</span>
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por titulo, texto ou itens da lista..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
          <div className="flex gap-1">
            {FILTROS.map(({ value: f }) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f as FiltroBloco)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  filtro === f
                    ? 'bg-primary-600 border-primary-600 text-white dark:bg-primary-500 dark:border-primary-500'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'todas' ? 'Todas' : f === 'textos' ? 'Textos' : 'Listas'}
              </button>
            ))}
          </div>
        </div>

        {carregando ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando notas...</p>
        ) : notasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-400 dark:text-gray-500">
              {busca ? 'Nenhuma nota encontrada.' : 'Nenhuma nota ainda.'}
            </p>
            {!busca && (
              <button
                type="button"
                onClick={() => setAbrirModal(true)}
                className="mt-3 text-sm text-primary-600 hover:underline dark:text-primary-400"
              >
                Criar primeira nota
              </button>
            )}
          </div>
        ) : (
          <>
            {fixadas.length > 0 && (
              <section className="mb-4">
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Fixadas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {fixadas.map(renderCard)}
                </div>
              </section>
            )}
            <section>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">Outras notas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {outras.map(renderCard)}
              </div>
            </section>
          </>
        )}

        {mensagem && (
          <div
            className={`fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-md text-sm font-medium flex items-center gap-2 z-50 ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}
          >
            {mensagem.tipo === 'erro' ? '⚠️' : '✅'} {mensagem.texto}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50" onClick={fecharModal}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl dark:shadow-black/20 m-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {notaEditando ? 'Editar nota' : 'Nova nota'}
            </h3>
            <button onClick={fecharModal} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-xl">&times;</button>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titulo *</label>
              <input
                type="text"
                defaultValue={notaEditando?.titulo ?? ''}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
              <div className="flex gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoNota(t)}
                    className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
                      tipoNota === t
                        ? 'bg-primary-600 border-primary-600 text-white dark:bg-primary-500 dark:border-primary-500'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t === 'texto' ? 'Texto livre' : 'Lista de tarefas'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor</label>
              <div className="flex gap-2">
                {CORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCorNota(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      corNota === c ? 'ring-2 ring-primary-600' : ''
                    } ${COR_CLASSES[c]}`}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {tipoNota === 'texto' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conteudo</label>
                <textarea
                  defaultValue={notaEditando?.conteudo ?? ''}
                  rows={6}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Itens da lista</label>
                  <button
                    type="button"
                    onClick={adicionarItem}
                    className="text-xs text-primary-600 hover:underline dark:text-primary-400"
                  >
                    + Item
                  </button>
                </div>
                {itens.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">Nenhum item ainda.</p>
                )}
                {itens.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={item.concluido}
                      onChange={() => alternarItemConcluido(idx)}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      value={item.texto}
                      onChange={(e) => editarItemTexto(idx, e.target.value)}
                      placeholder="Digite a tarefa..."
                      className={`flex-1 border rounded-md py-1 px-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none ${
                        item.concluido ? 'line-through text-gray-400' : ''
                      } ${item.concluido ? 'dark:bg-gray-900/50' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600'}`}
                    />
                    <button
                      type="button"
                      onClick={() => removerItem(idx)}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title="Remover item"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {salvando && <p className="text-xs text-gray-400 dark:text-gray-500">Salvando...</p>}
            {erro && <p className="text-xs text-red-500 dark:text-red-400">{erro}</p>}
          </form>

          <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
            <button type="button" onClick={fecharModal} className="px-4 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={salvarModal} disabled={salvando} className="px-4 py-2 rounded-md text-sm bg-primary-600 hover:bg-primary-700 text-white dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function renderCard(n: BlocoDeNotas) {
    const corClasse = COR_CLASSES[n.cor];
    const ehLista = n.tipo === 'lista';
    const totalItens = ehLista ? n.itens.length : 0;
    const concluidos = ehLista ? n.itens.filter((i) => i.concluido).length : 0;
    return (
      <div
        key={n.id}
        className={`rounded-lg border p-3 flex flex-col gap-2 min-h-[140px] ${corClasse} hover:shadow-md transition-shadow cursor-pointer`}
        onClick={() => {
          setNotaEditando(n);
          setAbrirModal(true);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setNotaEditando(n);
            setAbrirModal(true);
          }
        }}
      >
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{n.titulo}</h4>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFixar(n.id, !n.fixada);
            }}
            className="text-xs p-1 rounded hover:bg-white/30 dark:hover:bg-black/30"
            title={n.fixada ? 'Desafixar' : 'Fixar'}
          >
            {n.fixada ? '📌' : '📍'}
          </button>
        </div>
        {ehLista && n.itens.length > 0 && (
          <div className="flex-1 overflow-hidden">
            {n.itens.slice(0, 4).map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 truncate">
                <input
                  type="checkbox"
                  checked={i.concluido}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleAlternarItem(n.id, i.id, e.target.checked);
                  }}
                  className="w-4 h-4 shrink-0"
                />
                <span className={i.concluido ? 'line-through text-gray-400' : ''}>{i.texto}</span>
              </div>
            ))}
            {n.itens.length > 4 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">+ mais {n.itens.length - 4} item(ns)</p>
            )}
            <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              {concluidos}/{totalItens} concluídos
            </div>
          </div>
        )}
        {!ehLista && n.conteudo && (
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 whitespace-pre-wrap">{n.conteudo}</p>
        )}
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-auto">
          {new Date(n.atualizado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </p>
      </div>
    );
  }
};

export default BlocoDeNotas;
