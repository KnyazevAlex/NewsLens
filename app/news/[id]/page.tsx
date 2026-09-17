import { auth } from "@clerk/nextjs/server"
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  FileText,
  Globe,
  Share2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { BiasBadge } from "@/app/customComponents/bias-badge"
import { BiasRatingIndicator } from "@/app/customComponents/bias-rating"
import { FramingDistribution } from "@/app/customComponents/framing-distribution"
import Header from "@/app/customComponents/header"
import LeftSideBar from "@/app/customComponents/left-side-bar"
import { Button } from "@/components/ui/button"
import { getArticleById } from "@/lib/supabase/queries/articles"

interface PageProps {
  params: Promise<{ id: string }>
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
})

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default async function NewsDetailsPage({ params }: PageProps) {
  await auth.protect()

  const { id } = await params
  const article = await getArticleById(id)
  if (!article) notFound()

  const analysis = article.analysis

  return (
    <div className="flex min-h-screen bg-neutral-50 font-sans">
      <LeftSideBar />

      <main className="flex min-w-0 flex-1 flex-col">
        <Header />

        <div className="flex-1 p-4 sm:p-8">
          <div className="mx-auto mb-6 max-w-[1600px]">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition-colors hover:text-neutral-900">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
          </div>

          <div className="mx-auto flex max-w-[1600px] flex-col gap-8 xl:flex-row">
            <article className="flex-1 space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-10">
              <header className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-500">
                    <span className="font-bold text-neutral-900">{article.source}</span>
                    <span>•</span>
                    <time dateTime={article.publishedAt}>{dateFormatter.format(new Date(article.publishedAt))}</time>
                    <span>•</span>
                    <span>{article.readTimeMinutes} min read</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-neutral-900" aria-label="Bookmark article">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-neutral-900" aria-label="Share article">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <h1 className="text-2xl font-extrabold leading-tight text-neutral-900 sm:text-3xl">{article.title}</h1>
                <p className="text-sm leading-relaxed text-neutral-600">{article.description}</p>

                {article.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {article.categories.map((category) => (
                      <span key={category} className="rounded-md bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </header>

              <div className="relative h-72 overflow-hidden rounded-xl shadow-sm sm:h-96">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={article.imageUrl} alt={article.title} className="h-full w-full object-cover" />
              </div>

              {analysis && (
                <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-neutral-900">
                    <Sparkles className="h-4 w-4 text-blue-600" /> Neutral summary
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-700">{analysis.summary}</p>
                </section>
              )}

              <div className="space-y-4 pt-2 text-sm leading-relaxed text-neutral-800 sm:text-base">
                {article.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </div>

              {!analysis && (
                <div className="rounded-xl border border-dashed border-neutral-300 px-5 py-8 text-center text-sm text-neutral-500">
                  AI analysis has not been generated for this article yet.
                </div>
              )}
            </article>

            <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-96">
              {analysis && (
                <>
                  <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-neutral-900">AI-estimated Political Framing</h2>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                        {Math.round(analysis.confidence * 100)}% confidence
                      </span>
                    </div>
                    <BiasBadge variant={analysis.biasLabel} className="w-fit px-3 py-1.5 text-sm">
                      {titleCase(analysis.biasLabel)}
                    </BiasBadge>
                    <BiasRatingIndicator value={Math.round(analysis.biasScore * 100)} />
                    <p className="rounded-lg bg-neutral-50 p-3 text-xs leading-normal text-neutral-600">
                      {analysis.disclaimer}
                    </p>
                  </section>

                  <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-neutral-900">Framing Distribution</h2>
                    <FramingDistribution
                      left={analysis.leftPercentage}
                      center={analysis.centerPercentage}
                      right={analysis.rightPercentage}
                    />
                    <div className="border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                      Sentiment: <span className="font-bold text-neutral-900">{titleCase(analysis.sentimentLabel)}</span>
                      <span className="text-neutral-400"> ({analysis.sentimentScore.toFixed(2)})</span>
                    </div>
                  </section>

                  {analysis.framingNotes.length > 0 && (
                    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                      <h2 className="text-sm font-bold text-neutral-900">Framing Notes</h2>
                      <ul className="space-y-3">
                        {analysis.framingNotes.map((note) => (
                          <li key={note} className="flex gap-2.5 text-xs leading-relaxed text-neutral-700">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />{note}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {analysis.loadedTerms.length > 0 && (
                    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                      <h2 className="text-sm font-bold text-neutral-900">Loaded Terms</h2>
                      <div className="flex flex-wrap gap-2">
                        {analysis.loadedTerms.map((term) => (
                          <span key={term} className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">{term}</span>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 text-xs shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-neutral-900">Article Details</h2>
                <div className="flex items-start justify-between gap-4 text-neutral-600">
                  <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-neutral-400" /> Published</span>
                  <span className="text-right font-medium text-neutral-900">{dateFormatter.format(new Date(article.publishedAt))}</span>
                </div>
                {article.categories.length > 0 && (
                  <div className="flex items-start justify-between gap-4 text-neutral-600">
                    <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-neutral-400" /> Category</span>
                    <span className="text-right font-medium text-neutral-900">{article.categories.join(", ")}</span>
                  </div>
                )}
                {article.region && (
                  <div className="flex items-start justify-between gap-4 text-neutral-600">
                    <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-neutral-400" /> Region</span>
                    <span className="text-right font-medium text-neutral-900">{article.region}</span>
                  </div>
                )}
                {article.author && (
                  <div className="flex items-start justify-between gap-4 text-neutral-600">
                    <span>Author</span>
                    <span className="text-right font-medium text-neutral-900">{article.author}</span>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
