import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  MdAdd,
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdDelete,
  MdBeachAccess,
} from 'react-icons/md';
import { useAuth } from '../../../hooks/useAuth';
import { setDocument, getDocument } from '../../../services/database';
import {
  formatDate,
  parseDate,
  formatMonthYear,
  formatShortDate,
  getDaysInRange,
  isWeekend,
  addMonths,
  DAY_HEADERS,
} from '../../office/OfficeTracker/utils/dateUtils';
import {
  isBankHoliday,
  getBankHolidayName,
  BANK_HOLIDAYS,
} from '../../office/OfficeTracker/utils/bankHolidays';
import './Leave.css';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface LeaveEntry {
  id: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  note?: string;
}

interface LeaveData {
  availableDays: number;
  entries: LeaveEntry[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Count working days in [fromDate, toDate] excluding weekends + bank holidays */
function countWorkingDays(fromDate: string, toDate: string): number {
  const start = parseDate(fromDate);
  const end   = parseDate(toDate);
  if (start > end) return 0;
  return getDaysInRange(start, end).filter(
    (d) => !isWeekend(d) && !isBankHoliday(formatDate(d))
  ).length;
}

/** Returns a set of all individual leave working-day dates */
function buildLeaveDaysSet(entries: LeaveEntry[]): Set<string> {
  const set = new Set<string>();
  for (const entry of entries) {
    const start = parseDate(entry.fromDate);
    const end   = parseDate(entry.toDate);
    getDaysInRange(start, end).forEach((d) => {
      const ds = formatDate(d);
      if (!isWeekend(d) && !isBankHoliday(ds)) set.add(ds);
    });
  }
  return set;
}

/** Get UK bank holidays for a given year, sorted */
function getBankHolidaysForYear(year: number): { date: string; name: string }[] {
  return [...BANK_HOLIDAYS]
    .filter((d) => d.startsWith(String(year)))
    .sort()
    .map((d) => ({ date: d, name: getBankHolidayName(d) }));
}

/** Build full Mon-first calendar grid including overflow from prev/next month */
function buildFullCalendarGrid(year: number, month: number): { date: string; inMonth: boolean }[] {
  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0 … Sun=6

  const cells: { date: string; inMonth: boolean }[] = [];

  // Previous-month overflow
  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: formatDate(new Date(year, month, 1 - startOffset + i)), inMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: formatDate(new Date(year, month, d)), inMonth: true });
  }
  // Next-month overflow (complete the last row)
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const fill = 7 - remainder;
    for (let d = 1; d <= fill; d++) {
      cells.push({ date: formatDate(new Date(year, month + 1, d)), inMonth: false });
    }
  }

  return cells;
}

/** "Thu, 1 Jan" */
function formatDayDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Today as YYYY-MM-DD */
const todayStr = () => formatDate(new Date());

// ─────────────────────────────────────────────
// Summary Ring
// ─────────────────────────────────────────────
interface SummaryRingProps {
  used: number;
  available: number;
}

const SummaryRing: React.FC<SummaryRingProps> = ({ used, available }) => {
  const r    = 32;
  const sw   = 5;
  const size = 76;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;
  const pct  = available > 0 ? Math.min(100, (used / available) * 100) : 0;
  const offset    = circ * (1 - pct / 100);
  const remaining = available - used;

  return (
    <div className="hl-ring-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--hl-primary)"
          strokeWidth={sw}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="hl-ring-center">
        <span className="hl-ring-value">{remaining}</span>
        <span className="hl-ring-sub">left</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Leave Calendar
// ─────────────────────────────────────────────
interface LeaveCalendarProps {
  viewMonth: Date;
  leaveDaysSet: Set<string>;
  entries: LeaveEntry[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayTap: (dateStr: string) => void;
}

const LeaveCalendar: React.FC<LeaveCalendarProps> = ({
  viewMonth,
  leaveDaysSet,
  entries,
  onPrevMonth,
  onNextMonth,
  onDayTap,
}) => {
  const today = todayStr();
  const cells = useMemo(
    () => buildFullCalendarGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth]
  );

  /** Single-day entry lookup for tap-to-delete */
  const singleDayEntrySet = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.fromDate === e.toDate) set.add(e.fromDate);
    }
    return set;
  }, [entries]);

  const getCellClasses = useCallback(
    (date: string, inMonth: boolean): string => {
      const classes = ['hl-cal-cell'];
      if (!inMonth) { classes.push('hl-cal-cell--outside'); return classes.join(' '); }

      const d      = parseDate(date);
      const isBH   = isBankHoliday(date);
      const isWE   = isWeekend(d);
      const isLeave = leaveDaysSet.has(date);
      const isToday = date === today;

      if (isBH) {
        classes.push('hl-cal-cell--bank-holiday');
      } else if (isWE) {
        classes.push('hl-cal-cell--weekend');
      } else if (isLeave) {
        const prevD = formatDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
        const nextD = formatDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
        const prevLeave = leaveDaysSet.has(prevD);
        const nextLeave = leaveDaysSet.has(nextD);

        if (!prevLeave && !nextLeave) {
          classes.push('hl-cal-cell--leave');
        } else if (!prevLeave) {
          classes.push('hl-cal-cell--leave', 'hl-cal-cell--leave-start');
        } else if (!nextLeave) {
          classes.push('hl-cal-cell--leave', 'hl-cal-cell--leave-end');
        } else {
          classes.push('hl-cal-cell--leave-mid');
        }
      }

      if (isToday) classes.push('hl-cal-cell--today');
      return classes.join(' ');
    },
    [leaveDaysSet, today]
  );

  return (
    <div className="hl-cal-card">
      <div className="hl-cal-header">
        <span className="hl-cal-month-title">{formatMonthYear(viewMonth)}</span>
        <div className="hl-cal-nav">
          <button className="hl-cal-nav-btn" onClick={onPrevMonth} aria-label="Previous month">
            <MdChevronLeft />
          </button>
          <button className="hl-cal-nav-btn" onClick={onNextMonth} aria-label="Next month">
            <MdChevronRight />
          </button>
        </div>
      </div>

      <div className="hl-cal-grid">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="hl-cal-dow">{h}</div>
        ))}
        {cells.map(({ date, inMonth }, idx) => {
          const d          = parseDate(date);
          const isBH       = inMonth && isBankHoliday(date);
          const isWE       = isWeekend(d);
          const interactive = inMonth && !isBH && !isWE;
          const isSingleLeave = singleDayEntrySet.has(date);

          return (
            <div
              key={`${date}-${idx}`}
              className={getCellClasses(date, inMonth)}
              onClick={() => interactive && onDayTap(date)}
              title={
                isBH
                  ? getBankHolidayName(date)
                  : isSingleLeave && inMonth
                  ? 'Tap to remove'
                  : interactive
                  ? 'Tap to add leave'
                  : undefined
              }
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              onKeyDown={interactive ? (e) => e.key === 'Enter' && onDayTap(date) : undefined}
            >
              <span className="hl-cal-day-num">{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      <div className="hl-cal-legend">
        <span className="hl-legend-item">
          <span className="hl-legend-swatch hl-legend-swatch--leave" /> Holiday Leave
        </span>
        <span className="hl-legend-item">
          <span className="hl-legend-swatch hl-legend-swatch--bank-holiday" /> Bank Holiday
        </span>
        <span className="hl-legend-item">
          <span className="hl-legend-swatch hl-legend-swatch--today" /> Today
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Add Leave Sheet
// ─────────────────────────────────────────────
interface AddLeaveSheetProps {
  onClose: () => void;
  onAdd: (entry: Omit<LeaveEntry, 'id'>) => void;
  initialDate?: string;
}

const AddLeaveSheet: React.FC<AddLeaveSheetProps> = ({ onClose, onAdd, initialDate }) => {
  const [fromDate, setFromDate] = useState(initialDate ?? '');
  const [toDate,   setToDate]   = useState(initialDate ?? '');
  const [note,     setNote]     = useState('');

  const workingDays = useMemo(
    () => (fromDate && toDate ? countWorkingDays(fromDate, toDate) : 0),
    [fromDate, toDate]
  );

  const canSubmit = Boolean(fromDate && toDate && toDate >= fromDate && workingDays > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd({ fromDate, toDate, note: note.trim() || undefined });
  };

  return (
    <div className="hl-overlay" onClick={onClose}>
      <div className="hl-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="hl-sheet-handle" />
        <div className="hl-sheet-header">
          <h2 className="hl-sheet-title">Add Holiday</h2>
          <button className="hl-sheet-close" onClick={onClose} aria-label="Close">
            <MdClose size={18} />
          </button>
        </div>

        <div className="hl-form">
          {/* Leave type — locked to Holiday in v1 */}
          <div className="hl-form-group">
            <label className="hl-form-label">Leave Type</label>
            <div className="hl-form-type-badge">
              <MdBeachAccess size={16} /> Holiday
            </div>
          </div>

          {/* Date range */}
          <div className="hl-form-row">
            <div className="hl-form-group">
              <label className="hl-form-label" htmlFor="hl-from">From</label>
              <input
                id="hl-from"
                type="date"
                className="hl-form-input"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (toDate && e.target.value > toDate) setToDate(e.target.value);
                }}
              />
            </div>
            <div className="hl-form-group">
              <label className="hl-form-label" htmlFor="hl-to">To</label>
              <input
                id="hl-to"
                type="date"
                className="hl-form-input"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {/* Working-days preview */}
          {fromDate && toDate && toDate >= fromDate && (
            <div className="hl-form-preview">
              <span className="hl-form-preview-days">{workingDays}</span>
              <span className="hl-form-preview-muted">
                {' '}working day{workingDays !== 1 ? 's' : ''} — weekends &amp; bank holidays excluded
              </span>
            </div>
          )}

          {/* Note */}
          <div className="hl-form-group">
            <label className="hl-form-label" htmlFor="hl-note">Note (optional)</label>
            <input
              id="hl-note"
              type="text"
              className="hl-form-input"
              placeholder="e.g. Summer holiday"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            className="hl-form-submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Add Holiday
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Leave Page
// ─────────────────────────────────────────────
const Leave: React.FC = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  // ── Persisted state ───────────────────────
  const [availableDays, setAvailableDays] = useState(25);
  const [entries,       setEntries]       = useState<LeaveEntry[]>([]);

  // ── UI state ──────────────────────────────
  const [viewMonth,        setViewMonth]        = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [activeTab,        setActiveTab]        = useState<'my-leave' | 'calendar'>('calendar');
  const [showAddForm,      setShowAddForm]      = useState(false);
  const [addFormDate,      setAddFormDate]      = useState<string | undefined>(undefined);
  const [showBankHolidays, setShowBankHolidays] = useState(false);
  const [editingAvailable, setEditingAvailable] = useState(false);
  const [availableInput,   setAvailableInput]   = useState('25');
  const [saveStatus,       setSaveStatus]       = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStatusTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load from Firestore ───────────────────
  useEffect(() => {
    if (!user) return;
    getDocument<LeaveData>('holidayLeave', user.uid)
      .then((data) => {
        if (data) {
          const days = data.availableDays ?? 25;
          setAvailableDays(days);
          setAvailableInput(String(days));
          setEntries(data.entries ?? []);
        }
      })
      .catch(console.error);
  }, [user]);

  // ── Persist helper ────────────────────────
  const persist = useCallback(
    (newAvailable: number, newEntries: LeaveEntry[]) => {
      if (!user) return;
      setSaveStatus('saving');
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
      // Strip undefined fields — Firestore rejects them
      const sanitizedEntries = newEntries.map((e) => {
        const entry: Record<string, unknown> = { id: e.id, fromDate: e.fromDate, toDate: e.toDate };
        if (e.note !== undefined) entry.note = e.note;
        return entry;
      });
      setDocument('holidayLeave', user.uid, {
        availableDays: newAvailable,
        entries: sanitizedEntries,
      })
        .then(() => {
          setSaveStatus('saved');
          saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
        })
        .catch((err) => {
          console.error('Failed to save leave data:', err);
          setSaveStatus('error');
          saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 4000);
        });
    },
    [user]
  );

  // ── Derived state ─────────────────────────
  const bankHolidays = useMemo(() => getBankHolidaysForYear(currentYear), [currentYear]);

  const leaveDaysSet = useMemo(() => buildLeaveDaysSet(entries), [entries]);

  const usedDays = useMemo(
    () => entries.reduce((sum, e) => sum + countWorkingDays(e.fromDate, e.toDate), 0),
    [entries]
  );

  const remainingDays = availableDays - usedDays;

  // ── Available days handlers ───────────────
  const handleAvailableStep = (delta: number) => {
    const v = Math.max(0, availableDays + delta);
    setAvailableDays(v);
    setAvailableInput(String(v));
    persist(v, entries);
  };

  const handleAvailableBlur = () => {
    const parsed = parseInt(availableInput, 10);
    const v = isNaN(parsed) ? availableDays : Math.max(0, parsed);
    setAvailableDays(v);
    setAvailableInput(String(v));
    setEditingAvailable(false);
    persist(v, entries);
  };

  // ── Add leave ─────────────────────────────
  const handleAddLeave = useCallback(
    (entry: Omit<LeaveEntry, 'id'>) => {
      const newEntry: LeaveEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      const newEntries = [...entries, newEntry];
      setEntries(newEntries);
      setShowAddForm(false);
      setAddFormDate(undefined);
      persist(availableDays, newEntries);
    },
    [entries, availableDays, persist]
  );

  // ── Delete leave ──────────────────────────
  const handleDeleteEntry = useCallback(
    (id: string) => {
      const newEntries = entries.filter((e) => e.id !== id);
      setEntries(newEntries);
      persist(availableDays, newEntries);
    },
    [entries, availableDays, persist]
  );

  // ── Calendar day tap ──────────────────────
  const handleDayTap = useCallback(
    (dateStr: string) => {
      // Single-day entry → toggle off
      const single = entries.find((e) => e.fromDate === dateStr && e.toDate === dateStr);
      if (single) { handleDeleteEntry(single.id); return; }

      // Part of a multi-day range → no direct toggle; user uses My Leave to delete
      if (leaveDaysSet.has(dateStr)) return;

      // New date → quick-add 1-day entry
      handleAddLeave({ fromDate: dateStr, toDate: dateStr });
    },
    [entries, leaveDaysSet, handleDeleteEntry, handleAddLeave]
  );

  const openAddForm = (date?: string) => {
    setAddFormDate(date);
    setShowAddForm(true);
  };

  // ─────────────────────────────────────────
  return (
    <div className="hl-page">

      {/* ── Header ───────────────────────────── */}
      <div className="hl-header">
        <div>
          <p className="hl-header-title">Leave</p>
          <span className="hl-header-subtitle">Holiday Leave</span>
        </div>
        <div className="hl-header-right">
          {saveStatus === 'saving' && <span className="hl-save-toast hl-save-toast--saving">Saving…</span>}
          {saveStatus === 'saved'  && <span className="hl-save-toast hl-save-toast--saved">✓ Saved</span>}
          {saveStatus === 'error'  && <span className="hl-save-toast hl-save-toast--error">Save failed — check permissions</span>}
          <button className="hl-add-btn" onClick={() => openAddForm()}>
            <MdAdd size={18} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* ── Leave Summary Card ────────────────── */}
      <div className="hl-summary-card">
        <SummaryRing used={usedDays} available={availableDays} />

        <div className="hl-summary-stats">
          {/* Available (editable) */}
          <div className="hl-stat-row">
            <span className="hl-stat-label">Available</span>
            <div className="hl-available-row">
              <button
                className="hl-counter-btn"
                onClick={() => handleAvailableStep(-1)}
                aria-label="Decrease available days"
              >−</button>

              {editingAvailable ? (
                <input
                  className="hl-available-input"
                  type="number"
                  min={0}
                  value={availableInput}
                  onChange={(e) => setAvailableInput(e.target.value)}
                  onBlur={handleAvailableBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleAvailableBlur()}
                  autoFocus
                />
              ) : (
                <span
                  className="hl-available-value"
                  onClick={() => setEditingAvailable(true)}
                  title="Tap to edit"
                >
                  {availableDays}
                </span>
              )}

              <button
                className="hl-counter-btn"
                onClick={() => handleAvailableStep(1)}
                aria-label="Increase available days"
              >+</button>
            </div>
          </div>

          {/* Used */}
          <div className="hl-stat-row">
            <span className="hl-stat-label">Used</span>
            <span className="hl-stat-value">{usedDays} days</span>
          </div>

          {/* Remaining */}
          <div className="hl-stat-row">
            <span className="hl-stat-label">Remaining</span>
            <span
              className={`hl-stat-value hl-stat-value--remaining${
                remainingDays <= 5 ? ' hl-stat-value--warning' : ''
              }`}
            >
              {remainingDays} days
            </span>
          </div>
        </div>
      </div>

      {/* ── Bank Holidays ─────────────────────── */}
      <div className="hl-bank-card">
        <div
          className="hl-bank-header"
          onClick={() => setShowBankHolidays((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setShowBankHolidays((v) => !v)}
          aria-expanded={showBankHolidays}
        >
          <div className="hl-bank-left">
            <div className="hl-bank-icon-wrap">
              <MdBeachAccess size={16} />
            </div>
            <span className="hl-bank-label">
              UK Bank Holidays: {bankHolidays.length} days
              <span className="hl-bank-sublabel"> (excluded automatically)</span>
            </span>
          </div>
          <button
            className="hl-bank-toggle"
            onClick={(e) => { e.stopPropagation(); setShowBankHolidays((v) => !v); }}
            aria-label={showBankHolidays ? 'Hide bank holidays' : 'Show bank holidays'}
          >
            {showBankHolidays ? 'Hide' : 'Show'}
          </button>
        </div>

        {showBankHolidays && (
          <div className="hl-bank-list">
            {bankHolidays.map((bh) => (
              <div key={bh.date} className="hl-bank-item">
                <span className="hl-bank-name">{bh.name}</span>
                <span className="hl-bank-date-str">{formatDayDate(bh.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tab Toggle ────────────────────────── */}
      <div className="hl-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'my-leave'}
          className={`hl-tab${activeTab === 'my-leave' ? ' hl-tab--active' : ''}`}
          onClick={() => setActiveTab('my-leave')}
        >
          My Leave
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'calendar'}
          className={`hl-tab${activeTab === 'calendar' ? ' hl-tab--active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
      </div>

      {/* ── Tab Content ───────────────────────── */}
      {activeTab === 'my-leave' ? (
        <div className="hl-my-leave">
          {entries.length === 0 ? (
            <div className="hl-empty">
              <p>No leave entries yet.</p>
              <button className="hl-empty-add-btn" onClick={() => openAddForm()}>
                <MdAdd size={16} /> Add Holiday
              </button>
            </div>
          ) : (
            <div className="hl-entries">
              {[...entries]
                .sort((a, b) => a.fromDate.localeCompare(b.fromDate))
                .map((entry) => {
                  const days     = countWorkingDays(entry.fromDate, entry.toDate);
                  const isSingle = entry.fromDate === entry.toDate;
                  return (
                    <div key={entry.id} className="hl-entry-card">
                      <div className="hl-entry-left">
                        <span className="hl-entry-days">{days}</span>
                        <span className="hl-entry-unit">day{days !== 1 ? 's' : ''}</span>
                      </div>

                      <div className="hl-entry-mid">
                        <div className="hl-entry-range">
                          {isSingle
                            ? formatShortDate(entry.fromDate)
                            : `${formatShortDate(entry.fromDate)} – ${formatShortDate(entry.toDate)}`}
                        </div>
                        {entry.note && (
                          <div className="hl-entry-note">{entry.note}</div>
                        )}
                        <div className="hl-entry-badge">
                          <MdBeachAccess size={11} /> Holiday
                        </div>
                      </div>

                      <button
                        className="hl-entry-delete"
                        onClick={() => handleDeleteEntry(entry.id)}
                        aria-label="Delete entry"
                      >
                        <MdDelete size={17} />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        <LeaveCalendar
          viewMonth={viewMonth}
          leaveDaysSet={leaveDaysSet}
          entries={entries}
          onPrevMonth={() => setViewMonth((m) => addMonths(m, -1))}
          onNextMonth={() => setViewMonth((m) => addMonths(m, 1))}
          onDayTap={handleDayTap}
        />
      )}

      {/* ── Add Holiday Sheet ─────────────────── */}
      {showAddForm && (
        <AddLeaveSheet
          onClose={() => { setShowAddForm(false); setAddFormDate(undefined); }}
          onAdd={handleAddLeave}
          initialDate={addFormDate}
        />
      )}
    </div>
  );
};

export default Leave;
