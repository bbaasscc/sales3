import { useState, useEffect } from "react";
import axios from "axios";
import { X, Save, Mail, MessageSquare, RotateCcw, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API, PIPELINE_STEPS } from "@/lib/constants";

export default function PipelineSettings({ open, onClose, authHeaders }) {
  const [steps, setSteps] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    axios.get(`${API}/pipeline/templates`, { headers: authHeaders })
      .then(r => {
        const saved = r.data.custom_steps;
        if (saved && saved.length > 0) {
          setSteps(saved);
        } else {
          // Init from defaults
          setSteps(PIPELINE_STEPS.map(s => ({
            day: s.day, label: s.label, subtitle: s.subtitle,
            actions: s.actions.map(a => ({
              id: a.id, type: a.type, name: a.name,
              subject: a.subject || '', body: a.body || '', text: a.text || '',
              ...(r.data.templates?.[a.id] || {}),
            })),
          })));
        }
      })
      .catch(() => setSteps(PIPELINE_STEPS.map(s => ({
        day: s.day, label: s.label, subtitle: s.subtitle,
        actions: s.actions.map(a => ({ id: a.id, type: a.type, name: a.name, subject: a.subject || '', body: a.body || '', text: a.text || '' })),
      }))));
  }, [open, authHeaders]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build templates map for backward compat
      const templates = {};
      steps.forEach(s => s.actions.forEach(a => { templates[a.id] = { subject: a.subject, body: a.body, text: a.text }; }));
      await axios.put(`${API}/pipeline/templates`, { templates, custom_steps: steps }, { headers: authHeaders });
      toast.success("Pipeline saved");
      onClose();
    } catch { toast.error("Error saving"); }
    setSaving(false);
  };

  const addStep = () => {
    const maxDay = Math.max(0, ...steps.map(s => s.day));
    const newDay = maxDay + 2;
    setSteps(prev => [...prev, {
      day: newDay, label: `Day ${newDay}`, subtitle: 'New step',
      actions: [{ id: `custom_d${newDay}_sms_${Date.now()}`, type: 'sms', name: 'New Message', subject: '', body: '', text: 'Hi [NAME], ' }],
    }]);
  };

  const removeStep = (idx) => {
    if (steps.length <= 1) { toast.error("Need at least one step"); return; }
    setSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const updateStep = (idx, field, value) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: field === 'day' ? parseInt(value) || 0 : value } : s));
  };

  const addAction = (stepIdx, type) => {
    setSteps(prev => prev.map((s, i) => i === stepIdx ? {
      ...s, actions: [...s.actions, {
        id: `custom_${type}_${Date.now()}`, type, name: type === 'email' ? 'New Email' : 'New Message',
        subject: type === 'email' ? 'Follow Up' : '', body: type === 'email' ? 'Hi [NAME],\n\n' : '', text: type === 'sms' ? 'Hi [NAME], ' : '',
      }]
    } : s));
  };

  const removeAction = (stepIdx, actionIdx) => {
    setSteps(prev => prev.map((s, i) => i === stepIdx ? {
      ...s, actions: s.actions.filter((_, j) => j !== actionIdx)
    } : s));
  };

  const updateAction = (stepIdx, actionIdx, field, value) => {
    setSteps(prev => prev.map((s, i) => i === stepIdx ? {
      ...s, actions: s.actions.map((a, j) => j === actionIdx ? { ...a, [field]: value } : a)
    } : s));
  };

  const resetAll = () => {
    setSteps(PIPELINE_STEPS.map(s => ({
      day: s.day, label: s.label, subtitle: s.subtitle,
      actions: s.actions.map(a => ({ id: a.id, type: a.type, name: a.name, subject: a.subject || '', body: a.body || '', text: a.text || '' })),
    })));
    toast.success("Reset to defaults");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4 anim-backdrop">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden anim-modal">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-gray-800 to-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white">
          <div>
            <h3 className="text-base font-bold">Customize Pipeline</h3>
            <p className="text-xs text-white/70">Edit steps, add/remove actions</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="text-[10px] text-white/60 hover:text-white flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Reset All
            </button>
            <Button onClick={handleSave} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs">
              <Save className="w-3.5 h-3.5 mr-1" />{saving ? 'Saving...' : 'Save'}
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4 space-y-4">
          {steps.sort((a, b) => a.day - b.day).map((step, si) => (
            <div key={si} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] font-bold text-gray-500">Day</span>
                  <input type="number" value={step.day} onChange={e => updateStep(si, 'day', e.target.value)}
                    className="w-12 px-1.5 py-0.5 text-xs font-bold border rounded text-center" min="0" />
                  <input value={step.label} onChange={e => updateStep(si, 'label', e.target.value)}
                    className="px-2 py-0.5 text-xs font-bold border rounded flex-1" placeholder="Label" />
                  <input value={step.subtitle} onChange={e => updateStep(si, 'subtitle', e.target.value)}
                    className="px-2 py-0.5 text-[10px] border rounded flex-1 text-gray-500" placeholder="Subtitle" />
                </div>
                <button onClick={() => removeStep(si)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remove step">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {step.actions.map((action, ai) => (
                <div key={ai} className="p-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {action.type === 'email' ? <Mail className="w-4 h-4 text-blue-500" /> : <MessageSquare className="w-4 h-4 text-green-500" />}
                      <input value={action.name} onChange={e => updateAction(si, ai, 'name', e.target.value)}
                        className="text-sm font-bold text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1" />
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${action.type === 'email' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {action.type.toUpperCase()}
                      </span>
                    </div>
                    <button onClick={() => removeAction(si, ai)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remove action">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {action.type === 'email' ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Subject</label>
                        <input value={action.subject} onChange={e => updateAction(si, ai, 'subject', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border rounded-lg" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Body <span className="text-gray-400 normal-case">(use [NAME] for client name)</span></label>
                        <textarea value={action.body} onChange={e => updateAction(si, ai, 'body', e.target.value)}
                          rows={4} className="w-full px-3 py-1.5 text-sm border rounded-lg resize-none font-mono" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500">Message <span className="text-gray-400 normal-case">(use [NAME] for client name)</span></label>
                      <textarea value={action.text} onChange={e => updateAction(si, ai, 'text', e.target.value)}
                        rows={3} className="w-full px-3 py-1.5 text-sm border rounded-lg resize-none font-mono" />
                    </div>
                  )}
                </div>
              ))}

              {/* Add action buttons */}
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex gap-2">
                <button onClick={() => addAction(si, 'email')} className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                  <Plus className="w-3 h-3" /><Mail className="w-3 h-3" /> Email
                </button>
                <button onClick={() => addAction(si, 'sms')} className="flex items-center gap-1 px-3 py-1 text-[10px] font-bold bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                  <Plus className="w-3 h-3" /><MessageSquare className="w-3 h-3" /> SMS
                </button>
              </div>
            </div>
          ))}

          {/* Add step */}
          <button onClick={addStep}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add New Day/Step
          </button>
        </div>
      </div>
    </div>
  );
}
