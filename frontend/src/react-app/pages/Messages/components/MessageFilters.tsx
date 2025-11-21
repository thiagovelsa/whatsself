import { memo } from 'react';
import { Filter, Search, X } from 'lucide-react';
import SectionCard from '../../../components/SectionCard';
import type { MessageDirection, MessageStatus } from '../../../types';

type FilterDirection = 'all' | MessageDirection;
type FilterStatus = 'all' | MessageStatus;

interface MessageFiltersProps {
  searchTerm: string;
  filterDirection: FilterDirection;
  filterStatus: FilterStatus;
  showFilters: boolean;
  onSearchChange: (value: string) => void;
  onDirectionChange: (value: FilterDirection) => void;
  onStatusChange: (value: FilterStatus) => void;
  onToggleFilters: () => void;
}

export const MessageFilters = memo(function MessageFilters({
  searchTerm,
  filterDirection,
  filterStatus,
  showFilters,
  onSearchChange,
  onDirectionChange,
  onStatusChange,
  onToggleFilters,
}: MessageFiltersProps) {
  return (
    <SectionCard
      title="Busca e filtros"
      description="Busque mensagens por telefone, nome ou conteúdo. Filtre por status (enviada, entregue, falhou) e direção (recebida ou enviada)."
      icon={<Filter className="h-5 w-5" />}
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por telefone, nome ou conteúdo..."
            className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/70 px-10 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
            showFilters
              ? 'border-brand-primary/40 bg-brand-primary/10 text-brand-primary'
              : 'border-brand-border/60 bg-brand-surface/70 text-white hover:border-brand-primary/40 hover:text-brand-primary'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtros
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 grid gap-4 border-t border-brand-border/60 pt-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-brand-muted">Direção</label>
            <select
              value={filterDirection}
              onChange={(e) => onDirectionChange(e.target.value as FilterDirection)}
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/70 px-3 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="all">Todas</option>
              <option value="inbound">Recebidas</option>
              <option value="outbound">Enviadas</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-muted">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => onStatusChange(e.target.value as FilterStatus)}
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/70 px-3 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="all">Todos</option>
              <option value="queued">Na fila</option>
              <option value="sent">Enviada</option>
              <option value="delivered">Entregue</option>
              <option value="read">Lida</option>
              <option value="failed">Falhou</option>
            </select>
          </div>
        </div>
      )}
    </SectionCard>
  );
});

export default MessageFilters;
