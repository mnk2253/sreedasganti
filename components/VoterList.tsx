
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  Search, 
  MessageSquare, 
  CreditCard, 
  User as UserIcon, 
  Briefcase, 
  PhoneCall, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface VoterListProps {
  currentUser: UserProfile;
  onMessageClick: (member: UserProfile) => void;
}

export const VoterList: React.FC<VoterListProps> = ({ currentUser, onMessageClick }) => {
  const [voters, setVoters] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Edit State
  const [editingVoter, setEditingVoter] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    fatherName: '',
    voterNumber: '',
    occupation: ''
  });

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    const q = query(
      collection(db, 'users'), 
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allActive = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
      const withVoters = allActive.filter(u => u.voterNumber && u.voterNumber.trim() !== '');
      setVoters(withVoters);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleDelete = async (voterId: string, voterName: string) => {
    if (window.confirm(`${voterName}-কে কি নিশ্চিতভাবে তালিকা থেকে মুছে ফেলতে চান?`)) {
      try {
        await deleteDoc(doc(db, 'users', voterId));
        alert('সফলভাবে মুছে ফেলা হয়েছে।');
      } catch (err) {
        alert('মুছে ফেলতে সমস্যা হয়েছে।');
      }
    }
  };

  const openEditModal = (voter: UserProfile) => {
    setEditingVoter(voter);
    setEditData({
      name: voter.name,
      fatherName: voter.fatherName,
      voterNumber: voter.voterNumber || '',
      occupation: voter.occupation
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoter || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', editingVoter.id), {
        name: editData.name.trim(),
        fatherName: editData.fatherName.trim(),
        voterNumber: editData.voterNumber.trim(),
        occupation: editData.occupation.trim()
      });
      setEditingVoter(null);
      alert('তথ্য আপডেট করা হয়েছে।');
    } catch (err) {
      alert('আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredVoters = voters.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.phone.includes(searchTerm) ||
    (v.voterNumber && v.voterNumber.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-400 text-sm">ভোটার তালিকা লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      <div className="bg-gradient-to-br from-indigo-700 to-blue-800 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="bg-white/20 w-fit p-3 rounded-2xl mb-4 backdrop-blur-md">
            <CreditCard size={28} />
          </div>
          <h2 className="text-2xl font-black">ভোটার তালিকা (Voter List)</h2>
          <p className="text-indigo-100 text-sm mt-1 opacity-90">শ্রীদাসগাতী গ্রামের নিবন্ধিত ভোটারদের তালিকা।</p>
          <div className="mt-6 inline-flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
            <span className="text-xs font-bold uppercase tracking-widest">Total Voters:</span>
            <span className="text-lg font-black">{voters.length}</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <CreditCard size={140} />
        </div>
      </div>

      <div className="relative px-2">
        <Search className="absolute left-6 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by Name, Phone or Voter ID..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
        {filteredVoters.map(voter => (
          <div key={voter.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col space-y-4 relative group">
            {isAdmin && (
              <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openEditModal(voter)}
                  className="bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                  title="Edit Voter"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(voter.id, voter.name)}
                  className="bg-red-50 text-red-600 p-2 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                  title="Delete Voter"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            <div className="flex items-start space-x-4">
              <img 
                src={voter.photoUrl} 
                className="h-20 w-20 rounded-2xl object-cover border-2 border-indigo-50 shadow-sm" 
                alt={voter.name} 
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-lg truncate leading-tight pr-12">{voter.name}</h3>
                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Verified Voter</p>
                
                <div className="mt-3 space-y-2">
                   <div className="flex flex-col">
                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Father's Name / পিতার নাম</span>
                     <div className="flex items-center text-xs text-gray-600 font-bold">
                        <UserIcon size={12} className="mr-1.5 text-gray-400" />
                        <span className="truncate">{voter.fatherName}</span>
                     </div>
                   </div>
                   
                   <div className="flex flex-col">
                     <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Occupation / পেশা</span>
                     <div className="flex items-center text-xs text-gray-600 font-bold">
                        <Briefcase size={12} className="mr-1.5 text-gray-400" />
                        <span className="truncate">{voter.occupation}</span>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Voter ID Number</p>
                <p className="text-indigo-800 font-black text-base font-mono tracking-wider">{voter.voterNumber}</p>
              </div>
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <CreditCard size={20} className="text-indigo-600" />
              </div>
            </div>

            <div className="flex space-x-2">
              <a 
                href={`tel:${voter.phone}`}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
              >
                <PhoneCall size={14} />
                <span>Call / কল করুন</span>
              </a>
              <button 
                onClick={() => onMessageClick(voter)}
                className="flex-1 bg-indigo-50 text-indigo-700 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border border-indigo-100 active:scale-95 transition-all"
              >
                <MessageSquare size={14} />
                <span>Message / মেসেজ</span>
              </button>
            </div>
          </div>
        ))}

        {filteredVoters.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
            <CreditCard size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">কোন ভোটার খুঁজে পাওয়া যায়নি।</p>
          </div>
        )}
      </div>

      {/* Edit Voter Modal */}
      {editingVoter && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center"><Edit2 className="mr-2" size={20} /> ভোটার তথ্য সংশোধন</h3>
              <button onClick={() => setEditingVoter(null)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ভোটার নাম</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">পিতার নাম</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={editData.fatherName}
                    onChange={(e) => setEditData({...editData, fatherName: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ভোটার নাম্বার</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-mono font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={editData.voterNumber}
                      onChange={(e) => setEditData({...editData, voterNumber: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">পেশা</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={editData.occupation}
                      onChange={(e) => setEditData({...editData, occupation: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingVoter(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className="flex-2 bg-indigo-600 text-white py-3.5 px-8 rounded-2xl font-bold shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isUpdating ? <RefreshCw className="animate-spin" size={18} /> : <><Save size={18} /> <span>পরিবর্তন সেভ করুন</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
