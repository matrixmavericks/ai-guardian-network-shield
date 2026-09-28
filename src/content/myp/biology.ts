import { Subject, topic, unit } from "./types";

export const biology: Subject = {
  slug: "biology",
  name: "Biology",
  group: "Sciences",
  description: "Cells, body systems, ecology and genetics.",
  icon: "leaf",
  theme: { gradient: "linear-gradient(135deg, #10B981 0%, #059669 45%, #065F46 100%)", accent: "#34D399" },
  units: [
    unit("bio-cells", "Cells", [
      topic(
        "bio-cell-structure",
        "Cell structure",
        "The organelles inside plant and animal cells, and how structure fits function.",
        `
## The cell is the basic unit of life
Every living organism is made of one or more cells. Most cells share the same core parts, but plant and animal cells differ in a few important ways.

## Organelles and their jobs
- **Nucleus**: contains DNA and controls the cell's activities.
- **Cytoplasm**: jelly-like fluid where most chemical reactions happen.
- **Cell membrane**: controls what enters and leaves the cell.
- **Mitochondria**: site of aerobic respiration, releasing energy.
- **Ribosomes**: where proteins are made.

## Only in plant cells
- **Cell wall** made of cellulose: supports the cell and stops it bursting.
- **Chloroplasts**: absorb light for photosynthesis.
- **Permanent vacuole**: filled with cell sap, keeps the cell firm (turgid).

## Specialised cells
Cells change shape and contents to suit one job. A **red blood cell** has no nucleus and a biconcave shape to carry more oxygen. A **root hair cell** has a long extension that increases surface area for absorbing water.

> Exam tip: when asked *how a cell is adapted*, always link the feature to the function ("…so that…").
`,
        [
          ["Organelle", "A specialised structure inside a cell that carries out a particular job."],
          ["Chloroplast", "Organelle in plant cells that absorbs light energy for photosynthesis."],
          ["Mitochondrion", "Organelle where aerobic respiration releases energy for the cell."],
          ["Specialised cell", "A cell whose structure is adapted to carry out one particular function."],
        ],
        [
          ["What does the nucleus do?", "Contains genetic material (DNA) and controls the cell's activities."],
          ["Name three structures found in plant cells but not animal cells.", "Cell wall, chloroplasts and a permanent vacuole."],
          ["Why do red blood cells have no nucleus?", "It leaves more space for haemoglobin, so they can carry more oxygen."],
          ["What is the cell wall made of in plants?", "Cellulose."],
        ],
        [
          ["Which organelle is the site of aerobic respiration?", ["Nucleus", "Ribosome", "Mitochondrion", "Vacuole"], 2, "Mitochondria carry out aerobic respiration, releasing energy the cell can use."],
          ["Which structure is found in plant cells but NOT animal cells?", ["Cell membrane", "Cell wall", "Cytoplasm", "Ribosome"], 1, "Both cell types have a membrane, cytoplasm and ribosomes; only plant cells have a cellulose cell wall."],
          ["A root hair cell has a long thin extension. What is this for?", ["Photosynthesis", "Storing starch", "Increasing surface area for absorbing water", "Making proteins"], 2, "The extension increases surface area, so more water and mineral ions can be absorbed."],
          ["Where are proteins made in a cell?", ["Ribosomes", "Chloroplasts", "Cell wall", "Vacuole"], 0, "Ribosomes assemble amino acids into proteins."],
        ],
      ),
      topic(
        "bio-transport",
        "Diffusion, osmosis and active transport",
        "How substances move into and out of cells, with and without energy.",
        `
## Three ways substances cross membranes
| Process | What moves | Direction | Energy needed? |
|---|---|---|---|
| Diffusion | Particles (e.g. O₂, CO₂) | High → low concentration | No |
| Osmosis | Water | Dilute → concentrated solution, across a partially permeable membrane | No |
| Active transport | Particles (e.g. mineral ions) | Low → high concentration | Yes, from respiration |

## What speeds up diffusion?
- A **bigger concentration gradient** (bigger difference in concentration).
- A **higher temperature** (particles move faster).
- A **larger surface area** and a **shorter distance** to travel.

## Osmosis in cells
- In pure water, a plant cell takes in water and becomes **turgid**; the cell wall stops it bursting.
- In a concentrated solution, it loses water and becomes **plasmolysed**.
- Animal cells have no wall, so they can **burst** in pure water.

> Common mistake: osmosis is only about **water** moving. Don't say "salt moves by osmosis".
`,
        [
          ["Diffusion", "Net movement of particles from a region of higher concentration to lower concentration."],
          ["Osmosis", "Net movement of water across a partially permeable membrane from a dilute to a more concentrated solution."],
          ["Active transport", "Movement of particles against a concentration gradient, using energy from respiration."],
          ["Concentration gradient", "The difference in concentration between two regions."],
        ],
        [
          ["Does diffusion need energy?", "No. It is passive and happens down a concentration gradient."],
          ["What happens to a plant cell in pure water?", "It takes in water by osmosis and becomes turgid; the cell wall stops it bursting."],
          ["Why do root hair cells need active transport?", "Mineral ions are more concentrated inside the cell than in the soil, so they must be moved against the gradient."],
          ["Give two factors that increase the rate of diffusion.", "A steeper concentration gradient, a higher temperature, a larger surface area or a shorter distance."],
        ],
        [
          ["Which process moves mineral ions from the soil into root hair cells?", ["Diffusion", "Osmosis", "Active transport", "Evaporation"], 2, "Ions move against their concentration gradient, which needs energy: active transport."],
          ["Osmosis is the movement of…", ["solute particles across any membrane", "water across a partially permeable membrane", "oxygen into cells", "glucose out of cells"], 1, "Osmosis only describes water moving across a partially permeable membrane."],
          ["Which change would INCREASE the rate of diffusion?", ["Lowering the temperature", "Reducing surface area", "Increasing the concentration gradient", "Increasing the distance"], 2, "A steeper gradient means more particles move per second."],
          ["A red blood cell is placed in pure water. What is most likely to happen?", ["It shrinks", "It bursts", "It stays the same", "It grows a cell wall"], 1, "Water enters by osmosis; with no cell wall, the cell swells and can burst."],
        ],
      ),
      topic(
        "bio-cell-division",
        "Cell division: mitosis and meiosis",
        "How cells copy themselves for growth, and make gametes for reproduction.",
        `
## Mitosis: growth and repair
- One cell divides to make **two genetically identical** cells.
- Each new cell has the **full number of chromosomes** (diploid, 46 in humans).
- Used for growth, repairing tissue and asexual reproduction.

## Meiosis: making gametes
- One cell divides twice to make **four genetically different** cells.
- Each gamete has **half** the chromosomes (haploid, 23 in humans).
- Creates variation, because chromosomes are shuffled.

## Why halve the chromosome number?
At fertilisation, a sperm (23) joins an egg (23), restoring the full number (46) in the zygote.

## The cell cycle in brief
1. The cell grows and copies its DNA.
2. Chromosomes line up and are pulled apart.
3. The cytoplasm and membrane divide.

> Memory hook: mi**T**osis makes **T**wo identical cells; mei**O**sis makes gametes with **O**ne set.
`,
        [
          ["Mitosis", "Cell division that produces two genetically identical diploid cells."],
          ["Meiosis", "Cell division that produces four genetically different haploid gametes."],
          ["Diploid", "Having two sets of chromosomes (46 in human body cells)."],
          ["Haploid", "Having one set of chromosomes (23 in human gametes)."],
        ],
        [
          ["How many cells does mitosis produce?", "Two, genetically identical to the parent cell."],
          ["How many chromosomes are in a human gamete?", "23 (haploid)."],
          ["Why is meiosis important for variation?", "Chromosomes are shuffled, so each gamete is genetically different."],
          ["Give two uses of mitosis.", "Growth, repair of damaged tissue and asexual reproduction."],
        ],
        [
          ["How many chromosomes are in a human skin cell?", ["23", "46", "92", "12"], 1, "Body cells are diploid: 46 chromosomes (23 pairs)."],
          ["Which statement about meiosis is correct?", ["It produces two identical cells", "It is used to repair skin", "It produces four genetically different gametes", "It doubles the chromosome number"], 2, "Meiosis makes four haploid gametes, each genetically different."],
          ["Why must gametes be haploid?", ["So they can divide faster", "So the zygote has the normal chromosome number after fertilisation", "So they can photosynthesise", "To prevent mutations"], 1, "23 + 23 = 46, restoring the diploid number in the zygote."],
          ["Which process heals a cut on your finger?", ["Meiosis", "Mitosis", "Osmosis", "Fertilisation"], 1, "New identical skin cells are produced by mitosis."],
        ],
      ),
    ]),
    unit("bio-systems", "Organisms and body systems", [
      topic(
        "bio-enzymes",
        "Enzymes and digestion",
        "Biological catalysts, and how the digestive system breaks food down.",
        `
## Enzymes are biological catalysts
They speed up reactions without being used up. Each enzyme has an **active site** with a specific shape that fits one **substrate** (the *lock and key* model).

## What affects enzyme activity?
- **Temperature**: activity rises until the **optimum** (about 37 °C in humans), then falls sharply as the enzyme **denatures**: its active site changes shape.
- **pH**: each enzyme has an optimum pH. Pepsin in the stomach works best around pH 2; amylase in the mouth around pH 7.

## Digestive enzymes
| Enzyme | Breaks down | Into | Made in |
|---|---|---|---|
| Amylase | Starch | Sugars | Salivary glands, pancreas |
| Protease | Proteins | Amino acids | Stomach, pancreas |
| Lipase | Lipids (fats) | Fatty acids + glycerol | Pancreas |

**Bile**, made in the liver, is not an enzyme: it emulsifies fats into droplets and neutralises stomach acid.

> Exam tip: say the enzyme is **denatured**, never "killed". Enzymes are not alive.
`,
        [
          ["Enzyme", "A protein that acts as a biological catalyst, speeding up reactions."],
          ["Active site", "The part of an enzyme where the substrate binds."],
          ["Denatured", "When an enzyme's active site changes shape so the substrate no longer fits."],
          ["Optimum", "The temperature or pH at which an enzyme works fastest."],
        ],
        [
          ["What does amylase break down?", "Starch into sugars."],
          ["Why does enzyme activity drop above the optimum temperature?", "The enzyme denatures: the active site changes shape and the substrate no longer fits."],
          ["What does bile do?", "Emulsifies fats into small droplets and neutralises stomach acid."],
          ["What are the products of lipid digestion?", "Fatty acids and glycerol."],
        ],
        [
          ["Which enzyme digests proteins?", ["Amylase", "Lipase", "Protease", "Bile"], 2, "Proteases break proteins into amino acids."],
          ["What happens to an enzyme at 70 °C?", ["It works fastest", "It denatures", "It multiplies", "It turns into glucose"], 1, "High temperatures change the shape of the active site: the enzyme is denatured."],
          ["The 'lock and key' model explains that…", ["enzymes are used up in reactions", "each enzyme fits a specific substrate", "enzymes only work in the stomach", "enzymes are carbohydrates"], 1, "The substrate's shape is complementary to the active site, like a key in a lock."],
          ["Pepsin works in the stomach. Its optimum pH is most likely…", ["2", "7", "9", "12"], 0, "The stomach is strongly acidic, so pepsin works best at about pH 2."],
        ],
      ),
      topic(
        "bio-circulation",
        "Circulation and gas exchange",
        "The heart, blood vessels and lungs work together to supply oxygen.",
        `
## The double circulatory system
Blood passes through the heart **twice** per circuit: once to the lungs (to pick up oxygen) and once to the body.

## The heart
- The **right** side pumps deoxygenated blood to the lungs.
- The **left** side pumps oxygenated blood to the body; its wall is **thicker** because it pumps further.
- **Valves** stop blood flowing backwards.

## Blood vessels
| Vessel | Carries blood | Key features |
|---|---|---|
| Arteries | Away from the heart | Thick, elastic walls; high pressure |
| Veins | Towards the heart | Thinner walls; valves; low pressure |
| Capillaries | Through tissues | One cell thick, for fast diffusion |

## Gas exchange in the lungs
Oxygen diffuses from the **alveoli** into the blood; carbon dioxide diffuses the other way. Alveoli are adapted with a **huge surface area**, **thin walls**, a **moist lining** and a **rich blood supply**.
`,
        [
          ["Artery", "Blood vessel carrying blood away from the heart under high pressure."],
          ["Capillary", "Tiny vessel with walls one cell thick where substances are exchanged."],
          ["Alveoli", "Tiny air sacs in the lungs where gas exchange happens."],
          ["Double circulation", "Blood passes through the heart twice in one complete circuit of the body."],
        ],
        [
          ["Why is the left ventricle wall thicker than the right?", "It pumps blood all around the body, which needs higher pressure."],
          ["What stops blood flowing backwards in veins?", "Valves."],
          ["Give three adaptations of alveoli.", "Large surface area, thin walls, moist lining, good blood supply."],
          ["Which blood vessels have walls one cell thick?", "Capillaries."],
        ],
        [
          ["Which vessel carries blood away from the heart?", ["Vein", "Artery", "Capillary", "Alveolus"], 1, "Arteries carry blood away from the heart at high pressure."],
          ["Where does gas exchange take place in the lungs?", ["Trachea", "Bronchi", "Alveoli", "Diaphragm"], 2, "Oxygen and carbon dioxide diffuse across the thin alveolar walls."],
          ["Which side of the heart pumps blood to the lungs?", ["Left", "Right", "Both", "Neither"], 1, "The right side sends deoxygenated blood to the lungs."],
          ["Why are capillary walls so thin?", ["To withstand high pressure", "To allow fast diffusion", "To store blood", "To pump blood"], 1, "A short diffusion distance means substances exchange quickly."],
        ],
      ),
      topic(
        "bio-classification",
        "Classification",
        "How scientists group living things and name them.",
        `
## Why classify?
There are millions of species. Grouping them by shared features helps scientists identify, study and communicate about organisms.

## The hierarchy
**Kingdom → Phylum → Class → Order → Family → Genus → Species**
Memory hook: *King Philip Came Over For Good Soup.*

## The five kingdoms
Animals, Plants, Fungi, Protoctists and Prokaryotes (bacteria).

## Binomial naming
Each species gets a two-part Latin name: **Genus species**, e.g. *Homo sapiens*. The genus has a capital letter; the species does not. This avoids confusion between common names in different languages.

## Dichotomous keys
A key asks a series of yes/no questions about visible features, splitting organisms into two groups each time until each one is identified.

> A **species** is a group of organisms that can breed together to produce **fertile** offspring.
`,
        [
          ["Species", "Organisms that can interbreed to produce fertile offspring."],
          ["Binomial system", "Naming each species with two Latin words: genus and species."],
          ["Dichotomous key", "A tool that identifies organisms through a series of two-way choices."],
          ["Kingdom", "The largest group in the classification hierarchy."],
        ],
        [
          ["List the classification levels in order.", "Kingdom, phylum, class, order, family, genus, species."],
          ["What is the scientific name for humans?", "Homo sapiens."],
          ["Why use scientific names instead of common names?", "They are the same worldwide, avoiding confusion between languages and regions."],
          ["Name the five kingdoms.", "Animals, plants, fungi, protoctists and prokaryotes."],
        ],
        [
          ["In Panthera leo, what is 'Panthera'?", ["The species", "The genus", "The family", "The kingdom"], 1, "In binomial names the first word is the genus."],
          ["Which is the largest group?", ["Species", "Genus", "Kingdom", "Order"], 2, "Kingdom is the top, broadest level of classification."],
          ["A dichotomous key works by…", ["measuring DNA", "a series of two-way choices", "counting chromosomes", "comparing habitats"], 1, "Dichotomous means dividing into two at each step."],
          ["Two organisms are the same species if they…", ["look similar", "live in the same place", "can produce fertile offspring together", "eat the same food"], 2, "The key test is producing fertile offspring."],
        ],
      ),
    ]),
    unit("bio-life", "Energy, ecology and genetics", [
      topic(
        "bio-photosynthesis",
        "Photosynthesis and respiration",
        "How plants make glucose, and how all living things release energy from it.",
        `
## Photosynthesis
**carbon dioxide + water → glucose + oxygen** (light energy absorbed by chlorophyll)
6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂

It happens in **chloroplasts**. Plants use glucose for respiration, to make starch (storage), cellulose (cell walls) and proteins.

### Limiting factors
The rate is limited by whichever is in shortest supply: **light intensity**, **carbon dioxide concentration** or **temperature**.

## Aerobic respiration
**glucose + oxygen → carbon dioxide + water** (+ energy released)
Happens in **mitochondria** in all living cells, all the time.

## Anaerobic respiration
Without oxygen:
- Muscles: **glucose → lactic acid**, releasing less energy (causes an oxygen debt).
- Yeast: **glucose → ethanol + carbon dioxide** (fermentation, used in baking and brewing).

> Respiration is not breathing. Breathing moves air; respiration is a chemical reaction in cells.
`,
        [
          ["Photosynthesis", "Process in which plants use light energy to make glucose from carbon dioxide and water."],
          ["Limiting factor", "The factor in shortest supply that limits the rate of a process."],
          ["Aerobic respiration", "Releasing energy from glucose using oxygen."],
          ["Anaerobic respiration", "Releasing energy from glucose without oxygen, producing less energy."],
        ],
        [
          ["Give the word equation for photosynthesis.", "Carbon dioxide + water → glucose + oxygen."],
          ["Name the three main limiting factors of photosynthesis.", "Light intensity, carbon dioxide concentration and temperature."],
          ["What does anaerobic respiration produce in muscles?", "Lactic acid."],
          ["Where does aerobic respiration happen?", "In the mitochondria."],
        ],
        [
          ["Which gas is released by photosynthesis?", ["Carbon dioxide", "Oxygen", "Nitrogen", "Methane"], 1, "Oxygen is a product of photosynthesis."],
          ["In which organelle does photosynthesis occur?", ["Mitochondrion", "Nucleus", "Chloroplast", "Ribosome"], 2, "Chloroplasts contain chlorophyll, which absorbs light."],
          ["Yeast respiring anaerobically produces…", ["lactic acid", "ethanol and carbon dioxide", "oxygen and water", "glucose"], 1, "This is fermentation: glucose → ethanol + carbon dioxide."],
          ["On a bright, cold day, the likely limiting factor for photosynthesis is…", ["light", "temperature", "water", "chlorophyll"], 1, "There is plenty of light, so temperature is in shortest supply."],
        ],
      ),
      topic(
        "bio-ecosystems",
        "Ecosystems and energy flow",
        "Food chains, energy transfer and how ecosystems stay in balance.",
        `
## Key ideas
- A **community** is all the populations living in an area; an **ecosystem** is the community plus its non-living environment.
- **Producers** (plants) make food by photosynthesis; **consumers** eat other organisms; **decomposers** break down dead material and recycle nutrients.

## Food chains and webs
grass → rabbit → fox
Arrows show the direction **energy flows**. A food web links many chains.

## Energy transfer
Only about **10%** of energy passes to the next trophic level. The rest is lost as **heat from respiration**, in **undigested waste** and in parts not eaten. This is why food chains rarely have more than four or five levels.

## Pyramids
A **pyramid of biomass** shows the mass of living material at each level; it gets smaller going up.

## Biotic and abiotic factors
- **Biotic**: living factors such as predators, disease and competition.
- **Abiotic**: non-living factors such as temperature, light and pH.
`,
        [
          ["Ecosystem", "A community of organisms together with their non-living environment."],
          ["Producer", "An organism that makes its own food, usually by photosynthesis."],
          ["Trophic level", "The position an organism occupies in a food chain."],
          ["Abiotic factor", "A non-living factor that affects organisms, such as temperature or light."],
        ],
        [
          ["What do arrows in a food chain show?", "The direction of energy flow."],
          ["About how much energy passes to the next trophic level?", "Around 10%."],
          ["Give two ways energy is lost between trophic levels.", "Heat from respiration, undigested waste, and parts not eaten."],
          ["What role do decomposers play?", "They break down dead material and recycle nutrients into the soil."],
        ],
        [
          ["In grass → rabbit → fox, the rabbit is a…", ["producer", "primary consumer", "secondary consumer", "decomposer"], 1, "The rabbit eats the producer, so it is a primary consumer."],
          ["Which is an abiotic factor?", ["Predators", "Disease", "Temperature", "Competition"], 2, "Temperature is non-living; the others involve living things."],
          ["Why are food chains usually short?", ["Animals are too big", "Energy is lost at each level", "Plants stop growing", "Decomposers eat the top level"], 1, "Only about 10% of energy passes on, so little is left for higher levels."],
          ["A pyramid of biomass shows…", ["the number of organisms", "the mass of living material at each level", "the age of organisms", "the speed of energy flow"], 1, "Biomass pyramids show mass of living material per trophic level."],
        ],
      ),
      topic(
        "bio-genetics",
        "DNA and inheritance",
        "Genes, alleles and how characteristics are passed from parents to offspring.",
        `
## From DNA to characteristics
- **DNA** is a double helix found in the nucleus.
- A **gene** is a section of DNA that codes for a particular protein, which affects a characteristic.
- **Chromosomes** are long strands of DNA; humans have 23 pairs.

## Alleles
Different versions of the same gene are **alleles**.
- **Dominant** allele (capital letter, e.g. **B**): shows even if only one copy is present.
- **Recessive** allele (lower case, **b**): only shows with two copies.
- **Homozygous**: two identical alleles (BB or bb). **Heterozygous**: two different alleles (Bb).
- **Genotype** is the alleles; **phenotype** is the characteristic you see.

## Punnett squares
Crossing **Bb × Bb** gives BB, Bb, Bb, bb: a **3 : 1** ratio of dominant to recessive phenotype, or a **25%** chance of bb.

## Sex determination
Females are **XX**, males **XY**. Each child has a 50% chance of being either sex.
`,
        [
          ["Gene", "A section of DNA that codes for a protein."],
          ["Allele", "A different version of the same gene."],
          ["Genotype", "The combination of alleles an organism has."],
          ["Phenotype", "The observable characteristics produced by the genotype."],
        ],
        [
          ["What is the difference between genotype and phenotype?", "Genotype is the alleles present; phenotype is the characteristic that shows."],
          ["What ratio of phenotypes does Bb × Bb give?", "3 dominant : 1 recessive."],
          ["When does a recessive allele show?", "Only when two copies are present (homozygous recessive)."],
          ["What are the sex chromosomes of a male?", "XY."],
        ],
        [
          ["An organism with alleles Bb is…", ["homozygous dominant", "heterozygous", "homozygous recessive", "haploid"], 1, "Two different alleles make it heterozygous."],
          ["Two Bb parents have a child. What is the chance it is bb?", ["0%", "25%", "50%", "75%"], 1, "The Punnett square gives BB, Bb, Bb, bb: 1 in 4 is bb."],
          ["A section of DNA coding for a protein is a…", ["chromosome", "gene", "nucleus", "cell"], 1, "That is the definition of a gene."],
          ["Which parent determines the sex of a human child?", ["The mother", "The father", "Both equally", "Neither"], 1, "Eggs always carry X; sperm carry X or Y, so the father's sperm decides."],
        ],
      ),
    ]),
  ],
};
