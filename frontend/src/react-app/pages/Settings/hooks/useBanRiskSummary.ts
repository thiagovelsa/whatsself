import { useMemo } from 'react';
import type { ConfigFormState } from './useSettingsForm';

type BanRiskLevel = 'low' | 'medium' | 'high';

export type BanRiskSummary = {
  level: BanRiskLevel;
  label: 'baixo' | 'médio' | 'alto';
  description: string;
  recommendation: string;
};

const computeBanRiskSummary = (form: ConfigFormState): BanRiskSummary => {
  const {
    rateMaxPerMin,
    ratePerContactPer5Min,
    cbFailRateOpen,
    humanizerMinDelaySeconds,
    humanizerMaxDelaySeconds,
    humanizerMinTypingSeconds,
    humanizerMaxTypingSeconds,
  } = form;

  let score = 0;

  // Global rate score
  let globalScore = 0;
  if (rateMaxPerMin > 15 && rateMaxPerMin <= 25) globalScore = 1;
  else if (rateMaxPerMin > 25 && rateMaxPerMin <= 40) globalScore = 2;
  else if (rateMaxPerMin > 40) globalScore = 3;

  // Per contact score
  let perContactScore = 0;
  if (ratePerContactPer5Min > 3 && ratePerContactPer5Min <= 5) perContactScore = 1;
  else if (ratePerContactPer5Min > 5 && ratePerContactPer5Min <= 8) perContactScore = 2;
  else if (ratePerContactPer5Min > 8) perContactScore = 3;

  // Circuit breaker score
  let cbScore = 0;
  if (cbFailRateOpen <= 0.2) cbScore = -1;
  else if (cbFailRateOpen > 0.3 && cbFailRateOpen <= 0.5) cbScore = 1;
  else if (cbFailRateOpen > 0.5) cbScore = 2;

  // Humanization score
  const shortDelays = humanizerMinDelaySeconds < 3 || humanizerMaxDelaySeconds < 7;
  const shortTyping = humanizerMinTypingSeconds < 1 || humanizerMaxTypingSeconds < 3;

  let humanScore = 0;
  if (shortDelays) humanScore += 1;
  if (shortTyping) humanScore += 1;

  score = globalScore + perContactScore + cbScore + humanScore;
  if (score < 0) score = 0;

  // Determine level
  let level: BanRiskLevel;
  if (score <= 2) level = 'low';
  else if (score <= 5) level = 'medium';
  else level = 'high';

  // Build reasons
  const reasons: string[] = [];

  if (rateMaxPerMin > 15) {
    reasons.push('limite global acima do recomendado (10–15 msgs/min)');
  }
  if (ratePerContactPer5Min > 3) {
    reasons.push('limite por contato acima do recomendado (2–3 msgs/5min)');
  }
  if (cbFailRateOpen > 0.3) {
    reasons.push(`proteção abre tardiamente (${(cbFailRateOpen * 100).toFixed(0)}% de falhas)`);
  } else if (cbFailRateOpen < 0.2) {
    reasons.push(`proteção bem conservadora (${(cbFailRateOpen * 100).toFixed(0)}% de falhas)`);
  }
  if (shortDelays || shortTyping) {
    reasons.push('delays/tempo de digitação abaixo do recomendado');
  }

  const reasonsSummary = reasons.join(', ');

  const usesRecommendedGlobal = rateMaxPerMin >= 10 && rateMaxPerMin <= 15;
  const usesRecommendedPerContact = ratePerContactPer5Min >= 2 && ratePerContactPer5Min <= 3;
  const usesRecommendedHumanization = !shortDelays && !shortTyping;

  const label: BanRiskSummary['label'] =
    level === 'low' ? 'baixo' : level === 'medium' ? 'médio' : 'alto';

  // Build description
  let description: string;
  if (level === 'low') {
    if (usesRecommendedGlobal && usesRecommendedPerContact && usesRecommendedHumanization && cbFailRateOpen <= 0.25) {
      description = `Configuração conservadora: ${rateMaxPerMin}/min global, ${ratePerContactPer5Min}/contato/5min, proteção em ${(cbFailRateOpen * 100).toFixed(0)}% de falhas e humanização dentro das faixas recomendadas.`;
    } else if (reasonsSummary) {
      description = `Risco baixo, mas com pontos de atenção em ${reasonsSummary}. Para disparos mais agressivos, considere aproximar dos limites recomendados.`;
    } else {
      description = `Risco baixo: limites próximos do recomendado e humanização ligada, equilibrando velocidade e segurança.`;
    }
  } else if (level === 'medium') {
    description = reasonsSummary
      ? `Risco médio: configuração mais agressiva em ${reasonsSummary}. Avalie reduzir um pouco os limites ou aumentar os delays para ficar mais próximo do recomendado.`
      : 'Risco médio: ajustes atuais deixam o envio um pouco mais agressivo que o padrão conservador.';
  } else {
    description = reasonsSummary
      ? `Risco alto: configuração bem acima do recomendado (${reasonsSummary}). Reduza os limites e aumente a humanização para evitar bloqueios do WhatsApp.`
      : 'Risco alto: limites e proteções atuais aumentam significativamente a chance de bloqueio. Ajuste para um perfil mais conservador.';
  }

  const recommendation =
    'Sugestão rápida: manter ~10–15 msgs/min global, 2–3 por contato/5min, cbFailRateOpen em torno de 0.25 e delays/typing dentro das faixas recomendadas.';

  return {
    level,
    label,
    description,
    recommendation,
  };
};

export function useBanRiskSummary(form: ConfigFormState | null): BanRiskSummary | null {
  return useMemo(() => {
    if (!form) return null;
    return computeBanRiskSummary(form);
  }, [form]);
}
