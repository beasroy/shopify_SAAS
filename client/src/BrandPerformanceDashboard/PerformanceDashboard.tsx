import { useState, useEffect } from 'react'
import { CalendarIcon, PlusCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

// Simulated API hook
const useAchievedSales = (brandIds: number[], month: Date) => {
  const [achievedSales, setAchievedSales] = useState<{[key: number]: number}>({})

  useEffect(() => {
    const fetchAchievedSales = async () => {
      // Simulate API call
      const response = await new Promise(resolve => 
        setTimeout(() => resolve(
          brandIds.reduce((acc, id) => ({ ...acc, [id]: Math.floor(Math.random() * 10000) }), {})
        ), 1000)
      )
      setAchievedSales(response as {[key: number]: number})
    }

    fetchAchievedSales()
  }, [brandIds, month])

  return achievedSales
}

// Mock data for initial state
const initialBrands = [
  { id: 1, name: 'Brand A', source: 'Meta & Google', targetAmount: 10000, targetDays: 30, month: new Date() },
  { id: 2, name: 'Brand B', source: 'Meta', targetAmount: 5000, targetDays: 30, month: new Date() },
  { id: 3, name: 'Brand C', source: 'Google', targetAmount: 8000, targetDays: 30, month: new Date() },
]

export default function BrandPerformanceDashboard() {
  const [brands, setBrands] = useState(initialBrands)
  const [newBrand, setNewBrand] = useState({ name: '', source: '', targetAmount: 0, targetDays: 30, month: new Date() })
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  const achievedSales = useAchievedSales(brands.map(brand => brand.id), selectedMonth)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewBrand(prev => ({ ...prev, [name]: name === 'name' ? value : Number(value) }))
  }

  const handleSourceChange = (value: string) => {
    setNewBrand(prev => ({ ...prev, source: value }))
  }

  const handleAddBrand = () => {
    setBrands(prev => [...prev, { ...newBrand, id: Date.now(), month: selectedMonth }])
    setNewBrand({ name: '', source: '', targetAmount: 0, targetDays: 30, month: selectedMonth })
  }

  const calculateMetrics = (brand: typeof initialBrands[0]) => {
    const achieved = achievedSales[brand.id] || 0
    const remainingTarget = Math.max(brand.targetAmount - achieved, 0)
    const remainingDays = Math.max(endOfMonth(brand.month).getDate() - new Date().getDate(), 0)
    const requiredSalesPerDay = remainingDays > 0 ? remainingTarget / remainingDays : 0

    return {
      achievedSales: achieved,
      remainingTarget: remainingTarget,
      remainingDays,
      requiredSalesPerDay: requiredSalesPerDay
    }
  }

  const chartData = brands
    .filter(brand => brand.month.getMonth() === selectedMonth.getMonth() && brand.month.getFullYear() === selectedMonth.getFullYear())
    .map(brand => {
      const { achievedSales: achieved, remainingTarget } = calculateMetrics(brand)
      return {
        name: brand.name,
        Achieved: achieved,
        Remaining: remainingTarget
      }
    })

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Brand Performance Metrics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brands.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${brands.reduce((sum, brand) => sum + brand.targetAmount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Achieved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Object.values(achievedSales).reduce((sum, sales) => sum + sales, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Month</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedMonth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedMonth ? format(selectedMonth, "MMMM yyyy") : <span>Select month</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => date && setSelectedMonth(startOfMonth(date))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Sales Progress for {format(selectedMonth, "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Achieved" stackId="a" fill="#4ade80" />
              <Bar dataKey="Remaining" stackId="a" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Brand for {format(selectedMonth, "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="brandName">Brand Name</Label>
              <Input id="brandName" name="name" value={newBrand.name} onChange={handleInputChange} placeholder="Enter brand name" />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Select onValueChange={handleSourceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meta & Google">Meta & Google</SelectItem>
                  <SelectItem value="Meta">Meta</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="targetAmount">Target Amount</Label>
              <Input id="targetAmount" name="targetAmount" type="number" value={newBrand.targetAmount} onChange={handleInputChange} placeholder="Enter target amount" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddBrand} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Brand
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Performance Table for {format(selectedMonth, "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Target Amount</TableHead>
                <TableHead>Achieved Sales</TableHead>
                <TableHead>Remaining Target</TableHead>
                <TableHead>Remaining Days</TableHead>
                <TableHead>Required Sales/Day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands
                .filter(brand => brand.month.getMonth() === selectedMonth.getMonth() && brand.month.getFullYear() === selectedMonth.getFullYear())
                .map(brand => {
                  const { achievedSales: achieved, remainingTarget, remainingDays, requiredSalesPerDay } = calculateMetrics(brand)
                  return (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell>{brand.source}</TableCell>
                      <TableCell>${brand.targetAmount.toLocaleString()}</TableCell>
                      <TableCell>${achieved.toLocaleString()}</TableCell>
                      <TableCell>${remainingTarget.toLocaleString()}</TableCell>
                      <TableCell>{remainingDays}</TableCell>
                      <TableCell>${requiredSalesPerDay.toLocaleString()}</TableCell>
                    </TableRow>
                  )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}