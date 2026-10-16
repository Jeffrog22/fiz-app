import { describe, it, expect } from 'vitest';
import {
  TOPICOS_AJUDA,
  PERGUNTAS_FREQUENTES,
  buscarAjuda,
  type TopicoAjuda,
} from '../ajuda';
import { NOVIDADES_POR_VERSAO, TOUR_BOAS_VINDAS } from '../tourSteps';

describe('TOPICOS_AJUDA (invariantes)', () => {
  it('tem ids únicos, tags e ao menos 1 slide por tópico', () => {
    const ids = new Set<string>();
    for (const t of TOPICOS_AJUDA) {
      expect(t.id).toBeTruthy();
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(t.titulo).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.tags.length).toBeGreaterThan(0);
      expect(t.slides.length).toBeGreaterThan(0);
      for (const s of t.slides) {
        expect(s.titulo).toBeTruthy();
        expect(s.texto).toBeTruthy();
      }
    }
  });

  it('tem pelo menos 8 tópicos e 5 perguntas frequentes', () => {
    expect(TOPICOS_AJUDA.length).toBeGreaterThanOrEqual(8);
    expect(PERGUNTAS_FREQUENTES.length).toBeGreaterThanOrEqual(5);
    for (const p of PERGUNTAS_FREQUENTES) {
      expect(p.pergunta).toBeTruthy();
      expect(p.resposta).toBeTruthy();
    }
  });
});

describe('buscarAjuda', () => {
  const fixture: TopicoAjuda[] = [
    {
      id: 'falso',
      titulo: 'Tópico falso',
      icon: '🧪',
      tags: ['zebra'],
      slides: [{ titulo: 'Slide zebra', texto: 'Conteúdo com xícara' }],
    },
  ];

  it('retorna vazio para query vazia', () => {
    expect(buscarAjuda('')).toEqual([]);
    expect(buscarAjuda('   ')).toEqual([]);
  });

  it('acha por título do tópico', () => {
    const r = buscarAjuda('calendario');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((x) => x.topico.id === 'calendario')).toBe(true);
  });

  it('acha por termo exclusivo de um slide', () => {
    const r = buscarAjuda('boletim');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.topico.id === 'cardbo')).toBe(true);
  });

  it('acha sem acentos (relatorio → Relatórios)', () => {
    const r = buscarAjuda('relatorio');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((x) => x.topico.id === 'relatorios')).toBe(true);
  });

  it('acha pelo texto do slide e retorna o índice certo', () => {
    const r = buscarAjuda('xicara', fixture);
    expect(r).toHaveLength(1);
    expect(r[0].topico.id).toBe('falso');
    expect(r[0].slideIndex).toBe(0);
    expect(r[0].tituloSlide).toBe('Slide zebra');
  });

  it('acha por tag', () => {
    const r = buscarAjuda('parq');
    expect(r.some((x) => x.topico.id === 'alunos')).toBe(true);
  });

  it('limita a 30 resultados', () => {
    const r = buscarAjuda('a', fixture);
    expect(r.length).toBeLessThanOrEqual(30);
  });
});

describe('tourSteps (invariantes)', () => {
  it('tour de boas-vindas tem ids únicos e conteúdo', () => {
    const ids = new Set<string>();
    for (const p of TOUR_BOAS_VINDAS) {
      expect(p.id).toBeTruthy();
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.title).toBeTruthy();
      expect(p.content).toBeTruthy();
    }
  });

  it('NOVIDADES_POR_VERSAO tem passos não vazios', () => {
    for (const [versao, passos] of Object.entries(NOVIDADES_POR_VERSAO)) {
      expect(versao).toMatch(/^v?\d+\.\d+\.\d+$/);
      expect(passos.length).toBeGreaterThan(0);
      for (const p of passos) {
        expect(p.title).toBeTruthy();
        expect(p.content).toBeTruthy();
      }
    }
  });
});
