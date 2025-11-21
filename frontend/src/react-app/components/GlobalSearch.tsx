import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, Users, MessageSquare, GitBranch, Shield } from 'lucide-react';
import { apiService } from '../services/apiService';

interface SearchResult {
  type: 'template' | 'trigger' | 'flow' | 'contact' | 'message';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      try {
        const [templates, triggers, flows, contacts, messages] = await Promise.all([
          apiService.templates.getAll().then(items => items.slice(0, 50)).catch(() => []),
          apiService.triggers.getAll().then(items => items.slice(0, 50)).catch(() => []),
          apiService.flows.getAll().then(items => items.slice(0, 50)).catch(() => []),
          apiService.contacts.getAll().then(items => items.slice(0, 100)).catch(() => []),
          apiService.messages.getAll({ take: 200 }).catch(() => []),
        ]);

        const searchLower = query.toLowerCase();
        const allResults: SearchResult[] = [];
        
        // Track total fetched for limit warning
        const totalFetched = templates.length + triggers.length + flows.length + contacts.length + messages.length;
        const shouldShowWarning = totalFetched >= 300;

        // Search templates
        templates.forEach((t) => {
          if (
            t.key.toLowerCase().includes(searchLower) ||
            t.content.toLowerCase().includes(searchLower)
          ) {
            allResults.push({
              type: 'template',
              id: t.id,
              title: t.key,
              subtitle: t.content.substring(0, 60) + (t.content.length > 60 ? '...' : ''),
              href: `/templates`,
            });
          }
        });

        // Search triggers
        triggers.forEach((t) => {
          if (t.pattern.toLowerCase().includes(searchLower)) {
            allResults.push({
              type: 'trigger',
              id: t.id,
              title: `Gatilho: ${t.pattern}`,
              subtitle: t.template?.key || t.flow?.name || 'Sem ação',
              href: `/triggers`,
            });
          }
        });

        // Search flows
        flows.forEach((f) => {
          if (f.name.toLowerCase().includes(searchLower)) {
            allResults.push({
              type: 'flow',
              id: f.id,
              title: f.name,
              subtitle: `${f.steps?.length || 0} passos`,
              href: `/flows`,
            });
          }
        });

        // Search contacts
        contacts.forEach((c) => {
          if (
            c.phone.includes(query) ||
            c.name?.toLowerCase().includes(searchLower)
          ) {
            allResults.push({
              type: 'contact',
              id: c.id,
              title: c.name || c.phone,
              subtitle: c.phone,
              href: `/contacts`,
            });
          }
        });

        // Search messages (limit to 20 most recent)
        messages
          .slice(0, 20)
          .forEach((m) => {
            if (m.content.toLowerCase().includes(searchLower)) {
              allResults.push({
                type: 'message',
                id: m.id,
                title: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''),
                subtitle: m.contact?.phone || 'Contato desconhecido',
                href: `/messages`,
              });
            }
          });

        setResults(allResults.slice(0, 10)); // Limit to 10 results
        
        // Show warning if many results were fetched and filtered down to 10
        setShowLimitWarning(shouldShowWarning && allResults.length === 10);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(search, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.href);
    setIsOpen(false);
    setQuery('');
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'template':
        return <FileText className="h-4 w-4" />;
      case 'trigger':
        return <Shield className="h-4 w-4" />;
      case 'flow':
        return <GitBranch className="h-4 w-4" />;
      case 'contact':
        return <Users className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          setIsOpen(false);
          setQuery('');
        }}
      />

      {/* Search Modal */}
      <div className="fixed left-1/2 top-20 z-50 w-full max-w-2xl -translate-x-1/2 transform">
        <div className="rounded-2xl border border-brand-border/60 bg-brand-surfaceElevated/95 p-4 shadow-2xl backdrop-blur">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar em templates, gatilhos, fluxos, contatos, mensagens..."
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-10 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          {isSearching ? (
            <div className="py-8 text-center text-brand-muted">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
              <p className="mt-2 text-sm">Buscando...</p>
            </div>
          ) : query.length < 2 ? (
            <div className="py-8 text-center text-brand-muted">
              <p className="text-sm">Digite pelo menos 2 caracteres para buscar</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-brand-muted">
              <p className="text-sm">Nenhum resultado encontrado</p>
            </div>
          ) : (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full rounded-lg border border-transparent bg-brand-surface/60 px-4 py-3 text-left transition hover:border-brand-primary/40 hover:bg-brand-surface/80"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-brand-primary">{getIcon(result.type)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{result.title}</p>
                      {result.subtitle && (
                        <p className="mt-1 text-xs text-brand-muted">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-brand-muted capitalize">{result.type}</span>
                  </div>
                </button>
              ))}
              
              {/* Limit warning */}
              {showLimitWarning && (
                <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
                  Refine sua busca para resultados mais precisos
                </div>
              )}
            </div>
          )}

          {/* Footer hint */}
          <div className="mt-4 flex items-center justify-between border-t border-brand-border/60 pt-3 text-xs text-brand-muted">
            <span>Use ↑↓ para navegar, Enter para selecionar, Esc para fechar</span>
            <kbd className="rounded border border-brand-border/60 bg-brand-surface/80 px-2 py-1">
              Esc
            </kbd>
          </div>
        </div>
      </div>
    </>
  );
}

