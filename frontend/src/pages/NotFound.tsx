// src/pages/NotFound.tsx

import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Giữ lại để debug phía client
    console.error(
      "Lỗi 404: Người dùng cố gắng truy cập đường dẫn không tồn tại:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="text-center">
        <TriangleAlert className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-6xl font-extrabold text-gray-800 mb-2">404</h1>
        <p className="text-2xl font-semibold text-gray-600 mb-4">Ối! Không tìm thấy trang</p>
        <p className="text-gray-500 mb-8">
          Có vẻ như đường dẫn bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Button asChild>
          <Link to="/">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;