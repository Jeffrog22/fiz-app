# Fiz! - Lista de Chamada

## 1. Login

### 1.1. Layout da Tela

*   **Nome do app:** Exibido no topo.
*   **Acesso rápido:** Chips buttons com nomes de professores que já possuem hash salvo.
    *   Aparece apenas se houver pelo menos um hash salvo.
    *   Ordenação: último acesso (mais recente primeiro).
    *   **Ao clicar:**
        *   Desmarca checkbox "Primeiro acesso" (se estiver marcado).
        *   Autentica automaticamente e redireciona para Home (Tela Inicial).
*   **Campos:**
    *   Professor (editável/disabled dependendo do fluxo).
    *   Unidade (não editável, identificada automaticamente pelo domínio).
    *   Primeiro acesso/Novo cadastro (Checkbox).
*   **Botão "Entrar":**
    *   Dispara o fluxo de autenticação ou primeiro acesso.

#### 1.1.1. Fluxo de Primeiro Acesso (Checkbox Marcado)

*   **Ao marcar "Primeiro acesso":**
    *   Campo Professor fica editável.
    *   Aparece campo para upload do arquivo CSV.
        *   Ex: `- Arquivo base (.csv): [Escolher arquivo] nenhum arquivo selecionado`.
    *   **Geração de ID Professor Automático:**
        *   A função deve receber dois parâmetros: o nome cadastrado (string) e uma lista de IDs que já existem no banco de dados (list).
        *   **Higienização:** Converta o nome para minúsculas, remova acentos, caracteres especiais e todos os espaços (nomes compostos devem ser colados, ex: "Ana Paula" vira "anapaula").
        *   **Regra Padrão:** Extraia as 3 primeiras letras do nome higienizado. Se esse ID não estiver na lista de IDs existentes, retorne-o.
        *   **Regra de Colisão 1 (Correr o nome):** Se houver duplicidade, mantenha as 2 primeiras letras fixas. Avance letra por letra pelo restante do nome higienizado, substituindo a 3ª letra, até encontrar uma combinação que não esteja na lista de IDs existentes.
        *   **Regra de Colisão 2 (Letras de escape):** Se o nome terminar e o ID continuar duplicado, mantenha as 2 primeiras letras fixas e tente substituir a 3ª letra pelas letras "X", "W", "Y" e "Z", nesta ordem, até encontrar uma livre.
    *   Salva hash, ID Professor e Unidade no backend.
    *   Atalho do professor aparece na lista de acesso rápido a partir do próximo login.

*   **Regras:**
    *   Upload do CSV é obrigatório apenas quando não houver nenhum hash salvo no sistema (primeiro professor da unidade).
    *   Para os demais professores, o primeiro acesso apenas gera o hash sem necessidade de CSV.
    *   CSV deve seguir template oficial (`'nome do arquivo'`).
    *   **Processamento bem-sucedido:**
        *   Popula tabelas.
        *   Gera hash da combinação professor + unidade.
        *   Redireciona para Home (Tela Inicial).
    *   Checkbox fica habilitado, mas desmarcado por padrão.
    *   Mensagem de alerta, caso 'Arquivo base' já existente. Se confirmada a substituição, os dados anteriores podem sofrer graves alterações.
*   **Erros de CSV:**
    *   "Arquivo inválido. Use o template oficial."
    *   "Coluna X não encontrada no arquivo."

#### 1.1.2. Fluxo de Login Normal (Checkbox Desmarcado)

*   Carrega lista de Acesso Rápido.
*   Campo Professor não editável.
*   **Autenticação:**
    *   Sistema envia professor + unidade para backend.
    *   Backend busca hash correspondente.
    *   Hash válido ? gera JWT ? redireciona para Home (Tela Inicial).
    *   Hash inválido ? exibe mensagem de erro.

#### 1.1.3. Modo Admin (Oculto)

*   **Ativação:**
    *   Mobile: 4 toques rápidos na tela de login.
    *   Desktop: Ctrl + Alt + A.
*   **Ao ativar:**
    *   Mensagem discreta: "Modo administrador ativado".
    *   Aparece "Painel Admin" no menu Mais Opções.
*   **Painel Admin:**
    *   Reset de hashes.
    *   Ativar/Desativar: [Modo Dev] - (Debug e logs de erros).
    *   [Resetar banco de dados] -- (ALERTA SEVERO).

### 1.2. Modo de Dev (Debug e Análise de Erros)

*   Aplica-se globalmente (todas as telas do app, não apenas na aba 'Chamadas').
*   **Ao ativar o modo Dev:**
    *   Surge um painel flutuante recolhível (canto inferior direito, ícone ??). O painel contém abas:
        *   **Estado (Application State):**
            *   Exibe o estado global da aplicação (store: Context/Zustand/Redux) em JSON formatado.
            *   Inclui campo de busca no JSON e botões "Copiar estado" e "Exportar para arquivo".
        *   **Logs:**
            *   Lista os últimos 50 eventos de ação do usuário, chamadas de API e erros.
            *   Cada log exibe timestamp, tipo e detalhes.
        *   **Sincronia (Sync State):**
            *   Mostra timestamp do último sync (formato ISO 8601 + diferença em segundos).
            *   Indica status da última operação (sucesso/erro) e mensagem de erro, se houver.
            *   Botão "Sincronizar agora" força a reinvalidação do cache local e dispara refresh global de todos os stores (não só do grid de chamadas).
        *   **Requisições (Network):**
            *   Exibe as últimas requisições fetch/axios com método, URL, payload e resposta.
            *   Permite repetir a requisição manualmente para testes.
        *   **Erros:**
            *   Captura exceções não tratadas (`window.onerror` + ErrorBoundary React).
            *   Mostra stack trace e contexto do erro.
        *   **Console:**
            *   Redireciona `console.log`, `console.warn`, `console.error` para uma área interna.
            *   Evita poluição do console nativo.
*   **Regras de segurança e sanitização:**
    *   Em produção, o modo Dev só funciona se `REACT_APP_ALLOW_DEV_MODE=true` estiver definido.
    *   Todos os dados exibidos (PKs, nomes, etc.) são mantidos, mas recomenda-se aplicar sanitização opcional (ex: ocultar e-mail ou telefone completo via função de anonimização).
    *   Logs de erro podem ser enviados a um endpoint interno `/api/logs/errors` apenas quando modo Dev ativo e usuário admin.
*   **Implementação sugerida:**
    *   Criar `DevContext.tsx` para gerenciar estado do modo Dev.
    *   Usar interceptor Axios para registrar requisições na aba Network.
    *   Utilizar hook personalizado `useDevLog(eventName, data)` para registrar eventos.
*   **Observação:** O painel de debug fica visível em todas as rotas, garantindo rastreabilidade de erros e estado mesmo ao alternar entre Chamadas, Alunos, Turmas, Relatórios, etc.

### 1.3. Sessão e Persistência

*   **Armazenamento:**
    *   Frontend: `localStorage` (professor, unidade, hash, `primeiro_acesso`).
    *   Backend: JWT em cookie httpOnly (expira 24h).
    *   Refresh token: a cada 2 horas.
*   **Logout:**
    *   Botão "Sair" no menu Mais Opções.
    *   Limpa `localStorage` + invalida JWT.
    *   Mantém hashes no backend (atalhos continuam).
*   **Timeout:**
    *   8 horas sem ação ? logout automático.
    *   Apenas remove JWT (não afeta hashes).

### 1.4. Mensagens de Erro

*   Professor vazio: "Preencha o nome do professor".
*   CSV não enviado: "Arquivo CSV obrigatório no primeiro acesso".
*   CSV inválido: "Arquivo inválido. Use o template oficial.".
*   Hash não encontrado: "Nenhum cadastro encontrado. Marque 'Primeiro acesso'.".
*   Sessão expirada: "Sessão expirada. Faça login novamente.".

### 1.5. Regras de Segurança

*   Rate limiting: 5 tentativas/min por IP.
*   Auditoria: tabela `logs_acesso` (timestamp, professor, unidade, status, ip).
*   Hash: `SHA256(professor + unidade + timestamp + salt)`.

## 2. Menu Principal

### 2.1. Estrutura do Menu (Abas)

*   Chamadas
*   Alunos
*   Turmas
*   Mais opções
    *   Calendário/Planejamento
    *   Exclusões
    *   Relatórios
    *   Vagas
    *   Sair

### 2.2. Tela Inicial: Home

*   **Mobile:** Menu Principal expandida, com interação por deslize e botão de recolher/abrir.
*   **Desktop:** Tela expandida com ícones temáticos grandes do Menu Principal e ícones menores de Mais Opções, com side bar e botão recolher/abrir.

### 2.3. Sistemas Padronizados (Top Bar)

*   **Top Bar (Header de Sessão):**
    *   Nome da unidade em fonte grande, alinhada à esquerda.
    *   Versão estável do build (ex: v.04.01-b).
    *   Identificação do usuário logado ("Conectado: Jefferson").
    *   Localização contextual ("Unidade/Piscina: Bela Vista").
    *   Indicadores de acessibilidade (ajuste de zoom %/fonte A- e A+).
    *   **Informações sobre o Clima:**
        *   Posicionamento na extremidade direita da Top Bar, antes das informações de Session State.
        *   Layout horizontal, compacto e em linha (flexbox).
        *   **Componentes Visuais:**
            *   **Ícone Climático Dinâmico:** Condicional baseado no status (ex: Sol, Nuvem com chuva).
            *   **Badge de Temperatura:** Texto destacado (ex: `24°C`), com peso médio.
            *   **Label de Condição:** Texto amigável em português (ex: 'Parcialmente Nublado'), fonte menor e cor cinza suave.
        *   **Comportamento Responsivo:**
            *   **Skeleton Loader:** Enquanto aguarda o fetch, exibe um bloco cinza pulsante.
            *   **Mobile Adaptation:** Oculta a string da condição em telas menores, mantendo apenas ícone e temperatura.
            *   **Fallback Discreto:** Em caso de falha, exibe ícone de nuvem com traço e `--°C`, sem modais de erro.

#### 2.3.1. Sistema de Zoom Proporcional (Responsividade Total)

*   **Scroll Vertical:** Scroll nativo (document/body).
*   **Scroll Horizontal (Container da Matriz):** Container com `overflow-x-auto` para rolagem lateral.
*   **Motor de Escala Global (React State/Context):**
    *   Gerenciador de estado (Context API ou Zustand) para controlar o nível de zoom.
    *   Altera a propriedade `font-size` (em `%`) do elemento raiz (`html`).
    *   Lógica de incremento/decremento (passos de 10%, de 80% até 200%).
    *   Persistência no `localStorage`.
*   **Refatoração para REM:**
    *   Substituir todos os valores fixos em pixels por unidades `rem` para garantir a escalabilidade proporcional.
*   **Componente AccessibilityToolbar:**
    *   Barra superior com botões "-A", "Padrão" e "+A".
    *   Fixada no topo (`sticky top-0 z-50`).

### 2.4. Sistema de Busca

*   **Busca Global:** Input de texto com ícone de lupa.
    *   Funcionalidade Live Search (Search-as-you-type).
    *   Insensível a acentos e maiúsculas.
    *   Clearable input para limpar.
    *   Implemente Fuzzy Search e Prevent Trigger on Backspace.
    *   Debouncing de 300ms.

### 2.5. Grid, Filtros e Ordenação

*   **Grid:**
    *   Estilo 'Zebra' (linhas alternadas).
    *   Scroll e headers Sticky.
    *   **Clear All Filters Trigger:**
        *   Ícone de 'X' (Clear Icon) no canto superior direito do Grid, alinhado à linha dos headers.
        *   Condicional: aparece apenas se houver filtro ativo ou texto na busca.
        *   Ao clicar, dispara um Reset State (limpa busca global, dropdowns e restaura ordenação padrão).
        *   Tooltip: 'Remover todos os filtros'.
*   **Filtros:**
    *   Sistema de Filtros por Coluna (Excel-like).
    *   Filtros cumulativos.
*   **Ordenação:**
    *   Ordenação Multicoluna Avançada (Stable Multi-sort).
    *   Estável: ao ordenar uma segunda coluna, a ordem da primeira é mantida como critério secundário.

### 2.6. Máscaras de Entrada

*   Placeholder "somente os números" nos campos.
*   Shake Effect e Border Color vermelha ao detectar entrada inválida + Toast Notification.
*   Input Sanitization (Auto-fill, Format Stripping, OnPaste) para Data, Horário e Contato.
*   **Horário:** Input de 4 dígitos `0000` com máscara de hora (`00:00`). Validação de 00:00 à 23:59.
*   **Data:** Input de 8 dígitos `00000000` com máscara de data padrão BR (`dd/mm/aaaa`).
*   **Contato:** Input de 11 dígitos `00000000000` com máscara de telefone `(##) #####-####`. Implementar link para WhatsApp Web (`https://wa.me/55...`).

## 3. Turmas (Menu Principal)

### 3.1. Sistema de Criação de Grupos

*   Combinação de dias da semana, horários e professor.
*   Determinação do nível, capacidade máxima e faixa etária.
*   Grid com grupos montados em colunas, com sistema de filtro, ordenação e botões de ação.
*   **Criação de Turma (Botão '+ Turma'):**
    *   Modal painel rápido.
    *   **Chips de dias da semana:** `S|T|Q|Q|S` (múltipla seleção). Preenchimento automático do campo 'turma label'.
    *   Turma label (disabled input).
    *   Horário (máscara "00:00", validação de hora).
    *   Professor (dropdown com lista de professores cadastrados).
    *   Nível, Capacidade e Faixa etária (especificações do grupo).
    *   Botões 'salvar' e 'cancelar'.
*   **Grupo ID:** Chave tríplice: `Turma label/horario/professor`.
    *   Geração automática: `ID Professor + iniciais dos dias + índice sequencial`.
    *   Ex: Terça e Quinta, 0800, Jefferson -> `jeftq01`.

### 3.2. Buscador de Turma

*   Sistema de Busca Global (exclusivo para: 'turma', 'professor' e 'nível').

### 3.3. Colunas do Grid da aba 'Turmas'

*   **Turma:** Label com tooltip do Grupo ID.
*   **Horário**
*   **Professor**
*   **Nível**
*   **Faixa etária**
*   **Lotação:** Capacidade máxima vs. quantidade de alunos alocados no grupo.
    *   Ex: `0/5` (s/ background), `5/5` (background amarelo), `6/5` (background vermelho).
*   **Ações:**
    *   Ícone calendário: Atalho para a aba 'Chamadas'.
    *   Ícone editar: Abre grupo no painel rápido para edição (nível, capacidade, faixa etária).
    *   Ícone lixeira: Exclui o grupo permanentemente (com alerta sobre alunos pendentes).

## 4. Alunos (Menu Principal)

### 4.1. Lista de Alunos

*   Disposta em grid, carregados do arquivo base ou adicionados pelo app.
*   ID automático gerado pelo sistema.
*   Sistema de busca por nome, nível, idade, categoria ou professor.
*   Grid com sistema de ordenação.

### 4.2. Barra de Ferramentas Superior

*   Busca Global padrão do app.
*   Botão de ação '+ Aluno' (abre modal Alunos com campos editáveis).

### 4.3. Headers do Grid

*   **Nome:** Tooltip "clique para editar".
    *   **Ao clicar:** Abre modal com dados do aluno (disabled input).
    *   Botão 'editar' habilita edição dos campos.
    *   **Chips condicionais:**
        *   **Correção:** Corrige dados sem alterar histórico de presenças.
        *   **Transferência:** Transfere o aluno de grupo, encerrando ciclo de presença atual e iniciando novo.
*   **Nível**
*   **Idade**
*   **Categoria**
*   **Turma**
*   **Horário**
*   **Professor**

### 4.4. Campos do Card/Modal 'Alunos'

*   **Nome**
*   **Data Nascimento** (padrão app)
*   **Gênero:** Masculino; Feminino; Não binário (dropdown)
*   **Contato** (padrão app)
*   **Turma** (dropdown - somente turmas disponíveis)
*   **Horário** (dropdown - somente horários disponíveis)
*   **Professor** (radio button - somente nomes disponíveis)
*   **Nível** (dropdown - somente níveis disponíveis)
*   **Categoria:** (disabled input - cálculo automático).
*   **ParQ "Apto para atividade física?":** Sim; Não (radio button).
*   **Possui Atestado Médico?** (checkbox): condicional, abre input de data.

### 4.5. Lógica de Cálculo Automático

*   **Nível:** Carregado pelo ID do aluno.
*   **Idade:** Calculado pela data de nascimento.
*   **Categoria:** Calculada pela fórmula baseada na idade (tabela de 0 a 80+).

### 4.6. Sistema de Filtros e Ordenação

*   **Filtros:** Menus dropdown (Select) nos headers das colunas 'Nível', 'Categoria', 'Turma' e 'Horário'.
*   **Ordenação:** Stable Multi-sort, padrão do app.

### 4.7. Botões de Ação

*   **Ícone calendário:** Atalho para a aba 'Chamadas'.
*   **Ícone lixeira:** Exclui aluno. Abre modal com motivos (chips): falta, desistência, transferência, documentação.
    *   Remove o aluno do grupo atual e envia para a lista de 'Exclusões' no sub-menu Mais Opções.

## 5. Chamadas (Menu Principal)

### 5.1. Painel de Gestão de Dados e Chamada

*   Cards estruturados para seleção dos grupos (tríplice combinação: turma, professor, horário).
*   Grid de registros de presença em tempo real com regras específicas.

### 5.2. Arquitetura de UI

*   **Cascading Dropdowns:** Filtros superiores (Turma, Professor, Horário, Nível) com lógica hierárquica.
*   **Read-Only Input:** Campo "Nível" (disabled/read-only), inferido automaticamente.
*   **Contextual Control Panel:** Bloco de manipulação temporal com seletor de competência (`mmm/aaaa`) e Checkbox "Permitir lançamento retroativo".

### 5.3. Lógica do Grid de Chamada

#### 5.3.1. Dynamic Matrix Grid

*   **Eixo Y (Linhas):** Alunos.
    *   **Utility Function - `formatarNomeMobile(nomeCompleto: string)`:**
        *   **Caso Padrão:** Primeiro Nome + Último Sobrenome (ex: "Jefferson Roberto Costa" -> "Jefferson Costa").
        *   **Regra de Preposição:** Mantém preposições (`de`, `da`, `do`) antes do último sobrenome (ex: "Maria Augusta da Silva" -> "Maria da Silva").
        *   **Regra de Nome Composto:** Primeiro Nome + Segundo Nome + Último Sobrenome (com preposição, se houver) (ex: "João Pedro Soares dos Santos" -> "João Pedro dos Santos").
        *   **Edge Cases:** Se a string original contiver apenas 1 ou 2 palavras, retorna a string original.
        *   **Algoritmo:** `trim()`, `split(' ')`, extrai primeira palavra, avalia segunda, extrai última e penúltima (para preposição).
*   **Eixo X (Colunas):** Dias letivos do mês.
    *   **Date Headers:** Clique simples dispara ações baseadas em logs existentes.
    *   **Primeiro log do dia:** Ação de 'clique espera' abre cardLog com dois estados: "Aula" / "Ocorrência".

#### 5.3.2. Lógica de cardAula (Registro de Aula)

*   **Integração com o Módulo de Clima.**
*   **Entrada de Dados:**
    *   Temperatura Externa (°C)
    *   Temperatura Piscina (°C)
    *   Cloro (ppm): Slider (0-7, a cada 0,5)
    *   Sensação: Chips/Badges (Calor, Abafado, Seco, Agradável, Vento, Frio).
*   **Engine de Sugestão (Status Sugerido):**
    *   **Filtro 1 (Clima e Sensação):**
        *   Se sensações incluir "frio" ou "frio+vento" -> `FALTA JUSTIFICADA` (Motivo: Frio).
        *   Se condicao_clima em grupo de veto absoluto -> `FALTA JUSTIFICADA` (Motivo: condicao_clima).
        *   Se condicao_clima dinâmica e sensação não permitida -> `FALTA JUSTIFICADA`.
        *   Se permitido -> `AULA NORMAL` e passa para Filtro 2.
    *   **Filtro 2 (Temperatura da Piscina):**
        *   Se `temp_piscina < 28.0` -> `FALTA JUSTIFICADA` (Motivo: Água fria).
        *   Se `temp_piscina < 26.0` -> `FALTA JUSTIFICADA` (Motivo: Água muito fria).
        *   Se `temp_piscina >= 28.0` -> passa para Filtro 3.
    *   **Filtro 3 (Cloro):**
        *   Se `cloro_ppm < 1.0` ou `> 5.0` -> `FALTA JUSTIFICADA` (Motivo: Parâmetros de Cloro Inadequados).
        *   Se dentro da faixa -> `AULA NORMAL` (Motivo: null).
*   **Fluxo e Interface:** Cálculo instantâneo a cada alteração. Estado inicial processado ao abrir o modal.

#### 5.3.3. Lógica de cardBO (Ocorrência - CRUD de Incidentes)

*   **Tipos de Escopo:**
    *   **Checkbox "Pessoal/Professor":** Marcar abre `select_pessoal`, senão `select_geral`.
    *   **Radio button:**
        *   "Compromete a aula": Afeta apenas aquela turma/horário.
        *   "Compromete o dia": Aplica o status para todas as turmas daquela data.
    *   **Select (Tipo):**
        *   `select_geral`: Manutenção/Incidente, Raios e Trovões, Reunião.
        *   `select_pessoal`: Médico/particular/trabalho, Reunião, Secretaria.
    *   **Textarea (Detalhes):** Descritivo livre.

#### 5.3.4. Lógica do Motor Climático

*   **Normalização do retorno numérico e fallback:**
    *   Se o token/dados falharem, aplica fallback: "Parcialmente Nublado" e chips vazios `[]`.
    *   **Temperatura:** Fallback padrão de 26.0°C se a API falhar.
        *   Se `temp < 15.0°C` -> injeta tag 'Frio' -> `FALTA JUSTIFICADA` (Motivo: Frio).
        *   Se `temp < 10.0°C` -> tag 'Frio' -> `FALTA JUSTIFICADA` (Motivo: Frio Intenso).
    *   **Condição Climática:** Tabela de busca baseada em WMO Code.
        *   **Grupo Dinâmico (depende de chip):** Céu limpo, Principalmente limpo, Parcialmente nublado.
        *   **Veto Absoluto (Força Falta Justificada):** Nublado, Névoa seca, Nevoeiro/geada, Chuvisco, Chuva, Pancadas de chuva, Tempestade.

#### 5.3.5. Mecanismo de Registros e Logs Diários

*   **Arquivo:** `logs_diarios.json` (mapeia data -> array de slots por horário).
*   **Dados:** Data, grupo_ID, indice, horario, nivel, professor, status da aula, motivo, condicao_clima, ocorrencia, tipo_select, tipo_ocorrencia, Temperaturas, Cloro.
*   **Regras e Algoritmos:**
    *   **Índice Sequencial:** Toda inserção de log é atrelada a um `indice_aula`.
    *   **Extrapolação de Logs (Cascateamento):** Log com `extrapolar: true` preenche automaticamente índices subsequentes. Cessa se encontrar registro `origem: "manual"`.
    *   **Resolução de Conflitos (LWW):** Last-Write-Wins. `select_geral` anula registros individuais.
    *   **Registro Retroativo:** Aceita gravação em datas passadas. Protege índices manuais pré-existentes, exceto se o novo bloco tiver maior precedência hierárquica.

#### 5.3.6. Lógica de Cancelamento de Aulas

*   **Gatilhos de Disparo:**
    1.  **Via Ocorrência (cardBO):** "Falta Particular/Médica do Professor", "Manutenção Emergencial", "Raios e Trovões", "Incidente Crítico". `select_geral` extrapola; `select_pessoal` exclusivo.
    2.  **Via Interface de Aula (cardAula):**
        *   `Temp Piscina < 28.0` + nível "INICIAÇÃO".
        *   `Temp Piscina < 25.0` (exceto faixa etária "> 16 anos").
        *   `Temp Piscina < 23.0`.
        *   `Cloro = 0,0` (disparar sugestão de cardBO).
*   **Retenção de Estado:** Permite reescrita de logs. Em alterações retroativas, ordena os logs do dia para respeitar a ordem cronológica.

#### 5.3.7. Registros de Presença (Tri-State)

*   **Status de Três Estados:**
    1.  Verde (Check) - Presença.
    2.  Vermelho (X) - Falta.
    3.  Amarelo (Traço) - Justificativa.
    4.  Cinza Claro (vazio) - Estado inicial.
*   **Action Column:**
    *   **Histórico:** Relatório de assiduidade do aluno no grupo atual e geral, com histórico de permanência.
    *   **Anotações:** Modal de justificativas (adiciona e registra justificativas manuais). Inputs: Lista de seleção (motivo), Numérico (dias), Texto (descrição).
    *   **Exclusão:** Botão condicional (abre após 3 faltas no mês). Envia aluno para lista de exclusão com motivo 'falta'.
*   **Capacity Counter:** Rodapé do grid ("Lotação/capacidade (da turma): 5/8").

#### 5.3.8. Sistema de Notas por Aluno

*   **Gatilho:** Clique no nome do aluno no Grid.
*   **Modal:** Input Text/TextArea com placeholder 'Escreva e tecle Enter...' e lista de anotações.
*   **Persistência:** Enter salva a nota. Ícone 'X' para excluir.
*   **Destaque Condicional:** Fundo do nome do aluno em azul se houver anotações ativas.

### 5.4. Lógica de Persistência e Paginação

*   **Pagination/Step Controls:** Botões "Anterior" e "Próximo" controlam `indice_aula`, alterando seletores de horário e turma label.
*   **Desfazer:** Desfaz até 10 inputs sequenciais.
*   **State Resets ("Limpar"):** Limpa registros do mês selecionado ou do dia ativo.
*   **Form Submission ("Salvar Chamada"):** Botão primário (Verde) que executa persistência final via Bulk Update.

### 5.5. Sistema de Salvamento Automático

*   **Gatilhos:** Clique nos botões de presença e `OnBlur`/Debounce de 1000ms nas anotações.
*   **Indicador de Estado Visual:**
    *   ?? 'Salvando alterações...' (cinza)
    *   ? 'Todas as alterações foram salvas' (verde)
    *   ?? 'Erro ao salvar. Tentando novamente...' (vermelho)
*   **Tratamento de Erros:** Optimistic Updates. Reverte estado visual se a requisição falhar.

### 5.6. Integração do Módulo de Clima

*   **Coordenadas Fixas:** Vinhedo-SP (`lat=-23.0300`, `lon=-46.9750`).
*   **Endpoint:** `https://open-meteo.com`. Parâmetros: `forecast_days=16`, `daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`, `timezone=auto`.
*   **Parseamento:** Processa arrays paralelos e unifica em uma lista por dia.
*   **Resiliência e Cache:** `try/except` com timeout de 5s. Cache em memória com TTL de 2 horas.

## 6. Calendário/Planejamento (Menu Mais Opções)

### 6.1. Período Letivo

*   Inputs de data padrão (Início das aulas, Férias de inverno, Término das aulas).
*   Botão "Salvar períodos" que persiste no backend e demarca os períodos no calendário e no grid de chamadas.

### 6.2. Calendário com Integração de Clima e Agenda

*   **Grade de Dias:**
    *   Top Bar com dropdowns de 'mês' e 'ano' + setas de navegação + botão 'Hoje'.
    *   Matriz 7 colunas (Domingo a Sábado). Dias de meses adjacentes aparecem opacos/desabilitados.
*   **Integração com Clima:** Injeção de micro-UI (ícone climático e temperatura) se a data estiver no intervalo de 16 dias. Alerta de chuva se probabilidade > 60%.
*   **Atribuição de Agenda:** Chips interativos (feriado, ponte, reunião, evento) ao clicar na data.
*   **Métricas de Controle:**
    *   Dias previstos: Barra de progresso.
    *   Aproveitamento das aulas dadas: Barra de progresso considerando clima, cloro, ocorrências, feriados.
*   **Ação onDoubleClick:** Abre modal `PlanningModal`.

### 6.3. Planejamento (PlanningUpload)

*   Área de upload de arquivos (PDF/TXT/CSV, de 1 a 4 por vez).
*   Lista de arquivos carregados com parseamento: "nome do arquivo" -> extrai 'tipo + ano' -> exibe label e quantidade de blocos.
*   No `PlanningModal`, o usuário seleciona chips 'infantil'/'adulto' para visualizar blocos de conteúdo.

## 7. Exclusões (Menu Mais Opções)

### 7.1. Visão Geral

*   Ferramenta de funções complexas que excluem e atribuem status de aluno 'ativo'/'inativo' em dois contextos ('Chamadas' ou 'Alunos').
*   Lista de alunos excluídos que podem ser restaurados (voltando ou não para sua turma original) ou excluídos definitivamente (ocultados).

### 7.2. Grid Exclusão

*   **Headers:** Nome | Turma | Horário | Professor | Motivo | Data da exclusão | Ações.
*   **Ações:**
    *   **Restaurar:** Abre modal de edição do aluno para restaurá-lo à turma original ou alocar em outra.
    *   **Excluir:** Oculta o aluno e exclui seus metadados do frontend.
*   **Check 'mostrar alunos ocultos':** Checkbox discreto que revela os alunos ocultados.

## 8. Relatórios (Menu Mais Opções)

### 8.1. Mini Abas de Relatórios

#### 8.1.1. Gráficos / Indicadores de Frequência

*   **FrequencyMetrics:**
    *   **diasDeAula:** Barra de progresso (dias decorridos vs. total).
    *   **aulasDadas:** Barra de progresso (volume de aulas dadas vs. previsão).
    *   **Filtro Temporal:** Toggle "Semana" | "Mês" | "Ano".
*   **ClassTimelineChart:**
    *   Filtros: Tabs para dias da grade e Radio buttons para professores.
    *   Gráfico horizontal empilhado (Timeline Stacked Bars): Horários pré-definidos na vertical. Barras cinza de fundo que se transformam em empilhadas (verde/vermelho/laranja) com números internos centralizados.
    *   Rodapé com legenda centralizada.

#### 8.1.2. Grid de Cards Analítico

*   **FrequenciaPorNivel:** Barras de progresso azuis por nível/turma.
*   **FrequenciaPorHorario:** Barras de progresso verde-água por faixa.
*   **FrequenciaPorPeriodo:** Barras de progresso roxas para Manhã/Tarde.
*   **FrequenciaPorProfessor:** Comparativo por professor.

#### 8.1.3. Rankings de Alunos

*   **TopStudentsFrequent:** Top 5 maiores % de presença.
*   **TopStudentsAbsent:** Top 5 com maior número de faltas (valor absoluto).

### 8.2. Histórico

*   Busca por nome ou link direto.
*   Exibe taxa de assiduidade do aluno e linha do tempo completa, discriminando turmas e níveis.
*   **Grid de indicadores gerais:** Total de alunos | Ativos | Inativos | Retenção média (dias) | Frequência média (%).
*   **Filtros:** Busca padrão e dropdown (Todos, Ativos, Inativos).
*   **Grid:** Nome | Presenças | Justificativas | Faltas | Total de Aulas | Taxa de Assiduidade %.
*   **Ícone de 'Histórico':** Abre modal grande.
    *   Repete dados de frequência.
    *   **Histórico de permanência e assiduidade por nível:**
        *   Discrimina todas as turmas.
        *   Consome período histórico de "Transferência".
        *   Linha do tempo vertical com nós representando `EnrollmentPeriod`.
        *   Cada nó exibe: Nome do Nível/Turma, intervalo de vigência, permanência (dias), assiduidade do nível.
    *   **Retenção Total do Aluno:** Barra de progresso macro com índice de retenção.

### 8.3. Exportar

#### 8.3.1. Relatório de Frequência (Mensal)

*   **Área de Filtros:**
    *   Date picker (Mês/Ano).
    *   Select (Turma label).
    *   Chips de alternância (Professor: Todos, Daniela, Jefferson).
*   **Seleção em lote (Grid de turmas):**
    *   Cabeçalho Dinâmico: "Desmarcar todas/Marcar todas".
    *   Checkbox customizado + 'horário' e 'nível'.
*   **Botão de ação:** Exportar (.xlsx/.pdf) usando template 'relatorioFrequencia'.

#### 8.3.2. Relatório de Vagas

*   **Área de Filtros:**
    *   Buscador padrão (turma, nível, horário).
    *   Chips de alternância (Professor).
    *   Helper text: Grupos: 'x' | Lotação 'x' | Capacidade: 'x' | Vagas: 'x' | Excedente: 'x'.
*   **Tabela de Quadro de horários e vagas:**
    *   Grid de cards com horário, turma label, professor, nível, lotação/capacidade.
    *   Badges condicionais: Lotado (vermelho - "0 vagas"), Vaga (verde - "4 vagas").
*   **Botão de ação:** Exportar (.xlsx/.pdf) usando template 'relatorioVagas'.

#### 8.3.3. Relatório de Cancelamentos (Dashboards Dinâmicos)

*   **Área de Filtros:**
    *   Date Picker (Mensal/Anual).
    *   Select (Níveis).
    *   Select (Motivos de cancelamento).
*   **Grid de indicadores gerais:** Total de cancelamentos | Motivos mais frequentes | Nível com mais cancelamentos | Mês Crítico.
*   **Dashboards (Chart.js/Recharts):**
    *   Evolução Mensal (Linha).
    *   Distribuição por motivo (Rosca).
    *   Cancelamento por níveis (Barras horizontais).
    *   Análise por período (Barras verticais).
*   **Lista de registros:** Grid com registros filtrados.
*   **Botão de ação:** Exportar (.csv) no template: Data | Horário | Nível | Motivo | Pessoal/Geral.
    *   **Regras de Exportação:**
        *   `cardBO`/`select_geral` ou `cardAula` (via_1 ou via_2): Conta como bloco fechado. Níveis concatenados. Ex: `03/06/2026 | 08:00 | Adulto A/B | Parâmetros de cloro inadequados | Geral`.
        *   `cardBO`/`select_pessoal` (via_3): Conta exclusivamente as aulas do professor. Ex: `03/06/2026 | 15:15 | Nível 4 A | Falta médica do professor | Jefferson`.
*   **Imprimir (.pdf):** Página formatada com os dados gráficos do período filtrado.

## 9. Vagas (Menu Mais Opções)

### 9.1. Área de Filtros

*   Dropdowns: Nível | Turma.
*   Chips de alternância (Período: Todos, Manhã, Tarde).

### 9.2. Grid de Indicadores Gerais

*   Capacidade Total | Ativos | Vagas Disponíveis | Alunos Excedentes.
*   OnClick no card 'Vagas': Carrega diretamente as turmas com vagas disponíveis.

### 9.3. Estrutura do Grid de Relação de Vagas

*   **Bloco Fechado:**
    *   Ex: `08:00 | Ter/Qui -- 1 vaga` + barra de progresso.
    *   **Indicação de cor:**
        *   Excedente -> VERMELHA ("+X excedente").
        *   Lotada -> AMARELA ("Lotada").
        *   Vaga -> AZUL ("X vagas").
*   **Bloco Expandido (OnClick):**
    *   Detalha os grupos por nível dentro do horário.
    *   Ex: `Nível 4 B | Jefferson - barra de progresso 3/8`.

## 10. Notificações

*   **Permissões:** Solicita permissão para notificações push (Web Push API). Gerenciamento de dispositivos ativos.
*   **Frequência/dia:** 1x/dia, 2x/dia, Personalizado (até 4 horários).
*   **Frequência/semana:** Chips de dias da semana (D, S, T, Q, Q, S, S).
*   **Persistência:** Configurações salvas no backend, associadas ao `professor_id`.
*   **Disparo:** Scheduler no backend verifica horários e envia notificações. Ao clicar, redireciona para a tela de Chamadas.
*   **Tratamento de erros:** Se a permissão for revogada, a assinatura é removida. O usuário pode desativar as notificações sem perder as configurações.

## 11. Arquitetura Multi-tenant (Unificação das Unidades)

### 11.1. Visão Geral

*   App web unifica as quatro unidades (Bela Vista, São Matheus, Vila, Parque) em um único backend e frontend.
*   Cada unidade acessível por domínio próprio, todos apontando para o mesmo código.
*   Identificação da unidade feita automaticamente pelo domínio de origem.

### 11.2. Adaptações no Frontend (React)

*   **Variável de ambiente única:** `REACT_APP_API_URL=https://api.unificada.com`.
*   **Identificação da unidade:** Frontend lê `window.location.hostname` e extrai o identificador.
    *   `chamadabelavista.pages.dev` -> "bela-vista"
    *   `chamadasaomatheus.pages.dev` -> "sao-matheus"
    *   `chamadavila.pages.dev` -> "vila"
    *   `chamadaparque.pages.dev` -> "parque"
*   **Cabeçalho HTTP:** Header `X-Tenant-ID: <identificador>` em todas as requisições (axios interceptor).
*   **Armazenamento local:** Chaves prefixadas pelo tenant (ex: `bela-vista_professor`).
*   **Build único:** Cloudflare Pages com um único projeto atendendo aos quatro domínios.

### 11.3. Adaptações no Backend (API central)

*   **Banco de dados único com `tenant_id`:** Coluna `tenant_id INT NOT NULL` em todas as tabelas sensíveis.
*   **Middleware de tenant:** Lê o header `X-Tenant-ID` (ou domínio via `Host`), valida, injeta `tenant_id` em `req.tenantId`. Recusa requisições sem tenant válido.
*   **Consultas:** Todas as queries incluem `WHERE tenant_id = req.tenantId`.
*   **Autenticação (JWT):** JWT armazena `tenant_id`. Ao validar, compara com o tenant da requisição.
*   **Scheduler de notificações:** Centralizado, verifica para cada tenant os horários configurados.

### 11.4. Adaptações no Banco de Dados (Exemplo)

*   Tabelas unificadas com coluna `tenant_id`.
*   Migração: Exportar dados de cada unidade e importar no banco unificado, atribuindo um `tenant_id` fixo.

### 11.5. Configuração dos Domínios (Cloudflare Pages)

*   Criar um único projeto no Cloudflare Pages.
*   Adicionar os quatro domínios personalizados ao mesmo projeto.

### 11.6. Performance e Fluidez

*   Backend central na região mais próxima (AWS sa-east-1, Vultr SP).
*   Cache distribuído (Redis) com chaves prefixadas por tenant.
*   Otimizações: paginação, lazy loading, optimistic updates, debounce de 300ms.
*   Testes de carga com 20 professores simultâneos por unidade.

### 11.7. Plano de Rollout

1.  Preparar backend unificado em staging com dados de uma unidade piloto (Bela Vista).
2.  Configurar frontend unificado apontando para o backend de staging.
3.  Validar funcionalidades.
4.  Em produção, alterar o DNS da unidade piloto para apontar para o novo frontend.
5.  Repetir para as demais unidades.

### 11.8. Segurança Adicional

*   Segredo JWT diferente.
*   Logs de auditoria com `tenant_id`.
*   Rate limiting por tenant.
*   Nunca expor `tenant_id` na URL (usar headers).

### 11.9. Observação Final

A arquitetura não altera a experiência do usuário final. A infraestrutura se torna unificada, mais fácil de manter e mais poderosa para análises cruzadas.