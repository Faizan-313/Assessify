import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaBars, FaSignOutAlt, FaChevronDown, FaTachometerAlt } from 'react-icons/fa';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../context/AuthContextCore';

function NavBar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const location = useLocation();

    const getUserInitials = (name, email) => {
        const source = (name || email || "").trim();
        const parts = source.split(" ").filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return source.slice(0, 2).toUpperCase();
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setIsOpen(false);
        setProfileOpen(false);
        navigate('/');
    };

    const isCreateExamPage =
        location.pathname === "/create-exam" ||
        location.pathname === "/dashboard" ||
        location.pathname === "/docs";

    const navLinks = user
        ? [
            { name: 'Home', href: '/' },
            { name: 'Docs', href: '/docs' },
            { name: 'Create Exam', href: '/create-exam' },
        ]
        : [
            { name: 'Home', href: '/' },
            { name: 'Docs', href: '/docs' },
            { name: 'Start Exam', href: '/exam' },
        ];

    return (
        <nav className={`fixed w-full top-0 z-[60] transition-all duration-300 
            ${isCreateExamPage || scrolled
                ? "bg-gray-900/95 backdrop-blur-md shadow-lg"
                : "bg-transparent"
            }`}>
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-2 group">
                        <div className="relative">
                            <img
                                src="/logo3.svg"
                                alt="Assessify"
                                className="w-10 h-10 transform group-hover:rotate-12 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.22)]"
                            />
                        </div>
                        <span className="text-2xl font-bold">
                            <span className="text-white">Assess</span>
                            <span className="bg-gradient-to-r from-sky-900 to-emerald-100 bg-clip-text text-transparent">ify</span>
                            <span className="text-amber-400">.</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-1">
                        {navLinks.map((link, index) => {
                            const isActive = location.pathname === link.href;
                            return (
                                <Link
                                    key={index}
                                    to={link.href}
                                    className={`relative px-4 py-2 font-medium transition-colors group ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`}
                                >
                                    {link.name}
                                    <span
                                        className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`}
                                    />
                                </Link>
                            );
                        })}
                    </div>

                    {/* Desktop Auth */}
                    <div className="hidden lg:flex items-center space-x-3">
                        {user ? (
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex items-center space-x-3 px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 font-medium"
                                >
                                    <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 text-slate-100 flex items-center justify-center text-sm font-semibold">
                                        {getUserInitials(user.name, user.email)}
                                    </div>
                                    <span className="truncate max-w-[10rem] text-left">{user.name || user.email}</span>
                                    <FaChevronDown className={`text-sm transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Profile Dropdown */}
                                <div className={`absolute right-0 mt-2 w-56 bg-gray-800/95 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-xl overflow-hidden transition-all duration-300 ${
                                    profileOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                                }`}>
                                    <div className="p-3 border-b border-gray-700/50">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-100">
                                                {getUserInitials(user.name, user.email)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold truncate">{user.name || 'User'}</p>
                                                <p className="text-white/60 text-sm truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        <Link
                                            to="/dashboard"
                                            onClick={() => setProfileOpen(false)}
                                            className="flex items-center space-x-3 px-3 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 font-medium"
                                        >
                                            <FaTachometerAlt className="text-cyan-400" />
                                            <span>Dashboard</span>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center space-x-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 font-medium"
                                        >
                                            <FaSignOutAlt />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Link
                                    to="/signin"
                                    className={`relative px-5 py-2 font-medium transition-colors group ${location.pathname === '/signin' ? 'text-white' : 'text-white/70 hover:text-white'}`}
                                >
                                    Login
                                    <span
                                        className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300 ${location.pathname === '/signin' ? 'w-full' : 'w-0 group-hover:w-full'}`}
                                    />
                                </Link>
                                <Link
                                    to="/signup"
                                    className={`px-6 py-2 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-sky-500/25 ${location.pathname === '/signup' ? 'ring-2 ring-emerald-300/70 ring-offset-2 ring-offset-gray-900' : ''}`}
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isOpen ? (
                            <FaTimes className="w-6 h-6" />
                        ) : (
                            <FaBars className="w-6 h-6" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                <div className={`lg:hidden overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                }`}>
                    <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 space-y-2 border border-gray-700/50">
                        {user && (
                            <div className="flex items-center space-x-3 px-4 py-3 mb-2 bg-slate-900/90 rounded-lg border border-slate-700/50">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-100">
                                    {getUserInitials(user.name, user.email)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold truncate">{user.name || 'User'}</p>
                                    <p className="text-white/60 text-sm truncate">{user.email}</p>
                                </div>
                            </div>
                        )}

                        {navLinks.map((link, index) => {
                            const isActive = location.pathname === link.href;
                            return (
                                <Link
                                    key={index}
                                    to={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`block px-4 py-3 rounded-lg transition-all duration-200 font-medium border ${isActive
                                        ? 'text-white bg-gradient-to-r from-sky-500/20 to-emerald-500/20 border-sky-400/40'
                                        : 'text-white/80 hover:text-white hover:bg-white/10 border-transparent'
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}

                        {user && (
                            <div className="border-t border-gray-700/50 pt-2">
                                <Link
                                    to="/dashboard"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center space-x-3 px-4 py-3 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 font-medium"
                                >
                                    <FaTachometerAlt className="text-cyan-400" />
                                    <span>Dashboard</span>
                                </Link>
                            </div>
                        )}

                        <div className="border-t border-gray-700/50 pt-2 space-y-2">
                            {user ? (
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 font-medium rounded-lg transition-all duration-200 border border-red-500/50"
                                >
                                    <FaSignOutAlt />
                                    <span>Logout</span>
                                </button>
                            ) : (
                                <>
                                    <Link
                                        to="/signin"
                                        onClick={() => setIsOpen(false)}
                                        className={`block px-4 py-3 rounded-lg transition-all duration-200 font-medium border ${location.pathname === '/signin'
                                            ? 'text-white bg-gradient-to-r from-sky-500/20 to-emerald-500/20 border-sky-400/40'
                                            : 'text-white/80 hover:text-white hover:bg-white/10 border-transparent'
                                        }`}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/signup"
                                        onClick={() => setIsOpen(false)}
                                        className={`block px-4 py-3 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-semibold rounded-lg transition-all duration-300 text-center ${location.pathname === '/signup' ? 'ring-2 ring-emerald-300/70 ring-offset-2 ring-offset-gray-800' : ''}`}
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default NavBar;