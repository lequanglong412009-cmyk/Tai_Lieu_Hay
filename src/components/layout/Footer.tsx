import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, MessageCircle, Send, ShieldCheck, Mail, Phone, GraduationCap, Copy, Check } from 'lucide-react';
import { SupportModal, SupportType } from '../ui/SupportModal';

export const Footer: React.FC = () => {
  const [supportType, setSupportType] = useState<SupportType>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopy = (e: React.MouseEvent, text: string, type: 'email' | 'phone') => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  return (
    <footer className="bg-[#0B1221] text-white pt-8 pb-4 overflow-hidden relative">
      <SupportModal type={supportType} onClose={() => setSupportType(null)} />
      {/* Background patterns - simplified for space */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          {/* Brand Info */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
                <GraduationCap className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-[900] tracking-tighter text-white">
                TAILIEU<span className="text-indigo-500">HAY</span>
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed font-bold max-w-xs">
              Nền tảng chia sẻ học liệu và ôn thi THPT Quốc gia hàng đầu Việt Nam. Đồng hành cùng sĩ tử chinh phục ước mơ đại học.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Facebook, color: 'hover:bg-blue-600', path: '#' },
                { icon: Send, color: 'hover:bg-sky-500', path: '#' },
                { icon: MessageCircle, color: 'hover:bg-blue-600', path: 'https://Zalo.me/0386281920' }
              ].map((social, i) => (
                <a key={i} href={social.path} className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${social.color} hover:text-white transition-all text-slate-500 border border-white/5`}>
                  <social.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Khám phá & Hỗ trợ Wrapper */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-4">
            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Khám phá</h4>
              <ul className="space-y-2">
                {[
                  { name: 'Tài liệu lớp 12', path: '/?grade=Lớp 12' },
                  { name: 'Tài liệu lớp 11', path: '/?grade=Lớp 11' },
                  { name: 'Tài liệu lớp 10', path: '/?grade=Lớp 10' },
                  { name: 'Đề thi minh họa', path: '/?q=minh họa' },
                  { name: 'Khóa học VIP', path: '/?type=courses' }
                ].map((link) => (
                  <li key={link.name}>
                    <Link to={link.path} className="text-slate-400 hover:text-white transition-colors text-xs font-bold flex items-center gap-2 group">
                      <div className="w-1 h-1 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Hỗ trợ</h4>
              <ul className="space-y-2">
                {[
                  { name: 'Hướng dẫn thanh toán', type: 'payment' },
                  { name: 'Điều khoản sử dụng', type: 'terms' },
                  { name: 'Chính sách bảo mật', type: 'privacy' }
                ].map((link) => (
                  <li key={link.name}>
                    <button 
                      onClick={() => setSupportType(link.type as SupportType)}
                      className="text-slate-400 hover:text-white transition-colors text-xs font-bold flex items-center gap-2 group w-full text-left"
                    >
                      <div className="w-1 h-1 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
                      {link.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Kết nối</h4>
            <div className="grid grid-cols-1 gap-2">
              <a href="mailto:tailieuhay53@gmail.com" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-all p-3 rounded-xl border border-white/5 group relative overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                  <Mail className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
                </div>
                <div className="flex flex-col min-w-0 pr-8">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Email hỗ trợ</span>
                  <span className="text-xs font-bold text-white truncate">tailieuhay53@gmail.com</span>
                </div>
                <button 
                  onClick={(e) => handleCopy(e, 'tailieuhay53@gmail.com', 'email')}
                  className="absolute right-3 p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Copy email"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </a>
              <a href="tel:0386281920" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-all p-3 rounded-xl border border-white/5 group relative overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white" />
                </div>
                <div className="flex flex-col pr-8">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Hotline & Zalo</span>
                  <span className="text-xs font-bold text-white">0386281920</span>
                </div>
                <button 
                  onClick={(e) => handleCopy(e, '0386281920', 'phone')}
                  className="absolute right-3 p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Copy số điện thoại"
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            © 2026 TAILIEUHAY.
          </p>
          <div className="flex items-center gap-1 px-3 py-1 bg-white/5 rounded-full border border-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Bảo mật & Bảo vệ
          </div>
        </div>
      </div>
    </footer>

  );
};
