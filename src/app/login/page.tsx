import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccessDenial, safeReturnPath } from "@/lib/access.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in | OpenKitty", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const denied = await getAccessDenial(await headers());
  if (!denied) redirect(next);
  const unavailable = denied.status === 503;
  const error = params.error === "limited" ? "Too many attempts. Please wait a minute and try again."
    : params.error === "invalid" ? "That password wasn’t correct. Please try again." : null;

  return (
    <section className="mx-auto my-12 w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8" aria-labelledby="login-title">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Your private workspace</p>
      <h1 id="login-title" className="text-3xl font-bold tracking-tight">Welcome to OpenKitty</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {unavailable ? "Access hasn’t been configured yet. Please try again later." : "Enter your password to explore the app."}
      </p>
      {!unavailable && <form action="/api/auth/login" method="post" className="mt-7 space-y-5">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256}
            aria-describedby={error ? "login-error" : undefined} aria-invalid={error ? true : undefined}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-base text-white outline-none focus:border-white focus:ring-2 focus:ring-white/20" />
        </div>
        {error && <p id="login-error" role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Open OpenKitty</button>
        <p className="text-xs leading-5 text-zinc-500">You’ll stay signed in for 12 hours on this browser.</p>
      </form>}
    </section>
  );
}
