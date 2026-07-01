import React from 'react';
import { useZoom } from '../../hooks/useZoom';

const AccessibilityToolbar: React.FC = () => {
  const { zoom, aumentar, diminuir, resetar, ZOOM_MIN, ZOOM_MAX } = useZoom();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={diminuir}
        disabled={zoom <= ZOOM_MIN}
        title="Diminuir zoom"
        className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        A-
      </button>
      <button
        onClick={resetar}
        title="Restaurar zoom padrão"
        className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 transition"
      >
        Padrão
      </button>
      <button
        onClick={aumentar}
        disabled={zoom >= ZOOM_MAX}
        title="Aumentar zoom"
        className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        A+
      </button>
      <span className="text-xs text-gray-400 ml-1 w-8 text-right">{zoom}%</span>
    </div>
  );
};

export default AccessibilityToolbar;
