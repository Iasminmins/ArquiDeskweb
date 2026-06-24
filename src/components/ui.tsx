import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants = {
    primary: "bg-ink text-white hover:bg-moss",
    secondary: "bg-white text-ink border border-line hover:bg-fog",
    ghost: "text-ink hover:bg-fog",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-moss focus:ring-2 focus:ring-moss/20";

export function Modal({
  title,
  children,
  onClose,
  width = "max-w-3xl",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <section className={`max-h-[92vh] w-full overflow-hidden rounded-lg bg-white shadow-soft ${width}`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-fog" aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[calc(92vh-74px)] overflow-auto p-5">{children}</div>
      </section>
    </div>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <p className="text-sm text-ink/65">{label}</p>
      <strong className="mt-2 block text-2xl text-ink">{value}</strong>
      {detail ? <span className="mt-1 block text-xs text-ink/55">{detail}</span> : null}
    </article>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <div>
        <p className="font-semibold text-ink">{title}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
