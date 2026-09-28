import { Subject, topic, unit } from "./types";

export const history: Subject = {
  slug: "history",
  name: "History",
  group: "Individuals & Societies",
  description: "The world wars, the interwar years, the Cold War and Indian independence.",
  icon: "landmark",
  theme: { gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 45%, #78350F 100%)", accent: "#FCD34D" },
  units: [
    unit("his-ww1", "The First World War", [
      topic(
        "his-ww1-causes",
        "Causes of WW1",
        "The long-term MAIN causes, and the short-term trigger in Sarajevo.",
        `
## Long-term causes: MAIN
- **Militarism**: an arms race, especially the Anglo-German naval race (Dreadnoughts), and detailed war plans such as Germany's **Schlieffen Plan**.
- **Alliances**: Europe split into the **Triple Alliance** (Germany, Austria-Hungary, Italy) and the **Triple Entente** (Britain, France, Russia). A local conflict could drag everyone in.
- **Imperialism**: rivalry for colonies and markets, e.g. the Moroccan Crises (1905, 1911).
- **Nationalism**: pride and rivalry between nations; Slav nationalism in the Balkans threatened Austria-Hungary.

## The trigger
On **28 June 1914**, Archduke **Franz Ferdinand**, heir to Austria-Hungary, was assassinated in **Sarajevo** by **Gavrilo Princip**, a Bosnian Serb linked to the Black Hand.

## The July Crisis
Austria-Hungary, backed by Germany's "blank cheque", declared war on Serbia. Russia mobilised to support Serbia; Germany declared war on Russia and France, then invaded **Belgium**. Britain declared war on **4 August 1914** to defend Belgian neutrality.

> Exam tip: "How far" questions need a judgement. Weigh long-term causes against the trigger, and explain links between them.
`,
        [
          ["Militarism", "A belief in building strong armed forces and being ready to use them."],
          ["Alliance", "An agreement between countries to support each other, often in war."],
          ["Schlieffen Plan", "Germany's plan to defeat France quickly through Belgium before turning to Russia."],
          ["Nationalism", "Strong pride in, and loyalty to, one's nation, sometimes at the expense of others."],
        ],
        [
          ["What does MAIN stand for?", "Militarism, Alliances, Imperialism, Nationalism."],
          ["Who was assassinated on 28 June 1914?", "Archduke Franz Ferdinand of Austria-Hungary."],
          ["Which countries formed the Triple Entente?", "Britain, France and Russia."],
          ["Why did Britain enter the war?", "Germany invaded neutral Belgium, which Britain had promised to protect."],
        ],
        [
          ["Where was Franz Ferdinand assassinated?", ["Vienna", "Sarajevo", "Belgrade", "Berlin"], 1, "He was shot in Sarajevo, Bosnia, on 28 June 1914."],
          ["Which country was NOT in the Triple Alliance?", ["Germany", "Austria-Hungary", "Italy", "Russia"], 3, "Russia was part of the Triple Entente."],
          ["The Anglo-German naval race is an example of…", ["imperialism", "militarism", "nationalism", "appeasement"], 1, "Building up armed forces is militarism."],
          ["What did Germany's invasion of Belgium lead to?", ["Italy joining Germany", "Britain declaring war", "Russia surrendering", "The USA entering the war"], 1, "Britain had guaranteed Belgian neutrality (Treaty of London, 1839)."],
        ],
      ),
      topic(
        "his-trenches",
        "Trench warfare and the Western Front",
        "Why the war became a stalemate, and life in the trenches.",
        `
## Why stalemate?
After the Schlieffen Plan failed at the **Battle of the Marne** (September 1914), both sides dug in. A line of trenches soon stretched from the Channel coast to Switzerland.
**Defence was stronger than attack**: machine guns, barbed wire and artillery made crossing **no man's land** deadly.

## Life in the trenches
- Mud, rats, lice and **trench foot**.
- Boredom punctuated by terror: shelling and raids.
- **Shell shock**: psychological trauma from constant bombardment.

## New weapons
| Weapon | Impact |
|---|---|
| Machine gun | Devastating against infantry attacks |
| Poison gas | First used on a large scale at Ypres in 1915; caused terror, but masks limited its effect |
| Tanks | First used at the Somme in 1916; unreliable at first |
| Aircraft | Reconnaissance, later dogfights and bombing |

## The Battle of the Somme (1916)
Launched to relieve pressure on the French at **Verdun**. The first day, **1 July 1916**, saw about **57,000 British casualties**. By November, over a million men on both sides were killed or wounded for small gains.
`,
        [
          ["Stalemate", "A situation where neither side can win or make progress."],
          ["No man's land", "The ground between opposing trenches."],
          ["Shell shock", "Psychological trauma suffered by soldiers from constant bombardment."],
          ["Attrition", "Wearing down the enemy through continuous losses."],
        ],
        [
          ["Why did the Western Front become a stalemate?", "Defensive weapons such as machine guns and barbed wire made attacks very costly."],
          ["When were tanks first used?", "At the Battle of the Somme, 1916."],
          ["About how many British casualties were there on the first day of the Somme?", "About 57,000."],
          ["What battle stopped the Schlieffen Plan?", "The First Battle of the Marne, September 1914."],
        ],
        [
          ["Which gave defenders the biggest advantage?", ["Cavalry", "Machine guns", "Tanks", "Aircraft"], 1, "Machine guns made frontal attacks devastating."],
          ["The Battle of the Somme was partly launched to…", ["capture Berlin", "relieve pressure on the French at Verdun", "test poison gas", "defend Belgium"], 1, "The French were under huge pressure at Verdun."],
          ["The area between the trenches was called…", ["the Front Line", "no man's land", "the Rhineland", "the Salient"], 1, "No man's land separated the two sides."],
          ["A war of attrition aims to…", ["win one decisive battle", "wear the enemy down through losses", "avoid all fighting", "negotiate peace"], 1, "Attrition means grinding down the enemy."],
        ],
      ),
      topic(
        "his-versailles",
        "The Treaty of Versailles",
        "The peace settlement of 1919 and why Germans resented it.",
        `
## The Big Three
- **Clemenceau** (France): wanted revenge and security, and to cripple Germany.
- **Lloyd George** (Britain): wanted Germany punished, but strong enough to trade with.
- **Woodrow Wilson** (USA): wanted a fair peace based on his **Fourteen Points** and a League of Nations.

## The terms: remember LAMB
- **L**and: Alsace-Lorraine returned to France; Germany lost about 13% of its European territory and all its colonies.
- **A**rmy: limited to **100,000** men; no air force, no submarines, 6 battleships; the **Rhineland demilitarised**.
- **M**oney: **reparations**, set in 1921 at **£6.6 billion**.
- **B**lame: **Article 231**, the War Guilt Clause.

Anschluss (union) with Austria was also forbidden.

## German reaction
Germans called it a **Diktat**, a dictated peace, because they had no say. Many blamed the new Weimar politicians (the "November Criminals"), which weakened democracy and later helped Hitler.

## Was it fair?
Arguments exist both ways: harsh compared with Wilson's aims, yet milder than the treaty Germany imposed on Russia at **Brest-Litovsk** (1918).
`,
        [
          ["Reparations", "Compensation paid by a defeated country for war damage."],
          ["War Guilt Clause", "Article 231 of the Treaty, making Germany accept blame for the war."],
          ["Diktat", "German term for the treaty as a dictated, imposed peace."],
          ["Demilitarised zone", "An area where no military forces are allowed, such as the Rhineland."],
        ],
        [
          ["Who were the Big Three?", "Clemenceau (France), Lloyd George (Britain), Wilson (USA)."],
          ["What does LAMB stand for?", "Land, Army, Money, Blame."],
          ["How large could the German army be?", "100,000 men."],
          ["Why did Germans call the treaty a Diktat?", "They had no say in its terms; it was imposed on them."],
        ],
        [
          ["Which region was returned to France?", ["The Rhineland", "Alsace-Lorraine", "The Saar", "Danzig"], 1, "Alsace-Lorraine went back to France."],
          ["Which leader wanted the harshest treatment of Germany?", ["Wilson", "Lloyd George", "Clemenceau", "Orlando"], 2, "France had suffered most and Clemenceau wanted security and revenge."],
          ["Article 231 is known as…", ["the Fourteen Points", "the War Guilt Clause", "the Anschluss", "the Dawes Plan"], 1, "It forced Germany to accept responsibility for the war."],
          ["What was the limit on the German army?", ["10,000", "50,000", "100,000", "500,000"], 2, "The army was capped at 100,000 men."],
        ],
      ),
    ]),
    unit("his-interwar", "Interwar years and WW2", [
      topic(
        "his-depression",
        "The Great Depression",
        "The Wall Street Crash and its global impact.",
        `
## Causes of the Wall Street Crash (1929)
- **Overproduction**: factories and farms produced more than people could buy.
- **Speculation**: people bought shares on credit ("buying on the margin"), expecting prices to keep rising.
- **Unequal wealth**: many Americans couldn't afford consumer goods.
- **Weak banks**: thousands of small, unregulated banks.

On **Black Tuesday (29 October 1929)** share prices collapsed. Investors were ruined, and banks failed.

## Impact in the USA
Unemployment reached about **25%** by 1933. Homeless camps were called **"Hoovervilles"**, mocking President Hoover. From 1933, **Franklin D. Roosevelt's New Deal** used government spending on public works and relief.

## Global impact
- The US **recalled loans** to Europe, especially Germany (Dawes Plan money).
- World trade collapsed as countries raised **tariffs** (protectionism).
- In **Germany**, unemployment reached about **6 million** by 1932. Desperate voters turned to extremes: the **Nazis** and Communists.
`,
        [
          ["Speculation", "Buying shares hoping to sell at a higher price for a quick profit."],
          ["Depression", "A long, severe economic downturn with high unemployment."],
          ["New Deal", "Roosevelt's programme of government action to tackle the Depression."],
          ["Protectionism", "Using tariffs to protect domestic industries from foreign competition."],
        ],
        [
          ["When was Black Tuesday?", "29 October 1929."],
          ["What were Hoovervilles?", "Shanty towns of homeless people, named after President Hoover."],
          ["How did the Crash affect Germany?", "US loans were recalled; unemployment soared to about 6 million by 1932."],
          ["What was the New Deal?", "FDR's government programmes of relief, recovery and reform."],
        ],
        [
          ["Buying shares on credit was called…", ["buying on the margin", "reparations", "protectionism", "the New Deal"], 0, "Investors borrowed to buy shares, expecting profits."],
          ["Which US president introduced the New Deal?", ["Hoover", "Wilson", "Roosevelt", "Truman"], 2, "Franklin D. Roosevelt, from 1933."],
          ["Why did the Depression hit Germany especially hard?", ["It had no industry", "It depended on American loans", "It was at war", "It used the gold standard only"], 1, "American loans (Dawes Plan) were recalled."],
          ["Raising tariffs to protect home industry is…", ["free trade", "protectionism", "speculation", "appeasement"], 1, "Protectionism reduced world trade further."],
        ],
      ),
      topic(
        "his-nazi-germany",
        "The rise of Nazi Germany",
        "How Hitler moved from the fringe to dictatorship, 1923–1934.",
        `
## Weimar weaknesses
- **Proportional representation** led to many parties and weak coalitions.
- **Article 48** let the president rule by decree in an emergency.
- The "stab in the back" myth, and resentment of Versailles.
- **Hyperinflation (1923)** wiped out savings.

## Early Nazi years
The **Munich Putsch** (1923) failed. In prison Hitler wrote **Mein Kampf** and decided to win power legally, through elections.

## Why support grew after 1929
- The **Depression**: mass unemployment and fear of communism.
- **Propaganda** by Goebbels; Hitler's speeches.
- The **SA** (stormtroopers) projected strength.
- Promises of "work and bread" and restoring national pride.

## From chancellor to Führer
| Date | Event |
|---|---|
| Jan 1933 | Hitler appointed **Chancellor** |
| Feb 1933 | **Reichstag Fire**, blamed on communists |
| Mar 1933 | **Enabling Act**: Hitler can pass laws without the Reichstag |
| Jun 1934 | **Night of the Long Knives**: SA leaders purged |
| Aug 1934 | Hindenburg dies; Hitler becomes **Führer** |
`,
        [
          ["Hyperinflation", "Extremely rapid price rises that make money almost worthless."],
          ["Enabling Act", "The 1933 law allowing Hitler to make laws without the Reichstag."],
          ["Propaganda", "Biased information spread to influence opinion."],
          ["Führer", "'Leader': Hitler's title after combining chancellor and president in 1934."],
        ],
        [
          ["When was Hitler appointed Chancellor?", "January 1933."],
          ["What did the Enabling Act do?", "Let Hitler pass laws without the Reichstag, effectively making him a dictator."],
          ["What was the Night of the Long Knives?", "The June 1934 purge of SA leaders, including Ernst Röhm."],
          ["Why did the Depression help the Nazis?", "Mass unemployment and fear made voters turn to extreme parties."],
        ],
        [
          ["Which event did the Nazis use to blame communists in 1933?", ["The Munich Putsch", "The Reichstag Fire", "Kristallnacht", "The Anschluss"], 1, "The Reichstag Fire in February 1933 was blamed on a communist."],
          ["Article 48 of the Weimar Constitution allowed…", ["rule by decree in emergencies", "a ban on political parties", "Germany to rearm", "the Kaiser to return"], 0, "It gave the president emergency powers."],
          ["After the failed Munich Putsch, Hitler decided to…", ["flee Germany", "gain power through elections", "join the communists", "give up politics"], 1, "He chose a legal route to power."],
          ["Hitler became Führer after the death of…", ["Stresemann", "Hindenburg", "Röhm", "Ebert"], 1, "President Hindenburg died in August 1934."],
        ],
      ),
      topic(
        "his-ww2-causes",
        "Causes of WW2",
        "Hitler's aims, the League's failures and appeasement, 1933–1939.",
        `
## Hitler's aims
- Overturn the **Treaty of Versailles**.
- Unite all German speakers (**Grossdeutschland**).
- Gain **Lebensraum** (living space) in the east.
- Destroy communism.

## Failures of the League of Nations
**Manchuria (1931)** and **Abyssinia (1935)** showed that aggressors would face little resistance. The League had no army, and key powers (such as the USA) weren't members.

## Steps to war
| Year | Event |
|---|---|
| 1935 | Rearmament and conscription announced openly |
| 1936 | **Remilitarisation of the Rhineland** |
| 1938 | **Anschluss**: union with Austria |
| 1938 | **Munich Agreement**: the Sudetenland given to Germany |
| 1939 | Rest of Czechoslovakia invaded (March) |
| 1939 | **Nazi-Soviet Pact** (August) |
| 1939 | **Invasion of Poland**, 1 September; Britain and France declare war, 3 September |

## Appeasement
Chamberlain's policy of giving Hitler what he wanted to avoid war. **Supporters** say Britain needed time to rearm, and memories of WW1 were fresh. **Critics** say it encouraged Hitler and abandoned Czechoslovakia.
`,
        [
          ["Appeasement", "Giving in to an aggressor's demands to avoid conflict."],
          ["Lebensraum", "'Living space': Hitler's aim to expand Germany eastwards."],
          ["Anschluss", "The 1938 union of Germany and Austria."],
          ["Nazi-Soviet Pact", "The August 1939 non-aggression agreement between Germany and the USSR."],
        ],
        [
          ["What was the Munich Agreement?", "The September 1938 deal giving the Sudetenland to Germany."],
          ["When did Germany invade Poland?", "1 September 1939."],
          ["Give one argument for appeasement.", "It bought Britain time to rearm; public opinion opposed another war."],
          ["Why was the Nazi-Soviet Pact important?", "It meant Germany could invade Poland without fighting the USSR."],
        ],
        [
          ["Which event happened first?", ["Anschluss", "Remilitarisation of the Rhineland", "Munich Agreement", "Invasion of Poland"], 1, "The Rhineland was remilitarised in March 1936."],
          ["The British PM associated with appeasement is…", ["Churchill", "Chamberlain", "Lloyd George", "Attlee"], 1, "Neville Chamberlain signed the Munich Agreement."],
          ["Lebensraum meant…", ["peace in our time", "living space in the east", "union with Austria", "war guilt"], 1, "Hitler sought territory in Eastern Europe."],
          ["What directly caused Britain to declare war in 1939?", ["The Anschluss", "The invasion of Poland", "The Munich Agreement", "The Reichstag Fire"], 1, "Britain had guaranteed Poland's independence."],
        ],
      ),
    ]),
    unit("his-c20", "Sources and the twentieth century", [
      topic(
        "his-sources",
        "Source analysis (OPVL)",
        "Evaluating the origin, purpose, value and limitations of sources.",
        `
## Primary vs secondary
- **Primary**: created at the time (letters, photos, speeches, diaries).
- **Secondary**: created later, by people interpreting the past (textbooks, historians).
Neither is automatically more reliable.

## OPVL
- **O**rigin: who made it, when, where, and what type of source is it?
- **P**urpose: why was it made? For whom?
- **V**alue: what can it tell a historian, *because of* its origin and purpose?
- **L**imitation: what are the limits, *because of* its origin and purpose?

## Linking is the key skill
Weak: *It is biased.*
Strong: *As a Nazi propaganda poster, its purpose was to glorify Hitler, so it's valuable for showing how the regime wanted to be seen, but limited as evidence of what Germans actually believed.*

## Cartoons and photos
- Identify symbols, labels and exaggeration.
- Ask what message the cartoonist wants the audience to take away.
- Photos can be staged, cropped or censored.

> A biased source is still **useful**: it reveals attitudes and propaganda.
`,
        [
          ["Primary source", "A source created at the time of the events it describes."],
          ["Secondary source", "A later interpretation of past events."],
          ["Bias", "A one-sided view that favours a particular perspective."],
          ["Provenance", "The origin of a source: who created it, when and why."],
        ],
        [
          ["What does OPVL stand for?", "Origin, Purpose, Value, Limitation."],
          ["Can a biased source be useful?", "Yes. It reveals attitudes, beliefs or propaganda of the time."],
          ["Give an example of a primary source.", "A soldier's diary from 1916."],
          ["What should value and limitation be linked to?", "The source's origin and purpose."],
        ],
        [
          ["A history textbook written in 2015 about WW1 is…", ["primary", "secondary", "both", "neither"], 1, "It was created long after the events."],
          ["In OPVL, 'Purpose' asks…", ["who made it", "why it was made", "when it was made", "what it's worth"], 1, "Purpose is the reason and audience of the source."],
          ["Why might a WW1 recruitment poster be limited?", ["It is too old", "It was designed to persuade, so it may exaggerate", "It is secondary", "It has no pictures"], 1, "Its persuasive purpose affects reliability."],
          ["The best evaluation of a source…", ["just says it's biased", "links value and limits to origin and purpose", "describes the picture", "gives the date only"], 1, "Evaluation must be linked to provenance."],
        ],
      ),
      topic(
        "his-cold-war",
        "Origins of the Cold War",
        "How wartime allies became rivals, 1945–1949.",
        `
## Two ideologies
- **USA (capitalism)**: democracy, free elections, private business.
- **USSR (communism)**: a one-party state, state control of the economy.

## From allies to enemies
| Date | Event |
|---|---|
| Feb 1945 | **Yalta Conference**: free elections promised in Eastern Europe; Germany to be divided |
| Jul 1945 | **Potsdam Conference**: tensions rise; Truman has replaced Roosevelt |
| Aug 1945 | US atomic bombs on Hiroshima and Nagasaki |
| Mar 1946 | Churchill's **"Iron Curtain" speech** |
| Mar 1947 | **Truman Doctrine**: the US will contain communism |
| 1947–48 | **Marshall Plan**: US aid to rebuild Europe |
| 1948–49 | **Berlin Blockade** and **Airlift** |
| 1949 | **NATO** formed |

## Who was to blame?
- **Traditional view**: Soviet expansion in Eastern Europe.
- **Revisionist view**: American economic power and aggression.
- **Post-revisionist**: mutual suspicion and misunderstanding.
`,
        [
          ["Containment", "US policy of stopping the spread of communism."],
          ["Iron Curtain", "Churchill's term for the division between communist Eastern and democratic Western Europe."],
          ["Marshall Plan", "US economic aid programme to rebuild Europe after WW2."],
          ["Ideology", "A set of political and economic beliefs."],
        ],
        [
          ["What was the Truman Doctrine?", "A 1947 US commitment to help countries resist communism (containment)."],
          ["What was the Berlin Blockade?", "The 1948–49 Soviet blocking of land routes to West Berlin, beaten by the Airlift."],
          ["Who gave the 'Iron Curtain' speech?", "Winston Churchill, March 1946."],
          ["What did Yalta promise for Eastern Europe?", "Free elections."],
        ],
        [
          ["Which came first?", ["NATO", "Berlin Blockade", "Yalta Conference", "Marshall Plan"], 2, "Yalta took place in February 1945."],
          ["The Marshall Plan provided…", ["military bases", "economic aid to Europe", "atomic weapons", "a new constitution for Germany"], 1, "Billions of dollars to rebuild Europe."],
          ["The West responded to the Berlin Blockade with…", ["an invasion", "the Berlin Airlift", "the Berlin Wall", "sanctions only"], 1, "Supplies were flown in for about 11 months."],
          ["A revisionist historian would blame…", ["the USSR", "the USA", "Germany", "no one"], 1, "Revisionists emphasise American actions."],
        ],
      ),
      topic(
        "his-india",
        "The Indian independence movement",
        "From the INC to independence and Partition, 1885–1947.",
        `
## Key organisations
- **Indian National Congress (INC)**, founded **1885**, grew from a moderate elite group into a mass movement.
- **All-India Muslim League** (1906), later led by **Muhammad Ali Jinnah**.

## Turning points
| Year | Event |
|---|---|
| 1919 | **Jallianwala Bagh massacre**, Amritsar: troops under General Dyer fire on an unarmed crowd |
| 1920–22 | **Non-Cooperation Movement**: boycotts of British goods and institutions; called off after the violence at **Chauri Chaura** |
| 1930 | **Salt March** to Dandi: Gandhi defies the salt tax |
| 1942 | **Quit India Movement**: mass protest; Congress leaders jailed |
| 1947 | **Independence** on 15 August, and **Partition** into India and Pakistan |

## Gandhi's methods
**Satyagraha**: non-violent resistance and civil disobedience. It gained mass participation and international sympathy.

## Why did Britain leave?
- Nationalist pressure, and mass movements.
- Britain was economically exhausted after WW2.
- A new Labour government (Attlee) supported independence.
- Growing unrest, including the 1946 Royal Indian Navy mutiny.

## Partition
Hurried borders drawn by Radcliffe led to mass migration of an estimated 10–20 million people, and communal violence that killed hundreds of thousands.
`,
        [
          ["Satyagraha", "Gandhi's philosophy of non-violent resistance ('truth force')."],
          ["Civil disobedience", "Deliberately and peacefully breaking unjust laws."],
          ["Partition", "The 1947 division of British India into India and Pakistan."],
          ["Swaraj", "Self-rule or independence."],
        ],
        [
          ["When was the INC founded?", "1885."],
          ["What happened at Jallianwala Bagh in 1919?", "British troops under General Dyer fired on an unarmed crowd in Amritsar."],
          ["What was the Salt March?", "Gandhi's 1930 march to Dandi to break the British salt tax, as civil disobedience."],
          ["When did India gain independence?", "15 August 1947."],
        ],
        [
          ["Why did Gandhi call off the Non-Cooperation Movement?", ["Britain granted independence", "Violence at Chauri Chaura", "WW2 began", "He was elected PM"], 1, "The 1922 violence at Chauri Chaura broke his non-violence principle."],
          ["The Quit India Movement began in…", ["1919", "1930", "1942", "1947"], 2, "It was launched in August 1942."],
          ["Who led the Muslim League in the 1940s?", ["Nehru", "Jinnah", "Patel", "Bose"], 1, "Muhammad Ali Jinnah led the League and became Pakistan's first Governor-General."],
          ["Satyagraha means…", ["armed struggle", "non-violent resistance", "economic boycott only", "self-government"], 1, "It is non-violent resistance based on truth."],
        ],
      ),
    ]),
  ],
};
