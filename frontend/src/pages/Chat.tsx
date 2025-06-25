// src/pages/Chat.tsx

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatGreeting from '@/components/chat/ChatGreeting';
import ChatTimeline from '@/components/chat/ChatTimeline';
import ChatInput from '@/components/chat/ChatInput';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { type ChatSession, type Message, type HistoryItem } from '@/lib/types';
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
    let activeSessionId = currentSessionId;

    const userMessage: Message = {
      id: `user-temp-${Date.now()}`,
      content: messageContent,
      role: 'user',
      timestamp: new Date(),
    };

    // ========================================================
    // <<< THAY ĐỔI LOGIC KHI TẠO SESSION MỚI >>>
    // ========================================================
    if (isNewSession) {
      // 1. Tạo một ID tạm thời cho session mới ở frontend
      const tempSessionId = Date.now(); // Dùng timestamp làm ID tạm
      setCurrentSessionId(tempSessionId);
      activeSessionId = tempSessionId;

      // 2. Tạo một session tạm để hiển thị ngay trên sidebar
      const newSession: ChatSession = {
        id: tempSessionId,
        title: generateSessionName(messageContent),
        created_at: new Date().toISOString(),
      };
      setSessions(prev => [newSession, ...prev]);

      // 3. Thêm tin nhắn của người dùng vào session tạm này
      setSessionMessages({ [tempSessionId]: [userMessage] });
    } else {
      // Logic cũ cho session đã tồn tại: thêm tin nhắn vào state
      setSessionMessages(prev => ({
        ...prev,
        [activeSessionId!]: [...(prev[activeSessionId!] || []), userMessage],
      }));
    }

    setIsLoading(true);

    try {
      // Chuẩn bị lịch sử chat (không đổi)
      const messagesForHistory = activeSessionId ? sessionMessages[activeSessionId] || [] : [];
      const chat_history: HistoryItem[] = [];
      for (let i = 0; i < messagesForHistory.length; i += 2) {
        if (messagesForHistory[i]?.role === 'user' && messagesForHistory[i + 1]?.role === 'assistant') {
          chat_history.push({ human: messagesForHistory[i].content, ai: messagesForHistory[i + 1].content });
        }
      }

      // 4. Gọi API
      const response = await apiClient.post('/chat/message', {
        question: messageContent,
        session_id: isNewSession ? null : activeSessionId, // Gửi null nếu là session mới
        chat_history: chat_history,
      });

      const { answer, sources, session_id: newSessionIdFromApi } = response.data;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: answer,
        role: 'assistant',
        timestamp: new Date(),
        sources: sources,
      };

      // 5. Cập nhật state với dữ liệu thật từ API
      setSessionMessages(prev => {
        // Tạo một bản sao của state để tránh thay đổi trực tiếp
        const newSessionMessages = { ...prev };
        
        // Lấy danh sách tin nhắn hiện tại của session thật
        const currentMsgs = newSessionMessages[newSessionIdFromApi] || [];
        
        // Xóa tin nhắn tạm của user
        const finalMessages = currentMsgs.filter(m => m.id !== userMessage.id); 
        
        // Thêm tin nhắn của user và assistant
        newSessionMessages[newSessionIdFromApi] = [...finalMessages, userMessage, assistantMessage];
        
        // Nếu là session mới, xóa dữ liệu của session tạm đi
        if (isNewSession && activeSessionId) {
            delete newSessionMessages[activeSessionId];
        }

        return newSessionMessages;
      });

      // Nếu là session mới, cập nhật lại ID và sidebar
      if (isNewSession) {
        setCurrentSessionId(newSessionIdFromApi);
        // Tải lại danh sách session để cập nhật ID thật và tên chính thức
        apiClient.patch(`/chat/sessions/${newSessionIdFromApi}`, { title: generateSessionName(messageContent) })
          .then(() => fetchSessions());
      }

    } catch (error) {
      toast.error("Lỗi", { description: "Không thể gửi tin nhắn đến trợ lý AI." });
      // Hoàn tác lại UI nếu có lỗi
      if(activeSessionId) {
          setSessionMessages(prev => {
              const newMessages = {...prev};
              newMessages[activeSessionId] = newMessages[activeSessionId].filter(m => m.id !== userMessage.id);
              return newMessages;
          });
      }
      if(isNewSession) {
          setCurrentSessionId(null);
          fetchSessions();
      }
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
      <div className="flex-1 flex flex-col h-screen max-h-screen bg-white dark:bg-slate-800">
        <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-slate-700">
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
        <div className="flex-1 overflow-y-auto min-h-0">
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