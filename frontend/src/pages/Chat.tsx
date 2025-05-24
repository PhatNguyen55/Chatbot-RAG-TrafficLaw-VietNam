import { AppSidebar } from "@/components/chat/chat-sidebar"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatInput } from "@/components/chat/chat-input"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"

export function ChatPage() {
  const { user } = useAuth()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen">
        <ChatHeader user={user} />
        <div className="flex-1 overflow-hidden">
          <ChatMessages />
        </div>
        <div className="border-t p-4">
          <ChatInput />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}