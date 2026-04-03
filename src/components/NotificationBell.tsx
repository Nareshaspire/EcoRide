import { format } from 'date-fns';
import { User } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { Notification } from '../types';

const NotificationBell = ({ user }: { user: User }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
    });
    return unsub;
  }, [user.uid]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setShowDropdown(!showDropdown); if (!showDropdown) markAllRead(); }}
        className="relative p-2 text-gray-400 hover:text-emerald-600 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h4 className="font-bold text-gray-900 text-sm">Notifications</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length > 0 ? notifications.map(n => (
              <Link
                key={n.id}
                to={n.rideId ? `/ride/${n.rideId}` : '#'}
                onClick={() => setShowDropdown(false)}
                className={cn(
                  "block px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                  !n.read && "bg-emerald-50/50"
                )}
              >
                <p className="text-sm text-gray-900">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">{format(new Date(n.createdAt), 'MMM d, h:mm a')}</p>
              </Link>
            )) : (
              <div className="p-6 text-center text-gray-400 text-sm">No notifications yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
