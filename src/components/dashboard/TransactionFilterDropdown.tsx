import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SlidersHorizontal, ChevronDown, ChevronRight, ChevronLeft, Check } from "lucide-react";

interface TransactionFilterDropdownProps {
  typeFilter: string;
  statusFilter: string;
  onTypeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

export function TransactionFilterDropdown({
  typeFilter,
  statusFilter,
  onTypeFilterChange,
  onStatusFilterChange,
}: TransactionFilterDropdownProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSubmenu, setFilterSubmenu] = useState<'main' | 'type' | 'status'>('main');
  const [filterSearch, setFilterSearch] = useState('');

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'earning', label: 'Campaign Payout' },
    { value: 'boost_earning', label: 'Boost Payout' },
    { value: 'withdrawal', label: 'Withdrawal' },
    { value: 'referral', label: 'Referral Bonus' },
    { value: 'transfer_sent', label: 'Transfer Sent' },
    { value: 'transfer_received', label: 'Transfer Received' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all';

  return (
    <DropdownMenu open={filterOpen} onOpenChange={open => {
      setFilterOpen(open);
      if (!open) {
        setFilterSubmenu('main');
        setFilterSearch('');
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 rounded-lg border-border bg-muted/50 hover:bg-muted px-3 h-8 text-xs ${hasActiveFilters ? 'border-primary/50' : ''}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="font-medium">Filter</span>
          {hasActiveFilters && (
            <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
              {(typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px] p-2.5 overflow-hidden bg-background border-border font-inter tracking-[-0.5px]">
        <div className="relative min-h-[200px]">
          {/* Main Menu */}
          <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'main' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full absolute inset-0 pointer-events-none'}`}>
            <div className="relative mb-3">
              <Input
                placeholder="Search filters..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="bg-background/50 border-border h-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border"
              />
            </div>

            {filterSearch ? (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {typeOptions.filter(opt =>
                  opt.label.toLowerCase().includes(filterSearch.toLowerCase())
                ).map(option => (
                  <button
                    key={option.value}
                    onClick={e => {
                      e.preventDefault();
                      onTypeFilterChange(option.value);
                      setFilterSearch('');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${typeFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}
                  >
                    <span className="text-sm">{option.label}</span>
                    {typeFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                  </button>
                ))}
                {statusOptions.filter(opt =>
                  opt.label.toLowerCase().includes(filterSearch.toLowerCase())
                ).map(option => (
                  <button
                    key={option.value}
                    onClick={e => {
                      e.preventDefault();
                      onStatusFilterChange(option.value);
                      setFilterSearch('');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${statusFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}
                  >
                    <span className="text-sm">{option.label}</span>
                    {statusFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={e => {
                    e.preventDefault();
                    setFilterSubmenu('type');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${typeFilter !== 'all' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <span className="font-medium text-sm">Type</span>
                  {typeFilter !== 'all' && (
                    <span className="ml-auto text-xs text-muted-foreground capitalize">
                      {typeOptions.find(o => o.value === typeFilter)?.label}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </button>
                <button
                  onClick={e => {
                    e.preventDefault();
                    setFilterSubmenu('status');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${statusFilter !== 'all' ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <span className="font-medium text-sm">Status</span>
                  {statusFilter !== 'all' && (
                    <span className="ml-auto text-xs text-muted-foreground capitalize">
                      {statusOptions.find(o => o.value === statusFilter)?.label}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </button>
              </div>
            )}

            {hasActiveFilters && !filterSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground mt-3 text-xs"
                onClick={e => {
                  e.preventDefault();
                  onTypeFilterChange('all');
                  onStatusFilterChange('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Type Submenu */}
          <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'type' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'}`}>
            <button
              onClick={e => {
                e.preventDefault();
                setFilterSubmenu('main');
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Type</span>
            </button>
            <div className="space-y-1">
              {typeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={e => {
                    e.preventDefault();
                    onTypeFilterChange(option.value);
                    setFilterSubmenu('main');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${typeFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <span className="text-sm">{option.label}</span>
                  {typeFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Status Submenu */}
          <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'status' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute inset-0 pointer-events-none'}`}>
            <button
              onClick={e => {
                e.preventDefault();
                setFilterSubmenu('main');
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Status</span>
            </button>
            <div className="space-y-1">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={e => {
                    e.preventDefault();
                    onStatusFilterChange(option.value);
                    setFilterSubmenu('main');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${statusFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}
                >
                  <span className="text-sm">{option.label}</span>
                  {statusFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
