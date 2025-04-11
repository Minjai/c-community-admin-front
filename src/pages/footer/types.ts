// src/pages/footer/types.ts
export interface Footer {
  id: number;
  title: string;
  content: string;
  isPublic: number; // 1 for public, 0 for private
  createdAt: string;
  updatedAt?: string;
}
