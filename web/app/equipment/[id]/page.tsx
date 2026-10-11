'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getEquipmentList, checkAvailability, getEquipmentImageUrl, Equipment, AvailabilityResult } from '@/lib/api';
import { Wrench, Calendar, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const equipmentId = Number(params.id);

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Date selection state
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [dateStart, setDateStart] = useState<string>(todayStr);
  const [dateEnd, setDateEnd] = useState<string>(defaultEnd);
  const [checking, setChecking] = useState<boolean>(false);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);

  useEffect(() => {
    async function loadEquipment() {
      try {
        setLoading(true);
        const list = await getEquipmentList();
        const found = list.find((item) => item.id === equipmentId);
        if (found) {
          setEquipment(found);
        }
      } catch (err) {
        console.error('Failed to load equipment:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEquipment();
  }, [equipmentId]);

  // Live availability check whenever dates change
  useEffect(() => {
    if (!equipmentId || !dateStart || !dateEnd) return;

    let isMounted = true;
    async function runCheck() {
      try {
        setChecking(true);
        const result = await checkAvailability(equipmentId, dateStart, dateEnd);
        if (isMounted) {
          setAvailability(result);
        }
      } catch (err) {
        console.error('Availability check error:', err);
        if (isMounted) {
          setAvailability({ available: false, error: 'Could not connect to backend' });
        }
      } finally {
        if (isMounted) setChecking(false);
      }
    }

    const timer = setTimeout(runCheck, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [equipmentId, dateStart, dateEnd]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading equipment details...</p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <h2>Equipment not found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>The requested equipment could not be located in the catalog.</p>
        <Link href="/" className="btn-primary">
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </div>
    );
  }

  // Calculate rental days
  const startDate = new Date(dateStart);
  const endDate = new Date(dateEnd);
  const timeDiff = endDate.getTime() - startDate.getTime();
  const rentalDays = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  const calculatedTotal = equipment.daily_price * rentalDays;

  const handleProceedBooking = () => {
    router.push(`/book?equipment_id=${equipment.id}&date_start=${dateStart}&date_end=${dateEnd}`);
  };

  const imageUrl = getEquipmentImageUrl(equipment);

  return (
    <div className="container">
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to Equipment Catalog
      </Link>

      <div className="detail-layout">
        {/* Left Column: Image & Details */}
        <div>
          <div className="detail-gallery">
            <div className="detail-img-wrapper">
              {imageUrl ? (
                <img src={imageUrl} alt={equipment.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Wrench size={72} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>No preview photo uploaded</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Specifications &amp; Overview</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {equipment.notes || 'Industrial grade equipment serviced according to manufacturer standards. Tested and verified for reliable performance under heavy job site conditions.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tracking Code</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{equipment.code}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{equipment.category_name || 'Standard'}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Rate</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>${equipment.daily_price.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Booking & Availability Panel */}
        <div className="detail-panel">
          <div>
            <span style={{ display: 'inline-block', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              {equipment.category_name}
            </span>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>{equipment.name}</h1>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                ${equipment.daily_price.toFixed(2)}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>per day ({equipment.currency})</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '1.1rem' }}>
              <Calendar size={18} style={{ color: 'var(--accent-cyan)' }} />
              Live Availability Checker
            </h4>

            <div className="form-group">
              <label className="form-label">Rental Start Date</label>
              <input
                type="date"
                className="form-input"
                min={todayStr}
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rental End Date</label>
              <input
                type="date"
                className="form-input"
                min={dateStart}
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>

            {/* Live Availability Badge from Odoo Backend */}
            {checking && (
              <div className="availability-card" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                <Zap size={20} className="animate-spin" />
                <span>Checking Odoo schedule for selected dates...</span>
              </div>
            )}

            {!checking && availability && (
              <div>
                {availability.available ? (
                  <div className="availability-card avail-success">
                    <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>Available for Selected Dates!</strong>
                      <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                        {rentalDays} day{rentalDays > 1 ? 's' : ''} rental period verified.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="availability-card avail-error">
                    <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>Unavailable for Selected Dates</strong>
                      <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                        {availability.reason || availability.error || 'Conflict detected on backend calendar.'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Price Calculation Box */}
            <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span>Daily Rate:</span>
                <span>${equipment.daily_price.toFixed(2)} x {rentalDays} days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontWeight: 700, fontSize: '1.25rem' }}>
                <span>Estimated Total:</span>
                <span style={{ color: 'var(--accent-cyan)' }}>${calculatedTotal.toFixed(2)} {equipment.currency}</span>
              </div>
            </div>

            {/* Booking Button */}
            <div style={{ marginTop: '1.75rem' }}>
              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.05rem', opacity: availability?.available ? 1 : 0.6 }}
                disabled={!availability?.available}
                onClick={handleProceedBooking}
              >
                Proceed to Online Booking
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
                Instant reservation held on Odoo backend
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
