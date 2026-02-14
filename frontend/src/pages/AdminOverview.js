import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users, DollarSign, Target, Percent, TrendingUp, BarChart3,
  ArrowUpRight, ArrowDownRight, Award, Briefcase,
} from "lucide-react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CHART_COLORS = ["#C62828", "#1E3A5F", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4"];

export default function AdminOverview({ token, onFilterSalesperson }) {
  const [comparison, setComparison] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/comparison`, { headers });
      setComparison(res.data.comparison || []);
      setTotals(res.data.totals || {});
    } catch (err) {
      toast.error("Error loading overview");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]"><p className="text-gray-400">Loading...</p></div>;
  }

  const revenueChart = comparison.map((sp, i) => ({
    name: sp.name.split(' ')[0],
    revenue: sp.total_revenue,
    commission: sp.total_commission,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const dealsChart = comparison.map((sp, i) => ({
    name: sp.name.split(' ')[0],
    leads: sp.total_leads,
    closed: sp.closed_deals,
    lost: sp.total_leads - sp.closed_deals,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const statusPie = [
    { name: 'Closed', value: totals.closed_deals || 0, color: '#22C55E' },
    { name: 'Pending', value: (totals.total_leads || 0) - (totals.closed_deals || 0) - (totals.lost_deals || 0), color: '#F59E0B' },
    { name: 'Lost', value: totals.lost_deals || 0, color: '#EF4444' },
  ].filter(s => s.value > 0);

  // Best performer
  const topSeller = [...comparison].sort((a, b) => b.total_revenue - a.total_revenue)[0];

  return (
    <div className="space-y-6">
      {/* Global KPI Cards */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <BarChart3 className="w-6 h-6 text-white/80" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white" data-testid="admin-overview-title">Company Overview</h2>
              <p className="text-xs text-white/60">{comparison.length} active salespeople</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Revenue", value: `$${(totals.total_revenue || 0).toLocaleString('en-US', {minimumFractionDigits: 0})}`, icon: DollarSign, accent: '#22C55E' },
              { label: "Commission", value: `$${(totals.total_commission || 0).toLocaleString('en-US', {minimumFractionDigits: 0})}`, icon: DollarSign, accent: '#10B981' },
              { label: "Closed Deals", value: totals.closed_deals || 0, icon: Target, accent: '#3B82F6' },
              { label: "Total Leads", value: totals.total_leads || 0, icon: Users, accent: '#F59E0B' },
              { label: "Closing Rate", value: `${totals.closing_rate || 0}%`, icon: Percent, accent: '#8B5CF6' },
            ].map((item, i) => (
              <Card key={i} className="bg-white/10 border-0 backdrop-blur-sm">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.accent + '22' }}>
                      <item.icon className="w-3.5 h-3.5" style={{ color: item.accent }} />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{item.label}</p>
                  <p className="text-xl sm:text-2xl font-mono font-bold text-white mt-0.5">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performer Highlight */}
      {topSeller && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Top Performer:</strong> {topSeller.name} — ${topSeller.total_revenue.toLocaleString()} revenue, {topSeller.closing_rate}% closing rate
          </p>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Salesperson */}
        <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Revenue & Commission
            </h3>
            {comparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueChart} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commission" name="Commission" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 text-sm py-10">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Deals by Salesperson */}
        <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" /> Leads & Conversions
            </h3>
            {comparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dealsChart} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="closed" name="Closed" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lost" name="Open/Lost" fill="#F87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 text-sm py-10">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Salesperson Ranking Table */}
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-500" /> Salesperson Performance
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Click a name to view their full dashboard</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/70">
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2.5 px-3">#</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2.5 px-3">Salesperson</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Leads</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Closed</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Revenue</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Commission</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2.5 px-3 text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...comparison].sort((a, b) => b.total_revenue - a.total_revenue).map((sp, i) => (
                <TableRow
                  key={sp.user_id}
                  className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  onClick={() => onFilterSalesperson(sp.user_id, sp.name)}
                  data-testid={`sp-row-${i}`}
                >
                  <TableCell className="py-2.5 px-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-gray-300'
                    }`}>
                      {i + 1}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <p className="text-sm font-semibold text-gray-800">{sp.name}</p>
                    <p className="text-[10px] text-gray-400">{sp.email}</p>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-sm">{sp.total_leads}</TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-sm font-semibold text-green-700">{sp.closed_deals}</TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-sm font-semibold">${sp.total_revenue.toLocaleString()}</TableCell>
                  <TableCell className="py-2.5 px-3 text-right font-mono text-sm text-emerald-700">${sp.total_commission.toLocaleString()}</TableCell>
                  <TableCell className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sp.closing_rate >= 40 ? 'bg-green-100 text-green-700' :
                      sp.closing_rate >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {sp.closing_rate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {comparison.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400 text-sm">No salespeople have imported data yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
