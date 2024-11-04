"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchX } from 'lucide-react';

interface MetricsData {
  date: string
  metaSpend: number
  metaROAS: number
  googleSpend: number
  googleROAS: number
  totalSpend: number
  grossROI: number
  shopifySales: number
  netROI: number
}

interface SheetModalProps {
  isOpen: boolean
  onClose: () => void
  brandId: string
}

export const SheetModal: React.FC<SheetModalProps> = ({ isOpen, onClose, brandId }) => {
  const [metricsData, setMetricsData] = useState<MetricsData[]>([])
  const [brandName, setBrandName] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<Date>()

  const baseURL = import.meta.env.PROD
    ? import.meta.env.VITE_API_URL
    : import.meta.env.VITE_LOCAL_API_URL

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
          const queryParams: any = {};
          if (date) {
            queryParams.date = date.toISOString(); // Format date as 'YYYY-MM-DD'
          }
  
          // Fetch the metrics data
          const reportResponse = await axios.get(`${baseURL}/api/report/${brandId}`, {
            params: queryParams, // Pass query parameters here
            withCredentials: true,
          });
          const metricsData: MetricsData[] = reportResponse.data.data

          const brandResponse = await axios.get(`${baseURL}/api/brands/${brandId}`, { withCredentials: true })
          const brandName = brandResponse.data.name

          setMetricsData(metricsData)
          setBrandName(brandName)
        } catch (err) {
          console.error(err)
          setError("Failed to fetch data. Please try again later.")
        } finally {
          setLoading(false)
        }
      }
      fetchData()
    }
  }, [isOpen, brandId,date, baseURL])

  const tableHeaders = ["Date", "Meta Spend", "Meta Sales", "Meta ROAS", "Google Spend", "Google Sales", "Google ROAS", "Total Spend", "Gross ROI", "Shopify Sales", "Net ROI"]
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDate(new Date(event.target.value))
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] ">
        <DialogHeader className="flex flex-col md:flex-row items-center justify-between md:gap-10 mt-2 ">
          <DialogTitle className="text-xl font-bold">
            Daily Report - {brandName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                type="date"
                value={date ? date.toISOString().slice(0, 10) : ""}
                onChange={handleDateChange}
                className="w-[200px] pr-8" // Add padding to prevent text overlap with the icon
                title="Select a date"
              />
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            </div>
            {date&&
              <Button onClick={()=>setDate(undefined)} className="px-4 py-2 text-white bg-red-500 hover:bg-red-600">
                <SearchX className="w-6 h-6" />
              </Button>
            }
          </div>
        </DialogHeader>

        {loading ? (
          <p>Loading data...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="border rounded-md overflow-auto">
            <div className="max-h-[70vh] overflow-hidden">
              <Table>
                <TableHeader className="bg-blue-900 sticky top-0 z-10">
                  <TableRow>
                    {tableHeaders.map((header) => (
                      <TableHead key={header} className="font-bold text-white border px-2 py-2 text-center w-[120px]">
                        {header}
                      </TableHead>
                    ))}
                    <TableHead className="border px-2 py-2 text-center w-[15px]"></TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              <div className="max-h-[60vh] md:max-h-[calc(70vh-2.5rem)]  overflow-y-auto ">
                <Table>
                  <TableBody>
                    {metricsData.map((entry, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{entry.metaSpend.toFixed(2)}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{(entry.metaSpend * entry.metaROAS).toFixed(2)}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{entry.metaROAS.toFixed(2)}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{entry.googleSpend.toFixed(2)}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{(entry.googleSpend * entry.googleROAS).toFixed(2)}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{entry.googleROAS.toFixed(2)}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{entry.totalSpend.toFixed(2)}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{entry.grossROI.toFixed(2)}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{entry.shopifySales.toFixed(2)}</TableCell>
                        <TableCell className="border px-2 py-1 text-center  w-[120px]">{entry.netROI.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}