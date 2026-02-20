import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  MdChevronLeft,
  MdChevronRight,
  MdRemoveCircleOutline,
  MdInfoOutline,
  MdSave,
  MdCheck,
  MdToday,
  MdAdd,
  MdClose,
  MdBeachAccess,
  MdBlock,
} from 'react-icons/md';
import type { ComplianceStatus, ExcludedDaysMap, ExclusionType } from './types';
import { getBankHolidayName, isBankHoliday } from './utils/bankHolidays';
import {
  DAY_HEADERS,
  addMonths,
  formatDate,
  formatMonthYear,
  formatShortDate,
  getCalendarGrid,
  getDaysInRange,
  isWeekend,
  parseDate,
  todayStr,
} from './utils/dateUtils';
import { useAuth } from '../../../hooks/useAuth';
import { setDocument, getDocument } from '../../../services/database';
import './OfficeTracker.css';

// ─────────────────────────────────────────────
// Progress Ring
// ─────────────────────────────────────────────
interface ProgressRingProps {
  selected: number;
  required: number;
  percentage: number;
  status: ComplianceStatus;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ selected, required, percentage, status }) => {
  const r = 34;
  const sw = 6;
  const size = 76;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(percentage, 100) / 100);
  const color =
    status === 'on-track' ? '#16a34a' : status === 'at-risk' ? '#d97706' : '#dc2626';

  return (
    <div className="ot-ring-wrap">
      <div className="ot-ring-svg-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div className="ot-ring-label">
          <span className="ot-ring-pct" style={{ color }}>{percentage}%</span>
        </div>
      </div>
      <div className="ot-ring-days">{selected}/{required} days</div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────
const StatusBadge: React.FC<{ status: ComplianceStatus }> = ({ status }) => {
  const map = {
    'on-track': { label: 'On Track', cls: 'ot-badge--green' },
    'at-risk': { label: 'At Risk', cls: 'ot-badge--amber' },
    'not-meeting': { label: 'Not meeting requirement', cls: 'ot-badge--red' },
  };
  const { label, cls } = map[status];
  return (
    <div className={`ot-badge ${cls}`}>
      <span className="ot-badge-dot" />
      {label}
    </div>
  );
};

// ─────────────────────────────────────────────
// Requirement Card  (percentage only)
// ─────────────────────────────────────────────
interface RequirementCardProps {
  value: number;
  workingDays: number;
  requiredOfficeDays: number;
  onValueChange: (v: number) => void;
}

const RequirementCard: React.FC<RequirementCardProps> = ({
  value,
  workingDays,
  requiredOfficeDays,
  onValueChange,
}) => (
  <div className="ot-card">
    <p className="ot-card-label">Office Requirement</p>
    <div className="ot-req-row">
      <span className="ot-req-muted">Required percentage</span>
      <span className="ot-req-big">{value}%</span>
    </div>
    <input
      type="range"
      min={0}
      max={100}
      step={5}
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className="ot-slider"
      style={{ '--val': `${value}%` } as React.CSSProperties}
    />
    <p className="ot-req-equiv">= {requiredOfficeDays} of {workingDays} working days</p>
  </div>
);

// ─────────────────────────────────────────────
// Office Calendar
// ─────────────────────────────────────────────
interface CalendarProps {
  viewMonth: Date;
  officeDays: Set<string>;
  excludedDays: ExcludedDaysMap;
  excludeWeekends: boolean;
  excludeBankHolidays: boolean;
  holidayLeaveDays: Set<string>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayTap: (dateStr: string) => void;
  onDayLongPress: (dateStr: string) => void;
}

const OfficeCalendar: React.FC<CalendarProps> = ({
  viewMonth,
  officeDays,
  excludedDays,
  excludeWeekends,
  excludeBankHolidays,
  holidayLeaveDays,
  onPrevMonth,
  onNextMonth,
  onDayTap,
  onDayLongPress,
}) => {
  const cells = getCalendarGrid(viewMonth.getFullYear(), viewMonth.getMonth());
  const today = todayStr();
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const rangeStartStr = formatDate(new Date(y, m, 1));
  const rangeEndStr = formatDate(new Date(y, m + 1, 0));

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const getDayStatus = useCallback(
    (dateStr: string): 'office' | 'home' | 'excluded' | 'weekend' | 'holiday' | 'outside-range' => {
      if (dateStr < rangeStartStr || dateStr > rangeEndStr) return 'outside-range';
      const date = parseDate(dateStr);
      if (isWeekend(date) && excludeWeekends) return 'weekend';
      if (isBankHoliday(dateStr) && excludeBankHolidays) return 'holiday';
      const exclType = excludedDays.get(dateStr);
      if (exclType === 'holiday') return 'holiday';
      if (exclType === 'excluded') return 'excluded';
      // Always visually distinguish bank holidays (unless explicitly marked as office)
      if (isBankHoliday(dateStr) && !officeDays.has(dateStr)) return 'holiday';
      // Holiday leave days from the Leave page
      if (holidayLeaveDays.has(dateStr) && !officeDays.has(dateStr)) return 'holiday';
      return officeDays.has(dateStr) ? 'office' : 'home';
    },
    [rangeStartStr, rangeEndStr, excludeWeekends, excludeBankHolidays, excludedDays, officeDays, holidayLeaveDays]
  );

  const isInteractive = useCallback(
    (dateStr: string) => {
      if (dateStr < rangeStartStr || dateStr > rangeEndStr) return false;
      const date = parseDate(dateStr);
      if (isBankHoliday(dateStr) && excludeBankHolidays) return false;
      if (isWeekend(date) && excludeWeekends) return false;
      // Holiday leave days are read-only in office tracker
      if (holidayLeaveDays.has(dateStr)) return false;
      return true;
    },
    [rangeStartStr, rangeEndStr, excludeBankHolidays, excludeWeekends, holidayLeaveDays]
  );

  const handlePointerDown = (dateStr: string) => {
    if (!isInteractive(dateStr)) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onDayLongPress(dateStr);
    }, 500);
  };

  const handlePointerUp = (dateStr: string) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!longPressFired.current && isInteractive(dateStr)) {
      onDayTap(dateStr);
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className="ot-card ot-cal-card">
      <div className="ot-cal-header">
        <span className="ot-cal-month-title">{formatMonthYear(viewMonth)}</span>
        <div className="ot-cal-nav">
          <button className="ot-cal-nav-btn" onClick={onPrevMonth} aria-label="Previous month">
            <MdChevronLeft />
          </button>
          <button className="ot-cal-nav-btn" onClick={onNextMonth} aria-label="Next month">
            <MdChevronRight />
          </button>
        </div>
      </div>

      <div className="ot-cal-grid">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="ot-cal-dow">{h}</div>
        ))}
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <div key={`empty-${idx}`} className="ot-cal-cell ot-cal-cell--empty" />;

          const status = getDayStatus(dateStr);
          const day = parseDate(dateStr).getDate();
          const isToday = dateStr === today;
          const bankName = isBankHoliday(dateStr) ? getBankHolidayName(dateStr) : null;
          const interactive = isInteractive(dateStr);

          return (
            <div
              key={dateStr}
              className={[
                'ot-cal-cell',
                `ot-cal-cell--${status}`,
                isToday ? 'ot-cal-cell--today' : '',
                !interactive ? 'ot-cal-cell--no-tap' : '',
              ].filter(Boolean).join(' ')}
              onPointerDown={() => handlePointerDown(dateStr)}
              onPointerUp={() => handlePointerUp(dateStr)}
              onPointerLeave={handlePointerLeave}
              title={bankName ?? undefined}
            >
              <span className="ot-cal-day-num">{day}</span>
            </div>
          );
        })}
      </div>

      <div className="ot-cal-legend">
        <span className="ot-legend-item"><span className="ot-legend-swatch ot-legend-swatch--office" /> Office</span>
        <span className="ot-legend-item"><span className="ot-legend-swatch ot-legend-swatch--home" /> Home</span>
        <span className="ot-legend-item"><span className="ot-legend-swatch ot-legend-swatch--excluded" /> Excluded</span>
        <span className="ot-legend-item"><span className="ot-legend-swatch ot-legend-swatch--holiday" />Holiday</span>
      </div>
      <p className="ot-cal-hint">Tap to toggle office · Hold to exclude</p>
    </div>
  );
};

// ─────────────────────────────────────────────
// Exclusions Card
// ─────────────────────────────────────────────
interface ExclusionsCardProps {
  isOpen: boolean;
  onToggle: () => void;
  excludeWeekends: boolean;
  excludeBankHolidays: boolean;
  excludedDays: ExcludedDaysMap;
  holidayLeaveEntries: Array<{ fromDate: string; toDate: string; days: number }>;
  onExcludeWeekendsChange: (v: boolean) => void;
  onExcludeBankHolidaysChange: (v: boolean) => void;
  onAddExcludedDay: (dateStr: string) => void;
  onRemoveExcludedDay: (dateStr: string) => void;
}

const ExclusionsCard: React.FC<ExclusionsCardProps> = ({
  isOpen,
  onToggle,
  excludeWeekends,
  excludeBankHolidays,
  excludedDays,
  holidayLeaveEntries,
  onExcludeWeekendsChange,
  onExcludeBankHolidaysChange,
  onAddExcludedDay,
  onRemoveExcludedDay,
}) => {
  const [newDate, setNewDate] = useState('');

  const handleAdd = () => {
    if (newDate) {
      onAddExcludedDay(newDate);
      setNewDate('');
    }
  };

  const count = excludedDays.size + holidayLeaveEntries.length;

  return (
    <div className="ot-card ot-card--collapsible">
      <button className="ot-collapse-btn" onClick={onToggle}>
        <div className="ot-collapse-left">
          <MdRemoveCircleOutline className="ot-collapse-icon" />
          <div>
            <p className="ot-collapse-title">Exclusions</p>
            <p className="ot-collapse-sub">{count} custom exclusion{count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <MdChevronRight className={`ot-collapse-arrow${isOpen ? ' ot-collapse-arrow--open' : ''}`} />
      </button>

      {isOpen && (
        <div className="ot-collapse-body">
          {/* Automatic toggles */}
          <div className="ot-excl-section">
            <p className="ot-excl-section-title">Automatic</p>
            <label className="ot-toggle-row">
              <span>Exclude weekends</span>
              <span
                className={`ot-toggle${excludeWeekends ? ' ot-toggle--on' : ''}`}
                onClick={() => onExcludeWeekendsChange(!excludeWeekends)}
              >
                <span className="ot-toggle-thumb" />
              </span>
            </label>
            <label className="ot-toggle-row">
              <span>Exclude bank holidays</span>
              <span
                className={`ot-toggle${excludeBankHolidays ? ' ot-toggle--on' : ''}`}
                onClick={() => onExcludeBankHolidaysChange(!excludeBankHolidays)}
              >
                <span className="ot-toggle-thumb" />
              </span>
            </label>
          </div>

          {/* Add exclusion form */}
          <div className="ot-excl-section">
            <p className="ot-excl-section-title">Add Work Exclusion</p>
            <div className="ot-add-excl-row">
              <input
                type="date"
                className="ot-date-input ot-date-input--inline"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <button className="ot-add-btn" onClick={handleAdd} disabled={!newDate} aria-label="Add exclusion">
                <MdAdd size={24} />
              </button>
            </div>
          </div>

          {/* Manual work exclusions list */}
          {excludedDays.size > 0 && (
            <div className="ot-excl-section">
              <p className="ot-excl-section-title">Work Exclusions</p>
              <ul className="ot-excl-list">
                {[...excludedDays.keys()].sort().map((d) => (
                  <li key={d} className="ot-excl-item">
                    <div className="ot-excl-item-left">
                      <span className="ot-excl-type-badge ot-excl-type-badge--excluded">
                        <MdBlock size={11} /> Excluded
                      </span>
                      <span className="ot-excl-date">{formatShortDate(d)}</span>
                    </div>
                    <button className="ot-excl-remove" onClick={() => onRemoveExcludedDay(d)} aria-label="Remove">
                      <MdClose size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Holiday leave — read-only, sourced from Leave page */}
          {holidayLeaveEntries.length > 0 && (
            <div className="ot-excl-section">
              <p className="ot-excl-section-title">
                Holiday Leave <span className="ot-excl-readonly-tag">(from Leave page)</span>
              </p>
              <ul className="ot-excl-list">
                {[...holidayLeaveEntries]
                  .sort((a, b) => a.fromDate.localeCompare(b.fromDate))
                  .map((e) => (
                    <li key={e.fromDate + e.toDate} className="ot-excl-item ot-excl-item--readonly">
                      <div className="ot-excl-item-left">
                        <span className="ot-excl-type-badge ot-excl-type-badge--holiday">
                          <MdBeachAccess size={11} /> Holiday
                        </span>
                        <span className="ot-excl-date">
                          {e.fromDate === e.toDate
                            ? formatShortDate(e.fromDate)
                            : `${formatShortDate(e.fromDate)} – ${formatShortDate(e.toDate)}`}
                        </span>
                        <span className="ot-excl-days-badge">{e.days}d</span>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Calculation Breakdown Card
// ─────────────────────────────────────────────
interface BreakdownCardProps {
  totalDays: number;
  weekendCount: number;
  bankHolidayCount: number;
  manualExcludedCount: number;
  holidayLeaveCount: number;
  totalExcluded: number;
  workingDays: number;
  requiredOfficeDays: number;
  selectedOfficeDays: number;
}

const BreakdownCard: React.FC<BreakdownCardProps> = ({
  totalDays,
  weekendCount,
  bankHolidayCount,
  manualExcludedCount,
  holidayLeaveCount,
  totalExcluded,
  workingDays,
  requiredOfficeDays,
  selectedOfficeDays,
}) => (
  <div className="ot-card">
    <div className="ot-breakdown-header">
      <MdInfoOutline className="ot-breakdown-icon" />
      <span className="ot-card-label" style={{ marginBottom: 0 }}>Calculation Breakdown</span>
    </div>
    <table className="ot-breakdown-table">
      <tbody>
        <tr>
          <td>Total days in range</td>
          <td className="ot-bd-val">{totalDays}</td>
        </tr>
        {weekendCount > 0 && (
          <tr className="ot-bd-excl">
            <td>↳ Weekends</td>
            <td className="ot-bd-val">−{weekendCount}</td>
          </tr>
        )}
        {bankHolidayCount > 0 && (
          <tr className="ot-bd-excl">
            <td>↳ Bank holidays</td>
            <td className="ot-bd-val">−{bankHolidayCount}</td>
          </tr>
        )}
        {manualExcludedCount > 0 && (
          <tr className="ot-bd-excl">
            <td>↳ Custom exclusions</td>
            <td className="ot-bd-val">−{manualExcludedCount}</td>
          </tr>
        )}
        {holidayLeaveCount > 0 && (
          <tr className="ot-bd-excl">
            <td>↳ Holiday leave</td>
            <td className="ot-bd-val">−{holidayLeaveCount}</td>
          </tr>
        )}
        <tr className="ot-bd-sep">
          <td>Excluded days</td>
          <td className="ot-bd-val">−{totalExcluded}</td>
        </tr>
        <tr className="ot-bd-working">
          <td><strong>Working days</strong></td>
          <td className="ot-bd-val"><strong>{workingDays}</strong></td>
        </tr>
        <tr className="ot-bd-required">
          <td><strong>Required office days</strong></td>
          <td className="ot-bd-val ot-bd-val--primary"><strong>{requiredOfficeDays}</strong></td>
        </tr>
        <tr>
          <td>Selected office days</td>
          <td className="ot-bd-val">{selectedOfficeDays}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

// ─────────────────────────────────────────────
// Bottom Action Bar
// ─────────────────────────────────────────────
interface BottomBarProps {
  onMarkToday: () => void;
  isTodayMarked: boolean;
  isTodayInView: boolean;
  onSave: () => void;
  saved: boolean;
  saving?: boolean;
}

const BottomBar: React.FC<BottomBarProps> = ({ onMarkToday, isTodayMarked, isTodayInView, onSave, saved, saving }) => (
  <div className="ot-bottom-bar">
    <button
      className={`ot-btn-secondary${isTodayMarked ? ' ot-btn-secondary--marked' : ''}`}
      onClick={onMarkToday}
      disabled={!isTodayInView}
      title={!isTodayInView ? 'Navigate to the current month to mark today' : undefined}
    >
      {isTodayMarked ? <MdCheck size={17} /> : <MdToday size={17} />}
      {isTodayMarked ? 'Today Marked' : 'Mark Today'}
    </button>
    <button className="ot-btn-primary" onClick={onSave} disabled={saving}>
      {saved ? <MdCheck size={17} /> : <MdSave size={17} />}
      {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
    </button>
  </div>
);

// ─────────────────────────────────────────────
// Main OfficeTracker Page
// ─────────────────────────────────────────────
const OfficeTracker: React.FC = () => {
  // ── Requirement ──────────────────────────────
  const [reqValue, setReqValue] = useState(60);

  // ── Calendar view (drives the date range) ────
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // ── Day selections ───────────────────────────
  const [officeDays, setOfficeDays] = useState<Set<string>>(new Set());
  const [excludedDays, setExcludedDays] = useState<ExcludedDaysMap>(new Map());

  // ── Exclusion settings ───────────────────────
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [excludeBankHolidays, setExcludeBankHolidays] = useState(true);

  // ── UI state ─────────────────────────────────
  const [exclusionsOpen, setExclusionsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  // ── Holiday leave overlay (from Leave page) ──
  const [holidayLeaveDays, setHolidayLeaveDays] = useState<Set<string>>(new Set());
  const [holidayLeaveEntries, setHolidayLeaveEntries] = useState<Array<{ fromDate: string; toDate: string; days: number }>>([]);
  // ── Auth & persistence ───────────────────────
  const { user } = useAuth();
  const monthKey = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`;

  // ── Load from Firestore when month changes ────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDocument<{
      reqValue?: number;
      excludeWeekends?: boolean;
      excludeBankHolidays?: boolean;
      officeDays?: string[];
      excludedDays?: Record<string, string>;
    }>('officeTracker', `${user.uid}_${monthKey}`)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          if (data.reqValue !== undefined) setReqValue(data.reqValue);
          if (data.excludeWeekends !== undefined) setExcludeWeekends(data.excludeWeekends);
          if (data.excludeBankHolidays !== undefined) setExcludeBankHolidays(data.excludeBankHolidays);
          setOfficeDays(new Set(data.officeDays ?? []));
          setExcludedDays(new Map(Object.entries(data.excludedDays ?? {}) as [string, ExclusionType][]));
        } else {
          // New month – clear day selections, keep settings
          setOfficeDays(new Set());
          setExcludedDays(new Map());
        }
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [user, monthKey]);

  // ── Load holiday leave overlay ──────────────
  useEffect(() => {
    if (!user) return;
    getDocument<{ entries?: Array<{ fromDate: string; toDate: string }> }>(
      'holidayLeave', user.uid
    )
      .then((data) => {
        if (!data?.entries) {
          setHolidayLeaveDays(new Set());
          setHolidayLeaveEntries([]);
          return;
        }
        const set = new Set<string>();
        const enriched: Array<{ fromDate: string; toDate: string; days: number }> = [];
        for (const entry of data.entries) {
          const start = parseDate(entry.fromDate);
          const end   = parseDate(entry.toDate);
          let days = 0;
          getDaysInRange(start, end).forEach((d) => {
            const ds = formatDate(d);
            if (!isWeekend(d) && !isBankHoliday(ds)) { set.add(ds); days++; }
          });
          enriched.push({ fromDate: entry.fromDate, toDate: entry.toDate, days });
        }
        setHolidayLeaveDays(set);
        setHolidayLeaveEntries(enriched);
      })
      .catch(console.error);
  }, [user]);

  // ── Date range = full month of viewMonth ─────
  const dateRange = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
  }, [viewMonth]);

  // ── Core calculation ─────────────────────────
  const calc = useMemo(() => {
    const rangeStartStr = formatDate(dateRange.start);
    const rangeEndStr = formatDate(dateRange.end);
    const allDays = getDaysInRange(dateRange.start, dateRange.end);

    let weekendCount = 0;
    let bankHolidayCount = 0;
    let manualExcludedCount = 0;
    let holidayLeaveCount = 0;
    const workingDaySet = new Set<string>();

    for (const day of allDays) {
      const ds = formatDate(day);
      if (isWeekend(day) && excludeWeekends) { weekendCount++; continue; }
      if (isBankHoliday(ds) && excludeBankHolidays) { bankHolidayCount++; continue; }
      if (excludedDays.has(ds)) { manualExcludedCount++; continue; }
      if (holidayLeaveDays.has(ds)) { holidayLeaveCount++; continue; }
      workingDaySet.add(ds);
    }

    const totalDays = allDays.length;
    const totalExcluded = weekendCount + bankHolidayCount + manualExcludedCount + holidayLeaveCount;
    const workingDays = workingDaySet.size;
    const requiredOfficeDays = Math.ceil(workingDays * reqValue / 100);
    const selectedOfficeDays = [...officeDays].filter((d) => workingDaySet.has(d)).length;
    const progressPercentage =
      requiredOfficeDays > 0
        ? Math.min(100, Math.round((selectedOfficeDays / requiredOfficeDays) * 100))
        : 100;

    const complianceStatus: ComplianceStatus =
      selectedOfficeDays >= requiredOfficeDays
        ? 'on-track'
        : selectedOfficeDays >= requiredOfficeDays * 0.75
        ? 'at-risk'
        : 'not-meeting';

    return {
      rangeStartStr,
      rangeEndStr,
      totalDays,
      weekendCount,
      bankHolidayCount,
      manualExcludedCount,
      holidayLeaveCount,
      totalExcluded,
      workingDays,
      workingDaySet,
      requiredOfficeDays,
      selectedOfficeDays,
      progressPercentage,
      complianceStatus,
    };
  }, [dateRange, reqValue, officeDays, excludedDays, excludeWeekends, excludeBankHolidays, holidayLeaveDays]);

  // ── Day interactions ─────────────────────────
  const handleDayTap = useCallback(
    (dateStr: string) => {
      if (excludedDays.has(dateStr)) {
        setExcludedDays((prev) => { const n = new Map(prev); n.delete(dateStr); return n; });
        return;
      }
      if (!calc.workingDaySet.has(dateStr) && !officeDays.has(dateStr)) return;
      setOfficeDays((prev) => {
        const n = new Set(prev);
        if (n.has(dateStr)) { n.delete(dateStr); } else { n.add(dateStr); }
        return n;
      });
    },
    [excludedDays, calc.workingDaySet, officeDays]
  );

  const handleDayLongPress = useCallback(
    (dateStr: string) => {
      if (excludedDays.has(dateStr)) {
        setExcludedDays((prev) => { const n = new Map(prev); n.delete(dateStr); return n; });
      } else {
        setExcludedDays((prev) => new Map(prev).set(dateStr, 'excluded'));
        setOfficeDays((prev) => { const n = new Set(prev); n.delete(dateStr); return n; });
      }
    },
    [excludedDays]
  );

  // ── Exclusion helpers ────────────────────────
  const addExcludedDay = (dateStr: string) => {
    setExcludedDays((prev) => new Map(prev).set(dateStr, 'excluded'));
    setOfficeDays((prev) => { const n = new Set(prev); n.delete(dateStr); return n; });
  };

  const removeExcludedDay = (dateStr: string) => {
    setExcludedDays((prev) => { const n = new Map(prev); n.delete(dateStr); return n; });
  };

  // ── Mark today ───────────────────────────────
  const today = todayStr();
  const isTodayInView = today >= calc.rangeStartStr && today <= calc.rangeEndStr;

  const handleMarkToday = () => {
    if (!isTodayInView) return;
    setOfficeDays((prev) => {
      const n = new Set(prev);
      if (n.has(today)) { n.delete(today); } else { n.add(today); }
      return n;
    });
  };

  // ── Save to Firestore ─────────────────────────
  const handleSave = () => {
    if (!user) return;
    setSaving(true);
    setDocument('officeTracker', `${user.uid}_${monthKey}`, {
      userId: user.uid,
      month: monthKey,
      reqValue,
      excludeWeekends,
      excludeBankHolidays,
      officeDays: [...officeDays],
      excludedDays: Object.fromEntries(excludedDays),
    })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(console.error)
      .finally(() => setSaving(false));
  };

  return (
    <div className="ot-page">
      {/* ── Sticky summary header ── */}
      <div className="ot-sticky-header">
        <div className="ot-header-left">
          <h1 className="ot-title">Days in Office</h1>
          <p className="ot-header-month">{formatMonthYear(viewMonth)}</p>
          <StatusBadge status={calc.complianceStatus} />
        </div>
        <ProgressRing
          selected={calc.selectedOfficeDays}
          required={calc.requiredOfficeDays}
          percentage={calc.progressPercentage}
          status={calc.complianceStatus}
        />
      </div>

      {/* ── Scrollable content ── */}
      <div className="ot-content">
        <RequirementCard
          value={reqValue}
          workingDays={calc.workingDays}
          requiredOfficeDays={calc.requiredOfficeDays}
          onValueChange={setReqValue}
        />

        <OfficeCalendar
          viewMonth={viewMonth}
          officeDays={officeDays}
          excludedDays={excludedDays}
          excludeWeekends={excludeWeekends}
          excludeBankHolidays={excludeBankHolidays}
          holidayLeaveDays={holidayLeaveDays}
          onPrevMonth={() => setViewMonth((m) => addMonths(m, -1))}
          onNextMonth={() => setViewMonth((m) => addMonths(m, 1))}
          onDayTap={handleDayTap}
          onDayLongPress={handleDayLongPress}
        />

        <ExclusionsCard
          isOpen={exclusionsOpen}
          onToggle={() => setExclusionsOpen((o) => !o)}
          excludeWeekends={excludeWeekends}
          excludeBankHolidays={excludeBankHolidays}
          excludedDays={excludedDays}
          holidayLeaveEntries={holidayLeaveEntries}
          onExcludeWeekendsChange={setExcludeWeekends}
          onExcludeBankHolidaysChange={setExcludeBankHolidays}
          onAddExcludedDay={addExcludedDay}
          onRemoveExcludedDay={removeExcludedDay}
        />

        <BreakdownCard
          totalDays={calc.totalDays}
          weekendCount={calc.weekendCount}
          bankHolidayCount={calc.bankHolidayCount}
          manualExcludedCount={calc.manualExcludedCount}
          holidayLeaveCount={calc.holidayLeaveCount}
          totalExcluded={calc.totalExcluded}
          workingDays={calc.workingDays}
          requiredOfficeDays={calc.requiredOfficeDays}
          selectedOfficeDays={calc.selectedOfficeDays}
        />
      </div>

      {/* ── Fixed bottom action bar ── */}
      <BottomBar
        onMarkToday={handleMarkToday}
        isTodayMarked={officeDays.has(today)}
        isTodayInView={isTodayInView}
        onSave={handleSave}
        saved={saved}
        saving={saving}
      />
    </div>
  );
};

export default OfficeTracker;
