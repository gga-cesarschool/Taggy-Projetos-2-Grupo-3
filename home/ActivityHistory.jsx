import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
const PERIOD_FILTERS = [
  "Este mês",
  "Últimos 3 meses",
  "Este ano",
  "Personalizado",
];
const TYPE_FILTERS = [
  "Todos",
  "Pedágio",
  "Estacionamento",
  "Passagens com economia",
];

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockActivities = [
  {
    id: 1,
    type: "Pedágio",
    date: "12 out 2025",
    title: "Pedágio — BR-232",
    location: "BR-232, PE",
    co2: 0.4,
    badge: "Eco+",
    icon: "toll",
  },
  {
    id: 2,
    type: "Estacionamento",
    date: "09 out 2025",
    title: "Estacionamento — RioMar Recife",
    location: "Recife, PE",
    co2: 0.2,
    badge: "Eco+",
    icon: "park",
  },
  {
    id: 3,
    type: "Passagens com economia",
    date: "07 out 2025",
    title: "BRT — Corredor Leste",
    location: "Recife, PE",
    co2: 1.1,
    badge: "Eco+",
    icon: "bus",
  },
  {
    id: 4,
    type: "Pedágio",
    date: "03 out 2025",
    title: "Pedágio — PE-60",
    location: "PE-60, Ipojuca",
    co2: 0.3,
    badge: "Eco+",
    icon: "toll",
  },
  {
    id: 5,
    type: "Estacionamento",
    date: "28 set 2025",
    title: "Estacionamento — Recife Antigo",
    location: "Recife, PE",
    co2: 0.15,
    badge: "Eco+",
    icon: "park",
  },
  {
    id: 6,
    type: "Passagens com economia",
    date: "22 set 2025",
    title: "Metrô — Linha Centro",
    location: "Recife, PE",
    co2: 0.9,
    badge: "Eco+",
    icon: "bus",
  },
  {
    id: 7,
    type: "Pedágio",
    date: "15 set 2025",
    title: "Pedágio — BR-101 Norte",
    location: "BR-101, Paulista",
    co2: 0.5,
    badge: "Eco+",
    icon: "toll",
  },
];

// ─── Icons (SVG inline) ───────────────────────────────────────────────────────
const LeafIcon = ({ size = 22, color = "#55C122" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

const TicketIcon = ({ size = 22, color = "#55C122" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>
);

const ClockIcon = ({ size = 22, color = "#55C122" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CalendarIcon = ({ size = 22, color = "#55C122" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const TrophyIcon = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#F59E0B"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const StarIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="#55C122"
    stroke="#55C122"
    strokeWidth="2"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const SearchIcon = ({ size = 18, color = "#94A3B8" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const CarIcon = ({ size = 20, color = "#55C122" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
    <path d="M14 3v5h5" />
  </svg>
);

const ParkingIcon = ({ size = 20, color = "#3B82F6" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
  </svg>
);

const BusIcon = ({ size = 20, color = "#8B5CF6" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 6v6" />
    <path d="M15 6v6" />
    <path d="M2 12h19.6" />
    <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="15" cy="18" r="2" />
  </svg>
);

const MenuIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const XIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SparkleIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#55C122"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const AwardIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);

// ─── Activity type icon helper ─────────────────────────────────────────────
const ActivityIcon = ({ type }) => {
  if (type === "Estacionamento")
    return <ParkingIcon size={20} color="#3B82F6" />;
  if (type === "Passagens com economia")
    return <BusIcon size={20} color="#8B5CF6" />;
  return <CarIcon size={20} color="#55C122" />;
};

// ─── Header ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  "Home",
  "Calculadora",
  "Meu Impacto",
  "Histórico",
  "Metodologia",
  "FAQ",
  "Empresas",
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      style={{
        background: "#fff",
        borderBottom: "1px solid #E5E7EB",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #55C122, #1F8F2E)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LeafIcon size={18} color="#fff" />
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: "#0E2B5C",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Tag<span style={{ color: "#55C122" }}>Green</span>
          </span>
        </div>

        {/* Desktop Nav */}
        <nav
          style={{ display: "flex", gap: 4, alignItems: "center" }}
          className="desktop-nav"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: item === "Histórico" ? 600 : 400,
                color: item === "Histórico" ? "#1F8F2E" : "#64748B",
                background: item === "Histórico" ? "#EAF8E6" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (item !== "Histórico") {
                  e.target.style.background = "#F8FAFC";
                  e.target.style.color = "#0F172A";
                }
              }}
              onMouseLeave={(e) => {
                if (item !== "Histórico") {
                  e.target.style.background = "transparent";
                  e.target.style.color = "#64748B";
                }
              }}
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            display: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#0E2B5C",
            padding: 4,
          }}
          className="mobile-menu-btn"
          aria-label="Menu"
        >
          {menuOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div
          style={{
            background: "#fff",
            borderTop: "1px solid #E5E7EB",
            padding: "12px 24px 16px",
          }}
          className="mobile-nav"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              style={{
                display: "block",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: item === "Histórico" ? 600 : 400,
                color: item === "Histórico" ? "#1F8F2E" : "#374151",
                background: item === "Histórico" ? "#EAF8E6" : "transparent",
                textDecoration: "none",
                marginBottom: 2,
              }}
            >
              {item}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({ icon, value, unit, sup, description, iconBg }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 16,
        padding: "20px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "all 0.2s ease",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
        e.currentTarget.style.borderColor = "#C7F0B2";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#E5E7EB";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: iconBg || "#EAF8E6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
        <SparkleIcon size={16} />
      </div>
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 3,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#0F172A",
              lineHeight: 1,
            }}
          >
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
              {unit}
            </span>
          )}
          {sup && (
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
              {sup}
            </span>
          )}
        </div>
        <p
          style={{ fontSize: 13, color: "#64748B", margin: 0, fontWeight: 400 }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── ProgressCard ─────────────────────────────────────────────────────────────
function ProgressCard() {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #0E2B5C 0%, #1a4a8f 40%, #1F8F2E 100%)",
        borderRadius: 16,
        padding: "24px 28px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
      }}
    >
      {/* Left: Trophy + Level */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <TrophyIcon size={26} />
        </div>
        <div>
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
              margin: "0 0 2px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Nível Atual
          </p>
          <p
            style={{ fontSize: 17, color: "#fff", margin: 0, fontWeight: 700 }}
          >
            Nível 4 — Motorista Eco
          </p>
        </div>
      </div>

      {/* Center: Progress */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
            Progresso para Nível 5
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
            78%
          </span>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 99,
            background: "rgba(255,255,255,0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "78%",
              background: "linear-gradient(90deg, #55C122, #90E050)",
              borderRadius: 99,
              transition: "width 1s ease",
            }}
          />
        </div>
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.65)",
            margin: "8px 0 0",
          }}
        >
          Faltam <strong style={{ color: "#90E050" }}>3,2 kg</strong> de CO₂
          evitado para chegar ao Nível 5
        </p>
      </div>

      {/* Right: Button */}
      <button
        style={{
          padding: "10px 20px",
          background: "rgba(255,255,255,0.95)",
          color: "#1F8F2E",
          border: "none",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.transform = "scale(1.03)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.95)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <AwardIcon size={15} />
        Ver conquistas
      </button>
    </div>
  );
}

// ─── FilterGroup ──────────────────────────────────────────────────────────────
function FilterGroup({ options, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "7px 16px",
            borderRadius: 99,
            fontSize: 13,
            fontWeight: active === opt ? 600 : 400,
            cursor: "pointer",
            border: active === opt ? "none" : "1.5px solid #E5E7EB",
            background: active === opt ? "#55C122" : "#fff",
            color: active === opt ? "#fff" : "#374151",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => {
            if (active !== opt) {
              e.currentTarget.style.borderColor = "#C7F0B2";
              e.currentTarget.style.color = "#1F8F2E";
            }
          }}
          onMouseLeave={(e) => {
            if (active !== opt) {
              e.currentTarget.style.borderColor = "#E5E7EB";
              e.currentTarget.style.color = "#374151";
            }
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      >
        <SearchIcon size={18} color="#94A3B8" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por local ou data..."
        style={{
          width: "100%",
          height: 48,
          paddingLeft: 44,
          paddingRight: 16,
          border: "1.5px solid #E5E7EB",
          borderRadius: 12,
          fontSize: 14,
          color: "#0F172A",
          background: "#fff",
          outline: "none",
          transition: "border-color 0.15s",
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "#55C122";
          e.target.style.boxShadow = "0 0 0 3px rgba(85,193,34,0.12)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#E5E7EB";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

// ─── ActivityCard ─────────────────────────────────────────────────────────────
function ActivityCard({ activity }) {
  const iconBg =
    {
      Pedágio: "#EAF8E6",
      Estacionamento: "#EFF6FF",
      "Passagens com economia": "#F5F3FF",
    }[activity.type] || "#EAF8E6";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 14,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        transition: "all 0.18s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#C7F0B2";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(85,193,34,0.08)";
        e.currentTarget.style.transform = "translateX(3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E5E7EB";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <ActivityIcon type={activity.type} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>
            {activity.date}
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "#0F172A",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {activity.title}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
          CO₂ evitado:{" "}
          <strong style={{ color: "#1F8F2E" }}>{activity.co2} kg</strong>
        </p>
      </div>

      {/* Badge */}
      <div
        style={{
          padding: "4px 10px",
          borderRadius: 99,
          background: "#EAF8E6",
          border: "1px solid #C7F0B2",
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <SparkleIcon size={12} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1F8F2E" }}>
          {activity.badge}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ActivityHistory() {
  const [activePeriod, setActivePeriod] = useState("Últimos 3 meses");
  const [activeType, setActiveType] = useState("Todos");
  const [search, setSearch] = useState("");

  const filteredActivities = mockActivities.filter((a) => {
    const matchType = activeType === "Todos" || a.type === activeType;
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.date.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #F8FAFC; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .desktop-nav { display: flex !important; }
        .mobile-menu-btn { display: none !important; }
        .mobile-nav { display: block; }
        @media (max-width: 900px) {
          .metrics-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .metrics-grid { grid-template-columns: 1fr !important; }
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        input::placeholder { color: #94A3B8; }
      `}</style>

      <Header />

      <main
        style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}
      >
        {/* Back */}
        <div style={{ marginBottom: 24 }}>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#64748B",
              fontSize: 14,
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0F172A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Voltar
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#0F172A",
              margin: "0 0 6px",
              lineHeight: 1.15,
            }}
          >
            Histórico de Atividades
          </h1>
          <p style={{ fontSize: 16, color: "#64748B", margin: 0 }}>
            Acompanhe seu impacto ao longo do tempo
          </p>
        </div>

        {/* Metric Cards */}
        <div className="metrics-grid" style={{ marginBottom: 24 }}>
          <MetricCard
            icon={<LeafIcon size={20} color="#55C122" />}
            value="12,8"
            unit="kg"
            description="CO₂ evitado"
            iconBg="#EAF8E6"
          />
          <MetricCard
            icon={<TicketIcon size={20} color="#3B82F6" />}
            value="48"
            description="Passagens registradas"
            iconBg="#EFF6FF"
          />
          <MetricCard
            icon={<ClockIcon size={20} color="#8B5CF6" />}
            value="2h 35"
            unit="min"
            description="Tempo economizado"
            iconBg="#F5F3FF"
          />
          <MetricCard
            icon={<CalendarIcon size={20} color="#F59E0B" />}
            value="Out"
            unit="ubro"
            description="Mês mais sustentável"
            iconBg="#FFFBEB"
          />
        </div>

        {/* Progress Card */}
        <div style={{ marginBottom: 32 }}>
          <ProgressCard />
        </div>

        {/* Filters */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 16,
            padding: "24px",
            marginBottom: 24,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#94A3B8",
                margin: "0 0 10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Período
            </p>
            <FilterGroup
              options={PERIOD_FILTERS}
              active={activePeriod}
              onChange={setActivePeriod}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#94A3B8",
                margin: "0 0 10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Tipo
            </p>
            <FilterGroup
              options={TYPE_FILTERS}
              active={activeType}
              onChange={setActiveType}
            />
          </div>

          <SearchBar value={search} onChange={setSearch} />
        </div>

        {/* Activities List */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#0F172A",
                margin: 0,
              }}
            >
              Suas atividades
            </h2>
            <span
              style={{
                fontSize: 13,
                color: "#64748B",
                background: "#F1F5F9",
                padding: "4px 10px",
                borderRadius: 99,
                fontWeight: 500,
              }}
            >
              {filteredActivities.length}{" "}
              {filteredActivities.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          {filteredActivities.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #E5E7EB",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
              <p style={{ color: "#64748B", margin: 0, fontSize: 15 }}>
                Nenhuma atividade encontrada para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
