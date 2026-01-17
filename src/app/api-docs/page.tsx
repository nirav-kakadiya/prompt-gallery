import { Metadata } from "next";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Prompt Gallery API reference",
};

const endpoints = [
  { method: "GET", path: "/api/prompts", description: "List all prompts with optional filters" },
  { method: "GET", path: "/api/prompts/:id", description: "Get a single prompt by ID or slug" },
  { method: "POST", path: "/api/prompts", description: "Create a new prompt (auth required)" },
  { method: "POST", path: "/api/prompts/:id/copy", description: "Track a copy action" },
  { method: "GET", path: "/api/categories", description: "List all categories" },
  { method: "GET", path: "/api/prompts/trending", description: "Get trending prompts" },
];

export default function ApiDocsPage() {
  return (
    <PageLayout>
      <PageHeader title="API Documentation" description="Build with the Prompt Gallery API" />

      <div className="max-w-4xl pb-16 space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Authentication</h2>
          <p className="text-muted-foreground mb-4">
            Include your API key in the Authorization header:
          </p>
          <pre className="p-4 rounded-xl bg-muted overflow-x-auto text-sm">
            <code>Authorization: Bearer YOUR_API_KEY</code>
          </pre>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Endpoints</h2>
          <div className="space-y-4">
            {endpoints.map((endpoint) => (
              <div key={endpoint.path} className="p-4 rounded-xl border">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                    endpoint.method === "GET" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-sm">{endpoint.path}</code>
                </div>
                <p className="text-sm text-muted-foreground">{endpoint.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Rate Limits</h2>
          <p className="text-muted-foreground">
            API requests are limited to 100 requests per minute. Contact us if you need higher limits.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
