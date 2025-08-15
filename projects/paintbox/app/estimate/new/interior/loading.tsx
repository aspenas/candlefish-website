import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function InteriorLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Loading interior measurement tools...</p>
      </div>
    </div>
  );
}