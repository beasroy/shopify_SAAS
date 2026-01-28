
import React, { useState } from 'react';
import { TrendingUp, Wallet, CircleMinus, RefreshCw, PlusIcon, HandCoins, UploadIcon, Trash2Icon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import axiosInstance from '@/services/axiosConfig';
import { baseURL } from '@/data/constant';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Papa from 'papaparse';


// const requiredHeaders = ['Product Name', 'Units Sold'];
const requiredHeaders = ['Product Id', 'Cost per item'];


interface AddFieldProps {
  btnName: string;
  dialogTitle: string;
  dialogDescription: string;
  changeHandler: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addHandler: () => void;
  disabled?: boolean;
}

interface Revenue {
  shopifySales: number | '';
  marketSales: number | '';
  otherRevenue: {
    amount: number | '';
    frequency: string;
  };
}

interface AdditionalRevenue {
  [key: string]: { amount: number | ''; frequency: string };
}

interface CostAndExpenses {
  // marketingCost: { amount: number | ''; frequency: string };
  marketingCost: number;
  otherMarketingCost: { amount: number | ''; frequency: string };
  operatingCost: { amount: number | ''; frequency: string };
}

interface AdditionalExpenses {
  [key: string]: { amount: number | ''; frequency: string };
}


interface AdditionalCOGS {
  [key: string]: { amount: number | ''; frequency: string };
}

interface EbidtaCalculatorProps {
  date: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

// const formatCurrency = (value: number, currency: string = 'USD') => {
//   const currencyCode = currency;
//   return new Intl.NumberFormat('en-US', {
//     style: 'currency',
//     currency: currencyCode,
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   }).format(value);
// };

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
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
  disabled,
}: AddFieldProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
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

const FREQUENCIES = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Half-yearly", value: "half-yearly" },
  { label: "Yearly", value: "yearly" },
];


interface FrequencySelectorProps<T> {
  objectKey: keyof T;
  updateFrequency: (
    fieldKey: keyof T,
    frequency: string,
    setter: React.Dispatch<React.SetStateAction<T>>
  ) => void;
  setter: React.Dispatch<React.SetStateAction<T>>;
  getter: T;
  disabled?: boolean;
}

const FrequencySelector = React.memo(<T,>({
  objectKey,
  updateFrequency,
  setter,
  getter,
  disabled = false
}: FrequencySelectorProps<T>) => {

  // Access the frequency safely by casting the specific field to 'any' 
  // since we know our data structure has a .frequency property
  const currentValue = (getter[objectKey] as any)?.frequency || "monthly";

  return (
    <select
      className="w-full px-4 py-2 shadow-sm border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-gray-600 outline-none transition-all"
      value={currentValue}
      disabled={disabled}
      onChange={(e) => updateFrequency(objectKey, e.target.value, setter)}
    >
      {FREQUENCIES.map((f) => (
        <option key={f.value} value={f.value}>
          {f.label}
        </option>
      ))}
    </select>
  );
}) as <T>(props: FrequencySelectorProps<T>) => JSX.Element;

const getStoredData = (key: string, defaultValue: any) => {
  const saved = localStorage.getItem(key);
  try {
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

type CogsInputMethod = 'multiplier' | 'manual' | 'csv' | null;

const NewCalculator: React.FC<EbidtaCalculatorProps> = ({ date }) => {

  const [revenueLoading, setRevenueLoading] = useState<boolean>(false);
  const [revenue, setRevenue] = useState<Revenue>(
    getStoredData("revenue", {})
  );

  const [additionalRevenue, setAdditionalRevenue] = useState<AdditionalRevenue>(getStoredData("additionalRevenue", {}));

  const [costLoading, setCostLoading] = useState<boolean>(false);
  const [costAndExpenses, setCostAndExpenses] = useState<CostAndExpenses>(
    getStoredData("costAndExpenses", {})
  );
  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalExpenses>(
    getStoredData("additionalExpenses", {})
  );

  const [COGSMultiplier, setCOGSMultiplier] = useState<number | "">(getStoredData("COGSMultiplier", 0));
  const [additionalCOGS, setAdditionalCOGS] = useState<AdditionalCOGS>(getStoredData("additionalCOGS", {}));

  const [newFieldName, setNewFieldName] = useState<string>("");

  const [currency, setCurrency] = useState<string>('USD');
  const [uploadedFile, setUploadedFile] = useState<File | undefined>(undefined);
  const [uploadedFileList, setUploadedFileList] = useState<Array<any> | undefined>(undefined);

  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
  const [cogsLoading, setCogsLoading] = useState<boolean>(false);
  const { brandId } = useParams<{ brandId: string }>();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeMethod, setActiveMethod] = useState<CogsInputMethod>(getStoredData("activeMethod", "multiplier"));

  const [totalRevenueAndExpenditure, setTotalRevenueAndExpenditure] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    profit: 0,
    COGS: 0,
    profitMargin: 0,
  });

  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : ""
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : ""

  React.useEffect(() => {
    if (brandId && date.from && date.to) {
      fetchRevenue();
    }
  }, [brandId, date.from, date.to]);

  const fetchRevenue = React.useCallback(async () => {
    if (!brandId || !date.from || !date.to) return;

    setRevenueLoading(true);

    try {
      const queryParams: Record<string, string> = {};
      if (startDate) queryParams.startDate = startDate;
      if (endDate) queryParams.endDate = endDate;

      const revenueRequest = axiosInstance.post(
        `${baseURL}/api/d2c-calculator/revenue/${brandId}`,
        {
          startDate: format(date.from, 'yyyy-MM-dd'),
          endDate: format(date.to, 'yyyy-MM-dd'),
        },
        { withCredentials: true }
      );

      const reportRequest = axiosInstance.get(
        `${baseURL}/api/report/${brandId}`,
        {
          params: queryParams,
          withCredentials: true,
        }
      );

      const [revenueResponse, reportResponse] = await Promise.all([
        revenueRequest,
        reportRequest,
      ]);

      setCostAndExpenses(prev => ({
        ...prev,
        marketingCost: reportResponse.data.data[0].totalSpend || 0,
      }))

      const processedDailyMetrics = reportResponse.data.data[0].dailyMetrics.map((daily: any) => ({
        ...daily,
        // metaROAS: safeDivide(daily.metaRevenue, daily.metaSpend),
        googleSales: (daily.googleSpend) * (daily.googleROAS),
        adSales: (daily.totalSpend) * (daily.grossROI || 0),
        // ROI: safeDivide(daily.totalSales, daily.totalSpend),
      }))

      const metaSales = processedDailyMetrics.reduce((sum: number, daily: any) => sum + (daily.metaRevenue || 0), 0)
      const googleSales = processedDailyMetrics.reduce((sum: number, daily: any) => sum + daily.googleSales, 0)
      const marketSales = metaSales + googleSales || 0
      setRevenue(prev => ({
        ...prev,
        marketSales: marketSales,
      }))


      if (revenueResponse.data.success) {
        setRevenue(prev => ({
          ...prev,
          shopifySales: revenueResponse.data.data.revenue,
        }));
        setCurrency(revenueResponse.data.data.currency || 'USD');

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

  const fetchLastUsedLandedCostForCOGS = React.useCallback(async () => {
    if (!brandId) {
      toast({
        title: "Error",
        description: "Brand required",
        variant: "destructive",
      });
      return;
    }

    setCogsLoading(true);
    try {
      const response = await axiosInstance.get(
        `${baseURL}/api/d2c-calculator/last-landed-cost-for-cogs/${brandId}`,
        { withCredentials: true }
      );
      const data = response.data.data;

      if (response.data.success) {

        if (data.COGSMultiplier !== 0) {
          setCOGSMultiplier(data.COGSMultiplier);
          setActiveMethod('multiplier');
          toast({
            title: "Success",
            description: "COGS data fetched successfully",
          });
        } else if (Object.keys(data.additionalCOGS).length > 0) {
          setActiveMethod('manual');
          setAdditionalCOGS({ ...data.additionalCOGS });
          toast({
            title: "Success",
            description: "COGS data fetched successfully",
          });
        } else {
          toast({
            title: "Success",
            description: "CSV file cannot be fetched",
            variant: "destructive",
          });
        }

      }

    } catch (error: any) {
      console.error('Error calculating metrics:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to fetch costs",
        variant: "destructive",
      });

    } finally {
      setCogsLoading(false);
    }
  }, [brandId]);


  const fetchLastUsedExpenditure = React.useCallback(async () => {
    if (!brandId) {
      toast({
        title: "Error",
        description: "Brand required",
        variant: "destructive",
      });
      return;
    }
    setCostLoading(true);
    try {
      const response = await axiosInstance.get(
        `${baseURL}/api/d2c-calculator/last-used-expenditure/${brandId}`,
        { withCredentials: true }
      );
      const data = response.data.data;
      if (response.data.success) {
        setAdditionalExpenses({ ...data.additionalExpenses });
        setCostAndExpenses(prev => ({ ...prev, operatingCost: data.operatingCost, otherMarketingCost: data.otherMarketingCost }));
      }
    } catch (error: any) {
      console.error('Error fetching last used expenditure:', error);
    } finally {
      setCostLoading(false);
    }

  }, [])

  React.useEffect(() => {
    if (brandId && date.from && date.to) {
      // fetchRevenue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, date.from, date.to]);

  React.useEffect(() => {
    localStorage.setItem('additionalRevenue', JSON.stringify(additionalRevenue));
    localStorage.setItem('additionalExpenses', JSON.stringify(additionalExpenses));
    localStorage.setItem('additionalCOGS', JSON.stringify(additionalCOGS));
    localStorage.setItem('revenue', JSON.stringify(revenue));
    localStorage.setItem('costAndExpenses', JSON.stringify(costAndExpenses));
    localStorage.setItem('COGSMultiplier', JSON.stringify(COGSMultiplier));
    localStorage.setItem('activeMethod', JSON.stringify(activeMethod));

  }, [additionalRevenue, additionalExpenses, additionalCOGS, revenue, costAndExpenses, totalRevenueAndExpenditure, activeMethod]);


  React.useEffect(() => {
    if (uploadedFile) {
      handleFileUpload(uploadedFile);
    }
  }, [uploadedFile]);

  const addFieldHandler = React.useCallback(
    (setAdditionalField: React.Dispatch<React.SetStateAction<AdditionalRevenue | AdditionalExpenses>>) => {
      const fieldName = newFieldName.trim();
      if (!fieldName) return;

      setAdditionalField(prev => {
        if (prev[fieldName] !== undefined) return prev;
        return { ...prev, [fieldName]: { amount: 0, frequency: "monthly" } };
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

    if (activeMethod === 'multiplier' && (COGSMultiplier === 0 || COGSMultiplier === '')) {
      toast({
        title: "Error",
        description: "COGS Multiplier is required",
        variant: "destructive",
      });
      return;
    } else if (activeMethod === 'manual' && Object.keys(additionalCOGS).length === 0) {
      toast({
        title: "Error",
        description: "Additional COGS is required",
        variant: "destructive",
      });
      return;
    } else if (activeMethod === 'csv' && uploadedFileList?.length === 0) {
      toast({
        title: "Error",
        description: "CSV file is required",
        variant: "destructive",
      });
      return;
    }

    setMetricsLoading(true);
    setTotalRevenueAndExpenditure({
      totalRevenue: 0,
      totalExpense: 0,
      profit: 0,
      profitMargin: 0,
      COGS: 0,
    });

    try {
      const response = await axiosInstance.post(`${baseURL}/api/d2c-calculator/calculate-metrics/${brandId}`, {
        brandId: brandId,
        startDate,
        endDate,
        revenue,
        additionalRevenue,
        costAndExpenses,
        additionalExpenses,
        COGSMultiplier: activeMethod === 'multiplier' && COGSMultiplier !== 0 && COGSMultiplier !== '' ? COGSMultiplier : undefined,
        additionalCOGS: activeMethod === 'manual' && Object.keys(additionalCOGS).length > 0 ? additionalCOGS : undefined,
        currency: currency,
        uploadedFileList: activeMethod === 'csv' && uploadedFileList?.length && uploadedFileList?.length > 0 ? uploadedFileList : undefined,

        // otherRevenue: revenueSource.otherRevenue,
        // cogs: data.cogs,
        // marketingExpense: Number(costAndExpenses.marketingCost),
        // otherMarketingExpense: Number(costAndExpenses.otherMarketingCost),
        // operatingCost: Number(costAndExpenses.operatingCost),
        // cogs: data.cogs,
        // additionalRevenue: normalizedRevenueData,
        // additionalExpenses: normalizedExpensesData
      },
        { withCredentials: true });

      if (response.data.success) {
        setTotalRevenueAndExpenditure({
          totalRevenue: response.data.data.totalRevenue,
          totalExpense: response.data.data.totalExpense,
          profit: response.data.data.profit,
          profitMargin: response.data.data.profitMargin,
          COGS: response.data.data.COGS,
        });
      }
    } catch (error: any) {
      console.error('Error calculating metrics:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to calculate metrics",
        variant: "destructive",
      });
    } finally {
      setMetricsLoading(false);
    }

  };

  const updateFrequency = React.useCallback(<T,>(
    fieldKey: keyof T,
    frequency: string,
    setter: React.Dispatch<React.SetStateAction<T>>
  ) => {
    setter((prev) => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] as any),
        frequency,
      },
    }));
  }, []);

  function handleFileUpload(file: File | null) {
    // const file = event.target.files?.[0];
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== 'text/csv') {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }
    Papa.parse(file, {
      header: true, // Converts rows into objects using headers as keys, tells it to treat the first row as keys (Product Name, etc.), 
      skipEmptyLines: true,
      // The complete callback runs after parsing is done. We destructure the results to get 
      // data (the rows) (array of objects)
      //  and meta (info about the file like headers). We initialize an empty errors array 
      //  to collect any issues found.
      complete: (results) => {
        const { data, meta } = results;
        const errors: string[] = [];

        // 1. Check if all columns are present
        const fileHeaders = meta.fields ?? []; //(info about the file like headers)
        const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

        if (missingHeaders.length > 0) {
          alert(`Missing columns: ${missingHeaders.join(', ')}`);
          return;
        }

        // 2. Validate row values
        data.forEach((row: any, index: number) => {
          requiredHeaders.forEach(header => {
            const value = row[header];
            // Check if value is null, undefined, or just whitespace
            if (value === null || value === undefined || value.trim() === "") {
              errors.push(`Row ${index + 1}: Column "${header}" is empty.`);
            }
          });
        });

        if (errors.length > 0) {
          console.error("Validation Failed:", errors);
          alert("File has missing values. Check console for details.");
        } else {
          // console.log("Validation Successful!", data);
          const cleanedData = cleanShopifyCSVData(data as any)
          setUploadedFileList(cleanedData);
          console.log("cleanedData ===>", cleanedData);
          // Proceed to upload or process data
        }
      }
    });


  }

  function cleanShopifyCSVData(rows = []) {
    const cleaned = []

    for (const row of rows) {
      // Shopify column names (exact)
      const rawSKU = row["Product Id"]

      const rawCostPerItem = row["Cost per item"]


      // Skip rows without SKU
      if (!rawSKU) continue

      const productId = String(rawSKU).trim()

      // Clean numbers like "1,234"
      const unitCost = Number(
        String(rawCostPerItem || 0).replace(/,/g, "")
      )

      // Skip invalid rows
      if (!productId || !Number.isFinite(unitCost) || unitCost <= 0) {
        continue
      }

      cleaned.push({
        productId,
        unitCost
      })
    }

    return cleaned
  }


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
                    Shopify Sales
                  </label>
                  <input type="text" className="w-full p-2 border rounded shadow-sm"
                    value={formatCurrency(revenue?.shopifySales || 0)} readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Maket Sales
                  </label>
                  <input type="text" className="w-full p-2 border rounded shadow-sm"
                    value={formatCurrency(revenue?.marketSales || 0)} readOnly
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Other Revenue</label>

                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">

                    <div className="flex-1">
                      <input
                        type="number"
                        className="w-full p-2 border rounded shadow-sm "
                        value={revenue.otherRevenue?.amount || ''}
                        disabled={metricsLoading}
                        onChange={(e) =>
                          setRevenue(prev => ({
                            ...prev,
                            otherRevenue: {
                              amount: e.target.value === '' ? '' : Number(e.target.value),
                              frequency: prev.otherRevenue?.frequency || 'monthly'
                            }
                          }))
                        }
                      />
                    </div>

                    <div className="w-full md:w-[30%]">
                      <FrequencySelector
                        objectKey="otherRevenue"
                        updateFrequency={updateFrequency}
                        setter={setRevenue}
                        getter={revenue}
                        disabled={metricsLoading}
                      />
                    </div>
                  </div>
                </div>
                {Object.keys(additionalRevenue).length > 0 && Object.keys(additionalRevenue).map((key) => (
                  <div key={key}>
                    <label htmlFor={key} className="block text-xs text-gray-500 mb-1">{key}</label>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                      <div className="flex-1">
                        <input type="number"
                          id={key}
                          name={key}
                          className="w-full p-2 border rounded shadow-sm"
                          value={additionalRevenue[key]?.amount || ''}
                          disabled={metricsLoading}
                          onChange={(e) => setAdditionalRevenue(prev => ({
                            ...prev,
                            [key]: {
                              amount: e.target.value === '' ? '' : Number(e.target.value),
                              frequency: additionalRevenue[key]?.frequency || 'monthly'
                            }
                          }))}
                        />
                      </div>
                      <div className="w-full md:w-[30%] flex items-center gap-2">
                        <FrequencySelector
                          objectKey={key}
                          updateFrequency={updateFrequency}
                          setter={setAdditionalRevenue}
                          getter={additionalRevenue}
                          disabled={metricsLoading}
                        />
                        <CircleMinus className="h-4 w-4 text-red-500 hover:text-red-700 cursor-pointer" onClick={() => removeFieldHandler(key, setAdditionalRevenue)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className='flex flex-col md:flex-row items-center md:items-center justify-start md:justify-between gap-2 md:gap-4 mt-4'>
                <div className='w-full md:w-auto flex md:justify-start justify-center'>
                  <Button
                    onClick={fetchRevenue}
                    disabled={revenueLoading || !date.from || !date.to || metricsLoading}
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
                  <AddFieldDialog
                    btnName="Add Revenue"
                    dialogTitle="Add Revenue"
                    dialogDescription="Add new revenue source here."
                    changeHandler={(e) => setNewFieldName(e.target.value)}
                    addHandler={() => addFieldHandler(setAdditionalRevenue)}
                    disabled={metricsLoading || revenueLoading || !date.from || !date.to}
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
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                    <div className="flex-1">
                      <input className="w-full p-2 border rounded shadow-sm"
                        id="marketingCost"
                        value={formatCurrency(Number(costAndExpenses?.marketingCost || 0))} readOnly
                        name="marketingCost"
                        disabled={costLoading || metricsLoading}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="otherMarketingCost" className="block text-xs text-gray-500 mb-1">Other Marketing Cost (if any)</label>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                    <div className="flex-1">
                      <input type="number" className="w-full p-2 border rounded shadow-sm"
                        id="otherMarketingCost"
                        name="otherMarketingCost"
                        value={costAndExpenses.otherMarketingCost?.amount || ''}
                        disabled={costLoading || metricsLoading}
                        onChange={(e) =>
                          setCostAndExpenses((prev) => ({
                            ...prev,
                            otherMarketingCost: {
                              amount: e.target.value === '' ? '' : Number(e.target.value),
                              frequency: prev.otherMarketingCost?.frequency || 'monthly'
                            }
                          }))
                        }
                      />
                    </div>
                    <div className="w-full md:w-[30%] flex items-center gap-2">
                      <FrequencySelector
                        objectKey="otherMarketingCost"
                        updateFrequency={updateFrequency}
                        setter={setCostAndExpenses}
                        getter={costAndExpenses}
                        disabled={metricsLoading || costLoading}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <div>
                    <label htmlFor="operatingCost" className="block text-xs text-gray-500 mb-1">Operating Costs (Rent, Salary, etc.)</label>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 space-y-2">
                      <div className="flex-1">
                        <input type="number" className="w-full p-2 border rounded shadow-sm"
                          id="operatingCost"
                          value={costAndExpenses.operatingCost?.amount || ''}
                          name="operatingCost"
                          disabled={metricsLoading || costLoading}
                          onChange={(e) =>
                            setCostAndExpenses((prev) => ({
                              ...prev,
                              operatingCost: {
                                amount: e.target.value === '' ? '' : Number(e.target.value),
                                frequency: prev.operatingCost?.frequency || 'monthly'
                              }
                            }))
                          }
                        />

                      </div>
                      <div className="w-full md:w-[30%] flex items-center gap-2">
                        <FrequencySelector
                          objectKey="operatingCost"
                          updateFrequency={updateFrequency}
                          setter={setCostAndExpenses}
                          getter={costAndExpenses}
                          disabled={metricsLoading || costLoading}
                        />
                      </div>
                    </div>
                  </div>
                  {Object.keys(additionalExpenses).length > 0 && Object.keys(additionalExpenses).map((key) => (
                    <div key={key} className="space-y-2 mt-2">
                      <label htmlFor={key} className="block text-xs text-gray-500 mb-1">{key}</label>
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                        <div className="flex-1">
                          <input
                            id={key}
                            type="number"
                            className="w-full p-2 border rounded shadow-sm"
                            value={additionalExpenses[key]?.amount || ''}
                            name={key}
                            disabled={metricsLoading}
                            onChange={(e) => setAdditionalExpenses(prev => ({ ...prev, [key]: { amount: e.target.value === '' ? '' : Number(e.target.value), frequency: additionalExpenses[key]?.frequency } }))}
                          />
                        </div>
                        <div className="w-full md:w-[30%] flex items-center gap-2">
                          <FrequencySelector
                            objectKey={key}
                            updateFrequency={updateFrequency}
                            setter={setAdditionalExpenses}
                            getter={additionalExpenses}
                            disabled={metricsLoading}
                          />
                          <CircleMinus className="h-4 w-4 text-red-500 hover:text-red-700 cursor-pointer" onClick={() => removeFieldHandler(key, setAdditionalExpenses)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className='flex flex-col md:flex-row items-center md:items-center justify-start md:justify-between gap-2 md:gap-4 mt-4'>
                <div className='w-full md:w-auto flex md:justify-start justify-center'>
                  <Button
                    onClick={fetchLastUsedExpenditure}
                    disabled={costLoading || !brandId || metricsLoading}
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

        <div>

          <section className="bg-white p-6 rounded-xl border border-gray-200 h-fit sticky top-6 mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase mb-3">
              <HandCoins size={16} />
              Landed Costs (for COGS)
            </h2>
            <div >
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-4">
                {(['multiplier', 'manual', 'csv'] as const).map((method) => (
                  <button
                    key={method}
                    disabled={metricsLoading || cogsLoading}
                    onClick={() => setActiveMethod(method)}
                    className={`flex-1 py-1 text-xs rounded-md transition-all ${activeMethod === method ? 'bg-white shadow-sm font-bold' : 'text-gray-500'
                      }`}
                  >
                    {method.toUpperCase()}
                  </button>
                ))}
              </div>

              {
                activeMethod === 'multiplier' && <div className="">
                  <label htmlFor="COGSMultiplier" className="block text-xs text-gray-500 mb-2">Enter COGS Multiplier (e.g. 1.5 for 50% profit)</label>
                  <input
                    className="w-full p-2 border rounded shadow-sm"
                    type="number"
                    id="COGSMultiplier"
                    name="COGSMultiplier"
                    value={COGSMultiplier || ''}
                    onChange={(e) => setCOGSMultiplier(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={metricsLoading || cogsLoading}
                  />
                </div>
              }

              {
                activeMethod === 'manual' && <div className="mt-4">
                  <label htmlFor="COGS" className="block text-xs text-gray-500 mb-4">Add COGS Breakdown (Variable / Order-level Costs)</label>
                  {Object.keys(additionalCOGS).length > 0 && Object.keys(additionalCOGS).map((key) => (
                    <div key={key} className="space-y-2 mt-2">
                      <label htmlFor={key} className="block text-xs text-gray-500 mb-2">{key}</label>
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                        <div className="flex-1">
                          <input
                            id={key}
                            type="number"
                            className="w-full p-2 border rounded shadow-sm"
                            value={additionalCOGS[key]?.amount || ''}
                            name={key}
                            disabled={metricsLoading || cogsLoading}
                            onChange={(e) => setAdditionalCOGS(prev => ({
                              ...prev,
                              [key]: {
                                amount: e.target.value === '' ? '' : Number(e.target.value),
                                frequency: additionalExpenses[key]?.frequency || 'monthly'
                              }
                            }))}
                          />
                        </div>
                        <div className="w-full md:w-[30%] flex items-center gap-2">
                          <FrequencySelector
                            objectKey={key}
                            updateFrequency={updateFrequency}
                            setter={setAdditionalCOGS}
                            getter={additionalCOGS}
                            disabled={metricsLoading || cogsLoading}
                          />
                          <CircleMinus className="h-4 w-4 text-red-500 hover:text-red-700 cursor-pointer" onClick={() => removeFieldHandler(key, setAdditionalCOGS)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              }

            </div>

            {activeMethod !== 'csv' && <div className='flex flex-col md:flex-row items-center md:items-center justify-start md:justify-between gap-2 md:gap-4 mt-4'>
              <div className='w-full md:w-auto flex md:justify-start justify-center items-center'>
                <Button
                  onClick={fetchLastUsedLandedCostForCOGS}
                  disabled={costLoading || !brandId}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${costLoading ? 'animate-spin' : ''}`} />
                  {costLoading ? 'Loading...' : 'Last Useded'}
                </Button>
              </div>
              {
                activeMethod === 'manual' && <div>
                  <AddFieldDialog
                    btnName="Add"
                    dialogTitle="Add"
                    dialogDescription="Add new source here."
                    changeHandler={(e) => setNewFieldName(e.target.value)}
                    addHandler={() => addFieldHandler(setAdditionalCOGS)}
                    disabled={metricsLoading || !brandId}
                  />
                </div>
              }
            </div>}

            {activeMethod === 'csv' && <div className="mt-4">
              <label htmlFor="file_input" className="block text-xs text-gray-500 mb-2">Upload COGS Breakdown - Product-wise (Sheet.csv)</label>
              <div className="flex flex-col md:flex-row items-center gap-2 ">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="cursor-pointer border border-gray-300 rounded-md p-1.5 w-full shadow-base"
                  id="file_input"
                  disabled={metricsLoading}
                  onChange={(e) => setUploadedFile(e.target.files?.[0])}
                />
                <Button
                  onClick={() => {
                    setUploadedFile(undefined);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  variant="outline" size="sm"
                  disabled={metricsLoading}
                  className='h-10 border border-gray-300 rounded-md p-1.5 shadow-base text-red-500 hover:text-red-700'
                >
                  <Trash2Icon className="h-4 w-4 mr-2 text-red-500 hover:text-red-700" />
                  Clear
                </Button>
              </div>
            </div>
            }
          </section>


          {/* SUMMARY SECTION */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 h-fit sticky top-6">
            <h2 className="text-lg font-bold mb-4 text-gray-700">Financial Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between pb-2 border-b">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-bold text-green-600">{totalRevenueAndExpenditure.totalRevenue?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-2 border-b">
                <span className="text-gray-600">Total Expenses</span>
                <span className="font-bold text-red-600">{totalRevenueAndExpenditure.totalExpense?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-2 border-b">
                <span className="text-gray-600">COGS (Cost of Goods Sold)</span>
                <span className="font-bold text-red-600">{totalRevenueAndExpenditure?.COGS?.toLocaleString()}</span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-lg font-bold">Net Profit</span>
                <span className={`text-lg font-bold {Number(totalRevenueAndExpenditure.profit?.toFixed(2)) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {totalRevenueAndExpenditure.profit?.toLocaleString()}
                </span>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800 font-medium">Profit Margin</p>
                <p className="text-2xl font-bold text-blue-900">
                  {totalRevenueAndExpenditure?.profitMargin > 0 ? totalRevenueAndExpenditure?.profitMargin?.toFixed(2) : 0}%
                </p>
              </div>
            </div >
          </div>

          <div>
            <Button onClick={calculateMetrics} disabled={metricsLoading} variant="outline" className="mt-4 w-full ">
              <RefreshCw className={`h-4 w-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
              {metricsLoading ? 'Calculating...' : 'Calculate Metrics'}
            </Button>
          </div>
        </div >
      </div >
    </div >
  );
};

export default NewCalculator;
