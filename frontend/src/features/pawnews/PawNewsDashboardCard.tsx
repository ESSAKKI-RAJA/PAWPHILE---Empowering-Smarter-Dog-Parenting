import { useNavigate } from 'react-router-dom';
import { Newspaper, ChevronRight } from 'lucide-react';
import { ALL_PAWNEWS } from './pawNewsData';

export default function PawNewsDashboardCard() {
  const navigate = useNavigate();
  
  // Get top 2 items
  const previewItems = ALL_PAWNEWS.slice(0, 2);

  return (
    <button onClick={() => navigate('/pawnews')} className="pw-card w-full p-5 text-left flex flex-col gap-3 transition-transform hover:scale-[1.01] active:scale-[0.99]">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-teal-500" style={{ color: 'var(--teal)' }} />
          <div>
            <h3 className="font-black" style={{ color: 'var(--text)' }}>PAWNEWS</h3>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--text-2)' }}>Chennai & India dog-care updates</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-2)' }} />
      </div>
      
      <div className="flex flex-col gap-2 mt-1">
        {previewItems.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-start bg-black/20 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-teal-500/20 text-teal-400 shrink-0 mt-0.5">
              {item.category}
            </span>
            <p className="text-xs font-semibold leading-snug line-clamp-2 text-gray-200">
              {item.title}
            </p>
          </div>
        ))}
      </div>
    </button>
  );
}
