import { describe, it, expect, beforeEach } from 'vitest';
import {
  tourJaVisto,
  marcarTourVisto,
  getUltimaVersaoVista,
  setUltimaVersaoVista,
  sequenciaJaVista,
  marcarSequenciaVista,
} from '../tutorialStorage';

describe('tutorialStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inicia como não visto e marca como visto por professor', () => {
    expect(tourJaVisto('jeff')).toBe(false);
    marcarTourVisto('jeff');
    expect(tourJaVisto('jeff')).toBe(true);
    expect(tourJaVisto('duda')).toBe(false);
  });

  it('persiste a última versão vista por professor', () => {
    expect(getUltimaVersaoVista('jeff')).toBeNull();
    setUltimaVersaoVista('jeff', 'v2.91.0');
    expect(getUltimaVersaoVista('jeff')).toBe('v2.91.0');
    expect(getUltimaVersaoVista('duda')).toBeNull();
  });

  it('usa chave por tenant (jsdom=localhost → bela-vista)', () => {
    marcarTourVisto('jeff');
    expect(localStorage.getItem('tutorial_tour_bela-vista_jeff')).toBe('true');
    expect(localStorage.getItem('tutorial_tour_vila_jeff')).toBeNull();
  });

  it('marca a sequência de guia por professor e unidade', () => {
    expect(sequenciaJaVista('transferencia-nivel', 'jeff')).toBe(false);
    marcarSequenciaVista('transferencia-nivel', 'jeff');
    expect(sequenciaJaVista('transferencia-nivel', 'jeff')).toBe(true);
    // outra sequência e outro professor seguem independentes
    expect(sequenciaJaVista('boas-vindas', 'jeff')).toBe(false);
    expect(sequenciaJaVista('transferencia-nivel', 'duda')).toBe(false);
    expect(localStorage.getItem('tutorial_seq_transferencia-nivel_bela-vista_jeff')).toBe('true');
  });
});
