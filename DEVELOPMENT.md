
# Development Guidelines - Fiz! App

Este documento estabelece as convenções de versionamento, commits e a rotina obrigatória de documentação para o projeto.

## 1. Versionamento Semântico (SemVer)

O projeto segue o padrão **SemVer 2.0.0**:

- **MAJOR (vX.0.0):** Mudanças incompatíveis na API ou no banco de dados (breaking changes).
- **MINOR (v0.X.0):** Adição de funcionalidades retrocompatíveis (novas features).
- **PATCH (v0.0.X):** Correções de bugs e pequenas melhorias (bug fixes).

**Exemplo:** `v0.1.0` → primeira versão com autenticação funcionando.

## 2. Convenção de Commits (Conventional Commits)

Todos os commits devem seguir o padrão:

```text
<tipo>(<escopo>): <descrição sucinta>

[corpo opcional - detalhe o motivo da mudança]

[rodapé opcional - BREAKING CHANGE ou referência a issues]
Tipos permitidos:

feat: Nova funcionalidade.

fix: Correção de bug.

docs: Alterações na documentação (README, PRD, etc.).

style: Formatação, espaçamento, sem mudança lógica.

refactor: Refatoração de código sem mudar comportamento.

perf: Melhoria de performance.

test: Adição ou correção de testes.

chore: Atualização de dependências, configurações, etc.

Exemplo real:

```text
feat(auth): implementa login com JWT e middleware tenant

- Cria endpoint POST /auth/login
- Adiciona validação de hash SHA256
- Gera token com tenant_id incluso
```

3. Rotina Obrigatória de Registros (Logging Routine)

Toda sessão de desenvolvimento (com ou sem Cline) DEVE gerar registros no `AGENTS.md`.

### 3.1. Arquivo AGENTS.md (Histórico Único)

O `AGENTS.md` é a **memória permanente do projeto** e **substitui o antigo SESSION.md**. Ele deve ser atualizado **ao final de cada sessão**.

**Estrutura de cada sessão no AGENTS.md:**
- Nova seção no formato `## Sessão: DD/MM/YYYY — Título`
- O que foi feito (ações concluídas)
- Decisões técnicas relevantes
- Arquivos alterados (links com linha, se relevante)
- Blockers ou problemas encontrados
- Contexto crítico novo (ex: "descoberto que X causa Y")

**O que NÃO colocar no AGENTS.md:**
- Detalhes de implementação temporários
- Commits individuais

> **Regra de ouro:** Se uma AI nova ler só o `AGENTS.md`, ela deve conseguir trabalhar no projeto sem ler `git log`.

3.2. Commits e pushes automáticos mediante aprovação
Ao final de cada etapa, milestone ou entrega de uma sub-tarefa acordada, o assistente deve:
1. Verificar as alterações realizadas.
2. **Atualizar obrigatoriamente** `CHANGELOG.md` e `AGENTS.md` com as mudanças da sessão.
3. Formular uma mensagem de commit seguindo Conventional Commits.
4. Solicitar aprovação explícita do usuário.
5. Executar `git add`, `git commit` e `git push` quando aprovado, utilizando o fluxo de versionamento.

4. Fluxo de Versionamento e Tags no Git
A branch main contém o código em produção.

Crie tags no Git para cada versão lançada:

```bash
git tag -a v0.1.0 -m "feat: primeira versão com autenticação"
git push origin v0.1.0
```
Sempre que um MINOR ou PATCH for finalizado, crie uma nova tag e atualize o CHANGELOG.md.

5. Boas Práticas
Commits Atômicos: Cada commit deve conter uma mudança lógica única (evite commits gigantes).

Documente tudo: Se o Cline gerou código, peça para ele comentar as partes críticas.

## 6. Handover e Escolha de Modelos no Cline

Para otimizar o uso do Cline, adoto uma estratégia de **handover (passagem de bastão)** entre diferentes modelos de IA, conforme a natureza da tarefa.

### 6.1. Modelos Disponíveis e Respectivos Papéis

| Modelo | Uso Principal | Exemplos de Tarefas |
| :--- | :--- | :--- |
| **DeepSeek / DeepSeek-V4-Flash** | Tarefas básicas, repetitivas e extensas. Geração de código boilerplate, refatorações simples, correções de sintaxe, criação de componentes padrão, ajustes de estilo (CSS/Tailwind), documentação automática. | Criar um componente de input com máscara; gerar uma rota CRUD simples; escrever testes unitários básicos; traduzir mensagens de erro. |
| **GitHub Copilot (via Student) / GPT-4o mini** | Tarefas complexas, que exigem raciocínio lógico mais profundo, arquitetura, integração de múltiplas camadas, segurança, otimização de performance, regras de negócio intricadas. | Implementar o motor de logs com extrapolação e LWW; desenhar a lógica de colisão de IDs; criar o sistema de notificações push; integrar com Supabase RLS; otimizar queries pesadas. |
| **Alibaba Qwen / Qwen-Plus-Latest** | Frontend (React, TypeScript, UI/UX). Componentes interativos, animações, acessibilidade, integração com Context API, lógica de formulários, máscaras, drag & drop, grids dinâmicos. | Criar o componente `DynamicMatrixGrid`; implementar o `CSVUpload` com drag & drop; construir a `AccessibilityToolbar`; ajustar o tema e responsividade; configurar o `DevContext`. |

### 6.2. Regra de Handover (Fluxo de Trabalho)

1. **Início da tarefa:** Analise a complexidade e o domínio (backend, frontend, lógica de negócio, infra).
2. **Primeira aproximação:** Use o **DeepSeek** para gerar uma versão inicial (esqueleto) da solução.
3. **Revisão e refinamento:** Se a tarefa for simples (ex: criar um endpoint CRUD), o DeepSeek pode finalizar.
4. **Escalonamento:** Se a tarefa envolver lógica complexa, regras de negócio, segurança ou integração profunda, **peça ao DeepSeek para resumir o que foi feito e depois ative o Copilot/GPT-4o mini** para revisar, completar ou refatorar o código.
5. **Frontend dedicado:** Para qualquer tarefa de UI/UX (React, Vite, CSS, animações), use **Qwen-Plus** desde o início, ou após o DeepSeek gerar a estrutura básica, passe para o Qwen para ajustar a aparência e interatividade.

### 6.3. Como Executar o Handover no Cline

- Ao mudar de modelo, sempre forneça um **contexto resumido** do que já foi feito (ex: "DeepSeek criou o esqueleto do componente X. Agora preciso que o Qwen adicione suporte a drag & drop e validação de arquivo").
- Mantenha o **arquivo `AGENTS.md`** atualizado com cada handover, registrando qual modelo foi usado e o que foi produzido.
- Use o prompt: *"Mude para o modelo [nome]. Continuando a partir do que [modelo anterior] fez, agora preciso [descrição da próxima etapa]."*

### 6.4. Exemplo Prático

- **Tarefa:** Implementar o upload de CSV com drag & drop e validação.
  1. **DeepSeek:** Gera o componente básico `CSVUpload.tsx` com input file padrão.
  2. **Qwen:** Refatora para usar `react-dropzone`, adiciona animação de drag over, valida extensão e tamanho.
  3. **Copilot/GPT-4o mini:** Revisa a integração com o backend (envio do arquivo e processamento) e sugere melhorias de segurança (sanitização).

  ## 7. Obrigatoriedade de Seguir a Arquitetura do Projeto

### 7.1. Princípio Fundamental

**Toda e qualquer implementação (código, estrutura de pastas, integrações, padrões de design) DEVE seguir estritamente o que está definido nos seguintes documentos:**

- **`ARCHITECTURE.md`** → Estrutura de pastas, camadas (controllers, services, middleware), padrões de código e tecnologias.
- **`PRD.md`** → Regras de negócio, fluxos de UI, lógicas específicas (ex: geração de ID, motor de logs, climatização).
- **`DEVELOPMENT.md`** → Convenções de commit, versionamento, handover e este próprio documento.

### 7.2. O Cline (qualquer modelo) DEVE:

1. **Consultar os documentos oficiais** antes de gerar ou modificar qualquer código.
2. **Manter a estrutura de pastas** inalterada (não criar pastas/arquivos fora do padrão definido no `ARCHITECTURE.md`).
3. **Usar os serviços e utilitários existentes** antes de criar novos (ex: não duplicar funções de validação se já existirem em `utils/`).
4. **Seguir as convenções de nomenclatura** (ex: `camelCase` para variáveis, `PascalCase` para componentes React, `snake_case` para colunas no banco).
5. **Não propor mudanças arquiteturais** sem antes registrar no `AGENTS.md` e obter aprovação explícita no modo "Plan".

### 7.3. Verificação Obrigatória (Checklist)

Antes de finalizar qualquer tarefa, o Cline deve verificar:

- [ ] O código gerado está em conformidade com o `ARCHITECTURE.md`?
- [ ] As regras de negócio seguem o `PRD.md`?
- [ ] Os commits seguem o padrão do `DEVELOPMENT.md`?
- [ ] O `AGENTS.md` foi atualizado com a nova sessão?

### 7.4. Penalidade por Desvio

**Qualquer desvio da arquitetura documentada será considerado um erro crítico** e deverá ser corrigido imediatamente.

- Mudanças estruturais sem aprovação → reverter e registrar no `AGENTS.md` como "desvio arquitetural".
- Código que não siga os padrões → refatorar antes de continuar.

### 7.5. Como o Cline Deve Proceder

Ao receber uma solicitação, o Cline deve:

1. **Identificar a qual camada/domínio a tarefa pertence** (backend, frontend, banco, etc.).
2. **Localizar a seção correspondente nos documentos** (ex: `PRD.md` → seção "Fluxo de Primeiro Acesso").
3. **Consultar o `ARCHITECTURE.md`** para saber onde colocar o código (ex: controller, service, middleware).
4. **Implementar** seguindo as regras e padrões.
5. **Registrar** no `AGENTS.md` (o que foi feito, arquivos alterados, decisões).

### 7.6. Exemplo de Prompt para o Cline

Ao solicitar uma nova feature, sempre inclua no prompt:

> *"Consulte o `ARCHITECTURE.md` e o `PRD.md` antes de implementar. Siga estritamente a estrutura de pastas e as regras de negócio definidas. Registre as mudanças no `AGENTS.md`."*



