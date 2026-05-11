import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as api from '../../api';

export default function ScheduleTab({ networkId, profileId }: { networkId: string; profileId: string }) {
  const cacheKey = `/networks/${networkId}/profiles/${profileId}/schedule`;
  const { data: scheduleData, loading, error, refetch } = useFetch(
    () => api.getProfileSchedule(networkId, profileId),
    [networkId, profileId],
    {},
    cacheKey,
  );
  const [weekdayStart, setWeekdayStart] = useState('21:00');
  const [weekdayEnd, setWeekdayEnd] = useState('07:00');
  const [weekendStart, setWeekendStart] = useState('22:00');
  const [weekendEnd, setWeekendEnd] = useState('08:00');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSaveWeekday = async () => {
    setSaving(true);
    try {
      await api.setWeekdayBedtime(networkId, profileId, weekdayStart, weekdayEnd);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to set weekday bedtime');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeekend = async () => {
    setSaving(true);
    try {
      await api.setWeekendBedtime(networkId, profileId, weekendStart, weekendEnd);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to set weekend bedtime');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await api.clearProfileSchedule(networkId, profileId);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to clear schedule');
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <div className="schedule-loading"><div className="spinner" /> Loading schedule…</div>;

  if (error) {
    return (
      <div className="plus-gate">
        <p className="plus-gate-detail">Schedule and bedtime controls failed to load.</p>
      </div>
    );
  }

  const scheduleArray = scheduleData && typeof scheduleData === 'object'
    ? (scheduleData as Record<string, unknown>).schedule
    : null;
  const hasSchedule = Array.isArray(scheduleArray) && scheduleArray.length > 0;

  return (
    <div className="schedule-section">
      {hasSchedule && (
        <div className="schedule-current">
          <span className="schedule-active-badge">Schedule active</span>
          <button
            className="btn-text btn-danger"
            onClick={handleClear}
            disabled={clearing}
          >
            {clearing ? 'Clearing…' : 'Clear schedule'}
          </button>
        </div>
      )}

      <div className="bedtime-group">
        <h4>Weekday Bedtime</h4>
        <div className="bedtime-inputs">
          <label>
            <span>Start</span>
            <input type="time" value={weekdayStart} onChange={e => setWeekdayStart(e.target.value)} />
          </label>
          <span className="bedtime-arrow">→</span>
          <label>
            <span>End</span>
            <input type="time" value={weekdayEnd} onChange={e => setWeekdayEnd(e.target.value)} />
          </label>
          <button className="btn-sm" onClick={handleSaveWeekday} disabled={saving}>
            {saving ? '…' : 'Set'}
          </button>
        </div>
      </div>

      <div className="bedtime-group">
        <h4>Weekend Bedtime</h4>
        <div className="bedtime-inputs">
          <label>
            <span>Start</span>
            <input type="time" value={weekendStart} onChange={e => setWeekendStart(e.target.value)} />
          </label>
          <span className="bedtime-arrow">→</span>
          <label>
            <span>End</span>
            <input type="time" value={weekendEnd} onChange={e => setWeekendEnd(e.target.value)} />
          </label>
          <button className="btn-sm" onClick={handleSaveWeekend} disabled={saving}>
            {saving ? '…' : 'Set'}
          </button>
        </div>
      </div>
    </div>
  );
}
