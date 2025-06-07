// Kiểu dữ liệu cho nguồn tham khảo
export type Source = {
  title: string
  url: string
  page?: number
  excerpt?: string
}

// Kiểu dữ liệu cho tin nhắn
export type Message = {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  sources?: Source[];
};

// Kiểu dữ liệu cho file upload
export type UploadedFile = {
  id: string;
  file: File;
  status: "uploading" | "success" | "error";
  progress?: number;
};