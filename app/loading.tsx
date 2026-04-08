import { Activity } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-brand-sky/10 flex items-center justify-center animate-pulse">
          <Activity className="w-6 h-6 text-brand-sky" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}
