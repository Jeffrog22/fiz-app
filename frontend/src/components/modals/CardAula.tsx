import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import {
  getClimaSugestao,
  getTempPiscinaSugestao,
  getCloroSugestao,
  getSugestaoFinal,
  getCondicaoFromWeatherCode,
  getSensacoesFromTemperatura,
  WMO_MAP,
} from '../../utils/climateEngine';

interface Props {
  aberto: boolean;
  onClose: () => void;
  data: string;
  indiceAula: number;
  grupoId: string;
  nivelTurma?: string;
  faixaEtariaTurma?: string;
  onAbrirBO?: () => void;
}

const SENSACOES = ['Calor', 'Abafado', 'Seco', 'Agradável', 'Vento', 'Frio', 'Frio Intenso'];

const CONDICOES = Object.values(WMO_MAP).filter((v, i, a) => a.indexOf(v) === i);

/* ── TempWheel: input de temperatura com +/- buttons e scroll wheel ── */

interface TempWheelProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
  alert?: React.ReactNode;
}

function TempWheel({ value, onChange, min = -10, max = 50, label, alert }: TempWheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const accumDelta = useRef(0);

  const clamp = useCallback((v: number) => {
    const stepped = Math.round(v * 2) / 2;
    return Math.min(max, Math.max(min, stepped));
  }, [min, max]);

  const increment = useCallback(() => onChange(clamp(value + 0.5)), [value, onChange, clamp]);
  const decrement = useCallback(() => onChange(clamp(value - 0.5)), [value, onChange, clamp]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      accumDelta.current += e.deltaY;
      if (Math.abs(accumDelta.current) >= 30) {
        onChange(clamp(value + (accumDelta.current > 0 ? -0.5 : 0.5)));
        accumDelta.current = 0;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      e.preventDefault();
      const dy = touchStartY.current - e.touches[0].clientY;
      if (Math.abs(dy) >= 25) {
        onChange(clamp(value + (dy > 0 ? 0.5 : -0.5)));
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const onTouchEnd = () => { touchStartY.current = null; };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [value, onChange, clamp]);

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}{alert}
      </label>
      <div ref={ref} className="flex items-center gap-1 mt-1 select-none touch-manipulation">
        <button type="button" onClick={decrement}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-base font-bold active:bg-gray-200 dark:active:bg-gray-600 transition">
          −
        </button>
        <span className="flex-1 text-center text-base font-mono tabular-nums text-gray-800 dark:text-gray-100">
          {value.toFixed(1)}
        </span>
        <button type="button" onClick={increment}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-base font-bold active:bg-gray-200 dark:active:bg-gray-600 transition">
          +
        </button>
      </div>
    </div>
  );
}

/* ── CloroSlider: slider colorido sem input ── */

interface CloroSliderProps {
  value: number;
  onChange: (v: number) => void;
}

function cloroColor(v: number): string {
  if (v <= 0.5) return '#9CA3AF';
  if (v <= 1.0) return '#FDE68A';
  if (v <= 2.0) return '#FCD34D';
  if (v <= 3.0) return '#F59E0B';
  if (v <= 3.5) return '#FB923C';
  if (v <= 5.0) return '#F97316';
  if (v <= 5.5) return '#EA580C';
  return '#C2410C';
}

function CloroSlider({ value, onChange }: CloroSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pct = (value / 7) * 100;
  const color = cloroColor(value);

  const calcValue = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const stepped = Math.round(ratio * 14) / 2;
    onChange(Math.max(0, Math.min(7, stepped)));
  }, [onChange]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      calcValue(x);
    };
    const onUp = () => { dragging.current = false; };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, [calcValue]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cloro</label>
      <div className="text-center text-lg font-mono font-bold mt-1 mb-2" style={{ color }}>{value.toFixed(1)}</div>
      <div ref={trackRef}
        className="relative h-3 rounded-full cursor-pointer touch-none"
        style={{ background: `linear-gradient(to right, ${color} ${pct}%, #E5E7EB ${pct}%)` }}
        onMouseDown={(e) => { dragging.current = true; calcValue(e.clientX); }}
        onTouchStart={(e) => { dragging.current = true; calcValue(e.touches[0].clientX); }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 shadow transition-colors"
          style={{ left: `calc(${pct}% - 10px)`, borderColor: color }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-0.5">
        <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
      </div>
    </div>
  );
}

/* ── CardAula ── */

const CardAula: React.FC<Props> = ({ aberto, onClose, data, indiceAula, grupoId, nivelTurma, faixaEtariaTurma, onAbrirBO }) => {
  const [tempExterna, setTempExterna] = useState(26);
  const [tempPiscina, setTempPiscina] = useState(28);
  const [cloro, setCloro] = useState(2.5);
  const [condicao, setCondicao] = useState('parcialmente nublado');
  const [sensacoes, setSensacoes] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [carregou, setCarregou] = useState(false);
  const [ultimoHash, setUltimoHash] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (aberto && data) {
      setCarregou(false);
      setSensacoes([]);
      setDebugInfo('');
      api.get(`/chamadas/card-aula/daily/${data}`)
        .then((res) => {
          const records: any[] = Array.isArray(res.data) ? res.data : [];
          const ownRecord = records.find((r: any) => r.indice_aula === indiceAula);
          const cardRecord = ownRecord || [...records]
            .filter((r: any) => r.indice_aula < indiceAula)
            .sort((a: any, b: any) => b.indice_aula - a.indice_aula)[0];
          if (cardRecord) {
            if (cardRecord.condicao_clima) setCondicao(cardRecord.condicao_clima);
            if (cardRecord.temperatura_externa != null) setTempExterna(cardRecord.temperatura_externa);
            if (cardRecord.temperatura_piscina != null) setTempPiscina(cardRecord.temperatura_piscina);
            if (cardRecord.cloro_ppm != null) setCloro(cardRecord.cloro_ppm);
            if (cardRecord.sensacao) setSensacoes(cardRecord.sensacao);
            if (cardRecord.id) setUltimoHash(cardRecord.id.slice(0, 8));
            if (cardRecord.indice_aula === indiceAula) {
              setDebugInfo(`Dados desta aula (Aula ${indiceAula + 1})`);
            } else {
              setDebugInfo(`Propagado da Aula ${cardRecord.indice_aula + 1}`);
            }
            return;
          }
          setDebugInfo('Fallback climático (sem registro anterior)');
          api.get('/chamadas/clima')
            .then((res2) => {
              if (res2.data?.ok) {
                const temp = res2.data.temperatura ?? 26;
                setTempExterna(temp);
                setCondicao(getCondicaoFromWeatherCode(res2.data.weatherCode ?? null));
                const sens = getSensacoesFromTemperatura(temp);
                if (sens.length > 0) setSensacoes((prev) => [...new Set([...prev, ...sens])]);
              } else {
                setTempExterna(26);
                setCondicao('Parcialmente Nublado');
              }
            })
            .catch(() => {
              setTempExterna(26);
              setCondicao('parcialmente nublado');
            });
        })
        .catch(() => {
          setDebugInfo('Erro ao carregar registros');
          api.get('/chamadas/clima')
            .then((res2) => {
              if (res2.data?.ok) {
                const temp = res2.data.temperatura ?? 26;
                setTempExterna(temp);
                setCondicao(getCondicaoFromWeatherCode(res2.data.weatherCode ?? null));
                const sens = getSensacoesFromTemperatura(temp);
                if (sens.length > 0) setSensacoes((prev) => [...new Set([...prev, ...sens])]);
              } else {
                setTempExterna(26);
                setCondicao('Parcialmente Nublado');
              }
            })
            .catch(() => {
              setTempExterna(26);
              setCondicao('parcialmente nublado');
            });
        })
        .finally(() => setCarregou(true));
    }
  }, [aberto, data, indiceAula]);

  useEffect(() => {
    const sens = getSensacoesFromTemperatura(tempExterna);
    setSensacoes((prev) => {
      const filtered = prev.filter((s) => s !== 'Frio' && s !== 'Frio Intenso');
      return [...filtered, ...sens];
    });
  }, [tempExterna]);

  const climaSugestao = getClimaSugestao(condicao, sensacoes);
  const piscinaSugestao = getTempPiscinaSugestao(tempPiscina, nivelTurma, faixaEtariaTurma);
  const cloroSugestao = getCloroSugestao(cloro);
  const sugestaoFinal = getSugestaoFinal(climaSugestao, piscinaSugestao, cloroSugestao);

  const toggleSensacao = (s: string) => {
    setSensacoes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const sugestaoCor = sugestaoFinal.status === 'AULA_CANCELADA' ? 'text-red-700 dark:text-red-300 font-bold'
    : sugestaoFinal.status === 'FALTA_JUSTIFICADA' ? 'text-red-600 dark:text-red-400'
    : 'text-green-600 dark:text-green-400';

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const res = await api.post('/chamadas/card-aula', {
        data, indice_aula: indiceAula,
        grupo_id: grupoId,
        temperatura_externa: tempExterna,
        temperatura_piscina: tempPiscina,
        cloro_ppm: cloro,
        condicao_clima: condicao,
        sensacao: sensacoes,
        status_sugerido: sugestaoFinal.status,
        motivo_sugerido: sugestaoFinal.motivo,
      });
      if (res.data?.hash?.id) setUltimoHash(res.data.hash.id.slice(0, 8));
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl dark:shadow-black/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Card de Aula</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        {!carregou ? (
          <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {new Date(data + 'T12:00').toLocaleDateString('pt-BR')} - Aula {indiceAula + 1}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Condição climática</label>
                <select value={condicao} onChange={(e) => setCondicao(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded p-2 mt-1 text-sm">
                  {CONDICOES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <TempWheel
                  value={tempExterna}
                  onChange={setTempExterna}
                  min={-10}
                  max={50}
                  label="Externa"
                  alert={tempExterna < 15 && <span className="ml-2 text-xs text-red-500 dark:text-red-400">Frio detectado</span>}
                />
                <TempWheel
                  value={tempPiscina}
                  onChange={setTempPiscina}
                  min={15}
                  max={40}
                  label="Piscina"
                />
              </div>

              <CloroSlider value={cloro} onChange={setCloro} />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sensação</label>
                <div className="flex flex-wrap gap-1.5">
                  {SENSACOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSensacao(s)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition ${
                        sensacoes.includes(s)
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 p-3 rounded bg-gray-50 dark:bg-gray-900 text-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400">Filtro 1 (Clima): {climaSugestao.status !== 'AULA_NORMAL' ? `❌ ${climaSugestao.motivo}` : '✅ AULA NORMAL'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Filtro 2 (Piscina): {piscinaSugestao.status !== 'AULA_NORMAL' ? `❌ ${piscinaSugestao.motivo}` : '✅ AULA NORMAL'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Filtro 3 (Cloro): {cloroSugestao.status !== 'AULA_NORMAL' ? `❌ ${cloroSugestao.motivo}` : '✅ AULA NORMAL'}</p>
                <div className={'pt-1 font-medium ' + sugestaoCor}>
                  Status Sugerido: <strong>{
                    sugestaoFinal.status === 'AULA_CANCELADA' ? 'AULA CANCELADA' :
                    sugestaoFinal.status === 'FALTA_JUSTIFICADA' ? 'FALTA JUSTIFICADA' :
                    'AULA NORMAL'
                  }</strong>
                  {sugestaoFinal.motivo && (
                    <span className="block text-xs mt-0.5">Motivo: {sugestaoFinal.motivo}</span>
                  )}
                </div>
              </div>

              {(sugestaoFinal.status === 'AULA_CANCELADA') && (
                <div className="p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 rounded space-y-2">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300">
                    Condição de cancelamento detectada:
                  </p>
                  <ul className="text-xs text-red-600 dark:text-red-400 list-disc list-inside">
                    {tempPiscina < 23 && <li>Água crítica ({tempPiscina}°C) — risco para todos os alunos</li>}
                    {sugestaoFinal.motivo === 'Água fria para iniciação' && <li>Água fria ({tempPiscina}°C) — risco para alunos de iniciação</li>}
                    {sugestaoFinal.motivo === 'Água muito fria para menores' && <li>Água muito fria ({tempPiscina}°C) — risco para menores de 16 anos</li>}
                    {cloro === 0 && <li>Cloro zerado — condições inadequadas para aula</li>}
                  </ul>
                  {cloro === 0 && onAbrirBO && (
                    <button type="button" onClick={onAbrirBO}
                      className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/50 transition">
                      Abrir BO de Cancelamento
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600">
                {salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
            <div className="text-right mt-2 space-y-0.5">
              {ultimoHash && (
                <p className="text-[10px] text-gray-300 dark:text-gray-600 select-all">#{ultimoHash}</p>
              )}
              {debugInfo && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{debugInfo}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardAula;
