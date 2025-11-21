import { memo } from 'react';
import { Server } from 'lucide-react';
import { ConfigCard, InputField, NumberField } from '../shared';
import type { ConfigFormState } from '../../hooks/useSettingsForm';

interface WebSocketTabProps {
  form: ConfigFormState;
  onUpdateField: <K extends keyof ConfigFormState>(field: K, value: ConfigFormState[K]) => void;
}

export const WebSocketTab = memo(function WebSocketTab({
  form,
  onUpdateField,
}: WebSocketTabProps) {
  return (
    <ConfigCard
      icon={<Server className="h-5 w-5 text-brand-primary" />}
      title="WebSocket"
      description="Parâmetros do canal em tempo real utilizado pelo painel."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField
          label="Porta do WebSocket"
          value={form.wsPort}
          onChange={(value) => onUpdateField('wsPort', value)}
          min={1000}
          max={65535}
          helpText="Porta TCP usada para conexões WebSocket. Padrão: 3002."
        />
        <InputField
          label="Path do WebSocket"
          value={form.wsPath}
          onChange={(value) => onUpdateField('wsPath', value)}
          helpText="Caminho da URL para conexões WebSocket. Padrão: /socket.io"
        />
      </div>
    </ConfigCard>
  );
});

export default WebSocketTab;
