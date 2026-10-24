import type { TranslationKey } from "@/i18n/translations"

export const WHATSAPP_NUMBER = "601154034051"

/** Build a wa.me deep link with a prefilled message. */
export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export interface DutaosPlan {
  nameKey: TranslationKey
  tagKey: TranslationKey
  featureKeys: TranslationKey[]
  price: string
  featured?: boolean
}

export const dutaosPlans: DutaosPlan[] = [
  {
    nameKey: "dutaosConnectName",
    tagKey: "dutaosConnectTag",
    price: "1,199",
    featureKeys: ["dutaosConnectF1", "dutaosConnectF2", "dutaosConnectF3", "dutaosConnectF4"],
  },
  {
    nameKey: "dutaosOpsName",
    tagKey: "dutaosOpsTag",
    price: "1,299",
    featureKeys: ["dutaosOpsF1", "dutaosOpsF2", "dutaosOpsF3", "dutaosOpsF4"],
  },
  {
    nameKey: "dutaosGovernName",
    tagKey: "dutaosGovernTag",
    price: "2,999",
    featureKeys: ["dutaosGovernF1", "dutaosGovernF2", "dutaosGovernF3", "dutaosGovernF4"],
  },
  {
    nameKey: "dutaosBundleName",
    tagKey: "dutaosBundleTag",
    price: "3,999",
    featureKeys: ["dutaosBundleF1", "dutaosBundleF2", "dutaosBundleF3", "dutaosBundleF4"],
    featured: true,
  },
]
