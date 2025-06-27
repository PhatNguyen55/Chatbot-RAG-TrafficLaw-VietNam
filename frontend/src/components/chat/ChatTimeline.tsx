// src/components/chat/ChatTimeline.tsx

import { useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// import { ScrollArea} from '@/components/ui/scroll-area';
import { User, Bot, Copy, FileText, BookText, Loader2 } from 'lucide-react';
import { type Message} from '@/lib/types'; 
import { Button } from '../ui/button';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ChatTimelineProps {
  messages: Message[];
  isLoading?: boolean;
}

// Hàm xử lý copy, được mang vào trong component
const handleCopy = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Đã sao chép nội dung vào clipboard!");
};

export const ChatTimeline = ({ messages, isLoading = false }: ChatTimelineProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    // 2. Hàm để cuộn đến thẻ div đó.
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    // 3. Gọi hàm cuộn mỗi khi có tin nhắn mới hoặc trạng thái loading thay đổi.
    scrollToBottom();
  }, [messages, isLoading]);
  
  return (
     <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar className="w-9 h-9 flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-sm">
                <AvatarFallback className={isUser ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}>
                  {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>

              {/* Khối nội dung tin nhắn */}
              <div className="flex-1 space-y-3">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{isUser ? 'Bạn' : 'Trợ lý Luật GTĐB'}</p>
                
                {/* Phần nội dung chính của tin nhắn */}
                <div className="prose prose-slate dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {message.content}
                </div>
                
                {/* ================================================================ */}
                {/*  BỔ SUNG LẠI TÍNH NĂNG RAG: TRÍCH DẪN NGUỒN VÀ CÁC NÚT TIỆN ÍCH */}
                {/* ================================================================ */}
                {!isUser && message.sources && message.sources.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <BookText className="h-4 w-4" />
                          Tài liệu tham khảo ({message.sources.length} tài liệu)
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pl-2 pt-2 border-l-2 border-slate-200 dark:border-slate-700">
                          {message.sources.map((source, index) => (
                            <div key={index} className="text-xs">
                              <div className="flex items-start gap-2">
                                <FileText className="h-3.5 w-3.5 mt-0.5 text-slate-500 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {/* Link đến API xem PDF (sẽ làm ở phần 2) */}
                                    <a
                                      href={`http://127.0.0.1:8000/api/v1/documents/view/${source.source_file}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline hover:text-blue-600"
                                    >
                                      ({source.document_number}) - {source.dieu}
                                    </a>
                                  </p>
                                  {/* Hiển thị một phần nội dung gốc của chunk */}
                                  <p className="mt-1 text-slate-600 dark:text-slate-400 italic">
                                    📝 Nội dung: {source.page_content.substring(0, 150)}...
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleCopy(message.content)}>
                            <Copy className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Chỉ báo "AI is thinking..." */}
        {isLoading && (
            <div className="flex items-start gap-4">
                <Avatar className="w-9 h-9 flex-shrink-0"><AvatarFallback className="bg-slate-200 dark:bg-slate-700"><Bot className="w-5 h-5" /></AvatarFallback></Avatar>
                <div className="p-2">
                    <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                </div>
            </div>
        )}
        </div>

        {/* Thẻ div để cuộn đến cuối cùng */}
      <div ref={messagesEndRef} />
      </div>
  );
};

export default ChatTimeline;