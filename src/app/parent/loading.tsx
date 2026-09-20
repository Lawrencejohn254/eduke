/** Skeleton shown inside the portal shell while a parent page loads. Pulses only if the user allows motion. */
export default function Loading() {
  const block = "rounded-lg bg-pp-rule/70 motion-safe:animate-pulse";
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <div className={`${block} h-8 w-64`} />
        <div className={`${block} h-4 w-80 max-w-full`} />
      </div>
      <div className={`${block} h-28`} />
      <div className="grid gap-px overflow-hidden rounded-lg border border-pp-rule bg-pp-rule sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 bg-pp-surface p-5">
            <div className={`${block} h-3 w-24`} />
            <div className={`${block} mt-5 h-8 w-28`} />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className={`${block} h-64 lg:col-span-3`} />
        <div className={`${block} h-64 lg:col-span-2`} />
      </div>
    </div>
  );
}
