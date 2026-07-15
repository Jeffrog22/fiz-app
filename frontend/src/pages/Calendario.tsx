import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import PlanningUpload from '../components/planning/PlanningUpload';
import PlanningModal from '../components/modals/PlanningModal';
import type { Planejamento } from '../types';

interface CalendarioEvento {
  id: string;
  data: string;
  tipo: 'feriado' | 'ponte' | 'reuniao' | 'evento';
  descricao?: string;
}

interface PeriodoLetivo {
  id?: string;
  inicio_aulas: string;
  ferias_inicio: string;
  ferias_fim: string;
  termino_aulas: string;
}

const TIPOS_EVENTO = [
  { value: 'feriado', label: 'Feriado', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'ponte', label: 'Ponte', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'reuniao', label: 'Reunião', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'evento', label: 'Evento', color: 'bg-purple-100 text-purple-700 border-purple-200' },
] as const;

const Calendario: React.FC = () => {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoLetivo | null>(null);
  const [showPeriodoModal, setShowPeriodoModal] = useState(false);
  const [formPeriodo, setFormPeriodo] = useState<PeriodoLetivo>({
    inicio_aulas: '', ferias_inicio: '', ferias_fim: '', termino_aulas: '',
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDayEventos, setSelectedDayEventos] = useState<CalendarioEvento[]>([]);
  const [novoEventoTipo, setNovoEventoTipo] = useState<string>('evento');
  const [novoEventoDesc, setNovoEventoDesc] = useState('');
  const [planningFiles, setPlanningFiles] = useState<Planejamento[]>([]);
  const [climaDados, setClimaDados] = useState<Record<string, any>>({});
  const [planningDay, setPlanningDay] = useState<string | null>(null);

  const carregarEventos = useCallback(async () => {
    try {
      const res = await api.get(`/calendario?mes=${mes}&ano=${ano}`);
      setEventos(res.data);
    } catch { setEventos([]); }
  }, [mes, ano]);

  const carregarClima = useCallback(async () => {
    try {
      const res = await api.get('/chamadas/clima');
      if (res.data?.ok && res.data?.raw?.daily) {
        const daily = res.data.raw.daily;
        const map: Record<string, any> = {};
        for (let i = 0; i < daily.time.length; i++) {
          map[daily.time[i]] = {
            temp: daily.temperature_2m_max?.[i],
            code: daily.weather_code?.[i],
            precipitacao: daily.precipitation_probability_max?.[i] || 0,
          };
        }
        setClimaDados(map);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { carregarClima(); }, [carregarClima]);

  const carregarPeriodo = useCallback(async () => {
    try {
      const res = await api.get('/calendario/periodo');
      if (res.data) {
        setPeriodo(res.data);
        setFormPeriodo(res.data);
      }
    } catch { /* ignore */ }
  }, []);

  const carregarArquivos = useCallback(async () => {
    try {
      const res = await api.get('/planejamento');
      setPlanningFiles(res.data);
    } catch { setPlanningFiles([]); }
  }, []);

  useEffect(() => { carregarEventos(); }, [carregarEventos]);
  useEffect(() => { carregarPeriodo(); }, [carregarPeriodo]);
  useEffect(() => { carregarArquivos(); }, [carregarArquivos]);

  const mesAnterior = () => { if (mes === 1) { setMes(12); setAno(a => a - 1); } else { setMes(m => m - 1); } };
  const mesSeguinte = () => { if (mes === 12) { setMes(1); setAno(a => a + 1); } else { setMes(m => m + 1); } };
  const hojeClick = () => { setMes(hoje.getMonth() + 1); setAno(hoje.getFullYear()); };

  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const diasAnterior = new Date(ano, mes - 1, 0).getDate();

  const getEventosPorData = (data: string) => eventos.filter(e => e.data === data);

  const handleSalvarPeriodo = async () => {
    try {
      await api.post('/calendario/periodo', formPeriodo);
      setPeriodo(formPeriodo);
      setShowPeriodoModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao salvar periodo');
    }
  };

  const handleDayClick = (data: string) => {
    setSelectedDay(data);
    setSelectedDayEventos(getEventosPorData(data));
    setNovoEventoTipo('evento');
    setNovoEventoDesc('');
  };

  const handleDayDoubleClick = (data: string) => {
    setPlanningDay(data);
  };

  const handleAdicionarEvento = async () => {
    if (!selectedDay || !novoEventoTipo) return;
    try {
      await api.post('/calendario/evento', {
        data: selectedDay,
        tipo: novoEventoTipo,
        descricao: novoEventoDesc,
      });
      carregarEventos();
      setSelectedDayEventos(getEventosPorData(selectedDay));
      setNovoEventoDesc('');
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao adicionar evento');
    }
  };

  const handleRemoverEvento = async (id: string) => {
    try {
      await api.delete(`/calendario/evento/${id}`);
      carregarEventos();
      setSelectedDayEventos(prev => prev.filter(e => e.id !== id));
    } catch { /* ignore */ }
  };

  const diasCalendario: React.ReactNode[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const dia = diasAnterior - primeiroDiaSemana + i + 1;
    diasCalendario.push(
      <div key={`prev-${i}`} className="p-1.5 text-xs text-gray-300 text-center">{dia}</div>
    );
  }
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const diaEventos = getEventosPorData(dataStr);
    const isHoje = dataStr === hoje.toISOString().split('T')[0];
    const isPeriodoInicio = periodo?.inicio_aulas === dataStr;
    const isPeriodoFim = periodo?.termino_aulas === dataStr;
    const isFerias = periodo && dataStr >= periodo.ferias_inicio && dataStr <= periodo.ferias_fim;
    const isSelected = selectedDay === dataStr;
    const climaDia = climaDados[dataStr];
    const temAlertaChuva = climaDia?.precipitacao > 60;

    let bgClass = 'hover:bg-gray-100';
    if (isSelected) bgClass = 'bg-primary-100 ring-2 ring-primary-400';
    else if (isHoje) bgClass = 'bg-blue-50 font-bold';
    if (isFerias) bgClass = 'bg-yellow-50';

    diasCalendario.push(
      <button
        key={dia}
        onClick={() => handleDayClick(dataStr)}
        onDoubleClick={() => handleDayDoubleClick(dataStr)}
        className={`p-1.5 text-sm text-center rounded relative min-h-[48px] flex flex-col items-center ${bgClass} transition-colors`}
      >
        <span className={`text-xs ${isPeriodoInicio || isPeriodoFim ? 'text-white bg-green-500 rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>
          {dia}
        </span>
        {climaDia && (
          <span className="text-[9px] text-gray-500 mt-0.5">
            {Math.round(climaDia.temp)}°C
            {temAlertaChuva && <span className="text-red-400 ml-0.5">🌧️</span>}
          </span>
        )}
        {diaEventos.length > 0 && (
          <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
            {diaEventos.slice(0, 2).map((ev, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                ev.tipo === 'feriado' ? 'bg-red-400' :
                ev.tipo === 'ponte' ? 'bg-orange-400' :
                ev.tipo === 'reuniao' ? 'bg-blue-400' : 'bg-purple-400'
              }`} />
            ))}
            {diaEventos.length > 2 && <span className="text-[8px] text-gray-400">+{diaEventos.length - 2}</span>}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Calendário</h1>
        <button
          onClick={() => setShowPeriodoModal(true)}
          className="text-sm px-3 py-1.5 bg-primary-50 text-primary-700 rounded border border-primary-200 hover:bg-primary-100 transition"
        >
          Período Letivo
        </button>
      </div>

      {periodo && (
        <div className="flex gap-4 text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
          <span>Início: <strong>{periodo.inicio_aulas || '---'}</strong></span>
          <span>Férias: <strong>{periodo.ferias_inicio || '---'} a {periodo.ferias_fim || '---'}</strong></span>
          <span>Término: <strong>{periodo.termino_aulas || '---'}</strong></span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <button onClick={mesAnterior} className="text-gray-500 hover:text-gray-700 px-2">&lt;</button>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-800">{new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' })} {ano}</span>
            <button onClick={hojeClick} className="text-xs text-primary-600 hover:text-primary-800 px-2 py-0.5 rounded border border-primary-200 hover:bg-primary-50">Hoje</button>
          </div>
          <button onClick={mesSeguinte} className="text-gray-500 hover:text-gray-700 px-2">&gt;</button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {diasSemana.map((d) => (
            <div key={d} className="bg-gray-50 p-2 text-xs font-medium text-gray-500 text-center">{d}</div>
          ))}
          {diasCalendario}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Eventos em {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR')}
          </h3>

          <div className="flex gap-2 flex-wrap">
            {selectedDayEventos.map((ev) => {
              const tipoInfo = TIPOS_EVENTO.find(t => t.value === ev.tipo);
              return (
                <span key={ev.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${tipoInfo?.color || 'bg-gray-100'}`}>
                  {tipoInfo?.label || ev.tipo}
                  {ev.descricao && <span className="text-gray-500">- {ev.descricao}</span>}
                  <button onClick={() => handleRemoverEvento(ev.id)} className="ml-1 text-gray-400 hover:text-red-500">&times;</button>
                </span>
              );
            })}
            {selectedDayEventos.length === 0 && <span className="text-xs text-gray-400">Nenhum evento neste dia.</span>}
          </div>

          <div className="flex gap-2 items-end flex-wrap">
            <select
              value={novoEventoTipo}
              onChange={(e) => setNovoEventoTipo(e.target.value)}
              className="text-xs px-2 py-1.5 border border-gray-300 rounded"
            >
              {TIPOS_EVENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              type="text"
              value={novoEventoDesc}
              onChange={(e) => setNovoEventoDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="text-xs px-2 py-1.5 border border-gray-300 rounded flex-1 min-w-[120px]"
            />
            <button onClick={handleAdicionarEvento} className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition">
              Adicionar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Planejamento</h3>
        <PlanningUpload arquivos={planningFiles} onArquivosChange={carregarArquivos} />
      </div>

      {showPeriodoModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setShowPeriodoModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800">Período Letivo</h3>
            <div className="space-y-3">
              {([
                { key: 'inicio_aulas', label: 'Início das aulas' },
                { key: 'ferias_inicio', label: 'Férias (início)' },
                { key: 'ferias_fim', label: 'Férias (término)' },
                { key: 'termino_aulas', label: 'Término das aulas' },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="date"
                    value={formPeriodo[key]}
                    onChange={(e) => setFormPeriodo(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowPeriodoModal(false)} className="text-sm px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={handleSalvarPeriodo} className="text-sm px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {planningDay && (
        <PlanningModal data={planningDay} onClose={() => setPlanningDay(null)} />
      )}
    </div>
  );
};

export default Calendario;
