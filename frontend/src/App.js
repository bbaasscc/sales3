import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  RefreshCw,
  DollarSign,
  Percent,
  Target,
  TrendingUp,
  Users,
  PieChart as PieIcon,
  BarChart3,
  Settings,
  Gift,
  Calendar,
  ShoppingCart,
  BadgeDollarSign,
  AlertTriangle,
  Clock,
  Phone,
  Menu,
  Mail,
  MapPin,
  FileText,
  User,
  X,
  MessageSquare,
  Check,
  Copy,
  Send,
  Plus,
  Trash2,
  Save,
  ClipboardPaste,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Default Excel URL - Google Sheets (auto-updates on refresh)
const DEFAULT_EXCEL_URL = "https://docs.google.com/spreadsheets/d/1h2ZMumcAsYYYvV1JTQPRXTa3kOcZ5K4-/edit";

// Four Seasons brand colors
const BRAND_COLORS = {
  primary: '#C62828',
  primaryDark: '#8E0000',
  secondary: '#1E3A5F',
  accent: '#F5F5F5',
  white: '#FFFFFF',
  dark: '#212121',
};

// Chart colors matching Four Seasons brand
const CHART_COLORS = ["#C62828", "#1E3A5F", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4"];
const SPIFF_COLORS = {
  'APCO X': '#C62828',
  'Samsung': '#1E3A5F',
  'Mitsubishi': '#4CAF50',
  'Surge Protector': '#FF9800',
  'Duct Cleaning': '#9C27B0',
  'Self Gen Mits': '#00838F',
};

// Sales Pipeline Steps
const PIPELINE_STEPS = [
  { day: 0, label: 'Same Day', subtitle: '1-2 hrs after visit', actions: [
    { id: 'd0_email', type: 'email', name: 'Positioning & Control', subject: 'Thank You for Your Time Today', body: 'Hi [NAME],\n\nThank you again for taking the time to meet with me today and for welcoming me into your home. I truly appreciate the opportunity.\n\nBased on what we discussed, I\'m confident the system we reviewed is the right fit for your home, your comfort, and your long-term savings.\n\nIf any questions come up tonight, feel free to reply or call me directly. I\'m here to make this easy for you.\n\nOnce you\'re ready, we can secure your installation date and take care of everything.\n\nTalk soon.' },
    { id: 'd0_sms', type: 'sms', name: 'Reinforcement', text: 'Hi [NAME], this is Benjamin. Thanks again for your time today \u2014 I really appreciate it. If anything comes up after reviewing the proposal, just text me. I\'m here to make this simple for you.' },
  ]},
  { day: 2, label: 'Day 2', subtitle: 'Momentum Push', actions: [
    { id: 'd2_email', type: 'email', name: 'Soft Close', subject: 'Following Up \u2014 Ready to Reserve Your Date?', body: 'Hi [NAME],\n\nI wanted to follow up and see how you\'re feeling about everything we discussed.\n\nOur install schedule is filling up, and I\'d hate for you to miss the timing that works best for you.\n\nWould you like me to go ahead and reserve your installation date?\n\nLet me know what questions you still have \u2014 I\'m happy to walk through anything again.' },
  ]},
  { day: 4, label: 'Day 4', subtitle: 'Urgency + Incentive', actions: [
    { id: 'd4_sms', type: 'sms', name: 'Trigger', text: 'Hi [NAME], quick question \u2014 if I could make the numbers a little better for you, would you be ready to move forward?' },
    { id: 'd4_email', type: 'email', name: 'Incentive Close ($200)', subject: 'Special Savings Available This Week', body: 'Hi [NAME],\n\nI wanted to reach out personally because I may be able to help a bit more.\n\nIf we move forward this week, I can apply a $200 discount toward your installation.\n\nThat secures your savings and your installation date before things get tighter on the schedule.\n\nIf this helps you feel more comfortable moving forward, just let me know and I\'ll take care of it right away.' },
  ]},
  { day: 6, label: 'Day 6', subtitle: 'Direct Close', actions: [
    { id: 'd6_sms', type: 'sms', name: 'Decision Message', text: 'Hi [NAME], I\'ll be honest \u2014 I\'d really like to earn your business. If there\'s something holding you back, tell me what it is and let\'s solve it. I\'m confident we can make this work for you.' },
  ]},
  { day: 8, label: 'Day 8', subtitle: 'Final Push', actions: [
    { id: 'd8_email', type: 'email', name: 'Professional Pressure', subject: 'One Last Note Before I Update Your File', body: 'Hi [NAME],\n\nI wanted to reach out one last time before I release the pricing and availability we discussed.\n\nI completely understand that this is a big decision \u2014 but I also don\'t want you to lose the current options and scheduling flexibility.\n\nAre we moving forward together?\n\nIf there\'s anything standing in the way, tell me what it is. I\'m here to help you make the right decision.' },
  ]},
];
const ALL_PIPELINE_ACTIONS = PIPELINE_STEPS.flatMap(s => s.actions);

// Helper to get first name in title case
const getFirstName = (fullName) => {
  if (!fullName) return '';
  const first = fullName.split(' ')[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};


// Pay periods (bi-weekly) with date ranges for detection
const PAY_PERIODS_DATA = [
  { name: "Dec 25, 2025 - Jan 07, 2026", start: new Date(2025, 11, 25), end: new Date(2026, 0, 7) },
  { name: "Jan 08, 2026 - Jan 21, 2026", start: new Date(2026, 0, 8), end: new Date(2026, 0, 21) },
  { name: "Jan 22, 2026 - Feb 04, 2026", start: new Date(2026, 0, 22), end: new Date(2026, 1, 4) },
  { name: "Feb 05, 2026 - Feb 18, 2026", start: new Date(2026, 1, 5), end: new Date(2026, 1, 18) },
  { name: "Feb 19, 2026 - Mar 04, 2026", start: new Date(2026, 1, 19), end: new Date(2026, 2, 4) },
  { name: "Mar 05, 2026 - Mar 18, 2026", start: new Date(2026, 2, 5), end: new Date(2026, 2, 18) },
  { name: "Mar 19, 2026 - Apr 01, 2026", start: new Date(2026, 2, 19), end: new Date(2026, 3, 1) },
  { name: "Apr 02, 2026 - Apr 15, 2026", start: new Date(2026, 3, 2), end: new Date(2026, 3, 15) },
  { name: "Apr 16, 2026 - Apr 29, 2026", start: new Date(2026, 3, 16), end: new Date(2026, 3, 29) },
  { name: "Apr 30, 2026 - May 13, 2026", start: new Date(2026, 3, 30), end: new Date(2026, 4, 13) },
  { name: "May 14, 2026 - May 27, 2026", start: new Date(2026, 4, 14), end: new Date(2026, 4, 27) },
  { name: "May 28, 2026 - Jun 10, 2026", start: new Date(2026, 4, 28), end: new Date(2026, 5, 10) },
  { name: "Jun 11, 2026 - Jun 24, 2026", start: new Date(2026, 5, 11), end: new Date(2026, 5, 24) },
  { name: "Jun 25, 2026 - Jul 08, 2026", start: new Date(2026, 5, 25), end: new Date(2026, 6, 8) },
  { name: "Jul 09, 2026 - Jul 22, 2026", start: new Date(2026, 6, 9), end: new Date(2026, 6, 22) },
  { name: "Jul 23, 2026 - Aug 05, 2026", start: new Date(2026, 6, 23), end: new Date(2026, 7, 5) },
  { name: "Aug 06, 2026 - Aug 19, 2026", start: new Date(2026, 7, 6), end: new Date(2026, 7, 19) },
  { name: "Aug 20, 2026 - Sep 02, 2026", start: new Date(2026, 7, 20), end: new Date(2026, 8, 2) },
  { name: "Sep 03, 2026 - Sep 16, 2026", start: new Date(2026, 8, 3), end: new Date(2026, 8, 16) },
  { name: "Sep 17, 2026 - Sep 30, 2026", start: new Date(2026, 8, 17), end: new Date(2026, 8, 30) },
  { name: "Oct 01, 2026 - Oct 14, 2026", start: new Date(2026, 9, 1), end: new Date(2026, 9, 14) },
  { name: "Oct 15, 2026 - Oct 28, 2026", start: new Date(2026, 9, 15), end: new Date(2026, 9, 28) },
  { name: "Oct 29, 2026 - Nov 11, 2026", start: new Date(2026, 9, 29), end: new Date(2026, 10, 11) },
  { name: "Nov 12, 2026 - Nov 25, 2026", start: new Date(2026, 10, 12), end: new Date(2026, 10, 25) },
  { name: "Nov 26, 2026 - Dec 09, 2026", start: new Date(2026, 10, 26), end: new Date(2026, 11, 9) },
  { name: "Dec 10, 2026 - Dec 23, 2026", start: new Date(2026, 11, 10), end: new Date(2026, 11, 23) },
  { name: "Dec 24, 2026 - Jan 06, 2027", start: new Date(2026, 11, 24), end: new Date(2027, 0, 6) },
  { name: "Jan 07, 2027 - Jan 20, 2027", start: new Date(2027, 0, 7), end: new Date(2027, 0, 20) },
];

// Get period names for dropdown
const PAY_PERIODS = PAY_PERIODS_DATA.map(p => p.name);

// Function to get current pay period based on today's date
const getCurrentPayPeriod = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  for (const period of PAY_PERIODS_DATA) {
    if (today >= period.start && today <= period.end) {
      return period.name;
    }
  }
  // If no match found, return the most recent past period or first future period
  for (let i = PAY_PERIODS_DATA.length - 1; i >= 0; i--) {
    if (today > PAY_PERIODS_DATA[i].end) {
      return PAY_PERIODS_DATA[i].name;
    }
  }
  return PAY_PERIODS_DATA[0].name;
};

// Mobile-friendly Summary KPI Card
const SummaryCard = ({ title, value, description, icon: Icon, prefix = "", suffix = "", highlight = false }) => (
  <Card 
    className={`bg-white border shadow-sm rounded-xl hover:shadow-md transition-all duration-200 ${highlight ? 'border-l-4' : 'border-gray-200'}`}
    style={{ borderLeftColor: highlight ? BRAND_COLORS.primary : undefined }}
    data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <CardContent className="p-3 sm:p-4 md:p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <div className="p-1 sm:p-1.5 rounded-md flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: BRAND_COLORS.primary }} strokeWidth={2} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 font-heading truncate">
              {title}
            </p>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-mono font-semibold tracking-tight text-gray-900 mt-1 sm:mt-2">
            {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: prefix === '$' ? 2 : 0, maximumFractionDigits: 2 }) : value}{suffix}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 sm:mt-2 leading-relaxed line-clamp-2">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Section Header - Mobile friendly
const SectionHeader = ({ title, description, icon: Icon }) => (
  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
    <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: BRAND_COLORS.primary }}>
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2} />
    </div>
    <div className="min-w-0">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 font-heading">{title}</h2>
      <p className="text-xs sm:text-sm text-gray-500 truncate">{description}</p>
    </div>
  </div>
);

// SPIFF Brand Card - Mobile friendly
const SpiffBrandCard = ({ brand, data, color }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
        <span className="font-semibold text-gray-700 text-sm sm:text-base truncate">{brand}</span>
      </div>
      <span className="text-[10px] sm:text-xs font-mono bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-gray-600 flex-shrink-0">
        {data.percent_of_sales}%
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <div>
        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Sales</p>
        <p className="text-base sm:text-lg font-mono font-semibold text-gray-900">{data.count}</p>
      </div>
      <div>
        <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Commission</p>
        <p className="text-base sm:text-lg font-mono font-semibold" style={{ color: BRAND_COLORS.primary }}>${data.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
    </div>
  </div>
);

// Chart Card Container - Mobile friendly
const ChartCard = ({ title, description, children, icon: Icon }) => (
  <Card className="bg-white border border-gray-200 shadow-sm rounded-xl">
    <CardHeader className="pb-2 border-b border-gray-100 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" strokeWidth={1.5} />}
        <div className="min-w-0">
          <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700 font-heading">{title}</CardTitle>
          {description && <CardDescription className="text-[10px] sm:text-xs text-gray-400 truncate">{description}</CardDescription>}
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-3 sm:p-4 md:p-5">
      {children}
    </CardContent>
  </Card>
);

// Main Dashboard Component
function App() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [payPeriod, setPayPeriod] = useState(() => getCurrentPayPeriod()); // Auto-select current period
  const [kpiData, setKpiData] = useState(null);
  const [error, setError] = useState(null);
  const [excelUrl, setExcelUrl] = useState(DEFAULT_EXCEL_URL);
  const [tempExcelUrl, setTempExcelUrl] = useState(DEFAULT_EXCEL_URL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [followUpActions, setFollowUpActions] = useState([]);
  const [actionMenu, setActionMenu] = useState(null);
  const [clientNote, setClientNote] = useState({ next_follow_up: '', comment: '', priority: 'high' });
  const [noteSaving, setNoteSaving] = useState(false);
  const [allClientNotes, setAllClientNotes] = useState({});
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newLeadText, setNewLeadText] = useState('');
  const [newLeadForm, setNewLeadForm] = useState({});
  const [newLeadStep, setNewLeadStep] = useState('paste'); // 'paste' or 'form'
  const [editSale, setEditSale] = useState(null);
  const [pipelineSchedule, setPipelineSchedule] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [allLeads, setAllLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingLead, setEditingLead] = useState(null);
  const [installationsOpen, setInstallationsOpen] = useState(false); // { client, type: 'email'|'sms' }

  const fetchDashboardData = useCallback(async (showToast = false, resetToCurrentPeriod = false) => {
    if (showToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    // On refresh, update to current pay period
    const currentPeriod = resetToCurrentPeriod ? getCurrentPayPeriod() : payPeriod;
    if (resetToCurrentPeriod && currentPeriod !== payPeriod) {
      setPayPeriod(currentPeriod);
    }

    try {
      await axios.post(`${API}/config/excel`, { excel_url: excelUrl });

      const params = { date_filter: dateFilter };
      // Use currentPeriod for the API call (handles refresh case)
      const periodToUse = resetToCurrentPeriod ? currentPeriod : payPeriod;
      if (periodToUse && periodToUse !== "all") {
        params.pay_period = periodToUse;
      }
      
      const response = await axios.get(`${API}/dashboard/kpis`, { params });
      setKpiData(response.data);
      
      if (showToast) {
        toast.success("Data Updated", {
          description: `${response.data.closed_deals} deals for current period`
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.detail || "Failed to load dashboard data");
      if (showToast) {
        toast.error("Update Failed");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter, payPeriod, excelUrl]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch follow-up actions history
  const fetchActions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/followup/actions`);
      setFollowUpActions(res.data.actions || []);
    } catch (err) { console.error("Error fetching actions:", err); }
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  // Fetch all leads for Data tab
  const fetchAllLeads = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leads`);
      setAllLeads(res.data.leads || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { if (activeTab === 'data') fetchAllLeads(); }, [activeTab, fetchAllLeads]);

  // Fetch all client notes for priority display
  const fetchAllNotes = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/client/all-notes`);
      const map = {};
      (res.data.notes || []).forEach(n => { map[n.client_name] = n; });
      setAllClientNotes(map);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { if (activeTab === 'followups') fetchAllNotes(); }, [activeTab, fetchAllNotes]);

  const isStepDone = (clientName, stepId) => {
    return followUpActions.some(a => a.client_name === clientName && a.step_id === stepId);
  };

  const toggleStep = async (clientName, stepId) => {
    const done = isStepDone(clientName, stepId);
    try {
      if (done) {
        await axios.delete(`${API}/followup/action`, { params: { client_name: clientName, step_id: stepId } });
      } else {
        await axios.post(`${API}/followup/action`, { client_name: clientName, step_id: stepId });
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
    const mailto = `mailto:${client.email || ''}?subject=${encodeURIComponent(action.subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
    toast.success(`Email opened for ${name}`);
  };

  const handleCopySMS = async (client, action) => {
    const name = getFirstName(client.name);
    const text = action.text.replace(/\[NAME\]/g, name);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('SMS copied to clipboard');
    } catch { toast.error('Could not copy'); }
  };

  const openClientModal = async (client) => {
    setSelectedClient(client);
    setClientNote({ next_follow_up: '', comment: '', priority: 'high' });
    try {
      const res = await axios.get(`${API}/client/notes`, { params: { client_name: client.name } });
      setClientNote({ next_follow_up: res.data.next_follow_up || '', comment: res.data.comment || '', priority: res.data.priority || 'high' });
    } catch (err) { console.error(err); }
  };

  const saveClientNote = async () => {
    if (!selectedClient) return;
    setNoteSaving(true);
    try {
      await axios.post(`${API}/client/notes`, {
        client_name: selectedClient.name,
        next_follow_up: clientNote.next_follow_up,
        comment: clientNote.comment,
        priority: clientNote.priority
      });
      toast.success("Notes saved");
      fetchAllNotes();
    } catch (err) { toast.error("Error saving notes"); }
    setNoteSaving(false);
  };

  // Parse email and open form
  const handleParseEmail = async () => {
    try {
      const res = await axios.post(`${API}/leads/parse-email`, { text: newLeadText });
      setNewLeadForm({
        name: res.data.name || '', address: res.data.address || '', city: res.data.city || '',
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
      await axios.post(`${API}/leads`, newLeadForm);
      toast.success(`Lead ${getFirstName(newLeadForm.name)} created`);
      setNewLeadOpen(false); setNewLeadStep('paste'); setNewLeadText('');
      fetchDashboardData();
    } catch (err) { toast.error("Error creating lead"); }
  };

  const handleUpdateLead = async (leadId, updates) => {
    try {
      await axios.put(`${API}/leads/${leadId}`, updates);
      toast.success("Lead updated");
      fetchDashboardData();
    } catch { toast.error("Error updating lead"); }
  };

  const handleDeleteLead = async (leadId) => {
    try {
      await axios.delete(`${API}/leads/${leadId}`);
      toast.success("Lead deleted");
      setDeleteConfirm(null); setSelectedClient(null); setSelectedSale(null); setEditingLead(null);
      fetchDashboardData(); fetchAllLeads();
    } catch { toast.error("Error deleting lead"); }
  };

  const handleSaveEditLead = async () => {
    if (!editingLead?.lead_id) return;
    // Auto-calculate commission and spiff total
    const spiffSum = (editingLead.apco_x || 0) + (editingLead.samsung || 0) + (editingLead.mitsubishi || 0) + (editingLead.surge_protector || 0) + (editingLead.duct_cleaning || 0) + (editingLead.self_gen_mits || 0);
    const baseComm = (editingLead.ticket_value || 0) * (editingLead.commission_percent || 0) / 100;
    const dataToSave = { ...editingLead, commission_value: Math.round((baseComm + spiffSum) * 100) / 100, spif_total: Math.round(spiffSum * 100) / 100 };
    try {
      await axios.put(`${API}/leads/${editingLead.lead_id}`, dataToSave);
      toast.success("Lead updated");
      setEditingLead(null);
      fetchDashboardData(); fetchAllLeads();
    } catch { toast.error("Error updating lead"); }
  };

  // Pipeline schedule
  const loadPipelineSchedule = async (clientName, visitDate) => {
    try {
      const res = await axios.get(`${API}/pipeline/schedule`, { params: { client_name: clientName } });
      if (res.data.steps && res.data.steps.length > 0) {
        setPipelineSchedule(res.data.steps);
      } else {
        // Auto-generate from visit date
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
      await axios.post(`${API}/pipeline/schedule`, { client_name: clientName, steps });
      toast.success("Schedule saved");
    } catch { toast.error("Error saving schedule"); }
  };

  const openPipelineMenu = (client) => {
    setActionMenu({ client });
    loadPipelineSchedule(client.name, client.visit_date);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post(`${API}/config/excel`, { excel_url: excelUrl });
      await axios.post(`${API}/leads/import`);
      toast.success("Data synced from Google Sheet");
    } catch (err) { toast.error("Import failed"); }
    fetchDashboardData(true, true);
  };

  const handleSaveSettings = () => {
    setExcelUrl(tempExcelUrl);
    setSettingsOpen(false);
    toast.success("Excel URL Updated");
  };

  const handlePayPeriodChange = (value) => {
    setPayPeriod(value);
    if (value !== "all") setDateFilter("all");
  };

  const handleDateFilterChange = (value) => {
    setDateFilter(value);
    if (value !== "all") setPayPeriod("all");
  };

  // Prepare chart data
  const unitTypeData = kpiData?.unit_type_count 
    ? Object.entries(kpiData.unit_type_count).map(([name, value]) => ({
        name: name || 'Unknown',
        value,
        revenue: kpiData.unit_type_revenue?.[name] || 0
      }))
    : [];

  const statusData = kpiData?.status_distribution
    ? Object.entries(kpiData.status_distribution).map(([name, value]) => ({ name, value }))
    : [];

  const monthlyData = kpiData?.monthly_data || [];

  const spiffChartData = kpiData?.spiff_breakdown
    ? Object.entries(kpiData.spiff_breakdown).map(([brand, data]) => ({
        name: brand,
        value: data.commission,
        count: data.count
      })).filter(item => item.value > 0)
    : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
      <Toaster position="top-center" />
      
      {/* Header - Mobile Responsive */}
      <header className="sticky top-0 z-10 shadow-md" style={{ backgroundColor: BRAND_COLORS.primary }}>
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8 py-3 sm:py-4">
          {/* Desktop Header Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Logo + Title */}
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <img 
                src="https://www.fourseasonsheatingcooling.com/wp-content/uploads/2026/02/Four-Seasons-Logo_Current_2026_Four-Seasons_Logo_2026_Blue_Tagline-2048x531.png"
                alt="Four Seasons Heating & Cooling"
                className="h-8 sm:h-10 md:h-12 w-auto object-contain bg-white rounded px-2 py-1"
                data-testid="company-logo"
              />
              <div className="hidden sm:block min-w-0">
                <h1 className="text-sm md:text-lg lg:text-xl font-bold tracking-tight text-white font-heading truncate" data-testid="dashboard-title">
                  Benjamin S. Cardarelli
                </h1>
                <p className="text-xs text-white/80 truncate">
                  Sales Performance Dashboard
                </p>
              </div>
            </div>

            {/* Desktop Filters - Center */}
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
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="2weeks">2 Weeks</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons - Right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Mobile Title */}
              <div className="sm:hidden min-w-0 mr-2">
                <h1 className="text-sm font-bold tracking-tight text-white font-heading truncate" data-testid="dashboard-title-mobile">
                  B. Cardarelli
                </h1>
              </div>

              {/* Filters Toggle - Mobile only */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10 h-8 w-8"
                onClick={() => setFiltersOpen(!filtersOpen)}
                data-testid="filters-toggle"
              >
                <Menu className="w-4 h-4" />
              </Button>

              {/* Settings */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] mx-4">
                  <DialogHeader>
                    <DialogTitle>Data Source</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Google Sheet URL</Label>
                      <Input
                        value={tempExcelUrl}
                        onChange={(e) => setTempExcelUrl(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                    <Button onClick={handleSaveSettings} className="w-full" style={{ backgroundColor: BRAND_COLORS.primary }}>
                      Save
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Update Button */}
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                className="shadow-md rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold"
                style={{ backgroundColor: BRAND_COLORS.secondary }}
                data-testid="refresh-button"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''} sm:mr-2`} />
                <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Update'}</span>
              </Button>
            </div>
          </div>

          {/* Mobile Filters - Collapsible */}
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
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="2weeks">2 Weeks</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Responsive */}
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
              {[
                { id: 'dashboard', label: 'Dashboard', icon: 'BarChart3' },
                { id: 'followups', label: 'Follow-ups', icon: 'Phone' },
                { id: 'data', label: 'Data', icon: 'FileText' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={activeTab === tab.id ? { backgroundColor: BRAND_COLORS.primary } : {}}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* === DASHBOARD TAB === */}
            {activeTab === 'dashboard' && (
            <div className="space-y-8 sm:space-y-10">
            {/* ═══════════════════════════════════════════════════════════════════════
                BLOCK 1 – MY MONEY
                Financial overview: Performance KPIs + Commission Payments (unified)
            ═══════════════════════════════════════════════════════════════════════ */}
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

                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 sm:mb-4" style={{ color: '#047857' }}>
                  My Performance
                </p>
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
                  <div className="bg-white/80 backdrop-blur rounded-xl p-3 sm:p-4 text-center shadow-sm border border-emerald-100">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Installations</p>
                    <p className="text-lg sm:text-2xl md:text-3xl font-mono font-bold text-emerald-800">{kpiData.commission_payment_count || 0}</p>
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

            {/* ═══════════════════════════════════════════════════════════════════════
                BLOCK 2 – HOW CAN I EARN MORE?
                Under Book Price and SPIFF breakdown - opportunity insights
            ═══════════════════════════════════════════════════════════════════════ */}
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

                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#B45309' }}>
                  SPIFF Breakdown
                </p>
                
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

            {/* ═══════════════════════════════════════════════════════════════════════
                BLOCK 3 – WHAT AM I SELLING?
                Sales analysis and trends - max 3 charts
            ═══════════════════════════════════════════════════════════════════════ */}
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

            {/* ═══════════════════════════════════════════════════════════════════════
                BLOCK 4 – CLOSED SALES
                Detailed sales table - mobile optimized
            ═══════════════════════════════════════════════════════════════════════ */}
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
            )}

            {/* === FOLLOW-UPS TAB === */}
            {activeTab === 'followups' && (
            <div>
            {/* ═══════════════════════════════════════════════════════════════════════
                BLOCK 5 – ACTION REQUIRED
                Pending follow-ups - visually strongest block
            ═══════════════════════════════════════════════════════════════════════ */}
            {kpiData.follow_ups && kpiData.follow_ups.length > 0 && (
              <div 
                className="rounded-2xl border-l-4 overflow-hidden shadow-lg relative" 
                style={{ 
                  backgroundColor: '#FEF2F2', 
                  borderLeftColor: '#EF4444',
                  boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.15), 0 8px 30px rgba(239, 68, 68, 0.12)'
                }}
              >
                <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-orange-400"></div>
                
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-red-500 shadow-md">
                      <Phone className="w-5 h-5 text-white" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg sm:text-xl font-bold text-red-700" data-testid="block-5-title">Action Required!</h2>
                      <p className="text-xs sm:text-sm text-red-500/80">Follow up with these clients now</p>
                    </div>
                    <div className="bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-sm" data-testid="followup-count">
                      {kpiData.follow_ups.filter(f => { const p = getPipelineProgress(f.name); return p.done < p.total; }).length}
                    </div>
                  </div>
                  
                  <Card className="bg-white border-2 border-red-200 shadow-sm rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-red-50/80">
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap">Priority</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3">Name</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 hidden md:table-cell">City</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap hidden sm:table-cell">Since Visit</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap">Next Step</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {kpiData.follow_ups.slice(0, 20).filter(f => {
                            const p = getPipelineProgress(f.name);
                            return p.done < p.total;
                          }).map((followUp, index) => {
                            const progress = getPipelineProgress(followUp.name);
                            const notes = allClientNotes[followUp.name] || {};
                            const priority = notes.priority || 'high';
                            // Check if pipeline is overdue: has incomplete steps and next scheduled date is past
                            const nextAction = ALL_PIPELINE_ACTIONS.find(a => !isStepDone(followUp.name, a.id));
                            const isOverdue = nextAction && followUp.follow_up_date && new Date(followUp.follow_up_date) < new Date(new Date().toISOString().split('T')[0]);
                            return (
                            <TableRow 
                              key={index} 
                              className={`border-b border-gray-100 transition-colors ${isOverdue ? 'bg-red-50/70 hover:bg-red-100/50' : 'hover:bg-gray-50'}`}
                              data-testid={`followup-row-${index}`}
                            >
                              <TableCell className="py-2 px-1 sm:px-3">
                                {isOverdue ? (
                                  <span className="inline-flex items-center gap-0.5 px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-red-600 text-white animate-pulse">
                                    <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span className="hidden sm:inline">LATE</span>
                                  </span>
                                ) : priority === 'high' ? (
                                  <span className="inline-flex items-center gap-0.5 px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-red-100 text-red-700">
                                    <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span className="hidden sm:inline">HIGH</span>
                                  </span>
                                ) : priority === 'medium' ? (
                                  <span className="inline-flex items-center px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-700">
                                    <span className="hidden sm:inline">MED</span>
                                    <span className="sm:hidden">M</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-500">
                                    <span className="hidden sm:inline">LOW</span>
                                    <span className="sm:hidden">L</span>
                                  </span>
                                )}
                              </TableCell>
                              <TableCell 
                                className={`py-2 px-1 sm:px-3 text-xs sm:text-sm font-medium cursor-pointer ${followUp.is_urgent ? 'text-red-700' : 'text-gray-700'}`}
                                onClick={() => openClientModal(followUp)}
                              >
                                <span className="line-clamp-1 underline decoration-dotted">{followUp.name}</span>
                              </TableCell>
                              <TableCell className="py-2 px-1 sm:px-3 text-xs sm:text-sm text-gray-600 hidden md:table-cell">{followUp.city}</TableCell>
                              <TableCell className="py-2 px-1 sm:px-3 hidden sm:table-cell">
                                {(() => {
                                  if (!followUp.visit_date) return <span className="text-[10px] text-gray-400">N/A</span>;
                                  const visitD = new Date(followUp.visit_date);
                                  const today = new Date(new Date().toISOString().split('T')[0]);
                                  const daysSince = Math.floor((today - visitD) / 86400000);
                                  return (
                                    <span className={`font-mono text-[10px] sm:text-xs font-bold ${daysSince > 8 ? 'text-red-600' : daysSince > 4 ? 'text-amber-600' : 'text-gray-600'}`}>
                                      {daysSince}d {daysSince > 8 && <span className="text-[9px] font-normal bg-red-100 text-red-700 px-1 py-0.5 rounded ml-0.5">LATE</span>}
                                    </span>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="py-2 px-1 sm:px-3 text-[10px] sm:text-xs">
                                {(() => {
                                  const nextAct = ALL_PIPELINE_ACTIONS.find(a => !isStepDone(followUp.name, a.id));
                                  if (!nextAct) return <span className="text-green-600 font-bold">Done</span>;
                                  const step = PIPELINE_STEPS.find(s => s.actions.some(a => a.id === nextAct.id));
                                  // Check if this step is overdue based on visit_date
                                  const visitD = followUp.visit_date ? new Date(followUp.visit_date) : null;
                                  const today = new Date(new Date().toISOString().split('T')[0]);
                                  const dueDate = visitD ? new Date(visitD.getTime() + (step?.day || 0) * 86400000) : null;
                                  const isLate = dueDate && dueDate < today;
                                  return (
                                    <span className={`flex items-center gap-1 ${isLate ? 'text-red-600 font-bold' : ''}`}>
                                      {nextAct.type === 'email' ? <Mail className="w-3 h-3 text-blue-500" /> : <MessageSquare className="w-3 h-3 text-green-500" />}
                                      <span className="truncate">D{step?.day}</span>
                                      {isLate && <span className="text-[8px] bg-red-600 text-white px-1 rounded">!</span>}
                                    </span>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="py-2 px-1 sm:px-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openPipelineMenu(followUp); }}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                                  data-testid={`pipeline-btn-${index}`}
                                >
                                  <div className="flex gap-0.5">
                                    {ALL_PIPELINE_ACTIONS.map(a => (
                                      <div key={a.id} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isStepDone(followUp.name, a.id) ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    ))}
                                  </div>
                                  <span className="text-[10px] sm:text-xs font-mono font-bold text-gray-500">{progress.done}/{progress.total}</span>
                                </button>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Pipeline Complete - leads that finished all 7 steps */}
            {kpiData.follow_ups && (() => {
              const completed = kpiData.follow_ups.filter(f => {
                const p = getPipelineProgress(f.name);
                return p.done === p.total;
              });
              return completed.length > 0 ? (
                <div className="mt-6 rounded-2xl border-l-4 overflow-hidden p-4 sm:p-6" style={{ backgroundColor: '#F0FDF4', borderLeftColor: '#22C55E' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-500 shadow-sm">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-green-800">Pipeline Complete</h2>
                      <p className="text-xs text-green-600">{completed.length} lead{completed.length > 1 ? 's' : ''} finished all steps — waiting for decision</p>
                    </div>
                  </div>
                  <Card className="bg-white border border-green-200 shadow-sm rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-green-50/80">
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-green-600 py-2 px-2 sm:px-3">Name</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-green-600 py-2 px-2 sm:px-3 hidden sm:table-cell">City</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-green-600 py-2 px-2 sm:px-3">Since Visit</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-green-600 py-2 px-2 sm:px-3">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {completed.map((f, i) => {
                            const visitD = f.visit_date ? new Date(f.visit_date) : null;
                            const daysSince = visitD ? Math.floor((new Date(new Date().toISOString().split('T')[0]) - visitD) / 86400000) : 0;
                            return (
                              <TableRow key={i} className="border-b border-gray-100 hover:bg-green-50 cursor-pointer" onClick={() => openClientModal(f)}>
                                <TableCell className="py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-gray-800 underline decoration-dotted">{f.name}</TableCell>
                                <TableCell className="py-2 px-2 sm:px-3 text-xs text-gray-600 hidden sm:table-cell">{f.city}</TableCell>
                                <TableCell className="py-2 px-2 sm:px-3 font-mono text-xs font-bold text-gray-600">{daysSince}d</TableCell>
                                <TableCell className="py-2 px-2 sm:px-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                    <Check className="w-3 h-3" /> 7/7
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              ) : null;
            })()}

          </div>
            )}

            {/* === DATA TAB === */}
            {activeTab === 'data' && (
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
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or city..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    data-testid="data-search"
                  />
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
              </div>

              <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-gray-500 py-2 px-2 sm:px-3">Name</TableHead>
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
                      {allLeads
                        .filter(l => {
                          // Date filter: match header Pay Period / Quick Filter
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
                        })
                        .map((lead, i) => (
                        <TableRow key={lead.lead_id || i} className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                          onClick={() => setEditingLead({...lead})} data-testid={`data-row-${i}`}>
                          <TableCell className="py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium text-gray-800">
                            <span className="line-clamp-1">{lead.name}</span>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 text-xs text-gray-600 hidden sm:table-cell">{lead.city}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-3">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              lead.status === 'SALE' ? 'bg-green-100 text-green-700' :
                              lead.status === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>{lead.status}</span>
                          </TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 text-[10px] sm:text-xs text-gray-600">{lead.unit_type}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 font-mono text-xs font-semibold text-gray-800">${(lead.ticket_value || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 font-mono text-xs text-green-700 hidden md:table-cell">${(lead.commission_value || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 font-mono text-[10px] text-gray-500 hidden lg:table-cell">{lead.visit_date}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 font-mono text-[10px] text-gray-500 hidden lg:table-cell">{lead.close_date}</TableCell>
                          <TableCell className="py-2 px-2 sm:px-3 font-mono text-[10px] text-gray-500 hidden xl:table-cell">{lead.install_date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                  {allLeads.filter(l => { if (payPeriod && payPeriod !== 'all') { const p = PAY_PERIODS_DATA.find(pp => pp.name === payPeriod); if (p) { const vd = l.visit_date ? new Date(l.visit_date + 'T00:00:00') : null; if (!vd || vd < p.start || vd > p.end) return false; } } else if (dateFilter && dateFilter !== 'all') { const days = dateFilter === 'week' ? 7 : dateFilter === '2weeks' ? 14 : dateFilter === 'month' ? 30 : 365; const vd = l.visit_date ? new Date(l.visit_date + 'T00:00:00') : null; if (!vd || vd < new Date(Date.now() - days * 86400000)) return false; } return true; }).filter(l => statusFilter === 'all' || l.status === statusFilter).filter(l => !searchTerm || (l.name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (l.city||'').toLowerCase().includes(searchTerm.toLowerCase())).length} records
                </div>
              </Card>
            </div>
            )}

          </>
        ) : null}
      </main>

      {/* Pipeline Modal */}
      {actionMenu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setActionMenu(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-500 px-4 sm:px-6 py-3 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white z-10">
              <div>
                <h3 className="text-base font-bold">Closing Flow</h3>
                <p className="text-xs text-white/80">{actionMenu.client.name} \u2014 {getPipelineProgress(actionMenu.client.name).done}/{ALL_PIPELINE_ACTIONS.length} steps</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => savePipelineSchedule(actionMenu.client.name, pipelineSchedule)} className="p-1.5 hover:bg-white/20 rounded-full" title="Save schedule"><Save className="w-4 h-4" /></button>
                <button onClick={() => setActionMenu(null)} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-3 sm:p-4">
              {PIPELINE_STEPS.map((step, si) => {
                const allDone = step.actions.every(a => isStepDone(actionMenu.client.name, a.id));
                const someDone = step.actions.some(a => isStepDone(actionMenu.client.name, a.id));
                return (
                  <div key={si} className="relative">
                    {si < PIPELINE_STEPS.length - 1 && <div className={`absolute left-[15px] top-10 w-0.5 h-[calc(100%-16px)] ${allDone ? 'bg-green-400' : 'bg-gray-200'}`} />}
                    <div className="flex items-start gap-3 mb-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${allDone ? 'bg-green-500 text-white' : someDone ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-500'}`}>{step.day}</div>
                      <div className="pt-1"><p className="text-sm font-bold text-gray-800">{step.label}</p><p className="text-[10px] text-gray-400">{step.subtitle}</p></div>
                    </div>
                    <div className="ml-11 mb-4 space-y-1.5">
                      {step.actions.map(action => {
                        const done = isStepDone(actionMenu.client.name, action.id);
                        const sched = pipelineSchedule.find(s => s.id === action.id) || {};
                        const schedIdx = pipelineSchedule.findIndex(s => s.id === action.id);
                        return (
                          <div key={action.id} className={`rounded-lg border transition-all ${done ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                            <div className="flex items-stretch">
                              <button onClick={() => toggleStep(actionMenu.client.name, action.id)}
                                className={`flex items-center justify-center w-10 flex-shrink-0 rounded-l-lg ${done ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-50 hover:bg-gray-100'}`}
                                data-testid={`toggle-${action.id}`}>
                                {done ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <div className="w-4 h-4 rounded border-2 border-gray-300" />}
                              </button>
                              <div className="flex-1 p-2 flex items-center gap-2 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    {action.type === 'email' ? <Mail className="w-3 h-3 text-blue-500 flex-shrink-0" /> : <MessageSquare className="w-3 h-3 text-green-500 flex-shrink-0" />}
                                    <span className="text-xs font-semibold text-gray-700 truncate">{action.name}</span>
                                  </div>
                                  {sched.scheduled_date && <p className="text-[10px] text-gray-400 mt-0.5">Scheduled: {sched.scheduled_date}</p>}
                                </div>
                                <button onClick={() => action.type === 'email' ? handleSendEmail(actionMenu.client, action) : handleCopySMS(actionMenu.client, action)}
                                  className={`p-1.5 rounded-md flex-shrink-0 ${action.type === 'email' ? 'hover:bg-blue-100 text-blue-500' : 'hover:bg-green-100 text-green-500'}`}>
                                  {action.type === 'email' ? <Send className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            {schedIdx >= 0 && (
                              <div className="flex gap-2 px-2 pb-2 pt-1 ml-10 border-t border-gray-100">
                                <input type="date" value={sched.scheduled_date || ''}
                                  onChange={(e) => { const ns = [...pipelineSchedule]; ns[schedIdx] = {...ns[schedIdx], scheduled_date: e.target.value}; setPipelineSchedule(ns); }}
                                  className="text-[10px] px-1.5 py-1 border border-gray-200 rounded w-28 bg-white" />
                                <input type="text" value={sched.comment || ''} placeholder="Note..."
                                  onChange={(e) => { const ns = [...pipelineSchedule]; ns[schedIdx] = {...ns[schedIdx], comment: e.target.value}; setPipelineSchedule(ns); }}
                                  className="text-[10px] px-1.5 py-1 border border-gray-200 rounded flex-1 bg-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {newLeadOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setNewLeadOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white z-10">
              <div className="flex items-center gap-2"><Plus className="w-5 h-5" /><h3 className="text-base font-bold">New Lead</h3></div>
              <button onClick={() => setNewLeadOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            {newLeadStep === 'paste' ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600"><ClipboardPaste className="w-4 h-4" /><span>Paste the dispatch email below:</span></div>
                <textarea value={newLeadText} onChange={(e) => setNewLeadText(e.target.value)}
                  placeholder={"Salesman # - 10068\nCustomer Name - DAVID LEMLEY\nAddress 1 - 2920 BROSSMAN ST\nCity - NAPERVILLE\nEmail - DLEMLEY68@GMAIL.COM"}
                  rows={8} className="w-full px-3 py-2 text-xs font-mono border rounded-lg resize-none" />
                <div className="flex gap-2">
                  <Button onClick={handleParseEmail} className="flex-1" style={{ backgroundColor: '#2563EB' }} disabled={!newLeadText.trim()}>Parse & Continue</Button>
                  <Button onClick={() => { setNewLeadForm({ name:'', address:'', city:'', email:'', phone:'', unit_type:'', ticket_value:'', commission_percent:'', status:'PENDING', visit_date:new Date().toISOString().split('T')[0], close_date:'', install_date:'', follow_up_date:'', comments:'', feeling:'', objections:''}); setNewLeadStep('form'); }} variant="outline">Manual Entry</Button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[['name','Name *'],['address','Address'],['city','City'],['email','Email'],['phone','Phone']].map(([k,l]) => (
                    <div key={k} className={k === 'name' ? 'col-span-2' : ''}>
                      <label className="text-[10px] font-bold uppercase text-gray-500">{l}</label>
                      <input value={newLeadForm[k] || ''} onChange={(e) => setNewLeadForm(p => ({...p, [k]: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500">Visit Date</label>
                    <input type="date" value={newLeadForm.visit_date || ''} onChange={(e) => setNewLeadForm(p => ({...p, visit_date: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500">Comments</label>
                    <input value={newLeadForm.comments || ''} onChange={(e) => setNewLeadForm(p => ({...p, comments: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">The rest can be filled in later from the Data tab.</p>
                <div className="flex gap-2">
                  <Button onClick={handleCreateLead} className="flex-1" style={{ backgroundColor: '#2563EB' }}>Create Lead</Button>
                  <Button onClick={() => setNewLeadStep('paste')} variant="outline">Back</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <div><h3 className="font-bold text-gray-900">Delete Lead?</h3><p className="text-sm text-gray-500">{deleteConfirm.name}</p></div>
            </div>
            <p className="text-sm text-gray-600 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <Button onClick={() => handleDeleteLead(deleteConfirm.lead_id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Delete</Button>
              <Button onClick={() => setDeleteConfirm(null)} variant="outline" className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

            {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedClient.name}</h3>
                <p className="text-sm text-gray-500">Client Details</p>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="close-client-modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="px-4 sm:px-6 py-4 space-y-4">
              {/* Status & Priority */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  selectedClient.status === 'SALE' ? 'bg-green-100 text-green-800' :
                  selectedClient.status === 'LOST' ? 'bg-red-100 text-red-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {selectedClient.status}
                </span>
                {selectedClient.is_urgent && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    <AlertTriangle className="w-3 h-3" />
                    URGENT
                  </span>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                {selectedClient.city && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                      <p className="text-sm text-gray-900">{selectedClient.address ? `${selectedClient.address}, ` : ''}{selectedClient.city}</p>
                    </div>
                  </div>
                )}
                
                {selectedClient.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                      <a href={`mailto:${selectedClient.email}`} className="text-sm text-blue-600 hover:underline">{selectedClient.email}</a>
                    </div>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Last Visit Date</span>
                  <span className="text-sm font-mono font-medium text-gray-900">{selectedClient.visit_date || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Last Follow-up</span>
                  <span className="text-sm font-mono font-medium text-gray-900">
                    {selectedClient.follow_up_date || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-semibold">Next Follow-up</span>
                  <span className="text-sm font-mono font-bold" style={{ color: BRAND_COLORS.primary }}>
                    {clientNote.next_follow_up || 'Not set'}
                  </span>
                </div>
              </div>

              {/* Equipment Quoted */}
              {selectedClient.unit_type && (
                <div className="flex items-start gap-3">
                  <Settings className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Equipment Quoted</p>
                    <p className="text-sm text-gray-900">{selectedClient.unit_type}</p>
                    {selectedClient.ticket_value > 0 && (
                      <p className="text-sm font-mono font-semibold" style={{ color: BRAND_COLORS.primary }}>
                        ${selectedClient.ticket_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Feeling */}
              {selectedClient.feeling && (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Feeling</p>
                    <p className="text-sm text-gray-900">{selectedClient.feeling}</p>
                  </div>
                </div>
              )}

              {/* Objections */}
              {selectedClient.objections && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Objections</p>
                    <p className="text-sm text-gray-900">{selectedClient.objections}</p>
                  </div>
                </div>
              )}

              {/* Comments from Sheet */}
              {selectedClient.comments && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Comments</p>
                    <p className="text-sm text-gray-700">{selectedClient.comments}</p>
                  </div>
                </div>
              )}

              {/* === PIPELINE STATUS === */}
              {(() => {
                const progress = getPipelineProgress(selectedClient.name);
                return progress.done > 0 ? (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-blue-700 uppercase tracking-wider font-bold">Closing Flow</p>
                      <span className="text-xs font-mono font-bold text-blue-600">{progress.done}/{progress.total}</span>
                    </div>
                    <div className="flex gap-1 mb-2">
                      {ALL_PIPELINE_ACTIONS.map(a => (
                        <div key={a.id} className={`flex-1 h-1.5 rounded-full ${isStepDone(selectedClient.name, a.id) ? 'bg-green-500' : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <div className="space-y-1">
                      {PIPELINE_STEPS.map(step => step.actions.filter(a => isStepDone(selectedClient.name, a.id)).map(a => (
                        <div key={a.id} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          {a.type === 'email' ? <Mail className="w-3 h-3 text-blue-500" /> : <MessageSquare className="w-3 h-3 text-green-500" />}
                          <span className="text-xs text-gray-700">Day {PIPELINE_STEPS.find(s => s.actions.includes(a))?.day} — {a.name}</span>
                        </div>
                      )))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* === PRIORITY + NEXT FOLLOW-UP === */}
              <div className="bg-amber-50 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-amber-700 uppercase tracking-wider font-bold">Priority</p>
                  <div className="flex gap-1">
                    {[['high','High','bg-red-500'],['medium','Med','bg-amber-500'],['low','Low','bg-gray-400']].map(([v,l,c]) => (
                      <button key={v} onClick={() => setClientNote(p => ({...p, priority: v}))}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${clientNote.priority === v ? `${c} text-white shadow-sm` : 'bg-white text-gray-500 border border-gray-200'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-amber-700 uppercase tracking-wider font-bold mb-1.5">Next Follow-up</p>
                  <input type="date" value={clientNote.next_follow_up}
                    onChange={(e) => setClientNote(prev => ({ ...prev, next_follow_up: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    data-testid="next-followup-date" />
                </div>
              </div>

              {/* === SALESPERSON NOTES === */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs text-gray-600 uppercase tracking-wider font-bold">My Notes</p>
                <textarea
                  value={clientNote.comment}
                  onChange={(e) => setClientNote(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Add a note about this client..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  data-testid="client-note-input"
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-3 flex gap-2">
              <Button 
                onClick={saveClientNote}
                disabled={noteSaving}
                className="flex-1"
                style={{ backgroundColor: '#2563EB' }}
                data-testid="save-notes-btn"
              >
                {noteSaving ? 'Saving...' : 'Save Notes'}
              </Button>
              {selectedClient.lead_id && (
                <Button 
                  onClick={() => setDeleteConfirm(selectedClient)}
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button 
                onClick={() => setSelectedClient(null)}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSale(null)}>
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-green-600 text-white px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold">{selectedSale.name}</h3>
                <p className="text-sm text-white/80">Sale Details</p>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                data-testid="close-sale-modal"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="px-4 sm:px-6 py-4 space-y-4">
              {/* Sale Amount */}
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Sale Value</p>
                <p className="text-3xl font-bold text-green-700">${selectedSale.ticket_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>

              {/* Commission */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                  <span className="text-xs text-gray-600 font-semibold">Total Commission</span>
                  <span className="text-lg font-mono font-bold" style={{ color: BRAND_COLORS.primary }}>
                    ${selectedSale.commission_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Breakdown</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Base ({selectedSale.commission_percent}% of sale)</span>
                  <span className="text-sm font-mono text-gray-700">
                    ${(selectedSale.commission_value - (selectedSale.spif_total || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedSale.spif_total > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">SPIFF (included)</span>
                    <span className="text-sm font-mono text-amber-600">
                      ${selectedSale.spif_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Location */}
              {selectedSale.city && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                    <p className="text-sm text-gray-900">{selectedSale.address ? `${selectedSale.address}, ` : ''}{selectedSale.city}</p>
                  </div>
                </div>
              )}

              {/* Equipment */}
              {selectedSale.unit_type && (
                <div className="flex items-start gap-3">
                  <Settings className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Equipment Installed</p>
                    <p className="text-sm text-gray-900">{selectedSale.unit_type}</p>
                  </div>
                </div>
              )}

              {/* Important Dates */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Key Dates</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Visit Date</span>
                  <span className="text-sm font-mono text-gray-900">{selectedSale.visit_date || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Close Date</span>
                  <span className="text-sm font-mono text-gray-900">{selectedSale.close_date || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Install Date</span>
                  <span className="text-sm font-mono font-semibold text-green-700">{selectedSale.install_date || 'N/A'}</span>
                </div>
              </div>

              {/* Email */}
              {selectedSale.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                    <a href={`mailto:${selectedSale.email}`} className="text-sm text-blue-600 hover:underline">{selectedSale.email}</a>
                  </div>
                </div>
              )}

              {/* Comments */}
              {selectedSale.comments && (
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Comments</p>
                    <p className="text-sm text-gray-700">{selectedSale.comments}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-3">
              <Button 
                onClick={() => setSelectedSale(null)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* Edit Lead Modal (Data tab) */}
      {editingLead && (() => {
        const spiffSum = (editingLead.apco_x || 0) + (editingLead.samsung || 0) + (editingLead.mitsubishi || 0) + (editingLead.surge_protector || 0) + (editingLead.duct_cleaning || 0) + (editingLead.self_gen_mits || 0);
        const baseComm = (editingLead.ticket_value || 0) * (editingLead.commission_percent || 0) / 100;
        const totalComm = baseComm + spiffSum;
        return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditingLead(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-gray-800 to-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white z-10">
              <div><h3 className="text-base font-bold">Edit Lead</h3><p className="text-xs text-white/80">{editingLead.name}</p></div>
              <button onClick={() => setEditingLead(null)} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[['name','Name'],['address','Address'],['city','City'],['email','Email'],['phone','Phone'],['unit_type','Unit Type']].map(([k,l]) => (
                  <div key={k} className={k === 'name' || k === 'address' ? 'col-span-2' : ''}>
                    <label className="text-[10px] font-bold uppercase text-gray-500">{l}</label>
                    <input value={editingLead[k] || ''} onChange={(e) => setEditingLead(p => ({...p, [k]: e.target.value}))}
                      className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Status</label>
                  <select value={editingLead.status || 'PENDING'} onChange={(e) => setEditingLead(p => ({...p, status: e.target.value}))}
                    className="w-full px-2 py-1.5 text-sm border rounded-lg">
                    <option>PENDING</option><option>SALE</option><option>LOST</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Ticket Value</label>
                  <input type="number" step="0.01" value={editingLead.ticket_value ?? ''} 
                    onChange={(e) => setEditingLead(p => ({...p, ticket_value: e.target.value === '' ? 0 : parseFloat(e.target.value)}))}
                    className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Commission %</label>
                  <input type="number" step="0.01" value={editingLead.commission_percent ?? ''} 
                    onChange={(e) => setEditingLead(p => ({...p, commission_percent: e.target.value === '' ? 0 : parseFloat(e.target.value)}))}
                    className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                </div>
                {/* Auto-calculated commission */}
                <div className="col-span-2 bg-green-50 rounded-lg p-2.5 border border-green-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Base ({editingLead.commission_percent || 0}% of ${(editingLead.ticket_value || 0).toLocaleString()})</span>
                    <span className="font-mono font-semibold">${baseComm.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">+ SPIFFs</span>
                    <span className="font-mono font-semibold text-amber-600">${spiffSum.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-green-300 mt-1 pt-1">
                    <span className="text-green-700">Total Commission</span>
                    <span className="font-mono text-green-700">${totalComm.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                </div>
                {[['visit_date','Visit Date'],['close_date','Close Date'],['install_date','Install Date'],['follow_up_date','Follow-up Date']].map(([k,l]) => (
                  <div key={k}><label className="text-[10px] font-bold uppercase text-gray-500">{l}</label>
                    <input type="date" value={editingLead[k] || ''} onChange={(e) => setEditingLead(p => ({...p, [k]: e.target.value}))}
                      className="w-full px-2 py-1.5 text-sm border rounded-lg" /></div>
                ))}
              </div>
              <p className="text-[10px] font-bold uppercase text-gray-400 pt-2">SPIFF Details</p>
              <div className="grid grid-cols-3 gap-2">
                {[['apco_x','APCO X'],['samsung','Samsung'],['mitsubishi','Mitsubishi'],['surge_protector','Surge Prot.'],['duct_cleaning','Duct Clean.'],['self_gen_mits','Self Gen Mits']].map(([k,l]) => (
                  <div key={k}><label className="text-[10px] font-bold uppercase text-gray-400">{l}</label>
                    <input type="number" step="0.01" value={editingLead[k] ?? ''} 
                      onChange={(e) => setEditingLead(p => ({...p, [k]: e.target.value === '' ? 0 : parseFloat(e.target.value)}))}
                      className="w-full px-2 py-1 text-xs border rounded-lg" /></div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Comments</label>
                <textarea value={editingLead.comments || ''} onChange={(e) => setEditingLead(p => ({...p, comments: e.target.value}))}
                  rows={2} className="w-full px-2 py-1.5 text-sm border rounded-lg resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveEditLead} className="flex-1" style={{ backgroundColor: '#2563EB' }}>Save Changes</Button>
                <Button onClick={() => setDeleteConfirm(editingLead)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button onClick={() => setEditingLead(null)} variant="outline">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Footer - Mobile Responsive */}
      <footer className="py-3 sm:py-4 mt-6 sm:mt-8" style={{ backgroundColor: BRAND_COLORS.secondary }}>
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-8">
          <p className="text-[10px] sm:text-xs text-white/60 text-center">
            © {new Date().getFullYear()} Four Seasons Heating & Cooling
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
