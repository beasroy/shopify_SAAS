import { useState, useEffect, useCallback } from 'react'
import { PlusCircle, Edit2, X, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, endOfMonth } from "date-fns"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { useBrand } from '@/context/BrandContext'
import { cn } from "@/lib/utils"
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function BrandPerformanceDashboard() {
  const { brands } = useBrand()
  const [selectedBrands, setSelectedBrands] = useState<Array<{
    id: string,
    name: string,
    source: string,
    targetAmount: number,
    targetDate: Date
  }>>([])
  const [newBrand, setNewBrand] = useState({ 
    id: '', 
    source: '', 
    targetAmount: 0, 
    targetDate: endOfMonth(new Date()) 
  })
  const [editingBrand, setEditingBrand] = useState<string | null>(null)
  const [editData, setEditData] = useState<typeof newBrand | null>(null)
  const [achievedSales, setAchievedSales] = useState<{ [key: string]: number }>({})

  const navigate = useNavigate()

  const getAchievedSales = useCallback(async (brandId: string) => {
    try {
      const baseURL = import.meta.env.PROD
        ? import.meta.env.VITE_API_URL
        : import.meta.env.VITE_LOCAL_API_URL;
      const response = await axios.get(`${baseURL}/api/shopify/dailysales/${brandId}`, { withCredentials: true });
      return response.data.totalSales;
    } catch (error) {
      console.error('Error fetching sales data:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/');
      }
      return 0;
    }
  }, [navigate])

  useEffect(() => {
    const fetchSalesData = async () => {
      const salesData: { [key: string]: number } = {};
      for (const brand of selectedBrands) {
        salesData[brand.id] = await getAchievedSales(brand.id);
      }
      setAchievedSales(salesData);
    };

    fetchSalesData();
  }, [selectedBrands, getAchievedSales]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewBrand(prev => ({ ...prev, [name]: name === 'id' ? value : Number(value) }))
  }

  const handleSourceChange = (value: string) => {
    setNewBrand(prev => ({ ...prev, source: value }))
  }

  const handleAddBrand = () => {
    const brandToAdd = brands.find(b => b._id === newBrand.id)
    if (brandToAdd) {
      setSelectedBrands(prev => [...prev, {
        id: brandToAdd._id,
        name: brandToAdd.name,
        source: newBrand.source,
        targetAmount: newBrand.targetAmount,
        targetDate: newBrand.targetDate
      }])
      setNewBrand({ id: '', source: '', targetAmount: 0, targetDate: endOfMonth(new Date()) })
    }
  }

  const handleEdit = (brandId: string) => {
    const brandToEdit = selectedBrands.find(b => b.id === brandId)
    if (brandToEdit) {
      setEditingBrand(brandId)
      setEditData({ ...brandToEdit })
    }
  }

  const handleSaveEdit = (brandId: string) => {
    if (editData) {
      setSelectedBrands(prev => prev.map(brand => 
        brand.id === brandId ? { ...brand, ...editData } : brand
      ))
    }
    setEditingBrand(null)
    setEditData(null)
  }

  const handleCancelEdit = () => {
    setEditingBrand(null)
    setEditData(null)
  }

  const handleDelete = (brandId: string) => {
    setSelectedBrands(prev => prev.filter(brand => brand.id !== brandId))
  }

  const calculateMetrics = (brand: typeof selectedBrands[0]) => {
    const achieved = achievedSales[brand.id] || 0
    const remainingTarget = Math.max(brand.targetAmount - achieved, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of day
    const targetDate = new Date(brand.targetDate)
    targetDate.setHours(23, 59, 59, 999) // Set to end of day
    const remainingDays = Math.max(Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0)
    const requiredSalesPerDay = remainingDays > 0 ? remainingTarget / remainingDays : 0

    return {
      achievedSales: achieved,
      remainingTarget: remainingTarget,
      remainingDays,
      requiredSalesPerDay: requiredSalesPerDay
    }
  }

  const chartData = selectedBrands.map(brand => {
    const { achievedSales: achieved, remainingTarget } = calculateMetrics(brand)
    return {
      name: brand.name,
      Achieved: achieved,
      Remaining: remainingTarget
    }
  })

  return (
    <div className="bg-gray-100 min-h-screen">
      <nav className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-2xl font-bold">Brands Performance Metrics</h1>
        </div>
      </nav>
      <div className='container mx-auto p-4'>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Add New Brand Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="brandName">Brand Name</Label>
                <Select onValueChange={(value) => setNewBrand(prev => ({ ...prev, id: value, source: '' }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand._id} value={brand._id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Select onValueChange={handleSourceChange} value={newBrand.source}>
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
              <div>
                <Label>Target Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newBrand.targetDate && "text-muted-foreground"
                      )}
                    >
                      {newBrand.targetDate ? format(newBrand.targetDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newBrand.targetDate}
                      onSelect={(date) => date && setNewBrand(prev => ({ ...prev, targetDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddBrand} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Brand Target
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='mb-4'>
          <CardHeader>
            <CardTitle>Brand Performance Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Target Amount</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead>Achieved Sales</TableHead>
                  <TableHead>Remaining Target</TableHead>
                  <TableHead>Remaining Days</TableHead>
                  <TableHead>Required Sales/Day</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedBrands.map(brand => {
                  const { achievedSales: achieved, remainingTarget, remainingDays, requiredSalesPerDay } = calculateMetrics(brand)
                  const isEditing = editingBrand === brand.id
                  return (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select 
                            onValueChange={(value) => setEditData(prev => prev ? { ...prev, source: value } : null)}
                            defaultValue={editData?.source}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={brand.source} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Meta & Google">Meta & Google</SelectItem>
                              <SelectItem value="Meta">Meta</SelectItem>
                              <SelectItem value="Google">Google</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          brand.source
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input 
                            type="number" 
                            value={editData?.targetAmount} 
                            onChange={(e) => setEditData(prev => prev ? { ...prev, targetAmount: Number(e.target.value) } : null)}
                          />
                        ) : (
                          `₹${brand.targetAmount.toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"}>
                                {editData?.targetDate ? format(editData.targetDate, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={editData?.targetDate}
                                onSelect={(date) => date && setEditData(prev => prev ? { ...prev, targetDate: date } : null)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          format(brand.targetDate, "PPP")
                        )}
                      </TableCell>
                      <TableCell>₹{achieved.toLocaleString()}</TableCell>
                      <TableCell>₹{remainingTarget.toLocaleString()}</TableCell>
                      <TableCell>{remainingDays}</TableCell>
                      <TableCell>₹{requiredSalesPerDay.toLocaleString()}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <>
                            <Button onClick={() => handleSaveEdit(brand.id)} className="mr-2">Save</Button>
                            <Button onClick={handleCancelEdit} variant="outline"><X className="h-4 w-4" /></Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => handleEdit(brand.id)} className="mr-2"><Edit2 className="h-4 w-4" /></Button>
                            <Button onClick={() => handleDelete(brand.id)} variant="destructive"><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales Progress</CardTitle>
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
      </div>
    </div>
  )
}