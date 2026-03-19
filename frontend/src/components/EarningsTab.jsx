import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DollarSign, Gift, ShoppingCart, BadgeDollarSign, X,
} from "lucide-react";
import { SpiffBrandCard } from "@/components/shared";
import { SPIFF_COLORS } from "@/lib/constants";

export default function EarningsTab({ kpiData, setInstallationsOpen, category }) {
  const [spiffModal, setSpiffModal] = useState(null);
  const isGen = category === 'generator';
  const payBg = isGen ? '#ECFDF5' : '#ECFDF5';
  const payBorder = isGen ? '#22c55e' : '#10B981';
  const spiffBg = isGen ? '#F0FDF4' : '#FFFBEB';
  const spiffBorder = isGen ? '#16a34a' : '#F59E0B';

  return (
    <div className="space-y-6">
      {/* Payments */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: payBg, borderLeftColor: payBorder }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-emerald-800">Payments</h2>
              <p className="text-xs text-emerald-600/70">Based on Install Date</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/80 rounded-xl p-4 text-center border border-emerald-100 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setInstallationsOpen(true)}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Installations</p>
              <p className="text-2xl font-mono font-bold text-emerald-800">{kpiData.commission_payment_count || 0}</p>
              <p className="text-[9px] text-emerald-500 mt-1">Click for details</p>
            </div>
            <div className="bg-white/80 rounded-xl p-4 text-center border border-emerald-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Commission Payable</p>
              <p className="text-2xl font-mono font-bold text-emerald-800">${(kpiData.commission_payment_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white/80 rounded-xl p-4 text-center border border-amber-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">SPIFF Included</p>
              <p className="text-2xl font-mono font-bold text-amber-600">${(kpiData.commission_payment_spiff || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-[10px] font-bold uppercase text-gray-500">Total Commission</p>
              <p className="text-xl font-mono font-bold text-emerald-700">${(kpiData.install_total_commission || kpiData.commission_payment_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-[10px] font-bold uppercase text-gray-500">Avg Comm %</p>
              <p className="text-xl font-mono font-bold text-emerald-700">{kpiData.install_avg_commission_percent || kpiData.avg_commission_percent || 0}%</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 text-center border border-amber-100">
              <p className="text-[10px] font-bold uppercase text-gray-500">Under Book (5%)</p>
              <p className="text-xl font-mono font-bold text-amber-600">{kpiData.install_pm_count || 0} sales</p>
              <p className="text-[9px] text-gray-400">{kpiData.commission_payment_count > 0 ? ((kpiData.install_pm_count || 0) / kpiData.commission_payment_count * 100).toFixed(1) : 0}% of installs</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 text-center border border-amber-100">
              <p className="text-[10px] font-bold uppercase text-gray-500">Under Book Revenue</p>
              <p className="text-xl font-mono font-bold text-amber-600">${(kpiData.install_pm_revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commission Tiers */}
      {kpiData.closed_deals > 0 && (
        <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: payBg, borderLeftColor: '#6366F1' }}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-lg font-bold text-indigo-800">Commission Tiers</h2>
                <p className="text-xs text-indigo-600/70">Distribution by price level</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4">
              {(() => {
                const records = kpiData.records || [];
                const tiers = [
                  { id: 'under_book', label: 'Under Book (5%)', color: '#EF4444' },
                  { id: 'at_book', label: 'At Book (7%)', color: '#6B7280' },
                  { id: 'over_200', label: '$200 Over (8%)', color: '#3B82F6' },
                  { id: 'over_500', label: '$500 Over (9%)', color: '#8B5CF6' },
                  { id: 'over_1000', label: '$1K+ Over (10%)', color: '#10B981' },
                ];
                // Count by price_tier field; records without price_tier go to "Legacy"
                const tiered = records.filter(r => r.price_tier);
                const legacy = records.filter(r => !r.price_tier);
                const allTiers = [...tiers.map(t => {
                  const matching = tiered.filter(r => r.price_tier === t.id);
                  return { ...t, count: matching.length, rev: matching.reduce((s, r) => s + (r.ticket_value || 0), 0) };
                })];
                if (legacy.length > 0) {
                  allTiers.push({ id: 'legacy', label: 'Legacy (pre-rules)', color: '#94A3B8', count: legacy.length, rev: legacy.reduce((s, r) => s + (r.ticket_value || 0), 0) });
                }
                const total = records.length;
                return allTiers.filter(t => t.count > 0).map(tier => {
                  const pct = total > 0 ? (tier.count / total * 100) : 0;
                  return (
                    <div key={tier.id} className="flex items-center gap-2 mb-2.5">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: tier.color }} />
                      <span className="text-[10px] font-bold text-gray-600 w-28 flex-shrink-0">{tier.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4">
                        <div className="h-4 rounded-full transition-all flex items-center justify-end pr-1" style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: tier.color }}>
                          {pct > 15 && <span className="text-[8px] font-bold text-white">{pct.toFixed(0)}%</span>}
                        </div>
                      </div>
                      <div className="text-right w-20 flex-shrink-0">
                        <span className="text-[10px] font-mono font-bold text-gray-700">{tier.count} deals</span>
                        <span className="text-[9px] text-gray-400 block">${tier.rev.toLocaleString('en-US', {maximumFractionDigits:0})}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SPIFF Breakdown */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: spiffBg, borderLeftColor: spiffBorder }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <Gift className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold text-amber-800">SPIFF Breakdown</h2>
              <p className="text-xs text-amber-600/70">Click each brand for sale details</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(kpiData.spiff_breakdown || {}).map(([brand, data]) => (
              <SpiffBrandCard key={brand} brand={brand} data={data} color={SPIFF_COLORS[brand] || '#94A3B8'}
                onClick={(b) => {
                  const recs = kpiData.spiff_records?.[b] || [];
                  setSpiffModal({ brand: b, records: recs, data });
                }} />
            ))}
          </div>

          <div className="rounded-xl p-4 mt-4" style={{ background: 'linear-gradient(135deg, #92400E, #D97706)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-1">Total SPIFF</p>
                <p className="text-3xl font-mono font-bold text-white">${(kpiData.spiff_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <Gift className="w-10 h-10 text-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Quarterly Self Gen Mitsubishi */}
      {(kpiData.quarterly_self_gen_mits || []).length > 0 && (
        <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#F0FDF4', borderLeftColor: '#16a34a' }}>
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-green-700" />
              <div>
                <h2 className="text-lg font-bold text-green-800">Self Gen Mitsubishi — Quarterly</h2>
                <p className="text-xs text-green-600/70">4% of Mitsubishi product value, paid quarterly</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(kpiData.quarterly_self_gen_mits || []).map(q => (
                <div key={q.quarter} className="bg-white rounded-xl p-3 text-center shadow-sm border border-green-200">
                  <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{q.quarter}</p>
                  <p className="text-xl font-mono font-bold text-green-700">${q.amount.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SPIFF Modal */}
      {spiffModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSpiffModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between" style={{ backgroundColor: SPIFF_COLORS[spiffModal.brand] || '#94A3B8' }}>
              <div>
                <h3 className="text-base font-bold text-white">{spiffModal.brand}</h3>
                <p className="text-xs text-white/80">{spiffModal.data.count} sales &mdash; ${spiffModal.data.commission.toLocaleString('en-US', {minimumFractionDigits: 2})} SPIFF</p>
              </div>
              <button onClick={() => setSpiffModal(null)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-3">Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-3">Unit</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-3 text-right">Value</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-3 text-right">SPIFF</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-3">Close</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(spiffModal.records || []).map((rec, i) => (
                    <TableRow key={i} className="border-b border-gray-50">
                      <TableCell className="py-2 px-3 text-xs font-medium text-gray-800">{rec.name}</TableCell>
                      <TableCell className="py-2 px-3 text-[10px] text-gray-500">{rec.unit_type}</TableCell>
                      <TableCell className="py-2 px-3 text-xs font-mono text-right">${rec.ticket_value.toLocaleString('en-US', {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="py-2 px-3 text-xs font-mono font-semibold text-right" style={{ color: SPIFF_COLORS[spiffModal.brand] }}>${rec.spiff_value.toLocaleString('en-US', {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="py-2 px-3 text-[10px] font-mono text-gray-500">{rec.close_date || '\u2014'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
