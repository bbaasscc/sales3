import { useState, useRef } from "react";
import axios from "axios";
import { Phone, MessageSquare, Mail, Mic, MicOff, Languages, Send, X, StickyNote, Bell } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/constants";

export default function AddInteraction({ leadId, leadName, authHeaders, onSaved }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [translating, setTranslating] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalTranscript = description;
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + event.results[i][0].transcript;
        } else {
          interim = event.results[i][0].transcript;
        }
      }
      setDescription(finalTranscript + (interim ? ' ' + interim : ''));
    };
    recognition.onerror = () => { setListening(false); };
    recognition.onend = () => { setListening(false); };
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const handleTranslate = async () => {
    if (!description.trim()) return;
    setTranslating(true);
    try {
      const res = await axios.post(`${API}/translate`, { text: description }, { headers: authHeaders });
      if (res.data.translated) {
        setDescription(res.data.translated);
        toast.success("Translated to English");
      } else {
        toast.error("Translation failed");
      }
    } catch { toast.error("Translation error"); }
    setTranslating(false);
  };

  const handleSave = async () => {
    if (!type) { toast.error("Select interaction type"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/leads/${leadId}/interaction`, {
        type, description: description.trim(),
      }, { headers: authHeaders });
      toast.success("Interaction saved");
      setDescription('');
      setType('');
      setOpen(false);
      if (onSaved) onSaved();
    } catch { toast.error("Error saving"); }
    setSaving(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full py-2.5 text-xs font-bold text-blue-600 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all active:scale-98"
        data-testid="add-interaction-btn">
        + Add Interaction
      </button>
    );
  }

  return (
    <div className="border-2 border-blue-200 rounded-xl p-3 space-y-3 bg-blue-50/30 anim-modal" data-testid="interaction-form">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-blue-800">New Interaction</p>
        <button onClick={() => { setOpen(false); setType(''); setDescription(''); }}
          className="p-1 hover:bg-gray-200 rounded-full"><X className="w-3.5 h-3.5 text-gray-500" /></button>
      </div>

      {/* Type selector */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { id: 'call', icon: Phone, label: 'Call', color: '#16a34a' },
          { id: 'sms', icon: MessageSquare, label: 'SMS', color: '#9333ea' },
          { id: 'email', icon: Mail, label: 'Email', color: '#2563eb' },
          { id: 'note', icon: StickyNote, label: 'Note', color: '#f59e0b' },
          { id: 'reminder', icon: Bell, label: 'Reminder', color: '#ef4444' },
        ].map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={`flex-1 min-w-[60px] flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${
              type === t.id ? 'text-white shadow-sm' : 'bg-white text-gray-500 border-gray-200'
            }`}
            style={type === t.id ? { backgroundColor: t.color, borderColor: t.color } : {}}
            data-testid={`interaction-type-${t.id}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="relative">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the interaction..."
          rows={3}
          className="w-full px-3 py-2 pr-20 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          data-testid="interaction-description" />
        <div className="absolute right-2 top-2 flex gap-1">
          {/* Mic button */}
          <button onClick={listening ? stopListening : startListening}
            className={`p-1.5 rounded-lg transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            title={listening ? "Stop recording" : "Start voice input (Spanish)"}
            data-testid="interaction-mic">
            {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          {/* Translate button */}
          <button onClick={handleTranslate} disabled={translating || !description.trim()}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-600 transition-all disabled:opacity-30"
            title="Translate Spanish → English"
            data-testid="interaction-translate">
            <Languages className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {listening && (
        <p className="text-[10px] text-red-500 font-bold animate-pulse">Recording... speak in Spanish</p>
      )}
      {translating && (
        <p className="text-[10px] text-amber-600 font-bold">Translating...</p>
      )}

      {/* Save */}
      <button onClick={handleSave} disabled={saving || !type}
        className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95"
        data-testid="interaction-save">
        <Send className="w-3.5 h-3.5" />
        {saving ? 'Saving...' : 'Save Interaction'}
      </button>
    </div>
  );
}
