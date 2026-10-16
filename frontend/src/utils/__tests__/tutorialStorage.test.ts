import { describe, it, expect, beforeEach } from 'vitest';
import {
  tourJaVisto,
  marcarTourVisto,
  getUltimaVersaoVista,
  setUltimaVersaoVista,
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
});
