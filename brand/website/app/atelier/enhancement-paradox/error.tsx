'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-gray-400">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-cyan-500 text-black rounded hover:bg-cyan-400"
        >
          Try again
        </button>
      </div>
    </div>
  );
}