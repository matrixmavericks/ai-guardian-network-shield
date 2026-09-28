import { Subject, topic, unit } from "./types";

export const chemistry: Subject = {
  slug: "chemistry",
  name: "Chemistry",
  group: "Sciences",
  description: "Particles, atoms, bonding and chemical reactions.",
  icon: "flask",
  theme: { gradient: "linear-gradient(135deg, #A855F7 0%, #7C3AED 45%, #4C1D95 100%)", accent: "#C084FC" },
  units: [
    unit("chem-matter", "Matter and the atom", [
      topic(
        "chem-states",
        "States of matter",
        "The particle model of solids, liquids and gases, and changes of state.",
        `
## The particle model
| State | Arrangement | Movement | Shape and volume |
|---|---|---|---|
| Solid | Regular, closely packed | Vibrate about fixed positions | Fixed shape and volume |
| Liquid | Irregular, close together | Slide past each other | Fixed volume, takes the container's shape |
| Gas | Random, far apart | Move quickly in all directions | Fills any container |

## Changes of state
- **Melting** (solid → liquid) and **boiling** (liquid → gas) need energy to overcome forces between particles.
- **Condensing** and **freezing** release energy.
- **Sublimation**: solid straight to gas (e.g. dry ice, solid CO₂).

## Heating curves
On a heating curve the temperature stays **flat** during a change of state, because energy is used to break forces between particles rather than to raise the temperature.

## Diffusion in gases
Gas particles spread out from high to low concentration. Lighter particles diffuse faster.

> Exam tip: when heating, it is the **forces between particles** that are overcome, not the bonds inside molecules.
`,
        [
          ["Melting point", "The temperature at which a solid turns into a liquid."],
          ["Sublimation", "A change of state directly from solid to gas."],
          ["Particle model", "A model explaining the properties of matter in terms of the arrangement and movement of particles."],
          ["Evaporation", "A liquid turning to gas at its surface, below its boiling point."],
        ],
        [
          ["Describe particles in a solid.", "Regularly arranged, tightly packed, vibrating about fixed positions."],
          ["Why is the temperature constant while a substance melts?", "Energy is used to overcome forces between particles, not to raise the temperature."],
          ["What is sublimation?", "A solid turning directly into a gas, e.g. dry ice."],
          ["Why can gases be compressed?", "There are large spaces between the particles."],
        ],
        [
          ["In which state do particles only vibrate about fixed positions?", ["Solid", "Liquid", "Gas", "Plasma"], 0, "Solid particles are held in place and can only vibrate."],
          ["Condensing is the change from…", ["solid to liquid", "gas to liquid", "liquid to solid", "solid to gas"], 1, "Condensation turns a gas back into a liquid, releasing energy."],
          ["Why does a heating curve have flat sections?", ["The thermometer stops working", "Energy is used to change state", "Particles stop moving", "No energy is added"], 1, "At a change of state, energy overcomes forces between particles."],
          ["Which state has the weakest forces between particles?", ["Solid", "Liquid", "Gas", "All the same"], 2, "Gas particles are far apart with very weak forces between them."],
        ],
      ),
      topic(
        "chem-atoms",
        "Atomic structure",
        "Protons, neutrons, electrons and how electrons are arranged.",
        `
## Inside the atom
| Particle | Relative mass | Charge | Location |
|---|---|---|---|
| Proton | 1 | +1 | Nucleus |
| Neutron | 1 | 0 | Nucleus |
| Electron | about 1/1840 | −1 | Shells around the nucleus |

## Atomic and mass numbers
- **Atomic number** = number of protons (this defines the element).
- **Mass number** = protons + neutrons.
- Neutrons = mass number − atomic number.
- In a neutral atom, electrons = protons.

Example: sodium, atomic number 11, mass number 23 → 11 protons, 12 neutrons, 11 electrons.

## Isotopes
Atoms of the same element with **different numbers of neutrons**, e.g. carbon-12 and carbon-14. They have the same chemical properties.

## Electron shells
Fill from the inside: **2, 8, 8**. Sodium (11) is **2, 8, 1**. The outer shell electrons decide how an element reacts.
`,
        [
          ["Atomic number", "The number of protons in the nucleus of an atom."],
          ["Mass number", "The total number of protons and neutrons in an atom."],
          ["Isotope", "Atoms of the same element with different numbers of neutrons."],
          ["Electron configuration", "The arrangement of electrons in shells, e.g. 2,8,1."],
        ],
        [
          ["What is the charge on a proton?", "+1."],
          ["How do you find the number of neutrons?", "Mass number − atomic number."],
          ["What is the electron configuration of chlorine (17)?", "2, 8, 7."],
          ["What do isotopes of an element have in common?", "The same number of protons (and so the same chemical properties)."],
        ],
        [
          ["An atom has atomic number 8 and mass number 16. How many neutrons?", ["8", "16", "24", "6"], 0, "Neutrons = 16 − 8 = 8."],
          ["Which particle has almost no mass?", ["Proton", "Neutron", "Electron", "Nucleus"], 2, "An electron's mass is about 1/1840 of a proton's."],
          ["What is the electron configuration of magnesium (12)?", ["2, 8, 2", "2, 10", "2, 8, 1, 1", "8, 2, 2"], 0, "First shell 2, second shell 8, remaining 2 in the third shell."],
          ["Carbon-12 and carbon-14 differ in their number of…", ["protons", "electrons", "neutrons", "shells"], 2, "Isotopes have the same protons but different neutrons."],
        ],
      ),
      topic(
        "chem-periodic",
        "The periodic table",
        "How the table is organised, and the trends in groups 1, 7 and 0.",
        `
## Organisation
- Elements are arranged by **increasing atomic number**.
- **Groups** (columns): same number of outer-shell electrons, so similar reactions.
- **Periods** (rows): same number of electron shells.
- Metals are on the left, non-metals on the right.

## Group 1: alkali metals
Soft metals that react with water to make hydrogen and an alkaline solution:
sodium + water → sodium hydroxide + hydrogen.
**Reactivity increases down the group**: the outer electron is further from the nucleus, so it is lost more easily.

## Group 7: halogens
Fluorine, chlorine, bromine, iodine. **Reactivity decreases down the group**: it gets harder to gain an electron. A more reactive halogen **displaces** a less reactive one from a solution of its salt.

## Group 0: noble gases
Full outer shells, so they are **unreactive**. Used in lights (neon) and balloons (helium).
`,
        [
          ["Group", "A vertical column of the periodic table; elements share the same number of outer electrons."],
          ["Period", "A horizontal row of the periodic table."],
          ["Alkali metal", "A Group 1 element such as lithium, sodium or potassium."],
          ["Displacement reaction", "A more reactive element takes the place of a less reactive one in a compound."],
        ],
        [
          ["Why do elements in a group react similarly?", "They have the same number of outer-shell electrons."],
          ["What is the trend in reactivity down Group 1?", "Reactivity increases."],
          ["Why are noble gases unreactive?", "They have full outer electron shells."],
          ["Will chlorine displace bromine from potassium bromide?", "Yes. Chlorine is more reactive than bromine."],
        ],
        [
          ["Which Group 1 metal is the most reactive?", ["Lithium", "Sodium", "Potassium", "They are equal"], 2, "Reactivity increases down Group 1; potassium is lowest of these three."],
          ["The periodic table is arranged in order of…", ["mass number", "atomic number", "date of discovery", "density"], 1, "Modern tables use increasing atomic (proton) number."],
          ["Which halogen is the most reactive?", ["Fluorine", "Chlorine", "Bromine", "Iodine"], 0, "Reactivity decreases down Group 7, so fluorine is most reactive."],
          ["Elements in the same period have the same number of…", ["outer electrons", "electron shells", "neutrons", "protons"], 1, "A period is a row; each row adds a new shell."],
        ],
      ),
    ]),
    unit("chem-reactions", "Bonding and reactions", [
      topic(
        "chem-bonding",
        "Ionic and covalent bonding",
        "How atoms join together, and how bonding explains properties.",
        `
## Ionic bonding: metal + non-metal
Electrons are **transferred**. The metal loses electrons to form a **positive ion**; the non-metal gains them to form a **negative ion**. Opposite charges attract.
Example: Na (2,8,1) gives one electron to Cl (2,8,7) → Na⁺ and Cl⁻.

**Properties**: high melting points (strong attraction in a giant lattice); conduct electricity when **molten or dissolved**, because ions can move.

## Covalent bonding: non-metal + non-metal
Atoms **share** pairs of electrons. Examples: H₂, H₂O, CO₂, CH₄.
- **Simple molecules** have low melting points (weak forces *between* molecules) and don't conduct.
- **Giant covalent** structures like diamond have very high melting points.

## Metallic bonding
Positive metal ions in a sea of **delocalised electrons**. This explains why metals conduct electricity and are malleable.
`,
        [
          ["Ion", "An atom or group of atoms that has gained or lost electrons and so has a charge."],
          ["Ionic bond", "The electrostatic attraction between oppositely charged ions."],
          ["Covalent bond", "A shared pair of electrons between two non-metal atoms."],
          ["Delocalised electrons", "Electrons free to move through a structure, as in metals."],
        ],
        [
          ["What type of bonding is in sodium chloride?", "Ionic."],
          ["Why do ionic compounds conduct when molten?", "The ions are free to move and carry charge."],
          ["Why do simple molecules have low melting points?", "The forces between molecules are weak."],
          ["Why can metals conduct electricity?", "Delocalised electrons can move through the structure."],
        ],
        [
          ["Which pair of elements would form an ionic compound?", ["Carbon and oxygen", "Sodium and chlorine", "Hydrogen and chlorine", "Nitrogen and hydrogen"], 1, "A metal (sodium) with a non-metal (chlorine) forms ionic bonds."],
          ["In a covalent bond, electrons are…", ["transferred", "shared", "destroyed", "delocalised"], 1, "Covalent bonds are shared pairs of electrons."],
          ["Solid sodium chloride does not conduct electricity because…", ["it has no electrons", "its ions cannot move", "it is covalent", "it is a metal"], 1, "Ions are fixed in the lattice; they must be free to move to conduct."],
          ["Magnesium forms which ion?", ["Mg⁺", "Mg²⁺", "Mg²⁻", "Mg⁻"], 1, "Magnesium (2,8,2) loses two electrons to form Mg²⁺."],
        ],
      ),
      topic(
        "chem-equations",
        "Equations and conservation of mass",
        "Writing and balancing chemical equations.",
        `
## Conservation of mass
Atoms are not created or destroyed in a reaction, only rearranged. So the **total mass of reactants = total mass of products**.
If a gas escapes from an open container, the mass *seems* to drop, but it hasn't really.

## Word to symbol equations
magnesium + oxygen → magnesium oxide
2Mg + O₂ → 2MgO

## Balancing, step by step
1. Write the correct formulas (never change the small numbers).
2. Count atoms of each element on both sides.
3. Add **big numbers in front** to balance.
4. Check every element again.

Example: H₂ + O₂ → H₂O
Oxygen is unbalanced (2 vs 1), so: H₂ + O₂ → 2H₂O
Now hydrogen is 2 vs 4, so: **2H₂ + O₂ → 2H₂O** ✔

## State symbols
(s) solid, (l) liquid, (g) gas, (aq) dissolved in water.
`,
        [
          ["Conservation of mass", "In a chemical reaction the total mass of reactants equals the total mass of products."],
          ["Reactant", "A substance that is used up in a chemical reaction."],
          ["Product", "A substance formed in a chemical reaction."],
          ["State symbol", "A label showing the physical state: (s), (l), (g) or (aq)."],
        ],
        [
          ["What does (aq) mean?", "Aqueous: dissolved in water."],
          ["Balance: H₂ + O₂ → H₂O", "2H₂ + O₂ → 2H₂O."],
          ["Why might mass seem to decrease in a reaction?", "A gas product escapes into the air."],
          ["When balancing, what must you never change?", "The small subscript numbers in a formula."],
        ],
        [
          ["Which equation is balanced?", ["Mg + O₂ → MgO", "2Mg + O₂ → 2MgO", "Mg + 2O₂ → MgO", "2Mg + O₂ → MgO"], 1, "2 Mg and 2 O on each side."],
          ["12 g of carbon burns with 32 g of oxygen. What mass of CO₂ forms?", ["20 g", "32 g", "44 g", "12 g"], 2, "Mass is conserved: 12 + 32 = 44 g."],
          ["What does the state symbol (g) mean?", ["Gel", "Gas", "Granular", "Glass"], 1, "(g) stands for gas."],
          ["Balance: N₂ + H₂ → NH₃. The number in front of H₂ is…", ["1", "2", "3", "6"], 2, "N₂ + 3H₂ → 2NH₃ gives 2 N and 6 H on each side."],
        ],
      ),
      topic(
        "chem-reaction-types",
        "Types of reaction",
        "Combustion, oxidation, neutralisation and more, plus energy changes.",
        `
## Common reaction types
- **Combustion**: burning in oxygen. Complete combustion of a hydrocarbon → carbon dioxide + water.
- **Oxidation**: gaining oxygen (or losing electrons). **Reduction** is the opposite.
- **Thermal decomposition**: one substance breaks down on heating, e.g. calcium carbonate → calcium oxide + carbon dioxide.
- **Neutralisation**: acid + base → salt + water.
- **Displacement**: a more reactive element takes the place of a less reactive one.

## Energy changes
- **Exothermic** reactions give out heat; the surroundings get **hotter** (combustion, neutralisation).
- **Endothermic** reactions take in heat; the surroundings get **colder** (thermal decomposition, photosynthesis).

## Reactivity series
K, Na, Ca, Mg, Al, (C), Zn, Fe, (H), Cu, Ag, Au.
A metal displaces any metal **below** it from its compounds.

> OIL RIG: **O**xidation **I**s **L**oss, **R**eduction **I**s **G**ain (of electrons).
`,
        [
          ["Exothermic", "A reaction that transfers energy to the surroundings, so the temperature rises."],
          ["Endothermic", "A reaction that takes in energy from the surroundings, so the temperature falls."],
          ["Oxidation", "Gain of oxygen or loss of electrons."],
          ["Thermal decomposition", "Breaking down a substance using heat."],
        ],
        [
          ["What are the products of complete combustion of methane?", "Carbon dioxide and water."],
          ["Is neutralisation exothermic or endothermic?", "Exothermic."],
          ["What does OIL RIG stand for?", "Oxidation Is Loss, Reduction Is Gain (of electrons)."],
          ["Will iron displace copper from copper sulfate?", "Yes. Iron is more reactive than copper."],
        ],
        [
          ["A reaction makes a beaker feel cold. It is…", ["exothermic", "endothermic", "neutral", "a combustion"], 1, "Energy is taken in from the surroundings, so they cool."],
          ["Heating calcium carbonate to make calcium oxide is…", ["combustion", "neutralisation", "thermal decomposition", "displacement"], 2, "One substance breaks down into two on heating."],
          ["Which metal could displace zinc from zinc sulfate?", ["Copper", "Iron", "Magnesium", "Silver"], 2, "Magnesium is above zinc in the reactivity series."],
          ["Oxidation in terms of electrons is…", ["gain of electrons", "loss of electrons", "sharing electrons", "gain of protons"], 1, "OIL RIG: oxidation is loss."],
        ],
      ),
    ]),
    unit("chem-quant", "Acids, rates and the mole", [
      topic(
        "chem-acids",
        "Acids, bases and pH",
        "The pH scale, indicators, neutralisation and making salts.",
        `
## The pH scale
- **0–6** acidic, **7** neutral, **8–14** alkaline.
- Acids release **H⁺ ions** in water; alkalis release **OH⁻ ions**.
- Measured with **universal indicator** or a pH meter.

## Neutralisation
**H⁺ + OH⁻ → H₂O**
acid + alkali → salt + water

## Other acid reactions
- acid + metal → salt + hydrogen (test: squeaky pop with a lit splint)
- acid + carbonate → salt + water + carbon dioxide (test: turns limewater milky)

## Naming salts
| Acid | Salt ending |
|---|---|
| Hydrochloric (HCl) | -chloride |
| Sulfuric (H₂SO₄) | -sulfate |
| Nitric (HNO₃) | -nitrate |

Example: magnesium + hydrochloric acid → **magnesium chloride** + hydrogen.

## Strong vs weak
A **strong** acid fully ionises in water (HCl); a **weak** acid only partly ionises (ethanoic acid).
`,
        [
          ["Acid", "A substance that releases H⁺ ions in water; pH below 7."],
          ["Alkali", "A soluble base that releases OH⁻ ions in water; pH above 7."],
          ["Neutralisation", "The reaction between an acid and a base to form a salt and water."],
          ["Indicator", "A substance that changes colour depending on pH."],
        ],
        [
          ["What is the pH of a neutral solution?", "7."],
          ["What gas is made when an acid reacts with a metal?", "Hydrogen (squeaky pop test)."],
          ["What salt does sulfuric acid make with sodium hydroxide?", "Sodium sulfate."],
          ["Write the ionic equation for neutralisation.", "H⁺ + OH⁻ → H₂O."],
        ],
        [
          ["A solution has pH 2. It is…", ["strongly acidic", "weakly acidic", "neutral", "alkaline"], 0, "pH 2 is far below 7, so strongly acidic."],
          ["Acid + carbonate produces salt, water and…", ["hydrogen", "oxygen", "carbon dioxide", "chlorine"], 2, "Carbonates release CO₂, which turns limewater milky."],
          ["Nitric acid forms salts called…", ["chlorides", "sulfates", "nitrates", "carbonates"], 2, "Nitric acid → nitrates."],
          ["Which ion makes a solution alkaline?", ["H⁺", "OH⁻", "Cl⁻", "Na⁺"], 1, "Hydroxide ions (OH⁻) make solutions alkaline."],
        ],
      ),
      topic(
        "chem-rates",
        "Rates of reaction",
        "Collision theory and the factors that speed reactions up.",
        `
## Collision theory
For a reaction to happen, particles must **collide** with enough energy: the **activation energy**. Anything that makes **successful collisions more frequent** increases the rate.

## Factors
| Factor | Why it speeds things up |
|---|---|
| Higher temperature | Particles move faster: more frequent **and** more energetic collisions |
| Higher concentration / pressure | More particles in the same space: more frequent collisions |
| Larger surface area (smaller pieces) | More particles exposed to collide |
| Catalyst | Provides a pathway with **lower activation energy**; not used up |

## Measuring rate
Measure how fast a product forms or a reactant is used up, e.g. gas volume in a syringe, or mass loss on a balance, over time.
**Rate = amount changed ÷ time**.

On a graph, a **steeper** line means a faster rate. The line levels off when a reactant runs out.
`,
        [
          ["Activation energy", "The minimum energy particles need to react when they collide."],
          ["Catalyst", "A substance that speeds up a reaction without being used up."],
          ["Collision theory", "Reactions happen when particles collide with at least the activation energy."],
          ["Rate of reaction", "How quickly reactants are used up or products are formed."],
        ],
        [
          ["Why does increasing temperature increase rate?", "Particles move faster, colliding more often and with more energy."],
          ["How does a catalyst work?", "It provides an alternative pathway with a lower activation energy."],
          ["Why does powder react faster than a lump?", "Larger surface area, so more frequent collisions."],
          ["What does a steeper line on a rate graph show?", "A faster reaction."],
        ],
        [
          ["Which change would NOT increase the rate?", ["Heating the mixture", "Using powder instead of lumps", "Diluting the acid", "Adding a catalyst"], 2, "Diluting lowers concentration, so collisions are less frequent."],
          ["A catalyst…", ["is used up in the reaction", "raises the activation energy", "lowers the activation energy", "changes the products"], 2, "Catalysts lower the activation energy and are not used up."],
          ["Why does a rate graph level off?", ["The catalyst runs out", "A reactant has been used up", "The temperature drops", "The products stop forming gas"], 1, "Once a reactant is used up, no more product forms."],
          ["50 cm³ of gas is made in 25 s. Mean rate?", ["0.5 cm³/s", "2 cm³/s", "25 cm³/s", "1250 cm³/s"], 1, "Rate = 50 ÷ 25 = 2 cm³/s."],
        ],
      ),
      topic(
        "chem-mole",
        "Relative mass and the mole",
        "Relative formula mass, moles and simple reacting-mass calculations.",
        `
## Relative atomic mass (Ar)
The average mass of an element's atoms compared with carbon-12. Found on the periodic table: H = 1, C = 12, O = 16, Na = 23, Cl = 35.5.

## Relative formula mass (Mr)
Add up the Ar of every atom in the formula.
- H₂O = 2(1) + 16 = **18**
- CO₂ = 12 + 2(16) = **44**
- CaCO₃ = 40 + 12 + 3(16) = **100**

## The mole
One mole contains **6.02 × 10²³** particles (Avogadro's constant).

**moles = mass ÷ Mr**

Example: 88 g of CO₂ = 88 ÷ 44 = **2 mol**.

## Reacting masses
Use the balanced equation's ratio.
2Mg + O₂ → 2MgO: 2 mol of Mg makes 2 mol of MgO.
48 g of Mg (Ar 24) = 2 mol → 2 mol MgO × 40 = **80 g**.
`,
        [
          ["Relative formula mass (Mr)", "The sum of the relative atomic masses of all atoms in a formula."],
          ["Mole", "The amount of substance containing 6.02 × 10²³ particles."],
          ["Avogadro's constant", "6.02 × 10²³, the number of particles in one mole."],
          ["Relative atomic mass (Ar)", "The average mass of an element's atoms relative to carbon-12."],
        ],
        [
          ["What is the Mr of H₂O?", "18."],
          ["Give the formula linking moles, mass and Mr.", "moles = mass ÷ Mr."],
          ["How many moles are in 32 g of O₂ (Mr 32)?", "1 mole."],
          ["How many particles are in one mole?", "6.02 × 10²³."],
        ],
        [
          ["What is the Mr of CO₂? (C = 12, O = 16)", ["28", "44", "32", "40"], 1, "12 + 16 + 16 = 44."],
          ["How many moles are in 36 g of water (Mr 18)?", ["0.5", "1", "2", "18"], 2, "36 ÷ 18 = 2 mol."],
          ["What is the Mr of NaCl? (Na = 23, Cl = 35.5)", ["58.5", "46", "12.5", "71"], 0, "23 + 35.5 = 58.5."],
          ["What mass is 0.5 mol of CaCO₃ (Mr 100)?", ["200 g", "100 g", "50 g", "0.5 g"], 2, "mass = moles × Mr = 0.5 × 100 = 50 g."],
        ],
      ),
    ]),
  ],
};
