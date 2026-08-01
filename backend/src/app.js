const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');

const authRoutes = require('./modules/auth/auth.routes');
const courseRoutes = require('./modules/courses/courses.routes');
const announcementRoutes = require('./modules/announcements/announcements.routes');
const eventRoutes = require('./modules/events/events.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const attendanceAdminRoutes = require('./modules/attendance/attendance-admin.routes');
const sanctionRoutes = require('./modules/sanctions/sanctions.routes');
const balanceRoutes = require('./modules/balances/balances.routes');
const paymentRoutes = require('./modules/payments/payments.routes');
const disputeRoutes = require('./modules/disputes/disputes.routes');
const feedbackRoutes = require('./modules/feedback/feedback.routes');
const auditFileRoutes = require('./modules/audit-files/audit-files.routes');
const studentRoutes = require('./modules/students/students.routes');
const reportRoutes = require('./modules/reports/reports.routes');

const app = express();

app.set('etag', false);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(requestId);
app.use(morgan(':method :url :status :response-time ms - :req[x-request-id]'));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/attendance', attendanceAdminRoutes);
app.use('/api/v1/sanctions', sanctionRoutes);
app.use('/api/v1/balances', balanceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/audit-files', auditFileRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/reports', reportRoutes);

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ name: 'OLI API', status: 'ok' });
});

app.use(errorHandler);

module.exports = app;
