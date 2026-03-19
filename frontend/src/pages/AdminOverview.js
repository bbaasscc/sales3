import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  DollarSign, Target, Users, TrendingUp, BarChart3, PieChart as PieIcon, Settings, Package,
} from "lucide-react";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, AreaChart, Area,
} from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const EQUIP_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

export default function AdminOverview({ token, payPeriod, dateFilter, category }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { category: category || 'hvac' };
      if (payPeriod && payPeriod !== "all") params.pay_period = payPeriod;
      if (dateFilter && dateFilter !== "all") params.date_filter = dateFilter;
      const res = await axios.get(`${API}/admin/comparison`, {
        headers: { Authorization: `Bearer ${token}` }, params,
      });
      setData(res.data);
    } catch { toast.error("Error loading data"); }
    finally { setLoading(false); }
  }, [token, payPeriod, dateFilter, category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) return <div className="flex items-center justify-center min-h-[300px]"><p className="text-gray-400">Loading...</p></div>;

  const { totals, comparison } = data;
  const activeSP = comparison.filter(sp => sp.total_leads > 0).length;
  const dpa = totals.total_leads > 0 ? (totals.total_revenue / totals.total_leads) : 0;
  const totalPending = (totals.total_leads || 0) - (totals.closed_deals || 0) - (totals.lost_deals || 0);

  const statusPie = [
    { name: 'Closed', value: totals.closed_deals || 0, color: '#22C55E' },
    { name: 'Pending', value: totalPending > 0 ? totalPending : 0, color: '#F59E0B' },
    { name: 'Lost', value: totals.lost_deals || 0, color: '#EF4444' },
  ].filter(s => s.value > 0);

  const equipData = Object.entries(totals.equipment_types || {})
    .map(([name, d]) => ({ name, count: d.count, revenue: d.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const accessories = totals.accessories || {};

  return (
    <div className="space-y-6">
      {/* COMPANY SALES METRICS — same layout as salesperson */}
      <div className="rounded-2xl overflow-hidden anim-section" style={{ backgroundColor: '#1E3A5F' }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <TrendingUp className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white" data-testid="admin-overview-title">Company Sales Metrics</h2>
              <p className="text-xs text-white/50">{comparison.length} salespeople ({activeSP} active)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Net R%', value: `${totals.closing_rate || 0}%`, sub: `${totals.closed_deals} of ${totals.total_leads} leads` },
              { label: 'Gross R%', value: `${totals.total_leads > 0 ? ((totals.gross_closed || totals.closed_deals) / totals.total_leads * 100).toFixed(1) : 0}%`, sub: 'Incl. Credit Reject' },
              { label: 'Revenue', value: `$${(totals.total_revenue || 0).toLocaleString('en-US', {maximumFractionDigits:0})}`, sub: `${totals.closed_deals} closed deals` },
              { label: 'Leads', value: totals.total_leads || 0, sub: 'Excl. Cancel/Resched' },
              { label: 'Credit Reject', value: totals.credit_reject || 0, sub: `${totals.total_leads > 0 ? ((totals.credit_reject || 0) / totals.total_leads * 100).toFixed(1) : 0}% of leads` },
              { label: 'Avg Ticket', value: `$${(totals.avg_ticket || 0).toLocaleString('en-US', {maximumFractionDigits:0})}`, sub: 'Per closed deal' },
              { label: 'DPA', value: `$${dpa.toLocaleString('en-US', {maximumFractionDigits:0})}`, sub: 'Dollars Per Appt' },
              { label: 'Closed Deals', value: totals.closed_deals || 0, sub: 'SALE status' },
              { label: 'Under Book', value: totals.pm_jobs || 0, sub: `${totals.pm_pct || 0}% of deals` },
              { label: 'Commission', value: `$${(totals.total_commission || 0).toLocaleString('en-US', {maximumFractionDigits:0})}`, sub: `Avg ${totals.gp_pct || 0}%` },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center hover:bg-white/15 transition-all anim-card" style={{animationDelay: `${i*0.04}s`}}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1">{item.label}</p>
                <p className="text-xl sm:text-2xl font-mono font-bold text-white">{item.value}</p>
                <p className="text-[9px] text-white/40 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
          {(totals.cancel_count > 0) && (
            <div className="mt-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/60">
                Cancelled: {totals.cancel_count}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ACCESSORY SELL-THROUGH % — same as salesperson */}
      {totals.closed_deals > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 anim-section">
          {[
            { label: 'APCO X Sold', count: accessories.apco_x?.count || 0 },
            { label: 'Duct Cleaning', count: accessories.duct_cleaning?.count || 0 },
            { label: 'Surge Protector', count: accessories.surge_protector?.count || 0 },
            { label: 'Samsung', count: accessories.samsung?.count || 0 },
          ].map(item => {
            const pct = totals.closed_deals > 0 ? (item.count / totals.closed_deals * 100) : 0;
            return (
              <div key={item.label} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{item.label}</p>
                <p className="text-2xl font-mono font-bold" style={{ color: pct >= 50 ? '#10B981' : pct >= 25 ? '#F59E0B' : '#EF4444' }}>
                  {pct.toFixed(0)}%
                </p>
                <p className="text-[10px] text-gray-400">{item.count} of {totals.closed_deals} deals</p>
              </div>
            );
          })}
        </div>
      )}

      {/* CHARTS ROW — Lead Status + Equipment Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        {equipData.length > 0 && (
          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-500" /> Equipment Revenue
              </h3>
              <ResponsiveContainer width="100%" height={200}>
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
        )}
      </div>

      {/* ACCESSORIES DETAIL */}
      {Object.keys(accessories).length > 0 && (
        <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" /> SPIFF Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(accessories).map(([key, d]) => (
                <div key={key} className="rounded-xl p-3 border bg-gray-50 hover:bg-gray-100 transition-all">
                  <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{key.replace(/_/g, ' ')}</p>
                  <p className="text-xl font-mono font-bold text-gray-800">{d.count}<span className="text-xs text-gray-400 ml-1">sales</span></p>
                  <p className="text-[10px] font-mono text-amber-600">${(d.value || 0).toLocaleString('en-US', {maximumFractionDigits:0})} SPIFF</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
