-- ============================================================
-- LIBRARY MANAGEMENT SYSTEM — Triggers
-- Demonstrates: Automated DB operations, event-driven logic,
--               referential integrity enforcement
-- ============================================================

-- TRIGGER 1: After issue insert — auto-update book copy status to 'Issued'
-- Ensures ACID atomicity: copy status always reflects current issue state
CREATE OR REPLACE FUNCTION trg_fn_after_issue_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Automatically mark the copy as Issued when a new issue record is created
  UPDATE book_copy
  SET availability_status = 'Issued'
  WHERE copy_id = NEW.copy_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_issue_insert
  AFTER INSERT ON issue
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_after_issue_insert();


-- TRIGGER 2: After issue update (return) — reset book copy to Available
-- Also triggers reservation queue processing
CREATE OR REPLACE FUNCTION trg_fn_after_return_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_book_id UUID;
BEGIN
  -- Only fire when status transitions from Active to Returned
  IF NEW.status = 'Returned' AND OLD.status = 'Active' THEN
    -- Reset copy availability
    UPDATE book_copy
    SET availability_status = 'Available'
    WHERE copy_id = NEW.copy_id;

    -- Get the book_id for this copy
    SELECT book_id INTO v_book_id
    FROM book_copy
    WHERE copy_id = NEW.copy_id;

    -- Process reservation queue (notify next waiting member)
    PERFORM process_reservation_queue(v_book_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_return_update
  AFTER UPDATE ON issue
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_after_return_update();


-- TRIGGER 3: After fine payment — update member account standing
-- If member clears all fines, reactivate their account if Suspended
CREATE OR REPLACE FUNCTION trg_fn_after_fine_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_member_id    UUID;
  v_unpaid_count INTEGER;
BEGIN
  -- Only fire on payment status change to Paid
  IF NEW.payment_status = 'Paid' AND OLD.payment_status = 'Unpaid' THEN
    -- Find the member associated with this fine's issue
    SELECT i.member_id INTO v_member_id
    FROM issue i
    WHERE i.issue_id = NEW.issue_id;

    -- Count remaining unpaid fines for this member
    SELECT COUNT(*) INTO v_unpaid_count
    FROM fine f
    JOIN issue i ON f.issue_id = i.issue_id
    WHERE i.member_id = v_member_id
      AND f.payment_status = 'Unpaid'
      AND f.fine_id != NEW.fine_id;  -- exclude the one just paid

    -- If no remaining unpaid fines, reactivate suspended member
    IF v_unpaid_count = 0 THEN
      UPDATE member
      SET status = 'Active'
      WHERE member_id = v_member_id
        AND status = 'Suspended';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_fine_payment
  AFTER UPDATE ON fine
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_after_fine_payment();
