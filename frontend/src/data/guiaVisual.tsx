import type React from 'react';
import { DemoAlunosSelecionados, DemoDestino, DemoPreviaChamada, DemoAprovarAplicar } from '../components/guia/DemosGuia';

export type TipoGuia = 'boas-vindas' | 'novidades';

export type PlacementGuia = 'top' | 'bottom' | 'left' | 'right';

export interface PassoGuia {
  id: string;
  /** Seletor CSS do elemento a destacar. Ausente = cartão centralizado. */
  target?: string;
  /** Rota a abrir antes de exibir o passo. */
  rota?: string;
  /** Título curto do cartão. */
  title: string;
  /** Frase prática (uma ou duas linhas). */
  content: string;
  placement?: PlacementGuia;
  /** Demonstração com dados fictícios (usada quando o alvo real não existe). */
  demo?: React.ReactNode;
  /** Rótulo do progresso no cartão (padrão: o rotulo do guia). */
  rotuloProgresso?: string;
  /** O alvo real só existe quando a unidade tem transferências pendentes. */
  requerPendentes?: boolean;
}

export interface GuiaVisual {
  id: string;
  /** Versão do app que o guia descreve (define a elegibilidade). */
  versao: string;
  tipo: TipoGuia;
  /** Nome do guia no cartão (ex.: "Veja o que mudou"). */
  rotulo: string;
  passos: PassoGuia[];
}

/**
 * Guia de novidades da Transferência de nível (4 passos).
 * Textos e sequência baseados no protótipo visual do projeto.
 */
export const GUIA_NOVIDADES_TRANSFERENCIA: GuiaVisual = {
  id: 'transferencia-nivel',
  versao: 'v3.0.0',
  tipo: 'novidades',
  rotulo: 'Veja o que mudou',
  passos: [
    {
      id: 'selecione-no-grid',
      target: '[data-tour="botao-transferir"]',
      rota: '/alunos?modo=transferencia',
      title: 'Selecione no próprio grid',
      content:
        'Ao tocar em Transferir, marque os alunos na lista que você já usa.',
      placement: 'bottom',
      demo: <DemoAlunosSelecionados />,
    },
    {
      id: 'escolha-o-destino',
      target: '[data-tour="botao-escolher-destino"]',
      rota: '/alunos?modo=transferencia',
      title: 'Escolha a turma de destino',
      content:
        'A origem vem dos alunos marcados. Você escolhe o novo professor e a turma com horário.',
      placement: 'bottom',
      demo: <DemoDestino />,
    },
    {
      id: 'confira-a-formacao',
      target: '[data-tour="nav-transferencias-nivel"]',
      rota: '/transferencias-nivel',
      requerPendentes: true,
      title: 'Confira a formação das turmas',
      content:
        'A aba temporária aparece após a primeira programação. Confira a composição por professor, turma e horário.',
      placement: 'right',
      demo: <DemoPreviaChamada />,
    },
    {
      id: 'aplique-depois-da-virada',
      target: '[data-tour="lote-aprovar"]',
      rota: '/transferencias-nivel?aba=lotes',
      requerPendentes: true,
      title: 'Aplique após a virada',
      content:
        'O novo mês libera a confirmação. A chamada oficial recebe a nova composição após você aprovar.',
      placement: 'left',
      demo: <DemoAprovarAplicar />,
    },
  ],
};

/**
 * Boas-vindas: 9 passos preservados do tour atual, convertidos para o novo formato.
 */
export const GUIA_BOAS_VINDAS: GuiaVisual = {
  id: 'boas-vindas',
  versao: 'v1.0.0',
  tipo: 'boas-vindas',
  rotulo: 'Conheça o Fiz!',
  passos: [
    {
      id: 'boas-vindas',
      title: 'Bem-vindo ao Fiz! App 👋',
      content:
        'Vamos mostrar as principais funcionalidades. Você pode pular a qualquer momento e rever depois na Central de Ajuda.',
    },
    {
      id: 'menu',
      target: '[data-tour="sidebar"]',
      title: 'Menu lateral',
      content:
        'Aqui você navega entre as telas: Início, Chamadas, Alunos, Turmas e mais. No celular, arraste o menu para abrir ou fechar.',
      placement: 'right',
    },
    {
      id: 'chamadas',
      target: '[data-tour="filtros-chamada"]',
      rota: '/chamadas',
      title: '📝 Chamadas',
      content:
        'Escolha turma, professor e horário, e marque a presença clicando nas células: P (presente), F (falta), J (justificada).',
      placement: 'bottom',
    },
    {
      id: 'cardaula',
      target: '[data-tour="dia-chamada"]',
      rota: '/chamadas',
      title: '🌤️ CardAula (clima)',
      placement: 'bottom',
      content:
        'Dê 2 cliques (ou toque 2x) numa data para registrar a temperatura da água, a externa e o cloro. Se a água estiver fria, o app sugere cancelar ou justificar as aulas automaticamente.',
    },
    {
      id: 'cardbo',
      target: '[data-tour="botao-card-bo"]',
      rota: '/chamadas',
      title: '📋 Ocorrências (BO)',
      placement: 'bottom',
      content:
        'Os botões BO registram manutenção, problema climático ou afastamento de professor. O cancelamento se propaga sozinho para os dias da turma.',
    },
    {
      id: 'alunos',
      target: '[data-tour="grade-alunos"]',
      rota: '/alunos',
      title: '👥 Alunos',
      content:
        'Cadastre alunos, aloque em turmas em massa, acompanhe ParQ e atestados, e transfira alunos para outra turma.',
      placement: 'bottom',
    },
    {
      id: 'relatorios',
      rota: '/relatorios',
      title: '📊 Relatórios',
      content:
        'Acompanhe a frequência por aluno e por turma, o controle mensal e os cancelamentos do período.',
    },
    {
      id: 'config',
      rota: '/configuracoes',
      title: '⚙️ Configurações',
      content:
        'Exporte relatórios em XLSX (Frequência, Vagas, Cancelamentos), configure notificações, tema escuro e acesse a Central de Ajuda.',
    },
    {
      id: 'fim',
      title: 'Pronto! 🎉',
      content:
        'Guia concluído. Sempre que tiver dúvida, abra ❓ Ajuda no menu lateral. Bom trabalho!',
    },
  ],
};

export const GUIAS: GuiaVisual[] = [GUIA_BOAS_VINDAS, GUIA_NOVIDADES_TRANSFERENCIA];
