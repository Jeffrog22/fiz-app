import React, { useEffect, useState, useCallback } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useZoom } from '../hooks/useZoom';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { sortLabels } from '../utils/chamadaUtils';

type AbaExport = 'vagas' | 'frequencia';

const Configuracoes: React.FC = () => {
  const { permission, subscribed, loading } = usePushNotifications();
  const { zoom, aumentar, diminuir, resetar, ZOOM_MIN, ZOOM_MAX } = useZoom();

  const { darkMode, toggleDarkMode } = useTheme();

  const [abaExport, setAbaExport] = useState<AbaExport>('vagas');

  const [exportando, setExportando] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const [professores, setProfessores] = useState<{ id: string; nome: string; hash: string }[]>([]);
  const [professorId, setProfessorId] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    api.get('/professores').then((res) => {
      setProfessores(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!professorId) { setLabels([]); setLabel(''); return; }
    api.get('/turmas', { params: { professor_id: professorId } }).then((res) => {
      const turmas = res.data || [];
      const uniqueLabels = [...new Set(turmas.map((t: any) => t.label).filter(Boolean))] as string[];
      setLabels(sortLabels(uniqueLabels));
      setLabel(sortLabels(uniqueLabels)[0] || '');
    }).catch(() => {});
  }, [professorId]);

  const exportar = useCallback(async () => {
    setExportando(true);
    setExportMsg(null);
    try {
      if (abaExport === 'vagas') {
        const res = await api.post('/exportar/vagas', {}, { responseType: 'blob' });
        downloadBlob(res.data, `fiz_relatorio_vagas_${new Date().toISOString().slice(0,10)}.xlsx`);
      } else {
        if (!professorId) {
          setExportMsg('Selecione professor(a).');
          setExportando(false);
          return;
        }
        const body: any = { professor_id: professorId, mes, ano };
        if (label) body.label = label;
        const res = await api.post('/exportar/frequencia', body, { responseType: 'blob' });
        const labelPart = label ? `_${label}` : '';
        downloadBlob(res.data, `fiz_frequencia_${professorId}${labelPart}_${mes}_${ano}.xlsx`);
      }
      setExportMsg('Download concluído!');
    } catch (err: any) {
      setExportMsg(err.response?.data?.error || 'Erro ao exportar.');
    } finally {
      setExportando(false);
      setTimeout(() => setExportMsg(null), 4000);
    }
  }, [abaExport, professorId, label, mes, ano]);

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

  const meses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];

  const labelExtenso: Record<string, string> = {
    'Seg/Ter': 'Segunda e Terça', 'Seg/Qua': 'Segunda e Quarta', 'Seg/Qui': 'Segunda e Quinta',
    'Seg/Sex': 'Segunda e Sexta', 'Ter/Qua': 'Terça e Quarta', 'Ter/Qui': 'Terça e Quinta',
    'Ter/Sex': 'Terça e Sexta', 'Qua/Qui': 'Quarta e Quinta', 'Qua/Sex': 'Quarta e Sexta',
    'Qui/Sex': 'Quinta e Sexta', 'Seg': 'Segunda', 'Ter': 'Terça', 'Qua': 'Quarta',
    'Qui': 'Quinta', 'Sex': 'Sexta', 'Sab': 'Sábado',
    'Seg/Ter/Qua': 'Segunda, Terça e Quarta', 'Seg/Ter/Qui': 'Segunda, Terça e Quinta',
    'Seg/Qua/Sex': 'Segunda, Quarta e Sexta', 'Ter/Qua/Qui': 'Terça, Quarta e Quinta',
    'Ter/Qua/Sex': 'Terça, Quarta e Sexta', 'Qua/Qui/Sex': 'Quarta, Quinta e Sexta',
    'Seg/Ter/Qua/Qui': 'Segunda a Quinta', 'Seg a Sex': 'Segunda a Sexta',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Configurações</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Exportar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-black/20 p-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📤</span>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Exportar</h2>
          </div>

          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setAbaExport('vagas')}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                abaExport === 'vagas'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              Vagas
            </button>
            <button
              onClick={() => setAbaExport('frequencia')}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                abaExport === 'frequencia'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              Frequência
            </button>
          </div>

          {abaExport === 'vagas' ? (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Exporta relatório completo de vagas com lotação por horário, professor e nível.
              </p>
              <button
                onClick={exportar}
                disabled={exportando}
                className="px-5 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {exportando ? 'Exportando...' : 'Exportar Relatório de Vagas'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Exporta planilha de frequência por turma, com presença dia a dia.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Professor(a)</label>
                  <select
                    value={professorId}
                    onChange={(e) => setProfessorId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    <option value="">Selecione...</option>
                    {professores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Turma (dias)</label>
                  <select
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    disabled={!professorId}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-40"
                  >
                    {!professorId && <option value="">Primeiro selecione professor</option>}
                    <option value="">Todas as turmas</option>
                    {labels.map((l) => (
                      <option key={l} value={l}>{labelExtenso[l] || l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mês</label>
                  <select
                    value={mes}
                    onChange={(e) => setMes(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    {meses.map((nome, i) => (
                      <option key={i + 1} value={i + 1}>{nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ano</label>
                  <select
                    value={ano}
                    onChange={(e) => setAno(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    {[ano - 1, ano, ano + 1].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={exportar}
                disabled={exportando || !professorId}
                className="px-5 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {exportando ? 'Exportando...' : 'Exportar Frequência'}
              </button>
            </div>
          )}

          {exportMsg && (
            <p className={`mt-3 text-sm ${exportMsg.includes('concluído') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              {exportMsg}
            </p>
          )}
        </div>

        {/* Notificações */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-black/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔔</span>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Notificações</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Gerencie as notificações push do navegador.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Status:{' '}
              {loading
                ? 'Verificando...'
                : permission === 'unsupported'
                ? 'Não suportado'
                : permission === 'granted' && subscribed
                ? 'Ativado'
                : permission === 'denied'
                ? 'Bloqueado'
                : 'Desativado'}
            </span>
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                loading
                  ? 'bg-yellow-400'
                  : permission === 'granted' && subscribed
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          </div>
        </div>

        {/* Tema */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-black/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎨</span>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Tema</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Alterne entre o tema claro e escuro.
          </p>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-primary-600 peer-focus:ring-2 peer-focus:ring-primary-300 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
              {darkMode ? 'Escuro' : 'Claro'}
            </span>
          </label>
        </div>

        {/* Acessibilidade */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-black/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">♿</span>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Acessibilidade</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Ajuste o zoom da interface para melhor visualização.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={diminuir}
              disabled={zoom <= ZOOM_MIN}
              className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              A−
            </button>
            <button
              onClick={resetar}
              className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Padrão
            </button>
            <button
              onClick={aumentar}
              disabled={zoom >= ZOOM_MAX}
              className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              A+
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1 w-10 text-right">{zoom}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
