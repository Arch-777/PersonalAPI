export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Good morning, User</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-card rounded-xl border shadow-sm">
           <div className="text-sm font-medium text-muted-foreground">Total Documents</div>
           <div className="text-2xl font-bold">1,204</div>
        </div>
        <div className="p-6 bg-card rounded-xl border shadow-sm">
           <div className="text-sm font-medium text-muted-foreground">Connected Apps</div>
           <div className="text-2xl font-bold">5</div>
        </div>
         <div className="p-6 bg-card rounded-xl border shadow-sm">
           <div className="text-sm font-medium text-muted-foreground">API Usage</div>
           <div className="text-2xl font-bold">12k / 50k</div>
        </div>
      </div>
      
      <div className="p-6 bg-card rounded-xl border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
           {/* Placeholder for activity stream */}
           <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-green-500"></div>
               <div className="text-sm">Synced 42 new files from Google Drive</div>
               <div className="text-xs text-muted-foreground ml-auto">2m ago</div>
           </div>
           <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-blue-500"></div>
               <div className="text-sm">Search query &quot;Project Alpha timeline&quot;</div>
               <div className="text-xs text-muted-foreground ml-auto">1h ago</div>
           </div>
        </div>
      </div>
    </div>
  );
}
