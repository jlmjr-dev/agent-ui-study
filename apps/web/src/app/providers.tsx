import type { ReactNode } from "react"
import { BrowserRouter } from "react-router-dom"

import { RunProvider } from "@/features/chat/run-context"
import { SettingsProvider } from "@/features/settings/settings-context"
import { StoreProvider } from "@/services/store-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <StoreProvider>
          <RunProvider>{children}</RunProvider>
        </StoreProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
