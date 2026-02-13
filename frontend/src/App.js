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
  const [clientNote, setClientNote] = useState({ next_follow_up: '', comment: '' });
  const [noteSaving, setNoteSaving] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newLeadText, setNewLeadText] = useState('');
  const [newLeadForm, setNewLeadForm] = useState({});
  const [newLeadStep, setNewLeadStep] = useState('paste'); // 'paste' or 'form'
  const [editSale, setEditSale] = useState(null);
  const [pipelineSchedule, setPipelineSchedule] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { client, type: 'email'|'sms' }

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
    setClientNote({ next_follow_up: '', comment: '' });
    try {
      const res = await axios.get(`${API}/client/notes`, { params: { client_name: client.name } });
      setClientNote({ next_follow_up: res.data.next_follow_up || '', comment: res.data.comment || '' });
    } catch (err) { console.error(err); }
  };

  const saveClientNote = async () => {
    if (!selectedClient) return;
    setNoteSaving(true);
    try {
      await axios.post(`${API}/client/notes`, {
        client_name: selectedClient.name,
        next_follow_up: clientNote.next_follow_up,
        comment: clientNote.comment
      });
      toast.success("Notes saved");
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
      setDeleteConfirm(null); setSelectedClient(null); setSelectedSale(null);
      fetchDashboardData();
    } catch { toast.error("Error deleting lead"); }
  };

  // Pipeline schedule
  const loadPipelineSchedule = async (clientName) => {
    try {
      const res = await axios.get(`${API}/pipeline/schedule`, { params: { client_name: clientName } });
      setPipelineSchedule(res.data.steps || []);
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
    loadPipelineSchedule(client.name);
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                  <SummaryCard title="Total Revenue" value={kpiData.total_revenue} prefix="$" icon={DollarSign} description="Closed deals revenue" highlight />
                  <SummaryCard title="Commission" value={kpiData.total_commission} prefix="$" icon={BadgeDollarSign} description="Total commission earned" highlight />
                  <SummaryCard title="Closed Deals" value={kpiData.closed_deals} icon={Target} description="SALE status deals" />
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
                      {kpiData.follow_ups.length}
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
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap hidden sm:table-cell">Follow-up</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap">Days</TableHead>
                            <TableHead className="text-[10px] sm:text-xs font-bold uppercase text-red-400 py-2 sm:py-3 px-1 sm:px-3 whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {kpiData.follow_ups.slice(0, 10).map((followUp, index) => {
                            const progress = getPipelineProgress(followUp.name);
                            return (
                            <TableRow 
                              key={index} 
                              className={`border-b border-gray-100 transition-colors ${followUp.is_urgent ? 'bg-red-50/50 hover:bg-red-100/50' : 'hover:bg-gray-50'}`}
                              data-testid={`followup-row-${index}`}
                            >
                              <TableCell className="py-2 px-1 sm:px-3">
                                {followUp.is_urgent ? (
                                  <span className="inline-flex items-center gap-0.5 px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-red-100 text-red-700">
                                    <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span className="hidden sm:inline">URGENT</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600">
                                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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
                              <TableCell className={`py-2 px-1 sm:px-3 font-mono text-[10px] sm:text-xs hidden sm:table-cell ${followUp.is_urgent ? 'font-bold text-red-600' : 'text-gray-600'}`}>
                                {followUp.follow_up_date}
                              </TableCell>
                              <TableCell className={`py-2 px-1 sm:px-3 font-mono text-[10px] sm:text-xs font-bold ${followUp.is_urgent ? 'text-red-600' : 'text-gray-600'}`}>
                                {followUp.days_until !== null ? (
                                  followUp.days_until < 0 ? `${Math.abs(followUp.days_until)}d ago` :
                                  followUp.days_until === 0 ? 'Today' :
                                  `${followUp.days_until}d`
                                ) : '-'}
                              </TableCell>
                              <TableCell className="py-2 px-1 sm:px-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActionMenu({ client: followUp }); }}
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

          </div>
        ) : null}
      </main>

      {/* Pipeline Modal */}
      {actionMenu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setActionMenu(null)}>
          <div 
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-500 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white z-10">
              <div>
                <h3 className="text-base font-bold">Closing Flow</h3>
                <p className="text-xs text-white/80">{actionMenu.client.name} — {getPipelineProgress(actionMenu.client.name).done}/{ALL_PIPELINE_ACTIONS.length} steps</p>
              </div>
              <button onClick={() => setActionMenu(null)} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-3 sm:p-4">
              {PIPELINE_STEPS.map((step, si) => {
                const allDone = step.actions.every(a => isStepDone(actionMenu.client.name, a.id));
                const someDone = step.actions.some(a => isStepDone(actionMenu.client.name, a.id));
                return (
                  <div key={si} className="relative">
                    {si < PIPELINE_STEPS.length - 1 && (
                      <div className={`absolute left-[15px] top-10 w-0.5 h-[calc(100%-16px)] ${allDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                    <div className="flex items-start gap-3 mb-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        allDone ? 'bg-green-500 text-white' : someDone ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>{step.day}</div>
                      <div className="pt-1">
                        <p className="text-sm font-bold text-gray-800">{step.label}</p>
                        <p className="text-[10px] text-gray-400">{step.subtitle}</p>
                      </div>
                    </div>
                    <div className="ml-11 mb-4 space-y-1.5">
                      {step.actions.map(action => {
                        const done = isStepDone(actionMenu.client.name, action.id);
                        const name = getFirstName(actionMenu.client.name);
                        const preview = action.type === 'email'
                          ? action.body.replace(/\[NAME\]/g, name).substring(0, 60) + '...'
                          : action.text.replace(/\[NAME\]/g, name).substring(0, 60) + '...';
                        return (
                          <div key={action.id} className={`flex items-stretch rounded-lg border transition-all ${done ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                            <button
                              onClick={() => toggleStep(actionMenu.client.name, action.id)}
                              className={`flex items-center justify-center w-10 flex-shrink-0 rounded-l-lg transition-colors ${done ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-50 hover:bg-gray-100'}`}
                              data-testid={`toggle-${action.id}`}
                            >
                              {done ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <div className="w-4 h-4 rounded border-2 border-gray-300" />}
                            </button>
                            <div className="flex-1 p-2 sm:p-2.5 flex items-center gap-2 min-w-0">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {action.type === 'email' ? <Mail className="w-3 h-3 text-blue-500 flex-shrink-0" /> : <MessageSquare className="w-3 h-3 text-green-500 flex-shrink-0" />}
                                  <span className="text-xs font-semibold text-gray-700 truncate">{action.name}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{preview}</p>
                              </div>
                              <button
                                onClick={() => action.type === 'email' ? handleSendEmail(actionMenu.client, action) : handleCopySMS(actionMenu.client, action)}
                                className={`p-1.5 rounded-md flex-shrink-0 ${action.type === 'email' ? 'hover:bg-blue-100 text-blue-500' : 'hover:bg-green-100 text-green-500'}`}
                                title={action.type === 'email' ? 'Open in Outlook' : 'Copy to clipboard'}
                              >
                                {action.type === 'email' ? <Send className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
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
                  <span className="text-xs text-gray-500">Follow-up Date</span>
                  <span className="text-sm font-mono font-medium" style={{ color: selectedClient.is_urgent ? BRAND_COLORS.primary : '#111' }}>
                    {selectedClient.follow_up_date}
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

              {/* === NEXT FOLLOW-UP DATE === */}
              <div className="bg-amber-50 rounded-lg p-3 space-y-3">
                <p className="text-xs text-amber-700 uppercase tracking-wider font-bold">Next Follow-up</p>
                <input
                  type="date"
                  value={clientNote.next_follow_up}
                  onChange={(e) => setClientNote(prev => ({ ...prev, next_follow_up: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  data-testid="next-followup-date"
                />
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
