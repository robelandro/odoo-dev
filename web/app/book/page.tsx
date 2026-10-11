'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getEquipmentList, submitRentalBooking, Equipment, BookingResult } from '@/lib/api';
import { Wrench, Calendar, CheckCircle2, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';

function BookingFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const preselectedEquipmentId = Number(searchParams.get('equipment_id')) || 0;
  const preselectedStart = searchParams.get('date_start') || '';
  const preselectedEnd = searchParams.get('date_end') || '';

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form Fields
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [equipmentId, setEquipmentId] = useState<number>(preselectedEquipmentId);
  const [dateStart, setDateStart] = useState<string>(preselectedStart || todayStr);
  const [dateEnd, setDateEnd] = useState<string>(preselectedEnd || defaultEnd);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingResult | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      try {
        setLoading(true);
        const list = await getEquipmentList();
        setEquipmentList(list);
        if (!equipmentId && list.length > 0) {
          setEquipmentId(list[0].id);
        }
      } catch (err) {
        console.error('Error fetching equipment:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, []);

  const selectedEquipment = equipmentList.find((e) => e.id === equipmentId);

  // Calculate rental totals
  const startDate = new Date(dateStart);
  const endDate = new Date(dateEnd);
  const timeDiff = endDate.getTime() - startDate.getTime();
  const days = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  const estimatedTotal = selectedEquipment ? selectedEquipment.daily_price * days : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!equipmentId || !dateStart || !dateEnd || !name || !email) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitRentalBooking({
        equipmentId,
        dateStart,
        dateEnd,
        name,
        email,
        phone,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Booking request was rejected by Odoo backend.');
      } else {
        setBookingSuccess(res);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error submitting booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="container">
        <div className="success-banner">
          <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-emerald)' }}>
            <CheckCircle2 size={44} />
          </div>

          <span style={{ display: 'inline-block', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)', padding: '0.25rem 0.8rem', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            ORDER {bookingSuccess.order_name} CREATED
          </span>

          <h2 style={{ fontSize: '2.4rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Rental Booking Confirmed!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Your reservation has been recorded into Odoo 20 backend with status <strong>{bookingSuccess.state}</strong>.
          </p>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'left', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Order Reference:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>{bookingSuccess.order_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
              <span>{bookingSuccess.customer_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Equipment:</span>
              <span>{bookingSuccess.equipment_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Rental Period:</span>
              <span>{dateStart} &#8594; {dateEnd} ({bookingSuccess.days} days)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
              <span style={{ fontWeight: 700 }}>Total Rental Amount:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                ${bookingSuccess.total?.toFixed(2)} {bookingSuccess.currency}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/" className="btn-secondary">
              Browse More Equipment
            </Link>
            <a
              href="http://localhost:8069/my/rentals"
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              View in Customer Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to Catalog
      </Link>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Instant Equipment Booking</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Reserve industrial equipment directly through our headless booking integration.
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Equipment & Dates */}
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={18} style={{ color: 'var(--accent-cyan)' }} /> 1. Rental Details
          </h3>

          <div className="form-group">
            <label className="form-label">Equipment Model *</label>
            <select
              className="form-select"
              value={equipmentId}
              onChange={(e) => setEquipmentId(Number(e.target.value))}
              required
            >
              {loading && <option>Loading inventory...</option>}
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({eq.code}) — ${eq.daily_price}/day [{eq.state.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rental Start Date *</label>
              <input
                type="date"
                className="form-input"
                min={todayStr}
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rental End Date *</label>
              <input
                type="date"
                className="form-input"
                min={dateStart}
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Step 2: Customer Contact Information */}
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: '2rem 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <Calendar size={18} style={{ color: 'var(--accent-cyan)' }} /> 2. Customer Information
          </h3>

          <div className="form-group">
            <label className="form-label">Full Name / Company Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. John Miller"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. john@millerconstruction.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Contact Phone</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. +1 555-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Order Summary Card */}
          {selectedEquipment && (
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span>Daily Rate:</span>
                <span>${selectedEquipment.daily_price.toFixed(2)} / day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <span>Duration:</span>
                <span>{days} day{days > 1 ? 's' : ''} ({dateStart} to {dateEnd})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '1.25rem', fontWeight: 800 }}>
                <span>Estimated Total:</span>
                <span style={{ color: 'var(--accent-cyan)' }}>
                  ${estimatedTotal.toFixed(2)} {selectedEquipment.currency}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem' }}
            disabled={submitting}
          >
            {submitting ? 'Submitting Reservation to Odoo...' : 'Confirm & Reserve Equipment'}
          </button>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
            <ShieldCheck size={14} style={{ display: 'inline', color: 'var(--accent-emerald)', marginRight: '4px' }} />
            Automatic booking validation with zero overlapping double-bookings.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', padding: '5rem 0' }}>Loading booking form...</div>}>
      <BookingFormContent />
    </Suspense>
  );
}
