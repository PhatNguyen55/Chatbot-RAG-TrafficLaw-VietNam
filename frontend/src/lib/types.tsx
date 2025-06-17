// src/lib/types.ts

// ==================================
//        AUTHENTICATION & USER
// ==================================

/**
 * Định nghĩa thông tin người dùng.
 * Sẽ được cung cấp bởi AuthContext sau khi đăng nhập thành công.
 */
export interface User {
  id: number;       // ID từ database là số
  email: string;
  is_active: boolean;
}


// ==================================
//        CHAT & MESSAGES
// ==================================

/**
 * Định nghĩa nguồn tham khảo mà AI trả về.
 * Khớp với response_model của backend.
 */
export interface Source {
  source_file: string;
  document_type: string;
  document_number: string;
  chuong: string;
  dieu: string;
  muc?: string | null; // Có thể có hoặc không
}

/**
 * Định nghĩa một tin nhắn trong cuộc trò chuyện (hiển thị trên UI).
 */
export interface Message {
  id: string;             // ID tạm thời tạo ở frontend hoặc ID từ DB
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  sources?: Source[];       // Nguồn tham khảo cho tin nhắn của assistant
}

/**
 * Định nghĩa một phiên trò chuyện (hiển thị trên sidebar).
 * Khớp với response_model `ChatSessionBase` của backend.
 */
export interface ChatSession {
  id: number;             // ID từ database là số
  title: string;
  created_at: string;     // API trả về string, chúng ta có thể chuyển đổi sau
  // Thêm các trường khác nếu API trả về (ví dụ: messageCount)
}

/**
 * Định nghĩa chi tiết một phiên trò chuyện, bao gồm cả các tin nhắn.
 * Khớp với response_model `ChatSessionDetail` của backend.
 */
export interface ChatSessionDetail extends ChatSession {
    messages: Message[];
}


// ==================================
//        FILE UPLOADING (Nếu có)
// ==================================

/**
 * Kiểu dữ liệu cho file đang được upload.
 */
export type UploadedFile = {
  id: string;
  file: File;
  status: "uploading" | "success" | "error";
  progress?: number;
};