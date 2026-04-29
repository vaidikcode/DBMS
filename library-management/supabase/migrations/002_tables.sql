-- ============================================================
-- LIBRARY MANAGEMENT SYSTEM — Normalized Schema (3NF)
-- All tables use UUIDs as primary keys for Supabase compatibility
-- CHECK constraints used as ENUMs (Supabase-compatible)
-- ============================================================

-- BOOK: Core catalog entity
CREATE TABLE IF NOT EXISTS book (
  book_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isbn           VARCHAR(20) UNIQUE NOT NULL,
  title          VARCHAR(300) NOT NULL,
  genre          VARCHAR(100) NOT NULL,
  publisher      VARCHAR(200),
  edition        VARCHAR(50),
  year_published INTEGER CHECK (year_published >= 1000 AND year_published <= 2100),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- AUTHOR: Author biographical information
CREATE TABLE IF NOT EXISTS author (
  author_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  nationality VARCHAR(100),
  bio         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- BOOK_AUTHOR: Junction table for M:M relationship between books and authors
-- Demonstrates 2NF decomposition (no partial dependencies on composite PK)
CREATE TABLE IF NOT EXISTS book_author (
  book_id   UUID NOT NULL REFERENCES book(book_id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES author(author_id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, author_id)
);

-- MEMBER: Library member profiles
CREATE TABLE IF NOT EXISTS member (
  member_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  mobile_no       VARCHAR(20) UNIQUE NOT NULL,
  date_of_birth   DATE,
  membership_type VARCHAR(20) NOT NULL DEFAULT 'Student'
                  CHECK (membership_type IN ('Student', 'Faculty', 'Standard', 'Premium')),
  join_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  status          VARCHAR(20) NOT NULL DEFAULT 'Active'
                  CHECK (status IN ('Active', 'Suspended', 'Expired')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- STAFF: Library staff (librarians + admin)
CREATE TABLE IF NOT EXISTS staff (
  staff_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(200) NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  role       VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Librarian')),
  mobile_no  VARCHAR(20),
  join_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOK_COPY: Individual physical copies of each book
-- 1:M relationship with BOOK — one title can have many copies
CREATE TABLE IF NOT EXISTS book_copy (
  copy_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id             UUID NOT NULL REFERENCES book(book_id) ON DELETE RESTRICT,
  condition           VARCHAR(20) NOT NULL DEFAULT 'Good'
                      CHECK (condition IN ('New', 'Good', 'Fair', 'Poor')),
  availability_status VARCHAR(20) NOT NULL DEFAULT 'Available'
                      CHECK (availability_status IN ('Available', 'Issued', 'Reserved', 'Maintenance')),
  location_shelf      VARCHAR(50),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ISSUE: Book borrowing transaction records
-- Links BOOK_COPY, MEMBER, and STAFF with temporal data
CREATE TABLE IF NOT EXISTS issue (
  issue_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  copy_id     UUID NOT NULL REFERENCES book_copy(copy_id) ON DELETE RESTRICT,
  member_id   UUID NOT NULL REFERENCES member(member_id) ON DELETE RESTRICT,
  staff_id    UUID NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
  issue_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date    DATE NOT NULL,
  return_date DATE,
  status      VARCHAR(20) NOT NULL DEFAULT 'Active'
              CHECK (status IN ('Active', 'Returned', 'Overdue')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure return_date is not before issue_date
  CONSTRAINT chk_return_after_issue CHECK (return_date IS NULL OR return_date >= issue_date)
);

-- RESERVATION: Queue for members waiting for unavailable books
-- Partial unique constraint prevents duplicate active reservations
CREATE TABLE IF NOT EXISTS reservation (
  reservation_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id          UUID NOT NULL REFERENCES book(book_id) ON DELETE CASCADE,
  member_id        UUID NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date      DATE NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'Pending'
                   CHECK (status IN ('Pending', 'Fulfilled', 'Cancelled', 'Expired')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: one member can only have ONE pending reservation per book
CREATE UNIQUE INDEX idx_unique_active_reservation
  ON reservation (book_id, member_id)
  WHERE status = 'Pending';

-- FINE: Overdue fines linked 1:1 with late issue records
CREATE TABLE IF NOT EXISTS fine (
  fine_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id       UUID NOT NULL REFERENCES issue(issue_id) ON DELETE RESTRICT,
  amount         NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  fine_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid'
                 CHECK (payment_status IN ('Unpaid', 'Paid', 'Waived')),
  payment_date   DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for query performance
-- ============================================================
CREATE INDEX idx_book_genre ON book(genre);
CREATE INDEX idx_book_title ON book(title);
CREATE INDEX idx_book_copy_book_id ON book_copy(book_id);
CREATE INDEX idx_book_copy_status ON book_copy(availability_status);
CREATE INDEX idx_issue_member_id ON issue(member_id);
CREATE INDEX idx_issue_copy_id ON issue(copy_id);
CREATE INDEX idx_issue_status ON issue(status);
CREATE INDEX idx_issue_due_date ON issue(due_date);
CREATE INDEX idx_reservation_book_id ON reservation(book_id);
CREATE INDEX idx_reservation_member_id ON reservation(member_id);
CREATE INDEX idx_fine_issue_id ON fine(issue_id);
CREATE INDEX idx_fine_payment_status ON fine(payment_status);
