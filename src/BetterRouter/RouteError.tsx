import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** A lazy chunk that no longer exists on the server, typically right after a deploy. */
function isStaleChunkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
}

export default function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const staleChunk = isStaleChunkError(error);

  if (import.meta.env.DEV) {
    console.error(error);
  }

  const title = notFound ? 'Page not found' : staleChunk ? 'A new version is available' : 'Something went wrong';
  const description = notFound
    ? "The page you're looking for doesn't exist or was moved."
    : staleChunk
      ? 'The app was updated while you had it open. Reload to get the latest version.'
      : 'An unexpected error occurred while showing this page. Try again, or go back to Home.';

  return (
    <div role="alert" className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">
        {!notFound && (
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reload
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate('/')}>
          Go to Home
        </Button>
      </div>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="mt-4 max-w-2xl overflow-auto rounded-md bg-muted p-3 text-left text-xs">{error.stack}</pre>
      )}
    </div>
  );
}
