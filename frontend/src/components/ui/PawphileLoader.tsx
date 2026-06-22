import React from 'react';

export default function PawphileLoader({ message = 'Loading...', fullScreen = false }: { message?: string, fullScreen?: boolean }) {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 space-y-5">
      <div className="relative w-28 h-28 flex items-center justify-center">
         {/* Glowing rings */}
         <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin"></div>
         <div className="absolute inset-2 rounded-full border-4 border-violet-500/20 border-b-violet-500 animate-[spin_2s_linear_infinite_reverse]"></div>
         {/* Rolling doodle */}
         <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 z-10 animate-[bounce_1.5s_infinite]">
            <img src="/assets/pawphile-doodle.jpeg" alt="Loading doodle" className="w-full h-full object-cover animate-[spin_4s_linear_infinite]" />
         </div>
      </div>
      <p className="text-teal-600 dark:text-teal-400 font-black text-sm tracking-wide animate-pulse">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
        {content}
      </div>
    );
  }
  return content;
}
