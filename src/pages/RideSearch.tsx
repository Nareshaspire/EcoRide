import { User } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Car, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import RideCard from '../components/RideCard';
import { db } from '../firebase';
import { RecurringTrip, Ride } from '../types';

const RideSearch = ({ user }: { user: User }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [recurringTrips, setRecurringTrips] = useState<RecurringTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'rides'), where('status', '==', 'open'), orderBy('departureTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
      setLoading(false);
    });

    const qRecurring = query(collection(db, 'recurringTrips'), where('userId', '==', user.uid), where('active', '==', true));
    const unsubRecurring = onSnapshot(qRecurring, (snapshot) => {
      setRecurringTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringTrip)));
    });

    return () => { unsubscribe(); unsubRecurring(); };
  }, [user.uid]);

  const filteredRides = rides.filter(r => 
    r.origin.toLowerCase().includes(search.toLowerCase()) || 
    r.destination.toLowerCase().includes(search.toLowerCase())
  );

  const suggestedRides = rides.filter(r => 
    recurringTrips.some(t => 
      t.origin.toLowerCase() === r.origin.toLowerCase() && 
      t.destination.toLowerCase() === r.destination.toLowerCase() &&
      t.role !== (r.driverId === user.uid ? 'driver' : 'rider')
    )
  ).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {suggestedRides.length > 0 && !search && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Suggested for your Commute</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {suggestedRides.map(ride => <RideCard key={ride.id} ride={ride} />)}
          </div>
          <div className="mt-8 border-b border-gray-100" />
        </div>
      )}

      <div className="mb-12">
        <h2 className="text-3xl font-black text-gray-900 mb-6">Find your next ride</h2>
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Where are you going?" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      ) : filteredRides.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRides.map(ride => <RideCard key={ride.id} ride={ride} />)}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No rides found</h3>
          <p className="text-gray-500">Try searching for a different location or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default RideSearch;
