import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

interface Props {
  aberto: boolean;
  onClose: () => void;
  data: string;
  indiceAula: number;
}

const condicoes = ['Aberto', 'Sol', 'Nublado', 'Chuva', 'Vento', 'Tempestade'];

const CardAula: React.FC<Props> = ({ aberto, onClose, data, indiceAula }) => {
  const [tempPiscina, setTempPiscina] = useState(28);
  const [cloro, setCloro] = useState(2.5);
  const [condicao, setCondicao] = useState(condicoes[0]);
  const [salvando, setSalvando] = useState(false);
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    if (aberto && data) {
      setCarregou(false);
      api.get('/chamadas/card-aula/' + data + '?indice_aula=' + indiceAula)
        .then((res) => {
          const r = res.data;
          if (r) {
            if (r.temperatura_piscina) setTempPiscina(r.temperatura_piscina);
            if (r.cloro_ppm) setCloro(r.cloro_ppm);
            if (r.condicao_clima) setCondicao(r.condicao_clima);
          }
        })
        .catch(() => {})
        .finally(() => setCarregou(true));
    }
  }, [aberto, data, indiceAula]);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await api.post('/chamadas/card-aula', {
        data, indice_aula: indiceAula,
        temperatura_piscina: tempPiscina,
        cloro_ppm: cloro,
        condicao_clima: condicao,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  const sugestao =
    tempPiscina < 26 ? 'Agua muito fria - Falta justificada'
    : tempPiscina < 28 ? 'Agua fria - Falta justificada'
    : cloro < 1 || cloro > 5 ? 'Cloro inadequado - Falta justificada'
    : cloro < 2 || cloro > 3 ? 'Cloro no limite'
    : condicao === 'Tempestade' || condicao === 'Chuva' ? 'Falta justificada (clima)'
    : 'Aula normal';

  const sugestaoCor =
    sugestao.includes('Falta') ? 'text-red-600'
    : sugestao.includes('limite') ? 'text-yellow-600'
    : 'text-green-600';

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
                <label className="block text-sm font-medium text-gray-700">Condicao climatica</label>
                <select value={condicao} onChange={(e) => setCondicao(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 mt-1 text-sm">
                  {condicoes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Temp. Piscina (C)</label>
                <input type="number" step="0.1" value={tempPiscina}
                  onChange={(e) => setTempPiscina(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cloro (ppm)</label>
                <input type="number" step="0.1" min="0" max="10" value={cloro}
                  onChange={(e) => setCloro(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded p-2 mt-1 text-sm" />
              </div>
              <div className={'p-3 rounded bg-gray-50 text-sm font-medium ' + sugestaoCor}>
                <span className="text-gray-700">Sugestao: </span>{sugestao}
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
