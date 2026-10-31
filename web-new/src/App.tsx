import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { HomePage } from "@/pages/home"
import { ServicesPage } from "@/pages/services"
import { AboutPage } from "@/pages/about"
import { PricingPage } from "@/pages/pricing"
import { ContactPage } from "@/pages/contact"
import { ProposalPage } from "@/pages/proposal"
import { QuizPage } from "@/pages/quiz"
import { DigitalAssessmentPage } from "@/pages/digital-assessment"
import { PortalProposalsPage } from "@/pages/portal-proposals"
import { PortalProposalDetailPage } from "@/pages/portal-proposal-detail"
import { PortalDigestsPage } from "@/pages/portal-digests"
import { PortalCompliancePage } from "@/pages/portal-compliance"
import { PortalLoginPage } from "@/pages/portal-login"
import { NotFoundPage } from "@/pages/not-found"
import { CaseStudiesPage } from "@/pages/case-studies"
import { ProductsPage } from "@/pages/products"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { WebVitals } from "@/components/WebVitals"

const routes = [
  { path: "/", element: <HomePage /> },
  { path: "/services", element: <ServicesPage /> },
  { path: "/about", element: <AboutPage /> },
  { path: "/pricing", element: <PricingPage /> },
  { path: "/contact", element: <ContactPage /> },
  { path: "/quiz", element: <QuizPage /> },
  { path: "/digital-assessment", element: <DigitalAssessmentPage /> },
  { path: "/proposal/:id", element: <ProposalPage /> },
  { path: "/case-studies", element: <CaseStudiesPage /> },
  { path: "/products", element: <ProductsPage /> },
  { path: "/login", element: <PortalLoginPage /> },
  { path: "/portal/proposals", element: <PortalProposalsPage /> },
  { path: "/portal/proposals/:id", element: <PortalProposalDetailPage /> },
  { path: "/portal/digests", element: <PortalDigestsPage /> },
  { path: "/portal/compliance", element: <PortalCompliancePage /> },
]

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="min-h-screen bg-background text-foreground font-sans">
          <Navbar />
          <main>
            <Routes>
              {routes.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
              {routes.map((r) => (
                <Route key={`ms-${r.path}`} path={`/ms${r.path === "/" ? "" : r.path}`} element={r.element} />
              ))}
              <Route path="/ms" element={<Navigate to="/ms/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
          <WebVitals />
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  )
}