import React, { useEffect, useState } from 'react';
import { AlertTriangle, Chrome, MoreVertical, X } from 'lucide-react';

export const InAppBrowserBanner = () => {
  const [isInApp, setIsInApp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isFb = (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("FB_IAB") > -1);
    const isZalo = (ua.indexOf("Zalo") > -1);
    const isMessenger = (ua.indexOf("Messenger") > -1);
    const isInsta = (ua.indexOf("Instagram") > -1);
    
    if (isFb || isZalo || isMessenger || isInsta) {
      setIsInApp(true);
    }
  }, []);

  if (!isInApp || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b-2 border-amber-500 text-amber-900 px-4 py-3 sm:py-4 sticky top-0 w-full z-[100] shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-3 shrink-0 pr-6 sm:pr-0">
          <div className="bg-amber-100 p-2 rounded-full shadow-inner">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base leading-tight tracking-tight">Trình duyệt không hỗ trợ đăng nhập</h3>
            <p className="text-xs sm:text-sm font-medium opacity-80 mt-0.5">Vui lòng thoát khỏi ứng dụng Zalo/Facebook</p>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium w-full bg-white/60 p-2.5 sm:px-4 rounded-xl border border-amber-200/60 shadow-sm">
           <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] shrink-0 shadow-sm">1</span>
              <span>Nhấn biểu tượng <MoreVertical className="w-4 h-4 inline text-slate-600 bg-slate-100 rounded-[4px] border border-slate-200 shadow-sm mx-0.5" /> (3 chấm) ở góc phải</span>
           </div>
           <div className="hidden sm:block text-amber-300">→</div>
           <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] shrink-0 shadow-sm">2</span>
              <span>Chọn <b>Mở bằng trình duyệt</b> <Chrome className="w-4 h-4 inline text-blue-500 mx-0.5" /> để đăng nhập</span>
           </div>
        </div>

        <button 
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 sm:relative sm:top-auto sm:right-auto p-1.5 hover:bg-amber-200/50 rounded-full text-amber-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
