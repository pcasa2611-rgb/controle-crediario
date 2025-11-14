import { Cliente, Transacao, Despesa, RelatorioFinanceiro, RelatorioMensal } from './types';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};

export const calcularJuros = (cliente: Cliente): number => {
  const hoje = new Date();
  const vencimento = new Date(cliente.dataVencimento);
  
  if (hoje <= vencimento) return 0;
  
  const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
  const jurosTotal = (cliente.valorDivida * cliente.jurosPercentual / 100) * diasAtraso;
  
  return jurosTotal;
};

export const calcularValorTotal = (cliente: Cliente): number => {
  return cliente.valorDivida + calcularJuros(cliente);
};

export const isVencido = (dataVencimento: string): boolean => {
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  return hoje > vencimento;
};

export const gerarRelatorio = (clientes: Cliente[], transacoes: Transacao[], despesas?: Despesa[]): RelatorioFinanceiro => {
  const totalEntradas = transacoes
    .filter(t => t.tipo === 'entrada')
    .reduce((sum, t) => sum + t.valor, 0);
    
  const totalSaidas = transacoes
    .filter(t => t.tipo === 'saida')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalDespesas = despesas ? despesas.reduce((sum, d) => sum + d.valor, 0) : 0;
    
  const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;
  const clientesVencidos = clientes.filter(c => isVencido(c.dataVencimento) && c.status === 'ativo').length;
  
  const valorTotalCredito = clientes
    .filter(c => c.status === 'ativo')
    .reduce((sum, c) => sum + calcularValorTotal(c), 0);

  const despesasPorCategoria = despesas ? despesas.reduce((acc, despesa) => {
    acc[despesa.categoria] = (acc[despesa.categoria] || 0) + despesa.valor;
    return acc;
  }, {} as { [key: string]: number }) : {};
  
  return {
    totalEntradas,
    totalSaidas: totalSaidas + totalDespesas,
    lucroLiquido: totalEntradas - (totalSaidas + totalDespesas),
    clientesAtivos,
    clientesVencidos,
    valorTotalCredito,
    despesasPorCategoria,
    totalDespesas,
  };
};

export const gerarRelatorioMensal = (clientes: Cliente[], transacoes: Transacao[], despesas: Despesa[], mes: number, ano: number): RelatorioMensal => {
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes, 0);

  const transacoesMes = transacoes.filter(t => {
    const dataTransacao = new Date(t.data);
    return dataTransacao >= inicioMes && dataTransacao <= fimMes;
  });

  const despesasMes = despesas.filter(d => {
    const dataDespesa = new Date(d.data);
    return dataDespesa >= inicioMes && dataDespesa <= fimMes;
  });

  const totalRecebido = transacoesMes
    .filter(t => t.tipo === 'entrada')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalDespesas = despesasMes.reduce((sum, d) => sum + d.valor, 0);

  const clientesPagaram = transacoesMes
    .filter(t => t.tipo === 'entrada' && t.clienteId)
    .map(t => t.clienteId)
    .filter((id, index, arr) => arr.indexOf(id) === index).length;

  const totalDividasPendentes = clientes
    .filter(c => c.status === 'ativo')
    .reduce((sum, c) => sum + calcularValorTotal(c), 0);

  const clientesInadimplentes = clientes.filter(c => 
    isVencido(c.dataVencimento) && c.status === 'ativo'
  ).length;

  return {
    mes: inicioMes.toLocaleDateString('pt-BR', { month: 'long' }),
    ano,
    totalRecebido,
    totalDividasPendentes,
    totalDespesas,
    lucroFinal: totalRecebido - totalDespesas,
    clientesPagaram,
    clientesInadimplentes,
  };
};

export const formatCPF = (cpf: string): string => {
  const numbers = cpf.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatPhone = (phone: string): string => {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};

export const gerarMensagemWhatsApp = (cliente: Cliente, mensagemTemplate: string): string => {
  const valorTotal = calcularValorTotal(cliente);
  return mensagemTemplate
    .replace('{nome}', cliente.nome)
    .replace('{valor}', formatCurrency(valorTotal))
    .replace('{data}', formatDate(cliente.dataVencimento));
};

export const abrirWhatsApp = (telefone: string, mensagem: string): void => {
  const numeroLimpo = telefone.replace(/\D/g, '');
  const numeroFormatado = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
  const mensagemCodificada = encodeURIComponent(mensagem);
  const url = `https://wa.me/${numeroFormatado}?text=${mensagemCodificada}`;
  window.open(url, '_blank');
};

export const exportarParaPDF = (dados: any, nomeArquivo: string): void => {
  // Implementação básica - em produção usaria uma biblioteca como jsPDF
  const dataStr = JSON.stringify(dados, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const categoriasDespesas = [
  { value: 'agua', label: 'Água' },
  { value: 'luz', label: 'Luz' },
  { value: 'carro', label: 'Carro' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'internet', label: 'Internet' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'outros', label: 'Outros' },
];