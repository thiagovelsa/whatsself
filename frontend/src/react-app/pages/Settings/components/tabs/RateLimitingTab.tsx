import { memo } from 'react';
import { Gauge } from 'lucide-react';
import { ConfigCard, NumberField } from '../shared';
import type { ConfigFormState } from '../../hooks/useSettingsForm';

interface RateLimitingTabProps {
  form: ConfigFormState;
  onUpdateField: <K extends keyof ConfigFormState>(field: K, value: ConfigFormState[K]) => void;
}

export const RateLimitingTab = memo(function RateLimitingTab({
  form,
  onUpdateField,
}: RateLimitingTabProps) {
  return (
    <ConfigCard
      icon={<Gauge className="h-5 w-5 text-brand-primary" />}
      title="Limites de envio (proteção anti-ban)"
      description="Configure quantas mensagens podem ser enviadas por minuto (global) e por contato. Valores muito altos podem causar bloqueio do WhatsApp."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField
          label="Mensagens por minuto (limite global)"
          value={form.rateMaxPerMin}
          onChange={(value) => onUpdateField('rateMaxPerMin', value)}
          min={1}
          max={100}
          helpText="Número máximo de mensagens que podem ser enviadas por minuto em todo o sistema. Recomendado: 10-15 para evitar bloqueios."
        />
        <NumberField
          label="Mensagens por contato (a cada 5 minutos)"
          value={form.ratePerContactPer5Min}
          onChange={(value) => onUpdateField('ratePerContactPer5Min', value)}
          min={1}
          max={20}
          helpText="Número máximo de mensagens que podem ser enviadas para o mesmo contato em um período de 5 minutos. Recomendado: 2-3 para parecer natural."
        />
      </div>
      <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm text-amber-200">
          <strong>Dica:</strong> Valores muito altos podem resultar em bloqueio temporário pelo WhatsApp.
          Mantenha abaixo de 20 mensagens/minuto para maior segurança.
        </p>
      </div>
    </ConfigCard>
  );
});

export default RateLimitingTab;
