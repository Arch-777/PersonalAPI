export default function IntegrationsPage() {
    const connectors = [
        { name: "Notion", connected: true },
        { name: "Google Drive", connected: false },
        { name: "Slack", connected: false },
        { name: "Telegram", connected: true },
        { name: "Spotify", connected: false },
    ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Connectors</h1>
      <p className="text-muted-foreground">Manage your data sources.</p>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {connectors.map((c) => (
            <div key={c.name} className="p-6 bg-card rounded-xl border shadow-sm flex flex-col justify-between h-40">
                <div className="flex justify-between items-start">
                    <div className="font-semibold text-lg">{c.name}</div>
                    {c.connected ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
                    ) : (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Not Connected</span>
                    )}
                </div>
                <button className={`w-full py-2 rounded-md text-sm font-medium ${c.connected ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'}`}>
                    {c.connected ? 'Manage' : 'Connect'}
                </button>
            </div>
        ))}
      </div>
    </div>
  );
}
