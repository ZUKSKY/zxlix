export default function Loading() {
  return <main className="min-h-screen bg-[#020617] p-5 pt-28 text-white">
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="skeleton-blue h-[420px] rounded-[2rem] border border-sky-300/10" />
      <div className="flex items-end justify-between"><div className="space-y-3"><div className="skeleton-blue h-4 w-28 rounded-full" /><div className="skeleton-blue h-9 w-72 rounded-xl" /></div><div className="skeleton-blue hidden h-10 w-28 rounded-full sm:block" /></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 12 }).map((_, index) => <div key={index} className="space-y-3"><div className="skeleton-blue aspect-[2/3] rounded-[1.35rem] border border-sky-300/10" /><div className="skeleton-blue h-4 rounded-full" /><div className="skeleton-blue h-3 w-2/3 rounded-full" /></div>)}</div>
    </div>
  </main>;
}
