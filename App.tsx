
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  ShieldCheck, 
  LayoutGrid, 
  X,
  Menu as MenuIcon,
  ChevronRight,
  CreditCard,
  LogOut,
  Wand2,
  LogIn,
  Users,
  Bell,
  ArrowRight,
  Info,
  MapPin,
  Calendar,
  Activity,
  Phone
} from 'lucide-react';
import { 
  doc, 
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs
} from '@firebase/firestore';
import { db } from './firebase';
import { UserProfile } from './types';

// Components
import { AuthView } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { VoterList } from './components/VoterList';
import { CorrectionPage } from './components/CorrectionPage';

const GUEST_USER: UserProfile = {
  id: 'guest',
  name: 'ভিজিটর',
  phone: '00000000000',
  role: 'user',
  status: 'active',
  occupation: 'সাধারণ ভিজিটর',
  photoUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  fatherName: 'N/A',
  createdAt: Date.now()
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home'); 
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [voterCount, setVoterCount] = useState(0);
  
  const handleLogout = async () => {
    if (user?.id && user.id !== 'guest') {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { isOnline: false, lastSeen: Date.now() }).catch(console.error);
    }
    localStorage.removeItem('sridasgati_user');
    setUser(null);
    setActiveTab('home');
    setIsSidebarOpen(false);
  };

  const navigateTo = (tab: string) => {
    if ((tab === 'admin' || tab === 'correction') && (!user || user.role !== 'admin')) {
      setShowAuth(true);
      setIsSidebarOpen(false);
      return;
    }
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(collection(db, 'voters'), where('status', '==', 'active'));
        const snap = await getDocs(q);
        setVoterCount(snap.size);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();

    const savedUser = localStorage.getItem('sridasgati_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const userRef = doc(db, 'users', parsedUser.id);
        const unsubUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            if (userData.status === 'active' || userData.role === 'admin') {
              setUser({ ...userData, id: docSnap.id });
            } else {
              handleLogout();
            }
          } else {
            handleLogout();
          }
          setLoading(false);
        }, (err) => {
          setLoading(false);
        });
        return () => unsubUser();
      } catch (e) {
        localStorage.removeItem('sridasgati_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (showAuth) {
    return (
      <div className="relative">
        <button 
          onClick={() => setShowAuth(false)} 
          className="fixed top-6 right-6 z-[110] bg-white p-3 rounded-full shadow-xl text-slate-900 hover:bg-slate-50 transition-all active:scale-95"
        >
          <X size={24} />
        </button>
        <AuthView onLoginSuccess={(u) => {
          setUser(u);
          localStorage.setItem('sridasgati_user', JSON.stringify(u));
          setShowAuth(false);
          setActiveTab('home');
        }} />
      </div>
    );
  }

  const currentUser = user || GUEST_USER;

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return (
        <div className="animate-in fade-in duration-700">
          {/* Hero Section - Clean & High Contrast */}
          <section className="bg-slate-900 pt-20 pb-16 px-6 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                 <div className="bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
                   Official Village Portal
                 </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
                শ্রীদাসগাতী <br/> ডিজিটাল প্ল্যাটফর্ম
              </h1>
              <p className="text-slate-400 text-base md:text-lg font-medium max-w-xl mx-auto leading-relaxed mb-10">
                আমাদের গ্রামের সকল প্রশাসনিক ও সামাজিক তথ্য এখন এক জায়গায়। ভোটার তথ্য থেকে শুরু করে জরুরি যোগাযোগ—সবই হাতের মুঠোয়।
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => navigateTo('voters')}
                  className="w-full sm:w-auto bg-emerald-500 text-slate-900 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95"
                >
                  ভোটার তালিকা দেখুন
                </button>
                {!user && (
                  <button 
                    onClick={() => setShowAuth(true)}
                    className="w-full sm:w-auto bg-transparent border border-white/20 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                  >
                    অ্যাডমিন পোর্টাল
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Minimal Stats Row (No Cards) */}
          <section className="border-y border-slate-100 bg-white overflow-x-auto no-scrollbar">
            <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between min-w-[600px]">
              <StatEntry label="ভোটার" value={voterCount} icon={<CreditCard size={18} className="text-slate-400" />} />
              <div className="w-px h-10 bg-slate-100"></div>
              <StatEntry label="সদস্য" value="১৮৫০+" icon={<Users size={18} className="text-slate-400" />} />
              <div className="w-px h-10 bg-slate-100"></div>
              <StatEntry label="পোস্ট কোড" value="6700" icon={<MapPin size={18} className="text-slate-400" />} />
              <div className="w-px h-10 bg-slate-100"></div>
              <StatEntry label="স্ট্যাটাস" value="লাইভ" icon={<Activity size={18} className="text-emerald-500" />} />
            </div>
          </section>

          {/* List-Based Services (No Cards) */}
          <section className="max-w-4xl mx-auto py-16 px-6">
            <div className="mb-12">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Service Menu</h3>
               <h2 className="text-3xl font-black text-slate-900">ডিজিটাল সেবা ও টুলস</h2>
            </div>
            
            <div className="divide-y divide-slate-100">
              <ServiceListItem 
                onClick={() => navigateTo('voters')}
                icon={<CreditCard size={24} className="text-slate-900" />}
                title="ভোটার তালিকা অনুসন্ধান"
                desc="সম্পূর্ণ ভোটার ডাটাবেস এবং এনআইডি ভেরিফিকেশন টুল।"
              />
              {currentUser.role === 'admin' && (
                <>
                  <ServiceListItem 
                    onClick={() => navigateTo('correction')}
                    icon={<Wand2 size={24} className="text-slate-900" />}
                    title="ডাটা কারেকশন প্যানেল"
                    desc="ভাঙ্গা ফন্ট এবং নামের বানান এআই দিয়ে সংশোধন করুন।"
                  />
                  <ServiceListItem 
                    onClick={() => navigateTo('admin')}
                    icon={<ShieldCheck size={24} className="text-slate-900" />}
                    title="অ্যাডমিন ড্যাশবোর্ড"
                    desc="সিস্টেম সিকিউরিটি এবং ইউজার ম্যানেজমেন্ট।"
                  />
                </>
              )}
              <ServiceListItem 
                onClick={() => alert('শীঘ্রই আসছে...')}
                icon={<Bell size={24} className="text-slate-900" />}
                title="গ্রামের জরুরি নোটিশ"
                desc="গুরুত্বপূর্ণ ঘোষণা এবং নোটিশ বোর্ড দেখুন।"
              />
              <ServiceListItem 
                onClick={() => window.location.href='tel:01307085310'}
                icon={<Phone size={24} className="text-slate-900" />}
                title="হেল্পলাইন ও সাপোর্ট"
                desc="যেকোনো প্রয়োজনে সরাসরি অ্যাডমিনের সাথে কথা বলুন।"
              />
            </div>
          </section>

          {/* Minimal Footer Footer */}
          <footer className="max-w-4xl mx-auto py-12 px-6 border-t border-slate-100 text-center">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mb-4">Official Village System &copy; 2025</p>
             <div className="flex justify-center space-x-6 text-slate-400 font-bold text-xs">
                <button className="hover:text-slate-900 transition-colors">Privacy</button>
                <button className="hover:text-slate-900 transition-colors">Terms</button>
                <button className="hover:text-slate-900 transition-colors">Contact</button>
             </div>
          </footer>
        </div>
      );
      // Fixed: Removed non-existent onMessageClick prop from VoterList component usage to resolve type error on line 261.
      case 'voters': return <div className="p-4 pb-24"><VoterList currentUser={currentUser} /></div>;
      case 'correction': return <div className="p-4 pb-24"><CorrectionPage currentUser={currentUser} /></div>;
      case 'admin': return <div className="p-4 pb-24"><AdminPanel /></div>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sidebar Overlay */}
      <div 
        className={`fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div 
          className={`absolute top-0 left-0 bottom-0 w-[280px] bg-white transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 border-b border-slate-50">
             <div className="bg-slate-900 h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-xl mb-6 shadow-lg shadow-slate-200">শ্রী</div>
             <h2 className="font-black text-xl text-slate-900">শ্রীদাসগাতী পোর্টাল</h2>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Village Management System</p>
          </div>
          
          <div className="p-6">
            <nav className="space-y-1">
              <SidebarLink active={activeTab === 'home'} onClick={() => navigateTo('home')} label="হোম পেজ" icon={<Home size={20} />} />
              <SidebarLink active={activeTab === 'voters'} onClick={() => navigateTo('voters')} label="ভোটার তালিকা" icon={<CreditCard size={20} />} />
              {currentUser.role === 'admin' && (
                <>
                  <SidebarLink active={activeTab === 'correction'} onClick={() => navigateTo('correction')} label="তথ্য সংশোধনী" icon={<Wand2 size={20} />} />
                  <SidebarLink active={activeTab === 'admin'} onClick={() => navigateTo('admin')} label="অ্যাডমিন প্যানেল" icon={<ShieldCheck size={20} />} />
                </>
              )}
            </nav>
            
            <div className="mt-10 pt-6 border-t border-slate-50">
               {user ? (
                 <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-4 text-rose-500 font-black hover:bg-rose-50 rounded-2xl transition-all">
                   <LogOut size={20} /> <span>লগআউট করুন</span>
                 </button>
               ) : (
                 <button onClick={() => setShowAuth(true)} className="w-full flex items-center space-x-3 px-4 py-4 text-slate-900 font-black hover:bg-slate-50 rounded-2xl transition-all">
                   <LogIn size={20} /> <span>অ্যাডমিন লগইন</span>
                 </button>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white sticky top-0 z-50 border-b border-slate-100 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
           <div className="flex items-center space-x-6">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-slate-50 rounded-xl transition-colors">
                <MenuIcon size={24} className="text-slate-900" />
              </button>
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigateTo('home')}>
                <div className="bg-slate-900 text-white h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm">শ্রী</div>
                <h1 className="font-black text-lg text-slate-900 tracking-tight hidden sm:block">শ্রীদাসগাতী পোর্টাল</h1>
              </div>
           </div>
           
           <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-6 text-sm font-black text-slate-400 uppercase tracking-widest">
                 <button onClick={() => navigateTo('home')} className={`${activeTab === 'home' ? 'text-slate-900' : 'hover:text-slate-600'}`}>Home</button>
                 <button onClick={() => navigateTo('voters')} className={`${activeTab === 'voters' ? 'text-slate-900' : 'hover:text-slate-600'}`}>Voters</button>
              </div>
              <img src={currentUser.photoUrl} className="h-9 w-9 rounded-full object-cover border border-slate-100 shadow-sm" alt="" />
           </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-1">{renderContent()}</main>

      {/* Mobile Bottom Tab Bar (No Cards) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around py-4 z-[90]">
        <TabButton active={activeTab === 'home'} onClick={() => navigateTo('home')} icon={<Home size={22} />} label="Home" />
        <TabButton active={activeTab === 'voters'} onClick={() => navigateTo('voters')} icon={<CreditCard size={22} />} label="Voters" />
        {currentUser.role === 'admin' ? (
          <TabButton active={activeTab === 'admin'} onClick={() => navigateTo('admin')} icon={<ShieldCheck size={22} />} label="Admin" />
        ) : (
          <TabButton active={false} onClick={() => setShowAuth(true)} icon={<LogIn size={22} />} label="Login" />
        )}
      </div>
    </div>
  );
};

// UI Components (Minimalist, No Cards)

const StatEntry: React.FC<{ label: string, value: string | number, icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center space-x-4">
     <div className="bg-slate-50 p-2.5 rounded-xl">{icon}</div>
     <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
     </div>
  </div>
);

const ServiceListItem: React.FC<{ onClick: () => void, icon: React.ReactNode, title: string, desc: string }> = ({ onClick, icon, title, desc }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between py-8 group transition-all">
    <div className="flex items-center space-x-8 min-w-0">
       <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all">
          {icon}
       </div>
       <div className="text-left min-w-0">
          <h4 className="font-black text-slate-900 text-lg md:text-xl group-hover:translate-x-1 transition-transform">{title}</h4>
          <p className="text-slate-400 text-sm font-medium mt-1 truncate max-w-sm">{desc}</p>
       </div>
    </div>
    <div className="ml-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
       <ArrowRight size={24} className="text-slate-900" />
    </div>
  </button>
);

const SidebarLink: React.FC<{ active: boolean, onClick: () => void, label: string, icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-4 py-4 rounded-2xl transition-all ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
     <span className={`${active ? 'text-emerald-400' : 'text-slate-400'}`}>{icon}</span>
     <span className="text-sm font-black">{label}</span>
  </button>
);

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-1/3 transition-all ${active ? 'text-slate-900' : 'text-slate-300'}`}>
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest mt-1.5">{label}</span>
  </button>
);

export default App;
