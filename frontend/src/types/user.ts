export type UserRole = 'Admin' | 'Student' | 'Teacher' | 'Guidance';

export interface User {
  id: number;
  name: string;
  username?: string;
  userId: string;
  email: string;
  role: UserRole;
  avatar?: string;
  yearLevel?: string;
  room?: string;
  gender?: string;
}
