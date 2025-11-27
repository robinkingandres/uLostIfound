export type UserRole = 'Admin' | 'Student' | 'Teacher';

export interface User {
  id: number;
  name: string;
  userId: string; // The "A-01" or student number
  email: string;
  role: UserRole;
  avatar?: string; // Optional URL for avatar image
}