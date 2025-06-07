// src/components/chat/UserProfile.tsx

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Sử dụng icon từ lucide-react để nhất quán
import {
  User,
  CreditCard,
  Settings,
  LogOut,
  MoreVertical,
} from 'lucide-react';

interface UserProfileProps {
  collapsed: boolean;
  // Trong tương lai, bạn có thể truyền user object từ ngoài vào
  // user: { name: string; email: string; avatar?: string; }
}

export const UserProfile = ({ collapsed }: UserProfileProps) => {
  // Dữ liệu người dùng giả, dễ dàng thay thế bằng dữ liệu thật
  const user = {
    name: 'Luật sư AI',
    email: 'contact@luatai.vn',
    avatar: 'https://github.com/shadcn.png', // URL ảnh đại diện
    initials: 'AI'
  };

  const handleLogout = () => {
    // Xóa trạng thái đăng nhập và chuyển hướng về trang login
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';
  };

  // Nội dung của DropdownMenu, có thể tái sử dụng
  const dropdownContent = (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-3 px-2 py-1.5 text-left text-sm">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">{user.initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 leading-tight">
            <span className="font-medium truncate">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">
              {user.email}
            </span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Tài khoản</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Thanh toán</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Cài đặt</span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        <span>Đăng xuất</span>
      </DropdownMenuItem>
    </>
  );

  // Giao diện khi sidebar bị thu gọn
  if (collapsed) {
    return (
      <div className="p-2 border-t border-gray-200 dark:border-slate-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full h-auto p-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">{user.initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-60">
            {dropdownContent}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Giao diện khi sidebar được mở rộng
  return (
    <div className="p-2 border-t border-gray-200 dark:border-slate-800">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start p-2 h-auto text-left">
            <div className="flex items-center gap-3 w-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">{user.initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 leading-tight">
                <span className="font-medium truncate">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <MoreVertical className="ml-auto h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[calc(var(--radix-dropdown-menu-trigger-width)_-_16px)]">
          {dropdownContent}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Export với tên UserProfile để ChatSidebar có thể import đúng
export default UserProfile;