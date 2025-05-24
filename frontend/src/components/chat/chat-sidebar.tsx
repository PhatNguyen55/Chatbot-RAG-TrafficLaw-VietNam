import { Bot, BookOpen, FileText, Home, Settings2 } from "lucide-react"
import { NavMain } from "@/components/chat/nav-main"
import { NavUser } from "@/components/chat/nav-user"
import { SearchForm } from "@/components/chat/search-form"      
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"

export function AppSidebar() {
  const { user } = useAuth()

  const navItems = [
    {
      title: "Trang chủ",
      url: "#",
      icon: Home,
      isActive: true,
    },
    {
      title: "Chatbot",
      url: "#",
      icon: Bot,
      items: [
        { title: "Lịch sử chat", url: "#" },
        { title: "Chat mới", url: "#" },
      ],
    },
    {
      title: "Tài liệu luật",
      url: "#",
      icon: FileText,
      items: [
        { title: "Luật GT đường bộ", url: "#" },
        { title: "Nghị định hướng dẫn", url: "#" },
      ],
    },
    {
      title: "Hướng dẫn",
      url: "#",
      icon: BookOpen,
    },
    {
      title: "Cài đặt",
      url: "#",
      icon: Settings2,
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-center p-4">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-white">
            <span className="font-bold">TL</span>
          </div>
        </div>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={{
          name: user.name,
          email: user.email,
          avatar: ""
        }} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}