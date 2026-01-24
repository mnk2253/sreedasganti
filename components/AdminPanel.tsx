
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy, addDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Post } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  ShieldCheck, 
  Database, 
  Activity,
  Image as ImageIcon,
  Trash2,
  MessageSquare,
  Clock,
  Key,
  Lock,
  RefreshCw,
  UserCheck,
  UserMinus,
  AlertTriangle,
  Megaphone,
  Send,
  Edit2,
  Save,
  X
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Edit Post/Notice states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [isUpdatingPost, setIsUpdatingPost] = useState(false);

  // Quick Notice states
  const [newNotice, setNewNotice] = useState('');
  const [isPublishingNotice, setIsPublishingNotice] = useState(false);

  useEffect(() => {
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile)));
    });

    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Post)));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubPosts();
    };
  }, []);

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
      alert('নোটিশটি সফলভাবে পাবলিশ করা হয়েছে।');
    } catch (err) {
      alert('নোটিশ পাবলিশ করতে সমস্যা হয়েছে।');
    } finally {
      setIsPublishingNotice(false);
    }
  };

  const handleUpdatePostContent = async (postId: string) => {
    if (!editPostContent.trim()) return;
    setIsUpdatingPost(true);
    try {
      await updateDoc(doc(db, 'posts', postId), {
        content: editPostContent.trim()
      });
      setEditingPostId(null);
      setEditPostContent('');
      alert('তথ্যটি সফলভাবে আপডেট করা হয়েছে।');
    } catch (err) {
      alert('আপডেট করা সম্ভব হয়নি।');
    } finally {
      setIsUpdatingPost(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: UserProfile['status']) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
    } catch (err) {
      alert('স্ট্যাটাস পরিবর্তন সফল হয়নি।');
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (window.confirm(`আপনি কি নিশ্চিত যে এই সদস্যকে ${newRole === 'admin' ? 'অ্যাডমিন' : 'ইউজার'} পদবীতে পরিবর্তন করতে চান?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
      } catch (err) {
        alert('পদবী পরিবর্তন সফল হয়নি।');
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই মেম্বারকে ডিলিট করতে চান?')) {
      await deleteDoc(doc(db, 'users', userId));
    }
  };

  const handleUpdatePassword = async (userId: string) => {
    if (!newPassword.trim()) return;
    if (window.confirm('আপনি কি নিশ্চিত যে এই মেম্বারের পাসওয়ার্ড পরিবর্তন করতে চান?')) {
      try {
        await updateDoc(doc(db, 'users', userId), { password: newPassword.trim() });
        setEditingPasswordUserId(null);
        setNewPassword('');
        alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
      } catch (err) {
        alert('পাসওয়ার্ড পরিবর্তন করা সম্ভব হয়নি।');
      }
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleTogglePostStatus = async (postId: string, currentStatus?: 'active' | 'deactive') => {
    const newStatus = currentStatus === 'deactive' ? 'active' : 'deactive';
    try {
      await updateDoc(doc(db, 'posts', postId), { status: newStatus });
    } catch (err) {
      alert('পোস্টের স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এটি চিরতরে মুছে ফেলতে চান?')) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
      } catch (err) {
        alert('মুছে ফেলা সম্ভব হয়নি।');
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status !== 'pending');

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Stats */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <ShieldCheck className="mr-2 text-amber-500" /> অ্যাডমিন ড্যাশবোর্ড
          </h2>
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <Activity size={14} className="text-green-600 animate-pulse" />
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-tight">অ্যাডমিন মোড সক্রিয়</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 transition-all hover:shadow-md">
            <p className="text-amber-800 text-[10px] font-black uppercase tracking-widest">পেন্ডিং সদস্য</p>
            <p className="text-3xl font-black text-amber-600 mt-2">{pendingUsers.length}</p>
          </div>
          <div className="bg-green-50 p-5 rounded-2xl border border-green-100 transition-all hover:shadow-md">
            <p className="text-green-800 text-[10px] font-black uppercase tracking-widest">মোট সদস্য</p>
            <p className="text-3xl font-black text-green-600 mt-2">{activeUsers.length}</p>
          </div>
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 transition-all hover:shadow-md">
            <p className="text-blue-800 text-[10px] font-black uppercase tracking-widest">মোট পোস্ট</p>
            <p className="text-3xl font-black text-blue-600 mt-2">{posts.length}</p>
          </div>
        </div>
      </div>

      {/* Quick Notice Control */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-[32px] shadow-lg border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-black text-lg flex items-center uppercase tracking-wide">
            <Megaphone size={20} className="mr-2 animate-bounce" /> নতুন নোটিশ দিন
          </h3>
          <span className="bg-white/20 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-white/10">Banner Control</span>
        </div>
        <form onSubmit={handleCreateNotice} className="space-y-4">
          <textarea
            placeholder="গুরুত্বপূর্ণ তথ্য এখানে লিখুন। এটি হোম পেজের নোটিশ বোর্ড এবং স্ক্রলিং ব্যানার উভয় জায়গায় দেখা যাবে।"
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder:text-white/60 text-sm outline-none focus:ring-2 focus:ring-white/30 resize-none font-medium"
            rows={3}
            value={newNotice}
            onChange={(e) => setNewNotice(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newNotice.trim() || isPublishingNotice}
            className="w-full bg-white text-orange-600 py-3.5 rounded-2xl font-black text-sm shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            {isPublishingNotice ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
            ) : (
              <>
                <Send size={18} />
                <span>পাবলিশ করুন</span>
              </>
            )}
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
              <div key={user.id} className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={user.photoUrl} className="h-12 w-12 rounded-xl object-cover border border-gray-100" alt="" />
                  <div>
                    <h4 className="font-bold text-gray-800 leading-none">{user.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{user.phone}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleStatusChange(user.id, 'active')} className="bg-green-600 text-white p-2.5 rounded-xl hover:bg-green-700 shadow-md transition-all"><CheckCircle size={20} /></button>
                  <button onClick={() => handleDeleteUser(user.id)} className="bg-red-50 text-red-600 p-2.5 rounded-xl hover:bg-red-100 transition-colors"><XCircle size={20} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts & Notices Management Table */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-800 px-2 flex items-center">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
          পোস্ট এবং নোটিশ ম্যানেজমেন্ট ({posts.length})
        </h3>
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">টাইপ / লেখক</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ (এডিটযোগ্য)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts.map(post => {
                  const isDeactive = post.status === 'deactive';
                  const isEditing = editingPostId === post.id;
                  
                  return (
                    <tr key={post.id} className={`hover:bg-gray-50/50 transition-colors group ${isDeactive ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img src={post.userPhoto} className="h-10 w-10 rounded-xl object-cover border border-gray-100 shadow-sm" alt="" />
                          <div>
                            <div className="flex items-center space-x-1">
                               <p className="font-bold text-gray-800 text-sm leading-none">{post.userName}</p>
                               {post.isNotice && <Megaphone size={12} className="text-amber-500" />}
                            </div>
                            <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{formatTime(post.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                             <textarea 
                               className="w-full bg-white border border-green-300 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-green-100 resize-none"
                               value={editPostContent}
                               rows={2}
                               onChange={(e) => setEditPostContent(e.target.value)}
                             />
                             <div className="flex flex-col space-y-1">
                               <button 
                                 onClick={() => handleUpdatePostContent(post.id)}
                                 disabled={isUpdatingPost}
                                 className="bg-green-600 text-white p-1.5 rounded-lg hover:bg-green-700 shadow-sm"
                               >
                                 {isUpdatingPost ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                               </button>
                               <button 
                                 onClick={() => { setEditingPostId(null); setEditPostContent(''); }}
                                 className="bg-gray-200 text-gray-600 p-1.5 rounded-lg hover:bg-gray-300"
                               >
                                 <X size={14} />
                               </button>
                             </div>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {post.isNotice && (
                              <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-amber-200 w-fit mb-1">OFFICIAL NOTICE</span>
                            )}
                            <p className="text-xs text-gray-600 line-clamp-2 max-w-sm font-medium leading-relaxed">{post.content}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-1">
                          {!isEditing && (
                            <button 
                              onClick={() => {
                                setEditingPostId(post.id);
                                setEditPostContent(post.content);
                              }}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                              title="এডিট করুন"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleTogglePostStatus(post.id, post.status)}
                            className={`p-2 rounded-xl transition-all ${!isDeactive ? 'text-gray-400 hover:text-amber-500 hover:bg-amber-50' : 'text-amber-500 bg-amber-50'}`}
                            title={!isDeactive ? 'হাইড করুন' : 'পাবলিক করুন'}
                          >
                            {isDeactive ? <Eye size={18} /> : <EyeOff size={18} />}
                          </button>
                          <button 
                            onClick={() => handleDeletePost(post.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="মুছুন"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-800 px-2 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          সদস্য কন্ট্রোল এবং পাসওয়ার্ড ম্যানেজমেন্ট ({activeUsers.length})
        </h3>
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">সদস্য</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">পদবী</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">পাসওয়ার্ড</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeUsers.map(user => {
                  const isPasswordVisible = revealedPasswords[user.id];
                  const isEditingPass = editingPasswordUserId === user.id;
                  const isAdmin = user.role === 'admin';
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img src={user.photoUrl} className="h-10 w-10 rounded-full object-cover border border-gray-100" alt="" />
                          <div>
                            <p className="font-bold text-gray-800 text-sm leading-none">{user.name}</p>
                            <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">{user.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${isAdmin ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {isAdmin ? 'অ্যাডমিন' : 'মেম্বার'}
                          </span>
                          <button onClick={() => handleRoleChange(user.id, user.role)} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors">
                            {isAdmin ? <UserMinus size={14} /> : <UserCheck size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isEditingPass ? (
                          <div className="flex items-center space-x-1">
                            <input 
                              type="text" 
                              className="bg-gray-50 border border-green-200 rounded px-2 py-1 text-xs w-24 outline-none"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button onClick={() => handleUpdatePassword(user.id)} className="text-green-600"><CheckCircle size={14} /></button>
                            <button onClick={() => setEditingPasswordUserId(null)} className="text-red-400"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                             <span className="font-mono text-xs font-bold text-gray-400 tracking-widest">{isPasswordVisible ? user.password : '••••••'}</span>
                             <button onClick={() => togglePasswordVisibility(user.id)} className="text-gray-300 hover:text-green-600">{isPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                             <button onClick={() => { setEditingPasswordUserId(user.id); setNewPassword(user.password || ''); }} className="text-gray-300 hover:text-amber-500"><Edit2 size={12} /></button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-gray-400 hover:text-red-500 bg-white border border-gray-100 rounded-xl transition-all shadow-sm">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
