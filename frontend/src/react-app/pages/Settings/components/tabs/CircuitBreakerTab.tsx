import { memo } from 'react';
import { Wand2 } from 'lucide-react';
import { ConfigCard, InputField, NumberField } from '../shared';
import type { ConfigFormState } from '../../hooks/useSettingsForm';

interface CircuitBreakerTabProps {
  form: ConfigFormState;
  onUpdateField: <K extends keyof ConfigFormState>(field: K, value: ConfigFormState[K]) => void;
}

export const CircuitBreakerTab = memo(function CircuitBreakerTab({
  form,
  onUpdateField,
}: CircuitBreakerTabProps) {
  return (
    <ConfigCard
      icon={<Wand2 className="h-5 w-5 text-brand-primary" />}
      title="Proteção anti-ban (Circuit Breaker)"
      description="Configure o sistema de proteção que pausa automaticamente o envio quando detecta muitas falhas, evitando bloqueios do WhatsApp."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField
          label="Modo de janela de análise"
          value={form.cbWindowMode}
          onChange={(value) => onUpdateField('cbWindowMode', value)}
          helpText="Define como o sistema analisa falhas: '5m_or_50' = última janela de 5 minutos OU últimas 50 tentativas, o que ocorrer primeiro."
        />
        <NumberField
          label="Mínimo de tentativas antes de analisar"
          value={form.cbMinAttempts}
          onChange={(value) => onUpdateField('cbMinAttempts', value)}
          min={1}
          helpText="Número mínimo de tentativas de envio antes do sistema começar a analisar a taxa de falhas. Recomendado: 20-30."
        />
        <NumberField
          label="Taxa de falhas para ativar proteção (%)"
          value={form.cbFailRateOpen}
          step={0.05}
          min={0}
          max={1}
          onChange={(value) => onUpdateField('cbFailRateOpen', value)}
          helpText="Quando a taxa de falhas ultrapassar este valor (ex: 0.25 = 25%), o sistema pausa automaticamente o envio. Recomendado: 0.25 (25%)."
        />
        <NumberField
          label="Intervalo para teste (s)"
          value={form.cbProbeIntervalSec}
          onChange={(value) => onUpdateField('cbProbeIntervalSec', value)}
          min={1}
          helpText="Tempo entre tentativas de teste quando a proteção está ativa."
        />
        <NumberField
          label="Taxa de sucesso para fechar"
          value={form.cbProbeSuccessClose}
          step={0.05}
          min={0}
          max={1}
          onChange={(value) => onUpdateField('cbProbeSuccessClose', value)}
          helpText="Taxa de sucesso necessária para desativar a proteção."
        />
        <NumberField
          label="Amostras no modo HALF_OPEN"
          value={form.cbProbeSamples}
          onChange={(value) => onUpdateField('cbProbeSamples', value)}
          min={1}
          helpText="Número de amostras para avaliar se pode desativar a proteção."
        />
        <NumberField
          label="Cooldown inicial (s)"
          value={form.cbCooldownInitialSec}
          onChange={(value) => onUpdateField('cbCooldownInitialSec', value)}
          min={1}
          helpText="Tempo inicial de espera quando a proteção é ativada."
        />
        <NumberField
          label="Cooldown máximo (s)"
          value={form.cbCooldownMaxSec}
          onChange={(value) => onUpdateField('cbCooldownMaxSec', value)}
          min={1}
          helpText="Tempo máximo de espera entre tentativas."
        />
      </div>
    </ConfigCard>
  );
});

export default CircuitBreakerTab;
