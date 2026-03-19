import { Button } from "@/components/ui/button";
import { X, Plus, Trash2 } from "lucide-react";
import { STATUS_OPTIONS, STATUS_LABELS, UNIT_TYPE_OPTIONS, isGeneratorLead } from "@/lib/constants";

export function EditLeadModal({ editingLead, setEditingLead, handleSaveEditLead, setDeleteConfirm, originalLead }) {
  if (!editingLead) return null;
  const isGen = isGeneratorLead(editingLead);
  const spiffSum = isGen ? 0 : (editingLead.apco_x || 0) + (editingLead.samsung || 0) + (editingLead.mitsubishi || 0) + (editingLead.surge_protector || 0) + (editingLead.duct_cleaning || 0) + (editingLead.self_gen_mits || 0);
  const baseComm = (editingLead.ticket_value || 0) * (editingLead.commission_percent || 0) / 100;
  const totalComm = baseComm + spiffSum;

  const hasChanges = () => {
    if (!originalLead) return true;
    const fields = ['name','address','city','email','phone','unit_type','status','ticket_value','commission_percent',
      'visit_date','close_date','install_date','follow_up_date','comments','customer_number',
      'apco_x','samsung','mitsubishi','surge_protector','duct_cleaning','self_gen_mits'];
    return fields.some(f => String(editingLead[f] || '') !== String(originalLead[f] || ''))
      || JSON.stringify(editingLead.additional_phones || []) !== JSON.stringify(originalLead.additional_phones || [])
      || Boolean(editingLead.also_generator) !== Boolean(originalLead.also_generator);
  };

  const handleClose = () => {
    if (hasChanges()) {
      if (window.confirm("Close without saving? Unsaved changes will be lost.")) setEditingLead(null);
    } else {
      setEditingLead(null);
    }
  };
  const handleNumFocus = (e) => e.target.select();
  const sameDaySale = () => { if (editingLead.visit_date) setEditingLead(p => ({...p, close_date: p.visit_date})); };
  const todayClose = () => { setEditingLead(p => ({...p, close_date: new Date().toISOString().split('T')[0]})); };
  const handleVisitDateChange = (newDate) => {
    if (editingLead.visit_date && editingLead.visit_date !== newDate) {
      if (!window.confirm(`Are you sure you want to change the visit date from ${editingLead.visit_date} to ${newDate}?`)) return;
    }
    setEditingLead(p => ({...p, visit_date: newDate}));
  };
  const isSold = editingLead.status === 'SALE' || editingLead.status === 'CREDIT_REJECT';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 anim-backdrop" onMouseDown={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto pb-16 anim-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className={`sticky top-0 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white z-10 ${isGen ? 'bg-gradient-to-r from-green-900 to-green-800' : 'bg-gradient-to-r from-gray-800 to-gray-700'}`}>
          <div>
            <h3 className="text-base font-bold">{isGen ? (isSold ? 'Generator Sale Details' : 'Generator Appointment') : (isSold ? 'Sale Details' : 'Appointment Info')}</h3>
            <p className="text-xs text-white/80">{editingLead.name} {editingLead.customer_number && <span className="font-mono bg-white/20 px-1 rounded">#{editingLead.customer_number}</span>}</p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          {/* CONTACT INFO */}
          <div className="grid grid-cols-2 gap-2">
            {[['customer_number','Client #'],['name','Name'],['address','Address'],['city','City'],['email','Email'],['phone','Phone']].map(([k,l]) => (
              <div key={k} className={k === 'address' ? 'col-span-2' : ''}>
                <label className="text-[10px] font-bold uppercase text-gray-500">{l}</label>
                <input value={editingLead[k] || ''} onChange={(e) => setEditingLead(p => ({...p, [k]: e.target.value}))}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg" />
              </div>
            ))}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Additional Phones</label>
                <button type="button" onClick={() => setEditingLead(p => ({...p, additional_phones: [...(p.additional_phones || []), {label: '', number: ''}]}))}
                  className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-bold hover:bg-blue-100 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {(editingLead.additional_phones || []).map((ph, idx) => (
                <div key={idx} className="flex gap-1.5 mb-1">
                  <input value={ph.label || ''} placeholder="Who (Wife, Work...)"
                    onChange={(e) => setEditingLead(p => { const phones = [...(p.additional_phones || [])]; phones[idx] = {...phones[idx], label: e.target.value}; return {...p, additional_phones: phones}; })}
                    className="w-1/3 px-2 py-1 text-xs border rounded-lg" />
                  <input value={ph.number || ''} placeholder="Phone number"
                    onChange={(e) => setEditingLead(p => { const phones = [...(p.additional_phones || [])]; phones[idx] = {...phones[idx], number: e.target.value}; return {...p, additional_phones: phones}; })}
                    className="flex-1 px-2 py-1 text-xs border rounded-lg" />
                  <button type="button" onClick={() => setEditingLead(p => ({...p, additional_phones: (p.additional_phones || []).filter((_, i) => i !== idx)}))}
                    className="text-red-400 hover:text-red-600 px-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* APPOINTMENT INFO */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Appointment Type</label>
              <select value={editingLead.unit_type || ''} onChange={(e) => setEditingLead(p => ({...p, unit_type: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded-lg">
                <option value="">Select...</option>
                {UNIT_TYPE_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Status</label>
              <select value={editingLead.status || 'PENDING'} onChange={(e) => setEditingLead(p => ({...p, status: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded-lg">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Visit Date</label>
              <input type="date" value={editingLead.visit_date || ''} onChange={(e) => handleVisitDateChange(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-lg" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Follow-up Date</label>
              <input type="date" value={editingLead.follow_up_date || ''} onChange={(e) => setEditingLead(p => ({...p, follow_up_date: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded-lg" />
            </div>
            {!isGen && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={editingLead.also_generator || false}
                    onChange={(e) => setEditingLead(p => ({...p, also_generator: e.target.checked}))}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-[10px] font-bold uppercase text-gray-500">Also includes Generator</span>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500">Comments</label>
            <textarea value={editingLead.comments || ''} onChange={(e) => setEditingLead(p => ({...p, comments: e.target.value}))}
              rows={2} className="w-full px-2 py-1.5 text-sm border rounded-lg resize-none" />
          </div>

          {/* SALE SUMMARY (read-only - data comes from SaleConversionModal) */}
          {isSold && (
            <div className="border-t border-gray-200 pt-3 mt-2">
              <p className="text-[10px] font-bold uppercase text-emerald-600 mb-2">Sale Summary</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-[9px] font-bold uppercase text-gray-400">Ticket</p>
                  <p className="text-sm font-mono font-bold text-gray-800">${(editingLead.ticket_value || 0).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-[9px] font-bold uppercase text-gray-400">Comm %</p>
                  <p className="text-sm font-mono font-bold text-blue-600">{editingLead.commission_percent || 0}%</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <p className="text-[9px] font-bold uppercase text-gray-400">Total Comm</p>
                  <p className="text-sm font-mono font-bold text-emerald-700">${(editingLead.commission_value || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Close Date</label>
                  <div className="flex gap-1 items-center">
                    <input type="date" value={editingLead.close_date || ''} onChange={(e) => setEditingLead(p => ({...p, close_date: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                    <button type="button" onClick={sameDaySale} title="Same Day" className="px-2 py-1.5 text-[9px] font-bold bg-green-100 text-green-700 border border-green-300 rounded-lg hover:bg-green-200 whitespace-nowrap">Same Day</button>
                    <button type="button" onClick={todayClose} title="Today" className="px-2 py-1.5 text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-200 whitespace-nowrap">Today</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Install Date</label>
                  <div className="flex gap-1 items-center">
                    {editingLead.install_date === 'PENDING' ? (
                      <input type="text" value="PENDING" readOnly className="w-full px-2 py-1.5 text-sm border rounded-lg bg-amber-50 text-amber-700 font-bold" />
                    ) : (
                      <input type="date" value={editingLead.install_date || ''} onChange={(e) => setEditingLead(p => ({...p, install_date: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                    )}
                    <button type="button" onClick={() => setEditingLead(p => ({...p, install_date: editingLead.install_date === 'PENDING' ? '' : 'PENDING'}))}
                      className={`px-2 py-1.5 text-[9px] font-bold border rounded-lg whitespace-nowrap ${editingLead.install_date === 'PENDING' ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>Pending</button>
                  </div>
                  {editingLead.install_date === 'PENDING' && <p className="text-[9px] text-amber-600 mt-0.5 font-semibold">Remember to book installer</p>}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSaveEditLead} className="flex-1" style={{ backgroundColor: '#2563EB' }}>Save Changes</Button>
            <Button onClick={() => setDeleteConfirm(editingLead)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
            <Button onClick={handleClose} variant="outline">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
