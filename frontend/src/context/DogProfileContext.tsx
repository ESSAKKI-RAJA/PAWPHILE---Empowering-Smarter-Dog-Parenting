import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { DogProfile } from '../types';

interface DogProfileContextType {
  profile: DogProfile | null;
  loading: boolean;
  saveProfile: (newProfile: DogProfile) => void;
  clearProfile: () => void;
  setProfile: (profile: DogProfile | null) => void;
}

const DogProfileContext = createContext<DogProfileContextType | undefined>(undefined);

const PROFILE_KEY = 'pawphile_dog_profile'; // Note: Changed from pawphile_profile per spec
const OLD_PROFILE_KEY = 'pawphile_profile';

export const DogProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfileState] = useState<DogProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Migrate old key if it exists
      const oldStored = localStorage.getItem(OLD_PROFILE_KEY);
      let stored = localStorage.getItem(PROFILE_KEY);
      
      if (!stored && oldStored) {
        localStorage.setItem(PROFILE_KEY, oldStored);
        stored = oldStored;
      }

      if (stored) {
        setProfileState(JSON.parse(stored));
      }
    } catch (e) {
      console.error(`Error loading ${PROFILE_KEY}`, e);
    } finally {
      setLoading(false);
    }
  }, []);

  const setProfile = useCallback((newProfile: DogProfile | null) => {
    setProfileState(newProfile);
    if (newProfile) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    } else {
      localStorage.removeItem(PROFILE_KEY);
    }
  }, []);

  const saveProfile = useCallback(async (newProfile: DogProfile) => {
    // 1. Update localStorage instantly
    setProfile(newProfile);
    
    // 3. Update DogProfileContext state (done by setProfile)
    
    // 4. Show toast
    // Assuming toast or just a custom alert
    const toastEvent = new CustomEvent('showToast', { 
      detail: { message: 'Profile updated. Dashboard refreshed ✓', type: 'success' } 
    });
    window.dispatchEvent(toastEvent);

    // TODO: Sync to new backend
  }, [setProfile]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(OLD_PROFILE_KEY);
  }, [setProfile]);

  return (
    <DogProfileContext.Provider value={{ profile, loading, saveProfile, clearProfile, setProfile }}>
      {children}
    </DogProfileContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDogProfile = () => {
  const context = useContext(DogProfileContext);
  if (context === undefined) {
    throw new Error('useDogProfile must be used within a DogProfileProvider');
  }
  return context;
};
