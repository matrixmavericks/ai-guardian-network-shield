import { depth } from "./types";

// Deeper study layer for History and Individuals & Societies topics.

export const HUMANITIES_DEPTH = Object.fromEntries([
  /* ================= History ================= */
  depth(
    "his-ww1-causes",
    ["Explain the long-term causes of WW1 (MAIN)", "Explain how the assassination in Sarajevo triggered war", "Judge which cause was most important"],
    ["Orientation in space and time", "Alliances can pull countries into conflicts they didn't start, a question NATO members still debate."],
    {
      diagrams: [
        [
          { kind: "timeline", events: [{ year: 1882, label: "Triple Alliance" }, { year: 1907, label: "Triple Entente" }, { year: 1908, label: "Bosnian Crisis" }, { year: 1912, label: "Balkan Wars" }, { year: "Jun 1914", label: "Franz Ferdinand shot" }, { year: "Aug 1914", label: "War declared" }] },
          "The alliance system took shape over decades; war followed within weeks of Sarajevo.",
        ],
      ],
      worked: {
        problem: "How do you structure a 'how far do you agree' answer on the causes of WW1?",
        steps: ["Explain the given cause (e.g. alliances) with evidence.", "Explain at least one other cause (militarism, imperialism, nationalism) with evidence.", "Weigh them: which made war likely, and which made it happen? Reach a clear judgement."],
        answer: "A balanced answer that ends with a supported judgement.",
      },
      exam: [
        ["Explain", "A", 4, "Explain how the alliance system turned a local crisis into a world war.", ["Austria-Hungary declared war on Serbia after Sarajevo", "Russia mobilised to support Serbia", "Germany declared war on Russia and France (its ally)", "Germany invaded Belgium, bringing Britain in"]],
        ["Evaluate", "D", 6, "'Militarism was the main cause of the First World War.' How far do you agree?", ["Explains militarism with evidence (arms race, Dreadnoughts, Schlieffen Plan)", "Explains at least one other cause with evidence", "Links causes together", "Balanced argument", "Clear judgement", "Supported conclusion"]],
      ],
      mistakes: ["Listing causes without explaining how they led to war.", "Saying the assassination alone caused the war.", "Mixing up the Triple Alliance and the Triple Entente."],
    },
  ),
  depth(
    "his-trenches",
    ["Describe conditions in the trenches", "Explain why the Western Front became a stalemate", "Evaluate sources about trench life"],
    ["Identities and relationships", "Letters home from soldiers, including over a million Indian soldiers, show how war changed ordinary lives."],
    {
      worked: {
        problem: "Why did the Western Front become a stalemate by the end of 1914?",
        steps: ["Both sides dug trenches after the Race to the Sea.", "Machine guns, barbed wire and artillery favoured defenders.", "Attacks across no man's land were very costly, so the lines barely moved."],
        answer: "Defensive technology made breakthroughs almost impossible.",
      },
      exam: [
        ["Describe", "A", 3, "Describe three problems soldiers faced in the trenches.", ["Disease, e.g. trench foot from wet conditions", "Rats and lice", "Constant danger from shelling and snipers / shell shock"]],
        ["Explain", "A", 3, "Explain why new weapons did not end the stalemate quickly.", ["Early tanks were slow and broke down", "Gas depended on the wind and gas masks were developed", "Defenders could bring up reserves by railway faster than attackers advanced"]],
      ],
      mistakes: ["Assuming soldiers were in the front line all the time (they rotated).", "Ignoring the role of empire troops.", "Describing without explaining the stalemate."],
    },
  ),
  depth(
    "his-versailles",
    ["Describe the terms of the Treaty of Versailles", "Explain why Germany resented it", "Evaluate whether it was fair"],
    ["Fairness and development", "The treaty is still used as an example of how a harsh peace can lead to future conflict."],
    {
      worked: {
        problem: "What is an easy way to remember the terms of the treaty?",
        steps: ["L - Land: Germany lost territory (e.g. Alsace-Lorraine) and all colonies.", "A - Army: limited to 100 000 men, no air force, no tanks, Rhineland demilitarised.", "M - Money: reparations (£6.6 billion). B - Blame: Article 231, the War Guilt Clause."],
        answer: "LAMB: Land, Army, Money, Blame",
      },
      exam: [
        ["Explain", "A", 4, "Explain why many Germans called the treaty a 'Diktat'.", ["Germany was not invited to the negotiations", "The terms were imposed / Germany had to sign", "The War Guilt Clause blamed Germany alone", "Reparations and losses felt humiliating"]],
        ["Evaluate", "D", 6, "'The Treaty of Versailles was too harsh on Germany.' How far do you agree?", ["Evidence of harshness (LAMB terms)", "Counter-evidence (e.g. Germany's harsh Treaty of Brest-Litovsk; France's losses)", "Considers the aims of the Big Three", "Balanced argument", "Clear judgement", "Supported conclusion"]],
      ],
      mistakes: ["Getting the reparation figure or army limit wrong.", "Only giving the German view.", "Forgetting the Big Three wanted different things."],
    },
  ),
  depth(
    "his-depression",
    ["Explain the causes of the Wall Street Crash", "Describe the effects of the Great Depression", "Explain how it helped extremists gain support"],
    ["Fairness and development", "The 2008 financial crisis was often compared with the Great Depression."],
    {
      diagrams: [
        [
          { kind: "chart", type: "line", labels: ["1929", "1930", "1931", "1932", "1933"], series: [{ name: "US unemployment (%)", values: [3.2, 8.7, 15.9, 23.6, 24.9] }], yLabel: "unemployment (%)" },
          "US unemployment rose from about 3% to about 25% in four years.",
        ],
      ],
      worked: {
        problem: "Describe the trend shown in the graph, using figures.",
        steps: ["State the overall trend: unemployment rose sharply.", "Quote figures: from 3.2% in 1929 to 24.9% in 1933.", "Add detail: the biggest rise was between 1930 and 1932."],
        answer: "A sharp rise from 3.2% to 24.9% between 1929 and 1933.",
      },
      exam: [
        ["Explain", "A", 4, "Explain how the Wall Street Crash affected Germany.", ["American banks recalled loans (from the Dawes Plan)", "German businesses closed and unemployment soared (about 6 million by 1932)", "People lost faith in the Weimar government", "Extremist parties like the Nazis and Communists gained votes"]],
        ["Describe", "C", 2, "Describe the trend in the graph.", ["Unemployment rose steeply", "From 3.2% (1929) to 24.9% (1933)"], { kind: "chart", type: "line", labels: ["1929", "1930", "1931", "1932", "1933"], series: [{ name: "US unemployment (%)", values: [3.2, 8.7, 15.9, 23.6, 24.9] }], yLabel: "unemployment (%)" }],
      ],
      mistakes: ["Saying the Crash alone caused the Depression.", "Describing a graph without quoting figures.", "Forgetting the link from the US economy to Europe."],
    },
  ),
  depth(
    "his-nazi-germany",
    ["Explain how Hitler became dictator (1933–34)", "Describe how the Nazis controlled Germany", "Analyse propaganda"],
    ["Fairness and development", "Studying how democracies collapse helps people protect rights today."],
    {
      diagrams: [
        [
          { kind: "timeline", events: [{ year: "Jan 1933", label: "Hitler Chancellor" }, { year: "Feb 1933", label: "Reichstag Fire" }, { year: "Mar 1933", label: "Enabling Act" }, { year: "Jun 1934", label: "Night of the Long Knives" }, { year: "Aug 1934", label: "Hitler becomes Führer" }] },
          "In 19 months Hitler went from Chancellor to dictator.",
        ],
      ],
      worked: {
        problem: "Why was the Enabling Act so important?",
        steps: ["It let Hitler pass laws without the Reichstag for four years.", "He used it to ban other parties and trade unions.", "So it turned a legal appointment into a dictatorship."],
        answer: "It gave Hitler legal power to rule by decree.",
      },
      exam: [
        ["Explain", "A", 4, "Explain how the Nazis used terror to control Germany.", ["The SS and Gestapo arrested opponents", "Concentration camps held political prisoners", "People were encouraged to inform on each other", "Fear stopped open opposition"]],
        ["Analyse", "B", 4, "A Nazi poster shows smiling workers under the slogan 'One People, One Reich, One Leader'. Analyse its message and purpose.", ["Message of unity behind Hitler", "Workers shown as happy / employment successes", "Purpose: build loyalty and support for the regime", "Links to Goebbels' propaganda aims"]],
      ],
      mistakes: ["Saying Hitler seized power in a coup in 1933 (he was appointed).", "Mixing up the SA and the SS.", "Describing propaganda without explaining its purpose."],
    },
  ),
  depth(
    "his-ww2-causes",
    ["Explain Hitler's foreign policy aims", "Explain the policy of appeasement", "Evaluate the causes of WW2"],
    ["Orientation in space and time", "Leaders still argue about whether talking to aggressive powers prevents war or encourages it."],
    {
      diagrams: [
        [
          { kind: "timeline", events: [{ year: 1936, label: "Rhineland remilitarised" }, { year: "Mar 1938", label: "Anschluss" }, { year: "Sep 1938", label: "Munich Agreement" }, { year: "Mar 1939", label: "Czechoslovakia invaded" }, { year: "Aug 1939", label: "Nazi-Soviet Pact" }, { year: "Sep 1939", label: "Poland invaded" }] },
          "Each step went unchallenged until the invasion of Poland.",
        ],
      ],
      worked: {
        problem: "Why did Britain follow appeasement in 1938?",
        steps: ["Memories of WW1 made people fear another war.", "Britain's armed forces were not ready.", "Many felt the Treaty of Versailles had been too harsh on Germany."],
        answer: "Fear of war, unreadiness and sympathy for German grievances.",
      },
      exam: [
        ["Explain", "A", 4, "Explain why the Nazi-Soviet Pact made war more likely.", ["Germany no longer feared a war on two fronts", "The USSR agreed not to fight Germany", "They secretly agreed to divide Poland", "So Hitler felt free to invade Poland"]],
        ["Evaluate", "D", 6, "'Appeasement caused the Second World War.' How far do you agree?", ["Explains how appeasement encouraged Hitler", "Explains other causes (Hitler's aims, Versailles, League of Nations failure)", "Uses specific events as evidence", "Balanced argument", "Clear judgement", "Supported conclusion"]],
      ],
      mistakes: ["Muddling the order of events in 1938–39.", "Blaming appeasement without considering Hitler's aims.", "Forgetting the USSR's role."],
    },
  ),
  depth(
    "his-sources",
    ["Evaluate sources using OPCVL", "Distinguish value and limitation", "Use provenance to judge reliability"],
    ["Orientation in space and time", "Checking who made a source and why is the same skill as spotting fake news online."],
    {
      worked: {
        problem: "Source A: a British recruitment poster, 1915. Give one value and one limitation.",
        steps: ["Origin and purpose: made by the government to persuade men to enlist.", "Value: shows the methods and messages Britain used to recruit (patriotism, guilt).", "Limitation: propaganda, so it doesn't show what soldiers actually experienced."],
        answer: "Valuable for government attitudes; limited as evidence of reality.",
      },
      exam: [
        ["Evaluate", "B", 4, "Evaluate the value and limitations of a soldier's private diary from the Somme, 1916, for studying trench life.", ["Origin: an eyewitness, written at the time", "Value: personal, detailed and unlikely to be censored", "Limitation: one person's experience, may not be typical", "Limitation: may be emotional or incomplete"]],
        ["Explain", "B", 2, "Explain why a biased source can still be useful to a historian.", ["It shows the attitudes / views of its creator", "It can reveal purpose, e.g. what propaganda wanted people to believe"]],
      ],
      mistakes: ["Saying a source is useless because it is biased.", "Only describing content without provenance.", "Confusing value with reliability."],
    },
  ),
  depth(
    "his-cold-war",
    ["Explain why the USA and USSR became rivals", "Describe key Cold War crises", "Explain why the Cold War ended"],
    ["Globalization and sustainability", "Nuclear arms-control treaties from the Cold War still shape world politics."],
    {
      diagrams: [
        [
          { kind: "timeline", events: [{ year: 1947, label: "Truman Doctrine" }, { year: 1948, label: "Berlin Blockade" }, { year: 1949, label: "NATO formed" }, { year: 1961, label: "Berlin Wall built" }, { year: 1962, label: "Cuban Missile Crisis" }, { year: 1989, label: "Berlin Wall falls" }, { year: 1991, label: "USSR dissolves" }] },
          "Key crises of the Cold War, 1947–1991.",
        ],
      ],
      worked: {
        problem: "Why is it called a 'cold' war?",
        steps: ["The USA and USSR never fought each other directly.", "Rivalry played out through arms and space races, propaganda and alliances.", "They fought through others in proxy wars, e.g. Korea and Vietnam."],
        answer: "Rivalry without direct fighting between the superpowers.",
      },
      exam: [
        ["Explain", "A", 4, "Explain why the Cuban Missile Crisis was a turning point.", ["The world came close to nuclear war", "Both sides realised the danger of brinkmanship", "A hotline between Washington and Moscow was set up", "It led to the Limited Test Ban Treaty (1963)"]],
        ["Explain", "A", 3, "Explain two reasons why the Cold War ended.", ["Gorbachev's reforms (glasnost, perestroika) loosened control", "The Soviet economy was failing / the arms race was too expensive", "Revolutions in Eastern Europe in 1989"]],
      ],
      mistakes: ["Calling the Korean War a war between the USA and USSR.", "Muddling the Berlin Blockade (1948) and the Berlin Wall (1961).", "Describing events without explaining their significance."],
    },
  ),
  depth(
    "his-india",
    ["Explain the methods of the independence movement", "Evaluate the role of Gandhi and others", "Explain the causes and impact of Partition"],
    ["Identities and relationships", "Partition in 1947 displaced millions of people, and families across South Asia still tell those stories."],
    {
      diagrams: [
        [
          { kind: "timeline", events: [{ year: 1919, label: "Jallianwala Bagh massacre" }, { year: 1920, label: "Non-cooperation movement" }, { year: 1930, label: "Salt March" }, { year: 1942, label: "Quit India movement" }, { year: 1947, label: "Independence and Partition" }] },
          "Key moments on the road to independence.",
        ],
      ],
      worked: {
        problem: "Why was the Salt March so effective?",
        steps: ["Salt was needed by everyone, so the tax affected all Indians.", "The 240-mile march drew worldwide press attention.", "Mass civil disobedience showed British rule depended on Indian cooperation."],
        answer: "It turned a simple issue into a powerful, peaceful mass protest.",
      },
      exam: [
        ["Explain", "A", 4, "Explain why Britain agreed to Indian independence in 1947.", ["Britain was weakened economically by WW2", "Nationalist pressure (e.g. Quit India) made rule difficult", "The Labour government supported independence", "Unrest, e.g. the 1946 naval mutiny, showed control was slipping"]],
        ["Evaluate", "D", 6, "'Gandhi was the most important reason India gained independence.' How far do you agree?", ["Explains Gandhi's role and methods with evidence", "Explains other factors (Nehru, Bose, Congress, WW2, British weakness)", "Considers the role of the Muslim League / Jinnah", "Balanced argument", "Clear judgement", "Supported conclusion"]],
      ],
      mistakes: ["Presenting independence as the work of one person.", "Ignoring the violence and displacement of Partition.", "Getting key dates wrong."],
    },
  ),

  /* ================= Individuals & Societies ================= */
  depth(
    "is-tectonics",
    ["Describe the structure of the Earth", "Explain what happens at different plate boundaries", "Explain why people live in hazardous areas"],
    ["Globalization and sustainability", "India is moving north into Asia at about 5 cm a year, still pushing up the Himalayas."],
    {
      worked: {
        problem: "Why do earthquakes and volcanoes happen at destructive plate boundaries?",
        steps: ["An oceanic plate meets a continental plate and, being denser, is subducted.", "Friction as the plates move causes earthquakes.", "The subducted plate melts; magma rises to form volcanoes."],
        answer: "Subduction causes both earthquakes (friction) and volcanoes (melting).",
      },
      exam: [
        ["Explain", "A", 4, "Explain why people continue to live near active volcanoes.", ["Fertile volcanic soils for farming", "Tourism brings income", "Geothermal energy", "Eruptions may be rare / people have family ties or can't afford to move"]],
        ["Compare", "A", 3, "Compare constructive and destructive plate boundaries.", ["Constructive: plates move apart; destructive: plates move together", "Constructive: magma rises to form new crust; destructive: crust is destroyed by subduction", "Destructive boundaries have more violent eruptions and strong earthquakes"]],
      ],
      mistakes: ["Saying plates move because of earthquakes (it's the other way round).", "Confusing the crust with the mantle.", "Only giving negatives of living in hazardous areas."],
    },
  ),
  depth(
    "is-population",
    ["Interpret population pyramids", "Explain the demographic transition model", "Explain push and pull factors in migration"],
    ["Globalization and sustainability", "India has one of the world's youngest populations, a huge opportunity if young people find work."],
    {
      diagrams: [
        [
          { kind: "pyramid", place: "India (approx.)", groups: ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70+"], male: [8.6, 9.2, 9.0, 8.1, 6.4, 4.9, 3.2, 1.9], female: [8.0, 8.5, 8.6, 7.8, 6.3, 4.9, 3.4, 2.2] },
          "A wide base narrowing upwards: a youthful population with falling birth rates at the very bottom.",
        ],
      ],
      worked: {
        problem: "A country has a birth rate of 18 per 1000 and a death rate of 7 per 1000. Calculate the natural increase.",
        steps: ["Natural increase = birth rate − death rate.", "18 − 7 = 11 per 1000.", "As a percentage: 11 ÷ 1000 × 100 = 1.1% per year."],
        answer: "11 per 1000 (1.1% a year)",
      },
      exam: [
        ["Describe", "C", 3, "Describe the shape of India's population pyramid.", ["Wide base: many young people", "Narrows towards the top: fewer elderly", "Slightly narrower 0-9 bar suggests falling birth rates"], { kind: "pyramid", groups: ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70+"], male: [8.6, 9.2, 9.0, 8.1, 6.4, 4.9, 3.2, 1.9], female: [8.0, 8.5, 8.6, 7.8, 6.3, 4.9, 3.4, 2.2] }],
        ["Explain", "A", 4, "Explain two push and two pull factors for rural–urban migration in India.", ["Push: lack of jobs / low farm incomes", "Push: poor services (schools, healthcare) or drought", "Pull: jobs in cities / higher wages", "Pull: better education and healthcare / bright lights"]],
      ],
      mistakes: ["Reading pyramid bars as numbers instead of percentages.", "Mixing up push and pull factors.", "Forgetting migration affects both the origin and the destination."],
    },
  ),
  depth(
    "is-urbanisation",
    ["Define urbanisation and explain its causes", "Describe challenges of rapid urban growth", "Evaluate strategies for sustainable cities"],
    ["Globalization and sustainability", "Pune's population more than doubled in 25 years, putting pressure on roads, water and housing."],
    {
      diagrams: [
        [
          { kind: "chart", type: "line", labels: ["1961", "1971", "1981", "1991", "2001", "2011"], series: [{ name: "Urban population (%)", values: [18.0, 19.9, 23.3, 25.7, 27.8, 31.1] }], yLabel: "% living in towns and cities" },
          "India's census: the share of people living in urban areas has risen every decade.",
        ],
      ],
      worked: {
        problem: "Calculate the percentage point increase in India's urban population share from 1961 to 2011.",
        steps: ["2011 value: 31.1%.", "1961 value: 18.0%.", "31.1 − 18.0 = 13.1 percentage points."],
        answer: "13.1 percentage points",
      },
      exam: [
        ["Describe", "A", 3, "Describe three challenges caused by rapid urbanisation.", ["Informal settlements / slums and housing shortages", "Traffic congestion and air pollution", "Pressure on water, sanitation and waste services"]],
        ["Evaluate", "D", 6, "Evaluate one strategy for making a city like Pune more sustainable.", ["Names a strategy (e.g. metro rail, BRT, rainwater harvesting)", "Explains how it works", "Environmental benefit", "Social / economic benefit", "Limitation or cost", "Judgement on effectiveness"]],
      ],
      mistakes: ["Confusing urbanisation (a rising share) with urban growth (more people).", "Only describing problems without solutions.", "Using figures without units."],
    },
  ),
  depth(
    "is-scarcity",
    ["Explain scarcity and opportunity cost", "Use a production possibility curve", "Explain the basic economic questions"],
    ["Fairness and development", "Governments constantly choose between spending on healthcare, education and defence."],
    {
      diagrams: [
        [
          { kind: "ppc", xLabel: "Consumer goods", yLabel: "Capital goods", points: [{ label: "A", pos: "on", t: 0.3 }, { label: "B", pos: "inside", t: 0.5 }, { label: "C", pos: "outside", t: 0.7 }], shift: "out" },
          "A is efficient, B is inefficient (unemployed resources), C is unattainable until the PPC shifts out.",
        ],
      ],
      worked: {
        problem: "A student can spend Saturday working a shift for ₹800 or at a cricket match. What is the opportunity cost of the match?",
        steps: ["Opportunity cost is the next best alternative given up.", "By going to the match the student gives up the shift.", "So the opportunity cost is the ₹800 of earnings."],
        answer: "₹800 of lost earnings",
      },
      exam: [
        ["Define", "A", 2, "Define opportunity cost.", ["The value of the next best alternative", "Given up when a choice is made"]],
        ["Explain", "A", 3, "Using the diagram, explain what a shift outwards of the PPC shows and one possible cause.", ["The economy can produce more of both goods", "Economic growth / increased productive capacity", "Cause: new technology, more workers or more capital"], { kind: "ppc", xLabel: "Consumer goods", yLabel: "Capital goods", shift: "out" }],
      ],
      mistakes: ["Saying opportunity cost is money spent.", "Treating a point inside the PPC as unattainable.", "Forgetting the curve is bowed out because resources aren't equally suited to both goods."],
    },
  ),
  depth(
    "is-supply-demand",
    ["Explain the laws of demand and supply", "Show shifts on supply and demand diagrams", "Explain how equilibrium price changes"],
    ["Fairness and development", "Onion prices in India spike when poor monsoons cut supply."],
    {
      diagrams: [[{ kind: "supplydemand", shifts: [{ curve: "D", dir: "right", label: "D₂" }] }, "An increase in demand shifts D right: price rises from P₁ to P₂ and quantity from Q₁ to Q₂."]],
      worked: {
        problem: "A poor monsoon cuts the onion harvest. What happens to the market?",
        steps: ["Supply falls, so the supply curve shifts left.", "At the old price there is excess demand.", "Price rises and quantity sold falls to a new equilibrium."],
        answer: "Higher price, lower quantity",
      },
      exam: [
        ["Explain", "A", 4, "Using a diagram, explain the effect of a rise in incomes on the market for cars.", ["Cars are a normal good, so demand increases", "Demand curve shifts right", "Equilibrium price rises", "Equilibrium quantity rises"]],
        ["Distinguish", "A", 2, "Distinguish between a movement along a demand curve and a shift of the curve.", ["Movement: caused by a change in the good's own price", "Shift: caused by other factors (income, tastes, prices of related goods)"]],
      ],
      mistakes: ["Shifting the curve when only the price changed.", "Mislabelling axes (price and quantity).", "Forgetting to label the new equilibrium."],
    },
  ),
  depth(
    "is-globalisation",
    ["Define globalisation and its drivers", "Explain the role of transnational corporations (TNCs)", "Evaluate winners and losers"],
    ["Globalization and sustainability", "Pune's IT and automotive industries grew through links with companies around the world."],
    {
      worked: {
        problem: "How has technology driven globalisation?",
        steps: ["Container shipping made moving goods cheap.", "The internet lets firms communicate and outsource instantly.", "So companies can make, sell and serve customers anywhere."],
        answer: "Cheaper transport and communication connected markets worldwide.",
      },
      exam: [
        ["Explain", "A", 4, "Explain two advantages and two disadvantages of a TNC opening a factory in India.", ["Advantage: jobs and wages for local people", "Advantage: investment in infrastructure / skills and technology transfer", "Disadvantage: profits may go abroad", "Disadvantage: poor working conditions or environmental damage"]],
        ["Discuss", "D", 6, "'Globalisation benefits everyone.' Discuss.", ["Evidence of benefits (growth, jobs, cheaper goods)", "Evidence of costs (inequality, exploitation, cultural loss)", "Considers different groups (workers, consumers, countries)", "Balanced argument", "Clear judgement", "Supported conclusion"]],
      ],
      mistakes: ["Giving one-sided answers.", "Not naming specific examples.", "Confusing globalisation with Westernisation."],
    },
  ),
  depth(
    "is-climate",
    ["Explain the greenhouse effect and its enhancement", "Describe evidence for climate change", "Evaluate mitigation and adaptation strategies"],
    ["Globalization and sustainability", "Heatwaves and unpredictable monsoons already affect farmers across Maharashtra."],
    {
      diagrams: [
        [
          { kind: "chart", type: "line", labels: ["1960", "1980", "2000", "2020"], series: [{ name: "CO₂ (ppm)", values: [317, 339, 370, 414] }], yLabel: "CO₂ (ppm)" },
          "Atmospheric CO₂ measured at Mauna Loa has risen by about a third since 1960.",
        ],
        [
          { kind: "climate", place: "Pune, India", temp: [21, 23, 26, 29, 30, 27, 25, 24, 25, 25, 23, 21], rain: [2, 1, 3, 13, 36, 150, 185, 135, 120, 75, 25, 6] },
          "Pune's climate: a dry season and a monsoon season from June to September.",
        ],
      ],
      worked: {
        problem: "Calculate the percentage increase in CO₂ from 1960 (317 ppm) to 2020 (414 ppm).",
        steps: ["Increase = 414 − 317 = 97 ppm.", "Percentage increase = 97 ÷ 317 × 100.", "≈ 30.6%."],
        answer: "About 31%",
      },
      exam: [
        ["Explain", "A", 4, "Explain how human activities enhance the greenhouse effect.", ["Burning fossil fuels releases CO₂", "Deforestation reduces CO₂ absorption", "Farming (cattle, rice) releases methane", "More greenhouse gases trap more heat, raising global temperatures"]],
        ["Distinguish", "D", 2, "Distinguish between mitigation and adaptation, with an example of each.", ["Mitigation reduces the causes (e.g. solar power)", "Adaptation copes with the effects (e.g. drought-resistant crops, flood defences)"]],
      ],
      mistakes: ["Confusing the ozone hole with climate change.", "Saying the greenhouse effect is bad in itself (without it Earth would be frozen).", "Describing graphs without data."],
    },
  ),
  depth(
    "is-water",
    ["Explain causes of water scarcity", "Describe how water is managed", "Evaluate large and small-scale schemes"],
    ["Globalization and sustainability", "Pune relies on a few dams, so a weak monsoon quickly means water cuts."],
    {
      worked: {
        problem: "A family of 4 uses 135 litres per person per day. How much water do they use in a 30-day month?",
        steps: ["Per day: 4 × 135 = 540 litres.", "Per month: 540 × 30.", "= 16 200 litres."],
        answer: "16 200 litres",
      },
      exam: [
        ["Distinguish", "A", 2, "Distinguish between physical and economic water scarcity.", ["Physical: not enough water available naturally", "Economic: water exists but people can't afford the infrastructure to access it"]],
        ["Evaluate", "D", 6, "Evaluate whether large dams or rainwater harvesting is the better solution for water supply in Maharashtra.", ["Benefits of large dams (storage, irrigation, electricity)", "Costs of large dams (displacement, cost, ecosystem damage)", "Benefits of rainwater harvesting (cheap, local, recharges groundwater)", "Limitations of rainwater harvesting (depends on rain, small scale)", "Balanced comparison", "Supported judgement"]],
      ],
      mistakes: ["Thinking scarcity only happens in deserts.", "Ignoring who benefits and who loses from big projects.", "Not using local examples."],
    },
  ),
  depth(
    "is-sdgs",
    ["Describe the purpose of the Sustainable Development Goals", "Explain links between different goals", "Evaluate progress and action"],
    ["Fairness and development", "The SDGs are the UN's plan to end poverty and protect the planet by 2030."],
    {
      worked: {
        problem: "How are SDG 4 (quality education) and SDG 5 (gender equality) linked?",
        steps: ["Educating girls improves their job prospects.", "Educated women tend to have healthier families and more say in decisions.", "So progress in one goal speeds up progress in the other."],
        answer: "Education for girls advances gender equality, and vice versa.",
      },
      exam: [
        ["Explain", "A", 3, "Explain why the SDGs are described as interconnected.", ["Progress in one goal affects others", "Example linking two goals (e.g. clean water improves health)", "Solutions need to work across goals"]],
        ["Evaluate", "D", 6, "Evaluate one action your school could take to support an SDG.", ["Names a specific SDG", "Describes a realistic action", "Explains the expected impact", "Considers limitations", "Suggests how to measure success", "Reaches a judgement"]],
      ],
      mistakes: ["Listing goals without explaining them.", "Suggesting unrealistic actions for a school.", "Forgetting to measure impact."],
    },
  ),
]);
