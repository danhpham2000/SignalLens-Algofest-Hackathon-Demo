import Link from "next/link"
import { ArrowLeft, TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ErrorStateProps = {
  title?: string
  description?: string
}

export default function ErrorState({
  title = "Result not found",
  description = "This analysis payload is missing or the result ID does not match the current demo data.",
}: ErrorStateProps) {
  return (
    <div className="page-shell py-16">
      <Card className="panel-surface mx-auto max-w-2xl gap-4 border-0 bg-transparent py-0 shadow-none ring-0">
        <CardHeader className="px-0 pt-0">
          <Badge variant="destructive" className="w-fit rounded-full">
            <TriangleAlert className="h-3 w-3" />
            Investigation unavailable
          </Badge>
          <CardTitle className="font-heading text-3xl font-semibold">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-0">
          <p className="text-sm/6 text-muted-foreground">{description}</p>
          <Button asChild className="rounded-full">
            <Link href="/">
              <ArrowLeft />
              Back to home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
