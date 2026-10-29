import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg p-10 text-center">
        <p className="font-heading text-5xl font-bold text-electric">404</p>
        <h1 className="mt-4 text-2xl font-heading font-bold">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          That page doesn&apos;t exist. It may have moved, or the link may be out of date.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/contact">Contact us</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
