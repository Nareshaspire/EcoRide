import { motion } from 'framer-motion';
import { ArrowRight, DollarSign, Leaf, Plus, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => (
  <div className="relative overflow-hidden bg-emerald-50 py-20 sm:py-32">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
      <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-400 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-300 rounded-full blur-3xl" />
    </div>
    
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-6">
            <Leaf className="w-4 h-4" /> Eco-Friendly Commuting
          </span>
          <h1 className="text-5xl sm:text-7xl font-extrabold text-gray-900 tracking-tight mb-8">
            Ride Together, <span className="text-emerald-600">Save the Planet.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Connect with verified commuters, split costs, and reduce your carbon footprint. 
            The smartest way to travel for you and the environment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/rides" className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 flex items-center justify-center gap-2">
              Find a Ride <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/post-ride" className="w-full sm:w-auto bg-white text-emerald-600 border-2 border-emerald-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
              Offer a Ride <Plus className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="bg-white p-8 rounded-3xl border border-emerald-50 shadow-sm hover:shadow-md transition-all group">
    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
      <Icon className="w-7 h-7" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

const Landing = () => (
  <div className="space-y-20 pb-20">
    <Hero />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={ShieldAlert}
          title="Verified Safety"
          description="Every driver and rider is verified through our multi-step trust system, including ID checks and community ratings."
        />
        <FeatureCard 
          icon={Leaf}
          title="Eco-Impact Tracking"
          description="See the real-time impact of your carpooling choices with our built-in carbon footprint calculator."
        />
        <FeatureCard 
          icon={DollarSign}
          title="Cost Splitting"
          description="Save up to 75% on your daily commute costs by splitting fuel and maintenance with fellow travelers."
        />
      </div>
    </div>
  </div>
);

export default Landing;
