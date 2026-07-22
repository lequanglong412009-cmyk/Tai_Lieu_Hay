import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, User, Folder, Sparkles, Flame, PlayCircle } from 'lucide-react';
import { Course } from '../../types';
import { motion } from 'motion/react';
import { getGoogleDriveThumbnail } from '../../lib/utils';

interface Props {
  course: Course;
}

export const CourseCard: React.FC<Props> = ({ course }) => {
  const categoryStr = course.category || '';
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
        to={`/course/${course.id}`} 
        className="relative w-20 md:w-32 aspect-square bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 border-r border-slate-100"
      >
        <img 
          src={getGoogleDriveThumbnail(course.thumbnailUrl)} 
          alt={course.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        
        {/* Play Icon overlay */}
        <div className="absolute inset-0 bg-[#0B1221]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg text-indigo-600">
            <PlayCircle className="w-4 h-4 ml-0.5" />
          </div>
        </div>

        {/* Status Badge Over Image */}
        <div className="absolute top-1 left-1 flex flex-col gap-1 z-20">
          {course.status && (
            <div className={`flex items-center gap-1.5 px-1 py-0.5 rounded text-[6px] font-black uppercase shadow-lg text-white ${
              course.status === 'Hot' ? 'bg-rose-500' :
              course.status === 'Upcoming' ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}>
              {course.status === 'Hot' && <Flame className="w-2 h-2" />}
              {course.status === 'New' && <Sparkles className="w-2 h-2" />}
              <span className="hidden md:inline-block">
                {course.status === 'Upcoming' ? 'Sắp ra mắt' : course.status === 'New' ? 'Mới' : course.status}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content Area - Middle */}
      <div className="flex-1 p-2 md:p-4 flex flex-col justify-center min-w-0">
        <Link to={`/course/${course.id}`} className="block group/title mb-1">
          <h3 className="text-[12px] md:text-[17px] font-bold text-[#0D6EFD] leading-tight group-hover/title:underline transition-all tracking-tight line-clamp-2 uppercase">
            {course.title}
          </h3>
        </Link>
        <p className="text-[10px] md:text-[11px] text-slate-500 line-clamp-2 mb-2">
          {course.description}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-slate-100 rounded text-slate-500">
            <Tag className="w-2 h-2" />
            <span className="text-[8px] font-bold uppercase tracking-wider">{subject}</span>
          </div>
          <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
            <span className="text-[9px] font-bold uppercase tracking-wider">Trọn gói</span>
          </div>
        </div>
      </div>

      {/* Info Sidebar - Right Side */}
      <div className="w-20 md:w-[160px] p-2 border-l border-slate-100 flex flex-col justify-center gap-1 shrink-0">
        <div className="hidden md:block space-y-1">
          {/* Instructor */}
          <div className="flex items-center gap-1 group/author">
            <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
              <User className="w-3 h-3 text-slate-400 shrink-0" />
            </motion.div>
            <span className="text-[12px] font-medium text-slate-500 truncate">
              {course.instructor || 'Giáo viên'}
            </span>
          </div>

          {/* Type */}
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ y: -2 }}>
              <Folder className="w-3 h-3 text-slate-400 shrink-0" />
            </motion.div>
            <div className="px-1 border border-slate-300 rounded text-slate-500 text-[11px] font-semibold">
              Khóa học
            </div>
          </div>
        </div>

        {/* Price Tag */}
        <div className="flex items-center justify-center pt-1 mt-1 border-t border-slate-100">
           <p className="text-[18px] text-center w-full">
             <span className="text-rose-600 font-black">{course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString()} đ`}</span>
           </p>
        </div>
      </div>
    </motion.div>
  );
};
