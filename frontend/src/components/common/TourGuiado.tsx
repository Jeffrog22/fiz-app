import React, { useCallback } from 'react';
import {
  Joyride,
  ACTIONS,
  EVENTS,
  STATUS,
  type EventData,
  type TooltipRenderProps,
} from 'react-joyride';
import { useTutorial } from '../../hooks/useTutorial';

const LOCALE_PT = {
  back: 'Anterior',
  close: 'Fechar',
  next: 'Próximo',
  last: 'Concluir',
  skip: 'Pular',
  nextWithProgress: 'Próximo ({current} de {total})',
  open: 'Abrir',
};

/** Tooltip custom com Tailwind (mesmo padrão visual dos modais + dark mode). */
const TooltipTutorial: React.FC<TooltipRenderProps> = ({
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  continuous,
  index,
  isLastStep,
  size,
  step,
  tooltipProps,
}) => (
  <div
    {...tooltipProps}
    className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-[300px] sm:w-[340px] p-4"
  >
    <div className="flex items-start justify-between gap-2 mb-1">
      {step.title && (
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">
          {step.title}
        </h3>
      )}
      <button
        {...closeProps}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 leading-none"
        aria-label="Fechar tour"
      >
        ✕
      </button>
    </div>
    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{step.content}</div>
    <div className="flex items-center justify-between mt-3">
      <button
        {...skipProps}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2"
      >
        Pular
      </button>
      <div className="flex items-center gap-2">
        {continuous && index > 0 && (
          <button
            {...backProps}
            className="px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Anterior
          </button>
        )}
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {index + 1} de {size}
        </span>
        <button
          {...primaryProps}
          className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          {isLastStep ? 'Concluir' : 'Próximo'}
        </button>
      </div>
    </div>
  </div>
);

const TourGuiado: React.FC = () => {
  const { passos, chaveTour, finalizar, navegarParaPasso } = useTutorial();

  const handleEvento = useCallback(
    (data: EventData) => {
      if (data.type === EVENTS.TOUR_START || data.type === EVENTS.STEP_BEFORE) {
        const rota = data.step?.data?.rota as string | undefined;
        navegarParaPasso(rota);
      }
      if (
        data.type === EVENTS.TOUR_END &&
        (data.status === STATUS.FINISHED ||
          data.status === STATUS.SKIPPED ||
          data.action === ACTIONS.CLOSE ||
          data.action === ACTIONS.SKIP)
      ) {
        finalizar();
      }
    },
    [finalizar, navegarParaPasso]
  );

  if (!passos) return null;

  return (
    <Joyride
      key={chaveTour}
      steps={passos}
      run
      continuous
      locale={LOCALE_PT}
      tooltipComponent={TooltipTutorial}
      options={{
        closeButtonAction: 'skip',
        overlayClickAction: false,
        targetWaitTimeout: 2000,
        zIndex: 1000,
      }}
      styles={{
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.55)' },
        tooltip: { backgroundColor: 'transparent', padding: 0, borderRadius: 12 },
        tooltipContainer: { textAlign: 'left' },
      }}
      onEvent={handleEvento}
    />
  );
};

export default TourGuiado;
