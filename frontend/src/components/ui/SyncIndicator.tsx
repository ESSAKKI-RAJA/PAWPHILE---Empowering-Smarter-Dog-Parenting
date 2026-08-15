import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, CloudUpload, CheckCircle2, AlertCircle } from 'lucide-react';

type SyncState = 'online' | 'offline' | 'saved_locally' | 'syncing' | 'synced' | 'error';

export function SyncIndicator() {
  const [syncState, setSyncState] = useState<SyncState>('online');

  useEffect(() => {
    const handleOnline = () => setSyncState('online');
    const handleOffline = () => setSyncState('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setSyncState('offline');
    }

    const handleSyncUpdate = (e: any) => {
      const { state, pendingCount } = e.detail;
      if (state === 'syncing') setSyncState('syncing');
      else if (state === 'synced') setSyncState('synced');
      else if (state === 'sync failed') setSyncState('error');
      else if (pendingCount > 0) setSyncState('saved_locally');
    };

    window.addEventListener('pawphile:sync-update', handleSyncUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pawphile:sync-update', handleSyncUpdate);
    };
  }, []);

  let Icon = Cloud;
  let label = 'Online';
  let colorClass = 'text-primary';

  switch (syncState) {
    case 'offline':
      Icon = CloudOff;
      label = 'Offline';
      colorClass = 'text-muted-600';
      break;
    case 'saved_locally':
      Icon = CheckCircle2;
      label = 'Saved on this device';
      colorClass = 'text-safety-blue-primary';
      break;
    case 'syncing':
      Icon = CloudUpload;
      label = 'Syncing...';
      colorClass = 'text-primary animate-pulse';
      break;
    case 'synced':
      Icon = CheckCircle2;
      label = 'Synced just now';
      colorClass = 'text-safety-green-primary';
      break;
    case 'error':
      Icon = AlertCircle;
      label = 'Sync needs attention';
      colorClass = 'text-safety-yellow-primary';
      break;
    case 'online':
    default:
      Icon = Cloud;
      label = 'Online';
      colorClass = 'text-primary opacity-60';
      break;
  }

  return (
    <div className={`flex items-center gap-1.5 ${colorClass} transition-colors`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
    </div>
  );
}
