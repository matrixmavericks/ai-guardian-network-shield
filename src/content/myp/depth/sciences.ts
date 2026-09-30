import { depth } from "./types";

// Deeper study layer for Biology, Chemistry and Physics topics.

export const SCIENCE_DEPTH = Object.fromEntries([
  /* ================= Biology ================= */
  depth(
    "bio-cell-structure",
    ["Name the parts of animal and plant cells and say what each does", "Compare prokaryotic and eukaryotic cells", "Use the magnification equation"],
    ["Scientific and technical innovation", "Microscopes let doctors spot cancer cells in a biopsy within minutes."],
    {
      worked: {
        problem: "A cell is 0.02 mm wide. In a textbook drawing it is 40 mm wide. What is the magnification?",
        steps: ["Write the equation: magnification = image size ÷ actual size.", "Check the units match: both are in mm.", "Substitute: 40 ÷ 0.02 = 2000."],
        answer: "×2000",
      },
      exam: [
        ["Describe", "A", 3, "Describe three differences between a plant cell and an animal cell.", ["Plant cells have a cell wall (cellulose); animal cells do not", "Plant cells have chloroplasts for photosynthesis", "Plant cells have a large permanent vacuole"]],
        ["Calculate", "A", 3, "An image of a mitochondrion is 15 mm long. The actual mitochondrion is 3 µm long. Calculate the magnification. (1 mm = 1000 µm)", ["Converts 15 mm to 15 000 µm", "Uses magnification = image ÷ actual", "×5000"]],
      ],
      mistakes: ["Forgetting to convert units before using the magnification equation.", "Saying plant cells have no mitochondria: they do.", "Confusing the cell wall with the cell membrane."],
    },
  ),
  depth(
    "bio-transport",
    ["Explain diffusion, osmosis and active transport", "Predict the direction of water movement", "Calculate percentage change in mass"],
    ["Globalization and sustainability", "Farmers watering with salty water can make crops wilt: osmosis pulls water out of the roots."],
    {
      diagrams: [
        [
          { kind: "graph", x: [0, 0.8], y: [-14, 14], xStep: 0.2, yStep: 4, functions: [{ expr: "12 - 30x", label: "% change in mass" }], points: [{ x: 0.4, y: 0, label: "≈ 0.4 M" }], xLabel: "sugar concentration (M)", yLabel: "% change in mass" },
          "Potato cylinders in sugar solutions: where the line crosses zero, water moves in and out equally.",
        ],
      ],
      worked: {
        problem: "A potato cylinder has a mass of 2.50 g. After an hour in salt solution its mass is 2.20 g. Find the percentage change in mass.",
        steps: ["Change = final − initial = 2.20 − 2.50 = −0.30 g.", "Percentage change = change ÷ initial × 100.", "−0.30 ÷ 2.50 × 100 = −12%."],
        answer: "−12% (it lost water by osmosis)",
      },
      exam: [
        ["Explain", "A", 3, "Explain why a red blood cell bursts when placed in pure water.", ["Water has a higher water potential outside the cell", "Water enters the cell by osmosis through the partially permeable membrane", "Animal cells have no cell wall, so the cell swells and bursts (lysis)"]],
        ["Suggest", "C", 2, "Using the graph, suggest the concentration of solutes inside the potato cells.", ["About 0.4 M", "Where there is no change in mass, there is no net movement of water"], { kind: "graph", x: [0, 0.8], y: [-14, 14], xStep: 0.2, yStep: 4, functions: [{ expr: "12 - 30x" }], xLabel: "sugar concentration (M)", yLabel: "% change in mass" }],
      ],
      mistakes: ["Saying water moves to where there is 'more water': it moves from high to low water potential.", "Calling osmosis diffusion of solutes: it is the movement of water.", "Forgetting active transport needs energy (ATP) from respiration."],
    },
  ),
  depth(
    "bio-cell-division",
    ["Describe the stages of the cell cycle and mitosis", "Compare mitosis and meiosis", "Explain why gametes are haploid"],
    ["Identities and relationships", "Meiosis shuffles genes, which is why siblings look different."],
    {
      worked: {
        problem: "A human body cell has 46 chromosomes. How many chromosomes are in (a) each cell after mitosis and (b) each gamete after meiosis?",
        steps: ["Mitosis makes two genetically identical cells with the full set.", "Meiosis halves the number to make haploid gametes.", "46 ÷ 2 = 23."],
        answer: "(a) 46 (b) 23",
      },
      exam: [
        ["Compare", "A", 4, "Compare mitosis and meiosis.", ["Mitosis gives 2 cells; meiosis gives 4", "Mitosis cells are diploid; meiosis cells are haploid", "Mitosis cells are identical; meiosis cells are genetically varied", "Mitosis is for growth and repair; meiosis makes gametes"]],
        ["Explain", "A", 2, "Explain why gametes must be haploid.", ["At fertilisation two gametes fuse", "So the zygote has the normal diploid number (46 in humans)"]],
      ],
      mistakes: ["Mixing up chromosomes and chromatids.", "Saying meiosis makes identical cells.", "Forgetting DNA is copied before division."],
    },
  ),
  depth(
    "bio-enzymes",
    ["Explain how enzymes work using the lock and key model", "Describe the effect of temperature and pH", "Explain denaturation"],
    ["Scientific and technical innovation", "Biological washing powders use enzymes that work at 30 °C, saving energy."],
    {
      diagrams: [
        [
          { kind: "graph", x: [0, 70], y: [0, 11], xStep: 10, yStep: 2, functions: [{ expr: "10*exp(-((x-37)/13)^2)", label: "rate of reaction" }], points: [{ x: 37, y: 10, label: "optimum ≈ 37 °C" }], xLabel: "temperature (°C)", yLabel: "rate" },
          "Rate rises with temperature until the optimum, then falls sharply as the enzyme denatures.",
        ],
      ],
      worked: {
        problem: "Amylase broke down starch in 40 s at 30 °C and 25 s at 40 °C. Calculate the rate at each temperature.",
        steps: ["Rate = 1 ÷ time.", "30 °C: 1 ÷ 40 = 0.025 s⁻¹.", "40 °C: 1 ÷ 25 = 0.040 s⁻¹."],
        answer: "0.025 s⁻¹ and 0.040 s⁻¹: faster at 40 °C",
      },
      exam: [
        ["Explain", "A", 4, "Explain why the rate of an enzyme reaction falls above the optimum temperature.", ["High temperature breaks bonds holding the enzyme's shape", "The active site changes shape", "The substrate no longer fits (not complementary)", "The enzyme is denatured, so fewer enzyme–substrate complexes form"]],
        ["Outline", "B", 4, "Outline a method to investigate the effect of pH on amylase.", ["Use buffers at a range of pH values (e.g. 4, 5, 6, 7, 8)", "Keep temperature, volumes and concentrations constant", "Test samples with iodine at regular intervals until it stays orange", "Repeat each pH three times and calculate a mean"]],
      ],
      mistakes: ["Saying enzymes are 'killed': they are denatured, they were never alive.", "Saying the substrate is denatured.", "Forgetting to control temperature when testing pH."],
    },
  ),
  depth(
    "bio-circulation",
    ["Describe the double circulatory system", "Relate the structure of blood vessels to their function", "Calculate cardiac output"],
    ["Identities and relationships", "Regular exercise lowers resting heart rate by strengthening the heart."],
    {
      worked: {
        problem: "A student's heart rate is 70 beats per minute and stroke volume is 75 cm³. Calculate cardiac output.",
        steps: ["Cardiac output = heart rate × stroke volume.", "70 × 75 = 5250 cm³ per minute.", "Convert: 5250 cm³ = 5.25 dm³ (litres)."],
        answer: "5250 cm³/min (5.25 L/min)",
      },
      exam: [
        ["Explain", "A", 3, "Explain how arteries are adapted to their function.", ["Thick muscular walls to withstand high pressure", "Elastic tissue stretches and recoils to smooth blood flow", "Narrow lumen maintains pressure"]],
        ["Describe", "A", 3, "Describe the path of blood from the body back to the lungs.", ["Vena cava into the right atrium", "Right ventricle pumps it out", "Through the pulmonary artery to the lungs"]],
      ],
      mistakes: ["Saying all arteries carry oxygenated blood (the pulmonary artery does not).", "Mixing up the left and right sides of a heart diagram.", "Forgetting valves stop backflow."],
    },
  ),
  depth(
    "bio-classification",
    ["Use a dichotomous key", "Explain the binomial naming system", "Describe the five kingdoms"],
    ["Globalization and sustainability", "Scientists name thousands of new species each year, many in rainforests at risk of being cleared."],
    {
      worked: {
        problem: "Write the scientific name of the tiger (genus Panthera, species tigris) correctly.",
        steps: ["Genus first, with a capital letter.", "Species second, all lower case.", "Write it in italics (or underline when handwriting)."],
        answer: "Panthera tigris",
      },
      exam: [
        ["State", "A", 2, "State two features that all animals share.", ["Multicellular", "Heterotrophic / cannot make their own food (or: no cell walls, nervous coordination)"]],
        ["Explain", "A", 3, "Explain why scientists use binomial names rather than common names.", ["Common names differ between languages and regions", "One scientific name is understood worldwide", "The genus shows which species are closely related"]],
      ],
      mistakes: ["Capitalising the species name.", "Confusing genus and species order.", "Thinking fungi are plants."],
    },
  ),
  depth(
    "bio-photosynthesis",
    ["Write the photosynthesis equation", "Explain limiting factors", "Interpret rate graphs"],
    ["Globalization and sustainability", "Greenhouse growers add CO₂ and lighting to push yields up, but only until another factor limits the rate."],
    {
      diagrams: [
        [
          { kind: "graph", x: [0, 12], y: [0, 11], xStep: 2, yStep: 2, functions: [{ expr: "10*(1-exp(-x/3))", label: "rate of photosynthesis" }], xLabel: "light intensity", yLabel: "rate" },
          "At low light, light is the limiting factor. On the plateau something else (CO₂ or temperature) limits the rate.",
        ],
      ],
      worked: {
        problem: "A lamp 10 cm from a plant is moved to 20 cm. By what factor does the light intensity change?",
        steps: ["Light intensity ∝ 1 ÷ distance².", "Doubling the distance: (1 ÷ 2)² = 1 ÷ 4.", "So the intensity falls to a quarter."],
        answer: "It becomes ¼ of the original",
      },
      exam: [
        ["State", "A", 2, "State the word equation for photosynthesis.", ["Carbon dioxide + water", "→ glucose + oxygen (in light, with chlorophyll)"]],
        ["Explain", "C", 3, "Explain the shape of the graph of rate against light intensity.", ["Rate increases as light increases at first", "Light is the limiting factor on the rising part", "The rate levels off because another factor (CO₂ / temperature) becomes limiting"], { kind: "graph", x: [0, 12], y: [0, 11], xStep: 2, yStep: 2, functions: [{ expr: "10*(1-exp(-x/3))" }], xLabel: "light intensity", yLabel: "rate" }],
      ],
      mistakes: ["Writing that plants do not respire: they respire all the time.", "Saying oxygen is used in photosynthesis.", "Forgetting chlorophyll absorbs the light."],
    },
  ),
  depth(
    "bio-ecosystems",
    ["Build food chains and webs", "Explain energy transfer between trophic levels", "Calculate efficiency of energy transfer"],
    ["Globalization and sustainability", "Eating lower down the food chain means more food energy reaches people from the same land."],
    {
      diagrams: [
        [
          { kind: "chart", type: "bar", labels: ["Producers", "Primary", "Secondary", "Tertiary"], series: [{ name: "Energy (kJ/m²/year)", values: [10000, 1000, 100, 10] }], yLabel: "kJ/m²/year" },
          "Only about 10% of the energy passes to the next level; the rest is lost as heat, movement and waste.",
        ],
      ],
      worked: {
        problem: "Grass holds 20 000 kJ. Rabbits eating it gain 1 800 kJ. Calculate the efficiency of energy transfer.",
        steps: ["Efficiency = energy transferred ÷ energy available × 100.", "1 800 ÷ 20 000 = 0.09.", "0.09 × 100 = 9%."],
        answer: "9%",
      },
      exam: [
        ["Explain", "A", 3, "Explain why food chains rarely have more than five trophic levels.", ["Energy is lost at each level (heat from respiration, movement, egestion)", "Only about 10% passes on", "Too little energy remains to support another level"]],
        ["Predict", "A", 2, "Predict what happens to a food web if the frog population falls sharply.", ["Insects (their prey) increase", "Predators of frogs (e.g. snakes) decrease or switch prey"]],
      ],
      mistakes: ["Drawing arrows the wrong way: they point to the animal that eats.", "Saying energy is 'used up': it is transferred to the surroundings.", "Confusing a population with a community."],
    },
  ),
  depth(
    "bio-genetics",
    ["Use genetic terms correctly", "Complete Punnett squares", "Predict ratios of offspring"],
    ["Identities and relationships", "Genetic counselling helps families understand the chance of inherited conditions."],
    {
      worked: {
        problem: "Brown eyes (B) are dominant to blue (b). Two Bb parents have a child. What is the chance it has blue eyes?",
        steps: ["Gametes from each parent: B or b.", "Punnett square gives BB, Bb, Bb, bb.", "Only bb shows blue: 1 out of 4."],
        answer: "25% (ratio 3 brown : 1 blue)",
      },
      exam: [
        ["Define", "A", 2, "Define the terms genotype and phenotype.", ["Genotype: the alleles an organism has (e.g. Bb)", "Phenotype: the characteristic that shows (e.g. brown eyes)"]],
        ["Calculate", "A", 3, "A homozygous recessive plant (tt) is crossed with a heterozygous plant (Tt). Calculate the percentage of tall offspring (T = tall).", ["Gametes t and T/t", "Offspring Tt, Tt, tt, tt", "50% tall"]],
      ],
      mistakes: ["Writing the recessive allele as a different letter instead of lower case.", "Forgetting a 3:1 ratio is only a probability.", "Mixing up homozygous and heterozygous."],
    },
  ),

  /* ================= Chemistry ================= */
  depth(
    "chem-states",
    ["Describe particle arrangement in solids, liquids and gases", "Interpret heating and cooling curves", "Explain changes of state using energy"],
    ["Scientific and technical innovation", "Freeze-drying removes water from food by sublimation, so it keeps for years."],
    {
      diagrams: [
        [
          { kind: "graph", x: [0, 16], y: [-30, 130], xStep: 2, yStep: 20, segments: [{ from: [0, -20], to: [2, 0] }, { from: [2, 0], to: [6, 0], label: "melting" }, { from: [6, 0], to: [8, 100] }, { from: [8, 100], to: [14, 100], label: "boiling" }, { from: [14, 100], to: [16, 120] }], xLabel: "time (min)", yLabel: "temperature (°C)" },
          "Heating curve for water: the flat parts are where energy breaks bonds between particles, so temperature stays constant.",
        ],
      ],
      worked: {
        problem: "Why does temperature stay at 100 °C while water boils, even though it is still being heated?",
        steps: ["Energy is still going in.", "It is used to overcome the forces between particles, not to speed them up.", "So kinetic energy (temperature) stays the same until all the liquid has turned to gas."],
        answer: "The energy breaks intermolecular forces instead of raising temperature",
      },
      exam: [
        ["Describe", "A", 3, "Describe the arrangement and movement of particles in a liquid.", ["Particles close together", "Randomly arranged", "Move around each other (slide past)"]],
        ["State", "C", 2, "Use the heating curve to state the melting point and the boiling point.", ["Melting point 0 °C", "Boiling point 100 °C"], { kind: "graph", x: [0, 16], y: [-30, 130], xStep: 2, yStep: 20, segments: [{ from: [0, -20], to: [2, 0] }, { from: [2, 0], to: [6, 0] }, { from: [6, 0], to: [8, 100] }, { from: [8, 100], to: [14, 100] }, { from: [14, 100], to: [16, 120] }], xLabel: "time (min)", yLabel: "temperature (°C)" }],
      ],
      mistakes: ["Saying particles in a solid do not move: they vibrate.", "Saying particles expand when heated: the gaps between them grow.", "Confusing evaporation with boiling."],
    },
  ),
  depth(
    "chem-atoms",
    ["Describe protons, neutrons and electrons", "Work out particle numbers from atomic and mass numbers", "Write electron arrangements"],
    ["Orientation in space and time", "Carbon-14 dating uses isotopes to tell the age of ancient remains."],
    {
      worked: {
        problem: "Sodium has atomic number 11 and mass number 23. How many protons, neutrons and electrons does a sodium atom have?",
        steps: ["Protons = atomic number = 11.", "Neutrons = mass number − atomic number = 23 − 11 = 12.", "Electrons = protons in a neutral atom = 11 (arranged 2, 8, 1)."],
        answer: "11 protons, 12 neutrons, 11 electrons",
      },
      exam: [
        ["Define", "A", 2, "Define the term isotope.", ["Atoms of the same element (same number of protons)", "With different numbers of neutrons"]],
        ["Calculate", "A", 3, "Chlorine is 75% ³⁵Cl and 25% ³⁷Cl. Calculate its relative atomic mass.", ["(35 × 75) + (37 × 25)", "= 3550 ÷ 100", "= 35.5"]],
      ],
      mistakes: ["Adding electrons to the mass number.", "Thinking isotopes have different chemical properties: they react the same way.", "Filling the first shell with 8 electrons instead of 2."],
    },
  ),
  depth(
    "chem-periodic",
    ["Explain how the periodic table is arranged", "Describe trends in groups 1 and 7", "Link electron arrangement to position"],
    ["Scientific and technical innovation", "Mendeleev left gaps for undiscovered elements and predicted their properties correctly."],
    {
      diagrams: [
        [
          { kind: "chart", type: "bar", labels: ["Fluorine", "Chlorine", "Bromine", "Iodine"], series: [{ name: "Boiling point (°C)", values: [-188, -34, 59, 184] }], yLabel: "boiling point (°C)" },
          "Group 7: boiling points rise down the group as the molecules get bigger.",
        ],
      ],
      worked: {
        problem: "Predict the state of astatine (below iodine in group 7) at room temperature.",
        steps: ["Boiling point rises down group 7.", "Iodine is already a solid at room temperature.", "Astatine is lower, so it should be a solid too."],
        answer: "Solid",
      },
      exam: [
        ["Explain", "A", 3, "Explain why potassium is more reactive than sodium.", ["Potassium's outer electron is further from the nucleus (more shells)", "Weaker attraction to the nucleus / more shielding", "So the outer electron is lost more easily"]],
        ["Describe", "A", 2, "Describe what you would see when a small piece of lithium is added to water.", ["Fizzing / bubbles of hydrogen", "It floats and moves slowly, getting smaller"]],
      ],
      mistakes: ["Saying reactivity increases down group 7 (it decreases).", "Mixing up groups (columns) and periods (rows).", "Forgetting noble gases are unreactive because their outer shells are full."],
    },
  ),
  depth(
    "chem-bonding",
    ["Explain ionic bonding using electron transfer", "Explain covalent bonding using shared pairs", "Link structure to properties"],
    ["Scientific and technical innovation", "Graphene, a single layer of carbon, conducts electricity and is 200 times stronger than steel."],
    {
      worked: {
        problem: "Describe what happens when sodium reacts with chlorine to form sodium chloride.",
        steps: ["Sodium (2, 8, 1) loses its outer electron to form Na⁺.", "Chlorine (2, 8, 7) gains that electron to form Cl⁻.", "The oppositely charged ions attract strongly in a giant lattice."],
        answer: "Electron transfer makes Na⁺ and Cl⁻ ions held by ionic bonds",
      },
      exam: [
        ["Explain", "A", 3, "Explain why sodium chloride has a high melting point.", ["Giant ionic lattice", "Strong electrostatic attraction between oppositely charged ions", "A lot of energy is needed to break many bonds"]],
        ["Explain", "A", 2, "Explain why molten ionic compounds conduct electricity but solid ones do not.", ["In the solid the ions are fixed in place", "When molten the ions can move and carry charge"]],
      ],
      mistakes: ["Saying electrons move in solid ionic compounds.", "Saying covalent bonds break when a simple molecule melts: it's the weak forces between molecules.", "Forgetting charges on ions."],
    },
  ),
  depth(
    "chem-equations",
    ["Write word and balanced symbol equations", "Explain conservation of mass", "Include state symbols"],
    ["Globalization and sustainability", "Chemists balance equations to work out exactly how much raw material a factory needs, cutting waste."],
    {
      worked: {
        problem: "Balance: CH₄ + O₂ → CO₂ + H₂O",
        steps: ["Carbon: 1 on each side, fine.", "Hydrogen: 4 on the left, so put 2 in front of H₂O.", "Oxygen: now 2 + 2 = 4 on the right, so put 2 in front of O₂."],
        answer: "CH₄ + 2O₂ → CO₂ + 2H₂O",
      },
      exam: [
        ["Deduce", "A", 2, "Deduce the balanced equation for the reaction: Mg + HCl → MgCl₂ + H₂", ["Mg + 2HCl → MgCl₂ + H₂", "Correct formulae unchanged"]],
        ["Explain", "A", 3, "When magnesium burns in air, the product is heavier than the magnesium. Explain why this does not break the law of conservation of mass.", ["Magnesium reacts with oxygen from the air", "The oxygen atoms add mass to the product (magnesium oxide)", "Total mass of reactants equals total mass of products"]],
      ],
      mistakes: ["Changing small numbers in formulae to balance (e.g. H₂O₂).", "Forgetting diatomic elements (O₂, H₂, Cl₂).", "Missing state symbols when asked."],
    },
  ),
  depth(
    "chem-reaction-types",
    ["Classify reactions (combustion, neutralisation, displacement, decomposition)", "Distinguish exothermic and endothermic reactions", "Read energy profiles"],
    ["Scientific and technical innovation", "Self-heating cans and instant cold packs use exothermic and endothermic reactions."],
    {
      diagrams: [
        [
          { kind: "graph", x: [0, 10], y: [0, 10], xStep: 2, yStep: 2, grid: false, segments: [{ from: [0, 5], to: [2, 5], label: "reactants" }, { from: [2, 5], to: [4.5, 8.5] }, { from: [4.5, 8.5], to: [7, 2] }, { from: [7, 2], to: [10, 2], label: "products" }], xLabel: "progress of reaction", yLabel: "energy" },
          "Exothermic energy profile: products end lower than reactants, so energy is released to the surroundings.",
        ],
      ],
      worked: {
        problem: "Zinc is added to copper sulfate solution. What type of reaction happens and why?",
        steps: ["Zinc is more reactive than copper.", "So zinc displaces copper from its compound.", "Zinc + copper sulfate → zinc sulfate + copper."],
        answer: "A displacement reaction",
      },
      exam: [
        ["Distinguish", "A", 2, "Distinguish between exothermic and endothermic reactions.", ["Exothermic: releases energy, surroundings get hotter", "Endothermic: takes in energy, surroundings get colder"]],
        ["Identify", "C", 2, "The temperature of a solution falls from 21 °C to 15 °C during a reaction. Identify the type of energy change and give the temperature change.", ["Endothermic", "−6 °C (a 6 °C fall)"]],
      ],
      mistakes: ["Thinking 'feels cold' means exothermic.", "Mixing up the reactivity series when predicting displacement.", "Forgetting combustion needs oxygen."],
    },
  ),
  depth(
    "chem-acids",
    ["Use the pH scale", "Write neutralisation equations", "Name salts from acids"],
    ["Globalization and sustainability", "Farmers add lime (calcium hydroxide) to acidic soils so crops grow better."],
    {
      diagrams: [
        [{ kind: "numberline", min: 0, max: 14, step: 1, points: [{ value: 2, label: "lemon juice" }, { value: 7, label: "pure water" }, { value: 12, label: "bleach" }] }, "The pH scale: below 7 is acidic, 7 is neutral, above 7 is alkaline."],
      ],
      worked: {
        problem: "Name the salt made when sulfuric acid reacts with sodium hydroxide, and write the word equation.",
        steps: ["Sulfuric acid makes sulfates.", "The metal comes from the base: sodium.", "Acid + base → salt + water."],
        answer: "Sulfuric acid + sodium hydroxide → sodium sulfate + water",
      },
      exam: [
        ["State", "A", 2, "State the ions that make a solution acidic and alkaline.", ["Acids: H⁺ ions", "Alkalis: OH⁻ ions"]],
        ["State", "A", 2, "State the ionic equation for neutralisation.", ["H⁺(aq) + OH⁻(aq)", "→ H₂O(l)"]],
      ],
      mistakes: ["Saying pH 1 is weakly acidic (it is strongly acidic).", "Mixing up salt names (chlorides come from hydrochloric acid).", "Thinking all bases are alkalis: only soluble ones are."],
    },
  ),
  depth(
    "chem-rates",
    ["Explain rates using collision theory", "Describe how temperature, concentration, surface area and catalysts change rate", "Calculate mean rate from data"],
    ["Scientific and technical innovation", "Catalytic converters speed up reactions that turn toxic exhaust gases into safer ones."],
    {
      diagrams: [
        [
          { kind: "graph", x: [0, 60], y: [0, 70], xStep: 10, yStep: 10, functions: [{ expr: "60*(1-exp(-x/15))", label: "large chips" }, { expr: "60*(1-exp(-x/6))", label: "powder", dashed: true }], xLabel: "time (s)", yLabel: "volume of CO₂ (cm³)" },
          "Powder has a larger surface area: the curve is steeper at the start but ends at the same volume.",
        ],
      ],
      worked: {
        problem: "40 cm³ of gas is collected in the first 20 s of a reaction. Calculate the mean rate.",
        steps: ["Mean rate = amount of product ÷ time.", "40 ÷ 20 = 2.", "Include units: cm³/s."],
        answer: "2 cm³/s",
      },
      exam: [
        ["Explain", "A", 3, "Explain, using collision theory, why increasing temperature increases the rate of reaction.", ["Particles gain kinetic energy and move faster", "They collide more often", "More collisions have energy above the activation energy (more successful collisions)"]],
        ["Explain", "C", 2, "Explain why both curves level off at the same volume.", ["The same mass of reactant is used", "The reaction stops when a reactant is used up"], { kind: "graph", x: [0, 60], y: [0, 70], xStep: 10, yStep: 10, functions: [{ expr: "60*(1-exp(-x/15))", label: "large chips" }, { expr: "60*(1-exp(-x/6))", label: "powder", dashed: true }], xLabel: "time (s)", yLabel: "volume of CO₂ (cm³)" }],
      ],
      mistakes: ["Saying a catalyst is used up.", "Saying particles collide 'harder' rather than more often or with more energy.", "Thinking a faster rate makes more product."],
    },
  ),
  depth(
    "chem-mole",
    ["Calculate relative formula mass (Mr)", "Use moles = mass ÷ Mr", "Use mole ratios from equations"],
    ["Scientific and technical innovation", "Pharmacists use moles to get the exact dose of a medicine into every tablet."],
    {
      worked: {
        problem: "How many moles are in 36 g of water? (H = 1, O = 16)",
        steps: ["Mr of H₂O = (2 × 1) + 16 = 18.", "Moles = mass ÷ Mr.", "36 ÷ 18 = 2 mol."],
        answer: "2 mol",
      },
      exam: [
        ["Calculate", "A", 2, "Calculate the relative formula mass of CaCO₃. (Ca = 40, C = 12, O = 16)", ["40 + 12 + (3 × 16)", "= 100"]],
        ["Calculate", "A", 4, "Calculate the mass of CO₂ made when 50 g of CaCO₃ decomposes. CaCO₃ → CaO + CO₂", ["Moles of CaCO₃ = 50 ÷ 100 = 0.5 mol", "Ratio 1 : 1, so 0.5 mol CO₂", "Mr of CO₂ = 44", "Mass = 0.5 × 44 = 22 g"]],
      ],
      mistakes: ["Forgetting to multiply by the number of atoms in the formula.", "Using the ratio of masses instead of moles.", "Dropping units (g, g/mol, mol)."],
    },
  ),

  /* ================= Physics ================= */
  depth(
    "phy-speed",
    ["Calculate speed and acceleration", "Read distance–time and velocity–time graphs", "Find distance from the area under a v–t graph"],
    ["Orientation in space and time", "Average-speed cameras on highways calculate speed from distance ÷ time between two cameras."],
    {
      diagrams: [
        [
          { kind: "graph", x: [0, 14], y: [0, 15], xStep: 2, yStep: 3, segments: [{ from: [0, 0], to: [4, 12] }, { from: [4, 12], to: [10, 12] }, { from: [10, 12], to: [14, 0] }], xLabel: "time (s)", yLabel: "velocity (m/s)" },
          "Velocity–time graph: the gradient is acceleration and the area underneath is distance.",
        ],
      ],
      worked: {
        problem: "Use the graph to find the total distance travelled.",
        steps: ["0–4 s: triangle = ½ × 4 × 12 = 24 m.", "4–10 s: rectangle = 6 × 12 = 72 m.", "10–14 s: triangle = ½ × 4 × 12 = 24 m. Total = 24 + 72 + 24."],
        answer: "120 m",
        diagram: { kind: "graph", x: [0, 14], y: [0, 15], xStep: 2, yStep: 3, segments: [{ from: [0, 0], to: [4, 12] }, { from: [4, 12], to: [10, 12] }, { from: [10, 12], to: [14, 0] }], xLabel: "time (s)", yLabel: "velocity (m/s)" },
      },
      exam: [
        ["Calculate", "A", 3, "Calculate the acceleration in the first 4 seconds shown on the graph.", ["a = change in velocity ÷ time", "= 12 ÷ 4", "= 3 m/s²"], { kind: "graph", x: [0, 14], y: [0, 15], xStep: 2, yStep: 3, segments: [{ from: [0, 0], to: [4, 12] }, { from: [4, 12], to: [10, 12] }, { from: [10, 12], to: [14, 0] }], xLabel: "time (s)", yLabel: "velocity (m/s)" }],
        ["Describe", "C", 3, "Describe the motion shown in each section of the graph.", ["0–4 s: constant acceleration", "4–10 s: constant velocity of 12 m/s", "10–14 s: constant deceleration to rest"]],
      ],
      mistakes: ["Reading a flat line on a v–t graph as 'stopped'.", "Forgetting the ½ in triangle areas.", "Leaving out units, especially m/s²."],
    },
  ),
  depth(
    "phy-newton",
    ["State Newton's three laws", "Use F = m × a", "Draw and interpret free-body diagrams"],
    ["Scientific and technical innovation", "Crumple zones and airbags increase stopping time, reducing the force on passengers."],
    {
      diagrams: [
        [
          { kind: "fbd", surface: true, incline: 0, forces: [{ label: "thrust 900 N", angle: 0, size: 1.4 }, { label: "drag 300 N", angle: 180, size: 0.7 }, { label: "weight", angle: 270, size: 1.1 }, { label: "reaction", angle: 90, size: 1.1 }] },
          "Free-body diagram of a car: the resultant horizontal force is 900 − 300 = 600 N forwards.",
        ],
      ],
      worked: {
        problem: "The car in the diagram has a mass of 1200 kg. Calculate its acceleration.",
        steps: ["Resultant force = 900 − 300 = 600 N.", "Rearrange F = ma: a = F ÷ m.", "600 ÷ 1200 = 0.5 m/s²."],
        answer: "0.5 m/s² forwards",
      },
      exam: [
        ["Calculate", "A", 3, "A 60 kg cyclist accelerates at 1.5 m/s². Calculate the resultant force.", ["F = m × a", "60 × 1.5", "= 90 N"]],
        ["Explain", "A", 3, "A parachutist falls at a steady speed. Explain this using Newton's first law.", ["Weight acts down, air resistance acts up", "The forces are balanced (resultant force is zero)", "So the velocity does not change"]],
      ],
      mistakes: ["Thinking a moving object must have a resultant force.", "Mixing up mass (kg) and weight (N).", "Putting Newton's third-law pairs on the same object."],
    },
  ),
  depth(
    "phy-energy-work",
    ["Calculate kinetic and gravitational potential energy", "Apply conservation of energy", "Calculate work done"],
    ["Scientific and technical innovation", "Pumped-storage hydro stations store energy by pushing water uphill when demand is low."],
    {
      worked: {
        problem: "A 0.5 kg ball is dropped from 5 m. Ignoring air resistance, how fast is it moving just before it lands? (g = 10 N/kg)",
        steps: ["GPE lost = mgh = 0.5 × 10 × 5 = 25 J.", "All of it becomes kinetic energy: ½mv² = 25.", "v² = 25 ÷ 0.25 = 100, so v = 10 m/s."],
        answer: "10 m/s",
      },
      exam: [
        ["Calculate", "A", 3, "Calculate the kinetic energy of a 1000 kg car moving at 20 m/s.", ["KE = ½mv²", "½ × 1000 × 20²", "= 200 000 J (200 kJ)"]],
        ["Calculate", "A", 2, "A student pushes a box 4 m with a force of 50 N. Calculate the work done.", ["W = F × d = 50 × 4", "= 200 J"]],
      ],
      mistakes: ["Forgetting to square the speed in ½mv².", "Using mass in grams.", "Saying energy is lost: it is transferred, often as heat."],
    },
  ),
  depth(
    "phy-wave-props",
    ["Describe transverse and longitudinal waves", "Label amplitude, wavelength and frequency", "Use v = f × λ"],
    ["Scientific and technical innovation", "Tsunami warnings use the speed of ocean waves to predict when they will reach the coast."],
    {
      diagrams: [
        [
          { kind: "graph", x: [0, 8], y: [-3, 3], xStep: 1, yStep: 1, functions: [{ expr: "2*sin(pi*x/2)", label: "wave" }], segments: [{ from: [1, 2.5], to: [5, 2.5], label: "wavelength λ = 4 m" }], xLabel: "distance (m)", yLabel: "displacement (cm)" },
          "A transverse wave with amplitude 2 cm and wavelength 4 m.",
        ],
      ],
      worked: {
        problem: "A wave has a frequency of 50 Hz and a wavelength of 4 m. Calculate its speed.",
        steps: ["v = f × λ.", "50 × 4.", "= 200 m/s."],
        answer: "200 m/s",
      },
      exam: [
        ["Distinguish", "A", 2, "Distinguish between transverse and longitudinal waves.", ["Transverse: vibrations at right angles to the direction of travel", "Longitudinal: vibrations parallel to the direction of travel"]],
        ["Calculate", "A", 3, "Sound travels at 340 m/s. Calculate the wavelength of a 170 Hz note.", ["λ = v ÷ f", "340 ÷ 170", "= 2 m"]],
      ],
      mistakes: ["Measuring amplitude from trough to peak (it's from the middle).", "Thinking the medium travels with the wave.", "Mixing up frequency and period."],
    },
  ),
  depth(
    "phy-light-sound",
    ["Apply the law of reflection and describe refraction", "Draw ray diagrams for converging lenses", "Compare light and sound waves"],
    ["Scientific and technical innovation", "Glasses use lenses to focus light onto the retina for people who are short- or long-sighted."],
    {
      diagrams: [[{ kind: "lens", lens: "converging", f: 10, u: 25, objectHeight: 4 }, "An object beyond 2F gives a real, inverted, smaller image between F and 2F."]],
      worked: {
        problem: "An object is 25 cm from a converging lens with focal length 10 cm. Where is the image?",
        steps: ["Lens formula: 1/f = 1/u + 1/v.", "1/v = 1/10 − 1/25 = 0.1 − 0.04 = 0.06.", "v = 1 ÷ 0.06 ≈ 16.7 cm on the other side."],
        answer: "About 16.7 cm from the lens (real and inverted)",
      },
      exam: [
        ["Explain", "A", 3, "Explain why a straw looks bent in a glass of water.", ["Light travels from water into air", "It changes speed and refracts (bends away from the normal)", "The eye traces the ray back in a straight line, so the straw appears in a different place"]],
        ["State", "A", 2, "State two differences between light and sound waves.", ["Light is transverse; sound is longitudinal", "Light can travel through a vacuum; sound cannot (or: light is much faster)"]],
      ],
      mistakes: ["Measuring angles from the surface instead of the normal.", "Saying light bends towards the normal when leaving glass.", "Drawing rays without arrows."],
    },
  ),
  depth(
    "phy-circuits",
    ["Draw circuit diagrams with standard symbols", "Use V = I × R", "Compare series and parallel circuits"],
    ["Scientific and technical innovation", "Houses are wired in parallel so one broken bulb doesn't switch everything off."],
    {
      diagrams: [
        [{ kind: "circuit", series: [{ type: "ammeter", label: "A" }, { type: "resistor", label: "4 Ω" }, { type: "resistor", label: "2 Ω" }], source: [{ type: "battery", label: "12 V" }] }, "A series circuit: the same current flows through every component."],
      ],
      worked: {
        problem: "Find the current in the series circuit shown (12 V battery, 4 Ω and 2 Ω resistors).",
        steps: ["In series, resistances add: 4 + 2 = 6 Ω.", "I = V ÷ R.", "12 ÷ 6 = 2 A."],
        answer: "2 A",
        diagram: { kind: "circuit", series: [{ type: "ammeter", label: "A" }, { type: "resistor", label: "4 Ω" }, { type: "resistor", label: "2 Ω" }], source: [{ type: "battery", label: "12 V" }] },
      },
      exam: [
        ["Calculate", "A", 3, "Calculate the potential difference across the 4 Ω resistor.", ["Current is 2 A", "V = I × R = 2 × 4", "= 8 V"], { kind: "circuit", series: [{ type: "ammeter", label: "A" }, { type: "resistor", label: "4 Ω" }, { type: "resistor", label: "2 Ω" }], source: [{ type: "battery", label: "12 V" }] }],
        ["Explain", "A", 3, "Explain one advantage of wiring lamps in parallel.", ["Each lamp gets the full supply voltage (so they are brighter)", "If one lamp breaks, the others stay on", "Each can be switched separately"]],
      ],
      mistakes: ["Putting a voltmeter in series.", "Thinking current is used up around a circuit.", "Adding resistances in parallel as if they were in series."],
    },
  ),
  depth(
    "phy-efficiency",
    ["Calculate efficiency", "Identify useful and wasted energy", "Suggest ways to reduce waste"],
    ["Globalization and sustainability", "LED bulbs are about five times more efficient than old filament bulbs, cutting electricity bills."],
    {
      diagrams: [[{ kind: "chart", type: "pie", labels: ["Useful kinetic energy", "Wasted heat", "Wasted sound"], series: [{ name: "Car engine", values: [30, 65, 5] }] }, "A petrol car engine wastes most of its energy as heat."]],
      worked: {
        problem: "A kettle uses 2000 J of electrical energy and transfers 1700 J to the water. Calculate its efficiency.",
        steps: ["Efficiency = useful output ÷ total input.", "1700 ÷ 2000 = 0.85.", "× 100 = 85%."],
        answer: "85%",
      },
      exam: [
        ["Calculate", "A", 2, "A motor has an input of 500 W and a useful output of 350 W. Calculate its efficiency.", ["350 ÷ 500", "= 0.7 or 70%"]],
        ["Suggest", "A", 2, "Suggest two ways to reduce wasted energy in a home.", ["Insulation (loft, cavity walls, double glazing) reduces heat loss", "Efficient appliances / LED bulbs / switching devices off"]],
      ],
      mistakes: ["Getting an efficiency above 100%.", "Swapping useful and total.", "Forgetting wasted energy usually ends up as heat."],
    },
  ),
  depth(
    "phy-thermal",
    ["Use E = m × c × ΔT", "Explain conduction, convection and radiation", "Explain insulation"],
    ["Globalization and sustainability", "Painting roofs white reflects sunlight and keeps homes cooler in hot cities."],
    {
      worked: {
        problem: "How much energy heats 2 kg of water from 20 °C to 70 °C? (c = 4200 J/kg°C)",
        steps: ["ΔT = 70 − 20 = 50 °C.", "E = m × c × ΔT = 2 × 4200 × 50.", "= 420 000 J."],
        answer: "420 000 J (420 kJ)",
      },
      exam: [
        ["Explain", "A", 3, "Explain how convection heats a whole room from one radiator.", ["Air near the radiator warms, expands and becomes less dense", "Warm air rises and cooler, denser air sinks to replace it", "This sets up a convection current that circulates heat"]],
        ["Calculate", "A", 3, "Calculate the temperature rise when 84 000 J heats 1 kg of water. (c = 4200 J/kg°C)", ["ΔT = E ÷ (m × c)", "84 000 ÷ 4200", "= 20 °C"]],
      ],
      mistakes: ["Saying 'cold' moves in: heat moves from hot to cold.", "Forgetting convection only happens in fluids.", "Using the final temperature instead of the change."],
    },
  ),
  depth(
    "phy-magnetism",
    ["Draw magnetic field patterns", "Describe electromagnets and what affects their strength", "Use the transformer equation"],
    ["Scientific and technical innovation", "MRI scanners use very strong electromagnets to image soft tissue without X-rays."],
    {
      worked: {
        problem: "A transformer has 200 turns on the primary coil and 50 on the secondary. The input is 240 V. What is the output voltage?",
        steps: ["Vp ÷ Vs = Np ÷ Ns.", "240 ÷ Vs = 200 ÷ 50 = 4.", "Vs = 240 ÷ 4 = 60 V."],
        answer: "60 V (a step-down transformer)",
      },
      exam: [
        ["State", "A", 3, "State three ways to make an electromagnet stronger.", ["More turns on the coil", "A larger current", "An iron core"]],
        ["Explain", "A", 2, "Explain why transformers only work with alternating current.", ["An a.c. makes a changing magnetic field in the core", "A changing field is needed to induce a voltage in the secondary coil"]],
      ],
      mistakes: ["Drawing field lines from S to N (they go N to S outside the magnet).", "Thinking all metals are magnetic.", "Using the transformer equation upside down."],
    },
  ),
]);
