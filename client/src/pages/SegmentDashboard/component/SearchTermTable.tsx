import { GoogleLogo } from "@/pages/CampaignMetricsPage";
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { TableSkeleton } from "@/components/dashboard_component/TableSkeleton";


interface SearchTerm {
  searchTerm: string
  matchType: string
  status: string
  campaignName: string
  adGroup: string
  impressions: number
  clicks: number
  ctr: string
  cost: string
}

export default function SearchTermTable() {
  const baseURL = import.meta.env.PROD ? import.meta.env.VITE_API_URL : import.meta.env.VITE_LOCAL_API_URL
  const { brandId } = useParams()
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [nextPageToken, setNextPageToken] = useState(null);
  const rowsPerPage = 100

  const columns = [
    { id: 'searchTerm', header: 'Search Term' },
    { id: 'matchType', header: 'Match Type' },
    { id: 'status', header: 'Status' },
    { id: 'campaignName', header: 'Campaign Name' },
    { id: 'adGroup', header: 'Ad Group' },
    { id: 'impressions', header: 'Impressions' },
    { id: 'clicks', header: 'Clicks' },
    { id: 'ctr', header: 'CTR' },
    { id: 'cost', header: 'Cost' },
  ]

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);  // Set loading to true when starting the request

      try {
        const response = await axios.post(
          `${baseURL}/api/segment/searchTermMetrics/${brandId}`,
          {
            // Send other necessary body parameters here, but no 'pageToken' in body
            limit: rowsPerPage,  // Define how many items per page
          },
          {
            params: {
              pageToken: nextPageToken,  // Use query parameter for pageToken
            },
            withCredentials: true
          }
        );

        if (response.data.success) {
          setSearchTerms((prevData) => [
            ...prevData,
            ...response.data.searchTermData
          ]);

          setNextPageToken(response.data.nextPageToken || null);  // Update the nextPageToken
        } else {
          console.log('Failed to fetch data');
        }
      } catch (err) {
        console.log('An error occurred while fetching data');
      } finally {
        setLoading(false);  // Set loading to false when done
      }
    };


    fetchData();
  }, [currentPage, nextPageToken]);  // Trigger refetch when currentPage or nextPageToken changes

  const totalPages = Math.ceil((searchTerms.length || 0) / rowsPerPage)

  return (
    <div className='w-full'>
      <div className='flex flex-row gap-2 items-center mb-3'>
        <GoogleLogo />
        <h1 className='text-lg font-semibold'>Google Ads Search Term Insights</h1>
      </div>
      <div className='bg-white rounded-xl shadow-md overflow-x-auto'>
        <div className="max-h-[380px] overflow-auto">
          {loading ? (
            <TableSkeleton />
          ) : (
            <table className="w-full rounded-xl">
              <thead className="sticky top-0 z-10 bg-[#134B70] rounded-xl">
                <tr>
                  {columns.map(column => (
                    <th key={column.id} className="px-4 py-3 text-left text-xs font-medium min-w-[150px] uppercase tracking-wider">
                      <div className="flex items-center gap-1 text-white">
                        {column.header}
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchTerms.map((row, i) => (
                  <tr key={i} className="max-w-[200px]">
                    {columns.map((column) => {
                      const value = row[column.id as keyof SearchTerm]
                      const isStatusColumn = column.id === 'status'

                      const renderCell = () => {
                        if (isStatusColumn) {
                          const statusValue = value ? String(value) : ''
                          const getStatusColor = (status: string) => {
                            switch (status.trim().toUpperCase()) {
                              case "ADDED": return 'text-green-800'
                              case "NONE": return 'text-yellow-800'
                              default: return 'text-gray-700'
                            }
                          }
                          const colorClass = getStatusColor(statusValue)

                          return (
                            <div className={`px-2 py-1 rounded ${colorClass}`}>
                              {statusValue}
                            </div>
                          )
                        }

                        return value
                      }

                      return (
                        <td
                          key={column.id}
                          className={`px-4 py-2.5 whitespace-nowrap text-sm`}
                        >
                          {renderCell()}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {searchTerms.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-center"
                    >
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, searchTerms.length || 0)} of {searchTerms.length || 0} entries
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 inline-block mr-1" />
              Previous
            </button>
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 inline-block ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
