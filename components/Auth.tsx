
import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { db, storage, auth } from '../firebase';
import { UserProfile } from '../types';
import { Camera, LogIn, UserPlus, Phone, Lock, User as UserIcon, Upload, AlertCircle, RefreshCw, ShieldCheck, HelpCircle } from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  // Function to compress image to Base64 (Fallback if Storage fails)
  const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300; // Small size for database efficiency
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
          resolve(dataUrl);
        };
      };
    });
  };

  const withTimeout = async (promise: Promise<any>, timeoutMs: number, errorMessage: string) => {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    );
    return Promise.race([promise, timeout]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    const cleanPass = password.trim();

    setLoading(true);
    setError('');

    try {
      await withTimeout(signInAnonymously(auth), 8000, "Connection timeout.");
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', cleanPhone), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('এই মোবাইল নাম্বারটি নিবন্ধিত নয়।');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile;

      if (userData.password !== cleanPass) {
        setError('পাসওয়ার্ড সঠিক নয়!');
        setLoading(false);
        return;
      }

      if (userData.status === 'pending' && userData.role !== 'admin') {
        setError('অ্যাকাউন্টটি এখনো এপ্রুভ করা হয়নি।');
        setLoading(false);
        return;
      }

      onLoginSuccess({ ...userData, id: userDoc.id });
    } catch (err: any) {
      setError("লগইন ব্যর্থ হয়েছে। ইন্টারনেট চেক করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    
    if (!photo) {
      setError('আপনার ছবি আপলোড করা বাধ্যতামূলক!');
      return;
    }

    setLoading(true);
    setError('');
    setUploadStatus('সংযোগে চেষ্টা করা হচ্ছে...');

    try {
      await withTimeout(signInAnonymously(auth), 8000, "Auth timeout.");

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', cleanPhone), limit(1));
      const checkSnapshot = await getDocs(q);
      
      if (!checkSnapshot.empty) {
        setError('এই মোবাইল নাম্বারটি ইতিপূর্বে ব্যবহার করা হয়েছে।');
        setLoading(false);
        return;
      }

      const allUsersSnapshot = await getDocs(query(usersRef, limit(1)));
      const isFirstUser = allUsersSnapshot.empty;

      // Photo Handling - Smart Fallback Strategy
      let finalPhotoUrl = '';
      try {
        setUploadStatus('ক্লাউড স্টোরেজে আপলোড চেষ্টা করা হচ্ছে...');
        const photoRef = ref(storage, `profiles/${cleanPhone}_${Date.now()}`);
        const uploadResult = await withTimeout(uploadBytes(photoRef, photo), 5000, "Storage Blocked");
        finalPhotoUrl = await getDownloadURL(uploadResult.ref);
      } catch (storageErr) {
        console.warn("Storage blocked or Card needed. Switching to Database storage mode...");
        setUploadStatus('ভিসা কার্ড নেই? সমস্যা নেই! ব্যাকআপ মোডে সেভ হচ্ছে...');
        finalPhotoUrl = await compressImageToBase64(photo);
      }

      // Save to Firestore
      const newUser: Omit<UserProfile, 'id'> = {
        name: name.trim(),
        fatherName: fatherName.trim(),
        occupation: occupation.trim(),
        phone: cleanPhone,
        password: password.trim(),
        photoUrl: finalPhotoUrl,
        role: isFirstUser ? 'admin' : 'user',
        status: isFirstUser ? 'active' : 'pending',
        createdAt: Date.now()
      };

      await addDoc(usersRef, newUser);
      
      alert(isFirstUser ? 'অভিনন্দন! আপনি প্রথম সদস্য হিসেবে সরাসরি এডমিন একসেস পেয়েছেন।' : 'রেজিস্ট্রেশন সফল! এডমিন এপ্রুভালের জন্য অপেক্ষা করুন।');
      setIsLogin(true);
      setUploadStatus('');
    } catch (err: any) {
      setError("রেজিস্ট্রেশন সম্পন্ন করা সম্ভব হয়নি।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-800 flex flex-col items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/20">
        <div className="bg-green-600 p-8 text-center text-white relative">
          <div className="inline-block p-4 bg-white/10 rounded-3xl mb-4 backdrop-blur-sm">
            <UserIcon size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">শ্রীদাসগাতী গ্রাম পোর্টাল</h1>
          <p className="text-green-100 mt-2 text-sm italic">"আমাদের গ্রাম আমাদের গর্ব"</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded flex items-start space-x-3">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {isLogin ? (
              <>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input
                    type="tel"
                    placeholder="মোবাইল নাম্বার"
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input
                    type="password"
                    placeholder="পাসওয়ার্ড"
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-green-50 shadow-inner bg-gray-100 flex items-center justify-center">
                      {previewUrl ? (
                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <Camera className="text-gray-300" size={32} />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 bg-green-600 p-2 rounded-xl text-white shadow-lg cursor-pointer">
                      <Upload size={16} />
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                    </label>
                  </div>
                  <span className="mt-3 text-[10px] text-gray-400 font-bold uppercase">পাসপোর্ট সাইজ ছবি দিন</span>
                </div>

                <input type="text" placeholder="আপনার নাম" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl" value={name} onChange={(e) => setName(e.target.value)} required />
                <input type="text" placeholder="পিতার নাম" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl" value={fatherName} onChange={(e) => setFatherName(e.target.value)} required />
                <input type="text" placeholder="আপনার পেশা" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl" value={occupation} onChange={(e) => setOccupation(e.target.value)} required />
                <input type="tel" placeholder="মোবাইল নাম্বার" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <input type="password" placeholder="পাসওয়ার্ড তৈরি করুন" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg flex flex-col items-center justify-center ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mb-1"></div>
                  <span className="text-[10px] font-normal">{uploadStatus}</span>
                </>
              ) : isLogin ? "লগইন করুন" : "রেজিস্ট্রেশন সম্পন্ন করুন"}
            </button>
            
            {/* Help text for password issues - added as per user request */}
            {isLogin && (
              <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start space-x-3">
                <HelpCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                  আপনার পাসওয়ার্ড পরিবর্তন করতে চাইলে কিংবা ভুলে গেলে 
                  <a href="tel:01307085310" className="mx-1 font-black underline decoration-2">01307085310</a> 
                  এই নাম্বারে যোগাযোগ করবেন।
                </p>
              </div>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-green-600 font-bold">
              {isLogin ? 'নতুন মেম্বার হতে চান? রেজিস্ট্রেশন করুন' : 'ইতিমধ্যে একাউন্ট আছে? লগইন করুন'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex items-center space-x-2 text-white/50 text-[10px] font-bold uppercase tracking-widest">
        <ShieldCheck size={12} />
        <span>Base64 Smart Storage Protection Enabled</span>
      </div>
    </div>
  );
};
