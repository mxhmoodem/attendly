import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowForward, MdLocationCity, MdBeachAccess, MdPerson } from 'react-icons/md';
import { useAuthContext } from '../../../context/AuthContext';
import { getDocument } from '../../../services/database';
import {
  formatDate,
  parseDate,
  getDaysInRange,
  isWeekend,
} from '../../office/OfficeTracker/utils/dateUtils';
import { isBankHoliday } from '../../office/OfficeTracker/utils/bankHolidays';
import type { ExclusionType } from '../../office/OfficeTracker/types';
import { ROUTES } from '../../../constants/routes';
import './Home.css';

// ─── Types ───────────────────────────────────────────
interface OfficeTrackerData {
  reqValue?: number;
  excludeWeekends?: boolean;
  excludeBankHolidays?: boolean;
  officeDays?: string[];
  excludedDays?: Record<string, string>;
}

interface LeaveEntry {
  id: string;
  fromDate: string;
  toDate: string;
  note?: string;
}

interface LeaveData {
  availableDays?: number;
  entries?: LeaveEntry[];
}

// ─── Helpers ──────────────────────────────────────────
function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const first = name.split(' ')[0];
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

function countWorkingDays(fromDate: string, toDate: string): number {
  const start = parseDate(fromDate);
  const end   = parseDate(toDate);
  if (start > end) return 0;
  return getDaysInRange(start, end).filter(
    (d) => !isWeekend(d) && !isBankHoliday(formatDate(d))
  ).length;
}

// ─── Component ────────────────────────────────────────
export const Home: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const now      = useMemo(() => new Date(), []);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ── Office tracker state ──────────────────
  const [reqValue,            setReqValue]            = useState(60);
  const [officeDays,          setOfficeDays]          = useState<Set<string>>(new Set());
  const [excludedDays,        setExcludedDays]        = useState<Map<string, ExclusionType>>(new Map());
  const [excludeWeekends,     setExcludeWeekends]     = useState(true);
  const [excludeBankHolidays, setExcludeBankHolidays] = useState(true);
  const [holidayLeaveDays,    setHolidayLeaveDays]    = useState<Set<string>>(new Set());

  // ── Leave state ───────────────────────────
  const [availableDays, setAvailableDays] = useState(25);
  const [leaveEntries,  setLeaveEntries]  = useState<LeaveEntry[]>([]);

  const [loading, setLoading] = useState(true);

  // ── Load data ─────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [officeData, leaveData] = await Promise.all([
          getDocument<OfficeTrackerData>('officeTracker', `${user.uid}_${monthKey}`),
          getDocument<LeaveData>('holidayLeave', user.uid),
        ]);
        if (cancelled) return;

        if (officeData) {
          if (officeData.reqValue          !== undefined) setReqValue(officeData.reqValue);
          if (officeData.excludeWeekends   !== undefined) setExcludeWeekends(officeData.excludeWeekends);
          if (officeData.excludeBankHolidays !== undefined) setExcludeBankHolidays(officeData.excludeBankHolidays);
          setOfficeDays(new Set(officeData.officeDays ?? []));
          setExcludedDays(new Map(Object.entries(officeData.excludedDays ?? {}) as [string, ExclusionType][]));
        }

        if (leaveData) {
          setAvailableDays(leaveData.availableDays ?? 25);
          setLeaveEntries(leaveData.entries ?? []);
          // Build holiday-leave days set for office compliance calc
          const set = new Set<string>();
          for (const entry of leaveData.entries ?? []) {
            const s = parseDate(entry.fromDate);
            const e = parseDate(entry.toDate);
            getDaysInRange(s, e).forEach((d) => {
              const ds = formatDate(d);
              if (!isWeekend(d) && !isBankHoliday(ds)) set.add(ds);
            });
          }
          setHolidayLeaveDays(set);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user, monthKey]);

  // ── Office compliance for current month ───
  const officeCalc = useMemo(() => {
    const y = now.getFullYear();
    const m = now.getMonth();
    const allDays = getDaysInRange(new Date(y, m, 1), new Date(y, m + 1, 0));
    const workingDaySet = new Set<string>();

    for (const day of allDays) {
      const ds = formatDate(day);
      if (isWeekend(day) && excludeWeekends)        continue;
      if (isBankHoliday(ds) && excludeBankHolidays) continue;
      if (excludedDays.has(ds))                     continue;
      if (holidayLeaveDays.has(ds))                 continue;
      workingDaySet.add(ds);
    }

    const workingDays       = workingDaySet.size;
    const requiredOfficeDays  = Math.ceil(workingDays * reqValue / 100);
    const selectedOfficeDays  = [...officeDays].filter((d) => workingDaySet.has(d)).length;
    const progressPercentage  =
      requiredOfficeDays > 0
        ? Math.min(100, Math.round((selectedOfficeDays / requiredOfficeDays) * 100))
        : 100;

    const status: 'on-track' | 'at-risk' | 'not-meeting' =
      selectedOfficeDays >= requiredOfficeDays          ? 'on-track'
      : selectedOfficeDays >= requiredOfficeDays * 0.75 ? 'at-risk'
      : 'not-meeting';

    return { workingDays, requiredOfficeDays, selectedOfficeDays, progressPercentage, status };
  }, [now, reqValue, officeDays, excludedDays, excludeWeekends, excludeBankHolidays, holidayLeaveDays]);

  // ── Leave derived ─────────────────────────
  const usedDays = useMemo(
    () => leaveEntries.reduce((s, e) => s + countWorkingDays(e.fromDate, e.toDate), 0),
    [leaveEntries]
  );
  const remainingDays = availableDays - usedDays;

  const today = formatDate(new Date());
  const nextLeave = useMemo(() => {
    return [...leaveEntries]
      .filter((e) => e.toDate >= today)
      .sort((a, b) => a.fromDate.localeCompare(b.fromDate))[0] ?? null;
  }, [leaveEntries, today]);

  // ── Presentation helpers ──────────────────
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'there';
  const initials    = (user?.displayName || user?.email || 'X').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dateLabel  = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const statusConfig = {
    'on-track':    { label: 'On Track', color: '#16a34a', bg: '#dcfce7' },
    'at-risk':     { label: 'At Risk',  color: '#d97706', bg: '#fef3c7' },
    'not-meeting': { label: 'Behind',   color: '#dc2626', bg: '#fee2e2' },
  };

  const fmt = (ds: string) =>
    parseDate(ds).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  // ─────────────────────────────────────────
  return (
    <div className="home-container">

      {/* ── Greeting ───────────────────── */}
      <div className="home-greeting">
        <div>
          <h1 className="home-greeting-title">{getGreeting(displayName)}</h1>
          <p className="home-greeting-date">{dateLabel}</p>
        </div>
        {user?.photoURL
          ? <img src={user.photoURL} alt="avatar" className="home-avatar-img" />
          : <div className="home-avatar-initials">{initials}</div>}
      </div>

      {/* ── Stats ──────────────────────── */}
      {loading ? (
        <div className="home-loading">
          <div className="home-loading-spinner" />
          <p>Loading your stats…</p>
        </div>
      ) : (
        <div className="home-stats-grid">

          {/* ── Office Tracker card ──── */}
          <div className="home-stat-card" onClick={() => navigate(ROUTES.OFFICE_TRACKER)}>
            <div className="home-stat-card-header">
              <div className="home-stat-icon home-stat-icon--office"><MdLocationCity size={24} /></div>
              <div className="home-stat-title-group">
                <span className="home-stat-section">Office Tracker</span>
                <span className="home-stat-month">{monthLabel}</span>
              </div>
              <MdArrowForward className="home-stat-arrow" />
            </div>

            <div className="home-stat-body">
              <div className="home-big-stat">
                <span
                  className="home-big-number"
                  style={{ color: statusConfig[officeCalc.status].color }}
                >
                  {officeCalc.progressPercentage}%
                </span>
                <span className="home-big-label">complete</span>
              </div>
              <div className="home-sub-stats">
                <div className="home-sub-stat">
                  <span className="home-sub-value">{officeCalc.selectedOfficeDays}
                    <span className="home-sub-label"> / {officeCalc.requiredOfficeDays} days</span>
                  </span>
                </div>
                <div className="home-sub-stat">
                  <span className="home-sub-value">{officeCalc.workingDays}</span>
                  <span className="home-sub-label">working days</span>
                </div>
              </div>
            </div>

            <div
              className="home-status-badge"
              style={{
                color:      statusConfig[officeCalc.status].color,
                background: statusConfig[officeCalc.status].bg,
              }}
            >
              <span
                className="home-badge-dot"
                style={{ background: statusConfig[officeCalc.status].color }}
              />
              {statusConfig[officeCalc.status].label}
            </div>

            <div className="home-progress-bar">
              <div
                className="home-progress-fill"
                style={{
                  width:      `${officeCalc.progressPercentage}%`,
                  background:  statusConfig[officeCalc.status].color,
                }}
              />
            </div>
          </div>

          {/* ── Leave card ──────────── */}
          <div className="home-stat-card" onClick={() => navigate(ROUTES.LEAVE)}>
            <div className="home-stat-card-header">
              <div className="home-stat-icon home-stat-icon--leave"><MdBeachAccess size={24} /></div>
              <div className="home-stat-title-group">
                <span className="home-stat-section">Leave</span>
                <span className="home-stat-month">Holiday Allowance</span>
              </div>
              <MdArrowForward className="home-stat-arrow" />
            </div>

            <div className="home-stat-body">
              <div className="home-big-stat">
                <span className="home-big-number" style={{ color: '#6b9080' }}>
                  {remainingDays}
                </span>
                <span className="home-big-label">days left</span>
              </div>
              <div className="home-sub-stats">
                <div className="home-sub-stat">
                  <span className="home-sub-value">{usedDays}</span>
                  <span className="home-sub-label">used</span>
                </div>
                <div className="home-sub-stat">
                  <span className="home-sub-value">{availableDays}</span>
                  <span className="home-sub-label">total</span>
                </div>
              </div>
            </div>

            {nextLeave ? (
              <div className="home-next-leave">
                <span className="home-next-leave-label">Next leave</span>
                <span className="home-next-leave-date">
                  {fmt(nextLeave.fromDate)}
                  {nextLeave.fromDate !== nextLeave.toDate && ` – ${fmt(nextLeave.toDate)}`}
                </span>
              </div>
            ) : (
              <div className="home-next-leave home-next-leave--none">
                <span className="home-next-leave-label">No upcoming leave booked</span>
              </div>
            )}

            <div className="home-progress-bar">
              <div
                className="home-progress-fill"
                style={{
                  width:      `${availableDays > 0 ? Math.min(100, (usedDays / availableDays) * 100) : 0}%`,
                  background: '#6b9080',
                }}
              />
            </div>
          </div>

          {/* ── Profile card ────────── */}
          <div className="home-stat-card" onClick={() => navigate(ROUTES.PROFILE)}>
            <div className="home-stat-card-header">
              <div className="home-stat-icon home-stat-icon--profile"><MdPerson size={24} /></div>
              <div className="home-stat-title-group">
                <span className="home-stat-section">Profile</span>
                <span className="home-stat-month">Account</span>
              </div>
              <MdArrowForward className="home-stat-arrow" />
            </div>

            <div className="home-profile-body">
              {user?.photoURL
                ? <img src={user.photoURL} alt="avatar" className="home-profile-avatar-img" />
                : <div className="home-profile-avatar">{initials}</div>}
              <div className="home-profile-info">
                <span className="home-profile-name">
                  {user?.displayName || 'No name set'}
                </span>
                {(user?.role || user?.company) && (
                  <span className="home-profile-meta">
                    {[user.role, user.company].filter(Boolean).join(' · ')}
                  </span>
                )}
                {user?.country && (
                  <span className="home-profile-meta">{user.country}</span>
                )}
                {!user?.displayName && !user?.role && !user?.company && (
                  <span className="home-profile-meta home-profile-meta--cta">Complete your profile →</span>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
