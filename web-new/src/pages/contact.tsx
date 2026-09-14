import { useState } from "react"
import { MessageCircle, Mail, Clock, MapPin, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { useToast } from "@/hooks/use-toast"
import type { TranslationKey } from "@/i18n/translations"

export function ContactPage() {
  const { t } = useLanguage()
  const heroRef = useScrollReveal()
  const formRef = useScrollReveal()
  const { visible, message: toastMsg, show } = useToast()

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    company: "",
    phone: "",
    service: "",
    message: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          company: form.company,
          phone: form.phone,
          service: form.service,
          message: form.message,
          source: "contact-form",
        }),
      })

      if (res.ok) {
        show("Message sent! We'll get back to you within 24 hours.")
        setForm({ fullName: "", email: "", company: "", phone: "", service: "", message: "" })
      } else {
        show("Something went wrong. Please try again or WhatsApp us.")
      }
    } catch {
      show("Network error. Please try again or WhatsApp us.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Toast */}
      {visible && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-navy text-white px-6 py-3 rounded-xl shadow-2xl font-medium text-sm">
          {toastMsg}
        </div>
      )}

      {/* Hero */}
      <section ref={heroRef} className="py-24 md:py-32 bg-gradient-to-br from-navy via-slate-deep to-navy text-center">
        <div className="max-w-4xl mx-auto px-6">
          <Badge variant="electric" className="mb-6 reveal">{t("contactHeroLabel")}</Badge>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 reveal reveal-delay-1">
            {t("contactHeroTitle")}
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto reveal reveal-delay-2">
            {t("contactHeroDesc")}
          </p>
        </div>
      </section>

      {/* Form + Info */}
      <section ref={formRef} className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-12">
          {/* Info sidebar */}
          <div className="space-y-6">
            <Card className="p-6 reveal">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-electric" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm mb-1">{t("contactWhatsappTitle")}</h4>
                  <p className="text-muted-foreground text-sm mb-2">{t("contactWhatsappDesc")}</p>
                  <a
                    href="https://wa.me/601154034051?text=Hi%20Duta%20Integra!%20I%27m%20interested%20in%20your%20services."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric text-sm font-medium hover:underline"
                  >
                    +60 11-5403 4051
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6 reveal reveal-delay-1">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-electric" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm mb-1">{t("contactEmailTitle")}</h4>
                  <p className="text-muted-foreground text-sm mb-2">{t("contactEmailDesc")}</p>
                  <a href="mailto:info@dutaintegra.my" className="text-electric text-sm font-medium hover:underline">
                    info@dutaintegra.my
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6 reveal reveal-delay-2">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-electric" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm mb-1">{t("contactHoursTitle")}</h4>
                  <p className="text-muted-foreground text-sm mb-2">{t("contactHoursDesc")}</p>
                  <p className="text-electric text-sm font-medium">Mon–Fri, 9 AM – 6 PM (MYT)</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 reveal reveal-delay-3">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-electric" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm mb-1">{t("contactAddressTitle")}</h4>
                  <p className="text-muted-foreground text-sm">{t("contactAddress")}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="p-8 md:p-10 reveal reveal-delay-1">
              <h3 className="text-2xl font-heading font-bold mb-2">{t("contactFormTitle")}</h3>
              <p className="text-muted-foreground text-sm mb-8">{t("contactFormSub")}</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t("contactFullName")} *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                      placeholder="Ahmad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("contactEmail")} *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="ahmad@company.my"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">{t("contactCompany")}</Label>
                    <Input
                      id="company"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      placeholder="Sdn Bhd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("contactPhone")}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="012 345 6789"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">{t("contactService")}</Label>
                  <select
                    id="service"
                    name="service"
                    value={form.service}
                    onChange={handleChange}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("contactServicePlaceholder")}</option>
                    <option value="ai">{t("contactServiceAi")}</option>
                    <option value="managed">{t("contactServiceManaged")}</option>
                    <option value="cloud">{t("contactServiceCloud")}</option>
                    <option value="security">{t("contactServiceSecurity")}</option>
                    <option value="custom">{t("contactServiceCustom")}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t("contactMessage")} *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder={t("contactMessagePlaceholder")}
                  />
                </div>

                <Button type="submit" variant="electric" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("contactSending")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      {t("contactSubmit")}
                    </span>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  {t("contactPrivacyNote")}
                </p>
              </form>
            </Card>
          </div>
        </div>
      </section>
    </>
  )
}
