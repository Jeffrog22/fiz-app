import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseChangelog, filtrarSecoesResumidas, type ChangelogSecao } from '../changelog';

const FIXTURE = `# Changelog - Fiz! App

## [v2.85.0] - 2026-09-30
### Feat
- **Banner com botão de novidades**
  - Botão discreto no alerta de atualização
  - Modal com síntese do CHANGELOG
### Testes
- Parser coberto por fixtures

## [v2.84.1] - 2026-09-29
### Fix
- Correção simples sem sub-bullet

## [v0.0.1] - 2025-01-01
### Versões
- \`v0.0.1\`: primeiro registro
- linha solta sem seção anterior
`;

describe('parseChangelog', () => {
  it('separa versões, seções, itens e detalhes', () => {
    const versoes = parseChangelog(FIXTURE);

    expect(versoes).toHaveLength(3);
    expect(versoes[0]).toEqual({
      version: 'v2.85.0',
      date: '2026-09-30',
      secoes: [
        {
          titulo: 'Feat',
          itens: [
            {
              titulo: 'Banner com botão de novidades',
              detalhes: [
                'Botão discreto no alerta de atualização',
                'Modal com síntese do CHANGELOG',
              ],
            },
          ],
        },
        {
          titulo: 'Testes',
          itens: [{ titulo: 'Parser coberto por fixtures', detalhes: [] }],
        },
      ],
    });
  });

  it('aceita item sem negrito e sem sub-bullets', () => {
    const versoes = parseChangelog(FIXTURE);
    const fix = versoes[1];
    expect(fix.version).toBe('v2.84.1');
    expect(fix.secoes).toHaveLength(1);
    expect(fix.secoes[0].titulo).toBe('Fix');
    expect(fix.secoes[0].itens[0].titulo).toBe('Correção simples sem sub-bullet');
    expect(versoes[0].date).toBe('2026-09-30');
  });

  it('respeita o limite de versões (mais recentes primeiro)', () => {
    expect(parseChangelog(FIXTURE, 2).map((v) => v.version)).toEqual(['v2.85.0', 'v2.84.1']);
    expect(parseChangelog(FIXTURE, 100)).toHaveLength(3);
  });

  it('parseia o CHANGELOG real do projeto com invariantes estruturais', () => {
    const candidatos = [
      resolve(process.cwd(), 'CHANGELOG.md'),
      resolve(process.cwd(), '..', 'CHANGELOG.md'),
    ];
    const caminho = candidatos.find((c) => existsSync(c));
    expect(caminho, 'CHANGELOG.md não encontrado').toBeTruthy();
    const md = readFileSync(caminho!, 'utf-8');
    const versoes = parseChangelog(md);

    expect(versoes.length).toBeGreaterThanOrEqual(10);
    for (const v of versoes) {
      expect(v.version).toMatch(/^v?\d+\.\d+\.\d+$/);
      expect(v.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.secoes.length).toBeGreaterThan(0);
      expect(v.secoes.some((s) => s.itens.length > 0)).toBe(true);
    }
  });
});

describe('filtrarSecoesResumidas', () => {
  const secoes: ChangelogSecao[] = [
    { titulo: 'Fix', itens: [] },
    { titulo: 'Feat', itens: [] },
    { titulo: 'Adicionado', itens: [] },
    { titulo: 'Testes', itens: [] },
    { titulo: 'Testado (Fase 3)', itens: [] },
    { titulo: 'Testes e Build', itens: [] },
    { titulo: 'Testes Frontend', itens: [] },
    { titulo: 'Notas', itens: [] },
    { titulo: 'Nótas', itens: [] },
    { titulo: 'Testés', itens: [] },
  ];

  it('mantém Fix, Feat e demais seções de conteúdo', () => {
    expect(filtrarSecoesResumidas(secoes).map((s) => s.titulo)).toEqual([
      'Fix',
      'Feat',
      'Adicionado',
    ]);
  });

  it('remove Testes e Notas ignorando caixa e acentos', () => {
    const titulos = filtrarSecoesResumidas(secoes).map((s) => s.titulo);
    expect(titulos).not.toContain('Testes');
    expect(titulos).not.toContain('Testado (Fase 3)');
    expect(titulos).not.toContain('Testes e Build');
    expect(titulos).not.toContain('Testes Frontend');
    expect(titulos).not.toContain('Notas');
    expect(titulos).not.toContain('Nótas');
    expect(titulos).not.toContain('Testés');
  });

  it('não muta o array original', () => {
    const copia = secoes.map((s) => s.titulo);
    filtrarSecoesResumidas(secoes);
    expect(secoes.map((s) => s.titulo)).toEqual(copia);
  });

  it('retorna vazio quando todas as seções são ocultas', () => {
    expect(filtrarSecoesResumidas([
      { titulo: 'Testes', itens: [] },
      { titulo: 'Notas', itens: [] },
    ])).toEqual([]);
  });
});
