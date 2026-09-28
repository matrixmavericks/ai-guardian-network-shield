import { Subject, topic, unit } from "./types";

export const societies: Subject = {
  slug: "individuals-societies",
  name: "Individuals & Societies",
  group: "Individuals & Societies",
  description: "Geography, economics and sustainability.",
  icon: "globe",
  theme: { gradient: "linear-gradient(135deg, #14B8A6 0%, #0D9488 45%, #134E4A 100%)", accent: "#5EEAD4" },
  units: [
    unit("is-geo", "Physical and human geography", [
      topic(
        "is-tectonics",
        "Plate tectonics",
        "Earth's structure, plate boundaries, earthquakes and volcanoes.",
        `
## Earth's structure
**Crust** (thin, solid) → **mantle** (semi-molten rock) → **outer core** (liquid) → **inner core** (solid iron and nickel).
Heat from the core drives **convection currents** in the mantle, which move the plates above.

## Plate boundaries
| Boundary | Movement | Features | Example |
|---|---|---|---|
| Destructive (convergent) | Oceanic plate subducts under continental | Explosive volcanoes, strong earthquakes, trenches | Andes |
| Collision | Two continental plates meet | Fold mountains, earthquakes | **Himalayas** (Indian and Eurasian plates) |
| Constructive (divergent) | Plates move apart | Gentle volcanoes, ridges | Mid-Atlantic Ridge, Iceland |
| Conservative (transform) | Plates slide past each other | Earthquakes, no volcanoes | San Andreas Fault |

## Earthquakes
Stress builds up and releases suddenly. The **focus** is underground; the **epicentre** is directly above it on the surface. Magnitude is measured on the **moment magnitude** (or Richter) scale.

## Why live near hazards?
Fertile volcanic soils, geothermal energy, tourism, jobs, family ties, and a belief that eruptions are rare.

## Managing risk
**Monitoring** (seismometers, tiltmeters), **prediction**, **protection** (earthquake-resistant buildings) and **planning** (evacuation drills, hazard maps).
`,
        [
          ["Subduction", "When a denser oceanic plate sinks beneath another plate."],
          ["Epicentre", "The point on the surface directly above an earthquake's focus."],
          ["Convection current", "Circulating movement in the mantle caused by heat, which moves tectonic plates."],
          ["Fold mountains", "Mountains formed when plates collide and rock layers crumple upwards."],
        ],
        [
          ["What drives plate movement?", "Convection currents in the mantle."],
          ["How were the Himalayas formed?", "The collision of the Indian and Eurasian plates."],
          ["Why are there no volcanoes at conservative boundaries?", "No crust is created or destroyed, so no magma rises."],
          ["What is the difference between focus and epicentre?", "The focus is underground; the epicentre is on the surface directly above it."],
        ],
        [
          ["At which boundary do plates move apart?", ["Destructive", "Constructive", "Conservative", "Collision"], 1, "Constructive boundaries are where plates diverge."],
          ["The San Andreas Fault is a… boundary.", ["constructive", "destructive", "conservative", "collision"], 2, "The plates slide past each other."],
          ["Which layer of the Earth is liquid?", ["Crust", "Mantle", "Outer core", "Inner core"], 2, "The outer core is liquid iron and nickel."],
          ["Why might people live near a volcano?", ["The soil is fertile", "There are never eruptions", "It's always colder", "There is no rainfall"], 0, "Volcanic soils are rich in minerals for farming."],
        ],
      ),
      topic(
        "is-population",
        "Population and migration",
        "Population change, the demographic transition model and migration.",
        `
## Population change
**Natural increase = birth rate − death rate** (per 1000 people per year).
Population also changes through **migration**.

## The demographic transition model (DTM)
| Stage | Birth rate | Death rate | Population |
|---|---|---|---|
| 1 | High | High | Low, stable |
| 2 | High | Falling rapidly | Rapid growth |
| 3 | Falling | Low | Growth slows |
| 4 | Low | Low | High, stable |
| 5 | Very low | Low | May decline |

Death rates fall with better **healthcare, sanitation and food**. Birth rates fall with **education (especially for women), contraception** and urbanisation.

## Population pyramids
Show age and sex structure. A wide base means a high birth rate; a wide top means an ageing population.

## Migration
- **Push factors**: war, unemployment, drought, persecution.
- **Pull factors**: jobs, safety, education, healthcare.
- **Economic migrants** move for work; **refugees** flee persecution or conflict.

> In 2023 India overtook China as the world's most populous country (UN estimates).
`,
        [
          ["Birth rate", "The number of live births per 1000 people per year."],
          ["Natural increase", "Birth rate minus death rate."],
          ["Push factor", "A reason that makes people leave a place."],
          ["Refugee", "A person forced to flee their country because of conflict or persecution."],
        ],
        [
          ["What happens to the death rate in DTM stage 2?", "It falls rapidly, due to better healthcare and sanitation."],
          ["Give two pull factors for migration.", "Jobs, safety, education, healthcare."],
          ["What does a wide-based population pyramid show?", "A high birth rate and a young population."],
          ["Why do birth rates fall as countries develop?", "Education for women, contraception, urbanisation and lower infant mortality."],
        ],
        [
          ["Birth rate 30, death rate 10 (per 1000). Natural increase?", ["20 per 1000", "40 per 1000", "3 per 1000", "300 per 1000"], 0, "30 − 10 = 20 per 1000."],
          ["Which is a push factor?", ["Good jobs", "Civil war", "Better schools", "Safe cities"], 1, "War pushes people to leave."],
          ["In which DTM stage are both rates low and the population high and stable?", ["Stage 1", "Stage 2", "Stage 3", "Stage 4"], 3, "Stage 4 has low birth and death rates."],
          ["A pyramid with a wide top suggests…", ["a young population", "an ageing population", "high migration", "a high birth rate"], 1, "Many older people means an ageing population."],
        ],
      ),
      topic(
        "is-urbanisation",
        "Urbanisation",
        "Why cities grow, and the challenges and opportunities they bring.",
        `
## What is urbanisation?
The increase in the **proportion** of people living in towns and cities. Since around 2007, more than half the world's population has been urban, and the UN projects about two-thirds by 2050.

## Causes
- **Rural–urban migration**: people seek jobs, education and healthcare.
- **Natural increase**: young migrants have children in the city.

## Megacities
Cities with more than **10 million** people, e.g. Mumbai, Delhi, Tokyo and São Paulo. Most growth is now in lower-income countries.

## Challenges
- **Informal settlements** (slums) with poor sanitation, such as Dharavi in Mumbai.
- Traffic congestion and air pollution.
- Pressure on water, housing and services.
- The informal economy: jobs without contracts or protection.

## Opportunities
Jobs, education, healthcare, innovation, and cultural diversity.

## Sustainable cities
Public transport (e.g. metro systems), green spaces, waste recycling, renewable energy and affordable housing.

## Counter-urbanisation
In richer countries, some people move **out** of cities to rural areas for quality of life, helped by remote work.
`,
        [
          ["Urbanisation", "An increase in the proportion of people living in urban areas."],
          ["Megacity", "A city with a population of over 10 million."],
          ["Informal settlement", "An area of unplanned housing, often lacking services, built without legal rights."],
          ["Counter-urbanisation", "The movement of people from cities to rural areas."],
        ],
        [
          ["What is a megacity?", "A city with more than 10 million people."],
          ["Give two causes of urbanisation.", "Rural–urban migration and natural increase."],
          ["Name a well-known informal settlement in India.", "Dharavi, Mumbai."],
          ["Give two features of a sustainable city.", "Public transport, green spaces, recycling, renewable energy."],
        ],
        [
          ["Urbanisation means…", ["cities getting physically bigger only", "an increasing proportion of people living in urban areas", "people moving to the countryside", "building skyscrapers"], 1, "It's about the share of the population in urban areas."],
          ["Which is a challenge of rapid urbanisation?", ["More job opportunities", "Informal settlements", "Better hospitals", "Cultural diversity"], 1, "Rapid growth often outpaces housing and services."],
          ["People moving from cities to villages is…", ["urbanisation", "counter-urbanisation", "suburbanisation", "migration only"], 1, "That is counter-urbanisation."],
          ["Most urban growth today is happening in…", ["high-income countries", "lower-income countries", "Antarctica", "rural areas"], 1, "Asia and Africa lead urban growth."],
        ],
      ),
    ]),
    unit("is-econ", "Economics", [
      topic(
        "is-scarcity",
        "Scarcity and opportunity cost",
        "The basic economic problem and the choices it forces.",
        `
## The basic economic problem
Human **wants are unlimited**, but **resources are scarce**. So every individual, business and government must make **choices**.

## Factors of production
| Factor | Meaning | Reward |
|---|---|---|
| Land | Natural resources | Rent |
| Labour | Human effort | Wages |
| Capital | Man-made tools, machines, buildings | Interest |
| Enterprise | Risk-taking and organisation | Profit |

## Opportunity cost
The **next best alternative given up** when making a choice.
If you spend ₹500 on a concert ticket instead of a book, the opportunity cost is the **book**.
A government that spends on defence may give up a new hospital.

## Three key questions every economy answers
1. **What** to produce?
2. **How** to produce it?
3. **For whom** to produce?

## Needs vs wants
**Needs** are essential for survival (food, water, shelter). **Wants** are desirable but not essential.
`,
        [
          ["Scarcity", "When there are limited resources to satisfy unlimited wants."],
          ["Opportunity cost", "The next best alternative forgone when a choice is made."],
          ["Factors of production", "The resources used to make goods and services: land, labour, capital, enterprise."],
          ["Capital", "Man-made resources used in production, such as machinery."],
        ],
        [
          ["What is the basic economic problem?", "Unlimited wants but scarce resources."],
          ["Name the four factors of production.", "Land, labour, capital, enterprise."],
          ["What is the reward for enterprise?", "Profit."],
          ["Define opportunity cost.", "The next best alternative given up."],
        ],
        [
          ["A factory machine is an example of…", ["land", "labour", "capital", "enterprise"], 2, "Man-made tools are capital."],
          ["You choose to study instead of working a shift that pays ₹800. The opportunity cost is…", ["studying", "the ₹800 wage", "nothing", "your textbook"], 1, "The next best alternative is the forgone wage."],
          ["The reward for labour is…", ["rent", "wages", "interest", "profit"], 1, "Workers earn wages."],
          ["Which is a need rather than a want?", ["A smartphone", "Clean water", "Designer shoes", "A holiday"], 1, "Water is essential for survival."],
        ],
      ),
      topic(
        "is-supply-demand",
        "Supply and demand",
        "How markets set prices, and what shifts the curves.",
        `
## Demand
The quantity consumers are **willing and able** to buy at each price.
**Law of demand**: as price rises, quantity demanded **falls**. The curve slopes **down**.

### What shifts demand?
Income, tastes and fashion, the price of **substitutes** and **complements**, advertising, and population.

## Supply
The quantity producers are willing to sell at each price.
**Law of supply**: as price rises, quantity supplied **rises**. The curve slopes **up**.

### What shifts supply?
Costs of production, technology, taxes and subsidies, weather (for farm goods), and the number of firms.

## Equilibrium
Where **supply = demand**. The market clears.
- Price above equilibrium → **surplus** → price falls.
- Price below equilibrium → **shortage** → price rises.

## Movement vs shift
A change in the good's **own price** causes a **movement along** the curve. Any **other factor** causes the whole curve to **shift**.

Example: a frost destroys coffee crops → supply shifts **left** → price **rises**.
`,
        [
          ["Demand", "The quantity of a good consumers are willing and able to buy at a given price."],
          ["Equilibrium price", "The price at which quantity demanded equals quantity supplied."],
          ["Substitute", "A good that can replace another, such as tea for coffee."],
          ["Surplus", "When quantity supplied is greater than quantity demanded."],
        ],
        [
          ["State the law of demand.", "As price rises, quantity demanded falls (and vice versa)."],
          ["What happens at a price above equilibrium?", "A surplus, which pushes the price down."],
          ["What causes a movement along a demand curve?", "A change in the good's own price."],
          ["How would a new technology affect supply?", "Supply shifts right (increases)."],
        ],
        [
          ["The price of coffee rises. Demand for tea (a substitute) will…", ["fall", "rise", "stay the same", "disappear"], 1, "Consumers switch to the cheaper substitute."],
          ["A drought destroys the wheat harvest. The supply curve…", ["shifts right", "shifts left", "doesn't move", "becomes vertical"], 1, "Less can be supplied at every price."],
          ["If price is below equilibrium there will be a…", ["surplus", "shortage", "subsidy", "tax"], 1, "Demand exceeds supply, creating a shortage."],
          ["Which causes a SHIFT in demand for cinema tickets?", ["A fall in ticket price", "A rise in consumer incomes", "A rise in ticket price", "None of these"], 1, "Income is a non-price factor, so the curve shifts."],
        ],
      ),
      topic(
        "is-globalisation",
        "Globalisation",
        "How the world became more connected, and who wins and loses.",
        `
## What is globalisation?
The increasing **interconnection** of the world's economies, cultures and populations through trade, investment, technology and migration.

## Drivers
- **Transport**: container shipping and cheap air travel.
- **ICT**: the internet, smartphones, instant communication.
- **Trade agreements** and organisations such as the **WTO**.
- **Transnational corporations (TNCs)**: firms operating in many countries.

## Advantages
- Access to larger markets and cheaper goods.
- Jobs and investment in developing countries (e.g. India's IT sector).
- The spread of ideas, technology and culture.

## Disadvantages
- Exploitation of low-wage workers and poor conditions.
- Job losses in high-cost countries (deindustrialisation).
- Environmental damage from transport and production.
- **Cultural homogenisation**: local cultures can be eroded.

## TNCs: a balanced view
They bring jobs, skills and tax revenue, but profits may leave the country (**leakage**), and they can be footloose, moving to wherever costs are lowest.
`,
        [
          ["Globalisation", "The growing interconnection of the world through trade, culture, technology and migration."],
          ["Transnational corporation (TNC)", "A company that operates in more than one country."],
          ["Outsourcing", "A company contracting work to another company, often abroad."],
          ["Free trade", "Trade between countries without tariffs or quotas."],
        ],
        [
          ["Give two drivers of globalisation.", "Improved transport, ICT, trade agreements, TNCs."],
          ["Give one advantage of TNCs for a host country.", "Jobs, investment, skills or tax revenue."],
          ["What is cultural homogenisation?", "Cultures becoming more similar, which erodes local traditions."],
          ["What is leakage?", "Profits leaving the host country to the TNC's home country."],
        ],
        [
          ["Which has most sped up globalisation in recent decades?", ["Horse transport", "The internet", "Hand-written letters", "Tariffs"], 1, "ICT allows instant global communication and trade."],
          ["A disadvantage of globalisation for high-income countries is…", ["cheaper imports", "manufacturing job losses", "wider choice", "tourism"], 1, "Factories move to lower-cost countries."],
          ["A company moving call centres to another country is…", ["protectionism", "outsourcing", "nationalisation", "subsidising"], 1, "It is outsourcing work abroad."],
          ["Which organisation promotes global trade rules?", ["WHO", "WTO", "UNICEF", "NATO"], 1, "The World Trade Organization."],
        ],
      ),
    ]),
    unit("is-sustain", "Sustainability", [
      topic(
        "is-climate",
        "Climate change",
        "The enhanced greenhouse effect, its impacts, and our responses.",
        `
## The greenhouse effect
Greenhouse gases (CO₂, methane, water vapour, nitrous oxide) trap heat in the atmosphere. This **natural** effect keeps Earth habitable.

## The enhanced greenhouse effect
Human activity adds extra greenhouse gases:
- Burning **fossil fuels** (CO₂).
- **Deforestation**, which removes carbon sinks.
- **Agriculture**: cattle and rice paddies release methane.

Atmospheric CO₂ has risen from about **280 ppm** before industrialisation to over **420 ppm** today, and global average temperatures have risen by more than **1 °C**.

## Impacts
- Rising sea levels (thermal expansion and melting ice).
- More extreme weather: heatwaves, floods, droughts.
- Loss of biodiversity and coral bleaching.
- Threats to food and water security.

## Responses
- **Mitigation**: reducing emissions. Renewable energy, efficiency, reforestation, carbon pricing.
- **Adaptation**: coping with the impacts. Sea walls, drought-resistant crops, early warning systems.
- **Paris Agreement (2015)**: keep warming well below 2 °C, and aim for 1.5 °C.
`,
        [
          ["Greenhouse effect", "The trapping of heat in the atmosphere by greenhouse gases."],
          ["Mitigation", "Actions that reduce the causes of climate change, i.e. emissions."],
          ["Adaptation", "Actions that help people cope with the effects of climate change."],
          ["Carbon sink", "Something that absorbs more carbon than it releases, such as forests or oceans."],
        ],
        [
          ["Give two human causes of the enhanced greenhouse effect.", "Burning fossil fuels and deforestation (also agriculture)."],
          ["What is the difference between mitigation and adaptation?", "Mitigation reduces causes; adaptation copes with effects."],
          ["What was the aim of the Paris Agreement?", "Keep warming well below 2 °C, and pursue 1.5 °C."],
          ["Why do sea levels rise as the planet warms?", "Thermal expansion of water, and melting land ice."],
        ],
        [
          ["Building a sea wall is an example of…", ["mitigation", "adaptation", "deforestation", "the greenhouse effect"], 1, "It helps cope with rising sea levels."],
          ["Which gas is released by cattle farming?", ["Oxygen", "Methane", "Nitrogen", "Helium"], 1, "Cattle release methane, a strong greenhouse gas."],
          ["Planting forests helps because trees…", ["release CO₂", "absorb CO₂", "produce methane", "reflect sunlight"], 1, "Trees are carbon sinks."],
          ["The natural greenhouse effect is…", ["entirely harmful", "essential for life on Earth", "caused by humans", "a recent discovery"], 1, "Without it Earth would be far too cold."],
        ],
      ),
      topic(
        "is-water",
        "Water resources",
        "The water cycle, water scarcity and managing supply.",
        `
## Earth's water
About **97%** of Earth's water is salty. Only about **2.5%** is fresh, and most of that is locked in **ice caps and glaciers** or deep underground. Very little is easily accessible.

## The water cycle
**Evaporation** → **condensation** (clouds) → **precipitation** → **surface runoff**, **infiltration** and **groundwater flow** → back to the sea.
**Transpiration** from plants adds water vapour too.

## Water scarcity
- **Physical scarcity**: not enough water, e.g. in deserts.
- **Economic scarcity**: water exists, but there's no money for infrastructure to access it.

Causes include population growth, agriculture (irrigation uses about **70%** of freshwater withdrawals worldwide), industry, pollution and climate change.

## Managing water
- **Large-scale**: dams and reservoirs, water transfer schemes, **desalination**.
- **Small-scale and sustainable**: rainwater harvesting, drip irrigation, fixing leaks, water meters, recycling grey water.

> Small-scale, community-led solutions are often more sustainable than megaprojects.
`,
        [
          ["Water scarcity", "When the demand for water exceeds the available supply."],
          ["Desalination", "Removing salt from seawater to make fresh water."],
          ["Transpiration", "Loss of water vapour from plant leaves."],
          ["Economic water scarcity", "Water is available but there's no investment to access it."],
        ],
        [
          ["What percentage of Earth's water is fresh?", "About 2.5%."],
          ["Which sector uses the most freshwater globally?", "Agriculture (irrigation), about 70%."],
          ["Give two sustainable water management methods.", "Rainwater harvesting, drip irrigation, fixing leaks, recycling grey water."],
          ["What is the difference between physical and economic scarcity?", "Physical: not enough water. Economic: not enough money or infrastructure to access it."],
        ],
        [
          ["Water falling from clouds is…", ["evaporation", "condensation", "precipitation", "infiltration"], 2, "Rain, snow and hail are precipitation."],
          ["Most of Earth's fresh water is found in…", ["rivers", "lakes", "ice caps and glaciers", "clouds"], 2, "Ice holds the majority of fresh water."],
          ["Drip irrigation is sustainable because it…", ["uses more water", "delivers water directly to roots, reducing waste", "requires a dam", "uses seawater"], 1, "It cuts evaporation losses."],
          ["Desalination's main drawback is…", ["it makes water salty", "high energy cost", "it only works in winter", "it reduces rainfall"], 1, "It is very energy-intensive."],
        ],
      ),
      topic(
        "is-sdgs",
        "The Sustainable Development Goals",
        "The UN's 17 goals for people, planet and prosperity by 2030.",
        `
## What are the SDGs?
**17 goals** adopted by all UN member states in **2015**, to be achieved by **2030**. They balance three pillars: **social, economic and environmental**.

## Some key goals
| Goal | Focus |
|---|---|
| SDG 1 | No poverty |
| SDG 2 | Zero hunger |
| SDG 3 | Good health and well-being |
| SDG 4 | Quality education |
| SDG 5 | Gender equality |
| SDG 6 | Clean water and sanitation |
| SDG 7 | Affordable and clean energy |
| SDG 13 | Climate action |

## Sustainable development
Meeting the needs of the present **without compromising the ability of future generations** to meet their own needs (Brundtland Report, 1987).

## Goals are interconnected
Education for girls (SDG 4 and 5) improves health (SDG 3) and reduces poverty (SDG 1). Clean energy (SDG 7) supports climate action (SDG 13).

## Taking action
Governments, businesses, NGOs, schools and individuals all contribute. An **MYP Community Project** is a great place to tackle an SDG locally.
`,
        [
          ["Sustainable development", "Meeting present needs without compromising future generations' ability to meet theirs."],
          ["SDGs", "The UN's 17 Sustainable Development Goals, to be met by 2030."],
          ["NGO", "A non-governmental organisation, a non-profit working on social or environmental issues."],
          ["Three pillars", "The social, economic and environmental dimensions of sustainability."],
        ],
        [
          ["How many SDGs are there?", "17."],
          ["When were the SDGs adopted, and what is their target year?", "Adopted in 2015, target 2030."],
          ["What is SDG 13?", "Climate action."],
          ["Define sustainable development.", "Meeting present needs without compromising future generations' needs."],
        ],
        [
          ["SDG 4 focuses on…", ["zero hunger", "quality education", "clean water", "climate action"], 1, "SDG 4 is quality education."],
          ["The three pillars of sustainability are…", ["land, labour, capital", "social, economic, environmental", "past, present, future", "local, national, global"], 1, "Sustainability balances society, economy and environment."],
          ["Which SDG covers clean water and sanitation?", ["SDG 2", "SDG 6", "SDG 9", "SDG 15"], 1, "SDG 6 is clean water and sanitation."],
          ["Why are the SDGs described as interconnected?", ["They're all about money", "Progress on one goal often helps others", "They were written by one country", "They only apply to Europe"], 1, "E.g. girls' education improves health and reduces poverty."],
        ],
      ),
    ]),
  ],
};
