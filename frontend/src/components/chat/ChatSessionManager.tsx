//src/components/chat/ChatSessionManager.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { type ChatSession } from '@/lib/types';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Check,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatSessionManagerProps {
  sessions: ChatSession[];
  currentSessionId: number | null;
  onCreateNew: () => void;
  onSelectSession: (sessionId: number) => void;
  onDeleteSession: (sessionId: number) => void;
  onRenameSession: (sessionId: number, newName: string) => void;
  collapsed: boolean;
}

const ChatSessionManager = ({
  sessions,
  currentSessionId,
  onCreateNew,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  collapsed
}: ChatSessionManagerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartEdit = (session: ChatSession) => {
    setEditingId(session.id);
    setEditingName(session.title);
  };

  const handleSaveEdit = () => {
    if (editingId != null && editingName.trim()) {
      onRenameSession(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date(timestamp);
    const diff = now.getTime() - new Date(timestamp).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (collapsed) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-2">
          <Button 
            onClick={onCreateNew}
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filteredSessions.map((session) => (
              <Button
                key={session.id}
                variant={currentSessionId === session.id ? "secondary" : "ghost"}
                size="sm"
                className="w-full h-10 p-2"
                onClick={() => onSelectSession(session.id)}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button 
          onClick={onCreateNew}
          className="w-full justify-start gap-2 text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
        
        <div className="mt-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center p-4 text-gray-500 text-sm">
              {searchQuery ? 'No chats found' : 'No chat sessions yet'}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg border-2 transition-colors ${
                  currentSessionId === session.id 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                {editingId === session.id ? (
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="p-3 cursor-pointer"
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{session.title}</h4>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          Tạo lúc: {new Date(session.created_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(session.created_at)}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartEdit(session)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDeleteSession(session.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatSessionManager;