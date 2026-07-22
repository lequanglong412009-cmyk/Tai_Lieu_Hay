import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Plus, Package, DollarSign, 
  Trash2, Edit, X, Loader2,
  Upload, Image as ImageIcon,
  ShieldCheck, CheckCircle, XCircle, Copy,
  ArrowLeft, Eye, Sparkles, Clock, Check, RefreshCw, Quote
} from 'lucide-react';
import { 
  uploadDocument, grantAccess, 
  rejectAccess, updateDocument, 
  deleteDocument, getDocumentFileUrl,
  MARKEPLTACE_COLLECTIONS,
  uploadCourse,
  updateCourse,
  deleteCourse,
  grantCourseAccess,
  rejectCourseRegistration,
  resetAllStats,
  getCourseVideoUrlAdmin
} from '../services/marketplaceService';
import { Document, AccessRequest, Course, CourseRegistration } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { getGoogleDriveThumbnail, sortItemsByPriorityAndDate } from '../lib/utils';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, getDocs, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const GRADES = ['Lớp 10', 'Lớp 11', 'Lớp 12', 'Combo'];
const SUBJECTS = ['Toán', 'Lí', 'Hóa', 'Sinh', 'Anh', 'Sử', 'Địa', 'Tin', 'Văn'];

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  // ... other state ...
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [courseRequests, setCourseRequests] = useState<CourseRegistration[]>([]);
  const [quotes, setQuotes] = useState<{id: string, text: string, category: string}[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingCourseCount, setPendingCourseCount] = useState(0);
  const [requestFilter, setRequestFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [courseRequestFilter, setCourseRequestFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [view, setView] = useState<'docs' | 'requests' | 'courses' | 'course-requests' | 'quotes'>('docs');
  
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void;
    actionType: 'approve' | 'reject';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    actionType: 'approve'
  });

  const [submitting, setSubmitting] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(GRADES[0]);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [newDoc, setNewDoc] = useState({
    title: '',
    description: '',
    price: 20000,
    category: `${GRADES[0]} | ${SUBJECTS[0]}`,
    difficulty: 'Intermediate' as 'Basic' | 'Intermediate' | 'Advanced',
    previewUrl: '',
    thumbnailUrl: '',
    status: 'Regular' as 'Hot' | 'Bestseller' | 'New' | 'Regular',
    requiresManualAccess: false
  });
  const [fileUrl, setFileUrl] = useState('');

  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    instructor: '',
    price: 199000,
    thumbnailUrl: '',
    previewUrl: '', // Link đọc thử
    category: `${GRADES[0]} | ${SUBJECTS[0]}`,
    status: 'New' as 'Hot' | 'New' | 'Upcoming',
    originalLink: '',
    requiresManualAccess: false
  });

  useEffect(() => {
    let unsubscribeRequests: (() => void) | null = null;
    let unsubscribePending: (() => void) | null = null;
    let unsubscribeCourseRequests: (() => void) | null = null;
    let unsubscribeCoursePending: (() => void) | null = null;
    let unsubscribeDocs: (() => void) | null = null;
    let unsubscribeCourses: (() => void) | null = null;

    // 1. Quotations (Fetch once)
    const fetchQuotes = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'quotes'));
            setQuotes(querySnapshot.docs.map(d => ({id: d.id, ...d.data()} as {id: string, text: string, category: string})));
        } catch (error) {
            console.error('Quotes Fetch Error:', error);
        }
    };
    fetchQuotes();
    
    // Listeners for documents and courses
    const docsCol = collection(db, MARKEPLTACE_COLLECTIONS.DOCUMENTS);
    const docsQuery = query(docsCol, orderBy('createdAt', 'desc'));
    unsubscribeDocs = onSnapshot(docsQuery, (snapshot) => {
      const fetchedDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Document));
      setDocs(sortItemsByPriorityAndDate(fetchedDocs));
    }, (error) => console.error('Docs Listener Error:', error));

    const coursesCol = collection(db, MARKEPLTACE_COLLECTIONS.COURSES);
    const coursesQuery = query(coursesCol, orderBy('createdAt', 'desc'));
    unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
      const fetchedCourses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      setCourses(sortItemsByPriorityAndDate(fetchedCourses));
    }, (error) => console.error('Courses Listener Error:', error));

    // 2. Real-time listener for requests
    setRequestsLoading(true);
    const requestsCol = collection(db, MARKEPLTACE_COLLECTIONS.REQUESTS);
    let q = query(requestsCol);
    if (requestFilter !== 'all') {
      q = query(requestsCol, where('status', '==', requestFilter));
    }
    unsubscribeRequests = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AccessRequest));
      reqs.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
      setRequests(reqs);
      setRequestsLoading(false);
    }, (error) => {
      setRequestsError(error.message);
      setRequestsLoading(false);
    });

    // 3. Real-time listener for course requests
    const courseReqCol = collection(db, MARKEPLTACE_COLLECTIONS.COURSE_REGISTRATIONS);
    let cq = query(courseReqCol);
    if (courseRequestFilter !== 'all') {
      cq = query(courseReqCol, where('status', '==', courseRequestFilter));
    }
    unsubscribeCourseRequests = onSnapshot(cq, (snap) => {
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseRegistration));
      reqs.sort((a, b) => (b.registeredAt?.seconds || 0) - (a.registeredAt?.seconds || 0));
      setCourseRequests(reqs);
    }, (error) => {
      console.error('Course Requests Listener Error:', error);
    });

    // 4. Pending counts
    unsubscribePending = onSnapshot(query(requestsCol, where('status', '==', 'pending')), 
      (snap) => setPendingCount(snap.size),
      (err) => console.error('Pending Requests Count Error:', err)
    );
    unsubscribeCoursePending = onSnapshot(query(courseReqCol, where('status', '==', 'pending')), 
      (snap) => setPendingCourseCount(snap.size),
      (err) => console.error('Pending Course Requests Count Error:', err)
    );

    return () => {
      if (unsubscribeDocs) unsubscribeDocs();
      if (unsubscribeCourses) unsubscribeCourses();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribePending) unsubscribePending();
      if (unsubscribeCourseRequests) unsubscribeCourseRequests();
      if (unsubscribeCoursePending) unsubscribeCoursePending();
    };
  }, [user, requestFilter, courseRequestFilter]);

  // Remove the separate listener for pending count badge as it's now inside the main one
  // ... (lines 111-120 were previously here)

  const refreshRequests = async () => {
    setRequestsLoading(true);
    try {
      const requestsCol = collection(db, MARKEPLTACE_COLLECTIONS.REQUESTS);
      let q = query(requestsCol);
      if (requestFilter !== 'all') {
        q = query(requestsCol, where('status', '==', requestFilter));
      }
      const snapshot = await getDocs(q);
      const reqs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AccessRequest));
      reqs.sort((a: AccessRequest, b: AccessRequest) => {
        const timeA = a.requestedAt?.seconds || Date.now() / 1000;
        const timeB = b.requestedAt?.seconds || Date.now() / 1000;
        return timeB - timeA;
      });
      setRequests(reqs);
      setRequestsError(null);
    } catch (error) {
      setRequestsError(error instanceof Error ? error.message : 'Lỗi tải yêu cầu');
    } finally {
      setRequestsLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApproveRequest = async (req: AccessRequest) => {
    setConfirmModal({
      isOpen: true,
      title: 'Phê duyệt yêu cầu',
      message: `Bạn có chắc muốn phê duyệt cho ${req.userEmail} tải "${req.documentTitle}"?`,
      actionType: 'approve',
      onConfirm: async () => {
        setLoadingAction(req.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await grantAccess(req.userId, req.documentId, req.id);
          showToast('Đã phê duyệt và kích hoạt quyền tải cho người dùng!', 'success');
        } catch (error) {
          console.error(error);
          showToast('Phê duyệt thất bại: ' + (error instanceof Error ? error.message : String(error)), 'error');
        } finally {
          setLoadingAction(null);
        }
      }
    });
  };

  const handleApproveCourseRequest = async (req: CourseRegistration) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kích hoạt khóa học',
      message: `Phê duyệt cho học viên ${req.userEmail} tham gia "${req.courseTitle}"?`,
      actionType: 'approve',
      onConfirm: async () => {
        setLoadingAction(req.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await grantCourseAccess(req.userId, req.courseId, req.id);
          showToast('Đã kích hoạt quyền truy cập khóa học cho học viên!', 'success');
        } catch (err: unknown) {
          const error = err as Error;
          console.error(error);
          showToast('Phê duyệt thất bại: ' + (error?.message || String(error)), 'error');
        } finally {
          setLoadingAction(null);
        }
      }
    });
  };

  const handleEditCourse = async (course: Course) => {
    setLoadingAction(course.id);
    try {
      const internalLink = await getCourseVideoUrlAdmin(course.id);
      setNewCourse({
        title: course.title || '',
        description: course.description || '',
        instructor: course.instructor || '',
        price: course.price ?? 0,
        thumbnailUrl: course.thumbnailUrl || '',
        previewUrl: course.previewUrl || '',
        category: course.category || '',
        status: course.status || 'New',
        requiresManualAccess: !!course.requiresManualAccess,
        originalLink: internalLink || ''
      });
      setEditingCourse(course);
      setIsAddingCourse(true);
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi tải thông tin khóa học', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Gỡ bỏ khóa học',
      message: 'Hành động này sẽ xóa vĩnh viễn khóa học khỏi hệ thống. Đồng ý?',
      actionType: 'reject',
      onConfirm: async () => {
        setLoadingAction(courseId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await deleteCourse(courseId);
          showToast('Đã xóa khóa học thành công', 'success');
        } catch {
          showToast('Xóa thất bại', 'error');
        } finally {
          setLoadingAction(null);
        }
      }
    });
  };

  const handleRejectCourseRequest = async (req: CourseRegistration) => {
    setConfirmModal({
      isOpen: true,
      title: 'Từ chối đăng ký',
      message: `Hủy yêu cầu đăng ký của ${req.userEmail}?`,
      actionType: 'reject',
      onConfirm: async () => {
        setLoadingAction(req.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await rejectCourseRegistration(req.userId, req.courseId, req.id);
          showToast('Đã từ chối đăng ký', 'success');
        } catch (err: unknown) {
          const error = err as Error;
          showToast('Thao tác thất bại: ' + (error?.message || String(error)), 'error');
        } finally {
          setLoadingAction(null);
        }
      }
    });
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { originalLink, ...rest } = newCourse;
      const courseData = {
        ...rest,
        link: originalLink // This will be stored in courseVideos collection
      };
      if (editingCourse) {
        await updateCourse(editingCourse.id, courseData);
        showToast('Cập nhật khóa học thành công!', 'success');
      } else {
        await uploadCourse(courseData);
        showToast('Đăng khóa học thành công!', 'success');
      }
      setIsAddingCourse(false);
      setEditingCourse(null);
      setNewCourse({
        title: '', description: '', instructor: '', price: 0, 
        thumbnailUrl: '', previewUrl: '', category: `${GRADES[0]} | ${SUBJECTS[0]}`,
        status: 'New', originalLink: '', requiresManualAccess: false
      });
    } catch {
      showToast('Thao tác thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (doc: Document) => {
    setLoadingAction(doc.id);
    try {
      const internalUrl = await getDocumentFileUrl(doc.id);
      setFileUrl(internalUrl || '');
      setNewDoc({
        title: doc.title || '',
        description: doc.description || '',
        price: doc.price ?? 0,
        category: doc.category || '',
        difficulty: doc.difficulty || 'Intermediate',
        previewUrl: doc.previewUrl || '',
        thumbnailUrl: doc.thumbnailUrl || '',
        status: doc.status || 'Regular',
        requiresManualAccess: !!doc.requiresManualAccess
      });
      
      const category = doc.category || '';
      const [grade, subject] = category.includes(' | ') 
        ? category.split(' | ') 
        : [GRADES[0], category];
      setSelectedGrade(grade);
      setSelectedSubject(subject);
      
      setEditingDoc(doc);
      setIsAdding(true);
    } catch (error) {
      console.error(error);
      showToast('Lỗi khi tải thông tin tài liệu', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (doc: Document) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa tài liệu',
      message: `Bạn có chắc muốn xóa vĩnh viễn tài liệu "${doc.title}"? Thao tác này không thể hoàn tác.`,
      actionType: 'reject',
      onConfirm: async () => {
        setLoadingAction(doc.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await deleteDocument(doc.id);
          showToast('Đã xóa tài liệu thành công!', 'success');
        } catch (error) {
          console.error(error);
          showToast('Xóa thất bại: ' + (error instanceof Error ? error.message : String(error)), 'error');
        } finally {
          setLoadingAction(null);
        }
      }
    });
  };

  const handleRejectRequest = async (req: AccessRequest) => {
    setConfirmModal({
      isOpen: true,
      title: 'Từ chối yêu cầu',
      message: `Bạn có chắc muốn từ chối yêu cầu của ${req.userEmail}?`,
      actionType: 'reject',
      onConfirm: async () => {
        setLoadingAction(req.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await rejectAccess(req.userId, req.documentId, req.id);
          showToast('Đã từ chối yêu cầu.', 'success');
        } catch (error) {
          console.error(error);
          showToast('Từ chối thất bại: ' + (error instanceof Error ? error.message : String(error)), 'error');
        } finally {
          setLoadingAction(null);
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl) return showToast('Link gốc (File URL) là bắt buộc', 'error');
    
    setSubmitting(true);
    try {
      const docData = {
        ...newDoc,
        category: `${selectedGrade} | ${selectedSubject}`,
        thumbnailUrl: getGoogleDriveThumbnail(newDoc.thumbnailUrl)
      };

      if (editingDoc) {
        await updateDocument(editingDoc.id, docData, fileUrl);
        showToast('Cập nhật tài liệu thành công!', 'success');
      } else {
        await uploadDocument(docData, fileUrl);
        showToast('Đăng tài liệu thành công!', 'success');
      }

      setIsAdding(false);
      setEditingDoc(null);
      // Reset form (onSnapshot handles list update)
      setNewDoc({
        title: '', description: '', price: 0, 
        category: `${GRADES[0]} | ${SUBJECTS[0]}`, difficulty: 'Intermediate',
        previewUrl: '', thumbnailUrl: '', status: 'Regular',
        requiresManualAccess: false
      });
      setFileUrl('');
    } catch (error) {
      console.error(error);
      showToast('Thao tác thất bại: ' + (error instanceof Error ? error.message : String(error)), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetStats = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset chỉ số',
      message: 'Bạn có chắc chắn muốn đưa toàn bộ doanh thu và lượt mua về 0 không? Hành động này không thể hoàn tác.',
      actionType: 'reject', // Use reject styling for danger
      onConfirm: async () => {
        try {
          setLoadingAction('resetting');
          await resetAllStats();
          setToast({ message: 'Đã reset toàn bộ thông số!', type: 'success' });
        } catch (error) {
          console.error(error);
          setToast({ message: 'Có lỗi xảy ra!', type: 'error' });
        } finally {
          setLoadingAction(null);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleAddQuote = async (text: string, category: string) => {
    try {
        await addDoc(collection(db, 'quotes'), {text, category, createdAt: serverTimestamp()});
        showToast('Đã thêm phương châm!', 'success');
    } catch {
        showToast('Thêm thất bại', 'error');
    }
  };
  
  const handleDeleteQuote = async (id: string) => {
      try {
          await deleteDoc(doc(db, 'quotes', id));
          showToast('Đã xóa phương châm', 'success');
      } catch {
          showToast('Xóa thất bại', 'error');
      }
  };

  const totalSales = docs.reduce((acc, d) => acc + d.salesCount, 0) + courses.reduce((acc, c) => acc + c.studentsCount, 0);
  const totalRevenue = docs.reduce((acc, d) => acc + (d.totalRevenue ?? (d.salesCount * d.price)), 0) + 
                       courses.reduce((acc, c) => acc + (c.totalRevenue ?? (c.studentsCount * c.price)), 0);

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-28 pb-32 text-slate-900 selection:bg-indigo-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Advanced Atmos background elements */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/[0.03] rounded-full blur-[150px] pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/[0.03] rounded-full blur-[150px] pointer-events-none" />
        <div className="fixed top-1/4 left-0 w-1 h-64 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent blur-md" />

        {/* Global Admin Banner */}
        <AnimatePresence>
          {pendingCount > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              className="mb-12"
            >
              <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_20px_50px_rgba(79,70,229,0.08)] border border-indigo-100 group">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-100 shadow-sm">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-black text-xl tracking-tight leading-none mb-2">Trung tâm phê duyệt</h3>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[9px] font-black uppercase tracking-widest">{pendingCount} Yêu cầu mới</span>
                      <p className="text-indigo-600/60 text-[10px] font-bold uppercase tracking-widest">Cần xử lý kiểm tra thanh toán ngay.</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => { setView('requests'); setRequestFilter('pending'); }}
                  className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-3"
                >
                  Mở hàng chờ duyệt
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-12 mb-10 border-b border-indigo-100 pb-6">
          <div className="flex flex-col sm:flex-row gap-6 justify-center xl:ml-auto">
            <button 
              onClick={() => {
                setEditingDoc(null);
                setNewDoc({
                  title: '', description: '', price: 0, 
                  category: `${GRADES[0]} | ${SUBJECTS[0]}`, difficulty: 'Intermediate',
                  previewUrl: '', thumbnailUrl: '', status: 'Regular', requiresManualAccess: false
                });
                setFileUrl('');
                setIsAdding(true);
              }}
              className="group relative flex items-center justify-center gap-2 md:gap-4 px-6 md:px-12 py-4 md:py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl md:rounded-[2.5rem] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-[9px] md:text-[11px] transition-all shadow-[0_10px_20px_rgba(79,70,229,0.2)] md:shadow-[0_20px_40px_rgba(79,70,229,0.3)] active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Plus className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform" /> 
              <span>Phát hành tài liệu</span>
            </button>

            <button 
              onClick={() => {
                setEditingCourse(null);
                setNewCourse({
                  title: '', description: '', instructor: '', price: 0, 
                  thumbnailUrl: '', previewUrl: '', category: `${GRADES[0]} | ${SUBJECTS[0]}`,
                  status: 'New', requiresManualAccess: false, originalLink: ''
                });
                setIsAddingCourse(true);
              }}
              className="group relative flex items-center justify-center gap-2 md:gap-4 px-6 md:px-12 py-4 md:py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl md:rounded-[2.5rem] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-[9px] md:text-[11px] transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)] md:shadow-[0_20px_40px_rgba(16,185,129,0.3)] active:scale-95 overflow-hidden"
            >
              <Plus className="w-5 h-5 md:w-6 md:h-6" /> 
              <span>Mở lớp học mới</span>
            </button>
          </div>
        </div>

        {/* Pro Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-8">
          {[
            { 
              label: 'Tổng kho dữ liệu', 
              value: docs.length, 
              icon: Package, 
              color: 'blue', 
              desc: 'Tài liệu đang lưu hành',
              trend: `+${docs.filter(d => d.status === 'New').length} mới`
            },
            { 
              label: 'Lượt tải hệ thống', 
              value: totalSales.toLocaleString(), 
              icon: BarChart3, 
              color: 'purple', 
              desc: 'Tổng giao dịch thành công',
              trend: 'Đang tăng trưởng'
            },
            { 
              label: 'Doanh thu ước tính', 
              value: `${totalRevenue.toLocaleString()}đ`, 
              icon: DollarSign, 
              color: 'emerald', 
              desc: 'Số dư ví Admin',
              trend: 'Giao dịch thật'
            }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -2, scale: 1.005 }}
              className={`bg-white/70 backdrop-blur-xl p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white relative overflow-hidden group shadow-sm ${i === 2 ? 'col-span-2 md:col-span-1' : ''}`}
            >
              <div className="flex items-center justify-between mb-2 md:mb-2 relative z-10">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600 border border-${stat.color}-500/10 shadow-sm shrink-0`}>
                  <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="text-right">
                  <span className={`px-1.5 md:px-2 py-0.5 bg-${stat.color}-500/10 border border-${stat.color}-500/10 rounded-full text-[6px] md:text-[7px] text-${stat.color}-600 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] whitespace-nowrap`}>
                    {stat.trend}
                  </span>
                </div>
              </div>
              <div className="space-y-0 relative z-10">
                <div className="text-[7.5px] md:text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] md:tracking-[0.25em] truncate">{stat.label}</div>
                <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter truncate">{stat.value}</div>
                <p className="text-slate-400 text-[6.5px] md:text-[8px] font-bold uppercase tracking-[0.1em] md:tracking-widest truncate">{stat.desc}</p>
              </div>
              
              {/* Decorative Glow */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/[0.03] rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
            </motion.div>
          ))}
        </div>

        {/* High-End Action Tabs */}
        <div className="flex flex-wrap gap-8 md:gap-12 mb-12 border-b border-indigo-100 relative">
          <button 
            onClick={() => setView('docs')}
            className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative group/tab ${view === 'docs' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4" />
              Tài liệu
              <span className="bg-indigo-50 px-2 py-0.5 rounded text-[9px] border border-indigo-100 group-hover/tab:bg-indigo-100 transition-colors">{docs.length}</span>
            </div>
            {view === 'docs' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full" />}
          </button>

          <button 
            onClick={() => setView('courses')}
            className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative group/tab ${view === 'courses' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4" />
              Khóa học
              <span className="bg-emerald-50 px-2 py-0.5 rounded text-[9px] border border-emerald-100">{courses.length}</span>
            </div>
            {view === 'courses' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600 rounded-t-full" />}
          </button>
          
          <button 
            onClick={() => setView('requests')}
            className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative group/tab flex items-center gap-4 ${view === 'requests' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4" />
              Duyệt file
              {pendingCount > 0 && <span className="bg-red-600 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">{pendingCount}</span>}
            </div>
            {view === 'requests' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full" />}
          </button>

          <button 
            onClick={() => setView('course-requests')}
            className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative group/tab flex items-center gap-4 ${view === 'course-requests' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4" />
              Duyệt khóa học
              {pendingCourseCount > 0 && <span className="bg-orange-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black">{pendingCourseCount}</span>}
            </div>
            {view === 'course-requests' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full" />}
          </button>
          
          <button 
            onClick={() => setView('quotes')}
            className={`pb-6 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative group/tab flex items-center gap-4 ${view === 'quotes' ? 'text-violet-600' : 'text-slate-400 hover:text-slate-900'}`}
          >
            <div className="flex items-center gap-3">
              <Quote className="w-4 h-4" />
              Phương châm
            </div>
            {view === 'quotes' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 w-full h-1 bg-violet-600 rounded-t-full" />}
          </button>

          <button 
            onClick={handleResetStats}
            className="ml-auto mb-6 flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 transition-colors text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-200 hover:border-red-200 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'resetting' ? 'animate-spin' : ''}`} />
            Reset chỉ số
          </button>
        </div>

        {/* Content Area - Pro Data Table */}
        <AnimatePresence mode="wait">
          {view === 'docs' ? (
            <motion.div 
              key="docs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/60 backdrop-blur-xl rounded-[3rem] overflow-hidden border border-white shadow-[0_30px_70px_-20px_rgba(79,70,229,0.1)]"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-indigo-100 bg-indigo-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Thực thể tài liệu</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Phân loại học thuật</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Giá niêm yết</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-right text-indigo-600">Doanh thu</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Chỉ số vận hành</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-right">Quản lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50">
                    {docs.map(doc => (
                      <tr key={doc.id} className="group hover:bg-indigo-50/30 transition-all duration-300">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-6">
                            <div className="relative shrink-0">
                              <img 
                                src={getGoogleDriveThumbnail(doc.thumbnailUrl)} 
                                className="w-12 h-12 rounded-xl object-cover shadow-xl border border-white group-hover:scale-110 transition-transform duration-500" 
                                referrerPolicy="no-referrer"
                              />
                              {doc.status !== 'Regular' && (
                                <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-lg text-[6px] font-black uppercase tracking-widest text-white shadow-2xl ${
                                  doc.status === 'Hot' ? 'bg-red-500' : doc.status === 'Bestseller' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}>
                                  {doc.status}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="font-black text-sm text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{doc.title}</div>
                              <div className="flex items-center gap-3">
                                <code className="text-[9px] text-slate-400 font-mono tracking-tight bg-indigo-50 px-2 py-0.5 rounded uppercase">{doc.id.substring(0, 8)}...</code>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(doc.id);
                                    showToast('Đã copy ID document', 'success');
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                             <span className="px-3 py-1 bg-indigo-500/5 border border-indigo-500/10 rounded-full text-[9px] font-black text-indigo-600 uppercase tracking-widest inline-flex items-center gap-1">
                               <div className="w-1 h-1 rounded-full bg-indigo-500" />
                               {doc.category}
                             </span>
                             <span className="px-2 py-0.5 text-[8px] text-slate-400 font-bold uppercase tracking-widest">Hệ {doc.difficulty}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xl font-black text-slate-900 tracking-tighter group-hover:scale-105 transition-transform origin-left">
                            {doc.price.toLocaleString()}đ
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-lg font-black text-indigo-600">
                            {(doc.totalRevenue ?? (doc.salesCount * doc.price)).toLocaleString()}đ
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <div className="text-xl font-black text-emerald-400 leading-none">{doc.salesCount}</div>
                            <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Lượt mua</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                            <button 
                              onClick={() => handleEdit(doc)}
                              disabled={loadingAction === doc.id}
                              className="w-10 h-10 bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all hover:bg-white border border-indigo-100 shadow-sm disabled:opacity-50 flex items-center justify-center p-0"
                            >
                              {loadingAction === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => handleDelete(doc)}
                              disabled={loadingAction === doc.id}
                              className="w-10 h-10 bg-white text-slate-400 hover:text-red-600 rounded-xl transition-all hover:bg-white border border-indigo-100 shadow-sm disabled:opacity-50 flex items-center justify-center p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {docs.length === 0 && (
                <div className="py-32 text-center space-y-6">
                   <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto border border-indigo-100 shadow-sm">
                      <Package className="w-10 h-10 text-indigo-200" />
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-slate-900 font-black uppercase tracking-widest text-sm text-center">Chưa có bản ghi nào</h3>
                      <p className="text-slate-400 text-xs font-medium">Bắt đầu bằng cách phát hành tài liệu mới lên hệ thống.</p>
                   </div>
                </div>
              )}
            </motion.div>
          ) : view === 'courses' ? (
            <motion.div 
              key="courses"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white/60 backdrop-blur-xl rounded-[3rem] overflow-hidden border border-white shadow-[0_30px_70px_-20px_rgba(16,185,129,0.1)]"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-indigo-100 bg-emerald-50/50">
                      <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-400">Khóa học học thuật</th>
                      <th className="hidden lg:table-cell px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Giảng viên</th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-400 text-right md:text-left">Giá</th>
                      <th className="hidden sm:table-cell px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Tham gia</th>
                      <th className="hidden md:table-cell px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-right text-emerald-600">Doanh thu</th>
                      <th className="px-3 md:px-6 py-3 md:py-4 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-400 text-right">Quản lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50">
                    {courses.map(course => (
                      <tr key={course.id} className="group hover:bg-emerald-50/30 transition-all duration-300">
                        <td className="px-3 md:px-6 py-3 md:py-4">
                          <div className="flex items-center gap-3 md:gap-6">
                            <img src={getGoogleDriveThumbnail(course.thumbnailUrl)} className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl object-cover shadow-lg border border-white shrink-0" referrerPolicy="no-referrer" />
                            <div className="space-y-0.5 md:space-y-1 min-w-0">
                               <div className="font-black text-[10px] md:text-sm text-slate-900 group-hover:text-emerald-600 transition-colors truncate max-w-[120px] md:max-w-none">{course.title}</div>
                               <div className="flex items-center gap-1">
                                 <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[6px] md:text-[8px] font-black uppercase tracking-widest rounded">{course.category}</span>
                                 <span className="lg:hidden text-[6px] md:text-[8px] text-slate-400 font-bold italic truncate max-w-[60px]">/ {course.instructor}</span>
                               </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4">
                          <div className="text-xs font-bold text-slate-700">{course.instructor}</div>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4">
                           <div className="font-black text-xs md:text-xl text-slate-900 text-right md:text-left">{course.price.toLocaleString()}đ</div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 text-center"><div className="text-xl font-black text-emerald-500">{course.studentsCount}</div></td>
                        <td className="hidden md:table-cell px-6 py-4 text-right">
                          <div className="text-lg font-black text-emerald-600">
                            {(course.totalRevenue ?? (course.studentsCount * course.price)).toLocaleString()}đ
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-right">
                           <div className="flex justify-end gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-x-2 md:group-hover:translate-x-0">
                             <button onClick={() => handleEditCourse(course)} className="w-7 h-7 md:w-10 md:h-10 bg-white text-slate-400 hover:text-emerald-600 rounded-lg md:rounded-xl border border-indigo-100 flex items-center justify-center shadow-sm"><Edit className="w-3 h-3 md:w-4 md:h-4" /></button>
                             <button onClick={() => handleDeleteCourse(course.id)} className="w-7 h-7 md:w-10 md:h-10 bg-white text-slate-400 hover:text-red-500 rounded-lg md:rounded-xl border border-indigo-100 flex items-center justify-center shadow-sm"><Trash2 className="w-3 h-3 md:w-4 md:h-4" /></button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : view === 'course-requests' ? (
            <motion.div 
              key="course-requests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-transparent space-y-8"
            >
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-[3rem] p-4 md:p-6 border border-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <div className="flex items-center gap-3 md:gap-4 text-emerald-600">
                   <CheckCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                   <h3 className="text-sm md:text-lg font-black uppercase tracking-wider md:tracking-widest leading-tight">Duyệt tham gia khóa học</h3>
                 </div>
                 <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {['pending', 'approved', 'rejected', 'all'].map(f => (
                      <button 
                        key={f} 
                        onClick={() => setCourseRequestFilter(f as typeof courseRequestFilter)} 
                        className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${courseRequestFilter === f ? 'bg-emerald-600 text-white border-emerald-500 shadow-xl' : 'bg-white text-slate-400 border-indigo-50'}`}
                      >
                        {f}
                      </button>
                    ))}
                 </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {courseRequests.map((req, i) => (
                  <motion.div key={req.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-3xl p-3 md:p-4 border border-white flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 w-64 shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center font-black text-emerald-600 transition-transform">
                        {req.userEmail?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="space-y-0.5 truncate">
                        <div className="font-black text-slate-900 truncate">{req.userEmail?.split('@')[0] || 'Unknown User'}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ID: {req.userId?.substring(0, 8) || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="inline-flex items-center gap-2">
                         <div className="text-sm font-black text-slate-800">{req.courseTitle}</div>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] text-amber-500 font-black uppercase tracking-widest leading-none">Manual Invite Link:</span>
                          <button 
                            onClick={async () => {
                              const url = await getCourseVideoUrlAdmin(req.courseId);
                              if (url) {
                                navigator.clipboard.writeText(url);
                                showToast('Đã copy link khóa học!', 'success');
                              } else {
                                showToast('Link không tìm thấy', 'error');
                              }
                            }}
                            className="text-[9px] font-black text-amber-600 hover:text-amber-700 underline truncate max-w-[150px]"
                          >
                            Copy Link
                          </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {req.transactionCode && (
                          <button onClick={() => { navigator.clipboard.writeText(req.transactionCode!); showToast('Đã copy mã GD!', 'success'); }} className="flex items-center gap-1 text-[9px] font-black text-slate-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-100 transition-colors cursor-pointer">
                            {req.transactionCode} <Copy className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {req.fullName && <p className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 uppercase">{req.fullName}</p>}
                        {req.zaloNumber && (
                           <button onClick={() => { navigator.clipboard.writeText(req.zaloNumber!); showToast('Đã copy SĐT!', 'success'); }} className="flex items-center gap-1 text-[9px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-100 uppercase transition-colors cursor-pointer">
                             SĐT: {req.zaloNumber} <Copy className="w-2.5 h-2.5" />
                           </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                       <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 border ${req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-200' : req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}`}>
                         {req.status}
                       </span>
                       <div className="flex gap-1">
                         {req.status === 'pending' && (
                           <>
                             <button onClick={() => handleApproveCourseRequest(req)} className="w-10 h-10 bg-white text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95 border border-indigo-50 flex items-center justify-center p-0"><CheckCircle className="w-5 h-5" /></button>
                             <button onClick={() => handleRejectCourseRequest(req)} className="w-10 h-10 bg-white text-slate-300 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 border border-indigo-50 flex items-center justify-center p-0"><XCircle className="w-5 h-5" /></button>
                           </>
                         )}
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : view === 'quotes' ? (
            <motion.div key="quotes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 md:space-y-6">
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-[3rem] p-5 md:p-8 border border-white shadow-sm">
                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-violet-600 mb-4 md:mb-6 leading-tight">Thêm phương châm mới</h3>
                <form className="space-y-3 md:space-y-4" onSubmit={e => {e.preventDefault(); const form = e.target as HTMLFormElement; handleAddQuote((form[0] as HTMLInputElement).value, (form[1] as HTMLInputElement).value); form.reset();}}>
                  <input required placeholder="Nội dung" className="w-full p-3 md:p-4 rounded-lg md:rounded-xl border border-slate-200 text-xs md:text-sm" />
                  <input required placeholder="Thể loại/Ghi chú" className="w-full p-3 md:p-4 rounded-lg md:rounded-xl border border-slate-200 text-xs md:text-sm" />
                  <button type="submit" className="w-full sm:w-auto px-5 py-2 md:px-6 md:py-3 bg-violet-600 text-white rounded-lg md:rounded-xl font-black text-xs md:text-sm hover:bg-violet-700 transition-colors">Thêm</button>
                </form>
              </div>
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-[3rem] p-4 md:p-6 border border-white shadow-sm space-y-2 md:space-y-4">
                {quotes.map(q => (
                  <div key={q.id} className="flex justify-between items-center p-3 md:p-4 bg-slate-50/50 rounded-lg md:rounded-xl border border-slate-100/50">
                    <p className="text-[10px] md:text-sm text-slate-700 leading-relaxed pr-4">
                      {q.text} <span className="text-[8px] md:text-xs text-slate-400 font-medium italic">({q.category})</span>
                    </p>
                    <button 
                      onClick={() => handleDeleteQuote(q.id)}
                      className="w-8 h-8 rounded-lg bg-white text-slate-400 hover:text-red-500 border border-slate-100 flex items-center justify-center transition-colors shrink-0 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="requests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-transparent space-y-4"
            >
              {/* Request Control Panel */}
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl md:rounded-3xl p-3 md:p-6 border border-white shadow-[0_20px_50px_-20px_rgba(79,70,229,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
                <div className="space-y-2 md:space-y-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 md:gap-3 text-indigo-600">
                    <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                    <h3 className="text-sm md:text-lg font-black uppercase tracking-wider md:tracking-[0.2em]">Hàng chờ phê duyệt</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {[
                      { id: 'pending', label: 'Đang chuẩn bị' },
                      { id: 'approved', label: 'Thành công' },
                      { id: 'rejected', label: 'Bị từ chối' },
                      { id: 'all', label: 'Lịch sử' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setRequestFilter(f.id as typeof requestFilter)}
                        className={`flex-1 sm:flex-none px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] transition-all border shrink-0 ${
                          requestFilter === f.id 
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' 
                            : 'bg-white text-slate-400 border-indigo-50 hover:bg-indigo-50 hover:text-indigo-600'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto border-t sm:border-0 border-indigo-50/50 pt-2 sm:pt-0">
                  <button 
                    onClick={refreshRequests}
                    disabled={requestsLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-white text-slate-400 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-wider md:tracking-[0.2em] hover:text-indigo-600 transition-all disabled:opacity-50 border border-indigo-50 shadow-sm"
                  >
                    <Loader2 className={`w-3.5 h-3.5 md:w-4 md:h-4 ${requestsLoading ? 'animate-spin' : ''}`} />
                    <span className="truncate">Đồng bộ Data</span>
                  </button>
                </div>
              </div>

              {requestsError && (
                <div className="p-10 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 flex items-center gap-6 text-red-500 text-sm font-bold">
                  <XCircle className="w-8 h-8 shrink-0" />
                  <div className="flex-1">Hệ thống phát hiện lỗi: {requestsError}</div>
                  <button onClick={refreshRequests} className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Sửa lỗi</button>
                </div>
              )}

              {requestsLoading && requests.length === 0 ? (
                <div className="py-40 text-center space-y-6">
                  <div className="relative inline-block">
                    <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                    </div>
                  </div>
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Đang trích xuất Node dữ liệu...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 pb-20">
                  <AnimatePresence mode="popLayout">
                    {requests.map((req, i) => (
                      <motion.div
                        key={req.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                        className="group bg-white/60 backdrop-blur-xl rounded-3xl p-4 border border-white hover:border-indigo-200 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
                      >
                        {/* Status Stripe */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${
                          req.status === 'pending' ? 'bg-amber-500' : 
                          req.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                        } opacity-0 group-hover:opacity-100 transition-opacity`} />

                        <div className="flex items-center gap-4">
                          {/* User Identity Column */}
                          <div className="flex items-center gap-3 w-full sm:w-64 shrink-0">
                            <div className="relative group/avatar">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 p-[1px] shadow-lg">
                                <div className="w-full h-full bg-white rounded-[calc(0.75rem-1px)] flex items-center justify-center font-black text-indigo-600">
                                  {req.userEmail?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-md shadow-md flex items-center justify-center border border-indigo-50">
                                {req.status === 'approved' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                              </div>
                            </div>
                            <div className="space-y-0.5 overflow-hidden">
                              <div className="font-black text-slate-900 tracking-tight leading-none truncate uppercase group-hover:text-indigo-600 transition-colors">
                                {req.userEmail?.split('@')[0] || 'UNKNOWN'}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-bold font-mono tracking-tighter">ID: {req.userId?.substring(0, 8) || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Asset Info Column */}
                          <div className="flex-1 space-y-1 min-w-0">
                             <div className="text-sm font-black text-slate-800 tracking-tight leading-tight line-clamp-1">
                               {req.documentTitle}
                             </div>
                             {docs.find(d => d.id === req.documentId)?.requiresManualAccess && (
                                <div className="flex items-center gap-2">
                                   <span className="text-[8px] text-amber-500 font-black uppercase tracking-widest">Manual Admin Action:</span>
                                   <button 
                                     onClick={async () => {
                                       const url = await getDocumentFileUrl(req.documentId);
                                       if (url) {
                                         navigator.clipboard.writeText(url);
                                         showToast('Đã copy link gốc!', 'success');
                                       } else {
                                         showToast('Link không tìm thấy', 'error');
                                       }
                                     }}
                                     className="text-[9px] font-black text-amber-600 hover:text-amber-700 underline truncate max-w-[150px]"
                                   >
                                     Copy Source Link
                                   </button>
                                </div>
                             )}
                             <div className="flex items-center gap-2 flex-wrap">
                               {req.transactionCode && (
                                  <div className="inline-flex items-center gap-1">
                                     <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Mã:</p>
                                     <button onClick={() => { navigator.clipboard.writeText(req.transactionCode!); showToast('Đã copy mã GD!', 'success'); }} className="flex items-center gap-1 text-[9px] font-black text-slate-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-100 transition-colors cursor-pointer">
                                       {req.transactionCode} <Copy className="w-2.5 h-2.5" />
                                     </button>
                                  </div>
                               )}
                               {req.fullName && (
                                  <p className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 uppercase">{req.fullName}</p>
                               )}
                               {req.zaloNumber && (
                                  <button onClick={() => { navigator.clipboard.writeText(req.zaloNumber!); showToast('Đã copy SĐT!', 'success'); }} className="flex items-center gap-1 text-[9px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-100 uppercase transition-colors cursor-pointer">
                                    SĐT: {req.zaloNumber} <Copy className="w-2.5 h-2.5" />
                                  </button>
                               )}
                             </div>
                          </div>

                          {/* Status & Actions Column */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 border ${
                              req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 
                              req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                              'bg-red-500/10 text-red-600 border-red-200'
                            }`}>
                              {req.status === 'pending' ? 'Hàng chờ' : req.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                            </span>

                            <div className="flex gap-1">
                              {req.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => handleApproveRequest(req)}
                                    disabled={loadingAction === req.id}
                                    className="w-10 h-10 bg-white text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95 border border-indigo-50 flex items-center justify-center p-0 disabled:opacity-50"
                                  >
                                    {loadingAction === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                  </button>
                                  <button 
                                    onClick={() => handleRejectRequest(req)}
                                    disabled={loadingAction === req.id}
                                    className="w-10 h-10 bg-white text-slate-300 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95 border border-indigo-50 flex items-center justify-center p-0 disabled:opacity-50"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              
              {!requestsLoading && requests.length === 0 && !requestsError && (
                <div className="py-52 text-center space-y-8 bg-white/40 rounded-[4rem] border border-white mt-12">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center mx-auto border border-indigo-50 shadow-sm relative z-10">
                      <ShieldCheck className="w-14 h-14 text-indigo-100" />
                    </div>
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-xl group hover:rotate-12 transition-transform">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-slate-900 font-black uppercase tracking-[0.4em] text-sm">Node đã dọn dẹp</div>
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest max-w-xs mx-auto">
                      {requestFilter === 'pending' ? 'Tất cả các bản ghi đã được phê duyệt thành công.' : 'Cơ sở dữ liệu trống. Không có lịch sử tương tác.'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal - Professional Streamlined Interface */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAdding(false); setEditingDoc(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl shadow-2xl relative z-10 custom-scrollbar flex flex-col"
            >
              <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md font-bold text-[10px] uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Asset Publishing
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingDoc ? 'Cập Nhật Bản Ghi' : 'Phát Hành Bản Ghi Mới'}
                  </h2>
                </div>
                <button 
                  onClick={() => { setIsAdding(false); setEditingDoc(null); }} 
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-100 shadow-sm shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 flex-1">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Định danh tài liệu</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                      placeholder="Nhập tên tài liệu..."
                      value={newDoc.title || ''}
                      onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Giá niêm yết</label>
                    <div className="relative group">
                       <input 
                        required
                        type="number" 
                        className={`w-full pl-4 pr-16 py-2.5 rounded-xl border focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm font-bold transition-all ${
                          newDoc.price === 0 ? 'bg-indigo-50 text-indigo-400 border-indigo-100' : 'bg-slate-50 text-slate-900 border-slate-200'
                        }`}
                        value={newDoc.price}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setNewDoc({...newDoc, price: isNaN(val) ? 0 : Math.max(0, val)});
                        }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] uppercase">VND</span>
                    </div>
                    <label 
                      className="flex items-center gap-2 mt-1.5 cursor-pointer group/free w-fit"
                      onClick={() => setNewDoc({...newDoc, price: newDoc.price === 0 ? 20000 : 0})}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${newDoc.price === 0 ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover/free:border-indigo-400'}`}>
                        {newDoc.price === 0 && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 select-none">Tài liệu miễn phí</span>
                    </label>
                  </div>
                </div>

                {/* Taxonomy */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lớp</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 text-sm font-semibold text-slate-700 outline-none"
                      value={selectedGrade}
                      onChange={e => setSelectedGrade(e.target.value)}
                    >
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Môn</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 text-sm font-semibold text-slate-700 outline-none"
                      value={selectedSubject}
                      onChange={e => setSelectedSubject(e.target.value)}
                    >
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nhãn</label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 text-sm font-semibold outline-none"
                      value={newDoc.status}
                      onChange={e => setNewDoc({...newDoc, status: e.target.value as typeof newDoc.status})}
                      style={{ color: newDoc.status === 'Hot' ? '#ef4444' : newDoc.status === 'Bestseller' ? '#f59e0b' : newDoc.status === 'New' ? '#10b981' : '#475569' }}
                    >
                      <option value="New" className="text-emerald-500">New</option>
                      <option value="Hot" className="text-red-500">Hot</option>
                      <option value="Bestseller" className="text-amber-500">Bestseller</option>
                      <option value="Regular" className="text-slate-600">Regular</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mô tả nội dung</label>
                  <textarea 
                    required
                    rows={10}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium text-slate-700 custom-scrollbar resize-none"
                    placeholder="Tóm tắt nội dung và điểm nổi bật..."
                    value={newDoc.description || ''}
                    onChange={e => setNewDoc({...newDoc, description: e.target.value})}
                  />
                  <label 
                    className="flex items-center gap-2 mt-3 cursor-pointer group/manual w-fit"
                    onClick={() => setNewDoc({...newDoc, requiresManualAccess: !newDoc.requiresManualAccess})}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${newDoc.requiresManualAccess ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover/manual:border-indigo-400'}`}>
                      {newDoc.requiresManualAccess && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 select-none">Tài liệu duyệt thủ công (Cần Admin cấp quyền vào Link gốc)</span>
                  </label>
                </div>

                {/* URLs Section */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Link đọc thử
                      </label>
                      <input 
                        required={newDoc.price > 0}
                        type="url"
                        placeholder="Link PDF (đọc)..."
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                        value={newDoc.previewUrl || ''}
                        onChange={e => setNewDoc({...newDoc, previewUrl: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Link ảnh đại diện
                      </label>
                      <input 
                        required
                        type="url"
                        placeholder="Link ảnh bìa..."
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                        value={newDoc.thumbnailUrl || ''}
                        onChange={e => setNewDoc({...newDoc, thumbnailUrl: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Link gốc (PDF/Drive)
                      </label>
                      <input 
                        required
                        type="url"
                        placeholder="Link file gốc..."
                        className="w-full px-3 py-2 bg-white rounded-lg border border-amber-200 text-[11px] font-mono text-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                        value={fileUrl}
                        onChange={e => setFileUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="text-[9px] text-slate-400 font-medium italic flex items-center gap-1 px-1">
                    <div className="w-1 h-1 rounded-full bg-amber-400" />
                    Link gốc được ẩn bảo mật. {newDoc.requiresManualAccess ? 'Admin sẽ dùng link này để cấp quyền thủ công.' : 'Tự động cấp quyền sau khi thanh toán.'}
                  </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => { setIsAdding(false); setEditingDoc(null); }}
                    className="px-6 py-3 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {editingDoc ? 'Cập nhật' : 'Phát hành'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal - Pro Triage Style */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl"
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white max-w-md w-full p-12 rounded-[4rem] border border-indigo-100 shadow-2xl overflow-hidden relative z-10"
            >
              <div className={`absolute top-0 left-0 w-full h-2 ${confirmModal.actionType === 'approve' ? 'bg-emerald-500' : 'bg-red-500'} shadow-[0_0_20px_rgba(79,70,229,0.1)]`} />
              
              <div className="flex flex-col items-center text-center">
                <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-8 border transition-transform duration-700 hover:rotate-12 ${
                  confirmModal.actionType === 'approve' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  {confirmModal.actionType === 'approve' ? <CheckCircle className="w-12 h-12" /> : <Trash2 className="w-12 h-12" />}
                </div>
                
                <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-4">{confirmModal.title}</h3>
                <p className="text-slate-400 mb-12 leading-relaxed font-medium text-sm">{confirmModal.message}</p>
                
                <div className="grid grid-cols-2 gap-5 w-full">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="py-5 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-3xl font-black text-[10px] uppercase tracking-[0.25em] transition-all border border-slate-100"
                  >
                    Hủy thao tác
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className={`py-5 px-8 rounded-3xl font-black text-[10px] uppercase tracking-[0.25em] transition-all shadow-xl relative overflow-hidden group ${
                      confirmModal.actionType === 'approve' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' 
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
                    }`}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative z-10">Xác nhận</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Course Modal */}
      <AnimatePresence>
        {isAddingCourse && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddingCourse(false); setEditingCourse(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl shadow-2xl relative z-10 custom-scrollbar flex flex-col">
              <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md font-bold text-[10px] uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Course Publishing
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingCourse ? 'Cập Nhật Khóa Học' : 'Phát Hành Khóa Học Mới'}</h2>
                </div>
                <button onClick={() => { setIsAddingCourse(false); setEditingCourse(null); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-100 shrink-0 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              
              <form onSubmit={handleCourseSubmit} className="space-y-3 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tên khóa học</label>
                    <input required className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-semibold placeholder:text-slate-400" placeholder="Nhập tên khóa học..." value={newCourse.title || ''} onChange={e => setNewCourse({...newCourse, title: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Giảng viên / Trung tâm</label>
                    <input required className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-semibold placeholder:text-slate-400" placeholder="Tên giảng viên..." value={newCourse.instructor || ''} onChange={e => setNewCourse({...newCourse, instructor: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Học phí</label>
                    <div className="relative group">
                      <input 
                        required
                        type="number" 
                        className={`w-full pl-4 pr-16 py-2.5 rounded-xl border focus:ring-4 text-sm font-bold transition-all ${
                          newCourse.price === 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/10' : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10'
                        }`}
                        value={newCourse.price} 
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setNewCourse({...newCourse, price: isNaN(val) ? 0 : Math.max(0, val)});
                        }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] uppercase">VND</span>
                    </div>
                    <label 
                      className="flex items-center gap-2 mt-1.5 cursor-pointer group/free w-fit"
                      onClick={() => setNewCourse({...newCourse, price: newCourse.price === 0 ? 199000 : 0})}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${newCourse.price === 0 ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300 group-hover/free:border-emerald-400'}`}>
                        {newCourse.price === 0 && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 select-none">Khóa học miễn phí</span>
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Trạng thái</label>
                    <select className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm font-semibold outline-none" value={newCourse.status} onChange={e => setNewCourse({...newCourse, status: e.target.value as typeof newCourse.status})}>
                      <option value="New" className="text-emerald-500">New</option>
                      <option value="Hot" className="text-red-500">Hot</option>
                      <option value="Upcoming" className="text-blue-500">Upcoming</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mô tả khóa học</label>
                  <textarea rows={10} className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-medium custom-scrollbar resize-none" placeholder="Tóm tắt nội dung khóa học..." value={newCourse.description || ''} onChange={e => setNewCourse({...newCourse, description: e.target.value})} />
                  <label 
                    className="flex items-center gap-2 mt-2 cursor-pointer group/manual w-fit"
                    onClick={() => setNewCourse({...newCourse, requiresManualAccess: !newCourse.requiresManualAccess})}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${newCourse.requiresManualAccess ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300 group-hover/manual:border-emerald-400'}`}>
                      {newCourse.requiresManualAccess && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 select-none">Khóa học duyệt thủ công (Cấp quyền qua Email)</span>
                  </label>
                </div>

                {/* URLs Section */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Link đọc thử
                      </label>
                      <input 
                        type="url"
                        placeholder="Link preview (gg drive)..."
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        value={newCourse.previewUrl || ''}
                        onChange={e => setNewCourse({...newCourse, previewUrl: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Link gốc (Nội dung chính)
                      </label>
                      <input 
                        required
                        type="url"
                        placeholder="Link tài liệu/video gốc..."
                        className="w-full px-3 py-2 bg-white rounded-lg border border-amber-200 text-[11px] font-mono text-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                        value={newCourse.originalLink || ''}
                        onChange={e => setNewCourse({...newCourse, originalLink: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Link ảnh đại diện
                      </label>
                      <input 
                        required
                        type="url"
                        placeholder="Link ảnh bìa..."
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        value={newCourse.thumbnailUrl || ''}
                        onChange={e => setNewCourse({...newCourse, thumbnailUrl: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium italic flex items-center gap-1 px-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    Link gốc được ẩn bảo mật. {newCourse.requiresManualAccess ? 'Admin sẽ dùng link này để mời học viên qua Gmail.' : 'Tự động cấp quyền sau khi thanh toán.'}
                  </div>
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                  <button type="button" onClick={() => { setIsAddingCourse(false); setEditingCourse(null); }} className="px-6 py-3 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-colors">
                    Hủy
                  </button>
                  <button type="submit" disabled={submitting} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] transition-colors flex items-center gap-2 disabled:opacity-50">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {editingCourse ? 'Cập nhật' : 'Phát hành'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[300]">
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.8, transition: { duration: 0.2 } }}
              className={`px-10 py-5 rounded-[3rem] shadow-[0_30px_70px_rgba(79,70,229,0.15)] flex items-center gap-6 backdrop-blur-3xl border bg-white/90 ${
                toast.type === 'success' ? 'border-emerald-100 text-emerald-600' : 'border-red-100 text-red-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'} shadow-lg`}>
                {toast.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div className="space-y-0.5">
                <div className="font-black text-[10px] uppercase tracking-[0.3em] opacity-40">{toast.type === 'success' ? 'Hệ thống báo cáo' : 'Cảnh báo hệ thống'}</div>
                <div className="font-black text-sm uppercase tracking-tight leading-none truncate max-w-xs">{toast.message}</div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
