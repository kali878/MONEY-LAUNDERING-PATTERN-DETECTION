import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, Loader2, Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getNotifications, markAllNotificationsRead, updateNotification, deleteNotification as apiDeleteNotification, createNotification } from '../../services/api.js';
import ErrorBanner from '../common/ErrorBanner.jsx';
import EmptyState from '../common/EmptyState.jsx';

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchNotifications = useCallback(async (force = false) => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (force) params.force = '1';
      if (showUnreadOnly) params.unread = '1';
      const data = await getNotifications(params);
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, showUnreadOnly]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead();
      setItems(prev => prev.map(n => ({ ...n, read: true, read_at: n.read_at || new Date().toISOString() })));
      setUnread(0);
    } catch (e) {
      // ignore
    }
  };

  const toggleRead = async (id, read) => {
    if (!user) return; 
    try {
      await updateNotification(id, { read });
      setItems(prev => prev.map(n => n.id === id ? { ...n, read, read_at: read ? new Date().toISOString() : undefined } : n));
      setUnread(prev => read ? Math.max(0, prev - 1) : prev + 1);
    } catch(e) { /* ignore */ }
  };

  const deleteNotification = async (id) => {
    if (!user) return;
    try {
      await apiDeleteNotification(id);
      setItems(prev => prev.filter(n => n.id !== id));
      setUnread(prev => prev - 1 < 0 ? 0 : prev - 1);
    } catch(e) { /* ignore */ }
  };

  const createTestNotification = async () => {
    if (!user) return;
    try {
      setCreating(true);
      const severities = ['info','low','medium','high','critical'];
      const sev = severities[Math.floor(Math.random()*severities.length)];
      await createNotification({ title: `Test ${sev} event`, message: `Generated at ${new Date().toLocaleTimeString()}`, severity: sev });
      fetchNotifications(true);
    } catch(e) { /* ignore */ } finally { setCreating(false);} }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-gray-400 hover:text-cyan-400 transition-all duration-300 hover:scale-110 rounded-lg hover:bg-gray-800/30"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={24} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full shadow">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-96 max-w-[90vw] bg-gray-900 border border-cyan-500/30 rounded-lg shadow-2xl z-50 overflow-hidden animate-fadeIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/60">
            <h3 className="text-sm font-semibold text-cyan-300">Notifications</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowUnreadOnly(v => !v)} className="text-xs text-gray-400 hover:text-cyan-300 flex items-center gap-1">
                {showUnreadOnly ? <EyeOff size={14}/> : <Eye size={14}/>}
                {showUnreadOnly ? 'Unread' : 'All'}
              </button>
              <button onClick={createTestNotification} disabled={creating} className="text-xs text-gray-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-40">
                <Plus size={14}/>{creating ? '...' : 'Test'}
              </button>
              <button onClick={() => fetchNotifications(true)} className="text-xs text-gray-400 hover:text-cyan-300 flex items-center gap-1">
                {loading && <Loader2 size={12} className="animate-spin" />}
                Refresh
              </button>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-gray-400 hover:text-cyan-300 flex items-center gap-1"><Check size={14}/>Mark</button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {loading && (
              <div className="flex items-center gap-2 px-4 py-6 text-gray-400 text-sm"><Loader2 className="animate-spin" size={16}/>Loading...</div>
            )}
            {error && !loading && (
              <div className="p-3"><ErrorBanner message={error} /></div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="p-3"><EmptyState title="No notifications" subtitle="You're all caught up." /></div>
            )}
            {!loading && !error && items.map(n => {
              return (
                <div key={n.id} className={`group relative px-4 py-3 text-sm border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition flex flex-col gap-1 ${!n.read ? 'bg-gray-800/30' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-200 line-clamp-1 pr-6">{n.title || 'Notification'}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => toggleRead(n.id, !n.read)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-cyan-300" title={n.read ? 'Mark unread' : 'Mark read'}>
                        {n.read ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                      <button onClick={() => deleteNotification(n.id)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400" title="Delete">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                    {!n.read && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"/>}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{n.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[10px] uppercase tracking-wide font-semibold ${n.severity === 'critical' ? 'text-red-500' : n.severity === 'high' ? 'text-red-400' : n.severity === 'medium' ? 'text-yellow-400' : n.severity === 'low' ? 'text-green-400' : 'text-gray-500'}`}>{n.severity || 'info'}</span>
                    <span className="text-[10px] text-gray-500">{n.created_at ? new Date(n.created_at).toLocaleTimeString() : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
