import { CalendarView } from "@/components/expense/calendar-view";

export default function CalendarPage() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <header className="pt-1 text-center">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          カレンダー
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          カレンダーと月の履歴を切り替えられます
        </p>
      </header>
      <CalendarView />
    </div>
  );
}
