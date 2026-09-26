import type { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata = {
  title: "Agent Ohana — consent mini app",
  description: "Bless a named agent with a verified human. World mini app template (MiniKit + Next.js).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#0b1020", color: "#e8ecf5" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
