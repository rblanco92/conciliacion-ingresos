// ============================================================================
// Catálogo de aplicaciones de baterías POSITIVE (marca BATOR)
// Transcrito del "Catálogo de Aplicaciones de Baterías Positive".
//
// A diferencia de Duncan, este catálogo se organiza POR BATERÍA (cada batería
// lista sus vehículos). Aquí se guarda esa estructura; el buscador la cruza
// por vehículo para mostrarla junto a Duncan.
//
// Cada batería trae datos extra que Duncan no tiene:
//   caja      -> el número de caja (22, 24, 27, 30, 36, 45, 49, 65, 43, 4D)
//   capacidad -> capacidad en Ah/amperios (800, 1100, 1250, etc.)
//   borne     -> posición del borne positivo: 'IZQ' o 'DER'
// ============================================================================

export interface BateriaPositive {
  codigo: string; // p.ej. "22MR800"
  caja: string; // "22", "24", "4D"...
  capacidad: string; // "800", "1100"...
  borne: "IZQ" | "DER";
  aplicaciones: { marca: string; modelos: string }[];
}

export const POSITIVE: BateriaPositive[] = [
  {
    codigo: "22M800",
    caja: "22",
    capacidad: "800",
    borne: "IZQ",
    aplicaciones: [
      { marca: "CHEVROLET", modelos: "AVEO (TODOS), CAVALIER, CENTURY, CELEBRITY, CORSICA, S10 SUNFIRE, OPTRA HATCHBACK, COLORADO, BLAZER" },
      { marca: "JEEP", modelos: "COMPASS, LIBERTY" },
      { marca: "CHRYSLER", modelos: "DODGE CALIBER, SEBRING, STRATUS, NEON 97-99" },
      { marca: "DAEWOO", modelos: "LANOS, LEGANZA, NUBIRA" },
      { marca: "MITSUBISHI", modelos: "MF, MX, ZX, COLT, ECLIPSE, EXPO 93-95" },
      { marca: "NISSAN", modelos: "PATHFINDER 93-97" },
      { marca: "FORD", modelos: "TRACER 92-96" },
      { marca: "HUMMER", modelos: "H3 2006-2007" },
      { marca: "HYUNDAI", modelos: "EXCEL, SONATA 92-01" },
      { marca: "KIA", modelos: "SPORTAGE 00-03" },
    ],
  },
  {
    codigo: "22MR800",
    caja: "22",
    capacidad: "800",
    borne: "DER",
    aplicaciones: [
      { marca: "KIA", modelos: "CARENS, RIO, SEPHIA, SERATO, SHUMA, SPECTRA, RIO STYLUS" },
      { marca: "MAZDA", modelos: "ALLEGRO 95-02, DEMIO 04-08" },
      { marca: "MITSUBISHI", modelos: "3000, DIAMANTE, GALA, MX 01-08, MF 01-08, LANCER, SIGNO, OUTLANDER 07-10" },
      { marca: "DONGFENG", modelos: "ZNA PICK UP, S30 12-13" },
      { marca: "FORD", modelos: "FESTIVA, GRANADA, MUSTANG 82-85, COUGAR 80-85, LASER 96-04" },
      { marca: "HONDA", modelos: "ACCORD 4 CIL 90-98, ACCORD 6 CIL 00-08" },
      { marca: "HYUNDAI", modelos: "ACCENT, COUPE, MATRIX, GETZ 97-10, ELANTRA 02-13, MATRIX 03-07, TUCSON 05-10, GETZ" },
      { marca: "NISSAN", modelos: "ALMERA 98-10, ALTIMA, MÁXIMA, MURANO 98-08, ARMADA, PATROL" },
      { marca: "TOYOTA", modelos: "HILUX 4CIL 99-14, PASEO, RAV-4 93-16, TERCEL" },
      { marca: "VENIRAUTO", modelos: "TURPIAL, SAIPA 06-15" },
      { marca: "FIAT", modelos: "RITMO" },
    ],
  },
  {
    codigo: "24MR1100",
    caja: "24",
    capacidad: "1100",
    borne: "DER",
    aplicaciones: [
      { marca: "TOYOTA", modelos: "FORTUNER 05-17, KAVAK, HILUX 6CIL, MERÚ, TUNDRA, LAND CRUISER 06-17, PRADO, PREVIA, SIENA, RORAIMA, STATION WAGON 99-07, FJ40, AUTANA, CAMRY" },
      { marca: "CHEVROLET", modelos: "CHEYENNE, SILVERADO 08-15, LUV DMAX 4CIL 01-06, NPR, NKR, NHR 92-15, NLR 14, C3500 11-15" },
      { marca: "LEXUS", modelos: "LEXUS 91-97" },
      { marca: "MAZDA", modelos: "03, 05, 06, 626, 929" },
      { marca: "MITSUBISHI", modelos: "GRANDIS, MONTERO SPORT, MONTERO LIMITED 93-16" },
      { marca: "HONDA", modelos: "ODYSSEY, PILOT, VIGOR 00-08" },
      { marca: "HYUNDAI", modelos: "SONATA 02-06" },
    ],
  },
  {
    codigo: "27MR1100",
    caja: "27",
    capacidad: "1100",
    borne: "DER",
    aplicaciones: [
      { marca: "CHEVROLET", modelos: "NPR TURBO (2 BATERÍAS)" },
      { marca: "HINO", modelos: "BUS 12-17" },
      { marca: "IVECO", modelos: "DAILY GNV, ESCUDO 11-12, EUROCARGO, TECTOR, VERTIS 11-16" },
      { marca: "HYUNDAI", modelos: "H100" },
    ],
  },
  {
    codigo: "30H1250",
    caja: "30",
    capacidad: "1250",
    borne: "IZQ",
    aplicaciones: [
      { marca: "IVECO", modelos: "EUROCARGO 89-11, EURO TECTOR 98-11" },
      { marca: "INTERNATIONAL", modelos: "TODOS 00-10" },
      { marca: "FREIGHTLINER", modelos: "COLUMBIA CL, M2 106 00-10, 112 00-10" },
      { marca: "FORD", modelos: "7000, 8000 00-01, CARGO 815 03-15" },
      { marca: "CHEVROLET", modelos: "SUPER BRIGADIER, KODIAK 157, KODIAK 175, FBR, FSR (2 BATERÍAS) 06-11" },
      { marca: "MERCEDES BENZ", modelos: "MB303" },
    ],
  },
  {
    codigo: "36MR700",
    caja: "36",
    capacidad: "700",
    borne: "DER",
    aplicaciones: [
      { marca: "FIAT", modelos: "COUPE, FIORINO, IDEA, MAREA, STRADA, PUNTO, PALIO, ADVENTURE, SIENA, 147, SPAZIO, TUCAN, PREMIO, UNO, REGATA" },
      { marca: "FORD", modelos: "FIESTA, KA, ESCORT, ORION, ECOSPORT, FUSION, DEL REY, CORCEL, FOCUS" },
      { marca: "CHERY", modelos: "COW IN, ARAUCA, ORINOCO, X5 05-16" },
      { marca: "CHEVROLET", modelos: "CHEVETTE 81-96" },
      { marca: "VOLKSWAGEN", modelos: "ESCARABAJO, CROSS FOX, FOX, SPACE FOX, NEW BEATTLE, POLO" },
      { marca: "ZOTYE", modelos: "VISTA MANZA 12-14" },
      { marca: "CHRYSLER", modelos: "DODGE FORZA, NEON" },
      { marca: "CITROEN", modelos: "C3, C4 01-10" },
      { marca: "DAEWOO", modelos: "CIELO, ESPERO" },
      { marca: "LIFAN", modelos: "520 TALENT 08-09" },
      { marca: "PEUGEOT", modelos: "206, 207, 306, 307, 407, PARTNER, 405, 605" },
      { marca: "RENAULT", modelos: "CLIO, KANGOO, EXPRESS, FUEGO, GALA, LAGUNA, MEGANE, R-5, R-11, R-12, SANDERO, SCENIC, SYMBOL, TRAFFIC, TWINGO" },
    ],
  },
  {
    codigo: "45MR700",
    caja: "45",
    capacidad: "700",
    borne: "DER",
    aplicaciones: [
      { marca: "HONDA", modelos: "ACCORD 4CIL 00-08, CIVIC, CIVIC EMOTION, CR-V" },
      { marca: "HYUNDAI", modelos: "GETZ GLS GNV 11-20" },
      { marca: "TOYOTA", modelos: "CELICA 92-99, COROLLA 03-08, SKY, STARLET 01-10, TERIOS, YARIS, YARIS DELTA, YARIS SPORT" },
      { marca: "NISSAN", modelos: "TIIDA 07-08" },
      { marca: "MITSUBISHI", modelos: "SPACE WAGON, MIRAGE 98-01, PANEL L300 VAN (TODAS)" },
      { marca: "ZOTYE", modelos: "NÓMADA 07-10" },
      { marca: "CHEVROLET", modelos: "ESTEEM 97-02, SWIFT 92-99" },
      { marca: "CHERY", modelos: "X1 (TODOS)" },
      { marca: "DAEWOO", modelos: "TICO 97-99" },
      { marca: "MAZDA", modelos: "MIATA 92-98" },
    ],
  },
  {
    codigo: "49MR1100",
    caja: "49",
    capacidad: "1100",
    borne: "DER",
    aplicaciones: [
      { marca: "DONGFENG", modelos: "DUOLIKA, XIAOBA, JIMBA 12-15" },
      { marca: "MERCEDES BENZ", modelos: "S500 91-16, 500 SEL, 600 SEL, ML230 13-18, SPRINTER 313 Y 413 76-08, 300 ML 76-08" },
      { marca: "BMW", modelos: "X5, X6, X7, 830I 01-10" },
      { marca: "IVECO", modelos: "DAILY LIVIANOS 98-11, POWER DAILY 11-16" },
      { marca: "JAC", modelos: "1040, 1131 15" },
      { marca: "VOLKSWAGEN", modelos: "TOUAREG 05-08" },
      { marca: "JEEP", modelos: "GRAND CHEROKEE 11-17" },
    ],
  },
  {
    codigo: "65M1100",
    caja: "65",
    capacidad: "1100",
    borne: "IZQ",
    aplicaciones: [
      { marca: "FORD", modelos: "FX4 06-14, F350 SUPER DUTY 01-14, EXPLORER 06-15, SPORT TRACK 06-15" },
      { marca: "LINCOLN", modelos: "NAVIGATOR 06-10" },
      { marca: "CHRYSLER", modelos: "DAKOTA 07-08, RAM 2500 00-09" },
    ],
  },
  {
    codigo: "43MR1000",
    caja: "43",
    capacidad: "1000",
    borne: "DER",
    aplicaciones: [
      { marca: "FORD", modelos: "SIERRA 07-14, RANGER, SCAPE 07-08" },
      { marca: "ROVER", modelos: "MINICORD 91-95" },
      { marca: "CHEVROLET", modelos: "ASTRA 02-06, CHEVY 08-11, CORSA 96-06, MERIVA 07-08, MONTANA, MONZA 06-07, ORLANDO, CRUZE" },
      { marca: "LADA", modelos: "SAMARA 92-96" },
      { marca: "MERCEDES BENZ", modelos: "190E, 300E, A160, A170, C300, E320" },
      { marca: "DAEWOO", modelos: "RACER 93-97" },
      { marca: "VOLKSWAGEN", modelos: "BORA, GOLF, GOL, JETTA, PASSAT, VENTO" },
      { marca: "VOLVO", modelos: "740, 94 90-92" },
      { marca: "AUDI", modelos: "A3, A4, A6, A8, Q7 04-07" },
      { marca: "BMW", modelos: "116I, 135I, 318I, 525I, 530I, X3, Z3, Z4 98-08" },
      { marca: "CHERY", modelos: "GRAND TIGGO 16" },
      { marca: "RENAULT", modelos: "LOGAN, MEGANE, R19, R21 06-09" },
      { marca: "FIAT", modelos: "TEMPRA 98-05" },
    ],
  },
  {
    codigo: "43M1000",
    caja: "43",
    capacidad: "1000",
    borne: "IZQ",
    aplicaciones: [
      { marca: "CHEVROLET", modelos: "CHEYENNE SILVERADO 92-99, CAMARO 94-95, CAPTIVA 07-09, GRAND BLAZER 92-01" },
      { marca: "LINCOLN", modelos: "LINCOLN TOWN CAR 90-10" },
      { marca: "JEEP", modelos: "GRAND CHEROKEE 99" },
    ],
  },
  {
    codigo: "4D1350",
    caja: "4D",
    capacidad: "1350",
    borne: "IZQ",
    aplicaciones: [
      { marca: "CHEVROLET", modelos: "FSR 14, EXZ, EXR 08-15" },
      { marca: "FORD", modelos: "CARGO 1721 04-08 OPCIÓN, CARGO 1721 08-15, CARGO 2632, 4432, 4532 (4D)" },
      { marca: "IVECO", modelos: "EUROTRACKER, STRALIS 83-11, NEW STRALIS 83-11" },
      { marca: "BLUEBIRD", modelos: "TODOS 00-10" },
      { marca: "PEGASO", modelos: "TODOS 78-95" },
      { marca: "RENAULT", modelos: "TODOS 89-99" },
      { marca: "YUTONG", modelos: "TODOS 8-18" },
      { marca: "ENCAVA", modelos: "4D 67-95" },
    ],
  },
];
