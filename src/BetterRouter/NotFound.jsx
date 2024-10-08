/**
 * v0 by Vercel.
 * @see https://v0.dev/t/UyVta1qd6gU
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */

import Link from "./Link";
import errorImg from '@/assets/images/error.svg';

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-[100vh] items-center justify-center space-y-4 p-4 dark:bg-gray-950 dark:text-gray-50">
      <img
        src={errorImg}
        width="400"
        height="200"
        alt="Illustration"
        className="mx-auto aspect-[2/1] overflow-hidden rounded-lg object-cover object-center"
      />
      <div className="flex flex-col items-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">404 - Page Not Found</h1>
        <p className="mx-auto max-w-[400px] text-center text-gray-500 md:text-xl/relaxed dark:text-gray-400">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-md bg-gray-900 px-8 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
          prefetch={false}
        >
          Back to the homepage
        </Link>
      </div>
    </div>
  )
}