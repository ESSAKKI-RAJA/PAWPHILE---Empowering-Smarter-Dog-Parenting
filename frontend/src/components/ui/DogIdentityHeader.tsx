import React from 'react';
import { usePawphileData } from '../../context/PawphileDataContext';
import { usePersonalization } from '../../context/PersonalizationContext';
import { ChevronDown } from 'lucide-react';

export function DogIdentityHeader() {
  const { selectedDog, dogs } = usePawphileData();
  const { breedName, ageYears } = usePersonalization();

  if (!selectedDog) return null;

  const hasMultipleDogs = dogs && dogs.length > 1;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-ivory-50 sticky top-0 z-20">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-teal-100 border border-teal-600/20 flex items-center justify-center overflow-hidden shrink-0">
          {selectedDog.photo_url ? (
            <img src={selectedDog.photo_url} alt={selectedDog.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-teal-700 font-bold text-lg">{selectedDog.name.charAt(0)}</span>
          )}
        </div>
        {hasMultipleDogs && (
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-line-200">
            <ChevronDown className="w-3 h-3 text-muted-600" />
          </div>
        )}
      </div>
      
      <div className="flex flex-col flex-1">
        <h2 className="text-16px font-bold text-ink-950 leading-tight">
          {selectedDog.name}
        </h2>
        <div className="text-12px font-medium text-muted-600 flex items-center gap-1.5 leading-tight">
          <span>{breedName || 'Mixed Breed'}</span>
          <span className="w-1 h-1 rounded-full bg-line-200" />
          <span>{ageYears > 0 ? `${ageYears} years` : 'Puppy'}</span>
        </div>
      </div>
    </div>
  );
}
