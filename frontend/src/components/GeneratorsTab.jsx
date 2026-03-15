import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Zap, Plus, Target, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  BRAND_COLORS, PAY_PERIODS_DATA, API, STATUS_LABELS, STATUS_COLORS,
} from "@/lib/constants";

const FILTER_OPTIONS = ['all', 'PENDING', 'SALE', 'LOST', 'CANCEL_APPOINTMENT'];

export default function GeneratorsTab({
  payPeriod, dateFilter, authHeaders, setEditingLead,
  setNewLeadOpen, setNewLeadStep, setNewLeadText, fetchDashboardData,
}) {
  const [leads, setLeads] = useState([]);
  const [kpiData, setKpiData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('visit_date');
  const [sortDir, setSortDir] = useState('desc');

  const fetchGenLeads = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leads`, { headers: authHeaders, params: { category: 'generator' } });
      setLeads(res.data.leads || []);
    } catch (err) { console.error(err); }
  }, [authHeaders]);

  const fetchGenKpis = useCallback(async () => {
    try {
      const params = { date_filter: dateFilter, category: 'generator' };
      if (payPeriod && payPeriod !== 'all') params.pay_period = payPeriod;
      const res = await axios.get(`${API}/dashboard/kpis`, { headers: authHeaders, params });
      setKpiData(res.data);
    } catch (err) { console.error(err); }
  }, [authHeaders, dateFilter, payPeriod]);

  useEffect(() => { fetchGenLeads(); fetchGenKpis(); }, [fetchGenLeads, fetchGenKpis]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-0.5 text-gray-300 inline" />;
    return sortDir === 'desc' ? <ArrowDown className="w-3 h-3 ml-0.5 text-emerald-500 inline" /> : <ArrowUp className="w-3 h-3 ml-0.5 text-emerald-500 inline" />;
  };

  const filteredLeads = leads
    .filter(l => {
      if (payPeriod && payPeriod !== 'all') {
        const period = PAY_PERIODS_DATA.find(p => p.name === payPeriod);
        if (period) {
          const vd = l.visit_date ? new Date(l.visit_date + 'T00:00:00') : null;
          if (!vd || vd < period.start || vd > period.end) return false;
        }
      } else if (dateFilter && dateFilter !== 'all') {
        const now = new Date();
        let startDt, endDt;
        if (dateFilter === 'current_year') { startDt = new Date(now.getFullYear(), 0, 1); endDt = new Date(now.getFullYear(), 11, 31); }
        else if (dateFilter === 'last_year') { startDt = new Date(now.getFullYear()-1, 0, 1); endDt = new Date(now.getFullYear()-1, 11, 31); }
        else {
          const days = dateFilter === 'week' ? 7 : dateFilter === '2weeks' ? 14 : 0;
          if (days > 0) startDt = new Date(now - days * 86400000);
        }
        if (startDt) {
          const vd = l.visit_date ? new Date(l.visit_date + 'T00:00:00') : null;
          if (!vd || vd < startDt || (endDt && vd > endDt)) return false;
        }
      }
      return true;
    })
    .filter(l => statusFilter === 'all' || l.status === statusFilter)
    .filter(l => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (l.name || '').toLowerCase().includes(s) || (l.city || '').toLowerCase().includes(s);
    })
    .sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'desc' ? -cmp : cmp;
    });

  const totalLeads = filteredLeads.length;
  const salesCount = filteredLeads.filter(l => l.status === 'SALE').length;
  const pendingCount = filteredLeads.filter(l => l.status === 'PENDING').length;
  const revenue = filteredLeads.filter(l => l.status === 'SALE').reduce((s, l) => s + (l.ticket_value || 0), 0);

  return (
    <div className="space-y-6" data-testid="generators-tab">
      {/* KPI Summary */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a472a' }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white" data-testid="generators-title">Generators</h2>
              <p className="text-xs text-white/50">Generac & Generator Sales</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Total Leads</p>
              <p className="text-3xl font-mono font-bold text-white">{totalLeads}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Sales</p>
              <p className="text-3xl font-mono font-bold text-emerald-400">{salesCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Pending</p>
              <p className="text-3xl font-mono font-bold text-yellow-400">{pendingCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2">Revenue</p>
              <p className="text-2xl font-mono font-bold text-emerald-400">
                ${revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search generators..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              data-testid="gen-search" />
            <Target className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map(s => {
              const sc = STATUS_COLORS[s] || {};
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${statusFilter === s ? 'text-white shadow-sm' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}
                  style={statusFilter === s ? { backgroundColor: sc.solid || '#1a472a' } : {}}
                  data-testid={`gen-filter-${s}`}>
                  {s === 'all' ? 'All' : (STATUS_LABELS[s] || s)}
                </button>
              );
            })}
          </div>
        </div>

        <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-50/50">
                  <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort('customer_number')}># <SortIcon field="customer_number" /></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort('name')}>Name <SortIcon field="name" /></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort('city')}>City <SortIcon field="city" /></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort('ticket_value')}>Value <SortIcon field="ticket_value" /></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort('visit_date')}>Visit <SortIcon field="visit_date" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length > 0 ? filteredLeads.map((lead, i) => {
                  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.PENDING;
                  return (
                    <TableRow key={lead.lead_id || i}
                      className="border-b border-gray-100 cursor-pointer hover:bg-emerald-50/50 transition-colors"
                      onClick={() => setEditingLead({...lead})}
                      data-testid={`gen-row-${i}`}>
                      <TableCell className="py-2 px-2 font-mono text-[10px] text-gray-400">{lead.customer_number || '\u2014'}</TableCell>
                      <TableCell className="py-2 px-2 text-xs font-medium text-gray-800">{lead.name}</TableCell>
                      <TableCell className="py-2 px-2 text-xs text-gray-600 hidden sm:table-cell">{lead.city}</TableCell>
                      <TableCell className="py-2 px-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                          {STATUS_LABELS[lead.status] || lead.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-2 font-mono text-xs font-semibold text-gray-800">
                        ${(lead.ticket_value || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </TableCell>
                      <TableCell className="py-2 px-2 font-mono text-[10px] text-gray-500">{lead.visit_date || '\u2014'}</TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-gray-400">
                      <Zap className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No generator leads found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t border-gray-100 text-xs text-gray-400 text-center">
            {filteredLeads.length} generator leads
          </div>
        </Card>
      </div>
    </div>
  );
}
