import { source } from "@/lib/source";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mailshot.dev";

export function GET() {
  const pages = source.getPages();

  const lines: string[] = [
    "# mailshot",
    "",
    "> Open-source email sequencing framework for AWS, managed through Claude Code.",
    "",
    "mailshot is a serverless email sequencing framework built on AWS Step Functions, SES, DynamoDB, and EventBridge. You define sequences in TypeScript, render templates with React Email, and manage subscribers, analytics, and deployment entirely through Claude Code.",
    "",
    "## Docs",
    "",
    ...pages.map(
      (page) => `- [${page.data.title}](${baseUrl}${page.url}): ${page.data.description ?? ""}`,
    ),
    "",
    "## Links",
    "",
    `- [Documentation](${baseUrl}/docs)`,
    `- [GitHub](https://github.com/mdwt/mailshot)`,
    `- [npm: create-mailshot](https://www.npmjs.com/package/create-mailshot)`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
