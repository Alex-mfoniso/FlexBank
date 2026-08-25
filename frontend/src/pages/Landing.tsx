import React, { useEffect } from "react";
import { LandingNavbar } from "../components/LandingNavbar";
import { Hero } from "../components/Hero";
import { ApiDemo } from "../components/ApiDemo";
import { CapabilityStrip } from "../components/CapabilityStrip";
import { ProductIntro } from "../components/ProductIntro";
import { ApiFirstExperience } from "../components/ApiFirstExperience";
import { FeatureGrid } from "../components/FeatureGrid";
import { ProblemSection } from "../components/ProblemSection";
import { SandboxConsole } from "../components/SandboxConsole";
import { SandboxPreview } from "../components/SandboxPreview";
import { DeveloperFlow } from "../components/DeveloperFlow";
import { ConsolePreview } from "../components/ConsolePreview";
import { UseCases } from "../components/UseCases";
import { FinalCTA } from "../components/FinalCTA";
import { Footer } from "../components/Footer";

export const Landing: React.FC = () => {
  // Ensure the user scrolls to top on initial page mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] font-sans text-neutral-300 selection:bg-indigo-500/20 selection:text-indigo-300 antialiased overflow-x-hidden">
      
      {/* 1. Sticky Blurred Navigation Bar */}
      <LandingNavbar />

      <main className="relative z-10">
        
        {/* 2. Hero Section wrapping ApiDemo sandbox request trace block */}
        <Hero>
          <ApiDemo />
        </Hero>

        {/* 3. Capability / Integrity Trust strip */}
        <CapabilityStrip />

        {/* 4. Product Introduction (Section 1: "One API. Your entire financial infrastructure.") */}
        <ProductIntro />

        {/* 5. API-First Experience (Section 2 & 3: "Build with APIs, not integrations.") */}
        <ApiFirstExperience />

        {/* 6. Feature Grid (Section 4: "Everything your financial product needs.") */}
        <FeatureGrid />

        {/* 7. Problem Section (Section 5: "Stop managing five different integrations.") */}
        <ProblemSection />

        {/* 8. Sandbox Console (Section 6: "Build without risking real money.") */}
        <SandboxConsole />

        {/* 9. Sandbox Cross-Account Money Transfer Demo (Section 7) */}
        <SandboxPreview />

        {/* 10. Developer Workflow Stepper Timeline (Section 8: "From idea to financial product.") */}
        <DeveloperFlow />

        {/* 11. Developer Console metrics and live log trace stream (Section 9) */}
        <ConsolePreview />

        {/* 12. Use Cases capability expansion showcase (Section 10) */}
        <UseCases />

        {/* 13. Final CTA conversion layout (Section 11) */}
        <FinalCTA />

      </main>

      {/* 14. Minimal dark Footer maps */}
      <Footer />

    </div>
  );
};

export default Landing;
