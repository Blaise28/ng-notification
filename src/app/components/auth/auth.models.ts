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

export interface AuthSuccessPayload {
  success: true;
  accessToken: string;
  user: UserModel;
}

export interface AuthSuccessResponse {
  object: AuthSuccessPayload;
}

export interface MeSuccessPayload {
  success: true;
  user: UserModel;
}

export interface MeSuccessResponse {
  object: MeSuccessPayload;
}
