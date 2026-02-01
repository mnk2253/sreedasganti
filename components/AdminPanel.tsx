
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, addDoc, getDocs, where, limit, writeBatch } from '@firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile, Post } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  ShieldCheck, 
  Trash2,
  Megaphone, 
  Edit2,
  X,
  RefreshCw,
  UserPlus,
  Camera,
  Upload,
  CreditCard,
  Save,
  FileText,
  AlertTriangle,
  Zap,
  Check,
  Search,
  Calendar,
  User,
  Hash
} from 'lucide-react';

// Utility to convert Bengali digits to English
const bnToEn = (str: string) => {
  if (!str) return "";
  const digits: { [key: string]: string } = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (d) => digits[d]);
};

// Advanced utility to fix corrupted Bengali characters from EC/Election Commission fonts
const cleanEcText = (text: string) => {
  if (!text) return "";
  return text
    // Specific fixes for the user's provided broken text format
    .replace(/Ïমাছাঃ/g, 'মোছাঃ')
    .replace(/Ïমাঃ/g, 'মোঃ')
    .replace(/Ïভাটার নং/g, 'ভোটার নং')
    .replace(/Ïভাটার/g, 'ভোটার')
    .replace(/িপতা/g, 'পিতা')
    .replace(/Ïপশা/g, 'পেশা')
    .replace(/জĥ তািরখ/g, 'জন্ম তারিখ')
    .replace(/জĥ/g, 'জন্ম')
    .replace(/ńর/g, 'নম্বর')
    .replace(/ń/g, 'ম্ব')
    .replace(/ƃ/g, 'ফু')
    .replace(/ę/g, 'দ্রি')
    .replace(/Ľ/g, 'ব্রা')
    .replace(/Ɓ/g, 'রু')
    .replace(/Ř/g, 'শ')
    .replace(/s/g, 'নূ')
    .replace(/ƣ/g, 'কু')
    .replace(/Ɔ/g, 'জ')
    .replace(/Ž/g, 'ঘ')
    .replace(/ê/g, 'ঙ্গ')
    .replace(/õ/g, 'জ্জ')
    .replace(/ē/g, 'ত্ত')
    .replace(/Ō/g, 'ল্লা')
    .replace(/ƀ/g, 'সু')
    .replace(/ı/g, 'প্ত')
    .replace(/İ/g, 'প্ত')
    .replace(/Ň/g, 'ম্ম')
    .replace(/Ñ/g, 'ক্ক')
    .replace(/å/g, 'গ্র')
    .replace(/Î/g, 'র্')
    .replace(/Ë/g, 'ব্য')
    .replace(/į/g, 'ন্য')
    .replace(/ý/g, 'ঞ্জ')
    .replace(/Ģ/g, 'ন্ত')
    .replace(/Ï/g, 'ো') 
    .replace(/িঠকানা/g, 'ঠিকানা')
    .replace(/তািলকা/g, 'তালিকা')
    .replace(/\s+/g, ' '); // Collapse newlines and multiple spaces for regex stability
};

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddMember, setShowAddMember] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  const [newMemberData, setNewMemberData] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    birthDate: '',
    occupation: '',
    phone: '',
    password: '',
    voterNumber: '',
    slNo: ''
  });
  const [newMemberPhoto, setNewMemberPhoto] = useState<File | null>(null);
  const [newMemberPreview, setNewMemberPreview] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [detectedVoters, setDetectedVoters] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPassInput, setNewPassInput] = useState('');
  const [editingVoterUserId, setEditingVoterUserId] = useState<string | null>(null);
  const [tempVoterNumber, setTempVoterNumber] = useState('');
  const [newNotice, setNewNotice] = useState('');
  const [isPublishingNotice, setIsPublishingNotice] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile)));
      setLoading(false);
    });

    const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Post)));
    });

    return () => {
      unsubUsers();
      unsubPosts();
    };
  }, []);

  const handleDetectVoters = () => {
    if (!bulkText.trim()) return;

    // Clean broken characters and collapse spaces
    const sanitizedInput = cleanEcText(bulkText);
    
    // Improved Regex to capture SL No, Name, Voter ID, Father, Mother, and Birth Date
    // Format: SlNo. নাম: ... ভোটার নং: ... পিতা: ... মাতা: ... পেশা: ..., জন্ম তারিখ: ...
    const voterPattern = /([০-৯0-9]+)\.?\s*নাম\s*:\s*(.*?)\s*ভোটার নং\s*:\s*([০-৯0-9]+)\s*পিতা\s*:\s*(.*?)\s*মাতা\s*:\s*(.*?)\s*পেশা\s*:\s*(.*?)\s*,?\s*জন্ম তারিখ\s*:\s*([০-৯0-9\/\-]+)/gs;
    
    const results = [];
    let match;
    
    while ((match = voterPattern.exec(sanitizedInput)) !== null) {
      results.push({
        slNo: match[1].trim(),
        name: match[2].trim(),
        voterNumber: bnToEn(match[3].trim()),
        fatherName: match[4].trim(),
        motherName: match[5].trim(),
        occupation: match[6].trim(),
        birthDate: bnToEn(match[7].trim())
      });
    }

    setDetectedVoters(results);
    if (results.length === 0) {
      alert('দুঃখিত! এই টেক্সট থেকে কোনো তথ্য শনাক্ত করা যায়নি। অনুগ্রহ করে ফরম্যাট চেক করুন।');
    }
  };

  const handleBulkSave = async () => {
    if (detectedVoters.length === 0 || isImporting) return;
    if (loading) return;

    if (!window.confirm(`${detectedVoters.length} জন ভোটার শনাক্ত করা হয়েছে। এদের ডাটাবেসে সেভ করতে চান?`)) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: detectedVoters.length });

    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const voter of detectedVoters) {
        if (!voter.voterNumber) continue;

        const dummyPhone = `V-${voter.voterNumber}`;
        const alreadyExists = users.some(u => u.voterNumber === voter.voterNumber || u.phone === dummyPhone);
        
        if (!alreadyExists) {
          const newDocRef = doc(collection(db, 'users'));
          batch.set(newDocRef, {
            name: voter.name,
            fatherName: voter.fatherName,
            motherName: voter.motherName,
            birthDate: voter.birthDate,
            occupation: voter.occupation,
            voterNumber: voter.voterNumber,
            slNo: voter.slNo,
            phone: dummyPhone,
            password: '123456', 
            photoUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            role: 'user',
            status: 'active',
            createdAt: Date.now()
          });
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
        alert(`সফলভাবে ${count} জন ভোটার সেভ করা হয়েছে।`);
      } else {
        alert('সব ভোটার ইতিপূর্বেই ডাটাবেসে রয়েছে।');
      }

      setBulkText('');
      setDetectedVoters([]);
      setShowBulkImport(false);
    } catch (err) {
      console.error(err);
      alert('সেভ করার সময় ত্রুটি হয়েছে।');
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAddingMember) return;
    
    const { name, fatherName, motherName, birthDate, occupation, phone, password, voterNumber, slNo } = newMemberData;
    if (!name || !phone || !password || !newMemberPhoto) {
      alert('সব তথ্য প্রদান করুন।');
      return;
    }

    setIsAddingMember(true);
    try {
      const q = query(collection(db, 'users'), where('phone', '==', phone.trim()), limit(1));
      const checkSnap = await getDocs(q);
      if (!checkSnap.empty) {
        alert('মোবাইল নাম্বারটি ইতিপূর্বে ব্যবহার করা হয়েছে।');
        setIsAddingMember(false);
        return;
      }

      let photoUrl = '';
      try {
        const photoRef = ref(storage, `profiles/${phone.trim()}_${Date.now()}`);
        const res = await uploadBytes(photoRef, newMemberPhoto);
        photoUrl = await getDownloadURL(res.ref);
      } catch (err) {
        const reader = new FileReader();
        photoUrl = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(newMemberPhoto);
        });
      }

      await addDoc(collection(db, 'users'), {
        name: name.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        birthDate: birthDate.trim(),
        occupation: occupation.trim(),
        phone: phone.trim(),
        password: password.trim(),
        voterNumber: voterNumber.trim(),
        slNo: slNo.trim(),
        photoUrl,
        role: 'user',
        status: 'active',
        createdAt: Date.now()
      });

      alert('সফলভাবে সদস্য যুক্ত হয়েছে।');
      setShowAddMember(false);
      setNewMemberData({ name: '', fatherName: '', motherName: '', birthDate: '', occupation: '', phone: '', password: '', voterNumber: '', slNo: '' });
      setNewMemberPhoto(null);
      setNewMemberPreview('');
    } catch (err) {
      alert('ত্রুটি হয়েছে।');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.trim() || isPublishingNotice) return;
    setIsPublishingNotice(true);
    try {
      const savedUser = localStorage.getItem('sridasgati_user');
      const adminData = savedUser ? JSON.parse(savedUser) : null;
      await addDoc(collection(db, 'posts'), {
        userId: adminData?.id || 'admin',
        userName: adminData?.name || 'অ্যাডমিন',
        userPhoto: adminData?.photoUrl || '',
        userRole: 'admin',
        content: newNotice.trim(),
        likes: [],
        comments: [],
        createdAt: Date.now(),
        status: 'active',
        isNotice: true
      });
      setNewNotice('');
      alert('নোটিশ পাবলিশ হয়েছে।');
    } catch (err) {
      alert('ব্যর্থ হয়েছে।');
    } finally {
      setIsPublishingNotice(false);
    }
  };

  const handleUpdateVoterNumber = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { voterNumber: tempVoterNumber.trim() });
    setEditingVoterUserId(null);
  };

  const handleUpdatePassword = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), { password: newPassInput.trim() });
    setEditingPasswordUserId(null);
  };

  const handleStatusChange = async (userId: string, newStatus: UserProfile['status']) => {
    await updateDoc(doc(db, 'users', userId), { status: newStatus });
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই ইউজারকে মুছে ফেলতে চান?')) await deleteDoc(doc(db, 'users', userId));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewMemberPhoto(file);
      setNewMemberPreview(URL.createObjectURL(file));
    }
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status !== 'pending');

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <ShieldCheck className="mr-2 text-amber-500" /> অ্যাডমিন ড্যাশবোর্ড
          </h2>
          <div className="flex space-x-2">
             <button 
                onClick={() => { setShowBulkImport(true); setDetectedVoters([]); }}
                className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all"
              >
                <Zap size={18} />
                <span className="hidden sm:inline">বাল্ক ভোটার আপলোড</span>
              </button>
              <button 
                onClick={() => setShowAddMember(true)}
                className="bg-green-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
              >
                <UserPlus size={20} />
                <span>সদস্য যোগ</span>
              </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
            <p className="text-amber-800 text-[9px] font-black uppercase">পেন্ডিং</p>
            <p className="text-2xl font-black text-amber-600">{pendingUsers.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
            <p className="text-green-800 text-[9px] font-black uppercase">সদস্য</p>
            <p className="text-2xl font-black text-green-600">{activeUsers.length}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
            <p className="text-blue-800 text-[9px] font-black uppercase">পোস্ট</p>
            <p className="text-2xl font-black text-blue-600">{posts.length}</p>
          </div>
        </div>
      </div>

      {showBulkImport && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center"><Zap className="mr-2" /> EC PDF ইম্পোর্ট টুল (v4.0)</h3>
              <button onClick={() => setShowBulkImport(false)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[85vh] no-scrollbar">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start space-x-3">
                <AlertTriangle className="text-indigo-600 shrink-0" size={20} />
                <div className="text-xs text-indigo-800 space-y-1">
                   <p className="font-bold text-indigo-900">Sl No. এবং মোছাঃ (Ïমাছাঃ) ফন্ট ফিক্স মোড সক্রিয়।</p>
                   <p>টেক্সট পেস্ট করে "তথ্য শনাক্ত করুন" বাটনে ক্লিক করুন।</p>
                </div>
              </div>

              <div className="space-y-4">
                <textarea 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none h-40 resize-none"
                  placeholder="পিডিএফ থেকে কপি করা টেক্সট এখানে পেস্ট করুন..."
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  disabled={isImporting}
                />
                
                <button 
                  onClick={handleDetectVoters}
                  disabled={!bulkText.trim() || isImporting}
                  className="w-full bg-indigo-100 text-indigo-700 py-3.5 rounded-2xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Search size={18} />
                  <span>তথ্য শনাক্ত করুন ও ফন্ট ঠিক করুন</span>
                </button>
              </div>

              {detectedVoters.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="font-bold text-gray-700 text-sm flex items-center">
                      <CheckCircle className="text-green-500 mr-2" size={16} /> 
                      শনাক্তকৃত তালিকা ({detectedVoters.length} জন)
                    </h4>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-x-auto shadow-inner">
                    <table className="w-full text-[11px] text-left min-w-[900px]">
                      <thead className="bg-indigo-50 border-b border-indigo-100 text-indigo-700 uppercase tracking-tighter">
                        <tr>
                          <th className="px-4 py-3">Sl নং</th>
                          <th className="px-4 py-3">নাম</th>
                          <th className="px-4 py-3">ভোটার আইডি (ID No)</th>
                          <th className="px-4 py-3">পিতা</th>
                          <th className="px-4 py-3">মাতা</th>
                          <th className="px-4 py-3">জন্ম তারিখ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detectedVoters.map((v, i) => (
                          <tr key={i} className="hover:bg-white transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-gray-400">{v.slNo}</td>
                            <td className="px-4 py-3 font-bold text-gray-800">{v.name}</td>
                            <td className="px-4 py-3 font-mono font-bold text-indigo-600 bg-indigo-50/30">{v.voterNumber}</td>
                            <td className="px-4 py-3 text-gray-600">{v.fatherName}</td>
                            <td className="px-4 py-3 text-gray-600">{v.motherName}</td>
                            <td className="px-4 py-3 font-mono text-gray-600">{v.birthDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {isImporting ? (
                    <div className="space-y-2 py-4">
                      <div className="flex justify-between text-xs font-bold text-indigo-600 px-2">
                        <span>ডাটাবেসে সেভ হচ্ছে...</span>
                        <span>{importProgress.current} / {importProgress.total}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-300" 
                          style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={handleBulkSave}
                      className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-green-100 flex items-center justify-center space-x-2 active:scale-95 transition-all"
                    >
                      <Save size={20} />
                      <span>সবগুলো ডাটাবেসে সেভ করুন</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-green-600 p-6 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center"><UserPlus className="mr-2" /> ম্যানুয়াল সদস্য যোগ</h3>
              <button onClick={() => setShowAddMember(false)} className="hover:bg-white/10 p-1 rounded-full"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="flex flex-col items-center mb-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-100 flex items-center justify-center">
                    {newMemberPreview ? (
                      <img src={newMemberPreview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <Camera className="text-gray-300" size={32} />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-green-600 p-2 rounded-xl text-white shadow-lg cursor-pointer hover:bg-green-700 transition-colors">
                    <Upload size={16} />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                  </label>
                </div>
                <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">ছবি আপলোড করুন</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputGroup label="পূর্ণ নাম" value={newMemberData.name} onChange={v => setNewMemberData({...newMemberData, name: v})} placeholder="নাম লিখুন" />
                <InputGroup label="পিতার নাম" value={newMemberData.fatherName} onChange={v => setNewMemberData({...newMemberData, fatherName: v})} placeholder="পিতার নাম" />
                <InputGroup label="মাতার নাম" value={newMemberData.motherName} onChange={v => setNewMemberData({...newMemberData, motherName: v})} placeholder="মাতার নাম" />
                <InputGroup label="জন্ম তারিখ" value={newMemberData.birthDate} onChange={v => setNewMemberData({...newMemberData, birthDate: v})} placeholder="DD/MM/YYYY" />
                <InputGroup label="পেশা" value={newMemberData.occupation} onChange={v => setNewMemberData({...newMemberData, occupation: v})} placeholder="পেশা" />
                <InputGroup label="মোবাইল নাম্বার" value={newMemberData.phone} onChange={v => setNewMemberData({...newMemberData, phone: v})} placeholder="01XXX-XXXXXX" type="tel" />
                <InputGroup label="পাসওয়ার্ড" value={newMemberData.password} onChange={v => setNewMemberData({...newMemberData, password: v})} placeholder="ডিফল্ট পাসওয়ার্ড" />
                <InputGroup label="ভোটার নাম্বার" value={newMemberData.voterNumber} onChange={v => setNewMemberData({...newMemberData, voterNumber: v})} placeholder="Voter ID No" />
                <InputGroup label="ক্রমিক নং (SL)" value={newMemberData.slNo} onChange={v => setNewMemberData({...newMemberData, slNo: v})} placeholder="PDF Sl No" />
              </div>

              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setShowAddMember(false)} className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-bold active:scale-95 transition-all">বাতিল</button>
                <button type="submit" disabled={isAddingMember} className="flex-2 bg-green-600 text-white py-3.5 px-8 rounded-2xl font-bold shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50">
                  {isAddingMember ? <RefreshCw className="animate-spin" size={18} /> : <><Save size={18} /> <span>সদস্য যোগ করুন</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Notice Control */}
      <div className="bg-orange-600 p-6 rounded-[32px] shadow-lg text-white">
        <h3 className="font-bold mb-4 flex items-center"><Megaphone className="mr-2" size={20} /> নতুন নোটিশ</h3>
        <form onSubmit={handleCreateNotice} className="space-y-4">
          <textarea
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder:text-white/60 text-sm outline-none resize-none"
            rows={3}
            value={newNotice}
            onChange={(e) => setNewNotice(e.target.value)}
          />
          <button type="submit" disabled={isPublishingNotice} className="w-full bg-white text-orange-600 py-3.5 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">
            {isPublishingNotice ? 'পাবলিশ হচ্ছে...' : 'পাবলিশ করুন'}
          </button>
        </form>
      </div>

      {/* Pending Members */}
      {pendingUsers.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 px-2 flex items-center">
            <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
            অপেক্ষমান সদস্য ({pendingUsers.length})
          </h3>
          <div className="space-y-3">
            {pendingUsers.map(user => (
              <div key={user.id} className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={user.photoUrl} className="h-10 w-10 rounded-xl object-cover" />
                  <p className="font-bold text-gray-800">{user.name}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleStatusChange(user.id, 'active')} className="bg-green-600 text-white p-2 rounded-lg"><CheckCircle size={18}/></button>
                  <button onClick={() => handleDeleteUser(user.id)} className="bg-red-50 text-red-600 p-2 rounded-lg"><XCircle size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Management Table */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-800 px-2 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          সদস্য ম্যানেজমেন্ট ({activeUsers.length})
        </h3>
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">সদস্য</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">ভোটার আইডি</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">পাসওয়ার্ড</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeUsers.map(user => {
                const isPassVisible = revealedPasswords[user.id];
                const isEditingVoter = editingVoterUserId === user.id;
                const isEditingPass = editingPasswordUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <img src={user.photoUrl} className="h-8 w-8 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-bold text-gray-800">{user.name}</p>
                        <p className="text-[9px] text-gray-400 font-bold">{user.phone}</p>
                        {user.slNo && <p className="text-[8px] text-indigo-500 font-black">SL: {user.slNo}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isEditingVoter ? (
                        <div className="flex items-center space-x-1">
                          <input className="bg-gray-50 border rounded px-2 py-1 text-xs w-28" value={tempVoterNumber} onChange={e => setTempVoterNumber(e.target.value)} />
                          <button onClick={() => handleUpdateVoterNumber(user.id)} className="text-green-600"><CheckCircle size={14}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 group">
                          <span className="text-xs text-gray-600 font-bold">{user.voterNumber || 'নেই'}</span>
                          <button onClick={() => { setEditingVoterUserId(user.id); setTempVoterNumber(user.voterNumber || ''); }} className="opacity-0 group-hover:opacity-100 text-gray-300"><Edit2 size={12}/></button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditingPass ? (
                        <div className="flex items-center space-x-1">
                          <input className="bg-gray-50 border rounded px-2 py-1 text-xs w-20" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} />
                          <button onClick={() => handleUpdatePassword(user.id)} className="text-green-600"><CheckCircle size={14}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-gray-400">{isPassVisible ? user.password : '••••'}</span>
                          <button onClick={() => setRevealedPasswords({...revealedPasswords, [user.id]: !isPassVisible})} className="text-gray-300">
                            {isPassVisible ? <EyeOff size={14}/> : <Eye size={14}/>}
                          </button>
                          <button onClick={() => { setEditingPasswordUserId(user.id); setNewPassInput(user.password || ''); }} className="text-gray-300"><Edit2 size={12}/></button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeleteUser(user.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, value, onChange, placeholder, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} 
      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);
