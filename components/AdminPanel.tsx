
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  addDoc,
  writeBatch,
  limit
} from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  UserCheck, 
  UserX, 
  Trash2, 
  RefreshCw,
  Search,
  Users,
  UserPlus,
  Upload,
  X,
  Info,
  Database,
  FileText
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

const parseVoterText = (text: string) => {
  // Split by double newline or specific patterns to get individual records
  const blocks = text.split(/\n\s*\n/);
  const results: any[] = [];

  blocks.forEach(block => {
    if (!block.trim()) return;
    const lines = block.split('\n');
    const voter: any = { 
      status: 'active', 
      createdAt: Date.now(),
      photoUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    };
    
    // Try to find slNo if first line is just a number
    if (/^\d+$/.test(lines[0].trim())) {
      voter.slNo = lines[0].trim();
    }

    lines.forEach(line => {
      const l = line.trim();
      if (l.includes('নাম:')) voter.name = l.split('নাম:')[1].trim();
      else if (l.includes('পিতা:')) voter.fatherName = l.split('পিতা:')[1].trim();
      else if (l.includes('মাতা:')) voter.motherName = l.split('মাতা:')[1].trim();
      else if (l.includes('ভোটার নং:')) voter.voterNumber = l.split('ভোটার নং:')[1].trim();
      else if (l.includes('জন্ম তারিখ:')) voter.birthDate = l.split('জন্ম তারিখ:')[1].trim();
      else if (l.includes('পেশা:')) voter.occupation = l.split('পেশা:')[1].trim();
    });

    if (voter.name) {
      voter.name = cleanText(voter.name);
      voter.fatherName = cleanText(voter.fatherName || '');
      voter.motherName = cleanText(voter.motherName || '');
      voter.occupation = cleanText(voter.occupation || 'ভোটার');
      voter.gender = (voter.name.includes('মোছাঃ') || voter.name.includes('মোসাঃ')) ? 'Female' : 'Male';
      results.push(voter);
    }
  });

  return results;
};

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'voters'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [voters, setVoters] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showVoterModal, setShowVoterModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const [newVoter, setNewVoter] = useState({
    name: '', fatherName: '', motherName: '', birthDate: '', 
    voterNumber: '', slNo: '', gender: 'Male', photoUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
  });

  useEffect(() => {
    setLoading(true);
    let unsubUsers: any;
    let unsubVoters: any;

    if (activeTab === 'users') {
      const q = query(collection(db, 'users'));
      unsubUsers = onSnapshot(q, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile)));
        setLoading(false);
      });
    } else {
      const q = query(collection(db, 'voters'), where('status', '==', 'active'), limit(500));
      unsubVoters = onSnapshot(q, (snapshot) => {
        setVoters(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        setLoading(false);
      });
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubVoters) unsubVoters();
    };
  }, [activeTab]);

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

  const handleDeleteVoter = async (id: string, name: string) => {
    if (window.confirm(`${cleanText(name)}-কে ভোটার তালিকা থেকে মুছে ফেলতে চান?`)) {
      await deleteDoc(doc(db, 'voters', id));
    }
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) return;
    setIsImporting(true);
    try {
      let data: any[] = [];
      
      // Try JSON first
      try {
        const parsed = JSON.parse(bulkData);
        data = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // If JSON fails, try Text Parsing
        data = parseVoterText(bulkData);
      }

      if (data.length === 0) throw new Error('কোন তথ্য খুঁজে পাওয়া যায়নি।');
      
      const batchSize = 400;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = data.slice(i, i + batchSize);
        
        chunk.forEach((item) => {
          const voterRef = doc(collection(db, 'voters'));
          batch.set(voterRef, {
            ...item,
            name: cleanText(item.name || ''),
            fatherName: cleanText(item.fatherName || ''),
            motherName: cleanText(item.motherName || ''),
            status: 'active',
            createdAt: Date.now()
          });
        });
        await batch.commit();
      }
      
      alert(`${data.length} জন ভোটারের তথ্য সফলভাবে যুক্ত হয়েছে।`);
      setBulkData('');
      setShowBulkModal(false);
    } catch (err: any) {
      alert('ইমপোর্ট ব্যর্থ হয়েছে। সঠিক ফরম্যাটে ডাটা দিন। Error: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'voters'), {
        ...newVoter,
        name: cleanText(newVoter.name),
        fatherName: cleanText(newVoter.fatherName),
        motherName: cleanText(newVoter.motherName),
        status: 'active',
        createdAt: Date.now()
      });
      setShowVoterModal(false);
      setNewVoter({
        name: '', fatherName: '', motherName: '', birthDate: '', 
        voterNumber: '', slNo: '', gender: 'Male', photoUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
      });
    } catch (err) {
      alert('ভোটার যোগ করা সম্ভব হয়নি।');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone.includes(searchTerm)
  );

  const filteredVoters = voters.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.slNo === searchTerm || 
    v.voterNumber === searchTerm
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 md:py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">সিস্টেম ম্যানেজমেন্ট</h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Admin Control Center</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
           <button 
             onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             ইউজার ম্যানেজমেন্ট
           </button>
           <button 
             onClick={() => { setActiveTab('voters'); setSearchTerm(''); }}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'voters' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
             ভোটার ম্যানেজমেন্ট
           </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={activeTab === 'users' ? "নাম বা মোবাইল দিয়ে খুঁজুন..." : "নাম, আইডি বা সিরিয়াল দিয়ে খুঁজুন..."}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-900 transition-all font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {activeTab === 'voters' && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowVoterModal(true)}
              className="bg-slate-900 text-white px-5 py-3 rounded-xl flex items-center space-x-2 font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
            >
              <UserPlus size={16} /> <span>নতুন ভোটার</span>
            </button>
            <button 
              onClick={() => setShowBulkModal(true)}
              className="bg-emerald-600 text-white px-5 py-3 rounded-xl flex items-center space-x-2 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Upload size={16} /> <span>বাল্ক ইমপোর্ট</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><RefreshCw className="animate-spin text-slate-300" size={32} /></div>
      ) : activeTab === 'users' ? (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">ইউজার তথ্য</th>
                  <th className="px-6 py-4">মোবাইল</th>
                  <th className="px-6 py-4">রোল</th>
                  <th className="px-6 py-4">স্ট্যাটাস</th>
                  <th className="px-6 py-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img src={u.photoUrl} className="h-10 w-10 rounded-lg object-cover bg-slate-100" alt="" />
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{u.occupation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-slate-500 font-mono">{u.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${u.role === 'admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-500'}`}>
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
                           <button onClick={() => handleUpdateStatus(u.id, 'active')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Approve"><UserCheck size={18}/></button>
                         ) : (
                           <button onClick={() => handleUpdateStatus(u.id, 'pending')} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Suspend"><UserX size={18}/></button>
                         )}
                         <button onClick={() => handleDeleteUser(u.id, u.name)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4 text-center w-20">সিরিয়াল</th>
                  <th className="px-6 py-4">ভোটারের নাম</th>
                  <th className="px-6 py-4">পিতা/মাতা</th>
                  <th className="px-6 py-4">ভোটার আইডি (NID)</th>
                  <th className="px-6 py-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredVoters.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-center text-sm font-black text-slate-400">{v.slNo}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img src={v.photoUrl} className="h-10 w-10 rounded-lg object-cover bg-slate-100" alt="" />
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{cleanText(v.name)}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{v.gender === 'Female' ? 'মহিলা' : 'পুরুষ'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-600">{cleanText(v.fatherName)}</p>
                      <p className="text-[10px] text-slate-400">{cleanText(v.motherName) || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-slate-900 font-mono tracking-tighter">{v.voterNumber || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                         <button onClick={() => handleDeleteVoter(v.id, v.name)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
                <div>
                   <h3 className="font-black text-sm uppercase tracking-widest flex items-center">
                     <Upload size={18} className="mr-2" /> স্মার্ট ভোটার ইমপোর্ট
                   </h3>
                   <p className="text-[10px] text-emerald-100 mt-1">JSON অথবা সরাসরি টেক্সট পেস্ট করুন</p>
                </div>
                <button onClick={() => setShowBulkModal(false)} className="hover:bg-white/20 p-2 rounded-xl"><X size={20}/></button>
             </div>
             <div className="p-6">
                <div className="bg-amber-50 p-4 rounded-2xl mb-4 border border-amber-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex space-x-2">
                      <FileText size={16} className="text-amber-600 shrink-0" />
                      <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                         <span className="block text-amber-900 uppercase tracking-tighter mb-0.5">টেক্সট ফরম্যাট:</span>
                         নাম: [নাম]<br/>পিতা: [পিতার নাম]<br/>ভোটার নং: [নাম্বার]
                      </p>
                   </div>
                   <div className="flex space-x-2 border-l border-amber-200 pl-4">
                      <Database size={16} className="text-amber-600 shrink-0" />
                      <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                         <span className="block text-amber-900 uppercase tracking-tighter mb-0.5">JSON ফরম্যাট:</span>
                         [ {"{ \"slNo\": \"1\", \"name\": \"...\" }"} ]
                      </p>
                   </div>
                </div>
                <textarea 
                  className="w-full h-64 bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-[11px] focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="এখানে তথ্য পেস্ট করুন..."
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                />
                <div className="mt-6 flex space-x-3">
                   <button onClick={() => setShowBulkModal(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">বাতিল</button>
                   <button 
                     disabled={isImporting || !bulkData.trim()}
                     onClick={handleBulkImport}
                     className="flex-[2] py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center space-x-2"
                   >
                     {isImporting ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />}
                     <span>{isImporting ? 'ইমপোর্ট হচ্ছে...' : 'ইমপোর্ট শুরু করুন'}</span>
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Single Voter Modal */}
      {showVoterModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                <h3 className="font-black text-sm uppercase tracking-widest flex items-center">
                  <UserPlus size={18} className="mr-2" /> নতুন ভোটার তথ্য
                </h3>
                <button onClick={() => setShowVoterModal(false)} className="hover:bg-white/20 p-2 rounded-xl"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddVoter} className="p-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ভোটারের নাম</label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={newVoter.name} onChange={e => setNewVoter({...newVoter, name: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">পিতার নাম</label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={newVoter.fatherName} onChange={e => setNewVoter({...newVoter, fatherName: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">মাতার নাম</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={newVoter.motherName} onChange={e => setNewVoter({...newVoter, motherName: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">সিরিয়াল নং</label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={newVoter.slNo} onChange={e => setNewVoter({...newVoter, slNo: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ভোটার আইডি (NID)</label>
                      <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold font-mono" value={newVoter.voterNumber} onChange={e => setNewVoter({...newVoter, voterNumber: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">জন্ম তারিখ</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold font-mono" placeholder="DD/MM/YYYY" value={newVoter.birthDate} onChange={e => setNewVoter({...newVoter, birthDate: e.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">লিঙ্গ</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold appearance-none" value={newVoter.gender} onChange={e => setNewVoter({...newVoter, gender: e.target.value})}>
                         <option value="Male">পুরুষ</option>
                         <option value="Female">মহিলা</option>
                      </select>
                   </div>
                </div>
                <div className="mt-8 flex space-x-3">
                   <button type="button" onClick={() => setShowVoterModal(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">বাতিল</button>
                   <button type="submit" className="flex-1 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">সেভ করুন</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
