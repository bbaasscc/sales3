import { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, Users, PieChart as PieIcon, BarChart3, Calendar, DollarSign,
} from "lucide-react";
import { ChartCard } from "@/components/shared";
import { CHART_COLORS } from "@/lib/constants";

export default function DashboardTab({ kpiData, setSelectedSale, setInstallationsOpen, category, authHeaders, dateFilter, payPeriod }) {
  const dpa = kpiData.total_visits > 0 ? (kpiData.total_revenue / kpiData.total_visits) : 0;
  const isGen = category === 'generator';
  const t = isGen
    ? { primary: '#14532D', accent: '#22c55e', chartBg: '#F0FDF4', chartBorder: '#16a34a', chartLabel: '#166534', tableBg: '#ECFDF5', tableBorder: '#22c55e', tableLabel: '#166534' }
    : { primary: '#1E3A5F', accent: '#3B82F6', chartBg: '#EFF6FF', chartBorder: '#3B82F6', chartLabel: '#1E40AF', tableBg: '#F5F3FF', tableBorder: '#8B5CF6', tableLabel: '#5B21B6' };

  const [companyAvg, setCompanyAvg] = useState(null);
  useEffect(() => {
    const params = { date_filter: dateFilter || 'current_year', category: category || 'hvac' };
    if (payPeriod && payPeriod !== 'all') params.pay_period = payPeriod;
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/dashboard/company-averages`, {
      params, headers: authHeaders || {}
    }).then(r => setCompanyAvg(r.data)).catch(() => {});
  }, [dateFilter, payPeriod, category, authHeaders]);

  const unitTypeData = kpiData?.unit_type_count 
    ? Object.entries(kpiData.unit_type_count).map(([name, value]) => ({
        name: name || 'Unknown', value, revenue: kpiData.unit_type_revenue?.[name] || 0
      }))
    : [];

  const monthlyData = kpiData?.monthly_data || [];

  // Calculate DPA (Dollars Per Appointment)

  return (
    <div className="space-y-6">
      {/* SALES METRICS - Power Rankings */}
      <div className="rounded-2xl overflow-hidden anim-section" style={{ backgroundColor: t.primary }}>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white" data-testid="block-1-title">Sales Metrics</h2>
              <p className="text-xs text-white/50">Power Rankings</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Closing Ratio (Net) */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card anim-delay-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">R% (Net Close)</p>
              <p className="text-3xl sm:text-4xl font-mono font-bold text-white">{kpiData.closing_rate}%</p>
              <p className="text-[10px] text-white/40 mt-1">{kpiData.closed_deals} of {kpiData.total_visits} leads</p>
            </div>

            {/* Gross Closing */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card anim-delay-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Gross R%</p>
              <p className="text-3xl sm:text-4xl font-mono font-bold text-white">
                {kpiData.total_visits > 0 ? ((kpiData.gross_closed || kpiData.closed_deals) / kpiData.total_visits * 100).toFixed(1) : '0.0'}%
              </p>
              <p className="text-[10px] text-white/40 mt-1">Incl. Credit Reject</p>
            </div>

            {/* Total Revenue */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card anim-delay-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Total Revenue</p>
              <p className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
                ${kpiData.total_revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-white/40 mt-1">{kpiData.closed_deals} closed deals</p>
            </div>

            {/* Total Leads */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card anim-delay-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Leads</p>
              <p className="text-3xl sm:text-4xl font-mono font-bold text-white">{kpiData.total_visits}</p>
              <p className="text-[10px] text-white/40 mt-1">Excl. Cancel/Resched</p>
            </div>

            {/* Credit Reject */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card anim-delay-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Credit Reject</p>
              <p className="text-3xl sm:text-4xl font-mono font-bold text-amber-400">{kpiData.credit_reject_count || 0}</p>
              <p className="text-[10px] text-white/40 mt-1">{kpiData.total_visits > 0 ? ((kpiData.credit_reject_count || 0) / kpiData.total_visits * 100).toFixed(1) : '0.0'}% of leads</p>
            </div>

            {/* Average Ticket */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card anim-delay-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Avg Ticket</p>
              <p className="text-2xl sm:text-3xl font-mono font-bold text-white">
                ${kpiData.average_ticket.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-white/40 mt-1">Per closed deal</p>
            </div>

            {/* DPA - Dollars Per Appointment */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card anim-delay-7">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">DPA</p>
              <p className="text-2xl sm:text-3xl font-mono font-bold text-cyan-400">
                ${dpa.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-white/40 mt-1">Dollars Per Appt</p>
            </div>

            {/* Closed Deals */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card anim-delay-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Closed Deals</p>
              <p className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400">{kpiData.closed_deals}</p>
              <p className="text-[10px] text-white/40 mt-1">SALE status</p>
            </div>

            {/* Price Match (PM) */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card anim-delay-9">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">PM (Under Book)</p>
              <p className="text-3xl sm:text-4xl font-mono font-bold text-red-400">{kpiData.price_margin_sales_count || 0}</p>
              <p className="text-[10px] text-white/40 mt-1">{kpiData.closed_deals > 0 ? ((kpiData.price_margin_sales_count || 0) / kpiData.closed_deals * 100).toFixed(1) : '0.0'}% of deals</p>
            </div>

            {/* Self Gen 3% */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/15 transition-all anim-card" style={{animationDelay:'0.5s'}}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Self Gen (3%)</p>
              <p className="text-3xl sm:text-4xl font-mono font-bold text-cyan-400">{(kpiData.records || []).filter(r => r.is_self_gen).length}</p>
              <p className="text-[10px] text-white/40 mt-1">{kpiData.closed_deals > 0 ? ((kpiData.records || []).filter(r => r.is_self_gen).length / kpiData.closed_deals * 100).toFixed(1) : '0.0'}% of deals</p>
            </div>
          </div>

          {(kpiData.cancel_count > 0 || kpiData.rescheduled_count > 0) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {kpiData.cancel_count > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/60">
                  Cancelled: {kpiData.cancel_count}
                </span>
              )}
              {kpiData.rescheduled_count > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/60">
                  Rescheduled: {kpiData.rescheduled_count}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ACCESSORY SELL-THROUGH RATES - metrics only, no money */}
      {kpiData.closed_deals > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 anim-section anim-delay-2">
          {(() => {
            const sb = kpiData.spiff_breakdown || {};
            const total = kpiData.closed_deals;
            const items = [
              { label: 'APCO X Sold', count: sb['APCO X']?.count || 0 },
              { label: 'Duct Cleaning', count: sb['Duct Cleaning']?.count || 0 },
              { label: 'Surge Protector', count: sb['Surge Protector']?.count || 0 },
              { label: 'Self Gen Mits', count: sb['Mitsubishi']?.count || 0 },
            ];
            return items.map(item => {
              const pct = total > 0 ? (item.count / total * 100) : 0;
              return (
                <div key={item.label} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm anim-card">
                  <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{item.label}</p>
                  <p className="text-2xl font-mono font-bold" style={{ color: pct >= 50 ? '#10B981' : pct >= 25 ? '#F59E0B' : '#EF4444' }}>
                    {pct.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-gray-400">{item.count} of {total} deals</p>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* COMPANY AVERAGES */}
      {companyAvg?.salesperson_count > 0 && kpiData.closed_deals > 0 && (
        <div className="rounded-2xl overflow-hidden anim-section anim-delay-3" style={{ backgroundColor: '#F8FAFC', border: '2px dashed #CBD5E1' }}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-600">Company Average ({companyAvg.salesperson_count} salespeople)</h2>
                <p className="text-[10px] text-gray-400">Compare your metrics against the team</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Avg R%', yours: kpiData.closing_rate, avg: companyAvg.averages.closing_rate, fmt: v => `${v}%` },
                { label: 'Avg Revenue', yours: kpiData.total_revenue, avg: companyAvg.averages.total_revenue, fmt: v => `$${(+v).toLocaleString('en-US',{maximumFractionDigits:0})}` },
                { label: 'Avg Ticket', yours: kpiData.average_ticket, avg: companyAvg.averages.average_ticket, fmt: v => `$${(+v).toLocaleString('en-US',{maximumFractionDigits:0})}` },
                { label: 'Avg DPA', yours: dpa, avg: companyAvg.averages.dpa, fmt: v => `$${(+v).toLocaleString('en-US',{maximumFractionDigits:0})}` },
                { label: 'Avg Deals', yours: kpiData.closed_deals, avg: companyAvg.averages.closed_deals, fmt: v => `${v}` },
                { label: 'Avg Leads', yours: kpiData.total_visits, avg: companyAvg.averages.total_visits, fmt: v => `${v}` },
                { label: 'Avg Credit Rej', yours: kpiData.credit_reject_count || 0, avg: companyAvg.averages.credit_reject_count, fmt: v => `${v}` },
                { label: 'Avg Under Book', yours: kpiData.price_margin_sales_count || 0, avg: companyAvg.averages.price_margin_sales_count, fmt: v => `${v}` },
              ].map(item => {
                const diff = item.yours - item.avg;
                const isGood = item.label.includes('Credit') || item.label.includes('Under') ? diff <= 0 : diff >= 0;
                return (
                  <div key={item.label} className="bg-white rounded-lg p-2.5 border border-gray-100">
                    <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">{item.label}</p>
                    <p className="text-lg font-mono font-bold text-gray-600">{item.fmt(item.avg)}</p>
                    <p className={`text-[9px] font-bold ${isGood ? 'text-green-600' : 'text-red-500'}`}>
                      You: {item.fmt(item.yours)} {isGood ? '▲' : '▼'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WHAT AM I SELLING? - Charts */}
      <div className="rounded-2xl border-l-4 overflow-hidden anim-section anim-delay-3" style={{ backgroundColor: t.chartBg, borderLeftColor: t.chartBorder }}>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white shadow-sm">
              <BarChart3 className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: t.chartLabel }} data-testid="block-3-title">What Am I Selling?</h2>
              <p className="text-xs sm:text-sm" style={{ color: t.chartBorder + '99' }}>Sales analysis & performance trends</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <ChartCard title="Unit Type" icon={PieIcon}>
              {unitTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={unitTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
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

            <ChartCard title="Revenue by Type" icon={BarChart3}>
              {unitTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={unitTypeData} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data</div>
              )}
            </ChartCard>

            <ChartCard title="Monthly Revenue" icon={TrendingUp}>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month_short" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data</div>
              )}
            </ChartCard>
          </div>
        </div>
      </div>

      {/* CLOSED SALES TABLE */}
      <div className="rounded-2xl border-l-4 overflow-hidden anim-section anim-delay-5" style={{ backgroundColor: t.tableBg, borderLeftColor: t.tableBorder }}>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white shadow-sm">
              <Calendar className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: t.tableLabel }} data-testid="block-4-title">Closed Sales</h2>
              <p className="text-xs sm:text-sm" style={{ color: t.tableBorder + '99' }}>Click on a sale for details</p>
            </div>
          </div>
          
          <Card className="bg-white border border-violet-100 shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-violet-50/50">
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4">Name</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4 hidden lg:table-cell">City</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4 hidden xl:table-cell">Unit</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4">Value</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiData.records?.length > 0 ? (
                    kpiData.records.map((record, index) => (
                      <TableRow 
                        key={index} 
                        className="border-b border-gray-100 hover:bg-violet-50/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedSale(record)}
                        data-testid={`sale-row-${index}`}
                      >
                        <TableCell className="py-2 px-2 sm:px-4 font-medium text-gray-700 text-xs sm:text-sm">
                          <span className="line-clamp-1 underline decoration-dotted">{record.name}</span>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-gray-600 text-xs sm:text-sm hidden lg:table-cell">{record.city}</TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-gray-600 text-[10px] sm:text-xs hidden xl:table-cell">
                          <span className="line-clamp-1">{record.unit_type}</span>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 font-mono text-gray-700 text-xs sm:text-sm font-semibold">
                          ${record.ticket_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 font-mono text-xs text-gray-600">
                          {record.install_date}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                        No sales in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}
