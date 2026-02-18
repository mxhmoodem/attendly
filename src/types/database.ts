import { Timestamp } from 'firebase/firestore';

// Base interface for all documents
export interface BaseDocument {
  id?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// User profile data (extends Firebase Auth user)
export interface UserProfile extends BaseDocument {
  uid: string; // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'employee' | 'manager' | 'admin';
  department?: string;
  position?: string;
  phoneNumber?: string;
  isActive: boolean;
}

// Attendance record
export interface AttendanceRecord extends BaseDocument {
  userId: string;
  date: Timestamp;
  checkInTime?: Timestamp;
  checkOutTime?: Timestamp;
  status: 'present' | 'absent' | 'late' | 'on-leave' | 'half-day';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
  approvedBy?: string;
}

// Leave request
export interface LeaveRequest extends BaseDocument {
  userId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  leaveType: 'sick' | 'vacation' | 'personal' | 'emergency' | 'other';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvalDate?: Timestamp;
  approverNotes?: string;
  totalDays: number;
}

// Office location tracking
export interface OfficeLocation extends BaseDocument {
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  radius: number; // in meters, for geofencing
  isActive: boolean;
  capacity?: number;
}

// Work schedule
export interface WorkSchedule extends BaseDocument {
  userId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isWorkingDay: boolean;
  officeLocationId?: string;
}

// Department
export interface Department extends BaseDocument {
  name: string;
  description?: string;
  managerId?: string;
  isActive: boolean;
}

// Notification
export interface Notification extends BaseDocument {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  actionUrl?: string;
}

// Analytics/Report data
export interface AttendanceReport extends BaseDocument {
  userId: string;
  month: number; // 1-12
  year: number;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  attendancePercentage: number;
}
