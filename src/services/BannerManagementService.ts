import { Banner } from '../types/prisma';
import { getBanners, createBanner, updateBanner, deleteBanner, updateBannerOrder } from '../api';

const BannerManagementService = {
  // 배너 목록 조회
  getBanners: async (type?: 'main' | 'company' | 'bottom' | 'mini'): Promise<Banner[]> => {
    try {
      return await getBanners(type);
    } catch (error) {
      console.error('Error fetching banners:', error);
      throw error;
    }
  },

  // 배너 생성
  createBanner: async (data: Omit<Banner, 'id'>): Promise<Banner> => {
    try {
      return await createBanner(data);
    } catch (error) {
      console.error('Error creating banner:', error);
      throw error;
    }
  },

  // 배너 수정
  updateBanner: async (id: number, data: Partial<Banner>): Promise<Banner> => {
    try {
      return await updateBanner(id, data);
    } catch (error) {
      console.error(`Error updating banner with id ${id}:`, error);
      throw error;
    }
  },

  // 배너 삭제
  deleteBanner: async (id: number): Promise<void> => {
    try {
      await deleteBanner(id);
    } catch (error) {
      console.error(`Error deleting banner with id ${id}:`, error);
      throw error;
    }
  },

  // 배너 순서 업데이트
  updateBannerOrder: async (bannerOrders: { id: number; displayOrder: number }[]): Promise<void> => {
    try {
      await updateBannerOrder(bannerOrders);
    } catch (error) {
      console.error('Error updating banner orders:', error);
      throw error;
    }
  },
};

export default BannerManagementService;
