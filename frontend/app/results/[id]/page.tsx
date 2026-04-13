import ErrorState from "@/components/ErrorState"
import ResultsWorkspace from "@/components/ResultsWorkspace"
import { getIntegratedResultWithFallback } from "@/lib/api"

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getIntegratedResultWithFallback(id)

  if (!result) {
    return <ErrorState />
  }

  return <ResultsWorkspace result={result} />
}
