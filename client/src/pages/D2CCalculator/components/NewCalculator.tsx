
import React, { useState } from 'react';
import { TrendingUp, Wallet, CircleMinus, RefreshCw, PlusIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import axiosInstance from '@/services/axiosConfig';
import { baseURL } from '@/data/constant';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface EbidtaMetrics {
  onlineRevenue: number;
  otherRevenue: number | '';
  marketingCost: number | '';
  otherMarketingCost: number | '';
  operatingCost: number | '';
  cogs: number | '';
}


interface AddFieldProps {
  btnName: string;
  dialogTitle: string;
  dialogDescription: string;
  changeHandler: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addHandler: () => void;
}

interface AdditionalRevenue {
  [key: string]: number | '';
}

interface EbidtaCalculatorProps {
  date: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

const formatCurrency = (value: number, currency: string = 'USD') => {
  const currencyCode = currency;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const AddFieldDialog = React.memo(({
  btnName,
  dialogTitle,
  dialogDescription,
  changeHandler,
  addHandler,
}: AddFieldProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          {btnName}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Label htmlFor="field-input">Name</Label>
          <input
            id="field-input"
            type="text"
            // value={inputValue}
            onChange={changeHandler}
            className="w-full p-2 border rounded shadow-sm"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {/* We use DialogClose here too if you want it to close on Save */}
          <DialogClose asChild>
            <Button type="submit" onClick={addHandler}>
              Save
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

const NewCalculator: React.FC<EbidtaCalculatorProps> = ({ date }) => {

  const [revenueLoading, setRevenueLoading] = useState<boolean>(false);
  const [costLoading, setCostLoading] = useState<boolean>(false);
  const [data, setData] = useState<EbidtaMetrics>({
    onlineRevenue: 0,
    otherRevenue: 0,
    marketingCost: 0,
    otherMarketingCost: 0,
    operatingCost: 0, // Rent, Salary, etc.
    cogs: 0
  });

  const [additionalRevenue, setAdditionalRevenue] = useState<AdditionalRevenue>({});
  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalRevenue>({});

  const [newFieldName, setNewFieldName] = useState<string>("");

  const [currency, setCurrency] = useState<string>('USD');
  const [metrics, setMetrics] = useState<EbidtaMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
  const { brandId } = useParams<{ brandId: string }>();
  const { toast } = useToast();

  const [totalRevenueAndExpenditure, setTotalRevenueAndExpenditure] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    profit: 0,
    profitMargin: 0,
  });

  React.useEffect(() => {
    if (brandId && date.from && date.to) {
      fetchRevenue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, date.from, date.to]);



  const fetchRevenue = React.useCallback(async () => {
    if (!brandId || !date.from || !date.to) {
      return;
    }

    setRevenueLoading(true);
    try {
      const response = await axiosInstance.post(
        `${baseURL}/api/d2c-calculator/revenue/${brandId}`,
        {
          startDate: format(date.from, 'yyyy-MM-dd'),
          endDate: format(date.to, 'yyyy-MM-dd'),
        },
        { withCredentials: true }
      );
      if (response.data.success) {
        setData(prev => ({ ...prev, onlineRevenue: response.data.data.revenue }));
        setCurrency(response.data.data.currency || 'USD');

        toast({
          title: "Success",
          description: "Revenue fetched successfully",
        });
      }
    } catch (error: any) {
      console.error('Error fetching revenue:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to fetch revenue",
        variant: "destructive",
      });
    } finally {
      setRevenueLoading(false);
    }
  }, [brandId, date.from, date.to, toast]);

  // Calculate metrics on server (sends stored revenue, no Shopify API call)
  const fetchLastUsedExpenditure = React.useCallback(async () => {
    if (!brandId) {
      toast({
        title: "Error",
        description: "Brand not found",
        variant: "destructive",
      });
      return;
    }

    setCostLoading(true);
    try {
      const response = await axiosInstance.get(
        `${baseURL}/api/d2c-calculator/ebidta-calculate/${brandId}`,
        { withCredentials: true }
      );
      const data = response.data.data;
      // console.log("fetchLastUsedExpenditure ===>", data);
      if (response.data.success) {
        setData(prev => ({
          ...prev,
          marketingCost: data.marketingCosts,
          otherMarketingCost: data.otherMarketingCosts,
          operatingCost: data.operatingCosts,
          cogs: 0
        } as EbidtaMetrics));
        toast({
          title: "Success",
          description: "Expenditure fetched successfully",
        });
      }
    } catch (error: any) {
      console.error('Error calculating metrics:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to fetch costs",
        variant: "destructive",
      });

    } finally {
      setCostLoading(false);
    }
  }, [brandId]);

  React.useEffect(() => {
    if (brandId && date.from && date.to) {
      // fetchRevenue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, date.from, date.to]);



  // React.useEffect(() => {
  //   let totalRevenue = Number(data.onlineRevenue) + Number(data.otherRevenue);
  //   let totalExpense = Number(data.marketingCost) + Number(data.otherMarketingCost) + Number(data.operatingCost);

  //   if (Object.keys(additionalRevenue).length > 0) {
  //     totalRevenue += Object.values(additionalRevenue).reduce((sum, value) => sum + Number(value), 0);
  //   }
  //   if (Object.keys(additionalExpenses).length > 0) {
  //     totalExpense += Object.values(additionalExpenses).reduce((sum, value) => sum + Number(value), 0);
  //   }
  //   setTotalRevenueAndExpenditure(prev => ({ ...prev, totalRevenue, totalExpense }));
  // }, [data.onlineRevenue, data.otherRevenue, data.marketingCost, data.otherMarketingCost, data.operatingCost, data.cogs, additionalRevenue, additionalExpenses]);

  const addFieldHandler = React.useCallback(
    (setAdditionalField: React.Dispatch<React.SetStateAction<AdditionalRevenue>>) => {
      const fieldName = newFieldName.trim();
      if (!fieldName) return;

      setAdditionalField(prev => {
        if (prev[fieldName] !== undefined) return prev;
        return { ...prev, [fieldName]: 0 };
      });

      setNewFieldName("");
    },
    [newFieldName]
  );

  const removeFieldHandler = React.useCallback(
    (
      key: string,
      setAdditionalField: React.Dispatch<React.SetStateAction<AdditionalRevenue>>
    ) => {
      setAdditionalField(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    },
    []
  );

  const calculateMetrics = async () => {

    setMetricsLoading(true);
    const normalizedRevenueData: { [key: string]: number } = {};

    Object.keys(additionalRevenue).forEach(key => {
      const trimmedKey = key.trim().toLowerCase();
      normalizedRevenueData[trimmedKey] = Number(additionalRevenue[key]);
    });

    const normalizedExpensesData: { [key: string]: number } = {};
    Object.keys(additionalExpenses).forEach(key => {
      const trimmedKey = key.trim().toLowerCase();
      normalizedExpensesData[trimmedKey] = Number(additionalExpenses[key]);
    });

    try {
      const response = await axiosInstance.post(`${baseURL}/api/d2c-calculator/calculate-metrics/${brandId}`, {
        brandId: brandId,
        onlineRevenue: data.onlineRevenue,
        otherRevenue: data.otherRevenue,
        currency: currency,
        // cogs: data.cogs,
        marketingExpense: Number(data.marketingCost),
        otherMarketingExpense: Number(data.otherMarketingCost),
        operatingCost: Number(data.operatingCost),
        // cogs: data.cogs,
        additionalRevenue: normalizedRevenueData,
        additionalExpenses: normalizedExpensesData
      },
        { withCredentials: true });

      if (response.data.success) {
        setTotalRevenueAndExpenditure({
          totalRevenue: response.data.data.totalRevenue,
          totalExpense: response.data.data.totalExpense,
          profit: response.data.data.profit,
          profitMargin: response.data.data.profitMargin,
        });
      }
    } catch (error) {
      console.error('Error calculating metrics:', error);
    } finally {
      setMetricsLoading(false);
    }

  };


  return (
    <div className="w-full p-6">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* INPUT SECTION */}
        <div className="space-y-6">
          <section>

            <div className="bg-white p-6 rounded-xl border border-gray-200 h-fit sticky top-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-green-700 uppercase mb-3">
                <TrendingUp size={16} /> Revenue Sources
              </h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Online Revenue (e.g., 1400000)
                  </label>
                  <input type="text" className="w-full p-2 border rounded shadow-sm"
                    value={formatCurrency(data.onlineRevenue, currency)} readOnly
                  />

                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Other Revenue</label>
                  <input type="number" className="w-full p-2 border rounded shadow-sm"
                    value={data.otherRevenue}
                    onChange={(e) =>
                      setData(prev => ({
                        ...prev,
                        otherRevenue: e.target.value === '' ? '' : Number(e.target.value)
                      }))
                    }
                  />
                </div>
                {Object.keys(additionalRevenue).length > 0 && Object.keys(additionalRevenue).map((key) => (
                  <div key={key}>
                    <label htmlFor={key} className="block text-xs text-gray-500 mb-1">{key}</label>
                    <div className="flex items-center gap-2">
                      <input type="number"
                        id={key}
                        name={key}
                        className="w-full p-2 border rounded shadow-sm"
                        value={additionalRevenue[key]}
                        onChange={(e) => setAdditionalRevenue(prev => ({ ...prev, [key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                      />
                      <CircleMinus className="h-4 w-4 text-red-500 hover:text-red-700 cursor-pointer" onClick={() => removeFieldHandler(key, setAdditionalRevenue)} />
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex flex-col md:flex-row items-center md:items-center justify-start md:justify-between gap-2 md:gap-4 mt-4'>
                <div className='w-full md:w-auto flex md:justify-start justify-center'>
                  <Button
                    onClick={fetchRevenue}
                    disabled={revenueLoading || !date.from || !date.to}
                    variant="outline"
                    size="sm"
                    className=''
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${revenueLoading ? 'animate-spin' : ''}`} />
                    {revenueLoading ? 'Loading...' : 'Refresh Revenue'}
                  </Button>
                </div>
                {/* Add Revenue Dialog Modal */}
                <div>
                  {/* <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Revenue
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[450px]">
                      <DialogHeader>
                        <DialogTitle>Add Revenue</DialogTitle>
                        <DialogDescription>
                          Add new revenue source here.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-3">
                        <Label htmlFor="name-1">Name</Label>
                        <input type="text"
                          // value={additionalRevenue.name}
                          onChange={(e) => setNewRevenueField(e.target.value)}
                          className="w-full p-2 border rounded shadow-sm"
                        />
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline" ref={addRevenueRef}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" onClick={addRevenueHandler}>Save</Button>
                      </DialogFooter>

                    </DialogContent>
                  </Dialog> */}
                  <AddFieldDialog
                    btnName="Add Revenue"
                    dialogTitle="Add Revenue"
                    dialogDescription="Add new revenue source here."
                    changeHandler={(e) => setNewFieldName(e.target.value)}
                    addHandler={() => addFieldHandler(setAdditionalRevenue)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Costs & Expenses Section */}
          <section>
            <div className="bg-white p-6 rounded-xl border border-gray-200 h-fit sticky top-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700 uppercase mb-3">
                <Wallet size={16} /> Costs & Expenses
              </h2>
              <div className="grid gap-4">
                <div>
                  <label htmlFor="marketingCost" className="block text-xs text-gray-500 mb-1">Marketing Cost</label>
                  <input type="number" className="w-full p-2 border rounded shadow-sm"
                    id="marketingCost"
                    value={data.marketingCost}
                    name="marketingCost"
                    onChange={(e) =>
                      setData(prev => ({
                        ...prev,
                        marketingCost: e.target.value === '' ? '' : Number(e.target.value)
                      }))
                    }
                    disabled={costLoading}
                  />
                </div>
                <div>
                  <label htmlFor="otherMarketingCost" className="block text-xs text-gray-500 mb-1">Other Marketing Cost (if any)</label>
                  <input type="number" className="w-full p-2 border rounded shadow-sm"
                    id="otherMarketingCost"
                    name="otherMarketingCost"
                    value={data.otherMarketingCost}
                    disabled={costLoading}
                    onChange={(e) =>
                      setData(prev => ({
                        ...prev,
                        otherMarketingCost: e.target.value === '' ? '' : Number(e.target.value)
                      }))
                    }
                  />
                </div>
                <div>
                  <label htmlFor="operatingCost" className="block text-xs text-gray-500 mb-1">Operating Costs (Rent, Salary, etc.)</label>
                  <input type="number" className="w-full p-2 border rounded shadow-sm"
                    id="operatingCost"
                    value={data.operatingCost}
                    name="operatingCost"
                    onChange={(e) =>
                      setData(prev => ({
                        ...prev,
                        operatingCost: e.target.value === '' ? '' : Number(e.target.value)
                      }))
                    }
                    disabled={costLoading}
                  />
                </div>
                <div>
                  <label htmlFor="cogs" className="block text-xs text-gray-500 mb-1">COGS (Cost of Goods Sold)</label>
                  <input type="number" className="w-full p-2 border rounded shadow-sm"
                    id="cogs"
                    value={data.cogs} disabled={costLoading}
                    name="cogs"
                    onChange={(e) =>
                      setData(prev => ({
                        ...prev,
                        cogs: e.target.value === '' ? '' : Number(e.target.value)
                      }))
                    }
                  />
                </div>
                {Object.keys(additionalExpenses).length > 0 && Object.keys(additionalExpenses).map((key) => (
                  <div key={key}>
                    <label htmlFor={key} className="block text-xs text-gray-500 mb-1">{key}</label>
                    <div className="flex items-center gap-2">
                      <input
                        id={key}
                        type="number"
                        className="w-full p-2 border rounded shadow-sm"
                        value={additionalExpenses[key]}
                        name={key}
                        onChange={(e) => setAdditionalExpenses(prev => ({ ...prev, [key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                      />
                      <CircleMinus className="h-4 w-4 text-red-500 hover:text-red-700 cursor-pointer" onClick={() => removeFieldHandler(key, setAdditionalExpenses)} />
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex flex-col md:flex-row items-center md:items-center justify-start md:justify-between gap-2 md:gap-4 mt-4'>
                <div className='w-full md:w-auto flex md:justify-start justify-center'>
                  <Button
                    onClick={fetchLastUsedExpenditure}
                    disabled={costLoading || !brandId}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${costLoading ? 'animate-spin' : ''}`} />
                    {costLoading ? 'Loading...' : 'Last Useded'}
                  </Button>
                </div>
                <div>
                  <AddFieldDialog
                    btnName="Add Expense"
                    dialogTitle="Add Cost/Expense"
                    dialogDescription="Add new Cost/Expense here."
                    changeHandler={(e) => setNewFieldName(e.target.value)}
                    addHandler={() => addFieldHandler(setAdditionalExpenses)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* SUMMARY SECTION */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 h-fit sticky top-6">
          <h2 className="text-lg font-bold mb-4 text-gray-700">Financial Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between pb-2 border-b">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-bold text-green-600">₹{totalRevenueAndExpenditure.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pb-2 border-b">
              <span className="text-gray-600">Total Expenses</span>
              <span className="font-bold text-red-600">₹{totalRevenueAndExpenditure.totalExpense.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-lg font-bold">Net Profit</span>
              <span className={`text-lg font-bold ${Number(totalRevenueAndExpenditure.profit.toFixed(2)) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ₹{totalRevenueAndExpenditure.profit.toLocaleString()}
              </span>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 font-medium">Profit Margin</p>
              <p className="text-2xl font-bold text-blue-900">
                {/* {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0}% */}
                {totalRevenueAndExpenditure.profitMargin > 0 ? totalRevenueAndExpenditure.profitMargin.toFixed(2) : 0}%
              </p>
            </div>
          </div>
          <div>
            <Button onClick={calculateMetrics} disabled={metricsLoading} variant="outline" className="mt-4 w-full ">
              <RefreshCw className={`h-4 w-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
              {metricsLoading ? 'Calculating...' : 'Calculate Metrics'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCalculator;
