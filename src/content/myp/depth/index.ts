import type { TopicDepth } from "./types";
import { SCIENCE_DEPTH } from "./sciences";
import { MATHS_ENGLISH_DEPTH } from "./maths-english";
import { HUMANITIES_DEPTH } from "./humanities";

export * from "./types";

const ALL: Record<string, TopicDepth> = { ...SCIENCE_DEPTH, ...MATHS_ENGLISH_DEPTH, ...HUMANITIES_DEPTH };

/** The deeper study layer (objectives, worked example, exam questions, diagrams) for a topic. */
export const depthOf = (topicId: string): TopicDepth | undefined => ALL[topicId];
export const allDepth = ALL;
