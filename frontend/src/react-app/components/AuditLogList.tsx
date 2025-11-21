import { History } from 'lucide-react';
import { useConfigStore } from '@/react-app/stores/useConfigStore';

export default function AuditLogList() {
  const { audit, fetchAudit } = useConfigStore();

  const handleLoadAudit = async () => {
    await fetchAudit();
  };

  return (
    <section className="space-y-4 rounded-3xl border border-brand-border/60 bg-brand-surface/60 p-6 shadow-brand-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Histórico de alterações</h2>
          <p className="text-sm text-brand-muted">
            Auditoria das últimas configurações aplicadas (apenas admins).
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadAudit}
          className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surfaceElevated/70 px-3 py-2 text-xs font-medium text-white transition hover:border-brand-primary/40"
        >
          <History className="h-4 w-4" />
          Atualizar histórico
        </button>
      </div>
      {audit.length === 0 ? (
        <p className="text-sm text-brand-muted">Nenhuma alteração registrada nesta instância.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-border/60 text-sm text-brand-muted">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-brand-muted/70">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Usuário</th>
                <th className="px-3 py-2">Alterações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40">
              {audit.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2">
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(entry.createdAt))}
                  </td>
                  <td className="px-3 py-2">{entry.actorUserId ?? 'sistema'}</td>
                  <td className="px-3 py-2">
                    <ul className="space-y-1">
                      {Object.entries(entry.changes).map(([field, change]) => (
                        <li key={field}>
                          <span className="font-medium text-brand-muted/80">{field}</span>{' '}
                          <span>
                            {typeof change.old === 'string' ? change.old : JSON.stringify(change.old)} →{' '}
                            {typeof change.new === 'string' ? change.new : JSON.stringify(change.new)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
