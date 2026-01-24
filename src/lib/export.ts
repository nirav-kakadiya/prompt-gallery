/**
 * Export Utilities
 *
 * Provides data export functionality for user prompts.
 * Industry standard: GDPR compliance, data portability.
 */

export interface ExportablePrompt {
  id: string;
  title: string;
  promptText: string;
  type: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  copyCount?: number;
  likeCount?: number;
}

/**
 * Export prompts as JSON file
 */
export function exportAsJSON(prompts: ExportablePrompt[], filename = "prompts-export") {
  const data = {
    exportedAt: new Date().toISOString(),
    count: prompts.length,
    prompts: prompts.map((p) => ({
      title: p.title,
      promptText: p.promptText,
      type: p.type,
      tags: p.tags,
      isPublic: p.isPublic,
      createdAt: p.createdAt,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Export prompts as CSV file
 */
export function exportAsCSV(prompts: ExportablePrompt[], filename = "prompts-export") {
  const headers = ["Title", "Prompt Text", "Type", "Tags", "Public", "Created At"];

  const escapeCSV = (str: string) => {
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = prompts.map((p) => [
    escapeCSV(p.title),
    escapeCSV(p.promptText),
    escapeCSV(p.type),
    escapeCSV(p.tags.join("; ")),
    p.isPublic ? "Yes" : "No",
    escapeCSV(p.createdAt),
  ]);

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export prompts as Markdown file
 */
export function exportAsMarkdown(prompts: ExportablePrompt[], filename = "prompts-export") {
  const lines: string[] = [
    "# My Prompts Export",
    "",
    `Exported on: ${new Date().toLocaleDateString()}`,
    `Total prompts: ${prompts.length}`,
    "",
    "---",
    "",
  ];

  prompts.forEach((p, index) => {
    lines.push(`## ${index + 1}. ${p.title}`);
    lines.push("");
    lines.push(`**Type:** ${p.type}`);
    lines.push(`**Visibility:** ${p.isPublic ? "Public" : "Private"}`);
    if (p.tags.length > 0) {
      lines.push(`**Tags:** ${p.tags.join(", ")}`);
    }
    lines.push(`**Created:** ${new Date(p.createdAt).toLocaleDateString()}`);
    lines.push("");
    lines.push("```");
    lines.push(p.promptText);
    lines.push("```");
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8;" });
  downloadBlob(blob, `${filename}.md`);
}

/**
 * Helper to trigger file download
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
