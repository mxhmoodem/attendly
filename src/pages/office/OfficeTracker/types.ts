export type ExclusionType = 'excluded' | 'holiday';
export type ExcludedDaysMap = Map<string, ExclusionType>;
export type ComplianceStatus = 'on-track' | 'at-risk' | 'not-meeting';
export type DayStatus =
  | 'office'
  | 'home'
  | 'excluded'
  | 'weekend'
  | 'holiday'
  | 'outside-range';
