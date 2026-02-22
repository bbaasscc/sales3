import { useState, useCallback } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Target, Plus, Upload, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BRAND_COLORS, PAY_PERIODS_DATA, API, STATUS_OPTIONS, STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";

const FILTER_STATUS_OPTIONS = ['all', ...STATUS_OPTIONS];

function EditableCell({ value, field, lead, onSave, type = "text" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");

  const handleSave = () => {
    const newVal = type === "number" ? parseFloat(val) || 0 : val;
    if (String(newVal) !== String(value ?? "")) {
      onSave(lead.lead_id, field, newVal);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setVal(value ?? ""); setEditing(false); }
  };

  if (field === "status") {
    return editing ? (
      <select value={val} autoFocus
        onChange={(e) => { setVal(e.target.value); }}
        onBlur={() => {
          if (val !== (value ?? "")) onSave(lead.lead_id, "status", val);
          setEditing(false);
        }}
        className="w-full px-1 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        data-testid={`edit-status-${lead.lead_id}`}
      >
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    ) : (
      <span onClick={(e) => { e.stopPropagation(); setEditing(true); setVal(value ?? ""); }}
        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer hover:ring-2 hover:ring-blue-300 ${
          value === 'SALE' ? 'bg-green-100 text-green-700' :
          value === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
        }`} data-testid={`cell-status-${lead.lead_id}`}>{value}</span>
    );
  }

  if (!editing) {
    const display = type === "number" ? `$${(value || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}` :
      type === "date" ? (value || "\u2014") : (value || "\u2014");
    return (
      <span onClick={(e) => { e.stopPropagation(); setEditing(true); setVal(value ?? ""); }}
        className="cursor-pointer hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 rounded px-1 py-0.5 transition-all inline-block min-w-[30px]"
        data-testid={`cell-${field}-${lead.lead_id}`}
      >{display}</span>
    );
  }

  return (
    <input type={type === "date" ? "date" : type === "number" ? "number" : "text"}
      value={val} autoFocus step={type === "number" ? "0.01" : undefined}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleSave} onKeyDown={handleKeyDown}
      className="w-full px-1 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
      data-testid={`edit-${field}-${lead.lead_id}`}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function DataTab({
  allLeads, isAdmin, payPeriod, dateFilter, searchTerm, setSearchTerm,
  statusFilter, setStatusFilter, setNewLeadOpen, setNewLeadStep, setNewLeadText,
  setEditingLead, setPayPeriod, setDateFilter, authHeaders, fetchAllLeads, fetchDashboardData,
}) {
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
        const days = dateFilter === 'week' ? 7 : dateFilter === '2weeks' ? 14 : dateFilter === 'month' ? 30 : dateFilter === 'year' ? 365 : 0;
        if (days > 0) {
          const vd = l.visit_date ? new Date(l.visit_date + 'T00:00:00') : null;
          if (!vd || vd < new Date(now - days * 86400000)) return false;
        }
      }
      return true;
    })
    .filter(l => statusFilter === 'all' || l.status === statusFilter)
    .filter(l => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (l.name || '').toLowerCase().includes(s) || (l.city || '').toLowerCase().includes(s) || (l.email || '').toLowerCase().includes(s);
    });

  const handleInlineSave = useCallback(async (leadId, field, value) => {
    try {
      await axios.put(`${API}/leads/${leadId}`, { [field]: value }, { headers: authHeaders });
      toast.success(`Updated ${field}`);
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

      <div className="mb-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-700 flex items-center gap-2">
        <Pencil className="w-3 h-3" /> Click any cell to edit inline. Changes save automatically.
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or city..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-testid="data-search" />
          <Target className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        </div>
        <div className="flex gap-1">
          {['all', 'SALE', 'PENDING', 'LOST'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'text-white shadow-sm' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}
              style={statusFilter === s ? { backgroundColor: s === 'SALE' ? '#22C55E' : s === 'LOST' ? '#EF4444' : s === 'PENDING' ? '#F59E0B' : BRAND_COLORS.primary } : {}}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
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
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3">Name</TableHead>
                {isAdmin && <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden sm:table-cell">Salesperson</TableHead>}
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden sm:table-cell">City</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3">Status</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3">Unit</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3">Value</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden md:table-cell">Commission</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden lg:table-cell">Visit</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden lg:table-cell">Close</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3 hidden xl:table-cell">Install</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead, i) => (
                <TableRow key={lead.lead_id || i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors" data-testid={`data-row-${i}`}>
                  <TableCell className="py-1.5 px-2 sm:px-3 text-xs sm:text-sm font-medium text-gray-800">
                    <EditableCell value={lead.name} field="name" lead={lead} onSave={handleInlineSave} />
                  </TableCell>
                  {isAdmin && <TableCell className="py-1.5 px-2 sm:px-3 text-[10px] sm:text-xs text-blue-600 hidden sm:table-cell">{lead.salesperson_name || '\u2014'}</TableCell>}
                  <TableCell className="py-1.5 px-2 sm:px-3 text-xs text-gray-600 hidden sm:table-cell">
                    <EditableCell value={lead.city} field="city" lead={lead} onSave={handleInlineSave} />
                  </TableCell>
                  <TableCell className="py-1.5 px-2 sm:px-3">
                    <EditableCell value={lead.status} field="status" lead={lead} onSave={handleInlineSave} />
                  </TableCell>
                  <TableCell className="py-1.5 px-2 sm:px-3 text-[10px] sm:text-xs text-gray-600">
                    <EditableCell value={lead.unit_type} field="unit_type" lead={lead} onSave={handleInlineSave} />
                  </TableCell>
                  <TableCell className="py-1.5 px-2 sm:px-3 font-mono text-xs font-semibold text-gray-800">
                    <EditableCell value={lead.ticket_value} field="ticket_value" lead={lead} onSave={handleInlineSave} type="number" />
                  </TableCell>
                  <TableCell className="py-1.5 px-2 sm:px-3 font-mono text-xs text-green-700 hidden md:table-cell">
                    <EditableCell value={lead.commission_value} field="commission_value" lead={lead} onSave={handleInlineSave} type="number" />
                  </TableCell>
                  <TableCell className="py-1.5 px-2 sm:px-3 font-mono text-[10px] text-gray-500 hidden lg:table-cell">
                    <EditableCell value={lead.visit_date} field="visit_date" lead={lead} onSave={handleInlineSave} type="date" />
                  </TableCell>
                  <TableCell className="py-1.5 px-2 sm:px-3 font-mono text-[10px] text-gray-500 hidden lg:table-cell">
                    <EditableCell value={lead.close_date} field="close_date" lead={lead} onSave={handleInlineSave} type="date" />
                  </TableCell>
                  <TableCell className="py-1.5 px-2 sm:px-3 font-mono text-[10px] text-gray-500 hidden xl:table-cell">
                    <EditableCell value={lead.install_date} field="install_date" lead={lead} onSave={handleInlineSave} type="date" />
                  </TableCell>
                </TableRow>
              ))}
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
