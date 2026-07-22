import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Download, Share2, 
  ArrowLeft, Loader2, 
  CheckCircle2, CreditCard,
  X, User, Folder, MessageCircle,
  Copy, Check
} from 'lucide-react';
import { 
  getDocumentById, getSecureFileUrl,
  submitAccessRequest, trackDownload,
  getDocuments, MARKEPLTACE_COLLECTIONS
} from '../services/marketplaceService';
import { Document } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentCard } from '../components/home/DocumentCard';

export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(false);
  const [relatedDocs, setRelatedDocs] = useState<Document[]>([]);
  const [copied, setCopied] = useState(false);

  // Registration Form State
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const init = async () => {
      if (!id) return;
      try {
        const data = await getDocumentById(id);
        if (data) {
          setDocumentData(data);
          
          // Fetch related documents
          const allDocs = await getDocuments();
          const related = allDocs
            .filter(d => d.id !== id && (d.category === data.category));
          setRelatedDocs(related);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  useEffect(() => {
    if (!id || !user) {
      setHasPurchased(false);
      setRequestStatus(null);
      return;
    }

    const userId = user.uid;
    const purchaseRef = doc(db, MARKEPLTACE_COLLECTIONS.PURCHASES, `${userId}_${id}`);
    const requestRef = doc(db, MARKEPLTACE_COLLECTIONS.REQUESTS, `${userId}_${id}`);

    // Listen for purchases
    const unsubPurchase = onSnapshot(purchaseRef, (snap) => {
      setHasPurchased(snap.exists());
    }, (error) => {
      console.error('Purchase Listener Error:', error);
    });

    // Listen for requests
    const unsubRequest = onSnapshot(requestRef, (snap) => {
      if (snap.exists()) {
        setRequestStatus(snap.data().status);
      } else {
        setRequestStatus(null);
      }
    }, (error) => {
      console.error('Request Listener Error:', error);
    });

    return () => {
      unsubPurchase();
      unsubRequest();
    };
  }, [id, user]);

  const handlePurchase = async () => {
    if (!user) {
      await login();
      return;
    }
    if (!documentData) return;
    setIsRegModalOpen(true);
  };

  const confirmRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentData) return;

    setProcessingRequest(true);
    try {
      await submitAccessRequest(documentData, {});
      if (documentData.requiresManualAccess) {
        setRequestStatus('pending');
      } else {
        setRequestStatus('approved');
        setHasPurchased(true);
      }
      setIsRegModalOpen(false);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
    } finally {
      setProcessingRequest(false);
    }
  };

  const handleShare = async () => {
    if (!documentData) return;
    const shareData = {
      title: documentData.title,
      text: documentData.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Đã sao chép liên kết vào bộ nhớ tạm!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleDownload = async () => {
    if (!id) return;

    if (!user) {
      await login();
      return;
    }
    
    setDownloading(true);
    try {
      const url = await getSecureFileUrl(id);
      if (url) {
        await trackDownload(id);
        window.open(url, '_blank');
      } else {
        throw new Error('Không tìm thấy file.');
      }
    } catch (error) {
      // Providing more context for the user
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('permission')) {
        alert('Tài khoản của bạn chưa được cấp quyền tải tài liệu này. Vui lòng kiểm tra lại trạng thái giao dịch.');
      } else {
        alert('Lỗi khi tải file: ' + message);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderPurchaseCard = () => (
    <div className="bg-white p-3 md:p-4 rounded-xl space-y-3 border border-slate-100 shadow-none overflow-hidden relative">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-slate-900">Giá:</span>
        <span className="text-3xl font-black text-rose-600 tracking-tighter">
          {documentData?.price === 0 ? 'FREE' : `${documentData?.price.toLocaleString()} đ`}
        </span>
      </div>

      <div className="p-2 bg-amber-50 rounded-lg">
        <ul className="space-y-1">
          <li className="flex gap-1.5 text-[10px] text-amber-900 font-medium">
            <span className="text-amber-500">•</span>
            <span>Tự động cập nhật nội dung mới</span>
          </li>
        </ul>
      </div>

      <div className="space-y-2.5">
        {(hasPurchased || documentData?.price === 0 || (documentData?.requiresManualAccess && (requestStatus === 'pending' || requestStatus === 'approved'))) ? (
          <>
            {(documentData?.requiresManualAccess && documentData?.price !== 0 && (requestStatus === 'pending' || requestStatus === 'approved')) && (
              <div className="p-5 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-center mb-3 shadow-sm">
                <div className="text-emerald-900 font-black text-[13px] uppercase tracking-wide leading-relaxed">
                  {requestStatus === 'approved' 
                    ? '🎉 Giao dịch hoàn tất! Nhấn nút dưới để vào link gốc, sau đó đợi Admin duyệt quyền qua Gmail nhé!'
                    : '⏳ Đã đăng ký. Vui lòng nhấn nút bên dưới để vào link gốc, sau đó đợi Admin duyệt quyền qua Gmail nhé!'
                  }
                  <br />
                  <span className="text-[11px] text-emerald-700 mt-2 block font-bold">
                    Liên hệ Zalo 
                    <button 
                      onClick={() => handleCopyToClipboard('0386281920')}
                      className="inline-flex items-center gap-1.5 ml-1.5 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-md transition-colors group cursor-pointer"
                    >
                      <span className="text-[14px] underline font-black">0386281920</span>
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                    để được hỗ trợ duyệt nhanh nhất!
                  </span>
                </div>
              </div>
            )}
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-2 bg-emerald-600 hover:bg-slate-900 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {documentData?.requiresManualAccess ? 'Vào tài liệu' : (documentData?.price === 0 ? 'Tải miễn phí' : 'Tải file (.pdf)')}
            </button>
          </>
        ) : (
          <div className="space-y-2.5">
            {requestStatus === 'pending' ? (
              <div className="p-2 bg-indigo-50/30 border border-indigo-100 rounded-lg text-center">
                <p className="text-indigo-900 font-black text-[9px] uppercase tracking-widest">
                  ĐANG CHỜ DUYỆT THANH TOÁN
                </p>
              </div>
            ) : (requestStatus === 'rejected' || processingRequest) ? (
              <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-center">
                <p className="text-red-900 font-black text-[9px] uppercase tracking-widest">
                  {processingRequest ? 'Đang gửi...' : 'Từ chối'}
                </p>
                {!processingRequest && (
                  <button onClick={handlePurchase} className="w-full py-1 bg-red-600 hover:bg-slate-900 text-white rounded text-[9px] font-black uppercase mt-1">
                    Gửi lại
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={handlePurchase}
                disabled={processingRequest}
                className="w-full py-2 bg-indigo-600 hover:bg-slate-900 text-white rounded-lg font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {processingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                THANH TOÁN & SỞ HỮU NGAY
              </button>
            )}
            <p className="text-[9px] text-slate-500 font-medium text-center">
              Duyệt trong 15-30p.
            </p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
          <span>✓ Mới 2026</span>
        </div>
        <button 
          onClick={handleShare}
          className="flex items-center gap-1 text-[8px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest"
        >
          <Share2 className="w-3 h-3" />
          <span>Chia sẻ</span>
        </button>
      </div>

      <a 
        href="https://Zalo.me/0386281920" 
        target="_blank" 
        rel="noreferrer"
        className="mt-4 flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl group hover:border-indigo-200 transition-all"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <MessageCircle className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-indigo-900 uppercase">Thắc mắc? Liên hệ ngay</p>
          <p className="text-[10px] text-indigo-600 font-bold">Zalo Group hỗ trợ</p>
        </div>
      </a>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FF] pt-32 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="min-h-screen bg-[#F5F7FF] pt-32 text-center">
        <h2 className="text-slate-900 text-2xl font-black uppercase tracking-widest">Không tìm thấy tài liệu</h2>
        <button onClick={() => navigate('/')} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Quay lại trang chủ</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FF] pt-24 pb-32 lg:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#6B7280] hover:text-indigo-600 mb-6 transition-colors group font-black uppercase tracking-[0.2em] text-[10px]"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Quay lại
        </button>

        {/* Registration Modal */}
        <AnimatePresence>
          {isRegModalOpen && documentData && (
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
                        src={`https://api.vietqr.io/image/970422-0386281920-qr_only.jpg?accountName=LE%20QUANG%20LONG&addInfo=TL%20${documentData.id.slice(0, 8).toUpperCase()}`} 
                        alt="VietQR MB Bank"
                        className="w-full h-full object-contain rounded-xl mix-blend-multiply"
                      />
                    </div>
                    
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const response = await fetch(`https://api.vietqr.io/image/970422-0386281920-qr_only.jpg?accountName=LE%20QUANG%20LONG&addInfo=TL%20${documentData.id.slice(0, 8).toUpperCase()}`);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = window.document.createElement('a');
                          link.href = url;
                          link.download = `QR_ThanhToan_TL_${documentData.id.slice(0, 8).toUpperCase()}.jpg`;
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
                      disabled={processingRequest}
                      className="w-full py-3.5 bg-[#0B1221] hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processingRequest ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        'Đã chuyển khoản xong'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Unified Document Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="p-5 md:p-6 relative group">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
                  
                  <div className="shrink-0 w-full sm:w-40 rounded-2xl shadow-inner border border-slate-100 overflow-hidden group/preview relative aspect-[3/4] bg-slate-50">
                    <img 
                      src={documentData.thumbnailUrl} 
                      alt={documentData.title} 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 flex flex-col space-y-4 pt-1 w-full">
                    <div className="space-y-3 text-center sm:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50/80 border border-indigo-100/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">
                          Tài liệu chính thức
                        </span>
                      </div>
                      <h1 className="text-[13px] md:text-[15px] font-black text-[#0066FF] leading-[1.4] uppercase tracking-tight">
                        {documentData.title}
                      </h1>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-t border-slate-100 w-full mb-4">
                      <div className="flex flex-col items-center sm:items-start gap-1 shrink-0 pb-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Giá sở hữu</span>
                        <div className="text-2xl md:text-3xl font-black text-rose-600 tracking-tighter">
                          {documentData.price === 0 ? 'MIỄN PHÍ' : `${documentData.price.toLocaleString()} đ`}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2.5 w-full sm:w-[260px] shrink-0">
                        {/* Preview Button */}
                        {(documentData.previewUrl) && (
                          <button 
                            onClick={() => window.open(documentData.previewUrl, '_blank')}
                            className="w-full px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-sm active:scale-95"
                          >
                            Đọc thử tài liệu
                          </button>
                        )}
                        
                        {/* Action Button */}
                        {(hasPurchased || documentData.price === 0 || (documentData.requiresManualAccess && (requestStatus === 'pending' || requestStatus === 'approved'))) ? (
                          <button 
                            onClick={handleDownload}
                            disabled={downloading}
                            className="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[12px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : (documentData.requiresManualAccess ? 'Vào tài liệu gốc' : 'Tải về máy (.pdf)')}
                          </button>
                        ) : (
                          <button 
                            onClick={handlePurchase}
                            disabled={processingRequest || requestStatus === 'pending'}
                            className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[12px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                          >
                            {processingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : (requestStatus === 'pending' ? 'ĐANG CHỜ DUYỆT THANH TOÁN' : 'THANH TOÁN & SỞ HỮU NGAY')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Integrated Notification Banner */}
                    {((documentData.requiresManualAccess || documentData.price !== 0) && (requestStatus === 'pending' || requestStatus === 'approved')) && (
                      <div className={`p-4 sm:p-5 rounded-[1.25rem] w-full border transition-all animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 ${requestStatus === 'approved' ? 'bg-emerald-50/40 border-emerald-100' : 'bg-indigo-50/40 border-indigo-100'}`}>
                        <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
                          <div className={`font-black text-[11px] sm:text-[13px] uppercase tracking-wider flex items-center gap-2 ${requestStatus === 'approved' ? 'text-emerald-600' : 'text-indigo-500'}`}>
                            {requestStatus === 'approved' ? <Check className="w-4 h-4" /> : <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                            {requestStatus === 'approved' ? 'ADMIN ĐÃ DUYỆT!' : 'ĐÃ ĐĂNG KÝ!'}
                          </div>
                          <div className={`text-[9px] sm:text-[11px] uppercase font-black tracking-tight leading-relaxed ${requestStatus === 'approved' ? 'text-emerald-800' : 'text-indigo-600/80'}`}>
                            {requestStatus === 'approved'
                              ? (documentData.requiresManualAccess
                                  ? 'NHẤN NÚT "VÀO TÀI LIỆU GỐC" ĐỂ YÊU CẦU QUYỀN TRUY CẬP TỪ ADMIN.'
                                  : 'NHẤN NÚT "TẢI VỀ MÁY" ĐỂ HỌC NGAY!')
                              : (documentData.requiresManualAccess
                                  ? 'NHẤN NÚT "VÀO TÀI LIỆU GỐC" ĐỂ ADMIN DUYỆT TRUY CẬP.'
                                  : 'VUI LÒNG CHỜ ADMIN DUYỆT THANH TOÁN ĐỂ LẤY FILE.')}
                          </div>
                        </div>

                        <div className="hidden sm:block w-px h-10 bg-slate-200/60" />
                        <div className="sm:hidden w-full h-px bg-slate-200/60 max-w-[140px]" />

                        <div className="flex flex-col items-center sm:items-end gap-1">
                          <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">HỖ TRỢ ZALO</span>
                          <button 
                            onClick={() => handleCopyToClipboard('0386281920')}
                            className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white transition-all cursor-pointer shadow-sm active:scale-95 group ${requestStatus === 'approved' ? 'border-emerald-100 text-emerald-600' : 'border-indigo-100 text-indigo-600'}`}
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

              {/* Meta Bar */}
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-2">
                {[
                  { icon: User, label: "Tác giả", value: "Admin", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
                  { icon: Folder, label: "Thể loại", value: documentData.category || "Tài liệu", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
                  { icon: CheckCircle2, label: "Trạng thái", value: "Phát hành", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" }
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
            {documentData.description && (
              <div className="bg-[#FCF9F0] rounded-2xl border border-[#F0EBE1] p-5 md:p-6 shadow-sm">
                <h3 className="text-[#D97706] font-bold mb-4 text-sm uppercase tracking-wider">
                  Giới thiệu tài liệu:
                </h3>
                <div className="text-[13px] md:text-[14px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {documentData.description}
                </div>
              </div>
            )}

            {/* Related Documents - Moved below main info */}
            {relatedDocs.length > 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <span className="w-8 h-1 bg-indigo-600 rounded-full" />
                    TÀI LIỆU CÙNG CHỦ ĐỀ
                  </h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 ml-11">
                    CÁC TÀI LIỆU CHỌN LỌC KHÁC THUỘC CHUYÊN MỤC {documentData.category}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {relatedDocs.map(relatedDoc => (
                    <DocumentCard key={relatedDoc.id} document={relatedDoc} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-5">
              {renderPurchaseCard()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] z-50 flex items-center justify-between gap-4">
        <div className="flex flex-col">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá sở hữu</span>
           <span className="text-xl font-black text-rose-600 tracking-tighter line-clamp-1">
             {documentData.price === 0 ? 'MIỄN PHÍ' : `${documentData.price.toLocaleString()} đ`}
           </span>
        </div>
        <div className="flex-1 max-w-[200px]">
          {(hasPurchased || documentData.price === 0 || (documentData.requiresManualAccess && (requestStatus === 'pending' || requestStatus === 'approved'))) ? (
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : (documentData.requiresManualAccess ? 'Vào tài liệu gốc' : 'Tải về (.pdf)')}
            </button>
          ) : (
            <button 
              onClick={handlePurchase}
              disabled={processingRequest || requestStatus === 'pending'}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {processingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : (requestStatus === 'pending' ? 'ĐANG CHỜ DUYỆT' : 'THANH TOÁN LẤY FILE')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
