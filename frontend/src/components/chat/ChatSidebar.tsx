//src/components/chat/ChatSidebar.tsx
import { Button } from '@/components/ui/button';
import { Scale, PanelLeftClose, PanelLeftOpen, Loader2 } from 'lucide-react';
import ChatSessionManager from './ChatSessionManager';
import UserProfile from './UserProfile';
import { type ChatSession } from '@/lib/types';

interface ChatSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  sessions: ChatSession[];
  currentSessionId: number | null; // ID là number
  onCreateNew: () => void;
  onSelectSession: (sessionId: number) => void; // ID là number
  onRenameSession: (sessionId: number, newName: string) => void; // ID là number
  onDeleteSession: (sessionId: number) => void; // ID là number
  isLoading: boolean; // Thêm prop loading
}

const ChatSidebar = ({
  collapsed,
  onToggleCollapse,
  sessions,
  currentSessionId,
  onCreateNew,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  isLoading
}: ChatSidebarProps) => {
  return (
    <div className={`${collapsed ? 'w-16' : 'w-80'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Transportation Law AI</h1>
              <p className="text-sm text-gray-500">Legal Assistant</p>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-2"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Chat Sessions */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <ChatSessionManager
            sessions={sessions}
            currentSessionId={currentSessionId}
            onCreateNew={onCreateNew}
            onSelectSession={onSelectSession}
            onRenameSession={onRenameSession}
            onDeleteSession={onDeleteSession}
            collapsed={collapsed}
          />
        )}
      </div>

      {/* User Profile */}
      <UserProfile collapsed={collapsed} />
    </div>
  );
};

export default ChatSidebar;