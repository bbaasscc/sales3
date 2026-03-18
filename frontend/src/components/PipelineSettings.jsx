import { useState, useEffect } from "react";
import axios from "axios";
import { X, Save, Mail, MessageSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API, PIPELINE_STEPS } from "@/lib/constants";

export default function PipelineSettings({ open, onClose, authHeaders }) {
  const [templates, setTemplates] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    axios.get(`${API}/pipeline/templates`, { headers: authHeaders })
      .then(r => setTemplates(r.data.templates || {}))
      .catch(() => {});
  }, [open, authHeaders]);

  const getValue = (actionId, field) => {
    if (templates[actionId]?.[field] !== undefined) return templates[actionId][field];
    for (const step of PIPELINE_STEPS) {
      const action = step.actions.find(a => a.id === actionId);
      if (action) return action[field] || '';
    }
    return '';
  };

  const setValue = (actionId, field, value) => {
    setTemplates(prev => ({
      ...prev,
      [actionId]: { ...(prev[actionId] || {}), [field]: value }
    }));
  };

  const resetAction = (actionId) => {
    setTemplates(prev => {
      const next = { ...prev };
      delete next[actionId];
      return next;
    });
    toast.success("Reset to default");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/pipeline/templates`, { templates }, { headers: authHeaders });
      toast.success("Templates saved");
      onClose();
    } catch { toast.error("Error saving"); }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4 anim-backdrop">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden anim-modal">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-800 to-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white">
          <div>
            <h3 className="text-base font-bold">Customize Pipeline Templates</h3>
            <p className="text-xs text-white/70">Edit your email & SMS templates</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs">
              <Save className="w-3.5 h-3.5 mr-1" />{saving ? 'Saving...' : 'Save'}
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4 space-y-4">
          {PIPELINE_STEPS.map(step => (
            <div key={step.day} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-[10px] font-bold">{step.day}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{step.label}</p>
                  <p className="text-[10px] text-gray-500">{step.subtitle}</p>
                </div>
              </div>

              {step.actions.map(action => (
                <div key={action.id} className="p-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {action.type === 'email'
                        ? <Mail className="w-4 h-4 text-blue-500" />
                        : <MessageSquare className="w-4 h-4 text-green-500" />}
                      <span className="text-sm font-bold text-gray-700">{action.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${action.type === 'email' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {action.type.toUpperCase()}
                      </span>
                    </div>
                    <button onClick={() => resetAction(action.id)}
                      className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                      title="Reset to default">
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>

                  {action.type === 'email' ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Subject</label>
                        <input value={getValue(action.id, 'subject')}
                          onChange={e => setValue(action.id, 'subject', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border rounded-lg" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Body <span className="text-gray-400 normal-case">(use [NAME] for client name)</span></label>
                        <textarea value={getValue(action.id, 'body')}
                          onChange={e => setValue(action.id, 'body', e.target.value)}
                          rows={5} className="w-full px-3 py-1.5 text-sm border rounded-lg resize-none font-mono" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500">Message <span className="text-gray-400 normal-case">(use [NAME] for client name)</span></label>
                      <textarea value={getValue(action.id, 'text')}
                        onChange={e => setValue(action.id, 'text', e.target.value)}
                        rows={3} className="w-full px-3 py-1.5 text-sm border rounded-lg resize-none font-mono" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
