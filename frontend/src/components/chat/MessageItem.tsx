import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { type Message } from "@/types"; // Import từ file types mới
import { Bot, User, Copy, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Import hàm cn

interface MessageItemProps {
  message: Message;
}

const handleCopy = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Đã sao chép vào clipboard!");
};

export const MessageItem = ({ message }: MessageItemProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
        "py-6 px-4 md:px-8",
        !isUser && "bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800"
    )}>
        <div className="max-w-4xl mx-auto flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className={isUser ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-600"}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="flex-1 space-y-4">
                <p className="leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {message.content}
                </p>

                {/* Sources and Actions for Assistant Messages */}
                {!isUser && (
                    <div className="space-y-4">
                        {message.sources && message.sources.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">NGUỒN THAM KHẢO:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {message.sources.map((source, index) => (
                                        <a key={index} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md transition-colors">
                                            {source.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-500">
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleCopy(message.content)}><Copy className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7"><ThumbsUp className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7"><ThumbsDown className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="gap-2 ml-auto"><RotateCcw className="w-4 h-4" /> Tạo lại</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};