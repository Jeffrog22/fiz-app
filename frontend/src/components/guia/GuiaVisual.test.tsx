// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuiaVisual from './GuiaVisual';

const estado = vi.hoisted(() => ({
  guia: { rotulo: 'Conheça o Fiz!', passos: [
    { id: 'um', title: 'Primeiro passo', content: 'Orientação', target: '#alvo-teste' },
    { id: 'dois', title: 'Segundo passo', content: 'Outra orientação' },
  ] },
  indice: 0, temPendentes: false,
  avancar: vi.fn(), voltar: vi.fn(), pular: vi.fn(), encerrar: vi.fn(),
}));
vi.mock('../../hooks/useGuiaVisual', () => ({ useGuiaVisual: () => estado }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

test('mantém o cartão quando o alvo demora a aparecer e ignora repetição de tecla', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  Element.prototype.scrollIntoView = vi.fn();
  render(<MemoryRouter><GuiaVisual /></MemoryRouter>);
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true });
  expect(estado.avancar).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(estado.avancar).toHaveBeenCalledTimes(1);
  const alvo = document.createElement('button');
  alvo.id = 'alvo-teste';
  document.body.appendChild(alvo);
  await waitFor(() => expect(alvo.scrollIntoView).toHaveBeenCalled());
  expect(screen.getByRole('dialog')).toBeTruthy();
  alvo.remove();
});
