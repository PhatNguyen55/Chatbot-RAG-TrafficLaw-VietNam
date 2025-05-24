import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, SendHorizonal } from "lucide-react"
import { useRef, useState } from "react"

export function ChatInput() {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      console.log('Message sent:', message)
      setMessage('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        ref={textareaRef}
        className="pr-12 resize-none min-h-[60px] max-h-[200px]"
        placeholder="Nhập câu hỏi về luật giao thông..."
        rows={1}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
      />
      <div className="absolute right-2 bottom-2 flex space-x-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button 
          size="icon" 
          className="h-8 w-8" 
          type="submit"
          disabled={!message.trim()}
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}