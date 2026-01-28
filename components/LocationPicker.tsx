
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet default icon
const iconPerson = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (address: string) => void;
  initialAddress?: string;
}

// Helper to move map view
const ChangeView = ({ center, zoom }: { center: [number, number], zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom(), {
        animate: true,
        duration: 1.5
    });
  }, [center, map, zoom]);
  return null;
};

// Helper for clicking on map
const MapEvents = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ isOpen, onClose, onConfirm, initialAddress }) => {
  const [position, setPosition] = useState<[number, number]>([41.2995, 69.2401]); // Default Tashkent
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [addressText, setAddressText] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Try to parse initial location if provided
  useEffect(() => {
    if (isOpen && initialAddress) {
       // Try to find lat,lng in string
       const match = initialAddress.match(/([0-9]{2}\.[0-9]+),\s*([0-9]{2}\.[0-9]+)/);
       if (match) {
           const lat = parseFloat(match[1]);
           const lng = parseFloat(match[2]);
           setPosition([lat, lng]);
           setMarkerPos([lat, lng]);
           setAddressText(initialAddress.split('(')[0].trim());
       }
    }
  }, [isOpen, initialAddress]);

  const fetchAddress = async (lat: number, lng: number) => {
    setLoading(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        // Manzilni qisqartirish (shahar, tuman, ko'cha)
        let shortAddr = data.display_name;
        if (data.address) {
             const parts = [];
             if (data.address.road) parts.push(data.address.road);
             if (data.address.house_number) parts.push(data.address.house_number);
             if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
             if (data.address.district) parts.push(data.address.district);
             if (data.address.city) parts.push(data.address.city);
             if (parts.length > 0) shortAddr = parts.join(', ');
        }
        setAddressText(shortAddr || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch (e) {
        setAddressText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
        setLoading(false);
    }
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setMarkerPos([lat, lng]);
    // Don't fly on click, just set marker
    await fetchAddress(lat, lng);
  };

  const handleLocateMe = () => {
      if (!navigator.geolocation) {
          alert("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi");
          return;
      }
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
          (pos) => {
              const { latitude, longitude } = pos.coords;
              setPosition([latitude, longitude]);
              setMarkerPos([latitude, longitude]);
              fetchAddress(latitude, longitude);
              setIsLocating(false);
          },
          (err) => {
              console.error(err);
              alert("Joylashuvni aniqlab bo'lmadi. Ruxsatni tekshiring.");
              setIsLocating(false);
          },
          { enableHighAccuracy: true }
      );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Uzbekistan')}`); // Add country context
        const data = await response.json();
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            setPosition([lat, lng]);
            setMarkerPos([lat, lng]);
            setAddressText(data[0].display_name);
        } else {
            alert("Manzil topilmadi");
        }
    } catch (e) {
        alert("Qidiruvda xatolik");
    } finally {
        setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (markerPos) {
        // Format: Address (Google Maps Link)
        const googleLink = `https://www.google.com/maps?q=${markerPos[0]},${markerPos[1]}`;
        const fullAddress = `${addressText} (${googleLink})`;
        onConfirm(fullAddress);
        onClose();
    } else {
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
       <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative">
          
          {/* Header & Search */}
          <div className="absolute top-4 left-4 right-4 z-[500] flex flex-col sm:flex-row gap-2 pointer-events-none">
             <form onSubmit={handleSearch} className="flex-1 pointer-events-auto shadow-xl rounded-2xl flex relative group">
                <input 
                  type="text" 
                  placeholder="Manzilni qidiring..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-none outline-none text-sm font-bold text-slate-700 bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                <button type="submit" className="absolute right-2 top-2 bottom-2 bg-slate-100 text-slate-600 px-4 rounded-xl font-bold hover:bg-slate-200 transition-colors text-xs uppercase">
                  {loading ? '...' : 'Izlash'}
                </button>
             </form>
          </div>
          
          {/* Controls (Locate Me & Close) */}
          <div className="absolute bottom-32 right-6 z-[500] flex flex-col gap-3">
             <button 
                onClick={handleLocateMe}
                className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-2xl hover:bg-indigo-50 active:scale-95 transition-all text-indigo-600"
                title="Mening joylashuvim"
             >
                {isLocating ? <span className="animate-spin text-lg">⏳</span> : '🎯'}
             </button>
          </div>

          {/* Bottom Action Bar */}
          <div className="absolute bottom-0 left-0 right-0 z-[500] bg-white p-6 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex-1 min-w-0">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanlangan manzil</p>
                 {loading ? (
                    <div className="h-6 w-48 bg-slate-100 rounded animate-pulse"></div>
                 ) : (
                    <p className="text-sm font-bold text-slate-900 truncate">{addressText || "Xaritadan joy tanlang"}</p>
                 )}
                 {markerPos && <p className="text-[9px] font-mono text-slate-400 mt-1">{markerPos[0].toFixed(6)}, {markerPos[1].toFixed(6)}</p>}
             </div>
             
             <div className="flex gap-3 w-full sm:w-auto">
                 <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                    Bekor qilish
                 </button>
                 <button 
                    onClick={handleConfirm} 
                    disabled={!markerPos || loading}
                    className="flex-1 sm:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                 >
                    Tasdiqlash
                 </button>
             </div>
          </div>

          <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ChangeView center={position} />
            <MapEvents onLocationSelect={handleLocationSelect} />
            {markerPos && <Marker position={markerPos} icon={iconPerson} />}
          </MapContainer>
       </div>
    </div>
  );
};
