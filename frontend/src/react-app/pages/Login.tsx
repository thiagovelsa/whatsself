import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import StatusBadge from '@/react-app/components/StatusBadge';
import { api } from '@/react-app/lib/axios';
import { getWhatsappConnectionState, type WhatsappStatus as WhatsappStatusType } from '@/react-app/lib/whatsappStatus';

const REMEMBERED_EMAIL_KEY = 'remembered_email';
const REMEMBERED_PASSWORD_KEY = 'remembered_password';
const REMEMBER_LOGIN_KEY = 'remember_login';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(false);
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const clearError = useAuthStore((state) => state.clearError);
  const navigate = useNavigate();
  const [whatsappStatusRaw, setWhatsappStatusRaw] = useState<WhatsappStatusType | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  // Load remembered credentials on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    const rememberedPassword = localStorage.getItem(REMEMBERED_PASSWORD_KEY);
    const shouldRemember = localStorage.getItem(REMEMBER_LOGIN_KEY) === 'true';

    if (shouldRemember && rememberedEmail && rememberedPassword) {
      setEmail(rememberedEmail);
      setPassword(rememberedPassword);
      setRememberLogin(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const { data } = await api.get<WhatsappStatusType>('/whatsapp/status');
        if (!isMounted) return;
        setWhatsappStatusRaw(data);
        setWhatsappError(null);
      } catch {
        if (!isMounted) return;
        setWhatsappStatusRaw(null);
        setWhatsappError('Não foi possível consultar o status do WhatsApp.');
      }
    };

    void fetchStatus();
    const interval = setInterval(() => {
      void fetchStatus();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const whatsappStatus = useMemo(() => {
    if (whatsappError) {
      return { label: 'Backend indisponível', value: 'error' as const };
    }

    const connection = getWhatsappConnectionState(whatsappStatusRaw);

    if (connection === 'online') {
      return { label: 'WhatsApp conectado', value: 'online' as const };
    }

    if (connection === 'connecting') {
      return { label: 'Sincronizando...', value: 'connecting' as const };
    }

    return { label: 'Offline', value: 'offline' as const };
  }, [whatsappStatusRaw, whatsappError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);

      // Save credentials if "Remember Login" is checked
      if (rememberLogin) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        localStorage.setItem(REMEMBERED_PASSWORD_KEY, password);
        localStorage.setItem(REMEMBER_LOGIN_KEY, 'true');
      } else {
        // Remove saved credentials if unchecked
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
        localStorage.removeItem(REMEMBER_LOGIN_KEY);
      }

      navigate('/dashboard');
    } catch (err) {
      // Error é tratado pelo store; log apenas para diagnóstico local
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-brand-gradient px-4 py-12 text-brand-text">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-center">
        <div className="flex-1 rounded-3xl border border-brand-border/60 bg-brand-surface/70 p-10 shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-brand-muted/80">WhatsSelf</p>
          <h1 className="mt-4 text-4xl font-bold text-white">
            Entre no painel e opere seu atendimento em tempo real
          </h1>
          <p className="mt-4 text-base text-brand-muted">
            Gerencie filas, fluxos e mensagens com as proteções anti-ban desenhadas para o seu negócio.
            A autenticação garante que somente contas autorizadas acessem dados sensíveis.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-brand-border/60 bg-brand-surfaceElevated/60 p-4">
              <p className="text-xs uppercase tracking-wider text-brand-muted">Status do WhatsApp</p>
              <div className="mt-3">
                <StatusBadge status={whatsappStatus.value}>{whatsappStatus.label}</StatusBadge>
              </div>
              <p className="mt-3 text-xs text-brand-muted">
                {whatsappStatus.value === 'online'
                  ? 'WhatsApp conectado — o robô está pronto para responder e seguir as regras anti-ban.'
                  : whatsappStatus.value === 'error'
                  ? 'Não foi possível consultar o status. Verifique se a API está rodando antes de operar o robô.'
                  : 'Offline — você ainda pode entrar no painel, mas o robô só responde automaticamente quando a conexão estiver ativa em Conexão WhatsApp.'}
              </p>
            </div>

            <div className="rounded-2xl border border-brand-border/60 bg-brand-surfaceElevated/60 p-4">
              <p className="text-xs uppercase tracking-wider text-brand-muted">Credenciais administrativas</p>
              <p className="mt-3 text-sm text-brand-muted">
                O backend exibe o e-mail e a senha padrão sempre que você roda{' '}
                <span className="font-mono">npm run dev</span>. Consulte o terminal &quot;WhatsSelf Backend&quot; para
                copiar os dados gerados e altere-os assim que fizer login.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/70 p-8 shadow-brand-soft backdrop-blur">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white">Faça login para acessar</h2>
              <p className="mt-2 text-sm text-brand-muted">
                Use suas credenciais ou as credenciais de teste para validar o fluxo completo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-brand-muted">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-white placeholder:text-brand-muted/70 focus:border-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  placeholder="admin@whatself.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-brand-muted">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-white placeholder:text-brand-muted/70 focus:border-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center">
                  <input
                    id="remember-login"
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(e) => setRememberLogin(e.target.checked)}
                    className="h-4 w-4 rounded border-brand-border/60 bg-brand-surface/80 text-brand-primary focus:ring-2 focus:ring-brand-primary/40"
                  />
                  <label htmlFor="remember-login" className="ml-2 text-sm text-brand-muted cursor-pointer">
                    Lembrar Login
                  </label>
                </div>
                <p className="text-xs text-brand-muted/80">
                  Quando marcado, o email e a senha são lembrados apenas neste navegador (armazenados localmente, não no
                  servidor).
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl border border-brand-primary/50 bg-brand-primary/90 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Entrando...' : 'Entrar no painel'}
              </button>
            </form>

            <div className="mt-6 space-y-2 text-xs text-brand-muted">
              <p className="font-semibold text-brand-muted/90">Dúvidas rápidas</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/qr')}
                  className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-xs font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Como conectar o WhatsApp?
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-xs font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Configurar limites de envio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
