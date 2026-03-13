export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Profile</h2>
          <div className="grid gap-2">
              <label className="text-sm font-medium">Full Name</label>
              <input type="text" className="p-2 border rounded-md" defaultValue="User Name" />
          </div>
           <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <input type="email" className="p-2 border rounded-md bg-muted" defaultValue="user@example.com" disabled />
          </div>
      </div>

       <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Preferences</h2>
          <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Dark Mode</label>
              <button className="w-10 h-6 bg-primary rounded-full relative">
                  <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
              </button>
          </div>
           <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Email Notifications</label>
               <button className="w-10 h-6 bg-primary rounded-full relative">
                  <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
              </button>
          </div>
      </div>
    </div>
  );
}
