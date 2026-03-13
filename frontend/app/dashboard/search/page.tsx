export default function SearchPage() {
  return (
    <div className="flex flex-col h-full space-y-4">
      <h1 className="text-2xl font-bold">Semantic Search & Chat</h1>
      
      <div className="flex gap-2">
         <input 
            type="text" 
            placeholder="Ask anything about your data..." 
            className="flex-1 p-3 rounded-md border bg-background"
         />
         <button className="px-6 py-3 bg-primary text-primary-foreground rounded-md">Search</button>
      </div>

      <div className="flex-1 border rounded-lg p-6 bg-card flex flex-col items-center justify-center text-muted-foreground">
          <p>Enter a query to start searching your connected knowledge base.</p>
      </div>
    </div>
  );
}
