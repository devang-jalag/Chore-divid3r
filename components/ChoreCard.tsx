import { Check, Circle, ArrowLeftRight } from "lucide-react";
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
  isSwapped = false,
  hasActiveSwap = false,
  isAway = false,
  awayReason = "",
  onToggleDone,
  onToggleItem,
  onEditChecklist,
  onRequestSwap,
}: {
  title: string;
  badge: string;
  assigneeName: string | null;
  done: boolean;
  statusText: string;
  items: CardChecklistItem[];
  isSwapped?: boolean;
  hasActiveSwap?: boolean;
  isAway?: boolean;
  awayReason?: string;
  onToggleDone: () => void;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onEditChecklist?: () => void;
  onRequestSwap?: () => void;
}) {
  return (
    <article
      className={`flex min-h-[240px] flex-col rounded-2xl border p-5 transition duration-200 shadow-sm ${
        done
          ? "border-pine bg-pinelt/40 dark:bg-green-950/20"
          : "border-line bg-surface hover:border-muted/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted uppercase tracking-wider">{badge}</span>
          {isSwapped && (
            <span className="rounded-md bg-infolt px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-info">
              Swapped
            </span>
          )}
          {hasActiveSwap && !isSwapped && (
            <span className="rounded-md bg-amberlt px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Swap Pending
            </span>
          )}
          {isAway && (
            <span
              title={awayReason ? `Away: ${awayReason}` : "Scheduled away"}
              className="rounded-md bg-amberlt px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800"
            >
              Away
            </span>
          )}
        </div>
        <button
          onClick={onToggleDone}
          aria-label={done ? "Mark not done" : "Mark done"}
          className={`grid h-10 w-10 place-items-center rounded-full border transition active:scale-95 ${
            done
              ? "border-pine bg-pine text-white"
              : "border-line bg-surface2/50 text-muted hover:border-ink hover:text-ink"
          }`}
        >
          {done ? <Check className="h-5 w-5 stroke-[2.5]" /> : <Circle className="h-5 w-5" />}
        </button>
      </div>

      <h3 className="mb-2 mt-5 text-xl font-bold leading-tight tracking-tight">
        {title}
      </h3>

      {items.length > 0 ? (
        <div className="mb-1 grid gap-1.5">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-2.5 text-[0.9rem] leading-snug select-none group"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => onToggleItem(item.id, e.target.checked)}
                aria-label={item.text}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#167a4a] rounded"
              />
              <span
                className={`transition ${
                  item.checked ? "text-muted line-through" : "group-hover:text-ink"
                }`}
              >
                {item.text}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted">No steps defined yet.</p>
      )}

      <div className="mt-2 flex items-center gap-3">
        {onEditChecklist && (
          <button
            onClick={onEditChecklist}
            className="text-xs font-semibold text-pine hover:underline"
          >
            Edit checklist
          </button>
        )}
        {onRequestSwap && assigneeName && (
          <button
            onClick={onRequestSwap}
            className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition"
          >
            <ArrowLeftRight className="h-3 w-3" />
            Trade / Swap
          </button>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2.5 pt-5 border-t border-line/60">
        {assigneeName ? (
          <>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-infolt text-sm font-bold text-info">
              {initials(assigneeName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-sm">{assigneeName}</p>
              <p className="text-xs text-muted truncate">{statusText}</p>
            </div>
          </>
        ) : (
          <p className="text-sm italic text-muted">Waiting for household members</p>
        )}
      </div>
    </article>
  );
}
