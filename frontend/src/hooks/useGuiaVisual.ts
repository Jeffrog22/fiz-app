import { useContext } from 'react';
import { GuiaVisualContext, type GuiaVisualState } from '../context/GuiaVisualContext';

export function useGuiaVisual(): GuiaVisualState {
  const context = useContext(GuiaVisualContext);
  if (!context) {
    throw new Error('useGuiaVisual deve ser usado dentro de um GuiaVisualProvider');
  }
  return context;
}

export default useGuiaVisual;
