import { useState, useCallback } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Target, Plus, Upload, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { BRAND_COLORS, PAY_PERIODS_DATA, API, STATUS_OPTIONS, STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";

const FILTER_STATUS_OPTIONS = ['all', ...STATUS_OPTIONS];
const INACTIVE_STATUSES = new Set(['CANCEL_APPOINTMENT', 'RESCHEDULED']);

function InlineStatus({ lead, onSave }) {
  const [editing, setEditing] = useState(false);
  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.PENDING;

  if (editing) {
    return (
      <select value={lead.status} autoFocus
        onChange={(e) => { onSave(lead.lead_id, "status", e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        onClick={(e) => e.stopPropagation()}
        className="w-full px-1 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        data-testid={`edit-status-${lead.lead_id}`}
      >
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
      </select>
    );
  }

  return (
    <span onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer hover:ring-2 hover:ring-blue-300 ${sc.bg} ${sc.text}`}
      data-testid={`cell-status-${lead.lead_id}`}
    >{STATUS_LABELS[lead.status] || lead.status}</span>
  );
}

export default function DataTab({
  allLeads, isAdmin, payPeriod, dateFilter, searchTerm, setSearchTerm,
  statusFilter, setStatusFilter, setNewLeadOpen, setNewLeadStep, setNewLeadText,
  setEditingLead, setPayPeriod, setDateFilter, authHeaders, fetchAllLeads, fetchDashboardData,
}) {
  const [sortField, setSortField] = useState('visit_date');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-0.5 text-gray-300 inline" />;
    return sortDir === 'desc' ? <ArrowDown className="w-3 h-3 ml-0.5 text-blue-500 inline" /> : <ArrowUp className="w-3 h-3 ml-0.5 text-blue-500 inline" />;
  };

  const filteredLeads = allLeads
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
      return (l.name || '').toLowerCase().includes(s) || (l.city || '').toLowerCase().includes(s) || (l.email || '').toLowerCase().includes(s) || (l.customer_number || '').toLowerCase().includes(s);
    })
    .sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'desc' ? -cmp : cmp;
    });

  const handleStatusSave = useCallback(async (leadId, field, value) => {
    try {
      await axios.put(`${API}/leads/${leadId}`, { [field]: value }, { headers: authHeaders });
      toast.success(`Status updated`);
      fetchAllLeads();
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    }
  }, [authHeaders, fetchAllLeads, fetchDashboardData]);

  const handleImportXls = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/leads/import-xls`, formData, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Imported ${res.data.count} leads`);
      fetchAllLeads();
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    }
    e.target.value = '';
  };

  return (
    <div>
      {payPeriod && payPeriod !== 'all' && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center justify-between">
          <span>Filtered by period: <strong>{payPeriod}</strong> (visit date)</span>
          <button onClick={() => { setPayPeriod('all'); setDateFilter('all'); }} className="text-blue-500 hover:text-blue-700 font-bold">Show All</button>
        </div>
      )}
      {dateFilter && dateFilter !== 'all' && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center justify-between">
          <span>Filtered by: <strong>{dateFilter}</strong></span>
          <button onClick={() => setDateFilter('all')} className="text-blue-500 hover:text-blue-700 font-bold">Show All</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or city..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid="data-search" />
          <Target className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTER_STATUS_OPTIONS.map(s => {
            const sc = STATUS_COLORS[s] || {};
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${statusFilter === s ? 'text-white shadow-sm' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}
                style={statusFilter === s ? { backgroundColor: sc.solid || BRAND_COLORS.primary } : {}}>
                {s === 'all' ? 'All' : (STATUS_LABELS[s] || s)}
              </button>
            );
          })}
        </div>
        <button onClick={() => { setNewLeadOpen(true); setNewLeadStep('paste'); setNewLeadText(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          data-testid="data-add-lead">
          <Plus className="w-4 h-4" /> New Lead
        </button>
        <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          data-testid="data-import-xls">
          <Upload className="w-4 h-4" /> Import XLS
          <input type="file" accept=".xls,.xlsx" className="hidden" onChange={handleImportXls} />
        </label>
      </div>

      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>Name <SortIcon field="name" /></TableHead>
                {isAdmin && <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden sm:table-cell">Salesperson</TableHead>}
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort('city')}>City <SortIcon field="city" /></TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 cursor-pointer select-none" onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3">Unit</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 cursor-pointer select-none" onClick={() => toggleSort('ticket_value')}>Value <SortIcon field="ticket_value" /></TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden md:table-cell">Commission</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('visit_date')}>Visit <SortIcon field="visit_date" /></TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('close_date')}>Close <SortIcon field="close_date" /></TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden xl:table-cell cursor-pointer select-none" onClick={() => toggleSort('install_date')}>Install <SortIcon field="install_date" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead, i) => {
                const isInactive = INACTIVE_STATUSES.has(lead.status);
                return (
                <TableRow key={lead.lead_id || i}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${isInactive ? 'opacity-50 bg-gray-50/50 hover:opacity-75' : 'hover:bg-blue-50/50'}`}
                  onClick={() => setEditingLead({...lead})}
                  data-testid={`data-row-${i}`}>
                  <TableCell className="py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-gray-800">
                    <span className="line-clamp-1">{lead.name}</span>
                  </TableCell>
                  {isAdmin && <TableCell className="py-2 px-2 sm:px-3 text-[10px] sm:text-xs text-blue-600 hidden sm:table-cell">{lead.salesperson_name || '\u2014'}</TableCell>}
                  <TableCell className="py-2 px-2 sm:px-3 text-xs text-gray-600 hidden sm:table-cell">{lead.city}</TableCell>
                  <TableCell className="py-2 px-2 sm:px-3">
                    <InlineStatus lead={lead} onSave={handleStatusSave} />
                  </TableCell>
                  <TableCell className="py-2 px-2 sm:px-3 text-[10px] sm:text-xs text-gray-600">{lead.unit_type}</TableCell>
                  <TableCell className="py-2 px-2 sm:px-3 font-mono text-xs font-semibold text-gray-800">${(lead.ticket_value || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</TableCell>
                  <TableCell className="py-2 px-2 sm:px-3 font-mono text-xs text-green-700 hidden md:table-cell">${(lead.commission_value || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</TableCell>
                  <TableCell className="py-2 px-2 sm:px-3 font-mono text-[10px] text-gray-500 hidden lg:table-cell">{lead.visit_date || '\u2014'}</TableCell>
                  <TableCell className="py-2 px-2 sm:px-3 font-mono text-[10px] text-gray-500 hidden lg:table-cell">{lead.close_date || '\u2014'}</TableCell>
                  <TableCell className="py-2 px-2 sm:px-3 font-mono text-[10px] text-gray-500 hidden xl:table-cell">{lead.install_date || '\u2014'}</TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t border-gray-100 text-xs text-gray-400 text-center">
          {filteredLeads.length} records
        </div>
      </Card>
    </div>
  );
}
