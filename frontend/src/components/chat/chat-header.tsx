import { type User } from "@/contexts/auth-context"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModelsSelector } from "@/components/chat/models-selector"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface ChatHeaderProps {
  user: User | null
}

export function ChatHeader({ user }: ChatHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <ModelsSelector />
      </div>
      
      {user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium hidden md:inline">{user.name}</span>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      )}
    </header>
  )
}