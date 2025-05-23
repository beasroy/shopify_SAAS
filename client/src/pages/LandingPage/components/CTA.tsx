import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

function CTA() {
  return (
    <section className="w-full pt-16 pb-8 md:pt-12 md:pb-6 lg:pt-24 lg:pb-12 gradient-bg text-white">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="space-y-5 pb-3 text-center">
            {/* <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
              You’ve made it this far—why stop now?
            </h2>
            <p className="max-w-[900px] md:text-xl">
              Let’s take your marketing to the next level. Start your 14-day
              free trial today.
            </p> */}

            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Want to take your marketing to the next level.
            </h2>
            <p className="max-w-[900px] sm:text-2xl">
              Start your{" "}
              <span className="font-bold text-[#0A0A1B]">14-day free</span>{" "}
              trial today.
            </p>
          </div>
          <div className="flex flex-col gap-2 min-[400px]:flex-row">
            {/* <Link to="/login">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-primary hover:bg-blue-50 w-72"
              >
                Start Free Trial
              </Button>
            </Link> */}

            <Link to={"/login"}>
              <Button
                size="lg"
                className="w-full bg-[#ececef] text-[#0A0A1B] hover:bg-[#0A0A1B] hover:text-[#ececef] sm:w-auto transition duration-200"
              >
                Start Free Trial
              </Button>
            </Link>
            {/* <Button
              size="lg"
              variant="outline"
              className="border-white text-black hover:bg-blue-50"
            >
              Schedule a Demo
            </Button> */}
          </div>
        </div>
        <p className="text-sm text-blue-100 text-center mt-12">
          Got questions?{" "}
          <Link to="#" className="text-white underline underline-offset-2">
            {/* Chat with our sales team */}
            Email to our sales team
          </Link>
        </p>
      </div>
    </section>
  );
}

export default CTA;
