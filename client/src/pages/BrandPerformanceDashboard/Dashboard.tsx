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
    brandId: string,
    name: string,
    source: string,
    targetAmount: number,
    targetDate: Date
  }>>([])
  const [newBrand, setNewBrand] = useState({
    brandId: '',
    source: '',
    targetAmount: 0,
    targetDate: endOfMonth(new Date())
  })
  const [editingBrand, setEditingBrand] = useState<string | null>(null)
  const [editData, setEditData] = useState<typeof newBrand | null>(null)
  const [achievedSales, setAchievedSales] = useState<{ [key: string]: number }>({})
  const [isLoading, setIsLoading] = useState(false);
  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL;

  const navigate = useNavigate()

  const getAchievedSales = useCallback(async (brandId: string) => {
    try {
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
  }, [navigate]);
  
  const fetchSalesData = useCallback(async () => {
    setIsLoading(true); // Start the loader
    try {
      const salesData: { [key: string]: number } = {};
      await Promise.all(
        selectedBrands.map(async (brand) => {
          salesData[brand.brandId] = await getAchievedSales(brand.brandId);
        })
      );
      setAchievedSales(salesData); // Update state only after all API calls finish
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setIsLoading(false); // Stop the loader
    }
  }, [selectedBrands, getAchievedSales]);
  
  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewBrand(prev => ({ ...prev, [name]: name === 'brandId' ? value : Number(value) }))
  }

  const handleSourceChange = (value: string) => {
    setNewBrand(prev => ({ ...prev, source: value }))
  }

  const handleAddBrand = async () => {

    const brandToAdd = brands.find(b => String(b._id) === String(newBrand.brandId));

    if (brandToAdd) {
      try {
        const newBrandTarget = {
          brandId: brandToAdd._id,
          name: brandToAdd.name,
          source: newBrand.source,
          targetAmount: newBrand.targetAmount,
          targetDate: newBrand.targetDate,
        };

        const response = await axios.post(`${baseURL}/api/performance/addTarget`, newBrandTarget, { withCredentials: true });

        setSelectedBrands(prev => [...prev, response.data]);
        setNewBrand({ brandId: '', source: '', targetAmount: 0, targetDate: endOfMonth(new Date()) });

      } catch (error) {
        console.error('Error adding brand:', error);
      }
    } else {
      console.log("Brand not found");
    }
  };



  const handleEdit = (brandId: string) => {
    const brandToEdit = selectedBrands.find(b => b.brandId === brandId)
    if (brandToEdit) {
      setEditingBrand(brandId)
      setEditData({ ...brandToEdit })
    }
  }

  const handleSaveEdit = async (brandId: string) => {
    if (editData) {
      try {
        const response = await axios.patch(`${baseURL}/api/performance/updateTarget/${brandId}`, editData, { withCredentials: true });
        setSelectedBrands(prev => prev.map(brand =>
          brand.brandId === brandId ? { ...brand, ...response.data } : brand
        ));

        setEditingBrand(null);
        setEditData(null);

        alert('Brand updated successfully!');
      } catch (error) {
        console.error('Error saving brand edit:', error);
        alert('Failed to update brand');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingBrand(null)
    setEditData(null)
  }

  const handleDelete = async (brandId: string) => {
    try {
      // Make the API call to delete the brand from the database
      await axios.delete(`${baseURL}/api/performance/deleteTarget/${brandId}`, { withCredentials: true });

      // Remove the brand from the selected brands in state
      setSelectedBrands(prev => prev.filter(brand => brand.brandId !== brandId));

      console.log('Brand deleted successfully');
    } catch (error) {
      console.error('Error deleting brand:', error);
    }
  };
  const Loader = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-blue-500"></div>
  )

  const calculateMetrics = (brand: typeof selectedBrands[0]) => {
    const achieved = achievedSales[brand.brandId] || 0
    const remainingTarget = Math.max(brand.targetAmount - achieved, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to start of day
    const targetDate = new Date(brand.targetDate)
    targetDate.setHours(0, 0, 0, 0) // Set to end of day
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

  useEffect(() => {
    const fetchBranTargets = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/performance/brandTarget`, { withCredentials: true });
        setSelectedBrands(response.data);
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };

    fetchBranTargets();
  }, []);

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
                <Select onValueChange={(value) => setNewBrand(prev => ({ ...prev, brandId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand._id} value={brand._id}>
                        {brand.name}
                      </SelectItem>
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
                  const isEditing = editingBrand === brand.brandId
                  return (
                    <TableRow key={brand.brandId}>
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
                      <TableCell>{isLoading?<Loader />:`₹${achieved.toLocaleString()}`}</TableCell>
                      <TableCell>{isLoading?<Loader />:`₹${remainingTarget.toLocaleString()}`}</TableCell>
                      <TableCell>{remainingDays}</TableCell>
                      <TableCell>₹{requiredSalesPerDay.toLocaleString()}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <>
                            <Button onClick={() => handleSaveEdit(brand.brandId)} className="mr-2">Save</Button>
                            <Button onClick={handleCancelEdit} variant="outline"><X className="h-4 w-4" /></Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => handleEdit(brand.brandId)} className="mr-2"><Edit2 className="h-4 w-4" /></Button>
                            <Button onClick={() => handleDelete(brand.brandId)} variant="destructive"><Trash2 className="h-4 w-4" /></Button>
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