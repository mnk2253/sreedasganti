
export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'active' | 'hidden';

export interface UserProfile {
  id: string;
  name: string;
  fatherName: string;
  occupation: string;
  phone: string;
  password?: string;
  photoUrl: string;
  role: UserRole;
  status: UserStatus;
  createdAt: number;
  isOnline?: boolean;
  lastSeen?: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  category: string;
  iconName: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  userRole?: UserRole;
  content: string;
  imageUrl?: string;
  likes: string[]; // Array of user IDs
  comments: Comment[];
  createdAt: number;
  status?: 'active' | 'deactive';
  isNotice?: boolean; // New field for admin announcements
}

export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: number;
  replies?: CommentReply[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string; // If undefined, it's a group chat
  text: string;
  createdAt: number;
}
