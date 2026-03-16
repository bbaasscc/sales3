import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Bell, Phone, Clock, Mail, AlertTriangle, Calendar, UserPlus, X } from "lucide-react";
import { API } from "@/lib/constants";

export default function NotificationBell({ authHeaders }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState("default");
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/notifications`, { headers: authHeaders });
      setNotifications(res.data.notifications || []);
    } catch {}
  }, [authHeaders]);

  // Poll every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Request push permission on first load
  useEffect(() => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(p => setPushPermission(p));
      }
    }
  }, []);

  // Send browser push for high priority
  const prevCountRef = useRef(0);
  useEffect(() => {
    const highCount = notifications.filter(n => n.priority === "high").length;
    if (highCount > prevCountRef.current && pushPermission === "granted" && !document.hasFocus()) {
      const n = notifications.find(n => n.priority === "high");
      if (n) {
        new Notification("Salesman's Legend League", {
          body: n.title + " — " + n.message,
          icon: "/logo.png",
          tag: n.id,
        });
      }
    }
    prevCountRef.current = highCount;
  }, [notifications, pushPermission]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dismiss = async (id) => {
    try {
      await axios.post(`${API}/notifications/dismiss/${id}`, {}, { headers: authHeaders });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const clearAll = async () => {
    try {
      const ids = notifications.map(n => n.id);
      await axios.post(`${API}/notifications/clear-all`, { ids }, { headers: authHeaders });
      setNotifications([]);
    } catch {}
  };

  const count = notifications.length;
  const highCount = notifications.filter(n => n.priority === "high").length;

  const typeIcon = (type) => {
    if (type === "pending_install") return <Calendar className="w-3.5 h-3.5" />;
    if (type === "overdue_followup") return <Clock className="w-3.5 h-3.5" />;
    return <UserPlus className="w-3.5 h-3.5" />;
  };
  const typeColor = (type, priority) => {
    if (priority === "high") return "bg-red-100 text-red-600";
    if (type === "overdue_followup") return "bg-amber-100 text-amber-600";
    return "bg-blue-100 text-blue-600";
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-lg transition-all ${open ? 'bg-white/20' : 'hover:bg-white/10'}`}
        data-testid="notification-bell">
        <Bell className={`w-5 h-5 text-white ${highCount > 0 ? 'animate-bounce' : ''}`} />
        {count > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-bold rounded-full ${
            highCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-400 text-gray-900'
          }`}>
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden anim-modal"
          data-testid="notification-panel">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-bold text-gray-800">Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button onClick={clearAll}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline"
                  data-testid="clear-all-notifs">
                  Clear All
                </button>
              )}
              <span className="text-[10px] font-bold text-gray-400">{count} active</span>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${typeColor(n.type, n.priority)}`}>
                      {typeIcon(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800">{n.title}</p>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{n.message}</p>
                    </div>
                    <button onClick={() => dismiss(n.id)}
                      className="p-1 hover:bg-gray-200 rounded-full flex-shrink-0 text-gray-400"
                      data-testid={`dismiss-notif-${n.id}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {pushPermission !== "granted" && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
              <button onClick={() => Notification.requestPermission().then(p => setPushPermission(p))}
                className="text-[10px] text-blue-600 font-bold hover:underline">
                Enable push notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
