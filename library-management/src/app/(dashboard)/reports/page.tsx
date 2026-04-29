'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { ChevronDown, ChevronRight, Code2, BarChart3, TrendingUp, BookOpen } from 'lucide-react'

const SQL_SNIPPETS = {
  stats: `-- VIEW: library_stats_view
-- Demonstrates: Multiple scalar subqueries, COUNT with filters, COALESCE
SELECT
  (SELECT COUNT(*) FROM book) AS total_books,
  (SELECT COUNT(*) FROM book_copy) AS total_copies,
  (SELECT COUNT(*) FROM book_copy
   WHERE availability_status = 'Available') AS available_copies,
  (SELECT COUNT(*) FROM member WHERE status = 'Active') AS total_active_members,
  (SELECT COUNT(*) FROM issue WHERE status = 'Active') AS active_issues,
  (SELECT COUNT(*) FROM issue
   WHERE status = 'Active' AND due_date < CURRENT_DATE) AS overdue_count,
  (SELECT COALESCE(SUM(amount), 0) FROM fine
   WHERE payment_status = 'Paid') AS fines_collected,
  (SELECT COALESCE(SUM(amount), 0) FROM fine
   WHERE payment_status = 'Unpaid') AS fines_pending;`,

  genre: `-- Demonstrates: GROUP BY + COUNT aggregate function
-- Used in /api/reports/genre-distribution
SELECT genre, COUNT(*) AS book_count
FROM book
GROUP BY genre
ORDER BY book_count DESC;`,

  trends: `-- Demonstrates: DATE_TRUNC for time-series grouping
-- Used in /api/reports/borrowing-trends
SELECT
  DATE_TRUNC('week', issue_date::TIMESTAMP) AS week,
  COUNT(*) AS issue_count
FROM issue
WHERE issue_date >= CURRENT_DATE - INTERVAL '84 days'
GROUP BY week
ORDER BY week;`,

  topBooks: `-- VIEW: top_borrowed_books
-- Demonstrates: 4-table JOIN + GROUP BY + aggregate COUNT + STRING_AGG
SELECT
  b.book_id, b.title, b.genre, b.isbn,
  STRING_AGG(DISTINCT a.name, ', ') AS authors,
  COUNT(i.issue_id) AS borrow_count,
  COUNT(i.issue_id) FILTER (WHERE i.status = 'Active') AS currently_borrowed
FROM book b
LEFT JOIN book_copy bc ON b.book_id = bc.book_id
LEFT JOIN issue i ON bc.copy_id = i.copy_id
LEFT JOIN book_author ba ON b.book_id = ba.book_id
LEFT JOIN author a ON ba.author_id = a.author_id
GROUP BY b.book_id, b.title, b.genre, b.isbn
ORDER BY borrow_count DESC LIMIT 10;`,

  issueBook: `-- STORED FUNCTION: issue_book() — PL/pgSQL
-- Demonstrates: Row-level locking, exception handling, atomicity
CREATE OR REPLACE FUNCTION issue_book(
  p_copy_id UUID, p_member_id UUID, p_staff_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_issue_id UUID; v_member_status VARCHAR(20);
  v_borrow_count INTEGER; v_copy_status VARCHAR(20);
BEGIN
  SELECT status INTO v_member_status FROM member
  WHERE member_id = p_member_id FOR UPDATE;   -- Row-level lock

  IF v_member_status != 'Active' THEN
    RAISE EXCEPTION 'Member account is %. Only Active members can borrow.', v_member_status;
  END IF;

  v_borrow_count := get_borrowing_count(p_member_id);
  IF v_borrow_count >= 3 THEN
    RAISE EXCEPTION 'Borrowing limit of 3 books exceeded.';
  END IF;

  -- Check unpaid fines, copy availability...
  INSERT INTO issue (copy_id, member_id, staff_id, issue_date, due_date, status)
  VALUES (p_copy_id, p_member_id, p_staff_id, CURRENT_DATE,
          CURRENT_DATE + INTERVAL '14 days', 'Active')
  RETURNING issue_id INTO v_issue_id;

  RETURN v_issue_id;  -- Trigger fires on INSERT
END; $$;`,

  triggers: `-- TRIGGER 1: Auto-update book_copy status on issue
CREATE TRIGGER trg_after_issue_insert
  AFTER INSERT ON issue FOR EACH ROW
  EXECUTE FUNCTION trg_fn_after_issue_insert();
-- Function: UPDATE book_copy SET availability_status='Issued'

-- TRIGGER 2: Reset status on book return + process reservations
CREATE TRIGGER trg_after_return_update
  AFTER UPDATE ON issue FOR EACH ROW
  EXECUTE FUNCTION trg_fn_after_return_update();
-- Function: UPDATE book_copy SET availability_status='Available'
--           PERFORM process_reservation_queue(book_id)

-- TRIGGER 3: Reactivate member when all fines paid
CREATE TRIGGER trg_after_fine_payment
  AFTER UPDATE ON fine FOR EACH ROW
  EXECUTE FUNCTION trg_fn_after_fine_payment();
-- Function: IF no remaining Unpaid fines → UPDATE member SET status='Active'`,

  normalization: `-- 3NF Schema: 9 normalized tables
-- BOOK → AUTHOR (M:M via BOOK_AUTHOR junction table)
-- Eliminates repeating groups (1NF) + partial dependencies (2NF)
-- Example: BOOK_AUTHOR stores only (book_id, author_id)
--   NOT: book_id, isbn, title, author_name, author_nationality
--   That would violate 2NF (author_name depends only on author_id)

-- Functional dependencies verified:
-- book_id → {isbn, title, genre, publisher, edition, year_published}
-- author_id → {name, nationality, bio}
-- member_id → {name, email, mobile_no, dob, membership_type, join_date}
-- copy_id → {book_id, condition, availability_status, location_shelf}
-- issue_id → {copy_id, member_id, staff_id, issue_date, due_date}
-- fine_id → {issue_id, amount, fine_date, payment_status}
-- No transitive dependencies → 3NF ✓`,
}

function SqlBlock({ sql, label }: { sql: string; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-md border border-border mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Code2 className="h-3.5 w-3.5 text-blue-500" />
        <span className="font-medium">{label}</span>
        {open ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-border">
          <pre className="text-xs bg-muted/60 dark:bg-muted/30 p-3 rounded-sm font-mono overflow-x-auto leading-relaxed mt-2 whitespace-pre-wrap">
            {sql}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/reports/stats')
      if (!res.ok) throw new Error('Failed to load stats')
      return (await res.json()).data ?? null
    },
  })

  const { data: genreData, isLoading: genreLoading } = useQuery({
    queryKey: ['genre-distribution'],
    queryFn: async () => {
      const res = await fetch('/api/reports/genre-distribution')
      if (!res.ok) throw new Error('Failed to load genre data')
      return (await res.json()).data ?? []
    },
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['borrowing-trends'],
    queryFn: async () => {
      const res = await fetch('/api/reports/borrowing-trends')
      if (!res.ok) throw new Error('Failed to load trends')
      return (await res.json()).data ?? []
    },
  })

  const { data: topBooksData, isLoading: topLoading } = useQuery({
    queryKey: ['top-books'],
    queryFn: async () => {
      const res = await fetch('/api/reports/top-books')
      if (!res.ok) throw new Error('Failed to load top books')
      return (await res.json()).data ?? []
    },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">
          DBMS Query Showcase — SQL transparency enabled for each data source
        </p>
      </div>

      {/* Stats Summary */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Library Statistics</h2>
          <Badge variant="outline" className="text-xs">library_stats_view</Badge>
        </div>
        {statsLoading ? (
          <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: 'Total Books', value: stats?.total_books },
              { label: 'Active Members', value: stats?.total_active_members },
              { label: 'Overdue Count', value: stats?.overdue_count, alert: stats?.overdue_count > 0 },
              { label: 'Revenue (Fines)', value: formatCurrency(stats?.fines_collected ?? 0) },
            ].map(({ label, value, alert }) => (
              <Card key={label} className={alert ? 'border-orange-300 dark:border-orange-700' : ''}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${alert ? 'text-orange-600' : ''}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <SqlBlock sql={SQL_SNIPPETS.stats} label="View SQL: library_stats_view (scalar subqueries + COALESCE)" />
      </section>

      <Separator />

      {/* Genre Distribution */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Genre Distribution</h2>
          <Badge variant="outline" className="text-xs">GROUP BY genre</Badge>
        </div>
        <Card>
          <CardContent className="p-4">
            {genreLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={genreData} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="genre"
                    tick={{ fontSize: 11 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Books" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <SqlBlock sql={SQL_SNIPPETS.genre} label="View SQL: GROUP BY genre + COUNT aggregate" />
      </section>

      <Separator />

      {/* Borrowing Trends */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Borrowing Trends (12 Weeks)</h2>
          <Badge variant="outline" className="text-xs">DATE_TRUNC + GROUP BY</Badge>
        </div>
        <Card>
          <CardContent className="p-4">
            {trendsLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendsData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Issues"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <SqlBlock sql={SQL_SNIPPETS.trends} label="View SQL: DATE_TRUNC('week') + GROUP BY for time-series" />
      </section>

      <Separator />

      {/* Top Borrowed Books */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Top Borrowed Books</h2>
          <Badge variant="outline" className="text-xs">top_borrowed_books view</Badge>
        </div>
        <Card>
          <CardContent className="p-0">
            {topLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium w-8">#</th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Title</th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium hidden sm:table-cell">Authors</th>
                      <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Genre</th>
                      <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Borrowed</th>
                      <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium hidden md:table-cell">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topBooksData?.map((book: {
                      book_id: string
                      title: string
                      authors: string | null
                      genre: string
                      borrow_count: number
                      currently_borrowed: number
                    }, idx: number) => (
                      <tr key={book.book_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="py-3 px-4 text-muted-foreground font-medium">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{book.title}</p>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell text-xs">{book.authors}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{book.genre}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{book.borrow_count}</td>
                        <td className="py-3 px-4 text-right text-muted-foreground hidden md:table-cell">{book.currently_borrowed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <SqlBlock sql={SQL_SNIPPETS.topBooks} label="View SQL: top_borrowed_books (4-table JOIN + GROUP BY + STRING_AGG)" />
      </section>

      <Separator />

      {/* DBMS Components Showcase */}
      <section>
        <h2 className="font-semibold mb-4">DBMS Components Implemented</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Code2 className="h-4 w-4 text-blue-500" />Stored Procedure: issue_book()</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Enforces eligibility checks (member status, borrow limit, unpaid fines), row-level locking, and atomic INSERT with exception handling.
              </p>
              <SqlBlock sql={SQL_SNIPPETS.issueBook} label="View full PL/pgSQL stored function" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Code2 className="h-4 w-4 text-orange-500" />Triggers (3 automated)</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Automatically maintains book_copy availability status, processes reservation queues, and reactivates member accounts — all triggered by data events.
              </p>
              <SqlBlock sql={SQL_SNIPPETS.triggers} label="View all trigger definitions" />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Code2 className="h-4 w-4 text-green-500" />Normalization (3NF) — 9-table Schema</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Schema decomposed to 3NF: no repeating groups (1NF), no partial dependencies on composite keys (2NF), no transitive dependencies (3NF). BOOK_AUTHOR junction table demonstrates M:M decomposition.
              </p>
              <SqlBlock sql={SQL_SNIPPETS.normalization} label="View functional dependency analysis" />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
