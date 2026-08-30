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

export interface RequestOtpBodyModel {
  email: string;
}

export interface ResetPasswordBodyModel {
  email: string;
  otp: string;
  password: string;
}

export interface MessagePayloadModel {
  message: string;
}

export interface MessageSuccessResponse {
  object: MessagePayloadModel;
}
