import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  DollarSign, Target, Percent, BarChart3, Users, TrendingDown, PieChart as PieIcon, Settings, Package,
} from "lucide-react";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EQUIP_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
const ACCESSORY_LABELS = {
  apco_x: 'APCO X',
  samsung: 'Samsung',
  mitsubishi: 'Mitsubishi',
  surge_protector: 'Surge Protector',
  duct_cleaning: 'Duct Cleaning',
  self_gen_mits: 'Self Gen Mits',
};
const ACCESSORY_COLORS = {
  apco_x: '#C62828',
  samsung: '#1E3A5F',
  mitsubishi: '#4CAF50',
  surge_protector: '#FF9800',
  duct_cleaning: '#9C27B0',
  self_gen_mits: '#00838F',
};

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
  const activeSalespeople = comparison.filter(sp => sp.total_leads > 0).length;

  const statusPie = [
    { name: 'Closed', value: totals.closed_deals || 0, color: '#22C55E' },
    { name: 'Pending', value: totalPending > 0 ? totalPending : 0, color: '#F59E0B' },
    { name: 'Lost', value: totals.lost_deals || 0, color: '#EF4444' },
  ].filter(s => s.value > 0);

  // Equipment chart data
  const equipData = Object.entries(totals.equipment_types || {})
    .map(([name, d]) => ({ name, count: d.count, revenue: d.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // Accessories data
  const accessories = totals.accessories || {};
  const totalAccessories = Object.values(accessories).reduce((sum, a) => sum + a.count, 0);

  return (
    <div className="space-y-6">
      {/* Company KPIs */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <BarChart3 className="w-6 h-6 text-white/80" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white" data-testid="admin-overview-title">Company Totals</h2>
              <p className="text-xs text-white/60">{comparison.length} salespeople ({activeSalespeople} active)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Revenue", value: `$${(totals.total_revenue || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}`, icon: DollarSign, accent: '#22C55E' },
              { label: "Commission", value: `$${(totals.total_commission || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}`, icon: DollarSign, accent: '#10B981' },
              { label: "Closed", value: totals.closed_deals || 0, icon: Target, accent: '#3B82F6' },
              { label: "Total Leads", value: totals.total_leads || 0, icon: Users, accent: '#F59E0B' },
              { label: "Lost", value: totals.lost_deals || 0, icon: TrendingDown, accent: '#EF4444' },
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

      {/* Key Rates + Lead Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "R%", value: `${totals.closing_rate || 0}%`, sub: "Net Closing Rate", color: '#8B5CF6' },
            { label: "Gross R%", value: `${totals.total_leads > 0 ? ((totals.gross_closed || totals.closed_deals) / totals.total_leads * 100).toFixed(1) : 0}%`, sub: "Incl. Credit Reject", color: '#6D28D9' },
            { label: "Avg Ticket", value: `$${(totals.avg_ticket || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}`, sub: "Per closed deal", color: '#22C55E' },
            { label: "GP %", value: `${totals.gp_pct || 0}%`, sub: "Avg Comm Rate", color: '#F59E0B' },
            { label: "PM Jobs", value: totals.pm_jobs || 0, sub: "Under book (5%)", color: '#EF4444' },
            { label: "PM %", value: `${totals.pm_pct || 0}%`, sub: "Of closed deals", color: '#EF4444' },
          ].map((item, i) => (
            <Card key={i} className="bg-white border border-gray-200 shadow-sm rounded-xl">
              <CardContent className="p-3 sm:p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: item.color }}>{item.label}</p>
                <p className="text-xl sm:text-2xl font-mono font-bold text-gray-900 mt-1">{item.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {statusPie.length > 0 && (
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-gray-500" /> Lead Status
              </h3>
              <div className="flex items-center gap-6">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                        {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `${v} leads`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {statusPie.map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-gray-600 w-14">{s.name}</span>
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

      {/* Equipment Types + Revenue */}
      {equipData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Equipment Revenue Chart */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-500" /> Equipment Revenue
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={equipData} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                    {equipData.map((_, i) => <Cell key={i} fill={EQUIP_COLORS[i % EQUIP_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Equipment Breakdown Table */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-500" /> Equipment Breakdown
              </h3>
              <div className="space-y-2">
                {equipData.map((eq, i) => {
                  const pct = totals.closed_deals > 0 ? Math.round(eq.count / totals.closed_deals * 100) : 0;
                  return (
                    <div key={eq.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors" data-testid={`equip-${i}`}>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: EQUIP_COLORS[i % EQUIP_COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{eq.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-400">Qty</p>
                          <p className="text-sm font-mono font-bold text-gray-900">{eq.count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Revenue</p>
                          <p className="text-sm font-mono font-bold text-blue-700">${eq.revenue.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                        </div>
                        <span className="text-[10px] font-mono bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-600">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accessories Sold */}
      {totalAccessories > 0 && (
        <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" /> Accessories Sold
              </h3>
              <span className="text-xs font-mono bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold" data-testid="total-accessories">
                {totalAccessories} total
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(accessories).map(([key, data]) => (
                <div key={key}
                  className="rounded-xl p-3 border transition-all hover:shadow-md"
                  style={{ borderColor: data.count > 0 ? ACCESSORY_COLORS[key] + '44' : '#e5e7eb', backgroundColor: data.count > 0 ? ACCESSORY_COLORS[key] + '08' : '#fafafa' }}
                  data-testid={`accessory-${key}`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCESSORY_COLORS[key] }} />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{ACCESSORY_LABELS[key]}</p>
                  </div>
                  <p className="text-2xl font-mono font-bold" style={{ color: data.count > 0 ? ACCESSORY_COLORS[key] : '#d1d5db' }}>{data.count}</p>
                  <p className="text-[10px] font-mono text-gray-400 mt-0.5">${data.value.toLocaleString('en-US', {maximumFractionDigits: 0})} SPIFF</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
