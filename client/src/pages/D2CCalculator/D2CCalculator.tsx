
import type React from "react"
import { useMemo } from "react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Calculator } from "lucide-react"
import EbidtaCalculator from "./components/EbidtaCalculator"
import CollapsibleSidebar from "@/components/dashboard_component/CollapsibleSidebar"
import { DatePickerWithRange } from "@/components/dashboard_component/DatePickerWithRange"
import { useSelector } from "react-redux"
import { RootState } from "@/store"
import NewCalculator from "./components/NewCalculator"

const CalculatorsPage: React.FC = () => {
  const dateFrom = useSelector((state: RootState) => state.date.from);
  const dateTo = useSelector((state: RootState) => state.date.to);
  
  const date = useMemo(() => ({
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined
  }), [dateFrom, dateTo]);

  const calculators = [
    {
      id: "ebidtaNew",
      title: "Monthly Business Calculator",
      description: "Calculate your EBIDTA for your business",
      icon: Calculator,
    },
    {
      id: "ebidta",
      title: "EBIDTA Calculator",
      description: "Calculate your EBIDTA for your business",
      icon: Calculator,
    },
    {
      id: "cpa",
      title: "Breakeven CPA Calculator",
      description: "Calculate the breakeven CPA for your business",
      icon: Calculator,
    },
    {
      id: "selling-price",
      title: "Selling Price Calculator",
      description: "Calculate the selling price for your business",
      icon: Calculator,
    },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      <CollapsibleSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex justify-between items-start">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Calculators</h1>
            <p className="text-gray-600">Manage all your financial calculations in one place</p>
          </div>
          <DatePickerWithRange />   
          </div>
        

          {/* Accordion with Calculators */}
          <Accordion type="single" collapsible defaultValue="ebidtaNew" className="w-full space-y-4">
            {calculators.map((calc) => (
              <AccordionItem key={calc.id} value={calc.id} className="border border-gray-200 rounded-lg overflow-hidden w-full">
                <AccordionTrigger className="px-6 hover:bg-gray-50">
                  <div className="flex items-center gap-3 text-left">
                    <calc.icon className="h-5 w-5 text-gray-700" />
                    <div>
                      <h2 className="font-semibold text-gray-900">{calc.title}</h2>
                      <p className="text-sm text-gray-500">{calc.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-0 py-0 border-t border-gray-200 w-full">
                  <div className="w-full">
                    {calc.id === "ebidtaNew" && <NewCalculator date={date} />}
                    {calc.id === "ebidta" && <EbidtaCalculator date={date} />}
                    {calc.id === "cpa" && (
                      <div className="text-center py-12">
                        <p className="text-gray-500">Breakeven CPA Calculator coming soon</p>
                      </div>
                    )}
                    {calc.id === "selling-price" && (
                      <div className="text-center py-12">
                        <p className="text-gray-500">Selling Price Calculator coming soon</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  )
}

export default CalculatorsPage
