import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDocuments, getCourses } from '../services/marketplaceService';
import { Document, Course } from '../types';
import { DocumentCard } from '../components/home/DocumentCard';
import { CourseCard } from '../components/home/CourseCard';
import { User, Package, ShieldCheck, Loader2, Sparkles } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user: profile, loading: authLoading } = useAuth();
  const [purchasedDocs, setPurchasedDocs] = useState<Document[]>([]);
  const [purchasedCourses, setPurchasedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      if (profile) {
        try {
          const [allDocs, allCourses] = await Promise.all([
            getDocuments(),
            getCourses()
          ]);
          
          const purchasedD = allDocs.filter(d => profile.purchasedDocs?.includes(d.id));
          const purchasedC = allCourses.filter(c => profile.purchasedCourses?.includes(c.id));
          
          setPurchasedDocs(purchasedD);
          setPurchasedCourses(purchasedC);
        } catch (error) {
          console.error("Profile data fetch error:", error);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FF] pt-32 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F5F7FF] pt-32 text-center">
        <h2 className="text-slate-900 text-2xl font-black">Vui lòng đăng nhập để xem hồ sơ</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FF] pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-gradient-to-b from-white to-[#f7f8ff] p-6 lg:p-8 rounded-[2rem] text-center shadow-lg border border-white relative overflow-hidden group">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-white flex items-center justify-center mx-auto mb-3 shadow-md group-hover:scale-105 transition-all overflow-hidden">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-8 h-8 text-indigo-600" />
                )}
              </div>
              <h2 className="text-xl lg:text-2xl font-black text-slate-900 mb-1 tracking-tight">{profile.username || profile.displayName || 'Học sinh'}</h2>
              <p className="text-[#6B7280] font-bold text-xs lg:text-sm">{profile.isAdmin ? 'Quản trị viên' : 'Thành viên'}</p>
            </div>

            {profile.isAdmin && (
              <div className="p-5 lg:p-6 rounded-[2rem] bg-[#f3f4ff] border border-[#dfe3ff] flex items-center gap-4 group hover:shadow-md transition-all">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <ShieldCheck className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <div className="text-left">
                  <div className="font-black text-slate-900 uppercase tracking-widest text-[10px] lg:text-xs mb-0.5">Quản trị viên</div>
                  <div className="text-[#6B7280] font-medium text-xs lg:text-sm leading-snug">Bạn có quyền truy cập hệ thống admin.</div>
                </div>
              </div>
            )}
          </div>

          {/* Purchased Items */}
          <div className="lg:col-span-8 space-y-12">
            {/* Courses Section */}
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Khóa học của tôi</h2>
              </div>

              {purchasedCourses.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {purchasedCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              ) : (
                <div className="bg-white/50 backdrop-blur-md p-10 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                   <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Chưa có khóa học nào</p>
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                  <Package className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tài liệu đã mua</h2>
              </div>

              {purchasedDocs.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {purchasedDocs.map(doc => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))}
                </div>
              ) : (
                <div className="bg-white/50 backdrop-blur-md p-10 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                   <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Chưa có tài liệu nào</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
