export interface BrandSpot {
  id: number;
  name: string;
  size: 'Small' | 'Medium' | 'Large';
  dimensions: string;
  location: string;
  surface: 'lid' | 'inside' | 'accessory';
  topBidEur: number;
  topBidUsd: number;
  topBidInr?: number;
  bidCount: number;
  sponsorName: string;
  sponsorUrl: string;
  logoUrl?: string;
  isSold: boolean;
  gridColumn?: string;
  gridRow?: string;
}

export const AUCTION_CONFIG = {
  durationDays: 14,
  minBidIncrementUsd: 10,
  minBidIncrementEur: 10,
  minBidIncrementInr: 800,
  depositPercentage: 20,
  // 14-day auction starting from current campaign launch
  auctionEndTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
};

export interface StartupEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  type: 'Demo Day' | 'VC Meeting' | 'Hackathon' | 'Tech Summit' | 'Founder Meetup';
  expectedAttendees: string;
  highlight: string;
}

export interface SponsorTier {
  id: string;
  name: string;
  priceUsd: number;
  priceEur: number;
  priceInr?: number;
  perks: string[];
  recommended?: boolean;
}

export interface FundingMilestone {
  id: string;
  amountUsd: number;
  amountEur: number;
  title: string;
  badge: string;
  description: string;
  status: 'active' | 'upcoming';
}

export const FUNDING_GOAL = {
  targetUsd: 4000,
  raisedUsd: 0,
  targetEur: 3680,
  raisedEur: 0,
  targetInr: 336000,
  raisedInr: 0,
  hasNoLimit: true,
  deviceTarget: 'MacBook Pro 16″ (Apple M5 Max / M5 Pro · 128GB Unified Memory · 2TB SSD)',
  devicePurpose: 'Zero-latency local LLM evaluation, autonomous VESPER engineering workflows, Docker clusters, and IRL founder roadshows without thermal throttling.',
  previousDevice: 'ASUS TUF Gaming F15 (Rendered completely unusable due to motherboard short-circuit during 48-hour model training sprint)',
  budgetNote: 'No Budget Ceiling: Hardware target ($4,000) is our Phase 1 milestone. 100% of surplus funding is directly invested into the VESPER AI startup — covering cloud GPU compute clusters (H100/A100), LLM fine-tuning, and international demo day roadshows.'
};

export const FUNDING_MILESTONES: FundingMilestone[] = [
  {
    id: 'm1',
    amountUsd: 4000,
    amountEur: 3680,
    title: 'Milestone 1 · Flagship Apple M5 Max / M5 Pro Hardware',
    badge: 'Hardware Goal',
    description: '16″ Liquid Retina XDR display, M5 Max / M5 Pro chip, 128GB unified memory, and 2TB SSD. Replaces our fried Asus TUF to unlock continuous agent development.',
    status: 'active'
  },
  {
    id: 'm2',
    amountUsd: 7500,
    amountEur: 6900,
    title: 'Milestone 2 · Cloud GPU Compute & LLM Fine-Tuning Pool',
    badge: 'Startup Compute',
    description: '1,500+ cloud GPU compute hours (NVIDIA H100 / A100 SXM5) to fine-tune VESPER domain-specific code generation and agent planning models.',
    status: 'upcoming'
  },
  {
    id: 'm3',
    amountUsd: 12000,
    amountEur: 11000,
    title: 'Milestone 3 · Global Founder Roadshow & Live Demo Booths',
    badge: 'Founder Roadshow',
    description: 'Travel, demo stage slots, and showcase booths at TechCrunch Disrupt SF, Slush Helsinki, and AI Engineer Summit. All sponsor brands displayed prominently IRL.',
    status: 'upcoming'
  },
  {
    id: 'm4',
    amountUsd: 25000,
    amountEur: 23000,
    title: 'Milestone 4 · Production Infrastructure & Beta Deployments',
    badge: 'Startup Scale',
    description: 'High-availability multi-region Kubernetes clusters, enterprise sandbox isolation, developer community grants, and production launch.',
    status: 'upcoming'
  }
];

export const UPCOMING_EVENTS: StartupEvent[] = [
  {
    id: 'tc-disrupt',
    name: 'TechCrunch Disrupt & Founder Showcase',
    date: 'Nov 2026',
    location: 'San Francisco, CA',
    type: 'Tech Summit',
    expectedAttendees: '10,000+ founders & investors',
    highlight: 'Lid sticker facing top Tier-1 VCs and media during mainstage demos'
  },
  {
    id: 'ai-summit',
    name: 'Global AI Engineer Summit',
    date: 'Dec 2026',
    location: 'Bangalore, India',
    type: 'Hackathon',
    expectedAttendees: '2,500+ AI builders & CTOs',
    highlight: 'VESPER live agent demonstration on stage running on this MacBook Pro'
  },
  {
    id: 'demo-day',
    name: 'Y Combinator & Antler Alumni Pitch Night',
    date: 'Jan 2027',
    location: 'Hybrid / In-Person',
    type: 'Demo Day',
    expectedAttendees: '350+ Angels & Micro VCs',
    highlight: 'Your brand shown during 1-on-1 investor breakout discussions'
  },
  {
    id: 'founder-cafes',
    name: 'Daily Build-in-Public Cafés & Coworking',
    date: 'Daily IRL',
    location: 'Indiranagar & HSR Layout Hubs',
    type: 'Founder Meetup',
    expectedAttendees: '500+ tech operators weekly',
    highlight: 'High foot-traffic visibility in top startup coffee shops & tech hubs'
  }
];

export const SPONSOR_TIERS: SponsorTier[] = [
  {
    id: 'backer',
    name: 'Indie Backer',
    priceUsd: 25,
    priceEur: 22,
    priceInr: 2100,
    perks: [
      'Name & link on the official Fund My Mac Sponsors Wall',
      'Personal shoutout on X/Twitter and LinkedIn from the founder',
      'Early VIP access to the VESPER private beta launch',
      'VESPER backer badge in our Discord community'
    ]
  },
  {
    id: 'corner',
    name: 'The Corner Sponsor',
    priceUsd: 75,
    priceEur: 69,
    priceInr: 6300,
    perks: [
      'Featured placement in the sticky live Corner Widget for 48 hours',
      'Dofollow backlink from Fund My Mac & VESPER Sponsors page',
      'Mention in our weekly Build-in-Public vlog / devlog',
      'All Indie Backer perks included'
    ]
  },
  {
    id: 'accessory',
    name: 'Accessory / Palm Rest Sticker',
    priceUsd: 150,
    priceEur: 138,
    priceInr: 12500,
    perks: [
      'High-grade vinyl sticker on the Palm Rest or 140W GaN Charger',
      'Visible in every screen recording, podcast, and video call',
      'Product recommendation: We test & showcase your tool during meetings',
      'Featured logo on the VESPER Sponsors Wall',
      'Permanent social media tag across all launch posts'
    ]
  },
  {
    id: 'lid',
    name: 'Prime Lid Sticker Spot',
    priceUsd: 250,
    priceEur: 230,
    priceInr: 21000,
    recommended: true,
    perks: [
      'Prime position on the MacBook Pro aluminum lid facing the world',
      'Seen by thousands of founders, investors & attendees at IRL startup events',
      'Dedicated sponsor slide in every VESPER demo day deck & pitch meeting',
      'Exclusive company spotlight post across our founder channels',
      'Permanent high-resolution logo on the official Sponsors Wall'
    ]
  },
  {
    id: 'title',
    name: 'Marquee Title Partner',
    priceUsd: 500,
    priceEur: 460,
    priceInr: 42000,
    perks: [
      'Top-tier placement right above the Apple logo (Highest visibility)',
      '"Powered by [Your Brand]" logo tag on every slide of the VESPER pitch deck',
      '1-year dedicated partnership banner on VESPER GitHub and docs',
      'Direct intro to our founder network, investors, and startup community',
      'Custom demo of your tool during our stage presentations'
    ]
  }
];

export const BRAND_SPOTS: BrandSpot[] = [
  // --- LID SPOTS ---
  {
    id: 1,
    name: 'Top Left Banner',
    size: 'Large',
    dimensions: '9.5 × 5.5 cm',
    location: 'Top left exterior lid',
    surface: 'lid',
    topBidEur: 320,
    topBidUsd: 350,
    topBidInr: 29400,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '1 / span 2',
    gridRow: '1'
  },
  {
    id: 2,
    name: 'Marquee — Above Apple Logo',
    size: 'Large',
    dimensions: '9.5 × 5.5 cm',
    location: 'Prime center position above Apple logo',
    surface: 'lid',
    topBidEur: 460,
    topBidUsd: 500,
    topBidInr: 42000,
    bidCount: 0,
    sponsorName: 'Prime Marquee Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '3 / span 2',
    gridRow: '1'
  },
  {
    id: 3,
    name: 'Top Right Banner',
    size: 'Large',
    dimensions: '9.5 × 5.5 cm',
    location: 'Top right exterior lid',
    surface: 'lid',
    topBidEur: 320,
    topBidUsd: 350,
    topBidInr: 29400,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '5 / span 2',
    gridRow: '1'
  },
  {
    id: 4,
    name: 'Upper Left Mini-Strip',
    size: 'Small',
    dimensions: '4.75 × 3 cm',
    location: 'Upper left corner',
    surface: 'lid',
    topBidEur: 115,
    topBidUsd: 125,
    topBidInr: 10500,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '1',
    gridRow: '2'
  },
  {
    id: 5,
    name: 'Inner Left — Beside Logo',
    size: 'Medium',
    dimensions: '4.75 × 5.5 cm',
    location: 'Left side of Apple logo',
    surface: 'lid',
    topBidEur: 185,
    topBidUsd: 200,
    topBidInr: 16800,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '2',
    gridRow: '2'
  },
  {
    id: 6,
    name: 'Inner Right — Beside Logo',
    size: 'Medium',
    dimensions: '4.75 × 5.5 cm',
    location: 'Right side of Apple logo',
    surface: 'lid',
    topBidEur: 185,
    topBidUsd: 200,
    topBidInr: 16800,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '5',
    gridRow: '2'
  },
  {
    id: 7,
    name: 'Upper Right Mini-Strip',
    size: 'Small',
    dimensions: '4.75 × 3 cm',
    location: 'Upper right corner',
    surface: 'lid',
    topBidEur: 115,
    topBidUsd: 125,
    topBidInr: 10500,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '6',
    gridRow: '2'
  },
  {
    id: 8,
    name: 'Bottom Left Strip',
    size: 'Medium',
    dimensions: '9.5 × 5.5 cm',
    location: 'Bottom left strip',
    surface: 'lid',
    topBidEur: 185,
    topBidUsd: 200,
    topBidInr: 16800,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '1 / span 2',
    gridRow: '3'
  },
  {
    id: 9,
    name: 'Bottom Center — Under Logo',
    size: 'Large',
    dimensions: '9.5 × 5.5 cm',
    location: 'Directly below Apple logo',
    surface: 'lid',
    topBidEur: 276,
    topBidUsd: 300,
    topBidInr: 25200,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '3 / span 2',
    gridRow: '3'
  },
  {
    id: 10,
    name: 'Bottom Right Strip',
    size: 'Medium',
    dimensions: '9.5 × 5.5 cm',
    location: 'Bottom right strip',
    surface: 'lid',
    topBidEur: 185,
    topBidUsd: 200,
    topBidInr: 16800,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false,
    gridColumn: '5 / span 2',
    gridRow: '3'
  },

  // --- INSIDE PALM REST SPOTS ---
  {
    id: 11,
    name: 'Left Palm Rest — Outer Top',
    size: 'Small',
    dimensions: '4.5 × 3 cm',
    location: 'Left palm rest (Outer Top)',
    surface: 'inside',
    topBidEur: 138,
    topBidUsd: 150,
    topBidInr: 12600,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  },
  {
    id: 12,
    name: 'Left Palm Rest — Outer Bottom',
    size: 'Small',
    dimensions: '4.5 × 3 cm',
    location: 'Left palm rest (Outer Bottom)',
    surface: 'inside',
    topBidEur: 138,
    topBidUsd: 150,
    topBidInr: 12600,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  },
  {
    id: 13,
    name: 'Left Palm Rest — Inner Top',
    size: 'Small',
    dimensions: '4.5 × 3 cm',
    location: 'Left palm rest (Inner Top)',
    surface: 'inside',
    topBidEur: 138,
    topBidUsd: 150,
    topBidInr: 12600,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  },
  {
    id: 14,
    name: 'Left Palm Rest — Inner Bottom',
    size: 'Small',
    dimensions: '4.5 × 3 cm',
    location: 'Left palm rest (Inner Bottom)',
    surface: 'inside',
    topBidEur: 138,
    topBidUsd: 150,
    topBidInr: 12600,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  },
  {
    id: 15,
    name: 'Right Palm Rest — Inner Top',
    size: 'Small',
    dimensions: '4.5 × 3 cm',
    location: 'Right palm rest (Inner Top)',
    surface: 'inside',
    topBidEur: 138,
    topBidUsd: 150,
    topBidInr: 12600,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  },
  {
    id: 16,
    name: 'Right Palm Rest — Inner Bottom',
    size: 'Small',
    dimensions: '4.5 × 3 cm',
    location: 'Right palm rest (Inner Bottom)',
    surface: 'inside',
    topBidEur: 138,
    topBidUsd: 150,
    topBidInr: 12600,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  },
  {
    id: 17,
    name: 'Right Palm Rest — Outer Top',
    size: 'Small',
    dimensions: '4.5 × 3 cm',
    location: 'Right palm rest (Outer Top)',
    surface: 'inside',
    topBidEur: 138,
    topBidUsd: 150,
    topBidInr: 12600,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  },
  {
    id: 18,
    name: 'Right Palm Rest — Outer Bottom',
    size: 'Small',
    dimensions: '4.5 × 3 cm',
    location: 'Right palm rest (Outer Bottom)',
    surface: 'inside',
    topBidEur: 138,
    topBidUsd: 150,
    topBidInr: 12600,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  },

  // --- ACCESSORY SPOTS ---
  {
    id: 19,
    name: '140W USB-C GaN Power Adapter',
    size: 'Large',
    dimensions: '7.5 × 7.5 cm',
    location: 'Apple 140W Fast Charger Body',
    surface: 'accessory',
    topBidEur: 138,
    topBidUsd: 150,
    topBidInr: 12600,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  },
  {
    id: 20,
    name: 'Apple Magic Mouse Surface',
    size: 'Medium',
    dimensions: '5.5 × 3.5 cm',
    location: 'Apple Magic Mouse Curved Top',
    surface: 'accessory',
    topBidEur: 92,
    topBidUsd: 100,
    topBidInr: 8400,
    bidCount: 0,
    sponsorName: 'Starting Bid Floor',
    sponsorUrl: '#',
    isSold: false
  }
];

export interface CornerHistoryItem {
  name: string;
  amountUsd: number;
  amountInr: number;
  amountEur: number;
  held: string;
  url: string;
  avatarUrl?: string;
}

export interface CornerState {
  currentSponsor: string;
  currentUrl: string;
  amountEur: number;
  amountUsd: number;
  amountInr: number;
  nextBidEur: number;
  nextBidUsd: number;
  nextBidInr: number;
  avatarUrl: string;
  heldDuration: string;
  history: CornerHistoryItem[];
}

export const CORNER_DATA: CornerState = {
  currentSponsor: 'Available',
  currentUrl: '',
  amountEur: 0,
  amountUsd: 0,
  amountInr: 0,
  nextBidEur: 40,
  nextBidUsd: 45,
  nextBidInr: 3600,
  avatarUrl: '/logo-small.png',
  heldDuration: 'Now',
  history: []
};

export const FAQ_DATA = [
  {
    question: 'How does the 14-Day Auction work?',
    answer: 'Every spot on the MacBook Pro (lid, palm rests, and accessories) features tier-based reserve pricing (Small, Medium, Marquee). During active auctions, brands compete by placing higher bids with clear increments. The highest bid when the 14-day countdown expires wins the spot permanently for the lifetime of the machine.'
  },
  {
    question: 'How does the 20% deposit work?',
    answer: 'When placing a bid during live auctions, sponsors only pay a 20% commitment deposit. If another brand outbids you, your 20% deposit is refunded automatically. If you win at auction close, your deposit counts toward the total and you receive an invoice for the remaining balance.'
  },
  {
    question: 'What happens if someone outbids me?',
    answer: 'Your 20% deposit is refunded back to your account automatically, and you receive an alert giving you the option to submit a higher bid before the countdown expires.'
  },
  {
    question: 'What is The Corner Takeover?',
    answer: 'The sticky corner widget at the top-left of every page view can be claimed dynamically by any sponsor. Outbid the current holder to take over the corner immediately. Even if outbid later, you permanently remain on the "Previously here" sponsor history list.'
  },
  {
    question: 'Which machine are you purchasing?',
    answer: 'The MacBook Pro 16″ configured with Apple M5 Max / M5 Pro, 128GB of unified memory, and a 2TB high-speed SSD. This machine provides the extreme unified memory bandwidth and local tensor performance required to run and evaluate VESPER autonomous AI agents offline, in transit, and on stage without thermal slowdowns.'
  },
  {
    question: 'Where will my brand / logo be displayed IRL?',
    answer: 'Everywhere this machine goes! We attend startup summits (TechCrunch Disrupt, Web Summit), AI developer hackathons, Silicon Valley & Bangalore demo days, investor meetings, and daily build-in-public cafes. Your brand sticker is prominently positioned facing founders, engineers, and VCs.'
  },
  {
    question: 'How do you guarantee quality and durability of the stickers?',
    answer: 'We use premium matte finish 3M vinyl die-cut stickers with UV-resistant and scratch-resistant lamination. They look pristine, sleek, and adhere seamlessly to the Apple space gray aluminum body without peeling.'
  },
  {
    question: 'How long will our brand sticker stay on the MacBook Pro?',
    answer: 'Device Lifelong: Guaranteed for the entire operational and physical lifetime of the MacBook Pro. Your sticker will remain permanently affixed across every roadshow, developer conference, investor meeting, and daily engineering build-in-public session for the full life of the machine.'
  }
];
