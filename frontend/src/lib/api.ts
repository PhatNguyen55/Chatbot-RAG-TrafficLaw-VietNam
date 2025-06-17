// src/lib/api.ts
import axios from 'axios';

// Lấy URL từ biến môi trường
const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error('VITE_API_BASE_URL is not defined in .env');
}

// Tạo một instance của axios với cấu hình mặc định
const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Gửi kèm cookie trong mỗi request (quan trọng cho xác thực sau này nếu dùng cookie)
  withCredentials: true,
});

// Đây là phần "ma thuật" - Interceptor
// Nó sẽ tự động đính kèm token vào header của mỗi request
apiClient.interceptors.request.use(
  (config) => {
    // Chúng ta sẽ lấy token từ localStorage hoặc cookie
    // Tạm thời để trống, sẽ cập nhật ở Giai đoạn B
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;