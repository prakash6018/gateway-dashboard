import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { SESSION_COOKIE, verifySession } from "@/lib/session.ts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gateway Console",
  description: "Spend, budgets and guardrails for the LLM gateway",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, process.env.SESSION_SECRET ?? "");
  const viewer = session ? { name: session.name, role: session.role } : null;
  return (
    <html lang="en">
      <body>
        <Providers viewer={viewer}>{viewer ? <Shell>{children}</Shell> : children}</Providers>
      </body>
    </html>
  );
}
