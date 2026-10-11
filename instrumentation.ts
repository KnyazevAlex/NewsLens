import { OpenTelemetry } from "@ai-sdk/otel"
import { SeverityNumber } from "@opentelemetry/api-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { PostHogSpanProcessor } from "@posthog/ai/otel"
import { registerTelemetry } from "ai"

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

export let posthogSpanProcessor: PostHogSpanProcessor | undefined
export let posthogLoggerProvider: LoggerProvider | undefined

const posthogLogAttributes = new Set(["operation", "status", "selected", "analyzed", "skipped", "failed", "error_type"])

type PostHogLogAttributes = Record<string, string | number | boolean>

export function emitPostHogLog(
  severityNumber: SeverityNumber,
  body: string,
  attributes: PostHogLogAttributes,
) {
  const safeAttributes = Object.fromEntries(
    Object.entries(attributes).filter(([key]) => posthogLogAttributes.has(key)),
  )

  posthogLoggerProvider?.getLogger("news-analysis.posthog").emit({
    severityNumber,
    body,
    attributes: safeAttributes,
  })
}

if (!projectToken) {
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
    )
  }
} else if (!host) {
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
    )
  }
} else {
  posthogSpanProcessor = new PostHogSpanProcessor({ projectToken, host })
  posthogLoggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({ "service.name": "news-analysis" }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${host}/i/v1/logs`,
          headers: {
            Authorization: `Bearer ${projectToken}`,
            "Content-Type": "application/json",
          },
        }),
      }),
    ],
  })

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ "service.name": "news-analysis" }),
    spanProcessors: [posthogSpanProcessor],
  })

  sdk.start()

  registerTelemetry(
    new OpenTelemetry({
      enrichSpan: ({ runtimeContext }) => ({
        "$ai_session_id":
          typeof runtimeContext?.sessionId === "string" ? runtimeContext.sessionId : undefined,
        "$ai_trace_name":
          typeof runtimeContext?.traceName === "string" ? runtimeContext.traceName : undefined,
      }),
    }),
  )
}

export function register() {}

export async function flushPostHogLogs() {
  try {
    await posthogLoggerProvider?.forceFlush()
  } catch (error) {
    console.error("[PostHog Logs] Export flush failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
  }
}

export async function flushAiObservability() {
  try {
    await posthogSpanProcessor?.forceFlush()
  } catch (error) {
    console.error("[PostHog AI] Observability flush failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
  }
}
