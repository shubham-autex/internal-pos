export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="h-7 w-28 rounded-lg bg-[var(--surface-muted)]" />
      <div className="h-44 rounded-2xl bg-[var(--surface)]" />
      <div className="h-12 rounded-xl bg-[var(--surface)]" />
      <div className="space-y-2">
        <div className="h-20 rounded-2xl bg-[var(--surface)]" />
        <div className="h-20 rounded-2xl bg-[var(--surface)]" />
        <div className="h-20 rounded-2xl bg-[var(--surface)]" />
      </div>
    </div>
  );
}
