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
  createdAt: string;
}

export type UserResponse = SingleResponseModel<UserListItemModel>;
