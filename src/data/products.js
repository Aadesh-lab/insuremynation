/**
 * Per-product content for the six insurance pages. Every string, image and
 * background position here is taken verbatim from the design handoff.
 *
 * `navVariant` follows the hero artwork: pages with a bright hero keep the navy
 * nav, pages with a darkened hero switch to white.
 * `heroScrim` is the extra darkening layer some heroes carry beneath the shared
 * top-to-bottom wash.
 */

const SCRIM =
  'linear-gradient(180deg, rgba(0,13,40,0.55) 0%, rgba(0,13,40,0.12) 38%, rgba(0,13,40,0.68) 100%)';

const COMMON_FIELDS = [
  { key: 'first', label: 'First name', placeholder: 'Nehal' },
  { key: 'last', label: 'Last name', placeholder: 'Kumar' },
  { key: 'email', label: 'Email', placeholder: 'you@example.com' },
  { key: 'phone', label: 'Contact no.', placeholder: '+91 00000 00000' },
  { key: 'city', label: 'City', placeholder: 'New Delhi' },
];

export const PRODUCTS = {
  health: {
    id: 'health',
    slug: '/health-insurance',
    navVariant: 'blue',
    eyebrow: '[ health insurance ]',
    hero: {
      image: '/assets/health-hero.webp',
      position: 'center',
      scrim: null,
      title: ['Health Cover', 'Built Around You'],
      sub: 'No one plans to fall sick or get injured - but at some point we all need health care. A good policy makes those costs manageable, and keeps you well in between.',
    },
    why: {
      heading: ['Why Health', 'Insurance Is', 'Important'],
      paragraphs: [
        'When you buy a good health insurance policy you start reaping the benefits immediately. It makes treatment less expensive - particularly when you are travelling abroad - and helps you stay healthy through free health screenings, preventive care and chronic disease management.',
        'Health insurance makes sure that expensive, long-term medical treatment and hospitalisation does not put an individual or a family into an irrecoverable financial situation. It is critical protection against serious injury, emergency medical attention and the rising cost of treatments like cancer care and organ transplants.',
        'We recommend a plan only after a proper analysis of your needs - so the cover you buy is the cover you will actually use.',
      ],
    },
    perks: [
      {
        title: 'Quick & Easy Processing',
        sub: 'Customised quotes and online issuance, so buying takes minutes',
      },
      {
        title: 'Affordable Customisations',
        sub: 'Personalise a plan that protects your family the way you want',
      },
      {
        title: 'Compare & Decide',
        sub: 'Policy detail at your fingertips - calculate, compare, choose',
      },
      {
        title: 'Cover Instantly',
        sub: 'Your insurer starts protecting you the moment the policy activates',
      },
    ],
    coverArt: {
      image: '/assets/health-cover.webp',
      position: 'center center',
      width: 641,
      aspectRatio: '760/894',
      height: 1042,
      alignSelf: 'flex-start',
    },
    cover: {
      heading: ["Cover That's Got", 'Your Back'],
      intro:
        'Recent times have taught us the importance of good health insurance. If you have a condition that standard Mediclaim will not cover, we build a personalised plan that comes to your use when it matters most.',
      items: [
        'Meet skyrocketing healthcare costs with high-value insurance',
        'Build a custom health plan that covers a wide range of illnesses',
        'Cover hospitalisation and medical treatment in other countries',
        'Comprehensive cover - childbirth to organ transplant, cancer to OPD',
        'Modify or switch your policy, change premium, add or remove members anytime',
        'Get access to super-specialty hospitals',
        'Tax benefits under Section 80D of the Income Tax Act, 1961',
        'Cashless treatment across network and multi-specialty hospitals',
        'Lifetime renewability with no restriction on age limit',
        'A relationship manager who stays with you through renewals and claims',
      ],
    },
    fields: [
      ...COMMON_FIELDS,
      { key: 'members', label: 'Members to cover', placeholder: 'Self + spouse + 1 child' },
    ],
  },

  life: {
    id: 'life',
    slug: '/life-insurance',
    navVariant: 'white',
    eyebrow: '[ life insurance ]',
    hero: {
      image: '/assets/life-hero.webp',
      position: 'center 35%',
      scrim: SCRIM,
      title: ['Life Cover', 'For Your Dependents'],
      sub: 'The point of a life policy is plain: financial stability for your family and dependents when you are not around. We size it against your liabilities, not a slab.',
    },
    why: {
      heading: ['Why Life', 'Insurance Is', 'Important'],
      paragraphs: [
        'InsureNation offers end-to-end, need-based life insurance to the HNI segment. The idea behind buying a policy is to provide financial stability to your family and dependents when you are not around.',
        'For HNI clients we also place hybrid products that combine life cover with investment - larger ticket sizes and a different cost structure to a regular unit-linked plan.',
        'We write plans for millennials, young couples, entrepreneurs and senior professionals. A life policy does not only compensate your family for lost income - it clears the loans and liabilities you leave behind.',
      ],
    },
    perks: [
      {
        title: 'Quick & Easy Processing',
        sub: 'Customised quotes and online issuance, so buying takes minutes',
      },
      {
        title: 'Affordable Customisations',
        sub: 'Personalise a plan that protects your loved ones the way you want',
      },
      {
        title: 'Compare & Decide',
        sub: 'Policy detail at your fingertips - calculate, compare, choose',
      },
      {
        title: 'Cover Instantly',
        sub: "Your insurer starts protecting your family's future the moment it activates",
      },
    ],
    coverArt: {
      image: '/assets/life-cover.webp',
      position: 'center center',
      width: 600,
      aspectRatio: '4/5',
      height: 987,
      alignSelf: 'flex-start',
    },
    cover: {
      heading: ['Protection That', 'Also Invests'],
      intro:
        'Life cover is an essential risk-minimisation tool regardless of how stable your income and wealth are - and it opens up investment prospects, retirement included.',
      items: [
        'Build a custom life cover around your actual financial goals',
        'Protect your wealth and the lifestyle it pays for',
        'Buying term cover early locks a lower premium for the whole term',
        'Life insurance payouts are tax-free in the hands of your family',
        'One umbrella that covers every dependent in the household',
        'Reduce tax liability under Section 80C of the Income Tax Act, 1961',
        'Take a policy loan against your sum assured when you need liquidity',
        'Switch funds and redirect premiums through the term',
        'Single-premium option if you would rather pay once and be done',
        'A relationship manager who revisits the cover as your life changes',
      ],
    },
    fields: [
      ...COMMON_FIELDS,
      { key: 'cover', label: 'Cover in mind', placeholder: 'Rs 2 crore term' },
    ],
  },

  car: {
    id: 'car',
    slug: '/car-insurance',
    navVariant: 'white',
    eyebrow: '[ car insurance ]',
    hero: {
      image: '/assets/car-hero.webp',
      position: 'center 60%',
      scrim: SCRIM,
      title: ['Cover For Cars', 'Worth Protecting'],
      sub: 'Luxury and exotic cars cost more to repair, take longer to replace and attract thieves. The cover should be built around what the car is actually worth.',
    },
    why: {
      heading: ['Why Car', 'Insurance Is', 'Important'],
      paragraphs: [
        'Car insurance protects your four-wheeler against unexpected and unavoidable repair costs. Luxury cars are built expensively - damage to their parts means high replacement costs, and they are more susceptible to theft.',
        'Exotic and luxury car policies are not readily available off the shelf. InsureNation recommends and customises a plan suited to a high-value car: compare quotes, calculate IDV and tune the cover with add-ons that matter.',
        'With comprehensive cover in place the asset is completely protected - and the policy is genuinely useful on the day something goes wrong.',
      ],
    },
    perks: [
      {
        title: 'Quick & Easy Processing',
        sub: 'Customised quotes and online issuance, so buying takes minutes',
      },
      {
        title: 'Compare & Decide',
        sub: 'Calculate IDV, compare quotes and choose with the detail in front of you',
      },
      {
        title: 'Affordable Customisations',
        sub: 'Personalise a plan that protects your four-wheeler the way you want',
      },
      {
        title: 'Cover Instantly',
        sub: 'Your insurer starts protecting the vehicle the moment the policy activates',
      },
    ],
    coverArt: {
      image: '/assets/car-cover.webp',
      position: 'center center',
      width: 600,
      aspectRatio: '4/5',
      height: 1014,
      alignSelf: 'flex-start',
    },
    cover: {
      heading: ['Drive With', 'Confidence'],
      intro:
        'Whether you own one car or a fleet, each vehicle is a significant investment of money and time. The right policy meets your legal obligations and takes the risk out of driving something expensive.',
      items: [
        'Complete cover for damage to the car, the driver and third parties',
        'Financial protection in case of accident, collision or theft',
        'Roadside assistance, zero depreciation and overnight service',
        'Cashless service and free replacements at tied-up workshops',
        'Switch plans, upgrade IDV and add covers at renewal',
        'Engine and gearbox protection for high-value drivetrains',
        'Key and lock replacement, smart keys included',
        'Consumables cover, so oils and filters are not deducted from the claim',
        'Return-to-invoice, so a total loss pays the invoice value',
        'No-claim bonus protection that survives one claim',
      ],
    },
    fields: [
      ...COMMON_FIELDS,
      { key: 'vehicle', label: 'Car make & model', placeholder: 'Range Rover Sport' },
    ],
  },

  bike: {
    id: 'bike',
    slug: '/bike-insurance',
    navVariant: 'white',
    eyebrow: '[ bike insurance ]',
    hero: {
      image: '/assets/bike-hero.webp',
      position: 'center',
      scrim: SCRIM,
      title: ['Superbike Cover', 'Built For The Machine'],
      sub: 'Sports bikes are engineered to perform and priced accordingly. A standard two-wheeler policy is rarely enough - we put together cover that matches the bike.',
    },
    why: {
      heading: ['Why Bike', 'Insurance Is', 'Important'],
      paragraphs: [
        'Sports bikes and superbikes are not normal motorcycles. From the engine to the body panels to agility and maintenance, they are designed to perform at greater speed - so they need more comprehensive cover than an average scooter.',
        'Any theft or damage to these bikes costs a substantial amount to repair and replace. Standard two-wheeler policies protect owners against basic damage; for a superbike that is not enough.',
        'The very things that make these bikes attractive - speed, aesthetics, price - are why the cover has to be bespoke. We recommend customised policies with the add-ons that genuinely apply to how you ride.',
      ],
    },
    perks: [
      {
        title: 'Quick & Easy Processing',
        sub: 'Customised quotes and online issuance, so buying takes minutes',
      },
      {
        title: 'Affordable Customisations',
        sub: 'Personalise a plan that protects your two-wheeler the way you want',
      },
      {
        title: 'Compare & Decide',
        sub: 'Policy detail at your fingertips - calculate, compare, choose',
      },
      {
        title: 'Cover Instantly',
        sub: 'Your insurer starts protecting the bike the moment the policy activates',
      },
    ],
    coverArt: {
      image: '/assets/bike-cover.webp',
      position: '27% center',
      width: 600,
      aspectRatio: '3/2',
      height: 959,
      alignSelf: 'flex-start',
    },
    cover: {
      heading: ['An End-To-End', 'Shield'],
      intro:
        'Superbikes are expensive, so the cover has to run end to end. You can raise the level of protection with add-ons chosen for how, and where, the bike is actually ridden.',
      items: [
        'Zero depreciation, so parts are settled at full value',
        'Accessories cover for exhausts, crash guards and electronics',
        'Engine protection against seizure and hydrostatic lock',
        'No-claim bonus protection that survives a claim',
        'Theft cover written against the agreed value of the bike',
        'Key and lock replacement',
        'Personal accident cover for the pillion rider',
        'Roadside assistance with towing rated for a heavy machine',
        'Cashless repair at the best garages and superbike workshops',
        'Privilege discounts and hassle-free claims through InsureNation',
      ],
    },
    fields: [
      ...COMMON_FIELDS,
      { key: 'vehicle', label: 'Bike make & model', placeholder: 'Ducati Panigale V4' },
    ],
  },

  travel: {
    id: 'travel',
    slug: '/travel-insurance',
    navVariant: 'white',
    eyebrow: '[ travel insurance ]',
    hero: {
      image: '/assets/travel-hero.webp',
      position: 'center',
      scrim: SCRIM,
      title: ['Travel Cover', 'For Every Trip'],
      sub: 'Most countries want proof of insurance before they stamp a visa - and care abroad is expensive. Cover the trip properly and keep your mind on the trip.',
    },
    why: {
      heading: ['Why Travel', 'Insurance Is', 'Important'],
      paragraphs: [
        'An international travel policy protects you and your family against financial risk and keeps travel worries out of the way. Most countries mandate travel insurance for visa approval.',
        'The risks are not only medical. Emergency hospitalisation, baggage loss, a lost passport, an accident in a rented car, repatriation, missed flights and delays all sit on the same trip.',
        'Even where it is not mandatory we recommend travel medical cover, simply because treatment abroad costs so much. You get personalised recommendations, travel assistance and instant claim registration.',
      ],
    },
    perks: [
      {
        title: 'Quick & Easy Processing',
        sub: 'Customised quotes and online issuance, so buying takes minutes',
      },
      {
        title: 'Affordable Customisations',
        sub: 'Personalise an overseas plan around your itinerary and party',
      },
      {
        title: 'Compare & Decide',
        sub: 'Policy detail at your fingertips - calculate, compare, choose',
      },
      {
        title: 'Cover Instantly',
        sub: 'Your insurer starts protecting the trip the moment the policy activates',
      },
    ],
    coverArt: {
      image: '/assets/travel-cover.webp',
      position: 'center center',
      width: 600,
      aspectRatio: '3/4',
      height: 931,
      alignSelf: 'flex-start',
    },
    cover: {
      heading: ['Cover That', 'Travels With You'],
      intro:
        'Whether you are travelling for work or for fun, a medical emergency can leave you alone and distressed in a foreign city. Our international policies cover the range of emergencies so you can travel carefree.',
      items: [
        'Pay in rupees and get covered in USD, GBP or EUR',
        'Plans customised to the country you are visiting',
        'End-to-end medical cover for all kinds of treatment',
        'Pre-existing conditions can be brought into the cover',
        'Cashless treatment at network hospitals abroad',
        'No pre-medical tests required for senior travellers',
        'Increase your sum assured whenever you wish',
        'Cover for a lost passport and other important documents',
        'Baggage loss and delay, checked-in baggage included',
        'Trip cancellation, missed connections and repatriation',
      ],
    },
    fields: [
      ...COMMON_FIELDS,
      { key: 'trip', label: 'Destination & dates', placeholder: 'Schengen, 14 days' },
    ],
  },

  marine: {
    id: 'marine',
    slug: '/marine-insurance',
    navVariant: 'blue',
    eyebrow: '[ marine insurance ]',
    hero: {
      image: '/assets/marine-hero.webp',
      position: 'center',
      scrim: null,
      title: ['Marine Cargo', 'And Hull Cover'],
      sub: 'Goods in transit change hands, modes and jurisdictions. Marine insurance follows the cargo the whole way, so one incident at sea does not land on your balance sheet.',
    },
    why: {
      heading: ['Why Marine', 'Insurance Is', 'Important'],
      paragraphs: [
        'Once a consignment leaves your warehouse it passes through carriers, ports, customs and handlers you do not control. Marine insurance covers the goods across that entire journey - sea, air, road and rail - not only the ocean leg.',
        "Carrier liability is capped, and the cap usually sits far below the value of the cargo. Without a marine policy, a container lost overboard, a fire in a hold or water damage in a monsoon port is your loss and your buyer's claim.",
        "Most letters of credit and Incoterms require cover in the seller's or the buyer's name before the shipment moves. We structure the policy to match your contract and your trade terms - and we appoint the surveyor when something goes wrong.",
      ],
    },
    perks: [
      {
        title: 'Warehouse To Warehouse',
        sub: 'Cover that starts and ends at the door, not at the port gate',
      },
      {
        title: 'Open Cover',
        sub: 'Declare shipments as they move instead of buying one policy at a time',
      },
      {
        title: 'Trade-Term Aligned',
        sub: 'Written to match your Incoterms and your letter of credit',
      },
      {
        title: 'Surveyor On Call',
        sub: 'We appoint the surveyor and register the claim the day you report it',
      },
    ],
    coverArt: {
      image: '/assets/marine-cover.webp',
      position: 'center center',
      width: 597,
      aspectRatio: null,
      height: 959,
      alignSelf: 'stretch',
    },
    cover: {
      heading: ['Cargo, Hull', 'And Liability'],
      intro:
        "Marine cover is not one product. We assemble the parts your trade actually needs - the cargo itself, the vessel it travels on, and the liabilities that come with moving other people's goods.",
      items: [
        'Marine cargo cover for imports, exports and domestic movement',
        'Institute Cargo Clauses A, B or C, chosen to fit the commodity',
        'Warehouse-to-warehouse transit across sea, air, road and rail',
        'Open cover and annual declaration policies for regular shippers',
        'Hull and machinery cover for owned or chartered vessels',
        'Protection and indemnity for crew, collision and wreck removal',
        'Freight forwarder and carrier legal liability',
        'War, strikes, riot and civil commotion extensions',
        'General average and salvage contributions',
        'Claims run with the surveyor, from survey report to settlement',
      ],
    },
    fields: [
      ...COMMON_FIELDS,
      {
        key: 'shipment',
        label: 'Commodity & route',
        placeholder: 'Machinery, Nhava Sheva to Hamburg',
      },
    ],
  },
};
