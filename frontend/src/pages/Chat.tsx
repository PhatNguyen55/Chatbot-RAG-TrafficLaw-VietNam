// src/pages/Chat.tsx

import { useState } from 'react';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatGreeting from '@/components/chat/ChatGreeting';
import ChatTimeline from '@/components/chat/ChatTimeline';
import ChatInput from '@/components/chat/ChatInput';
import { type ChatSession, type Message } from '@/types'; // Import từ file types chung
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

const Chat = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]); // Bắt đầu với mảng rỗng
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // --- LOGIC ---

  // Sử dụng mock response đã có sources của chúng ta
  const mockRAGResponse = (query: string): Omit<Message, 'id' | 'role' | 'timestamp'> => {
    console.log("Query to mock:", query);
    const responses = [
        { content: "Theo Điều 6, Nghị định 100/2019/NĐ-CP, tốc độ tối đa cho phép trong khu vực đông dân cư (trừ đường cao tốc) đối với xe ô tô con là 60 km/h trên đường đôi và 50 km/h trên đường hai chiều.", sources: [{ title: "Nghị định 100/2019/NĐ-CP, Điều 6" }] },
        { content: "Phạt tiền từ 2.000.000 đồng đến 3.000.000 đồng đối với người điều khiển xe trên đường mà trong cơ thể có chất ma túy.", sources: [{ title: "Nghị định 100/2019/NĐ-CP, Điều 5" }] }
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const generateSessionName = (message: string): string => {
    const words = message.split(' ');
    if (words.length > 5) {
      return words.slice(0, 5).join(' ') + '...';
    }
    return message;
  };

  const handleCreateNewSession = () => setCurrentSessionId(null);
  const handleSelectSession = (sessionId: string) => setCurrentSessionId(sessionId);
  
  const handleRenameSession = (sessionId: string, newName: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, name: newName } : s));
  };
  
  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) setCurrentSessionId(null);
  };

  const handleSendMessage = async (messageContent: string) => {
    let activeSessionId = currentSessionId;

    // Tạo session mới nếu chưa có
    if (!activeSessionId) {
      const newSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: newSessionId,
        name: generateSessionName(messageContent),
        lastMessage: messageContent,
        timestamp: new Date(),
        messageCount: 0 // Bắt đầu bằng 0
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSessionId);
      activeSessionId = newSessionId;
    }
    
    // Tạo và thêm tin nhắn của người dùng
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date(),
    };
    
    setSessionMessages(prev => ({
      ...prev,
      [activeSessionId!]: [...(prev[activeSessionId!] || []), userMessage],
    }));

    setIsLoading(true);

    // Mô phỏng phản hồi của AI
    setTimeout(() => {
      const responseData = mockRAGResponse(userMessage.content);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        timestamp: new Date(),
        ...responseData, // Trải dữ liệu ra, bao gồm cả content và sources
      };

      setSessionMessages(prev => ({
        ...prev,
        [activeSessionId!]: [...(prev[activeSessionId!] || []), assistantMessage],
      }));

      // Cập nhật thông tin session
      setSessions(prev => prev.map(s => 
          s.id === activeSessionId 
          ? { 
              ...s, 
              lastMessage: messageContent,
              timestamp: new Date(),
              messageCount: (sessionMessages[activeSessionId!]?.length || 0) + 2 // Cập nhật số lượng tin nhắn
            }
          : s
      ));

      setIsLoading(false);
    }, 1500);
  };

  const currentMessages = currentSessionId ? sessionMessages[currentSessionId] || [] : [];
  const showGreeting = !currentSessionId;

  // --- RENDER ---
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onCreateNew={handleCreateNewSession}
        onSelectSession={handleSelectSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
        <header className="p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                        {currentSessionId ? sessions.find(s => s.id === currentSessionId)?.name : 'Trò chuyện mới'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Hỏi đáp với Trợ lý AI về Luật Giao thông</p>
                </div>
                <Avatar><AvatarFallback className="bg-blue-100 text-blue-600"><User className="w-4 h-4" /></AvatarFallback></Avatar>
            </div>
        </header>
        
        <div className="flex-1 flex flex-col overflow-hidden">
            {showGreeting ? (
              <ChatGreeting onQuickStart={handleSendMessage} />
            ) : (
              <ChatTimeline messages={currentMessages} isLoading={isLoading} />
            )}
        </div>

        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default Chat;