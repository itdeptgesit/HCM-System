import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  Fingerprint,
  Handshake,
  LayoutDashboard,
  Plus,
  Settings,
  Target,
  Users,
} from "lucide-react"

export const navigation = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    label: "Analytics",
    items: [
      {
        title: "Reports",
        url: "/reports",
        icon: BarChart3,
      },
    ],
  },

  {
    label: "CRM",
    items: [
      {
        title: "Leads",
        url: "/leads",
        icon: Target,
        items: [
          {
            title: "All Leads",
            url: "/leads",
          },
          {
            title: "Pipeline",
            url: "/leads/pipeline",
          },
          {
            title: "Add Lead",
            url: "/leads/new",
            icon: Plus,
          },
        ],
      },

      {
        title: "Contacts",
        url: "/contacts",
        icon: Users,
      },

      {
        title: "Companies",
        url: "/companies",
        icon: Building2,
      },

      {
        title: "Deals",
        url: "/deals",
        icon: Handshake,
        items: [
          {
            title: "All Deals",
            url: "/deals",
          },
          {
            title: "Pipeline",
            url: "/deals/pipeline",
          },
        ],
      },
    ],
  },

  {
    label: "Authentication",
    items: [
      {
        title: "Auth",
        url: "/auth",
        icon: Fingerprint,
        items: [
          {
            title: "Login",
            url: "/auth/login",
          },
          {
            title: "Register",
            url: "/auth/register",
          },
          {
            title: "Forgot Password",
            url: "/auth/forgot-password",
            icon: Plus,
          },
          {
            title: "Reset Password",
            url: "/auth/reset-password",
            icon: Plus,
          },
          {
            title: "Verify Email",
            url: "/auth/verify-email",
            icon: Plus,
          },
          {
            title: "Two Factor",
            url: "/auth/two-factor",
            icon: Plus,
          },
          {
            title: "Accept Invite",
            url: "/auth/accept-invite",
            icon: Plus,
          },
          {
            title: "Password Success",
            url: "/auth/password-success",
            icon: Plus,
          }
        ],
      },
    ],
  },

  {
    label: "Engagement",
    items: [
      {
        title: "Activities",
        url: "/activities",
        icon: Activity,
      },
      {
        title: "Calendar",
        url: "/calendar",
        icon: CalendarDays,
      },
    ],
  },

  {
    label: "Workspace",
    items: [
      {
        title: "Team",
        url: "/team",
        icon: Users,
      },
    ],
  },


  {
    label: "Settings",
    items: [
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      },
    ],
  },
] as const