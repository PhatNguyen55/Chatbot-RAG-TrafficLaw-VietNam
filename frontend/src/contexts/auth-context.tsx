// src/contexts/auth-context.tsx

import { createContext, useContext, type ReactNode, useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api'; // Import API client của chúng ta
import { type User } from '@/lib/types'; // Import User type từ file types chung

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean; // Thêm trạng thái loading
  login: (token: string) => Promise<void>; // Hàm login nhận token và cập nhật thông tin user
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Bắt đầu ở trạng thái loading

  // --- HÀM MỚI: LẤY THÔNG TIN USER TỪ TOKEN ---
  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      // Gọi một API mới để lấy thông tin người dùng hiện tại
      // Backend sẽ xác thực token và trả về thông tin user
      const response = await apiClient.get('/auth/me'); 
      if (response.data) {
        setUser(response.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      // Nếu token không hợp lệ, xóa nó đi
      console.error("Failed to fetch user:", error);
      localStorage.removeItem('access_token');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chạy một lần khi component được mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // --- HÀM LOGIN ĐÃ ĐƯỢC CẬP NHẬT ---
  const login = async (token: string) => {
    // Lưu token vào localStorage
    localStorage.setItem('access_token', token);
    // Sau khi lưu, gọi lại fetchUser để lấy thông tin mới nhất và cập nhật state
    await fetchUser();
  };

  // --- HÀM LOGOUT ĐÃ ĐƯỢC CẬP NHẬT ---
  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setIsAuthenticated(false);
    // Có thể thêm logic gọi API /logout của backend ở đây nếu có
    // và chuyển hướng người dùng
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}