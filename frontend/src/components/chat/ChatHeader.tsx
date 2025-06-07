// src/components/chat/ChatHeader.tsx

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "lucide-react";

// Component này hiện tại khá đơn giản, chưa cần props
// Nhưng trong tương lai có thể nhận prop `user` để hiển thị tên/ảnh thật
export const ChatHeader = () => {
  return (
    <header className="p-4 border-b bg-white flex-shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Cuộc trò chuyện về Luật Giao thông</h2>
          <p className="text-sm text-gray-500">Hỏi đáp với Trợ lý AI được huấn luyện</p>
        </div>
        <Avatar>
          <AvatarFallback className="bg-blue-100 text-blue-600">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};