import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "./Link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileQuestion className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist, was moved, or you don&apos;t have access to it.
        </p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Go to Home
      </Link>
    </div>
  );
}
