"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <main className="min-h-screen bg-[#080a0f] p-8 text-white"><div className="mx-auto max-w-2xl rounded-3xl border border-amber-400/20 bg-amber-400/10 p-8"><h1 className="text-3xl font-black">Terjadi error</h1><p className="mt-3 text-amber-100">{error.message}</p><button onClick={reset} className="mt-6 rounded-xl bg-rose-500 px-5 py-3 font-bold">Coba lagi</button></div></main>;
}
