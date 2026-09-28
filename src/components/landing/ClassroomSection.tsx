import React from "react";
import teacherGroup from "@/assets/photos/teacher-group.webp";
import studentPresenting from "@/assets/photos/student-presenting.jpg";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, SectionTitle } from "./primitives";

const PhotoCard: React.FC<{
  src: string;
  alt: string;
  width: number;
  height: number;
  title: string;
  body: string;
  className?: string;
  imgClassName?: string;
  delay?: number;
}> = ({ src, alt, width, height, title, body, className, imgClassName, delay = 0 }) => (
  <figure
    className={cn("lp-reveal group relative overflow-hidden rounded-3xl border border-lp-line bg-lp-surface", className)}
    style={{ transitionDelay: `${delay}ms` }}
  >
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      className={cn("h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]", imgClassName)}
    />
    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#050A18] via-[#050A18]/30 to-transparent" />
    <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
      <p className="text-[20px] font-medium tracking-[-0.02em] text-white sm:text-[22px]">{title}</p>
      <p className="mt-1.5 max-w-[30rem] text-[14.5px] leading-relaxed text-white/75">{body}</p>
    </figcaption>
  </figure>
);

const ClassroomSection = () => (
  <section aria-labelledby="classroom-title" className="relative border-t border-lp-line">
    <Container className="py-24 lg:py-32">
      <div className="lp-reveal grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Eyebrow>In the classroom</Eyebrow>
          <SectionTitle id="classroom-title" className="mt-6">
            Made for real classrooms.
          </SectionTitle>
        </div>
        <p className="max-w-[28rem] text-[17px] leading-[1.65] text-lp-soft lg:col-span-5">
          Teachers lead, students do the thinking, and AI helps in the background instead of doing the work.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 lg:mt-14 lg:grid-cols-12">
        <PhotoCard
          src={teacherGroup}
          alt="A teacher working with a small group of students around a table"
          width={900}
          height={514}
          title="Teachers stay in the loop"
          body="See how AI is being used in each class, and step in where a student needs a nudge."
          className="aspect-[4/3] sm:aspect-[16/10] lg:col-span-7 lg:aspect-auto lg:h-[360px]"
          imgClassName="object-[50%_80%]"
        />
        <PhotoCard
          src={studentPresenting}
          alt="A student presenting his work to the class"
          width={474}
          height={316}
          title="Students show their own work"
          body="Capstones and portfolios give every student something real to present."
          className="aspect-[4/3] lg:col-span-5 lg:aspect-auto lg:h-[360px]"
          imgClassName="object-[60%_50%]"
          delay={100}
        />
      </div>
    </Container>
  </section>
);

export default ClassroomSection;
