import { memo, useState } from 'react';
import { Plug, Search, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { ConfigCard, InputField } from '../shared';
import type { ConfigFormState } from '../../hooks/useSettingsForm';

interface WhatsAppIntegrationTabProps {
  form: ConfigFormState;
  onUpdateField: <K extends keyof ConfigFormState>(field: K, value: ConfigFormState[K]) => void;
  onDetectBrowsers: () => Promise<string[]>;
  onValidatePath: (path: string) => Promise<{ valid: boolean; resolvedPath: string }>;
}

export const WhatsAppIntegrationTab = memo(function WhatsAppIntegrationTab({
  form,
  onUpdateField,
  onDetectBrowsers,
  onValidatePath,
}: WhatsAppIntegrationTabProps) {
  const [detectedBrowsers, setDetectedBrowsers] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; resolvedPath: string } | null>(null);

  const handleDetectBrowsers = async () => {
    const candidates = await onDetectBrowsers();
    setDetectedBrowsers(candidates);
  };

  const handleValidatePath = async () => {
    const result = await onValidatePath(form.puppeteerExecutablePath);
    setValidationResult(result);
  };

  return (
    <ConfigCard
      icon={<Plug className="h-5 w-5 text-brand-primary" />}
      title="Integração WhatsApp"
      description="Configure o caminho do navegador usado para conectar ao WhatsApp Web. O sistema detecta automaticamente Chrome ou Edge instalados."
    >
      <div className="space-y-4">
        <InputField
          label="Caminho do executável do navegador"
          value={form.puppeteerExecutablePath}
          onChange={(value) => onUpdateField('puppeteerExecutablePath', value)}
          placeholder="Ex: C:\Program Files\Google\Chrome\Application\chrome.exe"
          helpText="Caminho completo para o executável do Chrome ou Edge. Deixe em branco para usar detecção automática. Use o botão 'Detectar navegadores' para encontrar automaticamente."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDetectBrowsers}
            className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surface/80 px-3 py-2 text-xs font-medium text-white transition hover:border-brand-primary/40"
          >
            <Search className="h-4 w-4" />
            Detectar navegadores
          </button>
          <button
            type="button"
            onClick={handleValidatePath}
            className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surface/80 px-3 py-2 text-xs font-medium text-white transition hover:border-brand-primary/40"
          >
            <ShieldCheck className="h-4 w-4" />
            Validar caminho
          </button>
        </div>
        {detectedBrowsers.length > 0 && (
          <div className="rounded-lg border border-brand-border/50 bg-brand-surface/70 p-3 text-xs text-brand-muted">
            <p className="font-medium text-brand-muted/80">Navegadores encontrados:</p>
            <ul className="mt-1 space-y-1">
              {detectedBrowsers.map((candidate) => (
                <li key={candidate}>
                  <button
                    type="button"
                    className="text-left text-brand-primary transition hover:underline"
                    onClick={() => {
                      onUpdateField('puppeteerExecutablePath', candidate);
                      setValidationResult(null);
                    }}
                  >
                    {candidate}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {validationResult && (
          <p className={`flex items-center gap-2 text-xs ${validationResult.valid ? 'text-emerald-300' : 'text-rose-300'}`}>
            {validationResult.valid ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {validationResult.valid ? 'Caminho válido:' : 'Caminho inválido:'} {validationResult.resolvedPath}
          </p>
        )}
      </div>
    </ConfigCard>
  );
});

export default WhatsAppIntegrationTab;
