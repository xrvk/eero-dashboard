import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { X } from 'lucide-react';
import * as api from '../../api';
import DevicePicker from './DevicePicker';
import { extractId } from './utils';

export default function DevicesTab({
  networkId,
  profileId,
  profile,
  onRefresh,
}: {
  networkId: string;
  profileId: string;
  profile: api.Profile;
  onRefresh: () => void;
}) {
  const { data: devicesData } = useFetch(
    () => api.getDevices(networkId),
    [networkId],
    {},
    `/networks/${networkId}/devices`,
  );
  const [editing, setEditing] = useState(false);

  const allDevices = devicesData?.devices ?? [];
  const profileDevices = Array.isArray(profile.devices) ? profile.devices : [];

  return (
    <div>
      <div className="profile-device-table-header">
        <span className="results-counter">
          {profileDevices.length} assigned device{profileDevices.length !== 1 ? 's' : ''}
        </span>
        <button
          className="btn-text"
          onClick={() => setEditing(!editing)}
        >
          {editing ? <><X size={16} /> Cancel</> : 'Edit'}
        </button>
      </div>

      {editing ? (
        <DevicePicker
          networkId={networkId}
          profileId={profileId}
          currentDeviceUrls={profileDevices.map((pd: api.Device) => pd.url || '')}
          allDevices={allDevices}
          onSaved={() => { setEditing(false); onRefresh(); }}
        />
      ) : (
        <div className="profile-device-rows">
          {profileDevices.length === 0 ? (
            <p className="empty-text" style={{ padding: '12px 0' }}>No devices assigned</p>
          ) : (
            profileDevices.map((pd: api.Device) => (
              <div key={pd.mac || extractId(pd.url)} className="profile-device-row">
                <span className={`profile-device-status ${pd.connected ? 'online' : 'offline'}`}>●</span>
                <span className="profile-device-name">{pd.display_name || pd.hostname || pd.mac || 'Unknown'}</span>
                {pd.ip && <span className="profile-device-ip">{pd.ip}</span>}
                <span className="profile-device-type">{pd.device_type || ''}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
