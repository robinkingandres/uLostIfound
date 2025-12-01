export type UserRole = 'Admin' | 'Student' | 'Teacher' | 'Guidance';

export interface User {
  id: number;
  name: string;
  userId: string;
  email: string;
  role: UserRole;
  avatar?: string;
}