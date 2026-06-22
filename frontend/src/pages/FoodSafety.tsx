import { useState } from 'react';
import { Search, AlertTriangle, X, Info, ChevronDown, ChevronRight, Scale } from 'lucide-react';
import { usePawphileData } from '../context/PawphileDataContext';
import {
  FOOD_CATALOG, searchFoodCatalog, getCategoryStyle,
  type FoodEntry, type FoodSafetyCategory,
} from '../data/foodSafetyCatalog';
import PageWrapper from '../components/layout/PageWrapper';

const CATEGORY_FILTERS: { key: FoodSafetyCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all',      label: 'All Foods',    emoji: '🍽️' },
  { key: 'safe',     label: 'Safe',         emoji: '✅' },
  { key: 'moderate', label: 'Moderate',     emoji: '⚠️' },
  { key: 'avoid',    label: 'Avoid',        emoji: '🚫' },
  { key: 'toxic',    label: 'Toxic',        emoji: '☠️' },
];

function FoodCard({ food, open, onToggle }: { food: FoodEntry; open: boolean; onToggle: () => void }) {
  const style = getCategoryStyle(food.category);
  return (
    <div className="pw-card overflow-hidden" style={{ borderColor: style.border }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{
            food.category === 'safe' ? '✅' :
            food.category === 'moderate' ? '⚠️' :
            food.category === 'avoid' ? '🚫' : '☠️'
          }</span>
          <div>
            <p className="font-black text-sm" style={{ color: 'var(--text)' }}>{food.name}</p>
            {food.caloriesPer100g && (
              <p className="text-[10px] font-semibold" style={{ color: 'var(--text-3)' }}>
                {food.caloriesPer100g} kcal/100g
                {food.proteinG ? ` · ${food.proteinG}g protein` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: style.bg, color: style.color }}>
            {style.label}
          </span>
          {open ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-3)' }} /> :
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="space-y-1.5 pt-3">
            {food.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: style.color }} />
                <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text-2)' }}>{w}</p>
              </div>
            ))}
          </div>

          {food.safeNote && (
            <div className="rounded-xl px-3 py-2"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-xs font-semibold" style={{ color: '#10b981' }}>{food.safeNote}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {food.spiceRisk && <RiskTag label="Spice risk" />}
            {food.saltRisk && <RiskTag label="High salt" />}
            {food.oilRisk && <RiskTag label="High oil" />}
            {food.dairyRisk && <RiskTag label="Dairy risk" />}
            {food.sugarRisk && <RiskTag label="Sugar risk" />}
            {food.boneRisk && <RiskTag label="Bone risk" />}
            {food.allergyRisk && <RiskTag label="Allergy risk" />}
          </div>

          {food.aliases && food.aliases.length > 0 && (
            <p className="text-[10px] font-semibold" style={{ color: 'var(--text-3)' }}>
              Also: {food.aliases.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RiskTag({ label }: { label: string }) {
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
      {label}
    </span>
  );
}

export default function FoodSafety() {
  const { selectedDog } = usePawphileData();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FoodSafetyCategory | 'all'>('all');
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());

  const [manualFoodName, setManualFoodName] = useState('');
  const [portionGrams, setPortionGrams] = useState<number | ''>('');
  const [scanResult, setScanResult] = useState<FoodEntry | null>(null);
  const [scanPerformed, setScanPerformed] = useState(false);

  const toggleCard = (name: string) => {
    setOpenCards(prev => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  };

  const filteredFoods = FOOD_CATALOG.filter(f => {
    const matchesCat = categoryFilter === 'all' || f.category === categoryFilter;
    const matchesQ = !query || f.name.toLowerCase().includes(query.toLowerCase())
      || (f.aliases || []).some(a => a.toLowerCase().includes(query.toLowerCase()));
    return matchesCat && matchesQ;
  });



  const checkAllergyConflict = (food: FoodEntry) => {
    if (!selectedDog?.allergies || selectedDog.allergies.length === 0) return false;
    const terms = [food.name.toLowerCase(), ...(food.aliases || []).map(a => a.toLowerCase())];
    return selectedDog.allergies.some(allergy => terms.some(t => t.includes(allergy.toLowerCase())));
  };

  const handleScan = () => {
    if (!manualFoodName.trim()) return;
    const found = searchFoodCatalog(manualFoodName);
    setScanResult(found || null);
    setScanPerformed(true);
  };

  const toxicCount = FOOD_CATALOG.filter(f => f.category === 'toxic').length;
  const avoidCount = FOOD_CATALOG.filter(f => f.category === 'avoid').length;
  const safeCount = FOOD_CATALOG.filter(f => f.category === 'safe').length;

  return (
    <PageWrapper className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28">
      {/* ── Header ────────────────────────────── */}
      <div className="px-5 pt-10 pb-4"
        style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.07) 0%, transparent 100%)' }}>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Food Scanner</h1>
        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-2)' }}>
          Search Catalog · Portion Calories · Allergy Checks
        </p>

        {/* Stats strip */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <StatPill icon="☠️" label={`${toxicCount} Toxic`} color="#ef4444" />
          <StatPill icon="🚫" label={`${avoidCount} Avoid`} color="#f97316" />
          <StatPill icon="✅" label={`${safeCount} Safe`} color="#10b981" />
        </div>
      </div>

      <div className="px-4 space-y-5 max-w-lg mx-auto">

        {/* ── FOOD SCAN ZONE ─────────────────────── */}
        <div className="pw-card p-4 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Scan New Food</p>
          


          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-2)' }}>Identify Food</label>
              <input
                type="text"
                value={manualFoodName}
                onChange={e => { setManualFoodName(e.target.value); setScanPerformed(false); }}
                placeholder="e.g. Chicken breast, Biryani, Curd..."
                className="pw-input text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-2)' }}>Portion Size (grams)</label>
              <div className="relative">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-3)' }} />
                <input
                  type="number"
                  value={portionGrams}
                  onChange={e => { setPortionGrams(e.target.value ? Number(e.target.value) : ''); setScanPerformed(false); }}
                  placeholder="e.g. 150"
                  className="pw-input pl-9 text-sm"
                />
              </div>
            </div>
            <button onClick={handleScan} disabled={!manualFoodName.trim()}
              className="w-full py-3 rounded-2xl font-black text-white transition-all disabled:opacity-50"
              style={{ background: 'var(--teal)' }}>
              Scan Food Safety
            </button>
          </div>
        </div>

        {/* ── SCAN RESULT ────────────────────────── */}
        {scanPerformed && (
          <div className="animate-fadeIn space-y-4">


            {scanResult ? (
              <div className="pw-card overflow-hidden" style={{ borderColor: getCategoryStyle(scanResult.category).border }}>
                <div className="px-4 py-3 flex items-center justify-between"
                  style={{ background: getCategoryStyle(scanResult.category).bg }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{scanResult.category === 'safe' ? '✅' : scanResult.category === 'moderate' ? '⚠️' : scanResult.category === 'avoid' ? '🚫' : '☠️'}</span>
                    <div>
                      <p className="font-black text-sm" style={{ color: 'var(--text)' }}>{scanResult.name}</p>
                      <p className="text-[10px] font-bold" style={{ color: getCategoryStyle(scanResult.category).color }}>
                        {getCategoryStyle(scanResult.category).label}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'var(--card)', color: 'var(--text-2)' }}>Conf: 85%</span>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {/* Calorie Estimate */}
                  {portionGrams && scanResult.caloriesPer100g && (
                    <div className="flex items-center justify-between p-2 rounded-xl" style={{ background: 'var(--card-2)' }}>
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Estimated Calories</p>
                      <p className="text-sm font-black" style={{ color: 'var(--text)' }}>
                        {Math.round((scanResult.caloriesPer100g / 100) * Number(portionGrams))} kcal
                      </p>
                    </div>
                  )}

                  {/* Allergy Check */}
                  {checkAllergyConflict(scanResult) && (
                    <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#ef4444' }}>Allergy Conflict!</p>
                        <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-2)' }}>
                          This food conflicts with {selectedDog?.name || 'your dog'}'s known allergies. Do not feed.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Toxic Warning */}
                  {scanResult.category === 'toxic' && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                      <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">☠️ TOXIC EMERGENCY</p>
                      <p className="text-xs font-semibold text-red-500">
                        This food is severely toxic to dogs. If ingested, contact an emergency vet immediately.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {scanResult.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: getCategoryStyle(scanResult.category).color }} />
                        <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text-2)' }}>{w}</p>
                      </div>
                    ))}
                  </div>

                  {scanResult.safeNote && (
                    <p className="text-xs font-semibold px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                      {scanResult.safeNote}
                    </p>
                  )}

                  <p className="text-[9px] font-semibold italic text-right mt-2" style={{ color: 'var(--text-3)' }}>
                    Data used: Local PAWPHILE Nutrition Rules
                  </p>
                </div>
              </div>
            ) : (
              <div className="pw-card p-4 flex items-center gap-3"
                style={{ borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.05)' }}>
                <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#8b5cf6' }} />
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--text)' }}>Not in our database</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-2)' }}>
                    "{manualFoodName}" isn't in the catalog. When in doubt, avoid feeding it — contact your vet.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <hr className="border-t border-slate-200 dark:border-slate-800 my-6" />

        {/* ── BROWSER / CATALOG ────────────────────── */}
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>Browse Catalog</p>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-3)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              type="text"
              placeholder="Search food (e.g. biryani, onion, carrot)…"
              className="pw-input pl-9 pr-10 text-sm"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {CATEGORY_FILTERS.map(({ key, label, emoji }) => (
              <button key={key} onClick={() => setCategoryFilter(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all"
                style={{
                  background: categoryFilter === key ? 'var(--teal)' : 'var(--card)',
                  color: categoryFilter === key ? '#fff' : 'var(--text-2)',
                  border: '1px solid var(--border-2)',
                }}>
                {emoji} {label}
              </button>
            ))}
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            {filteredFoods.length} of {FOOD_CATALOG.length} foods
          </p>

          <div className="space-y-3">
            {filteredFoods.map(food => (
              <FoodCard
                key={food.name}
                food={food}
                open={openCards.has(food.name)}
                onToggle={() => toggleCard(food.name)}
              />
            ))}
          </div>
        </div>

        {/* EMERGENCY WARNING: Toxic foods quick reference */}
        <div className="pw-card p-4 space-y-2 mt-6"
          style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#ef4444' }}>
              Emergency Reference — Always Toxic
            </p>
          </div>
          {['Chocolate', 'Grapes & Raisins', 'Onion & Garlic', 'Xylitol (artificial sweetener)', 'Alcohol', 'Caffeine', 'Macadamia Nuts', 'Avocado', 'Cooked Bones'].map(f => (
            <div key={f} className="flex items-center gap-2">
              <span className="text-base">☠️</span>
              <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{f}</p>
            </div>
          ))}
          <p className="text-[10px] italic mt-2" style={{ color: 'var(--text-3)' }}>
            If your dog ingested any of these, contact a vet immediately.
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-center italic leading-relaxed pb-4 mt-6" style={{ color: 'var(--text-3)' }}>
          This food safety scanner provides general screening support only. Ask a vet before making major diet changes. 
          Individual dogs may have unique allergies or sensitivities. Not a medical diagnosis.
        </p>
      </div>
    </PageWrapper>
  );
}

function StatPill({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
      style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
      <span className="text-sm">{icon}</span>
      <span className="text-[10px] font-black" style={{ color }}>{label}</span>
    </div>
  );
}
