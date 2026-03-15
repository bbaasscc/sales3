import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { RefreshCw, Menu, LogOut } from "lucide-react";

import LoginPage from "@/pages/LoginPage";
import AdminPanel from "@/pages/AdminPanel";
import AdminOverview from "@/pages/AdminOverview";
import DashboardTab from "@/components/DashboardTab.jsx";
import FollowupsTab from "@/components/FollowupsTab";
import StatusTab from "@/components/StatusTab";
import DataTab from "@/components/DataTab";
import EarningsTab from "@/components/EarningsTab";
import EmailIngestConfig from "@/components/EmailIngestConfig";
import SaleConversionModal from "@/components/SaleConversionModal";
import {
  PipelineModal, NewLeadModal, DeleteConfirmModal,
  ClientDetailModal, SaleDetailModal, InstallationsModal, EditLeadModal,
} from "@/components/Modals";
import {
  BRAND_COLORS, PAY_PERIODS, getCurrentPayPeriod,
  ALL_PIPELINE_ACTIONS, PIPELINE_STEPS, getFirstName, API,
} from "@/lib/constants";

// Auth wrapper
function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    const u = localStorage.getItem('auth_user');
    return u ? JSON.parse(u) : null;
  });

  const handleLogin = (token, user) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setAuthToken(token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthToken(null);
    setCurrentUser(null);
  };

  // Global 401 interceptor - auto-logout on expired/invalid token
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401 && authToken) {
          handleLogout();
          toast.error("Session expired. Please sign in again.");
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } })
        .then(res => setCurrentUser(res.data))
        .catch(() => handleLogout());
    }
  }, [authToken]);

  if (!authToken || !currentUser) {
    return (
      <>
        <Toaster position="top-center" />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return <MainDashboard token={authToken} user={currentUser} onLogout={handleLogout} />;
}

// Main Dashboard (authenticated)
function MainDashboard({ token, user, onLogout }) {
  const authHeaders = { Authorization: `Bearer ${token}` };
  const isAdmin = user.role === 'admin';
  
  // Admin filter state
  const [filterSalespersonId, setFilterSalespersonId] = useState(null);
  const [filterSalespersonName, setFilterSalespersonName] = useState(null);

  const handleFilterSalesperson = (spId, spName) => {
    setFilterSalespersonId(spId);
    setFilterSalespersonName(spName);
    setActiveTab('dashboard');
  };

  const clearSalespersonFilter = () => {
    setFilterSalespersonId(null);
    setFilterSalespersonName(null);
  };

  // Core state
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState("current_year");
  const [payPeriod, setPayPeriod] = useState("all");
  const [kpiData, setKpiData] = useState(null);
  const [error, setError] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeCategory, setActiveCategory] = useState('hvac');

  // Follow-ups state
  const [followUpActions, setFollowUpActions] = useState([]);
  const [allClientNotes, setAllClientNotes] = useState({});
  const [pendingTasks, setPendingTasks] = useState([]);

  // Modal state
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [clientNote, setClientNote] = useState({ next_follow_up: '', comment: '', priority: 'high' });
  const [noteSaving, setNoteSaving] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [pipelineSchedule, setPipelineSchedule] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [installationsOpen, setInstallationsOpen] = useState(false);

  // Data tab state
  const [allLeads, setAllLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingLead, setEditingLead] = useState(null);
  const [originalLead, setOriginalLead] = useState(null);
  const [saleConversion, setSaleConversion] = useState(null); // lead being converted to SALE
  const openEditLead = (lead) => {
    const copy = lead ? {...lead} : null;
    setEditingLead(copy);
    setOriginalLead(copy ? {...copy} : null);
  };

  // New lead state
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newLeadText, setNewLeadText] = useState('');
  const [newLeadForm, setNewLeadForm] = useState({});
  const [newLeadStep, setNewLeadStep] = useState('paste');

  // === DATA FETCHING ===
  const fetchDashboardData = useCallback(async (showToast = false, resetToCurrentPeriod = false) => {
    if (showToast) { setRefreshing(true); } else { setLoading(true); }
    setError(null);
    const currentPeriod = resetToCurrentPeriod ? getCurrentPayPeriod() : payPeriod;
    if (resetToCurrentPeriod && currentPeriod !== payPeriod) setPayPeriod(currentPeriod);
    try {
      const params = { date_filter: dateFilter, category: activeCategory };
      const periodToUse = resetToCurrentPeriod ? currentPeriod : payPeriod;
      if (periodToUse && periodToUse !== "all") params.pay_period = periodToUse;
      if (isAdmin && filterSalespersonId) params.salesperson_id = filterSalespersonId;
      const response = await axios.get(`${API}/dashboard/kpis`, { params, headers: authHeaders });
      setKpiData(response.data);
      if (showToast) toast.success("Data Updated", { description: `${response.data.closed_deals} deals for current period` });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load dashboard data");
      if (showToast) toast.error("Update Failed");
    } finally { setLoading(false); setRefreshing(false); }
  }, [dateFilter, payPeriod, filterSalespersonId, activeCategory]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const fetchActions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/followup/actions`, { headers: authHeaders });
      setFollowUpActions(res.data.actions || []);
    } catch (err) { console.error("Error fetching actions:", err); }
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const fetchAllLeads = useCallback(async () => {
    try {
      const params = { category: activeCategory };
      if (isAdmin && filterSalespersonId) params.salesperson_id = filterSalespersonId;
      const res = await axios.get(`${API}/leads`, { headers: authHeaders, params });
      setAllLeads(res.data.leads || []);
    } catch (err) { console.error(err); }
  }, [filterSalespersonId, activeCategory]);

  useEffect(() => { if (activeTab === 'data' || activeTab === 'status') fetchAllLeads(); }, [activeTab, fetchAllLeads]);

  const fetchAllNotes = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/client/all-notes`, { headers: authHeaders });
      const map = {};
      (res.data.notes || []).forEach(n => { map[n.client_name] = n; });
      setAllClientNotes(map);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { if (activeTab === 'status') fetchAllNotes(); }, [activeTab, fetchAllNotes]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tasks`, { headers: authHeaders });
      setPendingTasks(res.data.tasks || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { if (activeTab === 'status') fetchTasks(); }, [activeTab, fetchTasks]);

  // === PIPELINE HELPERS ===
  const isStepDone = (clientName, stepId) => followUpActions.some(a => a.client_name === clientName && a.step_id === stepId);

  const toggleStep = async (clientName, stepId) => {
    const done = isStepDone(clientName, stepId);
    try {
      if (done) {
        await axios.delete(`${API}/followup/action`, { params: { client_name: clientName, step_id: stepId }, headers: authHeaders });
      } else {
        await axios.post(`${API}/followup/action`, { client_name: clientName, step_id: stepId }, { headers: authHeaders });
      }
      fetchActions();
    } catch (err) { console.error(err); }
  };

  const getPipelineProgress = (clientName) => {
    const done = ALL_PIPELINE_ACTIONS.filter(a => isStepDone(clientName, a.id)).length;
    return { done, total: ALL_PIPELINE_ACTIONS.length };
  };

  const handleSendEmail = (client, action) => {
    const name = getFirstName(client.name);
    const body = action.body.replace(/\[NAME\]/g, name);
    window.open(`mailto:${client.email || ''}?subject=${encodeURIComponent(action.subject)}&body=${encodeURIComponent(body)}`, '_blank');
    toast.success(`Email opened for ${name}`);
  };

  const handleCopySMS = async (client, action) => {
    const name = getFirstName(client.name);
    const text = action.text.replace(/\[NAME\]/g, name);
    try { await navigator.clipboard.writeText(text); toast.success('SMS copied to clipboard'); }
    catch { toast.error('Could not copy'); }
  };

  const openClientModal = async (client) => {
    setSelectedClient(client);
    setClientNote({ next_follow_up: '', comment: '', priority: 'high' });
    try {
      const res = await axios.get(`${API}/client/notes`, { params: { client_name: client.name }, headers: authHeaders });
      setClientNote({ next_follow_up: res.data.next_follow_up || '', comment: res.data.comment || '', priority: res.data.priority || 'high' });
    } catch (err) { console.error(err); }
  };

  const saveClientNote = async () => {
    if (!selectedClient) return;
    setNoteSaving(true);
    try {
      await axios.post(`${API}/client/notes`, {
        client_name: selectedClient.name, next_follow_up: clientNote.next_follow_up,
        comment: clientNote.comment, priority: clientNote.priority
      }, { headers: authHeaders });
      toast.success("Notes saved");
      fetchAllNotes();
    } catch (err) { toast.error("Error saving notes"); }
    setNoteSaving(false);
  };

  const loadPipelineSchedule = async (clientName, visitDate) => {
    try {
      const res = await axios.get(`${API}/pipeline/schedule`, { params: { client_name: clientName }, headers: authHeaders });
      if (res.data.steps && res.data.steps.length > 0) {
        setPipelineSchedule(res.data.steps);
      } else {
        const vd = visitDate || new Date().toISOString().split('T')[0];
        const base = new Date(vd);
        const generated = ALL_PIPELINE_ACTIONS.map(a => {
          const step = PIPELINE_STEPS.find(s => s.actions.some(act => act.id === a.id));
          const d = new Date(base); d.setDate(d.getDate() + (step?.day || 0));
          return { id: a.id, scheduled_date: d.toISOString().split('T')[0], comment: '' };
        });
        setPipelineSchedule(generated);
      }
    } catch { setPipelineSchedule([]); }
  };

  const savePipelineSchedule = async (clientName, steps) => {
    try {
      await axios.post(`${API}/pipeline/schedule`, { client_name: clientName, steps }, { headers: authHeaders });
      toast.success("Schedule saved");
    } catch { toast.error("Error saving schedule"); }
  };

  const openPipelineMenu = (client) => {
    setActionMenu({ client });
    loadPipelineSchedule(client.name, client.visit_date);
  };

  // === LEAD CRUD ===
  const handleParseEmail = async () => {
    try {
      const res = await axios.post(`${API}/leads/parse-email`, { text: newLeadText }, { headers: authHeaders });
      setNewLeadForm({
        customer_number: res.data.customer_number || '', name: res.data.name || '', address: res.data.address || '', city: res.data.city || '',
        email: res.data.email || '', phone: res.data.phone || '',
        unit_type: '', ticket_value: 0, commission_percent: 0, commission_value: 0,
        spif_total: 0, status: 'PENDING', visit_date: new Date().toISOString().split('T')[0],
        close_date: '', install_date: '', follow_up_date: '', comments: '', feeling: '', objections: '',
        duct_cleaning: 0, apco_x: 0, samsung: 0, mitsubishi: 0, surge_protector: 0, self_gen_mits: 0,
      });
      setNewLeadStep('form');
    } catch { toast.error("Error parsing email"); }
  };

  const handleCreateLead = async () => {
    if (!newLeadForm.name) { toast.error("Name is required"); return; }
    try {
      await axios.post(`${API}/leads`, newLeadForm, { headers: authHeaders });
      toast.success(`Lead ${getFirstName(newLeadForm.name)} created`);
      setNewLeadOpen(false); setNewLeadStep('paste'); setNewLeadText('');
      fetchDashboardData();
    } catch { toast.error("Error creating lead"); }
  };

  const handleDeleteLead = async (leadId) => {
    try {
      await axios.delete(`${API}/leads/${leadId}`, { headers: authHeaders });
      toast.success("Lead deleted");
      setDeleteConfirm(null); setSelectedClient(null); setSelectedSale(null); setEditingLead(null);
      fetchDashboardData(); fetchAllLeads();
    } catch { toast.error("Error deleting lead"); }
  };

  const handleRemoveFromPipeline = async (lead) => {
    try {
      await axios.post(`${API}/pipeline/remove-client`, {
        lead_id: lead.lead_id, client_name: lead.name
      }, { headers: authHeaders });
      toast.success(`${lead.name} removed from pipeline`);
      setSelectedClient(null);
      setActionMenu(null);
      fetchDashboardData(); fetchActions(); fetchAllLeads();
    } catch { toast.error("Error removing from pipeline"); }
  };

  const handleSaveEditLead = async () => {
    if (!editingLead?.lead_id) return;
    // If converting to SALE and wasn't SALE before, show conversion modal
    if (editingLead.status === 'SALE' && originalLead?.status !== 'SALE' && !saleConversion) {
      setSaleConversion(editingLead);
      return;
    }
    const spiffSum = (editingLead.apco_x || 0) + (editingLead.samsung || 0) + (editingLead.mitsubishi || 0) + (editingLead.surge_protector || 0) + (editingLead.duct_cleaning || 0) + (editingLead.self_gen_mits || 0);
    const baseComm = (editingLead.ticket_value || 0) * (editingLead.commission_percent || 0) / 100;
    const dataToSave = { ...editingLead, commission_value: Math.round((baseComm + spiffSum) * 100) / 100, spif_total: Math.round(spiffSum * 100) / 100 };
    try {
      await axios.put(`${API}/leads/${editingLead.lead_id}`, dataToSave, { headers: authHeaders });
      toast.success("Lead updated");
      setEditingLead(null);
      setSaleConversion(null);
      fetchDashboardData(); fetchAllLeads(); fetchTasks();
    } catch { toast.error("Error updating lead"); }
  };

  const handleSaleConversion = async (saleData) => {
    if (!saleConversion?.lead_id) return;
    const lead = { ...saleConversion, ...saleData, status: 'SALE' };
    const spiffSum = (lead.apco_x || 0) + (lead.samsung || 0) + (lead.mitsubishi || 0) + (lead.surge_protector || 0) + (lead.duct_cleaning || 0) + (lead.self_gen_mits || 0);
    const baseComm = (lead.ticket_value || 0) * (lead.commission_percent || 0) / 100;
    const dataToSave = { ...lead, commission_value: Math.round((baseComm + spiffSum) * 100) / 100, spif_total: Math.round(spiffSum * 100) / 100 };
    try {
      await axios.put(`${API}/leads/${saleConversion.lead_id}`, dataToSave, { headers: authHeaders });
      toast.success(`${saleConversion.name} converted to SALE!`);
      setEditingLead(null);
      setSaleConversion(null);
      fetchDashboardData(); fetchAllLeads(); fetchTasks();
    } catch { toast.error("Error converting to sale"); }
  };

  // === HANDLERS ===
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await fetchDashboardData(true, true); fetchAllLeads(); fetchAllNotes(); fetchTasks(); }
    catch { toast.error("Update Failed"); }
    finally { setRefreshing(false); }
  };

  const handlePayPeriodChange = (value) => {
    setPayPeriod(value);
    if (value !== "all") setDateFilter("all");
  };

  const handleDateFilterChange = (value) => {
    setDateFilter(value);
    if (value !== "all") setPayPeriod("all");
  };

  // === RENDER ===
  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#F5F5F5' }}>
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="sticky top-0 z-10 shadow-md" style={{ backgroundColor: BRAND_COLORS.primary }}>
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <img 
                src="https://static.prod-images.emergentagent.com/jobs/7d8c38f9-ada4-4711-8896-4fc103fbde80/images/cbcc0d0a6129511874977a30d71019e4e2ebd7722353db4081c57778a6a4c562.png"
                alt="The Salesman's Legend League"
                className="h-10 sm:h-12 md:h-14 w-auto object-contain"
                data-testid="company-logo"
              />
              <div className="hidden sm:block min-w-0">
                <h1 className="text-sm md:text-lg lg:text-xl font-bold tracking-tight text-white font-heading truncate" data-testid="dashboard-title">
                  {isAdmin ? "Salesman's Legend League" : (filterSalespersonName || user.name)}
                </h1>
                <p className="text-xs text-white/80 truncate">
                  {isAdmin ? (filterSalespersonName ? `Viewing: ${filterSalespersonName}` : 'Admin Dashboard') : 'Sales Performance Dashboard'}
                </p>
              </div>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-white/70" title="Commission payment based on installation dates">Pay Period (by Install Date)</Label>
                  <Select value={payPeriod} onValueChange={handlePayPeriodChange}>
                    <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white text-xs h-9">
                      <SelectValue placeholder="Select pay period" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">All Periods</SelectItem>
                      {PAY_PERIODS.map((period) => (
                        <SelectItem key={period} value={period} className="text-xs">{period}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-white/70">Quick Filter</Label>
                  <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                    <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white text-xs h-9">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="week">Last Week</SelectItem>
                      <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
                      <SelectItem value="current_year">Current Year</SelectItem>
                      <SelectItem value="last_year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="sm:hidden min-w-0 mr-2">
                <h1 className="text-sm font-bold tracking-tight text-white font-heading truncate" data-testid="dashboard-title-mobile">
                  {isAdmin ? 'Admin' : user.name.split(' ')[0]}
                </h1>
              </div>
              <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10 h-8 w-8"
                onClick={() => setFiltersOpen(!filtersOpen)} data-testid="filters-toggle">
                <Menu className="w-4 h-4" />
              </Button>
              <Button onClick={handleRefresh} disabled={refreshing}
                className="shadow-md rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold"
                style={{ backgroundColor: BRAND_COLORS.secondary }} data-testid="refresh-button">
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''} sm:mr-2`} />
                <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Update'}</span>
              </Button>
              <Button onClick={onLogout} variant="ghost" size="icon"
                className="text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
                data-testid="logout-button" title="Sign Out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Filters */}
          <div className={`${filtersOpen ? 'block' : 'hidden'} md:hidden mt-3 pt-3 border-t border-white/20`}>
            <p className="text-[9px] text-white/60 mb-2">* Pay Period filters commissions by installation date</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-white/70">Pay Period</Label>
                <Select value={payPeriod} onValueChange={handlePayPeriodChange}>
                  <SelectTrigger className="w-full bg-white/10 border-white/20 text-white text-xs h-8">
                    <SelectValue placeholder="By install date" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Periods</SelectItem>
                    {PAY_PERIODS.map((period) => (
                      <SelectItem key={period} value={period} className="text-xs">{period}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-white/70">Quick Filter</Label>
                <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                  <SelectTrigger className="w-full bg-white/10 border-white/20 text-white text-xs h-8">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="2weeks">Last 2 Weeks</SelectItem>
                    <SelectItem value="current_year">Current Year</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-3 sm:mb-4" style={{ color: BRAND_COLORS.primary }} />
              <p className="text-gray-500 text-sm sm:text-base">Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 text-center">
            <p className="text-red-600 font-medium text-sm sm:text-base">{error}</p>
            <Button onClick={handleRefresh} className="mt-3 sm:mt-4" variant="outline" size="sm">Try Again</Button>
          </div>
        ) : kpiData ? (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
              {(isAdmin ? [
                { id: 'dashboard', label: 'Overview' },
                { id: 'admin', label: 'Salespeople' },
                { id: 'data', label: 'All Data' },
                { id: 'email', label: 'Email Ingest' },
              ] : [
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'status', label: 'Status' },
                { id: 'earnings', label: 'Earnings' },
              ]).map(tab => (
                <button
                  key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.id ? 'text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={activeTab === tab.id ? { backgroundColor: BRAND_COLORS.primary } : {}}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Category Folder Tabs (HVAC / Generators) */}
            <div className="mb-6" data-testid="category-toggle">
              <div className="flex items-end gap-0 pl-4">
                {[
                  { id: 'hvac', label: 'HVAC', color: '#1E3A5F', lightBg: '#EFF6FF', border: '#BFDBFE' },
                  { id: 'generator', label: 'Generators', color: '#14532D', lightBg: '#F0FDF4', border: '#BBF7D0' },
                ].map((cat, i) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      data-testid={`category-${cat.id}`}
                      className="relative transition-all duration-300 ease-out"
                      style={{
                        zIndex: isActive ? 10 : 5 - i,
                        transform: isActive ? 'translateY(0)' : 'translateY(4px)',
                        marginRight: '-2px',
                      }}>
                      <div className={`
                        px-5 sm:px-7 pt-2.5 pb-2 text-xs sm:text-sm font-bold tracking-wide
                        rounded-t-xl border-t-2 border-l-2 border-r-2
                        transition-all duration-300 ease-out
                        ${isActive
                          ? 'text-white shadow-lg'
                          : 'text-gray-400 hover:text-gray-600 bg-gray-100 border-gray-200 hover:bg-gray-200 opacity-70 hover:opacity-90'
                        }
                      `}
                      style={isActive ? {
                        backgroundColor: cat.color,
                        borderColor: cat.color,
                        boxShadow: `0 -4px 12px -2px ${cat.color}33`,
                      } : {}}>
                        {cat.label}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className={`
                rounded-xl rounded-tl-none border-2 overflow-hidden
                transition-all duration-500 ease-out
              `}
              style={{
                borderColor: activeCategory === 'hvac' ? '#1E3A5F' : '#14532D',
                backgroundColor: activeCategory === 'hvac' ? '#FAFCFF' : '#FAFFF7',
                boxShadow: activeCategory === 'hvac'
                  ? '0 4px 24px -4px rgba(30,58,95,0.12)'
                  : '0 4px 24px -4px rgba(20,83,45,0.12)',
              }}>
                <div className="p-3 sm:p-4 md:p-5"
                  style={{
                    animation: 'folderSlideIn 0.4s ease-out',
                  }}
                  key={activeCategory}>

            {/* Admin salesperson filter banner */}
            {isAdmin && filterSalespersonName && activeTab !== 'admin' && (
              <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 flex items-center justify-between" data-testid="sp-filter-banner">
                <span>Viewing: <strong>{filterSalespersonName}</strong></span>
                <button onClick={clearSalespersonFilter} className="text-blue-500 hover:text-blue-700 font-bold text-xs">Show All</button>
              </div>
            )}

            {/* Admin Salespeople Tab */}
            {activeTab === 'admin' && isAdmin && (
              <AdminPanel token={token} user={user} onFilterSalesperson={handleFilterSalesperson} payPeriod={payPeriod} dateFilter={dateFilter} category={activeCategory} />
            )}

            {/* Admin Overview Tab */}
            {activeTab === 'dashboard' && isAdmin && !filterSalespersonId && (
              <AdminOverview token={token} onFilterSalesperson={handleFilterSalesperson} payPeriod={payPeriod} dateFilter={dateFilter} category={activeCategory} />
            )}

            {/* Salesperson Dashboard Tab */}
            {activeTab === 'dashboard' && (!isAdmin || filterSalespersonId) && (
              <DashboardTab kpiData={kpiData} setSelectedSale={setSelectedSale} setInstallationsOpen={setInstallationsOpen} />
            )}

            {/* Status Tab (combined Follow-ups + Data access) */}
            {activeTab === 'status' && !isAdmin && (
              <StatusTab
                kpiData={kpiData} allClientNotes={allClientNotes} followUpActions={followUpActions}
                openClientModal={openClientModal} openPipelineMenu={openPipelineMenu}
                allLeads={allLeads} payPeriod={payPeriod} dateFilter={dateFilter}
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                setNewLeadOpen={setNewLeadOpen} setNewLeadStep={setNewLeadStep} setNewLeadText={setNewLeadText}
                setEditingLead={openEditLead} setPayPeriod={setPayPeriod} setDateFilter={setDateFilter}
                authHeaders={authHeaders} fetchAllLeads={fetchAllLeads} fetchDashboardData={fetchDashboardData}
                pendingTasks={pendingTasks} fetchTasks={fetchTasks}
              />
            )}

            {/* Data Tab (admin only now) */}
            {activeTab === 'data' && isAdmin && (
              <DataTab
                allLeads={allLeads} isAdmin={isAdmin} payPeriod={payPeriod} dateFilter={dateFilter}
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                setNewLeadOpen={setNewLeadOpen} setNewLeadStep={setNewLeadStep} setNewLeadText={setNewLeadText}
                setEditingLead={openEditLead} setPayPeriod={setPayPeriod} setDateFilter={setDateFilter}
                authHeaders={authHeaders} fetchAllLeads={fetchAllLeads} fetchDashboardData={fetchDashboardData}
              />
            )}

            {/* Earnings Tab (separate from dashboard) */}
            {activeTab === 'earnings' && !isAdmin && (
              <EarningsTab kpiData={kpiData} setInstallationsOpen={setInstallationsOpen} />
            )}

            {/* Email Ingest Tab (Admin only) */}
            {activeTab === 'email' && isAdmin && (
              <EmailIngestConfig token={token} />
            )}

                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>

      {/* Modals */}
      <PipelineModal
        actionMenu={actionMenu} setActionMenu={setActionMenu}
        pipelineSchedule={pipelineSchedule} setPipelineSchedule={setPipelineSchedule}
        isStepDone={isStepDone} toggleStep={toggleStep}
        handleSendEmail={handleSendEmail} handleCopySMS={handleCopySMS}
        savePipelineSchedule={savePipelineSchedule} getPipelineProgress={getPipelineProgress}
        onRemoveFromPipeline={handleRemoveFromPipeline}
      />
      <NewLeadModal
        newLeadOpen={newLeadOpen} setNewLeadOpen={setNewLeadOpen}
        newLeadStep={newLeadStep} setNewLeadStep={setNewLeadStep}
        newLeadText={newLeadText} setNewLeadText={setNewLeadText}
        newLeadForm={newLeadForm} setNewLeadForm={setNewLeadForm}
        handleParseEmail={handleParseEmail} handleCreateLead={handleCreateLead}
      />
      <DeleteConfirmModal deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} handleDeleteLead={handleDeleteLead} />
      <ClientDetailModal
        selectedClient={selectedClient} setSelectedClient={setSelectedClient}
        clientNote={clientNote} setClientNote={setClientNote}
        noteSaving={noteSaving} saveClientNote={saveClientNote}
        setDeleteConfirm={setDeleteConfirm} isStepDone={isStepDone} getPipelineProgress={getPipelineProgress}
        onRemoveFromPipeline={handleRemoveFromPipeline}
      />
      <SaleDetailModal selectedSale={selectedSale} setSelectedSale={setSelectedSale} />
      <InstallationsModal installationsOpen={installationsOpen} setInstallationsOpen={setInstallationsOpen} kpiData={kpiData} />
      <EditLeadModal editingLead={editingLead} setEditingLead={setEditingLead} handleSaveEditLead={handleSaveEditLead} setDeleteConfirm={setDeleteConfirm} originalLead={originalLead} />
      {saleConversion && (
        <SaleConversionModal lead={saleConversion} onSave={handleSaleConversion} onCancel={() => setSaleConversion(null)} />
      )}

      {/* Footer */}
      <footer className="py-3 sm:py-4 mt-6 sm:mt-8 mb-16" style={{ backgroundColor: BRAND_COLORS.secondary }}>
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8">
          <p className="text-[10px] sm:text-xs text-white/60 text-center">
            &copy; {new Date().getFullYear()} The Salesman's Legend League
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
