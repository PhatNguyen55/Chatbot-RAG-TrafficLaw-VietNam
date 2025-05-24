import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

// Mock data for messages
const messages = [
  {
    id: '1',
    role: 'user',
    content: 'Xin chào, tôi muốn hỏi về luật giao thông đường bộ?',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Xin chào! Tôi có thể giúp gì cho bạn về luật giao thông đường bộ. Bạn muốn biết về điều khoản cụ thể nào?',
    timestamp: new Date(),
  },
]

export function ChatMessages() {
  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      {messages.map((message) => (
        <div key={message.id} className={cn(
          'flex gap-4 max-w-3xl mx-auto',
          message.role === 'user' ? 'justify-end' : 'justify-start'
        )}>
          {message.role === 'assistant' && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src="/logo.png" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
          )}
          
          <div className={cn(
            'rounded-lg p-4',
            message.role === 'user' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          )}>
            <p className="whitespace-pre-wrap">{message.content}</p>
            <p className="text-xs mt-1 opacity-70">
              {format(message.timestamp, 'HH:mm', { locale: vi })}
            </p>
          </div>
          
          {message.role === 'user' && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}
    </div>
  )
}