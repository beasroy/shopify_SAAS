import { Check, Star, AlertCircle, Calendar, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { RootState } from "@/store"
import { useSelector } from "react-redux"
import { pricingPlans, apphandle, baseURL } from "@/data/constant"
import { useEffect, useState } from "react"
import axios from "axios"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"


interface PricingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Subscription {
  id: string
  planName: string
  price: number
  status: string
  chargeId: string
  trialEndsOn: string
  trialDaysRemaining: number
  billingOn: string
  daysUntilBilling: number
  createdAt: string
}

export default function PricingModal({ open, onOpenChange }: PricingModalProps) {
  const { selectedBrandId, brands } = useSelector((state: RootState) => state.brand)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const selectedBrand = brands.find((brand) => brand._id === selectedBrandId)
  const shopifyStoreName = selectedBrand?.shopifyAccount?.shopName.replace(".myshopify.com", "") || ""
  const handle = apphandle || "parallels"

  const brandId = useSelector((state:RootState)=>state.brand.selectedBrandId);

  useEffect(() => {
    if (open) {
      fetchSubscriptionDetails()
    }
  }, [open])

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${baseURL}/api/pricing/details/${brandId}`)
      setSubscription(response.data)
    } catch (err) {
      console.error("Error fetching subscription details:", err)
    } finally {
      setLoading(false)
    }
  }


  const getPlanIdFromName = (planName: string): string => {
    const planMap: Record<string, string> = {
      "Free Plan": "FREE",
      "Startup Plan": "STARTUP",
      "Growth Plan": "GROWTH",
    }
    return planMap[planName] || "FREE"
  }

  const currentPlanId = subscription ? getPlanIdFromName(subscription.planName) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-auto max-h-[90vh]">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-center">Find Your Perfect Plan</DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="px-6 pt-6">
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : subscription ? (
          <div className="px-6">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    Current Plan:{" "}
                    <span
                      className={`ml-2 ${
                        currentPlanId === "FREE"
                          ? "text-teal-600"
                          : currentPlanId === "STARTUP"
                            ? "text-violet-600"
                            : "text-rose-600"
                      }`}
                    >
                      {subscription.planName}
                    </span>
                  </h3>
                  <p className="text-slate-600 mt-1">
                    Status: <span className="font-medium text-green-600 capitalize">{subscription.status}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {subscription.trialDaysRemaining > 0 && (
                    <div className="flex items-center bg-amber-50 text-amber-700 px-4 py-2 rounded-md border border-amber-200">
                      <Clock className="h-4 w-4 mr-2" />
                      <div>
                        <p className="text-sm font-medium">Trial ends in {subscription.trialDaysRemaining} days</p>
                        <p className="text-xs">{format(new Date(subscription.trialEndsOn), "MMM dd, yyyy")}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-md border border-blue-200">
                    <Calendar className="h-4 w-4 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Next billing in {subscription.daysUntilBilling} days</p>
                      <p className="text-xs">{format(new Date(subscription.billingOn), "MMM dd, yyyy")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Unable to load subscription information. Please try again later.</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => {
              const isCurrentPlan = currentPlanId === plan.id

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg ${
                    isCurrentPlan
                      ? "border-2 border-blue-500 shadow-md"
                      : plan.isPopular && !isCurrentPlan
                        ? "border-slate-200 shadow-md hover:scale-105"
                        : "border-slate-100 hover:scale-105"
                  }`}
                >
                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-semibold py-1 px-3 rounded-bl-lg">
                      CURRENT PLAN
                    </div>
                  )}

                  {plan.isPopular && !isCurrentPlan && (
                    <div className="absolute top-0 left-0 bg-amber-500 text-white text-xs font-semibold py-1 px-3 rounded-br-lg">
                      <Star className="h-3.5 w-3.5 fill-white inline-block mr-1" /> POPULAR
                    </div>
                  )}

                  <div
                    className={`p-6 flex flex-col items-center ${
                      plan.id === "FREE"
                        ? "bg-gradient-to-b from-teal-50 to-white"
                        : plan.id === "STARTUP"
                          ? "bg-gradient-to-b from-violet-50 to-white"
                          : "bg-gradient-to-b from-rose-50 to-white"
                    }`}
                  >

                    <h3 className="text-xl font-bold text-slate-800">{plan.title}</h3>

                    <div className="flex items-baseline mt-4">
                      <span
                        className={`text-4xl font-bold ${
                          plan.id === "FREE"
                            ? "text-teal-600"
                            : plan.id === "STARTUP"
                              ? "text-violet-600"
                              : "text-rose-600"
                        }`}
                      >
                        {plan.price}
                      </span>
                      {plan.period && <span className="text-slate-500 ml-1">{plan.period}</span>}
                    </div>

                    <p className="mt-3 text-slate-600 text-sm text-center">{plan.description}</p>
                  </div>

                  <div className="w-full h-px bg-slate-100"></div>

                  <div className="p-6 bg-white">
                    <ul className="space-y-4">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <div
                            className={`flex-shrink-0 rounded-full p-0.5 mt-0.5 ${
                              plan.id === "FREE"
                                ? "bg-teal-100 text-teal-600"
                                : plan.id === "STARTUP"
                                  ? "bg-violet-100 text-violet-600"
                                  : "bg-rose-100 text-rose-600"
                            }`}
                          >
                            <Check className="h-4 w-4" />
                          </div>
                          <span className="ml-3 text-slate-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      <a href={`https://admin.shopify.com/store/${shopifyStoreName}/charges/${handle}/pricing_plans`}>
                        <button
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                            isCurrentPlan
                              ? "bg-slate-200 text-slate-700 cursor-default"
                              : plan.id === "FREE"
                                ? "bg-teal-600 hover:bg-teal-700 text-white"
                                : plan.id === "STARTUP"
                                  ? "bg-violet-600 hover:bg-violet-700 text-white"
                                  : "bg-rose-600 hover:bg-rose-700 text-white"
                          }`}
                          disabled={isCurrentPlan}
                        >
                          {isCurrentPlan ? "Current Plan" : plan.buttonText}
                        </button>
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
