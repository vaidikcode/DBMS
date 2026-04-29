export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      book: {
        Row: {
          book_id: string
          isbn: string
          title: string
          genre: string
          publisher: string | null
          edition: string | null
          year_published: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['book']['Row'], 'book_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['book']['Insert']>
      }
      author: {
        Row: {
          author_id: string
          name: string
          nationality: string | null
          bio: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['author']['Row'], 'author_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['author']['Insert']>
      }
      book_author: {
        Row: { book_id: string; author_id: string }
        Insert: { book_id: string; author_id: string }
        Update: Partial<{ book_id: string; author_id: string }>
      }
      member: {
        Row: {
          member_id: string
          name: string
          email: string
          mobile_no: string
          date_of_birth: string | null
          membership_type: 'Student' | 'Faculty' | 'Standard' | 'Premium'
          join_date: string
          status: 'Active' | 'Suspended' | 'Expired'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['member']['Row'], 'member_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['member']['Insert']>
      }
      staff: {
        Row: {
          staff_id: string
          name: string
          email: string
          role: 'Admin' | 'Librarian'
          mobile_no: string | null
          join_date: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['staff']['Row'], 'staff_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['staff']['Insert']>
      }
      book_copy: {
        Row: {
          copy_id: string
          book_id: string
          condition: 'New' | 'Good' | 'Fair' | 'Poor'
          availability_status: 'Available' | 'Issued' | 'Reserved' | 'Maintenance'
          location_shelf: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['book_copy']['Row'], 'copy_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['book_copy']['Insert']>
      }
      issue: {
        Row: {
          issue_id: string
          copy_id: string
          member_id: string
          staff_id: string
          issue_date: string
          due_date: string
          return_date: string | null
          status: 'Active' | 'Returned' | 'Overdue'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['issue']['Row'], 'issue_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['issue']['Insert']>
      }
      reservation: {
        Row: {
          reservation_id: string
          book_id: string
          member_id: string
          reservation_date: string
          expiry_date: string
          status: 'Pending' | 'Fulfilled' | 'Cancelled' | 'Expired'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reservation']['Row'], 'reservation_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['reservation']['Insert']>
      }
      fine: {
        Row: {
          fine_id: string
          issue_id: string
          amount: number
          fine_date: string
          payment_status: 'Unpaid' | 'Paid' | 'Waived'
          payment_date: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['fine']['Row'], 'fine_id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['fine']['Insert']>
      }
    }
    Views: {
      available_books_view: {
        Row: {
          book_id: string
          isbn: string
          title: string
          genre: string
          publisher: string | null
          edition: string | null
          year_published: number | null
          authors: string | null
          available_copies: number
          total_copies: number
        }
      }
      member_borrowing_dashboard: {
        Row: {
          issue_id: string
          member_id: string
          member_name: string
          member_email: string
          membership_type: string
          copy_id: string
          location_shelf: string | null
          book_id: string
          book_title: string
          genre: string
          issue_date: string
          due_date: string
          return_date: string | null
          status: string
          days_remaining: number
          days_overdue: number
        }
      }
      overdue_issues_view: {
        Row: {
          issue_id: string
          member_id: string
          member_name: string
          member_email: string
          member_mobile: string
          copy_id: string
          book_id: string
          book_title: string
          isbn: string
          issue_date: string
          due_date: string
          days_overdue: number
          calculated_fine: number
          fine_id: string | null
          existing_fine_amount: number | null
          fine_payment_status: string | null
        }
      }
      library_stats_view: {
        Row: {
          total_books: number
          total_copies: number
          available_copies: number
          total_active_members: number
          total_members: number
          active_issues: number
          overdue_count: number
          pending_reservations: number
          fines_collected: number
          fines_pending: number
        }
      }
      top_borrowed_books: {
        Row: {
          book_id: string
          title: string
          genre: string
          isbn: string
          authors: string | null
          borrow_count: number
          currently_borrowed: number
        }
      }
    }
    Functions: {
      issue_book: {
        Args: { p_copy_id: string; p_member_id: string; p_staff_id: string }
        Returns: string
      }
      return_book: {
        Args: { p_issue_id: string }
        Returns: Json
      }
      calculate_fine: {
        Args: { p_issue_id: string }
        Returns: number
      }
      check_availability: {
        Args: { p_book_id: string }
        Returns: boolean
      }
      get_borrowing_count: {
        Args: { p_member_id: string }
        Returns: number
      }
      generate_member_report: {
        Args: { p_member_id: string }
        Returns: Json
      }
      process_reservation_queue: {
        Args: { p_book_id: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
