export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  endereco?: string;
  valorDivida: number;
  dataVencimento: string;
  dataCadastro: string;
  jurosPercentual: number;
  status: 'ativo' | 'pago' | 'vencido';
  observacoes?: string;
  produtoComprado?: string;
}

export interface Transacao {
  id: string;
  clienteId?: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  data: string;
  categoria?: string;
}

export interface Despesa {
  id: string;
  nome: string;
  categoria: 'agua' | 'luz' | 'carro' | 'alimentacao' | 'aluguel' | 'internet' | 'telefone' | 'outros';
  valor: number;
  data: string;
  observacao?: string;
  recorrente?: boolean;
}

export interface RelatorioFinanceiro {
  totalEntradas: number;
  totalSaidas: number;
  lucroLiquido: number;
  clientesAtivos: number;
  clientesVencidos: number;
  valorTotalCredito: number;
  despesasPorCategoria: { [key: string]: number };
  totalDespesas: number;
}

export interface RelatorioMensal {
  mes: string;
  ano: number;
  totalRecebido: number;
  totalDividasPendentes: number;
  totalDespesas: number;
  lucroFinal: number;
  clientesPagaram: number;
  clientesInadimplentes: number;
}

export interface ConfiguracaoApp {
  nomeEmpresa: string;
  telefoneEmpresa: string;
  mensagemCobrancaPadrao: string;
  jurosPercentualPadrao: number;
  notificacoesAtivas: boolean;
}