-- ============================================================
-- LIBRARY MANAGEMENT SYSTEM — Views
-- Demonstrates: JOINs, Aggregates, GROUP BY, STRING_AGG, Subqueries
-- ============================================================

-- VIEW 1: Available books with author names (multi-table JOIN + STRING_AGG aggregate)
-- Shows books that have at least one copy currently available
CREATE OR REPLACE VIEW available_books_view AS
SELECT
  b.book_id,
  b.isbn,
  b.title,
  b.genre,
  b.publisher,
  b.edition,
  b.year_published,
  STRING_AGG(a.name, ', ' ORDER BY a.name) AS authors,
  COUNT(bc.copy_id) FILTER (WHERE bc.availability_status = 'Available') AS available_copies,
  COUNT(bc.copy_id) AS total_copies
FROM book b
LEFT JOIN book_author ba ON b.book_id = ba.book_id
LEFT JOIN author a ON ba.author_id = a.author_id
LEFT JOIN book_copy bc ON b.book_id = bc.book_id
GROUP BY b.book_id, b.isbn, b.title, b.genre, b.publisher, b.edition, b.year_published
HAVING COUNT(bc.copy_id) FILTER (WHERE bc.availability_status = 'Available') > 0
   OR COUNT(bc.copy_id) = 0;


-- VIEW 2: Member borrowing dashboard (multi-JOIN with computed columns)
-- Active issues with book details and days remaining/overdue
CREATE OR REPLACE VIEW member_borrowing_dashboard AS
SELECT
  i.issue_id,
  i.member_id,
  m.name AS member_name,
  m.email AS member_email,
  m.membership_type,
  bc.copy_id,
  bc.location_shelf,
  b.book_id,
  b.title AS book_title,
  b.genre,
  i.issue_date,
  i.due_date,
  i.return_date,
  i.status,
  (i.due_date - CURRENT_DATE) AS days_remaining,
  CASE
    WHEN i.due_date < CURRENT_DATE AND i.status = 'Active'
    THEN (CURRENT_DATE - i.due_date)
    ELSE 0
  END AS days_overdue
FROM issue i
JOIN book_copy bc ON i.copy_id = bc.copy_id
JOIN book b ON bc.book_id = b.book_id
JOIN member m ON i.member_id = m.member_id
WHERE i.status = 'Active';


-- VIEW 3: Overdue issues (filtered view with fine calculation)
-- Demonstrates: Subquery-like filtered JOIN + arithmetic on dates
CREATE OR REPLACE VIEW overdue_issues_view AS
SELECT
  i.issue_id,
  i.member_id,
  m.name AS member_name,
  m.email AS member_email,
  m.mobile_no AS member_mobile,
  bc.copy_id,
  b.book_id,
  b.title AS book_title,
  b.isbn,
  i.issue_date,
  i.due_date,
  (CURRENT_DATE - i.due_date) AS days_overdue,
  (CURRENT_DATE - i.due_date) * 5 AS calculated_fine,
  f.fine_id,
  f.amount AS existing_fine_amount,
  f.payment_status AS fine_payment_status
FROM issue i
JOIN book_copy bc ON i.copy_id = bc.copy_id
JOIN book b ON bc.book_id = b.book_id
JOIN member m ON i.member_id = m.member_id
LEFT JOIN fine f ON i.issue_id = f.issue_id
WHERE i.status = 'Active'
  AND i.due_date < CURRENT_DATE;


-- VIEW 4: Library statistics (aggregate summary — single-row view)
-- Demonstrates: Multiple aggregates, COUNT with filter, SUM with CASE
CREATE OR REPLACE VIEW library_stats_view AS
SELECT
  (SELECT COUNT(*) FROM book) AS total_books,
  (SELECT COUNT(*) FROM book_copy) AS total_copies,
  (SELECT COUNT(*) FROM book_copy WHERE availability_status = 'Available') AS available_copies,
  (SELECT COUNT(*) FROM member WHERE status = 'Active') AS total_active_members,
  (SELECT COUNT(*) FROM member) AS total_members,
  (SELECT COUNT(*) FROM issue WHERE status = 'Active') AS active_issues,
  (SELECT COUNT(*) FROM issue WHERE status = 'Active' AND due_date < CURRENT_DATE) AS overdue_count,
  (SELECT COUNT(*) FROM reservation WHERE status = 'Pending') AS pending_reservations,
  (SELECT COALESCE(SUM(amount), 0) FROM fine WHERE payment_status = 'Paid') AS fines_collected,
  (SELECT COALESCE(SUM(amount), 0) FROM fine WHERE payment_status = 'Unpaid') AS fines_pending;


-- VIEW 5: Top borrowed books (GROUP BY + ORDER BY + aggregate COUNT)
-- Demonstrates: JOIN across 4 tables, GROUP BY, aggregate function, ORDER BY
CREATE OR REPLACE VIEW top_borrowed_books AS
SELECT
  b.book_id,
  b.title,
  b.genre,
  b.isbn,
  STRING_AGG(DISTINCT a.name, ', ') AS authors,
  COUNT(i.issue_id) AS borrow_count,
  COUNT(i.issue_id) FILTER (WHERE i.status = 'Active') AS currently_borrowed
FROM book b
LEFT JOIN book_copy bc ON b.book_id = bc.book_id
LEFT JOIN issue i ON bc.copy_id = i.copy_id
LEFT JOIN book_author ba ON b.book_id = ba.book_id
LEFT JOIN author a ON ba.author_id = a.author_id
GROUP BY b.book_id, b.title, b.genre, b.isbn
ORDER BY borrow_count DESC
LIMIT 10;
