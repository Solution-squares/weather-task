'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md text-center">
            <h1 className="text-4xl font-bold text-gray-900">500</h1>
            <h2 className="mt-4 text-xl font-semibold text-gray-700">
              Something went wrong
            </h2>
            <p className="mt-2 text-gray-600">{error.message}</p>
            <button
              onClick={reset}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

