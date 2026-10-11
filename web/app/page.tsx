'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getEquipmentList, getEquipmentImageUrl, Equipment } from '@/lib/api';
import { Wrench, Calendar, Sparkles, Search, ArrowRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function CatalogPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getEquipmentList();
        setEquipment(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to connect to Odoo backend');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const categories = Array.from(
    new Set(equipment.map((item) => item.category_name).filter(Boolean))
  ) as string[];

  const filteredEquipment = equipment.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category_name === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-badge">
          <Sparkles size={16} /> Instant Odoo 20 Live Synchronization
        </div>
        <h1>
          High Performance Equipment <br />
          <span className="hero-highlight">Ready For Your Next Job</span>
        </h1>
        <p>
          Rent excavators, heavy tools, and commercial machinery with zero friction.
          Check live date availability directly against our backend schedule.
        </p>

        <div style={{ maxWidth: '520px', margin: '0 auto', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '44px', borderRadius: 'var(--radius-full)', background: 'rgba(30, 41, 59, 0.6)' }}
            placeholder="Search equipment by name, code or specs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="categories-pills">
          <button
            className={`pill-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Categories ({equipment.length})
          </button>
          {categories.map((cat) => {
            const count = equipment.filter((e) => e.category_name === cat).length;
            return (
              <button
                key={cat}
                className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Showing <strong>{filteredEquipment.length}</strong> items
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid rgba(56, 189, 248, 0.2)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading inventory from Odoo backend...</p>
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: '#fb7185' }}>
          <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
          <h3>Could not connect to Odoo backend</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      )}

      {/* Equipment Grid */}
      {!loading && !error && filteredEquipment.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <Wrench size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No equipment matched your criteria</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Try clearing your search query or selecting a different category.</p>
          <button className="btn-secondary" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
            Reset Filters
          </button>
        </div>
      )}

      {!loading && !error && filteredEquipment.length > 0 && (
        <div className="equipment-grid">
          {filteredEquipment.map((item) => {
            const imageUrl = getEquipmentImageUrl(item);
            return (
              <div key={item.id} className="equipment-card">
                <div className="card-media">
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.name} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Wrench size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.8rem' }}>No image available</div>
                    </div>
                  )}

                  <span
                    className={`badge-state ${
                      item.state === 'available'
                        ? 'badge-available'
                        : item.state === 'rented'
                        ? 'badge-rented'
                        : 'badge-maintenance'
                    }`}
                  >
                    {item.state === 'available' && <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} />}
                    {item.state === 'rented' && <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />}
                    {item.state === 'maintenance' && <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} />}
                    {item.state}
                  </span>
                </div>

                <div className="card-content">
                  <div className="card-meta">
                    <span className="card-code">{item.code}</span>
                    <span>{item.category_name || 'General Equipment'}</span>
                  </div>

                  <h3 className="card-title">{item.name}</h3>

                  <p className="card-desc">
                    {item.notes || 'Heavy duty professional equipment kept in peak working condition and tested regularly.'}
                  </p>

                  <div className="card-footer">
                    <div className="price-box">
                      <span className="price-amount">
                        ${item.daily_price.toFixed(2)}
                      </span>
                      <span className="price-unit">per day ({item.currency})</span>
                    </div>

                    <Link href={`/equipment/${item.id}`} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                      Check Dates <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
