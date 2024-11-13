import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
export const TableSkeleton = () => (
    <Table className="text-center min-w-full">
      <TableHeader className="bg-gray-200 sticky top-0 z-10">
        <TableRow>
          {Array(8).fill(0).map((_, index) => (
            <TableCell key={index} className="font-bold px-4 text-black min-w-[150px]">
              <Skeleton className="h-6 w-full" />
            </TableCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array(10).fill(0).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array(8).fill(0).map((_, cellIndex) => (
              <TableCell key={cellIndex} className="px-4 py-2 max-w-[200px]">
                <Skeleton className="h-6 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )