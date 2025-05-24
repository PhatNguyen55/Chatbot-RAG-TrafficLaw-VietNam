import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface ChatHistory {
  id: string;
  title: string;
  date: Date;
}

export function HistoryItem({ chat }: { chat: ChatHistory }) {
  return (
    <Button 
      variant="ghost" 
      className="w-full justify-start font-normal text-left truncate"
    >
      <span className="truncate">
        {chat.title}
      </span>
      <span className="ml-auto text-xs text-gray-500">
        {format(chat.date, 'dd/MM', { locale: vi })}
      </span>
    </Button>
  );
}