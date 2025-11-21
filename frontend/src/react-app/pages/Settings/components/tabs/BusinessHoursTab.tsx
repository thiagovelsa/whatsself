import { memo } from 'react';
import { Clock } from 'lucide-react';
import { ConfigCard, InputField, ToggleField } from '../shared';
import type { ConfigFormState } from '../../hooks/useSettingsForm';

interface BusinessHoursTabProps {
  form: ConfigFormState;
  onUpdateField: <K extends keyof ConfigFormState>(field: K, value: ConfigFormState[K]) => void;
}

export const BusinessHoursTab = memo(function BusinessHoursTab({
  form,
  onUpdateField,
}: BusinessHoursTabProps) {
  return (
    <ConfigCard
      icon={<Clock className="h-5 w-5 text-brand-primary" />}
      title="Horários e ambiente"
      description="Configure horários comerciais para envio de mensagens e ajustes específicos do Windows."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField
          label="Início do horário comercial"
          type="time"
          value={form.businessHoursStart}
          onChange={(value) => onUpdateField('businessHoursStart', value)}
          helpText="Horário em que o sistema começa a enviar mensagens automaticamente. Mensagens recebidas sempre são respondidas."
        />
        <InputField
          label="Fim do horário comercial"
          type="time"
          value={form.businessHoursEnd}
          onChange={(value) => onUpdateField('businessHoursEnd', value)}
          helpText="Horário em que o sistema para de enviar mensagens automáticas. Mensagens recebidas sempre são respondidas."
        />
        <InputField
          label="Fuso hor?rio (c?digo IANA)"
          value={form.timezone}
          onChange={(value) => onUpdateField('timezone', value)}
          placeholder="Ex: America/Sao_Paulo"
          helpText="Fuso hor?rio usado para calcular hor?rios comerciais. Exemplos: America/Sao_Paulo (Brasil), America/New_York (EUA), Europe/London (Reino Unido)."
        />
        <div className="md:col-span-2 flex flex-col gap-3 rounded-xl border border-brand-border/60 bg-brand-surface/70 p-4">
          <ToggleField
            label="Enviar mensagem autom?tica no primeiro contato"
            checked={form.firstContactEnabled}
            onChange={(value) => onUpdateField('firstContactEnabled', value)}
          />
          <InputField
            label="Mensagem de boas-vindas (opcional)"
            value={form.firstContactMessage}
            onChange={(value) => onUpdateField('firstContactMessage', value)}
            placeholder="Ex: Ol?! Voc? fala com ... "
            helpText="S? envia quando o toggle estiver ligado. Deixe em branco para n?o responder automaticamente."
          />
        </div>
        <InputField
          label="Diret?rio tempor?rio Windows"
          value={form.windowsTempDir}
          onChange={(value) => onUpdateField('windowsTempDir', value)}
          placeholder="C:\Users\User\AppData\Local\Temp\whatsself"
          helpText="Diret?rio para arquivos tempor?rios no Windows."
        />
        <div className="md:col-span-2">
          <ToggleField
            label="Habilitar suporte a paths longos"
            checked={form.windowsLongPathSupport}
            onChange={(value) => onUpdateField('windowsLongPathSupport', value)}
          />
        </div>
      </div>
    </ConfigCard>
  );
});

export default BusinessHoursTab;
