import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { HomePage } from "@/pages/home"
import { ServicesPage } from "@/pages/services"
import { AboutPage } from "@/pages/about"
import { PricingPage } from "@/pages/pricing"
import { ContactPage } from "@/pages/contact"
import { QuizPage } from "@/pages/quiz"
import { DigitalAssessmentPage } from "@/pages/digital-assessment"
import { WorkspacePage } from "@/pages/workspace"
import { OperationsPage } from "@/pages/operations"

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/digital-assessment" element={<DigitalAssessmentPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/operations" element={<OperationsPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
