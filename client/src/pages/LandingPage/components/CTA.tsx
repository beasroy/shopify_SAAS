import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

function CTA() {
  return (
    <section className="w-full py-12 md:py-8 lg:py-16 gradient-bg text-white">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
              You’ve made it this far—why stop now?
            </h2>
            <p className="max-w-[900px] md:text-xl">
              Let’s take your marketing to the next level. Start your 14-day free trial today.
            </p>
          </div>
          <div className="flex flex-col gap-2 min-[400px]:flex-row">
            <Link to="/login">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-blue-50">
              Start Free Trial
            </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-black hover:bg-blue-50">
              Schedule a Demo
            </Button>
          </div>
          <p className="text-sm text-blue-100">
            Got questions?{" "}
            <Link to="#" className="text-white underline underline-offset-2">
              Chat with our sales team
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export default CTA
