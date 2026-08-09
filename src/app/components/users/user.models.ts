import { SingleResponseModel } from '@models/pagination.models';
import { UserRole } from '@components/auth/auth.models';

export interface CreateUserBodyModel {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface UserListItemModel {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateUserBodyModel {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

export type UserResponse = SingleResponseModel<UserListItemModel>;
