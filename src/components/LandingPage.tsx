import {
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  Coins,
  FileSpreadsheet,
  Flag,
  LockKeyhole,
  Palette,
  TrendingUp,
  Users,
} from "lucide-react";
import { includedFeatures, plans, type PlanId } from "../lib/plans";

type LandingPageProps = {
  onLogin: () => void;
  onSignup: () => void;
  onSelectPlan: (planId: PlanId) => void;
};

const featureCards = [
  {
    icon: ClipboardList,
    title: "Fluxo de projetos",
    text: "Acompanhe cada cliente desde o projeto inicial até negociação, conferência, montagem, assistência e finalização.",
  },
  {
    icon: BarChart3,
    title: "Dashboard gerencial",
    text: "Veja indicadores por dia, semana, mês, ano ou período personalizado.",
  },
  {
    icon: Coins,
    title: "Financeiro",
    text: "Controle vendas, pagamentos recebidos, valores fechados e cálculo de comissão.",
  },
  {
    icon: Flag,
    title: "Metas da equipe",
    text: "Defina metas para projetistas e acompanhe desempenho individual e coletivo.",
  },
  {
    icon: CalendarDays,
    title: "Agenda",
    text: "Organize apresentações, faturamentos, montagens e assistências.",
  },
  {
    icon: LockKeyhole,
    title: "Permissões por função",
    text: "Separe acessos para admin, projetista, conferente e super admin.",
  },
  {
    icon: FileSpreadsheet,
    title: "Importação e exportação",
    text: "Facilite migração, relatórios e conferências operacionais.",
  },
  {
    icon: Palette,
    title: "Identidade da empresa",
    text: "Configure logo, capa e cores da empresa dentro da plataforma.",
  },
];

const audiences = [
  "Escritórios de arquitetura",
  "Designers de interiores",
  "Lojas de móveis planejados",
  "Marcenarias",
  "Equipes comerciais",
  "Equipes operacionais",
];

export function LandingPage({ onLogin, onSignup, onSelectPlan }: LandingPageProps) {
  return (
    <main className="bg-fog text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-6">
          <a href="#top" className="flex items-center gap-2 font-black">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white"><Building2 size={20} /></span>
            Arquidesk
          </a>
          <nav className="ml-auto hidden items-center gap-6 text-sm font-semibold text-ink/70 md:flex">
            <a href="#features" className="hover:text-ink">Funcionalidades</a>
            <a href="#how" className="hover:text-ink">Como funciona</a>
            <a href="#plans" className="hover:text-ink">Planos</a>
          </nav>
          <button type="button" onClick={onLogin} className="hidden min-h-10 rounded-md border border-line bg-white px-4 text-sm font-bold hover:bg-fog sm:inline-flex sm:items-center">
            Entrar
          </button>
          <button type="button" onClick={onSignup} className="inline-flex min-h-10 items-center rounded-md bg-ink px-4 text-sm font-bold text-white hover:bg-moss">
            Começar com 1 mês grátis
          </button>
        </div>
      </header>

      <section id="top" className="mx-auto grid min-h-[calc(100vh-65px)] max-w-7xl items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-[1.02fr_0.98fr]">
        <div>
          <span className="inline-flex rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-moss">SaaS para arquitetura, interiores e planejados</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            Gestão completa para arquitetura, interiores e móveis planejados.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink/70">
            Controle projetos, negociações, conferência, montagem, assistência, financeiro e metas da equipe em uma única plataforma.
          </p>
          <p className="mt-4 max-w-2xl font-semibold text-moss">
            Todas as funcionalidades liberadas em todos os planos. O valor muda apenas conforme o tamanho da sua equipe.
          </p>
          <p className="mt-3 max-w-2xl text-sm font-bold text-ink/70">
            Já utilizado por empresas do setor, como a Casa Contemporânea.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onSignup} className="inline-flex min-h-12 items-center justify-center rounded-md bg-ink px-5 font-bold text-white hover:bg-moss">
              Começar com 1 mês grátis
            </button>
            <button type="button" onClick={onLogin} className="inline-flex min-h-12 items-center justify-center rounded-md border border-line bg-white px-5 font-bold hover:bg-fog">
              Entrar
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <p className="text-sm text-ink/60">Dashboard Arquidesk</p>
              <strong>Visão operacional</strong>
            </div>
            <span className="rounded-full bg-fog px-3 py-1 text-xs font-bold text-moss">Ao vivo</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Projetos em andamento", "32"],
              ["Vendas do mês", "R$ 186.400"],
              ["Comissões calculadas", "R$ 12.940"],
              ["Assistências abertas", "6"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-line bg-fog p-4">
                <p className="text-sm text-ink/60">{label}</p>
                <strong className="mt-2 block text-2xl">{value}</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-line p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold"><TrendingUp size={17} /> Etapas operacionais</div>
            {["Projeto", "Negociação", "Conferência", "Montagem", "Assistência"].map((stage, index) => (
              <div key={stage} className="mb-2 grid grid-cols-[110px_1fr] items-center gap-3 text-sm">
                <span className="text-ink/60">{stage}</span>
                <span className="h-2 rounded-full bg-fog"><span className="block h-2 rounded-full bg-moss" style={{ width: `${82 - index * 12}%` }} /></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center md:px-6">
          <h2 className="text-3xl font-black">Chega de depender de planilhas soltas para controlar sua operação.</h2>
          <p className="mx-auto mt-4 max-w-3xl text-ink/70">
            Quando projetos, vendas, montagem, assistência e financeiro ficam espalhados, sua equipe perde prazo, histórico e controle. O Arquidesk centraliza tudo em um fluxo claro e rastreável.
          </p>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-black">Uma plataforma completa para controlar sua operação.</h2>
          <p className="mt-3 text-ink/70">Do primeiro atendimento à finalização do projeto, o Arquidesk organiza as etapas mais importantes da sua empresa.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-fog text-moss"><Icon size={20} /></span>
                <h3 className="mt-4 font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm text-ink/65">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="how" className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <h2 className="text-3xl font-black">Como funciona</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["1", "Crie sua conta", "Cadastre sua empresa e comece com um ambiente próprio."],
              ["2", "Cadastre equipe e projetos", "Organize usuários, clientes, projetos e etapas da operação."],
              ["3", "Acompanhe tudo em um só lugar", "Controle prazos, financeiro, metas e histórico sem depender de várias planilhas."],
            ].map(([number, title, text]) => (
              <article key={number} className="rounded-lg border border-line bg-fog p-5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink font-black text-white">{number}</span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-2 text-sm text-ink/65">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <h2 className="max-w-3xl text-3xl font-black">Feito para empresas que vendem, projetam e executam ambientes.</h2>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border border-line bg-white p-4 font-semibold">
              <Users size={18} className="text-moss" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section id="plans" className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black">Escolha o plano de acordo com o tamanho da sua equipe.</h2>
            <p className="mt-3 text-ink/70">Todos os planos incluem a plataforma completa. Escolha de acordo com o tamanho da sua equipe.</p>
            <p className="mt-2 text-sm font-bold text-moss">Menos que o custo de um erro operacional por mês.</p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.id} className={`relative rounded-lg border bg-white p-6 shadow-sm ${plan.highlighted ? "border-moss ring-2 ring-moss/20" : "border-line"}`}>
                {plan.badge ? <span className="absolute right-4 top-4 rounded-full bg-clay px-3 py-1 text-xs font-black text-white">{plan.badge}</span> : null}
                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className="mt-4 text-3xl font-black">{plan.priceLabel}</p>
                <p className="mt-2 text-sm font-bold text-moss">{plan.users}</p>
                <p className="mt-3 text-sm text-ink/65">{plan.description}</p>
                <div className="mt-5 rounded-md bg-fog p-3 text-sm font-bold">Todas as funcionalidades incluídas</div>
                <ul className="mt-5 grid gap-2 text-sm text-ink/70">
                  {includedFeatures.map((feature) => (
                    <li key={feature} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-moss" /> {feature}</li>
                  ))}
                </ul>
                <button type="button" onClick={() => onSelectPlan(plan.id)} className={`mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 font-bold ${plan.highlighted ? "bg-ink text-white hover:bg-moss" : "border border-line bg-white hover:bg-fog"}`}>
                  Começar com 1 mês grátis
                </button>
              </article>
            ))}
          </div>
          <div className="mt-8 rounded-lg border border-line bg-fog p-5 text-center">
            <p className="font-bold">Usuários adicionais: R$ 49/mês por usuário.</p>
            <p className="mt-2 text-sm text-ink/65">1 mês grátis. Não precisa de cartão no cadastro inicial.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center md:px-6">
        <h2 className="text-3xl font-black">Transforme sua operação em um processo claro, organizado e lucrativo.</h2>
        <p className="mx-auto mt-4 max-w-3xl text-ink/70">
          O Arquidesk ajuda sua empresa a controlar projetos, equipe, financeiro e etapas operacionais em uma plataforma única.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={onSignup} className="inline-flex min-h-12 items-center justify-center rounded-md bg-ink px-5 font-bold text-white hover:bg-moss">
            Começar com 1 mês grátis
          </button>
          <button type="button" onClick={onLogin} className="inline-flex min-h-12 items-center justify-center rounded-md border border-line bg-white px-5 font-bold hover:bg-fog">
            Entrar
          </button>
        </div>
      </section>
    </main>
  );
}
