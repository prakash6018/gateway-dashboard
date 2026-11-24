export default function LoginPage() {
  const demo = process.env.DEMO_LOGIN === "on";
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Gateway Console</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        {demo ? (
          <>
            <p className="mt-1.5 text-sm text-stone-500">Demo mode. Pick a role to see what each one can do.</p>
            <form action="/api/session" method="post" className="mt-6 space-y-2.5">
              <button name="role" value="admin" className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
                Continue as Admin
              </button>
              <button name="role" value="viewer" className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium hover:bg-stone-50">
                Continue as Viewer
              </button>
            </form>
            <p className="mt-5 text-xs leading-relaxed text-stone-500">
              Admins can change budgets and policies. Viewers can see everything and run cost checks.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-500">Connect an identity provider to enable sign-in.</p>
        )}
      </div>
    </main>
  );
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect width="26" height="26" rx="7" className="fill-ink" />
      <path d="M7 9h12M7 13h8M7 17h5" stroke="#5eead4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
