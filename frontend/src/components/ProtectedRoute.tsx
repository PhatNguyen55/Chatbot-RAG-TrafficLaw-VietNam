// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Kịch bản 1: Đang trong quá trình kiểm tra token ban đầu.
  // Hiển thị màn hình loading để tránh "nhấp nháy".
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Kịch bản 2: Đã kiểm tra xong (isLoading = false) và người dùng đã được xác thực.
  // Cho phép truy cập vào trang.
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Kịch bản 3: Đã kiểm tra xong (isLoading = false) và người dùng KHÔNG được xác thực.
  // Chuyển hướng về trang đăng nhập.
  // Thêm 'state' để trang login biết người dùng đến từ đâu.
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;