export type UserRole = 'admin' | 'operator';

export interface UserModel {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginBodyModel {
  email: string;
  password: string;
}

export interface RegisterBodyModel {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface AuthPayloadModel {
  accessToken: string;
  user: UserModel;
}

export interface AuthSuccessResponse {
  object: AuthPayloadModel;
}

export interface MeSuccessResponse {
  object: UserModel;
}
