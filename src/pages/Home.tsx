import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hero } from '../components/home/Hero';
import { DocumentCard } from '../components/home/DocumentCard';
import { CourseCard } from '../components/home/CourseCard';
import { getDocuments, getCourses } from '../services/marketplaceService';
import { Document, Course } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, BookOpen, ArrowRight, X, ShieldCheck, Zap } from 'lucide-react';
import Fuse from 'fuse.js';
import { sortItemsByPriorityAndDate } from '../lib/utils';

const GRADES = ['Tất cả', 'Lớp 10', 'Lớp 11', 'Lớp 12', 'Combo'];
const SUBJECTS = ['Tất cả', 'Toán', 'Lí', 'Hóa', 'Sinh', 'Anh', 'Sử', 'Địa', 'Tin', 'Văn'];

const HelpAccordionItem: React.FC<{ step: { id: string, title: string, desc: string } }> = ({ step }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="group overflow-hidden rounded-3xl border border-slate-100 transition-all hover:border-indigo-100">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex gap-6 p-6 items-center text-left hover:bg-slate-50/50 transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-[#0B1221] text-white flex items-center justify-center shrink-0 shadow-lg group-hover:bg-[#3B42F2] transition-all">
          <span className="font-bold text-[10px]">{step.id}</span>
        </div>
        <h4 className="flex-1 font-black text-[#0B1221] text-xs uppercase tracking-widest">{step.title}</h4>
        <ArrowRight className={`w-4 h-4 text-slate-300 transition-transform duration-500 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 md:px-20 pb-8 pr-12 text-slate-500 text-[11px] font-bold leading-relaxed border-t border-slate-50 pt-4 bg-slate-50/30">
              {step.desc}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [viewType, setViewType] = useState<'docs' | 'courses'>('docs');
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState('Tất cả');
  const [selectedSubject, setSelectedSubject] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Sync state with query parameters
  useEffect(() => {
    const gradeParam = searchParams.get('grade');
    const qParam = searchParams.get('q');
    const typeParam = searchParams.get('type');

    if (gradeParam && GRADES.includes(gradeParam)) {
      setSelectedGrade(gradeParam);
      // Auto scroll to results if on mobile
      if (window.innerWidth < 768) {
        document.getElementById('grid-start')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    if (qParam) {
      setSearchQuery(qParam);
    }
    if (typeParam === 'courses') {
      setViewType('courses');
    }
  }, [searchParams]);

  // Initialize Fuse instance for documents
  const fuseDocs = useMemo(() => {
    return new Fuse(allDocs, {
      keys: ['title', 'description', 'category'],
      threshold: 0.2,
      ignoreLocation: true,
      includeMatches: true,
      minMatchCharLength: 2
    });
  }, [allDocs]);

  // Initialize Fuse instance for courses
  const fuseCourses = useMemo(() => {
    return new Fuse(allCourses, {
      keys: ['title', 'description', 'category', 'instructor'],
      threshold: 0.2,
      ignoreLocation: true,
      includeMatches: true,
      minMatchCharLength: 2
    });
  }, [allCourses]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const [docsData, coursesData] = await Promise.all([
          getDocuments(),
          getCourses()
        ]);
        setAllDocs(docsData);
        setAllCourses(coursesData);
      } catch (error) {
        console.error('Failed to pre-fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const filterItems = () => {
      setLoading(true);
      
      if (viewType === 'docs') {
        let filtered = allDocs;
        if (selectedGrade !== 'Tất cả') {
          filtered = filtered.filter(d => {
            if (!d.category) return false;
            const parts = d.category.split(' | ');
            return parts[0] === selectedGrade || d.category === selectedGrade;
          });
        }
        if (selectedSubject !== 'Tất cả') {
          filtered = filtered.filter(d => {
            if (!d.category) return false;
            const parts = d.category.split(' | ');
            return (parts.length > 1 ? parts[1].trim() === selectedSubject : d.category === selectedSubject);
          });
        }

        if (searchQuery.trim()) {
          const results = fuseDocs.search(searchQuery).map(r => r.item);
          setDocs(sortItemsByPriorityAndDate(results.filter(item => {
             if (!item.category) return false;
             const parts = item.category.split(' | ');
             const gradeMatch = selectedGrade === 'Tất cả' || parts[0] === selectedGrade || item.category === selectedGrade;
             const subjectMatch = selectedSubject === 'Tất cả' || (parts.length > 1 ? parts[1].trim() === selectedSubject : item.category === selectedSubject);
             return gradeMatch && subjectMatch;
          })));
        } else {
          setDocs(sortItemsByPriorityAndDate(filtered));
        }
      } else {
        let filtered = allCourses;
        if (selectedGrade !== 'Tất cả') {
          filtered = filtered.filter(d => {
            if (!d.category) return false;
            const parts = d.category.split(' | ');
            return parts[0] === selectedGrade || d.category === selectedGrade;
          });
        }
        if (selectedSubject !== 'Tất cả') {
          filtered = filtered.filter(d => {
            if (!d.category) return false;
            const parts = d.category.split(' | ');
            return (parts.length > 1 ? parts[1].trim() === selectedSubject : d.category === selectedSubject);
          });
        }

        if (searchQuery.trim()) {
          const results = fuseCourses.search(searchQuery).map(r => r.item);
          setCourses(sortItemsByPriorityAndDate(results.filter(item => {
             if (!item.category) return false;
             const parts = item.category.split(' | ');
             const gradeMatch = selectedGrade === 'Tất cả' || parts[0] === selectedGrade || item.category === selectedGrade;
             const subjectMatch = selectedSubject === 'Tất cả' || (parts.length > 1 ? parts[1].trim() === selectedSubject : item.category === selectedSubject);
             return gradeMatch && subjectMatch;
          })));
        } else {
          setCourses(sortItemsByPriorityAndDate(filtered));
        }
      }
      
      setLoading(false);
    };

    filterItems();
  }, [selectedGrade, selectedSubject, searchQuery, allDocs, allCourses, viewType, fuseDocs, fuseCourses]);

const NoResults: React.FC<{ reset: () => void }> = ({ reset }) => (
  <div className="py-32 text-center bg-white rounded-[3.5rem] border border-slate-100 shadow-premium relative overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-50/50 rounded-full blur-[100px] -z-10" />
    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-xl">
      <Search className="w-10 h-10 text-indigo-500" />
    </div>
    <h3 className="text-3xl font-black text-[#0B1221] mb-4 tracking-tight">Không tìm thấy nội dung phù hợp</h3>
    <p className="text-slate-400 text-sm max-w-sm mx-auto mb-10 font-bold uppercase tracking-widest leading-loose">Bạn hãy thử thay đổi bộ lọc hoặc tìm kiếm theo từ khóa khác nhé.</p>
    <button 
      onClick={reset}
      className="px-12 py-5 bg-[#0B1221] hover:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95"
    >
      Thiết lập lại bộ lọc
    </button>
  </div>
);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Hero onSearch={setSearchQuery} documents={allDocs} />

      {/* Modern Tabbox Filter - Optimized for Mobile */}
      <section id="filters" className="sticky top-[80px] md:top-[112px] z-40 bg-white/90 backdrop-blur-3xl border-b border-slate-100 py-1 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-1.5 lg:gap-8 items-start lg:items-center">
            {/* Grade Tabs */}
            <div className="flex flex-col lg:gap-1.5 w-full lg:w-auto">
               <span className="hidden md:block text-[8px] md:text-[9px] font-black text-slate-400 uppercase bg-slate-50/50 px-2 py-0.5 rounded-md border border-slate-100/50 w-fit">Khối lớp</span>
               <div className="flex overflow-x-auto lg:overflow-visible no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 gap-0.5 md:gap-1 p-0.5 bg-slate-100/50 md:bg-slate-100/80 rounded-lg md:rounded-xl shrink-0">
                {GRADES.map(grade => (
                  <button
                    key={grade}
                    onClick={() => {
                      setSelectedGrade(grade);
                      if (grade === 'Tất cả') {
                        setSelectedSubject('Tất cả');
                      }
                      if (window.innerWidth < 768) {
                        setTimeout(() => {
                           document.getElementById('grid-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }
                    }}
                    className={`px-2.5 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 relative whitespace-nowrap ${
                      selectedGrade === grade 
                      ? 'text-white' 
                      : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {grade}
                    {selectedGrade === grade && (
                      <motion.div layoutId="activeGrade" className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md -z-10" transition={{ type: 'spring', bounce: 0.2 }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Divider / Subject Filters */}
            {selectedGrade !== 'Tất cả' && (
              <>
                <div className="hidden lg:block w-px h-8 bg-slate-200/50" />
                <div className="flex-1 space-y-1 w-full lg:w-auto mt-2 lg:mt-0">
                  <span className="hidden md:block text-[8px] md:text-[9px] font-black text-slate-400 uppercase bg-slate-50/50 px-2 py-0.5 rounded-md border border-slate-100/50 w-fit">Môn học</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUBJECTS.map(sub => (
                      <button
                        key={sub}
                        onClick={() => {
                          setSelectedSubject(sub);
                          if (window.innerWidth < 768) {
                            setTimeout(() => {
                               document.getElementById('grid-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          selectedSubject === sub
                          ? 'border-[#3B42F2] bg-[#3B42F2] text-white shadow-sm scale-105'
                          : 'border-transparent bg-slate-100/80 text-slate-500 hover:border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main Grid Area */}
      <section id="grid-start" className="scroll-mt-[100px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 relative">
        {/* Background Visual Enhancements */}
        <div className="absolute top-24 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
           <div className="absolute top-0 right-10 text-[200px] font-black text-indigo-500/5 rotate-12 select-none uppercase">
              TAILIEU
           </div>
           <div className="absolute top-[800px] left-0 text-[180px] font-black text-indigo-500/5 -rotate-6 select-none leading-none">
              2026
           </div>
        </div>

        {/* Section Header Controls */}
        <div className="flex flex-col md:flex-row items-end justify-start mb-4 gap-4">
           {/* View Toggle Switch */}
           <div className="flex p-1 bg-white border border-slate-100 rounded-[2rem] shadow-premium">
              <button
                onClick={() => setViewType('docs')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest relative transition-all duration-500 overflow-hidden ${
                  viewType === 'docs' ? 'text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <BookOpen className="w-3 h-3 relative z-10" /> <span className="relative z-10">Tài liệu ôn thi</span>
                {viewType === 'docs' && <motion.div layoutId="highlight" className="absolute inset-0 bg-[#3B42F2] rounded-[1.5rem]" />}
              </button>
              <button
                onClick={() => setViewType('courses')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest relative transition-all duration-500 overflow-hidden ${
                  viewType === 'courses' ? 'text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Zap className="w-3 h-3 relative z-10" /> <span className="relative z-10">Khóa học online</span>
                {viewType === 'courses' && <motion.div layoutId="highlight" className="absolute inset-0 bg-[#3B42F2] rounded-[1.5rem]" />}
              </button>
           </div>
        </div>

        {/* Filters and Search Status */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto custom-scrollbar pb-2">
           {selectedGrade !== 'Tất cả' && (
             <button onClick={() => setSelectedGrade('Tất cả')} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#0B1221] shadow-sm hover:bg-slate-50 shrink-0">
               Khối: {selectedGrade} <X className="w-3.5 h-3.5 text-slate-300" />
             </button>
           )}
           {selectedSubject !== 'Tất cả' && (
             <button onClick={() => setSelectedSubject('Tất cả')} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#0B1221] shadow-sm hover:bg-slate-50 shrink-0">
               Môn: {selectedSubject} <X className="w-3.5 h-3.5 text-slate-300" />
             </button>
           )}
           {searchQuery && (
             <button onClick={() => setSearchQuery('')} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-indigo-600 shadow-sm hover:bg-indigo-100 shrink-0">
               Từ khóa: {searchQuery} <X className="w-3.5 h-3.5" />
             </button>
           )}
        </div>

        {loading ? (
          <div className={`grid gap-12 ${viewType === 'docs' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className={`rounded-[2.5rem] bg-white border border-slate-50 animate-pulse shadow-sm ${viewType === 'docs' ? 'h-[320px]' : 'h-[620px]'}`} 
              />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {viewType === 'docs' ? (
              docs.length > 0 ? (
                <motion.div 
                   key="docs-grid"
                   initial={{ opacity: 0, y: 40 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                   className="flex flex-col gap-4 max-w-5xl mx-auto"
                >
                   {docs.map((doc, idx) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05, duration: 0.5 }}
                      >
                         <DocumentCard document={doc} />
                      </motion.div>
                   ))}
                </motion.div>
              ) : <NoResults reset={() => { setSelectedGrade('Tất cả'); setSelectedSubject('Tất cả'); setSearchQuery(''); }} />
            ) : (
              courses.length > 0 ? (
                <motion.div 
                   key="courses-grid"
                   initial={{ opacity: 0, y: 40 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                   className="flex flex-col gap-4 max-w-5xl mx-auto"
                >
                   {courses.map((course, idx) => (
                      <motion.div 
                        key={course.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05, duration: 0.5 }}
                      >
                        <CourseCard course={course} />
                      </motion.div>
                   ))}
                </motion.div>
              ) : <NoResults reset={() => { setSelectedGrade('Tất cả'); setSelectedSubject('Tất cả'); setSearchQuery(''); }} />
            )}
          </AnimatePresence>
        )}
      </section>

      <AnimatePresence>
        {showHelp && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="fixed inset-0 bg-[#0B1221]/80 backdrop-blur-xl z-[100]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                className="bg-white max-w-xl w-full rounded-[4rem] shadow-premium overflow-hidden pointer-events-auto"
              >
                <div className="p-12 border-b border-indigo-50 flex items-center justify-between bg-gradient-to-br from-indigo-50/50 to-white">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#3B42F2] flex items-center justify-center shadow-2xl shadow-indigo-200">
                      <ShieldCheck className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-[#0B1221] tracking-tight uppercase">Hướng dẫn </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quy trình vận hành TAILIEUHAY</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowHelp(false)}
                    className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-300 hover:text-rose-500 hover:rotate-90 transition-all border border-slate-100 shadow-sm"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-12 space-y-4">
                  {[
                    { id: '01', title: 'Tìm kiếm & Lựa chọn', desc: 'Duyệt thư viện học liệu thông minh với bộ lọc đa dạng theo yêu cầu.' },
                    { id: '02', title: 'Thanh toán & Xác nhận', desc: 'Thanh toán an toàn qua các cổng giao dịch tích hợp sẵn trên hệ thống.' },
                    { id: '03', title: 'Duyệt tự động (VIP)', desc: 'Hệ thống sẽ cấp quyền truy cập ngay lập tức sau khi xác nhận giao dịch.' },
                    { id: '04', title: 'Tải tài liệu trọn đời', desc: 'Có thể xem lại và tải xuống bất cứ lúc nào trong mục Hồ sơ cá nhân.' }
                  ].map((step) => (
                    <HelpAccordionItem key={step.id} step={step} />
                  ))}
                </div>
                <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-center">
                  <button 
                    onClick={() => setShowHelp(false)}
                    className="px-16 py-6 bg-[#0B1221] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.25em] hover:bg-[#3B42F2] transition-all active:scale-95 shadow-xl"
                  >
                    Bắt đầu học ngay
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
