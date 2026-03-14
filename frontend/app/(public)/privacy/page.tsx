/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function PrivacyPage() {
  const filePath = path.join(process.cwd(), "..", "PRIVACY.md");
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    content = "Privacy policy content could not be loaded.";
  }

  return (
    <div className="max-w-4xl mx-auto py-16 px-6 sm:px-12">
      <div className="text-foreground">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node: _node, ...props}: any) => <h1 className="text-4xl font-bold tracking-tight mb-8 mt-4" {...props} />,
            h2: ({node: _node, ...props}: any) => <h2 className="text-2xl font-semibold tracking-tight mb-4 mt-12 pb-2 border-b border-border" {...props} />,
            h3: ({node: _node, ...props}: any) => <h3 className="text-xl font-medium tracking-tight mb-3 mt-8" {...props} />,
            p: ({node: _node, ...props}: any) => <p className="mb-4 text-muted-foreground leading-relaxed" {...props} />,
            ul: ({node: _node, ...props}: any) => <ul className="list-disc pl-6 mb-6 space-y-2 text-muted-foreground" {...props} />,
            li: ({node: _node, ...props}: any) => <li {...props} />,
            a: ({node: _node, ...props}: any) => <a className="text-primary hover:underline font-medium" {...props} />,
            table: ({node: _node, ...props}: any) => <div className="overflow-x-auto mb-8 ring-1 ring-border rounded-lg"><table className="w-full text-left border-collapse text-sm" {...props} /></div>,
            th: ({node: _node, ...props}: any) => <th className="border-b border-border p-4 bg-muted/40 font-semibold text-foreground" {...props} />,
            td: ({node: _node, ...props}: any) => <td className="border-b border-border p-4 text-muted-foreground" {...props} />,
            blockquote: ({node: _node, ...props}: any) => <blockquote className="border-l-4 border-primary/40 pl-5 py-2 italic bg-muted/20 my-6 rounded-r-lg text-muted-foreground" {...props} />,
            strong: ({node: _node, ...props}: any) => <strong className="font-semibold text-foreground" {...props} />
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
