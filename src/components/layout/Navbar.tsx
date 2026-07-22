import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, LogOut, Users, X, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

export const Navbar: React.FC = () => {
  const { user, login, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await login();
      setIsLoginModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đăng nhập thất bại";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] py-2 md:py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto h-16 md:h-20 px-4 md:px-6 rounded-[1rem] md:rounded-[1.5rem] bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex items-center justify-between transition-all duration-500">
        <Link
          to={
            user?.email === "tailieuhay53@gmail.com"
              ? location.pathname === "/admin"
                ? "/"
                : "/admin"
              : location.pathname === "/profile" &&
                  (!location.search ||
                    location.search.includes("tab=purchased"))
                ? "/"
                : "/profile?tab=purchased"
          }
          className="flex items-center gap-3 active:scale-95 transition-transform group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:rotate-6 transition-transform shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              Tailieu<span className="text-indigo-600">hay</span>
            </span>
            {user?.email === "tailieuhay53@gmail.com" ? (
              location.pathname === "/admin" ? (
                <span className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 group-hover:text-indigo-600 transition-colors">
                  nhấp vào đây quay trở về trang chủ
                </span>
              ) : (
                <span className="block md:hidden text-[8px] text-rose-500 font-black mt-0.5 uppercase tracking-tighter animate-pulse">
                  nhấp vào đây để xem trang quản trị
                </span>
              )
            ) : location.pathname === "/profile" &&
              (!location.search ||
                location.search.includes("tab=purchased")) ? (
              <span className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 group-hover:text-indigo-600 transition-colors">
                nhấp vào đây quay trở về trang chủ
              </span>
            ) : (
              <span className="block md:hidden text-[8px] text-rose-500 font-black mt-0.5 uppercase tracking-tighter animate-pulse">
                nhấp vào đây để xem tài liệu
              </span>
            )}
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 hover:text-indigo-600 transition-colors"
          >
            Trang chủ
          </Link>
          <Link
            to="/profile?tab=purchased"
            className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6B7280] hover:text-indigo-600 transition-colors"
          >
            Tài liệu của tôi
          </Link>
          <Link
            to="/wallet"
            className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6B7280] hover:text-indigo-600 transition-colors"
          >
            Ví của tôi
          </Link>
          {user?.email === "tailieuhay53@gmail.com" && (
            <Link to="/admin" className="flex items-center gap-2 group">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 group-hover:text-emerald-500 transition-colors">
                Admin Dashboard
              </span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link
                to={
                  user?.email === "tailieuhay53@gmail.com"
                    ? "/admin"
                    : "/profile"
                }
                className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-slate-50 border border-slate-100 hover:bg-white hover:border-indigo-100 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white group-hover:scale-105 transition-transform overflow-hidden">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (user.username || user.displayName || user.email || "?")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none mb-0.5">
                    {user.username || user.displayName || "Học sinh"}
                  </p>
                  <p className="text-[9px] text-emerald-600 font-bold">
                    {user.isAdmin ? "Quản trị viên" : "Học sinh"}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-11 h-11 rounded-2xl bg-slate-50 text-[#6B7280] hover:text-red-500 hover:bg-red-50 border border-slate-100 hover:border-red-100 transition-all flex items-center justify-center active:scale-90 shadow-sm"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 active:scale-95"
            >
              <Users className="w-3.5 h-3.5" />
              Đăng nhập
            </button>
          )}
        </div>
      </div>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    Đăng nhập
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Truy cập kho tài liệu của bạn
                  </p>
                </div>
                <button
                  onClick={() => setIsLoginModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-xs font-medium text-slate-600 px-4">
                    Sử dụng tài khoản Google để truy cập nhanh chóng và bảo mật.
                  </p>
                </div>

                {error && (
                  <p className="text-xs text-red-500 font-bold text-center bg-red-50 py-3 rounded-xl border border-red-100 px-4">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleLogin}
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-white border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 text-slate-900 rounded-xl font-black uppercase tracking-[0.1em] text-[11px] transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 group"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <img
                        src="https://www.google.com/favicon.ico"
                        alt="Google"
                        className="w-4 h-4"
                      />
                      Tiếp tục với Google
                    </>
                  )}
                </button>

                <p className="text-[9px] text-[#6B7280] font-bold text-center px-2 leading-relaxed">
                  Đăng nhập bằng Gmail giúp bạn quản lý tài liệu và khóa học đã
                  mua một cách an toàn nhất.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};
