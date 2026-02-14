import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Target, TrendingUp, TrendingDown, Minus, DollarSign, Save } from "lucide-react";
import axios from "axios";
import { API } from "@/lib/constants";

const DeltaBadge = ({ current, previous, prefix = "", suffix = "", invert = false }) => {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : (current > 0 ? 100 : 0);
  const isPositive = invert ? diff < 0 : diff > 0;
  const isZero = diff === 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-semibold ${isZero ? 'text-gray-400' : isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isZero ? <Minus className="w-3 h-3" /> : isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{isPositive && '+'}{prefix}{typeof diff === 'number' && !suffix ? diff.toLocaleString('en-US', {maximumFractionDigits: 0}) : diff}{suffix}</span>
      {pct !== 0 && <span className="text-[10px] opacity-70">({pct > 0 && '+'}{pct}%)</span>}
    </div>
  );
};

const ProgressRing = ({ value, max, label, color }) => {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-mono font-bold text-gray-900">{pct}%</span>
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
    </div>
  );
};

export default function GoalsTab({ token, payPeriod }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [goalForm, setGoalForm] = useState({ revenue_goal: 0, deals_goal: 0, commission_goal: 0 });
  const [saving, setSaving] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const period = payPeriod && payPeriod !== 'all' ? payPeriod : '';
      if (!period) { setLoading(false); setData(null); return; }
      const res = await axios.get(`${API}/goals/comparison`, { headers, params: { pay_period: period } });
      setData(res.data);
      setGoalForm({
        revenue_goal: res.data.goal?.revenue_goal || 0,
        deals_goal: res.data.goal?.deals_goal || 0,
        commission_goal: res.data.goal?.commission_goal || 0,
      });
    } catch { toast.error("Error loading goals"); }
    finally { setLoading(false); }
  }, [token, payPeriod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveGoal = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/goals`, { pay_period: payPeriod, ...goalForm }, { headers });
      toast.success("Goal saved");
      setEditing(false);
      fetchData();
    } catch { toast.error("Error saving goal"); }
    finally { setSaving(false); }
  };

  if (!payPeriod || payPeriod === 'all') {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Select a pay period to view goals & comparison</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center min-h-[300px]"><p className="text-gray-400">Loading...</p></div>;
  if (!data) return null;

  const { current, previous, goal } = data;
  const hasGoal = goal.revenue_goal > 0 || goal.deals_goal > 0 || goal.commission_goal > 0;

  return (
    <div className="space-y-6">
      {/* Goal Progress */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6' }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-sm">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-blue-900" data-testid="goals-title">My Goals</h2>
                <p className="text-xs text-blue-600/70">{payPeriod}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}
              className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50" data-testid="edit-goals-btn">
              {editing ? 'Cancel' : (hasGoal ? 'Edit Goals' : 'Set Goals')}
            </Button>
          </div>

          {editing ? (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 space-y-3" data-testid="goal-form">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Revenue Goal</label>
                  <Input type="number" value={goalForm.revenue_goal || ''} data-testid="goal-revenue"
                    onChange={(e) => setGoalForm(p => ({...p, revenue_goal: parseFloat(e.target.value) || 0}))}
                    placeholder="50000" className="font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Deals Goal</label>
                  <Input type="number" value={goalForm.deals_goal || ''} data-testid="goal-deals"
                    onChange={(e) => setGoalForm(p => ({...p, deals_goal: parseInt(e.target.value) || 0}))}
                    placeholder="10" className="font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Commission Goal</label>
                  <Input type="number" value={goalForm.commission_goal || ''} data-testid="goal-commission"
                    onChange={(e) => setGoalForm(p => ({...p, commission_goal: parseFloat(e.target.value) || 0}))}
                    placeholder="5000" className="font-mono" />
                </div>
              </div>
              <Button onClick={saveGoal} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-goals-btn">
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Goals'}
              </Button>
            </div>
          ) : hasGoal ? (
            <div className="flex justify-center gap-6 sm:gap-10" data-testid="goal-rings">
              <ProgressRing value={current.total_revenue} max={goal.revenue_goal} label="Revenue" color="#3B82F6" />
              <ProgressRing value={current.closed_deals} max={goal.deals_goal} label="Deals" color="#22C55E" />
              <ProgressRing value={current.total_commission} max={goal.commission_goal} label="Commission" color="#8B5CF6" />
            </div>
          ) : (
            <div className="text-center py-6 bg-white/50 rounded-xl">
              <p className="text-sm text-blue-600/70">No goals set for this period. Click "Set Goals" to start tracking.</p>
            </div>
          )}

          {hasGoal && !editing && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Revenue', current: current.total_revenue, target: goal.revenue_goal, prefix: '$' },
                { label: 'Deals', current: current.closed_deals, target: goal.deals_goal },
                { label: 'Commission', current: current.total_commission, target: goal.commission_goal, prefix: '$' },
              ].map(m => (
                <div key={m.label} className="bg-white/70 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">{m.label}</p>
                  <p className="text-sm font-mono font-bold text-gray-900">
                    {m.prefix || ''}{typeof m.current === 'number' ? m.current.toLocaleString('en-US', {maximumFractionDigits: 0}) : m.current}
                  </p>
                  <p className="text-[10px] text-gray-400">of {m.prefix || ''}{m.target.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Period Comparison */}
      <div className="rounded-2xl border-l-4 overflow-hidden" style={{ backgroundColor: '#F5F3FF', borderLeftColor: '#8B5CF6' }}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-sm">
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-violet-900" data-testid="comparison-title">Period Comparison</h2>
              <p className="text-xs text-violet-600/70">
                {previous ? `${current.period_name} vs ${previous.period_name}` : 'No previous period to compare'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Revenue', key: 'total_revenue', prefix: '$', icon: DollarSign },
              { label: 'Commission', key: 'total_commission', prefix: '$', icon: DollarSign },
              { label: 'Deals', key: 'closed_deals', icon: Target },
              { label: 'Leads', key: 'total_leads', icon: Target },
              { label: 'R%', key: 'closing_rate', suffix: '%', icon: TrendingUp },
              { label: 'Avg Ticket', key: 'avg_ticket', prefix: '$', icon: DollarSign },
            ].map(m => (
              <Card key={m.key} className="bg-white border border-violet-100 shadow-sm rounded-xl">
                <CardContent className="p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-violet-500 mb-1">{m.label}</p>
                  <p className="text-lg font-mono font-bold text-gray-900">
                    {m.prefix || ''}{typeof current[m.key] === 'number' ? current[m.key].toLocaleString('en-US', {maximumFractionDigits: m.suffix ? 1 : 0}) : current[m.key]}{m.suffix || ''}
                  </p>
                  {previous && (
                    <div className="mt-1">
                      <DeltaBadge current={current[m.key]} previous={previous[m.key]} prefix={m.prefix} suffix={m.suffix} />
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        Prev: {m.prefix || ''}{typeof previous[m.key] === 'number' ? previous[m.key].toLocaleString('en-US', {maximumFractionDigits: m.suffix ? 1 : 0}) : previous[m.key]}{m.suffix || ''}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
