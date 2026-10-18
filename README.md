# Freelance Flow: Plataforma Estratégica de Precificação, Gestão Comercial e Operação

> Ecossistema completo para freelancers, consultores e assistências técnicas: precificação analítica, ciclo de vida de propostas (CRUD), motor de emissão de PDFs comerciais em página única com Pix integrado e esteira de projetos.

---

## 1. Identificação do Problema

Profissionais autônomos, consultores e prestadores de serviços técnicos enfrentam historicamente uma tríade de gargalos operacionais que compromete sua sustentabilidade financeira:

1. **A Armadilha da Precificação Empírica ("Chutes")**:
   - A maioria dos profissionais define orçamentos com base no sentimento ou na média superficial do mercado, ignorando variáveis críticas: custos ocultos de infraestrutura, setup inicial, licenças de software, insumos, tributos e margem de risco.
   - Em serviços de manutenção e assistência técnica, a separação inadequada entre peças de reposição e mão de obra (fixa ou por hora) costuma gerar prejuízos recorrentes ou margens ilusórias.

2. **Fragmentação Operacional e Falta de Rastreabilidade**:
   - Informações vitais do negócio ficam espalhadas: clientes salvos na agenda do celular, anotações de diagnósticos em papéis ou chats, orçamentos gerados em editores de texto sem histórico e status de projetos controlados mentalmente.
   - Orçamentos criados ficam sem acompanhamento: o prestador não sabe com precisão o volume total em negociação, quanto já foi aprovado ou quais propostas estão estagnadas.

3. **Apresentação Comercial Amadora e Fricção de Pagamento**:
   - Propostas em PDF geradas manualmente costumam ser visualmente inconsistentes, dispersas em múltiplas páginas com áreas vazias e sem informações essenciais padronizadas (condições de garantia, prazos estimados, laudos técnicos).
   - O processo de pagamento após a aprovação da proposta costuma ser moroso e desconectado: o cliente precisa solicitar dados bancários por mensagens adicionais, aumentando o tempo de fechamento e o abandono de propostas.

---

## 2. Panorama Geral da Solução

O **Freelance Flow** foi arquitetado para transformar a gestão autônoma e técnica em uma operação de alta eficiência, funcionando como um **hub comercial e operacional unificado**.

```mermaid
flowchart LR
    A[Perfil / Configurações] --> B[Motor de Precificação]
    B -->|Serviços Intelectuais| C1[Calculadora Digital]
    B -->|Manutenção & Reparos| C2[Calculadora de Hardware]
    C1 & C2 --> D[Gestão de Orçamentos - CRUD]
    D --> E[PDF Comercial Single-Page com Pix]
    D -->|Aprovação com 1 clique| F[Projetos Ativos & Esteira]
    F --> G[Dashboard & Métricas em Tempo Real]
```

### Principais Pilares da Plataforma:

- **Motor Duplo de Precificação**:
  - **Serviços Digitais / Intelectuais**: Decomposição analítica em horas estimadas, complexidade do projeto, custos de setup/servidores e cálculo de impostos incidentes sobre o faturamento total.
  - **Manutenção e Reparos Técnicos**: Registro detalhado do equipamento (marca/modelo, número de série/tag), modalidade de mão de obra (fixa ou horária), listagem dinâmica de peças de reposição com quantidades e custos adicionais (frete, deslocamento, insumos).
- **Campos Técnicos com Formatação Rica**:
  - Suporte a formatação com negrito (`**texto**`) e quebra de parágrafos diretamente nos campos de *Defeito Relatado* e *Diagnóstico Técnico / Laudo*, garantindo rigor descritivo.
- **Gestão Completa de Orçamentos (CRUD)**:
  - Listagem com métricas em tempo real (Volume Total, Aguardando Aprovação, Aprovados), filtros por status, busca contextual por cliente/projeto e **edição integral de orçamentos pendentes** antes do fechamento.
  - **Conversão Instantânea**: Transformação direta de qualquer orçamento aprovado em projeto ativo na esteira operacional com apenas um clique.
- **Motor de PDF de Alta Precisão (Single-Page Invariant)**:
  - Emissão de propostas comerciais no padrão A4 calibradas com precisão milimétrica para caberem **obrigatoriamente em 1 única folha** (`Página 1 de 1`).
  - Identificação completa da empresa (logomarca, dados de contato sob a razão social, CNPJ, endereço).
  - Quadro destacado no topo para **Garantia** e **Prazo Estimado de Entrega**.
  - Quadro dedicado para **Defeito Relatado pelo Cliente** e **Dados do Cliente** (com telefone e e-mail identificados).
  - **QR Code Pix Dinâmico Nativo**: Geração de payload padronizado EMV/Banco Central com cálculo de CRC-16 no próprio documento para pagamento instantâneo.

---

## 3. Aplicabilidade e Cenários

A solução é desenhada para atuar em múltiplos cenários do mercado autônomo e de pequenas empresas prestadoras de serviços:

### Cenário 1: Desenvolvedores, Designers e Consultores de TI
- **Desafio**: Estimar projetos sob medida sem levar prejuízo caso o escopo exija mais horas ou custos com servidores cloud e licenças.
- **Aplicação no Freelance Flow**: O profissional calcula o tempo base, ajusta a taxa horária, aplica o fator de complexidade e insere custos de terceiros. A plataforma entrega a margem de lucro real e gera uma proposta elegante e direta para o contratante.

### Cenário 2: Assistências Técnicas e Profissionais de Manutenção
- **Desafio**: Realizar manutenção de impressoras, computadores, celulares, placas ou maquinários, registrando o número de série, o defeito apontado pelo cliente e as peças que precisarão ser trocadas.
- **Aplicação no Freelance Flow**: Utilizando a aba de *Manutenção*, o técnico preenche o serial/tag, o defeito relatado e os itens de reposição. O PDF gerado serve tanto como ordem de serviço/proposta quanto como comprovante com prazo de entrega e garantia expressos no topo do documento.

### Cenário 3: Fechamento Ágil de Propostas com Cobrança Imediata
- **Desafio**: Reduzir o atrito entre a apresentação da proposta e o pagamento da entrada ou do valor integral.
- **Aplicação no Freelance Flow**: O PDF de 1 página pode ser enviado diretamente pelo WhatsApp ou e-mail. O cliente visualiza a proposta estruturada e, no mesmo documento, utiliza o aplicativo do banco para ler o QR Code Pix e efetuar o pagamento.

### Cenário 4: Governança do Portfólio e Fluxo de Produção
- **Desafio**: Impedir que orçamentos enviados fiquem esquecidos e manter o controle de capacidade produtiva.
- **Aplicação no Freelance Flow**: Através da tela de *Gestão de Orçamentos*, o profissional visualiza o funil de negócios, renegocia valores reeditando propostas e converte orçamentos aprovados diretamente para a gestão de projetos com controle de prazos e etapas.

---

## 4. A Estrutura da Solução

O Freelance Flow é estruturado em uma arquitetura moderna, modular e desacoplada, priorizando estabilidade, tipagem estrita e experiência do usuário fluida:

```
freelance-flow/
├── src/
│   ├── components/
│   │   ├── calculator/          # Calculadoras modulares (Manutenção, etc.)
│   │   ├── ui/                  # Componentes base shadcn/ui customizados
│   │   ├── AppLayout.tsx        # Shell da aplicação e navegação
│   │   └── AppSidebar.tsx       # Sidebar moderna colapsável
│   ├── integrations/
│   │   └── supabase/            # Client e tipos gerados do Supabase
│   ├── lib/
│   │   ├── generateBudgetPdf.ts # Motor PDF Single-Page + Geração Pix EMV/CRC16
│   │   ├── profitability.ts     # Algoritmos de precificação e cálculo tributário
│   │   └── utils.ts             # Formatadores de moeda, strings e helpers
│   ├── pages/
│   │   ├── Billing.tsx          # Gestão financeira e de cobranças
│   │   ├── BudgetsList.tsx      # Tela de Gestão de Orçamentos (CRUD)
│   │   ├── Calculator.tsx       # Calculadora de precificação híbrida
│   │   ├── ClientsList.tsx      # Portfólio e cadastro de clientes
│   │   ├── Dashboard.tsx        # Visão tática, faturamento e prazos
│   │   ├── Parameters.tsx       # Parâmetros de precificação do freelancer
│   │   ├── ProjectsList.tsx     # Esteira e kanban de projetos ativos
│   │   └── Settings.tsx         # Perfil, chaves Pix, CNPJ e endereço
│   └── types/
│       └── maintenance.ts       # Interfaces de dados de manutenção e orçamentos
├── supabase/
│   ├── migrations/              # Scripts DDL versionados com políticas RLS
│   └── schema.sql               # Esquema de referência das tabelas do banco
├── netlify/
│   └── functions/               # Netlify Functions (Automação de Keep-Alive)
├── package.json
└── vite.config.ts
```

### Tecnologias e Camadas Técnicas:

| Camada | Tecnologias | Papel na Solução |
|---|---|---|
| **Frontend Core** | React 18, TypeScript, Vite | Renderização rápida com tipagem estrita e hot-reload instantâneo. |
| **Estilização & UI** | Tailwind CSS v3, Radix UI, Lucide Icons | Design System *Sharp Technical* com foco em contraste e elegância operacional. |
| **Document Engine** | jsPDF, QRCode | Renderização vetorial de PDF estritamente em folha A4 com QR Code Pix embutido. |
| **Visualização de Dados** | Recharts | Gráficos limpos de receita, distribuição de projetos e métricas financeiras. |
| **Backend & Banco de Dados** | Supabase (PostgreSQL 15+) | Autenticação JWT, triggers de data e Row Level Security (RLS) por `user_id`. |
| **Infraestrutura Serverless** | Netlify Functions, Cron Triggers | Automação keep-alive para prevenir pausa automática de instâncias em planos gratuitos. |

---

## 5. Abordagem Estratégica Adotada

Para construir uma ferramenta diferenciada frente às planilhas genéricas e softwares corporativos inflados, adotou-se um conjunto de decisões estratégicas fundamentais:

### 1. A Invariante da Página Única (Single-Page Mandate)
Estudos de conversão comercial comprovam que clientes tomadores de serviço abandonam propostas prolixas ou com páginas excedentes contendo apenas assinaturas isoladas. O motor do Freelance Flow foi projetado sob a premissa de que **toda proposta deve caber com harmonia visual em exatamente 1 página A4**. Todas as seções — cabeçalho, dados do cliente, defeito relatado, tabela de itens, condições de pagamento, QR Code Pix e laudo — possuem cálculos milimétricos de altura e quebra de linha.

### 2. Prevenção Ativa do Autossabotamento Financeiro
Muitos profissionais calculam lucro aplicando percentuais simples sobre despesas diretas, ignorando que impostos incidem sobre a nota fiscal cheia (faturamento bruto). Os algoritmos de precificação do Freelance Flow aplicam a matemática financeira correta:
$$\text{Faturamento Necessário} = \frac{\text{Custo Base} + \text{Margem de Lucro}}{1 - \text{Alíquota de Impostos}}$$
Isso garante que o profissional nunca pague impostos do próprio bolso nem reduza sua margem pretendida.

### 3. Design System com Identidade "Sharp Technical" (Sem Clichês)
Repudiou-se o uso de templates genéricos, bordas excessivamente arredondadas e o esquema de cores roxo/violeta saturado comum em SaaS. A identidade adota:
- Paleta neutra e sofisticada baseada em tons `Slate`, `Zinc` e acentos em `Emerald`.
- Cantos nítidos (`rounded-sm` / `rounded-md`) transmitindo solidez e precisão técnica.
- Hierarquia tipográfica baseada na fonte *Inter*, priorizando clareza em dados numéricos e tabelas.

### 4. Ciclo de Vida Fechado (Orçamento $\rightarrow$ Aprovação $\rightarrow$ Projeto $\rightarrow$ Faturamento)
Em vez de tratar orçamentos e projetos como entidades desconectadas, o sistema oferece um fluxo contínuo:
1. O orçamento é concebido na calculadora com precisão de custos.
2. Fica registrado na listagem com status "Aguardando".
3. Pode ser refinado ou renegociado a qualquer momento antes da aprovação.
4. Quando o cliente aprova, a conversão em projeto ativo é feita com um clique, alimentando automaticamente os prazos e métricas do Dashboard.

### 5. Resiliência Operacional e Soberania de Dados
O acesso aos dados é 100% blindado por **Row Level Security (RLS)** no PostgreSQL, garantindo que cada usuário acesse exclusivamente seus clientes, projetos e orçamentos. Além disso, rotinas automatizadas de keep-alive garantem disponibilidade contínua sem interrupções por hibernação de serviços em nuvem.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js 18+ instalado
- Gerenciador de pacotes npm, pnpm ou yarn
- Conta no [Supabase](https://supabase.com) com projeto configurado

### Passo a Passo

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/waldosouzaup/freelance-flow.git
   cd freelance-flow
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Configurar Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto com as chaves do seu Supabase:
   ```env
   VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key-aqui"
   VITE_SUPABASE_PROJECT_ID="seu-project-id"
   ```

4. **Executar o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:8080`.

5. **Executar Validações e Testes**:
   ```bash
   npm run build   # Valida a compilação de produção com Vite e TypeScript
   npm test        # Executa a suíte de testes com Vitest
   ```

---

## 📄 Licença
Distribuído sob a licença **MIT**. Consulte o arquivo de licença para mais detalhes.
