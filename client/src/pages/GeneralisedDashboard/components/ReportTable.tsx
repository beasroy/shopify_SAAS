import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  UserSquare,
  User,
  MapPin,
  Check,
  Layers,
  LayoutGrid,
  RefreshCw,
  Minimize2,
  Maximize2,
  ArrowUpIcon,
  ArrowDownIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PerformanceSummary } from "./PerformanceTable";

export type BreakdownCatagory =
  | "age"
  | "gender"
  | "country"
  | "platform"
  | "placement";

export type PeriodCell = {
  current: number;
  previous: number;
  change: number;
  trend: "up" | "down" | "neutral";
};

type RowPeriod = { metaspend: PeriodCell; metaroas: PeriodCell };

export type BreakdownRow = {
  key: string;
  label: string;
  yesterday: RowPeriod;
  last7Days: RowPeriod;
  last14Days: RowPeriod;
  last30Days: RowPeriod;
  quarterly: RowPeriod;
  custom?: RowPeriod;
};

export type BreakdownResponse = {
  success: boolean;
  breakdownCatagory: BreakdownCatagory;
  rows: BreakdownRow[];
  accounts?: {
    accountId: string;
    accountName: string;
    rows: BreakdownRow[];
    totalRows?: number;
  }[];
  totalRows?: number;
  lastUpdated?: string;
};

type Props = {
  performanceData?: {
    meta?: PerformanceSummary["periodData"];
    // google?: PerformanceSummary["periodData"];
    // shopify?: PerformanceSummary["periodData"];
    // analytics?: PerformanceSummary["periodData"];
  };
  apiStatus?: {
    meta: boolean;
    // google: boolean;
    // shopify: boolean;
    // analytics: boolean;
  };
  onRefresh?: () => void;
  loading?: boolean;
  breakdownDim: BreakdownCatagory;
  onBreakdownDimChange: (dim: BreakdownCatagory) => void;
  breakdown?: BreakdownResponse;
  breakdownLoading?: boolean;
};

const DIMENSION_OPTIONS: {
  id: BreakdownCatagory;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "age", label: "Age", icon: UserSquare },
  { id: "gender", label: "Gender", icon: User },
  { id: "country", label: "Country", icon: MapPin },
  { id: "platform", label: "Platforms", icon: Layers },
  { id: "placement", label: "Placements", icon: LayoutGrid },
];

const PERIOD_KEYS = [
  "yesterday",
  "last7Days",
  "last14Days",
  "last30Days",
  "quarterly",
  "custom",
] as const;

type PeriodKey = (typeof PERIOD_KEYS)[number];

const PERIOD_LABELS: Record<Exclude<PeriodKey, "custom">, string> = {
  yesterday: "Yesterday",
  last7Days: "Last 7 Days",
  last14Days: "Last 14 Days",
  last30Days: "Last 30 Days",
  quarterly: "Quarterly",
};

const ALL_ACCOUNTS_ID = "__all_accounts__";

function formatMetricValue(value: number, metric: "metaspend" | "metaroas") {
  const safeValue = value ?? 0;
  if (metric === "metaroas") return safeValue.toFixed(2);
  return safeValue >= 1000 ? Math.round(safeValue).toLocaleString() : safeValue;
}

function changeColor(change: number, trend: PeriodCell["trend"]) {
  if (trend === "up" || change > 0) return "text-green-600";
  if (trend === "down" || change < 0) return "text-red-600";
  return "text-slate-500";
}

function TrendIcon({ trend }: { trend: PeriodCell["trend"] }) {
  if (trend === "up") return <ArrowUpIcon className="h-3 w-3" />;
  if (trend === "down") return <ArrowDownIcon className="h-3 w-3" />;
  return null;
}

function PeriodCellView({
  cell,
  metric,
}: {
  cell: PeriodCell | undefined;
  metric: "metaspend" | "metaroas";
}) {
  const safe: PeriodCell = cell ?? {
    current: 0,
    previous: 0,
    change: 0,
    trend: "neutral",
  };
  return (
    <div className="flex justify-around items-center text-sm">
      <div className="w-16 text-center font-semibold text-slate-800">
        {formatMetricValue(safe.current, metric)}
      </div>
      <div className="w-16 text-center text-slate-600">
        {formatMetricValue(safe.previous, metric)}
      </div>
      <div
        className={cn(
          "w-16 text-center font-medium flex items-center justify-center gap-1",
          changeColor(safe.change, safe.trend),
        )}
      >
        <TrendIcon trend={safe.trend} />
        <span className="text-xs">{Math.abs(safe.change)}%</span>
      </div>
    </div>
  );
}

export default function ReportTable({
  breakdownDim,
  onBreakdownDimChange,
  breakdown,
  breakdownLoading,
  apiStatus,
  onRefresh,
  loading = false,
}: Props) {
  const [isDimExpanded, setIsDimExpanded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(ALL_ACCOUNTS_ID);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dateRange = useSelector((state: RootState) => state.date);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDimExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getCustomDateLabel = () => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(new Date(dateRange.from), "LLL dd, y")} - ${format(new Date(dateRange.to), "LLL dd, y")}`;
    } else if (dateRange?.from) {
      return format(new Date(dateRange.from), "LLL dd, y");
    }
    return "Date";
  };

  const getCustomCompareDateLabel = () => {
    if (dateRange?.compareFrom && dateRange?.compareTo) {
      return `${format(new Date(dateRange.compareFrom), "LLL dd, y")} - ${format(new Date(dateRange.compareTo), "LLL dd, y")}`;
    }

    if (dateRange?.from && dateRange?.to) {
      const start = new Date(dateRange.from);
      const end = new Date(dateRange.to);
      const duration = end.getTime() - start.getTime();
      const compareEnd = new Date(start);
      compareEnd.setDate(compareEnd.getDate() - 1);
      const compareStart = new Date(compareEnd.getTime() - duration);
      return `${format(compareStart, "LLL dd, y")} - ${format(compareEnd, "LLL dd, y")}`;
    }

    return null;
  };

  const selectedDim =
    DIMENSION_OPTIONS.find((d) => d.id === breakdownDim) ??
    DIMENSION_OPTIONS[0];
  const SelectedIcon = selectedDim.icon;
  const accountOptions = React.useMemo(
    () => breakdown?.accounts ?? [],
    [breakdown?.accounts],
  );
  const selectedAccount =
    selectedAccountId === ALL_ACCOUNTS_ID
      ? null
      : accountOptions.find((account) => account.accountId === selectedAccountId);

  useEffect(() => {
    if (accountOptions.length > 1) {
      setSelectedAccountId((current) => {
        const hasCurrentAccount = accountOptions.some(
          (account) => account.accountId === current,
        );
        return hasCurrentAccount || current === ALL_ACCOUNTS_ID
          ? current
          : ALL_ACCOUNTS_ID;
      });
      return;
    }

    if (accountOptions.length === 1) {
      setSelectedAccountId(accountOptions[0].accountId);
      return;
    }

    setSelectedAccountId(ALL_ACCOUNTS_ID);
  }, [accountOptions, breakdownDim]);

  const liveRows = selectedAccount?.rows ?? breakdown?.rows ?? [];
  const rows = liveRows;
  const metaConnected = apiStatus?.meta !== false;
  const showEmpty =
    metaConnected && rows.length === 0;
  const totalRows = selectedAccount?.totalRows ?? breakdown?.totalRows;
  const DEFAULT_VISIBLE_ROWS = 6;
  const visibleRows = isExpanded ? rows : rows.slice(0, DEFAULT_VISIBLE_ROWS);
  const hasMoreRows = rows.length > DEFAULT_VISIBLE_ROWS;

  if (rows.length === 0) {
    return (
      <div className="bg-white border rounded-lg shadow-md p-6 mt-8">
        <div className="flex items-center justify-center py-8">
          {breakdownLoading ? (
            <RefreshCw className="h-5 w-5 text-slate-500 animate-spin" />
          ) : (
            <div className="text-center text-slate-500">
              No report data available. Connect Meta Ads to see metrics.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow-md p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Report Overview
        </h2>
        <div className="flex gap-2 items-center">
          <div
            className="relative inline-block text-left"
            ref={dropdownRef}
          >
            <Button
              variant="outline"
              size="sm"
              aria-expanded={isDimExpanded}
              onClick={() => setIsDimExpanded(!isDimExpanded)}
              className="gap-2 h-[36px] min-w-[150px] justify-between"
            >
              <span className="flex items-center gap-2 truncate">
                <SelectedIcon size={16} />
                {selectedDim.label}
              </span>
              {isDimExpanded ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </Button>
            <div
              className={cn(
                "absolute right-0 top-full mt-2 w-52 bg-white rounded-md shadow-lg border border-slate-200 overflow-hidden z-[100] py-1 transition-all duration-200 origin-top transform",
                isDimExpanded
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-0 pointer-events-none",
              )}
            >
              {DIMENSION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = opt.id === breakdownDim;
                return (
                  <div
                    key={opt.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onBreakdownDimChange(opt.id);
                      setIsDimExpanded(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 cursor-pointer",
                      selected
                        ? "bg-slate-50 text-blue-600"
                        : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <Icon size={18} />
                    <span className={cn("text-sm", selected && "font-medium")}>
                      {opt.label}
                    </span>
                    {selected && <Check size={16} className="ml-auto" />}
                  </div>
                );
              })}
            </div>
          </div>
          {accountOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 h-[36px] min-w-[150px] justify-between"
                >
                  <span className="truncate">
                    {selectedAccount?.accountName || "All Accounts"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {accountOptions.length > 1 && (
                  <DropdownMenuItem
                    onClick={() => setSelectedAccountId(ALL_ACCOUNTS_ID)}
                    className={
                      selectedAccountId === ALL_ACCOUNTS_ID ? "bg-blue-50" : ""
                    }
                  >
                    All Accounts
                  </DropdownMenuItem>
                )}
                {accountOptions.map((account) => (
                  <DropdownMenuItem
                    key={account.accountId}
                    onClick={() => setSelectedAccountId(account.accountId)}
                    className={
                      selectedAccountId === account.accountId ? "bg-blue-50" : ""
                    }
                  >
                    {account.accountName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {totalRows != null && rows.length < totalRows && (
            <span className="text-xs text-slate-500 mr-2">
              Showing top {rows.length} of {totalRows}
            </span>
          )}
          <Button
            onClick={onRefresh}
            disabled={loading}
            size="sm"
            variant="outline"
            className="hover:bg-slate-100 h-[36px]"
            title="Refresh data"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {hasMoreRows && (
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              variant="outline"
              className="hover:bg-slate-100"
              title={isExpanded ? "Collapse table" : "Expand table"}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left p-3 font-semibold text-slate-700 bg-slate-50 sticky left-0 z-20 min-w-[180px] border-r border-slate-200">
                <div className="flex items-center gap-2">
                  <SelectedIcon size={16} />
                  <span>{selectedDim.label}</span>
                </div>
              </th>
              <th className="text-left p-3 font-semibold text-slate-700 bg-slate-50 min-w-[150px] border-r border-slate-200">
                Metric
              </th>
              {PERIOD_KEYS.map((p) => {
                const customCompareLabel =
                  p === "custom" ? getCustomCompareDateLabel() : null;
                return (
                  <th
                    key={p}
                    className="text-center p-3 font-semibold text-slate-700 bg-slate-50 min-w-[220px]"
                  >
                    <div className="mb-2">
                      {p === "custom" ? (
                        <div className="text-sm">
                          <div>{getCustomDateLabel()}</div>
                          {customCompareLabel && (
                            <>
                              <div>vs</div>
                              <div>{customCompareLabel}</div>
                            </>
                          )}
                        </div>
                      ) : (
                        PERIOD_LABELS[p]
                      )}
                    </div>
                    <div className="flex justify-around text-xs font-normal text-slate-500">
                      <span className="w-16">Current</span>
                      <span className="w-16">Previous</span>
                      <span className="w-16">Change</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="transition-all duration-300">
            {!metaConnected && (
              <tr>
                <td
                  colSpan={PERIOD_KEYS.length + 2}
                  className="p-6 text-center text-sm text-slate-500"
                >
                  Connect Meta Ads to see {selectedDim.label.toLowerCase()}{" "}
                  breakdown.
                </td>
              </tr>
            )}
            {metaConnected && showEmpty && (
              <tr>
                <td
                  colSpan={PERIOD_KEYS.length + 2}
                  className="p-6 text-center text-sm text-slate-500"
                >
                  No Meta data available for this{" "}
                  {selectedDim.label.toLowerCase()} breakdown and date range.
                </td>
              </tr>
            )}
            {metaConnected &&
              visibleRows.map((row, idx) => {
                const zebra = idx % 2 === 0 ? "bg-white" : "bg-slate-25";
                return (
                  <React.Fragment key={row.key}>
                    <tr
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                        zebra,
                      )}
                    >
                      <td
                        className="p-3 font-medium text-slate-800 bg-slate-50 sticky left-0 z-10 border-r border-slate-200 align-top"
                        rowSpan={2}
                      >
                        {row.label}
                      </td>
                      <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                        Meta Spend
                      </td>
                      {PERIOD_KEYS.map((p) => (
                        <td key={`${row.key}-s-${p}`} className="p-3">
                          <PeriodCellView
                            cell={row[p]?.metaspend}
                            metric="metaspend"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                        zebra,
                      )}
                    >
                      <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                        Meta ROAS
                      </td>
                      {PERIOD_KEYS.map((p) => (
                        <td key={`${row.key}-r-${p}`} className="p-3">
                          <PeriodCellView
                            cell={row[p]?.metaroas}
                            metric="metaroas"
                          />
                        </td>
                      ))}
                    </tr>
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
      </div>
      {!isExpanded && hasMoreRows && (
        <div className="mt-4 text-center">
          <Button
            onClick={() => setIsExpanded(true)}
            size="sm"
            variant="ghost"
            className="text-slate-600 hover:text-slate-900"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Show {rows.length - DEFAULT_VISIBLE_ROWS} more rows
          </Button>
        </div>
      )}
    </div>
  );
}
