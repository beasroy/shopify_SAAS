import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowRight, BarChart3, LineChart, PieChart } from "lucide-react"


export default function DataBuilding() {
  const { brandId } = useParams<{ brandId: string }>()
  const [loadingText, setLoadingText] = useState("Fetching table data")
  const loadingMessages = [
    "Fetching table data",
    "Processing sales records",
    "Aggregating metrics",
    "Organizing table columns",
    "Calculating performance indicators",
    "Preparing data tables",
  ]

  // Cycle through loading messagesb
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingText((prev) => {
        const currentIndex = loadingMessages.indexOf(prev)
        const nextIndex = (currentIndex + 1) % loadingMessages.length
        return loadingMessages[nextIndex]
      })
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-slate-50 flex flex-col w-full min-h-screen">
      <main className="container max-w-6xl mx-auto px-4 py-8 flex flex-col h-screen justify-center">
        <div className="w-full text-center mb-12">
          <h1 className="text-xl md:text-4xl font-bold text-primary mb-3">Preparing your dashboard...</h1>

          {/* Animated loading text */}
          <div className="h-8 my-8">
            <p className="text-base md:text-lg text-violet-600 font-medium animate-pulse">{loadingText}...</p>
          </div>

          <p className="text-sm md:text-base text-gray-700 max-w-4xl mx-auto mb-2">
            We're loading data from the past two years up to yesterday. Going forward, new data will update daily.
          </p>

          <p className="text-sm md:text-base text-gray-500 max-w-4xl mx-auto mb-8">
            This process may take <span className="font-medium">1-2 hours</span> to complete.
          </p>

          <p className="text-sm md:text-base text-gray-700 max-w-4xl mx-auto mb-10">
            In the meantime, you can explore these dashboards:
          </p>

          {/* Dashboard Links - Horizontal Layout */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            {/* AdMetrics Hub Card */}
            <Link
              to={`/admetrics/${brandId}`}
              className="bg-white rounded-lg shadow-md border-2 overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px] group flex-1 max-w-xs mx-auto sm:mx-0"
            >
              <div className="p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mb-3">
                  <BarChart3 className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">AdMetrics Hub</h3>
                <div className="flex items-center text-violet-600 text-sm font-medium">
                  <span>View dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Ecommerce Insights Card */}
            <Link
              to={`/ecommerce-reports/${brandId}`}
              className="bg-white rounded-lg shadow-md border-2 overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px] group flex-1 max-w-xs mx-auto sm:mx-0"
            >
              <div className="p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-3">
                  <PieChart className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Ecommerce Insights</h3>
                <div className="flex items-center text-pink-600 text-sm font-medium">
                  <span>View dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Campaign Analysis Card */}
            <Link
              to={`/meta-campaigns/${brandId}`}
              className="bg-white rounded-lg shadow-md border-2 overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px] group flex-1 max-w-xs mx-auto sm:mx-0"
            >
              <div className="p-5 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <LineChart className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Campaign Analysis</h3>
                <div className="flex items-center text-blue-600 text-sm font-medium">
                  <span>View dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
