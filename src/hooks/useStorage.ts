import { useState, useEffect } from 'react';
import { Cliente, Transacao, Despesa, ConfiguracaoApp } from '@/lib/types';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsedValue = JSON.parse(item);
        setStoredValue(parsedValue);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error(`Erro ao carregar ${key} do localStorage:`, error);
      setIsLoaded(true);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Forçar re-render disparando evento customizado
      window.dispatchEvent(new CustomEvent('storage-update', { 
        detail: { key, value: valueToStore } 
      }));
    } catch (error) {
      console.error(`Erro ao salvar ${key} no localStorage:`, error);
    }
  };

  return [storedValue, setValue, isLoaded] as const;
};

export const useClientes = () => {
  const [clientes, setClientes, isLoaded] = useLocalStorage<Cliente[]>('crediario_clientes', []);

  // Listener para atualizações de storage
  useEffect(() => {
    const handleStorageUpdate = (e: CustomEvent) => {
      if (e.detail.key === 'crediario_clientes') {
        setClientes(e.detail.value);
      }
    };

    window.addEventListener('storage-update', handleStorageUpdate as EventListener);
    return () => window.removeEventListener('storage-update', handleStorageUpdate as EventListener);
  }, [setClientes]);

  const adicionarCliente = (cliente: Omit<Cliente, 'id' | 'dataCadastro' | 'status'>) => {
    const novoCliente: Cliente = {
      ...cliente,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      dataCadastro: new Date().toISOString(),
      status: 'ativo',
    };
    setClientes(prev => {
      const updated = [...prev, novoCliente];
      return updated;
    });
  };

  const atualizarCliente = (id: string, dadosAtualizados: Partial<Cliente>) => {
    setClientes(prev => {
      const updated = prev.map(cliente => 
        cliente.id === id ? { ...cliente, ...dadosAtualizados } : cliente
      );
      return updated;
    });
  };

  const removerCliente = (id: string) => {
    if (confirm('Tem certeza que deseja remover este cliente? Esta ação não pode ser desfeita.')) {
      setClientes(prev => prev.filter(cliente => cliente.id !== id));
    }
  };

  const marcarComoPago = (id: string) => {
    atualizarCliente(id, { status: 'pago' });
  };

  const buscarCliente = (nome: string): Cliente | null => {
    if (!nome.trim()) return null;
    return clientes.find(c => 
      c.nome.toLowerCase().includes(nome.toLowerCase()) && c.status === 'ativo'
    ) || null;
  };

  const verificarClienteExistente = (nome: string, idExcluir?: string): boolean => {
    return clientes.some(c => 
      c.nome.toLowerCase() === nome.toLowerCase() && 
      c.status === 'ativo' && 
      (!idExcluir || c.id !== idExcluir)
    );
  };

  return {
    clientes,
    adicionarCliente,
    atualizarCliente,
    removerCliente,
    marcarComoPago,
    buscarCliente,
    verificarClienteExistente,
    isLoaded,
  };
};

export const useTransacoes = () => {
  const [transacoes, setTransacoes, isLoaded] = useLocalStorage<Transacao[]>('crediario_transacoes', []);

  // Listener para atualizações de storage
  useEffect(() => {
    const handleStorageUpdate = (e: CustomEvent) => {
      if (e.detail.key === 'crediario_transacoes') {
        setTransacoes(e.detail.value);
      }
    };

    window.addEventListener('storage-update', handleStorageUpdate as EventListener);
    return () => window.removeEventListener('storage-update', handleStorageUpdate as EventListener);
  }, [setTransacoes]);

  const adicionarTransacao = (transacao: Omit<Transacao, 'id' | 'data'>) => {
    const novaTransacao: Transacao = {
      ...transacao,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      data: new Date().toISOString(),
    };
    setTransacoes(prev => {
      const updated = [...prev, novaTransacao];
      return updated;
    });
  };

  const atualizarTransacao = (id: string, dadosAtualizados: Partial<Transacao>) => {
    setTransacoes(prev => {
      const updated = prev.map(transacao => 
        transacao.id === id ? { ...transacao, ...dadosAtualizados } : transacao
      );
      return updated;
    });
  };

  const removerTransacao = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta transação? Esta ação não pode ser desfeita.')) {
      setTransacoes(prev => prev.filter(transacao => transacao.id !== id));
    }
  };

  return {
    transacoes,
    adicionarTransacao,
    atualizarTransacao,
    removerTransacao,
    isLoaded,
  };
};

export const useDespesas = () => {
  const [despesas, setDespesas, isLoaded] = useLocalStorage<Despesa[]>('crediario_despesas', []);

  // Listener para atualizações de storage
  useEffect(() => {
    const handleStorageUpdate = (e: CustomEvent) => {
      if (e.detail.key === 'crediario_despesas') {
        setDespesas(e.detail.value);
      }
    };

    window.addEventListener('storage-update', handleStorageUpdate as EventListener);
    return () => window.removeEventListener('storage-update', handleStorageUpdate as EventListener);
  }, [setDespesas]);

  const adicionarDespesa = (despesa: Omit<Despesa, 'id'>) => {
    const novaDespesa: Despesa = {
      ...despesa,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setDespesas(prev => {
      const updated = [...prev, novaDespesa];
      return updated;
    });
  };

  const atualizarDespesa = (id: string, dadosAtualizados: Partial<Despesa>) => {
    setDespesas(prev => {
      const updated = prev.map(despesa => 
        despesa.id === id ? { ...despesa, ...dadosAtualizados } : despesa
      );
      return updated;
    });
  };

  const removerDespesa = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta despesa? Esta ação não pode ser desfeita.')) {
      setDespesas(prev => prev.filter(despesa => despesa.id !== id));
    }
  };

  return {
    despesas,
    adicionarDespesa,
    atualizarDespesa,
    removerDespesa,
    isLoaded,
  };
};

export const useConfiguracoes = () => {
  const [configuracoes, setConfiguracoes, isLoaded] = useLocalStorage<ConfiguracaoApp>('crediario_config', {
    nomeEmpresa: 'Minha Loja',
    telefoneEmpresa: '',
    mensagemCobrancaPadrao: 'Olá {nome}, estamos lembrando que sua dívida de {valor} venceu em {data}. Podemos agendar o pagamento?',
    jurosPercentualPadrao: 2,
    notificacoesAtivas: true,
  });

  const atualizarConfiguracoes = (novasConfiguracoes: Partial<ConfiguracaoApp>) => {
    setConfiguracoes(prev => ({ ...prev, ...novasConfiguracoes }));
  };

  return {
    configuracoes,
    atualizarConfiguracoes,
    isLoaded,
  };
};