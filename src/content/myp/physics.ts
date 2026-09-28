import { Subject, topic, unit } from "./types";

export const physics: Subject = {
  slug: "physics",
  name: "Physics",
  group: "Sciences",
  description: "Motion, forces, energy, waves and electricity.",
  icon: "atom",
  theme: { gradient: "linear-gradient(135deg, #6366F1 0%, #4338CA 45%, #1E1B4B 100%)", accent: "#A5B4FC" },
  units: [
    unit("phy-motion", "Forces and motion", [
      topic(
        "phy-speed",
        "Speed, velocity and acceleration",
        "Describing motion with numbers and graphs.",
        `
## Speed and velocity
**speed = distance ÷ time** (m/s)
**Velocity** is speed in a given **direction**, so it is a **vector**. Speed is a **scalar**.

## Acceleration
**acceleration = change in velocity ÷ time**
a = (v − u) ÷ t, measured in **m/s²**.
Example: a car goes from 0 to 20 m/s in 5 s → a = 20 ÷ 5 = **4 m/s²**.
A negative acceleration is a **deceleration**.

## Distance–time graphs
- The **gradient** = speed.
- A flat line = stationary.
- A steeper line = faster.

## Velocity–time graphs
- The **gradient** = acceleration.
- The **area under the line** = distance travelled.
- A flat line = constant velocity.

> Exam tip: always include units, and check which graph you're reading. The same shape means different things on each.
`,
        [
          ["Speed", "Distance travelled per unit time."],
          ["Velocity", "Speed in a given direction (a vector)."],
          ["Acceleration", "The rate of change of velocity."],
          ["Vector", "A quantity with both size (magnitude) and direction."],
        ],
        [
          ["What is the equation for speed?", "Speed = distance ÷ time."],
          ["What does the gradient of a velocity–time graph show?", "Acceleration."],
          ["What does the area under a velocity–time graph show?", "Distance travelled."],
          ["Is speed a scalar or a vector?", "A scalar (no direction)."],
        ],
        [
          ["A runner covers 400 m in 80 s. Average speed?", ["5 m/s", "320 m/s", "0.2 m/s", "480 m/s"], 0, "400 ÷ 80 = 5 m/s."],
          ["A flat line on a distance–time graph means the object is…", ["accelerating", "stationary", "at constant speed", "decelerating"], 1, "Distance isn't changing, so the object isn't moving."],
          ["A bike speeds up from 2 m/s to 10 m/s in 4 s. Acceleration?", ["2 m/s²", "2.5 m/s²", "3 m/s²", "8 m/s²"], 0, "(10 − 2) ÷ 4 = 2 m/s²."],
          ["Which is a vector quantity?", ["Speed", "Distance", "Velocity", "Time"], 2, "Velocity has a direction; the others don't."],
        ],
      ),
      topic(
        "phy-newton",
        "Newton's laws of motion",
        "Forces, resultant force and how objects respond.",
        `
## Newton's first law
An object stays **at rest** or moves at **constant velocity** unless a **resultant force** acts on it.
Balanced forces → no change in motion.

## Newton's second law
**F = m × a**
Force (N) = mass (kg) × acceleration (m/s²).
A bigger force gives a bigger acceleration; a bigger mass gives a smaller one.
Example: 1200 kg car, 3600 N resultant force → a = 3600 ÷ 1200 = **3 m/s²**.

## Newton's third law
When object A exerts a force on B, **B exerts an equal and opposite force on A**. The two forces act on **different** objects.

## Weight and mass
**W = m × g**, where g ≈ 9.8 N/kg on Earth (often 10 in MYP).
Mass (kg) is the same everywhere; weight (N) depends on gravity.

## Resultant force
Add forces in the same direction; subtract opposite ones. 10 N right and 4 N left → **6 N right**.
`,
        [
          ["Resultant force", "The single force that has the same effect as all the forces acting on an object."],
          ["Newton (N)", "The unit of force."],
          ["Weight", "The force of gravity on an object's mass; W = mg."],
          ["Inertia", "The tendency of an object to keep doing what it is doing."],
        ],
        [
          ["State Newton's second law as an equation.", "F = m × a."],
          ["What happens to an object when forces are balanced?", "It stays still or keeps moving at constant velocity."],
          ["What is the weight of a 50 kg person (g = 10 N/kg)?", "500 N."],
          ["Give an example of Newton's third law.", "When you push on a wall, the wall pushes back on you with an equal force."],
        ],
        [
          ["A 2 kg ball has a resultant force of 10 N. Its acceleration is…", ["5 m/s²", "20 m/s²", "12 m/s²", "0.2 m/s²"], 0, "a = F ÷ m = 10 ÷ 2 = 5 m/s²."],
          ["A car moves at constant velocity. The resultant force is…", ["forward", "backward", "zero", "upward"], 2, "Constant velocity means balanced forces (Newton's first law)."],
          ["Forces of 15 N right and 5 N left act on a box. Resultant?", ["20 N right", "10 N right", "10 N left", "3 N right"], 1, "15 − 5 = 10 N to the right."],
          ["An astronaut goes from Earth to the Moon. Their mass…", ["decreases", "increases", "stays the same", "becomes zero"], 2, "Mass is the amount of matter; only weight changes."],
        ],
      ),
      topic(
        "phy-energy-work",
        "Work, energy and power",
        "Energy stores, work done, and how fast energy is transferred.",
        `
## Work done
**W = F × d** (joules = newtons × metres), where d is the distance moved **in the direction of the force**.

## Energy stores
- **Kinetic**: Eₖ = ½ m v²
- **Gravitational potential**: Eₚ = m g h
- Also elastic, chemical, thermal, nuclear, magnetic and electrostatic.

## Conservation of energy
Energy cannot be created or destroyed, only **transferred** between stores. A falling ball transfers gravitational potential energy to kinetic energy (ignoring air resistance).

## Power
**P = E ÷ t** (watts = joules ÷ seconds). Power is the **rate** of energy transfer. A 60 W bulb transfers 60 J every second.

### Worked example
A 2 kg book is lifted 1.5 m (g = 10 N/kg).
Eₚ = 2 × 10 × 1.5 = **30 J**. If that takes 3 s, power = 30 ÷ 3 = **10 W**.
`,
        [
          ["Work done", "Energy transferred when a force moves an object; W = F × d."],
          ["Kinetic energy", "Energy of a moving object; ½mv²."],
          ["Power", "The rate of energy transfer, measured in watts."],
          ["Conservation of energy", "Energy cannot be created or destroyed, only transferred."],
        ],
        [
          ["What is the unit of power?", "The watt (W), which is 1 joule per second."],
          ["Give the equation for kinetic energy.", "Eₖ = ½ m v²."],
          ["How much work is done pushing with 20 N over 5 m?", "100 J."],
          ["Give the equation for gravitational potential energy.", "Eₚ = m g h."],
        ],
        [
          ["A 4 kg object moves at 3 m/s. Its kinetic energy is…", ["6 J", "12 J", "18 J", "36 J"], 2, "½ × 4 × 3² = 2 × 9 = 18 J."],
          ["A motor transfers 1200 J in 60 s. Its power is…", ["20 W", "72 000 W", "1260 W", "0.05 W"], 0, "P = 1200 ÷ 60 = 20 W."],
          ["Lifting a 10 kg box 2 m (g = 10 N/kg) stores how much Eₚ?", ["20 J", "100 J", "200 J", "12 J"], 2, "Eₚ = 10 × 10 × 2 = 200 J."],
          ["When a ball falls, energy is mainly transferred from…", ["kinetic to potential", "gravitational potential to kinetic", "chemical to thermal", "kinetic to chemical"], 1, "Height is lost and speed is gained."],
        ],
      ),
    ]),
    unit("phy-waves", "Waves and electricity", [
      topic(
        "phy-wave-props",
        "Wave properties",
        "Transverse and longitudinal waves, and the wave equation.",
        `
## Waves transfer energy, not matter

## Two types
- **Transverse**: vibrations are **perpendicular** to the direction of travel (light, water ripples, all EM waves).
- **Longitudinal**: vibrations are **parallel** to the direction of travel, with compressions and rarefactions (sound).

## Describing a wave
- **Amplitude**: maximum displacement from the rest position.
- **Wavelength (λ)**: distance between two matching points, e.g. crest to crest (m).
- **Frequency (f)**: waves passing a point per second (Hz).
- **Period**: time for one wave; T = 1 ÷ f.

## The wave equation
**v = f × λ**
Example: frequency 50 Hz, wavelength 4 m → v = 50 × 4 = **200 m/s**.

## Wave behaviour
Waves can be **reflected**, **refracted** (change speed and direction entering a new medium) and **diffracted** (spread out through a gap).
`,
        [
          ["Transverse wave", "A wave whose vibrations are perpendicular to its direction of travel."],
          ["Longitudinal wave", "A wave whose vibrations are parallel to its direction of travel."],
          ["Frequency", "The number of waves passing a point each second, in hertz (Hz)."],
          ["Wavelength", "The distance between one point on a wave and the same point on the next wave."],
        ],
        [
          ["Give the wave equation.", "v = f × λ."],
          ["Is sound transverse or longitudinal?", "Longitudinal."],
          ["What is amplitude?", "The maximum displacement from the rest position."],
          ["What do waves transfer?", "Energy (not matter)."],
        ],
        [
          ["A wave has f = 10 Hz and λ = 3 m. Its speed is…", ["3.3 m/s", "13 m/s", "30 m/s", "0.3 m/s"], 2, "v = 10 × 3 = 30 m/s."],
          ["Which is a longitudinal wave?", ["Light", "Radio", "Sound", "Water ripple"], 2, "Sound travels as compressions and rarefactions."],
          ["The unit of frequency is…", ["metre", "hertz", "second", "joule"], 1, "Frequency is measured in hertz (waves per second)."],
          ["Bending of a wave as it enters a new medium is…", ["reflection", "refraction", "diffraction", "absorption"], 1, "Refraction is caused by a change in speed."],
        ],
      ),
      topic(
        "phy-light-sound",
        "Light, sound and the EM spectrum",
        "How light and sound behave, and the electromagnetic spectrum.",
        `
## Sound
- Needs a **medium**. It can't travel through a vacuum.
- Travels fastest in solids, slowest in gases (about 340 m/s in air).
- **Pitch** depends on frequency; **loudness** depends on amplitude.
- Human hearing: about **20 Hz – 20 000 Hz**. Above that is ultrasound.

## Light
- Travels at **3 × 10⁸ m/s** in a vacuum.
- **Reflection**: angle of incidence = angle of reflection.
- **Refraction**: light slows and bends **towards the normal** entering a denser medium (e.g. air → glass).

## The electromagnetic spectrum
In order of increasing frequency (decreasing wavelength):
**Radio → Microwaves → Infrared → Visible → Ultraviolet → X-rays → Gamma**
Memory hook: *Raging Martians Invaded Venus Using X-ray Guns.*
All travel at the same speed in a vacuum. Higher frequency means more energy and more danger to cells.
`,
        [
          ["Medium", "The material (solid, liquid or gas) a wave travels through."],
          ["Pitch", "How high or low a sound is; set by its frequency."],
          ["Normal", "An imaginary line at 90° to a surface, used to measure angles."],
          ["Electromagnetic spectrum", "The family of transverse waves from radio to gamma rays."],
        ],
        [
          ["Why can't sound travel through space?", "There is no medium (no particles) to carry the vibrations."],
          ["List the EM spectrum from lowest frequency.", "Radio, microwaves, infrared, visible, ultraviolet, X-rays, gamma."],
          ["What decides the loudness of a sound?", "Its amplitude."],
          ["Which way does light bend entering glass from air?", "Towards the normal."],
        ],
        [
          ["Which EM wave has the highest frequency?", ["Radio", "Visible light", "X-rays", "Gamma rays"], 3, "Gamma rays are at the high-frequency end."],
          ["Sound travels fastest through…", ["air", "water", "steel", "a vacuum"], 2, "Particles are closest together in solids."],
          ["A higher-pitched note has a higher…", ["amplitude", "frequency", "wavelength", "speed"], 1, "Pitch depends on frequency."],
          ["The angle of incidence is 35°. The angle of reflection is…", ["35°", "55°", "70°", "90°"], 0, "The law of reflection: i = r."],
        ],
      ),
      topic(
        "phy-circuits",
        "Electric circuits",
        "Current, voltage, resistance and series vs parallel circuits.",
        `
## Key quantities
| Quantity | Symbol | Unit | Measured with |
|---|---|---|---|
| Current | I | amp (A) | Ammeter, in **series** |
| Potential difference | V | volt (V) | Voltmeter, in **parallel** |
| Resistance | R | ohm (Ω) | V ÷ I |

## Ohm's law
**V = I × R**
Example: 12 V across a 4 Ω resistor → I = 12 ÷ 4 = **3 A**.

## Series circuits
- Current is the **same** everywhere.
- Voltage is **shared** between components.
- Total resistance **adds up**: R = R₁ + R₂.
- One bulb breaks → all go out.

## Parallel circuits
- Voltage across each branch is the **same** as the supply.
- Current **splits** between branches.
- One branch breaks → others keep working (this is how homes are wired).

## Electrical power
**P = V × I**. A 230 V kettle drawing 10 A uses 2300 W.
`,
        [
          ["Current", "The rate of flow of electric charge, in amps."],
          ["Potential difference", "The energy transferred per unit charge between two points, in volts."],
          ["Resistance", "How much a component opposes current, in ohms."],
          ["Parallel circuit", "A circuit with more than one path for current."],
        ],
        [
          ["State Ohm's law.", "V = I × R."],
          ["How is an ammeter connected?", "In series."],
          ["What happens to current in a series circuit?", "It is the same at every point."],
          ["Why are homes wired in parallel?", "Each appliance gets the full voltage and can be switched independently."],
        ],
        [
          ["A 6 Ω resistor has 2 A through it. The voltage is…", ["3 V", "8 V", "12 V", "4 V"], 2, "V = I × R = 2 × 6 = 12 V."],
          ["Two resistors of 3 Ω and 5 Ω are in series. Total resistance?", ["2 Ω", "8 Ω", "15 Ω", "1.9 Ω"], 1, "In series, resistances add: 3 + 5 = 8 Ω."],
          ["A voltmeter is connected…", ["in series", "in parallel", "either way", "only to the battery"], 1, "Voltmeters measure across a component, so they go in parallel."],
          ["In a parallel circuit, one bulb blows. The others…", ["go out", "stay lit", "get dimmer", "flicker"], 1, "The other branches still form complete circuits."],
        ],
      ),
    ]),
    unit("phy-energy", "Energy, heat and magnetism", [
      topic(
        "phy-efficiency",
        "Energy transfers and efficiency",
        "Useful and wasted energy, Sankey diagrams and efficiency.",
        `
## Useful and wasted energy
No device is 100% efficient. Some energy is always **dissipated**, usually as **thermal energy** to the surroundings.

## Efficiency
**efficiency = useful energy output ÷ total energy input** (× 100 for a percentage)
Example: a motor takes in 500 J and outputs 350 J of useful kinetic energy → 350 ÷ 500 = **70%**.

## Sankey diagrams
Arrows show energy flow. The **width** is proportional to the amount of energy. Useful output goes straight on; wasted energy bends away.

## Reducing waste
- **Lubrication** reduces friction.
- **Insulation** reduces heat loss (loft insulation, double glazing).
- Streamlining reduces air resistance.

## Energy resources
- **Renewable**: solar, wind, hydroelectric, tidal, geothermal, biofuel.
- **Non-renewable**: coal, oil, gas, nuclear. They will run out, and fossil fuels release CO₂.
`,
        [
          ["Efficiency", "The proportion of input energy that is usefully transferred."],
          ["Dissipated energy", "Energy spread out into the surroundings, usually as heat, that is no longer useful."],
          ["Sankey diagram", "A diagram where arrow width shows the amount of energy transferred."],
          ["Renewable resource", "An energy resource that is replenished naturally and won't run out."],
        ],
        [
          ["Give the equation for efficiency.", "Useful output ÷ total input (× 100 for %)."],
          ["What does the width of a Sankey arrow show?", "The amount of energy."],
          ["Name two ways to reduce wasted energy.", "Lubrication, insulation, streamlining."],
          ["Name three renewable energy resources.", "Solar, wind, hydroelectric (also tidal, geothermal, biofuel)."],
        ],
        [
          ["A bulb uses 100 J and gives 20 J of light. Efficiency?", ["20%", "80%", "5%", "120%"], 0, "20 ÷ 100 = 0.2 = 20%."],
          ["Which is non-renewable?", ["Wind", "Solar", "Natural gas", "Tidal"], 2, "Natural gas is a fossil fuel that will run out."],
          ["Wasted energy is most often transferred as…", ["light", "thermal energy", "chemical energy", "nuclear energy"], 1, "Most waste is heat dissipated to the surroundings."],
          ["A machine is 40% efficient with 600 J input. Useful output?", ["240 J", "360 J", "400 J", "1500 J"], 0, "0.4 × 600 = 240 J."],
        ],
      ),
      topic(
        "phy-thermal",
        "Thermal physics",
        "Conduction, convection, radiation and specific heat capacity.",
        `
## Three ways heat moves
- **Conduction**: through solids as particles vibrate and pass energy on. Metals are good conductors thanks to free electrons.
- **Convection**: in liquids and gases. Warm fluid expands, becomes **less dense** and rises; cooler fluid sinks, making a **convection current**.
- **Radiation**: **infrared** waves. Needs no medium, so it crosses space.

## Surfaces and radiation
**Dark, matt** surfaces are good absorbers and emitters. **Shiny, light** surfaces are poor ones: they reflect.

## Specific heat capacity
The energy needed to raise **1 kg** of a substance by **1 °C**.
**E = m × c × ΔT**
Water has a high c (4200 J/kg°C), so it heats up and cools down slowly.
Example: heating 2 kg of water by 10 °C → 2 × 4200 × 10 = **84 000 J**.

## Insulators
Air is a poor conductor. Trapping it (in foam, wool or double glazing) reduces heat loss.
`,
        [
          ["Conduction", "Heat transfer through a solid by particle vibrations (and free electrons in metals)."],
          ["Convection", "Heat transfer in a fluid by the movement of warmer, less dense fluid."],
          ["Radiation", "Heat transfer by infrared waves, which needs no medium."],
          ["Specific heat capacity", "Energy needed to raise the temperature of 1 kg of a substance by 1 °C."],
        ],
        [
          ["Which heat transfer can happen in a vacuum?", "Radiation."],
          ["Why does warm air rise?", "It expands, becomes less dense, and rises."],
          ["Give the equation for specific heat capacity.", "E = m × c × ΔT."],
          ["What surfaces are the best emitters of radiation?", "Dark, matt surfaces."],
        ],
        [
          ["Heat from the Sun reaches Earth by…", ["conduction", "convection", "radiation", "evaporation"], 2, "Space is a vacuum; only radiation can cross it."],
          ["Why are pans often made of metal?", ["Metals are good insulators", "Metals are good conductors", "Metals are dark", "Metals are light"], 1, "Metals conduct heat well to the food."],
          ["Energy to heat 1 kg of water by 5 °C (c = 4200 J/kg°C)?", ["840 J", "4200 J", "21 000 J", "8400 J"], 2, "1 × 4200 × 5 = 21 000 J."],
          ["Convection cannot happen in…", ["water", "air", "solids", "oil"], 2, "Particles in solids can't flow."],
        ],
      ),
      topic(
        "phy-magnetism",
        "Magnetism and electromagnetism",
        "Magnetic fields, electromagnets and the motor effect.",
        `
## Magnets
- Like poles **repel**; unlike poles **attract**.
- Field lines go from **north to south**; closer lines mean a stronger field.
- Magnetic materials: iron, steel, nickel and cobalt.

## Electromagnets
A current in a wire creates a magnetic field around it. Coiling the wire into a **solenoid** concentrates the field. To make an electromagnet stronger:
- Increase the **current**.
- Add **more turns** of wire.
- Add an **iron core**.
It can be switched off, unlike a permanent magnet. Uses: scrapyard cranes, door locks, relays, speakers.

## The motor effect
A current-carrying wire in a magnetic field feels a **force**. Fleming's **left-hand rule** gives the direction: **F**irst finger = **F**ield, se**C**ond finger = **C**urrent, thu**M**b = **M**otion.

## Electromagnetic induction
Moving a magnet in a coil **induces a voltage**. This is how generators work.
`,
        [
          ["Magnetic field", "The region around a magnet where magnetic materials feel a force."],
          ["Electromagnet", "A magnet made by passing current through a coil of wire, often around an iron core."],
          ["Solenoid", "A coil of wire that produces a magnetic field when current flows."],
          ["Motor effect", "A current-carrying wire in a magnetic field experiences a force."],
        ],
        [
          ["Give three ways to strengthen an electromagnet.", "More current, more turns, add an iron core."],
          ["Which direction do field lines point?", "From north to south."],
          ["What does the thumb show in Fleming's left-hand rule?", "The direction of motion (force)."],
          ["How does a generator produce electricity?", "By electromagnetic induction: moving a magnet relative to a coil induces a voltage."],
        ],
        [
          ["Two north poles are brought together. They…", ["attract", "repel", "do nothing", "become south poles"], 1, "Like poles repel."],
          ["Which would NOT strengthen an electromagnet?", ["More current", "More turns", "An iron core", "A plastic core"], 3, "Plastic isn't magnetic, so it doesn't concentrate the field."],
          ["Which metal is magnetic?", ["Copper", "Aluminium", "Iron", "Gold"], 2, "Iron, steel, nickel and cobalt are magnetic."],
          ["An electric motor relies on…", ["the motor effect", "refraction", "convection", "sublimation"], 0, "A force on a current-carrying coil in a magnetic field makes it turn."],
        ],
      ),
    ]),
  ],
};
