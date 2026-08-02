import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'FAQ',
}

const SECTIONS = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
    items: [
      { q: 'What is shown on the Dashboard?', a: 'The Dashboard gives an at-a-glance overview of key metrics: total active students, events this month, active sanctions, and outstanding balance. It also includes attendance charts (trend, per-event bar chart, status breakdown) and a recent attendance table.' },
      { q: 'Can I filter the Dashboard data?', a: 'Yes. Use the Event dropdown at the top to view data for a specific event. The attendance breakdown donut chart, trend chart, and the recent attendance table will update to reflect only that event.' },
      { q: 'What does the Recent Attendance table show?', a: 'It lists the most recent attendance records across all students, showing student name, ID, course, event, status (Present/Late/Absent), and date. Use the search bar to filter by name, ID, event, or course.' },
    ],
  },
  {
    id: 'events',
    title: 'Events',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    items: [
      { q: 'How do I create a new event?', a: 'Go to Events and click "New Event". Fill in the title, description, venue, date and time, select the course and target year level if applicable, set whether attendance is mandatory, and optionally add a cover photo. A unique program passcode will be auto-generated for QR scanning.' },
      { q: 'What is the program passcode used for?', a: 'The passcode is displayed during the event for students to scan via QR. It can be regenerated if needed. The passcode can also be set to expire after a specific time.' },
      { q: 'How do I manage event attendance?', a: 'During an event, students scan the QR code using their device. You can also manually mark attendance from the Attendance page if a student had issues scanning.' },
      { q: 'What does the "Finalize" button do?', a: 'After an event ends, click Finalize to automatically create Absent records for every eligible student who was not scanned or manually marked Present. It records unexcused absences in one click. You can still correct any records afterward from the Attendance page.' },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    items: [
      { q: 'How is attendance tracked?', a: 'Attendance is recorded per student per event. Students scan a QR code at the event, which marks them as Present. If scanned after the late cutoff time, they are marked Late. Unexcused absence is the default if not scanned.' },
      { q: 'Can I manually change a student\'s attendance status?', a: 'Yes. Go to the Attendance page, find the student record, and use the action menu to change their status. You can mark a student as Present, Late, or Absent. The change is logged for audit purposes.' },
      { q: 'What happens when a student disputes an attendance record?', a: 'Students can file a dispute from their portal with a reason. You can review and approve or reject disputes from the admin panel. Approved disputes update the attendance record.' },
    ],
  },
  {
    id: 'balances',
    title: 'Balances & Payments',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    items: [
      { q: 'How do I add a balance to a student?', a: 'Go to Balances, click "Add Balance", select the student, enter a description and amount, and set the due date. The balance will appear on the student\'s portal.' },
      { q: 'How do I record a payment?', a: 'Go to Balances, find the student, click "Record Payment". Select the payment method, enter the amount and reference number. The balance status will update automatically (Paid, Partial, or Unpaid).' },
      { q: 'What payment methods are available?', a: 'Payment methods are managed under the Balances section. You can add, edit, or deactivate payment methods. Each method can include account details and payment instructions visible to students.' },
    ],
  },
  {
    id: 'sanctions',
    title: 'Sanctions',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    items: [
      { q: 'How are sanctions triggered?', a: 'Sanctions are automatically applied based on Sanction Rules. For example, a rule can be set to issue a "Warning" after 3 absences, or "Probation" after 5 absences. Rules are configurable by type (absence/late) and threshold.' },
      { q: 'How do I configure sanction rules?', a: 'Go to Sanctions, click "Manage Rules". Add rules specifying the type (Absence or Late), the threshold count, the sanction level name (e.g. "Warning", "Probation"), and an optional description.' },
      { q: 'Can I manually issue or lift a sanction?', a: 'Yes. From the Sanctions list, you can change a sanction\'s status (Active, Superseded, Lifted) and add notes. All changes are logged with the admin\'s name and timestamp.' },
    ],
  },
  {
    id: 'announcements',
    title: 'Announcements',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7Z" />
      </svg>
    ),
    items: [
      { q: 'How do I create an announcement?', a: 'Go to Announcements, click "New Announcement". Enter a title and content, optionally target a specific course and year level, or mark it as General (all users). Set the status (Draft or Published), schedule a publish date, and optionally add file attachments.' },
      { q: 'What is the difference between Draft and Published?', a: 'Draft announcements are only visible to admins. Published announcements are visible to targeted students. You can schedule a future publish date if you don\'t want it to go live immediately.' },
      { q: 'Can I see who has read my announcement?', a: 'Yes. The detail view of each announcement shows a read count. Students mark announcements as read when they view them in their portal.' },
    ],
  },
  {
    id: 'courses',
    title: 'Courses',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 19.5Z" /><path d="M9 10h6" /><path d="M9 6h6" /><path d="M9 14h6" />
      </svg>
    ),
    items: [
      { q: 'How do I add or edit a course?', a: 'Go to Courses. You can add a new course by providing a unique course code and name. Existing courses can be edited or deactivated.' },
      { q: 'How are students assigned to courses?', a: 'Students are assigned to a course when their account is created. You can change a student\'s course from the student management section.' },
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    items: [
      { q: 'What types of documents can I upload?', a: 'You can upload audit files such as certificates, forms, policies, reports, and other documents. Supported file types include PDFs, images, Word documents, and spreadsheets (max 20MB per file).' },
      { q: 'How do I organize documents?', a: 'Documents can be categorized (Certificate, Form, Policy, Report, Other) and optionally linked to a specific course. Use the search bar and category filter to find documents quickly.' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    items: [
      { q: 'What reports are available?', a: 'The Reports section provides downloadable reports on attendance, balances, sanctions, and student data. You can filter by date range, course, and other criteria.' },
      { q: 'Can I export reports?', a: 'Yes. Reports can be exported as PDF or CSV files for external use or record-keeping.' },
    ],
  },
  {
    id: 'students',
    title: 'Students',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    items: [
      { q: 'How do I add a new student?', a: 'Go to the student management section and click "Add Student". Fill in the student\'s details including name, student ID, email, course, and year level. Their account credentials will be generated automatically.' },
      { q: 'What is the QR code for?', a: 'Each student has a unique QR code used for attendance scanning. You can regenerate a student\'s QR code if needed from their profile.' },
    ],
  },
]

function FaqSection({ section }: { section: typeof SECTIONS[number] }) {
  return (
    <div className={styles.section} id={section.id}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{section.icon}</span>
        <h2 className={styles.sectionTitle}>{section.title}</h2>
      </div>
      <div className={styles.items}>
        {section.items.map((item, i) => (
          <details key={i} className={styles.item}>
            <summary className={styles.question}>
              <span className={styles.qMark}>Q</span>
              {item.q}
            </summary>
            <div className={styles.answer}>
              <span className={styles.aMark}>A</span>
              <p>{item.a}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

export default function AdminFaqPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Admin Guide</h1>
        <p className={styles.heroSubtitle}>
          Everything you need to know about using the Admin Dashboard. Select a topic below or scroll to browse.
        </p>
      </div>

      <nav className={styles.toc}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={styles.tocItem}>
            <span className={styles.tocIcon}>{s.icon}</span>
            <span>{s.title}</span>
          </a>
        ))}
      </nav>

      <div className={styles.content}>
        {SECTIONS.map((s) => (
          <FaqSection key={s.id} section={s} />
        ))}
      </div>
    </div>
  )
}
