// src/types/index.ts

export interface Source {
  title: string;
  url?: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: Source[];
}

export interface ChatSession {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}