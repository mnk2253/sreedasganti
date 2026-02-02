
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDocs
} from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  UserCheck, 
  UserX, 
  Trash2, 
  RefreshCw,
  Search,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Users
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpdateStatus = async (userId: string, status: 'active' | 'pending') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status });
    } catch (err) {
      alert('Error updating status.');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (window.confirm(`${name}-কে ডিলিট করতে চান?`)) {
      await deleteDoc(doc(db, 'users', id));
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone.includes(searchTerm)
  );

  if (loading) return <div className="flex justify-center py-24"><RefreshCw className="animate-spin text-slate-300" size={32} /></div>;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-2">সিস্টেম ম্যানেজমেন্ট</h2>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">User Control Center</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="ইউজার নাম বা মোবাইল দিয়ে খুঁজুন..." 
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-all font-bold text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">ইউজার তথ্য</th>
                <th className="px-6 py-4">মোবাইল</th>
                <th className="px-6 py-4">রোল</th>
                <th className="px-6 py-4">স্ট্যাটাস</th>
                <th className="px-6 py-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img src={u.photoUrl} className="h-10 w-10 rounded-lg object-cover" alt="" />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{u.occupation}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-slate-500 font-mono">{u.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${u.role === 'admin' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
                      {u.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1.5">
                       <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{u.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                       {u.status === 'pending' ? (
                         <button onClick={() => handleUpdateStatus(u.id, 'active')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><UserCheck size={18}/></button>
                       ) : (
                         <button onClick={() => handleUpdateStatus(u.id, 'pending')} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"><UserX size={18}/></button>
                       )}
                       <button onClick={() => handleDeleteUser(u.id, u.name)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
