import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Phone, AlertTriangle, Check, Target, Plus, Upload,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Database,
  Clock, Wrench, Calendar, Edit3, PhoneCall, Eye, MessageSquare, Mail,
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
  pendingTasks, fetchTasks,
}) {
  const [view, setView] = useState('leads');
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

  const handleCompleteTask = async (taskId) => {
    try {
      await axios.put(`${API}/tasks/${taskId}/complete`, {}, { headers: authHeaders });
      toast.success("Task completed");
      if (fetchTasks) fetchTasks();
    } catch (err) {
      toast.error("Failed to complete task");
    }
  };

  const handleDismissTask = async (taskId) => {
    try {
      await axios.put(`${API}/tasks/${taskId}/dismiss`, {}, { headers: authHeaders });
      toast.success("Task dismissed");
      if (fetchTasks) fetchTasks();
    } catch (err) {
      toast.error("Failed to dismiss task");
    }
  };

  // Open lead edit modal from task
  const openLeadFromTask = (task) => {
    const lead = allLeads.find(l => l.lead_id === task.lead_id);
    if (lead) {
      setEditingLead({...lead});
    } else {
      toast.error("Lead not found");
    }
  };

  // Log activity and perform action
  const handleCall = (lead, e) => {
    e?.stopPropagation();
    if (!lead.phone) return;
    axios.post(`${API}/leads/${lead.lead_id}/activity`, { type: 'call' }, { headers: authHeaders }).catch(() => {});
    const phone = (lead.phone || '').replace(/\D/g, '').slice(-10);
    window.location.href = `tel:${phone}`;
    toast.success(`Calling ${lead.name.split(' ')[0]}...`);
  };
  const handleSMS = (lead, e) => {
    e?.stopPropagation();
    if (!lead.phone) return;
    axios.post(`${API}/leads/${lead.lead_id}/activity`, { type: 'sms' }, { headers: authHeaders }).catch(() => {});
    const phone = (lead.phone || '').replace(/\D/g, '').slice(-10);
    const sep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
    window.location.href = `sms:${phone}${sep}body=`;
    toast.success(`SMS to ${lead.name.split(' ')[0]}`);
  };
  const handleEmail = (lead, e) => {
    e?.stopPropagation();
    if (!lead.email) return;
    axios.post(`${API}/leads/${lead.lead_id}/activity`, { type: 'email' }, { headers: authHeaders }).catch(() => {});
    window.open(`mailto:${lead.email}`, '_blank');
    toast.success(`Email to ${lead.name.split(' ')[0]}`);
  };

  // Pipeline view data
  const activeFollowups = (kpiData?.follow_ups || []).filter(f => {
    const p = getPipelineProgress(f.name);
    return p.done < p.total;
  });

  const activeTasks = (pendingTasks || []).filter(t => t.status === 'pending');

  return (
    <div>
      {/* Sub-navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView('leads')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${view === 'leads' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            data-testid="view-leads-btn">
            All Leads
          </button>
          <button onClick={() => setView('pipeline')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${view === 'pipeline' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            data-testid="view-pipeline-btn">
            Pipeline ({activeFollowups.length})
          </button>
          <button onClick={() => setView('tasks')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all relative ${view === 'tasks' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            data-testid="view-tasks-btn">
            Tasks
            {activeTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeTasks.length}
              </span>
            )}
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

      {/* TASKS VIEW */}
      {view === 'tasks' && (
        <div className="space-y-3" data-testid="tasks-view">
          {/* Tasks Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-gray-800">Pending Installations</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                {activeTasks.length} pending
              </span>
            </div>
          </div>

          {activeTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400" data-testid="tasks-empty">
              <Check className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm font-medium">No pending tasks</p>
              <p className="text-xs mt-1">All installations have been scheduled</p>
            </div>
          ) : (
            activeTasks.map((task) => (
              <Card key={task.task_id}
                className="p-4 border border-amber-200 bg-amber-50/30 hover:shadow-md transition-all"
                data-testid={`task-card-${task.task_id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <h4 className="text-sm font-bold text-gray-800 truncate">{task.lead_name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">
                      {task.lead_city && <span>{task.lead_city}</span>}
                      {task.lead_unit_type && <span> &mdash; {task.lead_unit_type}</span>}
                    </p>
                    {task.lead_ticket_value > 0 && (
                      <p className="text-xs font-mono font-semibold text-gray-700 ml-6 mt-0.5">
                        ${task.lead_ticket_value.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 ml-6 mt-1">
                      Created: {new Date(task.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openLeadFromTask(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      data-testid={`task-edit-${task.task_id}`}>
                      <Calendar className="w-3 h-3" /> Set Date
                    </button>
                    {task.lead_phone && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCall({...task, phone: task.lead_phone, name: task.lead_name, lead_id: task.lead_id}, e); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        data-testid={`task-call-${task.task_id}`}>
                        <PhoneCall className="w-3 h-3" /> Call
                      </button>
                    )}
                    <button
                      onClick={() => handleDismissTask(task.task_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                      data-testid={`task-dismiss-${task.task_id}`}>
                      Dismiss
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}

          {/* Completed Tasks (collapsed) */}
          {(pendingTasks || []).filter(t => t.status === 'completed').length > 0 && (
            <CompletedTasks tasks={(pendingTasks || []).filter(t => t.status === 'completed')} />
          )}
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
                    style={statusFilter === s ? { backgroundColor: sc.solid || BRAND_COLORS.primary } : {}}
                    data-testid={`filter-status-${s}`}>
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
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('name')}>Name <SortIcon field="name" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('city')}>City <SortIcon field="city" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 whitespace-nowrap">Unit</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('ticket_value')}>Value <SortIcon field="ticket_value" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('visit_date')}>Visit <SortIcon field="visit_date" /></TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-500 py-2 px-2 whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead, i) => {
                    const isInactive = lead.status === 'CANCEL_APPOINTMENT' || lead.status === 'RESCHEDULED';
                    const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.PENDING;
                    const hasPendingInstall = lead.status === 'SALE' && lead.install_date === 'PENDING';
                    return (
                      <TableRow key={lead.lead_id || i}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isInactive ? 'opacity-50 bg-gray-50/50 hover:opacity-75' : hasPendingInstall ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-blue-50/50'}`}
                        style={{ borderLeft: `4px solid ${sc.solid || '#6B7280'}` }}
                        onClick={() => setEditingLead({...lead})}
                        data-testid={`status-row-${i}`}>
                        <TableCell className="py-2 px-2 text-xs font-medium text-gray-800 min-w-[140px]">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="line-clamp-1">{lead.name}</span>
                              {hasPendingInstall && (
                                <span className="flex-shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-amber-200 text-amber-800">
                                  INSTALL
                                </span>
                              )}
                            </div>
                            {lead.customer_number && <span className="text-[10px] text-gray-400 font-mono">#{lead.customer_number}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2 text-xs text-gray-600 whitespace-nowrap">{lead.city}</TableCell>
                        <TableCell className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${sc.bg} ${sc.text}`}>
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 text-[10px] text-gray-600 whitespace-nowrap">{lead.unit_type}</TableCell>
                        <TableCell className="py-2 px-2 font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">${(lead.ticket_value || 0).toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0})}</TableCell>
                        <TableCell className="py-2 px-2 font-mono text-[10px] text-gray-500 whitespace-nowrap">{lead.visit_date || '\u2014'}</TableCell>
                        <TableCell className="py-1.5 px-1.5" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-0.5 whitespace-nowrap">
                            {lead.phone && (
                              <button onClick={(e) => handleCall(lead, e)} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 active:scale-95 transition-transform" title="Call"
                                data-testid={`call-btn-${i}`}>
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {lead.phone && (
                              <button onClick={(e) => handleSMS(lead, e)} className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 active:scale-95 transition-transform" title="SMS"
                                data-testid={`sms-btn-${i}`}>
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {lead.email && (
                              <button onClick={(e) => handleEmail(lead, e)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 active:scale-95 transition-transform" title="Email"
                                data-testid={`email-btn-${i}`}>
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {lead.status === 'PENDING' && (
                              <button onClick={(e) => { e.stopPropagation(); openPipelineMenu(lead); }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 active:scale-95 transition-transform" title="Add to Pipeline"
                                data-testid={`pipeline-btn-${i}`}>
                                <Target className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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
        <div className="space-y-3" data-testid="pipeline-view">
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
                <div key={i} className="relative anim-row" style={{ animationDelay: `${i * 0.05}s` }}
                  data-testid={`pipeline-card-${i}`}>
                  {/* Book-style card */}
                  <div className={`rounded-xl overflow-hidden border-2 transition-all hover:shadow-lg cursor-pointer ${fu.is_urgent ? 'border-red-300' : 'border-gray-200'}`}
                    style={{ borderLeft: '6px solid #1E3A5F' }}>
                    {/* Book spine accent */}
                    <div className="flex">
                      {/* Content */}
                      <div className="flex-1 p-4" onClick={() => openClientModal(fu)}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-bold text-gray-800">{fu.name}</h4>
                            <p className="text-[10px] text-gray-400 font-mono">
                              {fu.customer_number && `#${fu.customer_number} · `}{fu.city} · Visit: {fu.visit_date}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {fu.is_urgent && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded-full">{fu.days_until}d</span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">{progress.done}/{progress.total}</span>
                        </div>
                        {note?.comment && <p className="text-[10px] text-gray-400 line-clamp-1">Note: {note.comment}</p>}
                      </div>
                    </div>
                    {/* Action bar */}
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openPipelineMenu(fu)}
                        className="text-[10px] px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition-all"
                        data-testid={`pipeline-actions-${i}`}>
                        Closing Flow
                      </button>
                      {fu.phone && (
                        <button onClick={(e) => handleCall(fu, e)}
                          className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 active:scale-95 transition-transform" title="Call">
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {fu.phone && (
                        <button onClick={(e) => handleSMS(fu, e)}
                          className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 active:scale-95 transition-transform" title="SMS">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {fu.email && (
                        <button onClick={(e) => handleEmail(fu, e)}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 active:scale-95 transition-transform" title="Email">
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function CompletedTasks({ tasks }) {
  const [expanded, setExpanded] = useState(false);
  const recentCompleted = tasks.slice(0, 5);

  return (
    <div className="mt-4">
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
        data-testid="completed-tasks-toggle">
        <Check className="w-3.5 h-3.5" />
        Completed ({tasks.length})
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {recentCompleted.map(task => (
            <div key={task.task_id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 opacity-60">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-600 line-through">{task.lead_name}</span>
                {task.install_date_set && (
                  <span className="text-[10px] text-green-600 font-mono">Installed: {task.install_date_set}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
