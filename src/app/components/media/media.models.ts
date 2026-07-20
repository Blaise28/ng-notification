import {
  ListResponseModel,
  PaginatedQueryModel,
  SingleResponseModel,
} from '@models/pagination.models';

export interface MediaAssetModel {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export type MediaListResponse = ListResponseModel<MediaAssetModel>;
export type MediaResponse = SingleResponseModel<MediaAssetModel>;
export type DeleteMediaResponse = SingleResponseModel<{ id: string }>;
export type ListMediaQueryModel = PaginatedQueryModel;
