import { useState, useEffect } from 'react';
import { prefetchRequest } from '../../hooks/useFetch';
import { User, X } from 'lucide-react';
import * as api from '../../api';
import { request } from '../../api/client';
import InlineEditName from './InlineEditName';
import DevicesTab from './DevicesTab';
import ScheduleTab from './ScheduleTab';
import BlockedAppsTab from './BlockedAppsTab';

type DetailTab = 'devices' | 'schedule' | 'blocked-apps';

export default function ProfileDetailPanel({
  networkId,
  profile,
  profileId,
  onClose,
  onRefresh,
  onRename,
  onDelete,
  isDeleting,
}: {
  networkId: string;
  profile: api.Profile;
  profileId: string;
  onClose: () => void;
  onRefresh: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [tab, setTab] = useState<DetailTab>('devices');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Eager-load schedule + blocked-apps data when panel opens
  useEffect(() => {
    const scheduleKey = `/networks/${networkId}/profiles/${profileId}/schedule`;
    const blockedKey = `/networks/${networkId}/profiles/${profileId}/blocked-apps`;
    prefetchRequest(scheduleKey, () => request(scheduleKey));
    prefetchRequest(blockedKey, () => request(blockedKey));
  }, [networkId, profileId]);

  return (
    <div className="profile-detail-panel">
      <div className="profile-detail-header">
        <div className="profile-detail-title">
          <span className="profile-icon"><User size={20} /></span>
          <InlineEditName
            value={profile.name || 'Unnamed'}
            onSave={onRename}
          />
          {profile.paused && <span className="profile-paused-badge">Paused</span>}
        </div>
        <div className="profile-detail-header-actions">
          {!confirmDelete ? (
            <button
              className="btn-icon btn-icon-danger"
              onClick={() => setConfirmDelete(true)}
              title="Delete profile"
            ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          ) : (
            <div className="delete-confirm">
              <span className="delete-confirm-text">Delete?</span>
              <button
                className="btn-sm btn-danger-solid"
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                disabled={isDeleting}
              >
                {isDeleting ? '…' : 'Yes'}
              </button>
              <button
                className="btn-sm"
                onClick={() => setConfirmDelete(false)}
              >
                No
              </button>
            </div>
          )}
          <button className="btn-icon" onClick={onClose} title="Close"><X size={16} /></button>
        </div>
      </div>

      <div className="profile-detail-tabs">
        <button
          className={`profile-detail-tab ${tab === 'devices' ? 'active' : ''}`}
          onClick={() => setTab('devices')}
        >
          Devices
        </button>
        <button
          className={`profile-detail-tab ${tab === 'schedule' ? 'active' : ''}`}
          onClick={() => setTab('schedule')}
        >
          Schedule
        </button>
        <button
          className={`profile-detail-tab ${tab === 'blocked-apps' ? 'active' : ''}`}
          onClick={() => setTab('blocked-apps')}
        >
          Blocked Apps
        </button>
      </div>

      <div className="profile-detail-body">
        {tab === 'devices' && (
          <DevicesTab networkId={networkId} profileId={profileId} profile={profile} onRefresh={onRefresh} />
        )}
        {tab === 'schedule' && (
          <ScheduleTab networkId={networkId} profileId={profileId} />
        )}
        {tab === 'blocked-apps' && (
          <BlockedAppsTab networkId={networkId} profileId={profileId} />
        )}
      </div>
    </div>
  );
}
