import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useZoom } from '../hooks/useZoom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../hooks/useTenant';
import { useDevLog } from '../hooks/useDevLog';
import NotificationSettings from '../components/notifications/NotificationSettings';
import api from '../utils/api';
import { sortLabels } from '../utils/chamadaUtils';
import { buscarUltimaVersao, compararVersoes } from '../utils/version';

type AbaExport = 'vagas' | 'frequencia' | 'cancelamentos';

const Configuracoes: React.FC = () => {
  const {
    permission, subscribed, loading,
    requestPermission, subscribe, unsubscribe, refresh,
  } = usePushNotifications();
  const { zoom, aumentar, diminuir, resetar, ZOOM_MIN, ZOOM_MAX } = useZoom();

  const { darkMode, toggleDarkMode } = useTheme();

  const [abaExport, setAbaExport] = useState<AbaExport>('vagas');

  const [exportando, setExportando] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifAtivo, setNotifAtivo] = useState(true);
  const [subscriptions, setSubscriptions] = useState<{ id: string; endpoint: string; criado_em: string }[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const [professores, setProfessores] = useState<{ id: string; nome: string; hash: string }[]>([]);
  const [professorId, setProfessorId] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [label, setLabel] = useState('');
const [mes, setMes] = useState(new Date().getMonth() + 1);
const [ano, setAno] = useState(new Date().getFullYear());
const [tipoSelect, setTipoSelect] = useState('todos');

const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'latest'>('idle');
const [updateMsg, setUpdateMsg] = useState<string | null>(null);
const [resetando, setResetando] = useState(false);

const [climaLogs, setClimaLogs] = useState<Array<{
  id: string;
  tentativas: number;
  duracao_total_ms: number;
  sucesso: boolean;
  cache_hit: boolean;
  erro: string | null;
  temperatura: number | null;
  weather_code: number | null;
  criado_em: string;
}>>([]);
const [climaLogsLoading, setClimaLogsLoading] = useState(false);
const [climaLogsAutoRefresh, setClimaLogsAutoRefresh] = useState(false);

const navigate = useNavigate();
const { logout, isAdmin } = useAuth();
const { tenantId } = useTenant();
const { enabled: devEnabled } = useDevLog();

  useEffect(() => {
    api.get('/professores').then((res) => {
      setProfessores(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/notificacoes/config').then((res) => {
      setNotifAtivo(res.data?.ativo !== false);
    }).catch(() => {});
    carregarSubscriptions();
  }, []);

  const carregarSubscriptions = async () => {
    setSubsLoading(true);
    try {
      const res = await api.get('/notificacoes/subscriptions');
      setSubscriptions(res.data || []);
    } catch {
      setSubscriptions([]);
    } finally {
      setSubsLoading(false);
    }
  };

  const carregarClimaLogs = useCallback(async () => {
    setClimaLogsLoading(true);
    try {
      const res = await api.get('/chamadas/clima/logs', { params: { limit: 100 } });
      setClimaLogs(res.data?.logs || []);
    } catch {
      setClimaLogs([]);
    } finally {
      setClimaLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && climaLogsAutoRefresh) {
      carregarClimaLogs();
      const interval = setInterval(carregarClimaLogs, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, climaLogsAutoRefresh, carregarClimaLogs]);

  const handleToggleNotif = async () => {
    try {
      const novoEstado = !notifAtivo;
      await api.put('/notificacoes/config', { ativo: novoEstado });
      setNotifAtivo(novoEstado);
      if (novoEstado) {
        await subscribe();
      } else {
        await unsubscribe();
      }
      await refresh();
      await carregarSubscriptions();
    } catch {
      // error toggling notification
    }
  };

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
      } else if (abaExport === 'cancelamentos') {
        const body: any = { ano };
        if (tipoSelect !== 'todos') body.tipo_select = tipoSelect;
        const res = await api.post('/exportar/cancelamentos', body, { responseType: 'blob' });
        downloadBlob(res.data, `fiz_cancelamentos_${ano}.xlsx`);
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
  }, [abaExport, professorId, label, mes, ano, tipoSelect]);

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

  const verificarAtualizacoes = useCallback(async () => {
    setUpdateStatus('checking');
    setUpdateMsg('Verificando...');
    try {
      const atual = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
      const ultima = await buscarUltimaVersao();

      if (ultima && atual && compararVersoes(ultima, atual) > 0) {
        setUpdateMsg(`Nova versão disponível: ${ultima}.`);
        setUpdateStatus('available');
        return;
      }

      if (!ultima && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          setUpdateMsg('Não foi possível verificar atualizações.');
          setUpdateStatus('idle');
          return;
        }
        const timeout = setTimeout(() => {
          setUpdateMsg((prev) => prev === 'Verificando...' ? 'Nenhuma atualização encontrada.' : prev);
          setUpdateStatus((prev) => prev === 'checking' ? 'latest' : prev);
        }, 8000);
        const onUpdateFound = () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', function handler() {
            if (newSW.state === 'installed') {
              clearTimeout(timeout);
              setUpdateMsg('Nova versão disponível.');
              setUpdateStatus('available');
            }
          });
        };
        reg.addEventListener('updatefound', onUpdateFound);
        await reg.update();
        if (reg.waiting) {
          clearTimeout(timeout);
          setUpdateMsg('Nova versão disponível.');
          setUpdateStatus('available');
        }
        return;
      }

      setUpdateMsg(
        ultima && atual
          ? `Você está na versão mais recente (${atual}).`
          : 'Nenhuma atualização encontrada.',
      );
      setUpdateStatus('latest');
    } catch {
      setUpdateMsg('Erro ao verificar atualizações.');
      setUpdateStatus('idle');
    }
  }, []);

  const atualizarAgora = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage('SKIP_WAITING');
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
        setTimeout(() => window.location.reload(), 3000);
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  }, []);

  const hardRefresh = useCallback(async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch {}
    window.location.reload();
  }, []);

  const handleHardReset = useCallback(async () => {
    const adminKey = prompt('🔑 Chave de admin para HARD RESET:');
    if (!adminKey) return;
    const confirmText = prompt('⚠️ Isso DESTRÓI TODOS os dados do tenant (alunos, turmas, professores, chamadas, notificações, logs, planejamentos, calendário).\n\nDigite "DESTRUIR" para confirmar:');
    if (confirmText !== 'DESTRUIR') {
      alert('Confirmação incorreta. HARD RESET cancelado.');
      return;
    }
    setResetando(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/clear-data`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId, 'X-Admin-Key': adminKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao resetar');
      alert('✅ Tenant completamente resetado! O app será recarregado.');
      logout();
      navigate('/', { replace: true });
      window.location.reload();
    } catch (err: any) {
      alert(`❌ Erro: ${err.message}`);
    } finally {
      setResetando(false);
    }
  }, [tenantId, logout, navigate]);

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
            <button
              onClick={() => setAbaExport('cancelamentos')}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                abaExport === 'cancelamentos'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              Cancelamentos
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
          ) : abaExport === 'cancelamentos' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Exporta planilha de cancelamentos com dados de ocorrências, motivos e filtros.
              </p>
              <div className="flex flex-wrap items-end gap-3">
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
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Tipo:</span>
                  {['todos', 'pessoal', 'geral'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipoSelect(t)}
                      className={`px-3 py-1.5 text-xs rounded-full transition ${
                        tipoSelect === t
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t === 'todos' ? 'Todos' : t === 'pessoal' ? 'Pessoal' : 'Geral'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={exportar}
                disabled={exportando}
                className="px-5 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {exportando ? 'Exportando...' : 'Exportar Cancelamentos'}
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

          <div className="flex items-center justify-between mb-3">
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

          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">Notificações ativas</label>
            <button
              type="button"
              onClick={handleToggleNotif}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifAtivo ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifAtivo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => setNotifModalOpen(true)}
              className="px-3 py-1.5 text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
            >
              Configurar horários
            </button>
            {permission === 'default' && (
              <button
                type="button"
                onClick={requestPermission}
                className="px-3 py-1.5 text-xs bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
              >
                Solicitar permissão
              </button>
            )}
            {permission === 'granted' && subscribed && (
              <button
                type="button"
                onClick={async () => { await unsubscribe(); await refresh(); await carregarSubscriptions(); }}
                className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                Remover este dispositivo
              </button>
            )}
          </div>

          {permission === 'denied' && (
            <p className="text-xs text-red-500 dark:text-red-400 mb-3">
              Permissão bloqueada. Ative nas configurações do navegador.
            </p>
          )}

          {subscriptions.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Dispositivos ativos ({subscriptions.length})
              </p>
              {subsLoading ? (
                <p className="text-xs text-gray-400">Carregando...</p>
              ) : (
                <ul className="space-y-1">
                  {subscriptions.map((sub) => (
                    <li key={sub.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span className="truncate max-w-[200px]">{sub.endpoint.slice(0, 40)}...</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.delete(`/notificacoes/subscriptions/${sub.id}`);
                            await carregarSubscriptions();
                          } catch {}
                        }}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-2 flex-shrink-0"
                        title="Remover dispositivo"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
          <div className="flex items-center flex-wrap gap-2">
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
            <span className="text-sm text-gray-500 dark:text-gray-400 w-12 text-right">{zoom}%</span>
          </div>
        </div>

        {/* Atualizações */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-black/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🔄</span>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Atualizações</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Versão atual: <strong>{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={verificarAtualizacoes}
              disabled={updateStatus === 'checking'}
              className="px-3 py-1.5 text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50"
            >
              {updateStatus === 'checking' ? 'Verificando...' : 'Verificar atualizações'}
            </button>
            {updateStatus === 'available' && (
              <button
                onClick={atualizarAgora}
                className="px-3 py-1.5 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              >
                Atualizar agora
              </button>
            )}
            <button
              onClick={hardRefresh}
              className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
            >
              Hard Refresh
            </button>
          </div>
          {updateMsg && (
            <p className={`mt-2 text-sm ${updateMsg.includes('disponível') ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {updateMsg}
            </p>
          )}

{devEnabled && (
            <div className="mt-6 pt-6 border-t-2 border-red-300 dark:border-red-700">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">💀</span>
                <h3 className="text-base font-bold text-red-600 dark:text-red-400">HARD RESET</h3>
              </div>
              <p className="text-sm text-red-500 dark:text-red-400 mb-3 font-medium">
                Isso DESTRÓI todos os dados do tenant: alunos, turmas, professores, chamadas,
                notificações, planejamentos, calendário, logs. Não há como desfazer.
              </p>
              <button
                onClick={handleHardReset}
                disabled={resetando}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {resetando ? 'Resetando...' : 'EXECUTAR'}
              </button>
            </div>
          )}
        </div>

        {/* Logs de Clima (Admin only) */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-black/20 p-6 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📊</span>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Logs de Clima</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Diagnóstico de tentativas, latência e falhas da API Open-Meteo. Cache: 2h.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                onClick={carregarClimaLogs}
                disabled={climaLogsLoading}
                className="px-3 py-1.5 text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50"
              >
                {climaLogsLoading ? 'Carregando...' : 'Atualizar'}
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={climaLogsAutoRefresh}
                  onChange={(e) => setClimaLogsAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                Auto-refresh (30s)
              </label>
            </div>

            {climaLogs.length === 0 && !climaLogsLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                Nenhum log de clima encontrado.
              </p>
            )}

            {climaLogs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-2 pr-4">Data/Hora</th>
                      <th className="pb-2 pr-4 text-center">Tentativas</th>
                      <th className="pb-2 pr-4 text-center">Duração (ms)</th>
                      <th className="pb-2 pr-4 text-center">Status</th>
                      <th className="pb-2 pr-4 text-center">Cache</th>
                      <th className="pb-2 pr-4 text-center">Temp (°C)</th>
                      <th className="pb-2 pr-4 text-center">Código</th>
                      <th className="pb-2 pr-4">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {climaLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-2 pr-4 font-mono text-xs">
                          {new Date(log.criado_em).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-2 pr-4 text-center">{log.tentativas}</td>
                        <td className="py-2 pr-4 text-center font-mono">{log.duracao_total_ms}</td>
                        <td className="py-2 pr-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.sucesso
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {log.sucesso ? '✅ OK' : '❌ Falhou'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-center">
                          {log.cache_hit ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              ✅ Hit
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                              ❌ Miss
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-center">
                          {log.temperatura != null ? `${log.temperatura.toFixed(1)}°C` : '—'}
                        </td>
                        <td className="py-2 pr-4 text-center">
                          {log.weather_code != null ? log.weather_code : '—'}
                        </td>
                        <td className="py-2 pr-4 text-red-500 dark:text-red-400 truncate max-w-xs">
                          {log.erro || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <NotificationSettings
        open={notifModalOpen}
        onClose={() => {
          setNotifModalOpen(false);
          api.get('/notificacoes/config').then((res) => {
            setNotifAtivo(res.data?.ativo !== false);
          }).catch(() => {});
        }}
      />
    </div>
  );
};

export default Configuracoes;
