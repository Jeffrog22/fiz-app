import React from 'react';
import { useUpdateChecker } from '../../hooks/useUpdateChecker';

const UpdateBanner: React.FC = () => {
  const { updateAvailable, dismiss, atualizarAgora } = useUpdateChecker();

  if (!updateAvailable) return null;

  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 sticky top-0 z-50">
      <span className="text-sm font-medium">
        Nova versão disponível — atualize para receber as últimas correções.
      </span>
      <button
        type="button"
        onClick={atualizarAgora}
        className="px-3 py-1 text-xs font-semibold bg-white text-amber-600 rounded hover:bg-amber-50 transition-colors"
      >
        Atualizar agora
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="text-white/90 hover:text-white transition-colors shrink-0"
        title="Dispensar"
        aria-label="Dispensar aviso de atualização"
      >
        ✕
      </button>
    </div>
  );
};

export default UpdateBanner;
