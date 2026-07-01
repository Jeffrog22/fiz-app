import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

interface Props {
  aberto: boolean;
  onClose: () => void;
  data: string;
  indiceAula: number;
}

const WMO_VETO_ABSOLUTO = [3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
const WMO_DINAMICO = [0, 1, 2];

const SENSACOES = ['Calor', 'Abafado', 'Seco', 'Agradável', 'Vento', 'Frio'];

function getClimaSugestao(condicao: string, sensacoes: string[]): { status: string; motivo: string | null } {
  const condLower = condicao.toLowerCase();

  if (sensacoes.includes('Frio') && sensacoes.includes('Vento')) {
    return { status: 'FALTA JUSTIFICADA', motivo: 'Frio' };
  }
  if (sensacoes.includes('Frio')) {
    return { status: 'FALTA JUSTIFICADA', motivo: 'Frio' };
  }

  const weatherCodeMap: Record<string, number> = {
    'nublado': 3, 'névoa seca': 45, 'nevoeiro': 48, 'chuvisco': 51,
    'chuva': 61, 'pancadas de chuva': 80, 'tempestade': 95,
  };
  const code = weatherCodeMap[condLower] || -1;
  if (WMO_VETO_ABSOLUTO.includes(code)) {
    return { status: 'FALTA JUSTIFICADA', motivo: condicao };
  }

  if (WMO_DINAMICO.includes(code)) {
    const sensacoesNaoPermitidas = ['Frio', 'Vento'];
    if (sensacoes.some(s => sensacoesNaoPermitidas.includes(s))) {
      return { status: 'FALTA JUSTIFICADA', motivo: 'Condição climática desfavorável' };
    }
  }

  return { status: 'AULA NORMAL', motivo: null };
}

function getTempPiscinaSugestao(temp: number): { status: string; motivo: string | null } {
  if (temp < 26) {
    return { status: 'FALTA JUSTIFICADA', motivo: 'Água muito fria' };
  }
  if (temp < 28) {
    return { status: 'FALTA JUSTIFICADA', motivo: 'Água fria' };
  }
  return { status: 'AULA NORMAL', motivo: null };
}

function getCloroSugestao(cloro: number): { status: string; motivo: string | null } {
  if (cloro < 1 || cloro > 5) {
    return { status: 'FALTA JUSTIFICADA', motivo: 'Parâmetros de Cloro Inadequados' };
  }
  return { status: 'AULA NORMAL', motivo: null };
}

const CardAula: React.FC<Props> = ({ aberto, onClose, data, indiceAula }) => {
  const [tempExterna, setTempExterna] = useState(26);
  const [tempPiscina, setTempPiscina] = useState(28);
  const [cloro, setCloro] = useState(2.5);
  const [condicao, setCondicao] = useState('Parcialmente Nublado');
  const [sensacoes, setSensacoes] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    if (aberto && data) {
      setCarregou(false);
      api.get('/chamadas/clima')
        .then((res) => {
          if (res.data?.ok && res.data?.temperatura) {
            setTempExterna(res.data.temperatura);
            if (res.data.temperatura < 15) {
              setSensacoes(prev => prev.includes('Frio') ? prev : [...prev, 'Frio']);
            }
            if (res.data.condicao) {
              setCondicao(res.data.condicao);
            }
          }
        })
        .catch(() => {})
        .finally(() => setCarregou(true));
    }
  }, [aberto, data]);

  const sensacaoSugestao = getClimaSugestao(condicao, sensacoes);
  const tempSugestao = getTempPiscinaSugestao(tempPiscina);
  const cloroSugestao = getCloroSugestao(cloro);

  const sugestaoFinal = (() => {
    if (sensacaoSugestao.status === 'FALTA JUSTIFICADA') {
      return sensacaoSugestao;
    }
    if (tempSugestao.status === 'FALTA JUSTIFICADA') {
      return tempSugestao;
    }
    if (cloroSugestao.status === 'FALTA JUSTIFICADA') {
      return cloroSugestao;
    }
    return { status: 'AULA NORMAL', motivo: null };
  })();

  const toggleSensacao = (s: string) => {
    setSensacoes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const sugestaoCor = sugestaoFinal.status === 'FALTA JUSTIFICADA' ? 'text-red-600'
    : sugestaoFinal.status === 'AULA NORMAL' ? 'text-green-600'
    : 'text-yellow-600';

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await api.post('/chamadas/card-aula', {
        data, indice_aula: indiceAula,
        temperatura_externa: tempExterna,
        temperatura_piscina: tempPiscina,
        cloro_ppm: cloro,
        condicao_clima: condicao,
        sensacao: sensacoes,
        status_sugerido: sugestaoFinal.status,
        motivo_sugerido: sugestaoFinal.motivo,
      });
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
                  <option>Céu Limpo</option>
                  <option>Principalmente Limpo</option>
                  <option>Parcialmente Nublado</option>
                  <option>Nublado</option>
                  <option>Chuvisco</option>
                  <option>Chuva</option>
                  <option>Tempestade</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Temperatura Externa (°C)</label>
                <input type="number" step="0.1" value={tempExterna}
                  onChange={(e) => setTempExterna(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Temperatura Piscina (°C)</label>
                <input type="number" step="0.1" value={tempPiscina}
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

              <div className={'p-3 rounded bg-gray-50 text-sm font-medium ' + sugestaoCor}>
                <span className="text-gray-700">Status Sugerido: </span>
                <strong>{sugestaoFinal.status}</strong>
                {sugestaoFinal.motivo && (
                  <span className="block text-xs mt-0.5">Motivo: {sugestaoFinal.motivo}</span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                {salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CardAula;
