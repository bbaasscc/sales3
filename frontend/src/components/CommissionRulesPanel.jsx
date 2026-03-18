import { useState, useEffect } from "react";
import axios from "axios";
import { Save, Plus, Trash2, DollarSign, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CommissionRulesPanel({ token }) {
  const [rules, setRules] = useState(null);
  const [saving, setSaving] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/commission/rules`, { headers }).then(r => setRules(r.data.rules)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/commission/rules`, { rules }, { headers });
      toast.success("Commission rules saved");
    } catch { toast.error("Error saving"); }
    setSaving(false);
  };

  const updateTier = (idx, field, value) => {
    setRules(prev => ({
      ...prev,
      tiers: prev.tiers.map((t, i) => i === idx ? { ...t, [field]: field === 'percent' ? parseFloat(value) || 0 : value } : t)
    }));
  };

  const addTier = () => {
    setRules(prev => ({
      ...prev,
      tiers: [...prev.tiers, { id: `custom_${Date.now()}`, label: 'New Tier', condition: '', percent: 0 }]
    }));
  };

  const removeTier = (idx) => {
    setRules(prev => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== idx) }));
  };

  const updateSpiff = (idx, field, value) => {
    setRules(prev => ({
      ...prev,
      spiffs: prev.spiffs.map((s, i) => i === idx ? { ...s, [field]: value } : s)
    }));
  };

  const updateSpiffOption = (spiffIdx, optIdx, field, value) => {
    setRules(prev => ({
      ...prev,
      spiffs: prev.spiffs.map((s, si) => si === spiffIdx ? {
        ...s,
        options: (s.options || []).map((o, oi) => oi === optIdx ? {
          ...o, [field]: ['value', 'price', 'pct_of_total'].includes(field) ? parseFloat(value) || 0 : value
        } : o)
      } : s)
    }));
  };

  const addSpiffOption = (spiffIdx) => {
    setRules(prev => ({
      ...prev,
      spiffs: prev.spiffs.map((s, i) => i === spiffIdx ? {
        ...s, options: [...(s.options || []), { label: 'New Option', price: 0, value: 0, pct_of_total: 0 }]
      } : s)
    }));
  };

  const removeSpiffOption = (spiffIdx, optIdx) => {
    setRules(prev => ({
      ...prev,
      spiffs: prev.spiffs.map((s, i) => i === spiffIdx ? {
        ...s, options: (s.options || []).filter((_, j) => j !== optIdx)
      } : s)
    }));
  };

  if (!rules) return <div className="text-center py-8 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-800">Commission Rules</h2>
            <p className="text-xs text-gray-500">These rules apply to all salespeople</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Rules'}
        </Button>
      </div>

      {/* Commission Tiers */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-700">Commission Tiers</h3>
          </div>
          <button onClick={addTier} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
            <Plus className="w-3 h-3" /> Add Tier
          </button>
        </div>
        <div className="p-4 space-y-2">
          {rules.tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <input value={tier.label} onChange={e => updateTier(i, 'label', e.target.value)}
                className="px-2 py-1 text-sm font-bold border rounded w-32" />
              <input value={tier.condition} onChange={e => updateTier(i, 'condition', e.target.value)}
                className="px-2 py-1 text-sm border rounded flex-1" placeholder="Condition description" />
              <div className="flex items-center gap-1">
                <input type="number" step="0.1" value={tier.percent} onChange={e => updateTier(i, 'percent', e.target.value)}
                  className="px-2 py-1 text-sm font-mono font-bold border rounded w-16 text-center" />
                <span className="text-sm font-bold text-gray-500">%</span>
              </div>
              <button onClick={() => removeTier(i)} className="p-1 text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SPIFFs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-gray-700">SPIFF Rules</h3>
        </div>
        <div className="p-4 space-y-4">
          {rules.spiffs.map((spiff, si) => (
            <div key={si} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <input value={spiff.label} onChange={e => updateSpiff(si, 'label', e.target.value)}
                  className="text-sm font-bold text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1" />
                {spiff.type === 'pct_of_product' && (
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.1" value={spiff.percent || 0}
                      onChange={e => updateSpiff(si, 'percent', parseFloat(e.target.value) || 0)}
                      className="px-2 py-0.5 text-xs font-mono border rounded w-14 text-center" />
                    <span className="text-[10px] text-gray-500">% of product</span>
                  </div>
                )}
              </div>
              {spiff.description && <p className="text-[10px] text-gray-400 mb-2">{spiff.description}</p>}
              {spiff.options && (
                <div className="space-y-1">
                  {spiff.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded text-xs">
                      <input value={opt.label} onChange={e => updateSpiffOption(si, oi, 'label', e.target.value)}
                        className="px-1.5 py-0.5 border rounded flex-1 text-xs" />
                      {opt.price !== undefined && (
                        <div className="flex items-center gap-0.5">
                          <span className="text-gray-400">$</span>
                          <input type="number" value={opt.price} onChange={e => updateSpiffOption(si, oi, 'price', e.target.value)}
                            className="px-1 py-0.5 border rounded w-14 text-xs font-mono text-center" />
                        </div>
                      )}
                      <div className="flex items-center gap-0.5">
                        <span className="text-gray-400">+$</span>
                        <input type="number" value={opt.value} onChange={e => updateSpiffOption(si, oi, 'value', e.target.value)}
                          className="px-1 py-0.5 border rounded w-14 text-xs font-mono text-center" />
                      </div>
                      {opt.pct_of_total !== undefined && opt.pct_of_total > 0 && (
                        <span className="text-[10px] text-amber-600 font-bold">+{opt.pct_of_total}%</span>
                      )}
                      <button onClick={() => removeSpiffOption(si, oi)} className="p-0.5 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addSpiffOption(si)}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-700 px-2 py-1">
                    + Add Option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
