import { User } from 'firebase/auth';
import { addDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Car, Plus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { RecurringTrip } from '../types';

const RecurringTrips = ({ user }: { user: User }) => {
  const [trips, setTrips] = useState<RecurringTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTrip, setNewTrip] = useState({
    origin: '',
    destination: '',
    role: 'rider' as 'driver' | 'rider',
    days: [] as string[],
    time: '08:00'
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    const q = query(collection(db, 'recurringTrips'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringTrip)));
      setLoading(false);
    });
    return unsubscribe;
  }, [user.uid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTrip.days.length === 0) return;
    await addDoc(collection(db, 'recurringTrips'), {
      ...newTrip,
      userId: user.uid,
      active: true
    });
    setShowAdd(false);
    setNewTrip({ origin: '', destination: '', role: 'rider', days: [], time: '08:00' });
  };

  const toggleDay = (day: string) => {
    setNewTrip(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900">Recurring Commutes</h3>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline"
        >
          {showAdd ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Schedule</>}
        </button>
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAdd} 
          className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input 
              required
              placeholder="Origin"
              value={newTrip.origin}
              onChange={e => setNewTrip({...newTrip, origin: e.target.value})}
              className="px-4 py-2 rounded-xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input 
              required
              placeholder="Destination"
              value={newTrip.destination}
              onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
              className="px-4 py-2 rounded-xl border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                  newTrip.days.includes(day) ? "bg-emerald-600 text-white" : "bg-white text-gray-500 border border-gray-200"
                )}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="time" 
              value={newTrip.time}
              onChange={e => setNewTrip({...newTrip, time: e.target.value})}
              className="px-4 py-2 rounded-xl border border-emerald-200 outline-none"
            />
            <select 
              value={newTrip.role}
              onChange={e => setNewTrip({...newTrip, role: e.target.value as any})}
              className="px-4 py-2 rounded-xl border border-emerald-200 outline-none"
            >
              <option value="rider">As Rider</option>
              <option value="driver">As Driver</option>
            </select>
            <button type="submit" className="ml-auto bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700">
              Save
            </button>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {trips.map(trip => (
          <div key={trip.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl",
                trip.role === 'driver' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
              )}>
                {trip.role === 'driver' ? <Car className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-gray-900">{trip.origin} → {trip.destination}</p>
                <p className="text-xs text-gray-500 font-medium">
                  {trip.days.map(d => d.slice(0, 3)).join(', ')} at {trip.time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                trip.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
              )}>
                {trip.active ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecurringTrips;
