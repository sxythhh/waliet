import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToolsWorkspace } from './ToolsWorkspaceContext';

export type PartnerStatus = 'prospect' | 'active' | 'inactive' | 'churned';
export type PartnerType = 'brand' | 'agency' | 'individual' | 'other';

export interface Partner {
  id: string;
  workspace_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: PartnerType;
  status: PartnerStatus;
  notes: string | null;
  avatar_url: string | null;
  website: string | null;
  deal_value: number | null;
  pipeline_stage: string | null;
  last_contact: string | null;
  next_followup: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ToolsPartnerContextType {
  partners: Partner[];
  isLoading: boolean;
  addPartner: (partner: Partial<Partner>) => Promise<Partner | null>;
  updatePartner: (id: string, updates: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
  refreshPartners: () => Promise<void>;
  getPartnerById: (id: string) => Partner | undefined;
  getPartnersByStatus: (status: PartnerStatus) => Partner[];
  getPartnersByType: (type: PartnerType) => Partner[];
}

const ToolsPartnerContext = createContext<ToolsPartnerContextType | undefined>(undefined);

export function ToolsPartnerProvider({ children }: { children: React.ReactNode }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentWorkspace } = useToolsWorkspace();

  const fetchPartners = useCallback(async () => {
    if (!currentWorkspace) {
      setPartners([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tools_partners')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const addPartner = async (partner: Partial<Partner>): Promise<Partner | null> => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('tools_partners')
        .insert({
          ...partner,
          workspace_id: currentWorkspace.id,
          type: partner.type || 'brand',
          status: partner.status || 'prospect',
        })
        .select()
        .single();

      if (error) throw error;

      setPartners(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (error) {
      console.error('Error adding partner:', error);
      return null;
    }
  };

  const updatePartner = async (id: string, updates: Partial<Partner>) => {
    try {
      const { error } = await supabase
        .from('tools_partners')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setPartners(prev =>
        prev.map(p => p.id === id ? { ...p, ...updates } : p)
      );
    } catch (error) {
      console.error('Error updating partner:', error);
    }
  };

  const deletePartner = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tools_partners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPartners(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting partner:', error);
    }
  };

  const refreshPartners = async () => {
    await fetchPartners();
  };

  const getPartnerById = (id: string) => {
    return partners.find(p => p.id === id);
  };

  const getPartnersByStatus = (status: PartnerStatus) => {
    return partners.filter(p => p.status === status);
  };

  const getPartnersByType = (type: PartnerType) => {
    return partners.filter(p => p.type === type);
  };

  return (
    <ToolsPartnerContext.Provider
      value={{
        partners,
        isLoading,
        addPartner,
        updatePartner,
        deletePartner,
        refreshPartners,
        getPartnerById,
        getPartnersByStatus,
        getPartnersByType,
      }}
    >
      {children}
    </ToolsPartnerContext.Provider>
  );
}

export function useToolsPartners() {
  const context = useContext(ToolsPartnerContext);
  if (context === undefined) {
    throw new Error('useToolsPartners must be used within a ToolsPartnerProvider');
  }
  return context;
}
