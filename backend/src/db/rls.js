const prisma = require('../config/database');
const logger = require('../utils/logger');

const RLS_SQL = `
-- Enable RLS on all tables
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sanction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS users_faculty_all ON users;
DROP POLICY IF EXISTS users_student_self ON users;
DROP POLICY IF EXISTS students_faculty_all ON students;
DROP POLICY IF EXISTS students_student_self ON students;
DROP POLICY IF EXISTS students_student_update ON students;
DROP POLICY IF EXISTS faculty_faculty_all ON faculty;
DROP POLICY IF EXISTS courses_faculty_all ON courses;
DROP POLICY IF EXISTS courses_student_read ON courses;
DROP POLICY IF EXISTS announcements_faculty_all ON announcements;
DROP POLICY IF EXISTS announcements_student_read ON announcements;
DROP POLICY IF EXISTS announcement_attachments_faculty_all ON announcement_attachments;
DROP POLICY IF EXISTS announcement_attachments_student_read ON announcement_attachments;
DROP POLICY IF EXISTS events_faculty_all ON events;
DROP POLICY IF EXISTS events_student_read ON events;
DROP POLICY IF EXISTS attendance_records_faculty_all ON attendance_records;
DROP POLICY IF EXISTS attendance_records_student_self ON attendance_records;
DROP POLICY IF EXISTS sanction_rules_faculty_all ON sanction_rules;
DROP POLICY IF EXISTS sanction_rules_student_read ON sanction_rules;
DROP POLICY IF EXISTS sanctions_faculty_all ON sanctions;
DROP POLICY IF EXISTS sanctions_student_self ON sanctions;
DROP POLICY IF EXISTS balances_faculty_all ON balances;
DROP POLICY IF EXISTS balances_student_self ON balances;
DROP POLICY IF EXISTS payment_methods_faculty_all ON payment_methods;
DROP POLICY IF EXISTS payment_methods_student_read ON payment_methods;
DROP POLICY IF EXISTS payments_faculty_all ON payments;
DROP POLICY IF EXISTS payments_student_self ON payments;
DROP POLICY IF EXISTS disputes_faculty_all ON disputes;
DROP POLICY IF EXISTS disputes_student_self ON disputes;
DROP POLICY IF EXISTS feedback_faculty_all ON feedback;
DROP POLICY IF EXISTS feedback_student_insert ON feedback;
DROP POLICY IF EXISTS feedback_student_self ON feedback;
DROP POLICY IF EXISTS audit_files_faculty_all ON audit_files;
DROP POLICY IF EXISTS audit_files_student_read ON audit_files;

-- Users
CREATE POLICY users_faculty_all ON users FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY users_student_self ON users FOR SELECT USING (id::text = auth.uid()::text);

-- Students
CREATE POLICY students_faculty_all ON students FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY students_student_self ON students FOR SELECT USING (id::text = auth.uid()::text);
CREATE POLICY students_student_update ON students FOR UPDATE USING (id::text = auth.uid()::text);

-- Faculty
CREATE POLICY faculty_faculty_all ON faculty FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');

-- Courses
CREATE POLICY courses_faculty_all ON courses FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY courses_student_read ON courses FOR SELECT USING (auth.jwt() ->> 'app_role' = 'student');

-- Announcements
CREATE POLICY announcements_faculty_all ON announcements FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY announcements_student_read ON announcements FOR SELECT USING (auth.jwt() ->> 'app_role' = 'student');

-- Announcement attachments
CREATE POLICY announcement_attachments_faculty_all ON announcement_attachments FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY announcement_attachments_student_read ON announcement_attachments FOR SELECT USING (auth.jwt() ->> 'app_role' = 'student');

-- Events
CREATE POLICY events_faculty_all ON events FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY events_student_read ON events FOR SELECT USING (auth.jwt() ->> 'app_role' = 'student');

-- Attendance records
CREATE POLICY attendance_records_faculty_all ON attendance_records FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY attendance_records_student_self ON attendance_records FOR SELECT USING (student_id::text = auth.uid()::text);

-- Sanction rules
CREATE POLICY sanction_rules_faculty_all ON sanction_rules FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY sanction_rules_student_read ON sanction_rules FOR SELECT USING (auth.jwt() ->> 'app_role' = 'student');

-- Sanctions
CREATE POLICY sanctions_faculty_all ON sanctions FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY sanctions_student_self ON sanctions FOR SELECT USING (student_id::text = auth.uid()::text);

-- Balances
CREATE POLICY balances_faculty_all ON balances FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY balances_student_self ON balances FOR SELECT USING (student_id::text = auth.uid()::text);

-- Payment methods
CREATE POLICY payment_methods_faculty_all ON payment_methods FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY payment_methods_student_read ON payment_methods FOR SELECT USING (auth.jwt() ->> 'app_role' = 'student');

-- Payments
CREATE POLICY payments_faculty_all ON payments FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY payments_student_self ON payments FOR SELECT USING (
  balance_id IN (SELECT id FROM balances WHERE student_id::text = auth.uid()::text)
);

-- Disputes
CREATE POLICY disputes_faculty_all ON disputes FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY disputes_student_self ON disputes FOR ALL USING (student_id::text = auth.uid()::text);

-- Feedback
CREATE POLICY feedback_faculty_all ON feedback FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY feedback_student_insert ON feedback FOR INSERT WITH CHECK (auth.jwt() ->> 'app_role' = 'student');
CREATE POLICY feedback_student_self ON feedback FOR SELECT USING (user_id::text = auth.uid()::text);

-- Audit files
CREATE POLICY audit_files_faculty_all ON audit_files FOR ALL USING (auth.jwt() ->> 'app_role' = 'faculty');
CREATE POLICY audit_files_student_read ON audit_files FOR SELECT USING (auth.jwt() ->> 'app_role' = 'student');
`;

async function applyRLS() {
  try {
    const statements = RLS_SQL.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt.trim() + ';');
    }
    logger.info('RLS policies applied successfully');
  } catch (err) {
    logger.warn('RLS policy application skipped or partially applied', { error: err.message });
  }
}

module.exports = { applyRLS };
