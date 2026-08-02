import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Home',
}

const DOT_COLORS = ['cardDotGreen', 'cardDotYellow', 'cardDotRed'] as const

const FEATURES = [
  {
    name: 'Attendance Tracking',
    desc: 'Check in at events by scanning a QR code. View your attendance history and know your status at a glance.',
    dotColor: DOT_COLORS[0],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    name: 'Events & Schedules',
    desc: 'Browse upcoming events, see venue details, and know which events require your attendance.',
    dotColor: DOT_COLORS[1],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    name: 'Announcements',
    desc: 'Stay informed with announcements from your faculty, targeted by course and year level.',
    dotColor: DOT_COLORS[2],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7Z" />
      </svg>
    ),
  },
  {
    name: 'Balance Tracking',
    desc: 'View your outstanding balances, track payment history, and submit payment receipts online.',
    dotColor: DOT_COLORS[0],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    name: 'Dispute Resolution',
    desc: 'File a dispute for any attendance record and track its status until resolution.',
    dotColor: DOT_COLORS[1],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
  },
  {
    name: 'Sanctions & Rules',
    desc: 'Know where you stand with clear visibility into sanctions and the attendance rules.',
    dotColor: DOT_COLORS[2],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    name: 'Documents & Forms',
    desc: 'Access important documents, policies, and forms shared by the administration.',
    dotColor: DOT_COLORS[0],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" /><polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    name: 'Feedback',
    desc: 'Submit feedback and suggestions to the faculty, with the option to remain anonymous.',
    dotColor: DOT_COLORS[1],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]

const MANUAL_STEPS = [
  {
    step: 1,
    title: 'Sign in for the first time',
    items: [
      'Click Sign In and choose "Sign in with Google".',
      'Use your institution email address.',
      'Complete your student profile the first time you sign in.',
      'You are now ready to use your dashboard.',
    ],
  },
  {
    step: 2,
    title: 'Attend an event with QR',
    items: [
      'Open the Events page and find today\'s event and venue.',
      'At the venue, scan the QR code shown by faculty using your phone camera.',
      'You will be marked Present (or Late if you scan after the cutoff).',
      'Verify your status on the Attendance page.',
    ],
  },
  {
    step: 3,
    title: 'Review your attendance',
    items: [
      'Go to Attendance to see every record and its status.',
      'Statuses are shown as Present, Late, or Absent with dates.',
      'Spot a mistake? Click Dispute and give your reason.',
      'Track your dispute until faculty resolves it.',
    ],
  },
  {
    step: 4,
    title: 'View balances & payments',
    items: [
      'Open Balances to see amounts you owe and due dates.',
      'Follow the payment instructions shown for each balance.',
      'Keep your payment reference number for verification.',
      'Your balance updates once faculty records the payment.',
    ],
  },
  {
    step: 5,
    title: 'Send feedback',
    items: [
      'Open the Feedback page from your portal or this landing page.',
      'Choose For the System or For the Faculty.',
      'Write your message — it is sent anonymously.',
      'Faculty can respond, and you can check back anytime.',
    ],
  },
  {
    step: 6,
    title: 'Find answers & get help',
    items: [
      'Browse the FAQ page for answers to common questions.',
      'Use Send Feedback for anything the FAQ does not cover.',
      'Watch Announcements and Documents for faculty guidance.',
      'Your attendance and balance history is always available to you.',
    ],
  },
]

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <nav className={styles.nav}>
          <div className={styles.brandMark}>
            Liberalis
          </div>
          <div className={styles.navLinks}>
            <Link href="/feedback" className={styles.navLink}>Send Feedback</Link>
            <Link href="/login" className={styles.navLink}>Sign In</Link>
          </div>
        </nav>

        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Stay informed.<br /><span>Stay ahead.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Liberalis gives students real-time access to attendance records, event schedules, balance tracking, and more. No more guessing — everything you need is in one place.
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.btnPrimary}>
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link href="/login" className={styles.btnOutline}>
              Sign In
            </Link>
          </div>
        </section>

        <div className={styles.divider}>
          <hr className={styles.dividerLine} />
        </div>

        <section className={styles.features}>
          <div className={styles.featuresHeader}>
            <h2 className={styles.featuresTitle}>Everything you need</h2>
            <p className={styles.featuresSubtitle}>
              Track attendance, manage payments, stay updated, and communicate with faculty — all from your student portal.
            </p>
          </div>
          <div className={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <div key={feature.name} className={styles.featureCard}>
                <span className={`${styles.cardDot} ${styles[feature.dotColor]}`} />
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureName}>{feature.name}</h3>
                <p className={styles.featureDesc}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.divider}>
          <hr className={styles.dividerLine} />
        </div>

        <section className={styles.about}>
          <div className={styles.aboutInner}>
            <div className={styles.aboutImageCol}>
              <Image
                src="/Logo.jpg"
                alt="Liberalis"
                width={400}
                height={400}
                className={styles.aboutImage}
              />
            </div>
            <div className={styles.aboutTextCol}>
              <h2 className={styles.aboutTitle}>About Liberalis</h2>
              <p className={styles.aboutText}>
                Liberalis is a student attendance transparency system designed to provide clear, real-time visibility into attendance records, sanctions, and payments. Built for both students and administrators, it streamlines communication and record-keeping.
              </p>
              <p className={styles.aboutText}>
                Whether you are checking in at an event, reviewing your attendance history, or submitting a payment receipt, Liberalis keeps everything organized and accessible.
              </p>
            </div>
          </div>
        </section>

        <div className={styles.divider}>
          <hr className={styles.dividerLine} />
        </div>

        <section className={styles.manual}>
          <div className={styles.manualHeader}>
            <h2 className={styles.manualTitle}>User Manual</h2>
            <p className={styles.manualSubtitle}>
              A simple step-by-step guide to using Liberalis as a student. Follow the numbered steps to get started.
            </p>
          </div>
          <div className={styles.manualGrid}>
            {MANUAL_STEPS.map((guide) => (
              <div key={guide.step} className={styles.manualCard}>
                <span className={styles.manualStep}>{String(guide.step).padStart(2, '0')}</span>
                <h3 className={styles.manualCardTitle}>{guide.title}</h3>
                <ol className={styles.manualList}>
                  {guide.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Ready to get started?</h2>
          <div className={styles.ctaActions}>
            <Link href="/login" className={styles.btnPrimary}>Sign In with Google</Link>
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerTop}>
              <div>
                <div className={styles.footerBrand}>
                  Liberalis
                </div>
              </div>
              <div className={styles.footerCol}>
                <span className={styles.footerColTitle}>Platform</span>
                <Link href="/login" className={styles.footerLink}>Sign In</Link>
              </div>
              <div className={styles.footerCol}>
                <span className={styles.footerColTitle}>Support</span>
                <Link href="/feedback" className={styles.footerLink}>Send Feedback</Link>
                <span className={styles.footerLink}>FAQ</span>
                <span className={styles.footerLink}>Contact</span>
              </div>
            </div>
            <div className={styles.footerBottom}>
              <p className={styles.footerText}>&copy; {new Date().getFullYear()} Liberalis Attendance System. All rights reserved.</p>
              <p className={styles.footerDeveloper}>Developer: Reogie Akero Mabawad</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
