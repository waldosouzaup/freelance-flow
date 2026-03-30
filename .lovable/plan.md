

# Sistema de Gestão de Projetos para Freelancers

## Visão Geral
Sistema dark theme para freelancers gerenciarem clientes, projetos, etapas e precificação, com dashboard analítico moderno.

## Design System
- **Tema:** Dark — fundo `#0D1B2A` / `#1B263B`, cards coloridos (vermelho, amarelo, verde, azul, laranja)
- **Tipografia:** Inter
- **Componentes:** Botões arredondados azuis, cards com sombras suaves, gráficos vibrantes em fundo escuro
- **Layout:** Desktop-first, responsivo

## Páginas

### 1. Login
- Email + senha com Supabase Auth
- Tela dark minimalista, opção de criar conta

### 2. Dashboard
- Cards coloridos: total projetos, projetos ativos, total clientes, próximos prazos
- Gráficos: linha (evolução), barras (por status), pizza (por tipo)
- Lista de projetos recentes
- Atalhos: Novo Projeto, Novo Cliente, Calculadora

### 3. Projetos — Lista
- Tabela dark com nome, cliente, status, prazo, ações
- Filtros combinados: cliente, status, busca por nome
- Ordenação padrão por prazo crescente
- Botão "+ Novo Projeto"

### 4. Projetos — Criar/Editar
- Formulário: nome, cliente (select), descrição, valor, prazo, links úteis
- Status padrão "Em andamento"
- Botões salvar/cancelar

### 5. Projeto — Detalhes/Progresso
- Card resumo do projeto
- Campo de notas gerais
- Checklist de etapas com adicionar/editar/excluir/marcar concluída

### 6. Clientes — Lista
- Tabela: nome, email, telefone, empresa
- Busca por nome
- Botão "+ Novo Cliente"
- Proteção: não permitir exclusão se houver projetos vinculados

### 7. Clientes — Criar/Editar
- Formulário: nome, email, telefone, empresa, observações
- Salvar/cancelar

### 8. Calculadora de Precificação
- Campos: valor/hora, horas estimadas, complexidade (multiplicador), custos extras
- Card colorido com preço sugerido calculado em tempo real

### 9. Parâmetros de Precificação
- Valor/hora padrão, margem padrão, complexidade padrão
- Salvar configurações (persiste por usuário no Supabase)

## Backend (Supabase)
- **Auth:** email + senha
- **Tabelas:** profiles, clients, projects, project_stages, pricing_parameters
- **RLS:** cada usuário acessa apenas seus dados
- **Regras:** clientes com projetos não podem ser deletados; etapas com status concluída/pendente

## Navegação
- Sidebar dark com ícones: Dashboard, Projetos, Clientes, Calculadora, Parâmetros
- Rotas protegidas (redireciona para login se não autenticado)

