import { memo } from 'react';
import { MessageSquare, Plus, Radio, Trash2 } from 'lucide-react';
import Button from '@/react-app/components/Button';
import LastUpdated from '../../../components/LastUpdated';

interface MessagesHeaderProps {
  displayedCount: number;
  totalCount: number;
  dataUpdatedAt: number;
  onClearMessages: () => void;
  onOpenBroadcast: () => void;
  onOpenSend: () => void;
}

export const MessagesHeader = memo(function MessagesHeader({
  displayedCount,
  totalCount,
  dataUpdatedAt,
  onClearMessages,
  onOpenBroadcast,
  onOpenSend,
}: MessagesHeaderProps) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-white flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-brand-primary" />
          Mensagens
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <p className="text-sm text-brand-muted">
            Histórico completo de todas as mensagens enviadas e recebidas. Visualize {displayedCount} mensagens de {totalCount} no total.
          </p>
          <LastUpdated updatedAt={dataUpdatedAt} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {totalCount > 0 && (
          <Button
            onClick={onClearMessages}
            variant="ghost"
            size="md"
            title="Limpar cache e recarregar mensagens"
          >
            <Trash2 className="h-4 w-4" />
            Limpar
          </Button>
        )}
        <Button
          onClick={onOpenBroadcast}
          variant="secondary"
          size="md"
        >
          <Radio className="h-4 w-4" />
          Broadcast
        </Button>
        <Button
          onClick={onOpenSend}
          variant="primary"
          size="md"
        >
          <Plus className="h-4 w-4" />
          Enviar mensagem
        </Button>
      </div>
    </div>
  );
});

export default MessagesHeader;
