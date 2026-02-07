import  { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { LocationData } from '../interfaces';
import { formatCurrency } from '@/utils/currency';

interface LocationTableProps {
  data: LocationData[];
  dimensionValue: string;
  currencyCode?: string;
}

type SortField = 'location' | 'totalSales' | 'orderCount';
type SortDirection = 'asc' | 'desc' | null;

export default function LocationTable({
  data,
  dimensionValue,
  currencyCode = 'USD',
}: LocationTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortField, setSortField] = useState<SortField>('totalSales');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'location':
          aValue = `${a.city || ''}${a.state ? `, ${a.state}` : ''}`.toLowerCase();
          bValue = `${b.city || ''}${b.state ? `, ${b.state}` : ''}`.toLowerCase();
          break;
        case 'totalSales':
          aValue = a.totalSales;
          bValue = b.totalSales;
          break;
        case 'orderCount':
          aValue = a.orderCount;
          bValue = b.orderCount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortField, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: desc -> asc -> null (no sort)
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection(null);
        setSortField('totalSales'); // Reset to default
        setSortDirection('desc');
      }
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 ml-1" />;
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">{dimensionValue}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={rowsPerPage.toString()}
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-2"
                  onClick={() => handleSort('location')}
                >
                  Location
                  {getSortIcon('location')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-2"
                  onClick={() => handleSort('totalSales')}
                >
                  Total Sales
                  {getSortIcon('totalSales')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-2"
                  onClick={() => handleSort('orderCount')}
                >
                  Order Count
                  {getSortIcon('orderCount')}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No location data available
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((location, index) => (
                <TableRow key={`${location.city}-${location.state}-${index}`}>
                  <TableCell className="font-medium">
                    {location.city && location.state
                      ? `${location.city}, ${location.state}`
                      : location.city || location.state || 'Unknown'}
                    {!location.isClassified && (
                      <span className="ml-2 text-xs text-muted-foreground">(Unclassified)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(location.totalSales, currencyCode)}
                  </TableCell>
                  <TableCell className="text-right">
                    {location.orderCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
            {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length}{' '}
            locations
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

