import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, query, collection, where, getDocs } from 'firebase/firestore';

import { db, auth } from '../lib/firebase';
import { MARKEPLTACE_COLLECTIONS, submitCourseRegistration, getSecureCourseVideoUrl } from '../services/marketplaceService';
import { 
  ArrowLeft, 
  User, 
  X, Folder, MessageCircle,
  Copy, Check, ShieldCheck, Info, Loader2, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { getGoogleDriveThumbnail } from '../lib/utils';
import { Course } from '../types';
import { CourseCard } from '../components/home/CourseCard';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<{text: string}[]>([]);

  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regStatus, setRegStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accessing, setAccessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Registration Form State

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;

    // Fetch Course Details
    const fetchCourse = async () => {
      try {
        const docRef = doc(db, MARKEPLTACE_COLLECTIONS.COURSES, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const courseData = { id: docSnap.id, ...docSnap.data() } as Course;
          setCourse(courseData);
          
          // Fetch related courses
          const relatedCategory = courseData.category || '';
          const relatedQuery = query(
            collection(db, MARKEPLTACE_COLLECTIONS.COURSES),
            where('category', '==', relatedCategory),  
            // Note: Firebase `or` query is needed for multiple fields, 
            // relying on category for now as it's the primary grouping, 
            // but ensuring the UI will now show all results found.
            where('__name__', '!=', docSnap.id)
          );
          const relatedSnap = await getDocs(relatedQuery);
          setRelatedCourses(relatedSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, MARKEPLTACE_COLLECTIONS.COURSES);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();

    const fetchQuotes = async () => {
        const q = query(collection(db, 'quotes'));
        const snap = await getDocs(q);
        setQuotes(snap.docs.map(d => ({text: d.data().text})));
    };
    fetchQuotes();

    // Check Registration Status
    if (user && id) {
      const q = query(
        collection(db, MARKEPLTACE_COLLECTIONS.COURSE_REGISTRATIONS),
        where('userId', '==', user.uid),
        where('courseId', '==', id)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setRegStatus(snapshot.docs[0].data().status);
        } else {
          setRegStatus(null);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, MARKEPLTACE_COLLECTIONS.COURSE_REGISTRATIONS);
      });

      return () => unsubscribe();
    }
  }, [id, user]);

  const handleRegister = async () => {
    if (!user) {
      await login();
      return;
    }
    setIsRegModalOpen(true);
  };

  const confirmRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !course || submitting) return;

    setSubmitting(true);
    try {
      await submitCourseRegistration(course, { paymentMethod: 'VietQR/Transfer' });
      if (course.requiresManualAccess) {
        alert('Đăng ký thành công! Vui lòng chờ Admin duyệt trong 15-30 phút.');
      } else {
        alert('Cảm ơn bạn! Đã nhận thông tin đăng ký. Vui lòng nhấn "Vào khóa học gốc" để tiếp tục.');
      }
      setIsRegModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, MARKEPLTACE_COLLECTIONS.COURSE_REGISTRATIONS);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccessCourse = async () => {
    if (!id) return;
    if (!user) {
      alert('Vui lòng đăng nhập để truy cập khóa học.');
      navigate('/profile');
      return;
    }
    setAccessing(true);
    try {
      const url = await getSecureCourseVideoUrl(id);
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('Không tìm thấy link khóa học.');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Lỗi truy cập khóa học');
    } finally {
      setAccessing(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isApproved = regStatus === 'approved';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FF] pt-32 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#F5F7FF] pt-32 text-center">
        <h2 className="text-slate-900 text-2xl font-black uppercase tracking-widest">Không tìm thấy khóa học</h2>
        <button 
          onClick={() => navigate('/')} 
          className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FF] pb-28 lg:pb-20 pt-24 md:pt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#6B7280] mb-3 transition-colors group font-black uppercase tracking-[0.2em] text-[9px]"
        >
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Quay lại
        </button>

        {/* Registration Modal */}
                <AnimatePresence>
          {isRegModalOpen && course && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setIsRegModalOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
              >
                <button 
                  onClick={() => setIsRegModalOpen(false)}
                  className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header Section */}
                <div className="bg-[#0B1221] pt-6 pb-20 px-6 text-center relative overflow-hidden shrink-0">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                   <h3 className="text-lg font-black text-white uppercase tracking-tight relative z-10">Thanh Toán & Xác Nhận</h3>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 relative z-10">Quét mã QR để hoàn tất</p>
                </div>

                {/* Content Section */}
                <div className="px-6 pb-6 -mt-16 relative z-10 flex-1 overflow-y-auto no-scrollbar flex flex-col items-center">
                  
                  {/* QR Code */}
                  <div className="w-44 flex flex-col items-center mb-5">
                    <div className="bg-white p-2.5 rounded-[1.5rem] shadow-xl border border-slate-100 w-full h-44">
                      <img 
                        src={`https://api.vietqr.io/image/970422-0386281920-qr_only.jpg?accountName=LE%20QUANG%20LONG&addInfo=KH%20${course.id.slice(0, 8).toUpperCase()}`} 
                        alt="VietQR MB Bank"
                        className="w-full h-full object-contain rounded-xl mix-blend-multiply"
                      />
                    </div>
                    
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const response = await fetch(`https://api.vietqr.io/image/970422-0386281920-qr_only.jpg?accountName=LE%20QUANG%20LONG&addInfo=KH%20${course.id.slice(0, 8).toUpperCase()}`);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = window.document.createElement('a');
                          link.href = url;
                          link.download = `QR_ThanhToan_KH_${course.id.slice(0, 8).toUpperCase()}.jpg`;
                          window.document.body.appendChild(link);
                          link.click();
                          window.document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error("Lỗi khi tải ảnh QR:", error);
                          alert("Không thể tải ảnh QR. Vui lòng thử lại sau.");
                        }
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95 border border-indigo-100/50"
                    >
                      <Download className="w-4 h-4" />
                      Tải QR
                    </button>
                  </div>

                  {/* Account Details */}
                  <div className="w-full bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chủ tài khoản</p>
                      <p className="text-xs font-black text-[#0B1221]">LE QUANG LONG</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Số tài khoản</p>
                      <p className="text-xs font-black text-[#0B1221]">0386281920</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ngân hàng</p>
                      <p className="text-xs font-black text-[#0B1221]">MB BANK</p>
                    </div>
                    <div className="h-px w-full bg-slate-200/60 my-1" />
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nội dung CK</p>
                      <p className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded uppercase">Email của bạn</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full space-y-3">
                    <a 
                      href="https://zalo.me/0386281920" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-[#0068FF] hover:bg-[#0054cc] text-white py-3.5 rounded-xl font-bold transition-all shadow-md active:scale-95 text-[11px] uppercase tracking-wide"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Gửi ảnh giao dịch qua Zalo
                    </a>

                    <button 
                      onClick={confirmRegistration}
                      disabled={submitting}
                      className="w-full py-3.5 bg-[#0B1221] hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        'Đã chuyển khoản xong'
                      )}
                    </button>
                    
                    <div className="flex items-center justify-center gap-2 pt-2 group">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 transition-colors">
                        <ShieldCheck className="w-3 h-3 text-emerald-500 group-hover:text-white transition-colors" />
                      </div>
                      <p className="text-[9px] text-[#6B7280] font-black uppercase tracking-[0.2em] text-center">Bảo mật tuyệt đối</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-4">
            {/* Unified Course Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              {/* Header/Thumbnail/Content Section */}
              <div className="p-5 md:p-6 relative group">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
                  
                  <div className="shrink-0 w-full sm:w-40 rounded-2xl shadow-inner border border-slate-100 overflow-hidden group/preview relative aspect-[4/5] bg-slate-100">
                    <img 
                      src={getGoogleDriveThumbnail(course.thumbnailUrl)} 
                      alt={course.title} 
                      className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 flex flex-col pt-1 w-full relative">
                    <div className="space-y-3 text-center sm:text-left mb-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50/80 border border-rose-100/80 self-center sm:self-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">
                            Khóa học chính thức
                          </span>
                        </div>
                        {/* Price moved up for mobile visibility */}
                        <div className="flex flex-col items-center sm:hidden">
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Giá sở hữu</span>
                           <div className="text-2xl font-black text-rose-600 tracking-tighter">
                             {course.price === 0 ? 'MIỄN PHÍ' : `${course.price.toLocaleString()} đ`}
                           </div>
                        </div>
                      </div>
                      
                      <h1 className="text-[13px] md:text-[15px] font-black text-[#0066FF] leading-[1.4] uppercase tracking-tight">
                        {course.title}
                      </h1>
                    </div>

                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-t border-slate-100 w-full mb-4">
                        <div className="hidden sm:flex flex-col items-start gap-1 shrink-0 pb-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Giá sở hữu</span>
                          <div className="text-2xl md:text-3xl font-black text-rose-600 tracking-tighter">
                            {course.price === 0 ? 'MIỄN PHÍ' : `${course.price.toLocaleString()} đ`}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3 w-full sm:w-[240px] shrink-0">
                          {/* Preview Button */}
                          {(course.previewUrl || course.driveThumbnailUrl) && (
                            <button 
                              onClick={() => window.open(course.previewUrl || course.driveThumbnailUrl, '_blank')}
                              className="w-full px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                            >
                              Đọc thử khóa học
                            </button>
                          )}
                          
                          {/* Action Button */}
                          {(isApproved || course.price === 0 || (course.requiresManualAccess && regStatus === 'pending')) ? (
                            <button 
                              onClick={handleAccessCourse}
                              disabled={accessing}
                              className="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[12px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {accessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (course.requiresManualAccess ? 'Vào khóa học gốc' : 'Vào khóa học')}
                            </button>
                          ) : (
                            <button 
                              onClick={handleRegister}
                              disabled={submitting || regStatus === 'pending'}
                              className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[12px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                            >
                              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (regStatus === 'pending' ? 'ĐANG CHỜ DUYỆT THANH TOÁN' : 'THANH TOÁN & SỞ HỮU NGAY')}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Integrated Notification Banner */}
                      {((course.requiresManualAccess || course.price !== 0) && (regStatus === 'pending' || regStatus === 'approved')) && (
                        <div className={`p-4 sm:p-5 rounded-[1.25rem] w-full border transition-all animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 ${regStatus === 'approved' ? 'bg-emerald-50/40 border-emerald-100' : 'bg-indigo-50/40 border-indigo-100'}`}>
                          <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
                            <div className={`font-black text-[11px] sm:text-[13px] uppercase tracking-wider flex items-center gap-2 ${regStatus === 'approved' ? 'text-emerald-600' : 'text-indigo-500'}`}>
                              {regStatus === 'approved' ? <Check className="w-4 h-4" /> : <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                              {regStatus === 'approved' ? 'ADMIN ĐÃ DUYỆT!' : 'ĐÃ ĐĂNG KÝ!'}
                            </div>
                            <div className={`text-[9px] sm:text-[11px] uppercase font-black tracking-tight leading-relaxed ${regStatus === 'approved' ? 'text-emerald-800' : 'text-indigo-600/80'}`}>
                              {regStatus === 'approved'
                                ? (course.requiresManualAccess 
                                    ? 'NHẤN NÚT "VÀO KHÓA HỌC GỐC" ĐỂ YÊU CẦU QUYỀN TRUY CẬP TỪ ADMIN.'
                                    : 'NHẤN NÚT "VÀO KHÓA HỌC" ĐỂ HỌC NGAY!')
                                : (course.requiresManualAccess 
                                    ? 'NHẤN NÚT "VÀO KHÓA HỌC GỐC" ĐỂ ADMIN DUYỆT TRUY CẬP.' 
                                    : 'VUI LÒNG CHỜ ADMIN DUYỆT THANH TOÁN ĐỂ VÀO LỚP.')}
                            </div>
                          </div>
                          
                          <div className="hidden sm:block w-px h-10 bg-slate-200/60" />
                          <div className="sm:hidden w-full h-px bg-slate-200/60 max-w-[140px]" />
                          
                          <div className="flex flex-col items-center sm:items-end gap-1">
                            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">HỖ TRỢ ZALO</span>
                            <button 
                              onClick={() => handleCopyToClipboard('0386281920')}
                              className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white transition-all cursor-pointer shadow-sm active:scale-95 group ${regStatus === 'approved' ? 'border-emerald-100 text-emerald-600' : 'border-indigo-100 text-indigo-600'}`}
                            >
                              <span className="text-[12px] font-black tracking-tight">0386281920</span>
                              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform opacity-70" />}
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Enhanced Meta Bar */}
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-2">
                {[
                  { icon: User, label: "Giảng viên", value: course.instructor || 'MAPSTUDY', color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
                  { icon: Folder, label: "Thể loại", value: "Khóa học", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
                  { icon: ShieldCheck, label: "Trạng thái", value: "Hoàn thiện", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" }
                ].map((item, i) => (
                  <div key={i} className={`flex flex-col items-center justify-center p-2 rounded-xl border ${item.bg} ${item.border}`}>
                    <item.icon className={`w-4 h-4 ${item.color} mb-1.5`} />
                    <span className="text-[8px] font-black uppercase tracking-tight text-slate-400">{item.label}</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description Block */}
            <div className="bg-[#FCF9F0] rounded-2xl border border-[#F0EBE1] p-5 md:p-6 shadow-sm">
              <h3 className="text-[#D97706] font-bold mb-4 text-sm uppercase tracking-wider">
                Giới thiệu khóa học:
              </h3>
              <div className="text-[13px] md:text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                {course.description || `Khóa học ${course.title} được biên soạn chuyên sâu bởi đội ngũ Admin với lộ trình bài bản.`}
              </div>
            </div>

            {/* Compact Related Courses - Updated to be more compact */}
            {relatedCourses.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Khóa học liên quan</h3>
                <div className="flex flex-col gap-3">
                  {relatedCourses.map(related => (
                    <CourseCard key={related.id} course={related} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-28 space-y-4">
              <div className="bg-sky-50 p-8 rounded-3xl border border-sky-100 shadow-xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-200 rounded-full blur-3xl opacity-50" />
                
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-700 mb-8 flex items-center gap-2">
                   <Info className="w-3.5 h-3.5" /> Châm ngôn tự học
                </h3>
  
                <div className="relative z-10">
                  <p className="text-xl font-medium text-sky-950 leading-relaxed italic">
                    "{quotes.length > 0 ? quotes[Math.floor(Math.random() * quotes.length)].text : "Tự học là con đường ngắn nhất dẫn đến thành công."}"
                  </p>
                </div>
  
                <div className="mt-8 pt-6 border-t border-sky-200 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-sky-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Phát triển bản thân
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] z-50 flex items-center justify-between gap-4">
        <div className="flex flex-col">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá sở hữu</span>
           <span className="text-xl font-black text-rose-600 tracking-tighter line-clamp-1">
             {course.price === 0 ? 'MIỄN PHÍ' : `${course.price.toLocaleString()} đ`}
           </span>
        </div>
        <div className="flex-1 max-w-[200px]">
          {(isApproved || course.price === 0 || (course.requiresManualAccess && regStatus === 'pending')) ? (
            <button 
              onClick={handleAccessCourse}
              disabled={accessing}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {accessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (course.requiresManualAccess ? 'Vào khóa học gốc' : 'Vào khóa học')}
            </button>
          ) : (
            <button 
              onClick={handleRegister}
              disabled={submitting || regStatus === 'pending'}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (regStatus === 'pending' ? 'ĐANG CHỜ DUYỆT' : 'THANH TOÁN LẤY KHÓA')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
