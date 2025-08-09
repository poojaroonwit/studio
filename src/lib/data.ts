import type { Candidate, Position, UserProfile } from './types';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs for mock data

export const mockPositions: Position[] = [
  { id: 'pos1', title: 'Software Engineer', department: 'Engineering', isOpen: true, description: 'Develops and maintains software applications.' },
  { id: 'pos2', title: 'Product Manager', department: 'Product', isOpen: true, description: 'Manages product lifecycle from ideation to launch.' },
  { id: 'pos3', title: 'UX Designer', department: 'Design', isOpen: false, description: 'Creates user-centered design solutions.' },
  { id: 'pos4', title: 'Data Analyst', department: 'Analytics', isOpen: true, description: 'Analyzes data to provide actionable insights.' },
];

// mockAppUsers is now primarily used by the CredentialsProvider in NextAuth for initial mock login.
// The user management UI and APIs now interact with the PostgreSQL database.
// You might want to seed your database "User" table with an initial admin if you remove this.
export let mockAppUsers: UserProfile[] = [
  {
    id: 'user1', // This ID is for mock data, DB uses UUID
    name: 'Jane Recruiter',
    email: 'jane.recruiter@fitscan.com',
    password: 'password', // Plaintext for mock - DO NOT DO THIS IN PRODUCTION
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: 'profile woman',
    role: 'Recruiter',
  },
  {
    id: 'user2',
    name: 'Admin User',
    email: 'admin@fitscan.com',
    password: 'password', // Plaintext for mock - DO NOT DO THIS IN PRODUCTION
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: 'profile person',
    role: 'Admin',
  },
  {
    id: 'user3',
    name: 'Mike Manager',
    email: 'mike.manager@fitscan.com',
    password: 'password', // Plaintext for mock - DO NOT DO THIS IN PRODUCTION
    dataAiHint: 'profile man',
    role: 'Hiring Manager',
  },
];

// These functions below manipulated mockAppUsers. They are no longer directly used by the main User API.
// Kept for reference or if you need to manipulate the mock list for other testing.
export const addUserToMockData = (user: Omit<UserProfile, 'id' | 'avatarUrl' | 'dataAiHint'>): UserProfile => {
  const newUser: UserProfile = {
    id: uuidv4(),
    ...user,
    avatarUrl: `https://placehold.co/100x100.png?text=${user.name?.charAt(0) || 'U'}`, 
    dataAiHint: "profile person"
  };
  mockAppUsers.push(newUser);
  return newUser;
};

export const updateUserInMockData = (id: string, updates: Partial<Omit<UserProfile, 'id'>>): UserProfile | null => {
  const userIndex = mockAppUsers.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return null;
  }
  mockAppUsers[userIndex] = { ...mockAppUsers[userIndex], ...updates };
  return mockAppUsers[userIndex];
};


export const mockCandidates: Candidate[] = [];
    