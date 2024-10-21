import React from 'react';
import { ShoppingBag } from 'lucide-react';
// import { DatePickerWithRange } from '@/components/dashboard_component/DatePickerWithRange';

export const Navbar: React.FC = () => {
 
  return (
    <nav className="bg-white shadow-md">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <ShoppingBag className="h-8 w-8 text-purple-600 mr-2" />
            <span className="font-bold text-xl text-gray-800">Shopify</span>
          </div>
        {/* <DatePickerWithRange date={date}, setData={setData} /> */}
        </div>
      </div>
    </nav>
  );
};


