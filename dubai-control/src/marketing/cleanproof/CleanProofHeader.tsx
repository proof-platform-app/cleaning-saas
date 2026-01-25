// dubai-control/src/marketing/cleanproof/CleanProofHeader.tsx
import { Link } from "react-router-dom";

type CleanProofHeaderProps = {
  variant?: "onDark" | "onLight";
};

export default function CleanProofHeader({
  variant = "onDark",
}: CleanProofHeaderProps) {
  const isDark = variant === "onDark";

  const brandColor = isDark ? "text-primary-foreground" : "text-foreground";
  const navColor = isDark
    ? "text-primary-foreground/70"
    : "text-muted-foreground";
  const signInColor = isDark
    ? "text-primary-foreground/70 hover:text-primary-foreground"
    : "text-muted-foreground hover:text-foreground";

  const containerBg = isDark
    ? "bg-transparent"
    : "bg-background/80 backdrop-blur-sm border-b border-border/40";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 ${containerBg}`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between gap-8">
        {/* Логотип / бренд */}
        <Link to="/cleanproof" className={`text-lg font-semibold ${brandColor}`}>
          CleanProof
        </Link>

        {/* Навигация по маркетинговым страницам */}
        <nav
          className={`hidden md:flex items-center gap-8 text-sm ${navColor}`}
        >
          <Link
            to="/cleanproof/pricing"
            className="hover:text-primary transition-colors"
          >
            Pricing
          </Link>
          <Link
            to="/cleanproof/updates"
            className="hover:text-primary transition-colors"
          >
            Product updates
          </Link>
          <Link
            to="/cleanproof/contact"
            className="hover:text-primary transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Sign in справа */}
        <Link
          to="/"
          className={`text-sm md:text-base transition-colors ${signInColor}`}
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
