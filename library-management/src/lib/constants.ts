export const BORROW_LIMIT = 3
export const FINE_PER_DAY = 5  // ₹5 per day
export const LOAN_PERIOD_DAYS = 14
export const RESERVATION_EXPIRY_DAYS = 7

export const GENRES = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Engineering',
  'Fiction',
  'History',
  'Self-Help',
  'Philosophy',
  'Biology',
  'Economics',
]

export const MEMBERSHIP_TYPES = ['Student', 'Faculty', 'Standard', 'Premium'] as const
export const MEMBER_STATUSES = ['Active', 'Suspended', 'Expired'] as const
export const COPY_CONDITIONS = ['New', 'Good', 'Fair', 'Poor'] as const
export const COPY_STATUSES = ['Available', 'Issued', 'Reserved', 'Maintenance'] as const

export type MockRole = 'admin' | 'librarian' | 'member'

export const ROLE_LABELS: Record<MockRole, string> = {
  admin: 'Admin',
  librarian: 'Librarian',
  member: 'Member',
}
