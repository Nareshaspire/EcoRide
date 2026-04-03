import { User } from 'firebase/auth';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { RecurringTrip, UserProfile } from '../types';

const PostRide = ({ user, profile }: { user: User, profile: UserProfile | null }) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departureTime: '',
    availableSeats: 3,
    pricePerSeat: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.isVerified) {
      alert("Please verify your account in your profile before offering rides.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const estimatedDistanceKm = Math.max(10, (formData.origin.length + formData.destination.length) * 1.5);
      const carbonImpact = parseFloat((estimatedDistanceKm * 0.21).toFixed(1));

      const rideData = {
        ...formData,
        driverId: user.uid,
        driverName: user.displayName,
        status: 'open',
        riders: [],
        totalSeats: formData.availableSeats,
        carbonImpact,
        createdAt: new Date().toISOString(),
      };
      const rideRef = await addDoc(collection(db, 'rides'), rideData);

      // Auto-match: find users with recurring trips matching this ride
      const matchQuery = query(collection(db, 'recurringTrips'), where('active', '==', true), where('role', '==', 'rider'));
      const matchSnap = await getDocs(matchQuery);
      for (const tripDoc of matchSnap.docs) {
        const trip = tripDoc.data() as RecurringTrip;
        if (
          trip.userId !== user.uid &&
          trip.origin.toLowerCase() === formData.origin.toLowerCase() &&
          trip.destination.toLowerCase() === formData.destination.toLowerCase()
        ) {
          await addDoc(collection(db, 'notifications'), {
            userId: trip.userId,
            type: 'ride_match',
            message: `A new ride from ${formData.origin} to ${formData.destination} matches your commute schedule!`,
            rideId: rideRef.id,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }

      navigate('/rides');
    } catch (error) {
      console.error("Error posting ride:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-emerald-50"
      >
        <h2 className="text-3xl font-black text-gray-900 mb-8">Offer a Ride</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Origin</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                <input 
                  required
                  type="text" 
                  placeholder="Starting from..."
                  value={formData.origin}
                  onChange={e => setFormData({...formData, origin: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 w-5 h-5" />
                <input 
                  required
                  type="text" 
                  placeholder="Going to..."
                  value={formData.destination}
                  onChange={e => setFormData({...formData, destination: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Departure Time</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
              <input 
                required
                type="datetime-local" 
                value={formData.departureTime}
                onChange={e => setFormData({...formData, departureTime: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Available Seats</label>
              <input 
                required
                type="number" 
                min="1"
                max="8"
                value={formData.availableSeats}
                onChange={e => setFormData({...formData, availableSeats: parseInt(e.target.value)})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Price per Seat ($)</label>
              <input 
                required
                type="number" 
                min="0"
                value={formData.pricePerSeat}
                onChange={e => setFormData({...formData, pricePerSeat: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-100 active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Posting...' : 'Post Ride'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default PostRide;
