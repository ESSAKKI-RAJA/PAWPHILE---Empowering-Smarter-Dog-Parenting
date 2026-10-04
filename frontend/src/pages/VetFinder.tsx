import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import {
  Search, Navigation, Phone, Building2, Star, Loader2,
  MapPin, Globe, AlertTriangle, LocateFixed, ExternalLink,
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import L from 'leaflet';
import { searchVetClinics } from '../services/apiClient';

// ─── Normalized VetResult shape (matches backend /api/vet-clinics/search) ──
interface VetResult {
  id: string;
  provider: 'google' | 'nominatim' | string;
  provider_place_id?: string | null;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  review_count?: number | null;
  open_state?: boolean | null;
  hours?: string | null;
  categories?: string[];
  distance_km?: number | null;
  maps_url?: string | null;
  source_url?: string | null;
  retrieved_at?: string;
}

type LocatorErrorCode =
  | 'permission_denied'
  | 'location_unavailable'
  | 'invalid_search'
  | 'geocode_failed'
  | 'rate_limited'
  | 'provider_unavailable';

interface LocatorError {
  code: LocatorErrorCode;
  message: string;
}

type LocationMode = 'none' | 'device' | 'search';

const ERROR_COPY: Record<LocatorErrorCode, string> = {
  permission_denied:
    'Location permission was denied. Allow location access in your browser, or search by city or area instead.',
  location_unavailable:
    'Your device location is unavailable right now. Try searching by city or area instead.',
  invalid_search:
    'Enter a city, area, or address to search.',
  geocode_failed:
    'That place could not be found. Check the spelling or try a nearby city.',
  rate_limited:
    'Search is temporarily rate limited. Please wait a moment and try again.',
  provider_unavailable:
    'Veterinary search is temporarily unavailable. Please try again later.',
};

const RADIUS_OPTIONS = [5, 10, 25];

const createIcon = (color: string, selected: boolean) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:${selected ? 38 : 30}px;height:${selected ? 38 : 30}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
    iconSize: [selected ? 38 : 30, selected ? 38 : 30],
    iconAnchor: [selected ? 19 : 15, selected ? 19 : 15],
  });

const markerIcon = createIcon('#38BDF8', false);
const markerIconSelected = createIcon('#0284C7', true);

function sourceLabel(provider: string): string {
  if (provider === 'google') return 'Google Places';
  if (provider === 'serp') return 'Google via SERP';
  if (provider === 'nominatim') return 'OpenStreetMap';
  return provider || 'Place data';
}

// ─── Map layer: MapTiler when a browser key is configured, Carto/OSM otherwise.
// VITE_MAPTILER_API_KEY is a domain-restricted public key (MapTiler dashboard →
// allowed origins must include the production Vercel origin, no trailing
// slash). It renders tiles and geocoding only — never veterinary data.
const MAPTILER_KEY = (import.meta.env.VITE_MAPTILER_API_KEY as string | undefined) || '';
const TILE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/voyager/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
  : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = MAPTILER_KEY
  ? '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface GeocodedPlace {
  lat: number;
  lng: number;
  label: string;
}

async function geocodePlace(query: string): Promise<GeocodedPlace | null> {
  if (MAPTILER_KEY) {
    const res = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&limit=1&types=place,locality,address`
    );
    if (!res.ok) throw new Error(`maptiler geocode ${res.status}`);
    const data = await res.json();
    const feature = data && Array.isArray(data.features) ? data.features[0] : null;
    const center = feature && Array.isArray(feature.center) ? feature.center : null;
    if (feature && center && Number.isFinite(center[1]) && Number.isFinite(center[0])) {
      return { lat: center[1], lng: center[0], label: String(feature.place_name || query) };
    }
    return null;
  }
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { Accept: 'application/json' } }
  );
  if (!geoRes.ok) throw new Error(`geocode ${geoRes.status}`);
  const geoData = await geoRes.json();
  if (!geoData || geoData.length === 0) return null;
  const lat = parseFloat(geoData[0].lat);
  const lng = parseFloat(geoData[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: String(geoData[0].display_name || query).split(',').slice(0, 2).join(',') };
}

export default function VetFinder() {
  const navigate = useNavigate();
  const [locationSearch, setLocationSearch] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [nameFilter, setNameFilter] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.06, 80.25]);
  const [hasSearched, setHasSearched] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>('none');
  const [locationLabel, setLocationLabel] = useState('');
  const [clinics, setClinics] = useState<VetResult[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<LocatorError | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const requestId = useRef(0);

  const filtered = useMemo(
    () =>
      clinics.filter((v) => {
        if (
          nameFilter &&
          !v.name.toLowerCase().includes(nameFilter.toLowerCase()) &&
          !(v.address || '').toLowerCase().includes(nameFilter.toLowerCase())
        )
          return false;
        return true;
      }),
    [nameFilter, clinics]
  );

  const selected = useMemo(
    () => clinics.find((c) => c.id === selectedId) || null,
    [clinics, selectedId]
  );

  async function runSearch(lat: number, lng: number, radius: number) {
    const myRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await searchVetClinics(lat, lng, radius);
      if (requestId.current !== myRequest) return; // stale response
      const results: VetResult[] = Array.isArray(res.results) ? res.results : [];
      setClinics(results);
      setSource(typeof res.source === 'string' ? res.source : null);
      setNotice(typeof res.notice === 'string' ? res.notice : null);
      setSelectedId(null);
      setHasSearched(true);
      if (res.status === 'error') {
        const code: LocatorErrorCode =
          res.error_code === 'rate_limited' ? 'rate_limited' : 'provider_unavailable';
        setError({ code, message: ERROR_COPY[code] });
      }
    } catch {
      if (requestId.current !== myRequest) return;
      setClinics([]);
      setHasSearched(true);
      setError({ code: 'provider_unavailable', message: ERROR_COPY.provider_unavailable });
    } finally {
      if (requestId.current === myRequest) {
        setLoading(false);
        setLocating(false);
      }
    }
  }

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setError({ code: 'location_unavailable', message: ERROR_COPY.location_unavailable });
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        setLocationMode('device');
        // Device coordinates scope this search only — kept in component
        // state, never written to storage or the backend record.
        setLocationLabel('your current location');
        void runSearch(latitude, longitude, radiusKm);
      },
      (geoError) => {
        setLocating(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError({ code: 'permission_denied', message: ERROR_COPY.permission_denied });
        } else {
          setError({ code: 'location_unavailable', message: ERROR_COPY.location_unavailable });
        }
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = locationSearch.trim();
    if (!query) {
      setError({ code: 'invalid_search', message: ERROR_COPY.invalid_search });
      return;
    }
    if (query.length > 200) {
      setError({ code: 'invalid_search', message: ERROR_COPY.invalid_search });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const found = await geocodePlace(query);
      if (!found) {
        setLoading(false);
        setError({ code: 'geocode_failed', message: ERROR_COPY.geocode_failed });
        return;
      }
      setMapCenter([found.lat, found.lng]);
      setLocationMode('search');
      // A searched place is approximate until confirmed on the map —
      // never treated as the user's exact position.
      setLocationLabel(`“${found.label}” (approximate area)`);
      await runSearch(found.lat, found.lng, radiusKm);
    } catch {
      setLoading(false);
      setError({ code: 'geocode_failed', message: ERROR_COPY.geocode_failed });
    }
  };

  const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center, Math.max(map.getZoom(), 12));
    }, [center, map]);
    return null;
  };

  return (
    <PageWrapper className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative text-slate-900 dark:text-slate-100">
      <div className="bg-white dark:bg-slate-900 px-4 md:px-5 pt-4 md:pt-12 pb-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 mt-2 md:mt-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Vet Locator</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Find veterinary care near you</p>
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
          <input
            type="text"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            placeholder="Search city, area, or address..."
            maxLength={200}
            className="w-full pl-10 pr-24 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
          >
            Find
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 dark:bg-sky-500 text-white hover:bg-slate-900 dark:hover:bg-sky-600 transition disabled:opacity-50"
          >
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span className="mr-1">Radius:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusKm(r)}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  radiusKm === r
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        <div className="relative mb-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Filter results by name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        {locationMode !== 'none' && locationLabel && (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            Showing results near {locationLabel}. Location is used only for this search and is not stored.
          </p>
        )}
      </div>

      <div className="px-4 md:px-5 pt-4 w-full">
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium leading-relaxed">
            <strong>Emergency?</strong> Do not search — contact your nearest emergency veterinary clinic
            or animal poison helpline immediately. This locator lists ordinary veterinary practices,
            not verified emergency availability.
          </p>
        </div>
      </div>

      <div className="px-4 md:px-5 py-4 w-full">
        <div className="h-[260px] md:h-[320px] w-full rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-800 flex-shrink-0 z-0">
          <MapContainer center={mapCenter} zoom={12} className="h-full w-full" zoomControl={false}>
            <MapUpdater center={mapCenter} />
            <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
            {filtered.map((v) => (
              <Marker
                key={v.id}
                position={[v.latitude, v.longitude]}
                icon={v.id === selectedId ? markerIconSelected : markerIcon}
                eventHandlers={{ click: () => setSelectedId(v.id) }}
              >
                <Popup className="rounded-xl overflow-hidden shadow-xl border-0 dark:bg-slate-800 dark:text-white">
                  <div className="p-1 min-w-[160px]">
                    <p className="font-bold text-slate-800 dark:text-white leading-tight mb-1">{v.name}</p>
                    {v.address && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{v.address}</p>}
                    {typeof v.rating === 'number' && (
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold dark:text-white">
                          {v.rating.toFixed(1)}
                          {typeof v.review_count === 'number' && (
                            <span className="font-medium text-slate-400"> ({v.review_count})</span>
                          )}
                        </span>
                      </div>
                    )}
                    {v.phone ? (
                      <a
                        href={`tel:${v.phone}`}
                        className="block w-full text-center py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Call Now
                      </a>
                    ) : (
                      <a
                        href={v.maps_url || `https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Directions
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
        <div className="flex items-center justify-between ml-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {hasSearched ? `${filtered.length} Result${filtered.length === 1 ? '' : 's'} Found` : 'Search to begin'}
          </h3>
          {source && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <Globe className="w-3 h-3" />
              Source: {sourceLabel(source)}
            </span>
          )}
        </div>

        {notice && (
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2">
            {notice}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-2 p-10" role="status" aria-label="Searching">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            <p className="text-xs font-medium text-slate-400">Searching nearby veterinary care…</p>
          </div>
        ) : error && filtered.length === 0 ? (
          <div className="text-center py-10" role="alert">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <p className="font-bold text-slate-600 dark:text-slate-300">Search unavailable</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {error.message}
            </p>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="font-bold text-slate-500 dark:text-slate-400">Find care nearby</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Search a city or area above, or use your current location. Results show real veterinary
              practices from the selected place provider.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="font-bold text-slate-500 dark:text-slate-400">No veterinary results found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Try a larger radius or a nearby city.
            </p>
          </div>
        ) : (
          filtered.map((v) => {
            const isSelected = v.id === selectedId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelectedId(v.id);
                  setMapCenter([v.latitude, v.longitude]);
                }}
                className={`w-full text-left bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-4 transition ${
                  isSelected
                    ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-100 dark:ring-sky-900/40'
                    : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-slate-800 shadow-sm">
                    <Building2 className="w-5 h-5 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white leading-tight">{v.name}</h4>
                      {typeof v.rating === 'number' && (
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/30 flex-shrink-0">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            {v.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    {v.address && (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{v.address}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {typeof v.distance_km === 'number' && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {v.distance_km.toFixed(1)} km away
                        </span>
                      )}
                      {typeof v.open_state === 'boolean' && (
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                            v.open_state
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {v.open_state ? 'Open now' : 'Currently closed'}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        {sourceLabel(v.provider)}
                      </span>
                    </div>
                    {typeof v.review_count === 'number' && (
                      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1.5">
                        {v.review_count} reviews · Opening status shown only when the provider reports it.
                      </p>
                    )}
                  </div>
                </div>
                {isSelected && selected && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-1">
                      {selected.address || 'Address not provided by the place provider.'}
                    </p>
                    {selected.source_url && (
                      <a
                        href={selected.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline mb-3"
                      >
                        <ExternalLink className="w-3 h-3" /> View on OpenStreetMap
                      </a>
                    )}
                    <div
                      className="flex flex-col sm:flex-row gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={selected.maps_url || `https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all active:scale-95 shadow-sm text-center"
                      >
                        <Navigation className="w-4 h-4 shrink-0" /> Directions
                      </a>
                      {selected.phone && (
                        <a
                          href={`tel:${selected.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                        >
                          <Phone className="w-4 h-4" /> Call
                        </a>
                      )}
                      {selected.website && (
                        <a
                          href={selected.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                        >
                          <ExternalLink className="w-4 h-4" /> Website
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </PageWrapper>
  );
}
