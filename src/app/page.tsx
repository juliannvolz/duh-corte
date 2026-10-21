import { Hero } from "@/components/sections/Hero";
import { Story } from "@/components/sections/Story";
import { Services } from "@/components/sections/Services";
import { Plans } from "@/components/sections/Plans";
import { Team } from "@/components/sections/Team";
import { Owner } from "@/components/sections/Owner";
import { Gallery } from "@/components/sections/Gallery";
import { Testimonials } from "@/components/sections/Testimonials";
import { Location } from "@/components/sections/Location";
import { Faq } from "@/components/sections/Faq";
import { CtaBand } from "@/components/sections/CtaBand";

export default function Home() {
  return (
    <>
      <Hero />
      <Story />
      <Services />
      <Plans />
      <Team />
      <Owner />
      <Gallery />
      <Testimonials />
      <Location />
      <Faq />
      <CtaBand />
    </>
  );
}
