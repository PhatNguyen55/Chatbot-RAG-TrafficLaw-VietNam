// src/pages/Chat.tsx

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatGreeting from '@/components/chat/ChatGreeting';
import ChatTimeline from '@/components/chat/ChatTimeline';
import ChatInput from '@/components/chat/ChatInput';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { type ChatSession, type Message } from '@/lib/types';
import apiClient from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

const Chat = () => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Record<number, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);

  // --- LOGIC ---

  const fetchSessions = useCallback(async () => {
    setIsSidebarLoading(true);
    try {
      const response = await apiClient.get<ChatSession[]>('/chat/sessions');
      setSessions(response.data);
    } catch (error) {
      toast.error("Lỗi", { description: "Không thể tải danh sách cuộc trò chuyện." });
    } finally {
      setIsSidebarLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSelectSession = useCallback(async (sessionId: number) => {
    setCurrentSessionId(sessionId);
    if (sessionMessages[sessionId]) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/chat/sessions/${sessionId}`);
      const fetchedMessages: Message[] = response.data.messages.flatMap((msg: any) => [
        { id: `user-${msg.id}`, content: msg.question, role: 'user', timestamp: new Date(msg.created_at) },
        { id: `assistant-${msg.id}`, content: msg.answer, role: 'assistant', timestamp: new Date(msg.created_at), sources: msg.sources }
      ]);
      setSessionMessages(prev => ({ ...prev, [sessionId]: fetchedMessages }));
    } catch (error) {
      toast.error("Lỗi", { description: "Không thể tải lịch sử tin nhắn." });
    } finally {
      setIsLoading(false);
    }
  }, [sessionMessages]);

  // <<< TASK 2: Hàm tạo tên tự động >>>
  const generateSessionName = (message: string): string => {
    const words = message.split(' ');
    return words.length > 5 ? words.slice(0, 5).join(' ') + '...' : message;
  };

  const handleSendMessage = async (messageContent: string) => {
    const isNewSession = currentSessionId === null;
    let tempSessionId = currentSessionId;

    const userMessage: Message = {
      id: `user-temp-${Date.now()}`,
      content: messageContent,
      role: 'user',
      timestamp: new Date(),
    };
    
    // Optimistic UI for existing sessions
    if (tempSessionId) {
      setSessionMessages(prev => ({
        ...prev,
        [tempSessionId!]: [...(prev[tempSessionId!] || []), userMessage],
      }));
    }
    
    setIsLoading(true);

    try {
      const response = await apiClient.post('/chat/message', {
        question: messageContent,
        session_id: tempSessionId,
      });

      const { answer, sources, session_id: newSessionId } = response.data;
      tempSessionId = newSessionId; // Cập nhật session ID thật

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: answer,
        role: 'assistant',
        timestamp: new Date(),
        sources: sources,
      };
      
      // Cập nhật state với dữ liệu thật
      setSessionMessages(prev => ({
        ...prev,
        [newSessionId]: [...(prev[newSessionId] || []), userMessage, assistantMessage],
      }));

      // <<< TASK 2: Logic đổi tên session mới >>>
      if (isNewSession) {
        const newTitle = generateSessionName(messageContent);
        // "Fire-and-forget" API call to rename
        apiClient.patch(`/chat/sessions/${newSessionId}`, { title: newTitle })
          .then(() => fetchSessions()) // Tải lại sidebar để cập nhật tên
          .catch(err => console.error("Failed to rename session:", err));
        
        setCurrentSessionId(newSessionId);
      }
    } catch (error) {
      toast.error("Lỗi", { description: "Không thể gửi tin nhắn đến trợ lý AI." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSession = () => setCurrentSessionId(null);

  // <<< TASK 1: Sửa logic xóa >>>
  const handleDeleteSession = async (sessionId: number) => {
    const oldSessions = sessions;
    const oldCurrentSessionId = currentSessionId;

    // Optimistic UI
    const newSessions = oldSessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }

    try {
      await apiClient.delete(`/chat/sessions/${sessionId}`);
      toast.success("Đã xóa cuộc trò chuyện.");
    } catch (error) {
      toast.error("Lỗi", { description: "Không thể xóa. Đang hoàn tác." });
      // Hoàn tác nếu API lỗi
      setSessions(oldSessions);
      setCurrentSessionId(oldCurrentSessionId);
    }
  };
  
  // Logic render giữ nguyên
  const currentMessages = currentSessionId ? sessionMessages[currentSessionId] || [] : [];
  const showGreeting = !currentSessionId;
  const currentSessionInfo = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onCreateNew={handleCreateNewSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={() => {}}
        isLoading={isSidebarLoading}
      />
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
        <header className="p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                        {currentSessionInfo ? currentSessionInfo.title : 'Cuộc trò chuyện mới'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Hỏi đáp với Trợ lý AI về Luật Giao thông</p>
                </div>
                {user && <Avatar><AvatarFallback className="bg-blue-100 text-blue-600">{user.email.charAt(0).toUpperCase()}</AvatarFallback></Avatar>}
            </div>
        </header>
        <div className="flex-1 flex flex-col overflow-hidden">
            {showGreeting ? (
              <ChatGreeting onQuickStart={handleSendMessage} />
            ) : (
              // <<< TASK 3: Truyền isLoading vào đây >>>
              <ChatTimeline messages={currentMessages} isLoading={isLoading} />
            )}
        </div>
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default Chat;