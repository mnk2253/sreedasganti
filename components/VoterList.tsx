
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, limit } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  Search, 
  Edit2, 
  Trash2, 
  RefreshCw,
  X
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
    const searchable = `${v.name} ${v.voterNumber} ${v.slNo} ${v.fatherName}`.toLowerCase();
    return searchable.includes(s) && (genderFilter === 'All' || v.gender === genderFilter);
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
            placeholder="নাম বা সিরিয়াল..." 
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
                <th className="px-1 py-2 sm:px-4 sm:py-3 text-center w-[8%]">SL</th>
                <th className="px-1 py-2 sm:px-4 sm:py-3 w-[25%]">নাম ও তথ্য</th>
                <th className="px-1 py-2 sm:px-4 sm:py-3 w-[15%]">মাতা</th>
                <th className="px-1 py-2 sm:px-4 sm:py-3 w-[15%]">পিতা</th>
                <th className="px-1 py-2 sm:px-4 sm:py-3 w-[14%]">জন্ম</th>
                <th className="px-1 py-2 sm:px-4 sm:py-3 w-[15%]">আইডি</th>
                {isAdmin && <th className="px-1 py-2 sm:px-4 sm:py-3 text-center w-[8%]">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVoters.slice(0, visibleCount).map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-1 py-1.5 sm:px-4 sm:py-2.5 text-center">
                    <span className="text-[7px] sm:text-[10px] font-black text-slate-400">{v.slNo}</span>
                  </td>
                  <td className="px-1 py-1.5 sm:px-4 sm:py-2.5">
                    <div className="flex items-center space-x-1 sm:space-x-2.5">
                      <img src={v.photoUrl} className="h-5 w-5 sm:h-8 sm:w-8 rounded-md object-cover bg-slate-100 border border-slate-200 flex-shrink-0" alt="" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-[8px] sm:text-[11px] leading-tight truncate">{cleanText(v.name)}</p>
                        <p className="text-[6px] sm:text-[8px] text-slate-400 font-bold uppercase">{v.gender === 'Female' ? 'মহিলা' : 'পুরুষ'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 py-1.5 sm:px-4 sm:py-2.5">
                    <p className="text-[7px] sm:text-[10px] text-slate-600 font-medium truncate">{cleanText(v.motherName) || '-'}</p>
                  </td>
                  <td className="px-1 py-1.5 sm:px-4 sm:py-2.5">
                    <p className="text-[7px] sm:text-[10px] text-slate-600 font-medium truncate">{cleanText(v.fatherName)}</p>
                  </td>
                  <td className="px-1 py-1.5 sm:px-4 sm:py-2.5">
                    <p className="text-[7px] sm:text-[10px] text-slate-500 font-mono font-bold truncate">{v.birthDate || '-'}</p>
                  </td>
                  <td className="px-1 py-1.5 sm:px-4 sm:py-2.5">
                    <p className="text-[7px] sm:text-[10px] text-slate-900 font-mono font-black truncate">{v.voterNumber || '-'}</p>
                  </td>
                  {isAdmin && (
                    <td className="px-1 py-1.5 sm:px-4 sm:py-2.5">
                      <div className="flex items-center justify-center space-x-0.5 sm:space-x-1">
                        <button onClick={() => { setEditingVoter(v); setEditData(v); }} className="p-0.5 sm:p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={10}/></button>
                        <button onClick={() => handleDelete(v.id, v.name)} className="p-0.5 sm:p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={10}/></button>
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
