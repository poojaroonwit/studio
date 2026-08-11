import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-foreground">
          Page Not Found
        </h2>
        <p className="mb-6 text-muted-foreground">
          Could not find the requested resource
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
