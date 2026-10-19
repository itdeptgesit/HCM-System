
import { ProfileSettings } from "@/components/nexora/settings/profile-settings"
import type { SettingSection } from "@/components/nexora/settings/settings-sidebar"
import { SecuritySettings } from "@/components/nexora/settings/security-settings"
import { WorkspaceSettings } from "@/components/nexora/settings/workspace-settings"
import { NotificationsSettings } from "@/components/nexora/settings/notifications-settings"
import { AppearanceSettings } from "@/components/nexora/settings/appearance-settings"
import { PipelineSettings } from "@/components/nexora/settings/pipeline-settings"
import { IntegrationsSettings } from "@/components/nexora/settings/integrations-settings"
import { BillingSettings } from "@/components/nexora/settings/billing-settings"
import { ApiWebhooksSettings } from "@/components/nexora/settings/api-webhooks-settings"
import { DataSettings } from "@/components/nexora/settings/data-settings"

interface SettingsContentProps {
  activeSection: SettingSection
}

export function SettingsContent({
  activeSection,
}: SettingsContentProps) {
  switch (activeSection) {
    case "profile":
      return <ProfileSettings />

    case "security":
      return <SecuritySettings />

    case "workspace":
      return <WorkspaceSettings />

    case "notifications":
      return <NotificationsSettings />

    case "appearance":
      return <AppearanceSettings />

    case "pipeline":
      return <PipelineSettings />

    case "integrations":
      return <IntegrationsSettings />

    case "billing":
      return <BillingSettings />

    case "api-webhooks":
      return <ApiWebhooksSettings />

    case "data":
      return <DataSettings />

    default:
      return null
  }
}
