import { Button } from '@/components/ui/button';
import { Scale, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import ChatSessionManager, { type ChatSession } from './ChatSessionManager';
import UserProfile from './UserProfile';

interface ChatSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onCreateNew: () => void;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

const ChatSidebar = ({
  collapsed,
  onToggleCollapse,
  sessions,
  currentSessionId,
  onCreateNew,
  onSelectSession,
  onRenameSession,
  onDeleteSession
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
      <div className="flex-1 min-h-0">
        <ChatSessionManager
          sessions={sessions}
          currentSessionId={currentSessionId}
          onCreateNew={onCreateNew}
          onSelectSession={onSelectSession}
          onRenameSession={onRenameSession}
          onDeleteSession={onDeleteSession}
          collapsed={collapsed}
        />
      </div>

      {/* User Profile */}
      <UserProfile collapsed={collapsed} />
    </div>
  );
};

export default ChatSidebar;