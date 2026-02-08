import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  RefreshCw,
  DollarSign,
  Percent,
  Target,
  TrendingUp,
  Users,
  PieChart as PieIcon,
  BarChart3,
  Settings,
  Gift,
  Calculator,
  Calendar,
  Award,
  ShoppingCart,
  BadgeDollarSign,
  AlertTriangle,
  Clock,
  Phone,
  Menu,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Default Excel URL - Google Sheets (auto-updates on refresh)
const DEFAULT_EXCEL_URL = "https://docs.google.com/spreadsheets/d/1h2ZMumcAsYYYvV1JTQPRXTa3kOcZ5K4-/edit";

// Four Seasons brand colors
const BRAND_COLORS = {
  primary: '#C62828',
  primaryDark: '#8E0000',
  secondary: '#1E3A5F',
  accent: '#F5F5F5',
  white: '#FFFFFF',
  dark: '#212121',
};

// Chart colors matching Four Seasons brand
const CHART_COLORS = ["#C62828", "#1E3A5F", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4"];
const SPIFF_COLORS = {
  'APCO X': '#C62828',
  'Samsung': '#1E3A5F',
  'Mitsubishi': '#4CAF50',
  'Surge Protector': '#FF9800',
  'Duct Cleaning': '#9C27B0',
};

// Pay periods (bi-weekly) with date ranges for detection
const PAY_PERIODS_DATA = [
  { name: "Dec 25, 2025 - Jan 07, 2026", start: new Date(2025, 11, 25), end: new Date(2026, 0, 7) },
  { name: "Jan 08, 2026 - Jan 21, 2026", start: new Date(2026, 0, 8), end: new Date(2026, 0, 21) },
  { name: "Jan 22, 2026 - Feb 04, 2026", start: new Date(2026, 0, 22), end: new Date(2026, 1, 4) },
  { name: "Feb 05, 2026 - Feb 18, 2026", start: new Date(2026, 1, 5), end: new Date(2026, 1, 18) },
  { name: "Feb 19, 2026 - Mar 04, 2026", start: new Date(2026, 1, 19), end: new Date(2026, 2, 4) },
  { name: "Mar 05, 2026 - Mar 18, 2026", start: new Date(2026, 2, 5), end: new Date(2026, 2, 18) },
  { name: "Mar 19, 2026 - Apr 01, 2026", start: new Date(2026, 2, 19), end: new Date(2026, 3, 1) },
  { name: "Apr 02, 2026 - Apr 15, 2026", start: new Date(2026, 3, 2), end: new Date(2026, 3, 15) },
  { name: "Apr 16, 2026 - Apr 29, 2026", start: new Date(2026, 3, 16), end: new Date(2026, 3, 29) },
  { name: "Apr 30, 2026 - May 13, 2026", start: new Date(2026, 3, 30), end: new Date(2026, 4, 13) },
  { name: "May 14, 2026 - May 27, 2026", start: new Date(2026, 4, 14), end: new Date(2026, 4, 27) },
  { name: "May 28, 2026 - Jun 10, 2026", start: new Date(2026, 4, 28), end: new Date(2026, 5, 10) },
  { name: "Jun 11, 2026 - Jun 24, 2026", start: new Date(2026, 5, 11), end: new Date(2026, 5, 24) },
  { name: "Jun 25, 2026 - Jul 08, 2026", start: new Date(2026, 5, 25), end: new Date(2026, 6, 8) },
  { name: "Jul 09, 2026 - Jul 22, 2026", start: new Date(2026, 6, 9), end: new Date(2026, 6, 22) },
  { name: "Jul 23, 2026 - Aug 05, 2026", start: new Date(2026, 6, 23), end: new Date(2026, 7, 5) },
  { name: "Aug 06, 2026 - Aug 19, 2026", start: new Date(2026, 7, 6), end: new Date(2026, 7, 19) },
  { name: "Aug 20, 2026 - Sep 02, 2026", start: new Date(2026, 7, 20), end: new Date(2026, 8, 2) },
  { name: "Sep 03, 2026 - Sep 16, 2026", start: new Date(2026, 8, 3), end: new Date(2026, 8, 16) },
  { name: "Sep 17, 2026 - Sep 30, 2026", start: new Date(2026, 8, 17), end: new Date(2026, 8, 30) },
  { name: "Oct 01, 2026 - Oct 14, 2026", start: new Date(2026, 9, 1), end: new Date(2026, 9, 14) },
  { name: "Oct 15, 2026 - Oct 28, 2026", start: new Date(2026, 9, 15), end: new Date(2026, 9, 28) },
  { name: "Oct 29, 2026 - Nov 11, 2026", start: new Date(2026, 9, 29), end: new Date(2026, 10, 11) },
  { name: "Nov 12, 2026 - Nov 25, 2026", start: new Date(2026, 10, 12), end: new Date(2026, 10, 25) },
  { name: "Nov 26, 2026 - Dec 09, 2026", start: new Date(2026, 10, 26), end: new Date(2026, 11, 9) },
  { name: "Dec 10, 2026 - Dec 23, 2026", start: new Date(2026, 11, 10), end: new Date(2026, 11, 23) },
  { name: "Dec 24, 2026 - Jan 06, 2027", start: new Date(2026, 11, 24), end: new Date(2027, 0, 6) },
  { name: "Jan 07, 2027 - Jan 20, 2027", start: new Date(2027, 0, 7), end: new Date(2027, 0, 20) },
];

// Get period names for dropdown
const PAY_PERIODS = PAY_PERIODS_DATA.map(p => p.name);

// Function to get current pay period based on today's date
const getCurrentPayPeriod = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  for (const period of PAY_PERIODS_DATA) {
    if (today >= period.start && today <= period.end) {
      return period.name;
    }
  }
  // If no match found, return the most recent past period or first future period
  for (let i = PAY_PERIODS_DATA.length - 1; i >= 0; i--) {
    if (today > PAY_PERIODS_DATA[i].end) {
      return PAY_PERIODS_DATA[i].name;
    }
  }
  return PAY_PERIODS_DATA[0].name;
};

// Mobile-friendly Summary KPI Card
const SummaryCard = ({ title, value, description, icon: Icon, prefix = "", suffix = "", highlight = false }) => (
  <Card 
    className={`bg-white border shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${highlight ? 'border-l-4' : 'border-gray-200'}`}
    style={{ borderLeftColor: highlight ? BRAND_COLORS.primary : undefined }}
    data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <CardContent className="p-3 sm:p-4 md:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <div className="p-1 sm:p-1.5 rounded-md flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: BRAND_COLORS.primary }} strokeWidth={2} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 font-heading truncate">
              {title}
            </p>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-mono font-semibold tracking-tight text-gray-900 mt-1 sm:mt-2">
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : value}{suffix}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2 leading-relaxed line-clamp-2">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Section Header - Mobile friendly
const SectionHeader = ({ title, description, icon: Icon }) => (
  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
    <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: BRAND_COLORS.primary }}>
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2} />
    </div>
    <div className="min-w-0">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 font-heading">{title}</h2>
      <p className="text-xs sm:text-sm text-gray-500 truncate">{description}</p>
    </div>
  </div>
);

// SPIFF Brand Card - Mobile friendly
const SpiffBrandCard = ({ brand, data, color }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
        <span className="font-semibold text-gray-700 text-sm sm:text-base truncate">{brand}</span>
      </div>
      <span className="text-[10px] sm:text-xs font-mono bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-gray-600 flex-shrink-0">
        {data.percent_of_sales}%
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <div>
        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Sales</p>
        <p className="text-base sm:text-lg font-mono font-semibold text-gray-900">{data.count}</p>
      </div>
      <div>
        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Commission</p>
        <p className="text-base sm:text-lg font-mono font-semibold" style={{ color: BRAND_COLORS.primary }}>${data.commission.toLocaleString()}</p>
      </div>
    </div>
  </div>
);

// Chart Card Container - Mobile friendly
const ChartCard = ({ title, description, children, icon: Icon }) => (
  <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
    <CardHeader className="pb-2 border-b border-gray-100 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" strokeWidth={1.5} />}
        <div className="min-w-0">
          <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700 font-heading">{title}</CardTitle>
          {description && <CardDescription className="text-[10px] sm:text-xs text-gray-400 truncate">{description}</CardDescription>}
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-3 sm:p-4 md:p-5">
      {children}
    </CardContent>
  </Card>
);

// Main Dashboard Component
function App() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [payPeriod, setPayPeriod] = useState(() => getCurrentPayPeriod()); // Auto-select current period
  const [kpiData, setKpiData] = useState(null);
  const [error, setError] = useState(null);
  const [excelUrl, setExcelUrl] = useState(DEFAULT_EXCEL_URL);
  const [tempExcelUrl, setTempExcelUrl] = useState(DEFAULT_EXCEL_URL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchDashboardData = useCallback(async (showToast = false, resetToCurrentPeriod = false) => {
    if (showToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    // On refresh, update to current pay period
    const currentPeriod = resetToCurrentPeriod ? getCurrentPayPeriod() : payPeriod;
    if (resetToCurrentPeriod && currentPeriod !== payPeriod) {
      setPayPeriod(currentPeriod);
    }

    try {
      await axios.post(`${API}/config/excel`, { excel_url: excelUrl });

      const params = { date_filter: dateFilter };
      // Use currentPeriod for the API call (handles refresh case)
      const periodToUse = resetToCurrentPeriod ? currentPeriod : payPeriod;
      if (periodToUse && periodToUse !== "all") {
        params.pay_period = periodToUse;
      }
      
      const response = await axios.get(`${API}/dashboard/kpis`, { params });
      setKpiData(response.data);
      
      if (showToast) {
        toast.success("Data Updated", {
          description: `${response.data.closed_deals} deals for current period`
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.detail || "Failed to load dashboard data");
      if (showToast) {
        toast.error("Update Failed");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter, payPeriod, excelUrl]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    // On manual refresh, reset to current pay period
    fetchDashboardData(true, true);
  };

  const handleSaveSettings = () => {
    setExcelUrl(tempExcelUrl);
    setSettingsOpen(false);
    toast.success("Excel URL Updated");
  };

  const handlePayPeriodChange = (value) => {
    setPayPeriod(value);
    if (value !== "all") setDateFilter("all");
  };

  const handleDateFilterChange = (value) => {
    setDateFilter(value);
    if (value !== "all") setPayPeriod("all");
  };

  // Prepare chart data
  const unitTypeData = kpiData?.unit_type_count 
    ? Object.entries(kpiData.unit_type_count).map(([name, value]) => ({
        name: name || 'Unknown',
        value,
        revenue: kpiData.unit_type_revenue?.[name] || 0
      }))
    : [];

  const statusData = kpiData?.status_distribution
    ? Object.entries(kpiData.status_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const monthlyData = kpiData?.monthly_data || [];

  const spiffChartData = kpiData?.spiff_breakdown
    ? Object.entries(kpiData.spiff_breakdown).map(([brand, data]) => ({
        name: brand,
        value: data.commission,
        count: data.count
      })).filter(item => item.value > 0)
    : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
      <Toaster position="top-center" />
      
      {/* Header - Mobile Responsive */}
      <header className="sticky top-0 z-10 shadow-md" style={{ backgroundColor: BRAND_COLORS.primary }}>
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 py-3 sm:py-4">
          {/* Desktop Header Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Logo + Title */}
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <img 
                src="https://www.fourseasonsheatingcooling.com/wp-content/uploads/2026/02/Four-Seasons-Logo_Current_2026_Four-Seasons_Logo_2026_Blue_Tagline-2048x531.png"
                alt="Four Seasons Heating & Cooling"
                className="h-8 sm:h-10 md:h-12 w-auto object-contain bg-white rounded px-2 py-1"
                data-testid="company-logo"
              />
              <div className="hidden sm:block min-w-0">
                <h1 className="text-sm md:text-lg lg:text-xl font-bold tracking-tight text-white font-heading truncate" data-testid="dashboard-title">
                  Benjamin S. Cardarelli
                </h1>
                <p className="text-xs text-white/80 truncate">
                  Sales Performance Dashboard
                </p>
              </div>
            </div>

            {/* Desktop Filters - Center */}
            <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-white/70" title="Commission payment based on installation dates">Pay Period (by Install Date)</Label>
                  <Select value={payPeriod} onValueChange={handlePayPeriodChange}>
                    <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white text-xs h-9">
                      <SelectValue placeholder="Select pay period" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">All Periods</SelectItem>
                      {PAY_PERIODS.map((period) => (
                        <SelectItem key={period} value={period} className="text-xs">{period}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-white/70">Quick Filter</Label>
                  <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                    <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white text-xs h-9">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="2weeks">2 Weeks</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons - Right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Mobile Title */}
              <div className="sm:hidden min-w-0 mr-2">
                <h1 className="text-sm font-bold tracking-tight text-white font-heading truncate" data-testid="dashboard-title-mobile">
                  B. Cardarelli
                </h1>
              </div>

              {/* Filters Toggle - Mobile only */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10 h-8 w-8"
                onClick={() => setFiltersOpen(!filtersOpen)}
                data-testid="filters-toggle"
              >
                <Menu className="w-4 h-4" />
              </Button>

              {/* Settings */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] mx-4">
                  <DialogHeader>
                    <DialogTitle>Data Source</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Google Sheet URL</Label>
                      <Input
                        value={tempExcelUrl}
                        onChange={(e) => setTempExcelUrl(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                    <Button onClick={handleSaveSettings} className="w-full" style={{ backgroundColor: BRAND_COLORS.primary }}>
                      Save
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Update Button */}
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="shadow-md rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold"
                style={{ backgroundColor: BRAND_COLORS.secondary }}
                data-testid="refresh-button"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''} sm:mr-2`} />
                <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Update'}</span>
              </Button>
            </div>
          </div>

          {/* Mobile Filters - Collapsible */}
          <div className={`${filtersOpen ? 'block' : 'hidden'} md:hidden mt-3 pt-3 border-t border-white/20`}>
            <p className="text-[9px] text-white/60 mb-2">* Pay Period filters commissions by installation date</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-white/70">Pay Period</Label>
                <Select value={payPeriod} onValueChange={handlePayPeriodChange}>
                  <SelectTrigger className="w-full bg-white/10 border-white/20 text-white text-xs h-8">
                    <SelectValue placeholder="By install date" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Periods</SelectItem>
                    {PAY_PERIODS.map((period) => (
                      <SelectItem key={period} value={period} className="text-xs">{period}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-white/70">Quick Filter</Label>
                <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                  <SelectTrigger className="w-full bg-white/10 border-white/20 text-white text-xs h-8">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="2weeks">2 Weeks</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Responsive */}
      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-3 sm:mb-4" style={{ color: BRAND_COLORS.primary }} />
              <p className="text-gray-500 text-sm sm:text-base">Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 text-center">
            <p className="text-red-600 font-medium text-sm sm:text-base">{error}</p>
            <Button onClick={handleRefresh} className="mt-3 sm:mt-4" variant="outline" size="sm">Try Again</Button>
          </div>
        ) : kpiData ? (
          <div className="space-y-6 sm:space-y-8">
            
            {/* SECTION 1: EXECUTIVE SUMMARY */}
            <section>
              <SectionHeader 
                title="Executive Summary" 
                description="Key performance indicators"
                icon={BarChart3}
              />
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                <SummaryCard
                  title="Total Revenue"
                  value={kpiData.total_revenue}
                  prefix="$"
                  icon={DollarSign}
                  description="Sum of all closed deals"
                  highlight={true}
                />
                <SummaryCard
                  title="Commission"
                  value={kpiData.total_commission}
                  prefix="$"
                  icon={BadgeDollarSign}
                  description="Total commission earned"
                  highlight={true}
                />
                <SummaryCard
                  title="Closed Deals"
                  value={kpiData.closed_deals}
                  icon={Target}
                  description="SALE status deals"
                />
                <SummaryCard
                  title="Closing Rate"
                  value={kpiData.closing_rate}
                  suffix="%"
                  icon={Percent}
                  description="Win rate"
                />
                <SummaryCard
                  title="Leads"
                  value={kpiData.total_visits}
                  icon={Users}
                  description="Total leads"
                />
                <SummaryCard
                  title="Avg Ticket"
                  value={kpiData.average_ticket}
                  prefix="$"
                  icon={ShoppingCart}
                  description="Per deal average"
                />
              </div>
            </section>

            {/* SECTION 2: FOLLOW-UPS */}
            {kpiData.follow_ups && kpiData.follow_ups.length > 0 && (
              <section>
                <SectionHeader 
                  title="Pending Follow-Ups" 
                  description="Action required"
                  icon={Phone}
                />
                
                <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">Priority</TableHead>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4">Name</TableHead>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">City</TableHead>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">Date</TableHead>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kpiData.follow_ups.slice(0, 8).map((followUp, index) => (
                          <TableRow 
                            key={index} 
                            className={`border-b border-gray-100 ${followUp.is_urgent ? 'bg-red-50' : ''}`}
                          >
                            <TableCell className="py-2 px-2 sm:px-4">
                              {followUp.is_urgent ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold" style={{ backgroundColor: '#FEE2E2', color: BRAND_COLORS.primary }}>
                                  <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  <span className="hidden xs:inline">URGENT</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </span>
                              )}
                            </TableCell>
                            <TableCell className={`py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium ${followUp.is_urgent ? 'text-red-700' : 'text-gray-700'}`}>
                              <span className="line-clamp-1">{followUp.name}</span>
                            </TableCell>
                            <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">{followUp.city}</TableCell>
                            <TableCell className={`py-2 px-2 sm:px-4 font-mono text-[10px] sm:text-xs ${followUp.is_urgent ? 'font-bold' : ''}`} style={{ color: followUp.is_urgent ? BRAND_COLORS.primary : '#4B5563' }}>
                              {followUp.follow_up_date}
                            </TableCell>
                            <TableCell className={`py-2 px-2 sm:px-4 font-mono text-[10px] sm:text-xs ${followUp.is_urgent ? 'font-bold' : ''}`} style={{ color: followUp.is_urgent ? BRAND_COLORS.primary : '#4B5563' }}>
                              {followUp.days_until !== null ? (
                                followUp.days_until < 0 ? `${Math.abs(followUp.days_until)}d ago` :
                                followUp.days_until === 0 ? 'Today' :
                                `${followUp.days_until}d`
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </section>
            )}

            {/* SECTION 2: UNDER BOOK PRICE */}
            <section>
              <SectionHeader 
                title="Under Book Price" 
                description="Sales at 5% commission rate"
                icon={Calculator}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                  <CardContent className="p-3 sm:p-4 md:p-5">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">Sales at 5%</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-mono font-bold text-gray-900">{kpiData.price_margin_sales_count}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                  <CardContent className="p-3 sm:p-4 md:p-5">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">Revenue</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-mono font-bold text-gray-900">${kpiData.price_margin_total.toLocaleString()}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0" style={{ background: `linear-gradient(135deg, ${BRAND_COLORS.primary}15, ${BRAND_COLORS.primary}25)` }}>
                  <CardContent className="p-3 sm:p-4 md:p-5">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      <BadgeDollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: BRAND_COLORS.primary }} />
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: BRAND_COLORS.primary }}>Commission</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-mono font-bold" style={{ color: BRAND_COLORS.primaryDark }}>${kpiData.price_margin_commission.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* SECTION 4: SPIFF COMMISSIONS */}
            <section>
              <SectionHeader 
                title="SPIFF Breakdown" 
                description="By product category"
                icon={Gift}
              />
              
              {/* SPIFF Total */}
              <Card className="border-0 mb-3 sm:mb-4" style={{ background: `linear-gradient(135deg, ${BRAND_COLORS.secondary}, ${BRAND_COLORS.primary})` }}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Total SPIFF</p>
                      <p className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-white">${kpiData.spiff_total.toLocaleString()}</p>
                    </div>
                    <Gift className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white/30" />
                  </div>
                </CardContent>
              </Card>

              {/* SPIFF by Brand */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                {Object.entries(kpiData.spiff_breakdown || {}).map(([brand, data]) => (
                  <SpiffBrandCard 
                    key={brand}
                    brand={brand}
                    data={data}
                    color={SPIFF_COLORS[brand] || '#94A3B8'}
                  />
                ))}
              </div>

              {/* SPIFF Chart - Hidden on very small screens */}
              {spiffChartData.length > 0 && (
                <div className="mt-3 sm:mt-4 hidden sm:block">
                  <ChartCard title="SPIFF Distribution" icon={PieIcon}>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={spiffChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {spiffChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SPIFF_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Commission']} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}
            </section>

            {/* SECTION 5: CHARTS */}
            <section>
              <SectionHeader 
                title="Sales Analysis" 
                description="Unit types & status"
                icon={TrendingUp}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                {/* Unit Type Distribution */}
                <ChartCard title="Unit Type Distribution" icon={PieIcon}>
                  {unitTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={unitTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {unitTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </ChartCard>

                {/* Revenue by Unit Type */}
                <ChartCard title="Revenue by Unit Type" icon={BarChart3}>
                  {unitTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={unitTypeData} layout="vertical">
                        <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                        <Bar dataKey="revenue" fill={BRAND_COLORS.primary} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </ChartCard>
              </div>
            </section>

            {/* SECTION 6: TRENDS */}
            <section>
              <SectionHeader 
                title="Performance Trends" 
                description="Status & monthly revenue"
                icon={Award}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                {/* Deal Status */}
                <ChartCard title="Deal Status" icon={Target}>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={statusData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {statusData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'SALE' ? '#4CAF50' : entry.name === 'LOST' ? BRAND_COLORS.primary : '#FF9800'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </ChartCard>

                {/* Monthly Revenue Trend */}
                <ChartCard title="Monthly Revenue" icon={TrendingUp}>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={BRAND_COLORS.primary} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={BRAND_COLORS.primary} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month_short" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                        <Area type="monotone" dataKey="revenue" stroke={BRAND_COLORS.primary} fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </ChartCard>
              </div>
            </section>

            {/* SECTION 7: RECORDS TABLE */}
            <section>
              <SectionHeader 
                title="Recent Sales" 
                description="Transaction details"
                icon={Calendar}
              />
              
              <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow style={{ backgroundColor: BRAND_COLORS.accent }}>
                        <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4">Name</TableHead>
                        <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">City</TableHead>
                        <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4">Unit</TableHead>
                        <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4">Value</TableHead>
                        <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4 hidden md:table-cell">Comm</TableHead>
                        <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpiData.records?.slice(0, 10).map((record, index) => (
                        <TableRow key={index} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <TableCell className="py-2 px-2 sm:px-4 font-medium text-gray-700 text-xs sm:text-sm">
                            <span className="line-clamp-1">{record.name}</span>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-gray-600 text-xs sm:text-sm hidden sm:table-cell">{record.city}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 text-gray-600 text-[10px] sm:text-xs">
                            <span className="line-clamp-1">{record.unit_type}</span>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 font-mono text-gray-700 text-xs sm:text-sm">
                            {record.ticket_value > 0 ? `$${(record.ticket_value/1000).toFixed(1)}k` : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4 font-mono text-xs sm:text-sm hidden md:table-cell" style={{ color: BRAND_COLORS.primary }}>
                            {record.commission_value > 0 ? `$${record.commission_value.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-4">
                            <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                              record.status === 'SALE' ? 'bg-green-100 text-green-800' :
                              record.status === 'LOST' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {record.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </section>

          </div>
        ) : null}
      </main>

      {/* Footer - Mobile Responsive */}
      <footer className="py-3 sm:py-4 mt-6 sm:mt-8" style={{ backgroundColor: BRAND_COLORS.secondary }}>
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8">
          <p className="text-[10px] sm:text-xs text-white/60 text-center">
            © {new Date().getFullYear()} Four Seasons Heating & Cooling
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
