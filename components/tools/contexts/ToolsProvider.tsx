import React from 'react';
import { ToolsWorkspaceProvider } from './ToolsWorkspaceContext';
import { ToolsTaskProvider } from './ToolsTaskContext';
import { ToolsTeamProvider } from './ToolsTeamContext';
import { ToolsEventProvider } from './ToolsEventContext';
import { ToolsPartnerProvider } from './ToolsPartnerContext';
import { ToolsTransactionProvider } from './ToolsTransactionContext';
import { ToolsTimeTrackingProvider } from './ToolsTimeTrackingContext';

interface ToolsProviderProps {
  children: React.ReactNode;
}

export function ToolsProvider({ children }: ToolsProviderProps) {
  return (
    <ToolsWorkspaceProvider>
      <ToolsTaskProvider>
        <ToolsTeamProvider>
          <ToolsEventProvider>
            <ToolsPartnerProvider>
              <ToolsTransactionProvider>
                <ToolsTimeTrackingProvider>
                  {children}
                </ToolsTimeTrackingProvider>
              </ToolsTransactionProvider>
            </ToolsPartnerProvider>
          </ToolsEventProvider>
        </ToolsTeamProvider>
      </ToolsTaskProvider>
    </ToolsWorkspaceProvider>
  );
}

// Re-export hooks for convenience
export { useToolsWorkspace } from './ToolsWorkspaceContext';
export { useToolsTasks } from './ToolsTaskContext';
export { useToolsTeam } from './ToolsTeamContext';
export { useToolsEvents } from './ToolsEventContext';
export { useToolsPartners } from './ToolsPartnerContext';
export { useToolsTransactions } from './ToolsTransactionContext';
export { useToolsTimeTracking } from './ToolsTimeTrackingContext';
