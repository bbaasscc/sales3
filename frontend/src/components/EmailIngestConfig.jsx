import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, CheckCircle, AlertCircle, RefreshCw, Settings, Users, Clock, Zap } from "lucide-react";
import axios from "axios";
import { API } from "@/lib/constants";

export default function EmailIngestConfig({ token }) {
  const headers = { Authorization: `Bearer ${token}` };
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({ gmail_address: "", gmail_app_password: "", enabled: false, check_interval_minutes: 5, sender_filter: "salesrequest" });
  const [salespeople, setSalespeople] = useState([]);
  const [editingSp, setEditingSp] = useState(null);
  const [spNumber, setSpNumber] = useState("");
  const [testing, setTesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, spRes, logRes] = await Promise.all([
        axios.get(`${API}/email-ingest/config`, { headers }),
        axios.get(`${API}/email-ingest/salespeople-numbers`, { headers }),
        axios.get(`${API}/email-ingest/logs`, { headers }),
      ]);
      const cfg = cfgRes.data.config;
      if (cfg) {
        setConfig(cfg);
        setForm({ gmail_address: cfg.gmail_address || "", gmail_app_password: "", enabled: cfg.enabled || false, check_interval_minutes: cfg.check_interval_minutes || 5, sender_filter: cfg.sender_filter || "salesrequest" });
      }
      setSalespeople(spRes.data.salespeople || []);
      setLogs(logRes.data.logs || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.gmail_address) { toast.error("Gmail address required"); return; }
    if (!form.gmail_app_password && !config) { toast.error("App password required"); return; }
    try {
      const payload = { ...form };
      if (!payload.gmail_app_password && config) payload.gmail_app_password = config.gmail_app_password;
      await axios.post(`${API}/email-ingest/config`, payload, { headers });
      toast.success("Config saved");
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Error saving config"); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await axios.post(`${API}/email-ingest/test-connection`, {}, { headers });
      setTestResult(res.data);
      toast.success(`Connected! ${res.data.unread_messages} unread emails`);
    } catch (err) { 
      setTestResult({ error: err.response?.data?.detail || "Connection failed" });
      toast.error(err.response?.data?.detail || "Connection failed");
    }
    setTesting(false);
  };

  const handleCheckNow = async () => {
    setChecking(true); setCheckResult(null);
    try {
      const res = await axios.post(`${API}/email-ingest/check-now`, {}, { headers });
      setCheckResult(res.data);
      if (res.data.created > 0) toast.success(`${res.data.created} new leads created!`);
      else toast.info(`${res.data.processed} emails processed, no new leads`);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Error"); }
    setChecking(false);
  };

  const handleUpdateSalesNumber = async (userId) => {
    try {
      await axios.put(`${API}/email-ingest/salespeople-number/${userId}`, { sales_number: spNumber }, { headers });
      toast.success("Sales number updated");
      setEditingSp(null);
      fetchData();
    } catch (err) { toast.error("Error updating"); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[200px]"><p className="text-gray-400">Loading...</p></div>;

  return (
    <div className="space-y-6">
      {/* Gmail Connection */}
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Mail className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-700" data-testid="email-config-title">Email Auto-Ingest</h3>
              <p className="text-[11px] text-gray-400">Automatically create leads from forwarded emails</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1">Gmail Address</Label>
              <Input value={form.gmail_address} onChange={e => setForm(f => ({...f, gmail_address: e.target.value}))}
                placeholder="leads@gmail.com" className="text-sm" data-testid="email-gmail-address" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1">App Password</Label>
              <Input type="password" value={form.gmail_app_password} onChange={e => setForm(f => ({...f, gmail_app_password: e.target.value}))}
                placeholder={config ? "••••  (leave blank to keep)" : "xxxx xxxx xxxx xxxx"} className="text-sm" data-testid="email-app-password" />
            </div>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500">Filter emails from</Label>
              <Input value={form.sender_filter} onChange={e => setForm(f => ({...f, sender_filter: e.target.value}))}
                placeholder="salesrequest" className="w-32 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500">Check every</Label>
              <Input type="number" min={1} max={60} value={form.check_interval_minutes}
                onChange={e => setForm(f => ({...f, check_interval_minutes: parseInt(e.target.value) || 5}))}
                className="w-16 text-sm text-center" />
              <span className="text-xs text-gray-400">min</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({...f, enabled: e.target.checked}))}
                className="rounded border-gray-300" data-testid="email-enabled" />
              <span className={`text-xs font-bold ${form.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                {form.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" data-testid="email-save-btn">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Save Config
            </Button>
            <Button onClick={handleTest} size="sm" variant="outline" disabled={testing || !config} className="text-xs" data-testid="email-test-btn">
              {testing ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
              Test Connection
            </Button>
            <Button onClick={handleCheckNow} size="sm" disabled={checking || !config?.enabled} className="bg-emerald-600 hover:bg-emerald-700 text-xs" data-testid="email-check-btn">
              {checking ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
              Check Inbox Now
            </Button>
          </div>

          {testResult && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${testResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`} data-testid="email-test-result">
              {testResult.error ? (
                <><AlertCircle className="w-3.5 h-3.5 inline mr-1" />{testResult.error}</>
              ) : (
                <><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Connected! {testResult.total_messages} messages, {testResult.unread_messages} unread</>
              )}
            </div>
          )}

          {checkResult && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs" data-testid="email-check-result">
              <Zap className="w-3.5 h-3.5 inline mr-1" />
              Processed: {checkResult.processed} emails | Created: {checkResult.created} leads | Skipped: {checkResult.skipped}
              {checkResult.errors > 0 && <span className="text-red-600 ml-2">Errors: {checkResult.errors}</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salespeople Numbers */}
      <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-sm font-bold text-gray-700">Salesperson Numbers</h3>
              <p className="text-[11px] text-gray-400">Map email "Salesman #" to each salesperson</p>
            </div>
          </div>
          <div className="space-y-2">
            {salespeople.map(sp => (
              <div key={sp.user_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100" data-testid={`sp-number-${sp.user_id}`}>
                <span className="text-sm font-medium text-gray-800 flex-1">{sp.name}</span>
                {editingSp === sp.user_id ? (
                  <div className="flex items-center gap-1.5">
                    <Input value={spNumber} onChange={e => setSpNumber(e.target.value)} placeholder="e.g. 10149" className="w-24 h-7 text-xs" />
                    <Button size="sm" onClick={() => handleUpdateSalesNumber(sp.user_id)} className="h-7 text-[10px] px-2 bg-blue-600">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingSp(null)} className="h-7 text-[10px] px-2">X</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${sp.sales_number ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                      {sp.sales_number || 'NOT SET'}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingSp(sp.user_id); setSpNumber(sp.sales_number || ''); }} className="h-7 text-[10px] px-2">Edit</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      {logs.length > 0 && (
        <Card className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-700">Recent Activity</h3>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-gray-50 text-[11px]">
                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="font-mono">
                    <span className="text-gray-600">{log.processed} emails</span>
                    {log.created > 0 && <span className="text-green-600 ml-2">+{log.created} leads</span>}
                    {log.skipped > 0 && <span className="text-amber-600 ml-2">{log.skipped} skipped</span>}
                    {log.errors > 0 && <span className="text-red-600 ml-2">{log.errors} errors</span>}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card className="bg-gray-50 border border-gray-200 rounded-xl">
        <CardContent className="p-5">
          <h4 className="text-xs font-bold text-gray-600 mb-2">Setup Instructions</h4>
          <ol className="text-[11px] text-gray-500 space-y-1 list-decimal list-inside">
            <li>Create a dedicated Gmail account (e.g., leads.fourseasons@gmail.com)</li>
            <li>Enable 2-Step Verification in Google Account settings</li>
            <li>Go to <strong>myaccount.google.com/apppasswords</strong> and generate an App Password</li>
            <li>Enter the Gmail address and App Password above</li>
            <li>Make sure each salesperson has their "Salesman #" configured</li>
            <li>Forward or send lead emails to the configured Gmail address</li>
            <li>The system will automatically check for new emails and create leads</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
