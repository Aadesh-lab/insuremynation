import { PRODUCTS } from '../../data/products';

/**
 * Per-page qualification funnels for the assistant.
 *
 * Ads run per product line, so a visitor who clicks a health ad lands on
 * /health-insurance having already declared intent. The assistant opens with that
 * product's first qualifying question instead of asking which cover they want, and
 * walks down a short funnel of tappable answers.
 *
 * Three rules the shape of this file follows from:
 *
 *   1. Chips send *answers*, never questions. The knowledge base is the site's own
 *      copy — it has no family floater, no lakh/crore, no waiting periods, no NCB
 *      rules — so a chip phrased as a question retrieves nothing and the visitor gets
 *      "I don't have that information". The funnel is driven by the per-product
 *      instruction in the backend's system prompt (productPrompts in
 *      backend/internal/services/chat.go), not by retrieval.
 *   2. Every `message` stands alone as a sentence. The greeting is rendered locally
 *      and never enters history, so the model never sees the question being answered.
 *   3. Every `message` fully closes the question it answers, and this one bites. A chip
 *      that reads as a deferral rather than an answer ("We are in another city", "This is
 *      the first policy") makes the assistant ask which city, or whether they claimed —
 *      and because the chip row is keyed on the number of visitor messages, the funnel is
 *      then a step behind for the rest of the conversation, so the visitor answers
 *      questions that were never asked. Escape hatches say where the detail is going
 *      instead: "elsewhere in India; I will give the city to the adviser".
 *   4. `label` stays short — it is what gets tapped, on a phone, at 380px.
 *
 * `field`/`value` are the CRM mapping: one qualification field per step, with a
 * normalised value per chip. Nothing reads them yet — lead capture does not exist
 * (see user_flow_insurance.md) — but the funnel is the thing that will produce a
 * qualified lead, so the shape it produces is fixed here rather than reverse-engineered
 * out of chip labels later.
 *
 * ponytail: flat step lists, no branching. The composition a visitor picks is carried
 * in the step-0 label ("Me, spouse + kids") rather than asked again as a count, so one
 * list serves every path. Add a per-answer next-step map only if a funnel has to fork.
 */

const CITY_STEP = {
  field: 'city',
  chips: [
    { label: 'Delhi NCR', value: 'delhi-ncr', message: 'We are in Delhi NCR.' },
    { label: 'Mumbai', value: 'mumbai', message: 'We are in Mumbai.' },
    { label: 'Bengaluru', value: 'bengaluru', message: 'We are in Bengaluru.' },
    // Phrased so it closes the question. "We are in another city" reads as a refusal to
    // answer, and the assistant asked which one — which put the funnel a step behind for
    // the rest of the conversation.
    { label: 'Another city', value: 'other', message: 'We are elsewhere in India; I will give the city to the adviser.' },
  ],
};

const RTO_STEP = {
  field: 'rto_city',
  chips: [
    { label: 'Delhi NCR', value: 'delhi-ncr', message: 'The vehicle is registered in Delhi NCR.' },
    { label: 'Mumbai', value: 'mumbai', message: 'The vehicle is registered in Mumbai.' },
    { label: 'Bengaluru', value: 'bengaluru', message: 'The vehicle is registered in Bengaluru.' },
    // See the note on CITY_STEP: it has to read as an answer, not as a deferral.
    { label: 'Another RTO', value: 'other', message: 'It is registered elsewhere in India; I will give the RTO to the adviser.' },
  ],
};

const NCB_STEP = {
  field: 'ncb',
  chips: [
    { label: 'No claim last year', value: 'no-claim', message: 'I did not make a claim last year, so I have a no-claim bonus.' },
    { label: 'Claimed last year', value: 'claimed', message: 'I made a claim last year.' },
    { label: 'First policy', value: 'first-policy', message: 'This is the first policy on the vehicle, so there is no claim history and no no-claim bonus yet.' },
    { label: 'Not sure', value: 'unknown', message: 'I do not remember whether I claimed last year; the adviser can check my previous policy.' },
  ],
};

const VEHICLE_STATUS_STEP = (noun) => ({
  field: 'policy_status',
  chips: [
    { label: 'Renewing', value: 'renewal', message: `I am renewing an existing ${noun} policy.` },
    { label: `New ${noun}`, value: 'new-vehicle', message: `I have just bought a ${noun} and need cover.` },
    { label: 'Already expired', value: 'expired', message: `My ${noun} policy has already expired.` },
    { label: 'Third-party only now', value: 'third-party', message: `I only have third-party cover and want comprehensive.` },
  ],
});

export const JOURNEYS = {
  health: {
    greeting: 'Health cover it is. Who are we covering?',
    steps: [
      {
        field: 'members',
        chips: [
          { label: 'Just me', value: 'self', message: 'I am looking at health cover for just myself.' },
          { label: 'Me + spouse', value: 'self-spouse', message: 'I want health cover for me and my spouse.' },
          { label: 'Me, spouse + kids', value: 'family-floater', message: 'I want a family floater for me, my spouse and our children.' },
          { label: 'My parents (60+)', value: 'parents', message: 'I want health cover for my parents, who are senior citizens.' },
        ],
      },
      {
        field: 'eldest_age',
        chips: [
          { label: '18-35', value: '18-35', message: 'The eldest person to be covered is between 18 and 35.' },
          { label: '36-50', value: '36-50', message: 'The eldest person to be covered is between 36 and 50.' },
          { label: '51-60', value: '51-60', message: 'The eldest person to be covered is between 51 and 60.' },
          { label: 'Over 60', value: '60-plus', message: 'The eldest person to be covered is over 60.' },
        ],
      },
      CITY_STEP,
      {
        field: 'sum_insured',
        chips: [
          { label: 'Rs 5 lakh', value: '5L', message: 'I have around Rs 5 lakh of cover in mind.' },
          { label: 'Rs 10 lakh', value: '10L', message: 'I have around Rs 10 lakh of cover in mind.' },
          { label: 'Rs 25 lakh', value: '25L', message: 'I have around Rs 25 lakh of cover in mind.' },
          { label: 'Rs 1 crore+', value: '1Cr-plus', message: 'I am looking at Rs 1 crore of cover or more.' },
        ],
      },
      {
        field: 'existing_cover',
        chips: [
          { label: 'Employer cover already', value: 'employer', message: 'I already have cover through my employer.' },
          { label: 'My own policy already', value: 'own-policy', message: 'I already have my own health policy and am considering a change.' },
          { label: 'Nothing yet', value: 'none', message: 'I do not have any health cover yet.' },
          { label: 'A condition to declare', value: 'ped', message: 'Someone we want covered has an existing medical condition to declare.' },
        ],
      },
    ],
  },

  life: {
    greeting: 'Life cover it is. What kind of plan are you after?',
    steps: [
      {
        field: 'plan_type',
        chips: [
          { label: 'Pure term cover', value: 'term', message: 'I want pure term cover, protection only.' },
          { label: 'Term + savings', value: 'term-savings', message: 'I want a plan that combines life cover with savings.' },
          { label: 'ULIP / investment', value: 'ulip', message: 'I am interested in a unit-linked plan that invests alongside the cover.' },
          { label: 'Not sure yet', value: 'unknown', message: 'I am not sure which kind of life plan suits me.' },
        ],
      },
      {
        field: 'age',
        chips: [
          { label: '25-30', value: '25-30', message: 'I am between 25 and 30.' },
          { label: '31-40', value: '31-40', message: 'I am between 31 and 40.' },
          { label: '41-50', value: '41-50', message: 'I am between 41 and 50.' },
          { label: 'Over 50', value: '50-plus', message: 'I am over 50.' },
        ],
      },
      {
        field: 'sum_assured',
        chips: [
          { label: 'Rs 50 lakh', value: '50L', message: 'I am thinking of around Rs 50 lakh of cover.' },
          { label: 'Rs 1 crore', value: '1Cr', message: 'I am thinking of around Rs 1 crore of cover.' },
          { label: 'Rs 2 crore', value: '2Cr', message: 'I am thinking of around Rs 2 crore of cover.' },
          { label: 'Rs 5 crore+', value: '5Cr-plus', message: 'I am looking at Rs 5 crore of cover or more.' },
        ],
      },
      {
        field: 'liabilities',
        chips: [
          { label: 'Home loan', value: 'home-loan', message: 'I have a home loan outstanding.' },
          { label: 'Car or personal loan', value: 'personal-loan', message: 'I have a car or personal loan outstanding.' },
          { label: 'Business liabilities', value: 'business', message: 'I have business liabilities to account for.' },
          { label: 'No loans', value: 'none', message: 'I have no loans outstanding.' },
        ],
      },
      {
        field: 'dependents',
        chips: [
          { label: 'Spouse', value: 'spouse', message: 'My spouse depends on my income.' },
          { label: 'Spouse + kids', value: 'spouse-kids', message: 'My spouse and children depend on my income.' },
          { label: 'Parents too', value: 'spouse-kids-parents', message: 'My spouse, children and parents all depend on my income.' },
          { label: 'Just my parents', value: 'parents', message: 'My parents depend on my income.' },
        ],
      },
    ],
  },

  car: {
    greeting: 'Car cover it is. Is this a renewal or a new policy?',
    steps: [
      VEHICLE_STATUS_STEP('car'),
      {
        field: 'segment',
        chips: [
          { label: 'Hatchback or sedan', value: 'mass', message: 'It is a hatchback or a sedan.' },
          { label: 'SUV', value: 'suv', message: 'It is an SUV.' },
          { label: 'Luxury (BMW, Merc, Audi)', value: 'luxury', message: 'It is a luxury car - a BMW, Mercedes or Audi class of vehicle.' },
          { label: 'Exotic or supercar', value: 'exotic', message: 'It is an exotic or supercar.' },
        ],
      },
      RTO_STEP,
      NCB_STEP,
      {
        field: 'addons',
        chips: [
          { label: 'Zero depreciation', value: 'zero-dep', message: 'I want zero depreciation cover on the car.' },
          { label: 'Engine protection', value: 'engine', message: 'I want engine and gearbox protection.' },
          { label: 'Return to invoice', value: 'rti', message: 'I want return-to-invoice cover so a total loss pays the invoice value.' },
          { label: 'Not sure yet', value: 'unknown', message: 'I am not sure which add-ons I need.' },
        ],
      },
    ],
  },

  bike: {
    greeting: 'Two-wheeler cover it is. What are we insuring?',
    steps: [
      {
        field: 'engine_class',
        chips: [
          { label: 'Superbike (500cc+)', value: 'superbike', message: 'It is a superbike, above 500cc.' },
          { label: '150-500cc', value: 'mid', message: 'It is a bike between 150cc and 500cc.' },
          { label: 'Commuter under 150cc', value: 'commuter', message: 'It is a commuter bike under 150cc.' },
          { label: 'Electric scooter', value: 'electric', message: 'It is an electric scooter.' },
        ],
      },
      VEHICLE_STATUS_STEP('bike'),
      RTO_STEP,
      NCB_STEP,
      {
        field: 'addons',
        chips: [
          { label: 'Zero depreciation', value: 'zero-dep', message: 'I want zero depreciation cover on the bike.' },
          { label: 'Accessories cover', value: 'accessories', message: 'I want cover for accessories - exhaust, crash guards, electronics.' },
          { label: 'Pillion rider cover', value: 'pillion', message: 'I want personal accident cover for the pillion rider.' },
          { label: 'Engine protection', value: 'engine', message: 'I want engine protection against seizure and hydrostatic lock.' },
        ],
      },
    ],
  },

  travel: {
    greeting: 'Travel cover it is. Where are you headed?',
    steps: [
      {
        field: 'destination',
        chips: [
          { label: 'Schengen / Europe', value: 'schengen', message: 'I am travelling to the Schengen area in Europe.' },
          { label: 'USA or Canada', value: 'usa-canada', message: 'I am travelling to the USA or Canada.' },
          { label: 'UK', value: 'uk', message: 'I am travelling to the UK.' },
          { label: 'Dubai or SE Asia', value: 'gulf-sea', message: 'I am travelling to Dubai or South East Asia.' },
        ],
      },
      {
        field: 'trip_type',
        chips: [
          { label: 'Single trip', value: 'single', message: 'It is a single trip.' },
          { label: 'Multi-trip annual', value: 'multi-trip', message: 'I travel often and want an annual multi-trip policy.' },
          { label: 'Student going abroad', value: 'student', message: 'It is for a student going abroad to study.' },
          { label: 'Family holiday', value: 'family', message: 'It is a family holiday.' },
        ],
      },
      {
        field: 'duration',
        chips: [
          { label: 'Under 15 days', value: 'lt-15d', message: 'The trip is under 15 days.' },
          { label: '15-30 days', value: '15-30d', message: 'The trip is between 15 and 30 days.' },
          { label: '1-6 months', value: '1-6m', message: 'I will be away between one and six months.' },
          { label: 'Over 6 months', value: 'gt-6m', message: 'I will be away for more than six months.' },
        ],
      },
      {
        field: 'travellers',
        chips: [
          { label: 'Just me', value: 'self', message: 'I am travelling alone.' },
          { label: 'Me + spouse', value: 'self-spouse', message: 'My spouse and I are travelling together.' },
          { label: 'Family with kids', value: 'family', message: 'We are travelling as a family with children.' },
          { label: 'Someone is 60+', value: 'senior', message: 'One of the travellers is over 60.' },
        ],
      },
      {
        field: 'visa_proof',
        chips: [
          { label: 'Visa needs it', value: 'required', message: 'I need the policy as proof of insurance for a visa application.' },
          { label: 'Visa already done', value: 'have-visa', message: 'I already have the visa - this is for the cover itself.' },
          { label: 'No visa needed', value: 'not-required', message: 'No visa is needed for this trip.' },
        ],
      },
    ],
  },

  marine: {
    greeting: 'Marine cover it is. Which way do the goods move?',
    steps: [
      {
        field: 'movement',
        chips: [
          { label: 'Imports', value: 'import', message: 'We are insuring imports coming into India.' },
          { label: 'Exports', value: 'export', message: 'We are insuring exports leaving India.' },
          { label: 'Domestic transit', value: 'domestic', message: 'We are insuring domestic transit within India.' },
          { label: 'Both, regularly', value: 'both', message: 'We ship both ways regularly.' },
        ],
      },
      {
        field: 'mode',
        chips: [
          { label: 'Sea', value: 'sea', message: 'The consignments move by sea.' },
          { label: 'Air', value: 'air', message: 'The consignments move by air.' },
          { label: 'Road or rail', value: 'surface', message: 'The consignments move by road or rail.' },
          { label: 'Multi-modal', value: 'multimodal', message: 'The consignments move multi-modally, warehouse to warehouse.' },
        ],
      },
      {
        field: 'commodity',
        chips: [
          { label: 'Machinery', value: 'machinery', message: 'We are shipping machinery.' },
          { label: 'Electronics', value: 'electronics', message: 'We are shipping electronics.' },
          { label: 'Textiles or garments', value: 'textiles', message: 'We are shipping textiles or garments.' },
          { label: 'Chemicals or pharma', value: 'chem-pharma', message: 'We are shipping chemicals or pharmaceuticals.' },
        ],
      },
      {
        field: 'policy_type',
        chips: [
          { label: 'Single shipment', value: 'single-transit', message: 'I need cover for a single shipment.' },
          { label: 'Open cover, annual', value: 'open-cover', message: 'We ship regularly and want an annual open cover with declarations.' },
          { label: 'Not sure', value: 'unknown', message: 'I am not sure whether we need a single transit policy or an open cover.' },
        ],
      },
      {
        field: 'value',
        chips: [
          { label: 'Under Rs 50 lakh', value: 'lt-50L', message: 'Each shipment is worth under Rs 50 lakh.' },
          { label: 'Rs 50 lakh - 5 crore', value: '50L-5Cr', message: 'Each shipment is worth between Rs 50 lakh and Rs 5 crore.' },
          { label: 'Over Rs 5 crore', value: 'gt-5Cr', message: 'Each shipment is worth over Rs 5 crore.' },
          { label: 'Annual turnover based', value: 'turnover', message: 'We would rather rate the policy on annual turnover than per shipment.' },
        ],
      },
    ],
  },
};

/**
 * The funnel for pages that are not a product page — landing, About, Contact, Claim
 * Support. It asks which cover they want, and each chip declares its `product`, so
 * tapping one enters that product's funnel at step 1 rather than starting over.
 */
export const DEFAULT_JOURNEY = {
  greeting: 'Hi! Which cover are you looking for?',
  steps: [
    {
      field: 'product',
      chips: [
        { label: 'Health', product: 'health', value: 'health', message: 'I am looking for health insurance.' },
        { label: 'Life', product: 'life', value: 'life', message: 'I am looking for life insurance.' },
        { label: 'Car', product: 'car', value: 'car', message: 'I am looking for car insurance.' },
        { label: 'Bike', product: 'bike', value: 'bike', message: 'I am looking for two-wheeler insurance.' },
        { label: 'Travel', product: 'travel', value: 'travel', message: 'I am looking for travel insurance.' },
        { label: 'Marine', product: 'marine', value: 'marine', message: 'I am looking for marine insurance.' },
        { label: 'Something else', value: 'other', message: 'What else can you help me with?' },
      ],
    },
  ],
};

/** slug -> product id, built from the same config the routes are built from. */
const BY_SLUG = Object.fromEntries(Object.values(PRODUCTS).map((p) => [p.slug, p.id]));

/**
 * The product this page is about, or null.
 *
 * `?product=` wins over the path, for an ad that lands on the home page rather than a
 * product page. It is read through the JOURNEYS keys, so an unknown value is ignored
 * rather than trusted.
 */
export function productForPage(pathname, search) {
  const param = new URLSearchParams(search || '').get('product');
  if (param && JOURNEYS[param]) return param;
  return BY_SLUG[pathname] ?? null;
}

export const journeyFor = (product) => JOURNEYS[product] ?? DEFAULT_JOURNEY;
