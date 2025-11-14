'use client';

import { useState, useEffect } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import { User } from '@/lib/auth-types';
import { 
  Plus, Users, TrendingUp, AlertTriangle, DollarSign, Calendar, Phone, CreditCard, 
  Trash2, Check, X, MessageCircle, Receipt, Settings, PieChart, Download,
  Home, ShoppingCart, FileText, Bell, Edit3, MapPin, LogOut, Search, Undo2,
  Upload, UserPlus, Contact, Import
} from 'lucide-react';
import { useClientes, useTransacoes, useDespesas, useConfiguracoes } from '@/hooks/useStorage';
import { Cliente, Despesa, Transacao } from '@/lib/types';
import { 
  formatCurrency, 
  formatDate, 
  calcularJuros, 
  calcularValorTotal, 
  isVencido, 
  gerarRelatorio,
  gerarRelatorioMensal,
  formatCPF,
  formatPhone,
  gerarMensagemWhatsApp,
  abrirWhatsApp,
  exportarParaPDF,
  categoriasDespesas
} from '@/lib/utils';

type TabType = 'dashboard' | 'clientes' | 'despesas' | 'relatorios' | 'configuracoes';

export default function CrediarioPro() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showClientForm, setShowClientForm] = useState(false);
  const [showDespesaForm, setShowDespesaForm] = useState(false);
  const [showImportContacts, setShowImportContacts] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [editingTransacao, setEditingTransacao] = useState<Transacao | null>(null);
  
  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null);
  const [showEditTransacao, setShowEditTransacao] = useState(false);
  const [showBuscaAviso, setShowBuscaAviso] = useState(false);
  
  // Estados para importação de contatos
  const [contactsText, setContactsText] = useState('');
  const [importedContacts, setImportedContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  
  const { clientes, adicionarCliente, atualizarCliente, removerCliente, marcarComoPago, buscarCliente, verificarClienteExistente } = useClientes();
  const { transacoes, adicionarTransacao, atualizarTransacao, removerTransacao } = useTransacoes();
  const { despesas, adicionarDespesa, atualizarDespesa, removerDespesa } = useDespesas();
  const { configuracoes, atualizarConfiguracoes } = useConfiguracoes();

  const [clientForm, setClientForm] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    endereco: '',
    valorDivida: '',
    dataVencimento: '',
    jurosPercentual: configuracoes.jurosPercentualPadrao.toString(),
    observacoes: '',
    produtoComprado: ''
  });

  const [despesaForm, setDespesaForm] = useState({
    nome: '',
    categoria: 'outros' as const,
    valor: '',
    data: new Date().toISOString().split('T')[0],
    observacao: '',
    recorrente: false
  });

  const [transacaoForm, setTransacaoForm] = useState({
    descricao: '',
    valor: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    categoria: ''
  });

  const [configForm, setConfigForm] = useState(configuracoes);

  const relatorio = gerarRelatorio(clientes, transacoes, despesas);
  const clientesVencidos = clientes.filter(c => isVencido(c.dataVencimento) && c.status === 'ativo');
  const relatorioMensal = gerarRelatorioMensal(clientes, transacoes, despesas, new Date().getMonth() + 1, new Date().getFullYear());

  // Verificar se usuário está logado
  useEffect(() => {
    const savedUser = localStorage.getItem('crediario_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setConfigForm(configuracoes);
  }, [configuracoes]);

  useEffect(() => {
    // Notificações para clientes vencidos
    if (clientesVencidos.length > 0 && configuracoes.notificacoesAtivas && user) {
      const timer = setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification(`⚠️ ${clientesVencidos.length} cliente(s) com pagamento em atraso!`, {
            body: 'Clique para ver os detalhes no Crediário Pro',
            icon: '/icon.svg'
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [clientesVencidos.length, configuracoes.notificacoesAtivas, user]);

  // Busca de clientes melhorada
  useEffect(() => {
    if (searchTerm.trim()) {
      const clienteExistente = buscarCliente(searchTerm);
      setClienteEncontrado(clienteExistente);
      setShowBuscaAviso(true);
    } else {
      setClienteEncontrado(null);
      setShowBuscaAviso(false);
    }
  }, [searchTerm, clientes, buscarCliente]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('crediario_user');
    setUser(null);
    setActiveTab('dashboard');
  };

  // Função para processar contatos importados
  const processImportedContacts = () => {
    if (!contactsText.trim()) {
      alert('❌ Por favor, cole os contatos no campo de texto.');
      return;
    }

    const lines = contactsText.split('\n').filter(line => line.trim());
    const contacts: any[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Tentar extrair nome e telefone de diferentes formatos
      let nome = '';
      let telefone = '';

      // Formato: "Nome - (11) 99999-9999" ou "Nome: (11) 99999-9999"
      const formatoComSeparador = trimmedLine.match(/^(.+?)[\s\-:]+(\(?[\d\s\-\(\)]+\)?)$/);
      if (formatoComSeparador) {
        nome = formatoComSeparador[1].trim();
        telefone = formatoComSeparador[2].trim();
      }
      // Formato: apenas número
      else if (/^[\d\s\-\(\)]+$/.test(trimmedLine)) {
        telefone = trimmedLine;
        nome = `Contato ${index + 1}`;
      }
      // Formato: apenas nome (sem número)
      else if (!/[\d]/.test(trimmedLine)) {
        nome = trimmedLine;
        telefone = '';
      }
      // Formato livre - tentar extrair o que for possível
      else {
        const phoneMatch = trimmedLine.match(/(\(?[\d\s\-\(\)]{8,}\)?)/);
        if (phoneMatch) {
          telefone = phoneMatch[1];
          nome = trimmedLine.replace(phoneMatch[1], '').replace(/[\-:]/g, '').trim();
        } else {
          nome = trimmedLine;
        }
      }

      if (nome || telefone) {
        contacts.push({
          id: index,
          nome: nome || `Contato ${index + 1}`,
          telefone: telefone.replace(/[^\d]/g, ''), // Limpar formatação
          original: trimmedLine
        });
      }
    });

    setImportedContacts(contacts);
    setSelectedContacts(new Set(contacts.map(c => c.id)));
  };

  // Função para importar contatos selecionados
  const importSelectedContacts = () => {
    if (selectedContacts.size === 0) {
      alert('❌ Selecione pelo menos um contato para importar.');
      return;
    }

    let importedCount = 0;
    let duplicatedCount = 0;

    selectedContacts.forEach(contactId => {
      const contact = importedContacts.find(c => c.id === contactId);
      if (contact) {
        // Verificar se cliente já existe
        const clienteExistente = verificarClienteExistente(contact.nome);
        
        if (!clienteExistente) {
          // Adicionar novo cliente
          adicionarCliente({
            nome: contact.nome,
            telefone: contact.telefone,
            cpf: '',
            endereco: '',
            valorDivida: 0,
            dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
            jurosPercentual: configuracoes.jurosPercentualPadrao,
            observacoes: `Importado de contatos - Original: ${contact.original}`,
            produtoComprado: ''
          });
          importedCount++;
        } else {
          duplicatedCount++;
        }
      }
    });

    alert(`✅ Importação concluída!\n\n📥 ${importedCount} contatos importados\n⚠️ ${duplicatedCount} contatos já existiam`);
    
    // Limpar formulário
    setContactsText('');
    setImportedContacts([]);
    setSelectedContacts(new Set());
    setShowImportContacts(false);
  };

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar se cliente já existe (prevenção de duplicados melhorada)
    const clienteJaExiste = verificarClienteExistente(clientForm.nome, editingClient?.id);

    if (clienteJaExiste && !editingClient) {
      alert(`❌ Cliente "${clientForm.nome}" já está cadastrado!\n\n✅ Use a busca acima para encontrar e editar os dados existentes.`);
      return;
    }
    
    const clienteData = {
      nome: clientForm.nome.trim(),
      telefone: clientForm.telefone,
      cpf: clientForm.cpf,
      endereco: clientForm.endereco,
      valorDivida: parseFloat(clientForm.valorDivida),
      dataVencimento: clientForm.dataVencimento,
      jurosPercentual: parseFloat(clientForm.jurosPercentual),
      observacoes: clientForm.observacoes,
      produtoComprado: clientForm.produtoComprado
    };

    if (editingClient) {
      atualizarCliente(editingClient.id, clienteData);
      setEditingClient(null);
      alert('✅ Cliente atualizado com sucesso!');
    } else {
      adicionarCliente(clienteData);
      alert('✅ Cliente cadastrado com sucesso!');
    }

    resetClientForm();
  };

  const handleDespesaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const despesaData = {
      nome: despesaForm.nome.trim(),
      categoria: despesaForm.categoria,
      valor: parseFloat(despesaForm.valor),
      data: despesaForm.data,
      observacao: despesaForm.observacao,
      recorrente: despesaForm.recorrente
    };

    if (editingDespesa) {
      atualizarDespesa(editingDespesa.id, despesaData);
      alert('✅ Despesa atualizada com sucesso!');
      setEditingDespesa(null);
    } else {
      adicionarDespesa(despesaData);
      // Adicionar como transação de saída
      adicionarTransacao({
        tipo: 'saida',
        valor: despesaData.valor,
        descricao: `Despesa: ${despesaData.nome}`,
        categoria: despesaData.categoria
      });
      alert('✅ Despesa cadastrada com sucesso!');
    }

    resetDespesaForm();
  };

  const handleTransacaoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const transacaoData = {
      tipo: transacaoForm.tipo,
      valor: parseFloat(transacaoForm.valor),
      descricao: transacaoForm.descricao.trim(),
      categoria: transacaoForm.categoria
    };

    if (editingTransacao) {
      atualizarTransacao(editingTransacao.id, transacaoData);
      setEditingTransacao(null);
      alert('✅ Transação atualizada com sucesso!');
    } else {
      adicionarTransacao(transacaoData);
      alert('✅ Transação adicionada com sucesso!');
    }

    resetTransacaoForm();
  };

  const handleEditClient = (cliente: Cliente) => {
    setEditingClient(cliente);
    setClientForm({
      nome: cliente.nome,
      telefone: cliente.telefone,
      cpf: cliente.cpf,
      endereco: cliente.endereco || '',
      valorDivida: cliente.valorDivida.toString(),
      dataVencimento: cliente.dataVencimento,
      jurosPercentual: cliente.jurosPercentual.toString(),
      observacoes: cliente.observacoes || '',
      produtoComprado: cliente.produtoComprado || ''
    });
    setShowClientForm(true);
    // Limpar busca ao editar
    setSearchTerm('');
    setClienteEncontrado(null);
    setShowBuscaAviso(false);
  };

  const handleEditDespesa = (despesa: Despesa) => {
    setEditingDespesa(despesa);
    setDespesaForm({
      nome: despesa.nome,
      categoria: despesa.categoria,
      valor: despesa.valor.toString(),
      data: despesa.data,
      observacao: despesa.observacao || '',
      recorrente: despesa.recorrente || false
    });
    setShowDespesaForm(true);
  };

  const handleEditTransacao = (transacao: Transacao) => {
    setEditingTransacao(transacao);
    setTransacaoForm({
      descricao: transacao.descricao,
      valor: transacao.valor.toString(),
      tipo: transacao.tipo,
      categoria: transacao.categoria || ''
    });
    setShowEditTransacao(true);
  };

  const handlePagamento = (cliente: Cliente) => {
    const valorTotal = calcularValorTotal(cliente);
    if (confirm(`Confirmar pagamento de ${formatCurrency(valorTotal)} do cliente ${cliente.nome}?`)) {
      adicionarTransacao({
        clienteId: cliente.id,
        tipo: 'entrada',
        valor: valorTotal,
        descricao: `Pagamento de ${cliente.nome}`,
        categoria: 'pagamento'
      });
      marcarComoPago(cliente.id);
      alert('✅ Pagamento registrado com sucesso!');
    }
  };

  const handleDesfazerPagamento = (transacao: Transacao) => {
    if (confirm(`Desfazer pagamento de ${formatCurrency(transacao.valor)}?\n\nEsta ação irá:\n- Reativar o cliente\n- Remover a transação de pagamento`)) {
      if (transacao.clienteId && transacao.tipo === 'entrada') {
        // Reativar cliente
        const cliente = clientes.find(c => c.id === transacao.clienteId);
        if (cliente && cliente.status === 'pago') {
          atualizarCliente(cliente.id, { ...cliente, status: 'ativo' });
        }
        // Remover transação
        removerTransacao(transacao.id);
        alert('✅ Pagamento desfeito com sucesso!');
      }
    }
  };

  const handleWhatsApp = (cliente: Cliente) => {
    const mensagem = gerarMensagemWhatsApp(cliente, configuracoes.mensagemCobrancaPadrao);
    abrirWhatsApp(cliente.telefone, mensagem);
  };

  const handleBuscarCliente = () => {
    if (clienteEncontrado) {
      handleEditClient(clienteEncontrado);
    }
  };

  const resetClientForm = () => {
    setClientForm({
      nome: '',
      telefone: '',
      cpf: '',
      endereco: '',
      valorDivida: '',
      dataVencimento: '',
      jurosPercentual: configuracoes.jurosPercentualPadrao.toString(),
      observacoes: '',
      produtoComprado: ''
    });
    setEditingClient(null);
    setShowClientForm(false);
    setSearchTerm('');
    setClienteEncontrado(null);
    setShowBuscaAviso(false);
  };

  const resetDespesaForm = () => {
    setDespesaForm({
      nome: '',
      categoria: 'outros',
      valor: '',
      data: new Date().toISOString().split('T')[0],
      observacao: '',
      recorrente: false
    });
    setEditingDespesa(null);
    setShowDespesaForm(false);
  };

  const resetTransacaoForm = () => {
    setTransacaoForm({
      descricao: '',
      valor: '',
      tipo: 'entrada',
      categoria: ''
    });
    setEditingTransacao(null);
    setShowEditTransacao(false);
  };

  const handleConfigSave = () => {
    atualizarConfiguracoes(configForm);
    alert('✅ Configurações salvas com sucesso!');
  };

  const exportarRelatorio = () => {
    const dadosExportacao = {
      relatorio,
      relatorioMensal,
      clientes: clientes.filter(c => c.status === 'ativo'),
      despesas,
      dataExportacao: new Date().toISOString()
    };
    exportarParaPDF(dadosExportacao, `relatorio-${new Date().toISOString().split('T')[0]}`);
  };

  // Mostrar loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 text-lg">Carregando Crediário Pro...</p>
        </div>
      </div>
    );
  }

  // Mostrar tela de login se não estiver autenticado
  if (!user) {
    return (
      <LoginForm 
        onLogin={handleLogin}
        onToggleMode={() => setIsRegisterMode(!isRegisterMode)}
        isRegisterMode={isRegisterMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-emerald-500 to-blue-600 p-3 rounded-2xl">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  Crediário Pro
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {user.businessName} - Bem-vindo, {user.name}!
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Alertas de vencimento */}
              {clientesVencidos.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 shadow-lg">
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-red-700 dark:text-red-300 font-semibold">
                      {clientesVencidos.length} cliente(s) em atraso
                    </p>
                    <p className="text-red-600 dark:text-red-400 text-sm">
                      Clique em "Clientes" para ver detalhes
                    </p>
                  </div>
                </div>
              )}

              {/* Botão de Logout */}
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl mb-6 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'clientes', label: 'Clientes', icon: Users },
              { id: 'despesas', label: 'Despesas', icon: ShoppingCart },
              { id: 'relatorios', label: 'Relatórios', icon: FileText },
              { id: 'configuracoes', label: 'Configurações', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex-1 min-w-0 py-4 px-3 sm:px-6 text-center font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === id
                    ? 'text-emerald-600 border-b-3 border-emerald-600 bg-gradient-to-t from-emerald-50 to-transparent dark:from-emerald-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Dashboard Financeiro
                  </h2>
                  <button
                    onClick={exportarRelatorio}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-100 text-sm font-medium">Total de Entradas</p>
                        <p className="text-2xl font-bold">{formatCurrency(relatorio.totalEntradas)}</p>
                      </div>
                      <div className="bg-emerald-400/30 p-3 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100 text-sm font-medium">Total de Saídas</p>
                        <p className="text-2xl font-bold">{formatCurrency(relatorio.totalSaidas)}</p>
                      </div>
                      <div className="bg-red-400/30 p-3 rounded-xl">
                        <TrendingUp className="w-6 h-6 rotate-180" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Lucro Líquido</p>
                        <p className="text-2xl font-bold">{formatCurrency(relatorio.lucroLiquido)}</p>
                      </div>
                      <div className="bg-blue-400/30 p-3 rounded-xl">
                        <DollarSign className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Total em Crédito</p>
                        <p className="text-2xl font-bold">{formatCurrency(relatorio.valorTotalCredito)}</p>
                      </div>
                      <div className="bg-purple-400/30 p-3 rounded-xl">
                        <CreditCard className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo de Clientes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      Status dos Clientes
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <span className="text-gray-700 dark:text-gray-300">Clientes Ativos</span>
                        <span className="font-bold text-emerald-600">{relatorio.clientesAtivos}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="text-gray-700 dark:text-gray-300">Clientes Vencidos</span>
                        <span className="font-bold text-red-600">{relatorio.clientesVencidos}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-blue-600" />
                      Relatório Mensal
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Mês Atual:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-100">
                          {relatorioMensal.mes} {relatorioMensal.ano}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Lucro Final:</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(relatorioMensal.lucroFinal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Clientes */}
            {activeTab === 'clientes' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Gestão de Clientes
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowImportContacts(!showImportContacts)}
                      className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <Import className="w-4 h-4" />
                      Importar Contatos
                    </button>
                    <button
                      onClick={() => setShowClientForm(!showClientForm)}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <Plus className="w-5 h-5" />
                      Novo Cliente
                    </button>
                  </div>
                </div>

                {/* Importação de Contatos */}
                {showImportContacts && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Contact className="w-6 h-6 text-purple-600" />
                      📱 Importar Contatos do Celular ou WhatsApp Web
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">📋 Como importar:</h4>
                        <ul className="text-blue-700 dark:text-blue-400 text-sm space-y-1">
                          <li>• <strong>WhatsApp Web:</strong> Copie a lista de contatos e cole abaixo</li>
                          <li>• <strong>Celular:</strong> Exporte contatos como texto e cole aqui</li>
                          <li>• <strong>Formato aceito:</strong> "Nome - (11) 99999-9999" ou "Nome: 11999999999"</li>
                          <li>• <strong>Flexível:</strong> Funciona com vários formatos de texto</li>
                        </ul>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Cole seus contatos aqui (um por linha):
                        </label>
                        <textarea
                          value={contactsText}
                          onChange={(e) => setContactsText(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="João Silva - (11) 99999-9999&#10;Maria Santos: 11888888888&#10;Pedro Costa - 11777777777&#10;Ana Oliveira (11) 96666-6666"
                          rows={8}
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={processImportedContacts}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
                        >
                          <Upload className="w-4 h-4" />
                          Processar Contatos
                        </button>
                        <button
                          onClick={() => {
                            setShowImportContacts(false);
                            setContactsText('');
                            setImportedContacts([]);
                            setSelectedContacts(new Set());
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                      </div>

                      {/* Lista de contatos processados */}
                      {importedContacts.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
                            📋 Contatos encontrados ({importedContacts.length}):
                          </h4>
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700">
                            <div className="space-y-2">
                              {importedContacts.map((contact) => (
                                <label key={contact.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedContacts.has(contact.id)}
                                    onChange={(e) => {
                                      const newSelected = new Set(selectedContacts);
                                      if (e.target.checked) {
                                        newSelected.add(contact.id);
                                      } else {
                                        newSelected.delete(contact.id);
                                      }
                                      setSelectedContacts(newSelected);
                                    }}
                                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-800 dark:text-gray-100">
                                      {contact.nome}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {contact.telefone ? formatPhone(contact.telefone) : 'Sem telefone'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                      Original: {contact.original}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={() => setSelectedContacts(new Set(importedContacts.map(c => c.id)))}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300"
                            >
                              Selecionar Todos
                            </button>
                            <button
                              onClick={() => setSelectedContacts(new Set())}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300"
                            >
                              Desmarcar Todos
                            </button>
                            <button
                              onClick={importSelectedContacts}
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-2"
                            >
                              <UserPlus className="w-4 h-4" />
                              Importar Selecionados ({selectedContacts.size})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Busca de Cliente Melhorada */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-600" />
                    🔍 Buscar Cliente Existente
                  </h3>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                        placeholder="Digite o nome do cliente para buscar..."
                      />
                    </div>
                    {clienteEncontrado && (
                      <button
                        onClick={handleBuscarCliente}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar
                      </button>
                    )}
                  </div>
                  
                  {/* Feedback da Busca */}
                  {showBuscaAviso && searchTerm && (
                    <div className="mt-4">
                      {clienteEncontrado ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                              <Check className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-green-800 dark:text-green-300 font-semibold">
                                ✅ Cliente encontrado: {clienteEncontrado.nome}
                              </p>
                              <p className="text-green-600 dark:text-green-400 text-sm">
                                Telefone: {formatPhone(clienteEncontrado.telefone)} • 
                                Dívida: {formatCurrency(calcularValorTotal(clienteEncontrado))}
                              </p>
                              <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                                👆 Clique em "Editar" para modificar dados ou adicionar nova compra
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
                              <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-yellow-800 dark:text-yellow-300 font-semibold">
                                ⚠️ Cliente "{searchTerm}" não encontrado
                              </p>
                              <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                                Você pode cadastrar um novo cliente com este nome abaixo
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Formulário de Cliente */}
                {showClientForm && (
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-600 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-emerald-600" />
                      {editingClient ? `✏️ Editando: ${editingClient.nome}` : '➕ Novo Cliente'}
                    </h3>
                    <form onSubmit={handleClientSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          required
                          value={clientForm.nome}
                          onChange={(e) => setClientForm({...clientForm, nome: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="Digite o nome do cliente"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Telefone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={clientForm.telefone}
                          onChange={(e) => setClientForm({...clientForm, telefone: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="(11) 99999-9999"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          CPF *
                        </label>
                        <input
                          type="text"
                          required
                          value={clientForm.cpf}
                          onChange={(e) => setClientForm({...clientForm, cpf: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="000.000.000-00"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Endereço
                        </label>
                        <input
                          type="text"
                          value={clientForm.endereco}
                          onChange={(e) => setClientForm({...clientForm, endereco: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="Rua, número, bairro, cidade"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Valor da Dívida (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={clientForm.valorDivida}
                          onChange={(e) => setClientForm({...clientForm, valorDivida: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="0,00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Data de Vencimento *
                        </label>
                        <input
                          type="date"
                          required
                          value={clientForm.dataVencimento}
                          onChange={(e) => setClientForm({...clientForm, dataVencimento: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Juros por Dia (%) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={clientForm.jurosPercentual}
                          onChange={(e) => setClientForm({...clientForm, jurosPercentual: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="2.0"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Produto/Serviço Comprado
                        </label>
                        <input
                          type="text"
                          value={clientForm.produtoComprado}
                          onChange={(e) => setClientForm({...clientForm, produtoComprado: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="Descreva o que foi vendido"
                        />
                      </div>

                      <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Observações
                        </label>
                        <textarea
                          value={clientForm.observacoes}
                          onChange={(e) => setClientForm({...clientForm, observacoes: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="Informações adicionais sobre o cliente"
                          rows={3}
                        />
                      </div>

                      <div className="lg:col-span-3 flex gap-3 pt-4">
                        <button
                          type="submit"
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg"
                        >
                          <Check className="w-4 h-4" />
                          {editingClient ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
                        </button>
                        <button
                          type="button"
                          onClick={resetClientForm}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Lista de Clientes */}
                <div className="space-y-4">
                  {clientes.filter(c => c.status === 'ativo').length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                      <Users className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-medium">
                        Nenhum cliente cadastrado ainda
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 mt-2">
                        Clique em "Novo Cliente" ou "Importar Contatos" para começar
                      </p>
                    </div>
                  ) : (
                    clientes
                      .filter(c => c.status === 'ativo')
                      .map((cliente) => {
                        const juros = calcularJuros(cliente);
                        const valorTotal = calcularValorTotal(cliente);
                        const vencido = isVencido(cliente.dataVencimento);

                        return (
                          <div
                            key={cliente.id}
                            className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-l-4 transition-all duration-300 hover:shadow-2xl ${
                              vencido 
                                ? 'border-red-500 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10' 
                                : 'border-emerald-500'
                            }`}
                          >
                            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                              <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3">
                                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                    {cliente.nome}
                                  </h3>
                                  {vencido && (
                                    <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-semibold animate-pulse">
                                      VENCIDO
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                                    <Phone className="w-4 h-4 text-emerald-600" />
                                    {formatPhone(cliente.telefone)}
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                    {formatCPF(cliente.cpf)}
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                                    <Calendar className="w-4 h-4 text-purple-600" />
                                    Vence: {formatDate(cliente.dataVencimento)}
                                  </div>
                                  {cliente.endereco && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg sm:col-span-2">
                                      <MapPin className="w-4 h-4 text-orange-600" />
                                      {cliente.endereco}
                                    </div>
                                  )}
                                  {cliente.produtoComprado && (
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                                      <Receipt className="w-4 h-4 text-indigo-600" />
                                      {cliente.produtoComprado}
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-4 pt-2">
                                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Valor Original</span>
                                    <p className="font-bold text-blue-800 dark:text-blue-300 text-lg">
                                      {formatCurrency(cliente.valorDivida)}
                                    </p>
                                  </div>
                                  {juros > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                      <span className="text-red-600 dark:text-red-400 text-sm font-medium">Juros Acumulados</span>
                                      <p className="font-bold text-red-800 dark:text-red-300 text-lg">
                                        {formatCurrency(juros)}
                                      </p>
                                    </div>
                                  )}
                                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                                    <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Total a Receber</span>
                                    <p className="font-bold text-emerald-800 dark:text-emerald-300 text-xl">
                                      {formatCurrency(valorTotal)}
                                    </p>
                                  </div>
                                </div>

                                {cliente.observacoes && (
                                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border-l-4 border-yellow-400">
                                    <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                                      <strong>Obs:</strong> {cliente.observacoes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row xl:flex-col gap-2 min-w-0 sm:min-w-fit">
                                <button
                                  onClick={() => handleWhatsApp(cliente)}
                                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-2 shadow-lg"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  WhatsApp
                                </button>
                                <button
                                  onClick={() => handleEditClient(cliente)}
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-2"
                                >
                                  <Edit3 className="w-4 h-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handlePagamento(cliente)}
                                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-2"
                                >
                                  <Check className="w-4 h-4" />
                                  Pago
                                </button>
                                <button
                                  onClick={() => removerCliente(cliente.id)}
                                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remover
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}

            {/* Despesas */}
            {activeTab === 'despesas' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Controle de Despesas
                  </h2>
                  <button
                    onClick={() => setShowDespesaForm(!showDespesaForm)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-5 h-5" />
                    Nova Despesa
                  </button>
                </div>

                {/* Resumo de Despesas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Total de Despesas</p>
                        <p className="text-2xl font-bold">{formatCurrency(relatorio.totalDespesas)}</p>
                      </div>
                      <div className="bg-orange-400/30 p-3 rounded-xl">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Despesas Este Mês</p>
                        <p className="text-2xl font-bold">{formatCurrency(relatorioMensal.totalDespesas)}</p>
                      </div>
                      <div className="bg-purple-400/30 p-3 rounded-xl">
                        <Calendar className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-teal-100 text-sm font-medium">Categorias</p>
                        <p className="text-2xl font-bold">{Object.keys(relatorio.despesasPorCategoria).length}</p>
                      </div>
                      <div className="bg-teal-400/30 p-3 rounded-xl">
                        <PieChart className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formulário de Despesa */}
                {showDespesaForm && (
                  <div className="bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-600 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                      {editingDespesa ? `✏️ Editando: ${editingDespesa.nome}` : '➕ Nova Despesa'}
                    </h3>
                    <form onSubmit={handleDespesaSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nome da Despesa *
                        </label>
                        <input
                          type="text"
                          required
                          value={despesaForm.nome}
                          onChange={(e) => setDespesaForm({...despesaForm, nome: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="Ex: Conta de luz"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Categoria *
                        </label>
                        <select
                          required
                          value={despesaForm.categoria}
                          onChange={(e) => setDespesaForm({...despesaForm, categoria: e.target.value as any})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                        >
                          {categoriasDespesas.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Valor (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={despesaForm.valor}
                          onChange={(e) => setDespesaForm({...despesaForm, valor: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="0,00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Data *
                        </label>
                        <input
                          type="date"
                          required
                          value={despesaForm.data}
                          onChange={(e) => setDespesaForm({...despesaForm, data: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Observação
                        </label>
                        <input
                          type="text"
                          value={despesaForm.observacao}
                          onChange={(e) => setDespesaForm({...despesaForm, observacao: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          placeholder="Informações adicionais"
                        />
                      </div>

                      <div className="lg:col-span-3 flex items-center gap-4">
                        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={despesaForm.recorrente}
                            onChange={(e) => setDespesaForm({...despesaForm, recorrente: e.target.checked})}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          Despesa recorrente
                        </label>
                      </div>

                      <div className="lg:col-span-3 flex gap-3 pt-4">
                        <button
                          type="submit"
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg"
                        >
                          <Check className="w-4 h-4" />
                          {editingDespesa ? 'Atualizar Despesa' : 'Cadastrar Despesa'}
                        </button>
                        <button
                          type="button"
                          onClick={resetDespesaForm}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Lista de Despesas */}
                <div className="space-y-4">
                  {despesas.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                      <ShoppingCart className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-medium">
                        Nenhuma despesa cadastrada ainda
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 mt-2">
                        Clique em "Nova Despesa" para começar
                      </p>
                    </div>
                  ) : (
                    despesas
                      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                      .map((despesa) => (
                        <div
                          key={despesa.id}
                          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border-l-4 border-orange-500 transition-all duration-300 hover:shadow-2xl"
                        >
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                  {despesa.nome}
                                </h3>
                                <span className="bg-orange-100 text-orange-800 text-xs px-3 py-1 rounded-full font-semibold">
                                  {categoriasDespesas.find(c => c.value === despesa.categoria)?.label}
                                </span>
                                {despesa.recorrente && (
                                  <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-semibold">
                                    RECORRENTE
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                  {formatDate(despesa.data)}
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="font-bold text-orange-600 text-lg">
                                    {formatCurrency(despesa.valor)}
                                  </span>
                                </div>
                              </div>

                              {despesa.observacao && (
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    <strong>Obs:</strong> {despesa.observacao}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditDespesa(despesa)}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-2"
                              >
                                <Edit3 className="w-4 h-4" />
                                Editar
                              </button>
                              <button
                                onClick={() => removerDespesa(despesa.id)}
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* Relatórios */}
            {activeTab === 'relatorios' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Relatórios Financeiros
                  </h2>
                  <button
                    onClick={exportarRelatorio}
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Download className="w-5 h-5" />
                    Exportar Relatório
                  </button>
                </div>

                {/* Cards de Resumo Detalhado */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-emerald-400/30 p-3 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-100 text-sm font-medium">Total de Entradas</p>
                        <p className="text-2xl font-bold">{formatCurrency(relatorio.totalEntradas)}</p>
                      </div>
                    </div>
                    <div className="text-emerald-100 text-sm">
                      Pagamentos recebidos de clientes
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-red-400/30 p-3 rounded-xl">
                        <TrendingUp className="w-6 h-6 rotate-180" />
                      </div>
                      <div className="text-right">
                        <p className="text-red-100 text-sm font-medium">Total de Saídas</p>
                        <p className="text-2xl font-bold">{formatCurrency(relatorio.totalSaidas)}</p>
                      </div>
                    </div>
                    <div className="text-red-100 text-sm">
                      Despesas e custos operacionais
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-400/30 p-3 rounded-xl">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <p className="text-blue-100 text-sm font-medium">Lucro Líquido</p>
                        <p className={`text-2xl font-bold ${relatorio.lucroLiquido >= 0 ? 'text-white' : 'text-red-200'}`}>
                          {formatCurrency(relatorio.lucroLiquido)}
                        </p>
                      </div>
                    </div>
                    <div className="text-blue-100 text-sm">
                      {relatorio.lucroLiquido >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-purple-400/30 p-3 rounded-xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <p className="text-purple-100 text-sm font-medium">Clientes Ativos</p>
                        <p className="text-2xl font-bold">{relatorio.clientesAtivos}</p>
                      </div>
                    </div>
                    <div className="text-purple-100 text-sm">
                      Clientes com dívidas pendentes
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-orange-400/30 p-3 rounded-xl">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <p className="text-orange-100 text-sm font-medium">Clientes Vencidos</p>
                        <p className="text-2xl font-bold">{relatorio.clientesVencidos}</p>
                      </div>
                    </div>
                    <div className="text-orange-100 text-sm">
                      Clientes com pagamento em atraso
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-teal-400/30 p-3 rounded-xl">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div className="text-right">
                        <p className="text-teal-100 text-sm font-medium">Total em Crédito</p>
                        <p className="text-2xl font-bold">{formatCurrency(relatorio.valorTotalCredito)}</p>
                      </div>
                    </div>
                    <div className="text-teal-100 text-sm">
                      Valor total a receber (com juros)
                    </div>
                  </div>
                </div>

                {/* Relatório Mensal */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                    Relatório Mensal - {relatorioMensal.mes} {relatorioMensal.ano}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Total Recebido</p>
                          <p className="text-emerald-800 dark:text-emerald-300 text-lg font-bold">
                            {formatCurrency(relatorioMensal.totalRecebido)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                          <ShoppingCart className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-red-600 dark:text-red-400 text-sm font-medium">Total Despesas</p>
                          <p className="text-red-800 dark:text-red-300 text-lg font-bold">
                            {formatCurrency(relatorioMensal.totalDespesas)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Lucro Final</p>
                          <p className={`text-lg font-bold ${
                            relatorioMensal.lucroFinal >= 0 
                              ? 'text-blue-800 dark:text-blue-300' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(relatorioMensal.lucroFinal)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Clientes Pagaram</p>
                          <p className="text-purple-800 dark:text-purple-300 text-lg font-bold">
                            {relatorioMensal.clientesPagaram}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Despesas por Categoria */}
                {Object.keys(relatorio.despesasPorCategoria).length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                      <PieChart className="w-6 h-6 text-orange-600" />
                      Despesas por Categoria
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(relatorio.despesasPorCategoria).map(([categoria, valor]) => {
                        const categoriaInfo = categoriasDespesas.find(c => c.value === categoria);
                        const percentual = (valor / relatorio.totalDespesas) * 100;
                        
                        return (
                          <div key={categoria} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">
                                {categoriaInfo?.label || categoria}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400 text-sm">
                                {percentual.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                {formatCurrency(valor)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                              <div 
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentual}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Histórico de Transações com Edição Melhorado */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <Receipt className="w-6 h-6 text-blue-600" />
                      Últimas Transações
                    </h3>
                  </div>
                  
                  {/* Formulário de Edição de Transação */}
                  {showEditTransacao && (
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-600">
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                        ✏️ Editar Transação
                      </h4>
                      <form onSubmit={handleTransacaoSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Descrição *
                          </label>
                          <input
                            type="text"
                            required
                            value={transacaoForm.descricao}
                            onChange={(e) => setTransacaoForm({...transacaoForm, descricao: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Valor (R$) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={transacaoForm.valor}
                            onChange={(e) => setTransacaoForm({...transacaoForm, valor: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo *
                          </label>
                          <select
                            required
                            value={transacaoForm.tipo}
                            onChange={(e) => setTransacaoForm({...transacaoForm, tipo: e.target.value as 'entrada' | 'saida'})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                          >
                            <option value="entrada">Entrada</option>
                            <option value="saida">Saída</option>
                          </select>
                        </div>
                        <div className="flex gap-2 items-end">
                          <button
                            type="submit"
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={resetTransacaoForm}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {transacoes.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        Nenhuma transação registrada ainda
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {transacoes
                        .slice(-20)
                        .reverse()
                        .map((transacao) => (
                          <div
                            key={transacao.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-4 h-4 rounded-full ${
                                transacao.tipo === 'entrada' ? 'bg-emerald-500' : 'bg-red-500'
                              }`} />
                              <div>
                                <p className="font-medium text-gray-800 dark:text-gray-100">
                                  {transacao.descricao}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(transacao.data)} • {transacao.categoria || 'Geral'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`font-bold text-lg ${
                                transacao.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {transacao.tipo === 'entrada' ? '+' : '-'}{formatCurrency(transacao.valor)}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditTransacao(transacao)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded text-xs transition-all duration-300"
                                  title="Editar transação"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                {transacao.clienteId && transacao.tipo === 'entrada' && (
                                  <button
                                    onClick={() => handleDesfazerPagamento(transacao)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white p-1 rounded text-xs transition-all duration-300"
                                    title="Desfazer pagamento"
                                  >
                                    <Undo2 className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => removerTransacao(transacao.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white p-1 rounded text-xs transition-all duration-300"
                                  title="Remover transação"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Configurações */}
            {activeTab === 'configuracoes' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Configurações do Sistema
                </h2>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-blue-600" />
                    Configurações Gerais
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nome da Empresa
                      </label>
                      <input
                        type="text"
                        value={configForm.nomeEmpresa}
                        onChange={(e) => setConfigForm({...configForm, nomeEmpresa: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                        placeholder="Nome da sua empresa"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Telefone da Empresa
                      </label>
                      <input
                        type="tel"
                        value={configForm.telefoneEmpresa}
                        onChange={(e) => setConfigForm({...configForm, telefoneEmpresa: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Juros Padrão por Dia (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={configForm.jurosPercentualPadrao}
                        onChange={(e) => setConfigForm({...configForm, jurosPercentualPadrao: parseFloat(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                        placeholder="2.0"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={configForm.notificacoesAtivas}
                          onChange={(e) => setConfigForm({...configForm, notificacoesAtivas: e.target.checked})}
                          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <Bell className="w-5 h-5" />
                        Notificações Ativas
                      </label>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mensagem Padrão para Cobrança (WhatsApp)
                    </label>
                    <textarea
                      value={configForm.mensagemCobrancaPadrao}
                      onChange={(e) => setConfigForm({...configForm, mensagemCobrancaPadrao: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 transition-all"
                      placeholder="Mensagem que será enviada aos clientes"
                      rows={4}
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Use {'{nome}'} para o nome do cliente, {'{valor}'} para o valor total e {'{data}'} para a data de vencimento.
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleConfigSave}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <Check className="w-5 h-5" />
                      Salvar Configurações
                    </button>
                  </div>
                </div>

                {/* Informações do Sistema */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    Sobre o Crediário Pro
                  </h3>
                  <div className="space-y-2 text-gray-600 dark:text-gray-300">
                    <p><strong>Versão:</strong> 1.0.0</p>
                    <p><strong>Desenvolvido para:</strong> Pequenos comércios e lojistas</p>
                    <p><strong>Funcionalidades:</strong> Controle de crediário, gestão de despesas, relatórios financeiros</p>
                    <p><strong>Armazenamento:</strong> Local (navegador) - seus dados ficam seguros no seu dispositivo</p>
                  </div>
                </div>

                {/* Informações do Usuário */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    Informações da Conta
                  </h3>
                  <div className="space-y-3 text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Nome:</span>
                      <span className="font-semibold">{user.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="font-semibold">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Empresa:</span>
                      <span className="font-semibold">{user.businessName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Plano:</span>
                      <span className="font-semibold capitalize">{user.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cadastro:</span>
                      <span className="font-semibold">{formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}