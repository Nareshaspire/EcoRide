import { doc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Phone, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { db } from '../firebase';
import { SOSContact, UserProfile } from '../types';

const SOSManager = ({ user, profile }: { user: User, profile: UserProfile | null }) => {
  const [contacts, setContacts] = useState<SOSContact[]>(profile?.sosContacts || []);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    const updated = [...contacts, { name: newName.trim(), phone: newPhone.trim() }];
    await updateDoc(doc(db, 'users', user.uid), { sosContacts: updated });
    setContacts(updated);
    setNewName('');
    setNewPhone('');
    setShowAdd(false);
  };

  const handleRemove = async (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    await updateDoc(doc(db, 'users', user.uid), { sosContacts: updated });
    setContacts(updated);
  };

  return (
    <div className="space-y-3">
      {contacts.length > 0 && (
        <div className="space-y-2">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-red-100">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone}</p>
                </div>
              </div>
              <button onClick={() => handleRemove(i)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {showAdd ? (
        <form onSubmit={handleAdd} className="space-y-2">
          <input
            required
            placeholder="Contact name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm outline-none focus:ring-2 focus:ring-red-400"
          />
          <input
            required
            placeholder="Phone number"
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-700">Save</button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-gray-500 text-sm font-bold">Cancel</button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {contacts.length > 0 ? 'Add Another Contact' : 'Add SOS Contact'}
        </button>
      )}
    </div>
  );
};

export default SOSManager;
