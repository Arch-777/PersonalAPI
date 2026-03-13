export default function PricingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pricing & Plans</h1>
      
      <div className="grid gap-6 md:grid-cols-3 pt-6">
         <div className="p-6 bg-card rounded-xl border shadow-sm">
             <div className="font-bold text-xl mb-2">Free</div>
             <div className="text-3xl font-bold mb-4">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
             <ul className="space-y-2 mb-6 text-sm">
                 <li>- 3 Integrations</li>
                 <li>- 1,000 Documents</li>
                 <li>- Basic Search</li>
             </ul>
             <button className="w-full py-2 bg-secondary rounded-md">Current Plan</button>
         </div>
         
          <div className="p-6 bg-card rounded-xl border-2 border-primary shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-primary text-white text-xs px-2 py-1 rounded-bl-lg">POPULAR</div>
             <div className="font-bold text-xl mb-2">Pro</div>
             <div className="text-3xl font-bold mb-4">$20<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
             <ul className="space-y-2 mb-6 text-sm">
                 <li>- Unlimited Integrations</li>
                 <li>- 50,000 Documents</li>
                 <li>- RAG AI Chat</li>
                 <li>- Priority Support</li>
             </ul>
             <button className="w-full py-2 bg-primary text-primary-foreground rounded-md">Upgrade</button>
         </div>
      </div>
    </div>
  );
}
