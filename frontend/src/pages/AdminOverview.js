import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  DollarSign, Target, Percent, BarChart3, Users, TrendingDown, PieChart as PieIcon,
} from "lucide-react";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminOverview({ token, payPeriod, dateFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (payPeriod && payPeriod !== "all") params.pay_period = payPeriod;
      if (dateFilter && dateFilter !== "all") params.date_filter = dateFilter;
      const res = await axios.get(`${API}/admin/comparison`, {
        headers: { Authorization: `Bearer ${token}` }, params,
      });
      setData(res.data);
    } catch { toast.error("Error loading data"); }
    finally { setLoading(false); }
  }, [token, payPeriod, dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) return <div className="flex items-center justify-center min-h-[300px]"><p className="text-gray-400">Loading...</p></div>;

  const { totals, comparison } = data;
  const totalPending = (totals.total_leads || 0) - (totals.closed_deals || 0) - (totals.lost_deals || 0);

  const statusPie = [
    { name: 'Closed', value: totals.closed_deals || 0, color: '#22C55E' },
    { name: 'Pending', value: totalPending > 0 ? totalPending : 0, color: '#F59E0B' },
    { name: 'Lost', value: totals.lost_deals || 0, color: '#EF4444' },
  ].filter(s => s.value > 0);

  const avgTicket = totals.closed_deals > 0 ? totals.total_revenue / totals.closed_deals : 0;
  const avgCommission = totals.closed_deals > 0 ? totals.total_commission / totals.closed_deals : 0;
  const activeSalespeople = comparison.filter(sp => sp.total_leads > 0).length;

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <BarChart3 className="w-6 h-6 text-white/80" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white" data-testid="admin-overview-title">Company Totals</h2>
              <p className="text-xs text-white/60">{comparison.length} salespeople ({activeSalespeople} active)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Revenue", value: `$${(totals.total_revenue || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}`, icon: DollarSign, accent: '#22C55E' },
              { label: "Commission", value: `$${(totals.total_commission || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}`, icon: DollarSign, accent: '#10B981' },
              { label: "Closed Deals", value: totals.closed_deals || 0, icon: Target, accent: '#3B82F6' },
              { label: "Total Leads", value: totals.total_leads || 0, icon: Users, accent: '#F59E0B' },
              { label: "Lost", value: totals.lost_deals || 0, icon: TrendingDown, accent: '#EF4444' },
              { label: "Closing Rate", value: `${totals.closing_rate || 0}%`, icon: Percent, accent: '#8B5CF6' },
            ].map((item, i) => (
              <Card key={i} className="bg-white/10 border-0 backdrop-blur-sm">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: item.accent + '22' }}>
                      <item.icon className="w-3 h-3" style={{ color: item.accent }} />
                    </div>
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/50">{item.label}</p>
                  <p className="text-lg sm:text-xl font-mono font-bold text-white mt-0.5">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Avg Ticket", value: `$${avgTicket.toLocaleString('en-US', {maximumFractionDigits: 0})}`, sub: "Per closed deal" },
          { label: "Avg Commission", value: `$${avgCommission.toLocaleString('en-US', {maximumFractionDigits: 0})}`, sub: "Per closed deal" },
          { label: "Pending Leads", value: totalPending > 0 ? totalPending : 0, sub: "In pipeline" },
          { label: "Active Sellers", value: activeSalespeople, sub: `of ${comparison.length} total` },
        ].map((item, i) => (
          <Card key={i} className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
              <p className="text-2xl font-mono font-bold text-gray-900 mt-1">{item.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Breakdown */}
      {statusPie.length > 0 && (
        <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-gray-500" /> Lead Status Breakdown
            </h3>
            <div className="flex items-center gap-8">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v} leads`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {statusPie.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-gray-600 w-16">{s.name}</span>
                    <span className="text-sm font-mono font-bold text-gray-900">{s.value}</span>
                    <span className="text-xs text-gray-400">({totals.total_leads > 0 ? Math.round(s.value / totals.total_leads * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
