import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'FAQ',
}

const SECTIONS = [
  {
    id: 'dashboard',
    title: 'Dashboard & Profile',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
    items: [
      { q: 'What can I see on my Dashboard?', a: 'Your Dashboard shows an overview of your upcoming events, recent attendance, current balances, and any active sanctions. It is your home base for everything in the student portal.' },
      { q: 'How do I update my profile?', a: 'Go to Profile from the menu. You can update your personal details, phone number, and email address. Some fields such as your student ID and course are fixed for accuracy.' },
      { q: 'Why was I asked to complete my profile?', a: 'First-time students must complete their profile before accessing the portal. This ensures your details and course assignment are correct so attendance and announcements reach you properly.' },
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
      { q: 'How do I record my attendance?', a: 'During an event, scan the QR code shown by the faculty or event host using your device. The system marks you as Present automatically.' },
      { q: 'What is the difference between Present, Late, and Absent?', a: 'Present means you were scanned on time. Late means you scanned after the event\'s late cutoff time. Absent means you did not scan at all (or your absence was marked unexcused after the event was finalized).' },
      { q: 'What if I scanned but my status looks wrong?', a: 'If your status is incorrect, you can file a dispute from the Attendance page with a short reason. Faculty will review it and update your record if approved.' },
      { q: 'Why was I marked Absent even though I attended?', a: 'If the QR scan failed or was made after finalization, you may be marked Absent. File a dispute with the reason and time you attended so it can be reviewed.' },
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
      { q: 'Where do I find upcoming events?', a: 'The Events page lists all upcoming events, including the date, time, and venue. Click an event to see its details, description, and attendance requirements.' },
      { q: 'Are all events mandatory?', a: 'No. Faculty marks an event as mandatory when required. Mandatory events will affect your attendance record if missed, while optional events do not.' },
      { q: 'Do I need to do anything before an event?', a: 'Just arrive on time with your device ready to scan. Make sure you are signed in to the portal so your scan is linked to your account.' },
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
      { q: 'Where do I see announcements?', a: 'The Announcements page shows everything published for you, including general announcements and those targeted to your course and year level.' },
      { q: 'How do I mark an announcement as read?', a: 'Opening an announcement marks it as read automatically. This helps faculty know you have seen important updates.' },
      { q: 'Why am I not seeing some announcements?', a: 'Announcements are targeted by course and year level. If it was not published to your course or year level, it will not appear. Contact faculty if you think you are missing something.' },
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
      { q: 'What documents can I access?', a: 'Documents shared by your institution, such as forms, policies, certificates, and reports. You can download them for your records.' },
      { q: 'Can I upload my own documents?', a: 'No. Documents are published by faculty. If you need a document added, reach out through the Feedback page or contact your faculty.' },
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
      { q: 'Where can I see my outstanding balance?', a: 'The Balances page lists every balance charged to your account, with its due date and status (Unpaid, Partial, or Paid).' },
      { q: 'How do I pay my balance?', a: 'Your institution will provide payment instructions for each balance. Payment methods and account details are shown on the balance detail page.' },
      { q: 'When is my payment reflected?', a: 'Once faculty records your payment, your balance status updates automatically. Keep your payment reference number in case you need to verify it.' },
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
      { q: 'What is a sanction?', a: 'Sanctions are warnings or statuses applied based on institutional rules, such as repeated absences or lates. They are tracked on your record so you can stay aware.' },
      { q: 'How can I see my sanctions?', a: 'Sanctions appear on your Dashboard and in the Sanctions area. Each entry shows the type, level, status, and the reason.' },
      { q: 'Can a sanction be removed?', a: 'Faculty can lift or supersede a sanction. If you believe a sanction is a mistake, contact faculty or use the Feedback page to ask for a review.' },
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    items: [
      { q: 'How do I send feedback?', a: 'Go to the Feedback page, choose whether your feedback is for the System or the Faculty, then write your message. It is sent anonymously.' },
      { q: 'Is my feedback really anonymous?', a: 'Yes. Feedback is submitted anonymously by default and no name is shared with faculty. This applies whether or not you are signed in.' },
      { q: 'Will I get a reply to my feedback?', a: 'Faculty can respond to feedback. Since it is anonymous, a public response may be posted if a reply is given.' },
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

export default function StudentFaqPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Student Guide & FAQ</h1>
        <p className={styles.heroSubtitle}>
          Answers to common questions about the student portal. Select a topic below or scroll to browse.
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
