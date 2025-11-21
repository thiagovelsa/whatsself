import { memo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ConfigCard, InputField, SecretField } from '../shared';
import type { ConfigFormState } from '../../hooks/useSettingsForm';

interface SecurityTabProps {
  form: ConfigFormState;
  config: {
    jwtSecretMasked?: string | null;
    defaultAdminPasswordMasked?: string | null;
  } | null;
  onUpdateField: <K extends keyof ConfigFormState>(field: K, value: ConfigFormState[K]) => void;
  onSecretChange: (field: 'jwtSecret' | 'defaultAdminPassword', value: string) => void;
  onRevealSecret: (field: 'jwtSecret' | 'defaultAdminPassword') => void;
  onToggleRegenerate: (field: 'jwtSecret' | 'defaultAdminPassword') => void;
}

export const SecurityTab = memo(function SecurityTab({
  form,
  config,
  onUpdateField,
  onSecretChange,
  onRevealSecret,
  onToggleRegenerate,
}: SecurityTabProps) {
  return (
    <ConfigCard
      icon={<ShieldCheck className="h-5 w-5 text-brand-primary" />}
      title="Segurança"
      description="Configure credenciais de acesso e chaves de segurança. Alterações aqui afetam o acesso ao sistema."
    >
      <div className="space-y-4">
        <InputField
          label="Email padrão do administrador"
          type="email"
          value={form.defaultAdminEmail}
          onChange={(value) => onUpdateField('defaultAdminEmail', value)}
          helpText="Email usado para criar o primeiro usuário administrador do sistema. Use um email válido que você tenha acesso."
        />
        <SecretField
          label="Chave secreta JWT (para autenticação)"
          masked={config?.jwtSecretMasked ?? null}
          state={form.jwtSecret}
          onChange={(value) => onSecretChange('jwtSecret', value)}
          onReveal={() => onRevealSecret('jwtSecret')}
          onToggleRegenerate={() => onToggleRegenerate('jwtSecret')}
          helpText="Chave secreta usada para assinar tokens de autenticação. Alterar esta chave invalida todas as sessões ativas. Use pelo menos 32 caracteres."
        />
        <SecretField
          label="Senha padrão do administrador"
          masked={config?.defaultAdminPasswordMasked ?? null}
          state={form.defaultAdminPassword}
          onChange={(value) => onSecretChange('defaultAdminPassword', value)}
          onReveal={() => onRevealSecret('defaultAdminPassword')}
          onToggleRegenerate={() => onToggleRegenerate('defaultAdminPassword')}
          helpText="Senha inicial para o primeiro usuário administrador. Deve ser alterada no primeiro acesso. Use uma senha forte com pelo menos 8 caracteres."
        />
      </div>
    </ConfigCard>
  );
});

export default SecurityTab;
