import Hero from "../sections/Hero";
import ProblemStats from "../sections/ProblemStats";
import HowItWorks from "../sections/HowItWorks";
import WellbeingDemo from "../components/WellbeingDemo";
import ForVictims from "../sections/ForVictims";
import ForCaseworkers from "../sections/ForCaseworkers";
import TrustEthics from "../sections/TrustEthics";
import ResourcesSection from "../sections/ResourcesSection";
import { helplines } from "../data/helplines";

const teaser = helplines.slice(0, 4);

export default function Home() {
  return (
    <>
      <Hero />
      <ProblemStats />
      <HowItWorks />
      <WellbeingDemo />
      <ForVictims />
      <ForCaseworkers />
      <TrustEthics />
      <ResourcesSection items={teaser} />
    </>
  );
}