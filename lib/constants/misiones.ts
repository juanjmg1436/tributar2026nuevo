// ─────────────────────────────────────────────────────────────────────────────
// Constantes fiscales — ATM Misiones Simulado
// Fuente de referencia: Código Fiscal de la Provincia de Misiones
// Ley Impositiva Anual 2026 (valores DEMO — fines didácticos exclusivamente)
// ─────────────────────────────────────────────────────────────────────────────

// ── Departamentos y localidades de Misiones ──────────────────────────────────
export const MISIONES_DEPARTMENTS: { code: string; name: string; localities: string[] }[] = [
  {
    code: 'CAPITAL',
    name: 'Capital',
    localities: ['Posadas', 'Garupá', 'Fachinal'],
  },
  {
    code: 'CANDELARIA',
    name: 'Candelaria',
    localities: ['Candelaria', 'Santa Ana', 'Loreto', 'Martires'],
  },
  {
    code: 'APOSTOLES',
    name: 'Apóstoles',
    localities: ['Apóstoles', 'San José', 'Azara'],
  },
  {
    code: 'CONCEPCION',
    name: 'Concepción',
    localities: ['Concepción de la Sierra', 'Santa María'],
  },
  {
    code: 'SAN_IGNACIO',
    name: 'San Ignacio',
    localities: ['San Ignacio', 'Corpus', 'General Urquiza', 'Jardin América'],
  },
  {
    code: 'MONTECARLO',
    name: 'Montecarlo',
    localities: ['Montecarlo', 'Puerto Piray', 'Caraguatay'],
  },
  {
    code: 'ELDORADO',
    name: 'Eldorado',
    localities: ['Eldorado', '9 de Julio', 'Colonia Victoria'],
  },
  {
    code: 'IGUAZU',
    name: 'Iguazú',
    localities: ['Puerto Iguazú', 'Wanda', 'Puerto Libertad', 'Colonia Alberdi'],
  },
  {
    code: 'LEANDRO_ALEM',
    name: 'Leandro N. Alem',
    localities: ['Leandro N. Alem', 'Dos Arroyos', 'Cerro Azul'],
  },
  {
    code: 'OBERA',
    name: 'Oberá',
    localities: ['Oberá', 'Campo Viera', 'San Martín', 'Panambí'],
  },
  {
    code: 'GUARANI',
    name: 'Guaraní',
    localities: ['El Soberbio', 'San Vicente'],
  },
  {
    code: 'SAN_PEDRO',
    name: 'San Pedro',
    localities: ['San Pedro', 'Tobuna', 'Piñalito Norte'],
  },
  {
    code: 'GENERAL_BELGRANO',
    name: 'General Belgrano',
    localities: ['Bernardo de Irigoyen', 'San Antonio'],
  },
]

export const MISIONES_LOCALITIES = MISIONES_DEPARTMENTS.flatMap(d =>
  d.localities.map(l => ({ value: l, label: l, department: d.name, departmentCode: d.code }))
)

// ── Actividades IIBB — Nomenclador (simplificado, fines didácticos) ───────────
export interface IIBBActivity {
  code: string
  name: string
  /** Alícuota general en decimales */
  rate: number
  /** Alícuota reducida (si aplica) */
  reducedRate?: number
  category: 'comercio' | 'industria' | 'servicios' | 'primario' | 'construccion'
  description: string
}

export const IIBB_ACTIVITIES: IIBBActivity[] = [
  // ── SERVICIOS ──
  {
    code: '741000',
    name: 'Actividades jurídicas y notariales',
    rate: 0.04,
    category: 'servicios',
    description: 'Estudios jurídicos, escribanías',
  },
  {
    code: '742000',
    name: 'Actividades de contabilidad y auditoría',
    rate: 0.035,
    category: 'servicios',
    description: 'Estudios contables, asesoría impositiva',
  },
  {
    code: '743000',
    name: 'Consultoría de gestión empresarial',
    rate: 0.035,
    category: 'servicios',
    description: 'Consultoría en administración de empresas',
  },
  {
    code: '726000',
    name: 'Servicios informáticos',
    rate: 0.03,
    reducedRate: 0.015,
    category: 'servicios',
    description: 'Desarrollo de software, hosting, soporte IT',
  },
  {
    code: '800000',
    name: 'Enseñanza',
    rate: 0.025,
    category: 'servicios',
    description: 'Institutos educativos privados, academias',
  },
  {
    code: '851000',
    name: 'Actividades relacionadas con la salud',
    rate: 0.03,
    category: 'servicios',
    description: 'Consultorios médicos, odontológicos, clínicas',
  },
  {
    code: '630000',
    name: 'Transporte y logística',
    rate: 0.035,
    category: 'servicios',
    description: 'Transporte de cargas y pasajeros',
  },
  {
    code: '931000',
    name: 'Hotelería y alojamiento',
    rate: 0.04,
    category: 'servicios',
    description: 'Hoteles, hosterías, alojamientos turísticos',
  },
  {
    code: '553000',
    name: 'Restaurantes y bares',
    rate: 0.04,
    category: 'servicios',
    description: 'Gastronomía, restaurantes, cafeterías',
  },
  {
    code: '930000',
    name: 'Turismo y esparcimiento',
    rate: 0.04,
    category: 'servicios',
    description: 'Agencias de viajes, turismo aventura',
  },
  // ── COMERCIO ──
  {
    code: '521000',
    name: 'Comercio minorista — alimentos y bebidas',
    rate: 0.03,
    category: 'comercio',
    description: 'Almacenes, supermercados, dietéticas',
  },
  {
    code: '524000',
    name: 'Comercio minorista — indumentaria y calzado',
    rate: 0.035,
    category: 'comercio',
    description: 'Ropa, calzado, accesorios',
  },
  {
    code: '526000',
    name: 'Comercio minorista — artículos del hogar',
    rate: 0.035,
    category: 'comercio',
    description: 'Electrodomésticos, muebles, ferretería',
  },
  {
    code: '511000',
    name: 'Comercio mayorista',
    rate: 0.03,
    category: 'comercio',
    description: 'Venta al por mayor',
  },
  {
    code: '504000',
    name: 'Venta de vehículos y repuestos',
    rate: 0.03,
    category: 'comercio',
    description: 'Concesionarias, lubricentros, repuestos',
  },
  {
    code: '505000',
    name: 'Venta de combustibles',
    rate: 0.015,
    category: 'comercio',
    description: 'Estaciones de servicio',
  },
  // ── INDUSTRIA ──
  {
    code: '153000',
    name: 'Elaboración de productos alimenticios',
    rate: 0.015,
    reducedRate: 0.01,
    category: 'industria',
    description: 'Fábricas de alimentos y bebidas',
  },
  {
    code: '202000',
    name: 'Industria maderera y aserraderos',
    rate: 0.015,
    category: 'industria',
    description: 'Aserraderos, carpinterías industriales',
  },
  {
    code: '281000',
    name: 'Fabricación de productos metálicos',
    rate: 0.015,
    category: 'industria',
    description: 'Metalúrgica, herrería industrial',
  },
  // ── PRIMARIO ──
  {
    code: '011000',
    name: 'Producción agrícola — yerba mate y té',
    rate: 0.01,
    category: 'primario',
    description: 'Chacras yerbateras y tealeras',
  },
  {
    code: '012000',
    name: 'Producción forestal y extracción de madera',
    rate: 0.01,
    category: 'primario',
    description: 'Bosques implantados, extracción forestal',
  },
  {
    code: '013000',
    name: 'Ganadería y producción animal',
    rate: 0.01,
    category: 'primario',
    description: 'Ganadería bovina, avicultura, apicultura',
  },
  // ── CONSTRUCCIÓN ──
  {
    code: '452000',
    name: 'Construcción de edificios y obras civiles',
    rate: 0.03,
    category: 'construccion',
    description: 'Empresas constructoras, arquitectos, ingenieros',
  },
  {
    code: '453000',
    name: 'Instalaciones eléctricas y sanitarias',
    rate: 0.03,
    category: 'construccion',
    description: 'Electricistas, plomeros, gasistas matriculados',
  },
]

// ── Régimen IIBB ─────────────────────────────────────────────────────────────
export const IIBB_REGIMES = [
  {
    value: 'local',
    label: 'Local (Contribuyente directo Misiones)',
    description: 'Actividad exclusivamente en Misiones',
  },
  {
    value: 'convenio_multilateral',
    label: 'Convenio Multilateral',
    description: 'Actividad en 2 o más provincias — se declara en COMARB',
  },
  {
    value: 'exento',
    label: 'Exento',
    description: 'Actividad exenta por ley provincial',
  },
]

// ── Alícuotas Inmobiliario (DEMO 2026) ──────────────────────────────────────
export const INMOBILIARIO_RATES = {
  urbano: 0.0075,       // 0.75% del valor fiscal
  periurbano: 0.006,    // 0.60%
  rural: 0.005,         // 0.50%
}

// ── Alícuotas Automotor (DEMO 2026) ─────────────────────────────────────────
export const AUTOMOTOR_RATES = {
  automovil: 0.02,      // 2% del valor fiscal
  camioneta: 0.02,
  camion: 0.025,
  moto: 0.015,
  otro: 0.02,
}

// ── Alícuotas Sellos (DEMO 2026) ─────────────────────────────────────────────
export const SELLOS_CONTRACTS = [
  { value: 'locacion_inmueble', label: 'Locación de inmueble', rate: 0.01 },
  { value: 'compraventa_inmueble', label: 'Compraventa de inmueble', rate: 0.025 },
  { value: 'compraventa_automotor', label: 'Compraventa de automotor', rate: 0.01 },
  { value: 'contrato_obra', label: 'Contrato de locación de obra', rate: 0.01 },
  { value: 'credito_bancario', label: 'Crédito bancario', rate: 0.012 },
  { value: 'sociedad', label: 'Constitución/modificación de sociedad', rate: 0.01 },
  { value: 'cesion_creditos', label: 'Cesión de créditos', rate: 0.012 },
  { value: 'otro', label: 'Otro instrumento', rate: 0.01 },
]

// ── Vencimientos IIBB ────────────────────────────────────────────────────────
// En Misiones, el vencimiento varía según terminación CUIT
// Simplificado para el simulador: día 15 del mes siguiente
export const IIBB_DUE_DAY = 15

export function calcIIBBDueDate(period: string): string {
  const [year, month] = period.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(IIBB_DUE_DAY).padStart(2, '0')}`
}

export function formatPeriodLabel(period: string): string {
  const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  const [year, month] = period.split('-').map(Number)
  return `${MONTHS[month - 1]} ${year}`
}

// ── Casos prácticos ──────────────────────────────────────────────────────────
export interface PracticeCase {
  id: string
  title: string
  subtitle: string
  description: string
  difficulty: 'básico' | 'intermedio' | 'avanzado'
  regime: 'local' | 'convenio_multilateral'
  profile: {
    name: string
    cuit: string
    activity: string
    activityCode: string
    locality: string
    monthlyRevenue: number
    rate: number
  }
  objectives: string[]
  steps: { step: number; title: string; instruction: string }[]
  expectedTax: number
  tips: string[]
}

export const PRACTICE_CASES: PracticeCase[] = [
  {
    id: 'caso_1',
    title: 'Caso 1 — Comercio minorista local',
    subtitle: 'IIBB régimen local · Comercio de indumentaria',
    description: 'Simula el proceso completo de declaración jurada mensual de Ingresos Brutos para un comercio minorista de indumentaria ubicado en Posadas, que tributa en el régimen local de Misiones.',
    difficulty: 'básico',
    regime: 'local',
    profile: {
      name: 'María Fernanda López',
      cuit: '27-35123456-4',
      activity: 'Comercio minorista — indumentaria y calzado',
      activityCode: '524000',
      locality: 'Posadas',
      monthlyRevenue: 850000,
      rate: 0.035,
    },
    objectives: [
      'Completar el alta registral provincial',
      'Generar la primera DDJJ mensual de IIBB',
      'Calcular correctamente el impuesto (alícuota 3,5%)',
      'Emitir y "pagar" la boleta correspondiente',
    ],
    steps: [
      { step: 1, title: 'Alta Provincial', instruction: 'Completá el alta en el módulo Misiones con los datos del perfil indicado.' },
      { step: 2, title: 'DDJJ del período', instruction: 'Creá una nueva DDJJ para el período anterior con los ingresos del caso.' },
      { step: 3, title: 'Cálculo del impuesto', instruction: 'Verificá que el impuesto calculado coincida con el esperado.' },
      { step: 4, title: 'Boleta de pago', instruction: 'Generá la boleta y simulá el pago.' },
    ],
    expectedTax: 29750,  // 850.000 × 0.035
    tips: [
      'La alícuota para comercio minorista de indumentaria es del 3,5%.',
      'El vencimiento de la DDJJ es el día 15 del mes siguiente al período declarado.',
      'Si hay mora, corresponde aplicar un recargo del 3% mensual sobre el impuesto.',
    ],
  },
  {
    id: 'caso_2',
    title: 'Caso 2 — Estudio contable con servicios',
    subtitle: 'IIBB régimen local · Servicios profesionales',
    description: 'Un contador público independiente debe declarar sus ingresos por prestación de servicios contables e impositivos. Incluye actividades múltiples con distintas alícuotas y la emisión de un comprobante de sellos por un contrato de locación.',
    difficulty: 'intermedio',
    regime: 'local',
    profile: {
      name: 'Roberto Ángel Sosa',
      cuit: '20-28765432-6',
      activity: 'Actividades de contabilidad y auditoría',
      activityCode: '742000',
      locality: 'Oberá',
      monthlyRevenue: 520000,
      rate: 0.035,
    },
    objectives: [
      'Registrar alta con dos actividades (contabilidad + consultoría)',
      'Declarar DDJJ con ingresos mixtos',
      'Registrar un instrumento de Sellos (contrato de locación de oficina)',
      'Verificar el cumplimiento en el panel de compliance',
    ],
    steps: [
      { step: 1, title: 'Alta con múltiples actividades', instruction: 'Registrá el alta indicando la actividad principal y una secundaria.' },
      { step: 2, title: 'DDJJ con dos rubros', instruction: 'Creá la DDJJ con los ingresos de cada actividad y su alícuota correspondiente.' },
      { step: 3, title: 'Instrumento de Sellos', instruction: 'Registrá el contrato de locación de oficina por $180.000 en el módulo de Sellos.' },
      { step: 4, title: 'Panel de cumplimiento', instruction: 'Verificá que el dashboard de cumplimiento muestre el estado "al día".' },
    ],
    expectedTax: 18200,  // 520.000 × 0.035
    tips: [
      'Los servicios profesionales tributaban históricamente a tasas del 3% al 4%.',
      'El impuesto de Sellos en Misiones para locación es del 1% sobre el monto total del contrato.',
      'Si el contrato es por 12 meses a $15.000/mes, el monto total es $180.000 y el impuesto $1.800.',
    ],
  },
  {
    id: 'caso_3',
    title: 'Caso 3 — Empresa constructora con retenciones',
    subtitle: 'IIBB + Sellos + SR-341 · Régimen completo',
    description: 'Una empresa constructora factura obras a personas jurídicas y debe actuar como agente de retención (SR-341). Escenario complejo que integra IIBB, Sellos por contrato de obra y el formulario SR-341.',
    difficulty: 'avanzado',
    regime: 'local',
    profile: {
      name: 'Constructora del Nordeste S.R.L.',
      cuit: '30-71234567-8',
      activity: 'Construcción de edificios y obras civiles',
      activityCode: '452000',
      locality: 'Posadas',
      monthlyRevenue: 2500000,
      rate: 0.03,
    },
    objectives: [
      'Alta como persona jurídica con régimen local',
      'DDJJ mensual de IIBB por $2.500.000',
      'Registrar Sellos por contrato de obra (1%)',
      'Completar SR-341 como agente de retención',
      'Verificar compliance integral',
    ],
    steps: [
      { step: 1, title: 'Alta persona jurídica', instruction: 'Registrá la empresa como persona jurídica en el módulo provincial.' },
      { step: 2, title: 'DDJJ IIBB', instruction: 'Declarar ingresos por $2.500.000 (construcción) a alícuota 3%.' },
      { step: 3, title: 'Sellos — Contrato de obra', instruction: 'Registrar contrato de obra por $4.200.000 (tasa Sellos 1%).' },
      { step: 4, title: 'SR-341', instruction: 'Completar retención a un subcontratista: CUIT 20-30987654-1, pago $350.000, retención 3%.' },
      { step: 5, title: 'Revisión compliance', instruction: 'Verificar que todas las obligaciones estén en estado "cumplido".' },
    ],
    expectedTax: 75000,  // 2.500.000 × 0.03
    tips: [
      'La alícuota de construcción es del 3% en Misiones.',
      'Los contratos de locación de obra tributan Sellos al 1%.',
      'Como agente de retención (SR-341), la empresa debe retener el % indicado al pagar a subcontratistas y depositarlo en ATM.',
      'El SR-341 se presenta mensualmente antes del día 10 del mes siguiente.',
    ],
  },
]

// ── Régimen Simplificado IIBB (RS-IIBB) — Proyecto legislativo, NO VIGENTE ───
// Fuente: proyecto presentado en Cámara de Representantes de Misiones (abril 2026)
// Estado: en análisis — NO aprobado como ley al 23/06/2026
// Aplica solo a: monotributistas con actividad EXCLUSIVA en Misiones (no CM)
// La cuota reemplaza la DDJJ mensual y exime de retenciones bancarias
export const RS_IIBB_PROYECTO = {
  vigente: false,
  descripcion:
    'Régimen Simplificado de IIBB (RS-IIBB): proyecto que reemplaza la DDJJ mensual por una cuota fija alineada a las categorías del Monotributo nacional. En análisis legislativo. NO aprobado aún.',
  // Cuotas de referencia indicativas (proyecto, sujetas a modificación)
  cuotasPorCategoria: [
    { categoria: 'A', cuotaMensual: 9941 },
    { categoria: 'B', cuotaMensual: 14912 },
    { categoria: 'C', cuotaMensual: 19882 },
    { categoria: 'D', cuotaMensual: 24853 },
    { categoria: 'E', cuotaMensual: 29823 },
    { categoria: 'F', cuotaMensual: 34794 },
    { categoria: 'G', cuotaMensual: 39764 },
    { categoria: 'H', cuotaMensual: 44735 },
  ] as { categoria: string; cuotaMensual: number }[],
}

// ── Nota: Misiones NO adhirió al Monotributo Unificado ───────────────────────
// El Monotributo Unificado (ARCA + provincias) cubre: CABA, Buenos Aires, Córdoba,
// Entre Ríos, Jujuy, Mendoza, Neuquén, Río Negro, Salta, San Juan, Santa Cruz,
// Chaco, Catamarca, Tierra del Fuego. Misiones NO está incluida (junio 2026).
// Los monotributistas misioneros deben inscribirse en ATM Misiones y pagar IIBB
// por separado bajo el régimen general local o Convenio Multilateral.
export const MISIONES_MONOTRIBUTO_UNIFICADO = false

// ── Textos del módulo ────────────────────────────────────────────────────────
export const MODULE_INFO = {
  name: 'ATM Misiones Simulado',
  fullName: 'Administración Tributaria de Misiones — Simulador Didáctico',
  legalDisclaimer: 'Este módulo es una simulación educativa. Los valores, alícuotas y procedimientos son aproximados y tienen fines exclusivamente didácticos. No reemplaza ningún trámite real ante la ATM Misiones ni tiene validez fiscal o legal.',
  atm_website: 'https://www.atm.misiones.gov.ar',
}
