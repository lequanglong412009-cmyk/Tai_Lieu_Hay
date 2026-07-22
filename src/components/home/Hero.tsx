import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, BookOpen, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { Document } from '../../types';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';

interface HeroProps {
  onSearch: (query: string) => void;
  documents?: Document[];
}

export const Hero: React.FC<HeroProps> = ({ onSearch, documents = [] }) => {
  const navigate = useNavigate();
  const [localQuery, setLocalQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => {
    return new Fuse(documents, {
      keys: ['title', 'category'],
      threshold: 0.35,
    });
  }, [documents]);

  const suggestions = useMemo(() => {
    if (!localQuery.trim()) return [];
    return fuse.search(localQuery, { limit: 6 }).map(r => r.item);
  }, [fuse, localQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localQuery);
    setShowSuggestions(false);
    
    // Smooth scroll to results
    const gridStart = document.getElementById('grid-start');
    if (gridStart) {
      gridStart.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section className="relative pt-8 md:pt-12 pb-4 md:pb-6 overflow-hidden bg-white">
      {/* ... keeping atmosphere components same ... */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[140%] -z-10 overflow-hidden">
        <div className="absolute top-[5%] left-[20%] w-[45%] h-[45%] bg-indigo-600/5 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[55%] h-[55%] bg-purple-600/5 rounded-full blur-[160px] animate-pulse delay-1000" />
        <div className="atmosphere absolute inset-0 opacity-40" />
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <motion.div 
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-[10%] w-24 h-24 bg-indigo-50/40 backdrop-blur-3xl rounded-3xl border border-indigo-100 hidden xl:flex items-center justify-center -rotate-6 shadow-xl"
        >
          <BookOpen className="w-10 h-10 text-indigo-600/30" />
        </motion.div>
        <motion.div 
          animate={{ y: [0, 25, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/3 right-[12%] w-32 h-32 bg-purple-50/40 backdrop-blur-3xl rounded-[2.5rem] border border-purple-100 hidden xl:flex items-center justify-center rotate-12 shadow-xl"
        >
          <Sparkles className="w-12 h-12 text-purple-600/30" />
        </motion.div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          <div className="inline-block relative">
            <span className="inline-flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] mb-4 md:mb-6 hover:bg-indigo-100 transition-all cursor-default shadow-sm relative z-10">
              <Sparkles className="w-3.5 h-3.5 animate-spin-slow text-indigo-500" /> Thư viện học liệu
            </span>
          </div>
          
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 mb-2 md:mb-4 leading-[1] md:leading-[0.85]">
            Kiến thức <br />
            <span className="relative inline-block mt-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-[length:200%_auto] animate-shimmer">
                Tuyển chọn
              </span>
              <div className="absolute -bottom-2 md:-bottom-4 left-0 w-full h-1 md:h-2 bg-indigo-600/10 rounded-full blur-md" />
            </span>
          </h1>
          
          <p className="max-w-xl mx-auto text-sm md:text-xl text-slate-500 mb-4 md:mb-6 leading-relaxed font-medium">
            Khám phá hệ thống tài liệu ôn tập và đề thi minh họa được biên soạn bởi các chuyên gia giáo dục hàng đầu.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto relative z-50 mb-4 md:mb-6" ref={searchRef}>
          <motion.form 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            onSubmit={handleSearchSubmit}
            className="relative group"
          >
            <div className="absolute -inset-6 bg-[#3B42F2]/10 rounded-[4rem] blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
            <div className="relative">
              <Search className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 md:w-6 h-6 pointer-events-none group-focus-within:text-[#3B42F2] transition-colors" />
              <input 
                type="text" 
                placeholder="Toán, Lí, Hóa, Văn..." 
                value={localQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setLocalQuery(e.target.value);
                  onSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                className="w-full pl-14 md:pl-20 pr-32 md:pr-40 py-3 md:py-4 bg-white border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-8 focus:ring-[#3B42F2]/5 focus:border-[#3B42F2]/20 transition-all shadow-premium group-hover:border-slate-200 text-sm md:text-lg font-medium tracking-tight"
              />
              <button 
                type="submit"
                className="absolute right-2 md:right-3 top-2 md:top-3 bottom-2 md:bottom-3 px-6 md:px-8 bg-slate-900 hover:bg-indigo-600 text-white rounded-[1.5rem] md:rounded-[2rem] transition-all active:scale-95 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl overflow-hidden group/btn"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Tìm <span className="hidden md:inline">kiếm</span> <Search className="w-3 h-3 md:w-4 h-4" />
                </span>
              </button>
            </div>
          </motion.form>

          {/* Intelligent Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && localQuery.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 right-0 mt-2 md:mt-4 bg-white/95 backdrop-blur-xl rounded-[1.5rem] md:rounded-[2.5rem] border border-indigo-50 shadow-2xl overflow-hidden p-2 md:p-3 z-[100]"
              >
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-indigo-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 md:w-4 h-4 text-indigo-600 animate-pulse" />
                    <span className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-widest">Gợi ý thông minh</span>
                  </div>
                  <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Phát hiện {suggestions.length} tài liệu</span>
                </div>
                
                <div className="p-1 md:p-2 max-h-[300px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                  {suggestions.length > 0 ? (
                    suggestions.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => {
                          navigate(`/documents/${doc.id}`);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-indigo-50/50 rounded-xl md:rounded-2xl transition-all group/item text-left"
                      >
                        <div className="w-10 h-10 md:w-12 h-12 rounded-lg md:rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all shrink-0">
                          <BookOpen className="w-5 h-5 md:w-6 h-6" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="text-xs md:text-sm font-black text-slate-900 group-hover/item:text-indigo-600 transition-colors truncate">
                            {doc.title}
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 mt-1">
                            <span className="px-1.5 md:px-2 py-0.5 bg-slate-100 rounded text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                              {doc.category}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 md:w-5 h-5 text-slate-200 group-hover/item:text-indigo-600 group-hover/item:translate-x-1 transition-all" />
                      </button>
                    ))
                  ) : (
                    <div className="py-8 md:py-12 text-center">
                      <Loader2 className="w-6 h-6 md:w-8 h-8 text-indigo-200 animate-spin mx-auto mb-3 md:mb-4" />
                      <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Đang phân tích Node dữ liệu...</p>
                    </div>
                  )}
                </div>
                
                {suggestions.length > 0 && (
                  <div className="p-3 md:p-4 bg-indigo-50/30 rounded-b-[1.5rem] md:rounded-b-[2rem] text-center">
                    <button 
                      onClick={() => {
                        onSearch(localQuery);
                        setShowSuggestions(false);
                        document.getElementById('grid-start')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                      Xem toàn bộ kết quả cho "{localQuery}"
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Compact Stats Bar Removed */}
      </div>
    </section>
  );
};
