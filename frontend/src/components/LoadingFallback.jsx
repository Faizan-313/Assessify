import { Loader } from "lucide-react";

export function LoadingFallback() {
    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-950">
        <div className="text-center">
            <div className="animate-spin inline-flex h-8 w-8 text-violet-400 mb-4">
            <Loader size={32} />
            </div>
            <p className="text-gray-400">Loading...</p>
        </div>
        </div>
    );
}
