-- ============================================================
-- LIBRARY MANAGEMENT SYSTEM — Stored Functions (PL/pgSQL)
-- Demonstrates: Stored procedures, exception handling, cursors,
--               transaction control, business logic enforcement
-- ============================================================

-- FUNCTION 1: Calculate fine amount for an issue
-- Uses date arithmetic to compute overdue penalty at ₹5/day
CREATE OR REPLACE FUNCTION calculate_fine(p_issue_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_due_date   DATE;
  v_check_date DATE;
  v_days_overdue INTEGER;
BEGIN
  SELECT due_date, COALESCE(return_date, CURRENT_DATE)
  INTO v_due_date, v_check_date
  FROM issue
  WHERE issue_id = p_issue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Issue ID % not found', p_issue_id;
  END IF;

  v_days_overdue := GREATEST(0, (v_check_date - v_due_date));
  RETURN v_days_overdue * 5;  -- ₹5 per day
END;
$$;


-- FUNCTION 2: Check if any copy of a book is currently available
CREATE OR REPLACE FUNCTION check_availability(p_book_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM book_copy
    WHERE book_id = p_book_id
      AND availability_status = 'Available'
  );
END;
$$;


-- FUNCTION 3: Get count of active issues for a member
CREATE OR REPLACE FUNCTION get_borrowing_count(p_member_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM issue
  WHERE member_id = p_member_id
    AND status = 'Active';
  RETURN v_count;
END;
$$;


-- FUNCTION 4: Process reservation queue when a book becomes available
-- Uses cursor to find the oldest pending reservation
CREATE OR REPLACE FUNCTION process_reservation_queue(p_book_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  -- Cursor: iterate through pending reservations ordered by date (oldest first)
  v_reservation_cursor CURSOR FOR
    SELECT reservation_id, member_id
    FROM reservation
    WHERE book_id = p_book_id
      AND status = 'Pending'
    ORDER BY reservation_date ASC;
  v_first_reservation RECORD;
BEGIN
  OPEN v_reservation_cursor;
  FETCH v_reservation_cursor INTO v_first_reservation;

  IF FOUND THEN
    -- Fulfill the oldest pending reservation
    UPDATE reservation
    SET status = 'Fulfilled'
    WHERE reservation_id = v_first_reservation.reservation_id;
  END IF;

  CLOSE v_reservation_cursor;
END;
$$;


-- FUNCTION 5: Issue a book (main transaction procedure)
-- Enforces all business rules with exception handling
-- Demonstrates: Atomicity, constraint checking, exception handling
CREATE OR REPLACE FUNCTION issue_book(
  p_copy_id   UUID,
  p_member_id UUID,
  p_staff_id  UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_issue_id      UUID;
  v_member_status VARCHAR(20);
  v_borrow_count  INTEGER;
  v_copy_status   VARCHAR(20);
  v_unpaid_fines  INTEGER;
BEGIN
  -- STEP 1: Lock member row to prevent concurrent issue race conditions
  SELECT status INTO v_member_status
  FROM member
  WHERE member_id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member ID % not found', p_member_id;
  END IF;

  -- STEP 2: Validate member is active
  IF v_member_status != 'Active' THEN
    RAISE EXCEPTION 'Member account is %. Only Active members can borrow books.', v_member_status;
  END IF;

  -- STEP 3: Check borrowing limit (max 3 active issues)
  v_borrow_count := get_borrowing_count(p_member_id);
  IF v_borrow_count >= 3 THEN
    RAISE EXCEPTION 'Member has reached the borrowing limit of 3 books. Currently has % active issues.', v_borrow_count;
  END IF;

  -- STEP 4: Check for unpaid fines
  SELECT COUNT(*) INTO v_unpaid_fines
  FROM fine f
  JOIN issue i ON f.issue_id = i.issue_id
  WHERE i.member_id = p_member_id
    AND f.payment_status = 'Unpaid';

  IF v_unpaid_fines > 0 THEN
    RAISE EXCEPTION 'Member has % unpaid fine(s). Please clear all dues before borrowing.', v_unpaid_fines;
  END IF;

  -- STEP 5: Verify copy availability (with lock)
  SELECT availability_status INTO v_copy_status
  FROM book_copy
  WHERE copy_id = p_copy_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book copy ID % not found', p_copy_id;
  END IF;

  IF v_copy_status != 'Available' THEN
    RAISE EXCEPTION 'Book copy is currently %. Cannot issue.', v_copy_status;
  END IF;

  -- STEP 6: Staff validation
  IF NOT EXISTS (SELECT 1 FROM staff WHERE staff_id = p_staff_id) THEN
    RAISE EXCEPTION 'Staff ID % not found', p_staff_id;
  END IF;

  -- STEP 7: Create the issue record (trigger will update book_copy status)
  INSERT INTO issue (copy_id, member_id, staff_id, issue_date, due_date, status)
  VALUES (
    p_copy_id,
    p_member_id,
    p_staff_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    'Active'
  )
  RETURNING issue_id INTO v_issue_id;

  RETURN v_issue_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with context (automatic ROLLBACK on unhandled exceptions)
    RAISE;
END;
$$;


-- FUNCTION 6: Return a book (processes return + calculates fine)
-- Demonstrates: Multi-step transaction, conditional fine insertion
CREATE OR REPLACE FUNCTION return_book(p_issue_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_issue_status  VARCHAR(20);
  v_fine_amount   NUMERIC;
  v_fine_id       UUID;
  v_result        JSONB;
BEGIN
  -- Lock the issue row
  SELECT status INTO v_issue_status
  FROM issue
  WHERE issue_id = p_issue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Issue ID % not found', p_issue_id;
  END IF;

  IF v_issue_status = 'Returned' THEN
    RAISE EXCEPTION 'Book has already been returned for issue ID %', p_issue_id;
  END IF;

  -- Mark issue as returned (trigger fires after this update)
  UPDATE issue
  SET
    return_date = CURRENT_DATE,
    status      = 'Returned'
  WHERE issue_id = p_issue_id;

  -- Calculate fine for overdue return
  v_fine_amount := calculate_fine(p_issue_id);

  IF v_fine_amount > 0 THEN
    -- Check if fine already exists (idempotency)
    SELECT fine_id INTO v_fine_id
    FROM fine
    WHERE issue_id = p_issue_id;

    IF v_fine_id IS NULL THEN
      INSERT INTO fine (issue_id, amount, fine_date, payment_status)
      VALUES (p_issue_id, v_fine_amount, CURRENT_DATE, 'Unpaid')
      RETURNING fine_id INTO v_fine_id;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'issue_id',    p_issue_id,
    'fine_amount', COALESCE(v_fine_amount, 0),
    'fine_id',     v_fine_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;


-- FUNCTION 7: Generate comprehensive member report
-- Demonstrates: Complex JSONB aggregation, subqueries, multiple JOINs
CREATE OR REPLACE FUNCTION generate_member_report(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_member         RECORD;
  v_total_borrowed INTEGER;
  v_active_count   INTEGER;
  v_fines_paid     NUMERIC;
  v_fines_pending  NUMERIC;
  v_history        JSONB;
  v_reservations   JSONB;
BEGIN
  -- Member profile
  SELECT * INTO v_member
  FROM member
  WHERE member_id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member ID % not found', p_member_id;
  END IF;

  -- Aggregate borrowing stats
  SELECT COUNT(*) INTO v_total_borrowed
  FROM issue WHERE member_id = p_member_id;

  v_active_count := get_borrowing_count(p_member_id);

  SELECT
    COALESCE(SUM(f.amount) FILTER (WHERE f.payment_status = 'Paid'), 0),
    COALESCE(SUM(f.amount) FILTER (WHERE f.payment_status = 'Unpaid'), 0)
  INTO v_fines_paid, v_fines_pending
  FROM fine f
  JOIN issue i ON f.issue_id = i.issue_id
  WHERE i.member_id = p_member_id;

  -- Build borrowing history (last 20 issues) using subquery
  SELECT jsonb_agg(h) INTO v_history FROM (
    SELECT
      i.issue_id,
      b.title AS book_title,
      b.isbn,
      i.issue_date,
      i.due_date,
      i.return_date,
      i.status,
      COALESCE(f.amount, 0) AS fine_amount,
      f.payment_status AS fine_status
    FROM issue i
    JOIN book_copy bc ON i.copy_id = bc.copy_id
    JOIN book b ON bc.book_id = b.book_id
    LEFT JOIN fine f ON i.issue_id = f.issue_id
    WHERE i.member_id = p_member_id
    ORDER BY i.issue_date DESC
    LIMIT 20
  ) h;

  -- Active reservations
  SELECT jsonb_agg(r) INTO v_reservations FROM (
    SELECT
      res.reservation_id,
      b.title AS book_title,
      res.reservation_date,
      res.expiry_date,
      res.status
    FROM reservation res
    JOIN book b ON res.book_id = b.book_id
    WHERE res.member_id = p_member_id
      AND res.status = 'Pending'
    ORDER BY res.reservation_date DESC
  ) r;

  RETURN jsonb_build_object(
    'member_id',       v_member.member_id,
    'name',            v_member.name,
    'email',           v_member.email,
    'membership_type', v_member.membership_type,
    'status',          v_member.status,
    'join_date',       v_member.join_date,
    'total_borrowed',  v_total_borrowed,
    'active_issues',   v_active_count,
    'fines_paid',      v_fines_paid,
    'fines_pending',   v_fines_pending,
    'borrowing_history', COALESCE(v_history, '[]'::jsonb),
    'active_reservations', COALESCE(v_reservations, '[]'::jsonb)
  );
END;
$$;
