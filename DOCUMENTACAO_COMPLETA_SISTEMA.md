# DOCUMENTAÇÃO COMPLETA DO SISTEMA DE GESTÃO DE ENTREGAS

## VISÃO GERAL DO SISTEMA

**Nome:** Sistema de Gestão de Entregas
**Tecnologias:** React, TypeScript, Supabase, Tailwind CSS, Vite
**Tipo:** Aplicação Web Full-Stack
**Propósito:** Sistema completo para gerenciamento de rotas de entrega, motoristas, clientes, veículos e despesas

---

## ESTRUTURA DE AUTENTICAÇÃO

### Sistema de Autenticação (Auth)
**Arquivo:** `src/pages/Auth.tsx`

#### Tela de Login/Cadastro
- **Componente Principal:** Tabs com duas abas (Entrar/Cadastrar)
- **Campos de Login:**
  - Email (obrigatório, validação de email)
  - Senha (obrigatório, tipo password)
  - Botão "Entrar" (desabilitado durante carregamento)
  - Estado de loading com texto "Entrando..."

- **Campos de Cadastro:**
  - Nome (obrigatório)
  - Email (obrigatório, validação de email)
  - Senha (obrigatório, tipo password)
  - Botão "Cadastrar" (desabilitado durante carregamento)
  - Estado de loading com texto "Cadastrando..."

#### Fluxo de Autenticação:
1. Usuário acessa `/auth`
2. Se já autenticado, é redirecionado para `/`
3. Sistema usa Supabase Auth para login/cadastro
4. Após login, cria perfil do usuário na tabela `profiles`
5. Perfil contém: `user_id`, `name`, `role` (admin/driver), `driver_id` (se motorista)
6. Redirecionamento automático após autenticação bem-sucedida

---

## TIPOS DE USUÁRIOS E PERMISSÕES

### 1. Administrador (role: 'admin')
**Acesso completo a:**
- Todos os módulos do sistema
- Criação, edição e exclusão de registros
- Visualização de todos os dados
- Relatórios e análises
- Gerenciamento de usuários

### 2. Motorista (role: 'driver')
**Acesso limitado a:**
- Minhas Rotas (`/my-routes`)
- Minhas Despesas (`/my-expenses`)
- Dashboard pessoal
- Visualização apenas das próprias rotas e despesas

---

## MÓDULOS DO SISTEMA

## 1. DASHBOARD (Painel Principal)

### Dashboard do Administrador
**Arquivo:** `src/pages/Dashboard.tsx`
**Rota:** `/`

#### Cards de Estatísticas (4 cards):
1. **Total de Rotas**
   - Ícone: Package
   - Exibe: Número total de rotas
   - Subinformação: Rotas concluídas

2. **Rotas Concluídas**
   - Ícone: Calendar
   - Exibe: Número de rotas completadas

3. **Motoristas**
   - Ícone: Truck
   - Exibe: Total de motoristas cadastrados

4. **Clientes**
   - Ícone: Users
   - Exibe: Total de clientes cadastrados

#### Seção de Rotas de Hoje:
- **Título:** "Rotas de Hoje"
- **Descrição:** "Rotas programadas para hoje"
- **Lista de Rotas:** Cards com:
  - Nome do motorista
  - Placa do veículo
  - Status (Pendente/Em andamento/Concluída)
  - Data da rota
  - Botão "Ver Detalhes" (Eye icon)
    - Redireciona para `/routes` (admin) ou `/my-routes` (motorista)

#### Mensagem quando vazio:
- "Nenhuma rota programada para hoje"

### Dashboard do Motorista
**Mesma rota:** `/`

#### Rotas de Hoje (versão motorista):
- Exibe apenas rotas atribuídas ao motorista
- Título: "Minhas Rotas de Hoje"
- Descrição: "Suas rotas programadas para hoje"

#### Ações Rápidas (2 cards):
1. **Status Atual**
   - Título: "Status Atual"
   - Status: "Disponível" (em verde)
   - Descrição: "Aguardando atribuição de rota"

2. **Rotas Concluídas (Mês)**
   - Título: "Rotas Concluídas (Mês)"
   - Número grande: Total de rotas concluídas
   - Descrição: "Este mês"

---

## 2. MÓDULO DE ROTAS

### Gerenciamento de Rotas (Admin)
**Arquivo:** `src/pages/Routes.tsx`
**Rota:** `/routes`
**Acesso:** Apenas administradores

#### Cabeçalho da Página:
- **Título:** "Rotas"
- **Descrição:** "Gerencie as rotas de entrega dos motoristas"
- **Botões de Ação:**
  - "Nova Rota" (Plus icon) - Abre dialog de criação

#### Filtros de Data:
**Componente:** `DateFilters`
- Filtro por data inicial
- Filtro por data final
- Aplicado automaticamente às rotas exibidas

#### Dialog de Nova Rota:
**Componente:** Dialog com formulário completo

##### Seção 1: Informações Básicas
- **Data da Rota** (obrigatório)
  - Campo de data
  - Placeholder com data atual

##### Seção 2: Seleção de Clientes
- **Lista de Clientes Disponíveis:**
  - Checkbox para cada cliente
  - Informações exibidas:
    - Nome do cliente
    - Endereço completo
    - Cidade e Estado
    - Badge "Transportadora" (se aplicável)
    - Observações de entrega (se existirem)
    - Link da transportadora (se vinculado)

##### Seção 3: Materiais por Cliente (quando cliente selecionado)
Para cada cliente selecionado, campos:
- **Peso (kg)** - número decimal
- **Volume (m³)** - número decimal
- **Descrição do Material** - texto livre

##### Seção 4: Opções de Divisão Automática
- **Switch:** "Dividir automaticamente em rotas menores"
- **Quando ativado:**
  - Método de Divisão (radio buttons):
    - Por Peso (weight)
    - Por Volume (volume)
    - Por Número de Paradas (stops)
  - Número de Rotas (campo numérico)
    - Mínimo: 2
    - Máximo: 10

##### Botão de Criação:
- "Criar Rota(s)" (quando divisão ativada)
- "Criar Rota" (modo normal)
- Desabilitado se: nenhum cliente selecionado ou sem data

#### Lista de Rotas:
**Cards expansíveis para cada rota**

##### Informações no Card (colapsado):
- **Data da rota** (formato: dd/mm/aaaa)
- **Status** (Badge):
  - Rascunho (draft) - outline
  - Pendente (pending) - outline
  - Em andamento (in_progress) - default
  - Concluída (completed) - secondary
  - Dividida (split) - variante especial
  - Mesclada (merged) - variante especial

- **Motorista:** Nome do motorista (ou "Não atribuído")
- **Veículo:** Marca, modelo e placa (ou "Não atribuído")
- **Botão Expandir/Recolher**

##### Informações no Card (expandido):

###### Seção de Informações Gerais:
- KM Inicial
- KM Final
- Total de KM percorridos (calculado)
- Horário de saída da base
- Horário de chegada na base

###### Lista de Paradas:
Para cada parada, card com:
- **Número da Parada** (#1, #2, etc.)
- **Nome do Cliente**
- **Endereço completo**
- **Status:** Concluída (check verde) ou Pendente
- **Materiais:**
  - Peso em kg
  - Volume em m³
  - Descrição do material

###### Detalhes da Entrega (se concluída):
- **Horários:**
  - Chegada
  - Saída
- **Responsável:**
  - Nome do recebedor
  - Email (se fornecido)
  - Departamento (se fornecido)
- **Observações** (se existirem)
- **Fotos da Entrega:**
  - Grid de miniaturas (2x4)
  - Click para visualizar em tela cheia
  - Botão "Ver" (Eye icon) em hover
- **Assinatura:**
  - Imagem da assinatura
  - Clicável para visualizar maior

##### Botões de Ação da Rota (varia por status):

**Status: draft**
- "Otimizar Rota" (Zap icon) - Abre RouteOptimizer
- "Atribuir" (UserPlus icon) - Abre RouteAssignment
- "Dividir" (Split icon) - Abre RouteSplitter
- "Editar" (Edit2 icon) - Edição inline
- "Excluir" (Trash2 icon) - Com confirmação

**Status: pending**
- "Otimizar Rota"
- "Dividir"
- "Editar"
- "Excluir"

**Status: in_progress**
- "Ver Detalhes" (Eye icon)
- "Excluir" (apenas admin)

**Status: completed**
- "Ver Detalhes"
- "Excluir"

#### Componentes de Ação Especiais:

##### 1. Route Optimizer (Otimizador de Rotas)
**Componente:** `RouteOptimizer`
**Arquivo:** `src/components/RouteOptimizer.tsx`

**Funcionalidades:**
- Otimização usando Google Maps Directions API
- Endereço base configurado: "Av. Humberto de Alencar Castelo Branco, 1260 - Jardim Santo Ignacio, São Bernardo do Campo - SP, 09850-300"
- **IMPORTANTE:** Quando cliente tem transportadora vinculada, usa o endereço da transportadora
- Calcula rota otimizada: Base → Paradas (ordem otimizada) → Base
- Atualiza ordem das paradas (stop_number)
- Gera URLs para:
  - Google Maps (navegação)
  - Waze (navegação)
- Exibe distância total
- Exibe tempo estimado total

**Dialog de Otimização:**
- Lista de paradas antes da otimização
- Botão "Otimizar Rota"
- Após otimização:
  - Nova ordem das paradas
  - Distância total (km)
  - Tempo estimado
  - Botão "Abrir no Google Maps"
  - Botão "Abrir no Waze"
  - **Funcionalidade especial:** Abre links em nova janela, quebrando iframe se necessário

**Edge Function:** `optimize-route`
- Endpoint: `supabase/functions/optimize-route/index.ts`
- Método: POST
- Body: `{ route_id: string }`
- Retorno: `{ optimized: boolean, google_maps_url: string, waze_url: string, total_distance_km: number }`

##### 2. Route Assignment (Atribuição de Motorista/Veículo)
**Componente:** `RouteAssignment`
**Arquivo:** `src/components/RouteAssignment.tsx`

**Dialog de Atribuição:**

###### Resumo da Rota:
- Data da rota
- Número de paradas
- Lista de clientes com:
  - Nome
  - Peso (se informado)
  - Volume (se informado)

###### Seleção de Motorista:
- Dropdown com todos os motoristas
- Ícone: User
- Obrigatório

###### Seleção de Veículo:
- Dropdown com todos os veículos
- Formato: "Marca Modelo - Placa"
- Ícone: Truck
- Obrigatório

###### Botões:
- "Cancelar" (outline)
- "Atribuir e Ativar Rota" (primário)
  - Atualiza status para 'pending'
  - Associa motorista e veículo
  - Fecha dialog e atualiza lista

##### 3. Route Splitter (Divisor de Rotas)
**Componente:** `RouteSplitter`
**Arquivo:** `src/components/RouteSplitter.tsx`

**Dialog de Divisão:**

###### Informações da Rota Original:
- Nome do motorista
- Veículo
- Número de paradas
- Data da rota

###### Otimização Rápida:
- Card especial
- Ícone: Zap
- Botão "Otimizar Rota Atual" (sem dividir)
- Otimiza mantendo como rota única

###### Tipos de Divisão (6 opções):

1. **Por Distância** (distance)
   - Ícone: Route
   - Descrição: "Divide equilibrando a quilometragem a partir da base"
   - Usa edge function `split-route`
   - Considera distâncias reais via Google Maps
   - Cria grupos balanceados por KM

2. **Divisão Manual** (manual)
   - Ícone: Split
   - Descrição: "Selecione manualmente as paradas para cada nova rota"
   - Interface especial:
     - Lista todas as paradas
     - Dropdown para cada parada (selecionar grupo 1, 2, 3, etc.)
     - Preview dos grupos formados

3. **Por Proximidade** (proximity)
   - Ícone: MapPin
   - Descrição: "Agrupa paradas próximas geograficamente"
   - Mantém sequência otimizada
   - Agrupa paradas consecutivas
   - Otimiza cada grupo individualmente após divisão

4. **Por Número de Paradas** (stops)
   - Ícone: Users
   - Descrição: "Divide igualmente o número de paradas"
   - Distribui paradas uniformemente
   - Exemplo: 10 paradas / 2 rotas = 5 paradas cada

5. **Por Peso** (capacity)
   - Ícone: Truck
   - Descrição: "Considera o peso dos materiais para dividir as rotas"
   - Calcula peso total
   - Divide proporcionalmente
   - Fallback para divisão por paradas se sem peso

6. **Por Tempo Estimado** (time)
   - Ícone: Clock
   - Descrição: "Otimiza baseado no tempo de entrega"
   - Implementação simplificada
   - Usa divisão por paradas como base

###### Configurações:
- **Número de Divisões:**
  - Campo numérico
  - Mínimo: 2
  - Máximo: 10

###### Atribuição de Recursos:
- **Motoristas para cada nova rota:**
  - Checkboxes com motoristas disponíveis
  - Deve selecionar quantidade = número de divisões
- **Veículos para cada nova rota:**
  - Checkboxes com veículos disponíveis
  - Deve selecionar quantidade = número de divisões

###### Processo de Divisão:
1. Otimiza rota original (se não otimizada)
2. Divide paradas segundo método escolhido
3. Cria novas rotas (uma para cada divisão)
4. Atribui motoristas e veículos
5. Define status 'pending' para novas rotas
6. Marca rota original como 'split'
7. Remove paradas da rota original (movidas para novas)

**Edge Function:** `split-route`
- Endpoint: `supabase/functions/split-route/index.ts`
- Método: POST
- Body: `{ route_id: string, number_of_splits: number }`
- Algoritmo:
  - Busca rota e paradas otimizadas
  - Calcula distância total usando Google Directions API
  - Define pontos de corte por KM cumulativa
  - Retorna grupos de IDs de paradas
  - Inclui distância aproximada por grupo

##### 4. Route Merger (Fusão de Rotas)
**Componente:** `RouteMerger`
**Arquivo:** `src/components/RouteMerger.tsx`

**Dialog de Mesclagem:**

###### Resumo da Mesclagem:
Cards com estatísticas:
- Número de rotas selecionadas
- Total de paradas
- Paradas concluídas
- Paradas pendentes

###### Seleção de Rotas:
- Lista de rotas disponíveis (status: pending ou in_progress)
- Cards clicáveis (checkbox)
- Informações por rota:
  - Nome do motorista
  - Data da rota
  - Veículo
  - Número de paradas
  - Paradas concluídas/total
- Mínimo: 2 rotas

###### Configurações da Nova Rota:
- **Data:** Campo de data
- **Motorista:** Dropdown de seleção
- **Veículo:** Dropdown de seleção

###### Processo de Mesclagem:
1. Cria nova rota com data/motorista/veículo selecionados
2. Transfere todas as paradas das rotas selecionadas
3. Renumera paradas sequencialmente
4. Marca rotas originais como 'merged'
5. Define nova rota como 'pending'

###### Botões:
- "Mesclar Rotas" (primário)
  - Desabilitado se < 2 rotas ou campos vazios
- "Cancelar" (outline)

---

## 3. MÓDULO DE MOTORISTAS

### Gerenciamento de Motoristas
**Arquivo:** `src/pages/Drivers.tsx`
**Rota:** `/drivers`
**Acesso:** Todos (visualização), Admin (edição)

#### Cabeçalho:
- **Título:** "Motoristas"
- **Descrição:** "Gerencie os motoristas da sua equipe"
- **Botões:**
  - "Importar Excel" (Upload icon) - Abre ImportExcel
  - "Novo Motorista" (Plus icon) - Admin apenas

#### Dialog de Motorista:

##### Campos do Formulário:
1. **Nome** (obrigatório)
   - Ícone: User
   - Placeholder: Nome completo

2. **E-mail**
   - Ícone: Mail
   - Validação de email
   - Opcional

3. **Telefone**
   - Ícone: Phone
   - Opcional

4. **Número da CNH**
   - Ícone: IdCard
   - Opcional

5. **Senha para acesso ao sistema** (apenas na criação)
   - Tipo: password
   - Placeholder: "Digite a senha que o motorista usará para logar"
   - Opcional
   - Nota: "Deixe em branco se não quiser criar acesso ao sistema agora"

##### Processo de Criação:
1. Cria registro na tabela `drivers`
2. Se email e senha fornecidos:
   - Cria conta de usuário via Supabase Auth
   - Associa perfil com role='driver'
   - Vincula driver_id ao perfil
   - Envia email de confirmação
3. Exibe toast de sucesso

##### Processo de Edição:
- Atualiza apenas dados do motorista
- Não permite alterar senha (deve ser resetada via auth)

#### Cards de Motoristas:

##### Informações Exibidas:
- **Nome** (Título com ícone User)
- **CNH:** Número ou "Não informada"
- **Email** (se cadastrado)
- **Telefone** (se cadastrado)

##### Botões de Ação (Admin):
- "Editar" (Edit2 icon)
- "Excluir" (Trash2 icon)
  - Confirmação: "Tem certeza que deseja excluir este motorista?"

##### Botão Adicional:
- "Ver Rotas" (Route icon)
  - Abre dialog com histórico de rotas do motorista
  - Componente: `DriverRoutes` (modal)

#### Importação de Motoristas:
**Componente:** `ImportExcel`
- Tipo: 'drivers'
- Template Excel com colunas:
  - Nome (obrigatório)
  - E-mail
  - Telefone
  - CNH
- Validações:
  - Nome obrigatório
  - Email com formato válido
- Suporta múltiplos motoristas por arquivo

#### Dialog de Rotas do Motorista:
**Componente:** `DriverRoutes` (modal)
- Lista todas as rotas do motorista
- Filtros de data
- Exibe status de cada rota
- Link para detalhes da rota

### Gerenciamento Avançado de Motoristas
**Arquivo:** `src/pages/ManageDrivers.tsx`
**Rota:** `/manage-drivers`
**Acesso:** Apenas administradores

#### Funcionalidades Especiais:

##### Criação de Motorista com Conta:
- **Campos obrigatórios:**
  - Nome
  - Email (obrigatório para criar conta)
- **Campos opcionais:**
  - Telefone
  - CNH
- **Processo:**
  1. Cria motorista na tabela `drivers`
  2. Gera senha temporária automaticamente
  3. Cria conta de usuário via Supabase Auth
  4. Define role='driver' e driver_id
  5. Envia email de confirmação
  6. Exibe toast com sucesso

##### Status de Conta:
Para cada motorista, exibe:
- "✓ Conta de usuário ativa" (verde) - se tem conta
- Botão "Criar Conta de Usuário" - se não tem conta
  - Desabilitado se sem email
  - Cria conta automaticamente ao clicar

---

## 4. MÓDULO DE CLIENTES

### Gerenciamento de Clientes
**Arquivo:** `src/pages/Customers.tsx`
**Rota:** `/customers`
**Acesso:** Todos (visualização), Admin (edição)

#### Cabeçalho:
- **Título:** "Clientes"
- **Descrição:** "Gerencie seus clientes e pontos de entrega"
- **Botões:**
  - "Importar Excel" (Upload icon)
  - "Novo Cliente" (Plus icon) - Admin apenas

#### Dialog de Cliente:

##### Seção 1: Informações Básicas
1. **Nome** (obrigatório)
   - Placeholder: Nome ou razão social

2. **Endereço** (obrigatório)
   - Placeholder: Rua, número, complemento
   - **CRÍTICO:** Usado na otimização de rotas

3. **Cidade**
   - Texto livre

4. **Estado**
   - Dropdown com estados brasileiros:
     - AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO

5. **CEP**
   - Formato: 00000-000

6. **Telefone**
   - Formato livre

7. **E-mail**
   - Validação de email

##### Seção 2: Configurações Especiais

8. **É transportadora** (Switch)
   - Indica se é cliente final ou transportadora
   - Afeta: seleção de clientes em rotas
   - Clientes marcados aparecem como opção de transportadora

9. **Transportadora** (Dropdown)
   - Visível apenas se NÃO é transportadora
   - Lista todas as transportadoras cadastradas
   - **IMPORTANTE:** Se selecionado:
     - Na otimização de rota, usa o endereço DA TRANSPORTADORA
     - Não o endereço do cliente
   - Nota: "Se selecionado, a entrega será feita no endereço da transportadora"

10. **Observações de Entrega** (Textarea)
    - Texto livre
    - Exemplos: "Horário de recebimento das 08:00 até as 15:00, portão azul..."
    - Exibido em cards e na seleção de rotas

#### Cards de Clientes:

##### Informações Exibidas:
- **Nome** (Título com ícone Building)
- **Badge "Transportadora"** (se aplicável)
- **Cidade, Estado**
- **Endereço completo**
- **Informação de Transportadora:**
  - "Entrega via: [Nome da Transportadora]" (em destaque)
- **Observações de Entrega** (se existirem)
  - Fundo azul claro
  - "Observações: [texto]"
- **Telefone** (se cadastrado)
- **Email** (se cadastrado)

##### Botões de Ação (Admin):
- "Editar" (Edit2 icon)
- "Excluir" (Trash2 icon)
  - Confirmação: "Tem certeza que deseja excluir este cliente?"

##### Botão Adicional:
- "Ver Entregas" (Eye icon)
  - Abre dialog com histórico de entregas
  - Componente: `CustomerDeliveries`

#### Importação de Clientes:
**Componente:** `ImportExcel`
- Tipo: 'customers'
- Template Excel com colunas:
  - Nome do Cliente (obrigatório)
  - Endereço (obrigatório)
  - Cidade
  - Estado
  - CEP
  - Telefone
  - E-mail
  - É transportadora (S/N ou 1/0)
- Validações especiais:
  - Nome e endereço obrigatórios
  - Email com formato válido
  - Estado deve ser sigla válida
  - É transportadora: aceita S/Sim/1/true

#### Dialog de Histórico de Entregas:
**Componente:** `CustomerDeliveries`
**Arquivo:** `src/components/CustomerDeliveries.tsx`

##### Informações por Entrega:
- **Número da Entrega** (#1, #2, etc.)
- **Status:** Badge (Concluída/Pendente)
- **Data da rota**
- **Motorista responsável**
- **Veículo utilizado**

##### Detalhes do Material:
- Descrição
- Peso (kg)
- Volume (m³)

##### Horários:
- Hora de chegada
- Hora de saída

##### Responsável pelo Recebimento:
- Nome
- Email (se informado)
- Departamento (se informado)

##### Observações:
- Texto livre inserido pelo motorista

##### Fotos da Entrega:
- Grid de miniaturas (2x4)
- Click para visualizar em tela cheia
- Botão "Ver" em hover

##### Assinatura:
- Imagem clicável
- Visualização em tamanho maior

---

## 5. MÓDULO DE VEÍCULOS

### Gerenciamento de Veículos
**Arquivo:** `src/pages/Vehicles.tsx`
**Rota:** `/vehicles`
**Acesso:** Todos (visualização), Admin (edição)

#### Cabeçalho:
- **Título:** "Veículos"
- **Descrição:** "Gerencie a frota de veículos da empresa"
- **Botão:**
  - "Novo Veículo" (Plus icon) - Admin apenas

#### Dialog de Veículo:

##### Campos do Formulário:
1. **Placa** (obrigatório)
   - Formato livre
   - Exemplos: ABC-1234, ABC1D23

2. **Marca**
   - Texto livre
   - Exemplos: Ford, Volkswagen, Fiat

3. **Modelo**
   - Texto livre
   - Exemplos: Transit, Ducato, Sprinter

4. **Ano**
   - Tipo: number
   - Ano de fabricação

5. **Quilometragem Atual**
   - Tipo: number
   - KM do hodômetro
   - Usado para controle de manutenção

##### Botões:
- "Atualizar" (em edição)
- "Cadastrar" (em criação)

#### Cards de Veículos:

##### Informações Exibidas:
- **Placa** (Título com ícone Truck)
- **Marca Modelo (Ano)** (Descrição)
- **Quilometragem:** [valor] km

##### Botões de Ação (Admin):
- "Editar" (Edit2 icon)
- "Excluir" (Trash2 icon)
  - Confirmação: "Tem certeza que deseja excluir este veículo?"

---

## 6. MÓDULO DE DESPESAS

### Despesas (Admin)
**Arquivo:** `src/pages/Expenses.tsx`
**Rota:** `/expenses`
**Acesso:** Admin (completo), Motorista (apenas visualização)

#### Cabeçalho:
- **Título:** "Despesas"
- **Descrição:** "Controle de gastos dos veículos e rotas"
- **Botão:**
  - "Nova Despesa" (Plus icon) - Admin apenas

#### Dialog de Despesa:

##### Campos do Formulário:
1. **Tipo de Despesa** (obrigatório)
   - Dropdown com opções:
     - Combustível
     - Manutenção
     - Pedágio
     - Multa
     - Estacionamento
     - Outros

2. **Valor** (obrigatório)
   - Tipo: number
   - Step: 0.01
   - Formato: R$ 0,00

3. **Data** (obrigatório)
   - Campo de data

4. **Veículo** (obrigatório)
   - Dropdown com veículos
   - Formato: "Placa - Marca Modelo"

5. **Rota** (opcional)
   - Dropdown com rotas
   - Formato: "Data - Motorista"
   - Vincula despesa a rota específica

6. **Descrição**
   - Textarea
   - Detalhes sobre a despesa

#### Lista de Despesas:

##### Card de Despesa:
- **Tipo de Despesa** (Título com ícone Receipt)
- **Valor** (em destaque)
  - Formato: R$ 0,00
- **Data:** dd/mm/aaaa
- **Veículo:** Placa - Marca Modelo
- **Rota:** (se vinculada) Data - Motorista
- **Descrição** (se existir)

##### Botões de Ação (Admin):
- "Editar" (Edit2 icon)
- "Excluir" (Trash2 icon)

### Minhas Despesas (Motorista)
**Arquivo:** `src/pages/DriverExpenses.tsx`
**Rota:** `/my-expenses`
**Acesso:** Apenas motoristas

#### Diferenças da versão Admin:
- Motorista pode criar despesas
- Vê apenas despesas das próprias rotas
- Campos adicionais:
  - Seleção de rota (apenas rotas do motorista)
  - Seleção de veículo
- Tipos de despesa incluem:
  - Combustível
  - Pedágio
  - Manutenção
  - Alimentação (específico motorista)
  - Estacionamento
  - Outros

---

## 7. MÓDULO DE RELATÓRIOS

### Relatórios e Análises
**Arquivo:** `src/pages/Reports.tsx`
**Rota:** `/reports`
**Acesso:** Apenas administradores

#### Cabeçalho:
- **Título:** "Relatórios"
- **Descrição:** "Análises e estatísticas do sistema de entregas"
- **Botão:**
  - "Exportar" (Download icon)
    - Exporta dados em JSON
    - Nome: `relatorio-[data-inicio]-[data-fim].json`

#### Período do Relatório:
Card com filtros:
- **Data Inicial** (campo date)
- **Data Final** (campo date)
- **Botão "Gerar Relatório"** (BarChart3 icon)
  - Desabilitado durante processamento
  - Texto: "Gerando..." quando processando

#### Cards de Resumo (4 cards):

1. **Total de Rotas**
   - Ícone: Truck
   - Número total de rotas no período
   - Subtexto: "[X] concluídas"

2. **Total de Despesas**
   - Ícone: DollarSign
   - Valor total: R$ X.XXX,XX

3. **Quilometragem Total**
   - Ícone: TrendingUp
   - Total de KM percorridos

4. **Taxa de Conclusão**
   - Ícone: BarChart3
   - Percentual: (concluídas / total) × 100
   - Formato: XX%

#### Gráficos:

##### 1. Despesas por Tipo (Pizza)
- **Componente:** PieChart (Recharts)
- **Dados:**
  - Combustível
  - Manutenção
  - Pedágio
  - Multa
  - Estacionamento
  - Outros
- **Exibição:**
  - Labels com nome e percentual
  - Tooltip com valor em R$
  - Cores diferentes por tipo
- **Mensagem vazia:** "Nenhuma despesa encontrada no período"

##### 2. Rotas por Motorista (Barras)
- **Componente:** BarChart (Recharts)
- **Eixo X:** Nome do motorista
- **Eixo Y:** Número de rotas
- **Dados:**
  - Total de rotas por motorista
  - KM percorridos por motorista
- **Tooltip:** Número de rotas
- **Mensagem vazia:** "Nenhuma rota encontrada no período"

##### 3. Despesas Mensais (Barras)
- **Componente:** BarChart (Recharts)
- **Título:** "Despesas Mensais"
- **Descrição:** "Evolução dos gastos ao longo do tempo"
- **Eixo X:** Mês (formato: mmm/aaaa)
- **Eixo Y:** Valor em R$
- **Dados:** Despesas agrupadas por mês
- **Tooltip:** Valor formatado em R$
- **Cores:** Verde (#82ca9d)

#### Exportação de Dados:
- **Formato:** JSON
- **Conteúdo:**
  ```json
  {
    "periodo": "AAAA-MM-DD a AAAA-MM-DD",
    "totalRoutes": 0,
    "completedRoutes": 0,
    "totalExpenses": 0,
    "totalKm": 0,
    "expensesByType": [...],
    "routesByDriver": [...],
    "monthlyExpenses": [...]
  }
  ```

---

## 8. MINHAS ROTAS (Motorista)

### Interface do Motorista
**Arquivo:** `src/pages/DriverRoutes.tsx`
**Rota:** `/my-routes`
**Acesso:** Apenas motoristas

#### Cabeçalho:
- **Título:** "Minhas Rotas"
- **Descrição:** "Gerencie suas entregas e marque as conclusões"

#### Filtros de Data:
- Mesmo componente `DateFilters`
- Filtra rotas por período

#### Cards de Rotas:

##### Informações do Card:
- **Data da rota** (Título)
- **Status** (Badge colorido)
- **Veículo:** Marca Modelo - Placa

##### Botões por Status:

**Status: pending**
- "Iniciar" (Play icon)
  - Abre dialog de KM inicial

**Status: in_progress**
- "Reordenar" (ListOrdered icon)
  - Ativa modo de reordenação
- "Finalizar" (Square icon)
  - Abre dialog de KM final

**No modo reordenação:**
- "Salvar" (Save icon)
- "Cancelar" (X icon)

**Todos os status:**
- Botão expandir/recolher

##### Dialog de Início de Rota:
Campos obrigatórios:
- **KM Inicial**
  - Tipo: number
  - Valor do hodômetro
- **Horário de Saída da Base**
  - Tipo: time
  - Formato: HH:mm

Ação:
- Atualiza status para 'in_progress'
- Salva KM inicial e horário
- Toast: "Boa viagem! Lembre-se de marcar as entregas conforme forem sendo concluídas."

##### Dialog de Finalização de Rota:
Campos obrigatórios:
- **KM Final**
  - Tipo: number
  - Deve ser maior que KM inicial
- **Horário de Chegada na Base**
  - Tipo: time
  - Formato: HH:mm

Cálculos automáticos:
- Total KM = KM Final - KM Inicial
- Armazenado na rota

Ação:
- Atualiza status para 'completed'
- Salva KM final e horário
- Toast: "Parabéns! Rota finalizada com sucesso."

##### Lista de Paradas (expandido):

###### Para cada parada:
- **Número da Parada** (#1, #2, etc.)
- **Nome do Cliente**
- **Endereço completo**
- **Status:** Check verde (concluída) ou Pendente
- **Observações de Entrega do Cliente** (se existirem)
  - Fundo azul claro

###### Informações de Material:
- Descrição
- Peso (kg)
- Volume (m³)

###### Botão de Ação:
- "Concluir Entrega" (CheckCircle icon)
  - Disponível apenas se rota in_progress
  - Abre dialog de conclusão

##### Dialog de Conclusão de Entrega:

###### Campos Obrigatórios:
1. **Horário de Chegada**
   - Tipo: time
   - Formato: HH:mm

2. **Horário de Saída**
   - Tipo: time
   - Deve ser após chegada

3. **Nome do Responsável**
   - Quem recebeu a entrega

###### Campos Opcionais:
4. **Email do Responsável**
5. **Departamento**
6. **Observações**
   - Textarea
   - Notas sobre a entrega

###### Captura de Evidências:
7. **Fotos**
   - Botão "Adicionar Fotos" (Camera icon)
   - Abre `PhotoCapture` component
   - Múltiplas fotos permitidas
   - Preview das fotos adicionadas

8. **Assinatura**
   - Botão "Coletar Assinatura" (PenTool icon)
   - Abre `SignatureCapture` component
   - Canvas para desenho
   - Preview da assinatura

###### Botões de Ação:
- "Cancelar" (outline)
- "Concluir Entrega" (primário)
  - Desabilitado se campos obrigatórios vazios

##### Modo de Reordenação:
**Interface especial quando ativo:**

- Lista de paradas numeradas
- Cada parada tem:
  - Número atual
  - Nome do cliente
  - Botão "↑" (mover para cima)
  - Botão "↓" (mover para baixo)
- Alterações em tempo real
- Botões de ação:
  - "Salvar" - Confirma nova ordem
  - "Cancelar" - Descarta mudanças

**Processo:**
1. Cria array de paradas ordenadas
2. Permite mover paradas para cima/baixo
3. Ao salvar:
   - Atualiza stop_number no banco
   - Mantém sequência 1, 2, 3, ...
4. Toast: "A ordem das paradas foi atualizada com sucesso!"

---

## 9. COMPONENTES DE CAPTURA

### Photo Capture (Captura de Fotos)
**Componente:** `PhotoCapture`
**Arquivo:** `src/components/PhotoCapture.tsx`

#### Dialog de Fotos:
- **Título:** "Fotos da Entrega"
- **Descrição:** "Adicione fotos para documentar a entrega"

#### Funcionalidades:
1. **Upload de Arquivos**
   - Botão "Selecionar Fotos" (Upload icon)
   - Múltiplas fotos de uma vez
   - Input file oculto (tipo: file, accept: image/*)

2. **Validações:**
   - Apenas arquivos de imagem (JPG, PNG, WebP)
   - Tamanho máximo: 5MB por foto
   - Mensagem de erro se validação falhar

3. **Upload para Supabase Storage:**
   - Bucket: 'delivery-photos'
   - Path: `{routeId}/{stopId}/{timestamp}-{index}.{ext}`
   - Gera URL pública após upload
   - Adiciona à lista de fotos

4. **Grid de Fotos:**
   - Layout: 2 colunas (mobile) / 3 colunas (desktop)
   - Cada foto:
     - Miniatura (altura fixa 128px)
     - Botão "X" (remove) em hover
     - Click na miniatura para visualizar

5. **Remover Foto:**
   - Delete do storage
   - Remove do array
   - Toast de confirmação

6. **Mensagem Vazia:**
   - Ícone Image
   - "Nenhuma foto adicionada"

7. **Notas de Rodapé:**
   - "• Máximo 5MB por foto"
   - "• Formatos aceitos: JPG, PNG, WebP"

#### Estados:
- `uploading`: Boolean (exibe "Enviando...")
- `currentPhotos`: Array de URLs
- Callback `onPhotosChange` atualiza pai

### Signature Capture (Captura de Assinatura)
**Componente:** `SignatureCapture`
**Arquivo:** `src/components/SignatureCapture.tsx`

#### Dialog de Assinatura:
- **Título:** "Coletar Assinatura"
- **Descrição:** "Desenhe a assinatura do responsável pela entrega"

#### Canvas de Desenho:
- **Elemento:** Canvas HTML5
- **Dimensões:** 
  - Largura: 100% do container
  - Altura: 200px
- **Estilo:**
  - Borda tracejada cinza
  - Cursor: crosshair
  - Fundo branco

#### Configurações do Canvas:
```javascript
ctx.lineCap = 'round'
ctx.lineJoin = 'round'
ctx.strokeStyle = '#000'
ctx.lineWidth = 2
```

#### Eventos de Desenho:
- **onMouseDown:** Inicia desenho
- **onMouseMove:** Desenha linha (se isDrawing=true)
- **onMouseUp:** Para desenho
- **onMouseLeave:** Para desenho

#### Botões de Ação:
1. **Limpar** (RotateCcw icon)
   - Limpa canvas
   - Reset para fundo branco
   - hasSignature = false

2. **Remover Atual** (Trash2 icon)
   - Visível apenas se currentSignature existe
   - Delete do storage
   - Limpa canvas
   - Toast de confirmação

3. **Salvar** (Save icon)
   - Converte canvas para Blob PNG
   - Upload para Supabase Storage
   - Bucket: 'signatures'
   - Path: `{routeId}/{stopId}/signature-{timestamp}.png`
   - Retorna URL pública
   - Callback `onSignatureChange`
   - Fecha dialog

#### Preview de Assinatura Existente:
- Texto: "Assinatura atual:"
- Imagem com max-height 80px
- Borda e bordas arredondadas

#### Estados:
- `isDrawing`: Boolean
- `hasSignature`: Boolean
- `uploading`: Boolean
- Callback `onSignatureChange` atualiza pai

### Image Viewer (Visualizador de Imagens)
**Componente:** `ImageViewer`
**Arquivo:** `src/components/ImageViewer.tsx`

#### Dialog de Visualização:
- **Maximizado:** max-w-screen-lg
- **Fundo:** Semi-transparente escuro
- **Título:** Customizável
- **Descrição:** Alt text da imagem

#### Imagem:
- **Elemento:** `<img>`
- **Tamanho:** Responsivo (max 100%)
- **Object-fit:** contain
- **Alt:** Texto descritivo

#### Funcionalidades:
- Click fora fecha dialog
- Botão "X" no canto
- ESC para fechar

---

## 10. COMPONENTES AUXILIARES

### Date Filters (Filtros de Data)
**Componente:** `DateFilters`
**Arquivo:** `src/components/DateFilters.tsx`

#### Card de Filtros:
- **Título:** "Filtrar por Data"
- **Campos:**
  - Data Inicial (tipo: date)
  - Data Final (tipo: date)
- **Botão:** "Aplicar Filtros"
- **Botão:** "Limpar"

#### Callback:
```typescript
onFilterChange({ startDate?: string, endDate?: string })
```

### Import Excel (Importação)
**Componente:** `ImportExcel`
**Arquivo:** `src/components/ImportExcel.tsx`

#### Props:
- `type`: 'customers' | 'drivers' | 'vehicles'
- `isOpen`: boolean
- `onClose`: callback
- `onImportComplete`: callback

#### Dialog de Importação:

##### Etapa 1: Download do Modelo
- Card azul claro
- Título: "1. Baixe o modelo"
- Descrição: "Use nosso modelo para garantir a formatação correta"
- Botão "Baixar modelo Excel" (Download icon)

##### Templates por Tipo:

**Customers:**
- Nome do Cliente (obrigatório)
- Endereço (obrigatório)
- Cidade
- Estado
- CEP
- Telefone
- E-mail
- É transportadora (S/N)

**Drivers:**
- Nome (obrigatório)
- E-mail
- Telefone
- CNH

**Vehicles:**
- Placa (obrigatório)
- Marca
- Modelo
- Ano
- KM Atual

##### Etapa 2: Upload do Arquivo
- Área drag-and-drop
- Click para selecionar
- Aceita: .xlsx, .csv
- Botão "Selecionar Arquivo"
- Estado de processamento

##### Validações:

###### Para Customers:
- Nome obrigatório
- Endereço obrigatório
- Email formato válido
- Estado sigla válida
- É transportadora: S/Sim/1/true → true

###### Para Drivers:
- Nome obrigatório
- Email formato válido

###### Para Vehicles:
- Placa obrigatório
- Ano número válido
- KM Atual número válido

##### Processamento CSV:
- **Detecção de Delimitador:**
  - Conta vírgulas vs ponto-e-vírgula
  - Usa o mais frequente
- **Parser Manual:**
  - Suporta campos entre aspas
  - Escapa aspas duplas
  - Trata CRLF

##### Resultado da Importação:

###### Card de Sucesso (verde):
- "✅ X registro(s) importado(s) com sucesso"

###### Card de Erros (vermelho):
- Ícone AlertTriangle
- "X erro(s) encontrado(s):"
- Lista de erros:
  - "Linha X: [descrição do erro]"
- Scroll se muitos erros
- Max-height: 160px

##### Instruções (rodapé):
- Use o modelo fornecido
- Campos obrigatórios devem ser preenchidos
- Prefira Excel; CSV deve ter delimitador correto
- Textos com vírgula: usar aspas

---

## 11. EDGE FUNCTIONS (Backend)

### 1. Optimize Route (Otimização)
**Arquivo:** `supabase/functions/optimize-route/index.ts`
**Endpoint:** `/optimize-route`
**Método:** POST

#### Request Body:
```json
{
  "route_id": "uuid"
}
```

#### Processo:
1. Busca rota e paradas no Supabase
2. Busca dados de clientes e transportadoras
3. **CRÍTICO:** Monta endereços:
   - Se cliente tem `transporter_id`:
     - Usa `transporter.address` (não customer.address)
   - Senão: Usa `customer.address`
4. Define endereço base (constante):
   - "Av. Humberto de Alencar Castelo Branco, 1260 - Jardim Santo Ignacio, São Bernardo do Campo - SP, 09850-300"
5. Monta waypoints (endereços dos clientes/transportadoras)
6. Codifica waypoints para URL
7. Chama Google Maps Directions API:
   ```
   GET https://maps.googleapis.com/maps/api/directions/json
   ?origin={base}
   &destination={base}
   &waypoints=optimize:true|{waypoints}
   &language=pt-BR
   &region=BR
   &key={GOOGLE_MAPS_API_KEY}
   ```
8. Processa resposta:
   - Extrai waypoint_order (nova ordem otimizada)
   - Calcula distância total (metros → km)
   - Calcula tempo total (segundos → minutos)
9. Atualiza stop_number das paradas
10. Gera URLs de navegação:
    - Google Maps
    - Waze
11. Retorna resultado

#### Response:
```json
{
  "optimized": true,
  "google_maps_url": "https://...",
  "waze_url": "https://...",
  "total_distance_km": 45.3,
  "total_time_minutes": 120
}
```

#### Tratamento de Erros:
- Status 429: Rate limit excedido
- Status 402: Créditos insuficientes
- Outros: Erro genérico
- Logs detalhados no console

#### Variáveis de Ambiente:
- `GOOGLE_MAPS_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Split Route (Divisão Inteligente)
**Arquivo:** `supabase/functions/split-route/index.ts`
**Endpoint:** `/split-route`
**Método:** POST

#### Request Body:
```json
{
  "route_id": "uuid",
  "number_of_splits": 2
}
```

#### Validações:
- number_of_splits: mínimo 2, máximo 10

#### Processo:
1. Busca rota e paradas (ordenadas por stop_number)
2. Monta endereços (igual optimize-route)
3. Chama Google Directions para rota completa
4. Extrai:
   - waypoint_order (ordem otimizada)
   - legs (array de trechos)
   - distances por leg
5. **Algoritmo de Divisão por Distância:**
   - Calcula distância total (KM)
   - Define pontos de corte:
     - Target KM = (Total KM × split) / number_of_splits
     - Encontra leg onde KM cumulativa >= target
     - Converte para número de paradas
   - Cria grupos de paradas
6. Calcula KM aproximada por grupo
7. Retorna grupos de IDs

#### Response:
```json
{
  "success": true,
  "total_km": 50.5,
  "groups": [
    ["stop-id-1", "stop-id-2"],
    ["stop-id-3", "stop-id-4"]
  ],
  "groups_km": [25.2, 25.3]
}
```

---

## 12. ESTRUTURA DO BANCO DE DADOS

### Tabelas Principais:

#### profiles
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `name` (text)
- `role` (text) - 'admin' ou 'driver'
- `driver_id` (uuid, FK → drivers, nullable)
- `created_at` (timestamp)

#### drivers
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `email` (text, nullable)
- `phone` (text, nullable)
- `license_number` (text, nullable)
- `created_at` (timestamp)

#### customers
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `address` (text, NOT NULL)
- `city` (text)
- `state` (text)
- `zip_code` (text)
- `phone` (text)
- `email` (text)
- `is_transporter` (boolean, default: false)
- `transporter_id` (uuid, FK → customers, nullable)
- `delivery_notes` (text)
- `created_at` (timestamp)

#### vehicles
- `id` (uuid, PK)
- `plate` (text, NOT NULL)
- `brand` (text)
- `model` (text)
- `year` (integer)
- `km_current` (integer)
- `created_at` (timestamp)

#### routes
- `id` (uuid, PK)
- `route_date` (date, NOT NULL)
- `driver_id` (uuid, FK → drivers, nullable)
- `vehicle_id` (uuid, FK → vehicles, nullable)
- `status` (text) - draft, pending, in_progress, completed, split, merged
- `initial_km` (integer)
- `final_km` (integer)
- `total_km` (integer, calculado)
- `base_departure_time` (time)
- `base_arrival_time` (time)
- `created_at` (timestamp)

#### route_stops
- `id` (uuid, PK)
- `route_id` (uuid, FK → routes, NOT NULL)
- `customer_id` (uuid, FK → customers, NOT NULL)
- `stop_number` (integer, NOT NULL)
- `weight_kg` (decimal)
- `volume_m3` (decimal)
- `material_description` (text)
- `priority` (integer, default: 0)
- `completed` (boolean, default: false)
- `arrival_time` (time)
- `departure_time` (time)
- `delivery_time` (time)
- `receiver_name` (text)
- `receiver_email` (text)
- `receiver_department` (text)
- `notes` (text)
- `photos` (jsonb, array de URLs)
- `signature_url` (text)
- `created_at` (timestamp)

#### expenses
- `id` (uuid, PK)
- `vehicle_id` (uuid, FK → vehicles, NOT NULL)
- `route_id` (uuid, FK → routes, nullable)
- `expense_type` (text, NOT NULL) - combustivel, manutencao, pedagio, multa, estacionamento, outros
- `amount` (decimal, NOT NULL)
- `expense_date` (date, NOT NULL)
- `description` (text)
- `created_at` (timestamp)

### Buckets de Storage:

#### delivery-photos
- **Acesso:** Privado
- **Path:** `{route_id}/{stop_id}/{filename}`
- **Formatos:** JPG, PNG, WebP
- **Tamanho Max:** 5MB
- **Política RLS:** Apenas motorista da rota pode upload

#### signatures
- **Acesso:** Privado
- **Path:** `{route_id}/{stop_id}/signature-{timestamp}.png`
- **Formato:** PNG
- **Política RLS:** Apenas motorista da rota pode upload

### Row Level Security (RLS):

#### profiles
- `SELECT`: Todos autenticados
- `UPDATE`: Apenas próprio perfil

#### drivers
- `SELECT`: Todos autenticados
- `INSERT/UPDATE/DELETE`: Apenas admin

#### customers
- `SELECT`: Todos autenticados
- `INSERT/UPDATE/DELETE`: Apenas admin

#### vehicles
- `SELECT`: Todos autenticados
- `INSERT/UPDATE/DELETE`: Apenas admin

#### routes
- `SELECT`: 
  - Admin: todas
  - Motorista: apenas where driver_id = auth.driver_id
- `INSERT/UPDATE/DELETE`: Apenas admin
- `UPDATE` (status, km): Motorista da rota

#### route_stops
- `SELECT`: Todos autenticados
- `INSERT/UPDATE/DELETE`: Admin
- `UPDATE` (conclusão): Motorista da rota

#### expenses
- `SELECT`: 
  - Admin: todas
  - Motorista: apenas das próprias rotas
- `INSERT/UPDATE/DELETE`: Admin
- `INSERT`: Motorista (próprias rotas)

---

## 13. FLUXOS DE TRABALHO COMPLETOS

### Fluxo 1: Criação de Rota Completa (Admin)
1. Admin acessa `/routes`
2. Clica "Nova Rota"
3. Seleciona data
4. Seleciona clientes (um ou mais)
5. Para cada cliente:
   - Informa peso (opcional)
   - Informa volume (opcional)
   - Descreve material (opcional)
6. Opcionalmente ativa "Dividir automaticamente"
   - Escolhe método (peso/volume/paradas)
   - Define número de rotas
7. Clica "Criar Rota(s)"
8. Sistema cria rota(s) com status 'draft'
9. Admin pode:
   - **Otimizar:** Clica "Otimizar Rota"
     - Sistema chama edge function
     - Reordena paradas
     - Exibe URLs de navegação
   - **Atribuir:** Clica "Atribuir"
     - Seleciona motorista
     - Seleciona veículo
     - Confirma
     - Status muda para 'pending'
   - **Dividir:** Clica "Dividir"
     - Escolhe método de divisão
     - Define número de divisões
     - Seleciona motoristas e veículos
     - Confirma
     - Cria novas rotas
     - Original fica 'split'

### Fluxo 2: Execução de Rota (Motorista)
1. Motorista faz login
2. Acessa "Minhas Rotas" ou Dashboard
3. Vê rota com status 'pending'
4. Clica "Iniciar"
5. Informa:
   - KM inicial do veículo
   - Horário de saída da base
6. Confirma → Status muda para 'in_progress'
7. Para cada parada:
   - Clica "Concluir Entrega"
   - Informa:
     - Horário de chegada
     - Horário de saída
     - Nome do responsável
     - Email (opcional)
     - Departamento (opcional)
     - Observações (opcional)
   - Adiciona fotos (opcional)
   - Coleta assinatura (opcional)
   - Confirma → Parada marcada como concluída
8. Após todas as paradas, clica "Finalizar"
9. Informa:
   - KM final do veículo
   - Horário de chegada na base
10. Confirma → Status muda para 'completed'

### Fluxo 3: Otimização com Transportadora
1. Admin cria cliente transportadora:
   - Marca "É transportadora" = true
   - Cadastra endereço da transportadora
2. Admin cria clientes normais:
   - Seleciona transportadora no campo "Transportadora"
   - Cadastra endereço do cliente (para referência)
3. Admin cria rota:
   - Seleciona clientes (alguns com transportadora)
4. Admin clica "Otimizar Rota"
5. Sistema:
   - Para clientes COM transportadora:
     - Usa endereço da TRANSPORTADORA
   - Para clientes SEM transportadora:
     - Usa endereço do CLIENTE
   - Chama Google Maps API
   - Calcula rota otimizada
6. Motorista recebe rota otimizada
7. Ao fazer entregas:
   - Vai até a transportadora (não o cliente)
   - Registra entrega na transportadora

### Fluxo 4: Mesclagem de Rotas
1. Admin acessa `/routes`
2. Clica botão "Mesclar Rotas"
3. Visualiza todas as rotas pending/in_progress
4. Seleciona 2 ou mais rotas (checkbox)
5. Define:
   - Data da nova rota
   - Motorista
   - Veículo
6. Clica "Mesclar Rotas"
7. Sistema:
   - Cria nova rota
   - Move todas as paradas para nova rota
   - Renumera paradas
   - Marca rotas originais como 'merged'
   - Define nova rota como 'pending'

### Fluxo 5: Divisão Inteligente por Distância
1. Admin tem rota com muitas paradas
2. Clica "Dividir"
3. Seleciona método "Por Distância"
4. Define número de divisões (ex: 3)
5. Seleciona 3 motoristas
6. Seleciona 3 veículos
7. Clica "Dividir Rota"
8. Sistema:
   - Otimiza rota original (se não otimizada)
   - Chama edge function split-route
   - Calcula distância total via Google Maps
   - Define pontos de corte por KM
   - Cria 3 grupos de paradas
   - Cria 3 novas rotas
   - Atribui motoristas e veículos
   - Marca original como 'split'

### Fluxo 6: Reordenação Manual pelo Motorista
1. Motorista vê rota in_progress
2. Percebe que ordem não está ideal
3. Clica "Reordenar"
4. Interface muda:
   - Lista numerada de paradas
   - Botões ↑↓ para cada parada
5. Move paradas para cima/baixo
6. Paradas renumeradas em tempo real
7. Clica "Salvar"
8. Sistema atualiza stop_number
9. Motorista continua entregas na nova ordem

---

## 14. NAVEGAÇÃO DO SISTEMA

### Layout Principal
**Componente:** `Layout`
**Arquivo:** `src/components/Layout.tsx`

#### Header:
- Logo/Título: "Sistema de Entregas"
- Nome do usuário (direita)
- Botão "Sair" (LogOut icon)

#### Sidebar (Navegação):

##### Menu Admin:
1. Painel (/) - ícone: BarChart
2. Rotas (/routes) - ícone: Map
3. Motoristas (/drivers) - ícone: Truck
4. Gerenciar Motoristas (/manage-drivers) - ícone: Users
5. Clientes (/customers) - ícone: Users
6. Veículos (/vehicles) - ícone: Truck
7. Despesas (/expenses) - ícone: Settings
8. Relatórios (/reports) - ícone: BarChart

##### Menu Motorista:
1. Minhas Rotas (/my-routes) - ícone: Map
2. Minhas Despesas (/my-expenses) - ícone: Receipt
3. Painel (/) - ícone: BarChart

#### Área de Conteúdo:
- Outlet do React Router
- Padding: 24px
- Background: card

### Proteção de Rotas:
- Não autenticado → Redireciona para `/auth`
- Loading → Exibe spinner centralizado
- Admin → Acesso completo
- Motorista → Apenas rotas específicas

---

## 15. ESTADOS E VALIDAÇÕES

### Estados Globais:
- **AuthContext:**
  - user (User | null)
  - session (Session | null)
  - profile (Profile | null)
  - loading (boolean)
  - signIn, signUp, signOut (functions)

### Estados de Loading:
- Cada página/componente gerencia próprio loading
- Exibe mensagens apropriadas:
  - "Carregando motoristas..."
  - "Carregando rotas..."
  - "Processando..."

### Validações Client-Side:
- Email: formato válido
- Campos obrigatórios: não vazios
- Números: valores válidos
- Datas: formato correto
- KM Final > KM Inicial
- Horário Saída < Horário Chegada

### Feedback ao Usuário:
- **Toasts (Sonner):**
  - Sucesso: verde
  - Erro: vermelho (variant: destructive)
  - Info: azul
- **Confirmações:**
  - Exclusões: confirm() nativo
  - Ações importantes: Dialog customizado

---

## 16. INTEGRAÇÕES EXTERNAS

### Google Maps API:
**Uso:**
- Otimização de rotas
- Cálculo de distâncias
- Geração de URLs de navegação

**Endpoints:**
- Directions API
- URL Format para navegação

**Configuração:**
- Secret: `GOOGLE_MAPS_API_KEY`
- Região: BR
- Idioma: pt-BR

### Supabase:
**Serviços Utilizados:**
1. **Auth:**
   - Sign Up / Sign In
   - Session Management
   - Email Confirmations

2. **Database (PostgreSQL):**
   - Tabelas relacionais
   - Row Level Security
   - Triggers e Functions

3. **Storage:**
   - Buckets privados
   - Signed URLs (1h expiry)
   - Upload de imagens

4. **Edge Functions:**
   - Otimização de rotas
   - Divisão inteligente

---

## 17. DESIGN SYSTEM

### Cores (HSL):
- Primary: Cor principal do tema
- Secondary: Cor secundária
- Muted: Texto menos destacado
- Destructive: Vermelho para erros/exclusões
- Border: Cinza para bordas
- Background: Fundo da aplicação
- Card: Fundo dos cards

### Componentes UI (shadcn/ui):
- Button (variantes: default, outline, destructive, secondary)
- Card (Header, Title, Description, Content)
- Dialog (Modal system)
- Input (text, email, password, number, date, time)
- Label
- Badge
- Textarea
- Select / Dropdown
- Switch
- Checkbox
- Toast / Sonner
- Skeleton (loading)
- Tabs
- Separator

### Ícones (Lucide React):
- Navigation: Map, Users, Truck, BarChart, Settings
- Actions: Plus, Edit2, Trash2, Eye, Save, X
- Status: CheckCircle, Clock, Calendar
- Features: Camera, PenTool, Upload, Download, Split, Merge
- UI: ArrowUp, ArrowDown, ListOrdered, Route

### Layout:
- Responsivo: Mobile-first
- Grid systems: 1-4 colunas
- Spacing: 4px base (gap-1, gap-2, etc.)
- Borders: rounded-lg, rounded-md

---

## 18. OTIMIZAÇÕES E PERFORMANCE

### Lazy Loading:
```typescript
const RoutesPage = lazy(() => import("./pages/Routes"))
const Drivers = lazy(() => import("./pages/Drivers"))
const Customers = lazy(() => import("./pages/Customers"))
// ... etc
```

### Suspense Fallback:
```jsx
<Suspense fallback={<div>Carregando...</div>}>
  <Component />
</Suspense>
```

### Memoization:
- `useMemo` para listas filtradas
- `useCallback` para funções passadas como props
- `memo()` para componentes puros

### Batching de Updates:
- React 18 automatic batching
- Múltiplos setState agrupados

### Image Optimization:
- Signed URLs com cache
- Lazy loading de imagens
- Miniaturas para grids

---

## 19. SEGURANÇA

### Autenticação:
- JWT tokens via Supabase
- Session storage
- Auto-refresh tokens

### Autorização:
- Row Level Security
- Políticas por role
- Admin vs Driver permissions

### Validações:
- Client-side: UX
- Server-side: Security
- Edge functions: Business logic

### Dados Sensíveis:
- Senhas hasheadas (Supabase)
- Secrets em variáveis de ambiente
- NEVER hardcode API keys

### Storage:
- Buckets privados
- Signed URLs temporárias
- Upload permissions por role

---

## 20. ERROS COMUNS E SOLUÇÕES

### Problema: Google Maps recusa conexão
**Causa:** Preview em iframe
**Solução:** Função `openExternal()` que quebra iframe
```typescript
const openExternal = (url: string) => {
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  } catch {
    window.location.href = url;
  }
}
```

### Problema: Endereço errado na otimização
**Causa:** Não considera transportadora vinculada
**Solução:** Verificar `transporter_id` antes:
```typescript
const address = customer.transporter_id 
  ? customer.transporter.address 
  : customer.address;
```

### Problema: Fotos não aparecem
**Causa:** URLs não assinadas (bucket privado)
**Solução:** Gerar signed URLs:
```typescript
const { data } = await supabase.storage
  .from('delivery-photos')
  .createSignedUrl(path, 3600);
```

### Problema: Motorista não pode completar parada
**Causa:** RLS policy incorreta
**Solução:** Verificar policy permite UPDATE quando driver_id = auth.driver_id

---

## 21. CONFIGURAÇÕES IMPORTANTES

### Environment Variables:
```
VITE_SUPABASE_URL=https://projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
GOOGLE_MAPS_API_KEY=... (edge function)
SUPABASE_SERVICE_ROLE_KEY=... (edge function)
```

### Endereço Base (Constante):
```
Av. Humberto de Alencar Castelo Branco, 1260
Jardim Santo Ignacio
São Bernardo do Campo - SP
09850-300
```

### Formatos de Data:
- Database: YYYY-MM-DD
- Display BR: DD/MM/AAAA
- Time: HH:mm

### Limites:
- Fotos: 5MB cada
- Divisões de rota: 2-10
- Signed URLs: 1 hora de validade

---

## 22. RESUMO DE FUNCIONALIDADES

### Admin Pode:
✅ Criar, editar, excluir rotas
✅ Criar, editar, excluir motoristas
✅ Criar, editar, excluir clientes
✅ Criar, editar, excluir veículos
✅ Criar, editar, excluir despesas
✅ Visualizar todos os relatórios
✅ Otimizar rotas automaticamente
✅ Dividir rotas (6 métodos)
✅ Mesclar rotas
✅ Atribuir motoristas e veículos
✅ Importar dados via Excel
✅ Gerenciar contas de motoristas

### Motorista Pode:
✅ Ver rotas atribuídas
✅ Iniciar rotas (informar KM inicial)
✅ Reordenar paradas manualmente
✅ Completar entregas:
  - Informar horários
  - Coletar dados do responsável
  - Adicionar fotos
  - Coletar assinatura
  - Inserir observações
✅ Finalizar rotas (informar KM final)
✅ Registrar despesas das rotas
✅ Ver histórico de rotas
✅ Ver histórico de despesas

### Sistema Automaticamente:
✅ Otimiza rotas via Google Maps
✅ Calcula distâncias e tempos
✅ Usa endereço de transportadora quando vinculado
✅ Gera URLs de navegação (Google Maps + Waze)
✅ Divide rotas inteligentemente
✅ Valida dados em tempo real
✅ Gera relatórios com gráficos
✅ Gerencia permissões por role
✅ Upload e storage de imagens
✅ Importação batch via Excel

---

## CONCLUSÃO

Este sistema completo de gestão de entregas oferece:
- ✅ Interface intuitiva para admin e motoristas
- ✅ Otimização automática de rotas
- ✅ Múltiplos métodos de divisão
- ✅ Captura de evidências (fotos + assinatura)
- ✅ Relatórios detalhados
- ✅ Controle de despesas
- ✅ Importação em massa
- ✅ Integração com Google Maps
- ✅ Segurança robusta (RLS + Auth)
- ✅ Performance otimizada

**Total de Telas:** 15+
**Total de Componentes:** 40+
**Total de Edge Functions:** 2
**Total de Tabelas:** 6
**Total de Buckets:** 2

Este documento contém TODAS as informações do sistema nos mínimos detalhes.