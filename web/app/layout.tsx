import type { Metadata } from 'next';
import Link from 'next/link';
import { Wrench, Calendar, ExternalLink, ShieldCheck } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'RentFlow — Professional Equipment & Heavy Tool Rentals',
  description: 'Rent commercial construction equipment, power tools, and heavy machinery with instant real-time availability and fast booking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="nav-container">
            <Link href="/" className="brand">
              <div className="brand-icon">
                <Wrench size={20} />
              </div>
              RentFlow
            </Link>

            <div className="nav-links">
              <Link href="/" className="nav-link">
                Equipment Catalog
              </Link>
              <Link href="/book" className="nav-link">
                <Calendar size={16} style={{ display: 'inline', marginRight: '4px' }} />
                Instant Booking
              </Link>
              <a
                href="http://localhost:8069/my/rentals"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                Customer Portal <ExternalLink size={14} />
              </a>
              <Link href="/book" className="btn-primary">
                Book Equipment
              </Link>
            </div>
          </div>
        </nav>

        <main>{children}</main>

        <footer style={{ borderTop: '1px solid var(--border-color)', padding: '3rem 1.5rem', background: 'var(--bg-secondary)', marginTop: '5rem' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div className="brand" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                <div className="brand-icon" style={{ width: '28px', height: '28px' }}>
                  <Wrench size={16} />
                </div>
                RentFlow Industrial Rentals
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Powered by Odoo 20.0 Backend Engine &amp; Next.js 16 Headless Frontend.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)' }} /> Real-time Conflict Guard
              </span>
              <span>•</span>
              <a href="http://localhost:8069/web" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>
                Staff Portal (Odoo)
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
