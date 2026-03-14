"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useChatHistory, useSendMessage } from "@/hooks/use-chat";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sendMessage = useSendMessage();
  const { data: history, isLoading: historyLoading } = useChatHistory(sessionId);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    const message = query;
    setQuery("");

    sendMessage.mutate(
      { message, session_id: sessionId },
      {
        onSuccess: (data) => {
          if (!sessionId && data.session_id) {
            setSessionId(data.session_id);
          }
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold">Semantic Search &amp; Chat</h1>        

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="flex-1 p-4 overflow-y-auto">
          {!sessionId && !historyLoading && !sendMessage.isPending ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <p>Enter a query to start searching your connected knowledge base.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history?.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-zinc-900 text-zinc-50"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-200/20 text-xs space-y-1 opacity-80">
                        <p className="font-semibold text-[10px] uppercase">Sources:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          {msg.sources.map((s, idx) => (
                            <li key={idx} className="truncate" title={s.source}>
                              <span className="font-medium">{s.type}</span>: {s.preview?.substring(0, 40) || s.source}... 
                              ({Math.round(s.score * 100)}%)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {sendMessage.isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl px-4 py-2 bg-muted flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about your data..."
          className="flex-1 h-12"
          disabled={sendMessage.isPending}
        />
        <Button 
          type="submit" 
          disabled={!query.trim() || sendMessage.isPending} 
          className="h-12 px-6"
        >
          {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search & Chat"}
        </Button>
      </form>
    </div>
  );
}
