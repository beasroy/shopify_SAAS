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
import { cn } from "@/lib/utils"
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { baseURL } from '@/data/constant'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'



// Define types for better type safety
interface MetricsData {
  spend: number;
  Revenue: number;
  purchase_roas: string;
  individualAccounts?: Array<{
    accountId: string;
    spend: number;
    purchase_roas: string;
    Revenue: string | number;
  }>;
}

interface BrandTarget {
  brandId: string;
  name: string;
  source: string;
  targetSales: number;
  targetSpend: number;
  targetROAS: number;
  targetDate: Date;
}

export default function BrandPerformanceDashboard() {
  const brands = useSelector((state: RootState) => state.brand.brands)
  const [selectedBrands, setSelectedBrands] = useState<Array<BrandTarget>>([])
  const [newBrand, setNewBrand] = useState<BrandTarget>({
    brandId: '',
    name: '',
    source: '',
    targetSales: 0,
    targetSpend: 0,
    targetROAS: 0,
    targetDate: endOfMonth(new Date())
  })
  const [editingBrand, setEditingBrand] = useState<string | null>(null)
  const [editData, setEditData] = useState<BrandTarget | null>(null)
  const [achievedMetrics, setAchievedMetrics] = useState<{ [key: string]: { meta: MetricsData, google: MetricsData } }>({})
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate()

  const getMetaMetrics = useCallback(async (brandId: string) => {
    try {
      const response = await axios.get(
        `${baseURL}/api/performance/metaMetrics/${brandId}`,
        { withCredentials: true }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching Meta metrics data:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        navigate('/');
      }
      return { success: false, data: { spend: 0, Revenue: 0, purchase_roas: "0.00" } };
    }
  }, [baseURL, navigate]);

  const getGoogleAdMetrics = useCallback(async (brandId: string) => {
    try {
      const response = await axios.get(
        `${baseURL}/api/performance/googleAdMetrics/${brandId}`,
        { withCredentials: true }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching Google metrics data:', error);
      return { success: false, data: { spend: 0, Revenue: 0, purchase_roas: "0.00" } };
    }
  }, [baseURL]);
  
  
  const fetchMetricsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const metricsData: { [key: string]: { meta: MetricsData, google: MetricsData } } = {};
      await Promise.all(
        selectedBrands.map(async (brand) => {
          const [metaResponse, googleResponse] = await Promise.all([
            getMetaMetrics(brand.brandId),
            getGoogleAdMetrics(brand.brandId)
          ]);
          
          metricsData[brand.brandId] = {
            meta: metaResponse.success ? metaResponse.data : { spend: 0, Revenue: 0, purchase_roas: "0.00" },
            google: googleResponse.success ? googleResponse.data : { spend: 0, Revenue: 0, purchase_roas: "0.00" }
          };
        })
      );
      setAchievedMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching metrics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBrands, getMetaMetrics, getGoogleAdMetrics]);
  
  useEffect(() => {
    if (selectedBrands.length > 0) {
      fetchMetricsData();
    }
  }, [fetchMetricsData, selectedBrands]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewBrand(prev => ({ ...prev, [name]: ['brandId', 'name'].includes(name) ? value : Number(value) }))
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
          targetSales: newBrand.targetSales,
          targetSpend: newBrand.targetSpend,
          targetROAS: newBrand.targetROAS,
          targetDate: newBrand.targetDate,
        };

        const response = await axios.post(`${baseURL}/api/performance/addTarget`, newBrandTarget, { withCredentials: true });

        setSelectedBrands(prev => [...prev, response.data]);
        setNewBrand({
          brandId: '',
          name: '',
          source: '',
          targetSales: 0,
          targetSpend: 0,
          targetROAS: 0,
          targetDate: endOfMonth(new Date())
        });

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
      setEditData({ ...brandToEdit, targetDate: new Date(brandToEdit.targetDate) })
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
      await axios.delete(`${baseURL}/api/performance/deleteTarget/${brandId}`, { withCredentials: true });
      setSelectedBrands(prev => prev.filter(brand => brand.brandId !== brandId));
      console.log('Brand deleted successfully');
    } catch (error) {
      console.error('Error deleting brand:', error);
    }
  };

  const Loader = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-blue-500"></div>
  )

  const calculateMetrics = (brand: BrandTarget, source: 'meta' | 'google') => {
    const metrics = achievedMetrics[brand.brandId]?.[source] || { spend: 0, Revenue: 0, purchase_roas: "0.00" }; 
    // Calculate spent metrics
    const achievedSpend = metrics.spend || 0;
    // Calculate sales metrics
    const achievedSales = Number(metrics.Revenue) || 0;
    const remainingSales = Math.max(brand.targetSales - achievedSales, 0).toFixed(2);
    
    // Calculate ROAS
    const achievedROAS = parseFloat(metrics.purchase_roas) || 0;
    
    // Calculate days and per-day requirements
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(brand.targetDate);
    targetDate.setHours(0, 0, 0, 0);
    const remainingDays = Math.max(Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)), 0);
    
    const requiredSalesPerDay = remainingDays > 0 ? parseFloat(remainingSales) / remainingDays : 0;

    return {
      achievedSales,
      remainingSales,
      achievedSpend,
      achievedROAS,
      remainingDays,
      requiredSalesPerDay,
    }
  }

  const chartData = selectedBrands.map(brand => {
    const metaMetrics = calculateMetrics(brand, 'meta');
    const googleMetrics = calculateMetrics(brand, 'google');
    return {
      name: brand.name,
      'Meta Achieved': metaMetrics.achievedSales,
      'Meta Remaining': metaMetrics.remainingSales,
      'Google Achieved': googleMetrics.achievedSales,
      'Google Remaining': googleMetrics.remainingSales
    }
  });

  // Filter brands by source
  const metaBrands = selectedBrands.filter(brand => brand.source === 'Meta');
  const googleBrands = selectedBrands.filter(brand => brand.source === 'Google');

  useEffect(() => {
    const fetchBrandTargets = async () => {
      try {
        const response = await axios.get(`${baseURL}/api/performance/brandTarget`, { withCredentials: true });
        // Ensure targetDate is a Date object
        const brands = response.data.map((brand: any) => ({
          ...brand,
          targetDate: new Date(brand.targetDate)
        }));
        setSelectedBrands(brands);
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };

    fetchBrandTargets();
  }, [baseURL]);

  const renderTable = (brands: BrandTarget[], source: 'meta' | 'google', title: string) => (
    <Card className='mb-4'>
      <CardHeader>
        <CardTitle>{title} Performance Table</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Target Spend</TableHead>
                <TableHead>Target Sales</TableHead>
                <TableHead>Target ROAS</TableHead>
                <TableHead>Achieved Spend</TableHead>
                <TableHead>Achieved Sales</TableHead>
                <TableHead>Achieved ROAS</TableHead>
                <TableHead>Remaining Sales</TableHead>
                <TableHead>Remaining Days</TableHead>
                <TableHead>Required Sales/Day</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map(brand => {
                const { 
                  achievedSales, 
                  remainingSales, 
                  achievedSpend, 
                  achievedROAS, 
                  remainingDays, 
                  requiredSalesPerDay 
                } = calculateMetrics(brand, source);
                
                const isEditing = editingBrand === brand.brandId;
                
                return (
                  <TableRow key={brand.brandId}>
                    <TableCell className="font-bold text-sm">{brand.name}</TableCell>
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
                        format(new Date(brand.targetDate), "MMM yyyy") 
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editData?.targetSpend}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, targetSpend: Number(e.target.value) } : null)}
                        />
                      ) : (
                        `₹${brand.targetSpend.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editData?.targetSales}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, targetSales: Number(e.target.value) } : null)}
                        />
                      ) : (
                        `₹${brand.targetSales.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editData?.targetROAS}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, targetROAS: Number(e.target.value) } : null)}
                        />
                      ) : (
                        brand.targetROAS.toFixed(2)
                      )}
                    </TableCell>
                   
                    <TableCell>{isLoading ? <Loader /> : `₹${achievedSpend.toLocaleString('en-IN')}`}</TableCell>
                    <TableCell>{isLoading ? <Loader /> : `₹${achievedSales.toLocaleString('en-IN')}`}</TableCell>
                    <TableCell>{isLoading ? <Loader /> : achievedROAS.toFixed(2)}</TableCell>
                    <TableCell>{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(remainingSales))}</TableCell>
                    <TableCell>{remainingDays}</TableCell>
                    <TableCell>₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(requiredSalesPerDay)}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <>
                          <Button onClick={() => handleSaveEdit(brand.brandId)} className="mr-2">Save</Button>
                          <Button onClick={handleCancelEdit} variant="outline"><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <div className='flex flex-row gap-1'>
                          <Button size={"sm"} onClick={() => handleEdit(brand.brandId)} ><Edit2 className="h-2 w-2" /></Button>
                          <Button size={"sm"} onClick={() => handleDelete(brand.brandId)} variant="destructive"><Trash2 className="h-2 w-2" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="brandName">Brand Name</Label>
                <Select onValueChange={(value) => {
                  const brand = brands.find(b => b._id === value);
                  setNewBrand(prev => ({ 
                    ...prev, 
                    brandId: value,
                    name: brand?.name || ''
                  }));
                }}>
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
                    <SelectItem value="Meta">Meta</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetSales">Target Sales</Label>
                <Input 
                  id="targetSales" 
                  name="targetSales" 
                  type="number"
                  value={newBrand.targetSales} 
                  onChange={handleInputChange} 
                  placeholder="Enter target sales" 
                />
              </div>
              <div>
                <Label htmlFor="targetSpend">Target Spend</Label>
                <Input 
                  id="targetSpend" 
                  name="targetSpend" 
                  type="number"
                  value={newBrand.targetSpend} 
                  onChange={handleInputChange} 
                  placeholder="Enter target spend" 
                />
              </div>
              <div>
                <Label htmlFor="targetROAS">Target ROAS</Label>
                <Input 
                  id="targetROAS" 
                  name="targetROAS" 
                  type="number"
                  value={newBrand.targetROAS} 
                  onChange={handleInputChange} 
                  placeholder="Enter target ROAS" 
                  step="0.01"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddBrand} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Brand Target
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Label>Target Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
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
          </CardContent>
        </Card>

        {renderTable(metaBrands, 'meta', 'Meta')}
        {renderTable(googleBrands, 'google', 'Google')}

        <Card>
          <CardHeader>
            <CardTitle>Sales Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                <Bar dataKey="Meta Achieved" stackId="meta" fill="#4ade80" />
                <Bar dataKey="Meta Remaining" stackId="meta" fill="#f87171" />
                <Bar dataKey="Google Achieved" stackId="google" fill="#60a5fa" />
                <Bar dataKey="Google Remaining" stackId="google" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}