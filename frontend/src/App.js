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

// KPI Card Component
const KPICard = ({ title, value, icon: Icon, suffix = "", prefix = "", trend = null, highlight = false }) => (
  <Card 
    className={`bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${highlight ? 'border-l-4 border-l-blue-600' : ''}`}
    data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 font-heading">
            {title}
          </p>
          <p className="text-3xl font-mono font-medium tracking-tighter text-slate-900">
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : value}{suffix}
          </p>
          {trend !== null && (
            <p className={`text-xs mt-2 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? '+' : ''}{trend}% vs last period
            </p>
          )}
        </div>
        <div className="p-3 bg-slate-100 rounded-lg">
          <Icon className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
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
  const [kpiData, setKpiData] = useState(null);
  const [error, setError] = useState(null);

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
        excel_url: DEFAULT_EXCEL_URL
      });

      // Then fetch KPIs
      const response = await axios.get(`${API}/dashboard/kpis`, {
        params: { date_filter: dateFilter }
      });

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
  }, [dateFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData(true);
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

  const monthlyData = kpiData?.monthly_data?.filter(m => m.revenue > 0 || m.deals > 0) || [];

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-heading" data-testid="dashboard-title">
                Sales Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                HVAC Sales Performance Analytics
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter} data-testid="date-filter">
                <SelectTrigger className="w-[180px] bg-white border-slate-200 text-sm">
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

              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm rounded-lg px-4 py-2 text-sm font-medium transition-colors"
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
      <main className="max-w-[1600px] mx-auto px-6 md:px-10 py-8">
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
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="kpi-grid">
              <KPICard
                title="Total Revenue"
                value={kpiData.total_revenue}
                prefix="$"
                icon={DollarSign}
                highlight={true}
              />
              <KPICard
                title="Total Commission"
                value={kpiData.total_commission}
                prefix="$"
                icon={TrendingUp}
              />
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
              <ChartCard title="Unit Type Distribution" icon={PieIcon}>
                {unitTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={unitTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
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
                  <div className="h-[300px] flex items-center justify-center text-slate-400">
                    No unit type data available
                  </div>
                )}
              </ChartCard>

              {/* Unit Type Revenue */}
              <ChartCard title="Revenue by Unit Type" icon={BarChart3}>
                {unitTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={unitTypeData} layout="vertical">
                      <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
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
                  <div className="h-[300px] flex items-center justify-center text-slate-400">
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
                  <ResponsiveContainer width="100%" height={250}>
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
                  <div className="h-[250px] flex items-center justify-center text-slate-400">
                    No status data available
                  </div>
                )}
              </ChartCard>

              {/* Monthly Revenue Trend */}
              <ChartCard title="Monthly Revenue Trend" icon={TrendingUp}>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
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
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-slate-400">
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
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-4">Name</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-4">City</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-4">Unit Type</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-4">Value</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 px-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpiData.records?.slice(0, 10).map((record, index) => (
                      <TableRow key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="py-3 px-4 font-medium text-slate-700">{record.name}</TableCell>
                        <TableCell className="py-3 px-4 text-slate-600">{record.city}</TableCell>
                        <TableCell className="py-3 px-4 text-slate-600">{record.unit_type}</TableCell>
                        <TableCell className="py-3 px-4 font-mono text-slate-700">
                          {record.ticket_value > 0 ? `$${record.ticket_value.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <p className="text-xs text-slate-400 text-center">
            Sales Dashboard - Data loaded from Excel file. Click refresh to update.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
