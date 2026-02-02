
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, limit } from '@firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { 
  Search, 
  RefreshCw,
  Wand2,
  Save,
  CheckCircle2,
  AlertTriangle,
  ChevronRight
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

export const CorrectionPage: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [voters, setVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'voters'), where('status', '==', 'active'), limit(2000));
    const unsub = onSnapshot(q, (snapshot) => {
      setVoters(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const hasArtifacts = (text: string) => /[ĺĨęĽŌŽñĥńİÏŘýঁ]/.test(text || "");

  const errorVoters = voters.filter(v => {
    const s = searchTerm.toLowerCase().trim();
    const hasError = hasArtifacts(v.name) || hasArtifacts(v.fatherName);
    if (!s) return hasError;
    return hasError && v.name.toLowerCase().includes(s);
  });

  const handleFix = async (voter: any) => {
    setIsUpdating(voter.id);
    try {
      await updateDoc(doc(db, 'voters', voter.id), {
        name: cleanText(voter.name),
        fatherName: cleanText(voter.fatherName),
        motherName: cleanText(voter.motherName || ''),
        occupation: cleanText(voter.occupation || 'ভোটার')
      });
    } catch (err) {
      alert('Fix failed.');
    } finally {
      setIsUpdating(null);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><RefreshCw className="animate-spin text-slate-300" size={32} /></div>;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-2">ডাটা কারেকশন প্যানেল</h2>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Automatic Text Fixer</p>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl mb-8 flex items-center space-x-4">
         <div className="bg-amber-500 text-white p-3 rounded-xl"><AlertTriangle size={24}/></div>
         <div>
            <p className="font-black text-slate-800 text-sm">ত্রুটি শনাক্তকরণ টুল</p>
            <p className="text-xs text-amber-700 font-medium">নিচের তালিকায় শুধুমাত্র সেই ভোটারদের নাম দেখানো হচ্ছে যাদের তথ্যে ভাঙা ফন্ট (Broken Artifacts) পাওয়া গেছে।</p>
         </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="ত্রুটিযুক্ত নাম খুঁজুন..." 
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
                <th className="px-6 py-4 text-center">SL</th>
                <th className="px-6 py-4">মূল নাম (Broken)</th>
                <th className="px-6 py-4 text-center"><ChevronRight size={14}/></th>
                <th className="px-6 py-4">সংশোধিত নাম (Suggested)</th>
                <th className="px-6 py-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {errorVoters.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{v.slNo}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-rose-500 line-through opacity-60">{v.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">পিতা: {v.fatherName}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-300">
                    <ChevronRight size={20} />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-emerald-600">{cleanText(v.name)}</p>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">পিতা: {cleanText(v.fatherName)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button 
                        onClick={() => handleFix(v)}
                        disabled={isUpdating === v.id}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200"
                      >
                        {isUpdating === v.id ? 'Fixing...' : 'Quick Fix'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {errorVoters.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
           <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4 opacity-20" />
           <p className="text-slate-400 font-black text-sm">সব তথ্য সঠিক আছে! কোনো ত্রুটি পাওয়া যায়নি।</p>
        </div>
      )}
    </div>
  );
};
