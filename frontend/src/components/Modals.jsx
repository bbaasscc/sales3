import { Button } from "@/components/ui/button";
import {
  X, Mail, MessageSquare, Check, MapPin, FileText, AlertTriangle, User,
  Settings, Save, Plus, Trash2, ClipboardPaste, Copy, Send,
} from "lucide-react";
import { BRAND_COLORS, PIPELINE_STEPS, ALL_PIPELINE_ACTIONS, STATUS_OPTIONS, STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";

export function PipelineModal({
  actionMenu, setActionMenu, pipelineSchedule, setPipelineSchedule,
  isStepDone, toggleStep, handleSendEmail, handleCopySMS,
  savePipelineSchedule, getPipelineProgress,
}) {
  if (!actionMenu) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}>
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto pb-16" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-500 px-4 sm:px-6 py-3 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white z-10">
          <div>
            <h3 className="text-base font-bold">Closing Flow</h3>
            <p className="text-xs text-white/80">{actionMenu.client.name} &mdash; {getPipelineProgress(actionMenu.client.name).done}/{ALL_PIPELINE_ACTIONS.length} steps</p>
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
  );
}

export function NewLeadModal({
  newLeadOpen, setNewLeadOpen, newLeadStep, setNewLeadStep,
  newLeadText, setNewLeadText, newLeadForm, setNewLeadForm,
  handleParseEmail, handleCreateLead,
}) {
  if (!newLeadOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto pb-16" onClick={(e) => e.stopPropagation()}>
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
  );
}

export function DeleteConfirmModal({ deleteConfirm, setDeleteConfirm, handleDeleteLead }) {
  if (!deleteConfirm) return null;
  return (
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
  );
}

export function ClientDetailModal({
  selectedClient, setSelectedClient, clientNote, setClientNote,
  noteSaving, saveClientNote, setDeleteConfirm,
  isStepDone, getPipelineProgress,
}) {
  if (!selectedClient) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto pb-16" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{selectedClient.name}</h3>
            <div className="flex items-center gap-2">
              {selectedClient.customer_number && <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">#{selectedClient.customer_number}</span>}
              <p className="text-sm text-gray-500">Client Details</p>
            </div>
          </div>
          <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors" data-testid="close-client-modal">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="px-4 sm:px-6 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              selectedClient.status === 'SALE' ? 'bg-green-100 text-green-800' :
              selectedClient.status === 'LOST' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
            }`}>{selectedClient.status}</span>
            {selectedClient.is_urgent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3" /> URGENT
              </span>
            )}
          </div>

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

          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Last Visit Date</span>
              <span className="text-sm font-mono font-medium text-gray-900">{selectedClient.visit_date || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Last Follow-up</span>
              <span className="text-sm font-mono font-medium text-gray-900">{selectedClient.follow_up_date || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-semibold">Next Follow-up</span>
              <span className="text-sm font-mono font-bold" style={{ color: BRAND_COLORS.primary }}>{clientNote.next_follow_up || 'Not set'}</span>
            </div>
          </div>

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

          {selectedClient.feeling && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Feeling</p>
                <p className="text-sm text-gray-900">{selectedClient.feeling}</p>
              </div>
            </div>
          )}

          {selectedClient.objections && (
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Objections</p>
                <p className="text-sm text-gray-900">{selectedClient.objections}</p>
              </div>
            </div>
          )}

          {selectedClient.comments && (
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Comments</p>
                <p className="text-sm text-gray-700">{selectedClient.comments}</p>
              </div>
            </div>
          )}

          {/* PIPELINE STATUS */}
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
                      <span className="text-xs text-gray-700">Day {PIPELINE_STEPS.find(s => s.actions.includes(a))?.day} &mdash; {a.name}</span>
                    </div>
                  )))}
                </div>
              </div>
            ) : null;
          })()}

          {/* PRIORITY + NEXT FOLLOW-UP */}
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

          {/* SALESPERSON NOTES */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-bold">My Notes</p>
            <textarea value={clientNote.comment}
              onChange={(e) => setClientNote(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Add a note about this client..." rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              data-testid="client-note-input" />
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-3 flex gap-2">
          <Button onClick={saveClientNote} disabled={noteSaving} className="flex-1" style={{ backgroundColor: '#2563EB' }} data-testid="save-notes-btn">
            {noteSaving ? 'Saving...' : 'Save Notes'}
          </Button>
          {selectedClient.lead_id && (
            <Button onClick={() => setDeleteConfirm(selectedClient)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={() => setSelectedClient(null)} variant="outline" className="flex-1">Close</Button>
        </div>
      </div>
    </div>
  );
}

export function SaleDetailModal({ selectedSale, setSelectedSale }) {
  if (!selectedSale) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSale(null)}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto pb-16" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-green-600 text-white px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold">{selectedSale.name}</h3>
            <div className="flex items-center gap-2">
              {selectedSale.customer_number && <span className="text-xs font-mono bg-white/20 px-1.5 py-0.5 rounded">#{selectedSale.customer_number}</span>}
              <p className="text-sm text-white/80">Sale Details</p>
            </div>
          </div>
          <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors" data-testid="close-sale-modal">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="px-4 sm:px-6 py-4 space-y-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Sale Value</p>
            <p className="text-3xl font-bold text-green-700">${selectedSale.ticket_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>

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

          {selectedSale.city && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                <p className="text-sm text-gray-900">{selectedSale.address ? `${selectedSale.address}, ` : ''}{selectedSale.city}</p>
              </div>
            </div>
          )}

          {selectedSale.unit_type && (
            <div className="flex items-start gap-3">
              <Settings className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Equipment Installed</p>
                <p className="text-sm text-gray-900">{selectedSale.unit_type}</p>
              </div>
            </div>
          )}

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

          {selectedSale.email && (
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                <a href={`mailto:${selectedSale.email}`} className="text-sm text-blue-600 hover:underline">{selectedSale.email}</a>
              </div>
            </div>
          )}

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
        
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-3">
          <Button onClick={() => setSelectedSale(null)} className="w-full bg-green-600 hover:bg-green-700">Close</Button>
        </div>
      </div>
    </div>
  );
}

export function InstallationsModal({ installationsOpen, setInstallationsOpen, kpiData }) {
  if (!installationsOpen || !kpiData) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setInstallationsOpen(false)}>
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto pb-16" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white z-10">
          <div>
            <h3 className="text-base font-bold">Installations This Period</h3>
            <p className="text-xs text-white/80">{kpiData.commission_payment_count} installations</p>
          </div>
          <button onClick={() => setInstallationsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3 sm:p-4">
          {kpiData.records?.length > 0 ? kpiData.records.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-emerald-700">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800 truncate">{r.name}</p>
                  {r.customer_number && <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">#{r.customer_number}</span>}
                </div>
                <p className="text-xs text-gray-500">{r.city} — {r.unit_type}</p>
                {r.install_date && <p className="text-[10px] font-mono text-gray-400">Installed: {r.install_date}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-mono font-bold text-gray-800">${r.ticket_value.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                <p className="text-xs font-mono text-emerald-600">${r.commission_value.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
              </div>
            </div>
          )) : <p className="text-center text-gray-400 py-4">No installations in this period</p>}
          {kpiData.records?.length > 0 && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-emerald-700">Total Revenue</span>
                <span className="font-mono text-emerald-800">${kpiData.commission_payment_revenue?.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-emerald-700">Total Commission</span>
                <span className="font-mono text-emerald-600">${kpiData.commission_payment_amount?.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EditLeadModal({ editingLead, setEditingLead, handleSaveEditLead, setDeleteConfirm }) {
  if (!editingLead) return null;
  const spiffSum = (editingLead.apco_x || 0) + (editingLead.samsung || 0) + (editingLead.mitsubishi || 0) + (editingLead.surge_protector || 0) + (editingLead.duct_cleaning || 0) + (editingLead.self_gen_mits || 0);
  const baseComm = (editingLead.ticket_value || 0) * (editingLead.commission_percent || 0) / 100;
  const totalComm = baseComm + spiffSum;
  const handleClose = () => {
    if (window.confirm("Close without saving? Unsaved changes will be lost.")) setEditingLead(null);
  };
  const handleNumFocus = (e) => e.target.select();
  const sameDaySale = () => {
    if (editingLead.visit_date) setEditingLead(p => ({...p, close_date: p.visit_date}));
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onMouseDown={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto pb-16" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-gray-800 to-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white z-10">
          <div><h3 className="text-base font-bold">Edit Lead</h3><p className="text-xs text-white/80">{editingLead.name} {editingLead.customer_number && <span className="font-mono bg-white/20 px-1 rounded">#{editingLead.customer_number}</span>}</p></div>
          <button onClick={handleClose} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[['customer_number','Client #'],['name','Name'],['address','Address'],['city','City'],['email','Email'],['phone','Phone'],['unit_type','Unit Type']].map(([k,l]) => (
              <div key={k} className={k === 'address' ? 'col-span-2' : ''}>
                <label className="text-[10px] font-bold uppercase text-gray-500">{l}</label>
                <input value={editingLead[k] || ''} onChange={(e) => setEditingLead(p => ({...p, [k]: e.target.value}))}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg" />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Status</label>
              <select value={editingLead.status || 'PENDING'} onChange={(e) => setEditingLead(p => ({...p, status: e.target.value}))}
                className="w-full px-2 py-1.5 text-sm border rounded-lg">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Ticket Value</label>
              <input type="number" step="0.01" value={editingLead.ticket_value ?? ''} onFocus={handleNumFocus}
                onChange={(e) => setEditingLead(p => ({...p, ticket_value: e.target.value === '' ? 0 : parseFloat(e.target.value)}))}
                className="w-full px-2 py-1.5 text-sm border rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Commission %</label>
              <input type="number" step="0.01" value={editingLead.commission_percent ?? ''} onFocus={handleNumFocus}
                onChange={(e) => setEditingLead(p => ({...p, commission_percent: e.target.value === '' ? 0 : parseFloat(e.target.value)}))}
                className="w-full px-2 py-1.5 text-sm border rounded-lg" />
            </div>
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
              <div key={k}>
                <label className="text-[10px] font-bold uppercase text-gray-500">{l}</label>
                <div className="flex gap-1 items-center">
                  <input type="date" value={editingLead[k] || ''} onChange={(e) => setEditingLead(p => ({...p, [k]: e.target.value}))}
                    className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                  {k === 'close_date' && (
                    <button type="button" onClick={sameDaySale} title="Same Day Sale" className="px-2 py-1.5 text-[9px] font-bold bg-green-100 text-green-700 border border-green-300 rounded-lg hover:bg-green-200 whitespace-nowrap">
                      Same Day
                    </button>
                  )}
                  {k === 'install_date' && (
                    <button type="button" onClick={() => setEditingLead(p => ({...p, install_date: 'PENDING'}))} title="Mark as Pending" className="px-2 py-1.5 text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-200 whitespace-nowrap">
                      Pending
                    </button>
                  )}
                </div>
                {k === 'install_date' && editingLead.install_date === 'PENDING' && (
                  <p className="text-[9px] text-amber-600 mt-0.5 font-semibold">Install date pending — remember to update when scheduled</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold uppercase text-gray-400 pt-2">SPIFF Details</p>
          <div className="grid grid-cols-3 gap-2">
            {[['apco_x','APCO X'],['samsung','Samsung'],['mitsubishi','Mitsubishi'],['surge_protector','Surge Prot.'],['duct_cleaning','Duct Clean.'],['self_gen_mits','Self Gen Mits']].map(([k,l]) => (
              <div key={k}><label className="text-[10px] font-bold uppercase text-gray-400">{l}</label>
                <input type="number" step="0.01" value={editingLead[k] ?? ''} onFocus={handleNumFocus}
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
            <Button onClick={handleClose} variant="outline">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
