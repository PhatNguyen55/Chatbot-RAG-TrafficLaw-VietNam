# 🚦 TrafficLaw-RAG Chatbot

An intelligent chatbot for **retrieving and understanding Vietnam's road traffic laws**, built with **Retrieval-Augmented Generation (RAG)**.  
The project aims to help users easily search, understand, and apply legal regulations related to vehicles and traffic violations.

---

## ✨ Key Features
- 📑 **Legal text retrieval**: Answer user queries based on *Decree 168/2024* and related traffic law documents.  
- 🔎 **Hybrid Retrieval**: Combines **BM25 + Embedding Search** for more accurate information retrieval.  
- 📊 **Re-ranking**: Uses a CrossEncoder model to rank the most relevant text chunks.  
- 💬 **Conversational RAG**: Maintains context across multiple turns in a conversation.  
- 🔐 **User authentication (JWT)**: Secures API endpoints and manages sessions.  
- 🗄️ **Conversation history storage** using PostgreSQL.  

---

## 🏗️ System Architecture
- **Frontend**: Next.js + TypeScript + TailwindCSS + shadcn/ui  
- **Backend**: FastAPI + LangChain + Poetry  
- **Vector Store**: ChromaDB  
- **Embedding Model**: `bkai/vietnamese-bi-encoder`  
- **Reranker**: `AITeamVN/Vietnamese_Reranker`  
- **LLM**: Gemini 1.5 Flash  
- **Database**: PostgreSQL (user & chat history storage)  

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/traffic-law-rag-chatbot.git
cd traffic-law-rag-chatbot

cd backend
poetry install
poetry run uvicorn app.main:app --reload

cd frontend
npm install
npm run dev
