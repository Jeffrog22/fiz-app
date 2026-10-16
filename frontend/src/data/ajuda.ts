import { normalizeSearch } from '../utils/formatters';

export interface SlideAjuda {
  titulo: string;
  texto: string;
  dica?: string;
}

export interface TopicoAjuda {
  id: string;
  titulo: string;
  icon: string;
  tags: string[];
  slides: SlideAjuda[];
}

export interface PerguntaFrequente {
  pergunta: string;
  resposta: string;
}

export interface ResultadoBusca {
  topico: TopicoAjuda;
  slideIndex: number;
  tituloSlide: string;
}

export const TOPICOS_AJUDA: TopicoAjuda[] = [
  {
    id: 'primeiros-passos',
    titulo: 'Primeiros passos',
    icon: '🚀',
    tags: ['inicio', 'comecar', 'primeira vez', 'visao geral'],
    slides: [
      {
        titulo: 'O que é o Fiz! App',
        texto:
          'O Fiz! App é a lista de chamada da piscina: aqui você registra presença, falta e justificativas dos alunos, controla turmas, alunos eHorários, e exporta relatórios de frequência.',
      },
      {
        titulo: 'Navegue pelo menu',
        texto:
          'O menu lateral tem todas as telas: Início, Chamadas, Alunos, Turmas, Vagas, Exclusões, Relatórios e Calendário. No celular, arraste o menu para abrir ou fechar.',
        dica: 'Dúvidas? Clique em ❓ Ajuda no menu para abrir esta central.',
      },
      {
        titulo: 'Sua primeira chamada',
        texto:
          'Abra Chamadas, escolha o rótulo (ex.: Ter/Qui), o professor e oHorário. A grade mensal aparece: clique nas células para marcar P (presente), F (falta) ou J (justificada).',
        dica: 'As marcações são salvas automaticamente, sem botão de gravar.',
      },
      {
        titulo: 'Ajuste o que precisar',
        texto:
          'Em Configurações você encontra exportação XLSX, notificações push, tema escuro, zoom e o botão para refazer este tour.',
      },
    ],
  },
  {
    id: 'chamadas',
    titulo: 'Chamadas',
    icon: '📝',
    tags: ['chamada', 'presenca', 'falta', 'justificativa', 'grade', 'matriz', 'celula'],
    slides: [
      {
        titulo: 'Escolher a turma',
        texto:
          'Os filtros são em cascata: primeiro o rótulo (Ter/Qui, Qua/Sex...), depois o professor e oHorário. Só quando a tríplice está completa a grade aparece.',
        dica: 'Os filtros ficam salvos enquanto a aba estiver aberta — voltar para a tela não zera sua escolha.',
      },
      {
        titulo: 'Marcar presença, falta ou justificativa',
        texto:
          'Clique/toque na célula do aluno e do dia para alternar: vazio → P → F → J → vazio. Clicar em J abre o modal de justificativa com os motivos.',
        dica: 'Datas futuras e dias de feriado não podem ser marcados.',
      },
      {
        titulo: 'Navegar entre as turmas',
        texto:
          'Se o professor tem várias turmas no mesmo horário (ex.: jeftq01, jeftq02...), use as setas ◀ ▶ do topo para passar de uma para outra. O cabeçalho mostra "Turma X de Y".',
      },
      {
        titulo: 'Lançamento retroativo',
        texto:
          'Para marcar dias já passados, ative o interruptor "Lançamento retroativo". Sem ele, o app bloqueia datas anteriores a hoje para evitar erros.',
        dica: 'O bloqueio vale também depois das 21h — o app usa a data local, não a do servidor.',
      },
      {
        titulo: 'Limpar e desfazer',
        texto:
          'O botão Limpar tem duas opções: limpar o dia selecionado ou limpar tudo do período. Tudo que é limpo pode ser desfeito com o botão Desfazer (até 20 ações).',
      },
      {
        titulo: 'Feriados e eventos',
        texto:
          'Eventos do Calendário (feriado, ponte, reunião, evento, férias) aparecem coloridos na grade e bloqueiam a marcação daquele dia automaticamente.',
      },
    ],
  },
  {
    id: 'cardaula',
    titulo: 'CardAula (clima)',
    icon: '🌤️',
    tags: ['clima', 'temperatura', 'cloro', 'piscina', 'card aula', 'agua fria', 'sensacao'],
    slides: [
      {
        titulo: 'Abrir o CardAula',
        texto:
          'Dê 2 cliques (ou toque 2x) no cabeçalho de uma data na tela de Chamadas. O card mostra as temperaturas, o cloro e a sugestão do dia.',
      },
      {
        titulo: 'Registrar as medidas',
        texto:
          'Preencha temperatura externa, temperatura da piscina (arraste a roda ou use +/−) e o cloro (arraste o slider). As cores do cloro indicam a faixa ideal.',
        dica: 'As temperaturas salvas se repetem nas próximas aulas do mesmo dia — só altere o que mudou.',
      },
      {
        titulo: 'Sugestão automática',
        texto:
          'O app analisa clima, temperatura e cloro e sugere: Aula Normal, Aula Cancelada ou Falta Justificada, com o motivo na tela. Aceite a sugestão ou registre manualmente.',
      },
      {
        titulo: 'Água fria e iniciação',
        texto:
          'Turmas de Iniciação têm regra mais restritiva: abaixo de 28°C o app sugere cancelamento. Turmas com +16 anos recebem falta justificada em águas muito frias.',
      },
    ],
  },
  {
    id: 'cardbo',
    titulo: 'Ocorrências (BO)',
    icon: '📋',
    tags: ['bo', 'ocorrencia', 'cancelamento', 'manutencao', 'afastamento', 'reuniao', 'feriado'],
    slides: [
      {
        titulo: 'O que é o BO',
        texto:
          'O BO (Boletim de Ocorrência) registra motivos que afetam a aula: manutenção da piscina, problema climático, reunião, afastamento do professor e mais.',
        dica: 'Abra o BO pelo botão "BO" na tela de Chamadas, na data desejada.',
      },
      {
        titulo: 'Pessoal x Geral',
        texto:
          '"Pessoal/Professor" cancela só as aulas do professor escolhido. "Geral" cancela todas as turmas do horário (ex.: piscina fechada para todo mundo).',
      },
      {
        titulo: 'Compromete a aula ou o dia',
        texto:
          'Marque "Compromete a aula" para cancelar só a aula atual, ou "Compromete o dia" para cancelar todas as aulas daquele dia no horário.',
      },
      {
        titulo: 'Afastamento de vários dias',
        texto:
          'No tipo "Atestado / Afastamento", informe a quantidade de dias: o cancelamento é aplicado nos próximos dias úteis da turma automaticamente.',
        dica: 'O cancelamento pessoal via BO sobrescreve presenças já marcadas nesses dias.',
      },
      {
        titulo: 'Cancelar um BO',
        texto:
          'Para desfazer, abra o BO no dia e use "Limpar BO". As linhas de cancelamento daquele dia são removidas.',
      },
    ],
  },
  {
    id: 'alunos',
    titulo: 'Alunos',
    icon: '👥',
    tags: ['aluno', 'cadastro', 'alocacao', 'transferencia', 'parq', 'atestado', 'rematricula', 'duplicar'],
    slides: [
      {
        titulo: 'Cadastrar aluno',
        texto:
          'Em Alunos, clique em "Novo Aluno". Preencha nome, data de nascimento, contato e ParQ. Ao salvar, o modal fica aberto para cadastrar o próximo — gênero, turma e nível ficam preenchidos da última sessão.',
      },
      {
        titulo: 'Alocar em turma (em massa)',
        texto:
          'Clique em "Alocar" na barra de ferramentas: apenas os alunos pendentes aparecem. Selecione os alunos, escolha professor e turma, e confirme. A alocação cria o histórico de matrícula automaticamente.',
      },
      {
        titulo: 'Editar com Correção ou Transferência',
        texto:
          'Para alterar um aluno já matriculado, clique em ✏️ e escolha o motivo: "Correção" (mesma turma) ou "Transferência" (outra turma). Os campos só liberam após escolher o motivo.',
        dica: 'Isso mantém o histórico de progressão do aluno em dia.',
      },
      {
        titulo: 'ParQ e bloqueio de presença',
        texto:
          'Aluno sem ParQ não pode ser marcado no grid de chamada (célula bloqueada e nome destacado em âmbar). Regularize o ParQ no cadastro do aluno.',
      },
      {
        titulo: 'Transferir para outra unidade',
        texto:
          'Na aba Vagas/Transferências, selecione o aluno e a unidade destino. A intenção vai para a fila — a unidade destino aceita e o aluno é criado lá com todos os dados.',
      },
      {
        titulo: 'Rematrículas',
        texto:
          'Durante a janela de rematrícula configurada no Calendário, o modo "Rematrículas" em Alunos marca os alunos como re-matriculados sem mexer no histórico de nível.',
      },
    ],
  },
  {
    id: 'turmas',
    titulo: 'Turmas',
    icon: '📚',
    tags: ['turma', 'professor', 'horario', 'dias', 'label', 'duracao', 'lotacao'],
    slides: [
      {
        titulo: 'Chave da turma',
        texto:
          'Cada turma é identificada por rótulo (dias, ex.: Ter/Qui) + professor + horário. Duas turmas iguais no mesmo horário viram turmas diferentes (jeftq01, jeftq02...) e a chamada pagina entre elas.',
      },
      {
        titulo: 'Criar turma',
        texto:
          'Em Turmas, clique em "Nova Turma", selecione os dias da semana, o professor, o horário e a duração. O rótulo e o código da turma são gerados automaticamente.',
        dica: 'Ao editar uma turma, o código (grupo_id) não muda — só os dados.',
      },
      {
        titulo: 'Lotação',
        texto:
          'A coluna Lotação mostra quantos alunos têm vaga na turma e a capacidade máxima, com cor: verde (vagas), amarelo (perto do limite), vermelho (cheia).',
      },
    ],
  },
  {
    id: 'vagas',
    titulo: 'Vagas e Transferências',
    icon: '📦',
    tags: ['vagas', 'capacidade', 'transferencia', 'fila', 'unidade', 'aceitar'],
    slides: [
      {
        titulo: 'Vagas por horário',
        texto:
          'A tela Vagas mostra a lotação de todas as turmas organizadas por horário, com total de vagas e excesso no rodapé de cada bloco.',
      },
      {
        titulo: 'Transferências entre unidades',
        texto:
          'A aba Transferências tem 3 painéis: Fila (alunos que você enviou), Recebidas (intenções de outras unidades) e Histórico. Selecione alunos e a unidade destino para enviar.',
      },
      {
        titulo: 'Aceitar uma transferência',
        texto:
          'Na aba Recebidas, abra a intenção, escolha professor e turma na unidade e confirme. O aluno é criado com todos os dados e recebe histórico de transferência externa.',
        dica: 'O aluno da unidade de origem não é excluído — quem decide o próximo passo é o professor de lá.',
      },
    ],
  },
  {
    id: 'relatorios',
    titulo: 'Relatórios',
    icon: '📊',
    tags: ['relatorio', 'frequencia', 'percentual', 'historico', 'cancelamento', 'controle mensal'],
    slides: [
      {
        titulo: 'Frequência por aluno',
        texto:
          'A aba Frequência por Aluno mostra o percentual de presença de cada aluno no período. Clique no ícone do olho para ver o histórico completo com linha do tempo de turmas.',
      },
      {
        titulo: 'Frequência por turma',
        texto:
          'A aba Frequência por Turma resume a presença média de cada turma, útil para comparar horários e níveis.',
      },
      {
        titulo: 'Controle mensal',
        texto:
          'O Controle Mensal mostra, para cada professor, quantos dias e aulas já foram lançados no mês — ótimo para cobrir quem ainda não fez a chamada.',
      },
      {
        titulo: 'Painel de cancelamentos',
        texto:
          'Estatísticas de cancelamentos: total, motivos mais frequentes, níveis mais cancelados e evolução mensal. Filtre por motivo e nível.',
      },
    ],
  },
  {
    id: 'calendario',
    titulo: 'Calendário',
    icon: '📅',
    tags: ['calendario', 'periodo letivo', 'feriado', 'ponte', 'ferias', 'planejamento', 'evento'],
    slides: [
      {
        titulo: 'Período letivo',
        texto:
          'Defina o início e o fim do período: a tela de Chamadas gera os dias letivos a partir daí. A janela de rematrículas também é configurada aqui.',
      },
      {
        titulo: 'Eventos do calendário',
        texto:
          'Cadastre feriados, pontes, reuniões e eventos por dia. Eles aparecem coloridos no grid de Chamadas e bloqueiam a marcação daquele dia.',
        dica: 'Ao criar um evento, ele é aplicado automaticamente a todas as turmas afetadas.',
      },
      {
        titulo: 'Férias',
        texto:
          'Use "Aplicar férias" para bloquear automaticamente todos os dias úteis de um intervalo, e "Remover férias" para desfazer.',
      },
      {
        titulo: 'Planejamento (arquivos)',
        texto:
          'Envie PDFs, TXTs ou planilhas de planejamento das aulas — eles ficam guardados e podem ser baixados a qualquer momento.',
      },
    ],
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    icon: '⚙️',
    tags: ['configuracoes', 'exportar', 'xlsx', 'notificacao', 'tema', 'atualizar', 'zoom'],
    slides: [
      {
        titulo: 'Exportar em XLSX',
        texto:
          'No card Exportar, escolha Frequência, Vagas ou Cancelamentos, selecione professor/mês e baixe a planilha. O export de Frequência inclui o relatório mensal detalhado com clima.',
      },
      {
        titulo: 'Notificações push',
        texto:
          'Ative as notificações para receber lembretes de chamada. Em "Configurar horários" você define os dias e horários de cada professor.',
      },
      {
        titulo: 'Tema e acessibilidade',
        texto:
          'Alterne entre tema claro e escuro, e ajuste o zoom da interface (80% a 150%) na seção de Acessibilidade.',
      },
      {
        titulo: 'Atualizações',
        texto:
          'O card Atualizações verifica se há versão nova, mostra o que mudou e permite atualizar o app sem perder dados.',
        dica: 'Use "Hard Refresh" se algo parecer travado depois de uma atualização.',
      },
      {
        titulo: 'Tour e Ajuda',
        texto:
          'Neste mesmo card de Ajuda & Tutorial você pode refazer o tour de boas-vindas e abrir esta Central de Ajuda quando quiser.',
      },
    ],
  },
];

export const PERGUNTAS_FREQUENTES: PerguntaFrequente[] = [
  {
    pergunta: 'Como faço a chamada do dia?',
    resposta:
      'Abra Chamadas, escolha rótulo, professor eHorário, e clique nas células: P (presente), F (falta), J (justificativa). O clique alterna entre os status.',
  },
  {
    pergunta: 'Como cancelar uma aula?',
    resposta:
      'Abra o BO na data desejada, escolha o tipo de cancelamento (ex.: Manutenção/Incidente) e se compromete a aula ou o dia. O cancelamento se propaga automaticamente para os dias da turma.',
  },
  {
    pergunta: 'Como justificar a falta de um aluno?',
    resposta:
      'Clique na célula até virar J — o modal de justificativa abre com os motivos. Para atestado de vários dias, use "Atestado" e informe a quantidade de dias.',
  },
  {
    pergunta: 'Como marcar afastamento do professor por vários dias?',
    resposta:
      'No CardBO, escolha o tipo "Atestado / Afastamento" (Pessoal/Professor) e informe a "Qtd. dias": o cancelamento cobre todos os dias de aula da turma no período.',
  },
  {
    pergunta: 'Como exportar a frequência do mês?',
    resposta:
      'Em Configurações › Exportar › Frequência: selecione o professor (e opcionalmente o rótulo), o mês e clique em Baixar XLSX.',
  },
  {
    pergunta: 'O app funciona sem internet?',
    resposta:
      'O app pode abrir offline (é instalável), mas as marcações dependem de conexão. Se ficar sem internet, um aviso vermelho aparece no topo — dados não salvos podem ser perdidos.',
  },
  {
    pergunta: 'Como ativar as notificações de chamada?',
    resposta:
      'Em Configurações › Notificações, ative o interruptor e permita as notificações do navegador. Depois configure os horários de cada professor.',
  },
  {
    pergunta: 'Como refazer o tour pelo app?',
    resposta:
      'Em Configurações › Ajuda & Tutorial, clique em "Fazer tour de boas-vindas".',
  },
];

/** Busca em tempo real nos títulos, tags e slides. Retorna no máx. 30 resultados. */
export function buscarAjuda(query: string, topicos: TopicoAjuda[] = TOPICOS_AJUDA): ResultadoBusca[] {
  const q = normalizeSearch(query.trim());
  if (!q) return [];
  const resultados: ResultadoBusca[] = [];
  for (const topico of topicos) {
    topico.slides.forEach((slide, i) => {
      const alvo = normalizeSearch(
        `${topico.titulo} ${topico.tags.join(' ')} ${slide.titulo} ${slide.texto} ${slide.dica ?? ''}`
      );
      if (alvo.includes(q)) {
        resultados.push({ topico, slideIndex: i, tituloSlide: slide.titulo });
      }
    });
  }
  return resultados.slice(0, 30);
}
