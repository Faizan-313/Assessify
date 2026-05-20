import { Home, Zap, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PageNotFound() {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-teal-900 to-black-900 flex items-center justify-center p-4 relative overflow-hidden">

            <div className="max-w-2xl w-full text-center relative z-10">
                <div className="absolute inset-0 bg-red-900 opacity-15 h-95 animate-pulse rounded-4xl" />

                <div className="relative mb-8">
                    <h1
                        className={`text-9xl md:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-pink-500 to-red-500 leading-none select-none`}
                    >
                        404
                    </h1>

                    <div className="absolute top-4 left-4 animate-bounce">
                        <Zap className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div className="absolute top-8 right-8 animate-bounce delay-300">
                        <Star className="w-6 h-6 text-[#5c8374]" />
                    </div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-bounce delay-500">
                        <div className="w-3 h-3 bg-[#5c8374] rounded-full" />
                    </div>
                </div>

                <div className="mb-8 space-y-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        Oops! Page Not Found
                    </h2>
                    <p className="text-lg text-gray-300 max-w-md mx-auto leading-relaxed">
                        The page you're looking for seems to have vanished into the digital void.
                        Don't worry, even the best explorers get lost sometimes!
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                    <button
                        onClick={handleGoHome}
                        className="group relative px-8 py-4 bg-gradient-to-r from-[#5c8374] to-[#1b4242] text-white font-semibold rounded-full overflow-hidden transition-all duration-300 hover:from-[#1b4242] hover:to-[#092635] hover:scale-105 hover:shadow-2xl hover:shadow-[#5c8374]/25"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#5c8374] to-[#1b4242] opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                        <div className="relative flex items-center gap-3">
                            <Home className="w-5 h-5" />
                            <span>Go Home</span>
                        </div>
                    </button>
                </div>

                <div className="mt-8 text-sm text-gray-200">
                    <p>
                        Fun fact: Colleges waste your precious time in the most useless things, and pretend like this will benefit you in the future.🌐
                    </p>
                </div>
            </div>
        </div>
    );
}