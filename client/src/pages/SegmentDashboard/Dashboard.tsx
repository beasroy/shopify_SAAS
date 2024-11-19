import { useEffect, useState, useRef } from 'react'
import { ChevronDown, LayoutGrid, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useParams } from 'react-router-dom'
import axios from 'axios'

type TableData = {
  [key: string]: any
}

type ColumnDef = {
  id: string
  header: string
  accessorKey: string
  cell: (value: any) => React.ReactNode
}

interface TabConfig {
  id: string
  label: string
  apiEndpoint: string
  columns: ColumnDef[]
  data: TableData[]
}

export default function Dashboard() {
  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL
  const { brandId } = useParams()

  const [tabs, setTabs] = useState<TabConfig[]>([
    { id: 'products', label: 'Products', apiEndpoint: `${baseURL}/api/segment/productMetrics/${brandId}`, columns: [], data: [] },
    { id: 'categories', label: 'Categories', apiEndpoint: `${baseURL}/api/segment/categoryMetrics/${brandId}`, columns: [], data: [] },
    { id: 'brands', label: 'Brands', apiEndpoint: `${baseURL}/api/segment/brandMetrics/${brandId}`, columns: [], data: [] },
    { id: 'productTypes', label: 'Product types', apiEndpoint: `${baseURL}/api/segment/typeMetrics/${brandId}`, columns: [], data: [] },
  ])
  const [activeTab, setActiveTab] = useState(tabs[0].id)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 100

  const fetchTabData = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return

    try {
      const response = await axios.post(
        tab.apiEndpoint,
        {},
        { withCredentials: true }
      )

      if (response.data.success) {
        const result = response.data
        const sampleData = result[`${tabId}Data`][0] || {}
        const columns: ColumnDef[] = Object.keys(sampleData).map(key => ({
          id: key,
          header: key.charAt(0).toUpperCase() + key.slice(1),
          accessorKey: key,
          cell: (value: any) => {
            if (key === 'issues' && Array.isArray(value)) {
              return value.length > 0 ? value[0].description : 'No issues'
            }
            if (typeof value === 'object') {
              return JSON.stringify(value)
            }
            return String(value)
          },
        }))

        setTabs(prevTabs =>
          prevTabs.map(t =>
            t.id === tabId ? { ...t, columns, data: result[`${tabId}Data`] } : t
          )
        )
      } else {
        console.error(`Failed to fetch data for ${tabId}`)
      }
    } catch (error) {
      console.error(`Error fetching data for ${tabId}:`, error)
    }
  }

  useEffect(() => {
    fetchTabData(activeTab)
  }, [activeTab])

  const getCurrentTabData = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab)
    if (!currentTab) return { columns: [], data: [] }
    
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return {
      columns: currentTab.columns,
      data: currentTab.data.slice(startIndex, endIndex)
    }
  }

  const { columns, data } = getCurrentTabData()
  const totalPages = Math.ceil((tabs.find(tab => tab.id === activeTab)?.data.length || 0) / rowsPerPage)

  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const table = tableRef.current
      if (table) {
        const header = table.querySelector('thead')
        if (header) {
          header.style.transform = `translateY(${table.scrollTop}px)`
        }
      }
    }

    const table = tableRef.current
    if (table) {
      table.addEventListener('scroll', handleScroll)
    }

    return () => {
      if (table) {
        table.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  return (
    <div className="bg-gray-100 min-h-screen">
      <nav className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-2xl font-bold">Segment Dashboard</h1>
        </div>
      </nav>
      <div className='container mx-auto p-4'>
        <Tabs defaultValue={tabs[0].id} onValueChange={(value) => { setActiveTab(value); setCurrentPage(1); }} className='bg-white p-3 rounded-xl shadow-md'>
          <div className="flex items-center justify-between border-b">
            <TabsList>
              {tabs.map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="relative px-4 py-2 bg-white shadow-none hover:bg-muted"
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex items-center gap-2 p-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Add filter
              </Button>
              <Button variant="outline" size="sm">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </div>
          </div>

          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="p-4">
              <div className="rounded-md border">
                <div ref={tableRef} className="max-h-[350px] overflow-auto whitespace-nowrap">
                  <Table className="relative w-full">
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        {columns.map(column => (
                          <TableHead key={column.id} className="max-w-[150px]">
                            <div className="flex items-center gap-1">
                              {column.header}
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map(column => (
                            <TableCell key={column.id} className="w-[200px]">
                              {column.cell 
                                ? column.cell(row[column.accessorKey])
                                : row[column.accessorKey]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {data.length === 0 && (
                        <TableRow>
                          <TableCell 
                            colSpan={columns.length}
                            className="text-center h-24 text-muted-foreground"
                          >
                            No data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, tabs.find(t => t.id === activeTab)?.data.length || 0)} of {tabs.find(t => t.id === activeTab)?.data.length || 0} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}