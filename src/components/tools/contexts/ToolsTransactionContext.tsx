import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToolsWorkspace } from './ToolsWorkspaceContext';

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export interface Transaction {
  id: string;
  workspace_id: string | null;
  partner_id: string | null;
  product_id: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  status: TransactionStatus;
  date: string;
  due_date: string | null;
  paid_date: string | null;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  is_recurring: boolean;
  billing_cycle: string | null;
  created_at: string;
}

interface RevenueStats {
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  pendingIncome: number;
  thisMonthIncome: number;
  lastMonthIncome: number;
}

interface ToolsTransactionContextType {
  transactions: Transaction[];
  products: Product[];
  isLoading: boolean;
  stats: RevenueStats;
  addTransaction: (transaction: Partial<Transaction>) => Promise<Transaction | null>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
  getTransactionsByPartner: (partnerId: string) => Transaction[];
  getTransactionsByDateRange: (start: Date, end: Date) => Transaction[];
}

const ToolsTransactionContext = createContext<ToolsTransactionContextType | undefined>(undefined);

export function ToolsTransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentWorkspace } = useToolsWorkspace();

  const calculateStats = useCallback((txns: Transaction[]): RevenueStats => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const completed = txns.filter(t => t.status === 'completed');

    return {
      totalIncome: completed.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: completed.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      netRevenue: completed.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
      pendingIncome: txns.filter(t => t.type === 'income' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0),
      thisMonthIncome: completed.filter(t =>
        t.type === 'income' && new Date(t.date) >= thisMonth
      ).reduce((sum, t) => sum + t.amount, 0),
      lastMonthIncome: completed.filter(t =>
        t.type === 'income' && new Date(t.date) >= lastMonth && new Date(t.date) <= lastMonthEnd
      ).reduce((sum, t) => sum + t.amount, 0),
    };
  }, []);

  const [stats, setStats] = useState<RevenueStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netRevenue: 0,
    pendingIncome: 0,
    thisMonthIncome: 0,
    lastMonthIncome: 0,
  });

  const fetchData = useCallback(async () => {
    if (!currentWorkspace) {
      setTransactions([]);
      setProducts([]);
      setIsLoading(false);
      return;
    }

    try {
      const [txnResult, productResult] = await Promise.all([
        supabase
          .from('tools_transactions')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .order('date', { ascending: false }),
        supabase
          .from('tools_products')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .order('name', { ascending: true }),
      ]);

      if (txnResult.error) throw txnResult.error;
      if (productResult.error) throw productResult.error;

      const txns = txnResult.data || [];
      setTransactions(txns);
      setProducts(productResult.data || []);
      setStats(calculateStats(txns));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, calculateStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addTransaction = async (transaction: Partial<Transaction>): Promise<Transaction | null> => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('tools_transactions')
        .insert({
          ...transaction,
          workspace_id: currentWorkspace.id,
          type: transaction.type || 'income',
          status: transaction.status || 'pending',
          currency: transaction.currency || 'USD',
          date: transaction.date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const newTxns = [data, ...transactions];
      setTransactions(newTxns);
      setStats(calculateStats(newTxns));
      return data;
    } catch (error) {
      console.error('Error adding transaction:', error);
      return null;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const { error } = await supabase
        .from('tools_transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      const newTxns = transactions.map(t => t.id === id ? { ...t, ...updates } : t);
      setTransactions(newTxns);
      setStats(calculateStats(newTxns));
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tools_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const newTxns = transactions.filter(t => t.id !== id);
      setTransactions(newTxns);
      setStats(calculateStats(newTxns));
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const addProduct = async (product: Partial<Product>): Promise<Product | null> => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('tools_products')
        .insert({
          ...product,
          workspace_id: currentWorkspace.id,
          currency: product.currency || 'USD',
        })
        .select()
        .single();

      if (error) throw error;

      setProducts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (error) {
      console.error('Error adding product:', error);
      return null;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('tools_products')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tools_products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const refreshTransactions = async () => {
    await fetchData();
  };

  const getTransactionsByPartner = (partnerId: string) => {
    return transactions.filter(t => t.partner_id === partnerId);
  };

  const getTransactionsByDateRange = (start: Date, end: Date) => {
    return transactions.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate >= start && txnDate <= end;
    });
  };

  return (
    <ToolsTransactionContext.Provider
      value={{
        transactions,
        products,
        isLoading,
        stats,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addProduct,
        updateProduct,
        deleteProduct,
        refreshTransactions,
        getTransactionsByPartner,
        getTransactionsByDateRange,
      }}
    >
      {children}
    </ToolsTransactionContext.Provider>
  );
}

export function useToolsTransactions() {
  const context = useContext(ToolsTransactionContext);
  if (context === undefined) {
    throw new Error('useToolsTransactions must be used within a ToolsTransactionProvider');
  }
  return context;
}
