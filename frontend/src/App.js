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

// Default Excel URL - SharePoint link
const DEFAULT_EXCEL_URL = "https://cloudsynergys-my.sharepoint.com/:x:/g/personal/antoniosanchez_cloudsynergys_onmicrosoft_com/IQD8bj0HqQI2R6bpHxKBdqTGATXx35YklsARZFcwgsfRvvs";

// Chart colors
const CHART_COLORS = ["#0F172A", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];
const SPIFF_COLORS = {
  'APCO X': '#3B82F6',
  'Samsung': '#10B981',
  'Mitsubishi': '#F59E0B',
  'Other': '#94A3B8'
};

// Pay periods (bi-weekly)
const PAY_PERIODS = [
  "Dec 25, 2025 - Jan 07, 2026",
  "Jan 08, 2026 - Jan 21, 2026",
  "Jan 22, 2026 - Feb 04, 2026",
  "Feb 05, 2026 - Feb 18, 2026",
  "Feb 19, 2026 - Mar 04, 2026",
  "Mar 05, 2026 - Mar 18, 2026",
  "Mar 19, 2026 - Apr 01, 2026",
  "Apr 02, 2026 - Apr 15, 2026",
  "Apr 16, 2026 - Apr 29, 2026",
  "Apr 30, 2026 - May 13, 2026",
  "May 14, 2026 - May 27, 2026",
  "May 28, 2026 - Jun 10, 2026",
  "Jun 11, 2026 - Jun 24, 2026",
  "Jun 25, 2026 - Jul 08, 2026",
  "Jul 09, 2026 - Jul 22, 2026",
  "Jul 23, 2026 - Aug 05, 2026",
  "Aug 06, 2026 - Aug 19, 2026",
  "Aug 20, 2026 - Sep 02, 2026",
  "Sep 03, 2026 - Sep 16, 2026",
  "Sep 17, 2026 - Sep 30, 2026",
  "Oct 01, 2026 - Oct 14, 2026",
  "Oct 15, 2026 - Oct 28, 2026",
  "Oct 29, 2026 - Nov 11, 2026",
  "Nov 12, 2026 - Nov 25, 2026",
  "Nov 26, 2026 - Dec 09, 2026",
  "Dec 10, 2026 - Dec 23, 2026",
  "Dec 24, 2026 - Jan 06, 2027",
  "Jan 07, 2027 - Jan 20, 2027",
];

// Summary KPI Card with description
const SummaryCard = ({ title, value, description, icon: Icon, prefix = "", suffix = "", highlight = false }) => (
  <Card 
    className={`bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${highlight ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
    data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-slate-100 rounded-md">
              <Icon className="w-3.5 h-3.5 text-slate-600" strokeWidth={2} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
              {title}
            </p>
          </div>
          <p className="text-2xl lg:text-3xl font-mono font-semibold tracking-tight text-slate-900 mt-2">
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : value}{suffix}
          </p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Section Header
const SectionHeader = ({ title, description, icon: Icon }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 bg-slate-900 rounded-lg">
      <Icon className="w-5 h-5 text-white" strokeWidth={2} />
    </div>
    <div>
      <h2 className="text-lg font-bold text-slate-900 font-heading">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  </div>
);

// SPIFF Brand Card
const SpiffBrandCard = ({ brand, data, color }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
        <span className="font-semibold text-slate-700">{brand}</span>
      </div>
      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded-full text-slate-600">
        {data.percent_of_sales}% of sales
      </span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider">Sales</p>
        <p className="text-lg font-mono font-semibold text-slate-900">{data.count}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider">Commission</p>
        <p className="text-lg font-mono font-semibold text-emerald-600">${data.commission.toLocaleString()}</p>
      </div>
    </div>
  </div>
);

// Chart Card Container
const ChartCard = ({ title, description, children, icon: Icon }) => (
  <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
    <CardHeader className="pb-2 border-b border-slate-100">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-500" strokeWidth={1.5} />}
        <div>
          <CardTitle className="text-sm font-semibold text-slate-700 font-heading">{title}</CardTitle>
          {description && <CardDescription className="text-xs text-slate-400">{description}</CardDescription>}
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-5">
      {children}
    </CardContent>
  </Card>
);

// Main Dashboard Component
function App() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [payPeriod, setPayPeriod] = useState("all");
  const [kpiData, setKpiData] = useState(null);
  const [error, setError] = useState(null);
  const [excelUrl, setExcelUrl] = useState(DEFAULT_EXCEL_URL);
  const [tempExcelUrl, setTempExcelUrl] = useState(DEFAULT_EXCEL_URL);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchDashboardData = useCallback(async (showToast = false) => {
    if (showToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      await axios.post(`${API}/config/excel`, { excel_url: excelUrl });

      const params = { date_filter: dateFilter };
      if (payPeriod && payPeriod !== "all") {
        params.pay_period = payPeriod;
      }
      
      const response = await axios.get(`${API}/dashboard/kpis`, { params });
      setKpiData(response.data);
      
      if (showToast) {
        toast.success("Data Updated Successfully", {
          description: `${response.data.closed_deals} closed deals loaded from Excel`
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.detail || "Failed to load dashboard data");
      if (showToast) {
        toast.error("Update Failed", {
          description: err.response?.data?.detail || "Please try again"
        });
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
    fetchDashboardData(true);
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

  // SPIFF breakdown data for chart
  const spiffChartData = kpiData?.spiff_breakdown
    ? Object.entries(kpiData.spiff_breakdown).map(([brand, data]) => ({
        name: brand,
        value: data.commission,
        count: data.count
      })).filter(item => item.value > 0)
    : [];

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-slate-900 font-heading" data-testid="dashboard-title">
                Sales Performance Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                HVAC Sales Analytics & Commission Tracking
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Pay Period Filter */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 font-medium">Pay Period</Label>
                <Select value={payPeriod} onValueChange={handlePayPeriodChange}>
                  <SelectTrigger className="w-[200px] bg-white border-slate-200 text-sm">
                    <SelectValue placeholder="Select pay period" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Pay Periods</SelectItem>
                    {PAY_PERIODS.map((period) => (
                      <SelectItem key={period} value={period}>{period}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Filter */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 font-medium">Quick Filter</Label>
                <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                  <SelectTrigger className="w-[130px] bg-white border-slate-200 text-sm">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Settings */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="mt-5">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Data Source Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Excel File URL</Label>
                      <Input
                        value={tempExcelUrl}
                        onChange={(e) => setTempExcelUrl(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                    <Button onClick={handleSaveSettings} className="w-full">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Update Button */}
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-blue-600 text-white hover:bg-blue-700 shadow-md rounded-lg px-6 py-2 text-sm font-semibold mt-5"
                data-testid="refresh-button"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Updating...' : 'Update Data'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Loading dashboard data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <Button onClick={handleRefresh} className="mt-4" variant="outline">Try Again</Button>
          </div>
        ) : kpiData ? (
          <div className="space-y-8">
            
            {/* ==================== SECTION 1: EXECUTIVE SUMMARY ==================== */}
            <section>
              <SectionHeader 
                title="Executive Summary" 
                description="Key performance indicators at a glance"
                icon={BarChart3}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <SummaryCard
                  title="Total Revenue"
                  value={kpiData.total_revenue}
                  prefix="$"
                  icon={DollarSign}
                  description="Sum of Ticket Value for all closed deals"
                  highlight={true}
                />
                <SummaryCard
                  title="Total Commission"
                  value={kpiData.total_commission}
                  prefix="$"
                  icon={BadgeDollarSign}
                  description="Sum of Commission Value for all SALE rows"
                  highlight={true}
                />
                <SummaryCard
                  title="Closed Deals"
                  value={kpiData.closed_deals}
                  icon={Target}
                  description="Total number of deals with SALE status"
                />
                <SummaryCard
                  title="Closing Rate"
                  value={kpiData.closing_rate}
                  suffix="%"
                  icon={Percent}
                  description="Closed deals / Total opportunities"
                />
                <SummaryCard
                  title="Total Visits"
                  value={kpiData.total_visits}
                  icon={Users}
                  description="Number of customer visits made"
                />
                <SummaryCard
                  title="Average Ticket"
                  value={kpiData.average_ticket}
                  prefix="$"
                  icon={ShoppingCart}
                  description="Total Revenue / Closed Deals"
                />
              </div>
            </section>

            {/* ==================== SECTION 2: FOLLOW-UPS ==================== */}
            {kpiData.follow_ups && kpiData.follow_ups.length > 0 && (
              <section>
                <SectionHeader 
                  title="Pending Follow-Ups" 
                  description="Customers requiring follow-up action, sorted by urgency"
                  icon={Phone}
                />
                
                <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Priority</TableHead>
                          <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Name</TableHead>
                          <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">City</TableHead>
                          <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Status</TableHead>
                          <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Follow-Up Date</TableHead>
                          <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Days Until</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kpiData.follow_ups.slice(0, 10).map((followUp, index) => (
                          <TableRow 
                            key={index} 
                            className={`border-b border-slate-100 ${followUp.is_urgent ? 'bg-red-50' : 'hover:bg-slate-50/50'}`}
                          >
                            <TableCell className="py-2 px-4">
                              {followUp.is_urgent ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                  <AlertTriangle className="w-3 h-3" />
                                  URGENT
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                  <Clock className="w-3 h-3" />
                                  Normal
                                </span>
                              )}
                            </TableCell>
                            <TableCell className={`py-2 px-4 font-medium ${followUp.is_urgent ? 'text-red-700' : 'text-slate-700'}`}>
                              {followUp.name}
                            </TableCell>
                            <TableCell className="py-2 px-4 text-slate-600">{followUp.city}</TableCell>
                            <TableCell className="py-2 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                followUp.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {followUp.status}
                              </span>
                            </TableCell>
                            <TableCell className={`py-2 px-4 font-mono ${followUp.is_urgent ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                              {followUp.follow_up_date}
                            </TableCell>
                            <TableCell className={`py-2 px-4 font-mono ${followUp.is_urgent ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                              {followUp.days_until !== null ? (
                                followUp.days_until < 0 ? `${Math.abs(followUp.days_until)} days overdue` :
                                followUp.days_until === 0 ? 'Today!' :
                                `${followUp.days_until} days`
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

            {/* ==================== SECTION 3: PRICE MARGIN (5%) ==================== */}
            <section>
              <SectionHeader 
                title="Price Margin Analysis" 
                description="Sales and commissions at the standard 5% rate only"
                icon={Calculator}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingCart className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales at 5%</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-900">{kpiData.price_margin_sales_count}</p>
                    <p className="text-xs text-slate-400 mt-2">Number of deals with exactly 5% commission rate</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Revenue at 5%</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-slate-900">${kpiData.price_margin_total.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-2">Total ticket value from 5% commission sales</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Commission at 5%</span>
                    </div>
                    <p className="text-3xl font-mono font-bold text-emerald-700">${kpiData.price_margin_commission.toLocaleString()}</p>
                    <p className="text-xs text-emerald-600 mt-2">Commission earned from 5% rate sales</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ==================== SECTION 4: SPIFF COMMISSIONS ==================== */}
            <section>
              <SectionHeader 
                title="SPIFF Commission Breakdown" 
                description="Bonus commissions by brand partner (APCO X, Samsung, Mitsubishi)"
                icon={Gift}
              />
              
              {/* SPIFF Total */}
              <Card className="bg-gradient-to-r from-violet-600 to-purple-600 border-0 mb-4">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-200 text-xs font-bold uppercase tracking-wider mb-1">Total SPIFF Commission</p>
                      <p className="text-4xl font-mono font-bold text-white">${kpiData.spiff_total.toLocaleString()}</p>
                      <p className="text-violet-200 text-xs mt-2">Combined bonus commissions from all brand partners</p>
                    </div>
                    <Gift className="w-12 h-12 text-violet-300 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              {/* SPIFF by Brand */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(kpiData.spiff_breakdown || {}).map(([brand, data]) => (
                  <SpiffBrandCard 
                    key={brand}
                    brand={brand}
                    data={data}
                    color={SPIFF_COLORS[brand] || '#94A3B8'}
                  />
                ))}
                {Object.keys(kpiData.spiff_breakdown || {}).length === 0 && (
                  <div className="col-span-4 text-center py-8 text-slate-400">
                    No SPIFF commissions recorded. Ensure your Excel has APCO X, Samsung, and Mitsubishi columns.
                  </div>
                )}
              </div>

              {/* SPIFF Distribution Chart */}
              {spiffChartData.length > 0 && (
                <div className="mt-4">
                  <ChartCard title="SPIFF Distribution" description="Commission share by brand partner" icon={PieIcon}>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={spiffChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                        >
                          {spiffChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SPIFF_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Commission']}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}
            </section>

            {/* ==================== SECTION 5: SALES ANALYSIS ==================== */}
            <section>
              <SectionHeader 
                title="Sales Analysis" 
                description="Breakdown by unit type and status"
                icon={TrendingUp}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Unit Type Distribution */}
                <ChartCard title="Unit Type Distribution" description="Number of sales by equipment type" icon={PieIcon}>
                  {unitTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={unitTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {unitTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-slate-400">No data</div>
                  )}
                </ChartCard>

                {/* Revenue by Unit Type */}
                <ChartCard title="Revenue by Unit Type" description="Total revenue generated per equipment type" icon={BarChart3}>
                  {unitTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={unitTypeData} layout="vertical">
                        <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                        />
                        <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-slate-400">No data</div>
                  )}
                </ChartCard>
              </div>
            </section>

            {/* ==================== SECTION 6: PERFORMANCE TRENDS ==================== */}
            <section>
              <SectionHeader 
                title="Performance Trends" 
                description="Deal status and monthly revenue progression"
                icon={Award}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Deal Status */}
                <ChartCard title="Deal Status" description="Distribution of all opportunities" icon={Target}>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={statusData}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {statusData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'SALE' ? '#10B981' : entry.name === 'LOST' ? '#EF4444' : '#F59E0B'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[240px] flex items-center justify-center text-slate-400">No data</div>
                  )}
                </ChartCard>

                {/* Monthly Revenue Trend */}
                <ChartCard title="Monthly Revenue Trend" description="Revenue progression from oldest to newest month" icon={TrendingUp}>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month_short" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.month || label}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[240px] flex items-center justify-center text-slate-400">No data</div>
                  )}
                </ChartCard>
              </div>
            </section>

            {/* ==================== SECTION 7: DETAILED RECORDS ==================== */}
            <section>
              <SectionHeader 
                title="Recent Sales Records" 
                description="Detailed view of individual transactions"
                icon={Calendar}
              />
              
              <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Name</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">City</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Unit Type</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Ticket Value</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Comm %</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Commission</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">SPIFF</TableHead>
                        <TableHead className="text-xs font-bold uppercase text-slate-500 py-3 px-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpiData.records?.slice(0, 15).map((record, index) => (
                        <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="py-2 px-4 font-medium text-slate-700 text-sm">{record.name}</TableCell>
                          <TableCell className="py-2 px-4 text-slate-600 text-sm">{record.city}</TableCell>
                          <TableCell className="py-2 px-4 text-slate-600 text-sm">{record.unit_type}</TableCell>
                          <TableCell className="py-2 px-4 font-mono text-slate-700 text-sm">
                            {record.ticket_value > 0 ? `$${record.ticket_value.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-4 font-mono text-slate-600 text-sm">
                            {record.commission_percent > 0 ? `${record.commission_percent}%` : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-4 font-mono text-emerald-600 text-sm">
                            {record.commission_value > 0 ? `$${record.commission_value.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-4 font-mono text-violet-600 text-sm">
                            {record.spif_total > 0 ? `$${record.spif_total.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'SALE' ? 'bg-emerald-100 text-emerald-800' :
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <p className="text-xs text-slate-400 text-center">
            Sales Performance Dashboard - Connected to SharePoint. Click <strong>"Update Data"</strong> to refresh.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
