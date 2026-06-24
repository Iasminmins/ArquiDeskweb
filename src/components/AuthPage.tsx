import { useState } from "react";
import { Building2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { Button, Field, inputClass } from "./ui";

type AuthMode = "login" | "signup";

type AuthPageProps = {
  onToast: (type: "success" | "error", text: string) => void;
  onAuthReady: () => Promise<void>;
};

export function AuthPage({ onToast, onAuthReady }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) onToast("error", error.message);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, company_name: companyName } },
    });

    if (error) {
      setLoading(false);
      onToast("error", error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      onToast("success", "Cadastro criado. Confirme seu e-mail para acessar a plataforma.");
      return;
    }

    const { error: onboardingError } = await supabase.rpc("create_company_for_current_user", {
      company_name: companyName,
      full_name: name,
    });

    setLoading(false);

    if (onboardingError) {
      onToast("error", onboardingError.message);
      return;
    }

    onToast("success", "Cadastro concluido. Bem-vindo ao Arquidesk.");
    await onAuthReady();
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-fog lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex min-h-[42vh] items-end bg-[linear-gradient(135deg,rgba(21,32,29,.82),rgba(71,98,79,.74)),url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center p-8 text-white lg:min-h-screen lg:p-12">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-3 text-lg font-bold">
            <Building2 /> Arquidesk
          </div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">Gestao completa para arquitetura, marcenaria e interiores.</h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Fluxo operacional, financeiro separado, metas e permissoes por empresa em uma plataforma SaaS.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
          <div className="grid grid-cols-2 rounded-md border border-line bg-fog p-1 text-sm font-semibold">
            <button
              className={`rounded px-3 py-2 transition ${mode === "login" ? "bg-white text-ink shadow-sm" : "text-ink/60"}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Entrar
            </button>
            <button
              className={`rounded px-3 py-2 transition ${mode === "signup" ? "bg-white text-ink shadow-sm" : "text-ink/60"}`}
              onClick={() => setMode("signup")}
              type="button"
            >
              Cadastrar
            </button>
          </div>

          <h2 className="mt-6 text-2xl font-bold">{mode === "login" ? "Entrar" : "Criar conta"}</h2>

          {!isSupabaseConfigured ? (
            <div className="mt-4 rounded-md border border-clay/30 bg-clay/10 p-3 text-sm text-clay">
              Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.
            </div>
          ) : null}

          <div className="mt-6 grid gap-4">
            {mode === "signup" ? (
              <>
                <Field label="Nome">
                  <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
                </Field>
                <Field label="Empresa">
                  <input className={inputClass} value={companyName} onChange={(event) => setCompanyName(event.target.value)} required />
                </Field>
              </>
            ) : null}
            <Field label="E-mail">
              <input className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </Field>
            <Field label="Senha">
              <input className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required />
            </Field>
            <Button disabled={loading || !isSupabaseConfigured}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
