import { Subject, topic, unit } from "./types";

export const english: Subject = {
  slug: "english-lang-lit",
  name: "English Language & Literature",
  group: "Language & Literature",
  description: "Analysing texts, writing with purpose, and reading in context.",
  icon: "book",
  theme: { gradient: "linear-gradient(135deg, #3B82F6 0%, #2563EB 45%, #1E3A8A 100%)", accent: "#93C5FD" },
  units: [
    unit("eng-reading", "Reading closely", [
      topic(
        "eng-devices",
        "Literary and language devices",
        "Spotting techniques, and explaining the effect they create.",
        `
## Naming a device is only step one
Examiners reward the **effect**, not the label. Always ask: *what does this make the reader think, feel or picture?*

## Imagery
- **Simile**: a comparison using *like* or *as*. "Her voice was like cold water."
- **Metaphor**: saying something *is* something else. "The classroom was a zoo."
- **Personification**: giving human qualities to non-human things. "The wind howled."

## Sound
- **Alliteration**: repeated consonant sounds. "Silent, slow, sinister."
- **Onomatopoeia**: words that sound like their meaning. "Crash", "hiss".
- **Sibilance**: repeated *s* sounds, often soft or menacing.

## Structure and emphasis
- **Juxtaposition**: placing contrasting ideas side by side.
- **Repetition** and the **rule of three** create emphasis and rhythm.
- **Short sentences** build tension or impact.
- **Foreshadowing** hints at what's to come.

## A sentence frame that works
*The writer uses* [device] *in* "[quotation]" *to suggest* [meaning], *which makes the reader feel* [effect].
`,
        [
          ["Metaphor", "A direct comparison stating one thing is another, without 'like' or 'as'."],
          ["Juxtaposition", "Placing two contrasting ideas close together for effect."],
          ["Foreshadowing", "Hints or clues about events later in a text."],
          ["Personification", "Giving human qualities or actions to something non-human."],
        ],
        [
          ["What is the difference between a simile and a metaphor?", "A simile compares using 'like' or 'as'; a metaphor says one thing *is* another."],
          ["What effect can short sentences create?", "Tension, shock or emphasis."],
          ["What is sibilance?", "Repetition of 's' sounds, which can feel soft, secretive or menacing."],
          ["What matters more in analysis: naming the device or its effect?", "The effect on the reader."],
        ],
        [
          ["\"The stars danced in the sky\" is an example of…", ["simile", "personification", "onomatopoeia", "alliteration"], 1, "Stars can't dance; a human action is given to them."],
          ["\"Life is a rollercoaster\" is a…", ["simile", "metaphor", "hyperbole", "pun"], 1, "It states life *is* a rollercoaster, with no 'like' or 'as'."],
          ["A writer places a lavish wedding next to a starving beggar. This is…", ["foreshadowing", "juxtaposition", "sibilance", "an oxymoron"], 1, "Contrasting ideas are placed side by side."],
          ["Which is the strongest analysis?", ["It's a simile.", "The simile is good.", "The simile 'cold as a grave' suggests the room feels lifeless, unsettling the reader.", "There are many similes."], 2, "It quotes, explains meaning and gives an effect."],
        ],
      ),
      topic(
        "eng-poetry",
        "Analysing poetry",
        "Form, structure, language and how to write about a poem.",
        `
## Four lenses for any poem
1. **Content**: what happens? Who is the speaker? What is the situation?
2. **Language**: word choices, imagery and sound.
3. **Form**: the type of poem (sonnet, free verse, ballad, dramatic monologue).
4. **Structure**: stanzas, line lengths, rhyme, rhythm and **shifts** (volta).

## Useful terms
- **Enjambment**: a sentence runs over a line break, creating flow or urgency.
- **Caesura**: a pause in the middle of a line, often a full stop or dash.
- **Volta**: a turn in thought or tone.
- **Tone**: the attitude of the speaker (bitter, nostalgic, defiant…).

## Speaker vs poet
Write "**the speaker**", not "the poet". The voice may not be the poet's own.

## Planning a response
- Open with a clear idea about the poem's **message**.
- Track how the **tone changes** from start to end.
- Zoom in on single words: "The verb 'clawed' suggests…"
- Link form and structure to meaning. Don't just spot them.
`,
        [
          ["Enjambment", "When a sentence continues past the end of a line of poetry."],
          ["Caesura", "A pause in the middle of a line of poetry."],
          ["Volta", "A turn or shift in a poem's argument or mood."],
          ["Tone", "The speaker's attitude or mood, conveyed through language."],
        ],
        [
          ["Why write 'the speaker' rather than 'the poet'?", "The voice in a poem is a persona and may not be the poet's own."],
          ["What might enjambment suggest?", "Flow, urgency, or thoughts spilling over."],
          ["Name the four lenses for analysing a poem.", "Content, language, form, structure."],
          ["What is a volta?", "A turn in the poem's thought or tone."],
        ],
        [
          ["A full stop in the middle of a line is a…", ["caesura", "stanza", "couplet", "volta"], 0, "A mid-line pause is a caesura."],
          ["A 14-line poem, often with a volta, is a…", ["ballad", "haiku", "sonnet", "limerick"], 2, "Sonnets have 14 lines and traditionally a turn."],
          ["A poem written as one character talking to a silent listener is a…", ["dramatic monologue", "free verse", "ode", "elegy"], 0, "A dramatic monologue is spoken by a persona to a silent listener."],
          ["Which sentence best analyses structure?", ["The poem has four stanzas.", "The final stanza shortens abruptly, mirroring the speaker's collapse into silence.", "It rhymes.", "The poem is long."], 1, "It links a structural feature to meaning."],
        ],
      ),
      topic(
        "eng-narrative",
        "Narrative voice and perspective",
        "Who tells the story, and how that shapes what we believe.",
        `
## Points of view
- **First person** ("I"): intimate and personal, but limited and possibly biased.
- **Second person** ("you"): rare; pulls the reader into the action.
- **Third person limited**: follows one character's thoughts.
- **Third person omniscient**: an all-knowing narrator who sees into many minds.

## Reliability
An **unreliable narrator** can't be fully trusted, because they may be naive, lying, mentally unwell or biased. Look for gaps between what they say and what other evidence shows.

## Characterisation
Writers reveal character through **STEAL**:
- **S**peech: what they say.
- **T**houghts.
- **E**ffect on others.
- **A**ctions.
- **L**ooks.

## Narrative structure
Exposition → rising action → **climax** → falling action → resolution. Writers also use **flashbacks**, **cliffhangers** and **non-linear** timelines to control what the reader knows and when.
`,
        [
          ["Unreliable narrator", "A narrator whose account the reader can't fully trust."],
          ["Omniscient narrator", "A third-person narrator who knows all characters' thoughts and events."],
          ["Characterisation", "The methods a writer uses to create and reveal a character."],
          ["Climax", "The point of highest tension or turning point in a story."],
        ],
        [
          ["What does STEAL stand for?", "Speech, Thoughts, Effect on others, Actions, Looks."],
          ["What is a limitation of first-person narration?", "We only see one perspective, which may be biased."],
          ["What does an omniscient narrator know?", "Everything, including the thoughts of multiple characters."],
          ["Name a technique that disrupts chronological order.", "A flashback (or a non-linear timeline)."],
        ],
        [
          ["\"I walked in and everyone stared at me.\" This is…", ["first person", "second person", "third person limited", "omniscient"], 0, "The narrator uses 'I'."],
          ["A narrator who says they're calm while describing shaking hands may be…", ["omniscient", "unreliable", "second person", "objective"], 1, "The gap between claim and evidence suggests unreliability."],
          ["The turning point of highest tension is the…", ["exposition", "climax", "resolution", "falling action"], 1, "The climax is the peak of the story's tension."],
          ["Why might a writer end a chapter on a cliffhanger?", ["To summarise events", "To build suspense and make the reader continue", "To introduce characters", "To slow the pace"], 1, "Cliffhangers create suspense."],
        ],
      ),
    ]),
    unit("eng-writing", "Writing with purpose", [
      topic(
        "eng-peel",
        "Analytical essays (PEEL)",
        "Structuring clear, evidenced paragraphs and essays.",
        `
## The PEEL paragraph
- **P**oint: a clear claim that answers the question.
- **E**vidence: a short, embedded quotation.
- **E**xplain: analyse *how* the language creates meaning; zoom in on words.
- **L**ink: connect back to the question or the writer's purpose.

## Embedding quotations
Weak: *The writer says "the sky was bruised". This shows…*
Better: *The "bruised" sky implies the landscape itself has been wounded…*

## Thesis statements
Your introduction should contain an **arguable** thesis, not a fact.
Fact: *The novel is about war.*
Thesis: *The novel presents war as a force that destroys innocence more than lives.*

## MYP Criterion A tips
- Analyse the **writer's choices** and their **effect on the audience**.
- Use subject terminology accurately.
- Consider **alternative interpretations** ("This could also suggest…").

## Conclusion
Return to your thesis, draw your ideas together, and add a final insight about the writer's purpose. Don't just repeat.
`,
        [
          ["Thesis", "The central, arguable claim of an essay."],
          ["Embedded quotation", "A short quotation woven into your own sentence."],
          ["PEEL", "Point, Evidence, Explain, Link: a structure for analytical paragraphs."],
          ["Interpretation", "A reasoned reading of what a text means."],
        ],
        [
          ["What does PEEL stand for?", "Point, Evidence, Explain, Link."],
          ["What makes a good thesis?", "It is arguable and specific, not just a fact."],
          ["Why embed quotations?", "It keeps writing fluent and focuses on key words."],
          ["How can you show higher-level thinking?", "Offer alternative interpretations and link to the writer's purpose."],
        ],
        [
          ["Which is an arguable thesis?", ["Macbeth is a play by Shakespeare.", "Macbeth has five acts.", "Shakespeare presents ambition as a corrupting force that destroys Macbeth's humanity.", "Macbeth is set in Scotland."], 2, "It makes a claim someone could argue with."],
          ["In PEEL, the 'Explain' step should…", ["retell the plot", "analyse how language creates meaning", "introduce a new quotation", "summarise the essay"], 1, "Explaining means analysing effect."],
          ["Which quotation is best embedded?", ["He says, \"I am alone.\" This shows he's lonely.", "His admission that he is \"alone\" exposes a deep isolation.", "\"I am alone\" is a quote.", "Quote: \"I am alone\"."], 1, "The quotation flows naturally within the analysis."],
          ["A strong conclusion should…", ["introduce new evidence", "simply repeat the introduction", "draw ideas together and reflect on purpose", "list all the devices"], 2, "Synthesise, don't repeat."],
        ],
      ),
      topic(
        "eng-persuasion",
        "Persuasive techniques",
        "Rhetoric, appeals and devices used to convince an audience.",
        `
## Aristotle's three appeals
- **Ethos**: credibility or trust. "As a doctor with 20 years' experience…"
- **Pathos**: emotion. "Imagine a child going to bed hungry."
- **Logos**: logic and evidence. "78% of students reported…"

## AFOREST devices
- **A**lliteration
- **F**acts
- **O**pinions presented as facts
- **R**hetorical questions: "Can we really ignore this?"
- **E**motive language
- **S**tatistics
- **T**riplets (rule of three): "clean, safe and fair"

## Other tools
- **Direct address**: "you", which makes it personal.
- **Inclusive language**: "we", "us", "together".
- **Counter-argument and rebuttal**: acknowledge the other side, then dismantle it.
- **Hyperbole**: deliberate exaggeration.

## Structuring a speech or article
Hook → clear position → 3 developed arguments (strongest last) → counter-argument → powerful call to action.
`,
        [
          ["Ethos", "Persuasion through credibility or character."],
          ["Pathos", "Persuasion through emotion."],
          ["Logos", "Persuasion through logic, reasoning and evidence."],
          ["Rhetorical question", "A question asked for effect, not expecting an answer."],
        ],
        [
          ["What are the three rhetorical appeals?", "Ethos, pathos, logos."],
          ["Why use inclusive pronouns like 'we'?", "They create unity and make the audience feel involved."],
          ["What is a rebuttal?", "Answering and dismantling an opposing argument."],
          ["Give an example of the rule of three.", "\"Clean, safe and fair.\""],
        ],
        [
          ["\"90% of dentists recommend this toothpaste\" mainly uses…", ["pathos", "logos", "hyperbole", "alliteration"], 1, "A statistic appeals to logic."],
          ["\"Think of the families who lost everything\" uses…", ["ethos", "pathos", "logos", "a rebuttal"], 1, "It aims to trigger emotion."],
          ["\"Some say uniforms limit expression; however, they reduce bullying…\" is…", ["a counter-argument and rebuttal", "hyperbole", "direct address", "a triplet"], 0, "It acknowledges the other side, then argues back."],
          ["Where should your strongest argument usually go?", ["First", "In the middle", "Last", "In the conclusion only"], 2, "Ending on your strongest point leaves the biggest impression."],
        ],
      ),
      topic(
        "eng-register",
        "Register, audience and purpose",
        "Adapting tone and style to fit the task.",
        `
## GAP: always plan for it
- **G**enre / text type: letter, speech, article, review, blog.
- **A**udience: who's reading? Age, knowledge, relationship.
- **P**urpose: to inform, persuade, entertain, argue, advise, describe.

## Register
- **Formal**: standard English, no contractions or slang, complex sentences. For a letter to a principal, or a report.
- **Informal**: contractions, a chatty tone, direct address. For a blog or a message to a friend.

## Text-type conventions
| Text type | Key features |
|---|---|
| Formal letter | Addresses, date, "Dear…", "Yours sincerely/faithfully" |
| Article | Headline, strapline, subheadings, columns |
| Speech | Greeting, direct address, rhetorical devices, sign-off |
| Review | Rating, opinion, balanced evaluation, recommendation |

## Sentence variety
Mix **simple**, **compound** and **complex** sentences. Start sentences differently: with an adverb, a verb, or a subordinate clause.

> Yours **sincerely** if you know the name; yours **faithfully** if you wrote "Dear Sir/Madam".
`,
        [
          ["Register", "The level of formality in language, chosen to suit audience and purpose."],
          ["Audience", "The intended readers or listeners of a text."],
          ["Purpose", "The reason a text is written, e.g. to persuade or inform."],
          ["Convention", "An expected feature of a particular text type."],
        ],
        [
          ["What does GAP stand for?", "Genre, Audience, Purpose."],
          ["When do you use 'Yours faithfully'?", "When the letter began 'Dear Sir/Madam'."],
          ["Give two features of formal register.", "No contractions or slang; complex sentences; standard English."],
          ["Name two conventions of an article.", "Headline, strapline, subheadings, columns."],
        ],
        [
          ["Which suits a letter to the head of school?", ["Hey! What's up?", "Dear Ms Rao, I am writing to propose…", "Yo, listen up", "OMG you won't believe this"], 1, "A formal register and correct greeting."],
          ["A letter that begins \"Dear Mr Kapoor\" should end…", ["Yours faithfully", "Yours sincerely", "Cheers", "From me"], 1, "A named recipient takes 'sincerely'."],
          ["A headline and strapline are conventions of…", ["a speech", "a diary", "an article", "a poem"], 2, "Articles use headlines and straplines."],
          ["The purpose of a travel review is mainly to…", ["entertain only", "inform and evaluate", "describe a person", "instruct"], 1, "Reviews inform readers and give a judgement."],
        ],
      ),
    ]),
    unit("eng-context", "Texts in context", [
      topic(
        "eng-context-interp",
        "Context and interpretation",
        "How historical, social and cultural context shapes meaning.",
        `
## What is context?
The circumstances around a text:
- **Historical**: when it was written or set.
- **Social and cultural**: values, class, gender roles, beliefs.
- **Biographical**: the writer's own life.
- **Reception**: how readers then and now respond.

## Using context well
Context should **explain a choice**, not be a history lesson.
Weak: *In the 1800s women couldn't vote.*
Strong: *The narrator's silence reflects a society in which women's voices were legally and socially dismissed, so her final outburst is quietly radical.*

## Multiple readings
Texts can be read through different lenses:
- **Feminist**: how are gender and power presented?
- **Marxist**: how is class or wealth presented?
- **Post-colonial**: how are empire and identity presented?

## MYP global contexts
Link texts to global contexts such as *identities and relationships*, *fairness and development* or *orientation in space and time* to explain why the text still matters.
`,
        [
          ["Context", "The historical, social, cultural and personal circumstances surrounding a text."],
          ["Critical lens", "A particular perspective (e.g. feminist) used to interpret a text."],
          ["Reception", "How audiences respond to a text at different times."],
          ["Global context", "An MYP framing (e.g. fairness and development) that connects learning to the world."],
        ],
        [
          ["How should context be used in an essay?", "To explain the writer's choices, not as a separate history lesson."],
          ["What does a feminist reading focus on?", "Gender, power and the representation of women."],
          ["Name two types of context.", "Historical, social/cultural, biographical, reception."],
          ["Why can a text mean different things to different readers?", "Readers bring different contexts, values and lenses."],
        ],
        [
          ["Which uses context best?", ["Dickens was born in 1812.", "Victorian London was big.", "Scrooge's cruelty to the poor critiques Victorian attitudes that blamed poverty on the poor themselves.", "Dickens wrote many books."], 2, "It links context to a textual choice."],
          ["A Marxist reading mainly examines…", ["gender", "class and power", "nature", "religion"], 1, "Marxist criticism focuses on class and economic power."],
          ["Reception context concerns…", ["the writer's childhood", "how audiences respond over time", "the setting only", "the printing process"], 1, "Reception is about audience responses."],
          ["Which MYP global context fits a text about injustice and inequality?", ["Scientific and technical innovation", "Fairness and development", "Personal and cultural expression", "Orientation in space and time"], 1, "Fairness and development covers rights, equality and justice."],
        ],
      ),
      topic(
        "eng-comparing",
        "Comparing texts",
        "Writing integrated comparisons of two texts.",
        `
## Integrated beats separate
Don't write everything about Text A, then everything about Text B. **Compare in every paragraph.**

## Comparative connectives
- Similarity: *similarly, likewise, in the same way, both writers…*
- Difference: *whereas, however, in contrast, conversely, on the other hand…*

## A comparative paragraph
1. **Point of comparison**: "Both texts present grief as isolating, but in contrast…"
2. Evidence and analysis from Text A.
3. Evidence and analysis from Text B.
4. Evaluate the **difference in method or effect**.

## What to compare
- Ideas, themes and messages.
- Tone and perspective.
- Language choices and imagery.
- Form and structure.
- Context and audience.

> Tip: focus on **how** the writers present an idea differently. That's where the marks are.
`,
        [
          ["Integrated comparison", "Discussing both texts together within each paragraph."],
          ["Comparative connective", "A linking word that shows similarity or difference, e.g. 'whereas'."],
          ["Theme", "A central idea or message explored in a text."],
          ["Perspective", "The viewpoint from which a text is written."],
        ],
        [
          ["Why is integrated comparison better?", "It keeps the focus on comparison and shows deeper analysis."],
          ["Give three connectives that show difference.", "Whereas, however, in contrast (also conversely, on the other hand)."],
          ["What should each comparative paragraph begin with?", "A point of comparison covering both texts."],
          ["Where are the most marks in comparison?", "Explaining how methods and effects differ."],
        ],
        [
          ["Which connective signals similarity?", ["Whereas", "Conversely", "Likewise", "However"], 2, "'Likewise' shows similarity."],
          ["The strongest comparative approach is…", ["Text A essay then Text B essay", "integrated comparison in each paragraph", "only discussing one text", "listing quotations"], 1, "Integrated comparison is most analytical."],
          ["\"Both poets explore war, but Owen's graphic imagery contrasts with Brooke's idealism.\" This is…", ["a thesis for comparison", "a quotation", "a counter-argument", "a summary of plot"], 0, "It sets up the central comparison."],
          ["Which is NOT a feature to compare?", ["Tone", "Structure", "Font size of the printed book", "Perspective"], 2, "Printing details aren't part of textual analysis."],
        ],
      ),
      topic(
        "eng-visual",
        "Visual texts and media",
        "Analysing adverts, posters, film stills and multimodal texts.",
        `
## Visual texts are "read" too
Posters, adverts, comics, infographics and film stills all use deliberate choices.

## Visual features
- **Layout and composition**: rule of thirds, focal point, white space.
- **Colour**: connotations (red = danger/passion, green = nature/health).
- **Typography**: font style, size and weight.
- **Images**: facial expressions, gaze (direct gaze engages the viewer), body language.
- **Camera angles**: low angle = power; high angle = vulnerability; close-up = emotion.

## Text and image together
Look at the **anchorage**: how words guide the meaning of an image, like a caption or slogan.

## Analysing an advert
1. Who is the **target audience**?
2. What is the **purpose**?
3. What **visual and verbal techniques** persuade?
4. What **values** does it promote or assume?

## Sentence frame
*The use of* [feature] *draws the viewer's eye to* [element], *suggesting* [meaning] *and encouraging* [audience] *to* [response].
`,
        [
          ["Connotation", "An idea or feeling associated with a word, colour or image."],
          ["Composition", "How elements are arranged within a visual frame."],
          ["Anchorage", "Text that fixes or directs the meaning of an image."],
          ["Focal point", "The part of an image that first draws the viewer's attention."],
        ],
        [
          ["What does a low camera angle suggest?", "Power or dominance."],
          ["What might the colour green connote?", "Nature, health, freshness or eco-friendliness."],
          ["What is anchorage?", "Text such as a caption or slogan that directs how an image is read."],
          ["What does direct gaze do in an advert?", "It engages the viewer and makes the message personal."],
        ],
        [
          ["A close-up of a crying face mainly creates…", ["distance", "emotion and empathy", "humour", "confusion"], 1, "Close-ups emphasise emotion."],
          ["A high-angle shot makes a subject look…", ["powerful", "vulnerable", "distant", "happy"], 1, "Looking down on a subject makes it seem small or weak."],
          ["A slogan under an image is an example of…", ["anchorage", "composition", "focal point", "gaze"], 0, "Words anchor the image's meaning."],
          ["Red in a road-safety poster most likely connotes…", ["calm", "danger or urgency", "wealth", "nature"], 1, "Red signals warning and danger."],
        ],
      ),
    ]),
  ],
};
