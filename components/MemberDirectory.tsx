
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { Search, Phone, MessageSquare, Briefcase, User as UserIcon, Copy, Check, Bell, Clock } from 'lucide-react';

interface MemberDirectoryProps {
  currentUser: UserProfile;
  onMessageClick: (member: UserProfile) => void;
  unreadCounts: { [key: string]: number };
}

export const MemberDirectory: React.FC<MemberDirectoryProps> = ({ currentUser, onMessageClick, unreadCounts }) => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as UserProfile))
        .filter(m => m.id !== currentUser.id)
      );
    });
    return unsubscribe;
  }, [currentUser.id]);

  const handleCopy = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'অজানা';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'এইমাত্র';
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    return `${days} দিন আগে`;
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.phone.includes(searchTerm) ||
    m.occupation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="সদস্য খুঁজুন (নাম, নাম্বার বা পেশা)..."
          className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredMembers.map(member => {
          const unreadCount = unreadCounts[member.id] || 0;
          const isOnline = member.isOnline;
          
          return (
            <div key={member.id} className={`bg-white rounded-2xl shadow-sm p-4 border flex items-start space-x-4 transition-all hover:shadow-md relative ${unreadCount > 0 ? 'border-orange-200 bg-orange-50/10' : 'border-gray-100'}`}>
              
              {unreadCount > 0 && (
                <div className="absolute top-3 right-3 flex items-center space-x-1 bg-red-500 text-white px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                  <Bell size={10} fill="currentColor" />
                  <span className="text-[10px] font-black">{unreadCount}</span>
                </div>
              )}

              <div className="relative flex-shrink-0">
                <img 
                  src={member.photoUrl} 
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover shadow-sm border border-gray-50" 
                  alt={member.name} 
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}>
                  {isOnline && <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-bold text-lg truncate ${unreadCount > 0 ? 'text-orange-700' : 'text-gray-800'}`}>
                    {member.name}
                  </h3>
                  {isOnline && (
                    <span className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-green-200 uppercase tracking-widest animate-pulse">সক্রিয়</span>
                  )}
                </div>
                
                {isOnline ? (
                  <p className="text-[10px] text-green-600 font-black uppercase tracking-widest flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                    Online
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center">
                    <Clock size={10} className="mr-1" />
                    Last seen: {formatLastSeen(member.lastSeen)}
                  </p>
                )}

                <p className="text-[11px] text-gray-500 flex items-center mt-1 truncate">
                  <UserIcon size={12} className="mr-1 inline flex-shrink-0" /> পিতা: {member.fatherName}
                </p>
                <p className="text-[11px] text-gray-600 font-medium flex items-center mt-0.5 truncate">
                  <Briefcase size={12} className="mr-1 inline text-green-600 flex-shrink-0" /> {member.occupation}
                </p>
                
                <div className="mt-2 flex items-center">
                  <div className="bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 flex items-center group cursor-pointer" onClick={() => handleCopy(member.phone, member.id)}>
                     <Phone size={10} className="mr-1.5 text-green-600" />
                     <span className="text-xs font-black text-gray-700 font-mono tracking-wider">{member.phone}</span>
                     <button className="ml-3 text-gray-400 group-hover:text-green-600 transition-colors">
                       {copiedId === member.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                     </button>
                  </div>
                </div>
                
                <div className="flex space-x-2 mt-3">
                  <a href={`tel:${member.phone}`} className="flex-1 bg-green-50 text-green-700 py-1.5 px-3 rounded-lg font-bold text-[10px] flex items-center justify-center space-x-1 hover:bg-green-100 uppercase tracking-wider">
                    <Phone size={12} />
                    <span>কল</span>
                  </a>
                  <button 
                    onClick={() => onMessageClick(member)}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-[10px] flex items-center justify-center space-x-1 uppercase tracking-wider transition-all ${unreadCount > 0 ? 'bg-orange-600 text-white shadow-md scale-105' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                  >
                    <MessageSquare size={12} fill={unreadCount > 0 ? "currentColor" : "none"} />
                    <span>{unreadCount > 0 ? 'মেসেজ দেখুন' : 'মেসেজ'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400">কোন সদস্য পাওয়া যায়নি।</p>
        </div>
      )}
    </div>
  );
};
