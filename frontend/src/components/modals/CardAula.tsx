import React, { useState, useEffect } from 'react';
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
      // Tenta ler do card_aula (documento diario, agora por indice_aula)
      api.get(`/chamadas/card-aula/daily/${data}`)
        .then((res) => {
          const records: any[] = Array.isArray(res.data) ? res.data : [];
          // Propaga do log mais recentemente salvo (criado_em DESC)
          // que tenha indice_aula <= atual.
          const sorted = [...records].sort((a: any, b: any) =>
            new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime() ||
            b.indice_aula - a.indice_aula
          );
          const cardRecord = sorted.find((r: any) => r.indice_aula <= indiceAula);
          if (cardRecord) {
            if (cardRecord.condicao_clima) setCondicao(cardRecord.condicao_clima);
            if (cardRecord.temperatura_externa != null) setTempExterna(cardRecord.temperatura_externa);
            if (cardRecord.temperatura_piscina != null) setTempPiscina(cardRecord.temperatura_piscina);
            if (cardRecord.cloro_ppm != null) setCloro(cardRecord.cloro_ppm);
            if (cardRecord.sensacao) setSensacoes(cardRecord.sensacao);
            if (cardRecord.id) setUltimoHash(cardRecord.id.slice(0, 8));
            if (cardRecord.indice_aula === indiceAula) {
              setDebugInfo(`Registro próprio (Aula ${indiceAula + 1})`);
            } else {
              setDebugInfo(`Propagado de Aula ${cardRecord.indice_aula + 1} (mais recente)`);
            }
            return;
          }
          setDebugInfo('Fallback climático (sem registro anterior)');
          // Fallback: clima da API
          api.get('/chamadas/clima')
            .then((res2) => {
              if (res2.data?.ok) {
                const temp = res2.data.temperatura ?? 26;
                setTempExterna(temp);
                setCondicao(getCondicaoFromWeatherCode(res2.data.weatherCode ?? null));
                const sens = getSensacoesFromTemperatura(temp);
                if (sens.length > 0) setSensacoes(sens);
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
          // Fallback: clima da API
          api.get('/chamadas/clima')
            .then((res2) => {
              if (res2.data?.ok) {
                const temp = res2.data.temperatura ?? 26;
                setTempExterna(temp);
                setCondicao(getCondicaoFromWeatherCode(res2.data.weatherCode ?? null));
                const sens = getSensacoesFromTemperatura(temp);
                if (sens.length > 0) setSensacoes(sens);
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

  const sugestaoCor = sugestaoFinal.status === 'AULA_CANCELADA' ? 'text-red-700 font-bold'
    : sugestaoFinal.status === 'FALTA_JUSTIFICADA' ? 'text-red-600'
    : 'text-green-600';

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Card de Aula</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        {!carregou ? (
          <p className="text-gray-500">Carregando...</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">
              {new Date(data + 'T12:00').toLocaleDateString('pt-BR')} - Aula {indiceAula + 1}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Condição climática</label>
                <select value={condicao} onChange={(e) => setCondicao(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 mt-1 text-sm">
                  {CONDICOES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Temperatura Externa (°C)
                  {tempExterna < 15 && <span className="ml-2 text-xs text-red-500">Frio detectado</span>}
                </label>
                <input type="number" step="1" value={tempExterna}
                  onChange={(e) => setTempExterna(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Temperatura Piscina (°C)</label>
                <input type="number" step="0.5" value={tempPiscina}
                  onChange={(e) => setTempPiscina(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cloro (ppm): {cloro.toFixed(1)}</label>
                <input type="range" min="0" max="7" step="0.5" value={cloro}
                  onChange={(e) => setCloro(Number(e.target.value))}
                  className="w-full mt-1" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sensação</label>
                <div className="flex flex-wrap gap-1.5">
                  {SENSACOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSensacao(s)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition ${
                        sensacoes.includes(s)
                          ? 'bg-primary-100 border-primary-300 text-primary-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 p-3 rounded bg-gray-50 text-sm">
                <p className="text-xs text-gray-500">Filtro 1 (Clima): {climaSugestao.status !== 'AULA_NORMAL' ? `❌ ${climaSugestao.motivo}` : '✅ AULA NORMAL'}</p>
                <p className="text-xs text-gray-500">Filtro 2 (Piscina): {piscinaSugestao.status !== 'AULA_NORMAL' ? `❌ ${piscinaSugestao.motivo}` : '✅ AULA NORMAL'}</p>
                <p className="text-xs text-gray-500">Filtro 3 (Cloro): {cloroSugestao.status !== 'AULA_NORMAL' ? `❌ ${cloroSugestao.motivo}` : '✅ AULA NORMAL'}</p>
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
                <div className="p-3 border border-red-200 bg-red-50 rounded space-y-2">
                  <p className="text-xs font-medium text-red-700">
                    Condição de cancelamento detectada:
                  </p>
                  <ul className="text-xs text-red-600 list-disc list-inside">
                    {tempPiscina < 23 && <li>Água crítica ({tempPiscina}°C) — risco para todos os alunos</li>}
                    {tempPiscina >= 23 && tempPiscina < 25 && <li>Água muito fria ({tempPiscina}°C) — risco para menores de 16 anos</li>}
                    {cloro === 0 && <li>Cloro zerado — condições inadequadas para aula</li>}
                  </ul>
                  {cloro === 0 && onAbrirBO && (
                    <button type="button" onClick={onAbrirBO}
                      className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition">
                      Abrir BO de Cancelamento
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                {salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
            <div className="text-right mt-2 space-y-0.5">
              {ultimoHash && (
                <p className="text-[10px] text-gray-300 select-all">#{ultimoHash}</p>
              )}
              {debugInfo && (
                <p className="text-[10px] text-gray-400">{debugInfo}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardAula;
