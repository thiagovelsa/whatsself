import { useEffect, useState } from 'react';
import { Terminal, RefreshCw, Copy, Check } from 'lucide-react';
import { apiService } from '../services/apiService';
import { notificationActions } from '../stores/useNotificationStore';

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDebugInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await apiService.system.getDebugInfo();
      setData(info);
    } catch (err) {
      console.error('Failed to fetch debug info:', err);
      setError('Não foi possível carregar as informações de debug.');
      notificationActions.notify({
        type: 'error',
        message: 'Erro ao carregar informações de debug',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    notificationActions.notify({
      type: 'success',
      message: 'JSON copiado para a área de transferência',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Debug do Sistema</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Informações técnicas detalhadas sobre o estado atual do sistema, ambiente e conexões.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDebugInfo}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={handleCopy}
            disabled={!data || loading}
            className="flex items-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:opacity-50"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar JSON'}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/70 p-6 shadow-brand-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl border border-brand-border/50 bg-brand-surface/70 p-3">
            <Terminal className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Saída JSON</h3>
            <p className="text-sm text-brand-muted">Estado bruto do sistema</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-brand-muted">
              <RefreshCw className="h-8 w-8 animate-spin text-brand-primary" />
              <p>Carregando informações...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            {error}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-brand-border/40 bg-slate-950/50">
            <pre className="max-h-[600px] overflow-auto p-4 text-xs font-mono text-emerald-400/90 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-brand-border/40">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
