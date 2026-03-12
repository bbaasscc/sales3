import { useState, useCallback } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Phone, AlertTriangle, Check, Target, Plus, Upload,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Database,
} from "lucide-react";
import { toast } from "sonner";
import {
  BRAND_COLORS, PAY_PERIODS_DATA, API, STATUS_OPTIONS, STATUS_LABELS, STATUS_COLORS,
  ALL_PIPELINE_ACTIONS, PIPELINE_STEPS,
} from "@/lib/constants";

const FILTER_STATUS_OPTIONS = ['all', ...STATUS_OPTIONS];

export default function StatusTab({
  kpiData, allClientNotes, followUpActions, openClientModal, openPipelineMenu,
  allLeads, payPeriod, dateFilter, searchTerm, setSearchTerm,
  statusFilter, setStatusFilter, setNewLeadOpen, setNewLeadStep, setNewLeadText,
  setEditingLead, setPayPeriod, setDateFilter, authHeaders, fetchAllLeads, fetchDashboardData,
}) {
  const [view, setView] = useState('leads'); // 'leads' | 'pipeline'
  const [showDataTools, setShowDataTools] = useState(false);
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

  // Pipeline helpers
  const isStepDone = (clientName, stepId) => followUpActions.some(a => a.client_name === clientName && a.step_id === stepId);
  const getPipelineProgress = (clientName) => {
    const done = ALL_PIPELINE_ACTIONS.filter(a => isStepDone(clientName, a.id)).length;
    return { done, total: ALL_PIPELINE_ACTIONS.length };
  };

  // Filter leads
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
      return (l.name || '').toLowerCase().includes(s) || (l.city || '').toLowerCase().includes(s) || (l.customer_number || '').toLowerCase().includes(s);
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
      toast.success("Status updated");
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

  // Pipeline view data
  const activeFollowups = (kpiData?.follow_ups || []).filter(f => {
    const p = getPipelineProgress(f.name);
    return p.done < p.total;
  });

  return (
    <div>
      {/* Sub-navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView('leads')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${view === 'leads' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            All Leads
          </button>
          <button onClick={() => setView('pipeline')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${view === 'pipeline' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Pipeline ({activeFollowups.length})
          </button>
        </div>
        <button onClick={() => setShowDataTools(!showDataTools)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
          data-testid="data-tools-toggle">
          <Database className="w-3.5 h-3.5" />
          Load Data
          {showDataTools ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Data tools (collapsible) */}
      {showDataTools && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl flex gap-2">
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
      )}

      {/* LEADS VIEW */}
      {view === 'leads' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, city or client #..."
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
          </div>

          <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort('customer_number')}># <SortIcon field="customer_number" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort('name')}>Name <SortIcon field="name" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort('city')}>City <SortIcon field="city" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2">Unit</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none" onClick={() => toggleSort('ticket_value')}>Value <SortIcon field="ticket_value" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('visit_date')}>Visit <SortIcon field="visit_date" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 hidden lg:table-cell">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead, i) => {
                    const isInactive = lead.status === 'CANCEL_APPOINTMENT' || lead.status === 'RESCHEDULED';
                    const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.PENDING;
                    return (
                      <TableRow key={lead.lead_id || i}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isInactive ? 'opacity-50 bg-gray-50/50 hover:opacity-75' : 'hover:bg-blue-50/50'}`}
                        onClick={() => setEditingLead({...lead})}
                        data-testid={`status-row-${i}`}>
                        <TableCell className="py-2 px-2 font-mono text-[10px] text-gray-400">{lead.customer_number || '\u2014'}</TableCell>
                        <TableCell className="py-2 px-2 text-xs font-medium text-gray-800">
                          <span className="line-clamp-1">{lead.name}</span>
                        </TableCell>
                        <TableCell className="py-2 px-2 text-xs text-gray-600 hidden sm:table-cell">{lead.city}</TableCell>
                        <TableCell className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 text-[10px] text-gray-600">{lead.unit_type}</TableCell>
                        <TableCell className="py-2 px-2 font-mono text-xs font-semibold text-gray-800">${(lead.ticket_value || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</TableCell>
                        <TableCell className="py-2 px-2 font-mono text-[10px] text-gray-500 hidden lg:table-cell">{lead.visit_date || '\u2014'}</TableCell>
                        <TableCell className="py-2 px-2 hidden lg:table-cell" onClick={e => e.stopPropagation()}>
                          {lead.status === 'PENDING' && (
                            <button onClick={() => openPipelineMenu(lead)} className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded font-bold hover:bg-blue-100">
                              Pipeline
                            </button>
                          )}
                        </TableCell>
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
        </>
      )}

      {/* PIPELINE VIEW */}
      {view === 'pipeline' && (
        <div className="space-y-3">
          {activeFollowups.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Check className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm">All pipeline steps completed</p>
            </div>
          ) : (
            activeFollowups.map((fu, i) => {
              const progress = getPipelineProgress(fu.name);
              const note = allClientNotes[fu.name];
              const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
              return (
                <Card key={i} className={`p-4 border transition-all hover:shadow-md cursor-pointer ${fu.is_urgent ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}
                  onClick={() => openClientModal(fu)}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">{fu.name}</h4>
                      <p className="text-[10px] text-gray-500">{fu.city} &mdash; Visit: {fu.visit_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {fu.is_urgent && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded-full">{fu.days_until}d</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">{progress.done}/{progress.total}</span>
                    <button onClick={(e) => { e.stopPropagation(); openPipelineMenu(fu); }}
                      className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded font-bold hover:bg-blue-100">
                      Actions
                    </button>
                  </div>
                  {note?.comment && <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-1">Note: {note.comment}</p>}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
