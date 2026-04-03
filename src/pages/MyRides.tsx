import { User } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Car, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RideCard from '../components/RideCard';
import { db } from '../firebase';
import { Ride } from '../types';

const MyRides = ({ user }: { user: User }) => {
  const [offeredRides, setOfferedRides] = useState<Ride[]>([]);
  const [joinedRides, setJoinedRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qOffered = query(collection(db, 'rides'), where('driverId', '==', user.uid), orderBy('departureTime', 'desc'));
    const qJoined = query(collection(db, 'rides'), where('riders', 'array-contains', user.uid), orderBy('departureTime', 'desc'));

    const unsubOffered = onSnapshot(qOffered, (snapshot) => {
      setOfferedRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
    });

    const unsubJoined = onSnapshot(qJoined, (snapshot) => {
      setJoinedRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
      setLoading(false);
    });

    return () => { unsubOffered(); unsubJoined(); };
  }, [user.uid]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-3xl font-black text-gray-900 mb-12">My Rides</h2>
      
      <div className="space-y-16">
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Rides I'm Offering</h3>
          </div>
          {offeredRides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {offeredRides.map(ride => <RideCard key={ride.id} ride={ride} />)}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center">
              <p className="text-gray-500 font-medium">You haven't offered any rides yet.</p>
              <Link to="/post-ride" className="text-emerald-600 font-bold mt-2 inline-block hover:underline">Offer your first ride</Link>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Rides I've Joined</h3>
          </div>
          {joinedRides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {joinedRides.map(ride => <RideCard key={ride.id} ride={ride} />)}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center">
              <p className="text-gray-500 font-medium">You haven't joined any rides yet.</p>
              <Link to="/rides" className="text-emerald-600 font-bold mt-2 inline-block hover:underline">Find a ride to join</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MyRides;
