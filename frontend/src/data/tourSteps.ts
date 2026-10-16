export interface PassoTour {
  id: string;
  /** Seletor CSS do elemento a destacar (desktop). Ignorado quando centralizado. */
  target?: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Força card centralizado (usado no mobile e em passos informativos). */
  centralizado?: boolean;
  /** Rota a navegar antes de exibir o passo. */
  route?: string;
}

export const TOUR_BOAS_VINDAS: PassoTour[] = [
  {
    id: 'boas-vindas',
    centralizado: true,
    title: 'Bem-vindo ao Fiz! App 👋',
    content:
      'Vamos fazer um tour rápido pelas principais funcionalidades. Você pode pular a qualquer momento e refazer depois em Configurações › Ajuda & Tutorial.',
  },
  {
    id: 'menu',
    target: '[data-tour="sidebar"]',
    title: 'Menu lateral',
    content:
      'Aqui você navega entre as telas: Início, Chamadas, Alunos, Turmas e mais. No celular, arraste o menu para abrir ou fechar.',
  },
  {
    id: 'chamadas',
    route: '/chamadas',
    centralizado: true,
    title: '📝 Chamadas',
    content:
      'Escolha turma, professor e horário, e marque a presença clicando nas células: P (presente), F (falta), J (justificada). Use ◀ ▶ para passar entre as turmas do mesmo horário.',
  },
  {
    id: 'cardaula',
    route: '/chamadas',
    centralizado: true,
    title: '🌤️ CardAula (clima)',
    content:
      'Dê 2 cliques (ou toque 2x) numa data para registrar a temperatura da água, a externa e o cloro. Se a água estiver fria, o app sugere cancelar ou justificar as aulas automaticamente.',
  },
  {
    id: 'cardbo',
    route: '/chamadas',
    centralizado: true,
    title: '📋 Ocorrências (BO)',
    content:
      'Os botões BO registram manutenção, problema climático ou afastamento de professor. O cancelamento se propaga sozinho para os dias da turma.',
  },
  {
    id: 'alunos',
    route: '/alunos',
    centralizado: true,
    title: '👥 Alunos',
    content:
      'Cadastre alunos, aloque em turmas em massa, acompanhe ParQ e atestados, e transfira alunos para outra unidade.',
  },
  {
    id: 'relatorios',
    route: '/relatorios',
    centralizado: true,
    title: '📊 Relatórios',
    content:
      'Acompanhe a frequência por aluno e por turma, o controle mensal e os cancelamentos do período.',
  },
  {
    id: 'config',
    route: '/configuracoes',
    centralizado: true,
    title: '⚙️ Configurações',
    content:
      'Exporte relatórios em XLSX (Frequência, Vagas, Cancelamentos), configure notificações, tema escuro e acesse esta Central de Ajuda.',
  },
  {
    id: 'fim',
    centralizado: true,
    title: 'Pronto! 🎉',
    content:
      'Tour concluído. Sempre que tiver dúvida, abra ❓ Ajuda no menu lateral. Bom trabalho!',
  },
];

/**
 * Mini-tours de novidades por versão. A cada release com feature marcante,
 * adicione aqui 2-4 passos — quem já fez o tour vê esse guia 1x após atualizar.
 * Ex.: 'v2.92.0': [ { id: '...', centralizado: true, title: '...', content: '...' } ]
 */
export const NOVIDADES_POR_VERSAO: Record<string, PassoTour[]> = {
  'v2.91.0': [
    {
      id: 'novidade-ajuda',
      centralizado: true,
      title: '❓ Central de Ajuda',
      content:
        'Novidade! Agora há uma Central de Ajuda com busca: clique em ❓ Ajuda no menu lateral para ver passo a passo de cada funcionalidade e perguntas frequentes.',
    },
    {
      id: 'novidade-tour',
      centralizado: true,
      title: '🚀 Tour de boas-vindas',
      content:
        'Também chegou o tour guiado pelas telas do app. Você pode refazê-lo quando quiser em Configurações › Ajuda & Tutorial.',
    },
  ],
};
