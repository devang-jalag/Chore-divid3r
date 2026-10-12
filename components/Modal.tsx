export default function Modal({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-2">
          <div>
            {eyebrow && (
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-pine">
                {eyebrow}
              </p>
            )}
            <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface2 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6 pt-2">{children}</div>
      </div>
    </div>
  );
}
