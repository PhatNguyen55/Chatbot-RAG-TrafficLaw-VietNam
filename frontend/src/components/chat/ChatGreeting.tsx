//src/components/chat/ChatGreeting.tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Scale, BookOpen, Gavel } from 'lucide-react';

interface ChatGreetingProps {
  onQuickStart: (message: string) => void;
}

const ChatGreeting = ({ onQuickStart }: ChatGreetingProps) => {
  const quickStartQuestions = [
    "Tốc độ tối đa cho xe máy trong khu dân cư là bao nhiêu?",
    "Quy định về độ tuổi được phép thi bằng lái xe máy tại Việt Nam?",
    "Khi gặp đèn vàng thì người tham gia giao thông phải làm gì?",
    "Xe nào được quyền ưu tiên khi vào vòng xuyến?"
  ];


  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Chào mừng trở lại với LawBot</h1>
          <p className="text-lg text-gray-600">
            Tôi là trợ lý pháp lý thông minh của bạn, sẵn sàng hỗ trợ bạn với các câu hỏi về luật giao thông, quy định và nghiên cứu pháp lý. Hôm nay tôi có thể giúp gì cho bạn?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickStartQuestions.map((question, index) => (
            <Card 
              key={index} 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-200"
              onClick={() => onQuickStart(question)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  {index === 0 && <MessageSquare className="w-4 h-4 text-blue-600" />}
                  {index === 1 && <BookOpen className="w-4 h-4 text-blue-600" />}
                  {index === 2 && <Gavel className="w-4 h-4 text-blue-600" />}
                  {index === 3 && <MessageSquare className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-sm text-gray-700 text-left">{question}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="pt-4">
          <Button variant="outline" className="text-gray-500">
            Hoặc hỏi tôi bất kỳ câu hỏi nào về luật giao thông
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatGreeting;