import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

interface NotificationConfig {
  ativo: boolean;
  frequencia_dia: number;
  horarios: string[];
  dias_semana: string[];
}

interface NotificationSettingsProps {
  open: boolean;
  onClose: () => void;
}

const DIAS_SEMANA_OPCOES = [
  { value: 'dom', label: 'D' },
  { value: 'seg', label: 'S' },
  { value: 'ter', label: 'T' },
  { value: 'qua', label: 'Q' },
  { value: 'qui', label: 'Q' },
  { value: 'sex', label: 'S' },
  { value: 'sab', label: 'S' },
];

const DIAS_SEMANA_NOMES: Record<string, string> = {
  dom: 'Domingo',
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
};

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ open, onClose }) => {
  const [config, setConfig] = useState<NotificationConfig>({
    ativo: true,
    frequencia_dia: 1,
    horarios: ['08:00'],
    dias_semana: ['seg', 'ter', 'qua', 'qui', 'sex'],
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.get<NotificationConfig>('/notificacoes/config')
      .then((res) => {
        setConfig(res.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [open]);

  useEffect(() => {
    if (!loaded) return;
    const count = config.frequencia_dia;
    const current = config.horarios.length;
    if (current < count) {
      const last = config.horarios[current - 1] || '08:00';
      const nextHour = parseInt(last.split(':')[0], 10) + 2;
      setConfig((prev) => ({
        ...prev,
        horarios: [
          ...prev.horarios,
          ...Array.from({ length: count - current }, (_, i) =>
            String(Math.min(nextHour + i * 2, 22)).padStart(2, '0') + ':00'
          ),
        ],
      }));
    } else if (current > count) {
      setConfig((prev) => ({ ...prev, horarios: prev.horarios.slice(0, count) }));
    }
  }, [config.frequencia_dia, loaded]);

  const toggleDia = (dia: string) => {
    setConfig((prev) => {
      const exists = prev.dias_semana.includes(dia);
      return {
        ...prev,
        dias_semana: exists
          ? prev.dias_semana.filter((d) => d !== dia)
          : [...prev.dias_semana, dia],
      };
    });
  };

  const updateHorario = (index: number, value: string) => {
    setConfig((prev) => {
      const horarios = [...prev.horarios];
      horarios[index] = value;
      return { ...prev, horarios };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/notificacoes/config', config);
      onClose();
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const freqOptions = [
    { value: 1, label: '1x por dia' },
    { value: 2, label: '2x por dia' },
    { value: 3, label: '3x por dia (personalizado)' },
    { value: 4, label: '4x por dia (personalizado)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Configuração de Notificações</h2>
        </div>

        <div className="px-6 py-4 space-y-5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600">Notificações Push</label>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, ativo: !prev.ativo }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.ativo ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.ativo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Frequência</label>
            <select
              value={config.frequencia_dia}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, frequencia_dia: parseInt(e.target.value, 10) }))
              }
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {freqOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {config.frequencia_dia > 2 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Horários</label>
              {config.horarios.slice(0, config.frequencia_dia).map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-6">{i + 1}.</span>
                  <input
                    type="time"
                    value={h}
                    onChange={(e) => updateHorario(i, e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
          )}

          {config.frequencia_dia <= 2 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Horários</label>
              {config.horarios.slice(0, config.frequencia_dia).map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-6">{i + 1}.</span>
                  <input
                    type="time"
                    value={h}
                    onChange={(e) => updateHorario(i, e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">Dias da Semana</label>
            <div className="flex gap-2 flex-wrap">
              {DIAS_SEMANA_OPCOES.map((dia, idx) => {
                const selected = config.dias_semana.includes(dia.value);
                return (
                  <button
                    key={`${dia.value}-${idx}`}
                    type="button"
                    onClick={() => toggleDia(dia.value)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={DIAS_SEMANA_NOMES[dia.value]}
                  >
                    {dia.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
