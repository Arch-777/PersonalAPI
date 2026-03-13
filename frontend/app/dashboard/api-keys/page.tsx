export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API & Tokens</h1>
      <p className="text-muted-foreground">Manage API keys for OpenClaw agents and n8n workflows.</p>

      <div className="flex justify-end">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Create New Token</button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Key Prefix</th>
                      <th className="p-4 font-medium">Created</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
              </thead>
              <tbody>
                  <tr className="border-t">
                      <td className="p-4">OpenClaw Agent</td>
                      <td className="p-4 font-mono">sk-live...492a</td>
                      <td className="p-4">Mar 10, 2026</td>
                      <td className="p-4 text-right"><button className="text-red-500 hover:underline">Revoke</button></td>
                  </tr>
                   <tr className="border-t">
                      <td className="p-4">n8n Workflow</td>
                      <td className="p-4 font-mono">sk-live...b291</td>
                      <td className="p-4">Feb 28, 2026</td>
                      <td className="p-4 text-right"><button className="text-red-500 hover:underline">Revoke</button></td>
                  </tr>
              </tbody>
          </table>
      </div>
    </div>
  );
}
