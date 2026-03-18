import type { Metadata } from "next";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { DocsPage, DocsBody, DocsDescription, DocsTitle } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  // fumadocs-mdx injects body/toc at runtime but types don't reflect it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { body: MDX, toc, full } = page.data as Record<string, any>;

  return (
    <DocsPage toc={toc} full={full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>{MDX ? <MDX components={{ ...defaultMdxComponents }} /> : null}</DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mailshot.dev";

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const url = `${baseUrl}${page.url}`;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      url,
      type: "article",
      images: [
        {
          url: "/og-image.png",
          alt: `${page.data.title} | mailshot`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
      images: ["/og-image.png"],
    },
  };
}
