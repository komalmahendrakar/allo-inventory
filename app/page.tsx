"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProducts, createReservation } from "@/lib/api";

type Stock = {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  availableUnits: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  stock: Stock[];
};

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  async function handleReserve(productId: string, warehouseId: string) {
    const key = `${productId}-${warehouseId}`;
    setReserving(key);
    setError(null);
    try {
      const reservation = await createReservation({ productId, warehouseId, quantity: 1 });
      router.push(`/reservation/${reservation.id}`);
    } catch (err: any) {
      if (err.status === 409) {
        setError("That item just sold out. Try another warehouse.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setReserving(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f0f0f", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .product-card {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 16px;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .product-card:hover {
          border-color: #e8d5b0;
          transform: translateY(-2px);
        }
        .reserve-btn {
          background: #e8d5b0;
          color: #0f0f0f;
          border: none;
          border-radius: 8px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.15s, transform 0.1s;
          white-space: nowrap;
        }
        .reserve-btn:hover:not(:disabled) {
          background: #f0e0c0;
          transform: scale(1.04);
        }
        .reserve-btn:disabled {
          background: #2a2a2a;
          color: #555;
          cursor: not-allowed;
          transform: none;
        }
        .warehouse-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 10px;
          background: #111;
          border: 1px solid #222;
          transition: border-color 0.15s;
        }
        .warehouse-row:hover {
          border-color: #333;
        }
        .stock-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.02em;
        }
        .stock-badge.out { background: #2a1515; color: #f87171; }
        .stock-badge.low { background: #2a2010; color: #fbbf24; }
        .stock-badge.ok  { background: #102a15; color: #4ade80; }

        .error-banner {
          background: #2a1515;
          border: 1px solid #5a2020;
          color: #f87171;
          border-radius: 10px;
          padding: 14px 18px;
          font-size: 14px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .skeleton {
          background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 12px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: fadeUp 0.4s ease both;
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        borderBottom: "1px solid #2a2a2a",
        padding: "0 32px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: "#0f0f0f",
        zIndex: 10,
      }}>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "22px", color: "#e8d5b0", letterSpacing: "-0.02em" }}>
          allo
        </span>
        <span style={{ fontSize: "12px", color: "#555", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Inventory
        </span>
      </nav>

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 24px" }}>
        {/* Hero text */}
        <div style={{ marginBottom: "48px" }} className="fade-up">
          <h1 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(32px, 5vw, 48px)",
            color: "#f5f0e8",
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            marginBottom: "10px",
          }}>
            Shop by warehouse.<br />
            <span style={{ color: "#e8d5b0", fontStyle: "italic" }}>Reserve before it's gone.</span>
          </h1>
          <p style={{ color: "#666", fontSize: "14px", fontWeight: 400 }}>
            Items are held for 10 minutes at checkout — no account needed.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="error-banner fade-up">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: "grid", gap: "16px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: "160px" }} />
            ))}
          </div>
        )}

        {/* Product cards */}
        {!loading && (
          <div style={{ display: "grid", gap: "16px" }}>
            {products.map((product, i) => (
              <div
                key={product.id}
                className="product-card fade-up"
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                {/* Product header */}
                <div style={{ display: "flex", gap: "20px", padding: "24px 24px 16px" }}>
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      style={{
                        width: "80px", height: "80px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        flexShrink: 0,
                        border: "1px solid #2a2a2a",
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: "17px", fontWeight: 600, color: "#f5f0e8", marginBottom: "4px" }}>
                      {product.name}
                    </h2>
                    <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.5 }}>
                      {product.description}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: "1px", background: "#222", margin: "0 24px" }} />

                {/* Warehouse rows */}
                <div style={{ padding: "16px 24px", display: "grid", gap: "8px" }}>
                  {product.stock.map((s) => {
                    const key = `${product.id}-${s.warehouseId}`;
                    const isReserving = reserving === key;
                    const badgeClass = s.availableUnits === 0 ? "out" : s.availableUnits <= 3 ? "low" : "ok";
                    const badgeLabel = s.availableUnits === 0
                      ? "Out of stock"
                      : s.availableUnits <= 3
                      ? `Only ${s.availableUnits} left`
                      : `${s.availableUnits} available`;

                    return (
                      <div key={s.warehouseId} className="warehouse-row">
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 500, color: "#d0ccc4", marginBottom: "2px" }}>
                            {s.warehouseName}
                          </p>
                          <p style={{ fontSize: "12px", color: "#555" }}>
                            {s.warehouseLocation}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span className={`stock-badge ${badgeClass}`}>{badgeLabel}</span>
                          <button
                            className="reserve-btn"
                            disabled={s.availableUnits === 0 || isReserving}
                            onClick={() => handleReserve(product.id, s.warehouseId)}
                          >
                            {isReserving ? "Reserving…" : "Reserve"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}