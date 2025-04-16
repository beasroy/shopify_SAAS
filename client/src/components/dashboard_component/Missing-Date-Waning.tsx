import { CalendarIcon, AlertTriangle, Clock } from "lucide-react"
import { DatePickerWithRange } from "./DatePickerWithRange"

export default function MissingDateWarning() {

    return (
        <div className="min-h-screen bg-slate-50 p-6 overflow-hidden relative  flex justify-center items-center">

            <div className="max-w-3xl mx-auto relative">
                {/* Warning header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center gap-2 mb-4 bg-amber-100 px-4 py-2 rounded-full">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <span className="text-amber-700 font-semibold text-sm">Action Required</span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
                        Date Range <span className="text-amber-500">Missing</span>
                    </h1>

                    <p className="text-slate-600 max-w-xl mx-auto">
                        Please select a date range to continue. We need this information to display your data correctly.
                    </p>
                </div>

                {/* Main warning card */}
                <div className="bg-white rounded-xl shadow-md border-l-4 border-amber-400 overflow-hidden">
                    <div className="p-6">
                        <div className="space-y-6">
                            {/* Date picker */}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-5 w-5 text-slate-500" />
                                        <h3 className="font-medium text-slate-700">Select Dates</h3>
                                    </div>

                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>Last 24 months available</span>
                                    </div>
                                </div>

                                <DatePickerWithRange />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
