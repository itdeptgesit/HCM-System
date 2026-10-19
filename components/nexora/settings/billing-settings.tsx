import { useState } from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Invoice = {
  id: string
  date: string
  amount: string
  status: "Paid" | "Pending" | "Failed"
  plan: string
}

type PaymentMethod = {
  id: string
  brand: string
  last4: string
  expiry: string
  isDefault: boolean
}

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

const initialInvoices: Invoice[] = [
  {
    id: "INV-2026-009",
    date: "Oct 01, 2026",
    amount: "$29.00",
    status: "Paid",
    plan: "Pro Plan",
  },
  {
    id: "INV-2026-008",
    date: "Sep 01, 2026",
    amount: "$29.00",
    status: "Paid",
    plan: "Pro Plan",
  },
  {
    id: "INV-2026-007",
    date: "Aug 01, 2026",
    amount: "$29.00",
    status: "Paid",
    plan: "Pro Plan",
  },
  {
    id: "INV-2026-006",
    date: "Jul 01, 2026",
    amount: "$29.00",
    status: "Paid",
    plan: "Pro Plan",
  },
]

const initialPaymentMethods: PaymentMethod[] = [
  {
    id: "pm_1",
    brand: "Visa",
    last4: "4242",
    expiry: "08/28",
    isDefault: true,
  },
  {
    id: "pm_2",
    brand: "Mastercard",
    last4: "8888",
    expiry: "12/26",
    isDefault: false,
  },
]

const plans = [
  {
    id: "free",
    name: "Free",
    description: "For individuals and small tests.",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "Up to 100 contacts",
      "Basic deal management",
      "1 team seat",
      "Basic reporting analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams scaling sales.",
    priceMonthly: 29,
    priceYearly: 24,
    popular: true,
    features: [
      "Unlimited contacts",
      "Advanced pipeline automation",
      "5 team seats included",
      "Custom dashboards & reports",
      "Priority email support",
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "For enterprises with complex workflows.",
    priceMonthly: 59,
    priceYearly: 49,
    features: [
      "Everything in Pro",
      "Unlimited team seats",
      "Custom API & webhooks access",
      "24/7 Dedicated account manager",
      "Custom SLA & security audit",
    ],
  },
]

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function BillingSettings() {
  const [currentPlan, setCurrentPlan] = useState("pro")
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  )
  const [invoices] = useState<Invoice[]>(initialInvoices)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    initialPaymentMethods
  )
  const [notice, setNotice] = useState<string | null>(null)

  // Modals state
  const [showAddCardModal, setShowAddCardModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Form states for adding card
  const [newCardNumber, setNewCardNumber] = useState("")
  const [newCardExpiry, setNewCardExpiry] = useState("")
  const [newCardCvc, setNewCardCvc] = useState("")

  const activePlan = plans.find((plan) => plan.id === currentPlan) ?? plans[1]

  const getPrice = (plan: (typeof plans)[number]) => {
    return billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly
  }

  const handlePlanChange = (planId: string) => {
    if (planId === currentPlan) return
    const plan = plans.find((item) => item.id === planId)
    if (!plan) return

    setCurrentPlan(planId)
    triggerNotice(`Your subscription has been updated to the ${plan.name} Plan.`)
  }

  const handleAddPaymentMethod = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCardNumber) return

    const last4 = newCardNumber.slice(-4) || "9999"
    const newPm: PaymentMethod = {
      id: `pm_${Date.now()}`,
      brand: "Visa",
      last4,
      expiry: newCardExpiry || "12/29",
      isDefault: paymentMethods.length === 0,
    }

    setPaymentMethods((prev) => [...prev, newPm])
    setShowAddCardModal(false)
    setNewCardNumber("")
    setNewCardExpiry("")
    setNewCardCvc("")
    triggerNotice(`Added new Visa ending in ${last4}.`)
  }

  const handleSetDefaultPayment = (id: string) => {
    setPaymentMethods((prev) =>
      prev.map((pm) => ({
        ...pm,
        isDefault: pm.id === id,
      }))
    )
    triggerNotice("Default payment method updated.")
  }

  const handleRemovePayment = (id: string) => {
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id))
    triggerNotice("Payment method removed.")
  }

  const triggerNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 4000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Billing & Plans</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your subscription plan, payment details, and billing history.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
          onClick={() => triggerNotice("Redirecting to support desk...")}
        >
          <HelpCircle className="size-4" />
          Billing Help & Support
        </Button>
      </div>

      {/* Dynamic Notification Banner */}
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-medium text-primary">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-primary/70 hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Active Subscription Overview Card */}
      <section className="relative overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Zap className="size-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">{activePlan.name} Plan</h3>
                <Badge className="border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Subscription
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {activePlan.description}
              </p>

              <p className="mt-3 text-xs text-muted-foreground">
                Next billing date:{" "}
                <span className="font-semibold text-foreground">
                  November 01, 2026
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 border-t pt-4 md:border-t-0 md:pt-0 md:items-end">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight">
                ${getPrice(activePlan)}
              </span>
              <span className="text-xs text-muted-foreground">
                / {billingCycle === "yearly" ? "month (billed annually)" : "month"}
              </span>
            </div>
            <Button
              size="sm"
              onClick={() =>
                document
                  .getElementById("available-plans")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Change Plan
            </Button>
          </div>
        </div>

        {/* Usage Indicators */}
        <div className="grid grid-cols-1 border-t bg-muted/20 px-6 py-4 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="flex justify-between text-muted-foreground">
              <span>Seats used</span>
              <span className="font-semibold text-foreground">3 / 5</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
              <div className="h-full w-[60%] rounded-full bg-primary" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-muted-foreground">
              <span>API Request quota</span>
              <span className="font-semibold text-foreground">82%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
              <div className="h-full w-[82%] rounded-full bg-primary" />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-muted-foreground">
              <span>Monthly Workflows</span>
              <span className="font-semibold text-foreground">1,420 / 2,500</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
              <div className="h-full w-[56%] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Available Plans Selector */}
      <section id="available-plans" className="space-y-4 scroll-mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-bold">Select Subscription Plan</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Upgrade or downgrade your tier at any time.
            </p>
          </div>

          {/* Billing Toggle Switch */}
          <div className="inline-flex items-center rounded-lg border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-background shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                billingCycle === "yearly"
                  ? "bg-background shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Annual Billing</span>
              <Badge className="border-0 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id
            const price = getPrice(plan)

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-xl border bg-card p-5 transition-all ${
                  plan.popular
                    ? "border-primary shadow-xs ring-1 ring-primary/20"
                    : "hover:border-primary/40"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-5 gap-1 bg-primary text-primary-foreground">
                    <Sparkles className="size-3" />
                    Most Popular
                  </Badge>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold">{plan.name}</h4>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-[10px]">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground min-h-8">
                    {plan.description}
                  </p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight">
                      ${price}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / month
                    </span>
                  </div>

                  <div className="my-4 border-t" />

                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Features included
                  </p>
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  className="mt-6 w-full text-xs"
                  variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => handlePlanChange(plan.id)}
                >
                  {isCurrent ? "Current Active Plan" : `Upgrade to ${plan.name}`}
                </Button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Payment Methods Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold">Payment Methods</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manage credit cards and payment preferences.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => setShowAddCardModal(true)}
          >
            <Plus className="size-3.5" />
            Add Payment Method
          </Button>
        </div>

        <div className="grid gap-3">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="flex items-center justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                  <CreditCard className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold">
                      {pm.brand} ending in •••• {pm.last4}
                    </p>
                    {pm.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Expires {pm.expiry}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!pm.isDefault && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleSetDefaultPayment(pm.id)}
                  >
                    Set as Default
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemovePayment(pm.id)}
                  title="Remove card"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Billing History Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold">Billing History & Invoices</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Download tax invoices and transaction records.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
            onClick={() => triggerNotice("Preparing invoice archive export...")}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-4 border-b bg-muted/30 px-5 py-3 text-xs font-semibold text-muted-foreground md:grid">
            <span>Invoice Reference</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex flex-col gap-3 border-b px-5 py-3.5 text-xs last:border-b-0 md:grid md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-center md:gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/60">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">{invoice.id}</p>
                  <p className="text-[11px] text-muted-foreground">{invoice.plan}</p>
                </div>
              </div>

              <div className="flex items-center justify-between md:block">
                <span className="text-muted-foreground md:hidden">Date:</span>
                <span>{invoice.date}</span>
              </div>

              <div className="flex items-center justify-between md:block">
                <span className="text-muted-foreground md:hidden">Amount:</span>
                <span className="font-semibold">{invoice.amount}</span>
              </div>

              <div className="flex items-center justify-between md:block">
                <span className="text-muted-foreground md:hidden">Status:</span>
                <Badge
                  variant="secondary"
                  className={
                    invoice.status === "Paid"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600"
                  }
                >
                  {invoice.status}
                </Badge>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => triggerNotice(`Downloading PDF for ${invoice.id}...`)}
                >
                  <Download className="size-3.5" />
                  PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone: Cancel Subscription */}
      <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-destructive">
              Cancel Subscription
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Once canceled, your account will downgrade to Free at the end of current cycle.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
            onClick={() => setShowCancelModal(true)}
          >
            Cancel Subscription
          </Button>
        </div>
      </section>

      {/* Modal: Add Payment Card */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                <h3 className="font-bold">Add Payment Card</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCardModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleAddPaymentMethod} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="card-number" className="text-xs">
                  Card Number
                </Label>
                <Input
                  id="card-number"
                  placeholder="4532 •••• •••• 8888"
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="card-expiry" className="text-xs">
                    Expiry Date
                  </Label>
                  <Input
                    id="card-expiry"
                    placeholder="MM/YY"
                    value={newCardExpiry}
                    onChange={(e) => setNewCardExpiry(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="card-cvc" className="text-xs">
                    CVC / CVV
                  </Label>
                  <Input
                    id="card-cvc"
                    type="password"
                    placeholder="•••"
                    maxLength={4}
                    value={newCardCvc}
                    onChange={(e) => setNewCardCvc(e.target.value)}
                    className="text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span>256-bit SSL encrypted & PCI-DSS compliant payment processing.</span>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCardModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Cancel Subscription */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 border-b pb-4 text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              <h3 className="font-bold">Cancel Subscription?</h3>
            </div>

            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to cancel your <strong>{activePlan.name} Plan</strong>? You will lose access to team collaboration tools, custom reporting, and workflow automation at the end of your current cycle on <strong>November 01, 2026</strong>.
            </p>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowCancelModal(false)
                  setCurrentPlan("free")
                  triggerNotice("Subscription scheduled for cancellation.")
                }}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}