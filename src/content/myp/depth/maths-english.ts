import { depth } from "./types";

// Deeper study layer for Mathematics and Language & Literature topics.

export const MATHS_ENGLISH_DEPTH = Object.fromEntries([
  /* ================= Mathematics ================= */
  depth(
    "math-indices",
    ["Use the laws of indices, including negative and fractional powers", "Simplify surds", "Rationalise a denominator"],
    ["Scientific and technical innovation", "Scientists write the size of a virus (about 1 × 10⁻⁷ m) in standard form using indices."],
    {
      worked: {
        problem: "Simplify (2x³)² × x⁻¹.",
        steps: ["Square each part: (2x³)² = 4x⁶.", "Multiply by x⁻¹: add the powers, 6 + (−1) = 5.", "So the answer is 4x⁵."],
        answer: "4x⁵",
      },
      exam: [
        ["Evaluate", "A", 2, "Evaluate 27^(2/3) without a calculator.", ["Cube root of 27 is 3", "3² = 9"]],
        ["Simplify", "A", 3, "Rationalise the denominator of 6 ÷ √3 and simplify.", ["Multiply top and bottom by √3", "6√3 ÷ 3", "= 2√3"]],
      ],
      mistakes: ["Multiplying powers when you should add them (x² × x³ = x⁵, not x⁶).", "Thinking x⁰ = 0 (it is 1).", "Writing √a + √b = √(a + b)."],
    },
  ),
  depth(
    "math-linear",
    ["Solve linear equations with brackets and fractions", "Solve linear inequalities", "Show solutions on a number line"],
    ["Fairness and development", "Phone plans compare costs with linear equations: which plan is cheaper after how many minutes?"],
    {
      diagrams: [[{ kind: "numberline", min: -5, max: 5, step: 1, intervals: [{ from: -2, to: 3, openFrom: true }] }, "−2 < x ≤ 3: an open circle means 'not included', a filled circle means 'included'."]],
      worked: {
        problem: "Solve 3(x − 2) = 2x + 5.",
        steps: ["Expand: 3x − 6 = 2x + 5.", "Subtract 2x from both sides: x − 6 = 5.", "Add 6: x = 11."],
        answer: "x = 11",
      },
      exam: [
        ["Solve", "A", 3, "Solve 5 − 2x > 11 and show your answer on a number line.", ["−2x > 6", "x < −3 (inequality flips when dividing by a negative)", "Open circle at −3 with arrow to the left"]],
        ["Solve", "A", 3, "Solve (x + 4) ÷ 3 = (2x − 1) ÷ 5.", ["Multiply out: 5(x + 4) = 3(2x − 1)", "5x + 20 = 6x − 3", "x = 23"]],
      ],
      mistakes: ["Forgetting to flip the inequality sign when multiplying or dividing by a negative.", "Only multiplying the first term inside a bracket.", "Using a closed circle for < or >."],
    },
  ),
  depth(
    "math-quadratics",
    ["Factorise and solve quadratics", "Use the quadratic formula", "Sketch parabolas showing roots, turning point and intercept"],
    ["Scientific and technical innovation", "The path of a basketball shot is a parabola, so quadratics predict where it lands."],
    {
      diagrams: [
        [
          { kind: "graph", x: [-3, 5], y: [-5, 8], functions: [{ expr: "x^2 - 2x - 3", label: "y = x² − 2x − 3" }], points: [{ x: -1, y: 0, label: "(−1, 0)" }, { x: 3, y: 0, label: "(3, 0)" }, { x: 1, y: -4, label: "turning point (1, −4)" }, { x: 0, y: -3, label: "(0, −3)" }] },
          "y = x² − 2x − 3 = (x + 1)(x − 3): roots at −1 and 3, turning point halfway between.",
        ],
      ],
      worked: {
        problem: "Solve x² − 2x − 3 = 0.",
        steps: ["Find two numbers that multiply to −3 and add to −2: −3 and +1.", "Factorise: (x − 3)(x + 1) = 0.", "So x − 3 = 0 or x + 1 = 0."],
        answer: "x = 3 or x = −1",
      },
      exam: [
        ["Solve", "A", 3, "Solve 2x² + 5x − 3 = 0.", ["Factorise: (2x − 1)(x + 3) = 0 (or use the formula)", "x = ½", "x = −3"]],
        ["Find", "B", 3, "By completing the square, find the turning point of y = x² − 6x + 5.", ["y = (x − 3)² − 9 + 5", "y = (x − 3)² − 4", "Turning point (3, −4)"]],
      ],
      mistakes: ["Getting the signs wrong when reading roots from brackets.", "Forgetting the ± in the quadratic formula.", "Dividing by x and losing the x = 0 solution."],
    },
  ),
  depth(
    "math-linear-graphs",
    ["Find the gradient between two points", "Write y = mx + c from a graph", "Identify parallel and perpendicular lines"],
    ["Fairness and development", "Taxi fares often follow y = mx + c: a fixed charge plus a rate per kilometre."],
    {
      diagrams: [
        [
          { kind: "graph", x: [-2, 5], y: [-2, 7], functions: [{ expr: "2x + 1", label: "y = 2x + 1" }, { expr: "-x + 4", label: "y = −x + 4", dashed: true }], points: [{ x: 1, y: 3, label: "(1, 3)" }] },
          "The lines meet at (1, 3), the solution of the simultaneous equations.",
        ],
      ],
      worked: {
        problem: "Find the equation of the line through (2, 5) and (6, 13).",
        steps: ["Gradient m = (13 − 5) ÷ (6 − 2) = 8 ÷ 4 = 2.", "Substitute (2, 5) into y = 2x + c: 5 = 4 + c.", "So c = 1."],
        answer: "y = 2x + 1",
      },
      exam: [
        ["Find", "A", 3, "Find the equation of the line perpendicular to y = 2x + 1 that passes through (4, 1).", ["Perpendicular gradient = −½", "1 = −½(4) + c, so c = 3", "y = −½x + 3"]],
        ["Solve", "A", 2, "Use the graph to solve 2x + 1 = −x + 4.", ["The lines cross at (1, 3)", "x = 1"], { kind: "graph", x: [-2, 5], y: [-2, 7], functions: [{ expr: "2x + 1", label: "y = 2x + 1" }, { expr: "-x + 4", label: "y = −x + 4", dashed: true }] }],
      ],
      mistakes: ["Dividing change in x by change in y.", "Mixing up the order of subtraction on top and bottom.", "Thinking perpendicular gradients are just negatives (they are negative reciprocals)."],
    },
  ),
  depth(
    "math-functions-notation",
    ["Use function notation f(x)", "Find composite and inverse functions", "State domain and range"],
    ["Scientific and technical innovation", "Currency converters are functions: put in rupees, get out dollars, and the inverse goes back."],
    {
      diagrams: [[{ kind: "graph", x: [-1, 10], y: [-1, 4], functions: [{ expr: "sqrt(x - 1)", label: "f(x) = √(x − 1)", domain: [1, 10] }], points: [{ x: 1, y: 0, label: "(1, 0)" }] }, "f(x) = √(x − 1) has domain x ≥ 1 and range f(x) ≥ 0."]],
      worked: {
        problem: "f(x) = 2x + 3 and g(x) = x². Find fg(2) and gf(2).",
        steps: ["fg(2): do g first. g(2) = 4, then f(4) = 11.", "gf(2): do f first. f(2) = 7, then g(7) = 49.", "Order matters!"],
        answer: "fg(2) = 11, gf(2) = 49",
      },
      exam: [
        ["Find", "A", 3, "Find the inverse of f(x) = (3x − 1) ÷ 2.", ["Let y = (3x − 1) ÷ 2 and swap x and y", "2x = 3y − 1, so y = (2x + 1) ÷ 3", "f⁻¹(x) = (2x + 1) ÷ 3"]],
        ["State", "A", 2, "State the domain and range of f(x) = √(x − 1).", ["Domain x ≥ 1", "Range f(x) ≥ 0"]],
      ],
      mistakes: ["Doing composite functions in the wrong order.", "Thinking f⁻¹(x) means 1 ÷ f(x).", "Forgetting values that make a square root or denominator undefined."],
    },
  ),
  depth(
    "math-sequences",
    ["Find the nth term of arithmetic sequences", "Recognise geometric and quadratic sequences", "Use sequences to model patterns"],
    ["Orientation in space and time", "Savings accounts with compound interest grow as a geometric sequence."],
    {
      diagrams: [[{ kind: "graph", x: [0, 6], y: [0, 24], xStep: 1, yStep: 4, points: [{ x: 1, y: 3 }, { x: 2, y: 7 }, { x: 3, y: 11 }, { x: 4, y: 15 }, { x: 5, y: 19, label: "uₙ = 4n − 1" }], xLabel: "n", yLabel: "term" }, "An arithmetic sequence plots as points on a straight line."]],
      worked: {
        problem: "Find the nth term of 3, 7, 11, 15, …",
        steps: ["The common difference is 4, so the sequence is based on 4n.", "4n gives 4, 8, 12, … which is 1 more than each term.", "So subtract 1."],
        answer: "4n − 1",
      },
      exam: [
        ["Find", "B", 2, "Is 101 a term in the sequence 4n − 1? Justify your answer.", ["4n − 1 = 101 gives n = 25.5", "Not a whole number, so 101 is not a term"]],
        ["Find", "A", 3, "A geometric sequence starts 3, 6, 12, … Find the 8th term.", ["Common ratio r = 2", "u₈ = 3 × 2⁷", "= 384"]],
      ],
      mistakes: ["Writing n + 4 instead of 4n.", "Forgetting to check the zero term.", "Confusing arithmetic (add) and geometric (multiply) sequences."],
    },
  ),
  depth(
    "math-trig",
    ["Use Pythagoras' theorem", "Use SOHCAHTOA to find sides and angles", "Solve problems with angles of elevation and depression"],
    ["Orientation in space and time", "Surveyors measure the height of buildings and mountains using angles of elevation."],
    {
      diagrams: [[{ kind: "triangle", a: 5, b: 12, C: 90, unit: "cm", sideLabels: ["5 cm", "12 cm", "x"] }, "A right-angled triangle: the hypotenuse is opposite the right angle."]],
      worked: {
        problem: "Find x in the triangle.",
        steps: ["x is the hypotenuse, so use Pythagoras: x² = 5² + 12².", "x² = 25 + 144 = 169.", "x = √169 = 13."],
        answer: "x = 13 cm",
        diagram: { kind: "triangle", a: 5, b: 12, C: 90, unit: "cm", sideLabels: ["5 cm", "12 cm", "x"] },
      },
      exam: [
        ["Calculate", "A", 3, "Calculate angle θ, correct to 1 decimal place.", ["tan θ = 10 ÷ 7 (opposite ÷ adjacent)", "θ = tan⁻¹(10 ÷ 7)", "θ = 55.0°"], { kind: "triangle", a: 7, b: 10, C: 90, unit: "m", sideLabels: ["7 m", "10 m", null], angleLabels: [null, "θ", null] }],
        ["Solve", "D", 4, "A ladder 6 m long rests against a wall at 70° to the ground. How high up the wall does it reach? Is it safe if the rule says the base must be at least 1.5 m from the wall?", ["Height = 6 sin 70°", "= 5.64 m", "Base = 6 cos 70° = 2.05 m", "2.05 m ≥ 1.5 m, so it is safe"]],
      ],
      mistakes: ["Using Pythagoras when the triangle has no right angle.", "Calculator in radians instead of degrees.", "Labelling opposite and adjacent from the wrong angle."],
    },
  ),
  depth(
    "math-probability",
    ["Calculate probabilities of single and combined events", "Use tree diagrams and sample spaces", "Distinguish independent and dependent events"],
    ["Fairness and development", "Insurance companies use probability to set fair prices for policies."],
    {
      worked: {
        problem: "A bag has 3 red and 2 blue counters. Two are taken without replacement. Find P(both red).",
        steps: ["P(first red) = 3/5.", "One red is gone: P(second red) = 2/4.", "Multiply: 3/5 × 2/4 = 6/20."],
        answer: "3/10",
      },
      exam: [
        ["Calculate", "A", 2, "A fair dice is rolled twice. Calculate the probability of getting two sixes.", ["1/6 × 1/6", "= 1/36"]],
        ["Explain", "B", 3, "Explain why taking counters without replacement makes the events dependent, using the bag example.", ["The first pick changes what is left in the bag", "So the probability for the second pick changes (2/4 instead of 3/5)", "The outcome of one event affects the other"]],
      ],
      mistakes: ["Adding probabilities that should be multiplied (and vice versa).", "Forgetting to reduce the total without replacement.", "Probabilities that add up to more than 1."],
    },
  ),
  depth(
    "math-statistics",
    ["Calculate mean, median, mode and range", "Find the mean from a frequency table", "Compare data sets"],
    ["Fairness and development", "Governments use median income rather than mean because a few very high earners distort the mean."],
    {
      diagrams: [[{ kind: "chart", type: "bar", labels: ["4", "5", "6", "7", "8"], series: [{ name: "Frequency", values: [2, 5, 8, 4, 1] }], xLabel: "score", yLabel: "number of students" }, "Test scores for 20 students."]],
      worked: {
        problem: "Find the mean score from the chart (scores 4–8 with frequencies 2, 5, 8, 4, 1).",
        steps: ["Multiply each score by its frequency: 8 + 25 + 48 + 28 + 8 = 117.", "Total frequency = 20.", "Mean = 117 ÷ 20 = 5.85."],
        answer: "5.85",
      },
      exam: [
        ["Find", "A", 2, "Find the median score from the chart.", ["The 10th and 11th values", "Both are 6, so the median is 6"], { kind: "chart", type: "bar", labels: ["4", "5", "6", "7", "8"], series: [{ name: "Frequency", values: [2, 5, 8, 4, 1] }], xLabel: "score", yLabel: "number of students" }],
        ["Compare", "C", 3, "Class A: mean 62, range 40. Class B: mean 58, range 12. Compare the two classes.", ["Class A scored higher on average (higher mean)", "Class B's scores were more consistent (smaller range)", "Uses the numbers in context"]],
      ],
      mistakes: ["Dividing by the number of groups instead of the total frequency.", "Forgetting to order data before finding the median.", "Comparing only averages without spread."],
    },
  ),

  /* ================= Language & Literature ================= */
  depth(
    "eng-devices",
    ["Identify language devices", "Explain the effect of a device on the reader", "Write analytical sentences using evidence"],
    ["Personal and cultural expression", "Advertisers choose every word for its effect: the same devices appear in poems and adverts."],
    {
      worked: {
        problem: "Analyse: “The city was a hungry beast, swallowing commuters whole.”",
        steps: ["Identify: a metaphor (the city is a beast) with personification (swallowing).", "Explain: it makes the city seem alive, dangerous and uncaring.", "Effect: the reader feels how people lose their individuality in the rush."],
        answer: "The metaphor presents the city as a predator, suggesting commuters are powerless and consumed by urban life.",
      },
      exam: [
        ["Analyse", "A", 4, "Analyse how the writer creates tension in: “Silence. Then, somewhere below, a single floorboard creaked.”", ["Identifies the one-word sentence 'Silence.'", "Explains it slows the pace and builds suspense", "Identifies the sound / 'single' creak as a detail", "Explains the reader senses an unseen presence (fear, anticipation)"]],
        ["Identify", "A", 2, "Identify the device and its effect: “The wind whispered secrets through the trees.”", ["Personification", "Makes the setting feel mysterious / alive"]],
      ],
      mistakes: ["Naming a device without explaining its effect.", "Writing 'it makes the reader want to read on' for every device.", "Quoting too much instead of a short, precise quotation."],
    },
  ),
  depth(
    "eng-poetry",
    ["Analyse imagery, form and structure in poems", "Comment on sound (rhythm, rhyme, alliteration)", "Explore the poet's purpose"],
    ["Personal and cultural expression", "Poets from Rabindranath Tagore to today use images to make big ideas personal."],
    {
      worked: {
        problem: "How could you analyse a poem's structure?",
        steps: ["Look at the shape: stanza lengths, line breaks, enjambment.", "Notice shifts (a volta) in tone or time.", "Link each choice to meaning: e.g. short final line for emphasis."],
        answer: "Structure is analysed by linking visible choices (form, breaks, shifts) to the ideas and feelings they create.",
      },
      exam: [
        ["Analyse", "A", 4, "Analyse how the poet uses imagery in: “Her laughter was a lantern / in the long corridor of winter.”", ["Identifies the metaphor 'laughter was a lantern'", "Explains light / warmth against darkness and cold", "Comments on 'long corridor of winter' suggesting a difficult time", "Explores effect: she brings hope and comfort"]],
        ["Explain", "A", 2, "Explain the effect of enjambment in the extract.", ["The line runs on without a pause", "It carries the reader forward, like light moving down the corridor"]],
      ],
      mistakes: ["Retelling the poem instead of analysing it.", "Ignoring structure and form.", "Treating the speaker as the poet automatically."],
    },
  ),
  depth(
    "eng-narrative",
    ["Describe narrative structure", "Analyse characterisation", "Explain narrative perspective"],
    ["Identities and relationships", "Every film and series you watch follows the same basic story arc."],
    {
      diagrams: [
        [
          { kind: "graph", x: [0, 10], y: [0, 10], grid: false, segments: [{ from: [0, 2], to: [2, 2] }, { from: [2, 2], to: [6, 8] }, { from: [6, 8], to: [8, 4] }, { from: [8, 4], to: [10, 3] }], points: [{ x: 1, y: 2, label: "exposition" }, { x: 4, y: 5, label: "rising action" }, { x: 6, y: 8, label: "climax" }, { x: 8, y: 4, label: "falling action" }, { x: 10, y: 3, label: "resolution" }], xLabel: "story", yLabel: "tension" },
          "The narrative arc: tension builds to the climax, then eases to the resolution.",
        ],
      ],
      worked: {
        problem: "How does first-person narration change a story?",
        steps: ["The narrator uses 'I', so we only know their thoughts.", "It creates closeness and trust with the reader.", "But the narrator may be unreliable: they might hide or misread things."],
        answer: "It gives intimacy but a limited, possibly unreliable view.",
      },
      exam: [
        ["Explain", "A", 3, "Explain how a writer can show character without telling the reader directly.", ["Through dialogue (what they say and how)", "Through actions and reactions", "Through how other characters respond to them"]],
        ["Create", "C", 4, "Write the opening of a story (about 120 words) that establishes a setting and a hint of conflict.", ["Clear, vivid setting", "A hint of conflict or tension", "Deliberate language devices", "Accurate spelling, punctuation and paragraphing"]],
      ],
      mistakes: ["Summarising the plot instead of analysing technique.", "Confusing the author with the narrator.", "Ignoring how structure (flashbacks, cliffhangers) affects the reader."],
    },
  ),
  depth(
    "eng-peel",
    ["Build analytical paragraphs using PEEL", "Embed short quotations", "Link back to the question"],
    ["Personal and cultural expression", "Clear arguments win debates, job interviews and essays alike."],
    {
      worked: {
        problem: "Turn this into a PEEL paragraph: “The writer shows the storm is dangerous.”",
        steps: ["Point: The writer presents the storm as violent and threatening.", "Evidence: the verb 'hurled' in “waves hurled themselves at the harbour wall.”", "Explain: 'hurled' suggests deliberate force, as if the sea is attacking. Link: this builds a sense of danger for the villagers."],
        answer: "A four-part paragraph that makes a point, proves it, explains it and links to the question.",
      },
      exam: [
        ["Write", "B", 4, "Write a PEEL paragraph on how the writer creates a sense of hope in: “A thin line of gold broke across the grey sky.”", ["Clear point about hope", "Embedded quotation (e.g. 'thin line of gold')", "Explains colour contrast gold/grey and 'broke'", "Links back to hope / the question"]],
        ["Explain", "B", 2, "Explain why embedding short quotations is better than copying long ones.", ["It keeps the focus on specific words", "It shows precise analysis and keeps your sentences fluent"]],
      ],
      mistakes: ["Stopping after the evidence without explaining.", "Using long quotations that do the work for you.", "Forgetting the final link to the question."],
    },
  ),
  depth(
    "eng-persuasion",
    ["Identify persuasive techniques", "Evaluate how effective an argument is", "Write persuasively for an audience"],
    ["Fairness and development", "Campaigns against plastic waste use persuasive techniques to change behaviour."],
    {
      worked: {
        problem: "Identify the techniques: “Every single day, 8 million pieces of plastic enter our oceans. Can we really stand by?”",
        steps: ["Statistic: '8 million pieces' adds authority and shock.", "Rhetorical question: 'Can we really stand by?' involves the reader.", "Inclusive pronoun 'we' makes the reader feel responsible."],
        answer: "Statistics, a rhetorical question and inclusive language combine logic with emotion.",
      },
      exam: [
        ["Evaluate", "A", 4, "Evaluate how persuasive the extract above is for a teenage audience.", ["Identifies at least two techniques with evidence", "Explains the intended effect", "Considers the audience (teenagers) specifically", "Makes a judgement with a reason (e.g. powerful but lacks a clear action)"]],
        ["Write", "C", 4, "Write a short speech (about 150 words) persuading your school to ban single-use plastic.", ["Clear viewpoint and purpose", "At least three persuasive techniques", "Appropriate register for a school audience", "Structured with a call to action"]],
      ],
      mistakes: ["Listing techniques without effects.", "Ignoring the audience and purpose.", "Overusing rhetorical questions."],
    },
  ),
  depth(
    "eng-register",
    ["Adapt register to audience and purpose", "Use formal and informal features appropriately", "Improve vocabulary and sentence variety"],
    ["Identities and relationships", "We speak differently to friends, teachers and employers: that's register."],
    {
      worked: {
        problem: "Rewrite formally: “Hey, can u send me the stuff for the trip asap?”",
        steps: ["Replace the greeting: 'Dear Ms Rao,'.", "Use full words and precise vocabulary: 'the information about the trip'.", "Make the request polite and clear: 'at your earliest convenience'."],
        answer: "Dear Ms Rao, could you please send me the information about the trip at your earliest convenience? Kind regards…",
      },
      exam: [
        ["Rewrite", "D", 3, "Rewrite this for a formal letter: “The canteen food is honestly so bad, like nobody eats it.”", ["Removes slang and fillers ('honestly', 'like')", "Uses formal vocabulary (e.g. 'unpopular', 'many students')", "Keeps a polite, reasoned tone"]],
        ["Explain", "D", 2, "Explain why a writer might choose an informal register in a blog for teenagers.", ["To build a relationship / sound friendly and relatable", "It suits the audience and purpose (engaging readers)"]],
      ],
      mistakes: ["Thinking formal means using long words for their own sake.", "Mixing registers within one piece.", "Using contractions in formal letters."],
    },
  ),
  depth(
    "eng-context-interp",
    ["Link texts to their historical and cultural context", "Offer more than one interpretation", "Support interpretations with evidence"],
    ["Orientation in space and time", "Reading a text from 1900 today, we notice things its first readers took for granted."],
    {
      worked: {
        problem: "How do you bring context into an analysis without it taking over?",
        steps: ["Start with the text: analyse a quotation first.", "Then add context that explains a choice: 'Writing during the Partition of 1947, the author…'.", "Keep it relevant: every contextual point must link to meaning."],
        answer: "Context supports analysis; it doesn't replace it.",
      },
      exam: [
        ["Discuss", "A", 4, "Discuss two possible interpretations of a character who breaks a rule to help a friend.", ["Interpretation 1 (e.g. loyal and brave)", "Interpretation 2 (e.g. reckless or selfish)", "Evidence for each", "A reasoned view on which is more convincing"]],
        ["Explain", "A", 2, "Explain why readers today might react differently to a text than its first readers.", ["Values and attitudes change over time", "Readers bring their own experiences / cultural contexts"]],
      ],
      mistakes: ["Writing history essays instead of literary analysis.", "Offering only one possible meaning.", "Making claims about the writer's life with no link to the text."],
    },
  ),
  depth(
    "eng-comparing",
    ["Compare two texts' ideas and methods", "Use comparative connectives", "Organise a comparative response"],
    ["Personal and cultural expression", "Comparing two news reports of the same event reveals bias."],
    {
      worked: {
        problem: "How should a comparative paragraph be organised?",
        steps: ["Start with a comparative point: 'Both texts present nature as powerful, but…'.", "Analyse text A, then text B, using 'whereas', 'similarly', 'in contrast'.", "End with a judgement on the difference."],
        answer: "Point → Text A → connective → Text B → comparative conclusion.",
      },
      exam: [
        ["Compare", "B", 4, "Compare how two writers present the sea: one calm (“the sea breathed softly”) and one violent (“the sea roared and clawed”).", ["Comparative point about contrasting presentations", "Analysis of 'breathed softly' (calm, alive, gentle)", "Analysis of 'roared and clawed' (animalistic, violent)", "Comparative connectives and a concluding judgement"]],
        ["Explain", "B", 2, "Explain why writing about the texts separately scores lower than an integrated comparison.", ["It doesn't show the relationship between the texts", "Comparison criteria reward linking similarities and differences"]],
      ],
      mistakes: ["Writing two separate essays.", "Only comparing content, not methods.", "Using 'both' but then only discussing one text."],
    },
  ),
  depth(
    "eng-visual",
    ["Analyse images, posters and film stills", "Use terms like composition, colour, angle and focus", "Explain how visual choices persuade"],
    ["Personal and cultural expression", "A single campaign photo can shape how millions of people see an issue."],
    {
      worked: {
        problem: "How would you analyse a charity poster showing a child looking up at the camera?",
        steps: ["Camera angle: a high angle makes the child look small and vulnerable.", "Direct gaze creates a personal connection with the viewer.", "Colour and text: muted colours and a short slogan focus attention on the child."],
        answer: "Each visual choice is linked to the emotional response the charity wants: sympathy leading to donation.",
      },
      exam: [
        ["Analyse", "A", 4, "Analyse how a poster could use colour and composition to encourage recycling.", ["Colour choices (e.g. green = nature) and their effect", "Composition / focal point guides the eye", "Relationship between image and slogan", "Explains the intended audience response"]],
        ["Identify", "A", 2, "Identify two features of a low-angle shot and its effect.", ["The camera looks up at the subject", "Makes the subject seem powerful or threatening"]],
      ],
      mistakes: ["Describing what's in the image without explaining effects.", "Ignoring text and layout.", "Forgetting the audience and purpose."],
    },
  ),
]);
