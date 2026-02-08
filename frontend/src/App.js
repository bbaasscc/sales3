import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock,
  PieChart as PieIcon,
  BarChart3,
  Settings,
  Gift,
  Calculator,
  Calendar,
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

// Default Excel URL
const DEFAULT_EXCEL_URL = "https://customer-assets.emergentagent.com/job_sales-dashboard-321/artifacts/xdsih8ll_Stats_FSHAC_v22%20%284%29.xlsx";

// Chart colors from design guidelines
const CHART_COLORS = ["#0F172A", "#3B82F6", "#94A3B8", "#CBD5E1", "#64748B"];

// Pay periods for commission (bi-weekly)
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

// KPI Card Component
const KPICard = ({ title, value, icon: Icon, suffix = "", prefix = "", trend = null, highlight = false, subtext = null }) => (
  <Card 
    className={`bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${highlight ? 'border-l-4 border-l-blue-600' : ''}`}
    data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 font-heading">
            {title}
          </p>
          <p className="text-2xl lg:text-3xl font-mono font-medium tracking-tighter text-slate-900">
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : value}{suffix}
          </p>
          {subtext && (
            <p className="text-xs text-slate-500 mt-1">{subtext}</p>
          )}
          {trend !== null && (
            <p className={`text-xs mt-2 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? '+' : ''}{trend}% vs last period
            </p>
          )}
        </div>
        <div className="p-2 bg-slate-100 rounded-lg">
          <Icon className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Chart Card Container
const ChartCard = ({ title, children, icon: Icon }) => (
  <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
    <CardHeader className="pb-2 border-b border-slate-100">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-semibold text-slate-700 font-heading flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-slate-500" strokeWidth={1.5} />}
          {title}
        </CardTitle>
      </div>
    </CardHeader>
    <CardContent className="p-6">
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
      // First, set the Excel URL
      await axios.post(`${API}/config/excel`, {
        excel_url: excelUrl
      });

      // Then fetch KPIs with pay period filter
      const params = { date_filter: dateFilter };
      if (payPeriod && payPeriod !== "all") {
        params.pay_period = payPeriod;
      }
      
      const response = await axios.get(`${API}/dashboard/kpis`, { params });

      setKpiData(response.data);
      
      if (showToast) {
        toast.success("Data refreshed successfully", {
          description: `${response.data.records?.length || 0} records loaded`
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.detail || "Failed to load dashboard data");
      if (showToast) {
        toast.error("Failed to refresh data", {
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
    toast.success("Excel URL updated", {
      description: "Click Refresh to load data from new source"
    });
  };

  // Reset date filter when pay period is selected
  const handlePayPeriodChange = (value) => {
    setPayPeriod(value);
    if (value !== "all") {
      setDateFilter("all");
    }
  };

  // Reset pay period when date filter is selected
  const handleDateFilterChange = (value) => {
    setDateFilter(value);
    if (value !== "all") {
      setPayPeriod("all");
    }
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
    ? Object.entries(kpiData.status_distribution).map(([name, value]) => ({
        name,
        value
      }))
    : [];

  // Monthly data is now already sorted chronologically from backend
  const monthlyData = kpiData?.monthly_data || [];

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-slate-900 font-heading" data-testid="dashboard-title">
                Sales Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                HVAC Sales Performance Analytics
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Pay Period Filter */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 font-medium">Pay Period (Install Date)</Label>
                <Select value={payPeriod} onValueChange={handlePayPeriodChange} data-testid="pay-period-filter">
                  <SelectTrigger className="w-[220px] bg-white border-slate-200 text-sm">
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

              {/* Date Filter */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 font-medium">Quick Filter</Label>
                <Select value={dateFilter} onValueChange={handleDateFilterChange} data-testid="date-filter">
                  <SelectTrigger className="w-[140px] bg-white border-slate-200 text-sm">
                    <SelectValue placeholder="Select period" />
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

              {/* Settings Button */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="mt-5">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Data Source Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="excel-url">Excel File URL</Label>
                      <Input
                        id="excel-url"
                        value={tempExcelUrl}
                        onChange={(e) => setTempExcelUrl(e.target.value)}
                        placeholder="Enter Excel file URL"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">How to connect OneDrive/SharePoint:</h4>
                      <ol className="text-sm text-blue-700 space-y-2 list-decimal ml-4">
                        <li>Open your Excel file in OneDrive/SharePoint</li>
                        <li>Click <strong>"Share"</strong> button</li>
                        <li>Select <strong>"Anyone with the link can view"</strong></li>
                        <li>Click <strong>"Copy link"</strong></li>
                        <li>Modify the link: replace <code className="bg-blue-100 px-1">?e=xxxxx</code> with <code className="bg-blue-100 px-1">?download=1</code></li>
                        <li>Paste the modified URL here</li>
                      </ol>
                      <p className="text-xs text-blue-600 mt-3">
                        Example: <code className="bg-blue-100 px-1 break-all">https://xxx-my.sharepoint.com/:x:/g/personal/xxx/xxx?download=1</code>
                      </p>
                    </div>
                    <Button onClick={handleSaveSettings} className="w-full">
                      Save Settings
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm rounded-lg px-4 py-2 text-sm font-medium transition-colors mt-5"
                data-testid="refresh-button"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-state">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">Loading dashboard data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center" data-testid="error-state">
            <p className="text-red-600 font-medium">{error}</p>
            <Button onClick={handleRefresh} className="mt-4" variant="outline">
              Try Again
            </Button>
          </div>
        ) : kpiData ? (
          <div className="space-y-6">
            {/* Active Filter Indicator */}
            {(payPeriod !== "all" || dateFilter !== "all") && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Filtering by: <strong>{payPeriod !== "all" ? payPeriod : `Last ${dateFilter}`}</strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setPayPeriod("all"); setDateFilter("all"); }}
                  className="ml-auto text-blue-600 hover:text-blue-800"
                >
                  Clear Filter
                </Button>
              </div>
            )}

            {/* KPI Cards Grid - Row 1: Revenue & Commission */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-testid="kpi-grid">
              <KPICard
                title="Total Revenue"
                value={kpiData.total_revenue}
                prefix="$"
                icon={DollarSign}
                highlight={true}
              />
              <KPICard
                title="Commission (5%)"
                value={kpiData.total_commission}
                prefix="$"
                icon={Calculator}
              />
              <KPICard
                title="SPIFF Commission"
                value={kpiData.spiff_commission}
                prefix="$"
                icon={Gift}
              />
              <KPICard
                title="Total Commission"
                value={kpiData.total_commission_with_spiff}
                prefix="$"
                icon={TrendingUp}
                highlight={true}
                subtext="Commission + SPIFF"
              />
              <KPICard
                title="Avg Commission %"
                value={kpiData.avg_commission_percent}
                suffix="%"
                icon={Percent}
              />
            </div>

            {/* KPI Cards Grid - Row 2: Deals & Performance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Closed Deals"
                value={kpiData.closed_deals}
                icon={Target}
                highlight={true}
              />
              <KPICard
                title="Closing Rate"
                value={kpiData.closing_rate}
                suffix="%"
                icon={Percent}
              />
              <KPICard
                title="Average Ticket"
                value={kpiData.average_ticket}
                prefix="$"
                icon={DollarSign}
              />
              <KPICard
                title="Total Visits"
                value={kpiData.total_visits}
                icon={Users}
              />
            </div>

            {/* KPI Cards Grid - Row 3: Cycle & Margin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard
                title="Avg Sales Cycle"
                value={kpiData.avg_sales_cycle_days}
                suffix=" days"
                icon={Clock}
              />
              <KPICard
                title="Price Margin (5%)"
                value={kpiData.price_margin}
                prefix="$"
                icon={Percent}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unit Type Distribution */}
              <ChartCard title="Unit Type Distribution (Count)" icon={PieIcon}>
                {unitTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={unitTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {unitTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [value, 'Count']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontFamily: 'JetBrains Mono'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-slate-400">
                    No unit type data available
                  </div>
                )}
              </ChartCard>

              {/* Unit Type Revenue */}
              <ChartCard title="Revenue by Unit Type" icon={BarChart3}>
                {unitTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={unitTypeData} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontFamily: 'JetBrains Mono'
                        }}
                      />
                      <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-slate-400">
                    No revenue data available
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Status Distribution & Monthly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Deal Status */}
              <ChartCard title="Deal Status Distribution" icon={Target}>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={statusData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontFamily: 'JetBrains Mono'
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {statusData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.name === 'SALE' ? '#10B981' : 
                              entry.name === 'LOST' ? '#EF4444' : 
                              '#F59E0B'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-slate-400">
                    No status data available
                  </div>
                )}
              </ChartCard>

              {/* Monthly Revenue Trend - Chronological Order */}
              <ChartCard title="Monthly Revenue Trend (Chronological)" icon={TrendingUp}>
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
                        formatter={(value, name) => [`$${value.toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Commission']}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.month || label}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontFamily: 'JetBrains Mono'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3B82F6" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        strokeWidth={2}
                        name="revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-slate-400">
                    No monthly data available
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Recent Sales Table */}
            <ChartCard title="Recent Sales Records">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-3">Name</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-3">City</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-3">Unit Type</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-3">Value</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-3">Comm %</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-3">SPIFF</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-3">Install Date</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-3">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpiData.records?.slice(0, 15).map((record, index) => (
                      <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-2 px-3 font-medium text-slate-700 text-sm">{record.name}</TableCell>
                        <TableCell className="py-2 px-3 text-slate-600 text-sm">{record.city}</TableCell>
                        <TableCell className="py-2 px-3 text-slate-600 text-sm">{record.unit_type}</TableCell>
                        <TableCell className="py-2 px-3 font-mono text-slate-700 text-sm">
                          {record.ticket_value > 0 ? `$${record.ticket_value.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="py-2 px-3 font-mono text-slate-600 text-sm">
                          {record.commission_percent > 0 ? `${record.commission_percent}%` : '-'}
                        </TableCell>
                        <TableCell className="py-2 px-3 font-mono text-slate-600 text-sm">
                          {record.spif_commission > 0 ? `$${record.spif_commission.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-slate-600 text-sm">{record.install_date || '-'}</TableCell>
                        <TableCell className="py-2 px-3">
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
            </ChartCard>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <p className="text-xs text-slate-400 text-center">
            Sales Dashboard - Click Settings (gear icon) to connect your OneDrive/SharePoint Excel file. Click Refresh to update data.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
