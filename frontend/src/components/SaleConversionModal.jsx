import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { X, DollarSign, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MANUFACTURER_OPTIONS, ACCESSORY_OPTIONS, GENERATOR_MANUFACTURER_OPTIONS, GENERATOR_ACCESSORY_OPTIONS, BRAND_COLORS, isGeneratorLead } from "@/lib/constants";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SaleConversionModal({ lead, onSave, onCancel, authHeaders }) {
  const isGen = isGeneratorLead(lead);
  const mfgOptions = isGen ? GENERATOR_MANUFACTURER_OPTIONS : MANUFACTURER_OPTIONS;
  const accOptions = isGen ? GENERATOR_ACCESSORY_OPTIONS : ACCESSORY_OPTIONS;

  const [rules, setRules] = useState(null);
  const [ticketValue, setTicketValue] = useState(lead?.ticket_value || 0);
  const [priceTier, setPriceTier] = useState(lead?.price_tier || 'at_book');
  const [products, setProducts] = useState(lead?.products?.length ? lead.products : [{ manufacturer: '', model: '' }]);
  const [accessories, setAccessories] = useState(lead?.sale_accessories || []);
  const [isSelfGen, setIsSelfGen] = useState(lead?.is_self_gen || false);
  const [promoCode, setPromoCode] = useState(lead?.promo_code || '');

  const [spiffSelections, setSpiffSelections] = useState({});
  const [customSpiffs, setCustomSpiffs] = useState(lead?.custom_spiffs || []);
  const [paidAccessory, setPaidAccessory] = useState(lead?.paid_accessory || false);

  // Pre-populate spiff selections from saved lead data
  useEffect(() => {
    if (!lead) return;
    const sel = {};
    if (lead.apco_x > 0) sel.apco_x = { selected: true, option_idx: 0 };
    if (lead.surge_protector > 0) {
      sel.surge_protector = { selected: true, selected_options: [] };
    }
    if (lead.duct_cleaning > 0) {
      sel.duct_cleaning = { selected: true, option_idx: lead.duct_cleaning >= 100 ? 0 : lead.duct_cleaning >= 75 ? 1 : 2 };
    }
    if (lead.self_gen_mits > 0) sel.self_gen_mits = { selected: true, product_value: lead.self_gen_mits_product_value || 0 };
    if (lead.self_gen_commission > 0 || lead.is_self_gen) sel.self_gen = { selected: true };
    if (lead.samsung > 0) sel.samsung = { selected: true, option_idx: 0 };
    setSpiffSelections(sel);
  }, [lead]);

  useEffect(() => {
    const h = authHeaders || {};
    axios.get(`${API}/commission/rules`, { headers: h })
      .then(r => setRules(r.data.rules))
      .catch(() => {});
  }, [authHeaders]);

  const setSpiff = (id, field, value) => {
    setSpiffSelections(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  // Calculate commission
  const calc = useMemo(() => {
    if (!rules) return { percent: 0, base: 0, spiffTotal: 0, total: 0, breakdown: [] };

    // Find commission percent from tier
    const tier = rules.tiers.find(t => t.id === priceTier);
    const commPercent = tier ? tier.percent : 7;
    const base = ticketValue * commPercent / 100;

    // Calculate SPIFFs (Under Book loses all SPIFFs except Samsung and Self Gen Mitsubishi)
    let spiffTotal = 0;
    const breakdown = [];
    const isUnderBook = priceTier === 'under_book';

    for (const spiff of (rules.spiffs || [])) {
      const sel = spiffSelections[spiff.id];
      if (!sel?.selected) continue;

      // Under book: only Samsung, Self Gen Mitsubishi and Self Gen SPIFFs survive
      if (isUnderBook && spiff.id !== 'samsung' && spiff.id !== 'self_gen_mits' && spiff.id !== 'self_gen') {
        breakdown.push({ label: spiff.label, amount: 0, detail: 'Lost (Under Book)', strikethrough: true });
        continue;
      }

      if (spiff.type === 'pct_of_total') {
        // Percentage of total sale value (e.g., Self Gen 3%)
        const amt = ticketValue * (spiff.percent || 0) / 100;
        spiffTotal += amt;
        breakdown.push({ label: spiff.label, amount: amt, detail: `${spiff.percent}% of $${ticketValue.toLocaleString()}` });
      } else if (spiff.type === 'pct_of_product') {
        const pv = sel.product_value || 0;
        const amt = pv * (spiff.percent || 0) / 100;
        if (amt > 0) {
          spiffTotal += amt;
          breakdown.push({ label: spiff.label, amount: amt, detail: `${spiff.percent}% of $${pv.toLocaleString()}` });
        }
      } else if (spiff.options && (sel.option_idx !== undefined || sel.selected_options)) {
        // Support multi-select options (e.g., Surge Protector Furnace + AC)
        const indices = sel.selected_options || (sel.option_idx !== undefined ? [sel.option_idx] : []);
        for (const oi of indices) {
          const opt = spiff.options[oi];
          if (opt) {
            let amt = opt.value || 0;
            let detail = opt.label;
            if (opt.pct_of_total && opt.pct_of_total > 0) {
              const pctAmt = ticketValue * opt.pct_of_total / 100;
              amt += pctAmt;
              detail += ` + ${opt.pct_of_total}% ($${pctAmt.toFixed(0)})`;
            }
            spiffTotal += amt;
            breakdown.push({ label: `${spiff.label} — ${opt.label}`, amount: amt, detail });
          }
        }
      }
    }

    // Custom SPIFFs
    for (const cs of customSpiffs) {
      if (cs.amount > 0) {
        spiffTotal += cs.amount;
        breakdown.push({ label: cs.description || 'Custom SPIFF', amount: cs.amount, detail: 'Custom' });
      }
    }

    return { percent: commPercent, base, spiffTotal, total: base + spiffTotal, breakdown };
  }, [rules, priceTier, ticketValue, spiffSelections, customSpiffs]);

  const isUnderBook = priceTier === 'under_book';

  const handleSave = () => {
    const spiffData = {};
    for (const spiff of (rules?.spiffs || [])) {
      const sel = spiffSelections[spiff.id];
      if (!sel?.selected) continue;
      if (spiff.id === 'apco_x') spiffData.apco_x = calc.breakdown.find(b => b.label.includes('APCO'))?.amount || 0;
      if (spiff.id === 'surge_protector') spiffData.surge_protector = calc.breakdown.filter(b => b.label.includes('Surge')).reduce((s, b) => s + b.amount, 0);
      if (spiff.id === 'duct_cleaning') spiffData.duct_cleaning = calc.breakdown.find(b => b.label.includes('Duct'))?.amount || 0;
      if (spiff.id === 'self_gen_mits') {
        spiffData.self_gen_mits = calc.breakdown.find(b => b.label.includes('Mitsubishi'))?.amount || 0;
        spiffData.self_gen_mits_product_value = sel.product_value || 0;
      }
      if (spiff.id === 'self_gen') spiffData.self_gen_commission = calc.breakdown.find(b => b.label === 'Self Gen (Auto-generated lead)')?.amount || 0;
      if (spiff.id === 'samsung') spiffData.samsung = calc.breakdown.find(b => b.label.includes('Samsung'))?.amount || 0;
    }

    onSave({
      ticket_value: ticketValue,
      commission_percent: calc.percent,
      commission_value: Math.round(calc.total * 100) / 100,
      spif_total: Math.round(calc.spiffTotal * 100) / 100,
      products: products.filter(p => p.manufacturer || p.model),
      sale_accessories: accessories.filter(a => a.name),
      is_self_gen: isSelfGen,
      promo_code: promoCode,
      paid_accessory: paidAccessory,
      custom_spiffs: customSpiffs.filter(c => c.amount > 0),
      price_tier: priceTier,
      ...spiffData,
    });
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 anim-backdrop">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto pb-16 anim-modal" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl text-white"
          style={{ background: isGen ? 'linear-gradient(135deg, #1a472a, #2d6a4f)' : 'linear-gradient(135deg, #059669, #10B981)' }}>
          <div>
            <h3 className="text-base font-bold">{isGen ? 'Generator Sale' : 'Convert to Sale'}</h3>
            <p className="text-xs text-white/80">{lead?.name}</p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-white/20 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Ticket Value */}
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500">Sale Amount (Ticket Value)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
              <input type="number" step="0.01" value={ticketValue || ''}
                onChange={e => setTicketValue(parseFloat(e.target.value) || 0)}
                onFocus={e => e.target.select()}
                className="w-full pl-7 pr-4 py-2 text-lg font-mono font-bold border-2 border-gray-200 rounded-xl focus:border-emerald-400 focus:outline-none"
                data-testid="sale-ticket-value" />
            </div>
          </div>

          {/* Price Tier */}
          {rules && (
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Price Level</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1">
                {rules.tiers.map(tier => (
                  <button key={tier.id} onClick={() => setPriceTier(tier.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                      priceTier === tier.id
                        ? tier.id === 'under_book' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-emerald-50 border-emerald-400 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                    data-testid={`tier-${tier.id}`}>
                    <span className="block">{tier.label}</span>
                    <span className="text-lg font-mono">{tier.percent}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase text-gray-500">Equipment Sold</label>
              <button onClick={() => setProducts(p => [...p, { manufacturer: '', model: '' }])}
                className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-bold hover:bg-blue-100 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {products.map((p, i) => (
              <div key={i} className="flex gap-1.5 mb-1.5">
                <select value={p.manufacturer} onChange={e => { const np = [...products]; np[i] = { ...np[i], manufacturer: e.target.value }; setProducts(np); }}
                  className="w-1/3 px-2 py-1.5 text-xs border rounded-lg">
                  <option value="">Brand...</option>
                  {mfgOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input value={p.model} placeholder="Model" onChange={e => { const np = [...products]; np[i] = { ...np[i], model: e.target.value }; setProducts(np); }}
                  className="flex-1 px-2 py-1.5 text-xs border rounded-lg" />
                {products.length > 1 && (
                  <button onClick={() => setProducts(products.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* SPIFFs */}
          {rules && !isGen && (
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 mb-2 block">Accessories & SPIFFs</label>
              {isUnderBook && (
                <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[10px] font-bold text-red-600">
                  Under Book — All SPIFFs lost except Samsung, Self Gen Mitsubishi & Self Gen
                </div>
              )}
              <div className="space-y-1.5">
                {rules.spiffs.map(spiff => {
                  const sel = spiffSelections[spiff.id] || {};
                  const isLocked = isUnderBook && spiff.id !== 'samsung' && spiff.id !== 'self_gen_mits' && spiff.id !== 'self_gen';
                  return (
                    <div key={spiff.id} className={`rounded-xl border-2 transition-all overflow-hidden ${
                      isLocked ? 'border-gray-200 bg-gray-100 opacity-50' :
                      sel.selected ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'
                    }`}>
                      {/* Header — tap to toggle */}
                      <button onClick={() => !isLocked && setSpiff(spiff.id, 'selected', !sel.selected)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        disabled={isLocked}>
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs transition-all ${
                            sel.selected && !isLocked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'
                          }`}>
                            {sel.selected && !isLocked && '✓'}
                            {isLocked && '✕'}
                          </div>
                          <span className={`text-xs font-bold ${isLocked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{spiff.label}</span>
                        </div>
                        {sel.selected && !isLocked && (
                          <span className="text-xs font-mono font-bold text-emerald-600">
                            +${(calc.breakdown.find(b => b.label === spiff.label)?.amount || 0).toFixed(0)}
                          </span>
                        )}
                      </button>

                      {/* Options as tabs — visible when selected */}
                      {sel.selected && !isLocked && spiff.options && (
                        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                          {spiff.options.map((opt, oi) => {
                            const indices = sel.selected_options || (sel.option_idx !== undefined ? [sel.option_idx] : []);
                            const isOn = indices.includes(oi);
                            return (
                              <button key={oi} onClick={() => {
                                const current = sel.selected_options || (sel.option_idx !== undefined ? [sel.option_idx] : []);
                                const next = isOn ? current.filter(x => x !== oi) : [...current, oi];
                                setSpiff(spiff.id, 'selected_options', next);
                                setSpiff(spiff.id, 'option_idx', undefined);
                              }}
                                className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                                  isOn
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                                }`}>
                                {opt.label}
                                <span className="block text-[9px] mt-0.5 opacity-80">
                                  +${opt.value}{opt.pct_of_total > 0 ? ` +${opt.pct_of_total}%` : ''}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Product value input for pct_of_product type */}
                      {sel.selected && !isLocked && spiff.type === 'pct_of_product' && (
                        <div className="px-3 pb-3">
                          <label className="text-[10px] text-gray-500 block mb-1">{spiff.label} product value ($)</label>
                          <input type="number" value={sel.product_value || ''}
                            onChange={e => setSpiff(spiff.id, 'product_value', parseFloat(e.target.value) || 0)}
                            onFocus={e => e.target.select()}
                            className="w-40 px-2 py-1.5 text-sm font-mono border-2 rounded-lg focus:border-emerald-400 focus:outline-none" placeholder="0" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom SPIFFs */}
          {!isGen && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase text-gray-500">Custom SPIFFs</label>
                <button onClick={() => setCustomSpiffs(prev => [...prev, { description: '', amount: 0 }])}
                  className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded font-bold hover:bg-amber-100 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add SPIFF
                </button>
              </div>
              {customSpiffs.map((cs, i) => (
                <div key={i} className="flex gap-1.5 mb-1.5">
                  <input value={cs.description} placeholder="Description..."
                    onChange={e => { const n = [...customSpiffs]; n[i] = { ...n[i], description: e.target.value }; setCustomSpiffs(n); }}
                    className="flex-1 px-2 py-1.5 text-xs border rounded-lg" />
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1.5 text-xs text-gray-400">$</span>
                    <input type="number" value={cs.amount || ''} placeholder="0"
                      onChange={e => { const n = [...customSpiffs]; n[i] = { ...n[i], amount: parseFloat(e.target.value) || 0 }; setCustomSpiffs(n); }}
                      onFocus={e => e.target.select()}
                      className="w-full pl-5 pr-2 py-1.5 text-xs font-mono border rounded-lg" />
                  </div>
                  <button onClick={() => setCustomSpiffs(prev => prev.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 px-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Paid Accessory + Promo */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer p-2 bg-gray-50 rounded-lg">
              <input type="checkbox" checked={paidAccessory} onChange={e => setPaidAccessory(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-amber-600" />
              <span className="text-[10px] font-bold text-gray-700">Paid Accessory</span>
            </label>
            <div>
              <input value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="Promo Code"
                className="w-full px-2 py-2 text-xs border rounded-lg" />
            </div>
          </div>

          {/* Commission Summary */}
          <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
            <h4 className="text-xs font-bold uppercase text-emerald-800 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Commission Calculation
            </h4>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Base ({calc.percent}% of ${ticketValue.toLocaleString()})</span>
                <span className="font-mono font-bold">${calc.base.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {calc.breakdown.map((b, i) => (
                <div key={i} className={`flex justify-between text-xs ${b.strikethrough ? 'line-through opacity-50' : ''}`}>
                  <span className={b.strikethrough ? 'text-red-400' : 'text-amber-700'}>
                    {b.strikethrough ? '- ' : '+ '}{b.label} <span className="text-gray-400">({b.detail})</span>
                  </span>
                  <span className={`font-mono font-bold ${b.strikethrough ? 'text-red-400' : 'text-amber-700'}`}>
                    {b.strikethrough ? '$0' : `+$${b.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t border-emerald-300 pt-2 mt-2">
                <span className="text-emerald-800">Total Commission</span>
                <span className="font-mono text-emerald-800 text-lg">${calc.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Confirm */}
          <Button onClick={handleSave} className="w-full py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            data-testid="confirm-sale-btn">
            Confirm Sale — ${calc.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} Commission
          </Button>
        </div>
      </div>
    </div>
  );
}
