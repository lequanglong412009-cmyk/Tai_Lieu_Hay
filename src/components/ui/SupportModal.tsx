import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Shield, Lock, Eye, Database, Scale, 
  CheckCircle2, BookOpenCheck, ShieldAlert,
  CreditCard, Zap, MessageCircle
} from 'lucide-react';

export type SupportType = 'payment' | 'terms' | 'privacy' | 'copyright' | null;

interface SupportModalProps {
  type: SupportType;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  const renderContent = () => {
    switch (type) {
      case 'payment':
        return (
          <div className="space-y-6">
            <div className="text-center md:text-left mb-6">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">
                Thanh toán & <span className="text-indigo-600">Kích hoạt</span>
              </h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Nhận quyền truy cập tức thì chỉ với 3 bước</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bank Card - Compact Design */}
              <div className="p-5 bg-[#0B1221] rounded-[2rem] text-white relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">Ngân hàng thụ hưởng</span>
                  <p className="text-sm font-black mt-1">MB BANK (Quân Đội)</p>
                </div>
                <div className="relative z-10 mt-4">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Số tài khoản</span>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-black tracking-tighter">0386281920</p>
                    <button 
                      onClick={() => navigator.clipboard.writeText('0386281920')}
                      className="px-2 py-0.5 bg-white/10 rounded-md text-[7px] font-black uppercase hover:bg-white/20 transition-all border border-white/10"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="relative z-10 mt-4">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Chủ tài khoản</span>
                  <p className="text-xs font-black uppercase tracking-tight">LE QUANG LONG</p>
                </div>
              </div>

              {/* Steps - Concise */}
              <div className="space-y-3">
                {[
                  { id: '1', title: 'Chuyển khoản', desc: 'Sử dụng App Bank hoặc Momo để thanh toán.', icon: CreditCard },
                  { id: '2', title: 'Xác nhận', desc: 'Chụp ảnh giao dịch & nhắn Admin qua Zalo.', icon: MessageCircle },
                  { id: '3', title: 'Hoàn tất', desc: 'Tài khoản được cấp quyền tải file gốc.', icon: Zap }
                ].map((step) => (
                  <div key={step.id} className="flex gap-3 items-center p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <step.icon className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{step.title}</h4>
                      <p className="text-[9px] text-slate-500 font-bold leading-tight">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
              <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                ※ NỘI DUNG CK: <span className="text-indigo-600 underline">EMAIL ĐĂNG NHẬP CỦA BẠN</span>
              </p>
            </div>
          </div>
        );
      case 'terms':
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
                Điều khoản <span className="text-indigo-600">Dịch vụ</span>
              </h1>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">TailieuHay cam kết cung cấp trải nghiệm học thuật minh bạch và chuyên nghiệp cho cộng đồng người học.</p>
            </div>
            
            <div className="space-y-5">
              {[
                { title: "Quyền truy cập", content: "Sau khi hoàn tất giao dịch, quý khách được cấp quyền truy cập trọn đời và cập nhật các phiên bản mới (nếu có) của tài liệu tương ứng.", icon: CheckCircle2 },
                { title: "Sở hữu trí tuệ", content: "Mọi nội dung trên nền tảng thuộc bản quyền của TailieuHay hoặc đối tác. Nghiêm cấm mọi hành vi sao chép, phát tán dưới mọi hình thức thương mại.", icon: Scale },
                { title: "Chính sách hoàn tiền", content: "Do đặc thù sản phẩm số hoá, chúng tôi không áp dụng chính sách hoàn trả khi quyền truy cập đã được cấp. Rất mong quý khách kiểm tra kỹ nội dung trước khi thanh toán.", icon: ShieldAlert }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item.title}</h3>
                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">"{item.content}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
                Chính sách <span className="text-indigo-600">Bảo mật</span>
              </h1>
              <p className="text-slate-500 text-xs font-bold">Dữ liệu cá nhân và sự tin tưởng của quý khách là tài sản quý giá nhất của chúng tôi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { title: "Bảo mật giao dịch", desc: "Mọi thông tin chuyển khoản được xử lý riêng tư và không lưu giữ thông tin thẻ nhạy cảm.", icon: Lock },
                { title: "Quyền dữ liệu", desc: "Quý khách có toàn quyền yêu cầu trích xuất hoặc xóa bỏ dữ liệu cá nhân khỏi hệ thống bất kỳ lúc nào.", icon: Database },
                { title: "Cam kết 3 không", desc: "Không quảng cáo phiền nhiễu, không bán dữ liệu, không chia sẻ thông tin cho bên thứ ba.", icon: Eye },
                { title: "An toàn hệ thống", desc: "Ứng dụng các giao thức mã hóa quân đội để đảm bảo dữ liệu không bị tấn công.", icon: Shield }
              ].map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50/50 rounded-[1.5rem] border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                  <item.icon className="w-4 h-4 text-indigo-600 mb-2" />
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{item.title}</h3>
                  <p className="text-[10px] text-slate-500 font-bold leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-[9px] text-slate-400 font-black uppercase text-center tracking-widest">
                Được cập nhật lần cuối: Tháng 5, 2026
              </p>
            </div>
          </div>
        );
      case 'copyright':
        return (
          <div className="space-y-8">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
                Bản quyền <span className="text-indigo-600">nội dung</span>
              </h1>
              <p className="text-slate-500 text-sm font-medium">Quy chuẩn bảo hộ tài sản trí tuệ tại TAILIEUHAY.</p>
            </div>
            <div className="space-y-6">
              {[
                { title: "Nguồn gốc", desc: "Biên soạn bởi chuyên gia hoặc nguồn Bộ GD&ĐT.", icon: BookOpenCheck, color: "text-indigo-600 bg-indigo-50" },
                { title: "Vi phạm", desc: "Nghiêm cấm sao chép. Vi phạm bị khóa TK vĩnh viễn.", icon: ShieldAlert, color: "text-red-600 bg-red-50" }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">{item.title}</h3>
                    <p className="text-slate-500 text-[11px] leading-relaxed font-bold">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#0B1221]/90 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="p-8 md:p-12 max-h-[80vh] overflow-y-auto no-scrollbar">
            {renderContent()}
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
              © 2026 TAILIEUHAY • Support Hub
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
