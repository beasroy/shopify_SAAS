import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: number;
  order_number: number;
  total_price: string;
  created_at: string;
  financial_status: string;
}

interface OrdersTableProps {
  orders: Order[];
  sortColumn: keyof Order;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: keyof Order) => void;
  getStatusColor: (status: string) => string;
  currentPage: number;
  ordersPerPage: number;
  paginate: (pageNumber: number) => void;
  totalOrders: number;
}

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  sortColumn,
  sortDirection,
  handleSort,
  getStatusColor,
  currentPage,
  ordersPerPage,
  paginate,
  totalOrders,
}) => {
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);

  console.log("Current Page:", currentPage);
console.log("Orders per Page:", ordersPerPage);
console.log("Index of First Order:", indexOfFirstOrder);
console.log("Index of Last Order:", indexOfLastOrder);
console.log("Current Orders Length:", currentOrders.length);
console.log("total Orders Length:", totalOrders)


  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              {['Order Number', 'Total Price', 'Date', 'Status'].map((header) => (
                <TableHead key={header} className="font-semibold text-gray-600">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(header.toLowerCase().replace(' ', '_') as keyof Order)}
                  >
                    {header}
                    {sortColumn === header.toLowerCase().replace(' ', '_') && (
                      sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentOrders.length > 0 ? currentOrders.map((order) => (
              <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-medium px-5">{order.order_number}</TableCell>
                <TableCell className="px-5">₹{parseFloat(order.total_price).toFixed(2)}</TableCell>
                <TableCell className="px-5">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(order.financial_status)} font-semibold`}>
                    {order.financial_status}
                  </Badge>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No orders found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <Button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <span>Page {currentPage} of {Math.ceil(totalOrders / ordersPerPage)}</span>
        <Button
          onClick={() => paginate(currentPage + 1)}
          disabled={indexOfLastOrder >= totalOrders}
          variant="outline"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </>
  );
};

export default OrdersTable;

