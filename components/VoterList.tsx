
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, limit } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  Search, 
  Edit2, 
  Trash2, 
  RefreshCw,
  X,
  User,
  CreditCard,
  Calendar,
  Users,
  Info
} from 'lucide-react';

const CHAR_MAP: Record<string, string> = {
  'ĺ': 'ব্দ', 'Ĩ': 'সা', 'ę': 'দ্র', 'Ľ': 'ব্র', 'Ō': 'ছা', 'Ž': 'জ', 'ñ': 'ন', 'ĥ': 'ন্ম', 'ń': 'ম্ব', 'İ': 'ি', 'Ï': 'ো',
  'Ř': 'শ্র', 'ý': 'গঞ্জ', 'ঁ': 'া'
};

const cleanText = (text: string): string => {
  if (!text) return "";
  let result = text.replace(/[ĺĨęĽŌŽñĥńİÏŘýঁ]/g, match => CHAR_MAP[match] || match);
  const replacements: [RegExp, string][] = [
    [/োমাছাঃ/g, 'মোছাঃ'], [/োমাঃ/g, 'মোঃ'], [/োভাটার/g, 'ভোটার'],
    [/িপতা/g, 'পিতা'], [/ামাতা/g, 'মাতা'], [/োপেশা/g, 'পেশা'],
    [/ে\s*া/g, 'ো'], [/ে\s*ৗ/g, 'ৌ'], [/ি\s+/g, 'ি'],
    [/ু\s+/g, 'ু'], [/র্\s+/g, 'র্']
  ];
  for (const [pattern, rep] of replacements) {
    result = result.replace(pattern, rep);
  }
  return result.trim();
};

export const VoterList: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [voters, setVoters] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [editingVoter, setEditingVoter] = useState<any | null>(null);
  const [selectedVoter, setSelectedVoter] = useState<any | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'voters'), where('status', '==', 'active'), limit(2500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a: any, b: any) => (parseInt(a.slNo) || 0) - (parseInt(b.slNo) || 0));
      setVoters(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`${cleanText(name)}-কে ডিলিট করতে চান?`)) {
      await deleteDoc(doc(db, 'voters', id));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'voters', editingVoter.id), editData);
      setEditingVoter(null);
    } catch (err) {
      alert('Error updating.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredVoters = voters.filter(v => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return genderFilter === 'All' || v.gender === genderFilter;

    // Search against cleaned (visible) text and specific fields
    const cleanedName = cleanText(v.name).toLowerCase();
    const cleanedFather = cleanText(v.fatherName).toLowerCase();
    const slNo = (v.slNo || '').toString().toLowerCase();
    const birthDate = (v.birthDate || '').toLowerCase();
    const voterNumber = (v.voterNumber || '').toLowerCase();

    const matchesSearch = 
      cleanedName.includes(s) || 
      cleanedFather.includes(s) || 
      slNo.includes(s) || 
      birthDate.includes(s) || 
      voterNumber.includes(s);

    return matchesSearch && (genderFilter === 'All' || v.gender === genderFilter);
  });

  if (loading) return (
    <div className="flex justify-center py-24">
      <RefreshCw className="animate-spin text-slate-300" size={32} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-4 px-2 sm:py-6 sm:px-4">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">ভোটার তালিকা</h2>
        <p className="text-slate-400 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em]">Village Database System</p>
      </div>

      <div className="flex flex-col md:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="নাম, সিরিয়াল (SL) বা জন্ম তারিখ দিয়ে খুঁজুন..." 
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 transition-all font-bold text-[10px] sm:text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-100 overflow-x-auto no-scrollbar">
          {['All', 'Male', 'Female'].map(g => (
            <button 
              key={g} 
              onClick={() => setGenderFilter(g as any)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-[8px] sm:text-[10px] font-black uppercase transition-all ${genderFilter === g ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {g === 'All' ? 'সবাই' : g === 'Male' ? 'পুরুষ' : 'মহিলা'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[7px] sm:text-[9px] font-black uppercase tracking-tighter sm:tracking-widest">
                <th className="px-1 py-2 sm:px-4 sm:py-3 text-center w-[10%] sm:w-[8%]">SL</th>
                <th className="px-1 py-2 sm:px-4 sm:py-3 w-[40%] sm:w-[25%]">নাম ও তথ্য</th>
                <th className="px-1 py-2 sm:px-4 sm:py-3 w-[25%] sm:w-[15%]">পিতা/মাতা</th>
                <th className="px-1 py-2 sm:px-4 sm:py-3 hidden sm:table-cell w-[14%]">জন্ম</th>
                <th className="px-1 py-2 sm:px-4 sm:py-3 w-[25%] sm:w-[15%]">আইডি</th>
                {isAdmin && <th className="px-1 py-2 sm:px-4 sm:py-3 text-center w-[10%] sm:w-[8%]">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVoters.slice(0, visibleCount).map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-1 py-2 sm:px-4 sm:py-2.5 text-center">
                    <span className="text-[7px] sm:text-[10px] font-black text-slate-400">{v.slNo}</span>
                  </td>
                  <td className="px-1 py-2 sm:px-4 sm:py-2.5 cursor-pointer group/name" onClick={() => setSelectedVoter(v)}>
                    <div className="flex items-center space-x-1 sm:space-x-2.5">
                      <img src={v.photoUrl} className="h-6 w-6 sm:h-8 sm:w-8 rounded-md object-cover bg-slate-100 border border-slate-200 flex-shrink-0" alt="" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-[9px] sm:text-[11px] leading-tight truncate group-hover/name:text-blue-600 transition-colors underline-offset-2 group-hover/name:underline">{cleanText(v.name)}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 mt-0.5">
                          <p className="text-[6px] sm:text-[8px] text-slate-400 font-bold uppercase">{v.gender === 'Female' ? 'মহিলা' : 'পুরুষ'}</p>
                          <div className="flex items-center space-x-1">
                            <span className="text-[6px] text-slate-200 hidden sm:inline">•</span>
                            <p className="text-[6px] text-slate-500 font-bold font-mono">{v.birthDate || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 py-2 sm:px-4 sm:py-2.5">
                    <p className="text-[7px] sm:text-[10px] text-slate-600 font-medium truncate">{cleanText(v.fatherName)}</p>
                    <p className="text-[6px] sm:text-[8px] text-slate-400 truncate">{cleanText(v.motherName) || '-'}</p>
                  </td>
                  <td className="px-1 py-2 sm:px-4 sm:py-2.5 hidden sm:table-cell">
                    <p className="text-[7px] sm:text-[10px] text-slate-500 font-mono font-bold truncate">{v.birthDate || '-'}</p>
                  </td>
                  <td className="px-1 py-2 sm:px-4 sm:py-2.5">
                    <p className="text-[7px] sm:text-[10px] text-slate-900 font-mono font-black truncate">{v.voterNumber || '-'}</p>
                  </td>
                  {isAdmin && (
                    <td className="px-1 py-2 sm:px-4 sm:py-2.5">
                      <div className="flex items-center justify-center space-x-0.5 sm:space-x-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditingVoter(v); setEditData(v); }} className="p-0.5 sm:p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={10}/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id, v.name); }} className="p-0.5 sm:p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={10}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {visibleCount < filteredVoters.length && (
        <div className="mt-6 flex justify-center">
          <button onClick={() => setVisibleCount(v => v + 50)} className="bg-white border border-slate-200 px-6 py-2 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
            আরও লোড করুন
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedVoter && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedVoter(null)}>
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
             <div className="relative h-24 bg-slate-900">
                <button onClick={() => setSelectedVoter(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10">
                   <X size={20}/>
                </button>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                   <img src={selectedVoter.photoUrl} className="h-24 w-24 rounded-3xl object-cover border-4 border-white shadow-xl bg-slate-100" alt="" />
                </div>
             </div>
             
             <div className="pt-14 pb-8 px-6 text-center">
                <h3 className="text-xl font-black text-slate-900">{cleanText(selectedVoter.name)}</h3>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">সিরিয়াল নং: {selectedVoter.slNo}</p>
                
                <div className="mt-8 space-y-4 text-left">
                   <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl">
                      <User size={16} className="text-slate-400" />
                      <div>
                         <p className="text-[8px] font-black text-slate-400 uppercase">পিতার নাম</p>
                         <p className="text-sm font-bold text-slate-700">{cleanText(selectedVoter.fatherName)}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl">
                      <Users size={16} className="text-slate-400" />
                      <div>
                         <p className="text-[8px] font-black text-slate-400 uppercase">মাতার নাম</p>
                         <p className="text-sm font-bold text-slate-700">{cleanText(selectedVoter.motherName) || 'তথ্য নেই'}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl">
                         <Calendar size={16} className="text-slate-400" />
                         <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">জন্ম তারিখ</p>
                            <p className="text-sm font-bold text-slate-700 font-mono">{selectedVoter.birthDate || '-'}</p>
                         </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl">
                         <Info size={16} className="text-slate-400" />
                         <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase">লিঙ্গ</p>
                            <p className="text-sm font-bold text-slate-700">{selectedVoter.gender === 'Female' ? 'মহিলা' : 'পুরুষ'}</p>
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center space-x-3 p-4 bg-slate-900 rounded-2xl text-white">
                      <CreditCard size={20} className="text-emerald-400" />
                      <div>
                         <p className="text-[8px] font-black text-white/50 uppercase">ভোটার আইডি (NID)</p>
                         <p className="text-base font-black font-mono tracking-wider">{selectedVoter.voterNumber || 'প্রদান করা হয়নি'}</p>
                      </div>
                   </div>
                </div>
                
                <button onClick={() => setSelectedVoter(null)} className="mt-6 w-full py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                   বন্ধ করুন
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVoter && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-100">
             <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
                <h3 className="font-black text-xs uppercase tracking-widest">তথ্য সংশোধন</h3>
                <button onClick={() => setEditingVoter(null)}><X size={18}/></button>
             </div>
             <form onSubmit={handleUpdate} className="p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div className="sm:col-span-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">নাম</label>
                      <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">পিতার নাম</label>
                      <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold" value={editData.fatherName} onChange={e => setEditData({...editData, fatherName: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">মাতার নাম</label>
                      <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold" value={editData.motherName} onChange={e => setEditData({...editData, motherName: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">জন্ম তারিখ</label>
                      <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold font-mono" placeholder="DD/MM/YYYY" value={editData.birthDate} onChange={e => setEditData({...editData, birthDate: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">সিরিয়াল</label>
                      <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold" value={editData.slNo} onChange={e => setEditData({...editData, slNo: e.target.value})} />
                   </div>
                   <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">ভোটার আইডি</label>
                      <input className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold font-mono" value={editData.voterNumber} onChange={e => setEditData({...editData, voterNumber: e.target.value})} />
                   </div>
                </div>
                <div className="flex space-x-2 pt-3">
                   <button type="button" onClick={() => setEditingVoter(null)} className="flex-1 py-2 bg-slate-100 text-slate-500 rounded-lg font-black text-[9px] uppercase">বাতিল</button>
                   <button type="submit" disabled={isUpdating} className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-black text-[9px] uppercase hover:bg-slate-800 transition-all">
                      {isUpdating ? 'আপডেট...' : 'সেভ করুন'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
