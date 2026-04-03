import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('carbonSaved', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTopUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-emerald-50/50 flex items-center gap-3">
        <Star className="w-5 h-5 text-emerald-600 fill-current" />
        <h3 className="font-bold text-gray-900">Eco Leaderboard</h3>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" /></div>
        ) : (
          <div className="space-y-4">
            {topUsers.map((u, i) => (
              <div key={u.uid} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                    i === 0 ? "bg-amber-100 text-amber-700" : 
                    i === 1 ? "bg-gray-200 text-gray-700" :
                    i === 2 ? "bg-orange-100 text-orange-700" : "text-gray-400"
                  )}>
                    {i + 1}
                  </span>
                  <img src={u.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.uid} className="w-8 h-8 rounded-full" alt="" />
                  <span className="font-bold text-sm text-gray-900">{u.displayName}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{u.carbonSaved.toFixed(1)}kg</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Saved</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
