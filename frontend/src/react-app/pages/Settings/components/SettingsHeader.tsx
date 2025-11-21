import { memo, useMemo } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import Button from '@/react-app/components/Button';

interface SettingsHeaderProps {
  lastUpdate: number | string | null;
  dirty: boolean;
  isSaving: boolean;
  onRefresh: () => void;
  onSave: () => void;
}

export const SettingsHeader = memo(function SettingsHeader({
  lastUpdate,
  dirty,
  isSaving,
  onRefresh,
  onSave,
}: SettingsHeaderProps) {
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdate) return 'Nunca atualizado';
    const date = new Date(lastUpdate);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }, [lastUpdate]);

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-white">Configurações do Sistema</h1>
        <p className="mt-2 text-sm text-brand-muted">
          Centralize ajustes essenciais da automação e mantenha tudo documentado. Toda alteração é auditada.
        </p>
        <p className="mt-1 text-xs text-brand-muted/80">
          Última atualização: {lastUpdatedLabel}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onRefresh} variant="secondary" size="md">
          <RefreshCw className="h-4 w-4" />
          Recarregar
        </Button>
        <Button
          onClick={onSave}
          variant="primary"
          size="md"
          loading={isSaving}
          disabled={!dirty}
        >
          {isSaving ? 'Salvando...' : 'Salvar alterações'}
          {!isSaving && <Save className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
});

export default SettingsHeader;
