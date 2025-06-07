import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Ask about transportation laws, traffic regulations, vehicle requirements..."
}: ChatInputProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!inputMessage.trim() || disabled) return;
    
    onSendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[50px] max-h-[120px] resize-none"
              disabled={disabled}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || disabled}
            className="bg-blue-600 hover:bg-blue-700 h-[50px] px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          This AI assistant provides general information. Always consult with a qualified attorney for legal advice.
        </p>
      </div>
    </div>
  );
};

export default ChatInput;