// src/lib/types.ts

// ==================================
//        AUTHENTICATION & USER
// ==================================
export interface User {
  id: number;
  email: string;
  is_active: boolean;
}

// ==================================
//        CHAT & MESSAGES
// ==================================

/**
 * Định nghĩa nguồn tham khảo mà AI trả về, khớp với backend.
 */
export interface Source {
  source_file: string; // <-- Đây là kiểu dữ liệu đúng từ backend
  document_type: string;
  document_number: string;
  chuong: string;
  dieu: string;
  muc?: string | null;
  // Thêm 'title' như một thuộc tính tùy chọn để tương thích ngược nếu cần
  title?: string;
}

/**
 * Định nghĩa một tin nhắn trong cuộc trò chuyện (hiển thị trên UI).
 */
export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  sources?: Source[];
}

/**
 * Định nghĩa một phiên trò chuyện (hiển thị trên sidebar).
 */
export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
}

/**
 * Định nghĩa chi tiết một phiên trò chuyện, bao gồm cả các tin nhắn.
 */
export interface ChatSessionDetail extends ChatSession {
    messages: Message[];
}

export interface HistoryItem {
  human: string;
  ai: string;
}