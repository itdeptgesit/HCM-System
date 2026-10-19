import { useState } from "react"

import { SettingsContent } from "@/components/nexora/settings/settings-content"
import { SettingsHeader } from "@/components/nexora/settings/settings-header"
import {
  SettingsSidebar,
  type SettingSection,
} from "@/components/nexora/settings/settings-sidebar"

export function Settings() {
  const [activeSection, setActiveSection] =
    useState<SettingSection>("profile")

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <SettingsHeader />

      {/* Responsive layout: stacked on mobile, sidebar + main grid on desktop */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Sidebar Container */}
        <aside className="w-full shrink-0 lg:w-64 lg:sticky lg:top-6">
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">
          <SettingsContent activeSection={activeSection} />
        </main>
      </div>
    </div>
  )
}