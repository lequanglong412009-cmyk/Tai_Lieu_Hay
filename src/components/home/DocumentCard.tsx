import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, User, Folder, Sparkles, Flame } from 'lucide-react';
import { Document } from '../../types';
import { motion } from 'motion/react';
import { getGoogleDriveThumbnail } from '../../lib/utils';

interface Props {
  document: Document;
}

export const DocumentCard: React.FC<Props> = ({ document }) => {
  const categoryStr = document.category || '';
  const subject = categoryStr.includes(' | ') 
    ? categoryStr.split(' | ')[1] 
    : categoryStr;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.1)" }}
      className="group relative bg-white border border-slate-200 overflow-hidden flex flex-row w-full h-auto transition-all duration-300"
    >
      {/* Thumbnail Area - Left Side */}
      <Link 
        to={`/documents/${document.id}`} 
        className="relative w-20 md:w-32 aspect-square bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 border-r border-slate-100"
      >
        <img 
          src={getGoogleDriveThumbnail(document.thumbnailUrl)} 
          alt={document.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        
        {/* Status Badge Over Image */}
        <div className="absolute top-1 left-1 flex flex-col gap-1 z-20">
          {document.status && document.status !== 'Regular' && (
            <div className={`flex items-center gap-1.5 px-1 py-0.5 rounded text-[6px] font-black uppercase shadow-lg text-white ${
              document.status === 'Hot' ? 'bg-rose-500' :
              document.status === 'Bestseller' ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}>
              {document.status === 'Hot' && <Flame className="w-2 h-2" />}
              {document.status === 'New' && <Sparkles className="w-2 h-2" />}
              <span className="hidden md:inline-block">{document.status === 'Bestseller' ? 'Bán chạy' : document.status}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Content Area - Middle */}
      <div className="flex-1 p-2 md:p-4 flex flex-col justify-center min-w-0">
        <Link to={`/documents/${document.id}`} className="block group/title mb-1">
          <h3 className="text-[12px] md:text-[17px] font-bold text-[#0D6EFD] leading-tight group-hover/title:underline transition-all tracking-tight line-clamp-2 uppercase">
            {document.title}
          </h3>
        </Link>
        <p className="text-[10px] md:text-[11px] text-slate-500 line-clamp-2 mb-2">
          {document.description}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-slate-100 rounded text-slate-500">
            <Tag className="w-2 h-2" />
            <span className="text-[8px] font-bold uppercase tracking-wider">{subject}</span>
          </div>
          <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Trọn bộ</span>
          </div>
        </div>
      </div>

      {/* Info Sidebar - Right Side */}
      <div className="w-20 md:w-[160px] p-2 border-l border-slate-100 flex flex-col justify-center gap-1 shrink-0">
        <div className="hidden md:block space-y-1">
          {/* Author */}
          <div className="flex items-center gap-1 group/author">
            <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
              <User className="w-3 h-3 text-slate-400 shrink-0" />
            </motion.div>
            <span className="text-[12px] font-medium text-slate-500 truncate">
              Admin
            </span>
          </div>

          {/* Type */}
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ y: -2 }}>
              <Folder className="w-3 h-3 text-slate-400 shrink-0" />
            </motion.div>
            <div className="px-1 border border-slate-300 rounded text-slate-500 text-[11px] font-semibold">
              Tài liệu
            </div>
          </div>
        </div>

        {/* Price Tag */}
        <div className="flex items-center justify-center pt-1 mt-1 border-t border-slate-100">
           <p className="text-[18px] text-center w-full">
             <span className="text-rose-600 font-black">{document.price === 0 ? 'Miễn phí' : `${document.price.toLocaleString()} đ`}</span>
           </p>
        </div>
      </div>
    </motion.div>
  );
};
