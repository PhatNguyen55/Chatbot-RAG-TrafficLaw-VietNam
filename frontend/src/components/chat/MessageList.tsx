import { ScrollArea } from "@/components/ui/scroll-area";
import { type Message } from "@/types";
import { MessageItem } from "./MessageItem";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Bot } from "lucide-react";
import { Card } from "../ui/card";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.Ref<HTMLDivElement>;
}

const LoadingIndicator = () => (
    <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-gray-100 text-gray-600"><Bot className="w-4 h-4" /></AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <Card className="p-3 bg-white w-fit">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
            </Card>
        </div>
    </div>
);


export const MessageList = ({ messages, isLoading, messagesEndRef }: MessageListProps) => {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};