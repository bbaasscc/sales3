import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  DollarSign, Percent, Target, TrendingUp, Users, PieChart as PieIcon, BarChart3,
  Gift, Calendar, ShoppingCart, BadgeDollarSign,
} from "lucide-react";
import { SummaryCard, SpiffBrandCard, ChartCard } from "@/components/shared";
import { BRAND_COLORS, CHART_COLORS, SPIFF_COLORS } from "@/lib/constants";

export default function DashboardTab({ kpiData, setSelectedSale, setInstallationsOpen }) {
  const unitTypeData = kpiData?.unit_type_count 
    ? Object.entries(kpiData.unit_type_count).map(([name, value]) => ({
        name: name || 'Unknown', value, revenue: kpiData.unit_type_revenue?.[name] || 0
      }))
    : [];

  const monthlyData = kpiData?.monthly_data || [];

  const spiffChartData = kpiData?.spiff_breakdown
    ? Object.entries(kpiData.spiff_breakdown).map(([brand, data]) => ({
        name: brand, value: data.commission, count: data.count
      })).filter(item => item.value > 0)
    : [];

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* BLOCK 1 - MY MONEY */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#ECFDF5', borderLeftColor: '#10B981' }}>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white shadow-sm">
              <DollarSign className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: '#065F46' }} data-testid="block-1-title">My Money</h2>
              <p className="text-xs sm:text-sm text-emerald-600/70">Financial overview for the period</p>
            </div>
          </div>

          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 sm:mb-4" style={{ color: '#047857' }}>My Performance</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <SummaryCard title="Total Revenue" value={kpiData.total_revenue} prefix="$" icon={DollarSign} description="Closed deals revenue" highlight />
            <SummaryCard title="Commission" value={kpiData.total_commission} prefix="$" icon={BadgeDollarSign} description="Total commission earned" highlight />
            <SummaryCard title="Closed Deals" value={kpiData.closed_deals} icon={Target} description="SALE status deals" />
            <SummaryCard title="Leads" value={kpiData.total_visits} icon={Users} description="Total visits" />
            <SummaryCard title="Closing Rate" value={kpiData.closing_rate} suffix="%" icon={Percent} description="Win rate" />
            <SummaryCard title="Avg Ticket" value={kpiData.average_ticket} prefix="$" icon={ShoppingCart} description="Per deal average" />
          </div>

          <div className="border-t border-emerald-200/60 my-5 sm:my-6"></div>

          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 sm:mb-4" style={{ color: '#047857' }}>
            Payments <span className="font-normal text-emerald-500">(Install Date)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-white/80 backdrop-blur rounded-xl p-3 sm:p-4 text-center shadow-sm border border-emerald-100 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setInstallationsOpen(true)}>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Installations</p>
              <p className="text-lg sm:text-2xl md:text-3xl font-mono font-bold text-emerald-800">{kpiData.commission_payment_count || 0}</p>
              <p className="text-[9px] text-emerald-500 mt-1">Click for details</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-3 sm:p-4 text-center shadow-sm border border-emerald-100">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Commission Payable</p>
              <p className="text-lg sm:text-2xl md:text-3xl font-mono font-bold text-emerald-800">${(kpiData.commission_payment_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-3 sm:p-4 text-center shadow-sm border border-emerald-100">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">SPIFF Included</p>
              <p className="text-lg sm:text-2xl md:text-3xl font-mono font-bold text-amber-600">${(kpiData.commission_payment_spiff || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCK 2 - HOW CAN I EARN MORE? */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#FFFBEB', borderLeftColor: '#F59E0B' }}>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white shadow-sm">
              <TrendingUp className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: '#92400E' }} data-testid="block-2-title">How Can I Earn More?</h2>
              <p className="text-xs sm:text-sm text-amber-600/70">Opportunities to increase your income</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={{ color: '#B45309' }}>
              Under Book Price <span className="font-normal text-amber-500">(5% Commission)</span>
            </p>
            <span className="text-[10px] sm:text-xs font-mono bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-gray-600">
              {kpiData.closed_deals > 0 ? ((kpiData.price_margin_sales_count / kpiData.closed_deals) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-5">
            <div className="bg-white/80 backdrop-blur rounded-xl p-3 sm:p-4 shadow-sm border border-amber-100">
              <div className="flex items-center gap-1.5 mb-2">
                <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">Sales at 5%</span>
              </div>
              <p className="text-2xl sm:text-3xl font-mono font-bold text-gray-900">{kpiData.price_margin_sales_count}</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-3 sm:p-4 shadow-sm border border-amber-100">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">Revenue</span>
              </div>
              <p className="text-2xl sm:text-3xl font-mono font-bold text-gray-900">${kpiData.price_margin_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-xl p-3 sm:p-4 shadow-sm border border-amber-100" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <BadgeDollarSign className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">Commission</span>
              </div>
              <p className="text-2xl sm:text-3xl font-mono font-bold text-amber-800">${kpiData.price_margin_commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="border-t border-amber-200/60 my-5 sm:my-6"></div>

          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#B45309' }}>SPIFF Breakdown</p>
          
          <div className="rounded-xl p-4 sm:p-5 mb-4" style={{ background: 'linear-gradient(135deg, #92400E, #D97706)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Total SPIFF</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-white">${kpiData.spiff_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-white/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {Object.entries(kpiData.spiff_breakdown || {}).map(([brand, data]) => (
              <SpiffBrandCard key={brand} brand={brand} data={data} color={SPIFF_COLORS[brand] || '#94A3B8'} />
            ))}
          </div>

          {spiffChartData.length > 0 && (
            <div className="mt-4 hidden sm:block">
              <ChartCard title="SPIFF Distribution" icon={PieIcon}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={spiffChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
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
        </div>
      </div>

      {/* BLOCK 3 - WHAT AM I SELLING? */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6' }}>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white shadow-sm">
              <BarChart3 className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: '#1E40AF' }} data-testid="block-3-title">What Am I Selling?</h2>
              <p className="text-xs sm:text-sm text-blue-600/70">Sales analysis & performance trends</p>
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

      {/* BLOCK 4 - CLOSED SALES */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#F5F3FF', borderLeftColor: '#8B5CF6' }}>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white shadow-sm">
              <Calendar className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: '#5B21B6' }} data-testid="block-4-title">Closed Sales</h2>
              <p className="text-xs sm:text-sm text-violet-600/70">Click on a sale for details</p>
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
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 sm:py-3 px-2 sm:px-4">Commission</TableHead>
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
                        <TableCell className="py-2 px-2 sm:px-4 font-mono text-xs sm:text-sm font-semibold" style={{ color: '#8B5CF6' }}>
                          ${record.commission_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 font-mono text-xs text-gray-600">
                          {record.install_date}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-gray-500">
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
