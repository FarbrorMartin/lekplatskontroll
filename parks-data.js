/**
 * Lekplatskontroll - Datakälla
 * Innehåller 25 kommunala lekplatser och 5 kontrollpunktsområden.
 */

const PRESET_INSPECTORS = ["Lasse", "Abdi"];

const FEATURE_TYPES = {
  playground: {
    id: "playground",
    name: "Lekplatsutrustning",
    icon: "🛝",
    description: "Gungor, rutschkana, klätterställning, sandlåda och fallunderlag.",
    points: [
      "Alla bärande delar är i gott skick",
      "Inga skruvar eller fästelement behöver åtgärdas",
      "Fästpunkter är säkra och oskadade",
      "Inga lösa eller trasiga delar",
      "Inget behov av bättring av målade eller behandlade ytor"
    ]
  },
  furniture: {
    id: "furniture",
    name: "Parkmöbler & utrustning",
    icon: "🪑",
    description: "Bänkar, bord, papperskorgar, cykelställ och informationstavlor.",
    points: [
      "Träribbor och stommar är hela och stickfria",
      "Bultar, fästen och markförankring sitter stadigt",
      "Papperskorgar tömda, hela och låsbara",
      "Informationsskyltar och ordningsregler rena och läsbara",
      "Picknickbord och cykelställ stabila och plana"
    ]
  },
  greenery: {
    id: "greenery",
    name: "Vegetation & träd",
    icon: "🌳",
    description: "Träd, buskage, gräsytor och planteringar kring lekplatsen.",
    points: [
      "Inga farliga torrgrenar eller nedhängande grenar",
      "Siktlinjer och gångytor fria från sly och grenar",
      "Gräsytan är klippt och fri från hålor eller snubbelrisker",
      "Planteringar och sandytor välskötta och ogräsfria",
      "Häckar och buskar kring lekytan är väl beskurna"
    ]
  },
  lighting: {
    id: "lighting",
    name: "Belysning & el",
    icon: "💡",
    description: "Lyktstolpar, belysningsarmaturer och elskåp.",
    points: [
      "Armaturer och skyddsglas hela utan skador",
      "Stolpar är stadigt förankrade och raka",
      "Elskåp och serviceluckor är låsta och säkrade",
      "Inga synliga kablar, vandalism eller skador",
      "Skymningsrelä eller tidsstyrning fungerar och är intakt"
    ]
  },
  walkways: {
    id: "walkways",
    name: "Gångvägar & stängsel",
    icon: "🛤️",
    description: "Asfaltytor, grusgångar, staket, räcken och grindar.",
    points: [
      "Gångytor jämna utan snubbelkanter, hål eller sprickor",
      "Staket och räcken stabila utan glapp eller hål",
      "Grindar öppnas lätt, stängs mjukt och låser/haspar säkert",
      "Kantstöd, ramper och trappor halkfria och hela",
      "Dagvattenbrunnar och rännor rensade från löv och grus"
    ]
  }
};

const MUNICIPAL_PARKS = [
  {
    id: "lekplats-01",
    name: "Stadsparkens lekplats",
    district: "Centrum",
    address: "Storgatan 12",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-02",
    name: "Årummets lekplats",
    district: "Centrum / Åpromenaden",
    address: "Strandvägen 4",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-03",
    name: "Ekbackens lekplats",
    district: "Norra staden",
    address: "Ekbacksvägen 15",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-04",
    name: "Ängslummans temalekplats",
    district: "Östra stadsdelen",
    address: "Ängsvägen 22",
    featureIds: ["playground", "furniture", "greenery", "walkways"]
  },
  {
    id: "lekplats-05",
    name: "Solbackens lekplats",
    district: "Västra höjden",
    address: "Solbacken 8",
    featureIds: ["playground", "furniture", "greenery", "walkways"]
  },
  {
    id: "lekplats-06",
    name: "Bäckparkens lekplats",
    district: "Dalgången",
    address: "Bäckstigen 3",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-07",
    name: "Hamnlekplatsen",
    district: "Hamnområdet",
    address: "Kajpromenaden 1",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-08",
    name: "Tallkrogens lekplats",
    district: "Norra staden",
    address: "Tallkrogsvägen 45",
    featureIds: ["playground", "furniture", "greenery", "lighting"]
  },
  {
    id: "lekplats-09",
    name: "Lönnalléns lekplats",
    district: "Lönngården",
    address: "Lönnallén 18",
    featureIds: ["playground", "furniture", "greenery", "walkways"]
  },
  {
    id: "lekplats-10",
    name: "Björkbackens lekplats",
    district: "Östra stadsdelen",
    address: "Björkgatan 9",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-11",
    name: "Gamla Stadens lekplats",
    district: "Gamla stan",
    address: "Kullerstensgränd 2",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-12",
    name: "Höjdparkens lekplats",
    district: "Västra höjden",
    address: "Utsiktsvägen 31",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-13",
    name: "Cederskogens lekplats",
    district: "Södra staden",
    address: "Cedervägen 14",
    featureIds: ["playground", "furniture", "greenery", "walkways"]
  },
  {
    id: "lekplats-14",
    name: "Skogsdalens naturlekplats",
    district: "Dalgången",
    address: "Skogsdalsvägen 50",
    featureIds: ["playground", "furniture", "greenery", "walkways"]
  },
  {
    id: "lekplats-15",
    name: "Idrottsparkens lekplats",
    district: "Norra staden",
    address: "Idrottsvägen 6",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-16",
    name: "Söderparkens lekplats",
    district: "Södra staden",
    address: "Söderleden 88",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-17",
    name: "Strandlekplatsen",
    district: "Sjöstranden",
    address: "Badstrandsvägen 2",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-18",
    name: "Rosenträdgårdens lekplats",
    district: "Kulturkvarteret",
    address: "Floragatan 7",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-19",
    name: "Bruksparkens lekplats",
    district: "Industrihistoriska",
    address: "Bruksgatan 30",
    featureIds: ["playground", "furniture", "lighting", "walkways"]
  },
  {
    id: "lekplats-20",
    name: "Skogsbrynets lekplats",
    district: "Grönområdet",
    address: "Skogsbrynsvägen 11",
    featureIds: ["playground", "furniture", "greenery", "walkways"]
  },
  {
    id: "lekplats-21",
    name: "Tallhöjdens lekplats",
    district: "Grönområdet",
    address: "Barrstigen 5",
    featureIds: ["playground", "furniture", "greenery", "lighting"]
  },
  {
    id: "lekplats-22",
    name: "Kulturparkens lekplats",
    district: "Gamla stan",
    address: "Museigatan 14",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-23",
    name: "Dalvikens lekplats",
    district: "Dalgången",
    address: "Dalviksvägen 19",
    featureIds: ["playground", "furniture", "lighting", "walkways"]
  },
  {
    id: "lekplats-24",
    name: "Gröna dalens lekplats",
    district: "Västra höjden",
    address: "Dalgränd 3",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  },
  {
    id: "lekplats-25",
    name: "Kvarnbäckens lekplats",
    district: "Östra stadsdelen",
    address: "Möllevägen 27",
    featureIds: ["playground", "furniture", "greenery", "lighting", "walkways"]
  }
];

const DEFAULT_SETTINGS = {
  recipientEmail: "lekplatskontroll@kommun.se",
  inspectorName: "Lasse"
};
