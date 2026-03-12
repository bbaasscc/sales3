import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2, ShoppingCart, Package } from "lucide-react";
import { MANUFACTURER_OPTIONS, ACCESSORY_OPTIONS, BRAND_COLORS } from "@/lib/constants";

export default function SaleConversionModal({ lead, onSave, onCancel }) {
  const [products, setProducts] = useState(
    lead?.products?.length > 0 ? lead.products : [{ manufacturer: "", manufacturer_other: "", model: "" }]
  );
  const [accessories, setAccessories] = useState(
    lead?.sale_accessories?.length > 0 ? lead.sale_accessories : []
  );
  const [ticketValue, setTicketValue] = useState(lead?.ticket_value || 0);
  const [commissionPercent, setCommissionPercent] = useState(lead?.commission_percent || 0);

  const addProduct = () => setProducts(p => [...p, { manufacturer: "", manufacturer_other: "", model: "" }]);
  const removeProduct = (i) => setProducts(p => p.filter((_, idx) => idx !== i));
  const updateProduct = (i, field, val) => setProducts(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const addAccessory = () => setAccessories(a => [...a, { name: "", name_other: "", details: "" }]);
  const removeAccessory = (i) => setAccessories(a => a.filter((_, idx) => idx !== i));
  const updateAccessory = (i, field, val) => setAccessories(a => a.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSave = () => {
    const cleanProducts = products.filter(p => p.manufacturer || p.model).map(p => ({
      manufacturer: p.manufacturer === "Other" ? p.manufacturer_other : p.manufacturer,
      model: p.model,
    }));
    const cleanAccessories = accessories.filter(a => a.name).map(a => ({
      name: a.name === "Other" ? a.name_other : a.name,
      details: a.details,
    }));
    onSave({
      products: cleanProducts,
      sale_accessories: cleanAccessories,
      ticket_value: ticketValue,
      commission_percent: commissionPercent,
    });
  };

  const handleFocus = (e) => e.target.select();

  const spiffSum = (lead?.apco_x || 0) + (lead?.samsung || 0) + (lead?.mitsubishi || 0) + (lead?.surge_protector || 0) + (lead?.duct_cleaning || 0) + (lead?.self_gen_mits || 0);
  const baseComm = ticketValue * commissionPercent / 100;
  const totalComm = baseComm + spiffSum;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto pb-16" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
          <div>
            <h3 className="text-base font-bold">Convert to Sale</h3>
            <p className="text-xs text-white/80">{lead?.name}</p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-5">
          {/* PRODUCTS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Products Sold</p>
              </div>
              <button onClick={addProduct} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                <Plus className="w-3 h-3" /> Add Product
              </button>
            </div>
            <div className="space-y-2">
              {products.map((p, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400">Product {i + 1}</span>
                    {products.length > 1 && (
                      <button onClick={() => removeProduct(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500">Manufacturer</label>
                      <select value={p.manufacturer} onChange={e => updateProduct(i, 'manufacturer', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded-lg">
                        <option value="">Select...</option>
                        {MANUFACTURER_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    {p.manufacturer === "Other" ? (
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Brand Name</label>
                        <input value={p.manufacturer_other || ''} onChange={e => updateProduct(i, 'manufacturer_other', e.target.value)}
                          placeholder="Type brand..." className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                      </div>
                    ) : <div />}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500">Model / Description</label>
                    <input value={p.model || ''} onChange={e => updateProduct(i, 'model', e.target.value)}
                      placeholder="e.g. EL 28070000E" className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACCESSORIES */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Accessories</p>
              </div>
              <button onClick={addAccessory} className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100">
                <Plus className="w-3 h-3" /> Add Accessory
              </button>
            </div>
            {accessories.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No accessories — click "Add Accessory" to add</p>
            ) : (
              <div className="space-y-2">
                {accessories.map((a, i) => (
                  <div key={i} className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400">Accessory {i + 1}</span>
                      <button onClick={() => removeAccessory(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Type</label>
                        <select value={a.name} onChange={e => updateAccessory(i, 'name', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded-lg">
                          <option value="">Select...</option>
                          {ACCESSORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                      {a.name === "Other" ? (
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-500">Name</label>
                          <input value={a.name_other || ''} onChange={e => updateAccessory(i, 'name_other', e.target.value)}
                            placeholder="Type name..." className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                        </div>
                      ) : (
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-500">Details</label>
                          <input value={a.details || ''} onChange={e => updateAccessory(i, 'details', e.target.value)}
                            placeholder="Optional details" className="w-full px-2 py-1.5 text-sm border rounded-lg" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FINANCIALS */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">Financial Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Ticket Value</label>
                <input type="number" step="0.01" value={ticketValue} onFocus={handleFocus}
                  onChange={e => setTicketValue(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Commission %</label>
                <input type="number" step="0.01" value={commissionPercent} onFocus={handleFocus}
                  onChange={e => setCommissionPercent(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg" />
              </div>
            </div>
            <div className="mt-2 bg-green-50 rounded-lg p-2.5 border border-green-200">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Base ({commissionPercent}% of ${ticketValue.toLocaleString()})</span>
                <span className="font-mono font-semibold">${baseComm.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              {spiffSum > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">+ SPIFFs</span>
                  <span className="font-mono font-semibold text-amber-600">${spiffSum.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-green-300 mt-1 pt-1">
                <span className="text-green-700">Total Commission</span>
                <span className="font-mono text-green-700">${totalComm.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1 text-white" style={{ backgroundColor: '#059669' }}>
              Confirm Sale
            </Button>
            <Button onClick={onCancel} variant="outline">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
