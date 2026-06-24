import { useEffect, useMemo, useState } from "react";
import type { AppContext } from "../App";
import { Field, inputClass, Modal } from "../components/ui";
import { formatDate, monthRange } from "../lib/format";
import type { ClientProject, Stage } from "../lib/types";
import { getProjects, stageTitle } from "./data";

type ScheduleItem = {
  id: string;
  date: string;
  title: string;
  project: ClientProject;
  stage: Stage;
};

type CalendarDay = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calendarDays(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const today = dateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    return {
      date: key,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
      isToday: key === today,
    };
  });
}

function projectSchedule(project: ClientProject): ScheduleItem[] {
  const dates: Array<[string, string | null | undefined, Stage]> = [
    ["Apresentação", project.presentation_date, "PROJETO"],
    ["Fechamento", project.closing_date, "NEGOCIACAO"],
    ["Envio para fábrica", project.sent_to_factory_date, "CONFERENCIA"],
    ["Faturamento", project.billing_date, "CONFERENCIA"],
    ["Início da montagem", project.assembly_started_date, "MONTAGEM"],
    ["Finalização da montagem", project.assembly_finished_date, "MONTAGEM"],
    ["Pedido de assistência", project.order_date, "ASSISTENCIA"],
    ["Assistência", project.assistance_date, "ASSISTENCIA"],
  ];

  return dates
    .filter(([, date]) => Boolean(date))
    .map(([title, date, stage]) => ({
      id: `${project.id}-${title}-${date}`,
      date: date!,
      title,
      project,
      stage,
    }));
}

export function SchedulePage({ ctx }: { ctx: AppContext }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  async function load() {
    if (!ctx.profile.company_id) return;
    setLoading(true);
    const { data, error } = await getProjects(ctx.profile.company_id, undefined, ctx.profile);
    setLoading(false);
    if (error) return ctx.toast("error", error.message);
    setProjects(data || []);
  }

  useEffect(() => {
    load();
  }, [ctx.profile.company_id, ctx.profile.id, ctx.profile.role]);

  const { start, end } = monthRange(year, month);
  const items = useMemo(() => projects
    .flatMap(projectSchedule)
    .filter((item) => item.date >= start && item.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)), [projects, start, end]);

  const grouped = useMemo(() => items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    acc[item.date] = acc[item.date] || [];
    acc[item.date].push(item);
    return acc;
  }, {}), [items]);

  const calendar = useMemo(() => calendarDays(year, month), [year, month]);
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  const selectedItems = selectedDate ? grouped[selectedDate] || [] : [];

  return (
    <section className="grid gap-5">
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 md:flex-row md:items-end">
        <div className="mr-auto">
          <h2 className="font-bold">Agenda do mês</h2>
          <p className="mt-1 text-sm text-ink/60">Tudo que foi marcado nos projetos aparece aqui por data.</p>
        </div>
        <Field label="Mês"><input className={inputClass} type="number" min={1} max={12} value={month} onChange={(event) => setMonth(Number(event.target.value))} /></Field>
        <Field label="Ano"><input className={inputClass} type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} /></Field>
      </section>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <section className="rounded-lg border border-line bg-white p-4">
          <h3 className="font-bold">Resumo</h3>
          <div className="mt-4 grid gap-3">
            <div className="rounded-md bg-fog p-4">
              <span className="text-sm text-ink/60">Agendamentos no mês</span>
              <strong className="mt-1 block text-3xl">{items.length}</strong>
            </div>
            {(["PROJETO", "NEGOCIACAO", "CONFERENCIA", "MONTAGEM", "ASSISTENCIA"] as const).map((stage) => (
              <div key={stage} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
                <span>{stageTitle[stage]}</span>
                <strong>{items.filter((item) => item.stage === stage).length}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line p-4">
            <h3 className="font-bold capitalize">{monthName}</h3>
            <span className="text-sm text-ink/55">{items.length} agendamento{items.length === 1 ? "" : "s"}</span>
          </div>
          <div className="p-4">
            <div className="mx-auto max-w-[460px]">
              <div className="mb-2 grid text-center text-xs font-bold uppercase text-ink/55" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <span key={`${day}-${index}`} className="py-2">{day}</span>)}
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                {calendar.map((day) => {
                  const dayItems = grouped[day.date] || [];
                  return (
                    <button key={day.date} type="button" onClick={() => setSelectedDate(day.date)} className={`relative grid aspect-square place-items-center rounded-md border text-sm font-semibold transition hover:border-moss hover:bg-fog ${day.inMonth ? "border-line bg-white text-ink" : "border-transparent bg-fog/50 text-ink/30"}`}>
                      <span className={`grid h-9 w-9 place-items-center rounded-full ${day.isToday ? "bg-ink text-white" : ""}`}>{day.day}</span>
                      {dayItems.length ? <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-moss" title={`${dayItems.length} agendamento${dayItems.length === 1 ? "" : "s"}`} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white xl:col-start-2">
          <div className="border-b border-line p-4 font-bold">Lista por data</div>
          {loading ? <div className="p-6 text-sm text-ink/60">Carregando agendamentos...</div> : null}
          {!loading && !items.length ? <div className="p-6 text-sm text-ink/60">Nenhum agendamento marcado para este mês.</div> : null}
          {!loading && items.length ? (
            <div className="divide-y divide-line">
              {Object.entries(grouped).map(([date, dayItems]) => (
                <div key={date} className="grid gap-3 p-4 md:grid-cols-[140px_1fr]">
                  <div>
                    <span className="text-xs uppercase text-ink/55">Data</span>
                    <strong className="block">{formatDate(date)}</strong>
                  </div>
                  <div className="grid gap-2">
                    {dayItems.map((item) => (
                      <article key={item.id} className="rounded-md border border-line p-3">
                        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                          <div>
                            <strong>{item.title}</strong>
                            <span className="block text-sm text-ink/60">{item.project.client_name} · {item.project.project_name}</span>
                          </div>
                          <span className="w-fit rounded bg-fog px-2 py-1 text-xs font-semibold text-ink/65">{stageTitle[item.stage]}</span>
                        </div>
                        <div className="mt-2 text-xs text-ink/55">
                          Projetista: {item.project.designer?.name || "-"} · Etapa atual: {stageTitle[item.project.current_stage]}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
      {selectedDate ? (
        <Modal title={`Agendamentos - ${formatDate(selectedDate)}`} onClose={() => setSelectedDate(null)} width="max-w-2xl">
          {selectedItems.length ? (
            <div className="grid gap-3">
              {selectedItems.map((item) => (
                <article key={item.id} className="rounded-md border border-line p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <strong>{item.title}</strong>
                      <span className="block text-sm text-ink/60">{item.project.client_name} · {item.project.project_name}</span>
                    </div>
                    <span className="w-fit rounded bg-fog px-2 py-1 text-xs font-semibold text-ink/65">{stageTitle[item.stage]}</span>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-ink/65 md:grid-cols-2">
                    <span>Projetista: {item.project.designer?.name || "-"}</span>
                    <span>Etapa atual: {stageTitle[item.project.current_stage]}</span>
                    <span>Cliente: {item.project.client_name}</span>
                    <span>Telefone: {item.project.client_phone || "-"}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-line bg-fog p-4 text-sm text-ink/60">Nenhum agendamento marcado para este dia.</div>
          )}
        </Modal>
      ) : null}
    </section>
  );
}
