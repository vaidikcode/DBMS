#!/usr/bin/env node
/**
 * Generates an updated project.pdf with actual outcomes replacing Section 13.
 * Run after the application is built: node scripts/update-pdf.js
 */

const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

const ACTUAL_OUTCOMES = [
  'Implemented a 9-table normalized PostgreSQL schema in Supabase (3NF), with UUID primary keys, CHECK constraints as ENUMs, and a partial unique index on RESERVATION for duplicate prevention.',
  'Created 5 SQL views: <code>available_books_view</code>, <code>member_borrowing_dashboard</code>, <code>overdue_issues_view</code>, <code>library_stats_view</code>, and <code>top_borrowed_books</code> — demonstrating multi-table JOINs, STRING_AGG, COUNT with FILTER, DATE arithmetic, and aggregate functions.',
  'Implemented 7 PL/pgSQL stored functions: <code>issue_book()</code>, <code>return_book()</code>, <code>calculate_fine()</code>, <code>check_availability()</code>, <code>get_borrowing_count()</code>, <code>process_reservation_queue()</code>, and <code>generate_member_report()</code> — callable via Supabase RPC.',
  'Implemented 3 PostgreSQL triggers: <code>trg_after_issue_insert</code> (auto-sets book copy to Issued), <code>trg_after_return_update</code> (resets availability and processes reservation queue via cursor), and <code>trg_after_fine_payment</code> (reactivates suspended members when all fines cleared).',
  'ACID-compliant issue and return transactions: <code>issue_book()</code> uses <code>SELECT … FOR UPDATE</code> row-level locking to prevent concurrent duplicate issues, and <code>RAISE EXCEPTION</code> triggers automatic ROLLBACK on constraint violations.',
  'Built a full-stack Next.js 14 application with 7 modules: Dashboard, Books Catalog, Member Management, Issue/Return, Reservation Queue, Fines Payment, and Analytics/Reports.',
  'Implemented an Analytics/Reports page with a <strong>SQL Transparency</strong> feature: each chart includes a collapsible panel showing the exact SQL query, view definition, or PL/pgSQL function used — directly demonstrating DBMS concepts to evaluators.',
  'Visualized borrowing trends (line chart via DATE_TRUNC week-grouping), genre distribution (bar chart via GROUP BY), and top-borrowed books (JOIN + aggregate view) using Recharts.',
  'Implemented role-based UI (Admin / Librarian / Member) via a mock role-switcher, controlling visibility of management features and action buttons.',
  'Updated technology stack from MySQL 8.0 + MySQL Workbench to <strong>PostgreSQL (Supabase)</strong> + <strong>PL/pgSQL</strong> + <strong>Next.js 14 (TypeScript)</strong>, retaining all DBMS concepts and adding real-time web interface.',
  'Seeded 30 book copies across 15 titles and 16 authors (including multi-author CLRS demonstrating BOOK_AUTHOR M:M junction), 10 members, 3 staff, 33 issues (25 historical + 8 active), 5 reservations, and 8 fines for complete demo data.',
]

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      padding: 2cm 2.5cm;
    }
    h1.doc-title {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .subtitle { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 4px; }
    .center { text-align: center; margin-bottom: 3px; }
    .bold { font-weight: bold; }
    hr { border: none; border-top: 1px solid #000; margin: 12px 0; }
    h2 { font-size: 12pt; font-weight: bold; margin: 20px 0 8px; }
    h3 { font-size: 11pt; font-weight: bold; margin: 14px 0 6px; }
    p { margin-bottom: 8px; text-align: justify; }
    ul { margin: 6px 0 8px 20px; }
    li { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #000; padding: 5px 8px; font-size: 10.5pt; }
    th { background: #f0f0f0; font-weight: bold; text-align: left; }
    .section { margin-top: 18px; }
    code {
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      background: #f5f5f5;
      padding: 1px 3px;
      border-radius: 2px;
    }
    .outcomes-section {
      border: 2px solid #000;
      padding: 14px 18px;
      margin: 10px 0;
      background: #fafafa;
    }
    .outcome-item {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: flex-start;
    }
    .bullet { font-size: 14pt; line-height: 1.2; color: #333; flex-shrink: 0; }
  </style>
</head>
<body>

<h1 class="doc-title">LIBRARY MANAGEMENT SYSTEM</h1>
<p class="subtitle">DBMS Project Synopsis</p>
<p class="center">Course Code: UCS310</p>
<p class="center">BTech 2nd Year</p>
<p class="center" style="margin-top:8px">Submitted to:</p>
<p class="center bold">Dr. Shifali Goyal</p>
<p class="center">Thapar Institute of Engineering and Technology</p>
<p class="center" style="margin-top:8px">Group Members:</p>
<p class="center">Harsh Runda (1024170151)</p>
<p class="center">Aviral Agrawal (1024170169)</p>
<p class="center">Vaidik Bhardwaj (1024170234)</p>
<p class="center">Academic Year: 2025-2026</p>
<hr />

<div class="section">
<h2>1. INTRODUCTION</h2>
<p>With the growing demand for organized and digitized resource management, libraries require efficient systems to catalog books, manage memberships, track borrowings, and handle fines at scale. A Library Management System (LMS) serves as the central platform for administering all library operations, from book acquisition to member record maintenance.</p>
<p>Currently, many libraries rely on manual registers, spreadsheets, and disconnected tools, leading to data redundancy, delayed processing, inaccurate fine calculations, and poor inventory visibility.</p>
<h3>1.1 Motivation</h3>
<ul>
  <li>Need for an efficient, centralized system to manage thousands of books and member records.</li>
  <li>Ensuring transparent tracking of book issues, returns, reservations, and overdue fines.</li>
  <li>Reducing manual errors and improving data integrity in library workflows.</li>
  <li>Enabling real-time availability monitoring for members and librarians.</li>
</ul>
<h3>1.2 Importance of DBMS</h3>
<p>A Database Management System (DBMS) is essential for this system because:</p>
<ul>
  <li>Centralizes data storage for books, members, staff, transactions, and fines.</li>
  <li>Ensures ACID properties (Atomicity, Consistency, Isolation, Durability) for critical library transactions.</li>
  <li>Provides efficient querying and reporting capabilities for inventory and usage analysis.</li>
  <li>Maintains data consistency through referential integrity constraints.</li>
</ul>
</div>

<div class="section">
<h2>2. PROBLEM STATEMENT</h2>
<p>Managing library operations through manual or disconnected systems involves:</p>
<ul>
  <li>Managing information about large book collections across multiple categories and authors.</li>
  <li>Storing membership data and tracking borrowing privileges for each member.</li>
  <li>Processing book issues, returns, and reservations across multiple branches.</li>
  <li>Tracking overdue items and accurately computing fines.</li>
</ul>
<h3>2.1 Limitations of Manual/File-Based Systems</h3>
<ul>
  <li>Data redundancy and inconsistency across different registers and spreadsheets.</li>
  <li>Difficult to handle large-scale concurrent book and member data access.</li>
  <li>No built-in mechanisms for data validation and borrowing limit constraints.</li>
  <li>Slow query processing for complex reporting and inventory analytics.</li>
  <li>No recovery mechanism in case of system failure or data loss.</li>
</ul>
<h3>2.2 Scope of Database Solution</h3>
<p>The proposed DBMS solution will:</p>
<ul>
  <li>Store and manage information about books, members, staff, and transactions.</li>
  <li>Support book reservations, issues, and returns with proper due-date tracking.</li>
  <li>Ensure data integrity and consistency throughout all library operations.</li>
</ul>
</div>

<div class="section">
<h2>3. OBJECTIVES OF THE PROJECT</h2>
<ul>
  <li>To design a normalized database schema using E-R data modelling for the library management system.</li>
  <li>To convert the ER model into relational tables with proper keys and relationships.</li>
  <li>To apply normalization techniques (1NF, 2NF, 3NF/BCNF) to eliminate data anomalies.</li>
  <li>To implement the database schema using SQL DDL and DML commands.</li>
  <li>To develop PL/SQL constructs including stored procedures, functions, triggers, and cursors for automated operations.</li>
  <li>To ensure data consistency and integrity using constraints, transactions, and exception handling.</li>
</ul>
</div>

<div class="section">
<h2>4. SCOPE OF THE PROJECT</h2>
<h3>4.1 Functional Boundaries</h3>
<p>The system handles:</p>
<ul>
  <li>Book Catalog and Inventory Management</li>
  <li>Member Registration and Profile Management</li>
  <li>Book Issue, Return, and Reservation Tracking</li>
  <li>Fine Calculation and Payment Processing</li>
  <li>Staff and Role Management</li>
</ul>
<h3>4.2 Types of Users</h3>
<ul>
  <li><b>Admin:</b> Manages the entire system, users, book catalog, and configuration.</li>
  <li><b>Librarian:</b> Issues and receives books, manages reservations, and processes fines.</li>
  <li><b>Member:</b> Searches the catalog, reserves books, and views borrowing history.</li>
</ul>
<h3>4.3 Modules</h3>
<ul>
  <li>Book Catalog &amp; Inventory Module</li>
  <li>Member Management Module</li>
  <li>Book Issue &amp; Return Module</li>
  <li>Reservation Management Module</li>
  <li>Fine &amp; Payment Module</li>
</ul>
</div>

<div class="section">
<h2>5. PROPOSED SYSTEM DESCRIPTION</h2>
<h3>5.1 Overall Architecture</h3>
<p>The Library Management System is a centralized database solution that manages the complete library lifecycle. It integrates book records, member profiles, staff information, transaction logs, reservation queues, and fine records in a single normalized database.</p>
<h3>5.2 Key Features</h3>
<ul>
  <li><b>Centralized Database:</b> Single source of truth for all library and catalog data.</li>
  <li><b>Multi-Copy Book Support:</b> Handle multiple copies of the same title with individual tracking.</li>
  <li><b>Data Integrity:</b> Constraints and triggers ensure no duplicate issues or invalid returns.</li>
  <li><b>Real-time Updates:</b> Automated availability and fine tracking for members.</li>
  <li><b>Transaction Management:</b> ACID-compliant issue, return, and payment operations.</li>
</ul>
</div>

<div class="section">
<h2>6. DATABASE DESIGN</h2>
<h3>6.1 Entity-Relationship Diagram</h3>
<table>
  <tr><th>Entity</th><th>Description</th></tr>
  <tr><td>BOOK</td><td>Stores title, ISBN, genre, publisher, and edition details</td></tr>
  <tr><td>AUTHOR</td><td>Author name and biographical information</td></tr>
  <tr><td>MEMBER</td><td>Member personal details, membership type, and join date</td></tr>
  <tr><td>STAFF</td><td>Librarian and admin staff profiles and roles</td></tr>
  <tr><td>BOOK_COPY</td><td>Individual physical copies of each book with availability status</td></tr>
  <tr><td>ISSUE</td><td>Records of book copies issued to members with due dates</td></tr>
  <tr><td>RESERVATION</td><td>Member reservations for currently unavailable books</td></tr>
  <tr><td>FINE</td><td>Overdue fines associated with each late return transaction</td></tr>
</table>
<h3>6.2 Relationships and Cardinality</h3>
<table>
  <tr><th>Relationship</th><th>Cardinality</th><th>Description</th></tr>
  <tr><td>AUTHOR → BOOK</td><td>M : M</td><td>Many authors can write many books</td></tr>
  <tr><td>BOOK → BOOK_COPY</td><td>1 : M</td><td>One book title has many physical copies</td></tr>
  <tr><td>MEMBER → ISSUE</td><td>1 : M</td><td>One member can have multiple active issues</td></tr>
  <tr><td>BOOK_COPY → ISSUE</td><td>1 : M</td><td>One copy can be issued multiple times (sequentially)</td></tr>
  <tr><td>MEMBER → RESERVATION</td><td>1 : M</td><td>One member can reserve multiple books</td></tr>
  <tr><td>BOOK → RESERVATION</td><td>1 : M</td><td>One book can be reserved by multiple members</td></tr>
  <tr><td>ISSUE → FINE</td><td>1 : 1</td><td>Each overdue issue generates one fine record</td></tr>
  <tr><td>STAFF → ISSUE</td><td>1 : M</td><td>One staff member processes many issue transactions</td></tr>
</table>
</div>

<div class="section">
<h2>7. RELATIONAL SCHEMA</h2>
<p><b>BOOK</b> (Book_ID, ISBN, Title, Genre, Publisher, Edition, Year_Published)</p>
<p><b>AUTHOR</b> (Author_ID, Name, Nationality, Bio)</p>
<p><b>BOOK_AUTHOR</b> (Book_ID, Author_ID) — Junction table for M:M relationship</p>
<p><b>MEMBER</b> (Member_ID, Name, Email, Mobile_No, Date_of_Birth, Membership_Type, Join_Date, Status)</p>
<p><b>STAFF</b> (Staff_ID, Name, Email, Role, Mobile_No, Join_Date)</p>
<p><b>BOOK_COPY</b> (Copy_ID, Book_ID, Condition, Availability_Status, Location_Shelf)</p>
<p><b>ISSUE</b> (Issue_ID, Copy_ID, Member_ID, Staff_ID, Issue_Date, Due_Date, Return_Date, Status)</p>
<p><b>RESERVATION</b> (Reservation_ID, Book_ID, Member_ID, Reservation_Date, Expiry_Date, Status)</p>
<p><b>FINE</b> (Fine_ID, Issue_ID, Amount, Fine_Date, Payment_Status, Payment_Date)</p>
</div>

<div class="section">
<h2>8. NORMALIZATION</h2>
<h3>8.1 Functional Dependencies</h3>
<ul>
  <li>BOOK: Book_ID → {ISBN, Title, Genre, Publisher, Edition, Year_Published}</li>
  <li>MEMBER: Member_ID → {Name, Email, Mobile_No, Date_of_Birth, Membership_Type, Join_Date}</li>
  <li>BOOK_COPY: Copy_ID → {Book_ID, Condition, Availability_Status, Location_Shelf}</li>
  <li>ISSUE: Issue_ID → {Copy_ID, Member_ID, Staff_ID, Issue_Date, Due_Date, Return_Date}</li>
  <li>FINE: Fine_ID → {Issue_ID, Amount, Fine_Date, Payment_Status}</li>
</ul>
<h3>8.2 Normalization Process</h3>
<p><b>First Normal Form (1NF):</b> All attributes contain atomic values with no repeating groups. All tables meet 1NF requirements.</p>
<p><b>Second Normal Form (2NF):</b> All non-key attributes are fully dependent on the primary key. No partial dependencies exist in any composite key table (e.g., BOOK_AUTHOR only stores the relationship).</p>
<p><b>Third Normal Form (3NF):</b> No transitive dependencies exist. All non-key attributes depend only on the primary key, not on other non-key attributes. The final schema is in 3NF.</p>
</div>

<div class="section">
<h2>9. DATABASE IMPLEMENTATION</h2>
<h3>9.1 SQL DDL Commands</h3>
<ul>
  <li>CREATE commands: CREATE TABLE for all nine entities with constraints</li>
  <li>ALTER commands: Modify table structures and add/drop constraints</li>
  <li>DROP commands: Remove tables and indexes when needed</li>
</ul>
<h3>9.2 SQL DML Commands</h3>
<ul>
  <li>INSERT: Add new books, members, staff, copies, and fine records</li>
  <li>UPDATE: Modify book details, update copy availability and fine payment status</li>
  <li>DELETE: Remove expired reservations or deactivated member accounts</li>
</ul>
<h3>9.3 SQL SELECT Queries</h3>
<ul>
  <li>Joins: Inner and outer joins to link books with copies, issues, and members</li>
  <li>Subqueries: Find most borrowed books, members with outstanding fines</li>
  <li>Aggregate Functions: COUNT (copies), SUM (fine amounts), AVG (borrowing duration)</li>
  <li>GROUP BY &amp; HAVING: Genre-wise inventory, overdue rates per membership type</li>
  <li>Views: Create virtual tables for available books and member borrowing dashboards</li>
</ul>
</div>

<div class="section">
<h2>10. PL/SQL COMPONENTS</h2>
<h3>10.1 Stored Procedures</h3>
<ul>
  <li>IssueBook(): Automate book issue with eligibility and availability checks</li>
  <li>ReturnBook(): Process book returns and trigger fine calculation if overdue</li>
  <li>GenerateMemberReport(): Produce comprehensive borrowing history and fine summaries</li>
</ul>
<h3>10.2 Functions</h3>
<ul>
  <li>CalculateFine(): Return overdue fine amount based on days late and membership type</li>
  <li>CheckAvailability(): Verify if at least one copy of a book is currently available</li>
  <li>GetBorrowingCount(): Return the number of active issues for a given member</li>
</ul>
<h3>10.3 Triggers</h3>
<ul>
  <li>AfterIssueInsert: Update BOOK_COPY availability status to 'Issued' automatically</li>
  <li>AfterReturnUpdate: Reset BOOK_COPY status to 'Available' and notify reservation queue</li>
  <li>AfterFinePayment: Mark fine as paid and update member account standing</li>
</ul>
<h3>10.4 Cursors</h3>
<ul>
  <li>OverdueCursor: Iterate through all overdue issues for batch fine generation</li>
  <li>ReservationCursor: Process the reservation queue when a book copy becomes available</li>
</ul>
<h3>10.5 Exception Handling</h3>
<ul>
  <li>Handle constraint violations (primary key, foreign key, duplicate reservations)</li>
  <li>Catch business logic errors (borrow limit exceeded, expired membership)</li>
  <li>Log errors and rollback on critical transaction failures</li>
</ul>
</div>

<div class="section">
<h2>11. TRANSACTION MANAGEMENT &amp; CONCURRENCY</h2>
<h3>11.1 ACID Properties</h3>
<ul>
  <li><b>Atomicity:</b> All-or-nothing book issue and fine payment transactions</li>
  <li><b>Consistency:</b> Database constraints always satisfied during any operation</li>
  <li><b>Isolation:</b> Independent concurrent member and librarian transactions</li>
  <li><b>Durability:</b> Committed issue and payment records are permanent</li>
</ul>
<h3>11.2 Transaction Control</h3>
<ul>
  <li>COMMIT: Finalize successful issue, return, and payment entries</li>
  <li>ROLLBACK: Undo failed reservation or fine processing attempts</li>
  <li>SAVEPOINT: Create recovery points within multi-step return transactions</li>
</ul>
<h3>11.3 Concurrency Control</h3>
<ul>
  <li>Row-level locking (SELECT … FOR UPDATE) to prevent simultaneous issue of the same book copy</li>
  <li>Read locks for catalog queries, write locks for issue and return operations</li>
</ul>
</div>

<div class="section">
<h2>12. TOOLS &amp; TECHNOLOGIES USED</h2>
<table>
  <tr><th>Component</th><th>Technology</th></tr>
  <tr><td>DBMS</td><td>PostgreSQL 15 (via Supabase)</td></tr>
  <tr><td>Query Language</td><td>SQL (Structured Query Language)</td></tr>
  <tr><td>Procedural Language</td><td>PL/pgSQL (PostgreSQL Procedural Language)</td></tr>
  <tr><td>Backend Framework</td><td>Next.js 14 (App Router, TypeScript)</td></tr>
  <tr><td>Frontend UI</td><td>React, Tailwind CSS, shadcn/ui, Recharts</td></tr>
  <tr><td>Database Client</td><td>Supabase JavaScript SDK (@supabase/ssr)</td></tr>
  <tr><td>IDE / Tool</td><td>Supabase SQL Editor, VS Code</td></tr>
</table>
</div>

<div class="section">
<h2>13. ACTUAL OUTCOMES</h2>
<p>The following outcomes were achieved through the implementation of this project:</p>
<div class="outcomes-section">
${ACTUAL_OUTCOMES.map(o => `  <div class="outcome-item"><span class="bullet">•</span><span>${o}</span></div>`).join('\n')}
</div>
</div>

<div class="section">
<h2>14. CONCLUSION</h2>
<p>The Library Management System project demonstrates the practical application of database design principles, normalization techniques, and PL/SQL programming. By implementing this system, we showcase:</p>
<ul>
  <li>The importance of proper database design for managing complex library data scenarios.</li>
  <li>How to ensure data consistency and integrity in mission-critical library applications.</li>
  <li>Advanced SQL and PL/SQL techniques for automating library business processes.</li>
  <li>Best practices for transaction management and concurrency control in multi-user environments.</li>
</ul>
<p>This project provides a solid foundation for understanding database management systems and their applications in large-scale library and resource administration systems. The implementation was extended beyond the original synopsis to include a fully functional web application interface built with Next.js 14 and Supabase, making all DBMS concepts observable through a real-time interactive dashboard.</p>
</div>

</body>
</html>`

async function generatePDF() {
  const outputPath = path.resolve(__dirname, '../../project.pdf')

  console.log('Launching browser...')
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.setContent(HTML, { waitUntil: 'networkidle0' })

  console.log('Generating PDF...')
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '1.5cm', bottom: '1.5cm', left: '2cm', right: '2cm' },
    printBackground: true,
  })

  await browser.close()

  const stats = fs.statSync(outputPath)
  console.log(`✓ PDF generated: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`)
}

generatePDF().catch(console.error)
