import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-gradient text-brand-text">
      <div className="flex min-h-screen items-center justify-center px-4 py-14">
        <div className="w-full max-w-2xl text-center space-y-10">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-brand-muted/80">WhatsSelf</p>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Automação segura para WhatsApp Business
            </h1>
            <p className="mt-4 text-lg text-brand-muted max-w-xl mx-auto">
              Gerencie atendimentos automatizados, mensagens em massa e fluxos conversacionais com proteções anti-ban integradas.
            </p>
          </div>

          <div className="mx-auto max-w-xl space-y-4 rounded-3xl border border-brand-border/60 bg-brand-surface/70 p-6 text-left text-sm text-brand-muted">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand-muted/80">
              Como o painel funciona
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <span className="font-semibold text-white">Configurar templates</span> — cadastre mensagens prontas com variáveis dinâmicas.
              </li>
              <li>
                <span className="font-semibold text-white">Criar gatilhos e fluxos</span> — defina palavras-chave e caminhos de atendimento automatizado.
              </li>
              <li>
                <span className="font-semibold text-white">Operar mensagens em lote</span> — selecione conversas e responda várias pessoas com tom humano.
              </li>
            </ul>
          </div>

          <div className="pt-4 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/50 bg-brand-primary/90 px-8 py-3 text-base font-semibold text-slate-950 transition hover:bg-brand-primary/100"
            >
              Ir para o painel
              <ArrowRight className="h-5 w-5" />
            </Link>
            {import.meta.env.VITE_DOCS_URL && (
              <a
                href={import.meta.env.VITE_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/80 px-6 py-3 text-sm font-medium text-brand-muted transition hover:border-brand-primary/40 hover:text-brand-primary"
              >
                Ver documentação rápida
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
