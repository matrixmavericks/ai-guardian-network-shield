import { Subject, topic, unit } from "./types";

export const maths: Subject = {
  slug: "extended-mathematics",
  name: "Extended Mathematics",
  group: "Mathematics",
  description: "Algebra, functions, geometry, trigonometry and statistics.",
  icon: "sigma",
  theme: { gradient: "linear-gradient(135deg, #F43F5E 0%, #E11D48 45%, #881337 100%)", accent: "#FDA4AF" },
  units: [
    unit("math-algebra", "Number and algebra", [
      topic(
        "math-indices",
        "Indices and surds",
        "Laws of indices, negative and fractional powers, and simplifying surds.",
        `
## Laws of indices
| Rule | Example |
|---|---|
| aᵐ × aⁿ = aᵐ⁺ⁿ | x³ × x⁴ = x⁷ |
| aᵐ ÷ aⁿ = aᵐ⁻ⁿ | y⁹ ÷ y² = y⁷ |
| (aᵐ)ⁿ = aᵐⁿ | (z²)⁵ = z¹⁰ |
| a⁰ = 1 | 7⁰ = 1 |
| a⁻ⁿ = 1 ÷ aⁿ | 2⁻³ = 1/8 |
| a^(1/n) = ⁿ√a | 27^(1/3) = 3 |

Fractional powers: **a^(m/n) = (ⁿ√a)ᵐ**. So 8^(2/3) = (∛8)² = 2² = **4**.

## Surds
A surd is a root that can't be simplified to a whole number, like √2.
- **√a × √b = √(ab)**
- Simplify by finding a square factor: √50 = √(25 × 2) = **5√2**.
- Add like surds only: 3√2 + 5√2 = 8√2.

## Rationalising the denominator
Multiply top and bottom by the surd: 6/√3 = 6√3/3 = **2√3**.
`,
        [
          ["Index (power)", "The small number showing how many times a base is multiplied by itself."],
          ["Surd", "An irrational root, such as √2, left in root form for exactness."],
          ["Rationalise", "Rewrite a fraction so its denominator contains no surd."],
          ["Reciprocal", "1 divided by a number; a⁻¹ is the reciprocal of a."],
        ],
        [
          ["Simplify x⁵ × x³.", "x⁸."],
          ["What is 5⁻²?", "1/25."],
          ["Simplify √72.", "6√2 (because 72 = 36 × 2)."],
          ["Evaluate 16^(3/4).", "8 (the 4th root of 16 is 2, and 2³ = 8)."],
        ],
        [
          ["Simplify (a³)⁴.", ["a⁷", "a¹²", "a⁶⁴", "4a³"], 1, "Multiply the powers: 3 × 4 = 12."],
          ["What is 9^(1/2)?", ["4.5", "3", "81", "18"], 1, "A power of 1/2 means square root: √9 = 3."],
          ["Simplify √48.", ["4√3", "3√4", "16√3", "2√12"], 0, "48 = 16 × 3, so √48 = 4√3."],
          ["Rationalise 10/√5.", ["2√5", "√5/2", "10√5", "5√2"], 0, "10√5/5 = 2√5."],
        ],
      ),
      topic(
        "math-linear",
        "Linear equations and inequalities",
        "Solving equations, simultaneous equations and inequalities.",
        `
## Solving linear equations
Do the same thing to both sides until x is alone.
3x + 7 = 22 → 3x = 15 → **x = 5**

With brackets, expand first: 2(x − 4) = 10 → 2x − 8 = 10 → 2x = 18 → **x = 9**.
With x on both sides, collect x terms on one side: 5x − 3 = 2x + 9 → 3x = 12 → **x = 4**.

## Simultaneous equations (elimination)
2x + y = 11 and x − y = 1
Add them: 3x = 12, so **x = 4**. Substitute: 4 − y = 1, so **y = 3**.
Check in both equations.

## Inequalities
Solve like equations, **but flip the sign when you multiply or divide by a negative**.
−2x > 6 → **x < −3**

On a number line: an open circle for < or >, a filled circle for ≤ or ≥.
`,
        [
          ["Equation", "A statement that two expressions are equal."],
          ["Inequality", "A statement using <, >, ≤ or ≥ to compare expressions."],
          ["Simultaneous equations", "Two or more equations with shared unknowns, solved together."],
          ["Substitution", "Replacing a variable with a known value or expression."],
        ],
        [
          ["Solve 4x − 5 = 19.", "x = 6."],
          ["When do you flip an inequality sign?", "When multiplying or dividing both sides by a negative number."],
          ["Solve x + y = 10 and x − y = 4.", "x = 7, y = 3."],
          ["What does a filled circle mean on a number line?", "The value is included (≤ or ≥)."],
        ],
        [
          ["Solve 5x + 3 = 38.", ["x = 6", "x = 7", "x = 8", "x = 41/5"], 1, "5x = 35, so x = 7."],
          ["Solve 3(x + 2) = 21.", ["x = 5", "x = 6", "x = 7", "x = 19/3"], 0, "3x + 6 = 21 → 3x = 15 → x = 5."],
          ["Solve −3x ≤ 12.", ["x ≤ −4", "x ≥ −4", "x ≤ 4", "x ≥ 4"], 1, "Divide by −3 and flip the sign: x ≥ −4."],
          ["Solve 2x + y = 7 and x + y = 4.", ["x = 3, y = 1", "x = 1, y = 3", "x = 2, y = 3", "x = 4, y = 0"], 0, "Subtract: x = 3; then 3 + y = 4, so y = 1."],
        ],
      ),
      topic(
        "math-quadratics",
        "Quadratics",
        "Expanding, factorising and solving quadratic equations.",
        `
## Expanding
(x + 3)(x + 5) = x² + 5x + 3x + 15 = **x² + 8x + 15**

## Factorising x² + bx + c
Find two numbers that **multiply to c** and **add to b**.
x² + 7x + 12: 3 × 4 = 12 and 3 + 4 = 7 → **(x + 3)(x + 4)**
Difference of two squares: **a² − b² = (a + b)(a − b)**, e.g. x² − 49 = (x + 7)(x − 7).

## Solving by factorising
x² − 5x + 6 = 0 → (x − 2)(x − 3) = 0 → **x = 2 or x = 3**

## The quadratic formula
For ax² + bx + c = 0:
**x = (−b ± √(b² − 4ac)) ÷ 2a**
The **discriminant** b² − 4ac tells you how many real roots:
- Positive: two roots
- Zero: one repeated root
- Negative: no real roots

## Graphs
y = ax² + bx + c is a **parabola**. It's U-shaped if a > 0, ∩-shaped if a < 0. The roots are where it crosses the x-axis.
`,
        [
          ["Quadratic", "An expression or equation where the highest power of x is 2."],
          ["Factorise", "Write an expression as a product of its factors (brackets)."],
          ["Root", "A solution of an equation; where a graph crosses the x-axis."],
          ["Discriminant", "b² − 4ac, which shows how many real roots a quadratic has."],
        ],
        [
          ["Factorise x² + 5x + 6.", "(x + 2)(x + 3)."],
          ["Give the quadratic formula.", "x = (−b ± √(b² − 4ac)) ÷ 2a."],
          ["Factorise x² − 25.", "(x + 5)(x − 5)."],
          ["If b² − 4ac < 0, how many real roots?", "None."],
        ],
        [
          ["Expand (x + 4)(x − 2).", ["x² + 2x − 8", "x² − 2x − 8", "x² + 6x − 8", "x² + 2x + 8"], 0, "x² − 2x + 4x − 8 = x² + 2x − 8."],
          ["Solve x² − 9x + 20 = 0.", ["x = 4 or 5", "x = −4 or −5", "x = 2 or 10", "x = 9 or 20"], 0, "(x − 4)(x − 5) = 0, so x = 4 or 5."],
          ["Factorise x² − 4x − 12.", ["(x − 6)(x + 2)", "(x + 6)(x − 2)", "(x − 3)(x + 4)", "(x − 12)(x + 1)"], 0, "−6 × 2 = −12 and −6 + 2 = −4."],
          ["How many real roots does x² + 2x + 5 = 0 have?", ["Two", "One", "None", "Infinitely many"], 2, "b² − 4ac = 4 − 20 = −16, which is negative."],
        ],
      ),
    ]),
    unit("math-functions", "Functions and sequences", [
      topic(
        "math-linear-graphs",
        "Linear graphs and gradient",
        "y = mx + c, gradients, and parallel and perpendicular lines.",
        `
## y = mx + c
- **m** is the **gradient** (steepness).
- **c** is the **y-intercept** (where the line crosses the y-axis).

## Finding the gradient
**m = (y₂ − y₁) ÷ (x₂ − x₁)**, i.e. rise over run.
From (1, 3) to (4, 12): m = (12 − 3) ÷ (4 − 1) = **3**.

## Equation of a line through two points
1. Find m.
2. Substitute one point into y = mx + c to find c.
Using (1, 3) with m = 3: 3 = 3(1) + c → c = 0 → **y = 3x**.

## Parallel and perpendicular lines
- **Parallel** lines have the **same gradient**.
- **Perpendicular** gradients multiply to **−1**: if one is 2, the other is −½.

## Midpoint and distance
- Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2)
- Distance = √((x₂ − x₁)² + (y₂ − y₁)²)
`,
        [
          ["Gradient", "The steepness of a line: change in y divided by change in x."],
          ["y-intercept", "The point where a graph crosses the y-axis."],
          ["Perpendicular", "Meeting at a right angle; gradients multiply to −1."],
          ["Parallel", "Lines that never meet and have equal gradients."],
        ],
        [
          ["In y = 5x − 2, what is the gradient?", "5."],
          ["What is the gradient perpendicular to 4?", "−1/4."],
          ["Gradient between (0, 1) and (2, 9)?", "4."],
          ["Where does y = 2x + 7 cross the y-axis?", "At (0, 7)."],
        ],
        [
          ["Which line is parallel to y = 3x + 1?", ["y = −3x + 1", "y = 3x − 5", "y = x/3 + 1", "y = −x/3"], 1, "Parallel lines share the gradient 3."],
          ["Gradient of the line through (2, 5) and (6, 13)?", ["2", "4", "8", "1/2"], 0, "(13 − 5) ÷ (6 − 2) = 8 ÷ 4 = 2."],
          ["A line perpendicular to y = −2x + 3 has gradient…", ["2", "−2", "1/2", "−1/2"], 2, "−2 × ½ = −1."],
          ["Midpoint of (2, 4) and (8, 10)?", ["(5, 7)", "(6, 6)", "(10, 14)", "(3, 3)"], 0, "((2+8)/2, (4+10)/2) = (5, 7)."],
        ],
      ),
      topic(
        "math-functions-notation",
        "Functions, domain and range",
        "Function notation, composite and inverse functions.",
        `
## Function notation
f(x) = 2x + 3 means "the function f doubles x then adds 3".
f(4) = 2(4) + 3 = **11**.

## Domain and range
- **Domain**: the set of allowed **inputs** (x-values).
- **Range**: the set of resulting **outputs** (y-values).
For f(x) = x², the domain is all real numbers and the range is **f(x) ≥ 0**.
For f(x) = 1/x, x = 0 is **excluded** from the domain.

## Composite functions
fg(x) means **apply g first, then f**.
If f(x) = x + 1 and g(x) = 3x: fg(x) = f(3x) = **3x + 1**, but gf(x) = 3(x + 1) = **3x + 3**.

## Inverse functions
f⁻¹(x) reverses f. To find it:
1. Write y = f(x).
2. Swap x and y.
3. Rearrange for y.
f(x) = 2x + 3 → x = 2y + 3 → **f⁻¹(x) = (x − 3)/2**.
The graph of f⁻¹ is the reflection of f in the line **y = x**.
`,
        [
          ["Function", "A rule that maps each input to exactly one output."],
          ["Domain", "The set of possible input values of a function."],
          ["Range", "The set of possible output values of a function."],
          ["Inverse function", "A function that reverses the effect of the original, written f⁻¹."],
        ],
        [
          ["If f(x) = x² − 1, find f(3).", "8."],
          ["Which function is applied first in fg(x)?", "g."],
          ["Find the inverse of f(x) = x − 7.", "f⁻¹(x) = x + 7."],
          ["What is the range of f(x) = x²?", "f(x) ≥ 0."],
        ],
        [
          ["f(x) = 3x − 2. Find f(−1).", ["−5", "−1", "1", "5"], 0, "3(−1) − 2 = −5."],
          ["f(x) = x + 2, g(x) = x². Find fg(3).", ["11", "25", "9", "7"], 0, "g(3) = 9, then f(9) = 11."],
          ["Inverse of f(x) = 4x + 1?", ["(x − 1)/4", "(x + 1)/4", "4x − 1", "1/(4x + 1)"], 0, "x = 4y + 1 → y = (x − 1)/4."],
          ["Which value must be excluded from the domain of f(x) = 1/(x − 2)?", ["0", "1", "2", "−2"], 2, "x = 2 makes the denominator zero."],
        ],
      ),
      topic(
        "math-sequences",
        "Sequences",
        "Arithmetic and geometric sequences and their nth terms.",
        `
## Arithmetic sequences
Add the same **common difference d** each time: 5, 8, 11, 14…
**nth term = a + (n − 1)d**, or simplified as dn + (a − d).
For 5, 8, 11, 14: d = 3 → **3n + 2**. The 20th term is 3(20) + 2 = **62**.

**Sum of the first n terms**: Sₙ = n/2 × (2a + (n − 1)d).

## Geometric sequences
Multiply by the same **common ratio r**: 3, 6, 12, 24…
**nth term = a × rⁿ⁻¹**
For 3, 6, 12…: r = 2 → uₙ = 3 × 2ⁿ⁻¹. The 6th term is 3 × 2⁵ = **96**.

## Is a number in the sequence?
Set the nth term equal to the number and solve. If n is a positive whole number, it's in the sequence.
Is 100 in 3n + 2? 3n = 98 → n = 32.67, **not a whole number**, so no.

## Quadratic sequences
If the **second differences** are constant, the nth term includes n². For 2, 5, 10, 17…, the nth term is **n² + 1**.
`,
        [
          ["Arithmetic sequence", "A sequence with a constant difference between terms."],
          ["Geometric sequence", "A sequence with a constant ratio between terms."],
          ["Common difference", "The fixed amount added each time in an arithmetic sequence."],
          ["nth term", "A formula that gives any term from its position n."],
        ],
        [
          ["nth term of 4, 7, 10, 13…?", "3n + 1."],
          ["Common ratio of 5, 15, 45…?", "3."],
          ["Give the nth term formula for a geometric sequence.", "a × rⁿ⁻¹."],
          ["How do you spot a quadratic sequence?", "The second differences are constant."],
        ],
        [
          ["nth term of 7, 12, 17, 22…?", ["5n + 2", "5n + 7", "7n + 5", "n + 5"], 0, "d = 5, and 5(1) + 2 = 7 ✔."],
          ["The 10th term of 2, 6, 18, 54… is…", ["2 × 3⁹", "2 × 3¹⁰", "3 × 2⁹", "20"], 0, "a = 2, r = 3, so u₁₀ = 2 × 3⁹."],
          ["Is 50 a term of 4n + 2?", ["Yes, n = 12", "Yes, n = 13", "No", "Yes, n = 48"], 0, "4n + 2 = 50 → n = 12, a whole number."],
          ["nth term of 3, 6, 11, 18…?", ["n² + 2", "3n", "n² + 3", "2n + 1"], 0, "Second difference 2 → n²; n² gives 1, 4, 9, 16, so add 2."],
        ],
      ),
    ]),
    unit("math-geo-stats", "Geometry, probability and statistics", [
      topic(
        "math-trig",
        "Pythagoras and trigonometry",
        "Right-angled triangles, SOHCAHTOA, and the sine and cosine rules.",
        `
## Pythagoras' theorem
In a right-angled triangle: **a² + b² = c²**, where c is the **hypotenuse** (longest side, opposite the right angle).
Sides 6 and 8 → c = √(36 + 64) = √100 = **10**.

## SOHCAHTOA
- **sin θ = O/H**
- **cos θ = A/H**
- **tan θ = O/A**
Label sides from the angle: Opposite, Adjacent, Hypotenuse.
Finding an angle: use the inverse function, e.g. θ = tan⁻¹(O/A).

Example: opposite = 5, hypotenuse = 10 → sin θ = 0.5 → **θ = 30°**.

## Non-right-angled triangles (Extended)
- **Sine rule**: a/sin A = b/sin B = c/sin C
- **Cosine rule**: a² = b² + c² − 2bc cos A
- **Area** = ½ab sin C

Use the cosine rule when you know **two sides and the included angle**, or **all three sides**.
`,
        [
          ["Hypotenuse", "The longest side of a right-angled triangle, opposite the right angle."],
          ["SOHCAHTOA", "Memory aid for sin = O/H, cos = A/H, tan = O/A."],
          ["Sine rule", "a/sin A = b/sin B = c/sin C, for any triangle."],
          ["Angle of elevation", "The angle measured upwards from the horizontal."],
        ],
        [
          ["State Pythagoras' theorem.", "a² + b² = c², where c is the hypotenuse."],
          ["What is tan θ?", "Opposite ÷ adjacent."],
          ["Give the formula for the area of any triangle using sine.", "½ab sin C."],
          ["When do you use the cosine rule?", "With two sides and the included angle, or all three sides."],
        ],
        [
          ["A right triangle has legs 5 and 12. The hypotenuse is…", ["13", "17", "√119", "60"], 0, "√(25 + 144) = √169 = 13."],
          ["sin 30° equals…", ["0.5", "√3/2", "1", "√2/2"], 0, "sin 30° = 1/2 exactly."],
          ["Opposite = 7, adjacent = 7. The angle is…", ["30°", "45°", "60°", "90°"], 1, "tan θ = 1, so θ = 45°."],
          ["Area of a triangle with sides 8 and 10 and an included angle of 30°?", ["20", "40", "80", "10"], 0, "½ × 8 × 10 × sin 30° = 40 × 0.5 = 20."],
        ],
      ),
      topic(
        "math-probability",
        "Probability",
        "Single and combined events, tree diagrams and Venn diagrams.",
        `
## Basics
**P(event) = favourable outcomes ÷ total outcomes**, from 0 (impossible) to 1 (certain).
**P(not A) = 1 − P(A)**

## Combined events
- **Independent** events (AND): **P(A and B) = P(A) × P(B)**
- **Mutually exclusive** events (OR): **P(A or B) = P(A) + P(B)**

## Tree diagrams
Multiply **along** branches; add **between** final outcomes.
Two coin flips: P(two heads) = ½ × ½ = **¼**.

## Without replacement
The second probability changes. A bag has 3 red and 2 blue: P(red then red) = 3/5 × 2/4 = **3/10**.

## Venn diagrams
- A ∪ B: in A **or** B (or both).
- A ∩ B: in **both** A and B.
- P(A or B) = P(A) + P(B) − P(A ∩ B).

## Expected frequency
**expected = probability × number of trials**. Rolling a die 60 times, expect about 60 × 1/6 = **10** sixes.
`,
        [
          ["Independent events", "Events where one happening doesn't affect the probability of the other."],
          ["Mutually exclusive", "Events that cannot happen at the same time."],
          ["Sample space", "The set of all possible outcomes."],
          ["Expected frequency", "Probability × number of trials."],
        ],
        [
          ["If P(rain) = 0.3, what is P(no rain)?", "0.7."],
          ["What do you do along the branches of a tree diagram?", "Multiply."],
          ["What does A ∩ B mean?", "Outcomes in both A and B."],
          ["Expected sixes in 120 rolls of a fair die?", "20."],
        ],
        [
          ["P(rolling an even number on a fair die) = ?", ["1/6", "1/3", "1/2", "2/3"], 2, "2, 4, 6: 3 out of 6 = 1/2."],
          ["Two fair coins are flipped. P(both tails) = ?", ["1/2", "1/4", "1/3", "3/4"], 1, "½ × ½ = ¼."],
          ["A bag has 4 red and 6 blue. Two are taken without replacement. P(both red)?", ["16/100", "2/15", "4/25", "1/5"], 1, "4/10 × 3/9 = 12/90 = 2/15."],
          ["P(A) = 0.5, P(B) = 0.4, P(A ∩ B) = 0.2. P(A ∪ B) = ?", ["0.9", "0.7", "0.2", "1.1"], 1, "0.5 + 0.4 − 0.2 = 0.7."],
        ],
      ),
      topic(
        "math-statistics",
        "Statistics",
        "Averages, spread, grouped data and interpreting graphs.",
        `
## Averages
- **Mean** = total ÷ number of values.
- **Median** = middle value when ordered.
- **Mode** = most common value.

## Spread
- **Range** = largest − smallest.
- **Interquartile range (IQR)** = Q3 − Q1. It ignores extreme values, so it's more reliable than the range.

## Grouped frequency tables
Estimate the mean using **midpoints**: Σ(midpoint × frequency) ÷ Σfrequency.
It's an *estimate* because you don't know the exact values.

## Box plots
Show min, Q1, median, Q3 and max. To compare two data sets, **compare a measure of average (median) and a measure of spread (IQR)** in context.

## Scatter graphs
- **Correlation**: positive, negative or none.
- A **line of best fit** can be used to estimate values; don't extrapolate far beyond the data.
- Correlation doesn't prove causation.

## Outliers
Values far from the rest. They affect the **mean** and **range** a lot, and the median and IQR very little.
`,
        [
          ["Median", "The middle value when data is placed in order."],
          ["Interquartile range", "Upper quartile minus lower quartile; the spread of the middle 50%."],
          ["Correlation", "A relationship between two variables shown on a scatter graph."],
          ["Outlier", "A value that is very different from the rest of the data."],
        ],
        [
          ["Mean of 4, 6, 8, 10, 12?", "8."],
          ["How is IQR calculated?", "Upper quartile (Q3) − lower quartile (Q1)."],
          ["Why is a grouped mean only an estimate?", "The exact values in each group are unknown, so midpoints are used."],
          ["Which average is least affected by outliers?", "The median."],
        ],
        [
          ["Median of 3, 9, 4, 7, 5?", ["4", "5", "7", "5.6"], 1, "Ordered: 3, 4, 5, 7, 9; the middle value is 5."],
          ["Range of 12, 5, 19, 8?", ["14", "7", "11", "19"], 0, "19 − 5 = 14."],
          ["Q1 = 15 and Q3 = 42. IQR = ?", ["27", "57", "28.5", "15"], 0, "42 − 15 = 27."],
          ["As temperature rises, ice-cream sales rise. This is…", ["negative correlation", "positive correlation", "no correlation", "causation proven"], 1, "Both increase together: positive correlation."],
        ],
      ),
    ]),
  ],
};
