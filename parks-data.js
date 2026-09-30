/**
 * Municipal Park Survey App - Data Source
 * Contains definitions for 25 municipal parks and 5 feature checklist types.
 */

const FEATURE_TYPES = {
  playground: {
    id: "playground",
    name: "Playground Equipment",
    icon: "🛝",
    description: "Swings, slides, climbing frames, sandboxes, and safety surfaces.",
    points: [
      "All structural parts are in good condition",
      "There are no screws or fasteners that need to be fixed",
      "Attachment points are secure and undamaged",
      "No loose or broken parts",
      "No need for touch up of painted or coated surfaces"
    ]
  },
  furniture: {
    id: "furniture",
    name: "Park Furniture & Amenities",
    icon: "🪑",
    description: "Benches, picnic tables, waste bins, bike racks, and information signs.",
    points: [
      "Wooden slats and frames are sturdy and splinter-free",
      "Bolts, brackets, and ground mountings are secure",
      "Trash cans are emptied, liner intact, lid/lock functional",
      "Park signage and informational boards are clean and legible",
      "Picnic tables and bicycle racks are level and stable"
    ]
  },
  greenery: {
    id: "greenery",
    name: "Greenery & Landscaping",
    icon: "🌳",
    description: "Trees, shrubs, lawns, flowerbeds, and horticultural zones.",
    points: [
      "No hazardous deadwood or loose branches overhead",
      "Pathways and sightlines are clear of encroaching branches",
      "Lawn is mowed and free of dangerous holes or ruts",
      "Flowerbeds and planted borders are tended and weed-free",
      "Hedges and perimeter shrubs are properly trimmed"
    ]
  },
  lighting: {
    id: "lighting",
    name: "Lighting & Electrical",
    icon: "💡",
    description: "Park lanterns, floodlights, solar bollards, and electrical control boxes.",
    points: [
      "All light fixtures and lenses are intact without damage",
      "Light poles are firmly anchored and aligned vertically",
      "Electrical junction boxes and inspection doors are locked securely",
      "No exposed wires, vandalism, or damaged conduits",
      "Sensors, timers, or emergency call points are functional and undamaged"
    ]
  },
  walkways: {
    id: "walkways",
    name: "Walkways & Fencing",
    icon: "🛤️",
    description: "Paved paths, gravel tracks, perimeter fencing, handrails, and gates.",
    points: [
      "Pavement and asphalt free of trip hazards, severe cracks, or potholes",
      "Boundary fences and railings are stable with no gaps or loose sections",
      "Access gates open smoothly, swing freely, and latch securely",
      "Curbs, accessibility ramps, and stair treads are non-slip and intact",
      "Drainage grates and water channels are clear of silt and leaves"
    ]
  }
};

const MUNICIPAL_PARKS = [
  {
    id: "park-01",
    name: "Central Civic Park",
    district: "Downtown",
    address: "100 Civic Square",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-02",
    name: "Riverside Promenade",
    district: "Riverfront",
    address: "240 Riverwalk Way",
    featureIds: ["furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-03",
    name: "Oakwood Grove",
    district: "North Hills",
    address: "45 Oakwood Lane",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-04",
    name: "Meadow Green Park",
    district: "East Suburbs",
    address: "88 Meadowland Dr",
    featureIds: ["playground", "furniture", "greenery", "walkways"]
  },
  {
    id: "park-05",
    name: "Sunset Ridge Reserve",
    district: "West Heights",
    address: "510 Skyline Blvd",
    featureIds: ["furniture", "greenery", "walkways"]
  },
  {
    id: "park-06",
    name: "Willow Creek Gardens",
    district: "Valley View",
    address: "12 Willow Creek Rd",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-07",
    name: "Harbor View Park",
    district: "Harbor District",
    address: "3 Maritime Blvd",
    featureIds: ["furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-08",
    name: "Pinecrest Community Park",
    district: "North Hills",
    address: "310 Pinecrest Ave",
    featureIds: ["playground", "furniture", "greenery", "lighting"]
  },
  {
    id: "park-09",
    name: "Maplewood Commons",
    district: "Maplewood",
    address: "74 Maplewood St",
    featureIds: ["playground", "furniture", "greenery", "walkways"]
  },
  {
    id: "park-10",
    name: "Birchwood Recreation Grounds",
    district: "East Suburbs",
    address: "150 Birchwood Rd",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-11",
    name: "Elmwood Historic Square",
    district: "Old Town",
    address: "12 Heritage Row",
    featureIds: ["furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-12",
    name: "Highpoint Lookout Park",
    district: "West Heights",
    address: "820 Highpoint Crest",
    featureIds: ["furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-13",
    name: "Cedar Grove Park",
    district: "Southside",
    address: "95 Cedar Grove Rd",
    featureIds: ["playground", "furniture", "greenery", "walkways"]
  },
  {
    id: "park-14",
    name: "Valley Stream Nature Park",
    district: "Valley View",
    address: "402 Stream Valley Way",
    featureIds: ["furniture", "greenery", "walkways"]
  },
  {
    id: "park-15",
    name: "Northgate Athletics & Park",
    district: "North District",
    address: "600 Northgate Pkwy",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-16",
    name: "Southside Memorial Park",
    district: "Southside",
    address: "215 Memorial Ave",
    featureIds: ["furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-17",
    name: "Lakeside Park & Beach",
    district: "Lakefront",
    address: "10 Lake Shore Dr",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-18",
    name: "Rosewood Botanical Garden",
    district: "Cultural Quarter",
    address: "55 Flora Way",
    featureIds: ["furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-19",
    name: "Ironworks Heritage Plaza",
    district: "Industrial Heritage",
    address: "190 Foundry St",
    featureIds: ["furniture", "lighting", "walkways"]
  },
  {
    id: "park-20",
    name: "Forest Glen Wilderness Park",
    district: "Greenbelt",
    address: "710 Forest Glen Rd",
    featureIds: ["furniture", "greenery", "walkways"]
  },
  {
    id: "park-21",
    name: "Whispering Pines Park",
    district: "Greenbelt",
    address: "32 Whispering Pines Trl",
    featureIds: ["playground", "furniture", "greenery", "lighting"]
  },
  {
    id: "park-22",
    name: "Heritage Park & Arboretum",
    district: "Old Town",
    address: "200 Arboretum Rd",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-23",
    name: "Spring Valley Sports Park",
    district: "Valley View",
    address: "50 Stadium Way",
    featureIds: ["playground", "furniture", "lighting", "walkways"]
  },
  {
    id: "park-24",
    name: "Fairway Green Community Park",
    district: "West Heights",
    address: "114 Fairway Green",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "park-25",
    name: "Mill Creek Wetland Park",
    district: "East Suburbs",
    address: "80 Mill Creek Crossing",
    featureIds: ["furniture", "greenery", "lighting", "walkways"]
  }
];

const DEFAULT_SETTINGS = {
  recipientEmail: "park-maintenance@municipality.gov",
  inspectorName: "Park Inspector"
};
