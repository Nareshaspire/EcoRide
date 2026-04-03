import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, ChevronRight, Leaf, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Ride } from '../types';

const RideCard = ({ ride }: { ride: Ride }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group"
  >
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg">
            {ride.driverName[0]}
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{ride.driverName}</h4>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Verified Driver
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-emerald-600">${ride.pricePerSeat}</p>
          <p className="text-xs text-gray-400 font-medium">per seat</p>
        </div>
      </div>

      <div className="space-y-4 mb-6 relative">
        <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-emerald-100" />
        <div className="flex items-center gap-4 relative">
          <div className="w-5 h-5 bg-white border-2 border-emerald-500 rounded-full z-10" />
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">From</p>
            <p className="font-bold text-gray-900">{ride.origin}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 relative">
          <div className="w-5 h-5 bg-emerald-500 rounded-full z-10 flex items-center justify-center">
            <MapPin className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">To</p>
            <p className="font-bold text-gray-900">{ride.destination}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-50">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">{format(new Date(ride.departureTime), 'MMM d, h:mm a')}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">{ride.availableSeats} seats left</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
          <Leaf className="w-3.5 h-3.5" /> -{ride.carbonImpact}kg CO₂
        </div>
        <Link 
          to={`/ride/${ride.id}`}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all flex items-center gap-2"
        >
          View Details <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </motion.div>
);

export default RideCard;
