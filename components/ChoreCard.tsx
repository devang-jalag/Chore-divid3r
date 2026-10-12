import { initials } from "@/lib/cycles";

export interface CardChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export default function ChoreCard({
  title,
  badge,
  assigneeName,
  done,
  statusText,
  items,
  onToggleDone,
  onToggleItem,
  onEditChecklist,
}: {
  title: string;
  badge: string;
  assigneeName: string | null;
  done: boolean;
  statusText: string;
  items: CardChecklistItem[];
  onToggleDone: () => void;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onEditChecklist?: () => void;
}) {
  return (
    <article
      className={`flex min-h-[230px] flex-col rounded-2xl border p-5 transition ${
        done ? "border-pine bg-pinelt" : "border-line bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted">{badge}</span>
        <button
          onClick={onToggleDone}
          aria-label={done ? "Mark not done" : "Mark done"}
          className={`grid h-10 w-10 place-items-center rounded-full border text-lg ${
            done ? "border-pine bg-pine text-white" : "border-line"
          }`}
        >
          {done ? "✓" : "○"}
        </button>
      </div>

      <h3 className="mb-2 mt-6 text-xl font-bold leading-tight tracking-tight">
        {title}
      </h3>

      {items.length > 0 ? (
        <div className="mb-1 grid gap-1.5">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-2.5 text-[0.9rem] leading-snug"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => onToggleItem(item.id, e.target.checked)}
                aria-label={item.text}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#167a4a]"
              />
              <span
                className={item.checked ? "text-muted line-through" : undefined}
              >
                {item.text}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted">No steps added yet.</p>
      )}

      {onEditChecklist && (
        <button
          onClick={onEditChecklist}
          className="mt-1 self-start py-1 text-sm font-bold text-pine"
        >
          Edit checklist
        </button>
      )}

      <div className="mt-auto flex items-center gap-2.5 pt-5">
        {assigneeName ? (
          <>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-infolt text-sm font-bold text-info">
              {initials(assigneeName)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold">{assigneeName}</p>
              <p className="text-xs text-muted">{statusText}</p>
            </div>
          </>
        ) : (
          <p className="text-sm italic text-muted">Waiting for household members</p>
        )}
      </div>
    </article>
  );
}
