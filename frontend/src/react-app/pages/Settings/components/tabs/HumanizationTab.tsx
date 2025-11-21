import { memo } from 'react';
import { Cpu } from 'lucide-react';
import { ConfigCard, NumberField } from '../shared';
import type { ConfigFormState } from '../../hooks/useSettingsForm';

interface HumanizationTabProps {
  form: ConfigFormState;
  onUpdateField: <K extends keyof ConfigFormState>(field: K, value: ConfigFormState[K]) => void;
}

export const HumanizationTab = memo(function HumanizationTab({
  form,
  onUpdateField,
}: HumanizationTabProps) {
  return (
    <ConfigCard
      icon={<Cpu className="h-5 w-5 text-brand-primary" />}
      title="Humanização (simulação de comportamento humano)"
      description="Configure pausas aleatórias antes de enviar mensagens e tempo de digitação para tornar o envio mais natural e evitar detecção de bot."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberField
          label="Pausa mínima antes de enviar (segundos)"
          value={form.humanizerMinDelaySeconds}
          onChange={(value) => onUpdateField('humanizerMinDelaySeconds', value)}
          min={0}
          helpText="Tempo mínimo de espera antes de enviar uma mensagem. Recomendado: 3-5 segundos."
        />
        <NumberField
          label="Pausa máxima antes de enviar (segundos)"
          value={form.humanizerMaxDelaySeconds}
          onChange={(value) => onUpdateField('humanizerMaxDelaySeconds', value)}
          min={0}
          helpText="Tempo máximo de espera antes de enviar uma mensagem. Recomendado: 7-10 segundos."
        />
        <NumberField
          label="Tempo mínimo de digitação (segundos)"
          value={form.humanizerMinTypingSeconds}
          onChange={(value) => onUpdateField('humanizerMinTypingSeconds', value)}
          min={0}
          helpText="Tempo mínimo que o sistema simula estar digitando antes de enviar. Recomendado: 1-2 segundos."
        />
        <NumberField
          label="Tempo máximo de digitação (segundos)"
          value={form.humanizerMaxTypingSeconds}
          onChange={(value) => onUpdateField('humanizerMaxTypingSeconds', value)}
          min={0}
          helpText="Tempo máximo que o sistema simula estar digitando antes de enviar. Recomendado: 3-4 segundos."
        />
      </div>
    </ConfigCard>
  );
});

export default HumanizationTab;
