import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Search, Navigation, Phone, Building2, Scissors, Siren, Star, Pill, Loader2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import L from 'leaflet';
import { searchVetClinics } from '../services/apiClient';

const CHENNAI_CLINICS = [
  { id: '1', name: 'Paws & Claws Veterinary Clinic', type: 'vet', lat: 13.0827, lng: 80.2707, distance: '1.2 km', address: 'Anna Nagar, Chennai', phone: '+91-44-2620-1234', rating: 4.8, openingHours: '09:00 - 20:00', is24_7: false, verificationLabel: 'Manually verified', source: 'Direct Call', last_verified_at: '2026-05-20' },
  { id: '2', name: 'Pet Care Emergency Hospital', type: 'emergency', lat: 13.0567, lng: 80.2587, distance: '2.5 km', address: 'T. Nagar, Chennai', phone: '+91-44-2434-5678', rating: 4.9, openingHours: '24/7', is24_7: true, verificationLabel: 'Source-backed', source: 'Vet Board Registry', last_verified_at: '2026-05-22' },
  { id: '3', name: 'Happy Tails Grooming & Spa', type: 'groomer', lat: 13.0700, lng: 80.2400, distance: '3.1 km', address: 'Nungambakkam, Chennai', phone: '+91-44-2827-9012', rating: 4.5, openingHours: '10:00 - 18:00', is24_7: false, verificationLabel: 'Unverified local update', source: 'User Submission', last_verified_at: '2026-05-10' },
  { id: '4', name: 'Vet Plus Multi-Specialty', type: 'vet', lat: 13.0450, lng: 80.2650, distance: '4.0 km', address: 'Adyar, Chennai', phone: '+91-44-2445-3456', rating: 4.7, openingHours: '08:00 - 22:00', is24_7: false, verificationLabel: 'Manually verified', source: 'Website', last_verified_at: '2026-05-25' },
  { id: '5', name: 'Blue Cross Emergency Vet', type: 'emergency', lat: 13.0200, lng: 80.2200, distance: '5.8 km', address: 'Guindy, Chennai', phone: '+91-44-2220-7890', rating: 4.6, openingHours: '24/7', is24_7: true, verificationLabel: 'Source-backed', source: 'Direct Call', last_verified_at: '2026-05-26' },
  { id: '6', name: 'Furry Friends Grooming', type: 'groomer', lat: 13.0900, lng: 80.2850, distance: '1.8 km', address: 'Kilpauk, Chennai', phone: '+91-44-2640-1234', rating: 4.4, openingHours: '09:00 - 19:00', is24_7: false, verificationLabel: 'Unverified local update', source: 'Google Maps', last_verified_at: '2026-04-15' },
  { id: '7', name: 'Caring Hands Vet Clinic', type: 'vet', lat: 13.0350, lng: 80.2550, distance: '3.5 km', address: 'Saidapet, Chennai', phone: '+91-44-2410-5678', rating: 4.8, openingHours: '09:30 - 21:00', is24_7: false, verificationLabel: 'Manually verified', source: 'Direct Call', last_verified_at: '2026-05-20' },
  { id: '8', name: 'PetWell Emergency Hospital', type: 'emergency', lat: 13.0600, lng: 80.2900, distance: '2.1 km', address: 'Egmore, Chennai', phone: '+91-44-2830-9012', rating: 4.9, openingHours: '24/7', is24_7: true, verificationLabel: 'Source-backed', source: 'Vet Board Registry', last_verified_at: '2026-05-22' }
];

type FilterType = 'all' | 'vet' | 'groomer' | 'emergency' | 'pharmacy';

const createIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const iconMap: Record<string, L.DivIcon> = {
  vet: createIcon('#38BDF8'), // sky-400
  emergency: createIcon('#EF4444'), // red-500
  groomer: createIcon('#F59E0B'), // amber-500
  pharmacy: createIcon('#38BDF8'), // sky-400
};

export default function VetFinder() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');
  const [localFilter, setLocalFilter] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.06, 80.25]);
  
  const [clinics, setClinics] = useState<any[]>(CHENNAI_CLINICS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchClinics = async () => {
      setLoading(true);
      try {
        // Use a default coordinate if we can't get GPS. Let's assume Chennai for MVP.
        const defaultLat = 13.06;
        const defaultLng = 80.25;
        
        // Attempt to get user location
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (!mounted) return;
            try {
              const res = await searchVetClinics(pos.coords.latitude, pos.coords.longitude, 15);
              setMapCenter([pos.coords.latitude, pos.coords.longitude]);
              if (res.results && res.results.length > 0) {
                setClinics(res.results);
              }
            } catch {
              console.warn("Failed to fetch API clinics, using fallback");
            } finally {
              if (mounted) setLoading(false);
            }
          },
          async () => {
            if (!mounted) return;
            try {
              const res = await searchVetClinics(defaultLat, defaultLng, 15);
              if (res.results && res.results.length > 0) {
                setClinics(res.results);
              }
            } catch {
              console.warn("Failed to fetch API clinics, using fallback");
            } finally {
              if (mounted) setLoading(false);
            }
          },
          { timeout: 5000 }
        );
      } catch {
        setLoading(false);
      }
    };
    
    fetchClinics();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => clinics.filter(v => {
    const vType = v.type || (v.emergency_available ? 'emergency' : 'vet');
    if (filter !== 'all' && vType !== filter) return false;
    if (localFilter && !v.name.toLowerCase().includes(localFilter.toLowerCase()) && !(v.address || '').toLowerCase().includes(localFilter.toLowerCase())) return false;
    return true;
  }), [filter, localFilter, clinics]);

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSearch) return;
    setLoading(true);
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=1`);
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);
        setMapCenter([lat, lng]);
        const res = await searchVetClinics(lat, lng, 15);
        setClinics(res.results || []);
      }
    } catch (err) {
      console.warn("Geocoding failed", err);
    }
    setLoading(false);
  };

  const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
  };

  const typeConfig = {
    vet: { icon: Building2, color: 'text-sky-400', bg: 'bg-sky-100', label: 'Veterinary Clinic' },
    emergency: { icon: Siren, color: 'text-red-500', bg: 'bg-red-100', label: 'Emergency Hospital' },
    groomer: { icon: Scissors, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Groomer' },
    pharmacy: { icon: Pill, color: 'text-sky-400', bg: 'bg-sky-100', label: 'Pharmacy' },
  };

  const tabs: {id: FilterType, label: string}[] = [
    {id: 'all', label: 'All'},
    {id: 'vet', label: 'Vets'},
    {id: 'emergency', label: 'Emergency'},
    {id: 'groomer', label: 'Groomers'},
    {id: 'pharmacy', label: 'Pharmacy'}
  ];

  return (
    <PageWrapper className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative text-slate-900 dark:text-slate-100">
      <div className="bg-white dark:bg-slate-900 px-4 md:px-5 pt-4 md:pt-12 pb-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 mt-2 md:mt-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Healthcare Locator</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Find clinics and services near you</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[11px] font-bold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Back
          </button>
        </div>
        
        <form onSubmit={handleLocationSearch} className="relative mb-3 w-full">
          <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input type="text" value={locationSearch} onChange={e => setLocationSearch(e.target.value)}
            placeholder="Search city or area..." className="w-full pl-10 pr-24 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" />
          <button type="submit" disabled={loading} className="absolute right-2 top-1/2 -translate-y-1/2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50">Find</button>
        </form>

        <div className="relative mb-4 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input type="text" value={localFilter} onChange={e => setLocalFilter(e.target.value)}
            placeholder="Filter by name..." className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar w-full flex-nowrap items-center">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === t.id ? 'bg-slate-800 dark:bg-sky-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-5 py-4 w-full">
        <div className="h-[260px] md:h-[320px] w-full rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-800 flex-shrink-0 z-0">
          <MapContainer center={mapCenter} zoom={12} className="h-full w-full" zoomControl={false}>
            <MapUpdater center={mapCenter} />
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {filtered.map(v => {
              const vType = v.type || (v.emergency_available ? 'emergency' : 'vet');
              return (
                <Marker key={v.id} position={[v.lat, v.lng]} icon={iconMap[vType] || iconMap.vet}>
                  <Popup className="rounded-xl overflow-hidden shadow-xl border-0 dark:bg-slate-800 dark:text-white">
                    <div className="p-1 min-w-[150px]">
                      <p className="font-bold text-slate-800 dark:text-white leading-tight mb-1">{v.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{v.address}</p>
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold dark:text-white">{v.rating || '4.5'}</span>
                      </div>
                      <a href={`tel:${v.phone}`} className="block w-full text-center py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-colors">Call Now</a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{filtered.length} Results Found</h3>
        
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="font-bold text-slate-500 dark:text-slate-400">No results found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filtered.map(v => {
            const vType = v.type || (v.emergency_available ? 'emergency' : 'vet');
            const cfg = typeConfig[vType as keyof typeof typeConfig] || typeConfig.vet;
            const Icon = cfg.icon;
            return (
              <div key={v.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${cfg.bg.replace('bg-', 'bg-').replace('100', '100 dark:bg-opacity-20')} rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-slate-800 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white leading-tight truncate">{v.name}</h4>
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/30 flex-shrink-0">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{v.rating || '4.5'}</span>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">{v.address}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {v.distance_km ? `${v.distance_km.toFixed(1)} km` : v.distance} away
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${cfg.bg.replace('bg-', 'bg-').replace('100', '100 dark:bg-opacity-20')} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all active:scale-95 shadow-sm text-center">
                    <Navigation className="w-4 h-4 shrink-0" /> Directions
                  </a>
                  <a href={`tel:${v.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                    <Phone className="w-4 h-4" /> Call
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </PageWrapper>
  );
}
