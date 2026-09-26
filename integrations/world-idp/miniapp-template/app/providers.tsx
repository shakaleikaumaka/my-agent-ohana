"use client";
// MiniKitProvider initializes MiniKit and makes it available throughout the app.
// Per World docs: wrap the app in a client component. app_id comes from the dev portal.
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider props={{ appId: process.env.NEXT_PUBLIC_WORLD_APP_ID as string }}>
      {children}
    </MiniKitProvider>
  );
}
